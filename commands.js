const { createCheckoutSession } = require('../payments/stripe');
const { createPaypalOrder } = require('../payments/paypal');
const { sendPaymentOptions } = require('./telegram');

/**
 * This is your Telegram bot update handler.
 * Deploy at /api/bot.js on Vercel and point your Telegram webhook here.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;
  const message = update.message || update.callback_query?.message;
  if (!message) return res.status(200).end();

  const chatId = message.chat.id;
  const text = message.text || '';

  try {
    if (text.startsWith('/start')) {
      await handleStart(chatId);
    } else if (text.startsWith('/pay')) {
      await handlePay(chatId);
    }
  } catch (err) {
    console.error('Bot handler error:', err.message);
  }

  res.status(200).end();
};

async function handleStart(chatId) {
  const { callTelegram } = require('./telegram');
  // Simple welcome — extend as needed
  const axios = require('axios');
  await axios.post(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: chatId,
      text:
        '👋 *ברוכים הבאים!*\n\nכדי לקבל גישה לתוכן הפרימיום, לחץ/י על /pay',
      parse_mode: 'Markdown',
    }
  );
}

async function handlePay(chatId) {
  const plan = 'Premium';
  const amount = process.env.PRICE_AMOUNT || '29.99';

  // Generate payment links from both providers
  const [stripeUrl, paypalUrl] = await Promise.all([
    createCheckoutSession({
      telegramId: chatId,
      plan,
      priceId: process.env.STRIPE_PRICE_ID,
    }),
    createPaypalOrder({
      telegramId: chatId,
      amount,
      currency: 'USD',
      plan,
    }),
  ]);

  await sendPaymentOptions(chatId, { stripeUrl, paypalUrl });
}
