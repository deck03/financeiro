"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { previewOfxSchema, confirmOfxSchema, type ofxTransactionSchema } from "@/lib/validation/ofx";
import { transactionHash } from "@/lib/ofx/hash";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { z } from "zod";

type OfxTransaction = z.infer<typeof ofxTransactionSchema>;

async function getOrgIdAndUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user!.id)
    .single();
  return { supabase, userId: user!.id, organizationId: profile!.organization_id };
}

export type PreviewedTransaction = OfxTransaction & { isDuplicate: boolean; hash: string };

export type PreviewResult = {
  error?: string;
  transactions?: PreviewedTransaction[];
};

// ---------------------------------------------------------------------------
// Pré-visualização (dry-run): não grava nada, só classifica cada transação
// como nova ou duplicada, comparando com o que já existe para essa conta.
// ---------------------------------------------------------------------------
export async function previewOfxImportAction(bankAccountId: string, transactions: OfxTransaction[]): Promise<PreviewResult> {
  try {
    await requirePermission("importar_ofx");
  } catch {
    return { error: "Você não tem permissão para importar arquivos OFX." };
  }

  const parsed = previewOfxSchema.safeParse({ bank_account_id: bankAccountId, transactions });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await getOrgIdAndUser();

  const withHashes = parsed.data.transactions.map((t) => ({
    ...t,
    hash: transactionHash(bankAccountId, t.date, t.amount, t.description),
  }));

  const fitids = withHashes.filter((t) => t.fitid).map((t) => t.fitid as string);
  const hashes = withHashes.filter((t) => !t.fitid).map((t) => t.hash);

  const existingFitids = new Set<string>();
  const existingHashes = new Set<string>();

  if (fitids.length > 0) {
    const { data } = await supabase
      .from("bank_transactions")
      .select("ofx_transaction_id")
      .eq("bank_account_id", bankAccountId)
      .in("ofx_transaction_id", fitids);
    for (const row of data ?? []) if (row.ofx_transaction_id) existingFitids.add(row.ofx_transaction_id);
  }

  if (hashes.length > 0) {
    const { data } = await supabase
      .from("bank_transactions")
      .select("transaction_hash")
      .eq("bank_account_id", bankAccountId)
      .in("transaction_hash", hashes);
    for (const row of data ?? []) existingHashes.add(row.transaction_hash);
  }

  const result: PreviewedTransaction[] = withHashes.map((t) => ({
    ...t,
    isDuplicate: t.fitid ? existingFitids.has(t.fitid) : existingHashes.has(t.hash),
  }));

  return { transactions: result };
}

export type ConfirmResult = {
  error?: string;
  success?: boolean;
  importedCount?: number;
  duplicateCount?: number;
  batchId?: string;
};

// ---------------------------------------------------------------------------
// Confirmação: grava o lote e as transações selecionadas pelo usuário. O
// banco tem a palavra final sobre duplicidade (índices únicos) — mesmo que
// a pré-visualização esteja desatualizada, nada duplica.
// ---------------------------------------------------------------------------
export async function confirmOfxImportAction(
  bankAccountId: string,
  fileName: string,
  transactions: OfxTransaction[]
): Promise<ConfirmResult> {
  try {
    await requirePermission("importar_ofx");
  } catch {
    return { error: "Você não tem permissão para importar arquivos OFX." };
  }

  const parsed = confirmOfxSchema.safeParse({ bank_account_id: bankAccountId, file_name: fileName, transactions });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (parsed.data.transactions.length === 0) {
    return { error: "Nenhuma transação selecionada para importar." };
  }

  const { supabase, userId, organizationId } = await getOrgIdAndUser();

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      organization_id: organizationId,
      bank_account_id: bankAccountId,
      file_name: fileName,
      total_transactions: parsed.data.transactions.length,
      created_by: userId,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { error: "Não foi possível iniciar o lote de importação." };
  }

  const withHashes = parsed.data.transactions.map((t) => ({
    organization_id: organizationId,
    bank_account_id: bankAccountId,
    import_batch_id: batch.id,
    ofx_transaction_id: t.fitid,
    transaction_hash: transactionHash(bankAccountId, t.date, t.amount, t.description),
    transaction_date: t.date,
    amount: t.amount,
    description: t.description,
    created_by: userId,
  }));

  const withFitid = withHashes.filter((t) => t.ofx_transaction_id);
  const withoutFitid = withHashes.filter((t) => !t.ofx_transaction_id);

  let importedCount = 0;

  if (withFitid.length > 0) {
    const { data, error } = await supabase
      .from("bank_transactions")
      .upsert(withFitid, { onConflict: "bank_account_id,ofx_transaction_id", ignoreDuplicates: true })
      .select("id");
    if (!error) importedCount += data?.length ?? 0;
  }

  if (withoutFitid.length > 0) {
    const { data, error } = await supabase
      .from("bank_transactions")
      .upsert(withoutFitid, { onConflict: "bank_account_id,transaction_hash", ignoreDuplicates: true })
      .select("id");
    if (!error) importedCount += data?.length ?? 0;
  }

  const duplicateCount = parsed.data.transactions.length - importedCount;

  await supabase
    .from("import_batches")
    .update({ imported_count: importedCount, duplicate_count: duplicateCount })
    .eq("id", batch.id);

  await logAudit({
    action: "importar",
    entity: "import_batches",
    entityId: batch.id,
    metadata: { arquivo: fileName, importadas: importedCount, duplicadas: duplicateCount },
  });

  revalidatePath("/conciliacao");

  return { success: true, importedCount, duplicateCount, batchId: batch.id };
}
