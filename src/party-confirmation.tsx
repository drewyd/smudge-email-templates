/**
 * Long-form "It's Party Time!" confirmation email, authored as React Email
 * components.
 *
 * v0.2.0 (2026-05-27) — React Email migration. Builder signature unchanged
 * (call site in smudge-website's stripe-studio webhook continues to call
 * `buildPartyConfirmationEmail()` and gets back the same shape).
 *
 * History: see v0.1.0 party-confirmation.ts for the porting notes from
 * the original n8n Party Payment Success workflow.
 */

import * as React from "react";
import {
  BrandedShell,
  type SignOffBranding,
  COLORS,
  DetailRow,
  GreenCard,
  GreyCard,
  computeAgeAtParty,
  fmtDate,
  ordinalSuffix,
  renderEmail,
} from "./branded";
import type { StudioBranding, SubjectBranding, ThemeBranding } from "./branded";
import {
  resolveStudioShortName,
  tryResolveStudioEmailIdentity,
  resolveStudioVenue,
  usesDefaultStudioIdentity,
  resolveEmailTheme,
  useEmailTheme,
  EmailThemeProvider,
} from "./branded";
import { buildUnsubscribeUrl } from "./unsubscribe";
import type { UnsubscribeBranding } from "./unsubscribe";

const FONT_STACK = "'Montserrat', Arial, sans-serif";

export interface PartyConfirmationParams {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge?: string | number | null;
  childDob?: string | null;
  partyDate: string;
  partyTime: string;
  theme: string;
  cateringDisplay: string;
  dietaryMedical?: string;
  specialInterests?: string;
  photoConsent?: string;
  invitationColor?: string;
  amount: number;
  bookingId?: string;
  /**
   * Studio identity for the shared BrandedShell header/footer, the
   * unsubscribe link, and the studio's short name in the customer subject
   * ("Pip's Smudge Birthday Party is booked!" names the studio; the demo sent
   * that line from Wonky Comet's domain on 5 Sep 2026). Everything else in
   * this template (the greeting, the venue shown in the details card, the FAQ
   * copy) is booking body content, out of scope for this field, and stays
   * Smudge's own wording until the venue/catering data itself is threaded
   * per-studio.
   */
  branding?: StudioBranding & UnsubscribeBranding & SubjectBranding & SignOffBranding & ThemeBranding;
}

export interface PartyConfirmationResult {
  customerHtml: string;
  internalHtml: string;
  resolvedAge: number | null;
  customerSubject: string;
}

/* ----------------------------------------------------------------------- */
/*  FAQ sections, 13 items, verbatim from Emma-approved n8n template       */
/* ----------------------------------------------------------------------- */

interface FaqSection {
  /** Smudge's own title, minus the number: the render numbers the list. */
  title: string;
  /** Smudge's own wording, unchanged. */
  body: React.ReactNode;
  /** Wording for a studio whose venue this package does not know. `null` drops the item; omitted keeps `body`. */
  generic?: React.ReactNode | null;
  /** Title to use with `generic`, when the venue is named in the title too. */
  genericTitle?: string;
}

/**
 * The thirteen FAQ items, written for the studio the email belongs to.
 *
 * Six of them carry data this package does not hold per studio: Smudge's own
 * caterer, her street, the cafe across the road, her courtyard. On Smudge they
 * are exactly the words this template has always sent. On any other studio each
 * one either loses its venue sentence (`generic`) or does not appear at all
 * (`generic: null`) -- printing Smudge's parking directions under another
 * studio's name would send a family to the wrong suburb, which is worse than a
 * shorter FAQ. The remaining venue work (her OWN parking, her OWN caterer) is
 * the per-studio venue data still to be threaded; see the record.
 *
 * Titles carry no number: they are numbered at render time, so a clone's
 * shortened list still counts 1, 2, 3 and Smudge's own numbering is unchanged.
 */
