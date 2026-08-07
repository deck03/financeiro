-- ============================================================================
-- DECK 03 — Correção crítica: importação OFX não gravava nenhuma transação
-- ============================================================================
-- Bug: os índices únicos que garantem "não duplicar transação" são parciais
-- (ux_bank_tx_fitid ... where ofx_transaction_id is not null; ux_bank_tx_hash
-- ... where ofx_transaction_id is null). O Postgres NÃO aceita um índice
-- parcial como alvo de "ON CONFLICT (colunas)" a menos que o predicado seja
-- repetido na própria cláusula ON CONFLICT — e o cliente usado pela
-- aplicação (upsert do Supabase) não tem como especificar esse predicado.
-- Resultado: TODA chamada de importação (confirmOfxImportAction) falhava
-- com erro do Postgres ("no unique or exclusion constraint matching the
-- ON CONFLICT specification") — e esse erro estava sendo silenciosamente
-- descartado no código da aplicação, então a tela sempre mostrava
-- "importação concluída" mesmo sem gravar nenhuma linha.
--
-- Efeito prático: nenhuma transação OFX foi realmente salva desde a
-- Fase 9 — a tela de Conciliação sempre aparece vazia depois de importar.
--
-- Correção (nível de banco):
-- 1. ux_bank_tx_fitid vira um índice único NÃO parcial em
--    (bank_account_id, ofx_transaction_id). Isso continua correto sem a
--    condição: por padrão, o Postgres trata múltiplos valores NULL como
--    distintos entre si em um índice único — várias linhas com
--    ofx_transaction_id nulo continuam podendo coexistir.
-- 2. Para o hash (usado só quando não há FITID), a mesma solução não
--    bastava, porque o índice parcial ali tinha um propósito real: não
--    aplicar a unicidade do hash a transações que JÁ têm FITID. Resolvido
--    com uma coluna gerada (hash_dedupe_key), que só recebe o hash quando
--    ofx_transaction_id é nulo — e um índice único comum sobre essa coluna.
-- (Correção de código complementar em confirmOfxImportAction, que passa a
-- checar e reportar erros em vez de descartá-los.)
-- ============================================================================

drop index if exists ux_bank_tx_fitid;
drop index if exists ux_bank_tx_hash;

create unique index if not exists ux_bank_tx_fitid
  on bank_transactions(bank_account_id, ofx_transaction_id);

alter table bank_transactions add column if not exists hash_dedupe_key text
  generated always as (case when ofx_transaction_id is null then transaction_hash else null end) stored;

create unique index if not exists ux_bank_tx_hash_dedupe
  on bank_transactions(bank_account_id, hash_dedupe_key);

comment on column bank_transactions.hash_dedupe_key is
  'Espelha transaction_hash só quando não há FITID — existe para permitir um índice único comum (não parcial), que o upsert da aplicação consegue usar como alvo de ON CONFLICT.';

-- A leitura das transações importadas passa a valer também para quem só
-- tem a permissão de importar (antes exigia só 'realizar_conciliacao') —
-- sem isso, um operador que só importa (sem conciliar) também esbarraria
-- num problema parecido: o INSERT funcionaria, mas o retorno da linha
-- inserida (usado para contar quantas foram gravadas) ficaria bloqueado
-- pela política de leitura, voltando a mostrar contagem zerada por engano.
drop policy if exists "bank_transactions_select" on bank_transactions;
create policy "bank_transactions_select" on bank_transactions for select
  using (organization_id = auth_organization_id() and (has_permission('realizar_conciliacao') or has_permission('importar_ofx')));
