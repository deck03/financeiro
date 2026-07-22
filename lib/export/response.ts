import { NextResponse } from "next/server";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const CSV_MIME = "text/csv; charset=utf-8";
export const PDF_MIME = "application/pdf";

/** Resposta de download com o cabeçalho Content-Disposition correto. */
export function fileResponse(body: string | Uint8Array, filename: string, contentType: string) {
  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
