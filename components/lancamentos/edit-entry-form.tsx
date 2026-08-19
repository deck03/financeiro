"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateEntryAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const initialState: FormState = {};

type Option = { id: string; name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar alterações"}
    </Button>
  );
}

export function EditEntryForm({
  entry,
  categories,
  subcategories,
  costCenters,
  bankAccounts,
  counterparties,
  paymentMethods,
  onCancel,
}: {
  entry: {
    id: string;
    description: string;
    original_amount: number;
    due_date: string;
    issue_date: string | null;
    competence_date: string | null;
    document_number: string | null;
    notes: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    cost_center_id: string | null;
    bank_account_id: string | null;
    counterparty_id: string | null;
    payment_method_id: string | null;
  };
  categories: Option[];
  subcategories: (Option & { category_id: string })[];
  costCenters: Option[];
  bankAccounts: (Option & { ownership: string })[];
  counterparties: Option[];
  paymentMethods: Option[];
  onCancel: () => void;
}) {
  const [state, formAction] = useFormState(updateEntryAction, initialState);
  const [selectedCategory, setSelectedCategory] = useState(entry.category_id ?? "");

  const filteredSubcategories = subcategories.filter((s) => s.category_id === selectedCategory);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="entry_id" value={entry.id} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ee-description">Descrição</Label>
          <Input id="ee-description" name="description" defaultValue={entry.description} required />
        </div>

        <div>
          <Label htmlFor="ee-amount">Valor</Label>
          <Input id="ee-amount" name="original_amount" type="number" step="0.01" min="0.01" defaultValue={entry.original_amount} required />
        </div>
        <div>
          <Label htmlFor="ee-due-date">Data de vencimento</Label>
          <Input id="ee-due-date" name="due_date" type="date" defaultValue={entry.due_date} required />
        </div>

        <div>
          <Label htmlFor="ee-category">Categoria</Label>
          <Select
            id="ee-category"
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
          <Label htmlFor="ee-subcategory">Subcategoria (opcional)</Label>
          <Select id="ee-subcategory" name="subcategory_id" defaultValue={entry.subcategory_id ?? ""} disabled={filteredSubcategories.length === 0}>
            <option value="">Nenhuma</option>
            {filteredSubcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="ee-counterparty">Contraparte (opcional)</Label>
          <Select id="ee-counterparty" name="counterparty_id" defaultValue={entry.counterparty_id ?? ""}>
            <option value="">Nenhuma</option>
            {counterparties.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ee-cost-center">Centro de custo (opcional)</Label>
          <Select id="ee-cost-center" name="cost_center_id" defaultValue={entry.cost_center_id ?? ""}>
            <option value="">Nenhum</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="ee-bank-account">Conta bancária prevista (opcional)</Label>
          <Select id="ee-bank-account" name="bank_account_id" defaultValue={entry.bank_account_id ?? ""}>
            <option value="">Ainda não definida</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ee-payment-method">Forma de pagamento prevista (opcional)</Label>
          <Select id="ee-payment-method" name="payment_method_id" defaultValue={entry.payment_method_id ?? ""}>
            <option value="">Nenhuma</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="ee-document">Nº do documento (opcional)</Label>
          <Input id="ee-document" name="document_number" defaultValue={entry.document_number ?? ""} />
        </div>
        <div>
          <Label htmlFor="ee-competence">Data de competência (opcional)</Label>
          <Input id="ee-competence" name="competence_date" type="date" defaultValue={entry.competence_date ?? ""} />
        </div>
        <div>
          <Label htmlFor="ee-issue-date">Data de emissão (opcional)</Label>
          <Input id="ee-issue-date" name="issue_date" type="date" defaultValue={entry.issue_date ?? ""} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="ee-notes">Observações (opcional)</Label>
          <Input id="ee-notes" name="notes" defaultValue={entry.notes ?? ""} />
        </div>
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">{state.error}</p>
      )}
      {state.success && <p className="text-sm text-signal-positive">Alterações salvas.</p>}

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={onCancel}>
          Fechar
        </Button>
      </div>
    </form>
  );
}
