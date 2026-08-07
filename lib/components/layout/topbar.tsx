import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
};

export function Topbar({
  fullName,
  roleKey,
}: {
  fullName: string;
  roleKey: string;
}) {
  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-base-border bg-base-surface px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-ink">{fullName}</p>
          <p className="text-xs text-ink-soft">{ROLE_LABEL[roleKey] ?? roleKey}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
