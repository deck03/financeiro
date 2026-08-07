-- ============================================================================
-- DECK 03 — Fase 9: Importação OFX e conciliação bancária
-- ============================================================================

-- ----------------------------------------------------------------------------
-- import_batches
-- ----------------------------------------------------------------------------
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id),
  file_name text not null,
  total_transactions integer not null default 0,
  imported_count integer not null default 0,
  duplicate_count integer not null default 0,
  ignored_count integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_import_batches_org on import_batches(organization_id);
create index if not exists idx_import_batches_account on import_batches(bank_account_id);

-- ----------------------------------------------------------------------------
-- import_errors
-- ----------------------------------------------------------------------------
create table if not exists import_errors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  import_batch_id uuid not null references import_batches(id) on delete cascade,
  message text not null,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_errors_batch on import_errors(import_batch_id);

-- ----------------------------------------------------------------------------
-- bank_transactions
-- transaction_hash é usado para deduplicar quando o arquivo não traz FITID
-- (identificador único da transação no banco). Quando o FITID existe, ele é
-- a fonte de verdade para deduplicação — dois índices únicos parciais
-- garantem isso no nível do banco, não só na aplicação.
-- ----------------------------------------------------------------------------
create table if not exists bank_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id),
  import_batch_id uuid references import_batches(id),
  ofx_transaction_id text,
  transaction_hash text not null,
  transaction_date date not null,
  amount numeric(14, 2) not null,
  description text not null default '',
  status text not null default 'nao_conciliada' check (
    status in ('nao_conciliada', 'parcialmente_conciliada', 'conciliada', 'ignorada')
  ),
  created_at timestamptz not null default now(),
  created_by uuid
);

create unique index if not exists ux_bank_tx_fitid
  on bank_transactions(bank_account_id, ofx_transaction_id)
  where ofx_transaction_id is not null;

create unique index if not exists ux_bank_tx_hash
  on bank_transactions(bank_account_id, transaction_hash)
  where ofx_transaction_id is null;

create index if not exists idx_bank_tx_org on bank_transactions(organization_id);
create index if not exists idx_bank_tx_account on bank_transactions(bank_account_id);
create index if not exists idx_bank_tx_status on bank_transactions(status);
create index if not exists idx_bank_tx_date on bank_transactions(transaction_date);

comment on table bank_transactions is 'Transações importadas de extratos bancários (OFX). Deduplicação garantida por índice único (FITID quando disponível, hash como alternativa).';

-- ----------------------------------------------------------------------------
-- reconciliation_links
-- Fase 9 implementa conciliação 1-para-1 (uma transação bancária vinculada
-- a uma liquidação). Conciliação muitos-para-muitos fica para uma fase
-- futura, se necessário — decisão documentada na entrega desta fase.
-- ----------------------------------------------------------------------------
create table if not exists reconciliation_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  bank_transaction_id uuid not null references bank_transactions(id) on delete cascade,
  settlement_id uuid not null references financial_settlements(id),
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (bank_transaction_id)
);

create index if not exists idx_reconciliation_links_org on reconciliation_links(organization_id);
create index if not exists idx_reconciliation_links_settlement on reconciliation_links(settlement_id);

