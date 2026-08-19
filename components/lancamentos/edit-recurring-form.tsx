"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateRecurringRuleAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FREQUENCY_LABELS } from "@/lib/labels/parcelamento-recorrencia";

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

export function EditRecurringForm({
  rule,
  categories,
  subcategories,
  costCenters,
  bankAccounts,
  counterparties,
  paymentMethods,
  pendingCount,
  onCancel,
}: {
  rule: {
    id: string;
    description: string;
    amount: number;
    frequency: string;
    interval_count: number;
    end_date: string | null;
    max_occurrences: number | null;
    adjust_business_day: boolean;
    competence_anchor_date: string | null;
    category_id: string;
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
  pendingCount: number;
  onCancel: () => void;
}) {
  const [state, formAction] = useFormState(updateRecurringRuleAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-card border border-base-border bg-base-bg p-4">
      <input type="hidden" name="rule_id" value={rule.id} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor={`er-desc-${rule.id}`}>Descrição</Label>
          <Input id={`er-desc-${rule.id}`} name="description" defaultValue={rule.description} required />
        </div>
        <div>
          <Label htmlFor={`er-amount-${rule.id}`}>Valor de cada ocorrência</Label>
          <Input id={`er-amount-${rule.id}`} name="amount" type="number" step="0.01" min="0.01" defaultValue={rule.amount} required />
        </div>
        <div>
          <Label htmlFor={`er-freq-${rule.id}`}>Frequência</Label>
          <Select id={`er-freq-${rule.id}`} name="frequency" defaultValue={rule.frequency} required>
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`er-end-${rule.id}`}>Data final (opcional)</Label>
          <Input id={`er-end-${rule.id}`} name="end_date" type="date" defaultValue={rule.end_date ?? ""} />
        </div>
        <div>
          <Label htmlFor={`er-comp-${rule.id}`}>Data de competência do 1º lançamento (opcional)</Label>
          <Input
            id={`er-comp-${rule.id}`}
            name="competence_anchor_date"
            type="date"
            defaultValue={rule.competence_anchor_date ?? ""}
          />
        </div>
        <div>
          <Label htmlFor={`er-max-${rule.id}`}>Quantidade de ocorrências (opcional)</Label>
          <Input id={`er-max-${rule.id}`} name="max_occurrences" type="number" min="1" step="1" defaultValue={rule.max_occurrences ?? ""} />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <Checkbox name="adjust_business_day" defaultChecked={rule.adjust_business_day} />
            Ajustar para dia útil quando cair em fim de semana
          </label>
        </div>

        <div>
          <Label htmlFor={`er-category-${rule.id}`}>Categoria</Label>
          <Select id={`er-category-${rule.id}`} name="category_id" defaultValue={rule.category_id} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`er-subcategory-${rule.id}`}>Subcategoria (opcional)</Label>
          <Select id={`er-subcategory-${rule.id}`} name="subcategory_id" defaultValue={rule.subcategory_id ?? ""}>
            <option value="">Nenhuma</option>
            {subcategories
              .filter((s) => s.category_id === rule.category_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`er-counterparty-${rule.id}`}>Contraparte (opcional)</Label>
          <Select id={`er-counterparty-${rule.id}`} name="counterparty_id" defaultValue={rule.counterparty_id ?? ""}>
            <option value="">Nenhuma</option>
            {counterparties.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`er-cost-center-${rule.id}`}>Centro de custo (opcional)</Label>
          <Select id={`er-cost-center-${rule.id}`} name="cost_center_id" defaultValue={rule.cost_center_id ?? ""}>
            <option value="">Nenhum</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`er-bank-${rule.id}`}>Conta bancária prevista (opcional)</Label>
          <Select id={`er-bank-${rule.id}`} name="bank_account_id" defaultValue={rule.bank_account_id ?? ""}>
            <option value="">Ainda não definida</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`er-payment-${rule.id}`}>Forma de pagamento prevista (opcional)</Label>
          <Select id={`er-payment-${rule.id}`} name="payment_method_id" defaultValue={rule.payment_method_id ?? ""}>
            <option value="">Nenhuma</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {pendingCount > 0 && (
        <label className="flex items-start gap-2 rounded-card bg-brand-accentSoft px-3 py-2 text-sm text-ink">
          <Checkbox name="apply_to_pending" defaultChecked />
          <span>
            Aplicar esta alteração também às {pendingCount} ocorrência{pendingCount === 1 ? "" : "s"} já geradas e
            ainda em aberto (nunca em ocorrências já pagas/recebidas ou canceladas).
          </span>
        </label>
      )}

      <p className="text-xs text-ink-faint">
        A data inicial não pode ser alterada depois de criada — se precisar mudar o dia do mês em
        que a recorrência cai, cancele esta e crie uma nova.
      </p>

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
