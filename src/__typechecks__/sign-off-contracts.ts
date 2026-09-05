/**
 * Type-only contracts for the sign-off fields. Compiled by `tsc --noEmit`,
 * imported by nothing, so it adds no runtime code to either app's bundle.
 *
 * It exists because the drill is JavaScript and cannot see a type error: the
 * second cold read (5 Sep 2026) found that the new sign-off fields reached
 * BrandedShell's prop type and none of the other three public doors, and that
 * a RESOLVED identity could not be handed back into the API that produced it,
 * while every runtime check passed.
 *
 * TWO earlier versions of this file could not fail, which is worth writing
 * down because both looked like tests:
 *   - `T extends U ? true : never` evaluates to `never` instead of erroring,
 *     so narrowing a parameter changed nothing.
 *   - `Expect<Assignable<A, B>>` was assertion-shaped but pointed the wrong
 *     way: an object type with EXTRA properties is always assignable to one
 *     without them, so narrowing a door still compiled clean.
 * Only an object LITERAL assigned to the door's own type fails, because
 * excess-property checking applies to literals and nothing else. Each
 * assignment below was drilled by narrowing its door and watching tsc go red.
 */
import {
  BrandedShell,
  emailWrap,
  resolveStudioEmailIdentity,
  resolveStudioSignOff,
  type StudioEmailIdentity,
} from "../branded.js";
import type { ClassConfirmationParams } from "../class-confirmation.js";
import type { PartyConfirmationParams } from "../party-confirmation.js";

type ShellBranding = NonNullable<Parameters<typeof BrandedShell>[0]["branding"]>;
type EmailWrapBranding = NonNullable<Parameters<typeof emailWrap>[4]>;
type ClassBranding = NonNullable<ClassConfirmationParams["branding"]>;
type PartyBranding = NonNullable<PartyConfirmationParams["branding"]>;

/**
 * A caller naming its own signer, written as a literal at every door that
 * takes branding. Narrow any of these four contracts and the literal's
 * ownerFirstName / signatureUrl become excess properties: a compile error.
 */
const signerAtTheShell: ShellBranding = {
  studioName: "Wonky Comet Studio",
  ownerFirstName: "Tess",
  signatureUrl: "https://demo.withsmock.com/email-assets/tess-signature.png",
};
const signerAtEmailWrap: EmailWrapBranding = {
  studioName: "Wonky Comet Studio",
  ownerFirstName: "Tess",
  signatureUrl: "https://demo.withsmock.com/email-assets/tess-signature.png",
};
const signerAtTheClassBuilder: ClassBranding = {
  studioName: "Wonky Comet Studio",
  ownerFirstName: "Tess",
  signatureUrl: "https://demo.withsmock.com/email-assets/tess-signature.png",
};
const signerAtThePartyBuilder: PartyBranding = {
  studioName: "Wonky Comet Studio",
  ownerFirstName: "Tess",
  signatureUrl: "https://demo.withsmock.com/email-assets/tess-signature.png",
};

/**
 * A studio with no signature file says so with null, and a RESOLVED identity
 * carries `signatureUrl: string | null`, so every door has to accept null
 * there or the shared identity cannot be passed back through the API that
 * produced it.
 */
const signerWithoutAnImage: ShellBranding = {
  studioName: "Wonky Comet Studio",
  ownerFirstName: "Tess",
  signatureUrl: null,
};

/** The round trip as an expression, where inference actually runs. */
export function identityRoundTrips(): string {
  const resolved: StudioEmailIdentity = resolveStudioEmailIdentity();
  resolveStudioSignOff(resolved);
  resolveStudioEmailIdentity(resolved);
  const classBranding: ClassBranding = resolved;
  const partyBranding: PartyBranding = resolved;
  void classBranding;
  void partyBranding;
  void signerAtTheShell;
  void signerAtEmailWrap;
  void signerAtTheClassBuilder;
  void signerAtThePartyBuilder;
  void signerWithoutAnImage;
  return emailWrap("Heading", "<p>Body</p>", "Thanks so much,", null, resolved);
}
