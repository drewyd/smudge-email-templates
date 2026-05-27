/**
 * Branded email shells + helpers as React components.
 *
 * v0.2.0 (2026-05-27) — React Email migration. The old hand-rolled HTML
 * string helpers (emailWrap, hubEmailWrap, greenCard, etc.) are kept as
 * sync wrappers that render the React components via renderToStaticMarkup
 * so existing call sites continue to work unchanged.
 *
 * New templates should author with the React components directly:
 *
 *   import { BrandedShell, DetailRow, GreenCard, renderEmail } from
 *     '@smudge/email-templates/branded';
 *
 *   const html = renderEmail(
 *     <BrandedShell heading="It's Party Time!" signoff="See you soon!">
 *       <p>Hi {firstName},</p>
 *       <GreenCard>...</GreenCard>
 *       <DetailRow label="Date" value="Fri 6 June" />
 *     </BrandedShell>
 *   );
 */

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* ----------------------------------------------------------------------- */
/*  Constants + pure helpers (unchanged from v0.1)                          */
/* ----------------------------------------------------------------------- */

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

const FONT_STACK = "'Montserrat', Arial, sans-serif";
const HUB_DISPLAY_STACK = "'Gloock', 'Playfair Display', Georgia, 'Times New Roman', serif";

/**
 * Shared <style> block injected into both shells. The mobile @media block
 * tightens padding + font-sizes on phones (<=480px wide) so the 600px
 * desktop layout doesn't feel cramped after collapsing to viewport width.
 * `!important` is required to override inline styles since email clients
 * always favour inline over <style>.
 */
const SHELL_CSS =
  ":root{color-scheme:light;supported-color-schemes:light}" +
  "body,.bg-w,table,td{background-color:#f0f0f0}" +
  ".card,.card td{background-color:#ffffff}" +
  "@media only screen and (max-width:480px){" +
  "td.m-pad-top{padding:24px 16px 0 !important}" +
  "td.m-pad-body{padding:0 16px 20px !important}" +
  "td.m-pad-content{padding:0 16px !important}" +
  "td.m-pad-signoff{padding:0 16px 10px !important}" +
  "td.m-pad-signoff-hub{padding:20px 16px 24px !important}" +
  "td.m-pad-footer{padding:0 16px 24px !important}" +
  "td.m-nav-cell{padding:0 6px !important}" +
  "a.m-nav-link{font-size:11px !important;letter-spacing:0.3px !important}" +
  "h1.m-display{font-size:24px !important;line-height:1.15 !important}" +
  "h1.m-hub-display{font-size:30px !important;line-height:1.1 !important}" +
  "}";

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

export function ordinalSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "st";
  if (mod10 === 2 && mod100 !== 12) return "nd";
  if (mod10 === 3 && mod100 !== 13) return "rd";
  return "th";
}

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

/* ----------------------------------------------------------------------- */
/*  Render helper — sync wrapper around renderToStaticMarkup                */
/* ----------------------------------------------------------------------- */

/**
 * Render a React Email component tree to a static HTML string.
 *
 * Prepends `<!DOCTYPE html>` so the resulting markup renders in standards
 * mode across every major email client (the old hand-rolled emailWrap
 * omitted the doctype, which forced quirks mode in some Outlook builds).
 */
export function renderEmail(node: React.ReactElement): string {
  return `<!DOCTYPE html>${renderToStaticMarkup(node)}`;
}

/* ----------------------------------------------------------------------- */
/*  Helper components — DetailRow, GreenCard, GreyCard                      */
/* ----------------------------------------------------------------------- */

export interface DetailRowProps {
  label: string;
  /**
   * Display value. Strings render as React text nodes (auto-escaped). For
   * pre-formatted HTML (e.g. lists with <br/>), pass a React node instead.
   */
  value: React.ReactNode;
  marginBottom?: boolean;
}

export function DetailRow({ label, value, marginBottom = true }: DetailRowProps) {
  return (
    <div style={marginBottom ? { marginBottom: "12px" } : undefined}>
      <span
        style={{
          fontWeight: 700,
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          color: COLORS.textLight,
        }}
      >
        {label}
      </span>
      <br />
      <span style={{ fontWeight: 400, fontSize: "16px" }}>{value}</span>
    </div>
  );
}

