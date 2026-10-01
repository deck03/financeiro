"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateTransferAction,
  cancelTransferAction,
  deleteTransferAction,
  type FormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TRANSFER_CLASSIFICATION_LABELS } from "@/lib/labels/transferencias";

type Option = { id: string; name: string; ownership: string };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

const initialState: FormState = {};
const initialCancelState: FormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function TransferRow({
  transfer: t,
  bankAccounts,
  canManage,
}: {
  transfer: {
    id: string;
    amount: number;
    transfer_date: string;
    classification: string;
    notes: string | null;
    status: string;
    from_bank_account_id: string;
    to_bank_account_id: string;
    from?: { display_name: string } | null;
    to?: { display_name: string } | null;
  };
  bankAccounts: Option[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updateState, updateAction] = useFormState(updateTransferAction, initialState);
  const [cancelState, cancelAction] = useFormState(cancelTransferAction, initialCancelState);

  if (editing) {
    return (
      <tr>
        <td colSpan={6} className="py-3">
          <form action={updateAction} className="space-y-3 rounded-card border border-base-border bg-base-bg p-3">
            <input type="hidden" name="transfer_id" value={t.id} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`et-from-${t.id}`}>Conta de origem</Label>
                <Select id={`et-from-${t.id}`} name="from_bank_account_id" defaultValue={t.from_bank_account_id} required>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`et-to-${t.id}`}>Conta de destino</Label>
                <Select id={`et-to-${t.id}`} name="to_bank_account_id" defaultValue={t.to_bank_account_id} required>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`et-amount-${t.id}`}>Valor</Label>
                <Input id={`et-amount-${t.id}`} name="amount" type="number" step="0.01" min="0.01" defaultValue={t.amount} required />
              </div>
              <div>
                <Label htmlFor={`et-date-${t.id}`}>Data</Label>
                <Input id={`et-date-${t.id}`} name="transfer_date" type="date" defaultValue={t.transfer_date} required />
              </div>
              <div>
                <Label htmlFor={`et-class-${t.id}`}>Classificação</Label>
                <Select id={`et-class-${t.id}`} name="classification" defaultValue={t.classification} required>
                  {Object.entries(TRANSFER_CLASSIFICATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`et-notes-${t.id}`}>Observações (opcional)</Label>
                <Input id={`et-notes-${t.id}`} name="notes" defaultValue={t.notes ?? ""} />
              </div>
            </div>
            {updateState.error && <p className="text-xs text-signal-negative">{updateState.error}</p>}
            <div className="flex gap-2">
              <SubmitButton label="Salvar" />
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar edição
              </Button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-base-border last:border-0">
      <td className="py-2 pr-4 text-ink-soft">{formatDate(t.transfer_date)}</td>
      <td className="py-2 pr-4 text-ink">{t.from?.display_name}</td>
      <td className="py-2 pr-4 text-ink">{t.to?.display_name}</td>
      <td className="py-2 pr-4 text-ink-soft">{TRANSFER_CLASSIFICATION_LABELS[t.classification]}</td>
      <td className="num py-2 pr-4 text-ink">
        {formatCurrency(t.amount)}
        {t.status === "estornado" && <div className="text-xs font-normal text-signal-negative">Cancelada</div>}
      </td>
      {canManage && (
        <td className="py-2 pr-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brand-accent hover:underline">
              Editar
            </button>

            {t.status !== "estornado" && (
              <form action={cancelAction}>
                <input type="hidden" name="transfer_id" value={t.id} />
                <CancelSubmit />
              </form>
            )}

            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-xs text-ink-faint hover:text-signal-negative hover:underline"
              >
                Excluir
              </button>
            ) : (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    setDeleteError(null);
                    const result = await deleteTransferAction(t.id);
                    if (result.error) {
                      setDeleteError(result.error);
                      setIsDeleting(false);
                    }
                  }}
                  className="text-xs font-medium text-signal-negative hover:underline disabled:opacity-50"
                >
                  {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="text-xs text-ink-faint hover:underline"
                >
                  Voltar
                </button>
              </span>
            )}
          </div>
          {cancelState.error && <p className="mt-1 text-xs text-signal-negative">{cancelState.error}</p>}
          {deleteError && <p className="mt-1 text-xs text-signal-negative">{deleteError}</p>}
        </td>
      )}
    </tr>
  );
}

function CancelSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs font-medium text-ink-soft hover:underline disabled:opacity-50">
      {pending ? "Cancelando..." : "Cancelar transferência"}
    </button>
  );
}
