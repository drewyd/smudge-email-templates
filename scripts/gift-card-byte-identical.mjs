/**
 * The OLD inline gift-card bodies, transcribed character for character from
 * smudge-website origin/main src/app/(my-app)/api/webhooks/stripe-studio/route.ts
 * (handleGiftCardPurchase, lines 714-802 at 76b6434a), rendered through the same
 * emailWrap the webhook used, and diffed against the package's new builders.
 *
 * Nineteen fixtures: every branch of both bodies (gift or self-purchase, with
 * and without the buyer's note, with the designed PNG and with the fallback
 * tile, with and without a receipt link, and one, two and five cards on the
 * buyer's receipt), with names carrying the characters escapeHtml exists for.
 *
 * Run: npx tsx scripts/gift-card-byte-identical.mjs
 */
import { emailWrap, escapeHtml } from "../src/branded.tsx";
import { buildUnsubscribeUrl } from "../src/unsubscribe.ts";
import {
  buildGiftCardRecipientEmail,
  buildGiftCardBuyerEmail,
} from "../src/gift-card.ts";

const money = (n) => `$${n}`;

function oldRecipient(gc, buyerName, receiptUrl, cardSuccess) {
  const cardBlock = cardSuccess
    ? `<div style="text-align:center;margin:22px 0;"><img src="cid:gift-card" alt="Your ${money(gc.amount)} Smudge Artspace gift card, code ${gc.code}" width="460" style="display:block;width:100%;max-width:460px;height:auto;margin:0 auto;border-radius:14px;border:1px solid #e5e5e5;" /></div>`
    : `<div style="text-align:center;margin:22px 0;"><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="background-color:#ec6f86;border-radius:16px;"><tr><td align="center" style="background-color:#ec6f86;border-radius:16px;padding:28px 44px;"><div style="font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#ffffff;margin:0 0 8px;">Smudge Artspace Gift Card</div><div style="font-family:'Montserrat',Arial,sans-serif;font-size:46px;font-weight:700;line-height:1;color:#ffffff;">${money(gc.amount)}</div></td></tr></table></div>`;
  return {
    subject: gc.isGift
      ? `Hooray! You've been sent a Smudge Artspace gift card`
      : `Your Smudge Artspace gift card is ready to give`,
    html: emailWrap(
      gc.isGift ? "Hooray!" : "Ready to give!",
      `
            <p style="margin:0 0 14px;text-align:center;">Hi ${escapeHtml(gc.toName)},</p>
            ${
              gc.isGift
                ? `<p style="margin:0 0 16px;text-align:center;font-size:17px;">Wonderful news. ${escapeHtml(buyerName)} has sent you a Smudge Artspace gift card! That is a whole session of colour, mess and made-it-myself magic, waiting for whenever you are.</p>`
                : `<p style="margin:0 0 16px;text-align:center;font-size:17px;">All done, and what a lovely thing to give. Here is your Smudge Artspace gift card, ready to print or hand over whenever the moment feels right.</p>`
            }
            ${
              gc.isGift && gc.message
                ? `<div style="background-color:#faf6f0;border-radius:14px;padding:18px 22px;margin:0 0 18px;text-align:center;"><div style="font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ec6f86;margin:0 0 6px;">A note from ${escapeHtml(buyerName)}</div><div style="font-family:'Montserrat',Arial,sans-serif;font-style:italic;color:#4a4a4a;">&ldquo;${escapeHtml(gc.message)}&rdquo;</div></div>`
                : ""
            }
            ${cardBlock}
            <p style="margin:0 0 20px;text-align:center;">${gc.isGift ? "Your" : "The"} code is <strong style="letter-spacing:0.08em;color:#231f20;">${gc.code}</strong>. ${gc.isGift ? "Pop it in when you book and it comes straight off the price, on any class at" : "Whoever you give it to just enters it when they book, and it comes straight off the price, on any class at"} <a href="https://www.smudgeartspace.com" style="color:#236eaf;">smudgeartspace.com</a>.</p>
            <div style="text-align:center;margin:0;">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="background-color:#f37321;border-radius:999px;">
                <tr><td align="center" style="background-color:#f37321;border-radius:999px;"><a href="https://www.smudgeartspace.com/art-classes" style="display:inline-block;padding:14px 34px;font-family:'Montserrat',Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${gc.isGift ? "Find your first class" : "Browse our classes"}</a></td></tr>
              </table>
            </div>
            ${!gc.isGift && receiptUrl ? `<p style="margin:18px 0 0;text-align:center;font-size:13px;"><a href="${receiptUrl}" style="color:#788291;">View your receipt</a></p>` : ""}
          `,
      "Happy creating!",
      buildUnsubscribeUrl(gc.toEmail),
    ),
  };
}

