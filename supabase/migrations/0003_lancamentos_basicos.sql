-- ============================================================================
-- DECK 03 — Fase 3: Lançamentos financeiros básicos
-- Contas a pagar/receber, liquidações (pagamento/recebimento integral),
-- cancelamento e anexos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- financial_entries
-- O lançamento em si. NUNCA guarda "quanto já foi pago" — isso fica em
-- financial_settlements, para nunca sobrescrever o valor original (seção 13).
-- ----------------------------------------------------------------------------
create table if not exists financial_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('receita', 'despesa')), -- 'transferencia' entra na Fase 4
  description text not null,
  counterparty_id uuid references counterparties(id),
  category_id uuid not null references chart_account_categories(id),
  subcategory_id uuid references chart_account_subcategories(id),
  cost_center_id uuid references cost_centers(id),
  bank_account_id uuid references bank_accounts(id),
  payment_method_id uuid references payment_methods(id),
  original_amount numeric(14, 2) not null check (original_amount > 0),
  issue_date date,
  competence_date date,
  due_date date not null,
  document_number text,
  notes text,
  status text not null default 'em_aberto' check (
    status in (
      'rascunho', 'em_aberto', 'agendado', 'parcialmente_pago', 'parcialmente_recebido',
      'pago', 'recebido', 'vencido', 'cancelado', 'estornado'
    )
  ),
  origin text not null default 'manual' check (
    origin in ('manual', 'ofx', 'importacao', 'recorrencia', 'integracao', 'ajuste')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

comment on table financial_entries is 'Lançamento financeiro (conta a pagar ou a receber). O saldo restante é sempre calculado a partir de financial_settlements, nunca armazenado aqui.';
comment on column financial_entries.status is 'Fase 3 usa apenas: em_aberto, pago, recebido, cancelado. Os demais valores existem desde já para não exigir alteração de schema nas fases futuras (parcelamento, recorrência, estorno).';

create index if not exists idx_financial_entries_org on financial_entries(organization_id);
create index if not exists idx_financial_entries_status on financial_entries(status);
create index if not exists idx_financial_entries_due_date on financial_entries(due_date);
create index if not exists idx_financial_entries_competence_date on financial_entries(competence_date);
create index if not exists idx_financial_entries_bank_account on financial_entries(bank_account_id);
create index if not exists idx_financial_entries_counterparty on financial_entries(counterparty_id);
create index if not exists idx_financial_entries_category on financial_entries(category_id);
create index if not exists idx_financial_entries_cost_center on financial_entries(cost_center_id);
create index if not exists idx_financial_entries_created_at on financial_entries(created_at);

-- ----------------------------------------------------------------------------
-- financial_settlements
-- Cada liquidação (pagamento/recebimento) fica registrada separadamente.
-- Fase 3 sempre cria uma liquidação com o valor integral do lançamento —
-- a estrutura já suporta múltiplas liquidações parciais para a Fase 5.
-- ----------------------------------------------------------------------------
create table if not exists financial_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entry_id uuid not null references financial_entries(id) on delete restrict,
  bank_account_id uuid not null references bank_accounts(id),
  amount numeric(14, 2) not null check (amount > 0),
  interest numeric(14, 2) not null default 0,
  penalty numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  settlement_date date not null,
  payment_method_id uuid references payment_methods(id),
  notes text,
  status text not null default 'valido' check (status in ('valido', 'estornado')),
  created_at timestamptz not null default now(),
  created_by uuid
);

comment on table financial_settlements is 'Liquidações (pagamentos/recebimentos) vinculadas a um lançamento. O saldo restante do lançamento é original_amount menos a soma das liquidações válidas.';

create index if not exists idx_settlements_org on financial_settlements(organization_id);
create index if not exists idx_settlements_entry on financial_settlements(entry_id);
create index if not exists idx_settlements_bank_account on financial_settlements(bank_account_id);
create index if not exists idx_settlements_settlement_date on financial_settlements(settlement_date);