export function GreenCard({ children }: { children: React.ReactNode }) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "20px 24px",
              background: COLORS.green,
              color: "#ffffff",
              fontFamily: FONT_STACK,
              fontWeight: 400,
              fontSize: "15px",
              lineHeight: 1.8,
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function GreyCard({ children }: { children: React.ReactNode }) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "24px",
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "20px 24px",
              color: COLORS.text,
              fontFamily: FONT_STACK,
              fontWeight: 400,
              fontSize: "15px",
              lineHeight: 1.8,
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ----------------------------------------------------------------------- */
/*  Internal helpers — Header (logo + nav)                                  */
/* ----------------------------------------------------------------------- */

interface NavLink {
  href: string;
  label: string;
  color: string;
}

const STUDIO_NAV: NavLink[] = [
  { href: `${SITE}/art-classes`, label: "CLASSES", color: COLORS.orange },
  { href: `${SITE}/book/holidays`, label: "HOLIDAY PROGRAMS", color: COLORS.primary },
  { href: `${SITE}/book/parties`, label: "PARTIES", color: COLORS.green },
  { href: `${SITE}/book/gift-cards`, label: "GIFT CARDS", color: COLORS.berry },
];

const HUB_NAV: NavLink[] = [
  { href: `${SITE}/hub`, label: "ART THEMES", color: COLORS.berry },
  { href: `${SITE}/hub/community`, label: "COMMUNITY", color: COLORS.primary },
  { href: `${SITE}/hub/gallery`, label: "GALLERY", color: COLORS.green },
];

function NavStrip({ links }: { links: NavLink[] }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
      <tbody>
        <tr>
          {links.map((link) => (
            <td key={link.href} className="m-nav-cell" style={{ padding: "0 14px" }}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="m-nav-link"
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: link.color,
                  textDecoration: "none",
                }}
              >
                {link.label}
              </a>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function Logo({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <img
        src={IMG.logo}
        alt="Smudge Artspace"
        width="200"
        style={{ display: "block", maxWidth: "200px", width: "100%", height: "auto", border: 0 }}
      />
    </a>
  );
}

function LogoSmall({ alt = "Smudge Artspace" }: { alt?: string }) {
  return (
    <img
      src={IMG.logoSmall}
      alt={alt}
      width="119"
      style={{ display: "block", maxWidth: "119px", height: "auto", border: 0, margin: "0 auto" }}
    />
  );
}

/* ----------------------------------------------------------------------- */
/*  Studio shell — BrandedShell                                             */
/* ----------------------------------------------------------------------- */

export interface BrandedShellProps {
  heading: string;
  signoff?: string;
  children: React.ReactNode;
}

/**
 * Full-fat Smudge Studio email shell: logo, multi-colour studio nav,
 * centered <h1> heading, body slot, Emma signature, footer copyright.
 */
export function BrandedShell({ heading, signoff, children }: BrandedShellProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: COLORS.bgOuter,
          WebkitTextSizeAdjust: "100%",
          fontFamily: FONT_STACK,
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ backgroundColor: COLORS.bgOuter }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "20px 0" }}>
                <table
                  className="card"
                  role="presentation"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{
                    maxWidth: "600px",
                    width: "100%",
                    backgroundColor: COLORS.bgCard,
                    borderRadius: "8px",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        className="card m-pad-top"
                        align="center"
                        style={{ padding: "40px 20px 0", backgroundColor: COLORS.bgCard }}
                      >
                        <Logo href={SITE} />
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: "16px 10px 40px" }}>
                        <NavStrip links={STUDIO_NAV} />
                      </td>
                    </tr>
                    <tr>
                      <td
                        className="card m-pad-content"
                        align="center"
                        style={{ padding: "0 40px", backgroundColor: COLORS.bgCard }}
                      >
                        <h1
                          className="m-display"
                          style={{
                            fontFamily: FONT_STACK,
                            fontSize: "28px",
                            fontWeight: 700,
                            color: COLORS.text,
                            margin: "0 0 20px",
                            lineHeight: 1.2,
                            textAlign: "center",
                          }}
                        >
                          {heading}
                        </h1>
                        {children}
                      </td>
                    </tr>
                    <tr>
                      <td className="m-pad-signoff" align="center" style={{ padding: "0 40px 10px" }}>
                        {signoff ? (
                          <p
                            style={{
                              fontFamily: FONT_STACK,
                              fontWeight: 400,
                              fontSize: "16px",
                              color: COLORS.text,
                              margin: "0 0 16px",
                            }}
                          >
                            {signoff}
                          </p>
                        ) : null}
                        <img
                          src={IMG.emma}
                          alt="Emma"
                          width="120"
                          style={{
                            display: "block",
                            maxWidth: "120px",
                            height: "auto",
                            border: 0,
                            margin: "0 auto 16px",
                          }}
                        />
                        <LogoSmall />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table
                  role="presentation"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ maxWidth: "600px", width: "100%" }}
                >
                  <tbody>
                    <tr>
                      <td align="center" style={{ padding: "16px 20px" }}>
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontSize: "12px",
                            color: COLORS.textMuted,
                            margin: 0,
                          }}
                        >
                          © Smudge Artspace 2026. All rights reserved
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

