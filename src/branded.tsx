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
// Georgia 700 is the editorial display face (Drew, 13 Aug 2026). This is the
// surface the change was really for: email clients do not download webfonts, so
// the Google-hosted serif that used to head this stack never actually rendered
// in an inbox, it just fell through silently. Georgia is already on the reader's
// machine. Set 700 at the call site: Georgia ships 400 and 700 only.
const HUB_DISPLAY_STACK = "Georgia, 'Iowan Old Style', 'Noto Serif', 'Times New Roman', serif";

/**
 * Shared <style> block injected into both shells. The mobile @media block
 * tightens padding + font-sizes on phones (<=480px wide) so the 600px
 * desktop layout doesn't feel cramped after collapsing to viewport width.
 * `!important` is required to override inline styles since email clients
 * always favour inline over <style>.
 */
const shellCss = (bgOuter: string, bgCard: string) =>
  ":root{color-scheme:light;supported-color-schemes:light}" +
  `body,.bg-w,table,td{background-color:${bgOuter}}` +
  `.card,.card td{background-color:${bgCard}}` +
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

/** Smudge's own two grounds, the literal this file shipped before the theme existed. */
const SHELL_CSS = shellCss("#f0f0f0", "#ffffff");

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

/* ----------------------------------------------------------------------- */
/*  Per-studio email theme: palette, type, and the site the links point at  */
/* ----------------------------------------------------------------------- */

/**
 * The palette an email actually paints with. Same keys as COLORS above, and
 * DEFAULT_EMAIL_THEME's palette IS COLORS, so an unthemed render is byte-for-
 * byte what this package has always sent.
 *
 * SEVEN of the twelve keys follow the studio. The other five (textLight,
 * textMuted, border, bgCard, bgContent) are neutrals -- greys and white that
 * read correctly under any brand -- and are deliberately not themed: a studio
 * who set eight brand colours has said nothing about what her card borders
 * should be, and guessing would be worse than the neutral.
 */
export interface EmailPalette {
  primary: string;
  green: string;
  berry: string;
  orange: string;
  pink: string;
  text: string;
  textLight: string;
  textMuted: string;
  border: string;
  bgOuter: string;
  bgCard: string;
  bgContent: string;
}

/**
 * The foreground a themed ground needs. White is what this package has always
 * drawn on its green/orange/melon buttons and tiles, and stays white for every
 * Smudge render; a studio whose own colour is too light for white text gets her
 * ink instead, computed per ground (see readableOn).
 */
export interface EmailForegrounds {
  onPrimary: string;
  onGreen: string;
  onOrange: string;
  onPink: string;
}

export interface EmailTheme {
  colors: EmailPalette;
  fg: EmailForegrounds;
  /** Body/UI stack. Smudge: Montserrat. */
  fontStack: string;
  /**
   * The whole `font-family:...` declaration, for the string-built templates
   * that write CSS by hand. It is `F` verbatim when the studio named no type
   * of her own: `F` spells Montserrat with no space after each comma,
   * `FONT_STACK` spells it with one, and both strings ship today in different
   * emails, so neither may be swapped for the other.
   */
  fontDecl: string;
  /** Heading stack. Smudge: the same Montserrat, which is why an unthemed h1 does not move. */
  headingStack: string;
  /** Hub's editorial display face. Never themed -- Hub is Smudge-only. */
  hubDisplayStack: string;
  /** Base URL every nav link and button in the shell points at. */
  siteUrl: string;
  /** True when any studio theme was actually applied. For tests and logs, never markup. */
  themed: boolean;
  /** True when the studio's own palette was accepted. */
  paletteThemed: boolean;
  /**
   * True when the studio's own type was accepted. Read by the one caller that
   * cannot use `fontStack` directly: `F` in this file spells Montserrat with no
   * space after each comma, `FONT_STACK` spells it with one, and both strings
   * ship today in different emails. A themed studio gets her stack; an unthemed
   * one has to keep whichever literal its own call site always used.
   */
  fontsThemed: boolean;
}

/**
 * The colour roles the WEBSITE theme layer defines (smudge-website
 * src/lib/studio/identity.ts, studioTheme()), mapped onto the palette keys this
 * package paints with. Six of the site's eight roles map exactly, Smudge's own
 * value for each is already identical on both sides, and the two that do not
 * map (accent, decor) have no counterpart in an email. The seventh themed key,
 * bgOuter, follows the site's page background.
 *
 * Deliberately the SAME env names as the site, not a new STUDIO_EMAIL_COLOR_*
 * set. Three reasons: her confirmation email then matches her website by
 * construction rather than by someone remembering to change two values; the
 * names are already set on both demo projects and already classified in
 * fleet/env-manifest.json; and a second set would be a second place for a
 * studio's blue to go stale. NEXT_PUBLIC_ is only a name here -- every read in
 * this package happens server-side inside a webhook, cron or API route.
 */
const EMAIL_COLOR_ENV_NAMES: Readonly<Partial<Record<keyof EmailPalette, string>>> = Object.freeze({
  primary: "NEXT_PUBLIC_STUDIO_COLOR_PRIMARY",
  berry: "NEXT_PUBLIC_STUDIO_COLOR_SECONDARY",
  orange: "NEXT_PUBLIC_STUDIO_COLOR_CTA",
  green: "NEXT_PUBLIC_STUDIO_COLOR_SUCCESS",
  text: "NEXT_PUBLIC_STUDIO_COLOR_INK",
  pink: "NEXT_PUBLIC_STUDIO_COLOR_SURFACE",
  bgOuter: "NEXT_PUBLIC_STUDIO_BACKGROUND_COLOR",
});

const EMAIL_FONT_ENV_NAMES = Object.freeze({
  fontStack: "NEXT_PUBLIC_STUDIO_FONT_BODY",
  headingStack: "NEXT_PUBLIC_STUDIO_FONT_HEADING",
});

