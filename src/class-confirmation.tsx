/**
 * Class booking confirmation email, authored as React Email components.
 *
 * v0.2.0 (2026-05-27) — React Email migration. Builder signature unchanged
 * (call sites in smudge-website's stripe-studio webhook and the dashboard
 * manual-booking flow continue to call `buildClassConfirmationEmail()` and
 * get back the same { subject, customerHtml, internalHtml } shape).
 *
 * Visual contract: this template wraps its OWN shell (rather than reusing
 * BrandedShell) because the original n8n design — a full-width green hero
 * banner with "Booking Confirmed!" directly under the logo — does not fit
 * the BrandedShell mould (which centres a single-line h1). The shell here
 * still uses the canonical logo, nav and footer assets.
 *
 * History: see v0.1.0 class-confirmation.ts for the porting notes from the
 * original n8n workflow.
 */

import * as React from "react";
import {
  COLORS,
  IMG,
  SITE,
  fmtDate,
  fmtTime,
  renderEmail,
  resolveBranding,
  resolveStudioEmailIdentity,
} from "./branded";
import type { StudioBranding } from "./branded";
import { buildUnsubscribeUrl } from "./unsubscribe";
import type { UnsubscribeBranding } from "./unsubscribe";

/**
 * This template wraps its own shell (see the file header comment) rather
 * than reusing BrandedShell, so it duplicates the masthead logo and the
 * footer address/contact block. Both are threaded through the same
 * `branding` field BrandedShell and party-confirmation.tsx use, so a studio
 * gets one consistent identity across every confirmation email. The two
 * defaults below (`FOOTER_ADDRESS_FALLBACK`, `CONTACT_EMAIL_FALLBACK`) are
 * kept local rather than pulled from branded.tsx's resolveBranding() because
 * they were, and still are, worded slightly differently from the shared
 * defaults there ("102 Union Rd, Surrey Hills VIC 3127" here vs
 * "102 Union Road, Surrey Hills, Victoria, Australia 3127" in
 * BrandedShell/HubShell) -- reusing the shared string would have been a
 * quiet copy change on Smudge's own email, which is exactly what this
 * change must not do.
 */
const FOOTER_ADDRESS_FALLBACK = "102 Union Rd, Surrey Hills VIC 3127";
const CONTACT_EMAIL_FALLBACK = "hello@smudgeartspace.com";

const FONT_STACK = "'Montserrat', Arial, sans-serif";

export interface ClassConfirmationChild {
  name: string;
  dob?: string | null;
}

export interface ClassConfirmationParams {
  parentName: string;
  parentEmail?: string;
  className: string;
  children: ClassConfirmationChild[];
  dates: string[];
  amountCents: number;
  receiptUrl?: string | null;
  giftCardLine?: string;
  giftCardDiscount?: number;
  giftCardCode?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  /**
   * Studio identity for this template's own header/footer chrome (masthead
   * logo, small footer logo, footer address + contact line, unsubscribe
   * line) only. The greeting sentence, the "Location" card inside the body
   * (which shows the venue the class is actually AT, booking data, not
   * identity) and the subject line stay Smudge's own wording -- out of
   * scope here, tracked separately.
   */
  branding?: StudioBranding &
    UnsubscribeBranding & {
      contactEmail?: string;
      /**
       * Footer address in THIS template's own historical short format
       * ("102 Union Rd, Surrey Hills VIC 3127") -- deliberately separate
       * from StudioBranding.addressLine (the longer form BrandedShell/
       * HubShell use for the same physical address). Reusing addressLine
       * here was a real bug (fixed 4 Sep 2026, L15b): every real caller
       * passes identity.ts's fully-populated emailBranding object, so
       * `branding?.addressLine || FOOTER_ADDRESS_FALLBACK` never actually
       * fell back and Smudge's own class-confirmation footer silently
       * started rendering the long-form address instead of its usual
       * short one. Caught by operations-dashboard's
       * src/test/brand-colour-rendering.test.ts golden master.
       */
      addressLineCompact?: string;
    };
}

export interface ClassConfirmationResult {
  subject: string;
  customerHtml: string;
  internalHtml: string;
}

