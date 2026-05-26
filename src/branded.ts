/**
 * Fully-branded email helpers (nav bar, logo, Emma signature, footer).
 *
 * Ported from operations-dashboard/src/lib/booking/email-templates/shared.ts
 * which itself was ported from the n8n production workflows. Used by the
 * long party confirmation template and any future branded emails.
 *
 * Kept separate from the existing `./shared.ts` so class / holiday / gift-card
 * handlers are not affected by this change.
 */

export const SITE = "https://www.smudgeartspace.com";
export const EMAIL_ASSET_BASE = `${SITE}/email-assets`;

export const IMG = {
  logoSvg: "https://xmvzrgzspfzefiykgvjy.supabase.co/storage/v1/object/public/email-assets/smudge-logo.svg",
  logo: `${EMAIL_ASSET_BASE}/smudge-logo-color.png`,
  logoSmall: `${EMAIL_ASSET_BASE}/smudge-logo-small.png`,
  emma: `${EMAIL_ASSET_BASE}/emma-signature.png`,
} as const;

export const F = "font-family:'Montserrat',Arial,sans-serif";
export const FW4 = `${F};font-weight:400`;
export const FW7 = `${F};font-weight:700`;

export const COLORS = {
  primary: "#ec6f86",
  green: "#099f4a",
  berry: "#236eaf",
  orange: "#f37321",
  pink: "#f9c7d8",
  text: "#231f20",
  textLight: "#4a4a4a",
  textMuted: "#788291",
  border: "#e5e5e5",
  bgOuter: "#f0f0f0",
  bgCard: "#ffffff",
  bgContent: "#fafafa",
} as const;

export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function fmtDate(iso: string): string {
  const dt = new Date(iso + "T00:00:00");
  return `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

export function fmtTime(t: string): string {
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === "00" ? `${h12}${ampm}` : `${h12}:${m}${ampm}`;
}

/** Ordinal suffix: 1→st, 2→nd, 3→rd, 4→th, 11→th, 12→th, 13→th, 21→st */
export function ordinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "st";
  if (mod10 === 2 && mod100 !== 12) return "nd";
  if (mod10 === 3 && mod100 !== 13) return "rd";
  return "th";
}

/** Derive "age turning at party" from DOB + party date. Returns null if unknown or <=0. */
export function computeAgeAtParty(dob: string | null | undefined, partyDate: string | null | undefined): number | null {
  if (!dob || !partyDate) return null;
  const dobDate = new Date(dob + "T00:00:00");
  const pDate = new Date(partyDate + "T00:00:00");
  if (isNaN(dobDate.getTime()) || isNaN(pDate.getTime())) return null;
  let years = pDate.getFullYear() - dobDate.getFullYear();
  const beforeBirthday =
    pDate.getMonth() < dobDate.getMonth() ||
    (pDate.getMonth() === dobDate.getMonth() && pDate.getDate() < dobDate.getDate());
  if (beforeBirthday) years -= 1;
  return years > 0 ? years : null;
}

export function detailRow(label: string, value: string, marginBottom = true): string {
  return `<div${marginBottom ? ' style="margin-bottom:12px"' : ""}><span style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${COLORS.textLight}">${escapeHtml(label)}</span><br><span style="font-weight:400;font-size:16px">${value}</span></div>`;
}