/**
 * The site whose pages the nav strip and the shell's buttons link to. Its own
 * variable rather than NEXT_PUBLIC_APP_URL, because that one is per-DEPLOYMENT:
 * on the dashboard it is the staff dashboard, and a customer's confirmation
 * must never send her to a staff login.
 */
const SITE_URL_ENV = ["STUDIO_SITE_URL", "NEXT_PUBLIC_STUDIO_SITE_URL"] as const;

/**
 * The optional theme sets a caller may pass instead of, or beside, the env.
 * Each set is all-or-none in the same way the env sets are.
 */
export interface ThemeBranding {
  /** All seven themed roles or none: a partial palette is rejected whole. */
  palette?: Partial<EmailPalette>;
  fontStack?: string;
  headingStack?: string;
  siteUrl?: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
/**
 * A font stack lands inside a style attribute, so it may hold only what a
 * font-family list needs: letters, digits, spaces, commas, quotes, dots and
 * hyphens. No semicolon, brace, angle bracket, backslash or slash survives, so
 * the value can neither close the attribute nor open a second declaration.
 */
const FONT_STACK_RE = /^[A-Za-z0-9 ,'".-]{1,200}$/;

function cleanHex(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && HEX_RE.test(v) ? v : undefined;
}

function cleanFontStack(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v || !FONT_STACK_RE.test(v)) return undefined;
  // A double quote is legal in a font-family list ("DM Sans", system-ui) and is
  // exactly what a mail client's own font names carry, so the charset check has
  // to allow it. It also CLOSES the style attribute in the templates that build
  // HTML as a string rather than as React, which escapes for them: a stack of
  // `Arial"` put a bare quote into the markup and everything after it became an
  // attribute of its own (cold review, 6 Sep 2026). Single quotes do the same
  // job in CSS, cannot close a double-quoted attribute, and are already how
  // this package's own default spells Montserrat.
  return v.replace(/"/g, "'");
}

function cleanSiteUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(v);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "https:") return undefined;
  // parsed.href, never the raw input: the URL parser percent-encodes the
  // characters that would otherwise close an href attribute, and the raw string
  // would carry them through into markup the string-built templates do not
  // escape (cold review, 6 Sep 2026).
  return parsed.href.replace(/\/+$/, "");
}

/** WCAG relative luminance of an #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = la > lb ? la : lb;
  const lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA for normal text. These buttons are 13-15px bold, so 4.5 is the honest floor. */
const CONTRAST_FLOOR = 4.5;

/**
 * The foreground to write on a coloured ground: white while white is readable
 * (which is every Smudge ground, so nothing moves), otherwise the palette's own
 * ink. If neither clears the floor the more readable of the two is used and the
 * deployment is warned by role name -- a confirmation the customer has already
 * paid for is never failed over a button colour.
 */
function readableOn(
  ground: string,
  ink: string,
  unreadable: string[],
  role: keyof EmailPalette,
): string {
  const white = "#ffffff";
  // Smudge's own ground keeps white text whatever the ratio says: white on the
  // apple green is 3.3:1, below AA, and that is a decision about Smudge's brand
  // an identity ticket may not quietly restyle. Keyed on the VALUE rather than
  // on whether a theme was set, so a deployment that supplies Smudge's own
  // hexes renders identically to one that supplies none (cold review,
  // 6 Sep 2026: it did not, and three emails moved).
  if (ground.toLowerCase() === SMUDGE_PALETTE[role].toLowerCase()) return white;
  const onWhite = contrastRatio(ground, white);
  if (onWhite >= CONTRAST_FLOOR) return white;
  const onInk = contrastRatio(ground, ink);
  if (onInk >= CONTRAST_FLOOR) return ink;
  unreadable.push(role);
  return onInk >= onWhite ? ink : white;
}

const themeWarnings = new Set<string>();

/** One line per distinct problem per process: a webhook must not log per email. */
function warnTheme(message: string): void {
  if (themeWarnings.has(message)) return;
  themeWarnings.add(message);
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`[email-theme] ${message}`);
  }
}

/** For the drill only: lets one process assert the warning for several themes. */
export function resetEmailThemeWarnings(): void {
  themeWarnings.clear();
}

const SMUDGE_PALETTE: EmailPalette = { ...COLORS };

export const DEFAULT_EMAIL_THEME: EmailTheme = {
  colors: SMUDGE_PALETTE,
  fg: { onPrimary: "#ffffff", onGreen: "#ffffff", onOrange: "#ffffff", onPink: "#ffffff" },
  fontStack: FONT_STACK,
  fontDecl: F,
  headingStack: FONT_STACK,
  hubDisplayStack: HUB_DISPLAY_STACK,
  siteUrl: SITE,
  themed: false,
  paletteThemed: false,
  fontsThemed: false,
};

const THEMED_KEYS = Object.keys(EMAIL_COLOR_ENV_NAMES) as Array<keyof EmailPalette>;

/**
 * Resolve one coherent theme. Sources in the order every other resolver in this
 * file uses: an explicit ThemeBranding object, then this deployment's env, then
 * Smudge's defaults.
 *
 * Each SET is all-or-none. A palette missing one role, or carrying one value
 * that is not `#rrggbb`, is rejected whole and Smudge's palette stands -- a
 * half-themed email (her blue buttons under our melon nav) is worse than an
 * unthemed one, and it is the rule the website theme layer already applies. The
 * two font stacks are a second set under the same rule: neither is named
 * without the other, because a body face under a heading face from another
 * brand is the same mistake in type.
 *
 * A palette is rejected once more when its ink cannot be read on the white card
 * it prints on. Every other contrast problem is repairable per ground (see
 * readableOn); unreadable body text is not.
 */
