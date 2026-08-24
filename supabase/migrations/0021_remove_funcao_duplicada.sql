-- ============================================================================
-- DECK 03 — Corrige duas versões de reconcile_with_existing_entry
-- ============================================================================
-- A migration anterior (0020) mudou a quantidade de parâmetros da função
-- reconcile_with_existing_entry (adicionou p_mark_as_fully_settled). O
-- Postgres só substitui uma função com "create or replace" quando a lista
-- de parâmetros é EXATAMENTE igual à existente — como mudou, ele criou uma
-- SEGUNDA função com o mesmo nome (sobrecarga/overload) em vez de
-- substituir a antiga. Com duas versões coexistindo, o Postgres não
-- consegue decidir sozinho qual chamar quando o Supabase manda os
-- parâmetros nomeados — daí o erro "Could not choose the best candidate
-- function".
--
-- Correção: remove explicitamente a assinatura antiga (4 parâmetros),
-- deixando só a nova (5 parâmetros, já criada pela migration 0020).
-- ============================================================================

drop function if exists reconcile_with_existing_entry(uuid, uuid, numeric, uuid);
