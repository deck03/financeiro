import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { QuarterSelect } from "./quarter-select";
import { buildDRE } from "@/lib/finance/dre";
import { fetchClassifiedItems } from "@/lib/finance/dre-query";
import { formatCurrency, formatPercent, getQuarter, quarterRange } from "@/lib/finance/period";

function variationClass(delta: number, higherIsBetter: boolean) {
  if (delta === 0) return "text-ink-soft";
  const isGood = higherIsBetter ? delta > 0 : delta < 0;
  return isGood ? "text-signal-positive" : "text-signal-negative";
}

function ComparisonRow({
  label,
  valueA,
  valueB,
  higherIsBetter = true,
}: {
  label: string;
  valueA: number;
  valueB: number;
  higherIsBetter?: boolean;
}) {
  const delta = valueA - valueB;
  const pct = valueB !== 0 ? (delta / Math.abs(valueB)) * 100 : valueA !== 0 ? 100 : 0;

  return (
    <tr className="border-b border-base-border last:border-0">
      <td className="py-2 pr-4 text-ink">{label}</td>
      <td className="num py-2 pr-4 text-ink-soft">{formatCurrency(valueA)}</td>
      <td className="num py-2 pr-4 text-ink-soft">{formatCurrency(valueB)}</td>
      <td className={`num py-2 pr-4 font-medium ${variationClass(delta, higherIsBetter)}`}>{formatCurrency(delta)}</td>
      <td className={`num py-2 pr-4 font-medium ${variationClass(delta, higherIsBetter)}`}>{formatPercent(pct)}</td>
    </tr>
  );
}

export default async function ComparacaoTrimestralPage({
  searchParams,
}: {
  searchParams: { mode?: string; yearA?: string; quarterA?: string; yearB?: string; quarterB?: string };
}) {
  const supabase = createClient();
  const today = new Date();
  const currentQuarter = getQuarter(today);
  const currentYear = today.getFullYear();

  const mode = (searchParams.mode as "anterior" | "ano_anterior" | "personalizado") || "anterior";

  let yearA = currentYear;
  let quarterAValue = currentQuarter;
  let yearB: number;
  let quarterBValue: number;

  if (mode === "ano_anterior") {
    yearB = currentYear - 1;
    quarterBValue = currentQuarter;
  } else if (mode === "personalizado") {
    yearA = Number(searchParams.yearA) || currentYear;
    quarterAValue = Number(searchParams.quarterA) || currentQuarter;
    yearB = Number(searchParams.yearB) || currentYear;
    quarterBValue = Number(searchParams.quarterB) || (currentQuarter === 1 ? 4 : currentQuarter - 1);
  } else {
    // anterior
    if (currentQuarter === 1) {
      yearB = currentYear - 1;
      quarterBValue = 4;
    } else {
      yearB = currentYear;
      quarterBValue = currentQuarter - 1;
    }
  }

  const rangeA = quarterRange(yearA, quarterAValue);
  const rangeB = quarterRange(yearB, quarterBValue);

  const [itemsA, itemsB] = await Promise.all([
    fetchClassifiedItems(supabase, "caixa", rangeA.from, rangeA.to),
    fetchClassifiedItems(supabase, "caixa", rangeB.from, rangeB.to),
  ]);

  const dreA = buildDRE(itemsA);
  const dreB = buildDRE(itemsB);

  // Saldo de caixa empresarial ao final de cada trimestre
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("status", "ativa")
    .eq("consider_in_business_dashboard", true)
    .neq("ownership", "pessoa_fisica");

  const accountIds = (accounts ?? []).map((a) => a.id);
  const [balancesA, balancesB] = await Promise.all([
    Promise.all(accountIds.map((id) => supabase.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: rangeA.to }))),
    Promise.all(accountIds.map((id) => supabase.rpc("bank_account_balance_at", { p_account_id: id, p_as_of: rangeB.to }))),
  ]);
  const saldoA = balancesA.reduce((sum, r) => sum + Number(r.data ?? 0), 0);
  const saldoB = balancesB.reduce((sum, r) => sum + Number(r.data ?? 0), 0);

  // Categorias (famílias) responsáveis pela maior variação de despesa
  const familyMapA = new Map(dreA.despesasOperacionaisPorFamilia.map((f) => [f.label, f.total]));
  const familyMapB = new Map(dreB.despesasOperacionaisPorFamilia.map((f) => [f.label, f.total]));
  const allFamilies = new Set([...familyMapA.keys(), ...familyMapB.keys()]);
  const familyDeltas = Array.from(allFamilies)
    .map((name) => ({
      name,
      valueA: familyMapA.get(name) ?? 0,
      valueB: familyMapB.get(name) ?? 0,
      delta: (familyMapA.get(name) ?? 0) - (familyMapB.get(name) ?? 0),
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  const labelA = `${quarterAValue}º tri/${yearA}`;
  const labelB = `${quarterBValue}º tri/${yearB}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Comparação trimestral</h1>
        <p className="text-sm text-ink-soft">Regime de caixa — valores efetivamente pagos/recebidos em cada trimestre.</p>
      </div>

      <Card>
        <QuarterSelect mode={mode} yearA={yearA} quarterA={quarterAValue} yearB={yearB} quarterB={quarterBValue} />
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Indicador</th>
                <th className="py-2 pr-4 font-medium">{labelA}</th>
                <th className="py-2 pr-4 font-medium">{labelB}</th>
                <th className="py-2 pr-4 font-medium">Variação (R$)</th>
                <th className="py-2 pr-4 font-medium">Variação (%)</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow label="Receita operacional" valueA={dreA.receitaOperacional} valueB={dreB.receitaOperacional} higherIsBetter />
              <ComparisonRow
                label="Despesa operacional"
                valueA={dreA.despesaOperacionalTotal}
                valueB={dreB.despesaOperacionalTotal}
                higherIsBetter={false}
              />
              <ComparisonRow label="Resultado operacional" valueA={dreA.resultadoOperacional} valueB={dreB.resultadoOperacional} higherIsBetter />
              <ComparisonRow label="Saldo de caixa empresarial ao final do trimestre" valueA={saldoA} valueB={saldoB} higherIsBetter />
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Categorias responsáveis pela maior variação de despesa</h2>
        {familyDeltas.length === 0 ? (
          <p className="text-sm text-ink-faint">Sem dados suficientes para comparar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Família</th>
                  <th className="py-2 pr-4 font-medium">{labelA}</th>
                  <th className="py-2 pr-4 font-medium">{labelB}</th>
                  <th className="py-2 pr-4 font-medium">Variação</th>
                </tr>
              </thead>
              <tbody>
                {familyDeltas.map((f) => (
                  <tr key={f.name} className="border-b border-base-border last:border-0">
                    <td className="py-2 pr-4 text-ink">{f.name}</td>
                    <td className="num py-2 pr-4 text-ink-soft">{formatCurrency(f.valueA)}</td>
                    <td className="num py-2 pr-4 text-ink-soft">{formatCurrency(f.valueB)}</td>
                    <td className={`num py-2 pr-4 font-medium ${variationClass(f.delta, false)}`}>{formatCurrency(f.delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
