import Link from "next/link";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Fluxo de caixa realizado", href: "/fluxo-de-caixa/realizado" },
  { label: "Fluxo de caixa projetado", href: "/fluxo-de-caixa/projetado", disabled: true },
  { label: "Contas a pagar", href: "/contas-a-pagar" },
  { label: "Contas a receber", href: "/contas-a-receber" },
  { label: "Transferências", href: "/transferencias" },
  { label: "DRE gerencial", href: "/dre", disabled: true },
];

const NAV_CADASTROS: NavItem[] = [
  { label: "Plano de contas", href: "/cadastros/plano-de-contas" },
  { label: "Centros de custo", href: "/cadastros/centros-de-custo" },
  { label: "Contas bancárias", href: "/cadastros/contas-bancarias" },
  { label: "Contrapartes", href: "/cadastros/contrapartes" },
  { label: "Formas de pagamento", href: "/cadastros/formas-pagamento" },
];

const NAV_ADMIN: NavItem[] = [
  { label: "Usuários e permissões", href: "/usuarios", disabled: true },
  { label: "Configurações", href: "/configuracoes" },
];

function Section({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-white/40">
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) =>
          item.disabled ? (
            <span
              key={item.href}
              className="flex cursor-not-allowed items-center rounded-card px-3 py-2 text-sm text-white/30"
              title="Disponível em uma fase futura"
            >
              {item.label}
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-card px-3 py-2 text-sm text-white/80 transition-colors",
                "hover:bg-brand-sidebarSoft hover:text-white"
              )}
            >
              {item.label}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col bg-brand-sidebar px-3 py-6">
      <div className="mb-8 flex items-center gap-2 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-card bg-brand-accent text-sm font-semibold text-white">
          D3
        </div>
        <div>
          <p className="text-sm font-semibold text-white">DECK 03</p>
          <p className="text-xs text-white/50">Financeiro</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Visão geral" items={NAV_ITEMS} />
        <Section title="Cadastros" items={NAV_CADASTROS} />
        <Section title="Administração" items={NAV_ADMIN} />
      </div>
    </aside>
  );
}
