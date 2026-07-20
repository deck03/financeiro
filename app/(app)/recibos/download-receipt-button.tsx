"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DownloadReceiptButton({ filePath, fileName }: { filePath: string; fileName: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: signError } = await supabase.storage.from("receipts").createSignedUrl(filePath, 60);
    setLoading(false);

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
    <div>
      <Button onClick={handleDownload} disabled={loading}>
        {loading ? "Gerando link..." : "Baixar PDF"}
      </Button>
      {error && <p className="mt-2 text-sm text-signal-negative">{error}</p>}
    </div>
  );
}
