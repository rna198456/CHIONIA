import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // ── GitHub Pages base path ──────────────────────────────────────────────────
  // Si desplegás en https://usuario.github.io/chion-bot/ → base: "/chion-bot/"
  // Si desplegás en https://usuario.github.io/            → base: "/"
  // "./" funciona en ambos casos con rutas relativas
  base: "./",

  // ── Excluir web-llm del pre-bundling de Vite ───────────────────────────────
  // El paquete usa workers y WebAssembly; Vite no debe intentar bundlearlo
  optimizeDeps: {
    exclude: ["@mlc-ai/web-llm"],
  },

  // ── Headers para desarrollo local (equivale al coi-serviceworker en prod) ──
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