export function resolveEmailTheme(branding?: ThemeBranding): EmailTheme {
  const unreadable: string[] = [];

  /* ---- palette ---- */
  const explicit = branding?.palette;
  const explicitSaidSomething = explicit ? THEMED_KEYS.some((k) => explicit[k] !== undefined) : false;

  let pairs: ReadonlyArray<readonly [keyof EmailPalette, string | undefined]> = [];
  let source: "explicit" | "env" | "default" = "default";
  if (explicitSaidSomething) {
    pairs = THEMED_KEYS.map((k) => [k, cleanHex(explicit![k])] as const);
    source = "explicit";
  } else {
    const fromEnv = THEMED_KEYS.map((k) => [k, cleanHex(envVar(EMAIL_COLOR_ENV_NAMES[k]!))] as const);
    if (fromEnv.some(([, v]) => v)) {
      pairs = fromEnv;
      source = "env";
    }
  }

  let colors: EmailPalette = SMUDGE_PALETTE;
  let paletteApplied = false;
  if (source !== "default") {
    const missing = pairs
      .filter(([, v]) => !v)
      .map(([k]) => (source === "env" ? EMAIL_COLOR_ENV_NAMES[k]! : String(k)));
    if (missing.length > 0) {
      warnTheme(
        `studio palette ignored: all ${THEMED_KEYS.length} roles must be present and be #rrggbb (missing or malformed: ${missing.join(", ")})`,
      );
    } else {
      const candidate: EmailPalette = { ...SMUDGE_PALETTE };
      for (const [k, v] of pairs) candidate[k] = v!;
      if (contrastRatio(candidate.text, candidate.bgCard) < CONTRAST_FLOOR) {
        warnTheme(
          `studio palette ignored: its ink is unreadable on the email card (${EMAIL_COLOR_ENV_NAMES.text} against ${candidate.bgCard})`,
        );
      } else {
        colors = candidate;
        paletteApplied = true;
      }
    }
  }

  /* ---- type ---- */
  const fontsExplicit = branding?.fontStack !== undefined || branding?.headingStack !== undefined;
  const bodyRaw = fontsExplicit ? branding?.fontStack : envVar(EMAIL_FONT_ENV_NAMES.fontStack);
  const headRaw = fontsExplicit ? branding?.headingStack : envVar(EMAIL_FONT_ENV_NAMES.headingStack);
  let fontStack = DEFAULT_EMAIL_THEME.fontStack;
  let headingStack = DEFAULT_EMAIL_THEME.headingStack;
  let fontsApplied = false;
  if (bodyRaw !== undefined || headRaw !== undefined) {
    const body = cleanFontStack(bodyRaw);
    const head = cleanFontStack(headRaw);
    if (!body || !head) {
      warnTheme(
        `studio fonts ignored: set both ${EMAIL_FONT_ENV_NAMES.fontStack} and ${EMAIL_FONT_ENV_NAMES.headingStack}, using letters, digits, spaces, commas, quotes, dots and hyphens only`,
      );
    } else {
      fontStack = body;
      headingStack = head;
      fontsApplied = true;
    }
  }

  /* ---- site ---- */
  const siteRaw = branding?.siteUrl ?? SITE_URL_ENV.map((n) => envVar(n)).find((v) => v !== undefined);
  const site = cleanSiteUrl(siteRaw);
  if (siteRaw !== undefined && !site) {
    warnTheme(`studio site URL ignored: ${SITE_URL_ENV[0]} must be an absolute https URL`);
  }

  const fg: EmailForegrounds = {
    onPrimary: readableOn(colors.primary, colors.text, unreadable, "primary"),
    onGreen: readableOn(colors.green, colors.text, unreadable, "green"),
    onOrange: readableOn(colors.orange, colors.text, unreadable, "orange"),
    onPink: readableOn(colors.pink, colors.text, unreadable, "pink"),
  };

  const theme: EmailTheme = {
    colors,
    fg,
    fontStack,
    // F, not the built declaration, whenever the resolved stack is Smudge's
    // own: F spells Montserrat with no space after each comma and FONT_STACK
    // spells it with one, so building it would move bytes on a deployment that
    // merely restated Smudge's own type.
    fontDecl: fontStack === FONT_STACK ? F : "font-family:" + fontStack,
    headingStack,
    hubDisplayStack: HUB_DISPLAY_STACK,
    siteUrl: site || DEFAULT_EMAIL_THEME.siteUrl,
    themed: paletteApplied || fontsApplied || Boolean(site),
    paletteThemed: paletteApplied,
    fontsThemed: fontsApplied,
  };
  if (unreadable.length > 0) {
    warnTheme(
      `no foreground clears ${CONTRAST_FLOOR}:1 on the studio's ${unreadable.join(", ")} colour; the closer of white and her ink is used`,
    );
  }
  return theme;
}

/**
 * The theme a helper component paints with, passed explicitly.
 *
 * This WAS a React context, which is the obvious answer and the wrong one:
 * Next.js collects page data for an API route under React's `react-server`
 * condition, where `React.createContext` does not exist, and importing this
 * package into the Stripe webhook took `next build` down with
 * "n.createContext is not a function" (6 Sep 2026). Neither the typecheck nor
 * 1838 unit tests could see it, because neither runs a production build.
 *
 * So the theme travels as a prop. A template that has one passes it; a caller
 * that does not gets Smudge's, which is what keeps the deprecated standalone
 * greenCard()/detailRow() string helpers byte-identical.
 */
export type WithTheme = { theme?: EmailTheme };

/**
 * Studio branding for the shared header/footer chrome -- the email masthead
 * logo, the business name shown in alt text/copyright/compliance lines, and
 * the postal address line in the footer. Every field is optional and every
 * default below is the exact literal this package shipped before branding
 * existed, so a caller that passes nothing (every Smudge call site, today)
 * renders byte-identical output. A clone's caller passes its own studio's
 * values, normally read from that app's `src/lib/studio/identity.ts`.
 *
 * Deliberately narrow: this does not cover the nav strip's link targets, the
 * social links, or the Hub-specific "Smudge Hub" wordmark/nav in HubShell --
 * Hub is Smudge-only (see identity.ts's own note on the "hub" FromKind), and
 * nav routing is a site-identity concern, not an email-branding one.
 */
