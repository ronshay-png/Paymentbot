// api/webhook-stripe.js - Stripe Webhook Handler

import Stripe from 'stripe';
import { handleSuccessfulPayment } from '../lib/payments.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: { bodyParser: false }, // חובה! Stripe צריך את ה-raw body לאימות
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // קרא את ה-raw body
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // 1. אמת שה-webhook אמיתי מ-Stripe
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. בדוק שזה תשלום שהושלם
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      const telegramId = session.client_reference_id; // ה-Telegram ID
      const amount = (session.amount_total / 100).toFixed(2);
      const currency = session.currency.toUpperCase();

      console.log(`✅ Stripe payment completed: ${amount} ${currency} from Telegram user ${telegramId}`);

      await handleSuccessfulPayment({
        telegramId,
        amount,
        currency,
        method: 'Stripe',
        transactionId: session.payment_intent,
      });
    }
  }

  res.status(200).json({ received: true });
}

// Helper לקרוא raw body ב-Vercel
async function buffer(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
