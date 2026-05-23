/**
 * Vercel + Next.js 16: post-build validation may expect
 * `.next/routes-manifest-deterministic.json`, which Next does not emit.
 * Derive it from `routes-manifest.json` in the app root (requires Root Directory = dta-app).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(appRoot, ".next");
const routesManifest = path.join(nextDir, "routes-manifest.json");
const deterministicManifest = path.join(
  nextDir,
  "routes-manifest-deterministic.json",
);

if (!fs.existsSync(routesManifest)) {
  console.warn(
    "[vercel-postbuild] routes-manifest.json missing; skipping deterministic manifest",
  );
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(routesManifest, "utf8"));
data.headers = [];
delete data.deploymentId;
fs.writeFileSync(deterministicManifest, JSON.stringify(data));
console.log("[vercel-postbuild] Wrote routes-manifest-deterministic.json");
