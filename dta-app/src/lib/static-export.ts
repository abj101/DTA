/** True when the app is built for static hosting (no Next.js server or route handlers). */
export const isStaticExport =
  process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
