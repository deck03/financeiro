"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { createEntryAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const initialState: FormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

type Option = { id: string; name: string };

export function EntryForm({
  type,
  categories,
  subcategories,
  costCenters,
  bankAccounts,
  counterparties,
  paymentMethods,
}: {
  type: "receita" | "despesa";
  categories: Option[];
  subcategories: (Option & { category_id: string })[];
  costCenters: Option[];
  bankAccounts: (Option & { ownership: string })[];
  counterparties: Option[];
  paymentMethods: Option[];
}) {
  const [state, formAction] = useFormState(createEntryAction, initialState);
  const [alreadySettled, setAlreadySettled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const filteredSubcategories = subcategories.filter((s) => s.category_id === selectedCategory);
  const label = type === "despesa" ? "conta a pagar" : "conta a receber";
  const actionLabel = type === "despesa" ? "pagamento" : "recebimento";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="e-description">Descrição</Label>
          <Input id="e-description" name="description" required placeholder={`Ex.: ${type === "despesa" ? "Conta de energia — julho" : "Aluguel espaço 2 — julho"}`} />
        </div>

        <div>
          <Label htmlFor="e-amount">Valor</Label>
          <Input id="e-amount" name="original_amount" type="number" step="0.01" min="0.01" required />
        </div>
        <div>
          <Label htmlFor="e-due-date">Data de vencimento</Label>
          <Input id="e-due-date" name="due_date" type="date" defaultValue={today} required />
        </div>

        <div>
          <Label htmlFor="e-category">Categoria</Label>
          <Select
            id="e-category"
            name="category_id"
            required
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="e-subcategory">Subcategoria (opcional)</Label>
          <Select id="e-subcategory" name="subcategory_id" defaultValue="" disabled={filteredSubcategories.length === 0}>
            <option value="">Nenhuma</option>
            {filteredSubcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="e-counterparty">Contraparte (opcional)</Label>
          <Select id="e-counterparty" name="counterparty_id" defaultValue="">
            <option value="">Nenhuma</option>
            {counterparties.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="e-cost-center">Centro de custo (opcional)</Label>
          <Select id="e-cost-center" name="cost_center_id" defaultValue="">
            <option value="">Nenhum</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="e-document">Nº do documento (opcional)</Label>
          <Input id="e-document" name="document_number" />
        </div>
        <div>
          <Label htmlFor="e-competence">Data de competência (opcional)</Label>
          <Input id="e-competence" name="competence_date" type="date" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="e-notes">Observações (opcional)</Label>
          <Input id="e-notes" name="notes" />
        </div>
      </div>

      <div className="rounded-card border border-base-border bg-base-bg p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <Checkbox
            name="already_settled"
            checked={alreadySettled}
            onChange={(e) => setAlreadySettled(e.target.checked)}
          />
          Este lançamento já foi {type === "despesa" ? "pago" : "recebido"}
        </label>

        {alreadySettled && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="e-settlement-date">Data do {actionLabel}</Label>
              <Input id="e-settlement-date" name="settlement_date" type="date" defaultValue={today} />
            </div>
            <div>
              <Label htmlFor="e-settlement-account">Conta bancária</Label>
              <Select id="e-settlement-account" name="settlement_bank_account_id" defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="e-payment-method">Forma de pagamento (opcional)</Label>
              <Select id="e-payment-method" name="payment_method_id" defaultValue="">
                <option value="">Nenhuma</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {!alreadySettled && (
          <div className="mt-3">
            <Label htmlFor="e-bank-account">Conta bancária prevista (opcional)</Label>
            <Select id="e-bank-account" name="bank_account_id" defaultValue="">
              <option value="">Ainda não definida</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton label={`Salvar ${label}`} />
    </form>
  );
}
