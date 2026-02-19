// lib/payments.js - לוגיקה מרכזית אחרי תשלום מוצלח

import { sendMessage, addUserToGroup } from './telegram.js';

/**
 * נקודת הכניסה לאחר תשלום מוצלח - עובד לשני PayPal וגם Stripe
 */
export async function handleSuccessfulPayment({ telegramId, amount, currency, method, transactionId }) {
  console.log(`Processing successful payment: ${method} | ${amount} ${currency} | User: ${telegramId}`);

  if (!telegramId) {
    console.error('❌ No telegramId in payment - cannot notify user');
    return;
  }

  // 1. שלח הודעת אישור למשתמש
  await sendMessage(
    telegramId,
    `✅ *תשלום התקבל בהצלחה!*\n\n` +
    `💰 סכום: ${amount} ${currency}\n` +
    `💳 שיטה: ${method}\n` +
    `🔖 מספר עסקה: \`${transactionId}\`\n\n` +
    `תודה! 🙏`,
    { parse_mode: 'Markdown' }
  );

  // 2. הוסף את המשתמש לקבוצה / שלח לינק הצטרפות
  await addUserToGroup(telegramId);

  console.log(`✅ Done: User ${telegramId} notified and added to group`);
}
