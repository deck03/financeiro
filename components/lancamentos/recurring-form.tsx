"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createRecurringRuleAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FREQUENCY_LABELS } from "@/lib/labels/parcelamento-recorrencia";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Criando..." : "Criar recorrência"}
    </Button>
  );
}

type Option = { id: string; name: string };

export function RecurringForm({
  type,
  categories,
  costCenters,
  bankAccounts,
  counterparties,
  paymentMethods,
}: {
  type: "receita" | "despesa";
  categories: Option[];
  costCenters: Option[];
  bankAccounts: (Option & { ownership: string })[];
  counterparties: Option[];
  paymentMethods: Option[];
}) {
  const [state, formAction] = useFormState(createRecurringRuleAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="rr-description">Descrição</Label>
          <Input id="rr-description" name="description" required placeholder="Ex.: Internet — mensalidade" />
        </div>
        <div>
          <Label htmlFor="rr-amount">Valor de cada ocorrência</Label>
          <Input id="rr-amount" name="amount" type="number" step="0.01" min="0.01" required />
        </div>
        <div>
          <Label htmlFor="rr-frequency">Frequência</Label>
          <Select id="rr-frequency" name="frequency" defaultValue="mensal" required>
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="rr-start">Data inicial</Label>
          <Input id="rr-start" name="start_date" type="date" defaultValue={today} required />
        </div>
        <div>
          <Label htmlFor="rr-end">Data final (opcional)</Label>
          <Input id="rr-end" name="end_date" type="date" />
        </div>
        <div>
          <Label htmlFor="rr-competence-anchor">Data de competência do 1º lançamento (opcional)</Label>
          <Input id="rr-competence-anchor" name="competence_anchor_date" type="date" />
        </div>
        <div>
          <Label htmlFor="rr-max">Quantidade de ocorrências (opcional)</Label>
          <Input id="rr-max" name="max_occurrences" type="number" min="1" step="1" />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <Checkbox name="adjust_business_day" />
            Ajustar para dia útil quando cair em fim de semana
          </label>
        </div>

        <div>
          <Label htmlFor="rr-category">Categoria</Label>
          <Select id="rr-category" name="category_id" required defaultValue="">
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
          <Label htmlFor="rr-counterparty">Contraparte (opcional)</Label>
          <Select id="rr-counterparty" name="counterparty_id" defaultValue="">
            <option value="">Nenhuma</option>
            {counterparties.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="rr-cost-center">Centro de custo (opcional)</Label>
          <Select id="rr-cost-center" name="cost_center_id" defaultValue="">
            <option value="">Nenhum</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="rr-bank-account">Conta bancária prevista (opcional)</Label>
          <Select id="rr-bank-account" name="bank_account_id" defaultValue="">
            <option value="">Ainda não definida</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.ownership === "pessoa_fisica" ? "(pessoal)" : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        As ocorrências dos próximos 12 meses são geradas assim que você cria a recorrência. Mais
        ocorrências são geradas automaticamente conforme o tempo passa — veja a tela de
        Recorrências. Se a competência de cada lançamento deve cair em um dia diferente do
        vencimento (ex.: vencimento no dia 10 do mês seguinte, mas competência no último dia do
        mês de referência), informe a data de competência do primeiro lançamento acima — as
        próximas seguem o mesmo dia do mês, avançando junto com o vencimento. Se deixar em branco,
        a competência de cada lançamento é igual ao seu próprio vencimento.
      </p>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
