/**
 * Long-form "It's Party Time!" confirmation email.
 *
 * CANONICAL source for party confirmation emails across the Smudge codebase.
 * The operations-dashboard repo used to have its own copy at
 * `src/lib/booking/email-templates/party-confirmation.ts`; that copy was
 * retired 2026-05-19 (Quality Uplift Tier 1.1). Edit only here.
 *
 * Originally ported from the n8n Party Payment Success workflow
 * (viT6Q4XrlDCkhkUm), the template Emma signed off on.
 *
 * Called from handlePartyBooking in the stripe-studio webhook.
 */

import {
  escapeHtml,
  fmtDate,
  emailWrap,
  greenCard,
  greyCard,
  detailRow,
  computeAgeAtParty,
  ordinalSuffix,
  F,
  FW4,
  FW7,
  COLORS,
} from "./branded";
import { unsubscribeFooterHtml } from "./unsubscribe";

export interface PartyConfirmationParams {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  /** Pre-computed age to use (preferred). If not given, derived from childDob. */
  childAge?: string | number | null;
  /** ISO YYYY-MM-DD, used to derive childAge if not provided. */
  childDob?: string | null;
  /** ISO date string YYYY-MM-DD */
  partyDate: string;
  /** Display time string e.g. "10am - 12pm" */
  partyTime: string;
  theme: string;
  cateringDisplay: string;
  dietaryMedical?: string;
  specialInterests?: string;
  photoConsent?: string;
  invitationColor?: string;
  /** Amount in cents */
  amount: number;
  bookingId?: string;
}

export interface PartyConfirmationResult {
  customerHtml: string;
  internalHtml: string;
  /** Convenience: age we resolved for the email, so the caller can log it. */
  resolvedAge: number | null;
  /** Subject line to use for the customer email */
  customerSubject: string;
}

/* ----------------------------------------------------------------------- */
/*  FAQ sections, 13 items, verbatim from Emma-approved n8n template       */
/* ----------------------------------------------------------------------- */

function buildFaqSections(): string {
  const sectionStyle = 'style="margin:0 0 20px"';
  const headingStyle = `style="${FW7};font-size:16px;color:${COLORS.text};margin:0 0 8px"`;
  const bodyStyle = `style="${FW4};font-size:15px;color:${COLORS.textLight};line-height:1.6;margin:0"`;

  const sections: { title: string; body: string }[] = [
    {
      title: "1. Your Party Theme",
      body: "You can change your theme up to 3 weeks before your party date. Just reply to this email to let us know.",
    },
    {
      title: "2. Confirming Guest Numbers",
      body: "Your party includes up to 12 children. Additional children are $40 each, up to a maximum of 18 kids. Please confirm final numbers at least 1 week before your party.",
    },
    {
      title: "3. What About Adults?",
      body: "For children aged 7 and over, it's a drop-off party. For children 6 and under, we ask that at least one parent/guardian stays for the duration. Adults are welcome to relax in our courtyard or grab a coffee across the road.",
    },
    {
      title: "4. Arrival",
      body: "You're welcome to arrive 15 minutes early to set up any decorations or food. We'll have the space ready for you.",
    },
    {
      title: "5. What to Expect on the Day",
      body: "Your 2-hour party includes guided art activities tailored to your chosen theme, free play time, and time for cake and food. Our team handles everything so you can enjoy the celebration!",
    },
    {
      title: "6. Catering",
      body: 'If you\'ve chosen Petite Catering, our caterer Matilda at Mont Albert will be in touch to confirm your order. Contact them directly at <a href="mailto:catering@matildamontalbert.com" style="color:#236eaf">catering@matildamontalbert.com</a>.',
    },
    {
      title: "7. BYO Food & Birthday Cake",
      body: "You're welcome to bring your own food and birthday cake. Please note we are a <strong>nut-free</strong> venue. Please bring your own plates, napkins, and a cake knife.",
    },
    {
      title: "8. Party Bags",
      body: "Every child takes home their art creations plus a Smudge party bag with a paint tube, paintbrush, stickers, and a lollipop!",
    },
    {
      title: "9. The Space & Courtyard",
      body: "You'll have exclusive use of our studio space. The courtyard has picnic tables with umbrellas for adults. In case of rain, we'll set up food and cake inside.",
    },
    {
      title: "10. Decorations",
      body: "You're welcome to bring balloons and table decorations. We'll help you set up when you arrive early.",
    },
    {
      title: "11. Car Parking",
      body: "Free street parking is available on Union Road and Montrose Street. The Coles Local car park on Montrose Street offers 2 hours free.",
    },
    {
      title: "12. Coffee?",
      body: "Sips &amp; Stories is right across the road for all your coffee needs!",
    },
    {
      title: "13. Questions?",
      body: "Simply reply to this email and we'll get back to you as soon as we can.",
    },
  ];

  return sections
    .map(
      (s) =>
        `<div ${sectionStyle}><p ${headingStyle}>${s.title}</p><p ${bodyStyle}>${s.body}</p></div>`,
    )
    .join("");
}

