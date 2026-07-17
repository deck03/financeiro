import { computeRemainingBalance } from "./remaining";
import { projectCashflow, type ProjectionMovement, type ProjectionResult } from "./projection";

const OPEN_STATUSES = ["em_aberto", "agendado", "parcialmente_pago", "parcialmente_recebido"];

export type EntryWithRemaining = {
  id: string;
  type: string;
  description: string;
  original_amount: number;
  due_date: string;
  bank_account_id: string | null;
  remaining: number;
  effectiveDate: string;
};

export type CashflowProjection = {
  currentBalance: number;
  projection: ProjectionResult;
  entriesWithRemaining: EntryWithRemaining[];
  entradasPrevistas: number;
  saidasPrevistas: number;
};

/**
 * Monta a projeção de caixa para um conjunto de contas, entre hoje e
 * horizonEnd. Centraliza a consulta de lançamentos em aberto + liquidações
 * + cálculo de saldo restante, para que a tela de Fluxo de Caixa Projetado
 * e o Dashboard usem exatamente a mesma lógica (seção 39 do escopo).
 *
 * @param supabase cliente Supabase já autenticado (server ou browser)
 * @param accountIds contas incluídas no cálculo do saldo atual
 * @param today data de hoje, YYYY-MM-DD
 * @param horizonEnd data final do horizonte, YYYY-MM-DD
 * @param strictAccountId se informado, restringe os lançamentos a essa
 *   conta específica (em vez de "conta em accountIds OU sem conta definida")
 */
export async function computeCashflowProjection(
  supabase: any,
  accountIds: string[],
  today: string,
  horizonEnd: string,
  strictAccountId?: string
): Promise<CashflowProjection> {
  const currentBalanceResults = await Promise.all(
    accountIds.map((id) => supabase.rpc("bank_account_balance", { p_account_id: id }))
  );
  const currentBalance = currentBalanceResults.reduce((sum: number, r: any) => sum + Number(r.data ?? 0), 0);

  let openEntries: any[] = [];

  if (strictAccountId) {
    const { data } = await supabase
      .from("financial_entries")
      .select("id, type, description, original_amount, due_date, bank_account_id")
      .in("status", OPEN_STATUSES)
      .lte("due_date", horizonEnd)
      .eq("bank_account_id", strictAccountId);
    openEntries = data ?? [];
  } else if (accountIds.length > 0) {
    const { data } = await supabase
      .from("financial_entries")
      .select("id, type, description, original_amount, due_date, bank_account_id")
      .in("status", OPEN_STATUSES)
      .lte("due_date", horizonEnd)
      .or(`bank_account_id.in.(${accountIds.join(",")}),bank_account_id.is.null`);
    openEntries = data ?? [];
  }

  const entryIds = openEntries.map((e) => e.id);

  const { data: settlements } =
    entryIds.length > 0
      ? await supabase
          .from("financial_settlements")
          .select("entry_id, amount, interest, penalty, discount, addition, status")
          .in("entry_id", entryIds)
      : { data: [] as any[] };

  const entriesWithRemaining: EntryWithRemaining[] = openEntries
    .map((e) => ({
      ...e,
      remaining: computeRemainingBalance(Number(e.original_amount), e.id, settlements ?? []),
      effectiveDate: e.due_date < today ? today : e.due_date,
    }))
    .filter((e) => e.remaining > 0.004);

  const movements: ProjectionMovement[] = entriesWithRemaining.map((e) => ({
    date: e.effectiveDate,
    amount: e.type === "receita" ? e.remaining : -e.remaining,
  }));

  const projection = projectCashflow(currentBalance, movements, today, horizonEnd);

  const entradasPrevistas = entriesWithRemaining
    .filter((e) => e.type === "receita")
    .reduce((sum, e) => sum + e.remaining, 0);
  const saidasPrevistas = entriesWithRemaining
    .filter((e) => e.type === "despesa")
    .reduce((sum, e) => sum + e.remaining, 0);

  return { currentBalance, projection, entriesWithRemaining, entradasPrevistas, saidasPrevistas };
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