/* ----------------------------------------------------------------------- */
/*  Hub shell — HubShell                                                    */
/* ----------------------------------------------------------------------- */

export interface HubShellProps {
  heading: string;
  signoff?: string;
  children: React.ReactNode;
}

/**
 * Hub-flavoured email shell: same logo header, Gloock serif heading,
 * berry accent, Hub-specific nav (Themes / Community / Gallery),
 * and richer footer with full address + socials.
 */
export function HubShell({ heading, signoff, children }: HubShellProps) {
  const HUB_HOME = `${SITE}/hub`;
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Gloock&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: COLORS.bgOuter,
          WebkitTextSizeAdjust: "100%",
          fontFamily: FONT_STACK,
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ backgroundColor: COLORS.bgOuter }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "20px 0" }}>
                <table
                  className="card"
                  role="presentation"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{
                    maxWidth: "600px",
                    width: "100%",
                    backgroundColor: COLORS.bgCard,
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        className="card m-pad-top"
                        align="center"
                        style={{ padding: "40px 20px 0", backgroundColor: COLORS.bgCard }}
                      >
                        <a href={HUB_HOME} target="_blank" rel="noreferrer">
                          <img
                            src={IMG.logo}
                            alt="Smudge Hub"
                            width="200"
                            style={{
                              display: "block",
                              maxWidth: "200px",
                              width: "100%",
                              height: "auto",
                              border: 0,
                            }}
                          />
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: "14px 10px 32px" }}>
                        <NavStrip links={HUB_NAV} />
                      </td>
                    </tr>
                    <tr>
                      <td
                        className="card m-pad-content"
                        align="center"
                        style={{ padding: "0 40px", backgroundColor: COLORS.bgCard }}
                      >
                        <h1
                          className="m-hub-display"
                          style={{
                            fontFamily: HUB_DISPLAY_STACK,
                            fontSize: "38px",
                            fontWeight: 400,
                            color: COLORS.text,
                            margin: "0 0 20px",
                            lineHeight: 1.1,
                            textAlign: "center",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {heading}
                        </h1>
                        {children}
                      </td>
                    </tr>
                    {signoff ? (
                      <tr>
                        <td
                          className="card m-pad-signoff-hub"
                          align="left"
                          style={{ padding: "24px 40px 32px", backgroundColor: COLORS.bgCard }}
                        >
                          <p
                            style={{
                              fontFamily: FONT_STACK,
                              fontWeight: 400,
                              fontSize: "16px",
                              color: COLORS.text,
                              margin: 0,
                              lineHeight: 1.7,
                            }}
                          >
                            {signoff.split("\n").map((line, i, arr) => (
                              <React.Fragment key={i}>
                                {line}
                                {i < arr.length - 1 ? <br /> : null}
                              </React.Fragment>
                            ))}
                          </p>
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <td
                        className="card"
                        align="center"
                        style={{ padding: "0 40px 32px", backgroundColor: COLORS.bgCard }}
                      >
                        <LogoSmall alt="Smudge Hub" />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table
                  role="presentation"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ maxWidth: "600px", width: "100%" }}
                >
                  <tbody>
                    <tr>
                      <td align="center" style={{ padding: "24px 20px 8px" }}>
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontSize: "13px",
                            color: COLORS.text,
                            margin: "0 0 6px",
                            fontWeight: 700,
                          }}
                        >
                          Smudge Artspace
                        </p>
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontSize: "12px",
                            color: COLORS.textMuted,
                            margin: "0 0 16px",
                            lineHeight: 1.6,
                          }}
                        >
                          102 Union Road, Surrey Hills, Victoria, Australia 3127
                        </p>
                        <p style={{ margin: "0 0 16px" }}>
                          <a
                            href="https://www.instagram.com/smudgeartspace"
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontFamily: FONT_STACK,
                              fontSize: "12px",
                              fontWeight: 700,
                              color: COLORS.textMuted,
                              textDecoration: "none",
                              letterSpacing: "0.5px",
                              margin: "0 8px",
                            }}
                          >
                            INSTAGRAM
                          </a>
                          <span style={{ color: COLORS.textMuted }}>·</span>
                          <a
                            href="https://www.facebook.com/profile.php?id=100094870777995"
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontFamily: FONT_STACK,
                              fontSize: "12px",
                              fontWeight: 700,
                              color: COLORS.textMuted,
                              textDecoration: "none",
                              letterSpacing: "0.5px",
                              margin: "0 8px",
                            }}
                          >
                            FACEBOOK
                          </a>
                          <span style={{ color: COLORS.textMuted }}>·</span>
                          <a
                            href="https://www.tiktok.com/@smudgeartspace"
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontFamily: FONT_STACK,
                              fontSize: "12px",
                              fontWeight: 700,
                              color: COLORS.textMuted,
                              textDecoration: "none",
                              letterSpacing: "0.5px",
                              margin: "0 8px",
                            }}
                          >
                            TIKTOK
                          </a>
                        </p>
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontSize: "11px",
                            color: COLORS.textMuted,
                            margin: 0,
                            lineHeight: 1.6,
                          }}
                        >
                          © Smudge Hub 2026.{" "}
                          <a
                            href={`${SITE}/hub/profile`}
                            style={{ color: COLORS.textMuted }}
                          >
                            Manage your account
                          </a>{" "}
                          ·{" "}
                          <a
                            href={`${SITE}/hub/profile`}
                            style={{ color: COLORS.textMuted }}
                          >
                            Unsubscribe
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

