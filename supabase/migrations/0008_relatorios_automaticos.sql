-- ============================================================================
-- DECK 03 — Fase 11: Relatórios automáticos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- report_configs
-- Destinatários e agendamento nunca ficam fixos no código — tudo configurável
-- pela interface (seção 30 do escopo).
-- ----------------------------------------------------------------------------
create table if not exists report_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  report_type text not null check (report_type in ('semanal', 'mensal')),
  enabled boolean not null default false,
  recipients text[] not null default '{}',
  day_of_week integer check (day_of_week between 0 and 6), -- usado quando report_type = 'semanal' (0=domingo)
  day_of_month integer check (day_of_month between 1 and 28), -- usado quando report_type = 'mensal'
  send_hour integer not null default 8 check (send_hour between 0 and 23),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (organization_id, report_type)
);

comment on table report_configs is 'Configuração de destinatários e agendamento dos relatórios semanal e mensal. O horário exato depende da granularidade do agendador usado (ver documentação da Fase 11).';

-- ----------------------------------------------------------------------------
-- generated_reports
-- Histórico de envios, incluindo erros — nunca falha silenciosamente.
-- ----------------------------------------------------------------------------
create table if not exists generated_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  report_config_id uuid references report_configs(id),
  report_type text not null check (report_type in ('semanal', 'mensal')),
  period_start date not null,
  period_end date not null,
  recipients text[] not null default '{}',
  status text not null check (status in ('enviado', 'erro')),
  error_message text,
  triggered_by text not null default 'automatico' check (triggered_by in ('automatico', 'manual')),
  sent_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_generated_reports_org on generated_reports(organization_id);
create index if not exists idx_generated_reports_config on generated_reports(report_config_id);
create index if not exists idx_generated_reports_sent_at on generated_reports(sent_at);

create trigger trg_report_configs_updated_at
  before update on report_configs
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table report_configs enable row level security;
alter table generated_reports enable row level security;

create policy "report_configs_select" on report_configs for select
  using (organization_id = auth_organization_id() and has_permission('alterar_configuracoes'));
create policy "report_configs_write" on report_configs for all
  using (organization_id = auth_organization_id() and has_permission('alterar_configuracoes'))
  with check (organization_id = auth_organization_id() and has_permission('alterar_configuracoes'));

create policy "generated_reports_select" on generated_reports for select
  using (organization_id = auth_organization_id() and has_permission('alterar_configuracoes'));
create policy "generated_reports_insert" on generated_reports for insert
  with check (organization_id = auth_organization_id() and has_permission('alterar_configuracoes'));

-- Observação: a rotina agendada (Route Handler /api/cron/send-reports) roda
-- com a service role key (cliente admin), que ignora RLS por definição —
-- as políticas acima protegem o acesso via aplicação normal (usuários
-- autenticados), não a rotina agendada em si.
