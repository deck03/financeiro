"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createSubcategoryAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar subcategoria"}
    </Button>
  );
}

export function NewSubcategoryForm({
  categories,
}: {
  categories: { id: string; name: string; family_name: string }[];
}) {
  const [state, formAction] = useFormState(createSubcategoryAction, initialState);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        Cadastre ao menos uma categoria ativa antes de criar subcategorias.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="sub-category">Categoria</Label>
        <Select id="sub-category" name="category_id" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.family_name} → {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="sub-name">Nome</Label>
        <Input id="sub-name" name="name" placeholder="Ex.: Wellhub" required />
      </div>
      <div>
        <Label htmlFor="sub-code">Código (opcional)</Label>
        <Input id="sub-code" name="code" />
      </div>
      <SubmitButton />
      {state.error && (
        <p className="sm:col-span-4 rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}
    </form>
  );
}