/* ----------------------------------------------------------------------- */
/*  Legacy string-based API — kept for backward compatibility               */
/* ----------------------------------------------------------------------- */

/**
 * Render a Smudge Studio email from a hand-rolled HTML body string.
 *
 * @deprecated Prefer composing `<BrandedShell>` with React children and
 *   calling `renderEmail()`. This wrapper exists so existing call sites
 *   (party-confirmation v0.1, blueprint emails, stripe-studio inline)
 *   keep working unchanged during the React Email rollout.
 */
export function emailWrap(heading: string, bodyHtml: string, signoff?: string): string {
  return renderEmail(
    <BrandedShell heading={heading} signoff={signoff}>
      <span dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </BrandedShell>,
  );
}

/**
 * Render a Smudge Hub email from a hand-rolled HTML body string.
 *
 * @deprecated Prefer composing `<HubShell>` with React children and
 *   calling `renderEmail()`. This wrapper exists so existing call sites
 *   (hub-onboarding cron) keep working unchanged.
 */
export function hubEmailWrap(heading: string, bodyHtml: string, signoff?: string): string {
  return renderEmail(
    <HubShell heading={heading} signoff={signoff}>
      <span dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </HubShell>,
  );
}

/** @deprecated Use the `<GreenCard>` React component. */
export function greenCard(innerHtml: string): string {
  return renderToStaticMarkup(
    <GreenCard>
      <span dangerouslySetInnerHTML={{ __html: innerHtml }} />
    </GreenCard>,
  );
}

/** @deprecated Use the `<GreyCard>` React component. */
export function greyCard(innerHtml: string): string {
  return renderToStaticMarkup(
    <GreyCard>
      <span dangerouslySetInnerHTML={{ __html: innerHtml }} />
    </GreyCard>,
  );
}

/** @deprecated Use the `<DetailRow>` React component. */
export function detailRow(label: string, value: string, marginBottom = true): string {
  return renderToStaticMarkup(<DetailRow label={label} value={value} marginBottom={marginBottom} />);
}
