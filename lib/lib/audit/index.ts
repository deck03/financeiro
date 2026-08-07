import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeAuditValue } from "./sanitize";

/**
 * Registro de auditoria (Fase 12).
 *
 * A tabela audit_logs existe desde a Fase 1; aqui centralizamos a escrita.
 *
 * Princípios:
 * - Auditoria NUNCA quebra a operação principal: qualquer falha ao gravar o
 *   log é registrada no console e engolida. O usuário não pode ficar
 *   impedido de pagar uma conta porque o log falhou.
 * - A escrita usa o cliente autenticado normal (a política de RLS
 *   "audit_logs_insert_authenticated" garante que só se grava na própria
 *   organização). A leitura exige a permissão 'visualizar_logs'.
 * - Valores sensíveis são higienizados por sanitizeAuditValue() antes de
 *   persistir (nada de tokens, senhas ou chaves em log).
 */

export type AuditAction =
  | "criar"
  | "editar"
  | "cancelar"
  | "liquidar"
  | "estornar"
  | "ativar"
  | "desativar"
  | "importar"
  | "conciliar"
  | "desfazer_conciliacao"
  | "ignorar"
  | "reativar"
  | "gerar"
  | "enviar"
  | "exportar"
  | "conceder_permissao"
  | "revogar_permissao"
  | "remover_override";

export type AuditInput = {
  action: AuditAction | string;
  /** nome da entidade (ex.: "financial_entries", "transfers", "exportacao") */
  entity: string;
  entityId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    if (!profile) return;

    const { error } = await supabase.from("audit_logs").insert({
      organization_id: profile.organization_id,
      actor_id: user.id,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      previous_value: sanitizeAuditValue(input.previousValue ?? null) as never,
      new_value: sanitizeAuditValue(input.newValue ?? null) as never,
      metadata: sanitizeAuditValue(input.metadata ?? null) as never,
      origin: "app",
    });

    if (error) {
      console.error("Falha ao gravar audit_log:", error.message);
    }
  } catch (err) {
    console.error("Falha inesperada ao gravar audit_log:", err);
  }
}
