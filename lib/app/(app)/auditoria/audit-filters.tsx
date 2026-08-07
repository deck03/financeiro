"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/labels/auditoria";

export function AuditFilters({
  entity,
  action,
  from,
  to,
}: {
  entity: string;
  action: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [localEntity, setLocalEntity] = useState(entity);
  const [localAction, setLocalAction] = useState(action);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (localEntity) params.set("entity", localEntity);
    if (localAction) params.set("action", localAction);
    if (localFrom) params.set("from", localFrom);
    if (localTo) params.set("to", localTo);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clear() {
    setLocalEntity("");
    setLocalAction("");
    setLocalFrom("");
    setLocalTo("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <div className="w-56">
        <label className="mb-1 block text-xs font-medium text-ink-soft">Entidade</label>
        <Select value={localEntity} onChange={(e) => setLocalEntity(e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(AUDIT_ENTITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-56">
        <label className="mb-1 block text-xs font-medium text-ink-soft">Ação</label>
        <Select value={localAction} onChange={(e) => setLocalAction(e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">De</label>
        <Input type="date" value={localFrom} onChange={(e) => setLocalFrom(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">Até</label>
        <Input type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        Filtrar
      </Button>
      <Button type="button" variant="ghost" onClick={clear} disabled={isPending}>
        Limpar
      </Button>
    </form>
  );
}
