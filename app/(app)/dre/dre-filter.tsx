"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Select, } from "@/components/ui/select";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function DreFilter({
  regime,
  periodType,
  year,
  month,
  quarter,
  customFrom,
  customTo,
}: {
  regime: "caixa" | "competencia";
  periodType: "mensal" | "trimestral" | "personalizado";
  year: number;
  month: number;
  quarter: number;
  customFrom: string;
  customTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [localPeriodType, setLocalPeriodType] = useState(periodType);
  const [localYear, setLocalYear] = useState(year);
  const [localMonth, setLocalMonth] = useState(month);
  const [localQuarter, setLocalQuarter] = useState(quarter);
  const [localFrom, setLocalFrom] = useState(customFrom);
  const [localTo, setLocalTo] = useState(customTo);

  function setRegime(newRegime: "caixa" | "competencia") {
    const params = new URLSearchParams();
    params.set("regime", newRegime);
    params.set("period", localPeriodType);
    if (localPeriodType === "mensal") {
      params.set("year", String(localYear));
      params.set("month", String(localMonth));
    } else if (localPeriodType === "trimestral") {
      params.set("year", String(localYear));
      params.set("quarter", String(localQuarter));
    } else {
      params.set("from", localFrom);
      params.set("to", localTo);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("regime", regime);
    params.set("period", localPeriodType);
    if (localPeriodType === "mensal") {
      params.set("year", String(localYear));
      params.set("month", String(localMonth));
    } else if (localPeriodType === "trimestral") {
      params.set("year", String(localYear));
      params.set("quarter", String(localQuarter));
    } else {
      params.set("from", localFrom);
      params.set("to", localTo);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(["caixa", "competencia"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRegime(r)}
            className={cn(
              "rounded-card border px-3 py-1.5 text-sm font-medium transition-colors",
              regime === r
                ? "border-brand-accent bg-brand-accentSoft text-brand-accent"
                : "border-base-border bg-white text-ink-soft hover:bg-base-bg"
            )}
          >
            {r === "caixa" ? "Regime de caixa" : "Regime de competência"}
          </button>
        ))}
      </div>

      <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="dre-period-type">Período</Label>
          <Select
            id="dre-period-type"
            value={localPeriodType}
            onChange={(e) => setLocalPeriodType(e.target.value as typeof localPeriodType)}
          >
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="personalizado">Personalizado</option>
          </Select>
        </div>

        {localPeriodType === "mensal" && (
          <>
            <div>
              <Label htmlFor="dre-month">Mês</Label>
              <Select id="dre-month" value={localMonth} onChange={(e) => setLocalMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="dre-year">Ano</Label>
              <Select id="dre-year" value={localYear} onChange={(e) => setLocalYear(Number(e.target.value))}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}

        {localPeriodType === "trimestral" && (
          <>
            <div>
              <Label htmlFor="dre-quarter">Trimestre</Label>
              <Select id="dre-quarter" value={localQuarter} onChange={(e) => setLocalQuarter(Number(e.target.value))}>
                <option value={1}>1º trimestre</option>
                <option value={2}>2º trimestre</option>
                <option value={3}>3º trimestre</option>
                <option value={4}>4º trimestre</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="dre-year-q">Ano</Label>
              <Select id="dre-year-q" value={localYear} onChange={(e) => setLocalYear(Number(e.target.value))}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}

        {localPeriodType === "personalizado" && (
          <>
            <div>
              <Label htmlFor="dre-from">De</Label>
              <Input id="dre-from" type="date" value={localFrom} onChange={(e) => setLocalFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dre-to">Até</Label>
              <Input id="dre-to" type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)} />
            </div>
          </>
        )}

        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>
    </div>
  );
}
