"use client";

import { useEffect, useState } from "react";
import type { DreTreeNode } from "@/lib/finance/dre";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

type NodeSelection = {
  label: string;
  family: string;
  category?: string;
  subcategory?: string;
};

type EntryRow = {
  id: string;
  description: string;
  due_date: string;
  competence_date: string | null;
  amount: number;
  status: string;
};

/**
 * Uma linha da árvore consolidada (família → categoria → subcategoria).
 * `negative` inverte o sinal na exibição (despesas são armazenadas como
 * total positivo em DreTreeNode, e mostradas como negativas na tela,
 * seguindo a mesma convenção já usada no resto da DRE).
 *
 * "Ver lançamentos" abre o painel lateral com os lançamentos daquele nó
 * específico (família inteira, ou só uma categoria, ou só uma
 * subcategoria) — independente de o nó ter subníveis para expandir ou não.
 */
function TreeRow({
  node,
  depth,
  negative,
  family,
  category,
  onSelect,
}: {
  node: DreTreeNode;
  depth: number;
  negative: boolean;
  family: string;
  category?: string;
  onSelect: (selection: NodeSelection) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const displayValue = negative ? -node.total : node.total;

  const isFamily = depth === 0;
  const isCategory = depth === 1;
  const isSubcategory = depth === 2;
  const nodeCategory = isFamily ? undefined : isCategory ? node.label : category;
  const nodeSubcategory = isSubcategory ? node.label : undefined;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 rounded-card py-1.5 pr-2 hover:bg-base-bg" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        <button
          type="button"
          onClick={() => hasChildren && setExpanded((v) => !v)}
          className={`flex flex-1 items-center gap-1.5 text-left text-sm text-ink-soft ${
            hasChildren ? "cursor-pointer hover:text-ink" : "cursor-default"
          }`}
        >
          <span className="inline-block w-3 text-xs text-ink-faint">{hasChildren ? (expanded ? "▾" : "▸") : ""}</span>
          {node.label}
        </button>
        <button
          type="button"
          onClick={() => onSelect({ label: node.label, family, category: nodeCategory, subcategory: nodeSubcategory })}
          className="shrink-0 text-xs font-medium text-brand-accent hover:underline"
        >
          Ver lançamentos
        </button>
        <span className={`num shrink-0 text-sm ${displayValue < 0 ? "text-signal-negative" : "text-ink"}`}>
          {formatCurrency(displayValue)}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.key}
              node={child}
              depth={depth + 1}
              negative={negative}
              family={family}
              category={nodeCategory}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Painel lateral (1/3 da tela em telas grandes, tela cheia no celular) com os lançamentos de um nó da árvore. */
function EntriesPanel({
  selection,
  regime,
  from,
  to,
  type,
  onClose,
}: {
  selection: NodeSelection;
  regime: "caixa" | "competencia";
  from: string;
  to: string;
  type: "receita" | "despesa";
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<EntryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);

    const params = new URLSearchParams({ regime, from, to, type, family: selection.family });
    if (selection.category) params.set("category", selection.category);
    if (selection.subcategory) params.set("subcategory", selection.subcategory);

    fetch(`/api/dre/entries?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("erro");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar os lançamentos.");
      });

    return () => {
      cancelled = true;
    };
  }, [regime, from, to, type, selection.family, selection.category, selection.subcategory]);

  const total = (entries ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-xl sm:w-1/3 sm:min-w-[380px]">
        <div className="flex items-center justify-between border-b border-base-border px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">Lançamentos considerados</p>
            <h3 className="text-base font-semibold text-ink">{selection.label}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-card px-2 py-1 text-ink-faint hover:bg-base-bg hover:text-ink" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {error && <p className="text-sm text-signal-negative">{error}</p>}
          {!error && entries === null && <p className="text-sm text-ink-faint">Carregando...</p>}
          {!error && entries !== null && entries.length === 0 && (
            <p className="text-sm text-ink-faint">Nenhum lançamento encontrado neste período.</p>
          )}
          {!error && entries !== null && entries.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-left text-ink-soft">
                  <th className="py-2 pr-2 font-medium">Descrição</th>
                  <th className="py-2 pr-2 font-medium">Vencimento</th>
                  <th className="py-2 pr-2 font-medium">Competência</th>
                  <th className="py-2 pr-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-base-border last:border-0">
                    <td className="py-2 pr-2 text-ink">{e.description}</td>
                    <td className="py-2 pr-2 text-ink-soft">{formatDate(e.due_date)}</td>
                    <td className="py-2 pr-2 text-ink-soft">{formatDate(e.competence_date)}</td>
                    <td className="num py-2 pr-2 text-right text-ink">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {entries !== null && entries.length > 0 && (
          <div className="flex items-center justify-between border-t border-base-border px-4 py-3 text-sm font-semibold text-ink">
            <span>Total</span>
            <span className="num">{formatCurrency(total)}</span>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Visão "consolidar" da DRE — família, categoria e subcategoria em níveis
 * expansíveis. Cada nível tem um "Ver lançamentos" que abre o painel
 * lateral com os lançamentos daquele nível específico.
 */
export function DreConsolidatedTree({
  nodes,
  negative = false,
  regime,
  from,
  to,
  type,
}: {
  nodes: DreTreeNode[];
  negative?: boolean;
  regime: "caixa" | "competencia";
  from: string;
  to: string;
  type: "receita" | "despesa";
}) {
  const [selected, setSelected] = useState<NodeSelection | null>(null);

  if (nodes.length === 0) {
    return <p className="px-2 py-2 text-sm text-ink-faint">Nenhum valor no período.</p>;
  }

  return (
    <div>
      {nodes.map((node) => (
        <TreeRow key={node.key} node={node} depth={0} negative={negative} family={node.label} onSelect={setSelected} />
      ))}
      {selected && (
        <EntriesPanel selection={selected} regime={regime} from={from} to={to} type={type} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
