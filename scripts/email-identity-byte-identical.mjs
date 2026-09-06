#!/usr/bin/env node
/**
 * L15b drill: proves two things about the branding threaded into
 * BrandedShell / HubShell / emailWrap / hubEmailWrap / the unsubscribe
 * helpers / buildClassConfirmationEmail / buildPartyConfirmationEmail.
 *
 *   1. BYTE-IDENTICAL: with no `branding` argument (every Smudge call site,
 *      today), every one of those entry points renders EXACTLY what this
 *      package shipped before branding existed. Checked against a snapshot
 *      captured from the pre-change code (`__fixtures__/smudge-baseline.json`,
 *      itself diffed byte-for-byte against a render off the unmodified
 *      sibling checkout before this branch touched anything — see L15b.md).
 *
 *   2. A STUDIO'S IDENTITY ACTUALLY SHOWS: rendering the same fixtures with
 *      Wonky Comet Studio's branding produces her name, her logo URL, her
 *      address and her unsubscribe domain in every field this ticket put in
 *      scope, and the Smudge literal that used to sit there is gone from
 *      THAT field specifically.
 *
 * Since 5 Sep 2026 it also covers the SIGN-OFF (leak F17): the handwritten
 * signature image at the foot of every BrandedShell email was Emma's file on
 * Smudge's domain whatever identity the rest of the email carried, and the
 * class confirmation signed "Emma xx" in text. Part 2b below is that section.
 *
 * Deliberately NOT a blanket "no Smudge string anywhere" check: nav links,
 * the Hub-only wordmark/copyright, and confirmation-email BODY copy (the
 * greeting, the venue "Location" card, the FAQ) are out of scope for this
 * ticket (see L15b.md's "left unchanged" list) and still say Smudge on a
 * clone today. The two SUBJECT lines are in scope since 5 Sep 2026: they read
 * the studio's short name (STUDIO_SHORT_NAME beside the seven, or her full
 * name when it is unset, never Smudge's). The lists below say where and why.
 *
 * Run: npx tsx scripts/email-identity-byte-identical.mjs
 * Prove it can fail: change any DEFAULT_BRANDING/DEFAULT_UNSUBSCRIBE_DOMAIN/
 * DEFAULT_STUDIO_NAME literal in src/branded.tsx or src/unsubscribe.ts by one
 * character and re-run — see L15b.md for the recorded proof run.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { renderFixtures } from "./render-email-fixtures.mjs";
import { buildPartyConfirmationEmail } from "../src/party-confirmation.tsx";
import { buildGiftCardRecipientEmail } from "../src/gift-card.ts";
import {
  resolveStudioEmailIdentity,
  resetEmailThemeWarnings,
  contrastRatio,
} from "../src/branded.tsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WONKY = {
  studioName: "Wonky Comet Studio",
  // Not one of the seven: renderFixtures(WONKY) passes it through as an
  // explicit branding field, and the env-only part sets STUDIO_SHORT_NAME.
  studioShortName: "Wonky Comet",
  logoUrl: "https://demo.withsmock.com/email-assets/wonky-comet-logo.png",
  logoSmallUrl: "https://demo.withsmock.com/email-assets/wonky-comet-logo.png",
  addressLine: "14 High Street, Northcote, Victoria, Australia 3070",
  addressLineCompact: "14 High St, Northcote VIC 3070",
  unsubscribeDomain: "demo.withsmock.com",
  contactEmail: "hello@demo.withsmock.com",
};

const SMUDGE_DEFAULTS = {
  studioName: "Smudge Artspace",
  logoUrl: "https://www.smudgeartspace.com/email-assets/smudge-logo-color.png",
  logoSmallUrl: "https://www.smudgeartspace.com/email-assets/smudge-logo-small.png",
  addressLineLong: "102 Union Road, Surrey Hills, Victoria, Australia 3127",
  addressLineShort: "102 Union Rd, Surrey Hills VIC 3127",
  unsubscribeDomain: "emails.smudgeartspace.com",
  contactEmail: "hello@smudgeartspace.com",
  signatureUrl: "https://www.smudgeartspace.com/email-assets/emma-signature.png",
  ownerFirstName: "Emma",
  signOffName: "Emma xx",
};

// The two optional sign-off fields, kept OUT of WONKY on purpose: WONKY is the
// seven all-or-none fields and nothing else, so every case below can choose
// whether this studio has told us who signs her email.
const TESS = {
  ownerFirstName: "Tess",
  signatureUrl: "https://demo.withsmock.com/email-assets/tess-signature.png",
};
// A SECOND signer, distinct from Emma and from the env's Tess, so an explicit
// override can be told apart from the environment it is meant to beat (cold
// review, 5 Sep 2026: the first version of that check passed the same values
// the env already held, and still passed when both explicit reads were
// disabled).
const ALEX = {
  ownerFirstName: "Alex",
  signatureUrl: "https://demo.withsmock.com/email-assets/alex-signature.png",
};
const SIGN_OFF_ENV_KEYS = ["STUDIO_OWNER_FIRST_NAME", "STUDIO_EMAIL_SIGNATURE_URL"];

// A FULLY POPULATED branding object holding exactly Smudge's own default
// values -- the shape every real call site actually passes (identity.ts's
// emailBranding always returns a complete object, never undefined). This is
// deliberately a SEPARATE case from "no branding argument at all": a
// fallback written as `branding?.logoUrl || IMG.logoSmall` looks correct
// against `branding: undefined` and is silently wrong the moment a caller
// hands over a populated object whose logoUrl happens to equal the default
// -- exactly the class of bug this case is here to catch (see the
// logoSmallUrl field's doc comment in src/branded.tsx for the real one it
// found, 4 Sep 2026).
const SMUDGE_AS_EXPLICIT_BRANDING = {
  studioName: SMUDGE_DEFAULTS.studioName,
  logoUrl: SMUDGE_DEFAULTS.logoUrl,
  logoSmallUrl: SMUDGE_DEFAULTS.logoSmallUrl,
  addressLine: SMUDGE_DEFAULTS.addressLineLong,
  addressLineCompact: SMUDGE_DEFAULTS.addressLineShort,
  unsubscribeDomain: SMUDGE_DEFAULTS.unsubscribeDomain,
  contactEmail: SMUDGE_DEFAULTS.contactEmail,
};

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  OK   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`);
  }
}

console.log("=== Part 1: byte-identical against the recorded Smudge baseline (no branding) ===");
const baseline = JSON.parse(readFileSync(path.join(__dirname, "__fixtures__/smudge-baseline.json"), "utf8"));
const noBranding = renderFixtures(undefined);
for (const key of Object.keys(baseline)) {
  const same = noBranding[key] === baseline[key];
  check(key, same, same ? undefined : `rendered output no longer matches the recorded Smudge baseline`);
}
for (const key of Object.keys(noBranding)) {
  if (!(key in baseline)) check(`${key} (unexpected new entry)`, false, "present in render but not in baseline -- add it to the baseline deliberately, don't silently accept");
}

// The whole point of the L15b rework: a frozen call site (the Stripe webhook,
// create-class-booking.ts, etc.) never passes a `branding` argument at all --
// it can't, it's frozen. So this sets the SAME env vars each app's own
// studioIdentity() reads, calls renderFixtures(undefined) (literally no
// branding argument, exactly what a frozen call site does), and proves her
// identity still shows up. This is the test the rework asked for.
const ENV_KEYS = [
  "STUDIO_NAME",
  "STUDIO_EMAIL_LOGO_URL",
  "STUDIO_EMAIL_LOGO_SMALL_URL",
  "STUDIO_EMAIL_ADDRESS_LINE",
  "STUDIO_EMAIL_ADDRESS_LINE_COMPACT",
  "STUDIO_EMAIL_UNSUBSCRIBE_DOMAIN",
  "STUDIO_HELLO_ADDRESS",
];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

console.log("");
console.log("=== Part 1b: partial ENV identity fails closed instead of mixing studios ===");
for (const k of ENV_KEYS) delete process.env[k];
process.env.STUDIO_EMAIL_LOGO_URL = WONKY.logoUrl;
let partialEnvError;
try {
  renderFixtures(undefined);
} catch (error) {
  partialEnvError = error;
}
check(
  "one configured identity field refuses to render",
  partialEnvError instanceof Error && partialEnvError.message.includes("Incomplete studio email identity"),
  partialEnvError ? String(partialEnvError) : "render unexpectedly succeeded with a half-configured identity",
);
let explicitAgainstPartialEnv;
try {
  explicitAgainstPartialEnv = renderFixtures(WONKY);
} catch {
  explicitAgainstPartialEnv = undefined;
}
check(
  "a complete explicit identity bypasses unrelated partial environment state",
  explicitAgainstPartialEnv?.["branded-shell"].includes(WONKY.logoUrl) &&
    explicitAgainstPartialEnv?.["unsubscribe-footer-html"].includes(WONKY.unsubscribeDomain),
  "complete explicit branding was rejected by environment values it did not need",
);
// Cold review, 5 Sep 2026: the party builder's own branding type allows five
// fields (StudioBranding + UnsubscribeBranding), and that input rendered fine
// before the subject line learned to read an identity. It must still.
// (The CLASS builder's footer has consulted the seven-field identity since
// L15b and already refused this input against a partial env; only the PARTY
// builder, whose own type is five fields, is asserted here.)
let fiveFieldParty;
try {
  fiveFieldParty = buildPartyConfirmationEmail({
    parentName: "Priya Shah",
    parentEmail: "priya@example.com",
    parentPhone: "0400 000 000",
    childName: "Arav Shah",
    childAge: 6,
    partyDate: "2026-11-14",
    partyTime: "10:00:00",
    theme: "Dinosaur Dig",
    cateringDisplay: "BYO",
    amount: 65000,
    branding: {
      studioName: WONKY.studioName,
      logoUrl: WONKY.logoUrl,
      logoSmallUrl: WONKY.logoSmallUrl,
      addressLine: WONKY.addressLine,
      unsubscribeDomain: WONKY.unsubscribeDomain,
    },
  });
} catch (error) {
  fiveFieldParty = { error };
}
check(
  "a five-field explicit branding (the party builder's own type) still renders against a partial env",
  fiveFieldParty && !fiveFieldParty.error &&
    fiveFieldParty.customerSubject === `Arav's ${WONKY.studioName} Birthday Party is booked!` &&
    fiveFieldParty.customerHtml.includes(WONKY.logoUrl),
  fiveFieldParty?.error ? String(fiveFieldParty.error) : JSON.stringify(fiveFieldParty?.customerSubject),
);
// ...and when it cannot state a venue, it states none. Smudge's own street
// must never print under another studio's name, which is what an identity
// that falls back to the default instead of to null would do.
check(
  "a five-field explicit branding shows NO venue rather than Smudge's",
  Boolean(fiveFieldParty) && !fiveFieldParty.error &&
    !fiveFieldParty.customerHtml.includes("Surrey Hills") &&
    !fiveFieldParty.customerHtml.includes("Union R") &&
    !/>Location</.test(fiveFieldParty.customerHtml),
  "the Location row printed an address the deployment could not confirm",
);
check(
  "a five-field explicit branding drops the venue-bound FAQ items too",
  Boolean(fiveFieldParty) && !fiveFieldParty.error &&
    !fiveFieldParty.customerHtml.includes("Car Parking") &&
    !fiveFieldParty.customerHtml.includes("Sips"),
  "Smudge's parking and cafe survived onto a studio whose identity could not be resolved",
);
for (const k of ENV_KEYS) delete process.env[k];
process.env.STUDIO_NAME = WONKY.studioName;
process.env.STUDIO_HELLO_ADDRESS = WONKY.contactEmail;
let generalStudioEnv;
try {
  generalStudioEnv = renderFixtures(undefined);
} catch {
  generalStudioEnv = undefined;
}
check(
  "general studio settings alone do not opt into the email identity",
  generalStudioEnv?.["branded-shell"] === baseline["branded-shell"] &&
    generalStudioEnv?.["unsubscribe-footer-html"] === baseline["unsubscribe-footer-html"],
  "STUDIO_NAME or STUDIO_HELLO_ADDRESS alone activated a partial email identity",
);
process.env.STUDIO_SHORT_NAME = WONKY.studioShortName;
let shortNameAlone;
try {
  shortNameAlone = renderFixtures(undefined);
} catch {
  shortNameAlone = undefined;
}
check(
  "STUDIO_SHORT_NAME alone does not put her short name into a Smudge-shelled subject",
  shortNameAlone?.["party-confirmation-subject"] === baseline["party-confirmation-subject"] &&
    shortNameAlone?.["class-confirmation-subject"] === baseline["class-confirmation-subject"],
  "a short name with no email identity behind it reached the subject line (two studios in one email)",
);
delete process.env.STUDIO_SHORT_NAME;

console.log("");
console.log("=== Part 1c: shells resolve identity from ENV ALONE, zero caller involvement ===");
for (const k of ENV_KEYS) delete process.env[k];
process.env.STUDIO_NAME = WONKY.studioName;
process.env.STUDIO_EMAIL_LOGO_URL = WONKY.logoUrl;
process.env.STUDIO_EMAIL_LOGO_SMALL_URL = WONKY.logoSmallUrl;
process.env.STUDIO_EMAIL_ADDRESS_LINE = WONKY.addressLine;
process.env.STUDIO_EMAIL_ADDRESS_LINE_COMPACT = WONKY.addressLineCompact;
process.env.STUDIO_EMAIL_UNSUBSCRIBE_DOMAIN = WONKY.unsubscribeDomain;
process.env.STUDIO_HELLO_ADDRESS = WONKY.contactEmail;

const envOnly = renderFixtures(undefined); // NO branding argument -- env only

check("branded-shell: shows her name via env alone (no branding arg)", envOnly["branded-shell"].includes(WONKY.studioName));
check("branded-shell: shows her masthead logo URL via env alone", envOnly["branded-shell"].includes(WONKY.logoUrl));
check(
  "branded-shell: no longer shows Smudge's default logo URL",
  !envOnly["branded-shell"].includes(SMUDGE_DEFAULTS.logoUrl),
);
check(
  "branded-shell: no longer shows Smudge's default alt/copyright/compliance text",
  !envOnly["branded-shell"].includes(`alt="${SMUDGE_DEFAULTS.studioName}"`) &&
    !envOnly["branded-shell"].includes(`You received this because you booked with ${SMUDGE_DEFAULTS.studioName}`),
);
check("email-wrap: shows her name via env alone", envOnly["email-wrap"].includes(WONKY.studioName));
check(
  "unsubscribe-footer-html: uses her unsubscribe domain via env alone",
  envOnly["unsubscribe-footer-html"].includes(WONKY.unsubscribeDomain),
);
check(
  "unsubscribe-headers: uses her unsubscribe domain via env alone",
  envOnly["unsubscribe-headers"].includes(WONKY.unsubscribeDomain),
);
check(
  "class-confirmation-customer: shows her compact address via env alone",
  envOnly["class-confirmation-customer"].includes(WONKY.addressLineCompact),
);
check(
  "class-confirmation-customer: shows her contact email via env alone",
  envOnly["class-confirmation-customer"].includes(WONKY.contactEmail),
);
check("party-confirmation-customer: shows her name via env alone", envOnly["party-confirmation-customer"].includes(WONKY.studioName));

// Subject lines (5 Sep 2026): the seven are set and STUDIO_SHORT_NAME is not,
// so the subject carries her FULL name and never Smudge's short one.
check(
  "party-confirmation-subject: her full name when STUDIO_SHORT_NAME is unset (never Smudge)",
  envOnly["party-confirmation-subject"] === `Arav's ${WONKY.studioName} Birthday Party is booked!`,
  JSON.stringify(envOnly["party-confirmation-subject"]),
);
check(
  "class-confirmation-subject: her full name when STUDIO_SHORT_NAME is unset (never Smudge)",
  envOnly["class-confirmation-subject"] === `Booking Confirmed: Art Play Lab at ${WONKY.studioName}`,
  JSON.stringify(envOnly["class-confirmation-subject"]),
);
process.env.STUDIO_SHORT_NAME = WONKY.studioShortName;
const envWithShort = renderFixtures(undefined);
check(
  "party-confirmation-subject: her short name via env alone",
  envWithShort["party-confirmation-subject"] === `Arav's ${WONKY.studioShortName} Birthday Party is booked!`,
  JSON.stringify(envWithShort["party-confirmation-subject"]),
);
check(
  "class-confirmation-subject: her short name via env alone",
  envWithShort["class-confirmation-subject"] === `Booking Confirmed: Art Play Lab at ${WONKY.studioShortName}`,
  JSON.stringify(envWithShort["class-confirmation-subject"]),
);
delete process.env.STUDIO_SHORT_NAME;

const partialExplicit = renderFixtures({ studioName: "Wonky Comet Workshops" });
check(
  "a partial explicit override inherits the coherent environment identity",
  partialExplicit["branded-shell"].includes("Wonky Comet Workshops") &&
    partialExplicit["branded-shell"].includes(WONKY.logoUrl) &&
    partialExplicit["unsubscribe-url-with-email"].includes(WONKY.unsubscribeDomain),
  "the explicit field caused the remaining identity fields to fall back to Smudge",
);
check(
  "an explicit studio name other than the deployment's own is used whole in the subject",
  partialExplicit["party-confirmation-subject"] === "Arav's Wonky Comet Workshops Birthday Party is booked!",
  JSON.stringify(partialExplicit["party-confirmation-subject"]),
);
process.env.STUDIO_SHORT_NAME = WONKY.studioShortName;
const explicitOwnName = renderFixtures({ ...WONKY, studioShortName: undefined });
check(
  "an explicit object naming the deployment's own studio (both apps' emailBranding on a clone) gets STUDIO_SHORT_NAME",
  explicitOwnName["party-confirmation-subject"] === `Arav's ${WONKY.studioShortName} Birthday Party is booked!` &&
    explicitOwnName["class-confirmation-subject"] === `Booking Confirmed: Art Play Lab at ${WONKY.studioShortName}`,
  JSON.stringify(explicitOwnName["party-confirmation-subject"]),
);
delete process.env.STUDIO_SHORT_NAME;

console.log("");
console.log("=== Part 1d: Smudge values supplied through ENV remain byte-identical ===");
process.env.STUDIO_NAME = SMUDGE_DEFAULTS.studioName;
process.env.STUDIO_EMAIL_LOGO_URL = SMUDGE_DEFAULTS.logoUrl;
process.env.STUDIO_EMAIL_LOGO_SMALL_URL = SMUDGE_DEFAULTS.logoSmallUrl;
process.env.STUDIO_EMAIL_ADDRESS_LINE = SMUDGE_DEFAULTS.addressLineLong;
process.env.STUDIO_EMAIL_ADDRESS_LINE_COMPACT = SMUDGE_DEFAULTS.addressLineShort;
process.env.STUDIO_EMAIL_UNSUBSCRIBE_DOMAIN = SMUDGE_DEFAULTS.unsubscribeDomain;
process.env.STUDIO_HELLO_ADDRESS = SMUDGE_DEFAULTS.contactEmail;
const smudgeEnv = renderFixtures(undefined);
for (const key of Object.keys(baseline)) {
  check(`${key} (Smudge env)`, smudgeEnv[key] === baseline[key], "environment resolution changed Smudge output");
}
// Second cold read, 5 Sep 2026: Smudge's own name in STUDIO_NAME, no short
// name, and Smudge's explicit emailBranding object on top: still "Smudge".
const smudgeEnvExplicit = renderFixtures(SMUDGE_AS_EXPLICIT_BRANDING);
check(
  "party-confirmation-subject (Smudge env + explicit Smudge branding)",
  smudgeEnvExplicit["party-confirmation-subject"] === baseline["party-confirmation-subject"],
  JSON.stringify(smudgeEnvExplicit["party-confirmation-subject"]),
);
check(
  "class-confirmation-subject (Smudge env + explicit Smudge branding)",
  smudgeEnvExplicit["class-confirmation-subject"] === baseline["class-confirmation-subject"],
  JSON.stringify(smudgeEnvExplicit["class-confirmation-subject"]),
);

// Restore env exactly as found, then prove Part 1's byte-identical baseline
// still holds once no STUDIO_* vars are set (Smudge's own production env).
for (const k of ENV_KEYS) {
  if (savedEnv[k] === undefined) delete process.env[k];
  else process.env[k] = savedEnv[k];
}
const backToDefaults = renderFixtures(undefined);
check(
  "after clearing env: branded-shell reverts to Smudge's exact baseline",
  backToDefaults["branded-shell"] === baseline["branded-shell"],
);

console.log("");
console.log("=== Part 1e: byte-identical when Smudge's OWN identity is passed explicitly (not omitted) ===");
const explicitSmudge = renderFixtures(SMUDGE_AS_EXPLICIT_BRANDING);
for (const key of Object.keys(baseline)) {
  const same = explicitSmudge[key] === baseline[key];
  check(`${key} (explicit branding)`, same, same ? undefined : "rendered output differs when identity.ts's own emailBranding object is passed, vs. omitting branding entirely -- a fallback is looking at the wrong signal");
}

console.log("");
console.log("=== Part 2: Wonky Comet Studio's identity actually renders ===");
const wonky = renderFixtures(WONKY);

// Fields that carry the shared BrandedShell/legacy-wrapper chrome: her name
// must appear, and the exact Smudge default that used to be there must not.
for (const key of ["branded-shell", "email-wrap", "class-confirmation-customer", "party-confirmation-customer"]) {
  const html = wonky[key];
  check(`${key}: shows "${WONKY.studioName}"`, html.includes(WONKY.studioName));
  check(`${key}: no longer shows the bare "${SMUDGE_DEFAULTS.studioName}" as alt/copyright/compliance text`,
    // The exact default studio name string is still allowed to appear inside
    // BODY COPY on class/party confirmation (the greeting, the venue card) --
    // that's the documented out-of-scope list. What must NOT happen is the
    // masthead alt text or the compliance line reverting to it, which the
    // byte-identical baseline diff in Part 1 already guards structurally;
    // this is a second, independent check on the live rendered string.
    html.includes(`alt="${WONKY.studioName}"`) || html.includes(`You received this because you booked with ${WONKY.studioName}`),
    "expected the masthead alt text or compliance line to carry her name");
}

check("hub-shell: shows her studio name in the footer block", wonky["hub-shell"].includes(WONKY.studioName));
check("hub-shell: shows her address in the footer block", wonky["hub-shell"].includes(WONKY.addressLine));
check("hub-email-wrap: shows her studio name in the footer block", wonky["hub-email-wrap"].includes(WONKY.studioName));

for (const key of ["unsubscribe-footer-html", "unsubscribe-url-with-email", "unsubscribe-url-no-email", "unsubscribe-headers"]) {
  check(`${key}: uses her unsubscribe domain`, wonky[key].includes(WONKY.unsubscribeDomain));
  check(`${key}: does not use Smudge's unsubscribe domain`, !wonky[key].includes(SMUDGE_DEFAULTS.unsubscribeDomain));
}
check("unsubscribe-footer-html: shows her studio name in the compliance line", wonky["unsubscribe-footer-html"].includes(WONKY.studioName));

const wonkyNoShort = renderFixtures({ ...WONKY, studioShortName: undefined });
check(
  "party-confirmation-subject: explicit branding without a short name uses her full name",
  wonkyNoShort["party-confirmation-subject"] === `Arav's ${WONKY.studioName} Birthday Party is booked!`,
  JSON.stringify(wonkyNoShort["party-confirmation-subject"]),
);
check(
  "party-confirmation-subject: explicit short name is used",
  wonky["party-confirmation-subject"] === `Arav's ${WONKY.studioShortName} Birthday Party is booked!`,
  JSON.stringify(wonky["party-confirmation-subject"]),
);
check(
  "class-confirmation-subject: explicit short name is used",
  wonky["class-confirmation-subject"] === `Booking Confirmed: Art Play Lab at ${WONKY.studioShortName}`,
  JSON.stringify(wonky["class-confirmation-subject"]),
);
check(
  "no subject line carries the Smudge short name for her",
  ![wonky, wonkyNoShort, envOnly, envWithShort].some(
    (r) => / Smudge Birthday| at Smudge$/.test(r["party-confirmation-subject"] + " " + r["class-confirmation-subject"]),
  ),
);

check("class-confirmation-customer: shows her postal address (compact form) in the footer", wonky["class-confirmation-customer"].includes(WONKY.addressLineCompact));
check("class-confirmation-customer: shows her contact email in the footer", wonky["class-confirmation-customer"].includes(WONKY.contactEmail));
check("class-confirmation-customer: no longer shows Smudge's own footer address", !wonky["class-confirmation-customer"].includes(`${SMUDGE_DEFAULTS.studioName} · ${SMUDGE_DEFAULTS.addressLineShort}`));

console.log("");
console.log("=== Part 2b: the sign-off follows the studio identity (leak F17) ===");
const savedSignOffEnv = Object.fromEntries(SIGN_OFF_ENV_KEYS.map((k) => [k, process.env[k]]));
function clearSignOffEnv() {
  for (const k of SIGN_OFF_ENV_KEYS) delete process.env[k];
}
function setWonkyIdentityEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.STUDIO_NAME = WONKY.studioName;
  process.env.STUDIO_EMAIL_LOGO_URL = WONKY.logoUrl;
  process.env.STUDIO_EMAIL_LOGO_SMALL_URL = WONKY.logoSmallUrl;
  process.env.STUDIO_EMAIL_ADDRESS_LINE = WONKY.addressLine;
  process.env.STUDIO_EMAIL_ADDRESS_LINE_COMPACT = WONKY.addressLineCompact;
  process.env.STUDIO_EMAIL_UNSUBSCRIBE_DOMAIN = WONKY.unsubscribeDomain;
  process.env.STUDIO_HELLO_ADDRESS = WONKY.contactEmail;
}
// Every studio-side check below reads these three fixtures. The branded-shell
// fixture's own `signoff` PROP is the caller's text ("Thanks so much,\nEmma
// xx"), which is why the Emma assertions there name the signature image and
// its alt rather than the word: caller-supplied body text is not identity.
const SIGN_OFF_SURFACES = ["branded-shell", "email-wrap", "party-confirmation-customer"];

// If the recorded baseline does not itself carry Emma's signature, every
// "byte-identical" check above is guarding a promise about nothing.
check(
  "the recorded Smudge baseline really does carry Emma's signature and her sign-off",
  SIGN_OFF_SURFACES.every((k) => baseline[k].includes(SMUDGE_DEFAULTS.signatureUrl)) &&
    baseline["branded-shell"].includes('alt="Emma"') &&
    baseline["class-confirmation-customer"].includes(SMUDGE_DEFAULTS.signOffName),
  "the fixture set does not exercise the sign-off at all",
);

clearSignOffEnv();
setWonkyIdentityEnv();
const signOffNoName = renderFixtures(undefined);
for (const key of SIGN_OFF_SURFACES) {
  check(
    `${key}: her identity alone drops Emma's signature image`,
    !signOffNoName[key].includes(SMUDGE_DEFAULTS.signatureUrl) &&
      !signOffNoName[key].includes('alt="Emma"'),
    "Emma's handwriting is still at the foot of another studio's email",
  );
}
check(
  "branded-shell: with no owner first name configured, the sign-off is her studio's name in plain text",
  signOffNoName["branded-shell"].includes(`>${WONKY.studioName}</p>`),
  "no plain-text sign-off replaced the signature image",
);
check(
  "class-confirmation-customer: her identity alone stops the email signing itself Emma",
  !signOffNoName["class-confirmation-customer"].includes("Emma") &&
    signOffNoName["class-confirmation-customer"].includes(`>${WONKY.studioName}</p>`),
  "the class confirmation still signs Emma xx",
);

process.env.STUDIO_OWNER_FIRST_NAME = TESS.ownerFirstName;
const signOffNamed = renderFixtures(undefined);
check(
  "branded-shell: STUDIO_OWNER_FIRST_NAME signs the email, in plain text, with no image",
  signOffNamed["branded-shell"].includes(`>${TESS.ownerFirstName}</p>`) &&
    !signOffNamed["branded-shell"].includes(SMUDGE_DEFAULTS.signatureUrl),
  "the owner's first name did not reach the sign-off",
);
check(
  "class-confirmation-customer: signs with her first name and NOT with Emma's kisses",
  signOffNamed["class-confirmation-customer"].includes(`>${TESS.ownerFirstName}</p>`) &&
    !signOffNamed["class-confirmation-customer"].includes(`${TESS.ownerFirstName} xx`) &&
    !signOffNamed["class-confirmation-customer"].includes("Emma"),
  JSON.stringify(signOffNamed["class-confirmation-customer"].slice(-400)),
);
check(
  "party-confirmation-customer: the demo's own email is signed by her, not by Emma",
  !signOffNamed["party-confirmation-customer"].includes("Emma") &&
    signOffNamed["party-confirmation-customer"].includes(`>${TESS.ownerFirstName}</p>`),
  "the party confirmation still carries Emma",
);

process.env.STUDIO_EMAIL_SIGNATURE_URL = TESS.signatureUrl;
const signOffImage = renderFixtures(undefined);
for (const key of SIGN_OFF_SURFACES) {
  check(
    `${key}: her own signature image is drawn exactly where Emma's was`,
    signOffImage[key].includes(`src="${TESS.signatureUrl}" alt="${TESS.ownerFirstName}" width="120"`) &&
      !signOffImage[key].includes(SMUDGE_DEFAULTS.signatureUrl),
    "her signature image did not replace Emma's",
  );
}
check(
  "class-confirmation-customer: its text sign-off is unchanged by a signature image (that shell has never drawn one)",
  signOffImage["class-confirmation-customer"] === signOffNamed["class-confirmation-customer"],
  "a signature image leaked into the class confirmation's own shell",
);

// A malformed or hostile value is treated as unset, never rendered, and never
// throws: the email still sends, signed in plain text.
for (const bad of [
  "http://demo.withsmock.com/sig.png",
  "javascript:alert(1)",
  "data:image/png;base64,AAAA",
  "/email-assets/sig.png",
  "not a url at all",
  "   ",
]) {
  process.env.STUDIO_EMAIL_SIGNATURE_URL = bad;
  let malformed;
  try {
    malformed = renderFixtures(undefined);
  } catch (error) {
    malformed = { error };
  }
  const needle = bad.trim();
  check(
    `a signature URL of ${JSON.stringify(bad)} is ignored, not rendered`,
    malformed && !malformed.error &&
      (needle === "" || !malformed["branded-shell"].includes(needle)) &&
      !malformed["branded-shell"].includes(SMUDGE_DEFAULTS.signatureUrl) &&
      malformed["branded-shell"].includes(`>${TESS.ownerFirstName}</p>`),
    malformed?.error ? String(malformed.error) : "the value reached the markup or stopped the render",
  );
}
process.env.STUDIO_EMAIL_SIGNATURE_URL = TESS.signatureUrl;

// An explicit identity decides for itself, whatever this deployment is.
const explicitSmudgeOnWonkyBox = renderFixtures(SMUDGE_AS_EXPLICIT_BRANDING);
for (const key of Object.keys(baseline)) {
  check(
    `${key} (Smudge's explicit identity on a Wonky deployment, sign-off env set)`,
    explicitSmudgeOnWonkyBox[key] === baseline[key],
    "a studio's sign-off env reached an email explicitly identified as Smudge's",
  );
}
// The env still holds Tess and her image here, so an explicit ALEX proves the
// explicit fields are actually read rather than agreeing with the environment.
const explicitOverridesEnv = renderFixtures({ ...WONKY, ...ALEX });
check(
  "an explicit sign-off beats the deployment's own, name and image together",
  explicitOverridesEnv["branded-shell"].includes(
    `src="${ALEX.signatureUrl}" alt="${ALEX.ownerFirstName}"`,
  ) &&
    !explicitOverridesEnv["branded-shell"].includes(TESS.signatureUrl) &&
    !explicitOverridesEnv["branded-shell"].includes(SMUDGE_DEFAULTS.signatureUrl) &&
    explicitOverridesEnv["class-confirmation-customer"].includes(`>${ALEX.ownerFirstName}</p>`),
  "the explicit sign-off was ignored in favour of the environment's",
);
// The defect this pairing rule exists for: a name from one source over an
// image from another (cold review, 5 Sep 2026).
const explicitNameOnly = renderFixtures({ ...WONKY, ownerFirstName: ALEX.ownerFirstName });
check(
  "an explicit signer who brought no image signs in plain text, never in someone else's hand",
  explicitNameOnly["branded-shell"].includes(`>${ALEX.ownerFirstName}</p>`) &&
    !explicitNameOnly["branded-shell"].includes(TESS.signatureUrl) &&
    !explicitNameOnly["branded-shell"].includes(SMUDGE_DEFAULTS.signatureUrl),
  "one person's name was drawn over another person's signature",
);
check(
  "the same override on the class confirmation signs the new name and drops the kisses",
  explicitNameOnly["class-confirmation-customer"].includes(`>${ALEX.ownerFirstName}</p>`) &&
    !explicitNameOnly["class-confirmation-customer"].includes("Emma"),
  "the class confirmation ignored the explicit signer",
);
const explicitBadImage = renderFixtures({
  ...WONKY,
  ownerFirstName: ALEX.ownerFirstName,
  signatureUrl: "http://demo.withsmock.com/alex.png",
});
check(
  "an explicit signer with an unusable image signs in plain text, not in the deployment's hand",
  explicitBadImage["branded-shell"].includes(`>${ALEX.ownerFirstName}</p>`) &&
    !explicitBadImage["branded-shell"].includes(TESS.signatureUrl) &&
    !explicitBadImage["branded-shell"].includes("http://demo.withsmock.com/alex.png"),
  "an unusable explicit image fell back to another signer's file",
);
// Smudge's own build: overriding only the name must not leave Emma's hand on it.
for (const k of ENV_KEYS) delete process.env[k];
clearSignOffEnv();
const smudgeNameOverride = renderFixtures({
  ...SMUDGE_AS_EXPLICIT_BRANDING,
  ownerFirstName: ALEX.ownerFirstName,
});
check(
  "overriding the signer on Smudge's own identity removes Emma's handwriting too",
  smudgeNameOverride["branded-shell"].includes(`>${ALEX.ownerFirstName}</p>`) &&
    !smudgeNameOverride["branded-shell"].includes(SMUDGE_DEFAULTS.signatureUrl) &&
    !smudgeNameOverride["class-confirmation-customer"].includes(SMUDGE_DEFAULTS.signOffName),
  "Emma's signature survived an explicit change of signer",
);
setWonkyIdentityEnv();
process.env.STUDIO_OWNER_FIRST_NAME = TESS.ownerFirstName;
process.env.STUDIO_EMAIL_SIGNATURE_URL = TESS.signatureUrl;
// Second cold read, 5 Sep 2026: an override that supplies ONLY an unusable
// image has still spoken about the sign-off. Skipping it handed the email to
// the deployment's signer, so a broken URL in a caller's own object drew
// Tess's handwriting.
const explicitBadImageNoName = renderFixtures({ ...WONKY, signatureUrl: "http://demo.withsmock.com/alex.png" });
check(
  "an override that supplies only an unusable image never falls through to another signer's file",
  !explicitBadImageNoName["branded-shell"].includes(TESS.signatureUrl) &&
    !explicitBadImageNoName["branded-shell"].includes(SMUDGE_DEFAULTS.signatureUrl) &&
    explicitBadImageNoName["branded-shell"].includes(`>${WONKY.studioName}</p>`),
  "a broken signature URL inherited somebody else's signature",
);
// A resolved identity handed straight back in is the same identity.
const roundTrip = renderFixtures(resolveStudioEmailIdentity());
check(
  "a resolved identity passed back in resolves to itself",
  roundTrip["branded-shell"].includes(`src="${TESS.signatureUrl}" alt="${TESS.ownerFirstName}"`) &&
    roundTrip["class-confirmation-customer"].includes(`>${TESS.ownerFirstName}</p>`),
  "the identity did not survive a round trip through its own API",
);

// Smudge's own deployment, naming Emma in env with no signature variable: her
// handwriting must stay. Deterministic behaviour the second cold read raised
// as PLAUSIBLE, closed here by the rule that the default's image travels with
// the default's signer.
for (const k of ENV_KEYS) delete process.env[k];
clearSignOffEnv();
process.env.STUDIO_NAME = SMUDGE_DEFAULTS.studioName;
process.env.STUDIO_EMAIL_LOGO_URL = SMUDGE_DEFAULTS.logoUrl;
process.env.STUDIO_EMAIL_LOGO_SMALL_URL = SMUDGE_DEFAULTS.logoSmallUrl;
process.env.STUDIO_EMAIL_ADDRESS_LINE = SMUDGE_DEFAULTS.addressLineLong;
process.env.STUDIO_EMAIL_ADDRESS_LINE_COMPACT = SMUDGE_DEFAULTS.addressLineShort;
process.env.STUDIO_EMAIL_UNSUBSCRIBE_DOMAIN = SMUDGE_DEFAULTS.unsubscribeDomain;
process.env.STUDIO_HELLO_ADDRESS = SMUDGE_DEFAULTS.contactEmail;
process.env.STUDIO_OWNER_FIRST_NAME = SMUDGE_DEFAULTS.ownerFirstName;
const smudgeNamedInEnv = renderFixtures(undefined);
for (const key of Object.keys(baseline)) {
  check(
    `${key} (Smudge's own env names Emma, no signature variable)`,
    smudgeNamedInEnv[key] === baseline[key],
    "naming Emma in env took Emma's handwriting off Smudge's own email",
  );
}
const smudgeNamedInEnvExplicit = renderFixtures(SMUDGE_AS_EXPLICIT_BRANDING);
check(
  "the same, with Smudge's explicit branding object on top",
  Object.keys(baseline).every((key) => smudgeNamedInEnvExplicit[key] === baseline[key]),
  "explicit Smudge branding over a named env changed Smudge's render",
);

setWonkyIdentityEnv();
process.env.STUDIO_OWNER_FIRST_NAME = TESS.ownerFirstName;
process.env.STUDIO_EMAIL_SIGNATURE_URL = TESS.signatureUrl;

// Fail closed: a sign-off variable with no email identity behind it must not
// put a second studio's name or signature on a Smudge-shelled email.
for (const k of ENV_KEYS) delete process.env[k];
clearSignOffEnv();
process.env.STUDIO_NAME = WONKY.studioName;
process.env.STUDIO_OWNER_FIRST_NAME = TESS.ownerFirstName;
process.env.STUDIO_EMAIL_SIGNATURE_URL = TESS.signatureUrl;
const signOffEnvAlone = renderFixtures(undefined);
for (const key of Object.keys(baseline)) {
  check(
    `${key} (sign-off env with no email identity behind it)`,
    signOffEnvAlone[key] === baseline[key],
    "a half-configured clone signed a Smudge email with another studio's name",
  );
}

clearSignOffEnv();
for (const k of SIGN_OFF_ENV_KEYS) {
  if (savedSignOffEnv[k] !== undefined) process.env[k] = savedSignOffEnv[k];
}
for (const k of ENV_KEYS) {
  if (savedEnv[k] === undefined) delete process.env[k];
  else process.env[k] = savedEnv[k];
}
const signOffRestored = renderFixtures(undefined);
for (const key of Object.keys(baseline)) {
  check(`${key} (restored env)`, signOffRestored[key] === baseline[key], "env restore left the render changed");
}

console.log("");
console.log("=== Part 4: the per-studio email THEME (colours, type, site links, venue copy) ===");

const THEME_ENV = {
  NEXT_PUBLIC_STUDIO_COLOR_PRIMARY: "#1E3FD8",
  NEXT_PUBLIC_STUDIO_COLOR_SECONDARY: "#1E3FD8",
  NEXT_PUBLIC_STUDIO_COLOR_CTA: "#1E3FD8",
  NEXT_PUBLIC_STUDIO_COLOR_SUCCESS: "#5A5E68",
  NEXT_PUBLIC_STUDIO_COLOR_INK: "#13161E",
  NEXT_PUBLIC_STUDIO_COLOR_SURFACE: "#F3EDDF",
  NEXT_PUBLIC_STUDIO_BACKGROUND_COLOR: "#F3EDDF",
  NEXT_PUBLIC_STUDIO_FONT_BODY: '"DM Sans", system-ui, sans-serif',
  NEXT_PUBLIC_STUDIO_FONT_HEADING: '"Bricolage Grotesque", system-ui, sans-serif',
  STUDIO_SITE_URL: "https://smock-demo-site.vercel.app",
};
const THEME_ENV_KEYS = Object.keys(THEME_ENV);
const savedThemeEnv = Object.fromEntries(THEME_ENV_KEYS.map((k) => [k, process.env[k]]));
function clearThemeEnv() {
  for (const k of THEME_ENV_KEYS) delete process.env[k];
  resetEmailThemeWarnings();
}
function setThemeEnv(overrides = {}) {
  clearThemeEnv();
  for (const [k, v] of Object.entries({ ...THEME_ENV, ...overrides })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetEmailThemeWarnings();
}

// The three shells a studio actually receives. Hub is excluded on purpose: it
// is Smudge-only, and Part 3 records that it stays Smudge's.
const STUDIO_SURFACES = [
  "branded-shell",
  "email-wrap",
  "class-confirmation-customer",
  "class-confirmation-internal",
  "party-confirmation-customer",
  "party-confirmation-internal",
  "gift-card-recipient",
  "gift-card-buyer",
];
const SMUDGE_HEXES = ["#ec6f86", "#099f4a", "#236eaf", "#f37321", "#f9c7d8", "#231f20", "#f0f0f0"];

// --- 4a: no theme env at all -> byte-identical -----------------------------
clearThemeEnv();
const themeOff = renderFixtures(undefined);
for (const key of Object.keys(baseline)) {
  check(
    `${key} (no theme env)`,
    themeOff[key] === baseline[key],
    "an unthemed render no longer matches the recorded Smudge baseline",
  );
}

// --- 4b: her theme through env alone, no caller involvement ----------------
setThemeEnv();
setWonkyIdentityEnv();
const themed = renderFixtures(undefined);
for (const surface of STUDIO_SURFACES) {
  const html = String(themed[surface]);
  check(
    `${surface} (theme env): carries her ink`,
    html.includes("#13161E"),
    "her ink colour never reached the markup",
  );
  check(
    `${surface} (theme env): carries her body face`,
    html.includes("DM Sans"),
    "her body font stack never reached the markup",
  );
  for (const hex of SMUDGE_HEXES) {
    check(
      `${surface} (theme env): no Smudge ${hex}`,
      !html.toLowerCase().includes(hex),
      `Smudge's ${hex} survived into a themed studio's email`,
    );
  }
  check(
    `${surface} (theme env): no Montserrat`,
    !html.includes("Montserrat"),
    "Smudge's Montserrat survived into a themed studio's email",
  );
}
check(
  "branded-shell (theme env): her heading face is on the h1",
  String(themed["branded-shell"]).includes("Bricolage Grotesque"),
  "the heading stack never reached the h1",
);

// --- 4c: the site links follow the studio ---------------------------------
for (const surface of [
  "branded-shell",
  "email-wrap",
  "party-confirmation-customer",
  "class-confirmation-customer",
  "gift-card-recipient",
]) {
  const html = String(themed[surface]);
  check(
    `${surface} (theme env): no link to smudgeartspace.com`,
    !html.includes("www.smudgeartspace.com"),
    "a link still points at Smudge's own site",
  );
  check(
    `${surface} (theme env): links point at her site`,
    html.includes("smock-demo-site.vercel.app"),
    "her own site never reached a link",
  );
}

// --- 4d: the venue copy stops naming Smudge's street -----------------------
{
  const party = String(themed["party-confirmation-customer"]);
  const klass = String(themed["class-confirmation-customer"]);
  for (const [name, html] of [["party", party], ["class", klass]]) {
    // "Petite" is NOT in this list: cateringDisplay is caller data the fixture
    // supplies, and the website has its own STUDIO_PARTY_CATERER_* setting for it.
    for (const word of ["Surrey Hills", "Union R", "Smudge", "Sips", "Montrose"]) {
      check(
        `${name}-confirmation-customer (theme env): no "${word}"`,
        !html.includes(word),
        `Smudge's own venue copy survived into another studio's confirmation`,
      );
    }
  }
  check(
    "party-confirmation-customer (theme env): her own venue is named",
    party.includes("Wonky Comet Studio,"),
    "the Location row lost the studio's own name and address",
  );
  check(
    "party-confirmation-customer (theme env): the FAQ renumbers after the drops",
    party.includes("1. Your Party Theme") &&
      party.includes("10. Questions?") &&
      !party.includes("13. Questions?") &&
      !party.includes("Car Parking"),
    "the shortened FAQ did not drop three items and renumber the remaining ten",
  );
  check(
    "party-confirmation-customer (theme env): the party bag names her studio",
    party.includes("Wonky Comet Studio party bag") && !party.includes("Smudge party bag"),
    "the party bag still belongs to another studio",
  );
}

// --- 4e: each set is all-or-none -------------------------------------------
for (const dropped of ["NEXT_PUBLIC_STUDIO_COLOR_INK", "NEXT_PUBLIC_STUDIO_BACKGROUND_COLOR"]) {
  setThemeEnv({ [dropped]: undefined });
  const partial = renderFixtures(undefined);
  const html = String(partial["branded-shell"]);
  check(
    `palette without ${dropped}: rejected whole`,
    html.includes("#231f20") && !html.includes("#1E3FD8"),
    "a half-set palette was applied instead of falling back to Smudge's",
  );
}
setThemeEnv({ NEXT_PUBLIC_STUDIO_COLOR_INK: "1E3FD8" });
check(
  "palette with a malformed hex: rejected whole",
  String(renderFixtures(undefined)["branded-shell"]).includes("#231f20"),
  "a malformed hex was accepted",
);
setThemeEnv({ NEXT_PUBLIC_STUDIO_FONT_HEADING: undefined });
{
  const html = String(renderFixtures(undefined)["branded-shell"]);
  check(
    "fonts without the heading stack: rejected whole",
    html.includes("Montserrat") && !html.includes("DM Sans"),
    "a half-set font pair was applied",
  );
  check(
    "fonts rejected does not reject the palette",
    html.includes("#1E3FD8"),
    "the two sets are not independent",
  );
}
setThemeEnv({ NEXT_PUBLIC_STUDIO_FONT_BODY: "DM Sans; } body{display:none" });
check(
  "a font stack carrying CSS punctuation is refused",
  !String(renderFixtures(undefined)["branded-shell"]).includes("display:none"),
  "a font stack escaped the style attribute",
);
// The studio NAME reaches an alt attribute and body copy in the gift-card
// templates, which write raw markup rather than going through React.
setThemeEnv();
{
  const hostileName = 'Wonky" onerror="alert(1)';
  const gift = buildGiftCardRecipientEmail({
    toEmail: "jamie@example.com",
    toName: "Jamie",
    buyerName: "Priya",
    code: "WONKY-1",
    amountLabel: "$100",
    isGift: true,
    hasCardImage: true,
    branding: { ...WONKY, studioName: hostileName },
  });
  check(
    "gift-card-recipient: a quote in the studio name cannot close the alt attribute",
    !gift.html.includes('onerror="alert'),
    "a studio name escaped its attribute",
  );
  check(
    "the studio name is escaped rather than dropped",
    gift.html.includes("Wonky&quot; onerror=&quot;alert(1)"),
    "the name stopped appearing at all",
  );
  check(
    "the SUBJECT keeps the name as plain text, unescaped",
    gift.subject === `Hooray! You've been sent a ${hostileName} gift card`,
    "a subject line was HTML-escaped, which a mail client shows literally",
  );
}

// A quote inside a font stack is legal CSS and would close a style attribute
// in the templates that build HTML as a string (cold review, 6 Sep 2026).
setThemeEnv({
  NEXT_PUBLIC_STUDIO_FONT_BODY: 'Arial", x',
  NEXT_PUBLIC_STUDIO_FONT_HEADING: 'Arial", x',
});
{
  const rendered = renderFixtures(undefined);
  for (const surface of ["gift-card-recipient", "gift-card-buyer", "branded-shell"]) {
    const html = String(rendered[surface]);
    check(
      `${surface}: a quote in the font stack cannot close a style attribute`,
      !html.includes('Arial"') && !html.includes("Arial&quot;"),
      "a font stack escaped its style attribute",
    );
  }
  check(
    "the quote is normalised rather than the stack rejected",
    String(rendered["gift-card-recipient"]).includes("font-family:Arial', x"),
    "a legal quoted font family stopped working",
  );
}
// A URL whose path carries a quote would close an href in the same templates.
setThemeEnv({ STUDIO_SITE_URL: 'https://demo.example/"onmouseover=alert(1)' });
{
  const html = String(renderFixtures(undefined)["gift-card-recipient"]);
  check(
    "gift-card-recipient: a quote in the site URL cannot close an href",
    !html.includes('href="https://demo.example/"'),
    "a site URL escaped its href attribute",
  );
  check(
    "the site URL is percent-encoded rather than dropped",
    html.includes("demo.example/%22onmouseover"),
    "a URL with an unusual path stopped working entirely",
  );
}
setThemeEnv({ STUDIO_SITE_URL: "javascript:alert(1)" });
{
  const html = String(renderFixtures(undefined)["branded-shell"]);
  check(
    "a non-https site URL is refused",
    !html.includes("javascript:alert"),
    "a hostile site URL reached an href",
  );
  check(
    "a refused site URL falls back to the default, never to nothing",
    html.includes("www.smudgeartspace.com"),
    "the nav lost its href entirely",
  );
}

// --- 4f: contrast --------------------------------------------------------
check(
  "contrast: white on Smudge's own green is what it always was",
  contrastRatio("#099f4a", "#ffffff") < 4.5,
  "the measurement changed; the byte-identical exemption below rests on it",
);
clearThemeEnv();
check(
  "contrast: Smudge's own grounds keep white text despite that",
  String(renderFixtures(undefined)["party-confirmation-customer"]).includes("background:#099f4a;color:#ffffff"),
  "the contrast repair changed Smudge's own render",
);
// A pale ground a studio might really pick: the kit's acid.
setThemeEnv({ NEXT_PUBLIC_STUDIO_COLOR_SUCCESS: "#CDF63B" });
check(
  "contrast: a pale studio ground gets her ink, not white",
  String(renderFixtures(undefined)["party-confirmation-customer"]).includes("background:#CDF63B;color:#13161E"),
  "white text was written on a ground it cannot be read on",
);

// --- 4g: an explicit theme beats the env, and a themed palette is one unit --
clearThemeEnv();
setThemeEnv();
{
  const explicitTheme = renderFixtures({
    ...WONKY,
    palette: {
      primary: "#AA0000",
      berry: "#AA0000",
      orange: "#AA0000",
      green: "#AA0000",
      text: "#111111",
      pink: "#EEEEEE",
      bgOuter: "#EEEEEE",
    },
    fontStack: "Verdana, sans-serif",
    headingStack: "Verdana, sans-serif",
    siteUrl: "https://example.test",
  });
  const html = String(explicitTheme["branded-shell"]);
  check(
    "an explicit palette beats the env",
    html.includes("#AA0000") && !html.includes("#1E3FD8"),
    "the env palette won over an explicit one",
  );
  check(
    "an explicit site URL beats the env",
    html.includes("example.test"),
    "the env site URL won over an explicit one",
  );
}

// --- 4h: a theme holding SMUDGE'S OWN values renders like no theme at all ---
// The counterpart of Part 1b, and the check that was missing. Part 4a proves
// the UNSET path is byte-identical; nothing proved the SET-to-Smudge's-own-
// values path, and it was not: the contrast repair and the gift card's cream
// note ground both keyed on "was a theme supplied" rather than on "did this
// value actually change", so three emails moved (cold review, 6 Sep 2026).
clearThemeEnv();
// Her IDENTITY env is still set from Part 4b; this part is about the THEME
// alone, so the identity goes back to Smudge's first or every fixture differs
// for a reason that has nothing to do with the question being asked.
clearSignOffEnv();
for (const k of ENV_KEYS) {
  if (savedEnv[k] === undefined) delete process.env[k];
  else process.env[k] = savedEnv[k];
}
setThemeEnv({
  NEXT_PUBLIC_STUDIO_COLOR_PRIMARY: "#ec6f86",
  NEXT_PUBLIC_STUDIO_COLOR_SECONDARY: "#236eaf",
  NEXT_PUBLIC_STUDIO_COLOR_CTA: "#f37321",
  NEXT_PUBLIC_STUDIO_COLOR_SUCCESS: "#099f4a",
  NEXT_PUBLIC_STUDIO_COLOR_INK: "#231f20",
  NEXT_PUBLIC_STUDIO_COLOR_SURFACE: "#f9c7d8",
  NEXT_PUBLIC_STUDIO_BACKGROUND_COLOR: "#f0f0f0",
  NEXT_PUBLIC_STUDIO_FONT_BODY: "'Montserrat', Arial, sans-serif",
  NEXT_PUBLIC_STUDIO_FONT_HEADING: "'Montserrat', Arial, sans-serif",
  STUDIO_SITE_URL: "https://www.smudgeartspace.com",
});
{
  const restated = renderFixtures(undefined);
  for (const key of Object.keys(baseline)) {
    check(
      `${key} (theme env restating Smudge's own values)`,
      restated[key] === baseline[key],
      "a theme holding Smudge's own values did not render like no theme at all",
    );
  }
}

// --- restore -------------------------------------------------------------
clearThemeEnv();
for (const k of THEME_ENV_KEYS) {
  if (savedThemeEnv[k] !== undefined) process.env[k] = savedThemeEnv[k];
}
clearSignOffEnv();
for (const k of ENV_KEYS) {
  if (savedEnv[k] === undefined) delete process.env[k];
  else process.env[k] = savedEnv[k];
}
const themeRestored = renderFixtures(undefined);
for (const key of Object.keys(baseline)) {
  check(
    `${key} (theme env restored)`,
    themeRestored[key] === baseline[key],
    "the theme drill left the render changed",
  );
}

console.log("");
console.log("=== Part 3: documented out-of-scope literals (informational only, not a failure) ===");
const outOfScope = {
  "branded-shell / email-wrap": "nav strip + logo href follow STUDIO_SITE_URL since 6 Sep 2026; with none set they are Smudge's own, which is the default this baseline records",
  "hub-shell / hub-email-wrap": "Hub wordmark, nav and copyright stay Smudge-only -- Hub is not part of a studio clone",
  "class-confirmation-customer": "the greeting and the \"Location\" card read the studio identity since 6 Sep 2026; what is still Smudge's alone is nothing in this template",
  "party-confirmation-customer": "greeting, Location row and the FAQ follow the studio since 6 Sep 2026; six venue-bound FAQ items are DROPPED or shortened on a clone rather than answered, because this package holds no per-studio parking, caterer or neighbouring cafe. cateringDisplay is caller data (the website's own STUDIO_PARTY_CATERER_* setting since 6 Sep 2026), not a package literal",
  "branded-shell / email-wrap (signoff prop)": "the fixtures pass \"Thanks so much,\\nEmma xx\" as the shell's signoff PROP -- caller-supplied body text, not identity, which is why Part 2b asserts on the signature image and its alt instead. Traced 5 Sep 2026 across both apps at origin/main: every clonable caller passes \"Thanks so much,\" or a warmer line with NO name (stripe-studio gift card, at-home, blueprint, holiday and workshop confirmations, change notices); the one caller that passes \"Emma xx\" is hub-migration.tsx through HubShell, and the Hub is Smudge-only",
  "gift-card-recipient / -buyer": "moved out of smudge-website's stripe-studio webhook on 6 Sep 2026 (leak F17) and proved byte-identical against the inline version across nineteen branch fixtures: npx tsx scripts/gift-card-byte-identical.mjs",
  "class-confirmation-customer (signature image)": "the class shell has never drawn a signature image, so a studio's STUDIO_EMAIL_SIGNATURE_URL does not add one there -- deliberate, keeps Smudge byte-identical and the two shells honest",
};
for (const [k, why] of Object.entries(outOfScope)) console.log(`  i  ${k}: ${why}`);

console.log("");
if (failures > 0) {
  console.error(`DRILL FAILED: ${failures} check(s) did not pass.`);
  process.exit(1);
} else {
  console.log("DRILL PASSED: Smudge's render is byte-identical, Wonky Comet Studio's render carries her identity.");
}
