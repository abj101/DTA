/**
 * Vercel + Next.js 16 monorepo: Git Integration finalization lstats
 * `/vercel/path0/.next/routes-manifest-deterministic.json` at the repository root
 * even when the app builds in `dta-app/`. Next only emits `routes-manifest.json`.
 * See also `vercel-prebuild.mjs` for `node_modules/next` at repo root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(appRoot, ".next");
const routesManifest = path.join(nextDir, "routes-manifest.json");

function writeDeterministicManifest(targetNextDir) {
  const source = path.join(targetNextDir, "routes-manifest.json");
  const dest = path.join(targetNextDir, "routes-manifest-deterministic.json");
  if (!fs.existsSync(source)) return false;

  const data = JSON.parse(fs.readFileSync(source, "utf8"));
  data.headers = [];
  delete data.deploymentId;
  fs.writeFileSync(dest, JSON.stringify(data));
  return true;
}

function mirrorNextToRepoRoot() {
  const repoRoot = path.resolve(appRoot, "..");
  if (repoRoot === appRoot) return;
  if (!fs.existsSync(path.join(repoRoot, "dta-app", "package.json"))) return;
  if (path.resolve(repoRoot, "dta-app") !== appRoot) return;
  if (!fs.existsSync(nextDir)) return;

  const rootNext = path.join(repoRoot, ".next");
  if (fs.existsSync(rootNext)) {
    fs.rmSync(rootNext, { recursive: true, force: true });
  }
  fs.cpSync(nextDir, rootNext, { recursive: true });
  console.log("[vercel-postbuild] Copied .next to repository root for Vercel");
}

if (!fs.existsSync(routesManifest)) {
  console.warn(
    "[vercel-postbuild] routes-manifest.json missing; skipping deterministic manifest",
  );
  process.exit(0);
}

if (!writeDeterministicManifest(nextDir)) {
  console.warn("[vercel-postbuild] Could not write routes-manifest-deterministic.json");
  process.exit(1);
}
console.log("[vercel-postbuild] Wrote routes-manifest-deterministic.json");

if (process.env.VERCEL === "1") {
  mirrorNextToRepoRoot();
  const repoRoot = path.resolve(appRoot, "..");
  const rootNext = path.join(repoRoot, ".next");
  if (fs.existsSync(rootNext)) {
    writeDeterministicManifest(rootNext);
  }
}
