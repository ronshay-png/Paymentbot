Bot · JS
Copy

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
      await sendMessage(chatId, `👋 שלום ${from.first_name}!\n\nהבוט עובד! 🎉`);
    }
  }

  res.status(200).json({ ok: true });
}
