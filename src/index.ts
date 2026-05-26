/**
 * @smudge/email-templates — public API barrel.
 *
 * Re-exports the public surface of every module so consumers can either
 * import the whole grab-bag from the root:
 *
 *   import { buildPartyConfirmationEmail, emailWrap, COLORS } from '@smudge/email-templates';
 *
 * Or import a single module:
 *
 *   import { buildPartyConfirmationEmail } from '@smudge/email-templates/party-confirmation';
 */

export * from "./branded";
export * from "./unsubscribe";
export * from "./party-confirmation";
export * from "./class-confirmation";
