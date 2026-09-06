/**
 * Gift-card emails: the recipient's card and the buyer's "on its way" receipt.
 *
 * These two bodies lived inline in smudge-website's stripe-studio webhook until
 * 6 Sep 2026 (leak F17). Every studio-specific thing in them was a literal --
 * five links to smudgeartspace.com, "your Smudge Artspace gift card" twice, the
 * pink SMUDGE ARTSPACE GIFT CARD tile the fallback draws when the PNG cannot be
 * rendered, and the card image's own alt text -- so a clone's customer received
 * her card wearing Smudge's name and clicked through to Smudge's shop.
 *
 * They are strings rather than React components on purpose: the point of the
 * move is that Smudge's own bytes do not change, and a string transcribed
 * character for character can be proved identical against the old inline
 * version. The rest of this package is React; when these two bodies next need
 * real work, that is the moment to convert them.
 *
 * BRAND: Smudge's own render is Transactional Studio exactly as the bible sets
 * it -- Montserrat 400, the six brand colours, the approved white-on-colour
 * pairings, the hosted PNG logo through the shell. Every default below is the
 * literal the inline version carried, and the byte-identical drill proves it.
 * A studio's own type and palette only ever replace them on a deployment that
 * is not Smudge.
 */

import {
  COLORS,
  escapeHtml,
  emailWrap,
  resolveEmailTheme,
  resolveStudioEmailIdentity,
  type SignOffBranding,
  type StudioBranding,
  type ThemeBranding,
} from "./branded";
import { buildUnsubscribeUrl } from "./unsubscribe";
import type { UnsubscribeBranding } from "./unsubscribe";

export type GiftCardBranding = StudioBranding &
  UnsubscribeBranding &
  SignOffBranding &
  ThemeBranding & { contactEmail?: string };

export interface GiftCardRecipientParams {
  /** The address the card is being delivered to. Drives the unsubscribe link. */
  toEmail: string;
  /** Recipient's first name as the buyer typed it. Escaped here. */
  toName: string;
  /** Buyer's name, shown when this is a gift for someone else. Escaped here. */
  buyerName: string;
  /** Redemption code, already generated. Shown as selectable text. */
  code: string;
  /** Face value, already formatted by the caller ("$100"), never re-formatted here. */
  amountLabel: string;
  /** The buyer's note to the recipient, or empty. Escaped here. */
  message?: string | null;
  /** True when the card is going to someone other than the buyer. */
  isGift: boolean;
  /**
   * True when the designed card PNG rendered and is attached with
   * content_id "gift-card". False draws the coloured fallback tile instead.
   */
  hasCardImage: boolean;
  /** Stripe receipt URL, shown only on a self-purchase. */
  receiptUrl?: string | null;
  branding?: GiftCardBranding;
}

export interface GiftCardBuyerParams {
  buyerEmail: string;
  buyerName: string;
  /** How many cards went out. Drives singular/plural throughout. */
  cardCount: number;
  receiptUrl: string;
  branding?: GiftCardBranding;
}

export interface GiftCardEmail {
  subject: string;
  html: string;
}

/**
 * The style fragments these two bodies use. Each falls back to the exact
 * literal the inline version carried, so an unthemed render is byte-identical.
 */
