-- ============================================================================
-- DECK 03 — Melhoria + correção: competência nos lançamentos da conciliação
-- ============================================================================
-- Melhoria pedida: ao criar um lançamento direto da conciliação bancária,
-- o operador não conseguia informar a data de competência.
--
-- Ao investigar, uma lacuna mais séria apareceu: reconcile_with_new_entry()
-- nunca gravava competence_date nenhuma — todo lançamento criado a partir
-- da conciliação ficava com competência NULA. Isso não é só falta de
-- transparência: um lançamento sem competência não aparece em NENHUM
-- período da DRE em regime de competência (a consulta filtra por
-- competence_date between "de" e "até" — nulo nunca bate com nada).
--
-- Correção: reconcile_with_new_entry() passa a aceitar p_competence_date;
-- se não for informado, usa a data da própria transação bancária como
-- padrão (mesma data já usada para o vencimento) — nunca mais grava nulo.
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
  p_notes text default null,
  p_competence_date date default null
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
    cost_center_id, bank_account_id, payment_method_id, original_amount, competence_date,
    due_date, document_number, notes, origin, created_by, updated_by
  ) values (
    v_org, v_type, coalesce(p_description, v_tx.description), p_counterparty_id, p_category_id,
    p_subcategory_id, p_cost_center_id, v_tx.bank_account_id, p_payment_method_id, abs(v_tx.amount),
    coalesce(p_competence_date, v_tx.transaction_date),
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

-- Corrige lançamentos já criados pela conciliação antes desta migration,
-- que ficaram com competência nula — usa o próprio vencimento como
-- competência, mesmo critério do novo padrão acima. Isso é uma melhoria
-- estrita (nulo -> uma data), nunca sobrescreve uma competência já
-- preenchida manualmente depois.
update financial_entries
set competence_date = due_date
where origin = 'ofx' and competence_date is null;
