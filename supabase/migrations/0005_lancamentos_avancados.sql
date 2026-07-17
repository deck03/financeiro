-- ============================================================================
-- DECK 03 — Fase 5: Contas a pagar e receber avançadas
-- Pagamento/recebimento parcial, juros/multas/descontos/acréscimos, estorno,
-- parcelamento e recorrência.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- financial_settlements: acréscimo de coluna para "acréscimos" (a Fase 3 já
-- trouxe juros, multa e desconto).
-- ----------------------------------------------------------------------------
alter table financial_settlements add column if not exists addition numeric(14, 2) not null default 0;

-- ----------------------------------------------------------------------------
-- installment_groups
-- ----------------------------------------------------------------------------
create table if not exists installment_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  description text not null,
  total_amount numeric(14, 2) not null,
  installments_count integer not null check (installments_count > 1),
  recognition_strategy text not null default 'por_parcela' check (
    recognition_strategy in ('competencia_original', 'por_parcela', 'conforme_pagamento')
  ),
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_installment_groups_org on installment_groups(organization_id);

-- ----------------------------------------------------------------------------
-- recurring_rules
-- ----------------------------------------------------------------------------
create table if not exists recurring_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('receita', 'despesa')),
  description text not null,
  counterparty_id uuid references counterparties(id),
  category_id uuid not null references chart_account_categories(id),
  subcategory_id uuid references chart_account_subcategories(id),
  cost_center_id uuid references cost_centers(id),
  bank_account_id uuid references bank_accounts(id),
  payment_method_id uuid references payment_methods(id),
  amount numeric(14, 2) not null check (amount > 0),
  frequency text not null check (frequency in ('semanal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  interval_count integer not null default 1 check (interval_count > 0),
  start_date date not null,
  end_date date,
  max_occurrences integer,
  adjust_business_day boolean not null default false,
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index if not exists idx_recurring_rules_org on recurring_rules(organization_id);

comment on table recurring_rules is 'Regra de recorrência. As ocorrências (financial_entries) são geradas com até 12 meses de antecedência por generate_recurring_instances(), evitando gerar milhares de lançamentos futuros desnecessariamente.';

-- ----------------------------------------------------------------------------
-- financial_entries: colunas de vínculo com parcelamento e recorrência
-- ----------------------------------------------------------------------------
alter table financial_entries add column if not exists installment_group_id uuid references installment_groups(id);
alter table financial_entries add column if not exists installment_number integer;
alter table financial_entries add column if not exists installment_total integer;
alter table financial_entries add column if not exists recurring_rule_id uuid references recurring_rules(id);

create index if not exists idx_financial_entries_installment_group on financial_entries(installment_group_id);
create index if not exists idx_financial_entries_recurring_rule on financial_entries(recurring_rule_id);

create trigger trg_recurring_rules_updated_at
  before update on recurring_rules
  for each row execute function set_updated_at();

-- ============================================================================
-- entry_remaining_balance — agora considera juros/multa/acréscimo (aumentam
-- o saldo em aberto) e desconto (reduz o saldo em aberto sem mover caixa).
-- Fórmula: original + juros + multa + acréscimo - desconto - pagos válidos
-- (seção 20 do escopo). Como interest/penalty/addition e discount ficam
-- dentro de cada liquidação, e "amount" nela é o total de caixa que se
-- moveu (principal + juros + multa + acréscimo), isolamos o "principal"
-- como amount - interest - penalty - addition.
-- ============================================================================
create or replace function entry_remaining_balance(p_entry_id uuid)
returns numeric
language sql
stable
as $$
  select fe.original_amount - coalesce((
    select sum((fs.amount - fs.interest - fs.penalty - fs.addition) + fs.discount)
    from financial_settlements fs
    where fs.entry_id = fe.id and fs.status = 'valido'
  ), 0)
  from financial_entries fe
  where fe.id = p_entry_id;
$$;

-- ============================================================================
-- settle_entry — reescrita para suportar liquidação parcial e encargos.
-- Substitui a versão da Fase 3 (assinatura diferente).
-- ============================================================================
drop function if exists settle_entry(uuid, uuid, date, uuid, text);

create or replace function settle_entry(
  p_entry_id uuid,
  p_bank_account_id uuid,
  p_settlement_date date,
  p_amount numeric default null, -- valor principal aplicado; null = liquidar o restante
  p_interest numeric default 0,
  p_penalty numeric default 0,
  p_discount numeric default 0,
  p_addition numeric default 0,
  p_payment_method_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
as $$
declare
  v_entry financial_entries%rowtype;
  v_remaining numeric;
  v_principal numeric;
  v_cash_amount numeric;
  v_settlement_id uuid;
  v_new_remaining numeric;
  v_new_status text;
  v_is_partial boolean;
begin
  select * into v_entry from financial_entries
  where id = p_entry_id and organization_id = auth_organization_id();

  if v_entry.id is null then
    raise exception 'Lançamento não encontrado.';
  end if;

  if v_entry.type = 'despesa' and not has_permission('registrar_pagamentos') then
    raise exception 'Sem permissão para registrar pagamentos.';
  end if;
  if v_entry.type = 'receita' and not has_permission('registrar_recebimentos') then
    raise exception 'Sem permissão para registrar recebimentos.';
  end if;

  if v_entry.status not in ('em_aberto', 'agendado', 'parcialmente_pago', 'parcialmente_recebido') then
    raise exception 'Este lançamento não pode ser liquidado no status atual (%).', v_entry.status;
  end if;

  v_remaining := entry_remaining_balance(p_entry_id);
  if v_remaining <= 0 then
    raise exception 'Este lançamento já está totalmente liquidado.';
  end if;

  v_principal := coalesce(p_amount, v_remaining);

  if v_principal <= 0 then
    raise exception 'O valor a liquidar deve ser maior que zero.';
  end if;

  if v_principal > v_remaining then
    raise exception 'O valor informado (%) é maior que o saldo restante (%).', v_principal, v_remaining;
  end if;

  v_is_partial := (v_principal + p_discount) < v_remaining;

  if v_is_partial then
    if v_entry.type = 'despesa' and not has_permission('pagamentos_parciais') then
      raise exception 'Sem permissão para realizar pagamentos parciais.';
    end if;
    if v_entry.type = 'receita' and not has_permission('recebimentos_parciais') then
      raise exception 'Sem permissão para realizar recebimentos parciais.';
    end if;
  end if;

  v_cash_amount := v_principal + p_interest + p_penalty + p_addition;

  insert into financial_settlements (
    organization_id, entry_id, bank_account_id, amount, interest, penalty, discount, addition,
    settlement_date, payment_method_id, notes, created_by
  ) values (
    v_entry.organization_id, p_entry_id, p_bank_account_id, v_cash_amount, p_interest, p_penalty,
    p_discount, p_addition, p_settlement_date, p_payment_method_id, p_notes, auth.uid()
  ) returning id into v_settlement_id;

  v_new_remaining := v_remaining - (v_principal + p_discount);

  if v_new_remaining <= 0 then
    v_new_status := case when v_entry.type = 'despesa' then 'pago' else 'recebido' end;
  else
    v_new_status := case when v_entry.type = 'despesa' then 'parcialmente_pago' else 'parcialmente_recebido' end;
  end if;

  update financial_entries
  set status = v_new_status, updated_by = auth.uid()
  where id = p_entry_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (
    v_entry.organization_id, auth.uid(), 'liquidar', 'financial_entries', p_entry_id,
    jsonb_build_object('status', v_new_status, 'settlement_id', v_settlement_id, 'amount', v_cash_amount, 'partial', v_is_partial)
  );

  return v_settlement_id;
end;
$$;

-- ============================================================================
-- reverse_settlement — estorna uma liquidação específica. Nunca apaga a
-- liquidação (fica marcada como 'estornado' e some dos cálculos), e o
-- status do lançamento é recalculado a partir do saldo restante resultante.
-- ============================================================================
create or replace function reverse_settlement(p_settlement_id uuid, p_reason text default null)
returns void
language plpgsql
as $$
declare
  v_settlement financial_settlements%rowtype;
  v_entry financial_entries%rowtype;
  v_new_remaining numeric;
  v_new_status text;
begin
  select * into v_settlement from financial_settlements
  where id = p_settlement_id and organization_id = auth_organization_id();

  if v_settlement.id is null then
    raise exception 'Liquidação não encontrada.';
  end if;

  if v_settlement.status = 'estornado' then
    raise exception 'Esta liquidação já foi estornada.';
  end if;

  if not has_permission('cancelar_lancamentos') then
    raise exception 'Sem permissão para estornar liquidações.';
  end if;

  select * into v_entry from financial_entries where id = v_settlement.entry_id;

  update financial_settlements
  set status = 'estornado'
  where id = p_settlement_id;

  v_new_remaining := entry_remaining_balance(v_entry.id);

  if v_new_remaining >= v_entry.original_amount then
    v_new_status := 'em_aberto';
  else
    v_new_status := case when v_entry.type = 'despesa' then 'parcialmente_pago' else 'parcialmente_recebido' end;
  end if;

  update financial_entries
  set status = v_new_status, updated_by = auth.uid()
  where id = v_entry.id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (
    v_entry.organization_id, auth.uid(), 'estornar_liquidacao', 'financial_settlements', p_settlement_id,
    jsonb_build_object('reason', p_reason, 'new_entry_status', v_new_status)
  );
end;
$$;

-- ============================================================================
-- create_installment_plan — cria N lançamentos vinculados, com ajuste de
-- arredondamento concentrado na última parcela (para nunca haver diferença
-- entre a soma das parcelas e o valor total).
-- ============================================================================
create or replace function create_installment_plan(
  p_type text,
  p_description text,
  p_counterparty_id uuid,
  p_category_id uuid,
  p_subcategory_id uuid,
  p_cost_center_id uuid,
  p_bank_account_id uuid,
  p_payment_method_id uuid,
  p_total_amount numeric,
  p_installments_count integer,
  p_first_due_date date,
  p_recognition_strategy text default 'por_parcela',
  p_document_number text default null,
  p_notes text default null
)
returns uuid
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
  v_group_id uuid;
  v_installment_amount numeric;
  v_last_amount numeric;
  v_due_date date;
  v_competence date;
  i integer;
begin
  if not has_permission('criar_lancamentos') then
    raise exception 'Sem permissão para criar lançamentos.';
  end if;

  if p_installments_count < 2 then
    raise exception 'Um parcelamento precisa de pelo menos 2 parcelas.';
  end if;

  if p_total_amount <= 0 then
    raise exception 'O valor total deve ser maior que zero.';
  end if;

  insert into installment_groups (organization_id, description, total_amount, installments_count, recognition_strategy, created_by)
  values (v_org, p_description, p_total_amount, p_installments_count, p_recognition_strategy, auth.uid())
  returning id into v_group_id;

  v_installment_amount := round(p_total_amount / p_installments_count, 2);
  v_last_amount := p_total_amount - (v_installment_amount * (p_installments_count - 1));

  for i in 1..p_installments_count loop
    v_due_date := (p_first_due_date + ((i - 1) * interval '1 month'))::date;

    v_competence := case p_recognition_strategy
      when 'competencia_original' then p_first_due_date
      when 'por_parcela' then v_due_date
      else null
    end;

    insert into financial_entries (
      organization_id, type, description, counterparty_id, category_id, subcategory_id,
      cost_center_id, bank_account_id, payment_method_id, original_amount, competence_date,
      due_date, document_number, notes, origin, installment_group_id, installment_number, installment_total,
      created_by, updated_by
    ) values (
      v_org, p_type, p_description || ' (' || i || '/' || p_installments_count || ')', p_counterparty_id,
      p_category_id, p_subcategory_id, p_cost_center_id, p_bank_account_id, p_payment_method_id,
      case when i = p_installments_count then v_last_amount else v_installment_amount end,
      v_competence, v_due_date, p_document_number, p_notes, 'manual', v_group_id, i, p_installments_count,
      auth.uid(), auth.uid()
    );
  end loop;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_org, auth.uid(), 'criar_parcelamento', 'installment_groups', v_group_id,
          jsonb_build_object('installments_count', p_installments_count, 'total_amount', p_total_amount));

  return v_group_id;
end;
$$;

-- ============================================================================
-- generate_recurring_instances — gera ocorrências futuras até p_months_ahead
-- meses à frente, continuando sempre a partir da última já gerada (nunca
-- duplica). Chamada sob demanda pela tela de Recorrências.
-- ============================================================================
create or replace function generate_recurring_instances(p_rule_id uuid, p_months_ahead integer default 12)
returns integer
language plpgsql
as $$
declare
  v_rule recurring_rules%rowtype;
  v_org uuid := auth_organization_id();
  v_horizon date := (current_date + (p_months_ahead || ' months')::interval)::date;
  v_next_date date;
  v_count integer := 0;
  v_step interval;
  v_occurrence_count integer;
  v_dow integer;
begin
  select * into v_rule from recurring_rules where id = p_rule_id and organization_id = v_org;
  if v_rule.id is null then
    raise exception 'Recorrência não encontrada.';
  end if;

  if not has_permission('criar_lancamentos') then
    raise exception 'Sem permissão para criar lançamentos.';
  end if;

  if v_rule.status != 'ativa' then
    raise exception 'Esta recorrência está inativa.';
  end if;

  v_step := case v_rule.frequency
    when 'semanal' then (7 * v_rule.interval_count || ' days')::interval
    when 'mensal' then (v_rule.interval_count || ' months')::interval
    when 'bimestral' then ((2 * v_rule.interval_count) || ' months')::interval
    when 'trimestral' then ((3 * v_rule.interval_count) || ' months')::interval
    when 'semestral' then ((6 * v_rule.interval_count) || ' months')::interval
    when 'anual' then (v_rule.interval_count || ' years')::interval
  end;

  select coalesce(max(due_date), v_rule.start_date - v_step) into v_next_date
  from financial_entries
  where recurring_rule_id = p_rule_id;

  select count(*) into v_occurrence_count from financial_entries where recurring_rule_id = p_rule_id;

  loop
    v_next_date := (v_next_date + v_step)::date;
    exit when v_next_date > v_horizon;
    exit when v_rule.end_date is not null and v_next_date > v_rule.end_date;
    exit when v_rule.max_occurrences is not null and v_occurrence_count >= v_rule.max_occurrences;

    if v_rule.adjust_business_day then
      v_dow := extract(dow from v_next_date);
      if v_dow = 0 then
        v_next_date := v_next_date + 1;
      elsif v_dow = 6 then
        v_next_date := v_next_date + 2;
      end if;
    end if;

    insert into financial_entries (
      organization_id, type, description, counterparty_id, category_id, subcategory_id,
      cost_center_id, bank_account_id, payment_method_id, original_amount, competence_date,
      due_date, origin, recurring_rule_id, created_by, updated_by
    ) values (
      v_org, v_rule.type, v_rule.description, v_rule.counterparty_id, v_rule.category_id, v_rule.subcategory_id,
      v_rule.cost_center_id, v_rule.bank_account_id, v_rule.payment_method_id, v_rule.amount, v_next_date,
      v_next_date, 'recorrencia', p_rule_id, auth.uid(), auth.uid()
    );

    v_occurrence_count := v_occurrence_count + 1;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ============================================================================
-- cancel_recurring_occurrences — cancela por escopo: 'uma' | 'futuras' | 'toda'
-- ============================================================================
create or replace function cancel_recurring_occurrences(
  p_rule_id uuid,
  p_scope text,
  p_from_entry_id uuid default null
)
returns integer
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
  v_rule recurring_rules%rowtype;
  v_from_due_date date;
  v_count integer := 0;
begin
  select * into v_rule from recurring_rules where id = p_rule_id and organization_id = v_org;
  if v_rule.id is null then
    raise exception 'Recorrência não encontrada.';
  end if;

  if not has_permission('cancelar_lancamentos') then
    raise exception 'Sem permissão para cancelar lançamentos.';
  end if;

  if p_scope = 'toda' then
    update recurring_rules set status = 'inativa', updated_by = auth.uid() where id = p_rule_id;

    update financial_entries
    set status = 'cancelado', updated_by = auth.uid()
    where recurring_rule_id = p_rule_id and status in ('rascunho', 'em_aberto', 'agendado');
    get diagnostics v_count = row_count;

  elsif p_scope = 'futuras' then
    if p_from_entry_id is null then
      raise exception 'Informe a partir de qual ocorrência cancelar.';
    end if;
    select due_date into v_from_due_date from financial_entries where id = p_from_entry_id;

    update recurring_rules set end_date = v_from_due_date - 1, updated_by = auth.uid() where id = p_rule_id;

    update financial_entries
    set status = 'cancelado', updated_by = auth.uid()
    where recurring_rule_id = p_rule_id and due_date >= v_from_due_date
      and status in ('rascunho', 'em_aberto', 'agendado');
    get diagnostics v_count = row_count;

  elsif p_scope = 'uma' then
    if p_from_entry_id is null then
      raise exception 'Informe qual ocorrência cancelar.';
    end if;
    update financial_entries
    set status = 'cancelado', updated_by = auth.uid()
    where id = p_from_entry_id and recurring_rule_id = p_rule_id
      and status in ('rascunho', 'em_aberto', 'agendado');
    get diagnostics v_count = row_count;
  else
    raise exception 'Escopo inválido: %', p_scope;
  end if;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_org, auth.uid(), 'cancelar_recorrencia', 'recurring_rules', p_rule_id,
          jsonb_build_object('scope', p_scope, 'affected', v_count));

  return v_count;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table installment_groups enable row level security;
alter table recurring_rules enable row level security;

create policy "installment_groups_select" on installment_groups for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_lancamentos'));
create policy "installment_groups_insert" on installment_groups for insert
  with check (organization_id = auth_organization_id() and has_permission('criar_lancamentos'));

create policy "recurring_rules_select" on recurring_rules for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_lancamentos'));
create policy "recurring_rules_insert" on recurring_rules for insert
  with check (organization_id = auth_organization_id() and has_permission('criar_lancamentos'));
create policy "recurring_rules_update" on recurring_rules for update
  using (
    organization_id = auth_organization_id()
    and (has_permission('criar_lancamentos') or has_permission('cancelar_lancamentos'))
  )
  with check (organization_id = auth_organization_id());

-- Agora permitimos update em financial_settlements (para o estorno mudar o status).
create policy "financial_settlements_update" on financial_settlements for update
  using (organization_id = auth_organization_id() and has_permission('cancelar_lancamentos'))
  with check (organization_id = auth_organization_id());
