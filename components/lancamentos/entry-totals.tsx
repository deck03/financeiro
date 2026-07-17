function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function EntryTotals({
  openTotal,
  settledTotal,
  settledLabel,
  overdueTotal,
}: {
  openTotal: number;
  settledTotal: number;
  settledLabel: string;
  overdueTotal?: number;
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-card border border-base-border bg-base-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Total em aberto</p>
        <p className="num mt-1 text-xl font-semibold text-signal-warning">{formatCurrency(openTotal)}</p>
      </div>
      {overdueTotal !== undefined && overdueTotal > 0 && (
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Total vencido</p>
          <p className="num mt-1 text-xl font-semibold text-signal-negative">{formatCurrency(overdueTotal)}</p>
        </div>
      )}
      <div className="rounded-card border border-base-border bg-base-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{settledLabel}</p>
        <p className="num mt-1 text-xl font-semibold text-signal-positive">{formatCurrency(settledTotal)}</p>
      </div>
    </div>
  );
}
