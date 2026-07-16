import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DECK 03 — Financeiro",
  description: "Controle financeiro gerencial do DECK 03",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