export interface StudioBranding {
  /** Full trading name, e.g. "Smudge Artspace". Used in logo alt text, the footer copyright line and the "you received this because you booked with..." compliance line. */
  studioName?: string;
  /** Full URL to the email masthead logo. Defaults to Smudge's own baked white-ground logo. */
  logoUrl?: string;
  /**
   * Full URL to the SMALL decorative logo repeated in the footer signoff
   * block. Genuinely a different asset from logoUrl, not just a smaller
   * render of it (Smudge's own two files differ), so it is its own field
   * with its own default rather than falling back to logoUrl -- reusing
   * logoUrl here was a real bug (fixed 4 Sep 2026, L15b): every real caller
   * passes a FULLY populated branding object (identity.ts's emailBranding),
   * so a `branding?.logoUrl || IMG.logoSmall`-style fallback never actually
   * fell back, and Smudge's own footer silently started showing her BIG
   * logo shrunk to 119px instead of the small logo file. Caught by
   * operations-dashboard's src/test/brand-colour-rendering.test.ts golden
   * master, which is exactly the kind of check this bug needed.
   */
  logoSmallUrl?: string;
  /** Single-line postal address shown in the footer. */
  addressLine?: string;
}

export interface StudioEmailIdentity extends Required<StudioBranding> {
  addressLineCompact: string;
  unsubscribeDomain: string;
  contactEmail: string;
  /**
   * How the studio says its own name mid-sentence: "Smudge" for Smudge
   * Artspace. Only the two confirmation SUBJECT lines read it ("Arav's Smudge
   * Birthday Party is booked!", "Booking Confirmed: Art Play Lab at Smudge").
   *
   * Deliberately NOT one of the seven all-or-none fields. A studio that sets
   * the seven but not STUDIO_SHORT_NAME gets her FULL name here, never Smudge's
   * short one, so the fail-closed rule still holds (no email ever carries two
   * studios) without a new variable becoming mandatory for a deployment that
   * already renders correctly.
   */
  studioShortName: string;
  /**
   * The first name the email is signed with: "Emma" for Smudge Artspace. It is
   * the signature image's alt text, and it is what the sign-off says when a
   * studio has no signature image of her own.
   *
   * Deliberately NOT one of the seven all-or-none fields. A studio that sets
   * the seven and not STUDIO_OWNER_FIRST_NAME signs with her STUDIO's name,
   * never Emma's, so the fail-closed rule holds (no email is ever signed by
   * another business's owner) without a new variable becoming mandatory for a
   * deployment that already renders correctly.
   */
  ownerFirstName: string;
  /**
   * Full https URL to the owner's handwritten signature image, or null when
   * the studio has none and the sign-off is her name in plain text. Smudge's
   * default is Emma's own signature file, the one this package has drawn since
   * it existed; no other studio ever inherits it.
   */
  signatureUrl: string | null;
  /**
   * The exact words the sign-off signs with: "Emma xx" for Smudge Artspace,
   * because the kisses are how Emma signs and not how anyone else does. Every
   * other studio signs with ownerFirstName on its own.
   */
  signOffName: string;
}

/**
 * The one optional field a caller may pass on top of StudioBranding to name
 * the studio in a subject line. Both apps' studioIdentity() readers carry a
 * `studioShortName` (STUDIO_SHORT_NAME / NEXT_PUBLIC_STUDIO_SHORT_NAME), but
 * their pre-shaped `emailBranding` objects do not, so in practice this field
 * arrives through the env var below and this is here for a caller that wants
 * to be explicit.
 */
export interface SubjectBranding {
  studioShortName?: string;
}

/**
 * The two optional fields a caller may pass on top of StudioBranding to say
 * how this studio signs. Both apps' studioIdentity() already carries an owner
 * first name (STUDIO_OWNER_FIRST_NAME / NEXT_PUBLIC_STUDIO_OWNER_FIRST_NAME),
 * but their pre-shaped `emailBranding` objects do not, so in practice these
 * arrive through the env vars below and this shape is here for a caller that
 * wants to be explicit.
 */
export interface SignOffBranding {
  ownerFirstName?: string;
  /**
   * Must be a plain https URL; anything else is treated as unset. Accepts
   * null so a RESOLVED StudioEmailIdentity (whose signatureUrl is
   * `string | null`) can be handed straight back to any of these entry
   * points without a cast (cold review, 5 Sep 2026).
   */
  signatureUrl?: string | null;
}

/** The three resolved sign-off fields, moved around as one unit. */
export type StudioSignOff = Pick<
  StudioEmailIdentity,
  "ownerFirstName" | "signatureUrl" | "signOffName"
>;

const DEFAULT_EMAIL_IDENTITY: StudioEmailIdentity = {
  studioName: "Smudge Artspace",
  logoUrl: IMG.logo,
  logoSmallUrl: IMG.logoSmall,
  addressLine: "102 Union Road, Surrey Hills, Victoria, Australia 3127",
  addressLineCompact: "102 Union Rd, Surrey Hills VIC 3127",
  unsubscribeDomain: "emails.smudgeartspace.com",
  contactEmail: "hello@smudgeartspace.com",
  studioShortName: "Smudge",
  ownerFirstName: "Emma",
  signatureUrl: IMG.emma,
  signOffName: "Emma xx",
};

/** Read alongside the seven, never required: see StudioEmailIdentity.studioShortName. */
const SHORT_NAME_ENV = "STUDIO_SHORT_NAME";

/** Read alongside the seven, never required: see the three fields above. */
const SIGN_OFF_ENV = {
  ownerFirstName: "STUDIO_OWNER_FIRST_NAME",
  signatureUrl: "STUDIO_EMAIL_SIGNATURE_URL",
} as const;

