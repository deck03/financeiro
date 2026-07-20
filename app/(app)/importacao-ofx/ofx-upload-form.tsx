"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseOfx } from "@/lib/ofx/parse";
import { previewOfxImportAction, confirmOfxImportAction, type PreviewedTransaction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function OfxUploadForm({ bankAccounts }: { bankAccounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [bankAccountId, setBankAccountId] = useState("");
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [preview, setPreview] = useState<PreviewedTransaction[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ importedCount: number; duplicateCount: number } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file || !bankAccountId) {
      if (!bankAccountId) setError("Selecione a conta bancária antes de escolher o arquivo.");
      return;
    }

    setLoading(true);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseOfx(text);
    setParseErrors(parsed.errors);

    if (parsed.transactions.length === 0) {
      setError("Nenhuma transação válida encontrada no arquivo.");
      setLoading(false);
      return;
    }

    const previewResult = await previewOfxImportAction(bankAccountId, parsed.transactions);
    setLoading(false);

    if (previewResult.error || !previewResult.transactions) {
      setError(previewResult.error ?? "Não foi possível pré-visualizar o arquivo.");
      return;
    }

    setPreview(previewResult.transactions);
    setSelected(new Set(previewResult.transactions.map((t, i) => (t.isDuplicate ? -1 : i)).filter((i) => i >= 0)));
    setStep("preview");
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const chosen = preview.filter((_, i) => selected.has(i));
    const confirmResult = await confirmOfxImportAction(bankAccountId, fileName, chosen);
    setLoading(false);

    if (confirmResult.error) {
      setError(confirmResult.error);
      return;
    }

    setResult({ importedCount: confirmResult.importedCount ?? 0, duplicateCount: confirmResult.duplicateCount ?? 0 });
    setStep("done");
  }

  if (step === "done" && result) {
    return (
      <div className="space-y-4">
        <p className="rounded-card bg-signal-positiveSoft px-3 py-2 text-sm text-signal-positive">
          Importação concluída: {result.importedCount} transação(ões) importada(s)
          {result.duplicateCount > 0 ? `, ${result.duplicateCount} já existente(s) ignorada(s)` : ""}.
        </p>
        <Button onClick={() => router.push(`/conciliacao?account=${bankAccountId}`)}>Ir para conciliação</Button>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        {parseErrors.length > 0 && (
          <p className="rounded-card bg-signal-warningSoft px-3 py-2 text-xs text-signal-warning">
            {parseErrors.length} transação(ões) do arquivo não puderam ser lidas e foram ignoradas.
          </p>
        )}

        <p className="text-sm text-ink-soft">
          {preview.length} transação(ões) encontrada(s). Desmarque o que não deseja importar —
          duplicadas já vêm desmarcadas.
        </p>

        <div className="max-h-96 overflow-y-auto rounded-card border border-base-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-base-surface">
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pl-3 pr-2 font-medium"></th>
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Descrição</th>
                <th className="py-2 pr-4 font-medium num">Valor</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((t, i) => (
                <tr key={i} className="border-b border-base-border last:border-0">
                  <td className="py-2 pl-3 pr-2">
                    <Checkbox checked={selected.has(i)} onChange={() => toggle(i)} disabled={t.isDuplicate} />
                  </td>
                  <td className="py-2 pr-4 text-ink-soft">{formatDate(t.date)}</td>
                  <td className="py-2 pr-4 text-ink">{t.description}</td>
                  <td className={`num py-2 pr-4 ${t.amount >= 0 ? "text-signal-positive" : "text-signal-negative"}`}>
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="py-2 pr-4">
                    {t.isDuplicate ? (
                      <span className="rounded-full bg-base-bg px-2 py-0.5 text-xs text-ink-faint">Já importada</span>
                    ) : (
                      <span className="rounded-full bg-signal-positiveSoft px-2 py-0.5 text-xs text-signal-positive">Nova</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">{error}</p>
        )}

        <div className="flex gap-2">
          <Button onClick={handleConfirm} disabled={loading || selected.size === 0}>
            {loading ? "Importando..." : `Confirmar importação (${selected.size})`}
          </Button>
          <Button variant="ghost" onClick={() => setStep("upload")}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="ofx-account">Conta bancária</Label>
        <Select id="ofx-account" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
          <option value="">Selecione</option>
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="ofx-file">Arquivo OFX</Label>
        <input
          id="ofx-file"
          type="file"
          accept=".ofx,.qfx"
          onChange={handleFile}
          disabled={loading || !bankAccountId}
          className="block text-sm text-ink-soft file:mr-3 file:rounded-card file:border-0 file:bg-brand-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#255C4E]"
        />
        {loading && <p className="mt-2 text-sm text-ink-soft">Lendo arquivo...</p>}
      </div>

      {error && <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">{error}</p>}
    </div>
  );
}
