/**
 * Vercel + Next.js 16 monorepo: Git Integration finalization lstats paths under
 * `/vercel/path0/` (repository root) while install/build run in `dta-app/`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function mirrorToRepoRoot() {
  if (process.env.VERCEL !== "1") return;

  const repoRoot = path.resolve(appRoot, "..");
  if (repoRoot === appRoot) return;
  if (!fs.existsSync(path.join(repoRoot, "dta-app", "package.json"))) return;
  if (path.resolve(repoRoot, "dta-app") !== appRoot) return;

  const appModules = path.join(appRoot, "node_modules");
  if (!fs.existsSync(appModules)) {
    console.warn("[vercel-prebuild] dta-app/node_modules missing; skip mirror");
    return;
  }

  const rootModules = path.join(repoRoot, "node_modules");
  if (fs.existsSync(rootModules)) {
    fs.rmSync(rootModules, { recursive: true, force: true });
  }
  fs.cpSync(appModules, rootModules, { recursive: true });
  console.log("[vercel-prebuild] Copied node_modules to repository root");
}

mirrorToRepoRoot();
