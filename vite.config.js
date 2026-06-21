import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",

  optimizeDeps: {
    // Transformers.js usa workers y WASM — Vite NO debe pre-bundlearlo
    exclude: ["@huggingface/transformers"],
  },

  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
