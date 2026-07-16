import { cn } from "@/lib/cn";

export function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ativo" || status === "ativa";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        isActive ? "bg-signal-positiveSoft text-signal-positive" : "bg-base-bg text-ink-faint"
      )}
    >
      {isActive ? "Ativo" : "Inativo"}
    </span>
  );
}
