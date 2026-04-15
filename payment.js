/* ══════════════════════════════════════════════════════
   GameZone — payment.js
   By Lochan Kumar Nayak
   ══════════════════════════════════════════════════════ */

// ── Auto-detect backend URL ───────────────────────────────────────────────────
// If page is served by the Node server itself (port 3000), use same origin.
// If opened as a file:// or from a different port, point to localhost:3000.
const BACKEND_URL = (
  window.location.protocol === 'file:' ||
  window.location.port !== '3000'
) ? 'http://localhost:3000' : '';

// ── Plan config ───────────────────────────────────────────────────────────────
const PLAN_XP    = { starter: 500, pro: 2000, legend: 10000, custom: 0 };
const PLAN_PERKS = {
  starter: ['VIP Badge (1 month)', '500 Bonus XP', 'Supporter Certificate'],
  pro:     ['VIP Badge (6 months)', '2,000 Bonus XP', '2× XP Boost (30 days)', '3 Premium Themes', 'Gold Leaderboard Frame'],
  legend:  ['VIP Badge (Lifetime)', '10,000 Bonus XP', '2× XP Boost (Lifetime)', 'All Premium Themes', 'Gold Frame + Name Color'],
  custom:  ['VIP Badge (1 month)', 'Bonus XP (2× amount)', 'Supporter Certificate'],
};
const PLAN_DAYS  = { starter: 30, pro: 180, legend: null, custom: 30 };

let selectedPlan  = null;
let razorpayKeyId = null;   // fetched from server
let serverOnline  = false;

// ── Particle background ───────────────────────────────────────────────────────
(function () {
  const c = document.getElementById('bgCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  function resize() { c.width = innerWidth; c.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const pts = Array.from({ length: 50 }, () => ({
    x: Math.random() * c.width, y: Math.random() * c.height,
    vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
    r: Math.random() * 1.5 + .4, a: Math.random() * .3 + .05,
  }));
  (function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    pts.forEach(p => {
      p.x = (p.x + p.vx + c.width)  % c.width;
      p.y = (p.y + p.vy + c.height) % c.height;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108,99,255,${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  })();
})();

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Is this a real payment?',
    a: 'Yes — this uses Razorpay, India\'s leading payment gateway. Your payment is real and secure. You will receive a confirmation email from Razorpay after successful payment.' },
  { q: 'Which payment methods are supported?',
    a: 'UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards (Visa, Mastercard, RuPay, Amex), Net Banking (50+ banks), Wallets, and EMI options.' },
  { q: 'When will my VIP perks be activated?',
    a: 'Instantly after payment confirmation. Your VIP badge, XP boost, and premium themes are activated the moment Razorpay confirms your payment.' },
  { q: 'Is my payment information safe?',
    a: 'Absolutely. Razorpay is PCI DSS Level 1 certified and RBI regulated. We never store your card details.' },
  { q: 'Can I get a refund?',
    a: 'Yes. We offer a 7-day refund policy. Contact support within 7 days of payment for a full refund.' },
  { q: 'What is the minimum donation amount?',
    a: 'The minimum custom donation is ₹10. Our plans start from ₹49 for the Starter tier.' },
];

document.getElementById('faqList').innerHTML = FAQS.map((f, i) => `
  <div class="faq-item" id="faq${i}">
    <div class="faq-q" onclick="toggleFaq(${i})">${f.q}<span class="arrow">▼</span></div>
    <div class="faq-a">${f.a}</div>
  </div>`).join('');

function toggleFaq(i) {
  document.getElementById('faq' + i).classList.toggle('open');
}

