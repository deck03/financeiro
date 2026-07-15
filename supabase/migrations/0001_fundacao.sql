-- ============================================================================
-- DECK 03 — Fase 1: Fundação do sistema
-- Organizações, perfis de usuário, papéis e permissões, RLS inicial.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- organizations
-- ----------------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  document_number text, -- CNPJ/CPF, uso gerencial
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

comment on table organizations is 'Organização (empresa) dona dos dados. Única para o DECK 03 hoje, mas mantida como entidade para permitir evolução futura.';

-- ----------------------------------------------------------------------------
-- organization_settings
-- ----------------------------------------------------------------------------
create table if not exists organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  display_name text,
  document_number text,
  address text,
  logo_url text,
  receipt_prefix text default 'REC',
  next_receipt_number integer not null default 1,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (organization_id)
);

comment on table organization_settings is 'Configurações administráveis pela interface (dados do emissor de recibos, numeração, etc.).';

-- ----------------------------------------------------------------------------
-- profiles
-- Estende auth.users com dados da aplicação. 1:1 com auth.users.
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete restrict,
  full_name text not null,
  email text not null,
  role_key text not null default 'operador', -- 'admin' | 'operador'
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

comment on table profiles is 'Perfil de aplicação de cada usuário autenticado. role_key referencia roles.key.';

create index if not exists idx_profiles_organization_id on profiles(organization_id);

-- ----------------------------------------------------------------------------
-- roles
-- ----------------------------------------------------------------------------
create table if not exists roles (
  key text primary key, -- 'admin' | 'operador'
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table roles is 'Catálogo fixo de papéis. Extensível no futuro sem alterar código.';

-- ----------------------------------------------------------------------------
-- permissions
-- Catálogo fixo de permissões granulares (seção 7.2 do escopo).
-- ----------------------------------------------------------------------------
create table if not exists permissions (
  key text primary key,
  name text not null,
  description text,
  category text not null default 'geral',
  created_at timestamptz not null default now()
);

comment on table permissions is 'Catálogo de permissões granulares que podem ser concedidas a papéis ou usuários específicos.';

-- ----------------------------------------------------------------------------
-- role_permissions
-- Permissões padrão de cada papel.
-- ----------------------------------------------------------------------------
create table if not exists role_permissions (
  role_key text not null references roles(key) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

-- ----------------------------------------------------------------------------
-- user_permissions
-- Overrides específicos por usuário (is_granted=true concede, is_granted=false
-- revoga uma permissão que o papel concederia por padrão).
-- Observação: "grant" é palavra reservada no Postgres, por isso usamos
-- "is_granted" como nome de coluna.
-- ----------------------------------------------------------------------------
create table if not exists user_permissions (
  user_id uuid not null references profiles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  is_granted boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  primary key (user_id, permission_key)
);

comment on table user_permissions is 'Overrides de permissão por usuário, além do que o papel concede por padrão.';

-- ----------------------------------------------------------------------------
-- audit_logs (estrutura mínima já na Fase 1; uso amplo a partir da Fase 3+)
-- ----------------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb,
  origin text not null default 'app',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_org on audit_logs(organization_id);
create index if not exists idx_audit_logs_entity on audit_logs(entity, entity_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at);

-- ============================================================================
-- Função utilitária: organização do usuário logado
-- ============================================================================
create or replace function auth_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid() and deleted_at is null;
$$;

-- ============================================================================
-- Função utilitária: papel do usuário logado
-- ============================================================================
create or replace function auth_role_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_key from profiles where id = auth.uid() and deleted_at is null;
$$;

-- ============================================================================
-- Função central de autorização: has_permission(permission_key)
-- Usada tanto pelas políticas de RLS quanto pelas Server Actions.
-- Regra: administrador sempre tem todas as permissões.
-- Para operador: permissão do papel, sobrescrita por user_permissions quando existir.
-- ============================================================================
create or replace function has_permission(p_permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role_key text;
  v_override boolean;
  v_role_grants boolean;
begin
  if v_user_id is null then
    return false;
  end if;

  select role_key into v_role_key
  from profiles
  where id = v_user_id and is_active = true and deleted_at is null;

  if v_role_key is null then
    return false;
  end if;

  if v_role_key = 'admin' then
    return true;
  end if;

  -- override específico do usuário tem prioridade
  select is_granted into v_override
  from user_permissions
  where user_id = v_user_id and permission_key = p_permission_key;

  if v_override is not null then
    return v_override;
  end if;

  select exists (
    select 1 from role_permissions
    where role_key = v_role_key and permission_key = p_permission_key
  ) into v_role_grants;

  return coalesce(v_role_grants, false);
end;
$$;

-- ============================================================================
-- Trigger genérico para manter updated_at atualizado
-- ============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

create trigger trg_organization_settings_updated_at
  before update on organization_settings
  for each row execute function set_updated_at();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table organizations enable row level security;
alter table organization_settings enable row level security;
alter table profiles enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_permissions enable row level security;
alter table audit_logs enable row level security;

-- organizations: usuário só enxerga a própria organização
create policy "organizations_select_own"
  on organizations for select
  using (id = auth_organization_id());

create policy "organizations_update_admin"
  on organizations for update
  using (id = auth_organization_id() and auth_role_key() = 'admin');

-- organization_settings
create policy "org_settings_select_own"
  on organization_settings for select
  using (organization_id = auth_organization_id());

create policy "org_settings_write_admin"
  on organization_settings for all
  using (organization_id = auth_organization_id() and auth_role_key() = 'admin')
  with check (organization_id = auth_organization_id() and auth_role_key() = 'admin');

-- profiles: usuário enxerga colegas da mesma organização
create policy "profiles_select_same_org"
  on profiles for select
  using (organization_id = auth_organization_id());

create policy "profiles_update_self"
  on profiles for update
  using (id = auth.uid());

create policy "profiles_write_admin"
  on profiles for all
  using (organization_id = auth_organization_id() and auth_role_key() = 'admin')
  with check (organization_id = auth_organization_id() and auth_role_key() = 'admin');

-- roles e permissions: catálogo global, leitura permitida a qualquer autenticado
create policy "roles_select_authenticated"
  on roles for select
  using (auth.uid() is not null);

create policy "permissions_select_authenticated"
  on permissions for select
  using (auth.uid() is not null);

-- role_permissions: leitura para autenticados, escrita só admin
create policy "role_permissions_select_authenticated"
  on role_permissions for select
  using (auth.uid() is not null);

create policy "role_permissions_write_admin"
  on role_permissions for all
  using (auth_role_key() = 'admin')
  with check (auth_role_key() = 'admin');

-- user_permissions: usuário vê as próprias; admin vê e edita as da organização
create policy "user_permissions_select_self_or_admin"
  on user_permissions for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = user_permissions.user_id
        and p.organization_id = auth_organization_id()
        and auth_role_key() = 'admin'
    )
  );

create policy "user_permissions_write_admin"
  on user_permissions for all
  using (
    exists (
      select 1 from profiles p
      where p.id = user_permissions.user_id
        and p.organization_id = auth_organization_id()
    ) and auth_role_key() = 'admin'
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = user_permissions.user_id
        and p.organization_id = auth_organization_id()
    ) and auth_role_key() = 'admin'
  );

-- audit_logs: leitura restrita a quem tem a permissão 'visualizar_logs'; escrita via funções/trigger (security definer)
create policy "audit_logs_select_permission"
  on audit_logs for select
  using (organization_id = auth_organization_id() and has_permission('visualizar_logs'));

create policy "audit_logs_insert_authenticated"
  on audit_logs for insert
  with check (organization_id = auth_organization_id());
