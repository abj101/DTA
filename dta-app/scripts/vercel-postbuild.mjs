/**
 * Vercel + Next.js 16: post-build finalization may lstat
 * `/vercel/path0/.next/routes-manifest-deterministic.json` at the repo root even when
 * the app lives in a subdirectory. Next only writes `routes-manifest.json` locally;
 * this script writes the deterministic variant and mirrors `.next` to the repo root
 * when the app is not the repository root.
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

function writeDeterministicManifest() {
  if (!fs.existsSync(routesManifest)) {
    console.warn(
      "[vercel-postbuild] routes-manifest.json missing; skipping deterministic manifest",
    );
    return;
  }

  const data = JSON.parse(fs.readFileSync(routesManifest, "utf8"));
  data.headers = [];
  delete data.deploymentId;
  fs.writeFileSync(deterministicManifest, JSON.stringify(data));
  console.log("[vercel-postbuild] Wrote routes-manifest-deterministic.json");
}

function mirrorNextToRepoRoot() {
  const repoRoot = path.resolve(appRoot, "..");
  if (repoRoot === appRoot) return;
  if (process.env.VERCEL !== "1") return;
  if (!fs.existsSync(path.join(repoRoot, "dta-app", "package.json"))) return;
  if (path.resolve(repoRoot, "dta-app") !== appRoot) return;

  const rootNext = path.join(repoRoot, ".next");
  if (fs.existsSync(rootNext)) {
    fs.rmSync(rootNext, { recursive: true, force: true });
  }

  const linkType = process.platform === "win32" ? "junction" : "dir";
  try {
    fs.symlinkSync(nextDir, rootNext, linkType);
  } catch {
    fs.cpSync(nextDir, rootNext, { recursive: true });
  }
  console.log("[vercel-postbuild] Mirrored .next to repository root for Vercel");
}

writeDeterministicManifest();
mirrorNextToRepoRoot();
