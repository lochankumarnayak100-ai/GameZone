/* ══════════════════════════════════════════
   GameZone — platform.js v2
   ══════════════════════════════════════════ */

// ─────────────────────────────────────────
// AUTH GUARD — redirect to login if no session
// ─────────────────────────────────────────
const SESSION_KEY = 'gz_session';
const USERS_KEY   = 'gz_users';

function getSession() { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
function saveSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }

const currentSession = getSession();
if (!currentSession) {
  window.location.href = 'login.html';
  throw new Error('Not authenticated');
}

// Show guest banner if guest
if (currentSession.isGuest) {
  document.getElementById('guestBanner').classList.remove('hidden');
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
});

// ─────────────────────────────────────────
// VIP SYSTEM
// ─────────────────────────────────────────
function getVip() {
  const raw = localStorage.getItem('gz_vip');
  if (!raw) return null;
  const vip = JSON.parse(raw);
  if (vip.expiry && Date.now() > vip.expiry) { localStorage.removeItem('gz_vip'); return null; }
  return vip;
}

const vip = getVip();

function applyVipPerks() {
  if (!vip) return;
  // Crown in navbar
  const navName = document.getElementById('navName');
  if (navName && !navName.querySelector('.nav-vip-crown')) {
    const crown = document.createElement('span');
    crown.className = 'nav-vip-crown'; crown.textContent = ' 👑';
    navName.appendChild(crown);
  }
  // Gold frame on all game cards
  if (vip.goldFrame) {
    document.querySelectorAll('.game-card').forEach(c => c.classList.add('vip-active'));
  }
  // Show VIP banner as "active" state
  const bannerSection = document.getElementById('vipBannerSection');
  if (bannerSection) {
    bannerSection.querySelector('.vip-banner').style.borderColor = 'rgba(255,215,0,0.6)';
    bannerSection.querySelector('.vip-banner-left h3').textContent = '👑 You are a VIP Supporter!';
    bannerSection.querySelector('.vip-banner-left p').textContent =
      `${vip.label} plan · ${vip.expiry ? 'Expires ' + new Date(vip.expiry).toLocaleDateString() : 'Lifetime'}`;
    bannerSection.querySelector('.vip-cta-btn').textContent = '🎁 Upgrade Plan';
  }
}
applyVipPerks();

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const AVATARS = ['🎮','🦊','🐉','🚀','🦁','🐺','🤖','👾','🧙','🦄','🐯','🎯'];

const GAME_META = [
  { key:'memoryMatch_easy',  label:'Memory Match', icon:'🧠', href:'games/memory/index.html',  scoreField:'score' },
  { key:'gz_snake',          label:'Snake',        icon:'🐍', href:'games/snake/index.html',   scoreField:'number' },
  { key:'gz_tetris',         label:'Tetris',       icon:'🟦', href:'games/tetris/index.html',  scoreField:'number' },
  { key:'gz_2048',           label:'2048',         icon:'2️⃣', href:'games/2048/index.html',    scoreField:'number' },
  { key:'gz_flappy',         label:'Flappy Bird',  icon:'🐦', href:'games/flappy/index.html',  scoreField:'number' },
  { key:'gz_whack',          label:'Whack-a-Mole', icon:'🔨', href:'games/whackamole/index.html', scoreField:'number' },
  { key:'gz_typing',         label:'Typing Speed', icon:'⌨️', href:'games/typing/index.html',  scoreField:'number' },
  { key:'gz_breakout',       label:'Breakout',     icon:'🧱', href:'games/breakout/index.html', scoreField:'number' },
  { key:'gz_mathquiz',       label:'Math Quiz',    icon:'➕', href:'games/mathquiz/index.html', scoreField:'number' },
  { key:'gz_colorflood',     label:'Color Flood',  icon:'🎨', href:'games/colorflood/index.html', scoreField:'number' },
  { key:'gz_ms_9x9',         label:'Minesweeper',  icon:'💣', href:'games/minesweeper/index.html', scoreField:'number' },
  { key:'gz_simon',          label:'Simon Says',   icon:'🔴', href:'games/simon/index.html',   scoreField:'number' },
  { key:'gz_wordscramble',   label:'Word Scramble',icon:'🔤', href:'games/wordscramble/index.html', scoreField:'number' },
];

