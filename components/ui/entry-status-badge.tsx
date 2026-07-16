import { cn } from "@/lib/cn";
import { ENTRY_STATUS_LABELS, ENTRY_STATUS_COLORS } from "@/lib/labels/lancamentos";

const COLOR_CLASSES = {
  positive: "bg-signal-positiveSoft text-signal-positive",
  negative: "bg-signal-negativeSoft text-signal-negative",
  warning: "bg-signal-warningSoft text-signal-warning",
  neutral: "bg-base-bg text-ink-faint",
};

export function EntryStatusBadge({ status }: { status: string }) {
  const color = ENTRY_STATUS_COLORS[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        COLOR_CLASSES[color]
      )}
    >
      {ENTRY_STATUS_LABELS[status] ?? status}
    </span>
  );
}
