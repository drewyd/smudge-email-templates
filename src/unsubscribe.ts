/**
 * Unsubscribe link helpers for transactional + marketing email templates.
 *
 * Added 2026-05-19 (Quality Uplift Tier 1.9) after the email audit found that
 * several customer-facing templates were shipping with no unsubscribe link at
 * all (party confirmation, class confirmation, holiday confirmation, gift card
 * delivery, workshop confirmation, Hub welcome). That's an Australian SPAM Act
 * + Resend compliance issue.
 *
 * Current pattern, matching what the operations-dashboard's send-campaign
 * route does for batch sends:
 *   - URL: https://emails.smudgeartspace.com/unsubscribe?email=<plaintext>
 *   - The /api/unsubscribe POST handler upserts into `email_unsubscribes`
 *
 * The URL uses plaintext email today because that's the existing surface; the
 * Tier 2 follow-up is to swap to an HMAC-signed token (issue logged in the
 * Tier-1-finish report). Wiring the HMAC version is out of scope for 1.9,
 * it'd require coordinated changes across both repos and a DB migration to
 * persist HMAC secrets. Adding the plaintext link now closes the compliance
 * gap; hardening is Tier 2.
 *
 * The `emails.smudgeartspace.com` subdomain is an alias of the
 * operations-dashboard Vercel project and hides the word "dashboard" from
 * customer-facing email footers.
 */

import { COLORS, F, resolveEmailTheme, resolveStudioEmailIdentity } from "./branded";

/**
 * Studio branding for the unsubscribe link + compliance footer line. Both
 * fields are optional and are checked in this order: an explicit `branding`
 * argument (a non-frozen caller's deliberate override) first, then the SAME
 * env vars each consuming app's studioIdentity() reads
 * (STUDIO_EMAIL_UNSUBSCRIBE_DOMAIN, STUDIO_NAME) so a studio's Vercel env
 * alone re-brands every unsubscribe link with no caller needing to pass
 * anything -- which is what lets frozen booking/webhook call sites stay
 * completely untouched -- then Smudge's own literal default.
 */
export interface UnsubscribeBranding {
  /** Bare host, no scheme or path, e.g. "emails.smudgeartspace.com". */
  unsubscribeDomain?: string;
  /** Full trading name shown in the "you received this because you booked with..." line. */
  studioName?: string;
}

function unsubscribeBase(branding?: UnsubscribeBranding): string {
  const domain = branding?.unsubscribeDomain?.trim() ||
    resolveStudioEmailIdentity(branding).unsubscribeDomain;
  return `https://${domain}/unsubscribe`;
}

/**
 * Build the customer-facing unsubscribe URL.
 *
 * @param email Recipient email address. Empty string returns the bare URL,
 *   which prompts the user to enter their email at the destination page.
 *   This is the legacy fallback for templates where the recipient email is
 *   not in scope (e.g. EDM raw HTML stitched in the wizard).
 */
export function buildUnsubscribeUrl(email?: string | null, branding?: UnsubscribeBranding): string {
  const base = unsubscribeBase(branding);
  if (!email) return base;
  return `${base}?email=${encodeURIComponent(email.trim().toLowerCase())}`;
}

/**
 * RFC 8058 one-click unsubscribe headers for use in `resend.emails.send({ headers })`.
 */
export function buildUnsubscribeHeaders(
  email: string,
  branding?: UnsubscribeBranding,
): Record<string, string> {
  const domain = branding?.unsubscribeDomain?.trim() ||
    resolveStudioEmailIdentity(branding).unsubscribeDomain;
  const apiUrl = `https://${domain}/api/unsubscribe?email=${encodeURIComponent(
    email.trim().toLowerCase(),
  )}`;
  return {
    "List-Unsubscribe": `<${apiUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Inline HTML snippet for the unsubscribe footer line on transactional emails.
 * Drop into the body of any branded confirmation right above the brand footer.
 */
export function unsubscribeFooterHtml(email?: string | null, branding?: UnsubscribeBranding): string {
  const url = buildUnsubscribeUrl(email, branding);
  const studioName = branding?.studioName?.trim() ||
    resolveStudioEmailIdentity(branding).studioName;
  // F, not theme.fontStack, whenever the studio named no type of her own: the
  // two spell the same family differently and this line's literal is F's.
  const theme = resolveEmailTheme();
  const font = theme.fontsThemed ? `font-family:${theme.fontStack}` : F;
  return (
    `<p style="${font};font-size:11px;color:${COLORS.textMuted};margin:16px 0 0;text-align:center;line-height:1.6">` +
    `You received this because you booked with ${studioName}. ` +
    `<a href="${url}" style="color:${COLORS.textMuted};text-decoration:underline">Unsubscribe</a>.` +
    `</p>`
  );
}
