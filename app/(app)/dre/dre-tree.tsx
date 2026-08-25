"use client";

import { useState } from "react";
import type { DreTreeNode } from "@/lib/finance/dre";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/**
 * Uma linha da árvore consolidada (família → categoria → subcategoria).
 * `negative` inverte o sinal na exibição (despesas são armazenadas como
 * total positivo em DreTreeNode, e mostradas como negativas na tela,
 * seguindo a mesma convenção já usada no resto da DRE).
 */
function TreeRow({ node, depth, negative }: { node: DreTreeNode; depth: number; negative: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const displayValue = negative ? -node.total : node.total;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((v) => !v)}
        className={`flex w-full items-center justify-between rounded-card py-1.5 pr-2 text-left ${
          hasChildren ? "cursor-pointer hover:bg-base-bg" : "cursor-default"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="flex items-center gap-1.5 text-sm text-ink-soft">
          <span className="inline-block w-3 text-xs text-ink-faint">{hasChildren ? (expanded ? "▾" : "▸") : ""}</span>
          {node.label}
        </span>
        <span className={`num text-sm ${displayValue < 0 ? "text-signal-negative" : "text-ink"}`}>
          {formatCurrency(displayValue)}
        </span>
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow key={child.key} node={child} depth={depth + 1} negative={negative} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Visão "consolidar" da DRE — família, categoria e subcategoria em níveis
 * expansíveis, cada um clicável para abrir/fechar. Usada tanto para
 * receitas quanto para despesas operacionais (a única diferença entre as
 * duas é o sinal exibido, via a prop `negative`).
 */
export function DreConsolidatedTree({ nodes, negative = false }: { nodes: DreTreeNode[]; negative?: boolean }) {
  if (nodes.length === 0) {
    return <p className="px-2 py-2 text-sm text-ink-faint">Nenhum valor no período.</p>;
  }
  return (
    <div>
      {nodes.map((node) => (
        <TreeRow key={node.key} node={node} depth={0} negative={negative} />
      ))}
    </div>
  );
}