-- ============================================================================
-- reconcile_with_existing_entry — vincula uma transação bancária a um
-- lançamento já existente, reaproveitando settle_entry (Fase 5) para nunca
-- duplicar a regra de liquidação. Se o valor da transação for diferente do
-- saldo restante, quem chama decide o valor (permite liquidação parcial).
-- ============================================================================
create or replace function reconcile_with_existing_entry(
  p_bank_transaction_id uuid,
  p_entry_id uuid,
  p_amount numeric default null,
  p_payment_method_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_tx bank_transactions%rowtype;
  v_settlement_id uuid;
begin
  select * into v_tx from bank_transactions
  where id = p_bank_transaction_id and organization_id = auth_organization_id();

  if v_tx.id is null then
    raise exception 'Transação bancária não encontrada.';
  end if;

  if v_tx.status != 'nao_conciliada' then
    raise exception 'Esta transação já foi conciliada ou ignorada.';
  end if;

  if not has_permission('realizar_conciliacao') then
    raise exception 'Sem permissão para realizar conciliação.';
  end if;

  v_settlement_id := settle_entry(
    p_entry_id,
    v_tx.bank_account_id,
    v_tx.transaction_date,
    coalesce(p_amount, abs(v_tx.amount)),
    0, 0, 0, 0,
    p_payment_method_id,
    'Conciliado a partir de importação OFX'
  );

  insert into reconciliation_links (organization_id, bank_transaction_id, settlement_id, created_by)
  values (v_tx.organization_id, p_bank_transaction_id, v_settlement_id, auth.uid());

  update bank_transactions set status = 'conciliada' where id = p_bank_transaction_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_tx.organization_id, auth.uid(), 'conciliar', 'bank_transactions', p_bank_transaction_id,
          jsonb_build_object('entry_id', p_entry_id, 'settlement_id', v_settlement_id));

  return v_settlement_id;
end;
$$;

-- ============================================================================
-- reconcile_with_new_entry — cria um lançamento já liquidado a partir da
-- transação bancária, e concilia na mesma operação.
-- ============================================================================
create or replace function reconcile_with_new_entry(
  p_bank_transaction_id uuid,
  p_category_id uuid,
  p_description text default null,
  p_counterparty_id uuid default null,
  p_subcategory_id uuid default null,
  p_cost_center_id uuid default null,
  p_payment_method_id uuid default null,
  p_document_number text default null,
  p_notes text default null
)
returns uuid
language plpgsql
as $$
declare
  v_tx bank_transactions%rowtype;
  v_org uuid := auth_organization_id();
  v_entry_id uuid;
  v_settlement_id uuid;
  v_type text;
begin
  select * into v_tx from bank_transactions
  where id = p_bank_transaction_id and organization_id = v_org;

  if v_tx.id is null then
    raise exception 'Transação bancária não encontrada.';
  end if;

  if v_tx.status != 'nao_conciliada' then
    raise exception 'Esta transação já foi conciliada ou ignorada.';
  end if;

  if not has_permission('realizar_conciliacao') or not has_permission('criar_lancamentos') then
    raise exception 'Sem permissão para conciliar criando um novo lançamento.';
  end if;

  v_type := case when v_tx.amount >= 0 then 'receita' else 'despesa' end;

  insert into financial_entries (
    organization_id, type, description, counterparty_id, category_id, subcategory_id,
    cost_center_id, bank_account_id, payment_method_id, original_amount, due_date,
    document_number, notes, origin, created_by, updated_by
  ) values (
    v_org, v_type, coalesce(p_description, v_tx.description), p_counterparty_id, p_category_id,
    p_subcategory_id, p_cost_center_id, v_tx.bank_account_id, p_payment_method_id, abs(v_tx.amount),
    v_tx.transaction_date, p_document_number, p_notes, 'ofx', auth.uid(), auth.uid()
  ) returning id into v_entry_id;

  v_settlement_id := settle_entry(
    v_entry_id, v_tx.bank_account_id, v_tx.transaction_date, null, 0, 0, 0, 0,
    p_payment_method_id, 'Conciliado a partir de importação OFX'
  );

  insert into reconciliation_links (organization_id, bank_transaction_id, settlement_id, created_by)
  values (v_org, p_bank_transaction_id, v_settlement_id, auth.uid());

  update bank_transactions set status = 'conciliada' where id = p_bank_transaction_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_org, auth.uid(), 'conciliar_criando_lancamento', 'bank_transactions', p_bank_transaction_id,
          jsonb_build_object('entry_id', v_entry_id, 'settlement_id', v_settlement_id));

  return v_entry_id;
end;
$$;

