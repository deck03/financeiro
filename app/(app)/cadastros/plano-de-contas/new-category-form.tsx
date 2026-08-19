"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCategoryAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CATEGORY_TYPE_LABELS,
  MANAGERIAL_NATURE_LABELS,
  DRE_BEHAVIOR_LABELS,
  CASHFLOW_BEHAVIOR_LABELS,
} from "@/lib/labels/plano-de-contas";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar categoria"}
    </Button>
  );
}

export function NewCategoryForm({
  families,
}: {
  families: { id: string; name: string; type: string }[];
}) {
  const [state, formAction] = useFormState(createCategoryAction, initialState);
  const [selectedFamily, setSelectedFamily] = useState(families[0]?.id ?? "");
  const [type, setType] = useState(() => {
    const f = families.find((fam) => fam.id === families[0]?.id);
    return f?.type === "receita" ? "receita" : "despesa";
  });

  if (families.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        Cadastre ao menos uma família ativa antes de criar categorias.
      </p>
    );
  }

  function handleFamilyChange(familyId: string) {
    setSelectedFamily(familyId);
    const family = families.find((f) => f.id === familyId);
    // Sugere o tipo a partir da família escolhida — só como ponto de
    // partida; o tipo da categoria é independente e pode ser mudado.
    if (family?.type === "receita" || family?.type === "despesa") {
      setType(family.type);
    }
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <Label htmlFor="cat-family">Família</Label>
          <Select id="cat-family" name="family_id" value={selectedFamily} onChange={(e) => handleFamilyChange(e.target.value)} required>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cat-type">Tipo</Label>
          <Select id="cat-type" name="type" value={type} onChange={(e) => setType(e.target.value)} required>
            {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cat-name">Nome</Label>
          <Input id="cat-name" name="name" placeholder="Ex.: Agregadores" required />
        </div>
        <div>
          <Label htmlFor="cat-code">Código (opcional)</Label>
          <Input id="cat-code" name="code" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="cat-nature">Natureza gerencial</Label>
          <Select id="cat-nature" name="managerial_nature" defaultValue="operacional" required>
            {Object.entries(MANAGERIAL_NATURE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cat-dre">Comportamento na DRE</Label>
          <Select id="cat-dre" name="dre_behavior" defaultValue="incluir_operacional" required>
            {Object.entries(DRE_BEHAVIOR_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="cat-cashflow">Comportamento no fluxo de caixa</Label>
          <Select id="cat-cashflow" name="cashflow_behavior" defaultValue="operacional" required>
            {Object.entries(CASHFLOW_BEHAVIOR_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
