import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Mantém o projeto Supabase (plano gratuito) ativo. O Supabase pausa
 * projetos com pouca atividade de usuário na semana — uma única escrita
 * interna por dia (pg_cron) não foi suficiente. Esta rota faz um ciclo
 * real de consultas pela API (leituras em várias tabelas + uma escrita) e
 * é chamada 3x por dia pelo GitHub Actions (.github/workflows/keepalive.yml).
 *
 * Protegida pelo mesmo CRON_SECRET usado nos outros agendamentos.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Variáveis do Supabase não configuradas." }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const tables = [
    "organizations",
    "profiles",
    "bank_accounts",
    "chart_account_categories",
    "financial_entries",
    "financial_settlements",
    "bank_transactions",
  ];

  const reads: Record<string, number | string> = {};
  let failed = false;

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) {
      reads[table] = `erro: ${error.message}`;
      failed = true;
    } else {
      reads[table] = count ?? 0;
    }
  }

  // Escrita simples + leitura de volta (mesma tabelinha criada antes).
  const now = new Date().toISOString();
  const { error: writeError } = await supabase
    .from("system_keepalive")
    .upsert({ id: true, pinged_at: now }, { onConflict: "id" });
  const { data: readBack, error: readBackError } = await supabase
    .from("system_keepalive")
    .select("pinged_at")
    .eq("id", true)
    .single();

  if (writeError || readBackError) failed = true;

  return NextResponse.json(
    {
      ok: !failed,
      at: now,
      reads,
      write: writeError ? `erro: ${writeError.message}` : "ok",
      readBack: readBackError ? `erro: ${readBackError.message}` : readBack?.pinged_at,
    },
    { status: failed ? 500 : 200 }
  );
}
