import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Cliente administrativo do Supabase, usando a service role key.
 *
 * REGRAS OBRIGATÓRIAS:
 * - Importado apenas por código que roda exclusivamente no servidor
 *   (Route Handlers, Server Actions específicas, Edge Functions).
 * - O import "server-only" garante que o bundler falhe caso este
 *   arquivo seja importado, mesmo que indiretamente, por código de cliente.
 * - Ignora Row Level Security — use apenas para operações administrativas
 *   explícitas (ex.: criação de usuários), sempre após checagem de permissão.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
