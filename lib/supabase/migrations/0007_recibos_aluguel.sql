-- ============================================================================
-- DECK 03 — Fase 10: Recibos de aluguel
-- ============================================================================

-- ----------------------------------------------------------------------------
-- rent_receipts
-- Um recibo é sempre emitido a partir de uma liquidação (financial_settlements)
-- específica — ou seja, de um recebimento já confirmado, nunca de um valor
-- ainda em aberto (seção 26 do escopo: "gerado a partir de recebimento
-- confirmado").
-- ----------------------------------------------------------------------------
create table if not exists rent_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entry_id uuid not null references financial_entries(id),
  settlement_id uuid not null references financial_settlements(id),
  counterparty_id uuid references counterparties(id),
  receipt_number integer not null,
  receipt_number_formatted text not null,
  amount numeric(14, 2) not null,
  amount_in_words text not null,
  payment_date date not null,
  reference_period text,
  space_description text,
  payment_method_id uuid references payment_methods(id),
  notes text,
  verification_code text not null,
  file_path text,
  status text not null default 'ativo' check (status in ('ativo', 'cancelado')),
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (organization_id, receipt_number),
  unique (settlement_id)
);

comment on table rent_receipts is 'Recibos de aluguel gerados a partir de liquidações confirmadas. Não substitui nota fiscal — documento gerencial.';

create index if not exists idx_rent_receipts_org on rent_receipts(organization_id);
create index if not exists idx_rent_receipts_entry on rent_receipts(entry_id);
create index if not exists idx_rent_receipts_counterparty on rent_receipts(counterparty_id);

-- ============================================================================
-- reserve_receipt_number — incrementa o contador de forma atômica (o UPDATE
-- bloqueia a linha até o fim da transação, então duas emissões simultâneas
-- nunca recebem o mesmo número).
-- ============================================================================
create or replace function reserve_receipt_number()
returns integer
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
  v_number integer;
begin
  update organization_settings
  set next_receipt_number = next_receipt_number + 1
  where organization_id = v_org
  returning next_receipt_number - 1 into v_number;

  if v_number is null then
    raise exception 'Configurações da organização não encontradas.';
  end if;

  return v_number;
end;
$$;

-- ============================================================================
-- create_rent_receipt — reserva o número, calcula o valor por extenso não é
-- feito aqui (fica em TypeScript, pois é texto complexo) — a função apenas
-- garante a numeração atômica e valida que a liquidação é de uma receita
-- realmente recebida.
-- ============================================================================
create or replace function create_rent_receipt(
  p_settlement_id uuid,
  p_amount_in_words text,
  p_reference_period text default null,
  p_space_description text default null,
  p_notes text default null,
  p_verification_code text default null
)
returns uuid
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
  v_settlement financial_settlements%rowtype;
  v_entry financial_entries%rowtype;
  v_prefix text;
  v_number integer;
  v_receipt_id uuid;
begin
  if not has_permission('gerar_recibos') then
    raise exception 'Sem permissão para gerar recibos.';
  end if;

  select * into v_settlement from financial_settlements
  where id = p_settlement_id and organization_id = v_org and status = 'valido';

  if v_settlement.id is null then
    raise exception 'Liquidação não encontrada ou não é mais válida.';
  end if;

  select * into v_entry from financial_entries where id = v_settlement.entry_id;

  if v_entry.type != 'receita' then
    raise exception 'Recibos só podem ser emitidos a partir de recebimentos.';
  end if;

  if exists (select 1 from rent_receipts where settlement_id = p_settlement_id) then
    raise exception 'Já existe um recibo emitido para esta liquidação.';
  end if;

  select receipt_prefix into v_prefix from organization_settings where organization_id = v_org;
  v_number := reserve_receipt_number();

  insert into rent_receipts (
    organization_id, entry_id, settlement_id, counterparty_id, receipt_number,
    receipt_number_formatted, amount, amount_in_words, payment_date, reference_period,
    space_description, payment_method_id, notes, verification_code, created_by
  ) values (
    v_org, v_entry.id, p_settlement_id, v_entry.counterparty_id, v_number,
    coalesce(v_prefix, 'REC') || '-' || lpad(v_number::text, 6, '0'),
    v_settlement.amount - v_settlement.interest - v_settlement.penalty - v_settlement.addition + v_settlement.discount,
    p_amount_in_words, v_settlement.settlement_date, p_reference_period,
    p_space_description, v_settlement.payment_method_id, p_notes,
    coalesce(p_verification_code, upper(substr(md5(random()::text), 1, 8))), auth.uid()
  ) returning id into v_receipt_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_org, auth.uid(), 'gerar_recibo', 'rent_receipts', v_receipt_id,
          jsonb_build_object('receipt_number', v_number, 'settlement_id', p_settlement_id));

  return v_receipt_id;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table rent_receipts enable row level security;

create policy "rent_receipts_select" on rent_receipts for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_lancamentos'));

create policy "rent_receipts_insert" on rent_receipts for insert
  with check (organization_id = auth_organization_id() and has_permission('gerar_recibos'));

-- Necessário para preencher file_path depois de gerar e subir o PDF.
create policy "rent_receipts_update" on rent_receipts for update
  using (organization_id = auth_organization_id() and has_permission('gerar_recibos'))
  with check (organization_id = auth_organization_id());

-- ============================================================================
-- Supabase Storage — bucket privado para os PDFs de recibo
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_storage_select" on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and has_permission('visualizar_lancamentos')
  );

create policy "receipts_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and has_permission('gerar_recibos')
  );
