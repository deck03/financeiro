import Link from "next/link";
import { cn } from "@/lib/cn";

type AlertLevel = "negative" | "warning";

export function AlertItem({
  level,
  title,
  description,
  href,
}: {
  level: AlertLevel;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-start justify-between gap-4 rounded-card border px-4 py-3 transition-colors hover:opacity-90",
        level === "negative"
          ? "border-signal-negative/20 bg-signal-negativeSoft"
          : "border-signal-warning/20 bg-signal-warningSoft"
      )}
    >
      <div>
        <p className={cn("text-sm font-medium", level === "negative" ? "text-signal-negative" : "text-signal-warning")}>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
      </div>
      <span className={cn("text-xs font-medium", level === "negative" ? "text-signal-negative" : "text-signal-warning")}>
        Ver →
      </span>
    </Link>
  );
}
