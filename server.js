/**
 * ══════════════════════════════════════════════════════════════
 *  GameZone — server.js  (Node.js + Express Backend)
 *  By Lochan Kumar Nayak
 * ══════════════════════════════════════════════════════════════
 */

require('dotenv').config();

const express  = require('express');
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Read keys from .env ───────────────────────────────────────────────────────
const KEY_ID     = process.env.RAZORPAY_KEY_ID     || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WH_SECRET  = process.env.RAZORPAY_WEBHOOK_SECRET || 'gamezone_webhook_secret_2025';

// ── Check if keys are real (not placeholder) ──────────────────────────────────
const keysConfigured =
  KEY_ID.startsWith('rzp_') &&
  KEY_SECRET.length > 10 &&
  !KEY_ID.includes('REPLACE') &&
  !KEY_SECRET.includes('REPLACE');

// ── Lazy Razorpay instance — only created when keys are real ──────────────────
let _razorpay = null;
function getRazorpay() {
  if (!keysConfigured) {
    throw new Error('Razorpay keys not configured. Please update your .env file with real keys from https://dashboard.razorpay.com');
  }
  if (!_razorpay) {
    _razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  }
  return _razorpay;
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
}));

// Raw body for webhook signature verification (must be before express.json)
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Serve all frontend files (HTML, CSS, JS, games/)
app.use(express.static(path.join(__dirname)));

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:          'ok',
    server:          'GameZone Payment Server',
    keysConfigured,
    mode:            KEY_ID.startsWith('rzp_live_') ? 'LIVE' : KEY_ID.startsWith('rzp_test_') ? 'TEST' : 'NOT_SET',
    message:         keysConfigured
      ? '✅ Razorpay keys are configured. Ready to accept payments.'
      : '⚠️  Razorpay keys are NOT configured. Update .env with your keys.',
  });
});

// ── GET /api/config ───────────────────────────────────────────────────────────
// Frontend fetches this to get the public Key ID safely
app.get('/api/config', (req, res) => {
  if (!keysConfigured) {
    return res.status(503).json({
      error: 'Payment system not configured',
      message: 'Please add your Razorpay keys to the .env file.',
    });
  }
  res.json({ key_id: KEY_ID });
});

// ── POST /api/create-order ────────────────────────────────────────────────────
app.post('/api/create-order', async (req, res) => {
  try {
    const rzp = getRazorpay();
    const { amount, plan, plan_label, customer } = req.body;

    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ message: 'Invalid amount. Minimum is ₹10.' });
    }
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({ message: 'Customer name, email and phone are required.' });
    }

    const order = await rzp.orders.create({
      amount:   Math.round(Number(amount) * 100), // ₹ → paise
      currency: 'INR',
      receipt:  `gz_${plan}_${Date.now()}`,
      notes: {
        plan,
        plan_label,
        customer_name:  customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
      },
    });

    console.log(`✅ Order created: ${order.id} | ₹${amount} | ${plan_label} | ${customer.email}`);
    res.json({ id: order.id, amount: order.amount, currency: order.currency });

  } catch (err) {
    console.error('❌ Create order error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/verify-payment ──────────────────────────────────────────────────
app.post('/api/verify-payment', async (req, res) => {
  try {
    const rzp = getRazorpay();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan, amount, customer } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ verified: false, message: 'Missing payment fields.' });
    }

    // Verify HMAC-SHA256 signature
    const expected = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      console.warn(`⚠️  Signature mismatch: ${razorpay_payment_id}`);
      return res.status(400).json({ verified: false, message: 'Signature verification failed.' });
    }

    // Double-check payment status and amount with Razorpay
    const payment    = await rzp.payments.fetch(razorpay_payment_id);
    const paidAmount = payment.amount / 100;

    if (!['captured', 'authorized'].includes(payment.status)) {
      return res.status(400).json({ verified: false, message: `Payment status: ${payment.status}` });
    }
    if (paidAmount < Number(amount)) {
      return res.status(400).json({ verified: false, message: `Amount mismatch: expected ₹${amount}, got ₹${paidAmount}` });
    }

    console.log(`✅ Payment verified: ${razorpay_payment_id} | ₹${paidAmount} | ${plan} | ${customer?.email}`);
    res.json({ verified: true, payment_id: razorpay_payment_id, amount: paidAmount, plan });

  } catch (err) {
    console.error('❌ Verify error:', err.message);
    res.status(500).json({ verified: false, message: err.message });
  }
});

// ── POST /api/webhook ─────────────────────────────────────────────────────────
app.post('/api/webhook', (req, res) => {
  try {
    const received = req.headers['x-razorpay-signature'];
    const expected = crypto
      .createHmac('sha256', WH_SECRET)
      .update(req.body)
      .digest('hex');

    if (expected !== received) {
      console.warn('⚠️  Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    console.log(`📨 Webhook: ${event.event}`);

    if (event.event === 'payment.captured') {
      const p = event.payload.payment.entity;
      console.log(`💰 Captured: ${p.id} | ₹${p.amount / 100} | ${p.email}`);
    }
    if (event.event === 'payment.failed') {
      const p = event.payload.payment.entity;
      console.log(`❌ Failed: ${p.id} | ${p.error_description}`);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.status(500).json({ message: 'Webhook error' });
  }
});

// ── POST /api/demo-payment ───────────────────────────────────────────────────
// Simulates a successful payment without real Razorpay keys (demo/testing only)
app.post('/api/demo-payment', (req, res) => {
  const { amount, plan, plan_label, customer } = req.body;
  if (!amount || !customer?.name || !customer?.email) {
    return res.status(400).json({ message: 'Name, email and amount are required.' });
  }
  const demoPaymentId = 'DEMO_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8).toUpperCase();
  console.log(`🎮 Demo payment: ${demoPaymentId} | ₹${amount} | ${plan_label} | ${customer.email}`);
  res.json({ verified: true, demo: true, payment_id: demoPaymentId, amount: Number(amount), plan });
});

// ── Catch-all: serve index.html for any unmatched route ──────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════════════════╗');
  console.log(`  ║  🎮 GameZone Server — http://localhost:${PORT}       ║`);
  console.log('  ╠══════════════════════════════════════════════════╣');

  if (keysConfigured) {
    const mode = KEY_ID.startsWith('rzp_live_') ? '🟢 LIVE MODE' : '🟡 TEST MODE';
    console.log(`  ║  Razorpay: ${mode.padEnd(38)}║`);
    console.log(`  ║  Key ID:   ${KEY_ID.slice(0, 20)}...              ║`);
    console.log('  ║  ✅ Ready to accept real payments!               ║');
  } else {
    console.log('  ║  ⚠️  Razorpay keys NOT configured yet            ║');
    console.log('  ║                                                  ║');
    console.log('  ║  To enable real payments:                        ║');
    console.log('  ║  1. Go to https://dashboard.razorpay.com         ║');
    console.log('  ║  2. Settings → API Keys → Generate Test Key      ║');
    console.log('  ║  3. Open .env file in your project folder        ║');
    console.log('  ║  4. Replace the placeholder values:              ║');
    console.log('  ║     RAZORPAY_KEY_ID=rzp_test_YOUR_KEY            ║');
    console.log('  ║     RAZORPAY_KEY_SECRET=YOUR_SECRET              ║');
    console.log('  ║  5. Save .env and restart: node server.js        ║');
    console.log('  ║                                                  ║');
    console.log('  ║  📖 Full guide: README_PAYMENT.md                ║');
  }

  console.log('  ╚══════════════════════════════════════════════════╝\n');
});

module.exports = app;
