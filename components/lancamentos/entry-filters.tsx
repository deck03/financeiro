"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ENTRY_STATUS_LABELS } from "@/lib/labels/lancamentos";

const RELEVANT_STATUSES = ["em_aberto", "agendado", "pago", "recebido", "cancelado"];

export function EntryFilters({ type }: { type: "receita" | "despesa" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");

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
    updateParam("q", search);
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
      <Button type="submit" variant="secondary" disabled={isPending}>
        Buscar
      </Button>
    </form>
  );
}