const TIME_MAP: Record<string, Record<number, string>> = {
  "Art Play Lab": { 2: "10am – 11:30am", 3: "10am – 11:30am", 4: "10am – 11:30am" },
  "Kinder Art": { 3: "1:30pm – 3pm", 4: "1:30pm – 3pm" },
  "After School Creators": { 2: "4pm – 5pm", 4: "4pm – 5pm" },
  "Art Explorers": { 2: "1:30pm – 3pm" },
};

/* ----------------------------------------------------------------------- */
/*  Building blocks                                                         */
/* ----------------------------------------------------------------------- */

function WhiteCard({ children }: { children: React.ReactNode }) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        background: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        marginBottom: "24px",
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "20px 24px", fontFamily: FONT_STACK }}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

function LabelValue({
  label,
  value,
  marginBottom = true,
  valueColor = COLORS.text,
  valueSize = "16px",
}: {
  label: string;
  value: React.ReactNode;
  marginBottom?: boolean;
  valueColor?: string;
  valueSize?: string;
}) {
  return (
    <div style={marginBottom ? { marginBottom: "12px" } : undefined}>
      <span
        style={{
          fontFamily: FONT_STACK,
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
      <span
        style={{
          fontFamily: FONT_STACK,
          fontWeight: 400,
          fontSize: valueSize,
          color: valueColor,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/*  Time + gift card resolution (unchanged logic from v0.1)                */
/* ----------------------------------------------------------------------- */

function resolveSessionTime(params: ClassConfirmationParams): string | null {
  const { sessionStartTime, sessionEndTime, className, dates } = params;
  if (sessionStartTime && sessionEndTime) {
    return `${fmtTime(sessionStartTime)} – ${fmtTime(sessionEndTime)}`;
  }
  if (dates.length > 0) {
    const dt = new Date(dates[0] + "T00:00:00");
    const dow = dt.getDay();
    const schedule = TIME_MAP[className];
    if (schedule && schedule[dow]) return schedule[dow];
  }
  return null;
}

function resolveGiftCard(params: ClassConfirmationParams):
  | { label: string; value: string; muted?: boolean }
  | null {
  const { giftCardLine, giftCardDiscount, giftCardCode } = params;
  if (giftCardLine) {
    return { label: "Gift Card", value: giftCardLine, muted: true };
  }
  if (giftCardDiscount && giftCardDiscount > 0 && giftCardCode) {
    return {
      label: "Gift Card Applied",
      value: `-$${(giftCardDiscount / 100).toFixed(2)} (${giftCardCode})`,
    };
  }
  return null;
}

/* ----------------------------------------------------------------------- */
/*  Customer email                                                          */
/* ----------------------------------------------------------------------- */

export function ClassConfirmationEmail(params: ClassConfirmationParams) {
  const { parentName, parentEmail, className, children, dates, amountCents, receiptUrl, branding } = params;

  const safeParent = (parentName.split(" ")[0] || parentName).trim();
  const childNames = children.map((c) => c.name).join(", ");
  const amountDollars = (amountCents / 100).toFixed(2);
  const sessionTime = resolveSessionTime(params);
  const giftCard = resolveGiftCard(params);
  const unsubUrl = buildUnsubscribeUrl(parentEmail ?? null, branding);
  const b = resolveBranding(branding);
  const identity = resolveStudioEmailIdentity(branding);
  const footerAddressLine = identity.addressLineCompact || FOOTER_ADDRESS_FALLBACK;
  const logoSmallSrc = b.logoSmallUrl;
  const contactEmail = identity.contactEmail || CONTACT_EMAIL_FALLBACK;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <style
          dangerouslySetInnerHTML={{
            __html:
              ":root{color-scheme:light;supported-color-schemes:light}" +
              "body,.bg-w,table,td{background-color:#f0f0f0}" +
              ".card,.card td{background-color:#ffffff}" +
              ".green-hero td{background-color:#099f4a !important}" +
              "@media only screen and (max-width:480px){" +
              // The bottom value is NOT zero. The masthead is the two-line
              // Smudge Artspace lockup (800x286, ~72px tall at width 200) and
              // the green hero starts immediately below it, so a zero here put
              // ARTSPACE against the green box on every phone. Emma, 16 Aug.
              "td.m-pad-top{padding:24px 16px 24px !important}" +
              "td.m-pad-body{padding:0 16px 20px !important}" +
              "td.m-pad-footer{padding:0 16px 24px !important}" +
              "}",
          }}
        />
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
                        style={{ padding: "40px 20px 32px", backgroundColor: COLORS.bgCard }}
                      >
                        <a href={SITE} target="_blank" rel="noreferrer">
                          <img
                            src={b.logoUrl}
                            alt={b.studioName}
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
                      <td
                        className="card m-pad-body"
                        align="left"
                        style={{ padding: "0 40px 20px", backgroundColor: COLORS.bgCard }}
                      >
                        {/*
                         * Green hero banner. The background must be on the
                         * inner <td>, not the outer <table>, otherwise the
                         * shell-level `.card td { background-color:#ffffff }`
                         * rule paints the inner cell white and the H1's white
                         * text disappears against it. The .green-hero td
                         * @media rule above re-enforces the green with
                         * !important so the cascade can't reset it.
                         */}
                        <table
                          className="green-hero"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{
                            borderRadius: "16px",
                            overflow: "hidden",
                            margin: "0 0 24px",
                          }}
                        >
                          <tbody>
                            <tr>
                              <td
                                align="center"
                                style={{
                                  padding: "28px 24px",
                                  backgroundColor: COLORS.green,
                                }}
                              >
                                <h1
                                  style={{
                                    fontFamily: FONT_STACK,
                                    fontWeight: 700,
                                    fontSize: "26px",
                                    color: "#ffffff",
                                    margin: 0,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  Booking Confirmed!
                                </h1>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontWeight: 400,
                            fontSize: "16px",
                            color: COLORS.text,
                            margin: "0 0 16px",
                            textAlign: "left",
                          }}
                        >
                          Hi {safeParent},
                        </p>
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontWeight: 400,
                            fontSize: "16px",
                            color: COLORS.text,
                            margin: "0 0 24px",
                            textAlign: "left",
                          }}
                        >
                          {/* Body copy, deliberately left Smudge's own wording -- see the
                              branding field's doc comment above. */}
                          Thank you for booking with Smudge Artspace! Here are your booking details:
                        </p>

                        {/* Details card */}
                        <WhiteCard>
                          <LabelValue label="Class" value={className} />
                          <LabelValue label="Children" value={childNames} />
                          <LabelValue
                            label="Dates"
                            value={
                              <>
                                {dates.map((d, i) => (
                                  <React.Fragment key={i}>
                                    {fmtDate(d)}
                                    {i < dates.length - 1 ? <br /> : null}
                                  </React.Fragment>
                                ))}
                              </>
                            }
                          />
                          {sessionTime ? <LabelValue label="Time" value={sessionTime} /> : null}
                          {giftCard ? (
                            <LabelValue
                              label={giftCard.label}
                              value={giftCard.value}
                              valueColor={giftCard.muted ? COLORS.textLight : COLORS.text}
                              valueSize={giftCard.muted ? "15px" : "16px"}
                            />
                          ) : null}
                          <LabelValue
                            label="Total Paid"
                            value={`$${amountDollars} AUD`}
                            marginBottom={false}
                          />
                        </WhiteCard>

                        {/* What to bring */}
                        <WhiteCard>
                          <p
                            style={{
                              fontFamily: FONT_STACK,
                              fontWeight: 700,
                              fontSize: "16px",
                              color: COLORS.text,
                              margin: "0 0 8px",
                            }}
                          >
                            What to bring
                          </p>
                          <ul
                            style={{
                              fontFamily: FONT_STACK,
                              fontWeight: 400,
                              fontSize: "15px",
                              color: COLORS.textLight,
                              margin: 0,
                              paddingLeft: "20px",
                              lineHeight: 1.8,
                            }}
                          >
                            <li>Water bottle</li>
                            <li>Mess-friendly clothes</li>
                            <li>Spare outfit (just in case!)</li>
                            <li>A bag for taking home creations</li>
                          </ul>
                        </WhiteCard>

                        {/* Location */}
                        <WhiteCard>
                          <p
                            style={{
                              fontFamily: FONT_STACK,
                              fontWeight: 700,
                              fontSize: "16px",
                              color: COLORS.text,
                              margin: "0 0 8px",
                            }}
                          >
                            Location
                          </p>
                          <p
                            style={{
                              fontFamily: FONT_STACK,
                              fontWeight: 400,
                              fontSize: "15px",
                              color: COLORS.textLight,
                              margin: 0,
                              lineHeight: 1.5,
                            }}
                          >
                            Smudge Artspace
                            <br />
                            102 Union Rd, Surrey Hills VIC 3127
                          </p>
                        </WhiteCard>

                        {receiptUrl ? (
                          <p
                            style={{
                              fontFamily: FONT_STACK,
                              fontWeight: 400,
                              fontSize: "14px",
                              margin: "0 0 16px",
                            }}
                          >
                            <a
                              href={receiptUrl}
                              style={{ color: COLORS.berry, textDecoration: "underline" }}
                            >
                              View your Stripe receipt
                            </a>
                          </p>
                        ) : null}

                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontWeight: 400,
                            fontSize: "16px",
                            color: COLORS.text,
                            margin: "0 0 8px",
                          }}
                        >
                          We can&apos;t wait to create with you!
                        </p>
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontWeight: 400,
                            fontSize: "16px",
                            color: COLORS.text,
                            margin: "0 0 4px",
                          }}
                        >
                          Thanks so much,
                        </p>
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontWeight: 400,
                            fontSize: "16px",
                            color: COLORS.text,
                            margin: 0,
                          }}
                        >
                          Emma xx
                        </p>

                        {/* Unsubscribe footer (compliance) */}
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontSize: "11px",
                            color: COLORS.textMuted,
                            margin: "16px 0 0",
                            textAlign: "center",
                            lineHeight: 1.6,
                          }}
                        >
                          You received this because you booked with {b.studioName}.{" "}
                          <a
                            href={unsubUrl}
                            style={{ color: COLORS.textMuted, textDecoration: "underline" }}
                          >
                            Unsubscribe
                          </a>
                          .
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        className="m-pad-footer"
                        align="center"
                        style={{ padding: "8px 40px 24px" }}
                      >
                        <img
                          src={logoSmallSrc}
                          alt={b.studioName}
                          width="119"
                          style={{
                            display: "block",
                            maxWidth: "119px",
                            height: "auto",
                            border: 0,
                            margin: "0 auto",
                          }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
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
                            margin: "0 0 4px",
                          }}
                        >
                          {b.studioName} · {footerAddressLine}
                        </p>
                        <p
                          style={{
                            fontFamily: FONT_STACK,
                            fontSize: "12px",
                            color: COLORS.textMuted,
                            margin: 0,
                          }}
                        >
                          <a
                            href={`mailto:${contactEmail}`}
                            style={{ color: COLORS.berry, textDecoration: "none" }}
                          >
                            {contactEmail}
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
/*  Internal notification email                                             */
/* ----------------------------------------------------------------------- */

