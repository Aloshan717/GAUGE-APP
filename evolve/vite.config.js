import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// EVOLVE_BASE=/evolve/ when Evolve is served inside Gauge's site (scripts/publish-to-gauge.mjs).
export default defineConfig({
  base: process.env.EVOLVE_BASE || "/",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
});
