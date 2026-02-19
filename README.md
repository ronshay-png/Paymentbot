# 🤖 Telegram Payment Bot — PayPal + Stripe + Vercel

בוט טלגרם שמקבל תשלומים דרך PayPal ו-Stripe, ואחרי תשלום מוצלח שולח הודעה ומוסיף את המשתמש לקבוצה.

---

## 📁 מבנה הפרויקט

```
api/
  bot.js              ← Webhook של הבוט (הודעות + כפתורים)
  webhook-paypal.js   ← Webhook של PayPal
  webhook-stripe.js   ← Webhook של Stripe
lib/
  telegram.js         ← פונקציות Telegram API
  paypal.js           ← אימות webhook של PayPal
  payments.js         ← לוגיקה אחרי תשלום מוצלח
vercel.json           ← הגדרות Vercel
.env.example          ← משתני סביבה נדרשים
```

---

## 🚀 הגדרה שלב אחרי שלב

### שלב 1 — צור בוט טלגרם
1. פתח @BotFather בטלגרם
2. שלח `/newbot` ועקוב אחרי ההוראות
3. שמור את ה-TOKEN שתקבל → `TELEGRAM_BOT_TOKEN`

### שלב 2 — Deploy ל-Vercel
```bash
npm install -g vercel
vercel deploy
```
תקבל URL בסגנון: `https://your-project.vercel.app`

### שלב 3 — הגדר את ה-Webhook של הבוט
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-project.vercel.app/bot"
```

### שלב 4 — PayPal
1. נכנס ל: https://developer.paypal.com/dashboard/
2. צור Webhook וכוון ל: `https://your-project.vercel.app/webhook/paypal`
3. בחר אירוע: `PAYMENT.SALE.COMPLETED`
4. שמור את ה-`Webhook ID` → `PAYPAL_WEBHOOK_ID`
5. צור Payment Link מה-PayPal Dashboard → `PAYPAL_PAYMENT_LINK`

### שלב 5 — Stripe
1. נכנס ל: https://dashboard.stripe.com/webhooks
2. צור Webhook וכוון ל: `https://your-project.vercel.app/webhook/stripe`
3. בחר אירוע: `checkout.session.completed`
4. שמור את ה-`Signing Secret` → `STRIPE_WEBHOOK_SECRET`
5. צור Payment Link מה-Stripe Dashboard → `STRIPE_PAYMENT_LINK`

### שלב 6 — משתני סביבה ב-Vercel
```bash
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_GROUP_ID
vercel env add TELEGRAM_INVITE_LINK
vercel env add PAYPAL_MODE
vercel env add PAYPAL_CLIENT_ID
vercel env add PAYPAL_CLIENT_SECRET
vercel env add PAYPAL_WEBHOOK_ID
vercel env add PAYPAL_PAYMENT_LINK
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PAYMENT_LINK
```

---

## 🔁 זרימת התהליך

```
משתמש לוחץ /pay
    ↓
בוט שולח כפתורי PayPal / Stripe
    ↓
משתמש בוחר ומשלם
    ↓
PayPal/Stripe שולחים Webhook לשרת
    ↓
השרת מאמת את התשלום
    ↓
✅ שולח הודעת אישור למשתמש
✅ מוסיף את המשתמש לקבוצה
```

---

## ⚠️ הערות חשובות

- הבוט חייב להיות **אדמין בקבוצה** כדי לאשר הצטרפויות
- לבדיקות השתמש ב-`PAYPAL_MODE=sandbox` וב-Stripe test keys (`sk_test_...`)
- Stripe דורש **raw body** ב-webhook — זו הסיבה ל-`bodyParser: false` בקוד
