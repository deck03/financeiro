-- ============================================================================
-- DECK 03 — Fase 2: Cadastros financeiros
-- Plano de contas (famílias/categorias/subcategorias), centros de custo,
-- contas bancárias, contrapartes e formas de pagamento.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- chart_account_families
-- Nível 1 do plano de contas. Define o tipo (receita/despesa/transferência),
-- que é herdado conceitualmente por categorias e subcategorias abaixo dela.
-- ----------------------------------------------------------------------------
create table if not exists chart_account_families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  code text,
  type text not null check (type in ('receita', 'despesa', 'transferencia')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  display_order integer not null default 0,
  color text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create index if not exists idx_chart_families_org on chart_account_families(organization_id);

-- ----------------------------------------------------------------------------
-- chart_account_categories
-- Nível 2. Aqui ficam os comportamentos que realmente importam para os
-- cálculos financeiros: natureza gerencial, comportamento na DRE e no
-- fluxo de caixa (seção 8.1 e 39 do escopo).
-- ----------------------------------------------------------------------------
create table if not exists chart_account_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  family_id uuid not null references chart_account_families(id) on delete restrict,
  name text not null,
  code text,
  managerial_nature text not null default 'operacional' check (
    managerial_nature in (
      'operacional', 'financeira', 'investimento', 'financiamento',
      'movimentacao_socios', 'pessoa_fisica', 'transferencia_interna', 'nao_classificada'
    )
  ),
  dre_behavior text not null default 'incluir_operacional' check (
    dre_behavior in ('incluir_operacional', 'fora_resultado', 'nao_incluir')
  ),
  cashflow_behavior text not null default 'operacional' check (
    cashflow_behavior in ('operacional', 'investimento', 'financiamento', 'socios', 'transferencia_interna')
  ),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  display_order integer not null default 0,
  color text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create index if not exists idx_chart_categories_org on chart_account_categories(organization_id);
create index if not exists idx_chart_categories_family on chart_account_categories(family_id);

-- ----------------------------------------------------------------------------
-- chart_account_subcategories
-- Nível 3, opcional. Herda o comportamento da categoria — não duplica os
-- campos de DRE/fluxo de caixa para não permitir configurações divergentes
-- entre categoria e subcategoria (evita a inconsistência que a seção 39 do
-- escopo proíbe).
-- ----------------------------------------------------------------------------
create table if not exists chart_account_subcategories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id uuid not null references chart_account_categories(id) on delete restrict,
  name text not null,
  code text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create index if not exists idx_chart_subcategories_org on chart_account_subcategories(organization_id);
create index if not exists idx_chart_subcategories_category on chart_account_subcategories(category_id);

-- ----------------------------------------------------------------------------
-- cost_centers
-- ----------------------------------------------------------------------------
create table if not exists cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  code text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  display_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create index if not exists idx_cost_centers_org on cost_centers(organization_id);

-- ----------------------------------------------------------------------------
-- bank_accounts
-- ----------------------------------------------------------------------------
create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  display_name text not null,
  bank_name text,
  agency text,
  account_number text,
  account_type text not null default 'conta_corrente' check (
    account_type in ('conta_corrente', 'conta_pagamento', 'poupanca', 'caixa', 'investimento_liquidez', 'outro')
  ),
  ownership text not null default 'deck03' check (ownership in ('deck03', 'pessoa_fisica', 'outro')),
  holder_name text,
  document_number text,
  initial_balance numeric(14, 2) not null default 0,
  initial_balance_date date not null default current_date,
  minimum_balance numeric(14, 2),
  consider_in_available_balance boolean not null default true,
  consider_in_business_dashboard boolean not null default true,
  allow_ofx_import boolean not null default false,
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create index if not exists idx_bank_accounts_org on bank_accounts(organization_id);
create index if not exists idx_bank_accounts_status on bank_accounts(status);

comment on column bank_accounts.ownership is 'Titularidade: deck03 (empresarial) ou pessoa_fisica. Usado para nunca somar saldo pessoal ao saldo empresarial por padrão (seção 10 do escopo).';

-- ----------------------------------------------------------------------------
-- counterparties
-- "types" é um array com os tipos aplicáveis (uma contraparte pode ter mais
-- de um tipo, ex.: agregador e cliente eventual). Optamos por array em vez
-- de tabela de junção separada por simplicidade — decisão documentada na
-- entrega da fase.
-- ----------------------------------------------------------------------------
create table if not exists counterparties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trade_name text,
  document_number text,
  email text,
  phone text,
  address text,
  types text[] not null default '{}' check (
    types <@ array['locatario', 'fornecedor', 'prestador', 'funcionario', 'agregador', 'socio', 'cliente_eventual', 'outro']::text[]
  ),
  bank_details jsonb,
  notes text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create index if not exists idx_counterparties_org on counterparties(organization_id);
create index if not exists idx_counterparties_types on counterparties using gin(types);

-- ----------------------------------------------------------------------------
-- payment_methods
-- ----------------------------------------------------------------------------
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

create index if not exists idx_payment_methods_org on payment_methods(organization_id);

-- ============================================================================
-- Novas permissões granulares desta fase
-- ============================================================================
insert into permissions (key, name, category) values
  ('alterar_centros_de_custo', 'Alterar centros de custo', 'cadastros'),
  ('alterar_formas_pagamento', 'Alterar formas de pagamento', 'cadastros')
on conflict (key) do nothing;

-- ============================================================================
-- Triggers de updated_at
-- ============================================================================
create trigger trg_chart_families_updated_at
  before update on chart_account_families
  for each row execute function set_updated_at();

create trigger trg_chart_categories_updated_at
  before update on chart_account_categories
  for each row execute function set_updated_at();

create trigger trg_chart_subcategories_updated_at
  before update on chart_account_subcategories
  for each row execute function set_updated_at();

create trigger trg_cost_centers_updated_at
  before update on cost_centers
  for each row execute function set_updated_at();

create trigger trg_bank_accounts_updated_at
  before update on bank_accounts
  for each row execute function set_updated_at();

create trigger trg_counterparties_updated_at
  before update on counterparties
  for each row execute function set_updated_at();

create trigger trg_payment_methods_updated_at
  before update on payment_methods
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table chart_account_families enable row level security;
alter table chart_account_categories enable row level security;
alter table chart_account_subcategories enable row level security;
alter table cost_centers enable row level security;
alter table bank_accounts enable row level security;
alter table counterparties enable row level security;
alter table payment_methods enable row level security;

-- Leitura: qualquer usuário autenticado da mesma organização.
-- Escrita: exige a permissão granular correspondente, checada via has_permission().

create policy "chart_families_select" on chart_account_families for select
  using (organization_id = auth_organization_id());
create policy "chart_families_write" on chart_account_families for all
  using (organization_id = auth_organization_id() and has_permission('alterar_plano_de_contas'))
  with check (organization_id = auth_organization_id() and has_permission('alterar_plano_de_contas'));

create policy "chart_categories_select" on chart_account_categories for select
  using (organization_id = auth_organization_id());
create policy "chart_categories_write" on chart_account_categories for all
  using (organization_id = auth_organization_id() and has_permission('alterar_plano_de_contas'))
  with check (organization_id = auth_organization_id() and has_permission('alterar_plano_de_contas'));

create policy "chart_subcategories_select" on chart_account_subcategories for select
  using (organization_id = auth_organization_id());
create policy "chart_subcategories_write" on chart_account_subcategories for all
  using (organization_id = auth_organization_id() and has_permission('alterar_plano_de_contas'))
  with check (organization_id = auth_organization_id() and has_permission('alterar_plano_de_contas'));

create policy "cost_centers_select" on cost_centers for select
  using (organization_id = auth_organization_id());
create policy "cost_centers_write" on cost_centers for all
  using (organization_id = auth_organization_id() and has_permission('alterar_centros_de_custo'))
  with check (organization_id = auth_organization_id() and has_permission('alterar_centros_de_custo'));

-- Contas bancárias pessoais só aparecem para quem tem a permissão de
-- visualizar contas pessoais (seção 7.2 e 10 do escopo). Administrador
-- sempre vê tudo (has_permission trata isso).
create policy "bank_accounts_select" on bank_accounts for select
  using (
    organization_id = auth_organization_id()
    and (
      ownership != 'pessoa_fisica'
      or has_permission('visualizar_contas_pessoais')
    )
  );
create policy "bank_accounts_write" on bank_accounts for all
  using (organization_id = auth_organization_id() and has_permission('alterar_contas_bancarias'))
  with check (organization_id = auth_organization_id() and has_permission('alterar_contas_bancarias'));

create policy "counterparties_select" on counterparties for select
  using (organization_id = auth_organization_id());
create policy "counterparties_insert" on counterparties for insert
  with check (organization_id = auth_organization_id() and has_permission('criar_contrapartes'));
create policy "counterparties_update" on counterparties for update
  using (organization_id = auth_organization_id() and has_permission('editar_contrapartes'))
  with check (organization_id = auth_organization_id() and has_permission('editar_contrapartes'));

create policy "payment_methods_select" on payment_methods for select
  using (organization_id = auth_organization_id());
create policy "payment_methods_write" on payment_methods for all
  using (organization_id = auth_organization_id() and has_permission('alterar_formas_pagamento'))
  with check (organization_id = auth_organization_id() and has_permission('alterar_formas_pagamento'));