const ACHIEVEMENTS = [
  { id:'first_play',   icon:'🎮', name:'First Steps',      desc:'Play your first game',              xp:50  },
  { id:'play5',        icon:'🕹️', name:'Game Hopper',      desc:'Play 5 different games',            xp:100 },
  { id:'play_all',     icon:'🌟', name:'Completionist',    desc:'Play all 16 games',                 xp:500 },
  { id:'score1000',    icon:'💯', name:'Four Digits',      desc:'Score 1,000+ in any game',          xp:150 },
  { id:'score10000',   icon:'🔥', name:'On Fire',          desc:'Score 10,000+ in any game',         xp:300 },
  { id:'snake100',     icon:'🐍', name:'Long Boi',         desc:'Score 100+ in Snake',               xp:200 },
  { id:'tetris500',    icon:'🟦', name:'Tetris Master',    desc:'Score 500+ in Tetris',              xp:200 },
  { id:'flappy10',     icon:'🐦', name:'Sky High',         desc:'Score 10+ in Flappy Bird',          xp:200 },
  { id:'typing60',     icon:'⌨️', name:'Speed Typist',     desc:'Type 60+ WPM',                      xp:200 },
  { id:'simon10',      icon:'🔴', name:'Memory King',      desc:'Reach round 10 in Simon Says',      xp:250 },
  { id:'daily',        icon:'📅', name:'Daily Player',     desc:'Complete a daily challenge',         xp:100 },
  { id:'level5',       icon:'⭐', name:'Rising Star',      desc:'Reach player level 5',              xp:0   },
  { id:'level10',      icon:'🏆', name:'Champion',         desc:'Reach player level 10',             xp:0   },
  { id:'night_owl',    icon:'🦉', name:'Night Owl',        desc:'Play after midnight',               xp:75  },
  { id:'speedrun',     icon:'⚡', name:'Speedrunner',      desc:'Play 3 games in one session',       xp:150 },
];

const XP_PER_LEVEL = 200;
const DAILY_GAMES  = ['snake','tetris','2048','flappy','breakout','mathquiz','colorflood','simon'];

// ─────────────────────────────────────────
// STATE (localStorage-backed)
// ─────────────────────────────────────────
function loadProfile() {
  // Merge session data with any saved profile progress
  const base = {
    name: currentSession.name || 'Player',
    avatar: currentSession.avatar || '🎮',
    xp: currentSession.xp || 0,
    unlockedAch: currentSession.unlockedAch || [],
    gamesPlayed: currentSession.gamesPlayed || [],
    sessionGames: 0,
    isGuest: currentSession.isGuest || false,
  };
  return base;
}
function saveProfile(p) {
  // Persist back to session
  const updated = { ...currentSession, ...p };
  saveSession(updated);
  // Also update the registered user record if not a guest
  if (!p.isGuest && currentSession.email) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex(u => u.email === currentSession.email);
    if (idx !== -1) {
      users[idx] = { ...users[idx], name: p.name, avatar: p.avatar, xp: p.xp, unlockedAch: p.unlockedAch, gamesPlayed: p.gamesPlayed };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  }
}

let profile = loadProfile();

// ─────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────
function showToast(icon, title, subtitle = '', type = '') {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-body"><strong>${title}</strong><span>${subtitle}</span></div>`;
  container.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 3500);
}

// ─────────────────────────────────────────
// THEME
// ─────────────────────────────────────────
const themeBtn = document.getElementById('themeBtn');
function applyTheme(light) {
  document.body.classList.toggle('light', light);
  themeBtn.textContent = light ? '🌙' : '☀️';
  localStorage.setItem('gz_theme', light ? 'light' : 'dark');
}
themeBtn.addEventListener('click', () => applyTheme(!document.body.classList.contains('light')));
if (localStorage.getItem('gz_theme') === 'light') applyTheme(true);

