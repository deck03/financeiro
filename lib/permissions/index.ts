import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PermissionKey =
  | "visualizar_dashboard"
  | "visualizar_saldos"
  | "visualizar_contas_empresariais"
  | "visualizar_contas_pessoais"
  | "visualizar_lancamentos"
  | "criar_lancamentos"
  | "editar_lancamentos_em_aberto"
  | "cancelar_lancamentos"
  | "registrar_pagamentos"
  | "registrar_recebimentos"
  | "pagamentos_parciais"
  | "recebimentos_parciais"
  | "criar_transferencias"
  | "importar_ofx"
  | "realizar_conciliacao"
  | "criar_contrapartes"
  | "editar_contrapartes"
  | "gerar_recibos"
  | "anexar_documentos"
  | "exportar_relatorios"
  | "visualizar_logs"
  | "alterar_configuracoes"
  | "alterar_plano_de_contas"
  | "alterar_contas_bancarias";

/**
 * Verifica se o usuário logado possui a permissão informada.
 *
 * IMPORTANTE: esta checagem é uma camada adicional de defesa (defesa em
 * profundidade) para Server Actions e Route Handlers. A garantia real de
 * segurança vem das políticas de Row Level Security no banco — mesmo que
 * esta checagem seja esquecida em algum ponto, o banco ainda impede o
 * acesso indevido.
 */
export async function hasPermission(permissionKey: PermissionKey): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("has_permission", {
    p_permission_key: permissionKey,
  });

  if (error) {
    console.error("Falha ao checar permissão:", error.message);
    return false;
  }

  return Boolean(data);
}

/**
 * Lança erro se o usuário não tiver a permissão. Uso recomendado no início
 * de toda Server Action que altera dados.
 */
export async function requirePermission(permissionKey: PermissionKey): Promise<void> {
  const allowed = await hasPermission(permissionKey);
  if (!allowed) {
    throw new Error(`Acesso negado: permissão "${permissionKey}" é necessária.`);
  }
}

export async function getCurrentProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
