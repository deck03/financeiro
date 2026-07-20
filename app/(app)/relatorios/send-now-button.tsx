"use client";

import { useTransition } from "react";
import { sendReportNowAction } from "./actions";
import { Button } from "@/components/ui/button";
import type { ReportType } from "@/lib/reports/send";

export function SendNowButton({ reportType }: { reportType: ReportType }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button variant="secondary" disabled={isPending} onClick={() => startTransition(() => sendReportNowAction(reportType))}>
      {isPending ? "Enviando..." : "Gerar e enviar agora"}
    </Button>
  );
}
