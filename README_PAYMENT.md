# 💳 GameZone — Real Payment Setup Guide
### By Lochan Kumar Nayak

---

## ⚡ Go Live in 30 Minutes

This guide walks you through setting up **real Razorpay payments** for GameZone.

---

## 📋 What You Need

- A **Razorpay account** (free to create)
- **Node.js** installed (v18+) — download from nodejs.org
- A way to run your server (local for testing, or a host like Render/Railway for production)

---

## STEP 1 — Create Your Razorpay Account

1. Go to **https://razorpay.com** → Click "Sign Up"
2. Fill in your details (name, email, phone, business info)
3. Complete KYC verification (required for live payments)
4. For **testing**, you can use test mode immediately — no KYC needed

---

## STEP 2 — Get Your API Keys

1. Log in to **https://dashboard.razorpay.com**
2. Go to **Settings → API Keys**
3. Click **"Generate Test Key"**
4. You'll get two keys:
   - `rzp_test_XXXXXXXXXXXXXXXX` → **Key ID** (public, goes in payment.js)
   - `XXXXXXXXXXXXXXXXXXXXXXXX` → **Key Secret** (private, goes in .env ONLY)

> ⚠️ NEVER put your Key Secret in payment.js or any frontend file!

---

## STEP 3 — Configure Your Keys

### In `payment.js` (line 18):
```js
const RAZORPAY_KEY_ID = 'rzp_test_REPLACE_WITH_YOUR_KEY_ID';
//                       ↑ Replace with your actual Key ID
```

### Create `.env` file (copy from `.env.example`):
```
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=any_strong_random_string_here
PORT=3000
FRONTEND_URL=http://localhost:5500
```

---

## STEP 4 — Install & Run the Backend

Open a terminal in your project folder:

```bash
# Install dependencies
npm install

# Start the server
npm start
```

You should see:
```
╔══════════════════════════════════════════╗
║   🎮 GameZone Payment Server Running     ║
║   Port: 3000                             ║
╚══════════════════════════════════════════╝
```

---

## STEP 5 — Open the Frontend

Open `payment.html` in a browser (use Live Server in VS Code, or just open the file).

The `BACKEND_URL` in `payment.js` is set to `http://localhost:3000` by default — this works for local testing.

---

## STEP 6 — Test a Payment

Use Razorpay's **test card details**:

| Field        | Value                    |
|--------------|--------------------------|
| Card Number  | `4111 1111 1111 1111`    |
| Expiry       | Any future date          |
| CVV          | Any 3 digits             |
| OTP          | `1234` (test mode)       |

**Test UPI ID:** `success@razorpay`

**Test Net Banking:** Select any bank → use any credentials

---

## STEP 7 — Set Up Webhooks (Important!)

Webhooks let Razorpay notify your server when payments happen (even if the user closes the browser).

1. Go to **Razorpay Dashboard → Settings → Webhooks**
2. Click **"Add New Webhook"**
3. Enter your webhook URL:
   - Local testing: Use **ngrok** → `ngrok http 3000` → copy the HTTPS URL → `https://xxxx.ngrok.io/api/webhook`
   - Production: `https://your-server.com/api/webhook`
4. Enter your **Webhook Secret** (same as in your `.env`)
5. Enable these events:
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `order.paid`

---

## STEP 8 — Deploy to Production

### Option A: Render (Free tier available)
1. Push your code to GitHub
2. Go to **render.com** → New Web Service
3. Connect your GitHub repo
4. Set environment variables (from your `.env`)
5. Deploy → get your URL like `https://gamezone-api.onrender.com`
6. Update `BACKEND_URL` in `payment.js` to your Render URL
7. Update `FRONTEND_URL` in `.env` to your frontend URL

### Option B: Railway
1. Go to **railway.app** → New Project → Deploy from GitHub
2. Add environment variables
3. Deploy

### Option C: VPS (DigitalOcean, AWS, etc.)
```bash
# On your server:
git clone your-repo
cd your-repo
npm install
# Set up .env
pm2 start server.js  # keeps server running
```

---

## STEP 9 — Switch to Live Mode

1. In Razorpay Dashboard → toggle from **Test Mode** to **Live Mode**
2. Generate **Live API Keys** (Settings → API Keys)
3. Update your `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX
   RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
   ```
4. Update `payment.js`:
   ```js
   const RAZORPAY_KEY_ID = 'rzp_live_XXXXXXXXXXXXXXXX';
   ```
5. Complete KYC in Razorpay dashboard if not done

---

## 🔒 Security Checklist

- [x] Key Secret is ONLY in `.env`, never in frontend JS
- [x] `.env` is in `.gitignore` (never committed to Git)
- [x] Payment signature verified on backend before activating perks
- [x] Payment amount verified against expected amount
- [x] Webhook signature verified before processing events
- [x] HTTPS used in production (required by Razorpay)

---

## 💰 Razorpay Fees

| Transaction Type | Fee          |
|-----------------|--------------|
| Domestic Cards  | 2% + GST     |
| UPI             | Free (₹0)    |
| Net Banking     | 1.5% + GST   |
| Wallets         | 1.5% + GST   |
| EMI             | 1.5% + GST   |

> For ₹149 Pro plan via UPI → You receive ₹149 (no fee!)
> For ₹149 via Card → You receive ~₹145.5 (2% fee)

---

## 📞 Support

- Razorpay Docs: https://razorpay.com/docs
- Razorpay Support: https://razorpay.com/support
- Test Credentials: https://razorpay.com/docs/payments/payments/test-card-details

---

*GameZone Payment System — Built by Lochan Kumar Nayak*