// ── Check server status on page load ─────────────────────────────────────────
async function checkServer() {
  const statusBar = document.getElementById('serverStatus');

  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      signal: AbortSignal.timeout(4000),   // 4 second timeout
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const data = await res.json();
    serverOnline = true;

    if (data.keysConfigured) {
      // Server is up AND keys are configured — fetch the public key ID
      const cfgRes  = await fetch(`${BACKEND_URL}/api/config`);
      const cfgData = await cfgRes.json();
      razorpayKeyId = cfgData.key_id;

      statusBar.className = 'server-status online';
      statusBar.innerHTML = `✅ Payment system ready · ${data.mode === 'LIVE' ? '🟢 Live Mode' : '🟡 Test Mode'}`;
    } else {
      // Server is up but keys are placeholders
      serverOnline = false;
      statusBar.className = 'server-status warning';
      statusBar.innerHTML = `
        ⚠️ <strong>Razorpay keys not configured.</strong>
        Open <code>.env</code> in your project folder, replace the placeholder values with your real keys from
        <a href="https://dashboard.razorpay.com" target="_blank">dashboard.razorpay.com</a>,
        then restart the server with <code>node server.js</code>.
      `;
      disablePayBtn('⚠️ Payment keys not configured — see instructions above');
    }

  } catch (err) {
    // Server is not running at all
    serverOnline = false;
    statusBar.className = 'server-status offline';
    statusBar.innerHTML = `
      🔴 <strong>Payment server is not running.</strong>
      Open a terminal in your project folder and run:
      <code>node server.js</code>
      &nbsp;·&nbsp; Then refresh this page.
      <br/><small>Server should be at: <a href="http://localhost:3000/api/health" target="_blank">http://localhost:3000/api/health</a></small>
    `;
    disablePayBtn('🔴 Server offline — run: node server.js');
  }
}

function disablePayBtn(msg) {
  const btn = document.getElementById('payNowBtn');
  const txt = document.getElementById('payBtnText');
  if (btn) { btn.disabled = true; }
  if (txt) { txt.textContent = msg; }
  // Show demo button whenever real payments are unavailable
  document.getElementById('demoPayBtn').classList.remove('hidden');
}

// ── Plan selection ────────────────────────────────────────────────────────────
document.querySelectorAll('.plan-card').forEach(card => {
  card.addEventListener('click', () => selectPlan(card));
  card.querySelector('.plan-btn').addEventListener('click', e => {
    e.stopPropagation();
    selectPlan(card);
  });
});

function selectPlan(card) {
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  const plan = card.dataset.plan;
  let amount = +card.dataset.amount;
  let xp     = +card.dataset.xp;

  if (plan === 'custom') {
    amount = +document.getElementById('customAmount').value || 0;
    if (amount < 10) {
      document.getElementById('customAmount').focus();
      showBanner('Please enter a minimum amount of ₹10', 'error');
      return;
    }
    xp = Math.floor(amount * 2);
  }

  selectedPlan = { plan, amount, label: card.dataset.label, xp };
  updateSummary();
  updatePayBtn();
  document.getElementById('checkoutSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('customAmount').addEventListener('input', () => {
  const card = document.querySelector('.plan-card[data-plan="custom"]');
  if (card.classList.contains('selected')) selectPlan(card);
});

function updateSummary() {
  if (!selectedPlan) return;
  document.getElementById('sumPlan').textContent   = selectedPlan.label + ' Plan';
  document.getElementById('sumAmount').textContent = '₹' + selectedPlan.amount;
  document.getElementById('sumXP').textContent     = selectedPlan.xp.toLocaleString() + ' XP';
  document.getElementById('sumTotal').textContent  = '₹' + selectedPlan.amount;
}

function updatePayBtn() {
  const btn     = document.getElementById('payNowBtn');
  const txt     = document.getElementById('payBtnText');
  const demoBtn = document.getElementById('demoPayBtn');
  const demoTxt = document.getElementById('demoBtnText');

  if (!selectedPlan || selectedPlan.amount <= 0) {
    btn.disabled = true;
    txt.textContent = 'Select a plan to continue';
    if (!serverOnline) demoBtn.classList.remove('hidden');
    return;
  }
  if (!serverOnline) {
    btn.disabled = true;
    txt.textContent = '🔴 Server offline — run: node server.js';
    demoBtn.classList.remove('hidden');
    demoTxt.textContent = `🎮 Demo Pay ₹${selectedPlan.amount} (No real charge)`;
    return;
  }
  btn.disabled = false;
  txt.textContent = `🔒 Pay ₹${selectedPlan.amount} Securely`;
  demoBtn.classList.add('hidden');
}