export function emailWrap(heading: string, bodyHtml: string, signoff?: string): string {
  return (
    "<html><head>" +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    "<style>:root{color-scheme:light;supported-color-schemes:light}body,.bg-w,table,td{background-color:#f0f0f0}.card,.card td{background-color:#ffffff}</style>" +
    `</head><body style="margin:0;padding:0;background-color:${COLORS.bgOuter};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;${F}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bgOuter}"><tr><td align="center" style="padding:20px 0">` +
    `<table class="card" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${COLORS.bgCard};border-radius:8px">` +
    `<tr><td class="card" align="center" style="padding:40px 20px 0;background-color:${COLORS.bgCard}"><a href="${SITE}" target="_blank"><img src="${IMG.logo}" alt="Smudge Artspace" width="200" style="display:block;max-width:200px;width:100%;height:auto;border:0"/></a></td></tr>` +
    '<tr><td align="center" style="padding:16px 10px 40px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    `<td style="padding:0 14px"><a href="${SITE}/art-classes" target="_blank" style="${F};font-size:12px;font-weight:700;letter-spacing:0.5px;color:${COLORS.orange};text-decoration:none">CLASSES</a></td>` +
    `<td style="padding:0 14px"><a href="${SITE}/book/holidays" target="_blank" style="${F};font-size:12px;font-weight:700;letter-spacing:0.5px;color:${COLORS.primary};text-decoration:none">HOLIDAY PROGRAMS</a></td>` +
    `<td style="padding:0 14px"><a href="${SITE}/book/parties" target="_blank" style="${F};font-size:12px;font-weight:700;letter-spacing:0.5px;color:${COLORS.green};text-decoration:none">PARTIES</a></td>` +
    `<td style="padding:0 14px"><a href="${SITE}/book/gift-cards" target="_blank" style="${F};font-size:12px;font-weight:700;letter-spacing:0.5px;color:${COLORS.berry};text-decoration:none">GIFT CARDS</a></td>` +
    "</tr></table></td></tr>" +
    `<tr><td class="card" align="center" style="padding:0 40px;background-color:${COLORS.bgCard}">` +
    `<h1 style="${F};font-size:28px;font-weight:700;color:${COLORS.text};margin:0 0 20px;line-height:1.2;text-align:center">${heading}</h1>` +
    bodyHtml +
    "</td></tr>" +
    '<tr><td align="center" style="padding:0 40px 10px">' +
    (signoff ? `<p style="${FW4};font-size:16px;color:${COLORS.text};margin:0 0 16px">${signoff}</p>` : "") +
    `<img src="${IMG.emma}" alt="Emma" width="120" style="display:block;max-width:120px;height:auto;border:0;margin:0 auto 16px"/>` +
    `<img src="${IMG.logoSmall}" alt="Smudge Artspace" width="119" style="display:block;max-width:119px;height:auto;border:0;margin:0 auto"/></td></tr>` +
    "</table>" +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%"><tr><td align="center" style="padding:16px 20px">` +
    `<p style="${F};font-size:12px;color:${COLORS.textMuted};margin:0">&copy; Smudge Artspace 2026. All rights reserved</p></td></tr></table>` +
    "</td></tr></table></body></html>"
  );
}

/**
 * Hub-flavoured email shell. Same logo header, but:
 *   - Hub nav (Library / Community / Gallery / Profile) instead of studio nav
 *   - Gloock serif for the headline (Hub typography rule, single weight 400)
 *   - Berry as the accent
 *
 * Used for /hub/welcome, onboarding drip, member announcements.
 */
