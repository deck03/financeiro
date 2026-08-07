-- ============================================================================
-- DECK 03 — Completa a parte de Recibos: cancelamento
-- ============================================================================
-- A coluna rent_receipts.status ('ativo'/'cancelado') existia desde a
-- Fase 10, mas nunca foi implementada nenhuma função, tela ou botão para
-- cancelar um recibo emitido por engano — a funcionalidade ficou pela
-- metade. Esta migration completa isso:
--
-- 1. Colunas para registrar quem cancelou, quando e por quê.
-- 2. cancel_rent_receipt(): marca o recibo como cancelado (nunca apaga —
--    a numeração sequencial precisa ficar rastreável mesmo cancelada).
-- 3. create_rent_receipt(): a checagem de "já existe recibo para esta
--    liquidação" passa a considerar só recibos ATIVOS — assim, depois de
--    cancelar um recibo emitido por engano, dá para emitir um novo para o
--    mesmo recebimento.
-- ============================================================================

alter table rent_receipts add column if not exists cancelled_at timestamptz;
alter table rent_receipts add column if not exists cancelled_by uuid references profiles(id);
alter table rent_receipts add column if not exists cancel_reason text;

comment on column rent_receipts.cancelled_at is 'Quando o recibo foi cancelado. Nulo enquanto ativo.';
comment on column rent_receipts.cancel_reason is 'Motivo do cancelamento, informado por quem cancelou.';

create or replace function cancel_rent_receipt(p_receipt_id uuid, p_reason text default null)
returns void
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
  v_receipt rent_receipts%rowtype;
begin
  if not has_permission('gerar_recibos') then
    raise exception 'Sem permissão para cancelar recibos.';
  end if;

  select * into v_receipt from rent_receipts where id = p_receipt_id and organization_id = v_org;

  if v_receipt.id is null then
    raise exception 'Recibo não encontrado.';
  end if;

  if v_receipt.status = 'cancelado' then
    raise exception 'Este recibo já está cancelado.';
  end if;

  update rent_receipts
  set status = 'cancelado', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = p_reason
  where id = p_receipt_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, previous_value, new_value)
  values (v_org, auth.uid(), 'cancelar', 'rent_receipts', p_receipt_id,
          jsonb_build_object('status', 'ativo'),
          jsonb_build_object('status', 'cancelado', 'motivo', p_reason));
end;
$$;

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

  -- Só bloqueia se já existir um recibo ATIVO — um recibo cancelado libera
  -- a liquidação para receber um novo recibo.
  if exists (select 1 from rent_receipts where settlement_id = p_settlement_id and status = 'ativo') then
    raise exception 'Já existe um recibo ativo emitido para esta liquidação.';
  end if;

  select receipt_prefix into v_prefix from organization_settings where organization_id = v_org;
  v_number := reserve_receipt_number();

  insert into rent_receipts (
    organization_id, entry_id, settlement_id, counterparty_id, receipt_number,
    receipt_number_formatted, amount, amount_in_words, payment_date, due_date, reference_period,
    space_description, payment_method_id, notes, verification_code, created_by
  ) values (
    v_org, v_entry.id, p_settlement_id, v_entry.counterparty_id, v_number,
    coalesce(v_prefix, 'REC') || '-' || lpad(v_number::text, 6, '0'),
    v_settlement.amount - v_settlement.interest - v_settlement.penalty - v_settlement.addition + v_settlement.discount,
    p_amount_in_words, v_settlement.settlement_date, v_entry.due_date, p_reference_period,
    p_space_description, v_settlement.payment_method_id, p_notes,
    coalesce(p_verification_code, upper(substr(md5(random()::text), 1, 8))), auth.uid()
  ) returning id into v_receipt_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_org, auth.uid(), 'gerar_recibo', 'rent_receipts', v_receipt_id,
          jsonb_build_object('receipt_number', v_number, 'settlement_id', p_settlement_id));

  return v_receipt_id;
end;
$$;