// ── Pre-fill user details from session ───────────────────────────────────────
(function prefillUser() {
  try {
    const session = JSON.parse(localStorage.getItem('gz_session') || 'null');
    if (!session) return;
    if (session.name)  document.getElementById('payerName').value  = session.name;
    if (session.email) document.getElementById('payerEmail').value = session.email;
  } catch (_) {}
})();

// ── Pay button click ──────────────────────────────────────────────────────────
document.getElementById('payNowBtn').addEventListener('click', initiatePayment);
document.getElementById('demoPayBtn').addEventListener('click', initiateDemoPayment);

async function initiateDemoPayment() {
  if (!selectedPlan) {
    showBanner('Please select a plan first.', 'error');
    return;
  }

  const name  = document.getElementById('payerName').value.trim();
  const email = document.getElementById('payerEmail').value.trim();

  if (!name) {
    showBanner('Please enter your full name.', 'error');
    document.getElementById('payerName').focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showBanner('Please enter a valid email address.', 'error');
    document.getElementById('payerEmail').focus();
    return;
  }

  const demoBtn = document.getElementById('demoPayBtn');
  const demoTxt = document.getElementById('demoBtnText');
  demoBtn.disabled = true;
  demoTxt.textContent = '⏳ Processing demo…';

  // Simulate a short processing delay
  await new Promise(r => setTimeout(r, 1200));

  const demoPaymentId = 'DEMO_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const customer = { name, email, phone: document.getElementById('payerPhone').value.trim() || 'N/A' };

  activateVipPerks(selectedPlan, demoPaymentId, customer);
  showSuccess(demoPaymentId, customer, true);

  demoBtn.disabled = false;
  demoTxt.textContent = `🎮 Demo Pay ₹${selectedPlan.amount} (No real charge)`;
}

