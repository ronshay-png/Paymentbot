// api/bot.js - Telegram Bot Webhook Handler

import { sendMessage, sendInvoiceButtons } from '../lib/telegram.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Bot is running ✅');

  const update = req.body;

  if (update.message) {
    const { chat, text, from } = update.message;
    const chatId = chat.id;
    const userId = from.id;

    if (text === '/start' || text === '/pay') {
      await sendMessage(chatId, `👋 שלום ${from.first_name}!\n\nבחר שיטת תשלום:`);
      await sendInvoiceButtons(chatId, userId);
    }
  }

  if (update.callback_query) {
    const { data, from, message } = update.callback_query;
    const chatId = message.chat.id;
    const userId = from.id;

    if (data === 'pay_paypal') {
      const paypalLink = `${process.env.PAYPAL_PAYMENT_LINK}?custom=${userId}`;
      await sendMessage(chatId, `💳 *תשלום דרך PayPal*\n\n[לחץ כאן לתשלום](${paypalLink})`, { parse_mode: 'Markdown' });
    }

    if (data === 'pay_stripe') {
      const stripeLink = `${process.env.STRIPE_PAYMENT_LINK}?client_reference_id=${userId}`;
      await sendMessage(chatId, `💳 *תשלום דרך Stripe*\n\n[לחץ כאן לתשלום](${stripeLink})`, { parse_mode: 'Markdown' });
    }
  }

  res.status(200).json({ ok: true });
}
