// Run once after deployment: node scripts/setup-webhook.js
require('dotenv').config();
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL  = process.env.BASE_URL;

async function setup() {
  const url = `${BASE_URL}/bot`;
  const { data } = await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    { url, allowed_updates: ['message', 'callback_query'] }
  );
  console.log('Webhook set:', data);
}

setup().catch(console.error);
