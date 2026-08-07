"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function PeriodFilter({
  from,
  to,
  includePersonal,
  canSeePersonal,
}: {
  from: string;
  to: string;
  includePersonal: boolean;
  canSeePersonal: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);
  const [personal, setPersonal] = useState(includePersonal);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("from", fromDate);
    params.set("to", toDate);
    if (personal) params.set("personal", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="pf-from">De</Label>
        <Input id="pf-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="pf-to">Até</Label>
        <Input id="pf-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>
      {canSeePersonal && (
        <label className="flex items-center gap-2 pb-2 text-sm text-ink">
          <Checkbox checked={personal} onChange={(e) => setPersonal(e.target.checked)} />
          Incluir contas pessoais
        </label>
      )}
      <Button type="submit" variant="secondary">
        Aplicar
      </Button>
    </form>
  );
}
