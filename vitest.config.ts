import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Nos testes (Node puro, fora do Next.js), o pacote "server-only" não
      // deve bloquear a importação de módulos de servidor — substituímos por
      // um stub vazio. No build do Next.js, a proteção continua valendo.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
