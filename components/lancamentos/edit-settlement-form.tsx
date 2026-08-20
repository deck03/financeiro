"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateSettlementAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const initialState: FormState = {};

type Option = { id: string; name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar liquidação"}
    </Button>
  );
}

/**
 * Editar uma liquidação já registrada. Diferente de editar o lançamento,
 * isso corrige o que de fato foi pago/recebido — reflete no Fluxo de Caixa
 * Realizado, na DRE em regime de caixa e no Dashboard, porque esses
 * relatórios usam o valor da liquidação, não o valor "esperado" do
 * lançamento.
 */
export function EditSettlementForm({
  settlement,
  bankAccounts,
  paymentMethods,
  onCancel,
}: {
  settlement: {
    id: string;
    amount: number;
    settlement_date: string;
    bank_account_id: string | null;
    payment_method_id: string | null;
    interest: number;
    penalty: number;
    discount: number;
    addition: number;
    notes: string | null;
  };
  bankAccounts: (Option & { ownership: string })[];
  paymentMethods: Option[];
  onCancel: () => void;
}) {
  const [state, formAction] = useFormState(updateSettlementAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-card border border-base-border bg-base-bg p-3">
      <input type="hidden" name="settlement_id" value={settlement.id} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`es-amount-${settlement.id}`}>Valor</Label>
          <Input
            id={`es-amount-${settlement.id}`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={settlement.amount}
            required
          />
        </div>
        <div>
          <Label htmlFor={`es-date-${settlement.id}`}>Data</Label>
          <Input id={`es-date-${settlement.id}`} name="settlement_date" type="date" defaultValue={settlement.settlement_date} required />
        </div>
        <div>
          <Label htmlFor={`es-bank-${settlement.id}`}>Conta bancária</Label>
          <Select id={`es-bank-${settlement.id}`} name="bank_account_id" defaultValue={settlement.bank_account_id ?? ""} required>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`es-method-${settlement.id}`}>Forma de pagamento (opcional)</Label>
          <Select id={`es-method-${settlement.id}`} name="payment_method_id" defaultValue={settlement.payment_method_id ?? ""}>
            <option value="">Nenhuma</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`es-interest-${settlement.id}`}>Juros</Label>
          <Input id={`es-interest-${settlement.id}`} name="interest" type="number" step="0.01" min="0" defaultValue={settlement.interest} />
        </div>
        <div>
          <Label htmlFor={`es-penalty-${settlement.id}`}>Multa</Label>
          <Input id={`es-penalty-${settlement.id}`} name="penalty" type="number" step="0.01" min="0" defaultValue={settlement.penalty} />
        </div>
        <div>
          <Label htmlFor={`es-discount-${settlement.id}`}>Desconto</Label>
          <Input id={`es-discount-${settlement.id}`} name="discount" type="number" step="0.01" min="0" defaultValue={settlement.discount} />
        </div>
        <div>
          <Label htmlFor={`es-addition-${settlement.id}`}>Acréscimo</Label>
          <Input id={`es-addition-${settlement.id}`} name="addition" type="number" step="0.01" min="0" defaultValue={settlement.addition} />
        </div>
      </div>

      <div>
        <Label htmlFor={`es-notes-${settlement.id}`}>Observações (opcional)</Label>
        <Input id={`es-notes-${settlement.id}`} name="notes" defaultValue={settlement.notes ?? ""} />
      </div>

      <p className="text-xs text-ink-faint">
        Isso corrige o que foi de fato pago/recebido — reflete no Fluxo de Caixa Realizado, na
        DRE em regime de caixa e no Dashboard.
      </p>

      {state.error && <p className="text-xs text-signal-negative">{state.error}</p>}
      {state.success && <p className="text-xs text-signal-positive">Liquidação atualizada.</p>}

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={onCancel}>
          Fechar
        </Button>
      </div>
    </form>
  );
}
