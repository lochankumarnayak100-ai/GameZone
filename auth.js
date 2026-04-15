/* ══════════════════════════════════════════
   GameZone — auth.js
   ══════════════════════════════════════════ */

const AVATARS = ['🎮','🦊','🐉','🚀','🦁','🐺','🤖','👾','🧙','🦄','🐯','🎯'];
const USERS_KEY   = 'gz_users';      // array of registered users
const SESSION_KEY = 'gz_session';    // currently logged-in user object

// ── Particle background ──────────────────
(function () {
  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let pts = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 70; i++) {
    pts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.45 + 0.08,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108,99,255,${p.a})`;
      ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 110) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(108,99,255,${0.1 * (1 - d / 110)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Helpers ─────────────────────────────
function getUsers()       { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function getSession()     { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
function saveSession(u)   { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }

function showToast(msg, isError = false) {
  const t = document.getElementById('authToast');
  t.textContent = msg;
  t.className   = 'auth-toast' + (isError ? ' error' : '');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function setError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg;
}
function clearErrors(...ids) { ids.forEach(id => setError(id, '')); }

function markInput(inputId, valid) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.classList.toggle('valid', valid);
  el.classList.toggle('error', !valid);
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function hashPassword(pw) {
  // Simple deterministic hash (not cryptographic — fine for localStorage demo)
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0; }
  return h.toString(36);
}

// ── Avatar picker ────────────────────────
let selectedAvatar = AVATARS[0];
const avatarRow = document.getElementById('authAvatarPicker');
AVATARS.forEach((av, i) => {
  const d = document.createElement('div');
  d.className = 'av-opt' + (i === 0 ? ' selected' : '');
  d.textContent = av;
  d.addEventListener('click', () => {
    document.querySelectorAll('.av-opt').forEach(x => x.classList.remove('selected'));
    d.classList.add('selected');
    selectedAvatar = av;
  });
  avatarRow.appendChild(d);
});

// ── Tab switching ────────────────────────
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(target + 'Form').classList.add('active');
    clearErrors('loginEmailErr','loginPasswordErr','loginError','signupNameErr','signupEmailErr','signupPasswordErr','signupConfirmErr','signupError');
  });
});

// ── Show / hide password ─────────────────
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isText = input.type === 'text';
    input.type   = isText ? 'password' : 'text';
    btn.textContent = isText ? '👁️' : '🙈';
  });
});

// ── Password strength ────────────────────
document.getElementById('signupPassword').addEventListener('input', function () {
  const pw   = this.value;
  const fill = document.getElementById('pwFill');
  const lbl  = document.getElementById('pwLabel');
  let score  = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { w: '0%',   c: 'transparent', t: '—'         },
    { w: '20%',  c: '#f83600',     t: 'Very Weak'  },
    { w: '40%',  c: '#f9d423',     t: 'Weak'       },
    { w: '60%',  c: '#f9d423',     t: 'Fair'       },
    { w: '80%',  c: '#38ef7d',     t: 'Strong'     },
    { w: '100%', c: '#38ef7d',     t: 'Very Strong' },
  ];
  const lvl = pw.length === 0 ? levels[0] : levels[Math.min(score, 5)];
  fill.style.width      = lvl.w;
  fill.style.background = lvl.c;
  lbl.textContent       = lvl.t;
  lbl.style.color       = lvl.c;
});

// ── SIGN UP ──────────────────────────────
document.getElementById('signupForm').addEventListener('submit', function (e) {
  e.preventDefault();
  clearErrors('signupNameErr','signupEmailErr','signupPasswordErr','signupConfirmErr','signupError');

  const name    = document.getElementById('signupName').value.trim();
  const email   = document.getElementById('signupEmail').value.trim().toLowerCase();
  const pw      = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  let valid     = true;

  if (!name || name.length < 2) {
    setError('signupNameErr', 'Name must be at least 2 characters.');
    markInput('signupName', false); valid = false;
  } else markInput('signupName', true);

  if (!isValidEmail(email)) {
    setError('signupEmailErr', 'Please enter a valid email address.');
    markInput('signupEmail', false); valid = false;
  } else markInput('signupEmail', true);

  if (pw.length < 6) {
    setError('signupPasswordErr', 'Password must be at least 6 characters.');
    markInput('signupPassword', false); valid = false;
  } else markInput('signupPassword', true);

  if (pw !== confirm) {
    setError('signupConfirmErr', 'Passwords do not match.');
    markInput('signupConfirm', false); valid = false;
  } else if (confirm) markInput('signupConfirm', true);

  if (!valid) return;

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    const errEl = document.getElementById('signupError');
    errEl.textContent = '⚠️ An account with this email already exists. Please sign in.';
    errEl.classList.remove('hidden');
    return;
  }

  // Create user
  const newUser = {
    id:        Date.now().toString(36),
    name,
    email,
    password:  hashPassword(pw),
    avatar:    selectedAvatar,
    createdAt: new Date().toISOString(),
    xp:        0,
    unlockedAch: [],
    gamesPlayed: [],
    sessionGames: 0,
    isGuest:   false,
  };
  users.push(newUser);
  saveUsers(users);

  // Auto-login
  const session = { ...newUser };
  delete session.password;
  saveSession(session);

  showToast(`🎉 Welcome to GameZone, ${name}!`);
  setTimeout(() => { window.location.href = 'index.html'; }, 1000);
});

// ── SIGN IN ──────────────────────────────
document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  clearErrors('loginEmailErr','loginPasswordErr','loginError');

  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pw    = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;
  let valid = true;

  if (!isValidEmail(email)) {
    setError('loginEmailErr', 'Please enter a valid email address.');
    markInput('loginEmail', false); valid = false;
  } else markInput('loginEmail', true);

  if (!pw) {
    setError('loginPasswordErr', 'Please enter your password.');
    markInput('loginPassword', false); valid = false;
  } else markInput('loginPassword', true);

  if (!valid) return;

  const users = getUsers();
  const user  = users.find(u => u.email === email && u.password === hashPassword(pw));

  if (!user) {
    const errEl = document.getElementById('loginError');
    errEl.textContent = '❌ Incorrect email or password. Please try again.';
    errEl.classList.remove('hidden');
    document.getElementById('loginPassword').classList.add('error');
    return;
  }

  // Save session
  const session = { ...user };
  delete session.password;
  saveSession(session);

  if (remember) localStorage.setItem('gz_remember', email);
  else          localStorage.removeItem('gz_remember');

  showToast(`👋 Welcome back, ${user.name}!`);
  setTimeout(() => { window.location.href = 'index.html'; }, 900);
});

// ── GUEST ────────────────────────────────
document.getElementById('guestBtn').addEventListener('click', () => {
  const guestNum = Math.floor(Math.random() * 9000) + 1000;
  const guest = {
    id:          'guest_' + guestNum,
    name:        'Guest#' + guestNum,
    email:       null,
    avatar:      '👻',
    xp:          0,
    unlockedAch: [],
    gamesPlayed: [],
    sessionGames: 0,
    isGuest:     true,
    createdAt:   new Date().toISOString(),
  };
  saveSession(guest);
  showToast('👻 Entering as Guest — have fun!');
  setTimeout(() => { window.location.href = 'index.html'; }, 800);
});

// ── FORGOT PASSWORD ──────────────────────
document.getElementById('forgotBtn').addEventListener('click', () => {
  document.getElementById('fpOverlay').classList.remove('hidden');
  document.getElementById('fpEmail').value = document.getElementById('loginEmail').value;
  document.getElementById('fpError').classList.add('hidden');
  document.getElementById('fpResult').classList.add('hidden');
});
document.getElementById('fpClose').addEventListener('click', () => {
  document.getElementById('fpOverlay').classList.add('hidden');
});
document.getElementById('fpOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('fpOverlay'))
    document.getElementById('fpOverlay').classList.add('hidden');
});
document.getElementById('fpSubmit').addEventListener('click', () => {
  const email = document.getElementById('fpEmail').value.trim().toLowerCase();
  const errEl = document.getElementById('fpError');
  const resEl = document.getElementById('fpResult');
  errEl.classList.add('hidden');
  resEl.classList.add('hidden');

  if (!isValidEmail(email)) {
    errEl.textContent = 'Please enter a valid email address.';
    errEl.classList.remove('hidden');
    return;
  }
  const users = getUsers();
  const user  = users.find(u => u.email === email);
  if (!user) {
    errEl.textContent = 'No account found with that email address.';
    errEl.classList.remove('hidden');
    return;
  }
  resEl.innerHTML = `✅ Account found!<br><strong>${user.name}</strong> · Registered ${new Date(user.createdAt).toLocaleDateString()}<br><br>💡 <em>In a real app, a reset link would be emailed to you.</em>`;
  resEl.classList.remove('hidden');
});

// ── Pre-fill remembered email ────────────
const remembered = localStorage.getItem('gz_remember');
if (remembered) {
  document.getElementById('loginEmail').value = remembered;
  document.getElementById('rememberMe').checked = true;
}

// ── If already logged in, skip to platform ──
if (getSession()) {
  window.location.href = 'index.html';
}
