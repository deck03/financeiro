"use client";

import { useTransition } from "react";

export function ToggleStatusButton({
  action,
  activeLabel = "Inativar",
  inactiveLabel = "Ativar",
  isActive,
}: {
  action: () => Promise<void>;
  activeLabel?: string;
  inactiveLabel?: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => action())}
      className="text-sm font-medium text-brand-accent hover:underline disabled:opacity-50"
    >
      {isPending ? "..." : isActive ? activeLabel : inactiveLabel}
    </button>
  );
}
