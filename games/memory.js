/* ══════════════════════════════════════════════════════
   ARCADE10 — Memory Match (FIXED)
   Flip cards to find all pairs · 4x4 · 4x5 · 6x6
══════════════════════════════════════════════════════ */

(function () {

  const EMOJI_POOL = [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
    '🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅',
    '🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪲','🦋','🐛',
    '🌸','🌺','🌻','🌹','🍁','🍄','🌊','⭐','🌙','☀️',
    '🍎','🍊','🍋','🍇','🍓','🫐','🍉','🍑','🥝','🌮',
    '🎮','🎯','🎲','🎸','🎺','🎻','🥁','🎷','🏆','🎪',
  ];

  const GRID_SIZES = [
    { label: '4×4', cols: 4, rows: 4, pairs: 8,  key: '4x4' },
    { label: '4×5', cols: 5, rows: 4, pairs: 10, key: '4x5' },
    { label: '6×6', cols: 6, rows: 6, pairs: 18, key: '6x6' },
  ];

  let container, root;
  let selectedSize = null;
  let cards = [];
  let flipped = [];
  let moves = 0;
  let matched = 0;
  let totalPairs = 0;
  let locked = false;
  let gameActive = false;
  let timerInterval = null;
  let elapsed = 0;

  function start_memory(cont) {
    container = cont;
    showSizeSelect();
  }

  function stop_memory() {
    clearInterval(timerInterval);
    container = null;
  }

  function showSizeSelect() {
    gameActive = false;
    clearInterval(timerInterval);
    if (!container) return;

    container.innerHTML = `
      <div id="mm-root" style="
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        width:100%;height:100%;background:#0a0a0f;gap:16px;padding:24px;box-sizing:border-box;
      ">
        <div style="font:700 22px/1 'Bebas Neue',sans-serif;color:#fff;letter-spacing:3px;">SELECT GRID SIZE</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          ${GRID_SIZES.map((s, i) => `
            <button data-si="${i}" style="
              background:linear-gradient(135deg,#1a1a2e,#16213e);
              border:1.5px solid #333;border-radius:12px;
              padding:20px 28px;cursor:pointer;text-align:center;
              transition:border-color .2s,transform .15s;color:#fff;font-family:inherit;min-width:100px;
            ">
              <div style="font:700 24px/1 'Bebas Neue',sans-serif;letter-spacing:2px;color:#4cc9f0;">${s.label}</div>
              <div style="font:400 11px/1.4 'DM Sans',sans-serif;color:#888;margin-top:6px;">${s.pairs} pairs</div>
              <div style="font:400 10px/1.4 'DM Mono',monospace;color:#555;margin-top:2px;">
                BEST: ${Store.get(`arcade_memory_best_${s.key}`) ?? '—'} moves
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-si]').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#4cc9f0'; btn.style.transform = 'scale(1.04)'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#333';    btn.style.transform = 'scale(1)';    });
      btn.addEventListener('click', () => startGame(GRID_SIZES[+btn.dataset.si]));
    });

    root = container.querySelector('#mm-root');
  }

  function startGame(size) {
    selectedSize = size;
    totalPairs = size.pairs;
    moves = 0;
    matched = 0;
    flipped = [];
    locked = false;
    gameActive = true;
    elapsed = 0;

    const emojis = shuffle([...EMOJI_POOL]).slice(0, totalPairs);
    cards = shuffle([...emojis, ...emojis]).map((emoji, id) => ({
      id, emoji, flipped: false, matched: false,
    }));

    window.setShellScore(1000);

    clearInterval(timerInterval);
    timerInterval = setInterval(() => { elapsed++; }, 1000);

    buildGameUI(size);
  }

  function buildGameUI(size) {
    if (!container) return;
    container.innerHTML = `
      <div id="mm-root" style="
        display:flex;flex-direction:column;align-items:center;
        width:100%;height:100%;background:#0a0a0f;
        padding:10px 8px 8px;box-sizing:border-box;gap:8px;
        position:relative;
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;max-width:440px;">
          <div style="text-align:center;">
            <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff44;letter-spacing:1px;">MOVES</div>
            <div id="mm-moves" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#fff;">0</div>
          </div>
          <div id="mm-progress" style="font:700 13px/1 'Bebas Neue',sans-serif;color:#ffffff55;letter-spacing:2px;">
            0 / ${totalPairs}
          </div>
          <div style="text-align:center;">
            <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff44;letter-spacing:1px;">BEST</div>
            <div id="mm-best" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#ffd60a;">
              ${Store.get(`arcade_memory_best_${size.key}`) ?? '—'}
            </div>
          </div>
        </div>
        <div id="mm-grid" style="
          flex:1;min-height:0;width:100%;max-width:440px;
          display:grid;
          grid-template-columns:repeat(${size.cols},1fr);
          grid-template-rows:repeat(${size.rows},1fr);
          gap:6px;padding:2px;
        "></div>
      </div>
    `;

    root = container.querySelector('#mm-root');
    injectStyles();
    renderCards();
  }

  function injectStyles() {
    if (!document.querySelector('#mm-styles')) {
      const style = document.createElement('style');
      style.id = 'mm-styles';
      style.textContent = `
        .mm-card { perspective: 400px; cursor: pointer; }
        .mm-card-inner {
          width:100%;height:100%;position:relative;
          transform-style:preserve-3d;
          transition:transform .35s cubic-bezier(.4,0,.2,1);
          border-radius:8px;
        }
        .mm-card.flipped .mm-card-inner { transform:rotateY(180deg); }
        .mm-card-front, .mm-card-back {
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          border-radius:8px;backface-visibility:hidden;
          -webkit-backface-visibility:hidden;
        }
        .mm-card-back { transform:rotateY(180deg); }
        .mm-card.matched .mm-card-inner { animation:mm-pop .3s ease; }
        @keyframes mm-pop {
          0%{transform:rotateY(180deg) scale(1)}
          50%{transform:rotateY(180deg) scale(1.12)}
          100%{transform:rotateY(180deg) scale(1)}
        }
      `;
      document.head.appendChild(style);
    }
  }

  function renderCards() {
    if (!container) return;
    const grid = container.querySelector('#mm-grid');
    grid.innerHTML = '';

    cards.forEach((card, idx) => {
      const el = document.createElement('div');
      el.className = 'mm-card' + (card.flipped || card.matched ? ' flipped' : '') + (card.matched ? ' matched' : '');
      el.dataset.idx = idx;

      const hue = (EMOJI_POOL.indexOf(card.emoji) / EMOJI_POOL.length) * 360;

      el.innerHTML = `
        <div class="mm-card-inner">
          <div class="mm-card-front" style="background:linear-gradient(135deg,#1e1e3a,#2a2a4a);border:2px solid #333;">
            <span style="font-size:clamp(14px,3.5vw,22px);opacity:0.3;">?</span>
          </div>
          <div class="mm-card-back" style="
            background:${card.matched ? `hsl(${hue},60%,20%)` : 'linear-gradient(135deg,#2a2a4a,#3a2a4a)'};
            border:2px solid ${card.matched ? `hsl(${hue},70%,40%)` : '#554466'};
          ">
            <span style="font-size:clamp(18px,4vw,28px);">${card.emoji}</span>
          </div>
        </div>
      `;

      el.addEventListener('click', () => onCardClick(idx));
      grid.appendChild(el);
    });
  }

  function onCardClick(idx) {
    if (!gameActive || locked) return;
    const card = cards[idx];
    if (card.flipped || card.matched) return;
    if (flipped.length >= 2) return;

    card.flipped = true;
    flipped.push(idx);
    flipCardEl(idx, true);

    if (flipped.length === 2) {
      moves++;
      updateMoves();

      const [a, b] = flipped;
      if (cards[a].emoji === cards[b].emoji) {
        locked = true;
        setTimeout(() => {
          if (!container) return;
          cards[a].matched = true;
          cards[b].matched = true;
          markMatched(a);
          markMatched(b);
          matched++;
          flipped = [];
          locked = false;
          updateProgress();

          const pts = Math.max(0, 1000 - moves * 10);
          window.setShellScore(pts);

          if (matched === totalPairs) finishGame();
        }, 500);
      } else {
        locked = true;
        setTimeout(() => {
          if (!container) return;
          cards[a].flipped = false;
          cards[b].flipped = false;
          flipCardEl(a, false);
          flipCardEl(b, false);
          flipped = [];
          locked = false;
        }, 900);
      }
    }
  }

  function flipCardEl(idx, faceUp) {
    if (!container) return;
    const els = container.querySelectorAll('.mm-card');
    const el = els[idx];
    if (!el) return;
    if (faceUp) el.classList.add('flipped');
    else el.classList.remove('flipped');
  }

  function markMatched(idx) {
    if (!container) return;
    const els = container.querySelectorAll('.mm-card');
    const el = els[idx];
    if (!el) return;
    el.classList.add('matched');
    const back = el.querySelector('.mm-card-back');
    const hue = (EMOJI_POOL.indexOf(cards[idx].emoji) / EMOJI_POOL.length) * 360;
    if (back) {
      back.style.background = `hsl(${hue},60%,20%)`;
      back.style.border = `2px solid hsl(${hue},70%,40%)`;
    }
  }

  function updateMoves() {
    if (!container) return;
    const el = container.querySelector('#mm-moves');
    if (el) el.textContent = moves;
  }

  function updateProgress() {
    if (!container) return;
    const el = container.querySelector('#mm-progress');
    if (el) el.textContent = `${matched} / ${totalPairs}`;
  }

  function finishGame() {
    gameActive = false;
    clearInterval(timerInterval);
    if (!container) return;

    const finalScore = Math.max(0, 1000 - moves * 10);
    window.setShellScore(finalScore);

    const key = `arcade_memory_best_${selectedSize.key}`;
    const prev = Store.get(key, Infinity);
    if (moves < prev) Store.set(key, moves);
    const isNewBest = moves < prev;

    const color = finalScore >= 900 ? '#4ade80' : finalScore >= 700 ? '#4cc9f0' : finalScore >= 500 ? '#ffd60a' : '#f97316';

    // FIX: root already has position:relative from buildGameUI
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:absolute;inset:0;z-index:50;background:#000000cc;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:12px;padding:24px;
    `;
    overlay.innerHTML = `
      <div style="font:700 13px/1 'DM Mono',monospace;letter-spacing:3px;color:#ffffff66;">COMPLETE!</div>
      <div style="font:700 52px/1 'Bebas Neue',sans-serif;color:${color};filter:drop-shadow(0 0 14px ${color}88);">
        ${finalScore}
      </div>
      <div style="font:400 13px/1.6 'DM Mono',monospace;color:#aaa;text-align:center;">
        ${moves} moves · ${elapsed}s<br>
        ${isNewBest ? '<span style="color:#ffd60a;">★ NEW BEST!</span>' : `Best: ${Store.get(key)} moves`}
      </div>
      <div style="display:flex;gap:10px;margin-top:8px;">
        <button id="mm-retry" style="
          background:${color}22;border:1.5px solid ${color};color:${color};
          padding:10px 24px;border-radius:8px;
          font:700 14px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;">PLAY AGAIN</button>
        <button id="mm-sizes" style="
          background:#ffffff0d;border:1.5px solid #ffffff22;color:#ffffff99;
          padding:10px 24px;border-radius:8px;
          font:700 14px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;">CHANGE SIZE</button>
      </div>
    `;

    root.appendChild(overlay);
    overlay.querySelector('#mm-retry').addEventListener('click', () => { overlay.remove(); startGame(selectedSize); });
    overlay.querySelector('#mm-sizes').addEventListener('click', () => showSizeSelect());
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  window.start_memory = start_memory;
  window.stop_memory  = stop_memory;

})();
