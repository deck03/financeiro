import Link from "next/link";
import { cn } from "@/lib/cn";

export function MetricCard({
  label,
  value,
  sublabel,
  href,
  tone = "default",
  size = "md",
}: {
  label: string;
  value: string;
  sublabel?: string;
  href?: string;
  tone?: "default" | "positive" | "negative" | "warning";
  size?: "md" | "lg";
}) {
  const toneClass = {
    default: "text-ink",
    positive: "text-signal-positive",
    negative: "text-signal-negative",
    warning: "text-signal-warning",
  }[tone];

  const content = (
    <div className="rounded-card border border-base-border bg-base-surface p-4 transition-colors hover:border-brand-accent/40">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={cn("num mt-1 font-semibold", size === "lg" ? "text-2xl" : "text-lg", toneClass)}>{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-ink-faint">{sublabel}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
