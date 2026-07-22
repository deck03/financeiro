"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setUserPermissionAction, toggleUserActiveAction } from "./actions";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role_key: string;
  is_active: boolean;
};

type PermissionRow = { key: string; name: string; category: string };
type OverrideRow = { user_id: string; permission_key: string; is_granted: boolean };

const CATEGORY_LABELS: Record<string, string> = {
  visualizacao: "Visualização",
  lancamentos: "Lançamentos",
  conciliacao: "Conciliação",
  cadastros: "Cadastros",
  recibos: "Recibos",
  relatorios: "Relatórios",
  auditoria: "Auditoria",
  administracao: "Administração",
};

export function UserPermissionsPanel({
  users,
  permissions,
  operatorDefaults,
  overrides,
}: {
  users: UserRow[];
  permissions: PermissionRow[];
  operatorDefaults: string[];
  overrides: OverrideRow[];
}) {
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaults = new Set(operatorDefaults);
  const overrideMap = new Map(overrides.map((o) => [`${o.user_id}:${o.permission_key}`, o.is_granted]));

  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  function effectiveState(userId: string, permissionKey: string): "padrao" | "conceder" | "revogar" {
    const override = overrideMap.get(`${userId}:${permissionKey}`);
    if (override === true) return "conceder";
    if (override === false) return "revogar";
    return "padrao";
  }

  function handleChange(userId: string, permissionKey: string, mode: "conceder" | "revogar" | "padrao") {
    setFeedback(null);
    startTransition(async () => {
      const result = await setUserPermissionAction(userId, permissionKey, mode);
      if (result.error) setFeedback(result.error);
    });
  }

  function handleToggleActive(userId: string, activate: boolean) {
    setFeedback(null);
    startTransition(async () => {
      const result = await toggleUserActiveAction(userId, activate);
      if (result.error) setFeedback(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="rounded-card border border-signal-negative/40 bg-signal-negative/10 px-4 py-2 text-sm text-signal-negative">
          {feedback}
        </div>
      )}

      {users.length === 0 && (
        <Card>
          <p className="text-sm text-ink-faint">Nenhum usuário encontrado.</p>
        </Card>
      )}

      {users.map((user) => {
        const isAdmin = user.role_key === "admin";
        const isOpen = openUserId === user.id;
        return (
          <Card key={user.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">
                  {user.full_name}{" "}
                  {!user.is_active && (
                    <span className="ml-1 rounded-card bg-base-bg px-2 py-0.5 text-xs text-ink-faint">Inativo</span>
                  )}
                </p>
                <p className="text-sm text-ink-soft">
                  {user.email} · {isAdmin ? "Administrador" : "Operador"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isAdmin && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleToggleActive(user.id, !user.is_active)}
                  >
                    {user.is_active ? "Desativar" : "Reativar"}
                  </Button>
                )}
                {!isAdmin && (
                  <Button type="button" variant="secondary" onClick={() => setOpenUserId(isOpen ? null : user.id)}>
                    {isOpen ? "Fechar permissões" : "Ajustar permissões"}
                  </Button>
                )}
              </div>
            </div>

            {isAdmin && (
              <p className="mt-2 text-sm text-ink-faint">
                Administradores têm todas as permissões automaticamente — não há ajustes individuais.
              </p>
            )}

            {isOpen && !isAdmin && (
              <div className="mt-4 space-y-5 border-t border-base-border pt-4">
                <p className="text-xs text-ink-faint">
                  &quot;Padrão do papel&quot; segue o que o papel Operador concede
                  {" "}(marcado com ✓ quando o padrão inclui a permissão). &quot;Conceder&quot; e
                  &quot;Revogar&quot; criam um ajuste individual só para este usuário.
                </p>
                {categories.map((category) => (
                  <div key={category}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {CATEGORY_LABELS[category] ?? category}
                    </p>
                    <div className="space-y-1">
                      {permissions
                        .filter((p) => p.category === category)
                        .map((permission) => {
                          const state = effectiveState(user.id, permission.key);
                          const byDefault = defaults.has(permission.key);
                          const effective = state === "conceder" || (state === "padrao" && byDefault);
                          return (
                            <div
                              key={permission.key}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-card px-2 py-1.5 hover:bg-base-bg"
                            >
                              <span className="text-sm text-ink">
                                {permission.name}
                                {byDefault && <span className="ml-1 text-xs text-ink-faint">✓ padrão</span>}
                                <span
                                  className={`ml-2 rounded-card px-2 py-0.5 text-xs ${
                                    effective
                                      ? "bg-signal-positive/10 text-signal-positive"
                                      : "bg-base-bg text-ink-faint"
                                  }`}
                                >
                                  {effective ? "Tem acesso" : "Sem acesso"}
                                </span>
                              </span>
                              <select
                                className="rounded-card border border-base-border bg-base-surface px-2 py-1 text-xs text-ink"
                                value={state}
                                disabled={isPending}
                                onChange={(e) =>
                                  handleChange(user.id, permission.key, e.target.value as "conceder" | "revogar" | "padrao")
                                }
                              >
                                <option value="padrao">Padrão do papel</option>
                                <option value="conceder">Conceder</option>
                                <option value="revogar">Revogar</option>
                              </select>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