export function ClassConfirmationInternalEmail(params: ClassConfirmationParams) {
  const { parentName, className, children, dates, amountCents, giftCardLine } = params;
  const amountDollars = (amountCents / 100).toFixed(2);

  const rows: Array<[string, React.ReactNode]> = [
    ["Parent", parentName],
    ["Class", className],
    ["Children", children.map((c) => c.name).join(", ")],
    [
      "Dates",
      <>
        {dates.map((d, i) => (
          <React.Fragment key={i}>
            {fmtDate(d)}
            {i < dates.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </>,
    ],
    ["Amount", `$${amountDollars} AUD`],
  ];
  if (giftCardLine) rows.push(["Gift Card", giftCardLine]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          padding: "20px",
          fontFamily: FONT_STACK,
          fontSize: "14px",
          color: COLORS.text,
          lineHeight: 1.6,
        }}
      >
        <h2
          style={{
            fontFamily: FONT_STACK,
            fontSize: "18px",
            color: COLORS.green,
            margin: "0 0 16px",
          }}
        >
          New Class Booking
        </h2>
        <table
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{
            fontFamily: FONT_STACK,
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          <tbody>
            {rows.map(([label, value], i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: "4px 8px",
                    fontFamily: FONT_STACK,
                    fontWeight: 700,
                    fontSize: "14px",
                    verticalAlign: "top",
                  }}
                >
                  {label}:
                </td>
                <td
                  style={{
                    padding: "4px 8px",
                    fontFamily: FONT_STACK,
                    fontWeight: 400,
                    fontSize: "14px",
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "16px 0 0", fontSize: "12px", color: COLORS.textMuted }}>
          Reply to this email to contact the parent directly.
        </p>
      </body>
    </html>
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
    customerHtml: renderEmail(<ClassConfirmationEmail {...params} />),
    internalHtml: renderEmail(<ClassConfirmationInternalEmail {...params} />),
  };
}
