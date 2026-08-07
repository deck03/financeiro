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
  // O hash é checado para TODAS as transações, com ou sem FITID — alguns
  // bancos não geram um FITID estável entre exportações (a mesma transação
  // real ganha um FITID diferente a cada arquivo baixado). Checar só por
  // FITID nesse caso deixaria a transação passar como "nova" de novo,
  // duplicando. O hash (conta + data + valor + descrição) funciona como
  // uma segunda checagem, independente do FITID.
  const hashes = withHashes.map((t) => t.hash);

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
    isDuplicate: (!!t.fitid && existingFitids.has(t.fitid)) || existingHashes.has(t.hash),
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
  let skippedByHashCount = 0;
  const insertErrors: string[] = [];

  if (withFitid.length > 0) {
    // Proteção extra antes de inserir: alguns bancos não geram um FITID
    // estável entre exportações (a mesma transação real recebe um FITID
    // diferente em cada arquivo baixado). O índice único do banco só
    // protege por FITID nesse lote — sozinho, ele deixaria passar uma
    // transação "nova" que na verdade é a mesma de antes, com outro FITID.
    // Por isso, checamos o hash (conta + data + valor + descrição) aqui
    // também, e tiramos do lote qualquer uma que já exista por esse
    // critério, mesmo tendo um FITID que nunca apareceu antes.
    const { data: existingByHash } = await supabase
      .from("bank_transactions")
      .select("transaction_hash")
      .eq("bank_account_id", bankAccountId)
      .in(
        "transaction_hash",
        withFitid.map((t) => t.transaction_hash)
      );
    const existingHashSet = new Set((existingByHash ?? []).map((r) => r.transaction_hash));

    const trulyNewWithFitid = withFitid.filter((t) => !existingHashSet.has(t.transaction_hash));
    skippedByHashCount += withFitid.length - trulyNewWithFitid.length;

    if (trulyNewWithFitid.length > 0) {
      const { data, error } = await supabase
        .from("bank_transactions")
        .upsert(trulyNewWithFitid, { onConflict: "bank_account_id,ofx_transaction_id", ignoreDuplicates: true })
        .select("id");
      if (error) insertErrors.push(error.message);
      else importedCount += data?.length ?? 0;
    }
  }

  if (withoutFitid.length > 0) {
    // hash_dedupe_key é uma coluna gerada pelo banco (espelha transaction_hash
    // só quando não há FITID) — não enviamos o campo no insert, o Postgres
    // calcula sozinho, mas o onConflict precisa apontar para ela, não para
    // transaction_hash diretamente (ver migration 0014).
    const { data, error } = await supabase
      .from("bank_transactions")
      .upsert(withoutFitid, { onConflict: "bank_account_id,hash_dedupe_key", ignoreDuplicates: true })
      .select("id");
    if (error) insertErrors.push(error.message);
    else importedCount += data?.length ?? 0;
  }

  if (insertErrors.length > 0) {
    // Nunca finge sucesso quando a gravação falhou — antes deste ajuste,
    // um erro aqui era descartado e a tela mostrava "importação concluída"
    // mesmo sem gravar nenhuma linha.
    await supabase.from("import_errors").insert({
      organization_id: organizationId,
      import_batch_id: batch.id,
      message: insertErrors.join(" | "),
    });
    return {
      error:
        "Não foi possível gravar as transações importadas. O lote foi registrado com o erro para investigação — nada foi perdido, mas nada foi salvo ainda. Avise o suporte.",
    };
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
