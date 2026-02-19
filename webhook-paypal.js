// api/webhook-paypal.js - PayPal Webhook Handler

import { verifyPayPalWebhook } from '../lib/paypal.js';
import { handleSuccessfulPayment } from '../lib/payments.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    // 1. אמת שה-webhook אמיתי מ-PayPal
    const isValid = await verifyPayPalWebhook(req);
    if (!isValid) {
      console.error('Invalid PayPal webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // 2. בדוק שזה תשלום שהושלם
    if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
      const sale = event.resource;
      const telegramId = sale.custom; // ה-Telegram ID שהועבר ב-custom field
      const amount = sale.amount.total;
      const currency = sale.amount.currency;

      console.log(`✅ PayPal payment completed: ${amount} ${currency} from Telegram user ${telegramId}`);

      await handleSuccessfulPayment({
        telegramId,
        amount,
        currency,
        method: 'PayPal',
        transactionId: sale.id,
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('PayPal webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
