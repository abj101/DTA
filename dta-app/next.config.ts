import type { NextConfig } from "next";
import path from "node:path";

const staticExport = process.env.STATIC_EXPORT === "true";
const rawBase = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
const basePath =
  rawBase && rawBase !== "/"
    ? rawBase.startsWith("/")
      ? rawBase
      : `/${rawBase}`
    : undefined;

/** Must match `turbopack.root` — Next infers a different tracing root when a parent dir has a lockfile. */
const workspaceRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  ...(staticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
        /** GitHub Pages CI: avoid failing the deploy on lint drift. */
        eslint: { ignoreDuringBuilds: true },
      }
    : {}),
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
