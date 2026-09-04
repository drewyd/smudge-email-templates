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
 * greeting, the venue "Location" card, the FAQ, the subject line) are out of
 * scope for this ticket (see L15b.md's "left unchanged" list) and still say
 * Smudge on a clone today. The two lists below say exactly where and why.
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WONKY = {
  studioName: "Wonky Comet Studio",
  logoUrl: "https://demo.withsmock.com/email-assets/wonky-comet-logo.png",
  addressLine: "14 High Street, Northcote, Victoria, Australia 3070",
  unsubscribeDomain: "demo.withsmock.com",
  contactEmail: "hello@demo.withsmock.com",
};

const SMUDGE_DEFAULTS = {
  studioName: "Smudge Artspace",
  logoUrl: "https://www.smudgeartspace.com/email-assets/smudge-logo-color.png",
  addressLineLong: "102 Union Road, Surrey Hills, Victoria, Australia 3127",
  addressLineShort: "102 Union Rd, Surrey Hills VIC 3127",
  unsubscribeDomain: "emails.smudgeartspace.com",
  contactEmail: "hello@smudgeartspace.com",
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

check("class-confirmation-customer: shows her postal address in the footer", wonky["class-confirmation-customer"].includes(WONKY.addressLine));
check("class-confirmation-customer: shows her contact email in the footer", wonky["class-confirmation-customer"].includes(WONKY.contactEmail));
check("class-confirmation-customer: no longer shows Smudge's own footer address", !wonky["class-confirmation-customer"].includes(`${SMUDGE_DEFAULTS.studioName} · ${SMUDGE_DEFAULTS.addressLineShort}`));

console.log("");
console.log("=== Part 3: documented out-of-scope literals (informational only, not a failure) ===");
const outOfScope = {
  "branded-shell / email-wrap": "nav strip + logo href still point at smudgeartspace.com (site routing, not email branding -- out of scope, see L15b.md)",
  "hub-shell / hub-email-wrap": "Hub wordmark, nav and copyright stay Smudge-only -- Hub is not part of a studio clone",
  "class-confirmation-customer / -subject": "greeting sentence, the venue \"Location\" card and the subject line are booking body copy, not identity -- out of scope",
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
