function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function EntryTotals({
  openTotal,
  settledTotal,
  settledLabel,
}: {
  openTotal: number;
  settledTotal: number;
  settledLabel: string;
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-card border border-base-border bg-base-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Total em aberto</p>
        <p className="num mt-1 text-xl font-semibold text-signal-warning">{formatCurrency(openTotal)}</p>
      </div>
      <div className="rounded-card border border-base-border bg-base-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{settledLabel}</p>
        <p className="num mt-1 text-xl font-semibold text-signal-positive">{formatCurrency(settledTotal)}</p>
      </div>
    </div>
  );
}