// ─────────────────────────────────────────
// PARTICLE BACKGROUND
// ─────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 55; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108,99,255,${p.alpha})`;
      ctx.fill();
    });
    // draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(108,99,255,${0.12 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ─────────────────────────────────────────
// PROFILE SYSTEM
// ─────────────────────────────────────────
function calcLevel(xp) { return Math.floor(xp / XP_PER_LEVEL) + 1; }
function xpProgress(xp) { return ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100; }

function addXP(amount, reason = '') {
  const multiplier = vip?.xpBoost ? 2 : 1;
  const finalAmount = amount * multiplier;
  const oldLevel = calcLevel(profile.xp);
  profile.xp += finalAmount;
  const newLevel = calcLevel(profile.xp);
  saveProfile(profile);
  updateNavProfile();
  if (newLevel > oldLevel) {
    showToast('⭐', `Level Up! You're now Level ${newLevel}`, `+${finalAmount} XP${multiplier > 1 ? ' (2× VIP Boost!)' : ''} — ${reason}`, 'success');
    checkAchievement('level5', newLevel >= 5);
    checkAchievement('level10', newLevel >= 10);
  }
  updateHeroStats();
}

function updateNavProfile() {
  document.getElementById('navAvatar').textContent = profile.avatar;
  document.getElementById('navName').textContent = profile.name;
}

// Build avatar picker
const avatarPicker = document.getElementById('avatarPicker');
AVATARS.forEach(av => {
  const d = document.createElement('div');
  d.className = 'avatar-opt' + (profile.avatar === av ? ' selected' : '');
  d.textContent = av;
  d.addEventListener('click', () => {
    document.querySelectorAll('.avatar-opt').forEach(x => x.classList.remove('selected'));
    d.classList.add('selected');
  });
  avatarPicker.appendChild(d);
});

document.getElementById('usernameInput').value = profile.name;

document.getElementById('profileBtn').addEventListener('click', () => {
  document.getElementById('profileModal').classList.remove('hidden');
  renderProfilePanel();
});
document.getElementById('closeProfile').addEventListener('click', () => {
  document.getElementById('profileModal').classList.add('hidden');
});
document.getElementById('profileModal').addEventListener('click', e => {
  if (e.target === document.getElementById('profileModal'))
    document.getElementById('profileModal').classList.add('hidden');
});

document.getElementById('saveProfile').addEventListener('click', () => {
  if (profile.isGuest) {
    showToast('👻', 'Guest accounts cannot save profiles', 'Sign up for a free account!', 'warning');
    return;
  }
  const name = document.getElementById('usernameInput').value.trim() || 'Player';
  const avatar = document.querySelector('.avatar-opt.selected')?.textContent || '🎮';
  profile.name = name; profile.avatar = avatar;
  saveProfile(profile);
  updateNavProfile();
  document.getElementById('profileModal').classList.add('hidden');
  showToast('✅', 'Profile saved!', `Welcome, ${name}`, 'success');
});

function renderProfilePanel() {
  const level = calcLevel(profile.xp);
  const prog  = xpProgress(profile.xp);
  document.getElementById('playerLevel').textContent = level;
  document.getElementById('playerXP').textContent = profile.xp.toLocaleString();
  document.getElementById('xpFill').style.width = prog + '%';
  document.getElementById('usernameInput').value = profile.name;

  // VIP status block
  const existingVipCard = document.querySelector('.vip-status-card');
  if (existingVipCard) existingVipCard.remove();
  if (vip) {
    const vc = document.createElement('div');
    vc.className = 'vip-status-card';
    vc.innerHTML = `<h4>👑 VIP ${vip.label} Plan Active</h4><p>${vip.expiry ? 'Expires: ' + new Date(vip.expiry).toLocaleDateString() : 'Lifetime Access'} · ${vip.xpBoost ? '2× XP Boost ON' : ''}</p>`;
    document.querySelector('.profile-meta').appendChild(vc);
  }

  // mini badges
  const badgesEl = document.getElementById('profileBadges');
  badgesEl.innerHTML = '';
  profile.unlockedAch.slice(-8).forEach(id => {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;
    const d = document.createElement('div');
    d.className = 'mini-badge'; d.textContent = ach.icon; d.title = ach.name;
    badgesEl.appendChild(d);
  });
}

