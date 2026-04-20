/* ARCADE10 — app.js */

const GAMES = [
  { id:'trivia',      name:'Trivia Rush',      tagline:'10 questions, 15 sec each. Beat the clock.',    icon:'🧠', difficulty:'easy',   genre:'trivia',  scoreKey:'arcade_trivia_highscore',      scoreLabel:'HIGH SCORE',  available:true },
  { id:'wordblitz',   name:'Word Blitz',        tagline:'Guess the 5-letter word in 6 tries.',           icon:'📝', difficulty:'easy',   genre:'word',    scoreKey:'arcade_wordblitz_streak',      scoreLabel:'BEST STREAK', available:true },
  { id:'memory',      name:'Memory Match',      tagline:'Flip cards to find all pairs.',                 icon:'🃏', difficulty:'easy',   genre:'puzzle',  scoreKey:'arcade_memory_best',           scoreLabel:'BEST MOVES',  available:true },
  { id:'targetpop',   name:'Target Pop',        tagline:'Click targets before they vanish.',             icon:'🎯', difficulty:'easy',   genre:'action',  scoreKey:'arcade_targetpop_highscore',   scoreLabel:'HIGH SCORE',  available:true },
  { id:'snake',       name:'Neon Snake',        tagline:'Classic snake. Glow up.',                       icon:'🐍', difficulty:'easy',   genre:'action',  scoreKey:'arcade_snake_highscore',       scoreLabel:'HIGH SCORE',  available:true },
  { id:'blockdrop',   name:'Block Drop',        tagline:'Tetris-style falling block puzzle.',            icon:'🧱', difficulty:'medium', genre:'puzzle',  scoreKey:'arcade_blockdrop_highscore',   scoreLabel:'HIGH SCORE',  available:true },
  { id:'slidepuzzle', name:'Slide Puzzle',      tagline:'Rearrange tiles to solve the puzzle.',          icon:'🧩', difficulty:'easy',   genre:'puzzle',  scoreKey:'arcade_slide_best',            scoreLabel:'BEST MOVES',  available:true },
  { id:'asteroid',    name:'Asteroid Blaster',  tagline:'Shoot rocks, survive waves.',                   icon:'🚀', difficulty:'medium', genre:'action',  scoreKey:'arcade_asteroid_highscore',    scoreLabel:'HIGH SCORE',  available:true },
  { id:'beattap',     name:'Beat Tap',          tagline:'4-lane rhythm tap game.',                       icon:'🎵', difficulty:'medium', genre:'action',  scoreKey:'arcade_beattap_best',          scoreLabel:'BEST GRADE',  available:true },
  { id:'dasher',      name:'Dash Racer',        tagline:'Top-down keyboard racer. 3 laps.',              icon:'🏎️', difficulty:'medium', genre:'action',  scoreKey:'arcade_racer_pb',              scoreLabel:'BEST LAP',    available:true },
];

const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

const Sound = {
  ctx: null,
  muted: Store.get('arcade_mute', false),
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } },
  play(type) {
    if (this.muted || !this.ctx) return;
    const cfg = {
      correct: { freq:[523,659], dur:0.12, gain:0.18, type:'square' },
      wrong:   { freq:[180],     dur:0.22, gain:0.18, type:'sawtooth' },
      tick:    { freq:[880],     dur:0.04, gain:0.06, type:'square' },
      win:     { freq:[523,659,784,1047], dur:0.12, gain:0.15, type:'square' },
    };
    const c = cfg[type]; if (!c) return;
    let t = this.ctx.currentTime;
    c.freq.forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.type = c.type;
      o.frequency.setValueAtTime(f, t + i * c.dur * 0.9);
      g.gain.setValueAtTime(c.gain, t + i * c.dur * 0.9);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * c.dur * 0.9 + c.dur);
      o.start(t + i * c.dur * 0.9); o.stop(t + i * c.dur * 0.9 + c.dur + 0.01);
    });
  },
  toggle() { this.muted = !this.muted; Store.set('arcade_mute', this.muted); updateMuteButtons(); },
};

function updateMuteButtons() {
  document.querySelectorAll('.mute-btn').forEach(b => {
    b.classList.toggle('muted', Sound.muted);
    b.title = Sound.muted ? 'Unmute' : 'Mute';
  });
}

const Router = {
  current: null,
  go(gameId) {
    const game = GAMES.find(g => g.id === gameId);
    if (!game || !game.available) return;
    Sound.init();
    this.current = game;
    document.getElementById('lobby').classList.add('hidden');
    const shell = document.getElementById('gameShell');
    shell.classList.remove('hidden');
    document.getElementById('shellTitle').textContent = game.name.toUpperCase();
    document.getElementById('shellScore').textContent = '0';
    const container = document.getElementById('gameContainer');
    container.innerHTML = '';
    window[`start_${gameId}`]?.(container);
  },
  back() {
    if (this.current) { window[`stop_${this.current.id}`]?.(); this.current = null; }
    document.getElementById('gameShell').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    renderGrid(currentFilter);
  },
};

window.setShellScore = function(val) {
  document.getElementById('shellScore').textContent = val;
};

let currentFilter = 'all';

function renderGrid(filter = 'all') {
  currentFilter = filter;
  const grid = document.getElementById('gameGrid');
  const filtered = filter === 'all' ? GAMES : GAMES.filter(g => g.difficulty === filter || g.genre === filter);
  grid.innerHTML = '';
  filtered.forEach((game, i) => {
    const score = Store.get(game.scoreKey);
    const hasScore = score !== null;
    const coming = !game.available;
    const card = document.createElement('div');
    card.className = 'game-card' + (coming ? ' coming-soon' : '');
    card.style.animationDelay = `${i * 0.04}s`;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${game.icon}</div>
        <div class="card-badges">
          <span class="badge badge-${game.difficulty}">${game.difficulty}</span>
          <span class="badge badge-genre">${game.genre}</span>
          ${coming ? '<span class="badge badge-coming">soon</span>' : ''}
        </div>
      </div>
      <div class="card-num">${String(GAMES.indexOf(game) + 1).padStart(2, '0')}</div>
      <div class="card-name">${game.name}</div>
      <div class="card-tagline">${game.tagline}</div>
      <div class="card-score-row">
        <div>
          <div class="card-score-label">${game.scoreLabel}</div>
          <div class="card-score-val ${hasScore ? '' : 'no-score'}">${hasScore ? score : '—'}</div>
        </div>
        <div class="card-play-hint">${coming ? 'coming soon' : '▶ play'}</div>
      </div>
    `;
    if (!coming) card.addEventListener('click', () => Router.go(game.id));
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderGrid('all');
  updateMuteButtons();
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid(btn.dataset.filter);
    });
  });
  document.getElementById('backBtn').addEventListener('click', () => Router.back());
  document.getElementById('muteBtn').addEventListener('click', () => Sound.toggle());
  document.getElementById('shellMuteBtn').addEventListener('click', () => Sound.toggle());
});