function faqSections(opts: { studioShortName: string; berry: string }): FaqSection[] {
  const COLORS = { berry: opts.berry };
  return [
    {
      title: "Your Party Theme",
      body: "You can change your theme up to a week before your party date. Just reply to this email and we'll swap it over.",
    },
    {
      title: "Confirming Guest Numbers",
      body: "Your party includes up to 12 children. Extra guests are $40 each, up to a maximum of 20 children in total, including the birthday child. Just let us know your final numbers a week before the party.",
    },
    {
      title: "What About Adults?",
      body: "Whether you stay or drop off is completely up to you. Most families with children 7 and over drop off, and with the younger ones a parent usually stays. You're very welcome to settle into our courtyard or grab a coffee across the road.",
      generic:
        "Whether you stay or drop off is completely up to you. Most families with children 7 and over drop off, and with the younger ones a parent usually stays.",
    },
    {
      title: "Arrival",
      body: "You're welcome to arrive 15 minutes early to set up any decorations or food. We'll have the space ready for you.",
    },
    {
      title: "What to Expect on the Day",
      body: "Your 2-hour party includes guided art activities tailored to your chosen theme, free play time, and time for cake and food. Our team handles everything so you can enjoy the celebration!",
    },
    {
      title: "Catering (Optional)",
      body: (
        <>
          Catering is completely optional, and bringing your own food is always welcome. If
          you&apos;d like the food taken care of, Petite by Matilda is our favourite local
          caterer. Have a look at the{" "}
          <a
            href="https://www.smudgeartspace.com/book/parties/catering"
            style={{ color: COLORS.berry }}
          >
            catering menu
          </a>{" "}
          and email your order directly to{" "}
          <a href="mailto:catering@matildamontalbert.com" style={{ color: COLORS.berry }}>
            catering@matildamontalbert.com
          </a>{" "}
          at least 7 days before the party. There&apos;s a flat $20 delivery fee.
        </>
      ),
      generic: null,
    },
    {
      title: "BYO Food & Birthday Cake",
      body: (
        <>
          You&apos;re welcome to bring your own food and birthday cake. Please note we are a{" "}
          <strong>nut-free</strong> venue. We supply the plates, napkins and cake knife, so the food
          and the cake are all you need to bring.
        </>
      ),
    },
    {
      title: "Party Bags",
      body: `Every child takes home their art creations plus a ${opts.studioShortName} party bag with a paint tube, paintbrush, stickers, and a lollipop!`,
    },
    {
      title: "The Space & Courtyard",
      body: "You'll have exclusive use of our studio space. The courtyard has picnic tables with umbrellas for adults. In case of rain, we'll set up food and cake inside.",
      genericTitle: "The Space",
      generic: "You'll have exclusive use of our studio space.",
    },
    {
      title: "Decorations",
      body: "You're welcome to bring balloons and table decorations. We'll help you set up when you arrive early.",
    },
    {
      title: "Car Parking",
      body: "Free street parking is available on Union Road and Montrose Street. The Coles Local car park on Montrose Street offers 2 hours free.",
      generic: null,
    },
    {
      title: "Coffee?",
      body: "Sips & Stories is right across the road for all your coffee needs!",
      generic: null,
    },
    {
      title: "Questions?",
      body: "Simply reply to this email and we'll get back to you as soon as we can.",
    },
  ];
}

/**
 * `smudge` is the studio's own identity answering one question: does this
 * package hold this studio's venue data? Only Smudge's is written into these
 * strings, so only Smudge gets the six venue-bound items in full.
 */
function FaqSections({ smudge, studioShortName }: { smudge: boolean; studioShortName: string }) {
  const emailTheme = useEmailTheme();
  const COLORS = emailTheme.colors;
  const FONT_STACK = emailTheme.fontStack;
  const sections = faqSections({ studioShortName, berry: COLORS.berry }).flatMap((s) => {
    if (smudge) return [{ title: s.title, body: s.body }];
    if (s.generic === null) return [];
    return [{ title: s.genericTitle ?? s.title, body: s.generic ?? s.body }];
  });
  return (
    <>
      {sections.map((s, i) => (
        <div key={s.title} style={{ margin: "0 0 20px" }}>
          <p
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 700,
              fontSize: "16px",
              color: COLORS.text,
              margin: "0 0 8px",
            }}
          >
            {`${i + 1}. ${s.title}`}
          </p>
          <p
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 400,
              fontSize: "15px",
              color: COLORS.textLight,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {s.body}
          </p>
        </div>
      ))}
    </>
  );
}

/* ----------------------------------------------------------------------- */
/*  Age resolution                                                          */
/* ----------------------------------------------------------------------- */