-- ----------------------------------------------------------------------------
-- attachments
-- Metadados dos arquivos anexados a um lançamento. O arquivo em si fica no
-- bucket privado "attachments" do Supabase Storage, sob o caminho
-- "{organization_id}/{entry_id}/{arquivo}".
-- ----------------------------------------------------------------------------
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entry_id uuid not null references financial_entries(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_attachments_org on attachments(organization_id);
create index if not exists idx_attachments_entry on attachments(entry_id);

-- ============================================================================
-- Trigger de updated_at
-- ============================================================================
create trigger trg_financial_entries_updated_at
  before update on financial_entries
  for each row execute function set_updated_at();

-- ============================================================================
-- Funções de cálculo financeiro centralizadas (seção 39 do escopo)
-- ============================================================================

-- Saldo restante de um lançamento: valor original menos as liquidações válidas.
create or replace function entry_remaining_balance(p_entry_id uuid)
returns numeric
language sql
stable
as $$
  select fe.original_amount - coalesce((
    select sum(fs.amount) from financial_settlements fs
    where fs.entry_id = fe.id and fs.status = 'valido'
  ), 0)
  from financial_entries fe
  where fe.id = p_entry_id;
$$;

-- Saldo atual de uma conta bancária: saldo inicial + recebimentos válidos -
-- pagamentos válidos liquidados nessa conta. Transferências entram na Fase 4.
create or replace function bank_account_balance(p_account_id uuid)
returns numeric
language sql
stable
as $$
  select ba.initial_balance + coalesce((
    select sum(case when fe.type = 'receita' then fs.amount else -fs.amount end)
    from financial_settlements fs
    join financial_entries fe on fe.id = fs.entry_id
    where fs.bank_account_id = ba.id and fs.status = 'valido'
  ), 0)
  from bank_accounts ba
  where ba.id = p_account_id;
$$;

-- Liquida um lançamento pelo valor integral restante (única forma suportada
-- na Fase 3). Atualiza o status do lançamento e registra em audit_logs.
-- Roda com os privilégios de quem chama (não SECURITY DEFINER), então as
-- políticas de RLS de financial_settlements e financial_entries continuam
-- valendo — esta função apenas centraliza a regra e garante atomicidade.
create or replace function settle_entry(
  p_entry_id uuid,
  p_bank_account_id uuid,
  p_settlement_date date,
  p_payment_method_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
as $$
declare
  v_entry financial_entries%rowtype;
  v_remaining numeric;
  v_settlement_id uuid;
  v_new_status text;
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

  if v_entry.status not in ('em_aberto', 'agendado') then
    raise exception 'Este lançamento não pode ser liquidado no status atual (%).', v_entry.status;
  end if;

  v_remaining := entry_remaining_balance(p_entry_id);
  if v_remaining <= 0 then
    raise exception 'Este lançamento já está totalmente liquidado.';
  end if;

  insert into financial_settlements (
    organization_id, entry_id, bank_account_id, amount, settlement_date, payment_method_id, notes, created_by
  ) values (
    v_entry.organization_id, p_entry_id, p_bank_account_id, v_remaining, p_settlement_date, p_payment_method_id, p_notes, auth.uid()
  ) returning id into v_settlement_id;

  v_new_status := case when v_entry.type = 'despesa' then 'pago' else 'recebido' end;

  update financial_entries
  set status = v_new_status, updated_by = auth.uid()
  where id = p_entry_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (
    v_entry.organization_id, auth.uid(), 'liquidar', 'financial_entries', p_entry_id,
    jsonb_build_object('status', v_new_status, 'settlement_id', v_settlement_id, 'amount', v_remaining)
  );

  return v_settlement_id;
end;
$$;

-- Cancela um lançamento. Só permitido antes de qualquer liquidação —
-- lançamentos já pagos/recebidos precisam de estorno (Fase 5).
create or replace function cancel_entry(p_entry_id uuid, p_reason text default null)
returns void
language plpgsql
as $$
declare
  v_entry financial_entries%rowtype;
begin
  select * into v_entry from financial_entries
  where id = p_entry_id and organization_id = auth_organization_id();

  if v_entry.id is null then
    raise exception 'Lançamento não encontrado.';
  end if;

  if not has_permission('cancelar_lancamentos') then
    raise exception 'Sem permissão para cancelar lançamentos.';
  end if;

  if v_entry.status not in ('rascunho', 'em_aberto', 'agendado') then
    raise exception 'Este lançamento não pode ser cancelado no status atual (%). Lançamentos já liquidados precisam de estorno.', v_entry.status;
  end if;

  update financial_entries
  set
    status = 'cancelado',
    updated_by = auth.uid(),
    notes = case
      when p_reason is not null and p_reason != '' then coalesce(notes || E'\n', '') || 'Motivo do cancelamento: ' || p_reason
      else notes
    end
  where id = p_entry_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (
    v_entry.organization_id, auth.uid(), 'cancelar', 'financial_entries', p_entry_id,
    jsonb_build_object('status', 'cancelado', 'reason', p_reason)
  );
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table financial_entries enable row level security;
alter table financial_settlements enable row level security;
alter table attachments enable row level security;

create policy "financial_entries_select" on financial_entries for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_lancamentos'));

create policy "financial_entries_insert" on financial_entries for insert
  with check (organization_id = auth_organization_id() and has_permission('criar_lancamentos'));

-- Update coberto por várias ações possíveis (editar em aberto, pagar/receber,
-- cancelar). A regra fina de qual campo pode mudar em qual status vive na
-- camada de aplicação e nas funções acima; esta política é o portão amplo
-- de "precisa ter alguma dessas permissões para eventualmente atualizar".
create policy "financial_entries_update" on financial_entries for update
  using (
    organization_id = auth_organization_id() and (
      has_permission('editar_lancamentos_em_aberto')
      or has_permission('registrar_pagamentos')
      or has_permission('registrar_recebimentos')
      or has_permission('cancelar_lancamentos')
    )
  )
  with check (organization_id = auth_organization_id());

create policy "financial_settlements_select" on financial_settlements for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_lancamentos'));

create policy "financial_settlements_insert" on financial_settlements for insert
  with check (
    organization_id = auth_organization_id()
    and (has_permission('registrar_pagamentos') or has_permission('registrar_recebimentos'))
  );

create policy "attachments_select" on attachments for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_lancamentos'));

create policy "attachments_insert" on attachments for insert
  with check (organization_id = auth_organization_id() and has_permission('anexar_documentos'));

create policy "attachments_delete" on attachments for delete
  using (organization_id = auth_organization_id() and has_permission('anexar_documentos'));

-- ============================================================================
-- Supabase Storage — bucket privado para os anexos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Caminho dos arquivos: "{organization_id}/{entry_id}/{arquivo}" — a política
-- confere se o primeiro segmento do caminho é a organização do usuário.
create policy "attachments_storage_select" on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and has_permission('visualizar_lancamentos')
  );

create policy "attachments_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and has_permission('anexar_documentos')
  );

create policy "attachments_storage_delete" on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and has_permission('anexar_documentos')
  );
