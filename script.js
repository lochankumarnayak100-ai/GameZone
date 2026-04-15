/* ════════════════════════════════════════
   Memory Card Matching Game — script.js
   ════════════════════════════════════════ */

// ── Emoji sets per difficulty ──
const EMOJIS = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
  '🐨','🐯','🦁','🐮','🐸','🐵','🐔','🐧',
  '🦋','🌸','🍕','🎸','🚀','⚽','🎯','🍩',
  '🌈','🦄','🎃','🍦','🎲','🔮','🏆','💎'
];

// ── Difficulty config: { cols, rows } ──
const LEVELS = {
  easy:   { cols: 4, rows: 4 },   // 16 cards = 8 pairs
  medium: { cols: 5, rows: 4 },   // 20 cards = 10 pairs  (padded to even)
  hard:   { cols: 6, rows: 6 },   // 36 cards = 18 pairs
};

// ── State ──
let cards = [];          // DOM card elements
let flipped = [];        // currently flipped (max 2)
let matched = 0;         // matched pairs count
let moves = 0;
let score = 0;
let timerInterval = null;
let seconds = 0;
let locked = false;      // prevent clicks during check
let currentLevel = 'easy';

// ── DOM refs ──
const board       = document.getElementById('board');
const movesEl     = document.getElementById('moves');
const scoreEl     = document.getElementById('score');
const timerEl     = document.getElementById('timer');
const modal       = document.getElementById('modal');
const finalTime   = document.getElementById('finalTime');
const finalMoves  = document.getElementById('finalMoves');
const finalScore  = document.getElementById('finalScore');
const leaderboard = document.getElementById('leaderboard');
const themeToggle = document.getElementById('themeToggle');

// ── Audio (Web Audio API — no files needed) ──
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.12, vol = 0.18) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) { /* audio not supported */ }
}

const sfx = {
  flip:  () => playTone(440, 'sine', 0.1, 0.12),
  match: () => { playTone(523, 'triangle', 0.15, 0.2); setTimeout(() => playTone(659, 'triangle', 0.15, 0.2), 120); },
  wrong: () => playTone(220, 'sawtooth', 0.18, 0.15),
  win:   () => [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f,'triangle',0.2,0.25), i*130)),
};

// ── Utilities ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

function calcScore(moves, seconds, pairs) {
  // Base score minus penalties for extra moves and time
  const base = pairs * 100;
  const movePenalty = Math.max(0, (moves - pairs) * 5);
  const timePenalty = Math.floor(seconds / 5) * 2;
  return Math.max(0, base - movePenalty - timePenalty);
}