export function hubEmailWrap(heading: string, bodyHtml: string, signoff?: string): string {
  const HUB_HOME = `${SITE}/hub`;
  const HUB_THEMES = `${SITE}/hub`;
  const HUB_COMMUNITY = `${SITE}/hub/community`;
  const HUB_GALLERY = `${SITE}/hub/gallery`;
  const displayFontStack = "'Gloock','Playfair Display',Georgia,'Times New Roman',serif";
  return (
    "<html><head>" +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Gloock&display=swap" rel="stylesheet">' +
    "<style>:root{color-scheme:light;supported-color-schemes:light}body,.bg-w,table,td{background-color:#f0f0f0}.card,.card td{background-color:#ffffff}</style>" +
    `</head><body style="margin:0;padding:0;background-color:${COLORS.bgOuter};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;${F}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bgOuter}"><tr><td align="center" style="padding:20px 0">` +
    `<table class="card" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${COLORS.bgCard};border-radius:8px;overflow:hidden">` +
    `<tr><td class="card" align="center" style="padding:40px 20px 0;background-color:${COLORS.bgCard}"><a href="${HUB_HOME}" target="_blank"><img src="${IMG.logo}" alt="Smudge Hub" width="200" style="display:block;max-width:200px;width:100%;height:auto;border:0"/></a></td></tr>` +
    '<tr><td align="center" style="padding:14px 10px 32px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    `<td style="padding:0 14px"><a href="${HUB_THEMES}" target="_blank" style="${F};font-size:12px;font-weight:700;letter-spacing:0.5px;color:${COLORS.berry};text-decoration:none">ART THEMES</a></td>` +
    `<td style="padding:0 14px"><a href="${HUB_COMMUNITY}" target="_blank" style="${F};font-size:12px;font-weight:700;letter-spacing:0.5px;color:${COLORS.primary};text-decoration:none">COMMUNITY</a></td>` +
    `<td style="padding:0 14px"><a href="${HUB_GALLERY}" target="_blank" style="${F};font-size:12px;font-weight:700;letter-spacing:0.5px;color:${COLORS.green};text-decoration:none">GALLERY</a></td>` +
    "</tr></table></td></tr>" +
    `<tr><td class="card" align="center" style="padding:0 40px;background-color:${COLORS.bgCard}">` +
    `<h1 style="font-family:${displayFontStack};font-size:38px;font-weight:400;color:${COLORS.text};margin:0 0 20px;line-height:1.1;text-align:center;letter-spacing:-0.01em">${heading}</h1>` +
    bodyHtml +
    "</td></tr>" +
    `<tr><td class="card" align="left" style="padding:24px 40px 32px;background-color:${COLORS.bgCard}">` +
    (signoff ? `<p style="${FW4};font-size:16px;color:${COLORS.text};margin:0;line-height:1.7">${signoff.split("\n").join("<br>")}</p>` : "") +
    "</td></tr>" +
    `<tr><td class="card" align="center" style="padding:0 40px 32px;background-color:${COLORS.bgCard}">` +
    `<img src="${IMG.logoSmall}" alt="Smudge Hub" width="119" style="display:block;max-width:119px;height:auto;border:0;margin:0 auto"/></td></tr>` +
    "</table>" +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%"><tr><td align="center" style="padding:24px 20px 8px">` +
    `<p style="${F};font-size:13px;color:${COLORS.text};margin:0 0 6px;font-weight:700">Smudge Artspace</p>` +
    `<p style="${F};font-size:12px;color:${COLORS.textMuted};margin:0 0 16px;line-height:1.6">102 Union Road, Surrey Hills, Victoria, Australia 3127</p>` +
    `<p style="margin:0 0 16px">` +
    `<a href="https://www.instagram.com/smudgeartspace" target="_blank" style="${F};font-size:12px;font-weight:700;color:${COLORS.textMuted};text-decoration:none;letter-spacing:0.5px;margin:0 8px">INSTAGRAM</a>` +
    `<span style="color:${COLORS.textMuted}">&middot;</span>` +
    `<a href="https://www.facebook.com/profile.php?id=100094870777995" target="_blank" style="${F};font-size:12px;font-weight:700;color:${COLORS.textMuted};text-decoration:none;letter-spacing:0.5px;margin:0 8px">FACEBOOK</a>` +
    `<span style="color:${COLORS.textMuted}">&middot;</span>` +
    `<a href="https://www.tiktok.com/@smudgeartspace" target="_blank" style="${F};font-size:12px;font-weight:700;color:${COLORS.textMuted};text-decoration:none;letter-spacing:0.5px;margin:0 8px">TIKTOK</a>` +
    `</p>` +
    `<p style="${F};font-size:11px;color:${COLORS.textMuted};margin:0;line-height:1.6">&copy; Smudge Hub 2026. <a href="${SITE}/hub/profile" style="color:${COLORS.textMuted}">Manage your account</a> &middot; <a href="${SITE}/hub/profile" style="color:${COLORS.textMuted}">Unsubscribe</a></p>` +
    `</td></tr></table>` +
    "</td></tr></table></body></html>"
  );
}

export function greenCard(innerHtml: string): string {
  return (
    `<table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;margin-bottom:24px"><tr><td style="padding:20px 24px;background:${COLORS.green};color:#ffffff;${F};font-weight:400;font-size:15px;line-height:1.8">` +
    innerHtml +
    "</td></tr></table>"
  );
}

export function greyCard(innerHtml: string): string {
  return (
    `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.border};border-radius:12px;overflow:hidden;margin-bottom:24px"><tr><td style="padding:20px 24px;color:${COLORS.text};${F};font-weight:400;font-size:15px;line-height:1.8">` +
    innerHtml +
    "</td></tr></table>"
  );
}
