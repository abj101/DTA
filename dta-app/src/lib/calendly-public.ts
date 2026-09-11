/**
 * Public Calendly scheduling URL for the inline embed.
 * Built from NEXT_PUBLIC_CALENDLY_USERNAME + NEXT_PUBLIC_CALENDLY_EVENT_TYPE_SLUG.
 */
export function getCalendlySchedulingUrl(): string | null {
  const username = process.env.NEXT_PUBLIC_CALENDLY_USERNAME?.trim();
  const slug = process.env.NEXT_PUBLIC_CALENDLY_EVENT_TYPE_SLUG?.trim();
  if (!username || !slug) return null;

  const url = new URL(`https://calendly.com/${username}/${slug}`);
  // Page already shows title/context — keep the widget compact and scroll-free.
  url.searchParams.set("hide_event_type_details", "1");
  url.searchParams.set("hide_gdpr_banner", "1");
  return url.toString();
}
