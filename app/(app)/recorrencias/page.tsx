import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FREQUENCY_LABELS } from "@/lib/labels/parcelamento-recorrencia";
import { GenerateOccurrencesButton } from "./generate-occurrences-button";
import { CancelRecurringForm } from "./cancel-recurring-form";
import Link from "next/link";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function RecorrenciasPage({
  searchParams,
}: {
  searchParams: { erro_geracao?: string };
}) {
  const supabase = createClient();
  const canManage = await hasPermission("criar_lancamentos");

  const { data: rules } = await supabase
    .from("recurring_rules")
    .select("id, description, type, amount, frequency, status, start_date, end_date")
    .order("created_at", { ascending: false });

  const rulesWithEntries = await Promise.all(
    (rules ?? []).map(async (r) => {
      const { data: entries } = await supabase
        .from("financial_entries")
        .select("id, due_date, status")
        .eq("recurring_rule_id", r.id)
        .in("status", ["em_aberto", "agendado"])
        .order("due_date", { ascending: true })
        .limit(24);
      return { ...r, upcomingEntries: entries ?? [] };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Recorrências</h1>
          <p className="text-sm text-ink-soft">
            Regras de lançamentos recorrentes. As ocorrências futuras são geradas com até 12
            meses de antecedência.
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Link href="/contas-a-pagar/nova">
                <span className="inline-flex items-center rounded-card border border-base-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-base-bg">
                  Nova recorrência (despesa)
                </span>
              </Link>
              <Link href="/contas-a-receber/nova">
                <span className="inline-flex items-center rounded-card border border-base-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-base-bg">
                  Nova recorrência (receita)
                </span>
              </Link>
            </>
          )}
        </div>
      </div>

      {searchParams.erro_geracao && (
        <div className="rounded-card border border-signal-negative/40 bg-signal-negative/10 px-4 py-3 text-sm text-signal-negative">
          A recorrência foi criada, mas não foi possível gerar os lançamentos automaticamente —
          por isso ela ainda não aparece em Contas a pagar/receber. Use o botão &quot;Gerar
          próximas ocorrências&quot; abaixo para tentar novamente.
        </div>
      )}

      <div className="space-y-4">
        {rulesWithEntries.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">{r.description}</h2>
                <p className="text-sm text-ink-soft">
                  {r.type === "despesa" ? "Despesa" : "Receita"} · {FREQUENCY_LABELS[r.frequency]} ·{" "}
                  <span className="num">{formatCurrency(r.amount)}</span> · início em{" "}
                  {formatDate(r.start_date)}
                  {r.end_date ? ` · até ${formatDate(r.end_date)}` : ""}
                </p>
              </div>
              <StatusBadge status={r.status === "ativa" ? "ativo" : "inativo"} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                Próximas ocorrências em aberto
              </p>
              {r.upcomingEntries.length === 0 ? (
                <p className="text-sm text-ink-faint">Nenhuma ocorrência em aberto no momento.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {r.upcomingEntries.slice(0, 8).map((e) => (
                    <li
                      key={e.id}
                      className="rounded-full bg-base-bg px-2.5 py-0.5 text-xs text-ink-soft"
                    >
                      {formatDate(e.due_date)}
                    </li>
                  ))}
                  {r.upcomingEntries.length > 8 && (
                    <li className="text-xs text-ink-faint">+{r.upcomingEntries.length - 8}</li>
                  )}
                </ul>
              )}
            </div>

            {canManage && r.status === "ativa" && (
              <div className="mt-4 flex flex-wrap gap-3">
                <GenerateOccurrencesButton ruleId={r.id} />
                <CancelRecurringForm ruleId={r.id} upcomingEntries={r.upcomingEntries} />
              </div>
            )}
          </Card>
        ))}

        {rulesWithEntries.length === 0 && (
          <Card>
            <p className="text-sm text-ink-faint">
              Nenhuma recorrência criada ainda. Crie uma pela aba "Recorrente" ao criar uma nova
              conta a pagar ou a receber.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
