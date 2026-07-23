-- ============================================================================
-- DECK 03 — Ajuste: data de competência em parcelamentos e recorrências
-- ============================================================================
-- Duas lacunas identificadas depois da entrega:
--
-- 1. Parcelamento com reconhecimento "Integralmente na competência original"
--    já existia (Fase 5), mas usava sempre o primeiro vencimento como a
--    competência — sem o usuário poder escolher outra data explicitamente.
--
-- 2. Recorrência não tinha um conceito de competência independente do
--    vencimento: a competência de cada ocorrência sempre era igual ao
--    vencimento daquela ocorrência. Não existia como pedir "mesmo dia do
--    mês, mas em um dia diferente do vencimento" (ex.: vencimento no dia 10
--    do mês seguinte, competência no último dia do mês de referência).
--
-- Ambas as mudanças são 100% retrocompatíveis: se o campo novo não for
-- informado, o comportamento é idêntico ao que já existia.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Parcelamento: data de competência única, explícita
-- ----------------------------------------------------------------------------
alter table installment_groups add column if not exists single_competence_date date;

comment on column installment_groups.single_competence_date is
  'Data de competência única, usada em todas as parcelas quando recognition_strategy = competencia_original. Se nula, mantém o comportamento anterior: usa o primeiro vencimento.';

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
  p_notes text default null,
  p_competence_date date default null
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

  insert into installment_groups (
    organization_id, description, total_amount, installments_count, recognition_strategy,
    single_competence_date, created_by
  )
  values (v_org, p_description, p_total_amount, p_installments_count, p_recognition_strategy,
    case when p_recognition_strategy = 'competencia_original' then p_competence_date else null end,
    auth.uid())
  returning id into v_group_id;

  v_installment_amount := round(p_total_amount / p_installments_count, 2);
  v_last_amount := p_total_amount - (v_installment_amount * (p_installments_count - 1));

  for i in 1..p_installments_count loop
    v_due_date := (p_first_due_date + ((i - 1) * interval '1 month'))::date;

    v_competence := case p_recognition_strategy
      -- Antes desta migration, sempre usava p_first_due_date. Agora, se o
      -- usuário informou uma data de competência explícita, ela prevalece;
      -- caso contrário, mantém o comportamento anterior.
      when 'competencia_original' then coalesce(p_competence_date, p_first_due_date)
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

-- ----------------------------------------------------------------------------
-- 2. Recorrência: âncora de competência independente do vencimento
-- ----------------------------------------------------------------------------
alter table recurring_rules add column if not exists competence_anchor_date date;

comment on column recurring_rules.competence_anchor_date is
  'Dia de referência para a competência de cada ocorrência: avança na mesma cadência do vencimento (mesmo dia do mês, mudando o mês), mas não recebe o ajuste de dia útil. Se nula, mantém o comportamento anterior: competência = vencimento de cada ocorrência.';

create or replace function generate_recurring_instances(p_rule_id uuid, p_months_ahead integer default 12)
returns integer
language plpgsql
as $$
declare
  v_rule recurring_rules%rowtype;
  v_org uuid := auth_organization_id();
  v_horizon date := (current_date + (p_months_ahead || ' months')::interval)::date;
  v_next_date date;
  v_next_competence date;
  v_has_competence_anchor boolean;
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

  v_has_competence_anchor := v_rule.competence_anchor_date is not null;
  if v_has_competence_anchor then
    select coalesce(max(competence_date), v_rule.competence_anchor_date - v_step) into v_next_competence
    from financial_entries
    where recurring_rule_id = p_rule_id;
  end if;

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

    if v_has_competence_anchor then
      -- Avança na mesma cadência do vencimento, mantendo o dia do mês da
      -- âncora — sem ajuste de dia útil (competência é uma data contábil,
      -- não uma data de pagamento).
      v_next_competence := (v_next_competence + v_step)::date;
    else
      -- Comportamento anterior a esta migration: competência = vencimento.
      v_next_competence := v_next_date;
    end if;

    insert into financial_entries (
      organization_id, type, description, counterparty_id, category_id, subcategory_id,
      cost_center_id, bank_account_id, payment_method_id, original_amount, competence_date,
      due_date, origin, recurring_rule_id, created_by, updated_by
    ) values (
      v_org, v_rule.type, v_rule.description, v_rule.counterparty_id, v_rule.category_id, v_rule.subcategory_id,
      v_rule.cost_center_id, v_rule.bank_account_id, v_rule.payment_method_id, v_rule.amount, v_next_competence,
      v_next_date, 'recorrencia', p_rule_id, auth.uid(), auth.uid()
    );

    v_occurrence_count := v_occurrence_count + 1;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
