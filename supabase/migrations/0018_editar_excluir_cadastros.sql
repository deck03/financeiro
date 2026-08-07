-- ============================================================================
-- DECK 03 — Editar e excluir cadastros (plano de contas, centros de custo,
-- contas bancárias, contrapartes, formas de pagamento)
-- ============================================================================
-- Edição: a maioria das tabelas de cadastro já usa uma política "for all"
-- (chart_account_families/categories/subcategories, cost_centers,
-- bank_accounts, payment_methods) — ela já cobre UPDATE, então editar mais
-- campos não precisa de nenhuma mudança de banco, só de código novo no
-- aplicativo. Só contrapartes tinha políticas separadas por operação.
--
-- Exclusão: como nenhuma dessas tabelas tem "on delete cascade" a partir
-- de financial_entries (são "on delete restrict" ou sem cascade, ou seja,
-- o padrão do Postgres: bloqueia a exclusão), o próprio banco já impede
-- excluir um cadastro que está em uso — a aplicação só precisa tentar
-- excluir e traduzir o erro de violação de chave estrangeira numa
-- mensagem amigável ("está em uso, desative em vez de excluir").
--
-- Única mudança de banco necessária: contrapartes não tinha política de
-- exclusão (só select/insert/update separadas). Reaproveita a permissão
-- 'editar_contrapartes' — já existente — para não precisar de mais uma
-- permissão granular só para isso.
-- ============================================================================

create policy "counterparties_delete" on counterparties for delete
  using (organization_id = auth_organization_id() and has_permission('editar_contrapartes'));
