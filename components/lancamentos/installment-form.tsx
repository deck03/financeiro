"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createInstallmentPlanAction, type FormState } from "@/app/(app)/lancamentos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RECOGNITION_STRATEGY_LABELS } from "@/lib/labels/parcelamento-recorrencia";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Criando..." : "Criar parcelamento"}
    </Button>
  );
}

type Option = { id: string; name: string };

export function InstallmentForm({
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
  const [state, formAction] = useFormState(createInstallmentPlanAction, initialState);
  const today = new Date().toISOString().slice(0, 10);
  const [recognitionStrategy, setRecognitionStrategy] = useState("por_parcela");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ip-description">Descrição</Label>
          <Input id="ip-description" name="description" required placeholder="Ex.: Reforma do vestiário" />
        </div>
        <div>
          <Label htmlFor="ip-total">Valor total</Label>
          <Input id="ip-total" name="total_amount" type="number" step="0.01" min="0.01" required />
        </div>
        <div>
          <Label htmlFor="ip-count">Quantidade de parcelas</Label>
          <Input id="ip-count" name="installments_count" type="number" min="2" step="1" defaultValue="2" required />
        </div>
        <div>
          <Label htmlFor="ip-first-due">Primeiro vencimento</Label>
          <Input id="ip-first-due" name="first_due_date" type="date" defaultValue={today} required />
        </div>
        <div>
          <Label htmlFor="ip-recognition">Reconhecimento gerencial</Label>
          <Select
            id="ip-recognition"
            name="recognition_strategy"
            value={recognitionStrategy}
            onChange={(e) => setRecognitionStrategy(e.target.value)}
            required
          >
            {Object.entries(RECOGNITION_STRATEGY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {recognitionStrategy === "competencia_original" && (
          <div>
            <Label htmlFor="ip-competence">Data de competência (única para todas as parcelas)</Label>
            <Input id="ip-competence" name="competence_date" type="date" defaultValue={today} required />
          </div>
        )}

        <div>
          <Label htmlFor="ip-category">Categoria</Label>
          <Select id="ip-category" name="category_id" required defaultValue="">
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
          <Label htmlFor="ip-counterparty">Contraparte (opcional)</Label>
          <Select id="ip-counterparty" name="counterparty_id" defaultValue="">
            <option value="">Nenhuma</option>
            {counterparties.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ip-cost-center">Centro de custo (opcional)</Label>
          <Select id="ip-cost-center" name="cost_center_id" defaultValue="">
            <option value="">Nenhum</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ip-bank-account">Conta bancária prevista (opcional)</Label>
          <Select id="ip-bank-account" name="bank_account_id" defaultValue="">
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
        As parcelas são geradas mensalmente a partir do primeiro vencimento. A última parcela
        absorve eventuais diferenças de arredondamento, para a soma bater exatamente com o valor
        total. Em &quot;Integralmente na competência original&quot;, todas as parcelas usam a
        mesma data de competência informada acima — útil para uma compra única reconhecida de uma
        vez, mesmo paga em várias vezes.
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
