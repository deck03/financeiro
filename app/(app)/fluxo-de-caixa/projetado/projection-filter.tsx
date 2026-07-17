"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const HORIZONS = [7, 15, 30, 60, 90];

export function ProjectionFilter({
  horizonDays,
  customTo,
  includePersonal,
  canSeePersonal,
  accountId,
  bankAccounts,
}: {
  horizonDays: number | null;
  customTo: string;
  includePersonal: boolean;
  canSeePersonal: boolean;
  accountId: string;
  bankAccounts: { id: string; name: string; ownership: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [customDate, setCustomDate] = useState(customTo);
  const [personal, setPersonal] = useState(includePersonal);
  const [account, setAccount] = useState(accountId);

  function goTo(params: URLSearchParams) {
    router.push(`${pathname}?${params.toString()}`);
  }

  function selectHorizon(days: number) {
    const params = new URLSearchParams();
    params.set("horizon", String(days));
    if (personal) params.set("personal", "1");
    if (account) params.set("account", account);
    goTo(params);
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (customDate) params.set("to", customDate);
    if (personal) params.set("personal", "1");
    if (account) params.set("account", account);
    goTo(params);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {HORIZONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => selectHorizon(d)}
            className={cn(
              "rounded-card border px-3 py-1.5 text-sm font-medium transition-colors",
              horizonDays === d
                ? "border-brand-accent bg-brand-accentSoft text-brand-accent"
                : "border-base-border bg-white text-ink-soft hover:bg-base-bg"
            )}
          >
            {d} dias
          </button>
        ))}
      </div>

      <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="proj-to">Até uma data específica</Label>
          <Input id="proj-to" type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="proj-account">Conta</Label>
          <Select id="proj-account" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Todas as contas</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
              </option>
            ))}
          </Select>
        </div>
        {canSeePersonal && (
          <label className="flex items-center gap-2 pb-2 text-sm text-ink">
            <Checkbox checked={personal} onChange={(e) => setPersonal(e.target.checked)} />
            Incluir contas pessoais
          </label>
        )}
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>
    </div>
  );
}