function giftCardStyle(branding?: GiftCardBranding) {
  const theme = resolveEmailTheme(branding);
  return {
    font: theme.fontDecl,
    tileBg: theme.colors.primary,
    tileInk: theme.fg.onPrimary,
    /** The soft cream the buyer's note sits on. Smudge's own one-off warm tint. */
    noteBg: theme.paletteThemed ? theme.colors.pink : "#faf6f0",
    noteLabel: theme.colors.primary,
    noteInk: COLORS.textLight,
    codeInk: theme.colors.text,
    linkInk: theme.colors.berry,
    buttonBg: theme.colors.orange,
    buttonInk: theme.fg.onOrange,
    chipBg: theme.colors.green,
    chipInk: theme.fg.onGreen,
    quietInk: COLORS.textMuted,
    imageBorder: COLORS.border,
    site: theme.siteUrl,
    /** The site as a reader should see it written: "smudgeartspace.com". */
    siteLabel: theme.siteUrl.replace(/^https?:\/\//, "").replace(/^www\./, ""),
  };
}

export function buildGiftCardRecipientEmail(params: GiftCardRecipientParams): GiftCardEmail {
  const { toEmail, toName, buyerName, code, amountLabel, message, isGift, hasCardImage, receiptUrl, branding } =
    params;
  const identity = resolveStudioEmailIdentity(branding);
  const s = giftCardStyle(branding);
  // The subject is plain text and takes the name as it is. Everything below
  // goes into raw markup this file writes by hand, including an alt attribute,
  // so the name is escaped there. The inline version had a literal in these
  // places and never had to ask; the moment it became a value read from a
  // deployment's environment, it did. escapeHtml leaves "Smudge Artspace"
  // exactly as it was, which is why the byte proof still holds.
  const subjectStudio = identity.studioName;
  const studio = escapeHtml(subjectStudio);
  // Both already came from the caller in the inline version and both are
  // machine-made (a fixed-alphabet code, a formatted amount), but they land in
  // the same alt attribute, so they are escaped beside it rather than trusted.
  const safeAmount = escapeHtml(amountLabel);
  const safeCode = escapeHtml(code);

  const cardBlock = hasCardImage
    ? `<div style="text-align:center;margin:22px 0;"><img src="cid:gift-card" alt="Your ${safeAmount} ${studio} gift card, code ${safeCode}" width="460" style="display:block;width:100%;max-width:460px;height:auto;margin:0 auto;border-radius:14px;border:1px solid ${s.imageBorder};" /></div>`
    : `<div style="text-align:center;margin:22px 0;"><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="background-color:${s.tileBg};border-radius:16px;"><tr><td align="center" style="background-color:${s.tileBg};border-radius:16px;padding:28px 44px;"><div style="${s.font};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${s.tileInk};margin:0 0 8px;">${studio} Gift Card</div><div style="${s.font};font-size:46px;font-weight:700;line-height:1;color:${s.tileInk};">${safeAmount}</div></td></tr></table></div>`;

  const body = `
            <p style="margin:0 0 14px;text-align:center;">Hi ${escapeHtml(toName)},</p>
            ${
              isGift
                ? `<p style="margin:0 0 16px;text-align:center;font-size:17px;">Wonderful news. ${escapeHtml(buyerName)} has sent you a ${studio} gift card! That is a whole session of colour, mess and made-it-myself magic, waiting for whenever you are.</p>`
                : `<p style="margin:0 0 16px;text-align:center;font-size:17px;">All done, and what a lovely thing to give. Here is your ${studio} gift card, ready to print or hand over whenever the moment feels right.</p>`
            }
            ${
              isGift && message
                ? `<div style="background-color:${s.noteBg};border-radius:14px;padding:18px 22px;margin:0 0 18px;text-align:center;"><div style="${s.font};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${s.noteLabel};margin:0 0 6px;">A note from ${escapeHtml(buyerName)}</div><div style="${s.font};font-style:italic;color:${s.noteInk};">&ldquo;${escapeHtml(message)}&rdquo;</div></div>`
                : ""
            }
            ${cardBlock}
            <p style="margin:0 0 20px;text-align:center;">${isGift ? "Your" : "The"} code is <strong style="letter-spacing:0.08em;color:${s.codeInk};">${safeCode}</strong>. ${isGift ? "Pop it in when you book and it comes straight off the price, on any class at" : "Whoever you give it to just enters it when they book, and it comes straight off the price, on any class at"} <a href="${s.site}" style="color:${s.linkInk};">${s.siteLabel}</a>.</p>
            <div style="text-align:center;margin:0;">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="background-color:${s.buttonBg};border-radius:999px;">
                <tr><td align="center" style="background-color:${s.buttonBg};border-radius:999px;"><a href="${s.site}/art-classes" style="display:inline-block;padding:14px 34px;${s.font};font-size:14px;font-weight:700;color:${s.buttonInk};text-decoration:none;">${isGift ? "Find your first class" : "Browse our classes"}</a></td></tr>
              </table>
            </div>
            ${!isGift && receiptUrl ? `<p style="margin:18px 0 0;text-align:center;font-size:13px;"><a href="${receiptUrl}" style="color:${s.quietInk};">View your receipt</a></p>` : ""}
          `;

  return {
    subject: isGift
      ? `Hooray! You've been sent a ${subjectStudio} gift card`
      : `Your ${subjectStudio} gift card is ready to give`,
    html: emailWrap(
      isGift ? "Hooray!" : "Ready to give!",
      body,
      "Happy creating!",
      buildUnsubscribeUrl(toEmail, branding),
      branding,
    ),
  };
}

export function buildGiftCardBuyerEmail(params: GiftCardBuyerParams): GiftCardEmail {
  const { buyerEmail, buyerName, cardCount, receiptUrl, branding } = params;
  const s = giftCardStyle(branding);

  const body = `
          <p style="margin:0 0 14px;text-align:center;">Hi ${escapeHtml(buyerName)},</p>
          <p style="margin:0 0 18px;text-align:center;font-size:17px;">Look at you, giving the gift of making! ${cardCount === 1 ? "Your gift card has" : `All ${cardCount} gift cards have`} gone straight to ${cardCount === 1 ? "your recipient's inbox" : "your recipients' inboxes"}, each with its own code to spend on a class full of colour and mess.</p>
          <div style="text-align:center;margin:0 0 18px;">
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="background-color:${s.chipBg};border-radius:999px;"><tr><td align="center" style="background-color:${s.chipBg};border-radius:999px;padding:9px 20px;${s.font};font-size:13px;font-weight:700;color:${s.chipInk};">${cardCount === 1 ? "1 gift card" : `${cardCount} gift cards`} on the way</td></tr></table>
          </div>
          ${receiptUrl ? `<p style="margin:0;text-align:center;font-size:13px;"><a href="${receiptUrl}" style="color:${s.quietInk};">View your receipt</a></p>` : ""}
        `;

  return {
    subject: `Hooray! Your gift card is on its way`,
    html: emailWrap(
      "You fabulous gift-giver!",
      body,
      "Thanks so much,",
      buildUnsubscribeUrl(buyerEmail, branding),
      branding,
    ),
  };
}