// ─────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────
function checkAchievement(id, condition = true) {
  if (!condition || profile.unlockedAch.includes(id)) return;
  profile.unlockedAch.push(id);
  saveProfile(profile);
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  if (ach.xp > 0) addXP(ach.xp, ach.name);
  showToast('🏅', 'Achievement Unlocked!', `${ach.icon} ${ach.name}`, 'success');
  renderAchievements();
  updateHeroStats();
}

function renderAchievements() {
  const grid = document.getElementById('achievementsGrid');
  grid.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = profile.unlockedAch.includes(ach.id);
    return `
      <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
        <span class="ach-icon">${ach.icon}</span>
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
        ${unlocked
          ? `<span class="ach-unlocked-tag">✅ Unlocked · +${ach.xp} XP</span>`
          : `<span class="ach-locked-tag">🔒 ${ach.xp} XP reward</span>`}
      </div>`;
  }).join('');
}
renderAchievements();

// ─────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────
const MEDALS = ['🥇','🥈','🥉'];

function getScoreForKey(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  // Could be a plain number or an array of entry objects
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed[0].score || 0;
    if (typeof parsed === 'number') return parsed;
  } catch { return +raw || null; }
  return null;
}

function buildLeaderboardData(filterKey = 'all') {
  const rows = [];
  GAME_META.forEach(g => {
    const score = getScoreForKey(g.key);
    if (score === null || score === 0) return;
    if (filterKey !== 'all' && g.key !== filterKey) return;
    rows.push({
      player: profile.name, avatar: profile.avatar,
      game: g.label, icon: g.icon, score,
      date: new Date().toLocaleDateString()
    });
  });
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

function renderLeaderboard(filterKey = 'all') {
  const rows = buildLeaderboardData(filterKey);
  const tbody = document.getElementById('lbBody');
  const empty = document.getElementById('lbEmpty');

  if (!rows.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = rows.slice(0, 15).map((r, i) => `
    <tr>
      <td class="lb-rank-cell">${MEDALS[i] || (i + 1)}</td>
      <td><div class="lb-player"><span class="lb-player-avatar">${r.avatar}</span>${r.player}</div></td>
      <td>${r.icon} ${r.game}</td>
      <td class="lb-score-cell">${r.score.toLocaleString()}</td>
      <td style="color:var(--muted);font-size:0.8rem">${r.date}</td>
    </tr>`).join('');
}

function buildLeaderboardTabs() {
  const tabsEl = document.getElementById('lbTabs');
  const tabs = [{ key: 'all', label: '🌐 All Games' }, ...GAME_META.map(g => ({ key: g.key, label: `${g.icon} ${g.label}` }))];
  tabsEl.innerHTML = tabs.map((t, i) =>
    `<button class="lb-tab ${i === 0 ? 'active' : ''}" data-key="${t.key}">${t.label}</button>`
  ).join('');
  tabsEl.querySelectorAll('.lb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLeaderboard(btn.dataset.key);
    });
  });
}
buildLeaderboardTabs();
renderLeaderboard();