-- ============================================================================
-- undo_reconciliation — desfaz a conciliação, estornando a liquidação
-- vinculada (reaproveita reverse_settlement da Fase 5).
-- ============================================================================
create or replace function undo_reconciliation(p_bank_transaction_id uuid)
returns void
language plpgsql
as $$
declare
  v_tx bank_transactions%rowtype;
  v_link reconciliation_links%rowtype;
begin
  select * into v_tx from bank_transactions
  where id = p_bank_transaction_id and organization_id = auth_organization_id();

  if v_tx.id is null then
    raise exception 'Transação bancária não encontrada.';
  end if;

  if not has_permission('realizar_conciliacao') then
    raise exception 'Sem permissão para desfazer conciliação.';
  end if;

  select * into v_link from reconciliation_links where bank_transaction_id = p_bank_transaction_id;

  if v_link.id is null then
    raise exception 'Esta transação não está conciliada.';
  end if;

  perform reverse_settlement(v_link.settlement_id, 'Conciliação desfeita');

  delete from reconciliation_links where id = v_link.id;

  update bank_transactions set status = 'nao_conciliada' where id = p_bank_transaction_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_tx.organization_id, auth.uid(), 'desfazer_conciliacao', 'bank_transactions', p_bank_transaction_id, '{}'::jsonb);
end;
$$;

-- ============================================================================
-- ignore_bank_transaction / unignore_bank_transaction
-- ============================================================================
create or replace function ignore_bank_transaction(p_bank_transaction_id uuid)
returns void
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
begin
  if not has_permission('realizar_conciliacao') then
    raise exception 'Sem permissão para ignorar transações.';
  end if;

  update bank_transactions
  set status = 'ignorada'
  where id = p_bank_transaction_id and organization_id = v_org and status = 'nao_conciliada';

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_org, auth.uid(), 'ignorar_transacao', 'bank_transactions', p_bank_transaction_id, '{}'::jsonb);
end;
$$;

create or replace function unignore_bank_transaction(p_bank_transaction_id uuid)
returns void
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
begin
  if not has_permission('realizar_conciliacao') then
    raise exception 'Sem permissão para esta ação.';
  end if;

  update bank_transactions
  set status = 'nao_conciliada'
  where id = p_bank_transaction_id and organization_id = v_org and status = 'ignorada';
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table import_batches enable row level security;
alter table import_errors enable row level security;
alter table bank_transactions enable row level security;
alter table reconciliation_links enable row level security;

create policy "import_batches_select" on import_batches for select
  using (organization_id = auth_organization_id() and has_permission('realizar_conciliacao'));
create policy "import_batches_insert" on import_batches for insert
  with check (organization_id = auth_organization_id() and has_permission('importar_ofx'));

create policy "import_errors_select" on import_errors for select
  using (organization_id = auth_organization_id() and has_permission('realizar_conciliacao'));
create policy "import_errors_insert" on import_errors for insert
  with check (organization_id = auth_organization_id() and has_permission('importar_ofx'));

create policy "bank_transactions_select" on bank_transactions for select
  using (organization_id = auth_organization_id() and has_permission('realizar_conciliacao'));
create policy "bank_transactions_insert" on bank_transactions for insert
  with check (organization_id = auth_organization_id() and has_permission('importar_ofx'));
create policy "bank_transactions_update" on bank_transactions for update
  using (organization_id = auth_organization_id() and has_permission('realizar_conciliacao'))
  with check (organization_id = auth_organization_id());

create policy "reconciliation_links_select" on reconciliation_links for select
  using (organization_id = auth_organization_id() and has_permission('realizar_conciliacao'));
create policy "reconciliation_links_insert" on reconciliation_links for insert
  with check (organization_id = auth_organization_id() and has_permission('realizar_conciliacao'));
create policy "reconciliation_links_delete" on reconciliation_links for delete
  using (organization_id = auth_organization_id() and has_permission('realizar_conciliacao'));
