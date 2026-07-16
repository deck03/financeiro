"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Attachment = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export function AttachmentsPanel({
  entryId,
  organizationId,
  attachments,
  canUpload,
}: {
  entryId: string;
  organizationId: string;
  attachments: Attachment[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("Arquivo maior que 10 MB. Escolha um arquivo menor.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipo de arquivo não permitido. Envie PDF, PNG, JPG ou WEBP.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const path = `${organizationId}/${entryId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("attachments").upload(path, file);
    if (uploadError) {
      setError("Não foi possível enviar o arquivo.");
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("attachments").insert({
      organization_id: organizationId,
      entry_id: entryId,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });

    setUploading(false);
    if (insertError) {
      setError("Arquivo enviado, mas não foi possível registrá-lo. Tente novamente.");
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    startTransition(() => router.refresh());
  }

  async function handleDownload(filePath: string, fileName: string) {
    const supabase = createClient();
    const { data, error: signError } = await supabase.storage
      .from("attachments")
      .createSignedUrl(filePath, 60);
    if (signError || !data) {
      setError("Não foi possível gerar o link de download.");
      return;
    }
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = fileName;
    link.target = "_blank";
    link.click();
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 && <p className="text-sm text-ink-faint">Nenhum anexo.</p>}

      {attachments.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between rounded-card border border-base-border px-3 py-2 text-sm"
        >
          <div>
            <p className="text-ink">{a.file_name}</p>
            <p className="text-xs text-ink-faint">{formatSize(a.file_size)}</p>
          </div>
          <button
            type="button"
            onClick={() => handleDownload(a.file_path, a.file_name)}
            className="text-sm font-medium text-brand-accent hover:underline"
          >
            Baixar
          </button>
        </div>
      ))}

      {canUpload && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            className="hidden"
            id="attachment-input"
          />
          <label htmlFor="attachment-input">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading || isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Enviando..." : "Anexar arquivo"}
            </Button>
          </label>
          <p className="mt-1 text-xs text-ink-faint">PDF, PNG, JPG ou WEBP, até 10 MB.</p>
        </div>
      )}

      {error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {error}
        </p>
      )}
    </div>
  );
}
