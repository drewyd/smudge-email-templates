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
};

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
console.log("=== Part 3: documented out-of-scope literals (informational only, not a failure) ===");
const outOfScope = {
  "branded-shell / email-wrap": "nav strip + logo href still point at smudgeartspace.com (site routing, not email branding -- out of scope, see L15b.md)",
  "hub-shell / hub-email-wrap": "Hub wordmark, nav and copyright stay Smudge-only -- Hub is not part of a studio clone",
  "class-confirmation-customer": "greeting sentence and the venue \"Location\" card are booking body copy, not identity -- out of scope (the subject line reads the studio's short name since 5 Sep 2026)",
  "party-confirmation-customer": "greeting, venue DetailRow, FAQ text and the catering link are booking body copy -- out of scope",
};
for (const [k, why] of Object.entries(outOfScope)) console.log(`  i  ${k}: ${why}`);

console.log("");
if (failures > 0) {
  console.error(`DRILL FAILED: ${failures} check(s) did not pass.`);
  process.exit(1);
} else {
  console.log("DRILL PASSED: Smudge's render is byte-identical, Wonky Comet Studio's render carries her identity.");
}
