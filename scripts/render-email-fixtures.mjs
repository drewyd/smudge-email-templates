/**
 * Renders a fixed set of fixtures through every shared-package entry point
 * that carries the studio header/footer chrome (BrandedShell, HubShell, the
 * legacy emailWrap/hubEmailWrap wrappers, the unsubscribe helpers, and the
 * two confirmation-email builders). Returns one { name: html } object.
 *
 * Exported as a function (not a script that only prints) so
 * email-identity-byte-identical.mjs can import it directly instead of
 * shelling out and parsing stdout.
 *
 * `branding` is undefined for "render exactly what Smudge ships today" or a
 * StudioBranding-shaped object (see L15b.md) for "render as a clone would".
 */
import {
  BrandedShell,
  HubShell,
  renderEmail,
  emailWrap,
  hubEmailWrap,
} from "../src/branded.tsx";
import {
  buildUnsubscribeUrl,
  buildUnsubscribeHeaders,
  unsubscribeFooterHtml,
} from "../src/unsubscribe.ts";
import { buildClassConfirmationEmail } from "../src/class-confirmation.tsx";
import { buildPartyConfirmationEmail } from "../src/party-confirmation.tsx";
import * as React from "react";

export function renderFixtures(branding) {
  const unsubBranding = branding
    ? { unsubscribeDomain: branding.unsubscribeDomain, studioName: branding.studioName }
    : undefined;

  const classFixture = {
    parentName: "Jamie Nguyen",
    parentEmail: "jamie@example.com",
    className: "Art Play Lab",
    children: [{ name: "Ruby Nguyen", dob: "2021-03-04" }],
    dates: ["2026-10-06", "2026-10-13", "2026-10-20"],
    amountCents: 22500,
    receiptUrl: "https://pay.stripe.com/receipts/abc123",
    sessionStartTime: "10:00:00",
    sessionEndTime: "11:30:00",
    branding,
  };

  const partyFixture = {
    parentName: "Priya Shah",
    parentEmail: "priya@example.com",
    parentPhone: "0400 000 000",
    childName: "Arav Shah",
    childAge: 6,
    childDob: "2020-05-01",
    partyDate: "2026-11-14",
    partyTime: "10:00:00",
    theme: "Dinosaur Dig",
    cateringDisplay: "Petite by Matilda (self-arranged)",
    branding,
  };

  const out = {};

  out["branded-shell"] = renderEmail(
    React.createElement(
      BrandedShell,
      {
        heading: "It's Party Time!",
        signoff: "Thanks so much,\nEmma xx",
        unsubscribeUrl: buildUnsubscribeUrl("jamie@example.com", unsubBranding),
        branding,
      },
      React.createElement("p", null, "Hi Jamie, this is a fixed body fixture."),
    ),
  );

  out["hub-shell"] = renderEmail(
    React.createElement(
      HubShell,
      { heading: "Welcome to the Hub", signoff: "See you soon!", branding },
      React.createElement("p", null, "Hi Jamie, this is a fixed Hub body fixture."),
    ),
  );

  out["email-wrap"] = emailWrap(
    "Booking update",
    "<p>Body fixture.</p>",
    "Thanks so much,\nEmma xx",
    buildUnsubscribeUrl("jamie@example.com", unsubBranding),
    branding,
  );

  out["hub-email-wrap"] = hubEmailWrap("Hub update", "<p>Hub body fixture.</p>", "See you soon!", branding);

  out["unsubscribe-footer-html"] = unsubscribeFooterHtml("jamie@example.com", unsubBranding);
  out["unsubscribe-url-with-email"] = buildUnsubscribeUrl("jamie@example.com", unsubBranding);
  out["unsubscribe-url-no-email"] = buildUnsubscribeUrl(null, unsubBranding);
  out["unsubscribe-headers"] = JSON.stringify(buildUnsubscribeHeaders("jamie@example.com", unsubBranding));

  const classResult = buildClassConfirmationEmail(classFixture);
  out["class-confirmation-customer"] = classResult.customerHtml;
  out["class-confirmation-internal"] = classResult.internalHtml;
  out["class-confirmation-subject"] = classResult.subject;

  const partyResult = buildPartyConfirmationEmail(partyFixture);
  out["party-confirmation-customer"] = partyResult.customerHtml;
  out["party-confirmation-internal"] = partyResult.internalHtml;
  out["party-confirmation-subject"] = partyResult.customerSubject;

  return out;
}

// Allow `npx tsx scripts/render-email-fixtures.mjs [--wonky]` for ad-hoc use.
if (import.meta.url === `file://${process.argv[1]}`) {
  const wonky = process.argv.includes("--wonky");
  const branding = wonky
    ? {
        studioName: "Wonky Comet Studio",
        logoUrl: "https://demo.withsmock.com/email-assets/wonky-comet-logo.png",
        logoSmallUrl: "https://demo.withsmock.com/email-assets/wonky-comet-logo.png",
        addressLine: "14 High Street, Northcote, Victoria, Australia 3070",
        addressLineCompact: "14 High St, Northcote VIC 3070",
        unsubscribeDomain: "demo.withsmock.com",
        contactEmail: "hello@demo.withsmock.com",
      }
    : undefined;
  process.stdout.write(JSON.stringify(renderFixtures(branding)));
}
