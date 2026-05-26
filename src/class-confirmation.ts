/**
 * Class booking confirmation email, the "real" template Emma signed off on.
 *
 * CANONICAL source for class confirmation emails across the Smudge codebase.
 * The operations-dashboard repo used to have its own copy at
 * `src/lib/booking/email-templates/class-confirmation.ts`; that copy was
 * retired 2026-05-19 (Quality Uplift Tier 1.2). Edit only here.
 *
 * Transcribed from the historical n8n workflow
 * `n8n-workflows/class-payment-success.json` (node: "Build Email"), which is
 * the same HTML that went out to customers while class checkout lived on n8n
 * (pre-March 2026). When class checkout moved to the Next.js webhook, the
 * inline emailWrap + shared.ts stub was used instead, that's the stripped
 * version Drew flagged. This restores the original structure:
 *
 *   - Multicolour SMUDGE logo (via branded.ts wrapper)
 *   - Full-width green banner with "Booking Confirmed!"
 *   - Hi {parent},
 *   - White card: CLASS / CHILDREN / DATES / TOTAL PAID
 *   - White card: What to bring (static bullets)
 *   - White card: Location (static)
 *   - Closing "We can't wait to create with you! / The Smudge Team"
 *   - Footer (via branded.ts wrapper)
 *
 * The n8n HTML used its own inline wrapper. We port it to brandedWrap for
 * logo + footer consistency with the party template, and keep the three
 * white cards + green banner verbatim in the body.
 *
 * Admin-side niceties ported from operations-dashboard 2026-05-19:
 *   - Optional sessionStartTime / sessionEndTime (used by manual admin booking)
 *   - TIME_MAP fallback when session times not supplied
 *   - Alternate gift-card params (giftCardDiscount + giftCardCode) alongside
 *     the canonical giftCardLine string
 */

import {
  escapeHtml,
  fmtDate,
  fmtTime,
  F,
  FW4,
  FW7,
  COLORS,
  IMG,
  SITE,
} from "./branded";
import { unsubscribeFooterHtml } from "./unsubscribe";

export interface ClassConfirmationChild {
  name: string;
  dob?: string | null;
}

export interface ClassConfirmationParams {
  parentName: string;
  /** Parent email, used to build the unsubscribe link */
  parentEmail?: string;
  className: string;
  children: ClassConfirmationChild[];
  /** ISO date strings YYYY-MM-DD, one per session */
  dates: string[];
  /** Total paid, in cents */
  amountCents: number;
  receiptUrl?: string | null;
  /** Pre-formatted gift-card line, e.g. "Gift card applied: $45.00, you have $15.00 left on ABC123." */
  giftCardLine?: string;
  /** Alternate gift-card params used by admin manual booking. Discount in cents. */
  giftCardDiscount?: number;
  /** Gift card code string (used with giftCardDiscount). */
  giftCardCode?: string | null;
  /** Session start_time (HH:MM:SS) looked up from DB. Optional. */
  sessionStartTime?: string | null;
  /** Session end_time (HH:MM:SS) looked up from DB. Optional. */
  sessionEndTime?: string | null;
}

/**
 * Fallback timetable used when sessionStartTime/sessionEndTime are not supplied.
 * Mirrors the original n8n workflow's hardcoded fallback.
 */
const TIME_MAP: Record<string, Record<number, string>> = {
  "Art Play Lab": { 2: "10am – 11:30am", 3: "10am – 11:30am", 4: "10am – 11:30am" },
  "Kinder Art": { 3: "1:30pm – 3pm", 4: "1:30pm – 3pm" },
  "After School Creators": { 2: "4pm – 5pm", 4: "4pm – 5pm" },
  "Art Explorers": { 2: "1:30pm – 3pm" },
};

export interface ClassConfirmationResult {
  subject: string;
  customerHtml: string;
  internalHtml: string;
}

/* ----------------------------------------------------------------------- */
/*  Shared bits                                                             */
/* ----------------------------------------------------------------------- */

/** White info card used three times in the customer body (details / bring / location). */
function whiteCard(innerHtml: string): string {
  return (
    `<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bgCard};border:1px solid ${COLORS.border};border-radius:12px;margin-bottom:24px"><tr><td style="padding:20px 24px;${F}">` +
    innerHtml +
    "</td></tr></table>"
  );
}

/** CLASS / CHILDREN / DATES / TOTAL PAID style label + value stack. */
function labelValue(label: string, valueHtml: string, marginBottom = true): string {
  return (
    `<div${marginBottom ? ' style="margin-bottom:12px"' : ""}>` +
    `<span style="${FW7};font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${COLORS.textLight}">${escapeHtml(label)}</span><br>` +
    `<span style="${FW4};font-size:16px;color:${COLORS.text}">${valueHtml}</span>` +
    "</div>"
  );
}

