-- ============================================================================
-- DECK 03 — Seed inicial (Fase 1)
-- Cria a organização, os papéis e o catálogo de permissões.
-- NÃO cria usuários (isso é feito via Supabase Auth — ver README, seção
-- "Criando o primeiro administrador").
-- ============================================================================

insert into organizations (id, name, legal_name)
values ('00000000-0000-0000-0000-000000000001', 'DECK 03', 'DECK 03 LTDA')
on conflict (id) do nothing;

insert into organization_settings (organization_id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'DECK 03')
on conflict (organization_id) do nothing;

insert into roles (key, name, description) values
  ('admin', 'Administrador', 'Acesso completo ao sistema, incluindo configurações, cadastros e permissões.'),
  ('operador', 'Operador', 'Responsável por alimentar os lançamentos financeiros, dentro das permissões concedidas pelo administrador.')
on conflict (key) do nothing;

-- Catálogo de permissões granulares (seção 7.2 do escopo do produto).
-- Novas permissões serão adicionadas nas fases correspondentes (ex.:
-- 'importar_ofx' será usada apenas a partir da Fase 9).
insert into permissions (key, name, category) values
  ('visualizar_dashboard', 'Visualizar dashboard', 'visualizacao'),
  ('visualizar_saldos', 'Visualizar saldos', 'visualizacao'),
  ('visualizar_contas_empresariais', 'Visualizar contas empresariais', 'visualizacao'),
  ('visualizar_contas_pessoais', 'Visualizar contas pessoais', 'visualizacao'),
  ('visualizar_lancamentos', 'Visualizar lançamentos', 'visualizacao'),
  ('criar_lancamentos', 'Criar lançamentos', 'lancamentos'),
  ('editar_lancamentos_em_aberto', 'Editar lançamentos em aberto', 'lancamentos'),
  ('cancelar_lancamentos', 'Cancelar lançamentos', 'lancamentos'),
  ('registrar_pagamentos', 'Registrar pagamentos', 'lancamentos'),
  ('registrar_recebimentos', 'Registrar recebimentos', 'lancamentos'),
  ('pagamentos_parciais', 'Realizar pagamentos parciais', 'lancamentos'),
  ('recebimentos_parciais', 'Realizar recebimentos parciais', 'lancamentos'),
  ('criar_transferencias', 'Criar transferências', 'lancamentos'),
  ('importar_ofx', 'Importar OFX', 'conciliacao'),
  ('realizar_conciliacao', 'Realizar conciliação', 'conciliacao'),
  ('criar_contrapartes', 'Criar contrapartes', 'cadastros'),
  ('editar_contrapartes', 'Editar contrapartes', 'cadastros'),
  ('gerar_recibos', 'Gerar recibos', 'recibos'),
  ('anexar_documentos', 'Anexar documentos', 'lancamentos'),
  ('exportar_relatorios', 'Exportar relatórios', 'relatorios'),
  ('visualizar_logs', 'Visualizar logs de auditoria', 'auditoria'),
  ('alterar_configuracoes', 'Alterar configurações', 'administracao'),
  ('alterar_plano_de_contas', 'Alterar plano de contas', 'cadastros'),
  ('alterar_contas_bancarias', 'Alterar contas bancárias', 'cadastros'),
  ('alterar_centros_de_custo', 'Alterar centros de custo', 'cadastros'),
  ('alterar_formas_pagamento', 'Alterar formas de pagamento', 'cadastros')
on conflict (key) do nothing;

-- Permissões padrão do operador. O administrador poderá customizar por
-- usuário específico via user_permissions (tela de Permissões, Fase 1/2).
insert into role_permissions (role_key, permission_key)
select 'operador', key from permissions
where key in (
  'visualizar_dashboard',
  'visualizar_saldos',
  'visualizar_contas_empresariais',
  'visualizar_lancamentos',
  'criar_lancamentos',
  'editar_lancamentos_em_aberto',
  'registrar_pagamentos',
  'registrar_recebimentos',
  'criar_contrapartes',
  'anexar_documentos'
)
on conflict do nothing;

-- O papel 'admin' não precisa de linhas em role_permissions: a função
-- has_permission() concede acesso total automaticamente para role_key = 'admin'.
