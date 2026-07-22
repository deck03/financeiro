/**
 * Botões de exportação exibidos no topo das telas principais (Fase 12).
 *
 * São links diretos para as rotas /api/export/* — o navegador baixa o
 * arquivo sem sair da página. Usamos <a> comum (não <Link>) porque são
 * downloads, não navegação interna.
 *
 * A tela só renderiza este componente se o usuário tiver a permissão
 * 'exportar_relatorios' (checada no servidor); a rota de exportação
 * revalida a permissão de qualquer forma (defesa em profundidade).
 */

export type ExportOption = {
  label: string;
  href: string;
};

export function ExportButtons({ options }: { options: ExportOption[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <a
          key={option.href}
          href={option.href}
          className="inline-flex items-center rounded-card border border-base-border bg-base-surface px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-base-bg hover:text-ink"
        >
          {option.label}
        </a>
      ))}
    </div>
  );
}
