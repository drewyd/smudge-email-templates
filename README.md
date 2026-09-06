# @smudge/email-templates

Canonical transactional email templates for Smudge Artspace, shared between `smudge-website` and `operations-dashboard`.

Consumed via `"@smudge/email-templates": "github:drewyd/smudge-email-templates#v0.1.0"` (or a later tag). No npm registry required — Vercel installs straight from this private repo via its GitHub auth.

## Why this exists

Before this package existed, `smudge-website` and `operations-dashboard` each carried their own copy of `party-confirmation.ts` and `class-confirmation.ts`. They drifted: the website version had unsubscribe links, an age-resolution helper, and a customer subject builder; the dashboard version did not. A fix on one side never reached the other.

Single source of truth, one package, both repos pull the same code.

## Modules

| Path | Purpose |
|---|---|
| `@smudge/email-templates/branded` | `emailWrap`, `hubEmailWrap`, `greenCard`, `greyCard`, helpers (`escapeHtml`, `fmtDate`, `fmtTime`, `ordinalSuffix`, `computeAgeAtParty`, `detailRow`), brand constants (`SITE`, `IMG`, `COLORS`, `F`, `FW4`, `FW7`) |
| `@smudge/email-templates/unsubscribe` | `buildUnsubscribeUrl`, `buildUnsubscribeHeaders`, `unsubscribeFooterHtml` |
| `@smudge/email-templates/party-confirmation` | `buildPartyConfirmationEmail(params)` — returns `{ customerHtml, internalHtml, resolvedAge, customerSubject }` |
| `@smudge/email-templates/class-confirmation` | `buildClassConfirmationEmail(params)` — returns `{ subject, customerHtml, internalHtml }` |

Or import everything from the root:

```ts
import { buildPartyConfirmationEmail, buildClassConfirmationEmail } from '@smudge/email-templates';
```

## Consumer setup

Both consumer apps need `next.config` to know this package ships TypeScript source (no prebuilt dist):

```js
// next.config.js / next.config.ts
transpilePackages: ['@smudge/email-templates']
```

## Per-studio identity and theme (v0.3.x, v0.4.0)

Every studio-specific value resolves inside this package, in one order, with
Smudge's own literal as the default at every step: an explicit `branding`
object, then the deployment's own environment, then Smudge. A frozen call site
that passes nothing still sends the studio's own email.

**Identity, seven fields, all-or-none** (a half-set one throws, so no email can
ever carry two studios): `STUDIO_NAME`, `STUDIO_EMAIL_LOGO_URL`,
`STUDIO_EMAIL_LOGO_SMALL_URL`, `STUDIO_EMAIL_ADDRESS_LINE`,
`STUDIO_EMAIL_ADDRESS_LINE_COMPACT`, `STUDIO_EMAIL_UNSUBSCRIBE_DOMAIN`,
`STUDIO_HELLO_ADDRESS`.

**Read beside them, never required:** `STUDIO_SHORT_NAME` (the two confirmation
subjects), `STUDIO_OWNER_FIRST_NAME` and `STUDIO_EMAIL_SIGNATURE_URL` (the
sign-off; an image is only ever drawn beside the name it belongs to).

**Theme, two all-or-none sets plus one URL.** The colour and font names are the
SAME ones the website theme layer defines, so an email matches the site it came
from: `NEXT_PUBLIC_STUDIO_COLOR_PRIMARY`, `_SECONDARY`, `_CTA`, `_SUCCESS`,
`_INK`, `_SURFACE` and `NEXT_PUBLIC_STUDIO_BACKGROUND_COLOR` are one set;
`NEXT_PUBLIC_STUDIO_FONT_BODY` and `NEXT_PUBLIC_STUDIO_FONT_HEADING` are the
other; `STUDIO_SITE_URL` points the nav strip and the shell's buttons at the
studio's own site. A set missing a value, or carrying a malformed one, is
rejected whole and Smudge's stands. Mail clients do not download web fonts, so
a font stack must carry real fallbacks the reader already has.

Body copy follows the identity only where the identity holds the answer. Both
greetings and both Location rows read the studio's name and her own address.
Smudge's caterer, her street, the cafe over the road and her courtyard are not
per-studio data, so those six party-FAQ items are shortened or dropped on a
clone and the list renumbers itself.

## Proof

Two scripts, both of which must stay all-OK:

```bash
npx tsx scripts/email-identity-byte-identical.mjs   # 394 checks: identity, sign-off, theme, venue copy
npx tsx scripts/gift-card-byte-identical.mjs        # 19 fixtures: the moved gift-card bodies
```

The first renders every entry point against a recorded baseline captured from
the unmodified code and fails on a single changed byte, then renders the same
fixtures under a studio's identity and asserts hers appears and Smudge's is
gone. New fixtures are refused until added to the baseline deliberately.

## Publishing

Source-only — no `npm publish`, no build step.

```bash
# Bump version in package.json
git commit -am "v0.2.0"
git tag v0.2.0
git push && git push --tags
```

Then update each consumer's `package.json` dep to `#v0.2.0` and `npm install`.
