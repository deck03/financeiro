"use client";

import { useState } from "react";
import Link from "next/link";
import { ReverseSettlementButton } from "./reverse-settlement-button";
import { EditSettlementForm } from "./edit-settlement-form";

type Option = { id: string; name: string };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function SettlementRow({
  settlement: s,
  type,
  canCancel,
  canEditSettlement,
  bankAccounts,
  paymentMethods,
}: {
  settlement: {
    id: string;
    amount: number;
    interest: number;
    penalty: number;
    discount: number;
    addition: number;
    settlement_date: string;
    status: string;
    notes: string | null;
    bank_account_id: string | null;
    payment_method_id: string | null;
    bank_accounts?: { display_name: string } | null;
  };
  type: "despesa" | "receita";
  canCancel: boolean;
  canEditSettlement: boolean;
  bankAccounts: (Option & { ownership: string })[];
  paymentMethods: Option[];
}) {
  const [editing, setEditing] = useState(false);

  const charges: string[] = [];
  if (s.interest > 0) charges.push(`Juros ${formatCurrency(s.interest)}`);
  if (s.penalty > 0) charges.push(`Multa ${formatCurrency(s.penalty)}`);
  if (s.addition > 0) charges.push(`Acréscimo ${formatCurrency(s.addition)}`);
  if (s.discount > 0) charges.push(`Desconto ${formatCurrency(s.discount)}`);

  const colSpan = canCancel ? (type === "receita" ? 7 : 6) : type === "receita" ? 6 : 5;

  if (editing) {
    return (
      <tr>
        <td colSpan={colSpan} className="py-2">
          <EditSettlementForm
            settlement={s}
            bankAccounts={bankAccounts}
            paymentMethods={paymentMethods}
            onCancel={() => setEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-base-border last:border-0">
      <td className="py-2 pr-4 text-ink-soft">{formatDate(s.settlement_date)}</td>
      <td className="py-2 pr-4 text-ink-soft">{s.bank_accounts?.display_name}</td>
      <td className="num py-2 pr-4 text-ink">{formatCurrency(s.amount)}</td>
      <td className="py-2 pr-4 text-xs text-ink-faint">{charges.join(", ") || "—"}</td>
      <td className="py-2 pr-4 text-ink-soft">{s.status === "valido" ? "Válida" : "Estornada"}</td>
      {canCancel && (
        <td className="py-2 pr-4">
          {s.status === "valido" && (
            <div className="flex items-center gap-3">
              {canEditSettlement && (
                <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-brand-accent hover:underline">
                  Editar
                </button>
              )}
              <ReverseSettlementButton settlementId={s.id} />
            </div>
          )}
        </td>
      )}
      {type === "receita" && (
        <td className="py-2 pr-4">
          {s.status === "valido" && (
            <Link href={`/recibos/novo?settlement=${s.id}`} className="text-sm font-medium text-brand-accent hover:underline">
              Emitir recibo
            </Link>
          )}
        </td>
      )}
    </tr>
  );
}
