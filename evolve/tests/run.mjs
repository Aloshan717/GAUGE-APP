// Runs every test file; exits non-zero if any fails.
import { spawnSync } from "node:child_process";
const files = ["tests/core.test.mjs", "tests/evolve.test.mjs"];
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [f], { stdio: "inherit" });
  if (r.status !== 0) bad++;
}
process.exit(bad ? 1 : 0);
