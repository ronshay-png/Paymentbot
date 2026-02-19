// api/webhook.js - Vercel Serverless Function
// Handles PayPal and Stripe webhooks → Telegram Bot notifications

export const config = {
  api: { bodyParser: false }, // Required for Stripe signature verification
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawBody = await getRawBody(req);
  const provider = req.query.provider; // ?provider=stripe or ?provider=paypal

  try {
    let telegramUserId, amount, currency, paymentId;

    if (provider === 'stripe') {
      const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
      const event = stripe.webhooks.constructEvent(
        rawBody,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET
      );
      if (event.type !== 'checkout.session.completed') return res.status(200).json({ received: true });
      const session = event.data.object;
      telegramUserId = session.metadata?.telegram_user_id;
      amount = (session.amount_total / 100).toFixed(2);
      currency = session.currency.toUpperCase();
      paymentId = session.id;

    } else if (provider === 'paypal') {
      // Verify PayPal webhook signature
      const isValid = await verifyPayPal(rawBody, req.headers);
      if (!isValid) return res.status(401).json({ error: 'Invalid PayPal signature' });
      const event = JSON.parse(rawBody);
      if (event.event_type !== 'PAYMENT.SALE.COMPLETED') return res.status(200).json({ received: true });
      const resource = event.resource;
      telegramUserId = resource.custom; // Set this when creating the PayPal payment
      amount = parseFloat(resource.amount.total).toFixed(2);
      currency = resource.amount.currency;
      paymentId = resource.id;

    } else {
      return res.status(400).json({ error: 'Use ?provider=stripe or ?provider=paypal' });
    }

    if (!telegramUserId) {
      console.error('No telegram_user_id in payment metadata');
      return res.status(200).json({ received: true });
    }

    // Run both actions in parallel
    await Promise.all([
      notifyUser(telegramUserId, amount, currency, paymentId, provider),
      addToGroup(telegramUserId),
    ]);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: err.message });
  }
}

async function notifyUser(chatId, amount, currency, paymentId, provider) {
  const emoji = provider === 'stripe' ? '💳' : '🅿️';
  const text = `✅ *תשלום התקבל בהצלחה!*\n\n${emoji} ספק: ${provider}\n💰 סכום: ${amount} ${currency}\n🆔 מזהה: \`${paymentId}\`\n\nתודה על הרכישה! 🎉`;
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

async function addToGroup(userId) {
  // Unban first (in case they were removed), then send invite link
  const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  // Unban = allow to join again
  await fetch(`${BASE}/unbanChatMember`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_GROUP_ID, user_id: userId }),
  });
  // Send private invite link to the user
  const linkRes = await fetch(`${BASE}/createChatInviteLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_GROUP_ID, member_limit: 1 }),
  });
  const { result } = await linkRes.json();
  await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: userId,
      text: `🔗 הנה הקישור שלך לקבוצה:\n${result.invite_link}`,
    }),
  });
}

async function verifyPayPal(rawBody, headers) {
  // Verify PayPal webhook signature via PayPal API
  const token = await getPayPalToken();
  const res = await fetch('https://api.paypal.com/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}

async function getPayPalToken() {
  const creds = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
