const axios = require('axios');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Send a payment confirmation message to the user.
 */
async function sendPaymentConfirmation(chatId, { amount, currency, plan }) {
  const message =
    `✅ *תשלום התקבל בהצלחה!*\n\n` +
    `📦 תוכנית: *${plan}*\n` +
    `💳 סכום: *${amount} ${currency}*\n\n` +
    `תודה! הגישה שלך הופעלה ואתה מתווסף לקבוצה כעת.`;

  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown',
  });
}

/**
 * Add the user to your private Telegram group/channel.
 * The bot must be an admin of the group with "Invite Users" permission.
 */
async function addUserToGroup(userId) {
  const groupId = process.env.TELEGRAM_GROUP_ID;

  // Create a one-time invite link specifically for this user
  // (or use approveChatJoinRequest if they've already requested to join)
  const { result: link } = await callTelegram('createChatInviteLink', {
    chat_id: groupId,
    member_limit: 1,         // single-use link
    expire_date: Math.floor(Date.now() / 1000) + 3600, // valid 1 hour
  });

  // Send the invite link to the user
  await callTelegram('sendMessage', {
    chat_id: userId,
    text:
      `🎉 *הצטרפ/י לקבוצה הפרטית שלנו!*\n\n` +
      `הלינק תקף לשעה אחת ולשימוש חד-פעמי:\n${link.invite_link}`,
    parse_mode: 'Markdown',
  });
}

/**
 * Send a payment link to the user (called from /pay command).
 */
async function sendPaymentOptions(chatId, { stripeUrl, paypalUrl }) {
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text: '💳 *בחר/י אמצעי תשלום:*',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💳 תשלום עם Stripe (כרטיס אשראי)', url: stripeUrl }],
        [{ text: '🅿️ תשלום עם PayPal', url: paypalUrl }],
      ],
    },
  });
}

/**
 * Set up the bot's webhook so Telegram sends updates to your Vercel URL.
 * Run this once after deployment.
 */
async function setWebhook(webhookUrl) {
  return callTelegram('setWebhook', { url: webhookUrl });
}

// ─── Internal helper ────────────────────────────────────────────────────────

async function callTelegram(method, params) {
  const { data } = await axios.post(`${TELEGRAM_API}/${method}`, params);
  if (!data.ok) throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  return data;
}

module.exports = { sendPaymentConfirmation, addUserToGroup, sendPaymentOptions, setWebhook };
