import "server-only";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";

/**
 * Implementação via Resend (https://resend.com). Escolhido pela
 * simplicidade da API e plano gratuito — ver decisão na Fase 0.
 *
 * Trocar de provedor no futuro significa apenas criar uma nova classe que
 * implementa EmailProvider e trocar a instância exportada em index.ts —
 * nenhuma regra de negócio (relatórios, recibos) precisa mudar.
 */
export class ResendEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      return {
        success: false,
        error: "Provedor de e-mail não configurado (faltam RESEND_API_KEY ou EMAIL_FROM).",
      };
    }

    if (input.to.length === 0) {
      return { success: false, error: "Nenhum destinatário configurado." };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: input.to,
          subject: input.subject,
          html: input.html,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `Falha ao enviar e-mail (${response.status}): ${body}` };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido ao enviar e-mail." };
    }
  }
}
