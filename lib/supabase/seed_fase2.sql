-- ============================================================================
-- DECK 03 — Seed da Fase 2
-- Plano de contas sugerido, centros de custo, contas bancárias de exemplo
-- (C6 – DECK e C6 – Pessoa Física) e contrapartes dos agregadores.
-- ============================================================================

do $$
declare
  v_org_id uuid := '00000000-0000-0000-0000-000000000001';

  v_fam_receitas_operacionais uuid;
  v_fam_receitas_financeiras uuid;
  v_fam_pessoal uuid;
  v_fam_estrutura uuid;
  v_fam_administrativo uuid;
  v_fam_financeiro uuid;
  v_fam_investimentos uuid;
  v_fam_socios uuid;

  v_cat_agregadores uuid;
begin
  -- --------------------------------------------------------------------
  -- Famílias
  -- --------------------------------------------------------------------
  insert into chart_account_families (organization_id, name, type, display_order)
  values (v_org_id, 'Receitas operacionais', 'receita', 1)
  returning id into v_fam_receitas_operacionais;

  insert into chart_account_families (organization_id, name, type, display_order)
  values (v_org_id, 'Receitas financeiras', 'receita', 2)
  returning id into v_fam_receitas_financeiras;

  insert into chart_account_families (organization_id, name, type, display_order)
  values (v_org_id, 'Pessoal e prestadores', 'despesa', 3)
  returning id into v_fam_pessoal;

  insert into chart_account_families (organization_id, name, type, display_order)
  values (v_org_id, 'Estrutura', 'despesa', 4)
  returning id into v_fam_estrutura;

  insert into chart_account_families (organization_id, name, type, display_order)
  values (v_org_id, 'Administrativo', 'despesa', 5)
  returning id into v_fam_administrativo;

  insert into chart_account_families (organization_id, name, type, display_order)
  values (v_org_id, 'Financeiro', 'despesa', 6)
  returning id into v_fam_financeiro;

  insert into chart_account_families (organization_id, name, type, display_order)
  values (v_org_id, 'Investimentos', 'despesa', 7)
  returning id into v_fam_investimentos;

  insert into chart_account_families (organization_id, name, type, display_order)
  values (v_org_id, 'Movimentações de sócios e pessoa física', 'transferencia', 8)
  returning id into v_fam_socios;

  -- --------------------------------------------------------------------
  -- Categorias — Receitas operacionais
  -- --------------------------------------------------------------------
  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values (v_org_id, v_fam_receitas_operacionais, 'Agregadores', 'operacional', 'incluir_operacional', 'operacional', 1)
  returning id into v_cat_agregadores;

  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values
    (v_org_id, v_fam_receitas_operacionais, 'Aluguel de espaços', 'operacional', 'incluir_operacional', 'operacional', 2),
    (v_org_id, v_fam_receitas_operacionais, 'Eventos', 'operacional', 'incluir_operacional', 'operacional', 3),
    (v_org_id, v_fam_receitas_operacionais, 'Patrocínios e parcerias', 'operacional', 'incluir_operacional', 'operacional', 4),
    (v_org_id, v_fam_receitas_operacionais, 'Outras receitas operacionais', 'operacional', 'incluir_operacional', 'operacional', 5);

  -- Subcategorias — Agregadores
  insert into chart_account_subcategories (organization_id, category_id, name, display_order)
  values
    (v_org_id, v_cat_agregadores, 'Wellhub', 1),
    (v_org_id, v_cat_agregadores, 'TotalPass', 2),
    (v_org_id, v_cat_agregadores, 'ClassPass', 3),
    (v_org_id, v_cat_agregadores, 'Outros agregadores', 4);

  -- --------------------------------------------------------------------
  -- Categorias — Receitas financeiras
  -- --------------------------------------------------------------------
  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values
    (v_org_id, v_fam_receitas_financeiras, 'Rendimentos', 'financeira', 'fora_resultado', 'operacional', 1),
    (v_org_id, v_fam_receitas_financeiras, 'Juros recebidos', 'financeira', 'fora_resultado', 'operacional', 2);

  -- --------------------------------------------------------------------
  -- Categorias — Pessoal e prestadores
  -- --------------------------------------------------------------------
  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values
    (v_org_id, v_fam_pessoal, 'Funcionários', 'operacional', 'incluir_operacional', 'operacional', 1),
    (v_org_id, v_fam_pessoal, 'Prestadores', 'operacional', 'incluir_operacional', 'operacional', 2),
    (v_org_id, v_fam_pessoal, 'Benefícios', 'operacional', 'incluir_operacional', 'operacional', 3),
    (v_org_id, v_fam_pessoal, 'Encargos gerenciais', 'operacional', 'incluir_operacional', 'operacional', 4);

  -- --------------------------------------------------------------------
  -- Categorias — Estrutura
  -- --------------------------------------------------------------------
  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values
    (v_org_id, v_fam_estrutura, 'Água', 'operacional', 'incluir_operacional', 'operacional', 1),
    (v_org_id, v_fam_estrutura, 'Energia elétrica', 'operacional', 'incluir_operacional', 'operacional', 2),
    (v_org_id, v_fam_estrutura, 'Internet', 'operacional', 'incluir_operacional', 'operacional', 3),
    (v_org_id, v_fam_estrutura, 'IPTU', 'operacional', 'incluir_operacional', 'operacional', 4),
    (v_org_id, v_fam_estrutura, 'Condomínio', 'operacional', 'incluir_operacional', 'operacional', 5),
    (v_org_id, v_fam_estrutura, 'Limpeza', 'operacional', 'incluir_operacional', 'operacional', 6),
    (v_org_id, v_fam_estrutura, 'Segurança', 'operacional', 'incluir_operacional', 'operacional', 7),
    (v_org_id, v_fam_estrutura, 'Manutenção', 'operacional', 'incluir_operacional', 'operacional', 8);

  -- --------------------------------------------------------------------
  -- Categorias — Administrativo
  -- --------------------------------------------------------------------
  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values
    (v_org_id, v_fam_administrativo, 'Contabilidade', 'operacional', 'incluir_operacional', 'operacional', 1),
    (v_org_id, v_fam_administrativo, 'Jurídico', 'operacional', 'incluir_operacional', 'operacional', 2),
    (v_org_id, v_fam_administrativo, 'Softwares', 'operacional', 'incluir_operacional', 'operacional', 3),
    (v_org_id, v_fam_administrativo, 'Material de escritório', 'operacional', 'incluir_operacional', 'operacional', 4),
    (v_org_id, v_fam_administrativo, 'Serviços administrativos', 'operacional', 'incluir_operacional', 'operacional', 5);

  -- --------------------------------------------------------------------
  -- Categorias — Financeiro
  -- --------------------------------------------------------------------
  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values
    (v_org_id, v_fam_financeiro, 'Tarifas bancárias', 'financeira', 'fora_resultado', 'operacional', 1),
    (v_org_id, v_fam_financeiro, 'Juros', 'financeira', 'fora_resultado', 'operacional', 2),
    (v_org_id, v_fam_financeiro, 'Multas', 'financeira', 'fora_resultado', 'operacional', 3),
    (v_org_id, v_fam_financeiro, 'Taxas de meios de pagamento', 'financeira', 'fora_resultado', 'operacional', 4);

  -- --------------------------------------------------------------------
  -- Categorias — Investimentos (sempre fora do resultado operacional)
  -- --------------------------------------------------------------------
  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values
    (v_org_id, v_fam_investimentos, 'Obras', 'investimento', 'fora_resultado', 'investimento', 1),
    (v_org_id, v_fam_investimentos, 'Reformas', 'investimento', 'fora_resultado', 'investimento', 2),
    (v_org_id, v_fam_investimentos, 'Equipamentos', 'investimento', 'fora_resultado', 'investimento', 3),
    (v_org_id, v_fam_investimentos, 'Móveis', 'investimento', 'fora_resultado', 'investimento', 4),
    (v_org_id, v_fam_investimentos, 'Benfeitorias', 'investimento', 'fora_resultado', 'investimento', 5);

  -- --------------------------------------------------------------------
  -- Categorias — Movimentações de sócios e pessoa física
  -- Nunca entram no resultado operacional nem representam receita/despesa.
  -- --------------------------------------------------------------------
  insert into chart_account_categories (organization_id, family_id, name, managerial_nature, dre_behavior, cashflow_behavior, display_order)
  values
    (v_org_id, v_fam_socios, 'Distribuição de lucros', 'movimentacao_socios', 'nao_incluir', 'socios', 1),
    (v_org_id, v_fam_socios, 'Retirada de sócio', 'movimentacao_socios', 'nao_incluir', 'socios', 2),
    (v_org_id, v_fam_socios, 'Adiantamento a sócio', 'movimentacao_socios', 'nao_incluir', 'socios', 3),
    (v_org_id, v_fam_socios, 'Reembolso de sócio', 'movimentacao_socios', 'nao_incluir', 'socios', 4),
    (v_org_id, v_fam_socios, 'Despesa pessoal', 'pessoa_fisica', 'nao_incluir', 'socios', 5),
    (v_org_id, v_fam_socios, 'Devolução de adiantamento', 'movimentacao_socios', 'nao_incluir', 'socios', 6);

  -- --------------------------------------------------------------------
  -- Centros de custo
  -- --------------------------------------------------------------------
  insert into cost_centers (organization_id, name, display_order, is_default)
  values
    (v_org_id, 'Estrutura', 1, false),
    (v_org_id, 'Administrativo', 2, false),
    (v_org_id, 'Operação', 3, false),
    (v_org_id, 'Eventos', 4, false),
    (v_org_id, 'Obras e reformas', 5, false),
    (v_org_id, 'Diretoria', 6, false),
    (v_org_id, 'Geral', 7, true);

  -- --------------------------------------------------------------------
  -- Contas bancárias de exemplo
  -- --------------------------------------------------------------------
  insert into bank_accounts (
    organization_id, display_name, bank_name, account_type, ownership,
    initial_balance, initial_balance_date, consider_in_available_balance,
    consider_in_business_dashboard, allow_ofx_import
  ) values
    (v_org_id, 'C6 – DECK', 'C6 Bank', 'conta_corrente', 'deck03', 0, current_date, true, true, true),
    (v_org_id, 'C6 – Pessoa Física', 'C6 Bank', 'conta_corrente', 'pessoa_fisica', 0, current_date, false, false, true);

  -- --------------------------------------------------------------------
  -- Contrapartes — agregadores
  -- --------------------------------------------------------------------
  insert into counterparties (organization_id, name, types)
  values
    (v_org_id, 'Wellhub', array['agregador']),
    (v_org_id, 'TotalPass', array['agregador']),
    (v_org_id, 'ClassPass', array['agregador']);

  -- --------------------------------------------------------------------
  -- Formas de pagamento
  -- --------------------------------------------------------------------
  insert into payment_methods (organization_id, name, display_order)
  values
    (v_org_id, 'PIX', 1),
    (v_org_id, 'Transferência bancária (TED)', 2),
    (v_org_id, 'Boleto', 3),
    (v_org_id, 'Cartão de crédito', 4),
    (v_org_id, 'Cartão de débito', 5),
    (v_org_id, 'Dinheiro', 6),
    (v_org_id, 'Repasse de agregador', 7);

end $$;
