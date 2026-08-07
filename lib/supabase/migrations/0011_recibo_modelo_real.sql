-- ============================================================================
-- DECK 03 — Ajuste: recibo de aluguel no layout do modelo real
-- ============================================================================
-- O recibo (Fase 10) usava um texto corrido, sem os dados bancários fixos
-- nem o vencimento — o locatário pediu o modelo de campos que já usa hoje
-- em papel (Locador/Imóvel fixos, Locatário, Referência, Vencimento, Total,
-- Dados Bancários). Este ajuste:
--
-- 1. Adiciona os campos bancários que faltavam em bank_accounts (código do
--    banco e chave Pix) — os demais (nome do banco, agência, conta,
--    titular, documento) já existiam desde a Fase 2.
-- 2. Adiciona rent_receipts.due_date — o vencimento da conta a receber
--    original, denormalizado no recibo (mesmo padrão já usado para
--    reference_period e space_description: o recibo não muda retroativamente
--    se o lançamento for editado depois).
-- ============================================================================

alter table bank_accounts add column if not exists bank_code text;
alter table bank_accounts add column if not exists pix_key text;

comment on column bank_accounts.bank_code is 'Código do banco (ex.: 341 para Itaú), para exibição em recibos e documentos.';
comment on column bank_accounts.pix_key is 'Chave Pix desta conta, para exibição em recibos e documentos.';

alter table rent_receipts add column if not exists due_date date;

comment on column rent_receipts.due_date is 'Vencimento da conta a receber original, no momento da emissão do recibo (denormalizado — não muda se o lançamento for editado depois).';

-- Recibos já emitidos antes desta migration não têm due_date; preenche a
-- partir do lançamento vinculado, quando possível (recibos antigos com o
-- lançamento ainda existente).
update rent_receipts r
set due_date = fe.due_date
from financial_entries fe
where r.entry_id = fe.id and r.due_date is null;

-- create_rent_receipt: passa a gravar due_date junto com os demais campos
-- denormalizados. Assinatura da função não muda — devido date já vem do
-- lançamento vinculado à liquidação, sem precisar de um parâmetro novo.
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
