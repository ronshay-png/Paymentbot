const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Verify that the webhook came from Stripe using the signature header.
 * Throws if invalid — never process unverified webhooks.
 */
function verifyStripeWebhook(req) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // req.body must be the raw buffer (not parsed JSON)
  // Vercel: add `export const config = { api: { bodyParser: false } }` in webhook route
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  return event;
}

/**
 * Handle Stripe events and extract payment info.
 * Returns null if the event is not a completed payment.
 */
async function handleStripeEvent(event) {
  if (event.type !== 'checkout.session.completed') return null;

  const session = event.data.object;

  // We store the Telegram user ID in metadata when creating the checkout session
  const telegramId = session.metadata?.telegram_id;
  if (!telegramId) {
    console.warn('Stripe payment completed but no telegram_id in metadata');
    return null;
  }

  return {
    telegramId,
    amount: session.amount_total / 100,       // Stripe uses cents
    currency: session.currency.toUpperCase(),
    plan: session.metadata?.plan || 'Premium',
  };
}

/**
 * Create a Stripe Checkout Session for a given Telegram user.
 * Call this from your bot when user clicks "Pay".
 */
async function createCheckoutSession({ telegramId, plan, priceId }) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/cancel`,
    metadata: {
      telegram_id: String(telegramId),
      plan,
    },
  });

  return session.url;
}

module.exports = { verifyStripeWebhook, handleStripeEvent, createCheckoutSession };
