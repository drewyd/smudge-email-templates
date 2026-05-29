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
  COLORS,
  DetailRow,
  GreenCard,
  GreyCard,
  computeAgeAtParty,
  fmtDate,
  ordinalSuffix,
  renderEmail,
} from "./branded";
import { buildUnsubscribeUrl } from "./unsubscribe";

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
  title: string;
  body: React.ReactNode;
}

const FAQ_SECTIONS: FaqSection[] = [
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
    body: (
      <>
        If you&apos;ve chosen Petite Catering, our caterer Matilda at Mont Albert will be in
        touch to confirm your order. Contact them directly at{" "}
        <a href="mailto:catering@matildamontalbert.com" style={{ color: COLORS.berry }}>
          catering@matildamontalbert.com
        </a>
        .
      </>
    ),
  },
  {
    title: "7. BYO Food & Birthday Cake",
    body: (
      <>
        You&apos;re welcome to bring your own food and birthday cake. Please note we are a{" "}
        <strong>nut-free</strong> venue. Please bring your own plates, napkins, and a cake knife.
      </>
    ),
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
    body: "Sips & Stories is right across the road for all your coffee needs!",
  },
  {
    title: "13. Questions?",
    body: "Simply reply to this email and we'll get back to you as soon as we can.",
  },
];

function FaqSections() {
  return (
    <>
      {FAQ_SECTIONS.map((s) => (
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
            {s.title}
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
  const unsubUrl = buildUnsubscribeUrl(parentEmail ?? null);

  return (
    <BrandedShell heading="It's Party Time!" signoff="We can't wait to celebrate with you!" unsubscribeUrl={unsubUrl}>
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
        Thank you for booking a birthday party at Smudge Artspace! We can&apos;t wait to celebrate
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
        <DetailRow label="Location" value="Smudge Artspace, 102 Union Rd, Surrey Hills VIC 3127" />
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
        <FaqSections />
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
    customerSubject: `${params.childName.split(" ")[0] || params.childName}'s Smudge Birthday Party is booked!`,
  };
}