/* ----------------------------------------------------------------------- */
/*  Age resolution                                                          */
/* ----------------------------------------------------------------------- */

function resolveAge(params: PartyConfirmationParams): number | null {
  if (params.childAge !== undefined && params.childAge !== null && params.childAge !== "") {
    const n = typeof params.childAge === "number" ? params.childAge : parseInt(String(params.childAge), 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return computeAgeAtParty(params.childDob, params.partyDate);
}

/**
 * Format the DOB as a human readable date for the internal email when age
 * resolution fails. Parents who fat-finger DOB (e.g. wrong year) land here,
 * surface what we received so Emma can eyeball the problem instead of seeing
 * a generic "(unknown)" placeholder.
 */
function formatDobForAdmin(dob: string | null | undefined): string {
  if (!dob) return "(not provided)";
  const safe = escapeHtml(dob);
  const d = new Date(dob + "T00:00:00");
  if (isNaN(d.getTime())) return `(unparseable: ${safe})`;
  return `${safe}, needs confirmation with parent`;
}

/* ----------------------------------------------------------------------- */
/*  Customer email                                                          */
/* ----------------------------------------------------------------------- */

function buildCustomerEmail(params: PartyConfirmationParams, age: number | null): string {
  const {
    parentName,
    parentEmail,
    childName,
    partyDate,
    partyTime,
    theme,
    cateringDisplay,
    dietaryMedical,
    specialInterests,
  } = params;

  const safeName = escapeHtml(parentName.split(" ")[0] || parentName);
  const safeChildName = escapeHtml(childName);
  const safeTheme = escapeHtml(theme);
  const safeCatering = escapeHtml(cateringDisplay);
  const safeDate = escapeHtml(fmtDate(partyDate));
  const safeTime = escapeHtml(partyTime);

  // Headline copy, degrades gracefully if age missing
  const birthdayHeadline = age
    ? `${safeChildName}'s ${age}${ordinalSuffix(age)} Birthday Party`
    : `${safeChildName}'s Birthday Party`;

  let detailsHtml =
    detailRow("Child", safeChildName) +
    (age ? detailRow("Age turning", String(age)) : "") +
    detailRow("Date", safeDate) +
    detailRow("Time", safeTime) +
    detailRow("Location", "Smudge Artspace, 102 Union Rd, Surrey Hills VIC 3127") +
    detailRow("Theme", safeTheme) +
    detailRow("Catering", safeCatering);

  if (dietaryMedical) detailsHtml += detailRow("Dietary / Medical", escapeHtml(dietaryMedical));
  if (specialInterests) detailsHtml += detailRow("Special Interests", escapeHtml(specialInterests), false);

  const bodyHtml =
    `<p style="${FW4};font-size:16px;color:${COLORS.text};margin:0 0 16px;text-align:center">Hi ${safeName},</p>` +
    `<p style="${FW4};font-size:16px;color:${COLORS.text};margin:0 0 24px;text-align:center">Thank you for booking a birthday party at Smudge Artspace! We can't wait to celebrate with ${safeChildName}.</p>` +
    greenCard(
      '<div style="text-align:center;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;opacity:.8">Party Booking Confirmed</div>' +
        `<div style="text-align:center;font-weight:700;font-size:20px">${birthdayHeadline}</div>` +
        `<div style="text-align:center;margin-top:4px">${safeDate} &middot; ${safeTime}</div>` +
        `<div style="text-align:center;margin-top:14px;font-weight:400;font-size:14px;line-height:1.5;opacity:.92">Your custom invitation will arrive shortly in a separate email.</div>`,
    ) +
    greyCard(detailsHtml) +
    '<div style="margin:24px 0">' +
    `<h2 style="${F};font-size:22px;font-weight:700;color:${COLORS.text};margin:0 0 20px;text-align:center">Everything You Need to Know</h2>` +
    buildFaqSections() +
    "</div>" +
    unsubscribeFooterHtml(parentEmail ?? null);

  return emailWrap("It's Party Time!", bodyHtml, "We can't wait to celebrate with you!");
}

/* ----------------------------------------------------------------------- */
/*  Internal notification email                                             */
/* ----------------------------------------------------------------------- */

function buildInternalEmail(params: PartyConfirmationParams, age: number | null): string {
  const {
    parentName,
    parentEmail,
    parentPhone,
    childName,
    partyDate,
    partyTime,
    theme,
    cateringDisplay,
    dietaryMedical,
    specialInterests,
    photoConsent,
    invitationColor,
    amount,
    bookingId,
  } = params;

  const amountDollars = (amount / 100).toFixed(0);
  const rows: [string, string][] = [
    ["Parent", escapeHtml(parentName)],
    ["Email", `<a href="mailto:${escapeHtml(parentEmail)}">${escapeHtml(parentEmail)}</a>`],
    ["Phone", escapeHtml(parentPhone)],
    ["Child", escapeHtml(childName)],
    ["Age turning", age ? String(age) : `⚠️ Could not compute, DOB on file: ${formatDobForAdmin(params.childDob)}`],
    ["Date", escapeHtml(fmtDate(partyDate))],
    ["Time", escapeHtml(partyTime)],
    ["Theme", escapeHtml(theme)],
    ["Catering", escapeHtml(cateringDisplay)],
    ["Amount", `$${amountDollars}`],
  ];

  if (dietaryMedical) rows.push(["Dietary / Medical", escapeHtml(dietaryMedical)]);
  if (specialInterests) rows.push(["Special Interests", escapeHtml(specialInterests)]);
  if (photoConsent) rows.push(["Photo Consent", escapeHtml(photoConsent)]);
  if (invitationColor) rows.push(["Invitation Colour", escapeHtml(invitationColor)]);
  if (bookingId) rows.push(["Booking ID", `<code>${escapeHtml(bookingId)}</code>`]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 8px;${FW7};font-size:14px">${label}:</td><td style="padding:4px 8px;${FW4};font-size:14px">${value}</td></tr>`,
    )
    .join("");

  return (
    `<html><body style="margin:0;padding:20px;${F};font-size:14px;color:${COLORS.text};line-height:1.6">` +
    `<h2 style="${F};font-size:18px;color:${COLORS.green};margin:0 0 16px">New Birthday Party Booking</h2>` +
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

export function buildPartyConfirmationEmail(params: PartyConfirmationParams): PartyConfirmationResult {
  const age = resolveAge(params);
  return {
    customerHtml: buildCustomerEmail(params, age),
    internalHtml: buildInternalEmail(params, age),
    resolvedAge: age,
    customerSubject: `${params.childName.split(" ")[0] || params.childName}'s Smudge Birthday Party is booked!`,
  };
}
