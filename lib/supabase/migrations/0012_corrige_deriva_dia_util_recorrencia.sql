-- ============================================================================
-- DECK 03 — Correção: deriva cumulativa no ajuste de dia útil das recorrências
-- ============================================================================
-- Bug: generate_recurring_instances() reutilizava a variável v_next_date já
-- ajustada (pós dia-útil) como base para somar o próximo passo. Resultado:
-- cada ajuste de fim de semana "grudava" nas ocorrências seguintes,
-- fazendo o vencimento derivar mês a mês (24 → 26 → 28 → 01 → 03 → 05...)
-- em vez de voltar sempre para o dia correto (24) e ajustar individualmente
-- só quando aquele mês específico cai em fim de semana.
--
-- Correção: a data "limpa" de cada ocorrência agora é sempre recalculada a
-- partir de start_date + (índice da ocorrência × passo) — nunca a partir da
-- ocorrência anterior já ajustada. O ajuste de dia útil passa a ser aplicado
-- a uma cópia, sem contaminar a cadência das próximas ocorrências.
--
-- Este arquivo também recalcula (2ª parte) o vencimento de ocorrências já
-- geradas com o bug, mas SOMENTE as que ainda estão em aberto/agendadas —
-- nunca lançamentos já liquidados, cancelados ou estornados.
-- ============================================================================

create or replace function generate_recurring_instances(p_rule_id uuid, p_months_ahead integer default 12)
returns integer
language plpgsql
as $$
declare
  v_rule recurring_rules%rowtype;
  v_org uuid := auth_organization_id();
  v_horizon date := (current_date + (p_months_ahead || ' months')::interval)::date;
  v_base_date date;
  v_due_date date;
  v_next_competence date;
  v_has_competence_anchor boolean;
  v_count integer := 0;
  v_step interval;
  v_occurrence_count integer;
  v_index integer;
  v_dow integer;
begin
  select * into v_rule from recurring_rules where id = p_rule_id and organization_id = v_org;
  if v_rule.id is null then
    raise exception 'Recorrência não encontrada.';
  end if;

  if not has_permission('criar_lancamentos') then
    raise exception 'Sem permissão para criar lançamentos.';
  end if;

  if v_rule.status != 'ativa' then
    raise exception 'Esta recorrência está inativa.';
  end if;

  v_step := case v_rule.frequency
    when 'semanal' then (7 * v_rule.interval_count || ' days')::interval
    when 'mensal' then (v_rule.interval_count || ' months')::interval
    when 'bimestral' then ((2 * v_rule.interval_count) || ' months')::interval
    when 'trimestral' then ((3 * v_rule.interval_count) || ' months')::interval
    when 'semestral' then ((6 * v_rule.interval_count) || ' months')::interval
    when 'anual' then (v_rule.interval_count || ' years')::interval
  end;

  select count(*) into v_occurrence_count from financial_entries where recurring_rule_id = p_rule_id;
  -- Índice (0-based) da próxima ocorrência a gerar. A ocorrência de índice 0
  -- cai exatamente em start_date; cada índice seguinte soma mais um passo —
  -- sempre a partir de start_date, nunca a partir da ocorrência anterior.
  v_index := v_occurrence_count;

  v_has_competence_anchor := v_rule.competence_anchor_date is not null;
  if v_has_competence_anchor then
    select coalesce(max(competence_date), v_rule.competence_anchor_date - v_step) into v_next_competence
    from financial_entries
    where recurring_rule_id = p_rule_id;
  end if;

  loop
    v_base_date := (v_rule.start_date + (v_index::float8 * v_step))::date;
    exit when v_base_date > v_horizon;
    exit when v_rule.end_date is not null and v_base_date > v_rule.end_date;
    exit when v_rule.max_occurrences is not null and v_occurrence_count >= v_rule.max_occurrences;

    v_due_date := v_base_date;
    if v_rule.adjust_business_day then
      v_dow := extract(dow from v_due_date);
      if v_dow = 0 then
        v_due_date := v_due_date + 1;
      elsif v_dow = 6 then
        v_due_date := v_due_date + 2;
      end if;
    end if;

    if v_has_competence_anchor then
      v_next_competence := (v_next_competence + v_step)::date;
    else
      -- Comportamento anterior: competência = vencimento (já ajustado).
      v_next_competence := v_due_date;
    end if;

    insert into financial_entries (
      organization_id, type, description, counterparty_id, category_id, subcategory_id,
      cost_center_id, bank_account_id, payment_method_id, original_amount, competence_date,
      due_date, origin, recurring_rule_id, created_by, updated_by
    ) values (
      v_org, v_rule.type, v_rule.description, v_rule.counterparty_id, v_rule.category_id, v_rule.subcategory_id,
      v_rule.cost_center_id, v_rule.bank_account_id, v_rule.payment_method_id, v_rule.amount, v_next_competence,
      v_due_date, 'recorrencia', p_rule_id, auth.uid(), auth.uid()
    );

    v_occurrence_count := v_occurrence_count + 1;
    v_index := v_index + 1;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- Recalcula o vencimento de ocorrências já geradas com o bug de deriva,
-- para recorrências com ajuste de dia útil ativado. Só toca lançamentos
-- ainda em aberto/agendados — liquidados, cancelados ou estornados nunca
-- são reescritos (histórico financeiro é imutável).
-- ----------------------------------------------------------------------------
do $$
declare
  r recurring_rules%rowtype;
  e record;
  v_step interval;
  v_index integer;
  v_new_due date;
  v_dow integer;
begin
  for r in select * from recurring_rules where adjust_business_day = true loop
    v_step := case r.frequency
      when 'semanal' then (7 * r.interval_count || ' days')::interval
      when 'mensal' then (r.interval_count || ' months')::interval
      when 'bimestral' then ((2 * r.interval_count) || ' months')::interval
      when 'trimestral' then ((3 * r.interval_count) || ' months')::interval
      when 'semestral' then ((6 * r.interval_count) || ' months')::interval
      when 'anual' then (r.interval_count || ' years')::interval
    end;

    v_index := 0;
    for e in
      select id, due_date, status from financial_entries
      where recurring_rule_id = r.id
      order by due_date asc
    loop
      v_new_due := (r.start_date + (v_index::float8 * v_step))::date;
      v_dow := extract(dow from v_new_due);
      if v_dow = 0 then
        v_new_due := v_new_due + 1;
      elsif v_dow = 6 then
        v_new_due := v_new_due + 2;
      end if;

      if e.due_date != v_new_due and e.status in ('em_aberto', 'agendado', 'parcialmente_pago', 'parcialmente_recebido') then
        update financial_entries set due_date = v_new_due, updated_at = now() where id = e.id;
      end if;

      v_index := v_index + 1;
    end loop;
  end loop;
end $$;
