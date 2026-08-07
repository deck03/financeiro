-- ============================================================================
-- DECK 03 — Fase 12: Exportações, auditoria e acabamento
-- ============================================================================
-- Esta migration consolida a revisão completa de permissões e RLS:
--
-- 1. Completa o catálogo de permissões: 'alterar_centros_de_custo' e
--    'alterar_formas_pagamento' já eram exigidas pelo código desde a Fase 2
--    (requirePermission), mas não constavam do seed. Para administradores
--    nada muda (têm tudo automaticamente); para operadores, agora o
--    administrador consegue conceder essas permissões pela nova tela de
--    Usuários e permissões.
--
-- 2. Protege os logs de auditoria contra alteração e exclusão: audit_logs
--    passa a ser append-only na prática — sem políticas de UPDATE/DELETE
--    (nenhuma existia; aqui deixamos isso explícito e revogamos os
--    privilégios da role authenticated por segurança extra).
--
-- 3. Índice de leitura da tela de auditoria (organização + data decrescente).
--
-- Resultado da revisão de RLS (nada a corrigir, documentado no README):
-- todas as 27 tabelas têm RLS habilitado; leitura sempre condicionada a
-- organization_id = auth_organization_id() (ou catálogos globais somente
-- leitura); escrita condicionada a has_permission()/papel admin; audit_logs
-- legível apenas com 'visualizar_logs'.
-- ============================================================================

-- 1. Catálogo de permissões completo -----------------------------------------
insert into permissions (key, name, category) values
  ('alterar_centros_de_custo', 'Alterar centros de custo', 'cadastros'),
  ('alterar_formas_pagamento', 'Alterar formas de pagamento', 'cadastros')
on conflict (key) do nothing;

-- 2. Logs de auditoria imutáveis ---------------------------------------------
-- Sem política de UPDATE/DELETE, a RLS já bloqueia essas operações para a
-- role authenticated. Revogar o privilégio torna a intenção explícita e
-- protege inclusive contra futuras políticas permissivas criadas por engano.
revoke update, delete on audit_logs from authenticated;

comment on table audit_logs is
  'Trilha de auditoria (append-only). Escrita pela aplicação via política de INSERT; leitura exige a permissão visualizar_logs; UPDATE/DELETE bloqueados.';

-- 3. Índice para a tela de auditoria -----------------------------------------
create index if not exists idx_audit_logs_org_created_at
  on audit_logs(organization_id, created_at desc);
