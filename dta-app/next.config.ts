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

const nextConfig: NextConfig = {
  /** Pin Turbopack workspace root when a parent directory also has a lockfile (monorepo / nested app). */
  turbopack: {
    root: path.resolve(__dirname),
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
