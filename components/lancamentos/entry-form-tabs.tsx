"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { EntryForm } from "./entry-form";
import { InstallmentForm } from "./installment-form";
import { RecurringForm } from "./recurring-form";

type Option = { id: string; name: string };

type Props = {
  type: "receita" | "despesa";
  categories: Option[];
  subcategories: (Option & { category_id: string })[];
  costCenters: Option[];
  bankAccounts: (Option & { ownership: string })[];
  counterparties: Option[];
  paymentMethods: Option[];
};

const TABS = [
  { key: "unico", label: "Lançamento único" },
  { key: "parcelado", label: "Parcelado" },
  { key: "recorrente", label: "Recorrente" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function EntryFormTabs(props: Props) {
  const [tab, setTab] = useState<TabKey>("unico");

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-base-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-brand-accent text-brand-accent"
                : "border-transparent text-ink-soft hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "unico" && <EntryForm {...props} />}
      {tab === "parcelado" && <InstallmentForm {...props} />}
      {tab === "recorrente" && <RecurringForm {...props} />}
    </div>
  );
}
