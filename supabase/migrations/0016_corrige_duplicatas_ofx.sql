-- ============================================================================
-- DECK 03 — Correção: transações "não conciliadas" duplicando entre importações
-- ============================================================================
-- Causa: a checagem de duplicidade só usava o hash (conta + data + valor +
-- descrição) como critério quando a transação NÃO tinha FITID. Quando tinha
-- FITID, só o FITID era checado. Se o banco não gera um FITID estável entre
-- exportações (a mesma transação real ganha um identificador diferente a
-- cada arquivo baixado — comportamento observado em alguns bancos), o
-- sistema tratava como "nova" e importava de novo.
--
-- Correção de código (confirmOfxImportAction / previewOfxImportAction):
-- o hash agora é checado SEMPRE, com ou sem FITID — uma transação só é
-- considerada nova se nem o FITID nem o hash já existirem na conta.
--
-- Esta migration limpa as duplicatas que já foram criadas por esse motivo:
-- só entre transações AINDA NÃO CONCILIADAS (nunca vinculadas a um
-- lançamento) — nunca mexe em nada que já foi conciliado, para não colocar
-- em risco um lançamento real já criado a partir de uma dessas linhas.
-- ============================================================================

with duplicates as (
  select
    id,
    row_number() over (
      partition by organization_id, bank_account_id, transaction_hash
      order by created_at asc
    ) as rn
  from bank_transactions
  where status = 'nao_conciliada'
)
delete from bank_transactions
where id in (select id from duplicates where rn > 1);
