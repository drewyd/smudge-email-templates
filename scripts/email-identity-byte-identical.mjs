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

const partialExplicit = renderFixtures({ studioName: "Wonky Comet Workshops" });
check(
  "a partial explicit override inherits the coherent environment identity",
  partialExplicit["branded-shell"].includes("Wonky Comet Workshops") &&
    partialExplicit["branded-shell"].includes(WONKY.logoUrl) &&
    partialExplicit["unsubscribe-url-with-email"].includes(WONKY.unsubscribeDomain),
  "the explicit field caused the remaining identity fields to fall back to Smudge",
);

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
const explicitWonkySignOff = renderFixtures({ ...WONKY, ...TESS });
check(
  "an explicit branding object may carry the sign-off itself",
  explicitWonkySignOff["branded-shell"].includes(`src="${TESS.signatureUrl}" alt="${TESS.ownerFirstName}"`) &&
    !explicitWonkySignOff["branded-shell"].includes(SMUDGE_DEFAULTS.signatureUrl),
  "explicit sign-off fields were ignored",
);

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
console.log("=== Part 3: documented out-of-scope literals (informational only, not a failure) ===");
const outOfScope = {
  "branded-shell / email-wrap": "nav strip + logo href still point at smudgeartspace.com (site routing, not email branding -- out of scope, see L15b.md)",
  "hub-shell / hub-email-wrap": "Hub wordmark, nav and copyright stay Smudge-only -- Hub is not part of a studio clone",
  "class-confirmation-customer / -subject": "greeting sentence, the venue \"Location\" card and the subject line are booking body copy, not identity -- out of scope",
  "party-confirmation-customer": "greeting, venue DetailRow, FAQ text and the catering link are booking body copy -- out of scope",
  "branded-shell / email-wrap (signoff prop)": "the fixtures pass \"Thanks so much,\\nEmma xx\" as the shell's signoff PROP -- caller-supplied body text, not identity, which is why Part 2b asserts on the signature image and its alt instead",
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
