import "server-only";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";
import { ResendEmailProvider } from "./resend";
import { SmtpEmailProvider } from "./smtp";

/**
 * Provedor de e-mail usado pelo sistema. A escolha entre SMTP e Resend é
 * automática, com base em quais variáveis de ambiente estão configuradas —
 * dá para usar qualquer um dos dois, ou trocar depois, sem alterar nenhuma
 * regra de negócio (relatórios, recibos).
 *
 * - Se SMTP_HOST estiver definido, usa SMTP (Gmail, Outlook, etc.)
 * - Senão, se RESEND_API_KEY estiver definido, usa Resend
 * - Senão, nenhum e-mail é enviado (erro claro, registrado no histórico)
 */
class NotConfiguredEmailProvider implements EmailProvider {
  async send(_input: SendEmailInput): Promise<SendEmailResult> {
    return {
      success: false,
      error: "Nenhum provedor de e-mail configurado. Configure SMTP_HOST (Gmail/Outlook) ou RESEND_API_KEY.",
    };
  }
}

function selectProvider(): EmailProvider {
  if (process.env.SMTP_HOST) return new SmtpEmailProvider();
  if (process.env.RESEND_API_KEY) return new ResendEmailProvider();
  return new NotConfiguredEmailProvider();
}

export const emailProvider: EmailProvider = selectProvider();