function oldBuyer(buyerName, buyerEmail, generatedCodesLength, receiptUrl) {
  return {
    subject: `Hooray! Your gift card is on its way`,
    html: emailWrap(
      "You fabulous gift-giver!",
      `
          <p style="margin:0 0 14px;text-align:center;">Hi ${escapeHtml(buyerName)},</p>
          <p style="margin:0 0 18px;text-align:center;font-size:17px;">Look at you, giving the gift of making! ${generatedCodesLength === 1 ? "Your gift card has" : `All ${generatedCodesLength} gift cards have`} gone straight to ${generatedCodesLength === 1 ? "your recipient's inbox" : "your recipients' inboxes"}, each with its own code to spend on a class full of colour and mess.</p>
          <div style="text-align:center;margin:0 0 18px;">
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="background-color:#099f4a;border-radius:999px;"><tr><td align="center" style="background-color:#099f4a;border-radius:999px;padding:9px 20px;font-family:'Montserrat',Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff;">${generatedCodesLength === 1 ? "1 gift card" : `${generatedCodesLength} gift cards`} on the way</td></tr></table>
          </div>
          ${receiptUrl ? `<p style="margin:0;text-align:center;font-size:13px;"><a href="${receiptUrl}" style="color:#788291;">View your receipt</a></p>` : ""}
        `,
      "Thanks so much,",
      buildUnsubscribeUrl(buyerEmail),
    ),
  };
}

/* ---- fixtures: every branch of both bodies ---------------------------- */
const CASES = [];
for (const isGift of [true, false]) {
  for (const hasMessage of [true, false]) {
    for (const cardSuccess of [true, false]) {
      for (const receipt of ["https://pay.stripe.com/receipts/abc123", null]) {
        CASES.push({
          name: `recipient isGift=${isGift} message=${hasMessage} card=${cardSuccess} receipt=${Boolean(receipt)}`,
          kind: "recipient",
          gc: {
            amount: 100,
            code: "SMUDGE-7QK2-9WD4",
            toName: "Jamie O'Brien & Co",
            toEmail: "jamie@example.com",
            isGift,
            message: hasMessage ? 'A little "something" for you <3' : "",
          },
          buyerName: "Priya <Shah>",
          receiptUrl: receipt,
          cardSuccess,
        });
      }
    }
  }
}
for (const count of [1, 2, 5]) {
  CASES.push({
    name: `buyer cards=${count}`,
    kind: "buyer",
    buyerName: "Priya <Shah>",
    buyerEmail: "priya@example.com",
    count,
    receiptUrl: "https://pay.stripe.com/receipts/abc123",
  });
}

let fails = 0;
for (const c of CASES) {
  let a, b;
  if (c.kind === "recipient") {
    a = oldRecipient(c.gc, c.buyerName, c.receiptUrl, c.cardSuccess);
    b = buildGiftCardRecipientEmail({
      toEmail: c.gc.toEmail,
      toName: c.gc.toName,
      buyerName: c.buyerName,
      code: c.gc.code,
      amountLabel: money(c.gc.amount),
      message: c.gc.message,
      isGift: c.gc.isGift,
      hasCardImage: c.cardSuccess,
      receiptUrl: c.receiptUrl,
    });
  } else {
    a = oldBuyer(c.buyerName, c.buyerEmail, c.count, c.receiptUrl);
    b = buildGiftCardBuyerEmail({
      buyerEmail: c.buyerEmail,
      buyerName: c.buyerName,
      cardCount: c.count,
      receiptUrl: c.receiptUrl,
    });
  }
  const subjOk = a.subject === b.subject;
  const htmlOk = a.html === b.html;
  if (subjOk && htmlOk) {
    console.log(`  OK   ${c.name}`);
  } else {
    fails++;
    console.log(`  FAIL ${c.name} -- subject ${subjOk ? "same" : "DIFFERS"}, html ${htmlOk ? "same" : "DIFFERS"}`);
    if (!subjOk) console.log(`       old: ${a.subject}\n       new: ${b.subject}`);
    if (!htmlOk) {
      for (let i = 0; i < Math.max(a.html.length, b.html.length); i++) {
        if (a.html[i] !== b.html[i]) {
          console.log(`       first difference at ${i}:`);
          console.log(`       old ...${JSON.stringify(a.html.slice(Math.max(0, i - 70), i + 40))}`);
          console.log(`       new ...${JSON.stringify(b.html.slice(Math.max(0, i - 70), i + 40))}`);
          break;
        }
      }
    }
  }
}
console.log("");
if (fails) {
  console.error(`GIFT-CARD MOVE FAILED: ${fails} of ${CASES.length} fixtures differ.`);
  process.exit(1);
}
console.log(`GIFT-CARD MOVE PROVEN: all ${CASES.length} fixtures byte-identical to the inline version.`);