// ─────────────────────────────────────────
// STATS DASHBOARD
// ─────────────────────────────────────────
function renderStats() {
  const dashboard = document.getElementById('statsDashboard');
  const gamesWithScores = GAME_META.filter(g => getScoreForKey(g.key));
  const totalScore = GAME_META.reduce((sum, g) => sum + (getScoreForKey(g.key) || 0), 0);
  const topGame = GAME_META.reduce((best, g) => {
    const s = getScoreForKey(g.key) || 0;
    return s > (getScoreForKey(best?.key) || 0) ? g : best;
  }, null);
  const level = calcLevel(profile.xp);
  const nextLevelXP = level * XP_PER_LEVEL;

  const stats = [
    { icon:'🎮', val: gamesWithScores.length, label:'Games Played', sub:`out of 16 total` },
    { icon:'⭐', val: totalScore.toLocaleString(), label:'Total Score', sub:'across all games' },
    { icon:'🏅', val: profile.unlockedAch.length, label:'Achievements', sub:`of ${ACHIEVEMENTS.length} total` },
    { icon:'📈', val: `Lv.${level}`, label:'Player Level', sub:`${profile.xp} / ${nextLevelXP} XP` },
    { icon:'🏆', val: topGame ? topGame.icon + ' ' + topGame.label : '—', label:'Favourite Game', sub: topGame ? `Best: ${(getScoreForKey(topGame.key)||0).toLocaleString()}` : 'Play more games!' },
    { icon:'🔥', val: profile.sessionGames || 0, label:'This Session', sub:'games played today' },
  ];

  dashboard.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-val">${s.val}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>`).join('');
}
renderStats();

// ─────────────────────────────────────────
// HERO STATS
// ─────────────────────────────────────────
function updateHeroStats() {
  const played = GAME_META.filter(g => getScoreForKey(g.key)).length;
  const total  = GAME_META.reduce((s, g) => s + (getScoreForKey(g.key) || 0), 0);
  document.getElementById('hsTotalGames').textContent  = played;
  document.getElementById('hsTotalScore').textContent  = total > 999 ? (total / 1000).toFixed(1) + 'K' : total;
  document.getElementById('hsAchievements').textContent = profile.unlockedAch.length;
}
updateHeroStats();
updateNavProfile();

// ─────────────────────────────────────────
// DAILY CHALLENGE
// ─────────────────────────────────────────
(function setupDailyChallenge() {
  const today = new Date().toDateString();
  const dayIndex = new Date().getDate() % DAILY_GAMES.length;
  const dailyGame = DAILY_GAMES[dayIndex];
  const gameCard = document.querySelector(`.game-card[data-name="${dailyGame}"]`) ||
                   document.querySelector(`.game-card[href*="${dailyGame}"]`);

  if (gameCard) {
    gameCard.classList.add('daily-highlight');
    const href = gameCard.getAttribute('href');
    document.getElementById('dailyChallengeBtn').href = href;
    document.getElementById('dailyBadge').textContent = `⚡ Daily Challenge: ${gameCard.querySelector('h3').textContent}`;
  }

  const lastDaily = localStorage.getItem('gz_daily_date');
  if (lastDaily === today) {
    document.getElementById('dailyChallengeBtn').textContent = '✅ Challenge Done!';
  }

  document.getElementById('dailyChallengeBtn').addEventListener('click', () => {
    if (localStorage.getItem('gz_daily_date') !== today) {
      localStorage.setItem('gz_daily_date', today);
      checkAchievement('daily');
    }
  });
})();

// ─────────────────────────────────────────
// RECENTLY PLAYED
// ─────────────────────────────────────────
function loadRecent() { return JSON.parse(localStorage.getItem('gz_recent') || '[]'); }
function saveRecent(arr) { localStorage.setItem('gz_recent', JSON.stringify(arr)); }

