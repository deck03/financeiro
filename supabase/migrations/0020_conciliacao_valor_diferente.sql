-- ============================================================================
-- DECK 03 — Conciliar mesmo com valor diferente do lançamento
-- ============================================================================
-- Antes, reconcile_with_existing_entry() já aceitava um valor diferente do
-- saldo restante, mas só funcionava numa direção: se o banco transferiu
-- MENOS que o restante, virava liquidação parcial automaticamente (sem
-- opção); se transferiu MAIS, a função travava com erro ("valor maior que
-- o saldo"), bloqueando a conciliação por completo — problema comum em
-- recorrências cujo valor varia um pouco a cada mês (ex.: aluguel com
-- reajuste, taxa de agregador com desconto de tarifa variável).
--
-- Agora existe uma escolha explícita, feita na hora da conciliação:
-- - Liquidação parcial (padrão): grava exatamente o valor informado; o
--   lançamento fica em aberto pela diferença. Comportamento idêntico ao
--   que já existia quando o valor é menor que o restante.
-- - Considerar totalmente liquidado: fecha o lançamento por completo,
--   usando o saldo restante como valor liquidado — nunca mais trava por
--   valor maior que o saldo. O valor real da transação bancária continua
--   registrado em bank_transactions.amount, para conferência.
-- ============================================================================

create or replace function reconcile_with_existing_entry(
  p_bank_transaction_id uuid,
  p_entry_id uuid,
  p_amount numeric default null,
  p_payment_method_id uuid default null,
  p_mark_as_fully_settled boolean default false
)
returns uuid
language plpgsql
as $$
declare
  v_tx bank_transactions%rowtype;
  v_settlement_id uuid;
  v_amount numeric;
  v_remaining numeric;
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

  v_amount := coalesce(p_amount, abs(v_tx.amount));

  if p_mark_as_fully_settled then
    -- O operador escolheu considerar o lançamento totalmente liquidado
    -- mesmo que o valor da transação seja diferente do lançamento. Trava
    -- o valor efetivamente liquidado no saldo restante — assim o
    -- lançamento sempre fecha certinho, esteja o valor do banco um pouco
    -- acima ou abaixo do esperado, e settle_entry() nunca recusa por
    -- "valor maior que o saldo". O valor real da transação bancária
    -- continua registrado em bank_transactions.amount, intacto.
    select entry_remaining_balance(p_entry_id) into v_remaining;
    if v_remaining is not null and v_remaining > 0 then
      v_amount := v_remaining;
    end if;
  end if;

  v_settlement_id := settle_entry(
    p_entry_id,
    v_tx.bank_account_id,
    v_tx.transaction_date,
    v_amount,
    0, 0, 0, 0,
    p_payment_method_id,
    'Conciliado a partir de importação OFX'
  );

  insert into reconciliation_links (organization_id, bank_transaction_id, settlement_id, created_by)
  values (v_tx.organization_id, p_bank_transaction_id, v_settlement_id, auth.uid());

  update bank_transactions set status = 'conciliada' where id = p_bank_transaction_id;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, new_value)
  values (v_tx.organization_id, auth.uid(), 'conciliar', 'bank_transactions', p_bank_transaction_id,
          jsonb_build_object(
            'entry_id', p_entry_id,
            'settlement_id', v_settlement_id,
            'valor_liquidado', v_amount,
            'valor_transacao_bancaria', abs(v_tx.amount),
            'liquidacao_total_forcada', p_mark_as_fully_settled
          ));

  return v_settlement_id;
end;
$$;
