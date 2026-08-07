import "server-only";
import nodemailer from "nodemailer";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./provider";

/**
 * Implementação via SMTP genérico — funciona com Gmail, Outlook, Yahoo ou
 * qualquer provedor que ofereça acesso SMTP com "senha de app".
 *
 * Alternativa ao Resend para quem não quer (ou não pode, por enquanto)
 * verificar um domínio próprio: usa uma conta de e-mail que a pessoa já
 * tem, com uma senha específica gerada para aplicativos (nunca a senha
 * normal da conta).
 */
export class SmtpEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.EMAIL_FROM || user;

    if (!host || !port || !user || !password || !from) {
      return {
        success: false,
        error: "Provedor de e-mail (SMTP) não configurado (faltam SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD ou EMAIL_FROM).",
      };
    }

    if (input.to.length === 0) {
      return { success: false, error: "Nenhum destinatário configurado." };
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465, // 465 = SSL direto; 587 = STARTTLS
        auth: { user, pass: password },
      });

      await transporter.sendMail({
        from,
        to: input.to.join(", "),
        subject: input.subject,
        html: input.html,
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido ao enviar e-mail." };
    }
  }
}