/* ----------------------------------------------------------------------- */
/*  Customer email                                                          */
/* ----------------------------------------------------------------------- */

/**
 * Resolve the "Time" detail row for the customer email.
 *
 * Priority order:
 *  1. sessionStartTime + sessionEndTime (DB-driven, used by the admin manual
 *     booking flow which always has a session row loaded)
 *  2. TIME_MAP fallback keyed on className + weekday of dates[0]
 *  3. No time row at all
 */
function resolveSessionTimeHtml(params: ClassConfirmationParams): string {
  const { sessionStartTime, sessionEndTime, className, dates } = params;
  if (sessionStartTime && sessionEndTime) {
    return labelValue(
      "Time",
      `${escapeHtml(fmtTime(sessionStartTime))} – ${escapeHtml(fmtTime(sessionEndTime))}`,
    );
  }
  if (dates.length > 0) {
    const dt = new Date(dates[0] + "T00:00:00");
    const dow = dt.getDay();
    const schedule = TIME_MAP[className];
    if (schedule && schedule[dow]) {
      return labelValue("Time", escapeHtml(schedule[dow]));
    }
  }
  return "";
}

/**
 * Resolve the "Gift Card" detail row. Accepts either the canonical preformatted
 * `giftCardLine` string OR the admin-flow pair (`giftCardDiscount` cents +
 * `giftCardCode`).
 */
function resolveGiftCardHtml(params: ClassConfirmationParams): string {
  const { giftCardLine, giftCardDiscount, giftCardCode } = params;
  if (giftCardLine) {
    return (
      `<div style="margin-bottom:12px">` +
      `<span style="${FW7};font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${COLORS.textLight}">Gift Card</span><br>` +
      `<span style="${FW4};font-size:15px;color:${COLORS.textLight}">${giftCardLine}</span>` +
      `</div>`
    );
  }
  if (giftCardDiscount && giftCardDiscount > 0 && giftCardCode) {
    const amount = `-$${(giftCardDiscount / 100).toFixed(2)} (${escapeHtml(giftCardCode)})`;
    return labelValue("Gift Card Applied", amount);
  }
  return "";
}

