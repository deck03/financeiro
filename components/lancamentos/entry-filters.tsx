"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ENTRY_STATUS_LABELS } from "@/lib/labels/lancamentos";

const RELEVANT_STATUSES = ["em_aberto", "agendado", "vencido", "parcialmente_pago", "parcialmente_recebido", "pago", "recebido", "cancelado"];

type Option = { id: string; name: string };

export function EntryFilters({
  type,
  categories,
  subcategories,
  counterparties,
}: {
  type: "receita" | "despesa";
  categories: Option[];
  subcategories: (Option & { category_id: string })[];
  counterparties: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const selectedCategory = searchParams.get("category_id") ?? "";
  const filteredSubcategories = selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory)
    : subcategories;

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

  function handleCategoryChange(value: string) {
    // Trocar a categoria invalida a subcategoria escolhida anteriormente
    // (ela pode não pertencer mais à nova categoria) — limpa as duas de
    // uma vez, num único push de URL.
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("category_id", value);
    else params.delete("category_id");
    params.delete("subcategory_id");
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
    // Definir um período manualmente (mesmo vazio) deixa de ser "sem
    // período pedido pelo usuário" — remove o marcador de "ver tudo" se
    // ele estivesse presente de uma limpeza anterior.
    if (from || to) params.delete("all");
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
    // Sinaliza que o período foi limpo de propósito — sem isso, a tela
    // reaplicaria o filtro padrão de "hoje" assim que a página recarregar
    // (já que, sem essa marca, "nenhum período na URL" é interpretado como
    // "primeira visita", e cai no padrão de hoje de novo).
    params.set("all", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasMoreFilters = selectedCategory || searchParams.get("subcategory_id") || searchParams.get("counterparty_id");

  function clearMoreFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category_id");
    params.delete("subcategory_id");
    params.delete("counterparty_id");
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
      <div className="w-44">
        <label className="mb-1 block text-xs font-medium text-ink-soft">Categoria</label>
        <Select value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-44">
        <label className="mb-1 block text-xs font-medium text-ink-soft">Subcategoria</label>
        <Select
          value={searchParams.get("subcategory_id") ?? ""}
          onChange={(e) => updateParam("subcategory_id", e.target.value)}
          disabled={filteredSubcategories.length === 0}
        >
          <option value="">Todas</option>
          {filteredSubcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48">
        <label className="mb-1 block text-xs font-medium text-ink-soft">
          {type === "despesa" ? "Fornecedor" : "Contraparte"}
        </label>
        <Select
          value={searchParams.get("counterparty_id") ?? ""}
          onChange={(e) => updateParam("counterparty_id", e.target.value)}
        >
          <option value="">Todos</option>
          {counterparties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
      {hasMoreFilters && (
        <Button type="button" variant="ghost" onClick={clearMoreFilters} disabled={isPending}>
          Limpar categoria/fornecedor
        </Button>
      )}
    </form>
  );
}