function renderRecent() {
  const recent = loadRecent();
  const section = document.getElementById('recentSection');
  const row = document.getElementById('recentRow');
  if (!recent.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  row.innerHTML = recent.map(r => `
    <a class="recent-chip" href="${r.href}">
      <span class="rc-icon">${r.icon}</span>
      <div class="rc-info"><strong>${r.name}</strong><span>Best: ${r.score || '—'}</span></div>
    </a>`).join('');
}
renderRecent();

// Track clicks on game cards → update recently played
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    const name = card.querySelector('h3').textContent;
    const href = card.getAttribute('href');
    const key  = card.dataset.key;
    const icon = card.querySelector('.card-thumb').textContent.trim().slice(0, 2);
    const score = getScoreForKey(key);

    let recent = loadRecent().filter(r => r.href !== href);
    recent.unshift({ name, href, icon, score });
    saveRecent(recent.slice(0, 5));

    // XP for playing
    profile.sessionGames = (profile.sessionGames || 0) + 1;
    if (!profile.gamesPlayed.includes(key)) {
      profile.gamesPlayed.push(key);
      addXP(25, `Played ${name}`);
    }
    saveProfile(profile);

    // Achievement checks
    checkAchievement('first_play', profile.gamesPlayed.length >= 1);
    checkAchievement('play5',     profile.gamesPlayed.length >= 5);
    checkAchievement('play_all',  profile.gamesPlayed.length >= 16);
    checkAchievement('speedrun',  profile.sessionGames >= 3);
    checkAchievement('night_owl', new Date().getHours() >= 0 && new Date().getHours() < 5);
  });
});

// ─────────────────────────────────────────
// CARD BEST SCORES
// ─────────────────────────────────────────
function renderCardBests() {
  document.querySelectorAll('.card-best').forEach(el => {
    const key = el.dataset.key;
    const score = getScoreForKey(key);
    if (score) {
      el.textContent = `⭐ ${score.toLocaleString()}`;
    }
  });
}
renderCardBests();

// Check score-based achievements
(function checkScoreAchievements() {
  const maxScore = Math.max(...GAME_META.map(g => getScoreForKey(g.key) || 0));
  checkAchievement('score1000',  maxScore >= 1000);
  checkAchievement('score10000', maxScore >= 10000);
  checkAchievement('snake100',   (getScoreForKey('gz_snake') || 0) >= 100);
  checkAchievement('tetris500',  (getScoreForKey('gz_tetris') || 0) >= 500);
  checkAchievement('flappy10',   (getScoreForKey('gz_flappy') || 0) >= 10);
  checkAchievement('typing60',   (getScoreForKey('gz_typing') || 0) >= 60);
  checkAchievement('simon10',    (getScoreForKey('gz_simon') || 0) >= 10);
})();

// ─────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  document.querySelectorAll('.game-card').forEach(card => {
    card.classList.toggle('hidden-card', q && !card.dataset.name.includes(q));
  });
  if (q) document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
});

// ─────────────────────────────────────────
// CATEGORY FILTER
// ─────────────────────────────────────────
document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const cat = pill.dataset.cat;
    document.querySelectorAll('.game-card').forEach(card => {
      card.classList.toggle('hidden-card', cat !== 'all' && card.dataset.cat !== cat);
    });
    document.getElementById('searchInput').value = '';
  });
});

// ─────────────────────────────────────────
// SORT
// ─────────────────────────────────────────
document.getElementById('sortSelect').addEventListener('change', function () {
  const grid = document.getElementById('gamesGrid');
  const cards = [...grid.querySelectorAll('.game-card')];
  const recent = loadRecent().map(r => r.href);

  cards.sort((a, b) => {
    if (this.value === 'name') return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
    if (this.value === 'score') return (getScoreForKey(b.dataset.key) || 0) - (getScoreForKey(a.dataset.key) || 0);
    if (this.value === 'recent') return recent.indexOf(a.href) - recent.indexOf(b.href);
    return 0;
  });
  cards.forEach(c => grid.appendChild(c));
});

// ─────────────────────────────────────────
// WELCOME TOAST
// ─────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const sub = profile.isGuest
      ? 'Playing as Guest — sign up to save progress!'
      : `Level ${calcLevel(profile.xp)} · ${profile.xp} XP`;
    showToast(profile.avatar, `${greeting}, ${profile.name}!`, sub);
  }, 800);
});
