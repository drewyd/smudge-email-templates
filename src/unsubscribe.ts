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

import { COLORS, F } from "./branded";

const UNSUB_BASE = "https://emails.smudgeartspace.com/unsubscribe";

/**
 * Build the customer-facing unsubscribe URL.
 *
 * @param email Recipient email address. Empty string returns the bare URL,
 *   which prompts the user to enter their email at the destination page.
 *   This is the legacy fallback for templates where the recipient email is
 *   not in scope (e.g. EDM raw HTML stitched in the wizard).
 */
export function buildUnsubscribeUrl(email?: string | null): string {
  if (!email) return UNSUB_BASE;
  return `${UNSUB_BASE}?email=${encodeURIComponent(email.trim().toLowerCase())}`;
}

/**
 * RFC 8058 one-click unsubscribe headers for use in `resend.emails.send({ headers })`.
 */
export function buildUnsubscribeHeaders(email: string): Record<string, string> {
  const apiUrl = `https://emails.smudgeartspace.com/api/unsubscribe?email=${encodeURIComponent(
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
export function unsubscribeFooterHtml(email?: string | null): string {
  const url = buildUnsubscribeUrl(email);
  return (
    `<p style="${F};font-size:11px;color:${COLORS.textMuted};margin:16px 0 0;text-align:center;line-height:1.6">` +
    `You received this because you booked with Smudge Artspace. ` +
    `<a href="${url}" style="color:${COLORS.textMuted};text-decoration:underline">Unsubscribe</a>.` +
    `</p>`
  );
}

/**
 * Default unsubscribe footer when the recipient email is not in scope at render
 * time. Used by templates that historically did not carry the recipient email
 * through to the renderer.
 */
export const UNSUBSCRIBE_FOOTER_HTML = unsubscribeFooterHtml(null);
