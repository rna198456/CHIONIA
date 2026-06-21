import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",

  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },

  worker: {
    format: "es",          // workers en formato ES module
  },

  build: {
    target: "esnext",      // soporte completo de async/await y BigInt
  },

  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