async function initiatePayment() {
  if (!selectedPlan || !serverOnline) return;

  const name  = document.getElementById('payerName').value.trim();
  const email = document.getElementById('payerEmail').value.trim();
  const phone = document.getElementById('payerPhone').value.trim();

  if (!name) {
    showBanner('Please enter your full name.', 'error');
    document.getElementById('payerName').focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showBanner('Please enter a valid email address.', 'error');
    document.getElementById('payerEmail').focus();
    return;
  }
  if (!phone || !/^\d{10}$/.test(phone)) {
    showBanner('Please enter a valid 10-digit mobile number.', 'error');
    document.getElementById('payerPhone').focus();
    return;
  }

  const btn = document.getElementById('payNowBtn');
  const txt = document.getElementById('payBtnText');
  btn.disabled = true;
  txt.textContent = '⏳ Creating order…';

  try {
    // ── Step 1: Create order via backend ─────────────────────────────────────
    let orderRes;
    try {
      orderRes = await fetch(`${BACKEND_URL}/api/create-order`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:     selectedPlan.amount,
          plan:       selectedPlan.plan,
          plan_label: selectedPlan.label,
          customer:   { name, email, phone },
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (fetchErr) {
      throw new Error(
        'Cannot reach the payment server. Make sure it is running:\n' +
        'Open a terminal → run: node server.js'
      );
    }

    if (!orderRes.ok) {
      let errMsg = `Server error (${orderRes.status})`;
      try {
        const errData = await orderRes.json();
        errMsg = errData.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const order = await orderRes.json();

    // ── Step 2: Open Razorpay checkout ────────────────────────────────────────
    openRazorpay(order, { name, email, phone });

  } catch (err) {
    console.error('Payment error:', err);
    showBanner('⚠️ ' + err.message, 'error');
    btn.disabled = false;
    txt.textContent = `🔒 Pay ₹${selectedPlan.amount} Securely`;
  }
}

// ── Open Razorpay popup ───────────────────────────────────────────────────────
function openRazorpay(order, customer) {
  if (!razorpayKeyId) {
    showBanner('Razorpay key not loaded. Please refresh the page.', 'error');
    return;
  }

  const options = {
    key:         razorpayKeyId,
    amount:      order.amount,
    currency:    order.currency || 'INR',
    name:        'GameZone',
    description: `${selectedPlan.label} VIP Plan — by Lochan Kumar Nayak`,
    order_id:    order.id,
    prefill: {
      name:    customer.name,
      email:   customer.email,
      contact: customer.phone,
    },
    theme: { color: '#6c63ff' },

    handler: async function (response) {
      await verifyPayment(response, customer);
    },

    modal: {
      ondismiss: function () {
        const btn = document.getElementById('payNowBtn');
        btn.disabled = false;
        document.getElementById('payBtnText').textContent = `🔒 Pay ₹${selectedPlan.amount} Securely`;
      },
    },
  };

  const rzp = new Razorpay(options);

  rzp.on('payment.failed', function (resp) {
    const msg = resp.error?.description || 'Payment failed. Please try again.';
    showBanner('❌ ' + msg, 'error');
    const btn = document.getElementById('payNowBtn');
    btn.disabled = false;
    document.getElementById('payBtnText').textContent = `🔒 Pay ₹${selectedPlan.amount} Securely`;
  });

  rzp.open();
}

// ── Verify payment on backend ─────────────────────────────────────────────────
async function verifyPayment(response, customer) {
  document.getElementById('payBtnText').textContent = '⏳ Verifying payment…';

  try {
    let verifyRes;
    try {
      verifyRes = await fetch(`${BACKEND_URL}/api/verify-payment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_signature:  response.razorpay_signature,
          plan:                selectedPlan.plan,
          amount:              selectedPlan.amount,
          customer,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (fetchErr) {
      throw new Error(
        'Payment was received but verification server is unreachable. ' +
        'Your payment ID is: ' + response.razorpay_payment_id +
        '. Please contact support.'
      );
    }

    const result = await verifyRes.json();

    if (!verifyRes.ok || !result.verified) {
      throw new Error(result.message || 'Verification failed. Contact support with payment ID: ' + response.razorpay_payment_id);
    }

    // ── Success ───────────────────────────────────────────────────────────────
    activateVipPerks(selectedPlan, response.razorpay_payment_id, customer);
    showSuccess(response.razorpay_payment_id, customer);

  } catch (err) {
    console.error('Verify error:', err);
    showBanner('⚠️ ' + err.message, 'error');
    const btn = document.getElementById('payNowBtn');
    btn.disabled = false;
    document.getElementById('payBtnText').textContent = `🔒 Pay ₹${selectedPlan.amount} Securely`;
  }
}

// ── Activate VIP perks ────────────────────────────────────────────────────────
function activateVipPerks(plan, paymentId, customer) {
  const now    = Date.now();
  const days   = PLAN_DAYS[plan.plan] || 30;
  const expiry = days ? now + days * 86400000 : null;

  const vip = {
    plan: plan.plan, label: plan.label, amount: plan.amount, xp: plan.xp,
    expiry, paymentId, customer,
    xpBoost:   plan.plan === 'pro' || plan.plan === 'legend',
    goldFrame: plan.plan === 'pro' || plan.plan === 'legend',
    themes:    plan.plan === 'pro'    ? ['neon', 'sunset', 'ocean'] :
               plan.plan === 'legend' ? ['neon', 'sunset', 'ocean', 'galaxy', 'fire'] : [],
    activatedAt: now,
  };
  localStorage.setItem('gz_vip', JSON.stringify(vip));

  try {
    const session = JSON.parse(localStorage.getItem('gz_session') || 'null');
    if (session) {
      session.xp  = (session.xp || 0) + plan.xp;
      session.vip = vip;
      localStorage.setItem('gz_session', JSON.stringify(session));
      const users = JSON.parse(localStorage.getItem('gz_users') || '[]');
      const idx   = users.findIndex(u => u.email === session.email);
      if (idx !== -1) { users[idx].xp = session.xp; users[idx].vip = vip; localStorage.setItem('gz_users', JSON.stringify(users)); }
    }
  } catch (_) {}
}

// ── Show success modal ────────────────────────────────────────────────────────
function showSuccess(paymentId, customer, isDemo = false) {
  const rows = [
    ['Payment ID',  paymentId],
    ['Plan',        selectedPlan.label + ' VIP'],
    ['Amount Paid', isDemo ? '₹' + selectedPlan.amount + ' (DEMO — not charged)' : '₹' + selectedPlan.amount],
    ['Name',        customer.name],
    ['Email',       customer.email],
    ['Date & Time', new Date().toLocaleString('en-IN')],
    ['Status',      isDemo ? '🎮 DEMO PAYMENT (No real charge)' : '✅ PAYMENT SUCCESSFUL'],
  ];
  document.getElementById('receipt').innerHTML = rows.map(([k, v]) =>
    `<div class="receipt-row"><span>${k}</span><span>${v}</span></div>`).join('');

  const perks = PLAN_PERKS[selectedPlan.plan] || PLAN_PERKS.custom;
  document.getElementById('perksUnlocked').innerHTML =
    `<h4>🎁 Perks Unlocked</h4>` + perks.map(p => `<span class="perk-tag">${p}</span>`).join('');

  document.getElementById('successMsg').textContent = isDemo
    ? `Demo complete, ${customer.name}! VIP perks activated locally. No real charge was made.`
    : `Thank you, ${customer.name}! ₹${selectedPlan.amount} received. Receipt sent to ${customer.email}.`;

  document.getElementById('successModal').classList.remove('hidden');
}

// ── Download receipt ──────────────────────────────────────────────────────────
document.getElementById('downloadReceipt').addEventListener('click', () => {
  const text = `GameZone VIP Payment Receipt\n${'='.repeat(35)}\n` +
    document.getElementById('receipt').innerText + '\n\n' +
    document.getElementById('perksUnlocked').innerText +
    '\n\nThank you for supporting GameZone!\nBy Lochan Kumar Nayak · Powered by Razorpay';
  const a = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
    download: `GameZone_Receipt_${Date.now()}.txt`,
  });
  a.click();
});

document.getElementById('goToPlatform').addEventListener('click', () => {
  window.location.href = 'index.html';
});

// ── Banner helper (replaces alert()) ─────────────────────────────────────────
function showBanner(msg, type = 'info') {
  const old = document.getElementById('payBanner');
  if (old) old.remove();

  const colors = {
    error:   { bg: '#ff4d6d', shadow: 'rgba(255,77,109,0.4)' },
    success: { bg: '#38ef7d', shadow: 'rgba(56,239,125,0.4)' },
    info:    { bg: '#6c63ff', shadow: 'rgba(108,99,255,0.4)' },
  };
  const c = colors[type] || colors.info;

  const el = document.createElement('div');
  el.id = 'payBanner';
  el.style.cssText = `
    position:fixed; top:72px; left:50%; transform:translateX(-50%);
    background:${c.bg}; color:#fff; padding:14px 28px; border-radius:12px;
    font-weight:700; font-size:0.9rem; z-index:9999; max-width:92vw;
    box-shadow:0 8px 32px ${c.shadow}; text-align:center; line-height:1.5;
    white-space:pre-line;
  `;
  el.innerHTML = msg;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 6000);
}

// ── Init: check server on page load ──────────────────────────────────────────
checkServer();
