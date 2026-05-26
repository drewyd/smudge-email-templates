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
| `@smudge/email-templates/unsubscribe` | `buildUnsubscribeUrl`, `buildUnsubscribeHeaders`, `unsubscribeFooterHtml`, `UNSUBSCRIBE_FOOTER_HTML` |
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

## Publishing

Source-only — no `npm publish`, no build step.

```bash
# Bump version in package.json
git commit -am "v0.2.0"
git tag v0.2.0
git push && git push --tags
```

Then update each consumer's `package.json` dep to `#v0.2.0` and `npm install`.