function resolveAge(params: PartyConfirmationParams): number | null {
  if (params.childAge !== undefined && params.childAge !== null && params.childAge !== "") {
    const n =
      typeof params.childAge === "number" ? params.childAge : parseInt(String(params.childAge), 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return computeAgeAtParty(params.childDob, params.partyDate);
}

function formatDobForAdmin(dob: string | null | undefined): string {
  if (!dob) return "(not provided)";
  const d = new Date(dob + "T00:00:00");
  if (isNaN(d.getTime())) return `(unparseable: ${dob})`;
  return `${dob}, needs confirmation with parent`;
}

/* ----------------------------------------------------------------------- */
/*  Customer email                                                          */
/* ----------------------------------------------------------------------- */

export function PartyConfirmationEmail(params: PartyConfirmationParams) {
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
  const age = resolveAge(params);
  const safeName = (parentName.split(" ")[0] || parentName).trim();
  const safeDate = fmtDate(partyDate);
  const birthdayHeadline = age
    ? `${childName}'s ${age}${ordinalSuffix(age)} Birthday Party`
    : `${childName}'s Birthday Party`;
  const unsubUrl = buildUnsubscribeUrl(parentEmail ?? null, params.branding);
  // Local names that SHADOW the module constants above, so every style below
  // paints in the resolved theme; with no theme set they hold exactly the same
  // literals they always did.
  const emailTheme = resolveEmailTheme(params.branding);
  const COLORS = emailTheme.colors;
  const FONT_STACK = emailTheme.fontStack;
  // The venue card and the six venue-bound FAQ items read the studio, not a
  // literal: her name and her own street come from the same seven-field
  // identity the header and footer already use, and the items this package
  // cannot answer for her are dropped rather than answered with Smudge's.
  const identity = tryResolveStudioEmailIdentity(params.branding);
  const smudge = identity ? usesDefaultStudioIdentity(identity) : false;
  const venue = resolveStudioVenue(params.branding);
  const studioShortName = resolveStudioShortName(params.branding);

  return (
    <BrandedShell
      heading="It's Party Time!"
      signoff="We can't wait to celebrate with you!"
      unsubscribeUrl={unsubUrl}
      branding={params.branding}
    >
      <p
        style={{
          fontFamily: FONT_STACK,
          fontWeight: 400,
          fontSize: "16px",
          color: COLORS.text,
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        Hi {safeName},
      </p>
      <p
        style={{
          fontFamily: FONT_STACK,
          fontWeight: 400,
          fontSize: "16px",
          color: COLORS.text,
          margin: "0 0 24px",
          textAlign: "center",
        }}
      >
        Thank you for booking a birthday party at {identity ? identity.studioName : studioShortName}!
        We can&apos;t wait to celebrate
        with {childName}.
      </p>

      <GreenCard>
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            marginBottom: "8px",
            opacity: 0.8,
          }}
        >
          Party Booking Confirmed
        </div>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: "20px" }}>
          {birthdayHeadline}
        </div>
        <div style={{ textAlign: "center", marginTop: "4px" }}>
          {safeDate} · {partyTime}
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: "14px",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: 1.5,
            opacity: 0.92,
          }}
        >
          Your custom invitation will arrive shortly in a separate email.
        </div>
      </GreenCard>

      <GreyCard>
        <DetailRow label="Child" value={childName} />
        {age ? <DetailRow label="Age turning" value={String(age)} /> : null}
        <DetailRow label="Date" value={safeDate} />
        <DetailRow label="Time" value={partyTime} />
        {venue ? (
          <DetailRow
            label="Location"
            value={`${venue.studioName}, ${venue.addressLineCompact}`}
          />
        ) : null}
        <DetailRow label="Theme" value={theme} />
        <DetailRow label="Catering" value={cateringDisplay} />
        {dietaryMedical ? <DetailRow label="Dietary / Medical" value={dietaryMedical} /> : null}
        {specialInterests ? (
          <DetailRow label="Special Interests" value={specialInterests} marginBottom={false} />
        ) : null}
      </GreyCard>

      <div style={{ margin: "24px 0" }}>
        <h2
          style={{
            fontFamily: FONT_STACK,
            fontSize: "22px",
            fontWeight: 700,
            color: COLORS.text,
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          Everything You Need to Know
        </h2>
        <FaqSections smudge={smudge} studioShortName={studioShortName} />
      </div>
    </BrandedShell>
  );
}

/* ----------------------------------------------------------------------- */
/*  Internal notification email                                             */
/* ----------------------------------------------------------------------- */

export function PartyConfirmationInternalEmail(params: PartyConfirmationParams) {
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
  const age = resolveAge(params);
  const amountDollars = (amount / 100).toFixed(0);
  // Local names that SHADOW the module constants above, so every style below
  // paints in the resolved theme; with no theme set they hold exactly the same
  // literals they always did.
  const emailTheme = resolveEmailTheme(params.branding);
  const COLORS = emailTheme.colors;
  const FONT_STACK = emailTheme.fontStack;

  const rows: Array<[string, React.ReactNode]> = [
    ["Parent", parentName],
    ["Email", <a href={`mailto:${parentEmail}`}>{parentEmail}</a>],
    ["Phone", parentPhone],
    ["Child", childName],
    [
      "Age turning",
      age ? String(age) : `⚠️ Could not compute, DOB on file: ${formatDobForAdmin(params.childDob)}`,
    ],
    ["Date", fmtDate(partyDate)],
    ["Time", partyTime],
    ["Theme", theme],
    ["Catering", cateringDisplay],
    ["Amount", `$${amountDollars}`],
  ];
  if (dietaryMedical) rows.push(["Dietary / Medical", dietaryMedical]);
  if (specialInterests) rows.push(["Special Interests", specialInterests]);
  if (photoConsent) rows.push(["Photo Consent", photoConsent]);
  if (invitationColor) rows.push(["Invitation Colour", invitationColor]);
  if (bookingId) rows.push(["Booking ID", <code>{bookingId}</code>]);

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
          New Birthday Party Booking
        </h2>
        <table
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ fontFamily: FONT_STACK, fontSize: "14px", marginBottom: "16px" }}
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

export function buildPartyConfirmationEmail(
  params: PartyConfirmationParams,
): PartyConfirmationResult {
  const age = resolveAge(params);
  return {
    customerHtml: renderEmail(<PartyConfirmationEmail {...params} />),
    internalHtml: renderEmail(<PartyConfirmationInternalEmail {...params} />),
    resolvedAge: age,
    customerSubject: `${params.childName.split(" ")[0] || params.childName}'s ${resolveStudioShortName(params.branding)} Birthday Party is booked!`,
  };
}