const EMAIL_IDENTITY_ENV = {
  studioName: "STUDIO_NAME",
  logoUrl: "STUDIO_EMAIL_LOGO_URL",
  logoSmallUrl: "STUDIO_EMAIL_LOGO_SMALL_URL",
  addressLine: "STUDIO_EMAIL_ADDRESS_LINE",
  addressLineCompact: "STUDIO_EMAIL_ADDRESS_LINE_COMPACT",
  unsubscribeDomain: "STUDIO_EMAIL_UNSUBSCRIBE_DOMAIN",
  contactEmail: "STUDIO_HELLO_ADDRESS",
} as const;

const EMAIL_IDENTITY_OPT_IN_FIELDS: ReadonlyArray<keyof StudioEmailIdentity> = [
  "logoUrl",
  "logoSmallUrl",
  "addressLine",
  "addressLineCompact",
  "unsubscribeDomain",
];

/**
 * Read a trimmed, non-empty env var, or undefined. Guarded for the browser
 * (this package's shells only ever render server-side -- renderToStaticMarkup
 * inside a webhook/cron/API route -- but the guard costs nothing and matches
 * the pattern both apps' own src/lib/studio/identity.ts already use).
 */
export function envVar(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

/**
 * Resolve branding from the SAME env vars each consuming app's
 * studioIdentity() reads (STUDIO_NAME, STUDIO_EMAIL_LOGO_URL, etc.), so a
 * studio's Vercel env alone is enough to re-brand every shell -- no caller
 * needs to pass a `branding` prop at all. This is what lets frozen booking/
 * webhook files stay completely untouched (their existing calls to
 * BrandedShell/emailWrap/etc, with no branding argument, already resolve
 * her identity through this).
 */
function emailIdentityFromEnv(): StudioEmailIdentity | undefined {
  const values = Object.fromEntries(
    Object.entries(EMAIL_IDENTITY_ENV).map(([field, envName]) => [field, envVar(envName)]),
  ) as Partial<StudioEmailIdentity>;
  const configured = EMAIL_IDENTITY_OPT_IN_FIELDS.filter((field) => values[field]).length;
  if (configured === 0) return undefined;

  const missing = Object.entries(EMAIL_IDENTITY_ENV)
    .filter(([field]) => !values[field as keyof StudioEmailIdentity])
    .map(([, envName]) => envName);
  if (missing.length > 0) {
    throw new Error(
      `Incomplete studio email identity: set all STUDIO email identity variables together (missing ${missing.join(", ")})`,
    );
  }

  // STUDIO_SHORT_NAME when set, otherwise the one rule below.
  values.studioShortName = envVar(SHORT_NAME_ENV) ?? shortNameFor(values.studioName!, DEFAULT_EMAIL_IDENTITY);
  return { ...(values as StudioEmailIdentity), ...signOffFor(values.studioName as string) };
}

/**
 * A signature image is drawn only when its URL is a plain https one. http, a
 * relative path, a data: URI, a javascript: URL and a malformed string are all
 * treated as unset, and the sign-off falls back to the studio's name in plain
 * text.
 *
 * Deliberately does NOT throw, which is the opposite call from the seven
 * all-or-none fields. Those decide WHO an email is from, so a half-set one has
 * to stop the send; this decides how the email is signed, and no decoration is
 * worth failing a confirmation the customer has already paid for. Either way
 * an unusable value never reaches the markup.
 */
function signatureImageUrl(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return undefined;
  }
  return parsed.protocol === "https:" ? raw : undefined;
}

/**
 * How a studio signs when she has said nothing about it. One rule, the same
 * shape as every other default here: Smudge Artspace signs the way it always
 * has, Emma's name over her handwritten signature file; ANY other studio signs
 * with her own studio name and no image at all, because a clone's confirmation
 * must never end in another business owner's handwriting.
 */
function defaultSignOff(studioName: string): StudioSignOff {
  if (studioName === DEFAULT_EMAIL_IDENTITY.studioName) {
    return {
      ownerFirstName: DEFAULT_EMAIL_IDENTITY.ownerFirstName,
      signatureUrl: DEFAULT_EMAIL_IDENTITY.signatureUrl,
      signOffName: DEFAULT_EMAIL_IDENTITY.signOffName,
    };
  }
  return { ownerFirstName: studioName, signatureUrl: null, signOffName: studioName };
}

/**
 * The sign-off for one resolved studio name. Sources are tried in order and
 * the FIRST one that says anything about the sign-off answers BOTH fields:
 * an explicit branding object, then this deployment's own two variables (only
 * when the name being resolved IS the deployment's STUDIO_NAME, so a caller
 * who hands Smudge's identity to a studio's build is not signed by that
 * studio, nor the other way round), then the default above.
 *
 * The name and the image are never taken from different sources. Reading them
 * independently looked harmless and put one person's name over another
 * person's handwriting: an explicit ownerFirstName with no image of its own
 * kept the deployment's signature file, so an email signed "Alex" was drawn in
 * Tess's hand, and on Smudge in Emma's (cold review, 5 Sep 2026). A signer who
 * brought no image signs in plain text.
 *
 * Never consults the seven-field env identity, so an explicit branding object
 * is never rejected by a half-set env it did not ask about.
 */
