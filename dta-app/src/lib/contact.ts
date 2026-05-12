/**
 * Single source of truth for direct-contact channels.
 * Update phone/email here; all surfaces (footer, contact page, etc.) follow.
 */

export const CONTACT_EMAIL = "tutoring.dta@gmail.com";
export const CONTACT_PHONE_DISPLAY = "(925) 549-2176";
export const CONTACT_PHONE_TEL = "+19255492176";

export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}` as const;
export const CONTACT_PHONE_HREF = `tel:${CONTACT_PHONE_TEL}` as const;
