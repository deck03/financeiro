"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { amountInWords } from "@/lib/receipts/amount-in-words";
import { generateReceiptPdf } from "@/lib/receipts/generate-pdf";
import { formatReferencePeriod } from "@/lib/receipts/reference-period";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";

export type FormState = { error?: string };

export async function generateReceiptAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await requirePermission("gerar_recibos");
  } catch {
    return { error: "Você não tem permissão para gerar recibos." };
  }

  const settlementId = formData.get("settlement_id") as string;
  const referencePeriod = (formData.get("reference_period") as string) || null;
  const spaceDescription = (formData.get("space_description") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!settlementId) {
    return { error: "Liquidação não informada." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user!.id).single();
  const organizationId = profile!.organization_id;

  const { data: settlement } = await supabase
    .from("financial_settlements")
    .select(
      "amount, interest, penalty, discount, addition, settlement_date, payment_method_id, entry_id, bank_account_id, financial_entries(due_date, competence_date)"
    )
    .eq("id", settlementId)
    .single();

  if (!settlement) {
    return { error: "Liquidação não encontrada." };
  }

  const entryInfo = settlement.financial_entries as unknown as { due_date: string | null; competence_date: string | null } | null;
  // Se o operador não digitou a referência, preenche automaticamente a
  // partir da competência do lançamento (ex.: "Julho/2026") — só cai para
  // null (campo vazio no recibo) se o lançamento também não tiver competência.
  const effectiveReferencePeriod = referencePeriod || formatReferencePeriod(entryInfo?.competence_date ?? null);

  const principal = Number(settlement.amount) - Number(settlement.interest) - Number(settlement.penalty) - Number(settlement.addition) + Number(settlement.discount);
  const amountWords = amountInWords(principal);

  const { data: receiptId, error: rpcError } = await supabase.rpc("create_rent_receipt", {
    p_settlement_id: settlementId,
    p_amount_in_words: amountWords,
    p_reference_period: effectiveReferencePeriod,
    p_space_description: spaceDescription,
    p_notes: notes,
  });

  if (rpcError || !receiptId) {
    return { error: rpcError?.message.includes("Já existe") ? rpcError.message : "Não foi possível gerar o recibo." };
  }

  // Busca os dados completos para montar o PDF
  const [{ data: receipt }, { data: settings }] = await Promise.all([
    supabase
      .from("rent_receipts")
      .select(
        "receipt_number_formatted, amount, amount_in_words, payment_date, due_date, reference_period, space_description, notes, verification_code, counterparty_id, payment_method_id"
      )
      .eq("id", receiptId)
      .single(),
    supabase.from("organization_settings").select("display_name, document_number, address").eq("organization_id", organizationId).single(),
  ]);

  if (!receipt) {
    return { error: "Recibo criado, mas não foi possível montar o PDF. Contate o suporte." };
  }

  const [{ data: counterparty }, { data: paymentMethod }, { data: bankAccount }] = await Promise.all([
    receipt.counterparty_id
      ? supabase.from("counterparties").select("name, document_number").eq("id", receipt.counterparty_id).single()
      : Promise.resolve({ data: null }),
    receipt.payment_method_id
      ? supabase.from("payment_methods").select("name").eq("id", receipt.payment_method_id).single()
      : Promise.resolve({ data: null }),
    settlement.bank_account_id
      ? supabase
          .from("bank_accounts")
          .select("bank_name, bank_code, agency, account_number, pix_key, holder_name")
          .eq("id", settlement.bank_account_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const pdfBytes = await generateReceiptPdf({
    organizationName: settings?.display_name ?? "DECK 03",
    organizationDocument: settings?.document_number ?? null,
    organizationAddress: settings?.address ?? null,
    receiptNumber: receipt.receipt_number_formatted,
    counterpartyName: counterparty?.name ?? "Locatário",
    counterpartyDocument: counterparty?.document_number ?? null,
    amount: Number(receipt.amount),
    amountInWords: receipt.amount_in_words,
    dueDate: receipt.due_date,
    referencePeriod: receipt.reference_period,
    spaceDescription: receipt.space_description,
    paymentMethodName: paymentMethod?.name ?? null,
    notes: receipt.notes,
    verificationCode: receipt.verification_code,
    bankDetails: bankAccount
      ? {
          bankName: bankAccount.bank_name,
          bankCode: bankAccount.bank_code,
          agency: bankAccount.agency,
          accountNumber: bankAccount.account_number,
          pixKey: bankAccount.pix_key,
          beneficiaryName: bankAccount.holder_name ?? settings?.display_name ?? null,
        }
      : null,
  });

  const filePath = `${organizationId}/${receiptId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return { error: "Recibo criado, mas não foi possível salvar o PDF. Tente baixar novamente na lista de recibos." };
  }

  await supabase.from("rent_receipts").update({ file_path: filePath }).eq("id", receiptId);

  await logAudit({
    action: "gerar",
    entity: "rent_receipts",
    entityId: receiptId,
    newValue: { numero: receipt.receipt_number_formatted, valor: Number(receipt.amount) },
  });

  revalidatePath("/recibos");
  redirect(`/recibos/${receiptId}`);
}
