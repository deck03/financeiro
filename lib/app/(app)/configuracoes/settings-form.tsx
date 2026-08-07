"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateOrganizationSettingsAction, type UpdateOrgSettingsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: UpdateOrgSettingsState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar configurações"}
    </Button>
  );
}

export function SettingsForm({
  defaultValues,
  canEdit,
}: {
  defaultValues: {
    display_name: string | null;
    document_number: string | null;
    address: string | null;
  };
  canEdit: boolean;
}) {
  const [state, formAction] = useFormState(updateOrganizationSettingsAction, initialState);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <Label htmlFor="display_name">Nome de exibição</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaultValues.display_name ?? ""}
          disabled={!canEdit}
          required
        />
      </div>

      <div>
        <Label htmlFor="document_number">CPF ou CNPJ</Label>
        <Input
          id="document_number"
          name="document_number"
          defaultValue={defaultValues.document_number ?? ""}
          disabled={!canEdit}
        />
      </div>

      <div>
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          name="address"
          defaultValue={defaultValues.address ?? ""}
          disabled={!canEdit}
        />
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-card bg-signal-positiveSoft px-3 py-2 text-sm text-signal-positive">
          Configurações salvas.
        </p>
      )}

      {canEdit ? (
        <SubmitButton />
      ) : (
        <p className="text-sm text-ink-faint">
          Apenas o administrador pode alterar estas configurações.
        </p>
      )}
    </form>
  );
}
