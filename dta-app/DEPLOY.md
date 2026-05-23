# Deploying to Vercel

The Next.js app lives in this directory. Vercel must use **`dta-app`** as the project root — not the repository root.

## One-time project setup

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Settings** → **General**.
2. Set **Root Directory** to `dta-app` and confirm.
3. Clear any custom **Install Command** or **Build Command** overrides (defaults are fine: `npm ci` and `npm run build` from this folder).
4. Add environment variables from [`.env.example`](./.env.example) under **Settings** → **Environment Variables**.

Redeploy after changing Root Directory.

If production builds fail with `ENOENT` under `/vercel/path0/` (for example `.next/routes-manifest-deterministic.json`, `node_modules/next/dist/build/adapter/setup-node-env.external.js`, or `@swc/helpers/...`), Vercel’s Git Integration is validating the **repository root** while `npm ci` / `next build` run in `dta-app/`. Confirm **Root Directory = `dta-app`**, and keep the `vercel-prebuild` / `vercel-postbuild` scripts wired in `package.json` `build` (they mirror `node_modules` and `.next` to the repo root on Vercel only).

## What not to do

- Do not add a root-level `vercel.json` with `cd dta-app && …` commands. That builds in the subdirectory but makes post-build validation look at the wrong paths on Next.js 16.
- Do not set `STATIC_EXPORT` or `NEXT_PUBLIC_STATIC_EXPORT` on Vercel (GitHub Pages only; see `.github/workflows/github-pages.yml`).

## GitHub Pages (separate)

Static export runs from the `github-pages` branch via GitHub Actions, not from Vercel.
