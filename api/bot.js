const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendMessage(chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Bot is running ✅');

  const update = req.body;

  if (update.message) {
    const { chat, text, from } = update.message;
    const chatId = chat.id;

    if (text === '/start' || text === '/pay') {
      await sendMessage(chatId, `👋 שלום ${from.first_name}!\n\nבחר שיטת תשלום:`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💳 PayPal', callback_data: 'pay_paypal' },
              { text: '💳 Stripe', callback_data: 'pay_stripe' },
            ],
          ],
        },
      });
    }
  }

  if (update.callback_query) {
    const { data, from } = update.callback_query;
    const chatId = update.callback_query.message.chat.id;
    const userId = from.id;

    if (data === 'pay_paypal') {
      const link = `${process.env.PAYPAL_PAYMENT_LINK}?custom=${userId}`;
      await sendMessage(chatId, `💳 לתשלום דרך PayPal:\n${link}`);
    }

    if (data === 'pay_stripe') {
      const link = `${process.env.STRIPE_PAYMENT_LINK}?client_reference_id=${userId}`;
      await sendMessage(chatId, `💳 לתשלום דרך Stripe:\n${link}`);
    }
  }

  res.status(200).json({ ok: true });
}