function signOffFor(studioName: string, explicit?: SignOffBranding): StudioSignOff {
  const base = defaultSignOff(studioName);
  const ownDeployment = studioName === envVar(EMAIL_IDENTITY_ENV.studioName);
  const sources: SignOffBranding[] = [
    { ownerFirstName: explicit?.ownerFirstName, signatureUrl: explicit?.signatureUrl },
  ];
  if (ownDeployment) {
    sources.push({
      ownerFirstName: envVar(SIGN_OFF_ENV.ownerFirstName),
      signatureUrl: envVar(SIGN_OFF_ENV.signatureUrl),
    });
  }
  for (const source of sources) {
    const name = source.ownerFirstName?.trim();
    // The RAW value, not the validated one: a source that supplied an
    // unusable signature has still spoken about the sign-off, and must not be
    // skipped in favour of a later source whose image belongs to someone else
    // (cold review, 5 Sep 2026).
    const suppliedImage = source.signatureUrl?.trim();
    if (!name && !suppliedImage) continue;
    // A source that named nobody still belongs to this studio, so her own
    // name carries the image she supplied.
    const ownerFirstName = name || base.ownerFirstName;
    return {
      ownerFirstName,
      // One invariant, and the whole point of this function: an image is only
      // ever drawn beside the name it belongs to. A usable image from this
      // source, else the default's image but ONLY while the signer is still
      // the default's signer (which is what keeps Emma's handwriting on
      // Smudge's own emails when her deployment names her in env), else none.
      signatureUrl:
        signatureImageUrl(suppliedImage) ??
        (ownerFirstName === base.ownerFirstName ? base.signatureUrl : null),
      // "Emma xx" survives exactly where it belongs: an identity still signed
      // by the name its own default carries. A studio who named herself, or
      // anyone who overrode the name, signs with that name alone.
      signOffName: ownerFirstName === base.ownerFirstName ? base.signOffName : ownerFirstName,
    };
  }
  return base;
}

/**
 * The sign-off for a shell that holds only a `branding` prop. An explicit
 * studio name answers from its own fields and never throws; with no name at
 * all the deployment's identity answers, the same way every shell already
 * resolves it.
 */
export function resolveStudioSignOff(
  branding?: Partial<StudioEmailIdentity> & SignOffBranding,
): StudioSignOff {
  const explicitName = branding?.studioName?.trim();
  if (explicitName) return signOffFor(explicitName, branding);
  const identity = resolveStudioEmailIdentity(branding);
  return {
    ownerFirstName: identity.ownerFirstName,
    signatureUrl: identity.signatureUrl,
    signOffName: identity.signOffName,
  };
}

/**
 * The short name for an identity that did not state one, whether it arrived
 * as an explicit `branding` object or through the seven env vars. One rule:
 * Smudge Artspace's short name is "Smudge" (so Smudge's own identity, passed
 * explicitly by either app's emailBranding object or supplied through env,
 * renders the subject it always has); any other studio's short name is her
 * full name, because a subject that named a studio and not her short name
 * must never fall back to Smudge's.
 */
function shortNameFor(studioName: string, fallback: StudioEmailIdentity): string {
  return studioName === fallback.studioName ? fallback.studioShortName : studioName;
}

/**
 * The short name for an EXPLICIT studio name, without ever consulting the
 * seven-field env identity (a caller who passed a complete or partial
 * `branding` object must not be rejected by a half-set env it did not ask
 * about; that was a real regression caught in cold review, 5 Sep 2026).
 * Two single-variable reads are allowed: if the explicit name IS this
 * deployment's own STUDIO_NAME, the deployment's STUDIO_SHORT_NAME applies,
 * which is what both apps' emailBranding objects carry on a studio's clone.
 */
function explicitShortName(explicitShort: string | undefined, studioName: string): string {
  const short = explicitShort?.trim();
  if (short) return short;
  const deploymentShort = studioName === envVar("STUDIO_NAME") ? envVar(SHORT_NAME_ENV) : undefined;
  // The same one rule as everywhere else: Smudge Artspace is "Smudge" whether
  // its name arrived explicitly, through env, or both (second cold read,
  // 5 Sep 2026: STUDIO_NAME set to Smudge's own name with no short name must
  // not turn Smudge's subject into "Smudge Artspace Birthday Party").
  return deploymentShort ?? shortNameFor(studioName, DEFAULT_EMAIL_IDENTITY);
}

/**
 * The studio's short name for a subject line. An explicit `branding` object
 * answers from its own fields (plus the two single env reads above) and never
 * throws; with no branding at all the deployment's env identity answers, the
 * same way every shell already resolves it.
 */
export function resolveStudioShortName(
  branding?: Partial<StudioEmailIdentity> & SubjectBranding,
): string {
  const explicitName = branding?.studioName?.trim();
  if (branding?.studioShortName?.trim() || explicitName) {
    return explicitShortName(branding?.studioShortName, explicitName ?? DEFAULT_EMAIL_IDENTITY.studioName);
  }
  return resolveStudioEmailIdentity(branding).studioShortName;
}

/**
 * Resolve one coherent email identity. An omitted object may activate the
 * deployment's STUDIO_* identity, but that environment identity is accepted
 * only when all seven fields are present. This prevents a half-configured
 * clone from silently sending an email containing two studios' details.
 */
export function resolveStudioEmailIdentity(
  branding?: Partial<StudioEmailIdentity> & SignOffBranding,
): StudioEmailIdentity {
  if (
    branding?.studioName?.trim() &&
    branding.logoUrl?.trim() &&
    branding.logoSmallUrl?.trim() &&
    branding.addressLine?.trim() &&
    branding.addressLineCompact?.trim() &&
    branding.unsubscribeDomain?.trim() &&
    branding.contactEmail?.trim()
  ) {
    const studioName = branding.studioName.trim();
    return {
      studioName,
      logoUrl: branding.logoUrl.trim(),
      logoSmallUrl: branding.logoSmallUrl.trim(),
      addressLine: branding.addressLine.trim(),
      addressLineCompact: branding.addressLineCompact.trim(),
      unsubscribeDomain: branding.unsubscribeDomain.trim(),
      contactEmail: branding.contactEmail.trim(),
      studioShortName: explicitShortName(branding.studioShortName, studioName),
      ...signOffFor(studioName, branding),
    };
  }

  const base = emailIdentityFromEnv() || DEFAULT_EMAIL_IDENTITY;
  if (branding !== undefined) {
    const studioName = branding.studioName?.trim() || base.studioName;
    return {
      studioName,
      logoUrl: branding.logoUrl?.trim() || base.logoUrl,
      logoSmallUrl: branding.logoSmallUrl?.trim() || base.logoSmallUrl,
      addressLine: branding.addressLine?.trim() || base.addressLine,
      addressLineCompact: branding.addressLineCompact?.trim() || base.addressLineCompact,
      unsubscribeDomain: branding.unsubscribeDomain?.trim() || base.unsubscribeDomain,
      contactEmail: branding.contactEmail?.trim() || base.contactEmail,
      studioShortName: branding.studioShortName?.trim() || shortNameFor(studioName, base),
      ...signOffFor(studioName, branding),
    };
  }

  return base;
}

