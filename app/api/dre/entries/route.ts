import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SEM_SUBCATEGORIA_LABEL = "(sem subcategoria)";

/**
 * Devolve os lançamentos que compõem um nó específico da árvore
 * consolidada da DRE (família, ou família+categoria, ou
 * família+categoria+subcategoria) — usado pelo painel lateral que abre ao
 * clicar em qualquer nível da árvore em /dre.
 *
 * Reaproveita a mesma lógica de classificação de lib/finance/dre-query.ts
 * (caixa = liquidações, competência = lançamentos pela data de
 * competência), mas devolve os lançamentos individuais em vez de somados —
 * por isso não está em dre-query.ts, que é só para os totais.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const regime = searchParams.get("regime") === "competencia" ? "competencia" : "caixa";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type") === "receita" ? "receita" : "despesa";
  const family = searchParams.get("family");
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");

  if (!from || !to || !family) {
    return NextResponse.json({ error: "Parâmetros obrigatórios ausentes." }, { status: 400 });
  }

  function matches(familyName: string, categoryName: string, subcategoryName: string | null) {
    if (familyName !== family) return false;
    if (category && categoryName !== category) return false;
    if (subcategory) {
      const subLabel = subcategoryName ?? SEM_SUBCATEGORIA_LABEL;
      if (subLabel !== subcategory) return false;
    }
    return true;
  }

  let entries: { id: string; description: string; due_date: string; competence_date: string | null; amount: number; status: string }[] = [];

  if (regime === "caixa") {
    const { data, error } = await supabase
      .from("financial_settlements")
      .select(
        "amount, financial_entries(id, description, due_date, competence_date, type, status, chart_account_categories(name, chart_account_families(name)), chart_account_subcategories(name))"
      )
      .eq("status", "valido")
      .gte("settlement_date", from)
      .lte("settlement_date", to);

    if (error) {
      return NextResponse.json({ error: "Não foi possível carregar os lançamentos." }, { status: 500 });
    }

    entries = (data ?? [])
      .filter((s: any) => {
        const fe = s.financial_entries;
        if (!fe || fe.type !== type) return false;
        const familyName = fe.chart_account_categories?.chart_account_families?.name ?? "Sem família";
        const categoryName = fe.chart_account_categories?.name ?? "Sem categoria";
        const subcategoryName = fe.chart_account_subcategories?.name ?? null;
        return matches(familyName, categoryName, subcategoryName);
      })
      .map((s: any) => ({
        id: s.financial_entries.id,
        description: s.financial_entries.description,
        due_date: s.financial_entries.due_date,
        competence_date: s.financial_entries.competence_date,
        amount: Number(s.amount),
        status: s.financial_entries.status,
      }));
  } else {
    const { data, error } = await supabase
      .from("financial_entries")
      .select(
        "id, description, due_date, competence_date, original_amount, type, status, chart_account_categories(name, chart_account_families(name)), chart_account_subcategories(name)"
      )
      .eq("type", type)
      .gte("competence_date", from)
      .lte("competence_date", to)
      .not("status", "in", "(cancelado,estornado)");

    if (error) {
      return NextResponse.json({ error: "Não foi possível carregar os lançamentos." }, { status: 500 });
    }

    entries = (data ?? [])
      .filter((e: any) => {
        const familyName = e.chart_account_categories?.chart_account_families?.name ?? "Sem família";
        const categoryName = e.chart_account_categories?.name ?? "Sem categoria";
        const subcategoryName = e.chart_account_subcategories?.name ?? null;
        return matches(familyName, categoryName, subcategoryName);
      })
      .map((e: any) => ({
        id: e.id,
        description: e.description,
        due_date: e.due_date,
        competence_date: e.competence_date,
        amount: Number(e.original_amount),
        status: e.status,
      }));
  }

  entries.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  return NextResponse.json({ entries });
}
