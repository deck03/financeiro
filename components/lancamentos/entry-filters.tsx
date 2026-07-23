"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ENTRY_STATUS_LABELS } from "@/lib/labels/lancamentos";

const RELEVANT_STATUSES = ["em_aberto", "agendado", "vencido", "parcialmente_pago", "parcialmente_recebido", "pago", "recebido", "cancelado"];

export function EntryFilters({ type }: { type: "receita" | "despesa" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("q", search);
    else params.delete("q");
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clearPeriod() {
    setFrom("");
    setTo("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <Input
          placeholder="Buscar por descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="w-48">
        <Select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
        >
          <option value="">Todos os status</option>
          {RELEVANT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ENTRY_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs font-medium text-ink-soft">Vencimento de</label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs font-medium text-ink-soft">até</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        Buscar
      </Button>
      {(from || to) && (
        <Button type="button" variant="ghost" onClick={clearPeriod} disabled={isPending}>
          Limpar período
        </Button>
      )}
    </form>
  );
}