function buildCustomerHtml(params: ClassConfirmationParams): string {
  const { parentName, parentEmail, className, children, dates, amountCents, receiptUrl } = params;

  const safeParent = escapeHtml(parentName.split(" ")[0] || parentName);
  const safeClass = escapeHtml(className);
  const childNames = children.map((c) => escapeHtml(c.name)).join(", ");
  const dateLines = dates.map((d) => escapeHtml(fmtDate(d))).join("<br>");
  const amountDollars = (amountCents / 100).toFixed(2);

  // Details card, CLASS / CHILDREN / DATES / (time) / (gift card) / TOTAL PAID
  let detailsInner =
    labelValue("Class", safeClass) +
    labelValue("Children", childNames) +
    labelValue("Dates", dateLines) +
    resolveSessionTimeHtml(params) +
    resolveGiftCardHtml(params);

  detailsInner += labelValue("Total Paid", `$${amountDollars} AUD`, false);

  const detailsCard = whiteCard(detailsInner);

  const bringCard = whiteCard(
    `<p style="${FW7};font-size:16px;color:${COLORS.text};margin:0 0 8px">What to bring</p>` +
      `<ul style="${FW4};font-size:15px;color:${COLORS.textLight};margin:0;padding-left:20px;line-height:1.8">` +
      "<li>Water bottle</li>" +
      "<li>Mess-friendly clothes</li>" +
      "<li>Spare outfit (just in case!)</li>" +
      "<li>A bag for taking home creations</li>" +
      "</ul>",
  );

  const locationCard = whiteCard(
    `<p style="${FW7};font-size:16px;color:${COLORS.text};margin:0 0 8px">Location</p>` +
      `<p style="${FW4};font-size:15px;color:${COLORS.textLight};margin:0;line-height:1.5">Smudge Artspace<br>102 Union Rd, Surrey Hills VIC 3127</p>`,
  );

  const receiptLink = receiptUrl
    ? `<p style="${FW4};font-size:14px;margin:0 0 16px"><a href="${escapeHtml(receiptUrl)}" style="color:${COLORS.berry};text-decoration:underline">View your Stripe receipt</a></p>`
    : "";

  // Full-width green banner, NOT the rounded greenCard helper; this hero
  // stretches edge-to-edge under the logo/nav, matching the screenshot.
  const greenHero =
    `<table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.green};border-radius:16px;margin:0 0 24px"><tr><td align="center" style="padding:28px 24px">` +
    `<h1 style="${FW7};font-size:26px;color:#ffffff;margin:0;line-height:1.2">Booking Confirmed!</h1>` +
    "</td></tr></table>";

  // Inner body (goes inside the branded card via our own wrapper below).
  const innerBody =
    greenHero +
    `<p style="${FW4};font-size:16px;color:${COLORS.text};margin:0 0 16px;text-align:left">Hi ${safeParent},</p>` +
    `<p style="${FW4};font-size:16px;color:${COLORS.text};margin:0 0 24px;text-align:left">Thank you for booking with Smudge Artspace! Here are your booking details:</p>` +
    detailsCard +
    bringCard +
    locationCard +
    receiptLink +
    `<p style="${FW4};font-size:16px;color:${COLORS.text};margin:0 0 8px">We can't wait to create with you!</p>` +
    `<p style="${FW4};font-size:16px;color:${COLORS.text};margin:0">The Smudge Team</p>` +
    unsubscribeFooterHtml(parentEmail ?? null);

  // Hand-rolled wrapper, uses the same logo + footer assets as branded.ts
  // but skips the centered <h1> heading slot (we already have the green hero
  // banner) and the Emma signature block (n8n original didn't have one).
  return (
    "<html><head>" +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    "<style>:root{color-scheme:light;supported-color-schemes:light}body,.bg-w,table,td{background-color:#f0f0f0}.card,.card td{background-color:#ffffff}</style>" +
    `</head><body style="margin:0;padding:0;background-color:${COLORS.bgOuter};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;${F}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bgOuter}"><tr><td align="center" style="padding:20px 0">` +
    `<table class="card" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${COLORS.bgCard};border-radius:8px">` +
    // Logo
    `<tr><td class="card" align="center" style="padding:40px 20px 20px;background-color:${COLORS.bgCard}"><a href="${SITE}" target="_blank"><img src="${IMG.logo}" alt="Smudge Artspace" width="200" style="display:block;max-width:200px;width:100%;height:auto;border:0"/></a></td></tr>` +
    // Body
    `<tr><td class="card" align="left" style="padding:0 40px 20px;background-color:${COLORS.bgCard}">` +
    innerBody +
    "</td></tr>" +
    // Small Smudge mark before footer
    `<tr><td align="center" style="padding:8px 40px 24px"><img src="${IMG.logoSmall}" alt="Smudge Artspace" width="119" style="display:block;max-width:119px;height:auto;border:0;margin:0 auto"/></td></tr>` +
    "</table>" +
    // Footer
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%"><tr><td align="center" style="padding:16px 20px">` +
    `<p style="${F};font-size:12px;color:${COLORS.textMuted};margin:0 0 4px">Smudge Artspace &middot; 102 Union Rd, Surrey Hills VIC 3127</p>` +
    `<p style="${F};font-size:12px;color:${COLORS.textMuted};margin:0"><a href="mailto:hello@smudgeartspace.com" style="color:${COLORS.berry};text-decoration:none">hello@smudgeartspace.com</a></p>` +
    `</td></tr></table>` +
    "</td></tr></table></body></html>"
  );
}

/* ----------------------------------------------------------------------- */
/*  Internal notification email                                             */
/* ----------------------------------------------------------------------- */

function buildInternalHtml(params: ClassConfirmationParams): string {
  const { parentName, className, children, dates, amountCents, giftCardLine } = params;
  const amountDollars = (amountCents / 100).toFixed(2);

  const rows: [string, string][] = [
    ["Parent", escapeHtml(parentName)],
    ["Class", escapeHtml(className)],
    ["Children", children.map((c) => escapeHtml(c.name)).join(", ")],
    ["Dates", dates.map((d) => escapeHtml(fmtDate(d))).join("<br>")],
    ["Amount", `$${amountDollars} AUD`],
  ];
  if (giftCardLine) rows.push(["Gift Card", giftCardLine]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 8px;${FW7};font-size:14px;vertical-align:top">${label}:</td><td style="padding:4px 8px;${FW4};font-size:14px">${value}</td></tr>`,
    )
    .join("");

  return (
    `<html><body style="margin:0;padding:20px;${F};font-size:14px;color:${COLORS.text};line-height:1.6">` +
    `<h2 style="${F};font-size:18px;color:${COLORS.green};margin:0 0 16px">New Class Booking</h2>` +
    `<table cellpadding="0" cellspacing="0" border="0" style="${F};font-size:14px;margin-bottom:16px">` +
    tableRows +
    "</table>" +
    `<p style="margin:16px 0 0;font-size:12px;color:${COLORS.textMuted}">Reply to this email to contact the parent directly.</p>` +
    "</body></html>"
  );
}

/* ----------------------------------------------------------------------- */
/*  Public API                                                              */
/* ----------------------------------------------------------------------- */

export function buildClassConfirmationEmail(
  params: ClassConfirmationParams,
): ClassConfirmationResult {
  return {
    subject: `Booking Confirmed: ${params.className} at Smudge`,
    customerHtml: buildCustomerHtml(params),
    internalHtml: buildInternalHtml(params),
  };
}
