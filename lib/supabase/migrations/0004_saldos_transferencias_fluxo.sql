-- ============================================================================
-- DECK 03 — Fase 4: Saldos, transferências e fluxo de caixa realizado
-- ============================================================================

-- ----------------------------------------------------------------------------
-- transfers
-- Movimentações entre duas contas cadastradas. Nunca entram em
-- financial_entries — por construção, uma transferência nunca pode ser
-- confundida com receita ou despesa (seção 16 do escopo).
-- ----------------------------------------------------------------------------
create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  from_bank_account_id uuid not null references bank_accounts(id),
  to_bank_account_id uuid not null references bank_accounts(id),
  amount numeric(14, 2) not null check (amount > 0),
  transfer_date date not null,
  classification text not null default 'transferencia_interna' check (
    classification in (
      'transferencia_interna', 'distribuicao_lucros', 'retirada_socio', 'adiantamento_socio',
      'reembolso_socio', 'despesa_pessoal', 'aporte_socio', 'devolucao_adiantamento'
    )
  ),
  notes text,
  status text not null default 'valido' check (status in ('valido', 'estornado')),
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint transfers_accounts_differ check (from_bank_account_id != to_bank_account_id)
);

comment on table transfers is 'Transferências entre contas. Nunca representam receita ou despesa e não entram na DRE nem no fluxo de caixa operacional — apenas movimentam saldo entre contas.';

create index if not exists idx_transfers_org on transfers(organization_id);
create index if not exists idx_transfers_from on transfers(from_bank_account_id);
create index if not exists idx_transfers_to on transfers(to_bank_account_id);
create index if not exists idx_transfers_date on transfers(transfer_date);

-- Impede que uma transferência entre contas de titularidades diferentes
-- (ex.: DECK 03 -> pessoa física) seja classificada como "transferência
-- interna comum" — precisa de uma classificação específica (seção 16).
create or replace function validate_transfer()
returns trigger
language plpgsql
as $$
declare
  v_from_ownership text;
  v_to_ownership text;
begin
  select ownership into v_from_ownership from bank_accounts where id = new.from_bank_account_id;
  select ownership into v_to_ownership from bank_accounts where id = new.to_bank_account_id;

  if v_from_ownership is distinct from v_to_ownership and new.classification = 'transferencia_interna' then
    raise exception 'Transferências entre contas de titularidades diferentes (empresarial/pessoal) exigem uma classificação específica, não "transferência interna".';
  end if;

  return new;
end;
$$;

create trigger trg_validate_transfer
  before insert on transfers
  for each row execute function validate_transfer();

-- ----------------------------------------------------------------------------
-- bank_balance_snapshots
-- Conferência manual: compara o saldo calculado pelo sistema com o saldo
-- informado (extrato do banco), registrando a diferença de forma rastreável.
-- O ajuste, se necessário, é feito por lançamento manual — nunca silencioso
-- (seção 20 do escopo).
-- ----------------------------------------------------------------------------
create table if not exists bank_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id),
  snapshot_date date not null,
  calculated_balance numeric(14, 2) not null,
  informed_balance numeric(14, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_snapshots_org on bank_balance_snapshots(organization_id);
create index if not exists idx_snapshots_account on bank_balance_snapshots(bank_account_id);

-- ============================================================================
-- Atualiza bank_account_balance para incluir transferências
-- ============================================================================
create or replace function bank_account_balance(p_account_id uuid)
returns numeric
language sql
stable
as $$
  select ba.initial_balance
    + coalesce((
        select sum(case when fe.type = 'receita' then fs.amount else -fs.amount end)
        from financial_settlements fs
        join financial_entries fe on fe.id = fs.entry_id
        where fs.bank_account_id = ba.id and fs.status = 'valido'
      ), 0)
    + coalesce((
        select sum(t.amount) from transfers t
        where t.to_bank_account_id = ba.id and t.status = 'valido'
      ), 0)
    - coalesce((
        select sum(t.amount) from transfers t
        where t.from_bank_account_id = ba.id and t.status = 'valido'
      ), 0)
  from bank_accounts ba
  where ba.id = p_account_id;
$$;

-- Saldo de uma conta em uma data específica (inclusive) — usado pelo fluxo de
-- caixa realizado para calcular o saldo inicial do período, e reutilizável
-- pela Fase 6 (fluxo de caixa projetado).
create or replace function bank_account_balance_at(p_account_id uuid, p_as_of date)
returns numeric
language sql
stable
as $$
  select ba.initial_balance
    + coalesce((
        select sum(case when fe.type = 'receita' then fs.amount else -fs.amount end)
        from financial_settlements fs
        join financial_entries fe on fe.id = fs.entry_id
        where fs.bank_account_id = ba.id and fs.status = 'valido' and fs.settlement_date <= p_as_of
      ), 0)
    + coalesce((
        select sum(t.amount) from transfers t
        where t.to_bank_account_id = ba.id and t.status = 'valido' and t.transfer_date <= p_as_of
      ), 0)
    - coalesce((
        select sum(t.amount) from transfers t
        where t.from_bank_account_id = ba.id and t.status = 'valido' and t.transfer_date <= p_as_of
      ), 0)
  from bank_accounts ba
  where ba.id = p_account_id;
$$;

-- ============================================================================
-- Cria uma transferência de forma atômica, com checagem de permissão e
-- auditoria — mesmo padrão de settle_entry/cancel_entry (seção 39).
-- ============================================================================
create or replace function create_transfer(
  p_from_bank_account_id uuid,
  p_to_bank_account_id uuid,
  p_amount numeric,
  p_transfer_date date,
  p_classification text,
  p_notes text default null
)
returns uuid
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
  v_id uuid;
begin
  if not has_permission('criar_transferencias') then
    raise exception 'Sem permissão para criar transferências.';
  end if;

  if p_from_bank_account_id = p_to_bank_account_id then
    raise exception 'A conta de origem e a conta de destino não podem ser a mesma.';
  end if;

  if p_amount <= 0 then
    raise exception 'O valor da transferência deve ser maior que zero.';
  end if;

  insert into transfers (
    organization_id, from_bank_account_id, to_bank_account_id, amount, transfer_date,
    classification, notes, created_by
  ) values (
    v_org, p_from_bank_account_id, p_to_bank_account_id, p_amount, p_transfer_date,
    p_classification, p_notes, auth.uid()
  ) returning id into v_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (
    v_org, auth.uid(), 'criar_transferencia', 'transfers', v_id,
    jsonb_build_object('amount', p_amount, 'classification', p_classification)
  );

  return v_id;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table transfers enable row level security;
alter table bank_balance_snapshots enable row level security;

create policy "transfers_select" on transfers for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_saldos'));

create policy "transfers_insert" on transfers for insert
  with check (organization_id = auth_organization_id() and has_permission('criar_transferencias'));

create policy "snapshots_select" on bank_balance_snapshots for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_saldos'));

create policy "snapshots_insert" on bank_balance_snapshots for insert
  with check (organization_id = auth_organization_id() and has_permission('alterar_contas_bancarias'));