// ── Timer ──
function startTimer() {
  stopTimer();
  seconds = 0;
  timerEl.textContent = '00:00';
  timerInterval = setInterval(() => {
    seconds++;
    timerEl.textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ── Build board ──
function buildBoard(level) {
  const { cols, rows } = LEVELS[level];
  const totalCards = cols * rows;
  const pairs = totalCards / 2;

  // Pick emojis for this game
  const chosen = shuffle(EMOJIS).slice(0, pairs);
  const deck = shuffle([...chosen, ...chosen]);

  // Set CSS grid columns
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  // Card size hint via CSS custom property
  const maxBoardPx = Math.min(window.innerWidth - 32, 680);
  const cardSize = Math.floor((maxBoardPx - (cols - 1) * 12) / cols);
  board.style.maxWidth = `${maxBoardPx}px`;

  board.innerHTML = '';
  cards = [];
  flipped = [];
  matched = 0;
  moves = 0;
  score = 0;
  locked = false;
  movesEl.textContent = '0';
  scoreEl.textContent = '0';

  deck.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.emoji = emoji;
    card.dataset.index = i;
    card.style.width = `${cardSize}px`;
    card.style.height = `${cardSize}px`;

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back"></div>
        <div class="card-face card-front">${emoji}</div>
      </div>`;

    card.addEventListener('click', onCardClick);
    board.appendChild(card);
    cards.push(card);
  });

  startTimer();
}

// ── Card click handler ──
function onCardClick(e) {
  const card = e.currentTarget;

  // Ignore if locked, already flipped, or already matched
  if (locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;

  sfx.flip();
  card.classList.add('flipped');
  flipped.push(card);

  if (flipped.length === 2) checkMatch();
}

// ── Match logic ──
function checkMatch() {
  locked = true;
  moves++;
  movesEl.textContent = moves;

  const [a, b] = flipped;

  if (a.dataset.emoji === b.dataset.emoji) {
    // ✅ Match
    sfx.match();
    a.classList.add('matched');
    b.classList.add('matched');
    matched++;
    flipped = [];
    locked = false;

    // Update score live
    const { cols, rows } = LEVELS[currentLevel];
    score = calcScore(moves, seconds, (cols * rows) / 2);
    scoreEl.textContent = score;

    if (matched === (cards.length / 2)) onWin();
  } else {
    // ❌ No match — shake and flip back
    sfx.wrong();
    a.classList.add('wrong');
    b.classList.add('wrong');

    setTimeout(() => {
      a.classList.remove('flipped', 'wrong');
      b.classList.remove('flipped', 'wrong');
      flipped = [];
      locked = false;
    }, 900);
  }
}

// ── Win ──
function onWin() {
  stopTimer();
  sfx.win();

  const { cols, rows } = LEVELS[currentLevel];
  score = calcScore(moves, seconds, (cols * rows) / 2);
  scoreEl.textContent = score;

  finalTime.textContent  = formatTime(seconds);
  finalMoves.textContent = moves;
  finalScore.textContent = score;

  saveLeaderboard(score, moves, seconds);
  renderLeaderboard();

  setTimeout(() => modal.classList.remove('hidden'), 500);
}

// ── Leaderboard (LocalStorage) ──
function saveLeaderboard(score, moves, seconds) {
  const key = `memoryMatch_${currentLevel}`;
  const entries = JSON.parse(localStorage.getItem(key) || '[]');
  entries.push({ score, moves, time: formatTime(seconds), date: new Date().toLocaleDateString() });
  entries.sort((a, b) => b.score - a.score);
  localStorage.setItem(key, JSON.stringify(entries.slice(0, 5))); // keep top 5
}

function renderLeaderboard() {
  const key = `memoryMatch_${currentLevel}`;
  const entries = JSON.parse(localStorage.getItem(key) || '[]');
  leaderboard.innerHTML = entries.length
    ? entries.map((e, i) =>
        `<li><span>#${i+1} ${e.date}</span><span>⭐${e.score} 🔄${e.moves} ⏱${e.time}</span></li>`
      ).join('')
    : '<li style="justify-content:center">No records yet</li>';
}

// ── Restart ──
function restartGame() {
  modal.classList.add('hidden');
  buildBoard(currentLevel);
}

// ── Difficulty buttons ──
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLevel = btn.dataset.level;
    stopTimer();
    buildBoard(currentLevel);
  });
});

// ── Restart button ──
document.getElementById('restartBtn').addEventListener('click', restartGame);
document.getElementById('playAgainBtn').addEventListener('click', restartGame);

// ── Dark / Light mode ──
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  themeToggle.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('memoryTheme', dark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => {
  applyTheme(!document.body.classList.contains('dark'));
});

// ── Init ──
(function init() {
  // Restore theme
  const savedTheme = localStorage.getItem('memoryTheme');
  if (savedTheme === 'dark') applyTheme(true);

  // Restore last difficulty
  const savedLevel = localStorage.getItem('memoryLevel');
  if (savedLevel && LEVELS[savedLevel]) {
    currentLevel = savedLevel;
    document.querySelectorAll('.diff-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.level === currentLevel);
    });
  }

  buildBoard(currentLevel);
})();
