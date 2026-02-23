import { verifyPayPalWebhook } from '../paypal.js';
import { handleSuccessfulPayment } from '../payments.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const isValid = await verifyPayPalWebhook(req);
    if (!isValid) return res.status(400).json({ error: 'Invalid signature' });

    const event = req.body;

    if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
      const sale = event.resource;
      const telegramId = sale.custom;
      const amount = sale.amount.total;
      const currency = sale.amount.currency;

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
