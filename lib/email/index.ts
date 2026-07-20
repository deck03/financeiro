import "server-only";
import type { EmailProvider } from "./provider";
import { ResendEmailProvider } from "./resend";

/**
 * Instância única do provedor de e-mail usado pelo sistema. Trocar de
 * provedor no futuro é uma mudança de uma linha aqui — nada mais no
 * sistema referencia Resend diretamente.
 */
export const emailProvider: EmailProvider = new ResendEmailProvider();