/**
 * Fill in each field in order: an explicit `branding` prop (a non-frozen
 * caller's deliberate override) wins first, then the env vars her deployment
 * sets (so every frozen call site, which never passes `branding`, still
 * picks up her identity automatically), then Smudge's own literal default.
 */
export function resolveBranding(branding?: StudioBranding): Required<StudioBranding> {
  if (
    branding?.studioName?.trim() &&
    branding.logoUrl?.trim() &&
    branding.logoSmallUrl?.trim() &&
    branding.addressLine?.trim()
  ) {
    return {
      studioName: branding.studioName.trim(),
      logoUrl: branding.logoUrl.trim(),
      logoSmallUrl: branding.logoSmallUrl.trim(),
      addressLine: branding.addressLine.trim(),
    };
  }

  const identity = resolveStudioEmailIdentity(branding);
  return {
    studioName: identity.studioName,
    logoUrl: identity.logoUrl,
    logoSmallUrl: identity.logoSmallUrl,
    addressLine: identity.addressLine,
  };
}

/**
 * The identity, or null when this deployment cannot state one. The seven fields
 * are all-or-none and resolving them THROWS on a half-set env, which is right
 * for the header (an email whose sender is unknown must not go out) and wrong
 * for a venue line inside the body: the party email's own branding type carries
 * five of the seven, so asking for the other two must not be able to stop a
 * confirmation the customer has already paid for. A null answer hides the venue
 * rather than guessing it, which is the same fail-closed rule in a softer place.
 */
export function tryResolveStudioEmailIdentity(
  branding?: Partial<StudioEmailIdentity>,
): StudioEmailIdentity | null {
  try {
    return resolveStudioEmailIdentity(branding);
  } catch {
    return null;
  }
}

/** A studio's own venue: her trading name and the address SHE stated. */
export interface StudioVenue {
  studioName: string;
  addressLineCompact: string;
}

/**
 * The venue to print, or null when this deployment cannot state one.
 *
 * The identity resolver fills a missing field from Smudge's defaults, which is
 * right for a logo and catastrophic for a street: a studio who stated her name
 * and not her address rendered "Wonky Comet Studio, 102 Union Rd, Surrey Hills
 * VIC 3127" -- her name over Smudge's street, which is worse than saying
 * Smudge, because it is plausible and a family would drive to it (Drew, 6 Sep
 * 2026: never invent a studio address).
 *
 * So the address has to be HERS, not merely resolved. It is hers when the
 * identity is Smudge's own throughout, or when the compact address is not
 * Smudge's default. Anything else answers null and the caller hides the row
 * rather than filling it.
 */
export function resolveStudioVenue(
  branding?: Partial<StudioEmailIdentity>,
): StudioVenue | null {
  const identity = tryResolveStudioEmailIdentity(branding);
  if (!identity) return null;
  const address = identity.addressLineCompact?.trim();
  if (!address) return null;
  if (usesDefaultStudioIdentity(identity)) {
    return { studioName: identity.studioName, addressLineCompact: address };
  }
  if (address === DEFAULT_EMAIL_IDENTITY.addressLineCompact) return null;
  return { studioName: identity.studioName, addressLineCompact: address };
}

/**
 * True when the resolved identity is still Smudge's own. The question every
 * piece of Smudge-specific BODY copy has to ask before it prints: an address,
 * a caterer, a street or a neighbouring cafe belongs to one studio, and none of
 * that data is threaded per-studio yet. One rule, one place, so a second such
 * question cannot answer it differently.
 */
export function usesDefaultStudioIdentity(identity: StudioEmailIdentity): boolean {
  return identity.studioName === DEFAULT_EMAIL_IDENTITY.studioName;
}

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
  /** Omit for Smudge's own palette. */
  theme?: EmailTheme;
}

