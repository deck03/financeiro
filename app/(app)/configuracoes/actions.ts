"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { organizationSettingsSchema } from "@/lib/validation/organization";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export type UpdateOrgSettingsState = {
  error?: string;
  success?: boolean;
};

export async function updateOrganizationSettingsAction(
  _prevState: UpdateOrgSettingsState,
  formData: FormData
): Promise<UpdateOrgSettingsState> {
  try {
    // Defesa em profundidade: além da política de RLS, checamos a permissão
    // explicitamente antes de qualquer escrita.
    await requirePermission("alterar_configuracoes");
  } catch {
    return { error: "Você não tem permissão para alterar as configurações." };
  }

  const parsed = organizationSettingsSchema.safeParse({
    display_name: formData.get("display_name"),
    document_number: formData.get("document_number"),
    address: formData.get("address"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user!.id)
    .single();

  const { error } = await supabase
    .from("organization_settings")
    .update({
      display_name: parsed.data.display_name,
      document_number: parsed.data.document_number || null,
      address: parsed.data.address || null,
      updated_by: user!.id,
    })
    .eq("organization_id", profile!.organization_id);

  if (error) {
    return { error: "Não foi possível salvar as configurações. Tente novamente." };
  }

  await logAudit({
    action: "editar",
    entity: "organization_settings",
    newValue: {
      nome: parsed.data.display_name,
      documento: parsed.data.document_number || null,
    },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}
