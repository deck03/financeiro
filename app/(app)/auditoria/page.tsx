import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/labels/auditoria";
import { AuditFilters } from "./audit-filters";

const PAGE_SIZE = 50;

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/**
 * Tela de auditoria (Fase 12).
 *
 * Lê a tabela audit_logs — a RLS já garante que só quem tem a permissão
 * 'visualizar_logs' enxerga linhas; a checagem abaixo existe para mostrar
 * uma mensagem amigável em vez de uma lista vazia.
 */
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { entity?: string; action?: string; from?: string; to?: string; page?: string };
}) {
  const canView = await hasPermission("visualizar_logs");

  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Auditoria</h1>
        </div>
        <Card>
          <p className="text-sm text-ink-soft">
            Você não tem permissão para visualizar os logs de auditoria. Peça ao administrador a
            permissão &quot;Visualizar logs de auditoria&quot; se precisar deste acesso.
          </p>
        </Card>
      </div>
    );
  }

  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const fromIndex = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, metadata, created_at, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(fromIndex, fromIndex + PAGE_SIZE - 1);

  if (searchParams.entity) query = query.eq("entity", searchParams.entity);
  if (searchParams.action) query = query.eq("action", searchParams.action);
  if (searchParams.from) query = query.gte("created_at", `${searchParams.from}T00:00:00`);
  if (searchParams.to) query = query.lte("created_at", `${searchParams.to}T23:59:59`);

  const { data: logs, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const qs = new URLSearchParams();
    if (searchParams.entity) qs.set("entity", searchParams.entity);
    if (searchParams.action) qs.set("action", searchParams.action);
    if (searchParams.from) qs.set("from", searchParams.from);
    if (searchParams.to) qs.set("to", searchParams.to);
    qs.set("page", String(target));
    return `/auditoria?${qs.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Auditoria</h1>
        <p className="text-sm text-ink-soft">
          Registro de quem fez o quê e quando. Os logs não podem ser editados nem apagados pela
          aplicação.
        </p>
      </div>

      <Card>
        <AuditFilters
          entity={searchParams.entity ?? ""}
          action={searchParams.action ?? ""}
          from={searchParams.from ?? ""}
          to={searchParams.to ?? ""}
        />
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">Data e hora</th>
                <th className="py-2 pr-4 font-medium">Usuário</th>
                <th className="py-2 pr-4 font-medium">Ação</th>
                <th className="py-2 pr-4 font-medium">Entidade</th>
                <th className="py-2 pr-4 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-faint">
                    Nenhum registro de auditoria encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
              {(logs ?? []).map((log: any) => (
                <tr key={log.id} className="border-b border-base-border/60">
                  <td className="num py-2 pr-4 text-ink-soft">{formatDateTime(log.created_at)}</td>
                  <td className="py-2 pr-4 text-ink">
                    {log.profiles?.full_name || log.profiles?.email || "Sistema"}
                  </td>
                  <td className="py-2 pr-4 text-ink">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</td>
                  <td className="py-2 pr-4 text-ink-soft">{AUDIT_ENTITY_LABELS[log.entity] ?? log.entity}</td>
                  <td className="max-w-xs truncate py-2 pr-4 text-xs text-ink-faint" title={log.metadata ? JSON.stringify(log.metadata) : ""}>
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <span>
            {total} registro{total === 1 ? "" : "s"} · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="rounded-card border border-base-border px-3 py-1 hover:bg-base-bg">
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="rounded-card border border-base-border px-3 py-1 hover:bg-base-bg">
                Próxima
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