export function DetailRow({ label, value, marginBottom = true, theme }: DetailRowProps) {
  const COLORS = (theme ?? DEFAULT_EMAIL_THEME).colors;
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

export function GreenCard({ children, theme: supplied }: { children: React.ReactNode } & WithTheme) {
  const theme = supplied ?? DEFAULT_EMAIL_THEME;
  const COLORS = theme.colors;
  const FONT_STACK = theme.fontStack;
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
              color: theme.fg.onGreen,
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

export function GreyCard({ children, theme: supplied }: { children: React.ReactNode } & WithTheme) {
  const theme = supplied ?? DEFAULT_EMAIL_THEME;
  const COLORS = theme.colors;
  const FONT_STACK = theme.fontStack;
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

/** The studio nav, in the studio's own colours, pointing at the studio's own site. */
function studioNav(theme: EmailTheme): NavLink[] {
  const SITE = theme.siteUrl;
  const COLORS = theme.colors;
  return [
    { href: `${SITE}/art-classes`, label: "CLASSES", color: COLORS.orange },
    { href: `${SITE}/book/holidays`, label: "HOLIDAY PROGRAMS", color: COLORS.primary },
    { href: `${SITE}/book/parties`, label: "PARTIES", color: COLORS.green },
    { href: `${SITE}/gift-shop`, label: "GIFT CARDS", color: COLORS.berry },
  ];
}

const HUB_NAV: NavLink[] = [
  { href: `${SITE}/hub`, label: "ART THEMES", color: COLORS.berry },
  { href: `${SITE}/hub/community`, label: "COMMUNITY", color: COLORS.primary },
  { href: `${SITE}/hub/gallery`, label: "GALLERY", color: COLORS.green },
];

function NavStrip({ links, theme }: { links: NavLink[] } & WithTheme) {
  const FONT_STACK = (theme ?? DEFAULT_EMAIL_THEME).fontStack;
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

function Logo({ href, src, alt }: { href: string; src: string; alt: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <img
        src={src}
        alt={alt}
        width="200"
        style={{ display: "block", maxWidth: "200px", width: "100%", height: "auto", border: 0 }}
      />
    </a>
  );
}

function LogoSmall({ src, alt = "Smudge Artspace" }: { src: string; alt?: string }) {
  return (
    <img
      src={src}
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
  /**
   * When supplied, renders the compliance unsubscribe line in the footer
   * (below the copyright, after the Emma sign-off). Pass the per-recipient
   * URL from buildUnsubscribeUrl(). Templates should use this instead of
   * inlining the unsubscribe line in their children, otherwise it lands
   * above the "Thanks so much, / Emma" sign-off.
   */
  unsubscribeUrl?: string | null;
  /**
   * Studio identity for the logo, alt text, copyright line, compliance line
   * and the sign-off. Omit for Smudge's own defaults. The two sign-off fields
   * normally arrive through the deployment's env (STUDIO_OWNER_FIRST_NAME,
   * STUDIO_EMAIL_SIGNATURE_URL) rather than here, which is what lets a frozen
   * call site that passes nothing still sign as the studio it belongs to.
   */
  branding?: StudioBranding & SignOffBranding & ThemeBranding;
  children: React.ReactNode;
}

/**
 * Full-fat studio email shell: logo, multi-colour studio nav, centered <h1>
 * heading, body slot, the owner's sign-off (Emma's signature image on Smudge's
 * own identity) and the footer copyright.
 */
export function BrandedShell({ heading, signoff, unsubscribeUrl, branding, children }: BrandedShellProps) {
  const b = resolveBranding(branding);
  const signOff = resolveStudioSignOff(branding);
  // Local names that SHADOW the module-level Smudge constants, so every
  // reference below this line paints in the resolved theme and an unthemed
  // render still reads exactly the literals it always did.
  const theme = resolveEmailTheme(branding);
  const COLORS = theme.colors;
  const FONT_STACK = theme.fontStack;
  const SITE = theme.siteUrl;
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <style dangerouslySetInnerHTML={{ __html: shellCss(COLORS.bgOuter, COLORS.bgCard) }} />
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
                        <Logo href={SITE} src={b.logoUrl} alt={b.studioName} />
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: "16px 10px 40px" }}>
                        <NavStrip links={studioNav(theme)} theme={theme} />
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
                            fontFamily: theme.headingStack,
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
                        {signOff.signatureUrl ? (
                          <img
                            src={signOff.signatureUrl}
                            alt={signOff.ownerFirstName}
                            width="120"
                            style={{
                              display: "block",
                              maxWidth: "120px",
                              height: "auto",
                              border: 0,
                              margin: "0 auto 16px",
                            }}
                          />
                        ) : (
                          <p
                            style={{
                              fontFamily: FONT_STACK,
                              fontWeight: 400,
                              fontSize: "16px",
                              color: COLORS.text,
                              margin: "0 0 16px",
                            }}
                          >
                            {signOff.signOffName}
                          </p>
                        )}
                        <LogoSmall src={b.logoSmallUrl} alt={b.studioName} />
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
                          © {b.studioName} 2026. All rights reserved
                        </p>
                        {unsubscribeUrl ? (
                          <p
                            style={{
                              fontFamily: FONT_STACK,
                              fontSize: "11px",
                              color: COLORS.textMuted,
                              margin: "8px 0 0",
                              lineHeight: 1.6,
                            }}
                          >
                            You received this because you booked with {b.studioName}.{" "}
                            <a
                              href={unsubscribeUrl}
                              style={{ color: COLORS.textMuted, textDecoration: "underline" }}
                            >
                              Unsubscribe
                            </a>
                            .
                          </p>
                        ) : null}
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
  /** Studio name + postal address for the footer block. Omit for Smudge's own defaults. The Hub wordmark, its nav and its copyright stay Smudge-only -- Hub is not part of a studio clone. */
  branding?: StudioBranding;
  children: React.ReactNode;
}

/**
 * Hub-flavoured email shell: same logo header, Georgia serif heading,
 * berry accent, Hub-specific nav (Themes / Community / Gallery),
 * and richer footer with full address + socials.
 */
export function HubShell({ heading, signoff, branding, children }: HubShellProps) {
  const b = resolveBranding(branding);
  const HUB_HOME = `${SITE}/hub`;
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        {/* No webfont link. The heading face is Georgia, a system font, and
            email clients would not have fetched a webfont anyway. */}
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
                            /* 700: Georgia has 400 and 700 only, and 400 reads
                               thin at 38px against the Montserrat around it. */
                            fontWeight: 700,
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
                        <LogoSmall src={IMG.logoSmall} alt="Smudge Hub" />
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
                          {b.studioName}
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
                          {b.addressLine}
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
export function emailWrap(
  heading: string,
  bodyHtml: string,
  signoff?: string,
  unsubscribeUrl?: string | null,
  branding?: StudioBranding & SignOffBranding & ThemeBranding,
): string {
  return renderEmail(
    <BrandedShell heading={heading} signoff={signoff} unsubscribeUrl={unsubscribeUrl} branding={branding}>
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
export function hubEmailWrap(
  heading: string,
  bodyHtml: string,
  signoff?: string,
  branding?: StudioBranding,
): string {
  return renderEmail(
    <HubShell heading={heading} signoff={signoff} branding={branding}>
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
