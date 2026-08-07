"use client";

/**
 * Último recurso do tratamento de erros (Fase 12): captura falhas que
 * acontecem no próprio layout raiz. Precisa renderizar <html> e <body>
 * porque substitui a árvore inteira. Sem dependências de CSS externo —
 * estilos inline garantem que a tela funcione mesmo se o CSS falhar.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F5F6F8" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div
            style={{
              maxWidth: 420,
              background: "#fff",
              border: "1px solid #E3E6EA",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 32, margin: 0 }}>⚠️</p>
            <h1 style={{ fontSize: 18, margin: "12px 0 8px", color: "#1C1E24" }}>Algo deu errado</h1>
            <p style={{ fontSize: 14, color: "#596070", margin: 0 }}>
              O sistema encontrou um erro inesperado. Seus dados não foram perdidos — tente
              recarregar a página.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: "#9AA1AE", marginTop: 8 }}>Código do erro: {error.digest}</p>
            )}
            <button
              onClick={() => reset()}
              style={{
                marginTop: 16,
                background: "#2E6E5E",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
