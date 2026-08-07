"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

export function QuarterSelect({
  mode,
  yearA,
  quarterA,
  yearB,
  quarterB,
}: {
  mode: "anterior" | "ano_anterior" | "personalizado";
  yearA: number;
  quarterA: number;
  yearB: number;
  quarterB: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [localYearA, setLocalYearA] = useState(yearA);
  const [localQuarterA, setLocalQuarterA] = useState(quarterA);
  const [localYearB, setLocalYearB] = useState(yearB);
  const [localQuarterB, setLocalQuarterB] = useState(quarterB);

  function go(newMode: string, params: Record<string, string> = {}) {
    const p = new URLSearchParams({ mode: newMode, ...params });
    router.push(`${pathname}?${p.toString()}`);
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    go("personalizado", {
      yearA: String(localYearA),
      quarterA: String(localQuarterA),
      yearB: String(localYearB),
      quarterB: String(localQuarterB),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => go("anterior")}
          className={cn(
            "rounded-card border px-3 py-1.5 text-sm font-medium",
            mode === "anterior" ? "border-brand-accent bg-brand-accentSoft text-brand-accent" : "border-base-border bg-white text-ink-soft hover:bg-base-bg"
          )}
        >
          Trimestre atual x anterior
        </button>
        <button
          type="button"
          onClick={() => go("ano_anterior")}
          className={cn(
            "rounded-card border px-3 py-1.5 text-sm font-medium",
            mode === "ano_anterior" ? "border-brand-accent bg-brand-accentSoft text-brand-accent" : "border-base-border bg-white text-ink-soft hover:bg-base-bg"
          )}
        >
          Trimestre atual x mesmo trimestre do ano anterior
        </button>
      </div>

      <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-3">
        <span className="text-sm text-ink-soft">Ou compare dois trimestres específicos:</span>
        <Select value={localQuarterA} onChange={(e) => setLocalQuarterA(Number(e.target.value))}>
          <option value={1}>1º tri</option>
          <option value={2}>2º tri</option>
          <option value={3}>3º tri</option>
          <option value={4}>4º tri</option>
        </Select>
        <Select value={localYearA} onChange={(e) => setLocalYearA(Number(e.target.value))}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <span className="text-sm text-ink-faint">vs.</span>
        <Select value={localQuarterB} onChange={(e) => setLocalQuarterB(Number(e.target.value))}>
          <option value={1}>1º tri</option>
          <option value={2}>2º tri</option>
          <option value={3}>3º tri</option>
          <option value={4}>4º tri</option>
        </Select>
        <Select value={localYearB} onChange={(e) => setLocalYearB(Number(e.target.value))}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Comparar
        </Button>
      </form>
    </div>
  );
}
