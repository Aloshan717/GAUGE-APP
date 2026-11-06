// Serve Evolve inside Gauge's live site, at /evolve/ — no new Vercel project needed.
//
// 1. Builds Evolve with base /evolve/ into gauge-project/public/evolve
//    (Gauge's build copies public/ as-is, so it ships with every Gauge deploy).
// 2. Copies Evolve's serverless functions next to Gauge's (Gauge's /api/scan
//    is already the same reader Evolve uses).
//
// Run after any Evolve change:  npm run publish:gauge   then commit both folders.
import { execSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = fileURLToPath(new URL("../../gauge-project/public/evolve/", import.meta.url));

rmSync(out, { recursive: true, force: true });
execSync(`npx vite build --outDir "${out}" --emptyOutDir`, { stdio: "inherit", cwd: root, env: { ...process.env, EVOLVE_BASE: "/evolve/" } });

for (const f of ["_supabase.js", "burn.js", "invite.js"]) {
  cpSync(new URL(`../api/${f}`, import.meta.url), new URL(`../../gauge-project/api/${f}`, import.meta.url));
}
console.log("Evolve published into gauge-project (served at /evolve/).");
