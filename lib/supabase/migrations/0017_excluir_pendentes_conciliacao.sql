-- ============================================================================
-- DECK 03 — Excluir transações bancárias pendentes de conciliação
-- ============================================================================
-- Necessário para corrigir situações como reimportações com contagem
-- inconsistente (ex.: um teste de importação anterior deixou linhas
-- "sobrando"), sem ter que apagar/recriar a conta bancária inteira.
--
-- A exclusão só é permitida para transações com status = 'nao_conciliada' —
-- nunca para transações já conciliadas ou ignoradas. Isso é reforçado tanto
-- na política de RLS (proteção no banco, não só na tela) quanto no código.
-- Como uma transação "não conciliada" nunca chegou a virar lançamento
-- (nenhuma linha em reconciliation_links aponta pra ela), excluí-la não
-- afeta nenhum dado financeiro real — só remove a cópia do extrato dentro
-- do sistema.
-- ============================================================================

create policy "bank_transactions_delete" on bank_transactions for delete
  using (
    organization_id = auth_organization_id()
    and status = 'nao_conciliada'
    and has_permission('importar_ofx')
  );

-- Função utilitária para excluir em massa todas as transações pendentes de
-- uma conta bancária, com log de auditoria (registra quantas foram
-- removidas, não cada uma individualmente — evitaria um log gigante).
create or replace function delete_pending_bank_transactions(p_bank_account_id uuid)
returns integer
language plpgsql
as $$
declare
  v_org uuid := auth_organization_id();
  v_count integer;
begin
  if not has_permission('importar_ofx') then
    raise exception 'Sem permissão para excluir transações importadas.';
  end if;

  delete from bank_transactions
  where organization_id = v_org
    and bank_account_id = p_bank_account_id
    and status = 'nao_conciliada';

  get diagnostics v_count = row_count;

  insert into audit_logs (organization_id, actor_id, action, entity, entity_id, metadata)
  values (v_org, auth.uid(), 'excluir_pendentes', 'bank_transactions', p_bank_account_id,
          jsonb_build_object('quantidade', v_count));

  return v_count;
end;
$$;
