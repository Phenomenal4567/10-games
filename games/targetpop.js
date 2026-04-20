/* ARCADE10 — Target Pop (FIXED) */
(function () {
  let container, root, animFrame, targets, score, timeLeft, timerInt, gameActive, level;
  let spawnTimeout;

  function start_targetpop(cont) {
    container = cont;
    container.innerHTML = `
      <div id="tp-root" style="position:relative;width:100%;height:100%;background:#0a0a0f;overflow:hidden;cursor:crosshair;">
        <div id="tp-hud" style="position:absolute;top:10px;left:0;right:0;display:flex;justify-content:space-between;padding:0 16px;z-index:10;">
          <div style="font:700 18px/1 'Bebas Neue',sans-serif;color:#ffd60a;">LEVEL <span id="tp-level">1</span></div>
          <div id="tp-score-disp" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#fff;">0</div>
          <div style="font:700 18px/1 'Bebas Neue',sans-serif;color:#4cc9f0;"><span id="tp-timer">30</span>s</div>
        </div>
        <div id="tp-field" style="position:absolute;inset:0;top:40px;"></div>
        <div id="tp-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0a0a0fcc;z-index:20;">
          <div style="font:700 32px/1 'Bebas Neue',sans-serif;color:#f72585;letter-spacing:3px;">TARGET POP</div>
          <div style="font:400 14px/1.6 'DM Sans',sans-serif;color:#aaa;text-align:center;">Click targets before they vanish.<br>Bigger = easy. Smaller = more points!</div>
          <div style="font:400 11px/1 'DM Mono',monospace;color:#ffd60a;">BEST: ${Store.get('arcade_targetpop_highscore')||0}</div>
          <button id="tp-start" style="background:#f72585;border:none;color:#fff;padding:12px 36px;border-radius:8px;font:700 16px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;">START</button>
        </div>
      </div>`;
    root = container.querySelector('#tp-root');
    container.querySelector('#tp-start').addEventListener('click', startGame);
    injectStyles();
  }

  function stop_targetpop() {
    clearInterval(timerInt);
    clearTimeout(spawnTimeout);
    cancelAnimationFrame(animFrame);
    if (targets) targets.forEach(t => { clearTimeout(t.timeout); t.el && t.el.remove(); });
    targets = [];
    container = null;
  }

  function injectStyles() {
    if (!document.querySelector('#tp-styles')) {
      const s = document.createElement('style');
      s.id = 'tp-styles';
      s.textContent = `
        @keyframes tp-pop { 0%{transform:scale(0);opacity:1} 10%{transform:scale(1.1)} 15%{transform:scale(1)} 85%{transform:scale(1);opacity:1} 100%{transform:scale(0);opacity:0} }
        @keyframes tp-float { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-50px);opacity:0} }
      `;
      document.head.appendChild(s);
    }
  }

  function startGame() {
    score = 0; timeLeft = 30; level = 1; targets = [];
    gameActive = true;

    // FIX: cleanly remove overlay by id instead of fragile selector
    const overlay = root.querySelector('#tp-overlay');
    if (overlay) overlay.remove();
    // Clear any lingering result panel
    const result = root.querySelector('#tp-result');
    if (result) result.remove();

    window.setShellScore(0);
    clearInterval(timerInt);
    timerInt = setInterval(() => {
      if (!container) { clearInterval(timerInt); return; }
      timeLeft--;
      const el = container.querySelector('#tp-timer');
      if (el) el.textContent = timeLeft;
      if (timeLeft <= 0) endGame();
    }, 1000);

    clearTimeout(spawnTimeout);
    spawnLoop();
  }

  function spawnLoop() {
    if (!gameActive || !container) return;
    spawnTarget();
    const delay = Math.max(400, 1200 - level * 80);
    spawnTimeout = setTimeout(spawnLoop, delay);
  }

  function spawnTarget() {
    if (!container) return;
    const field = container.querySelector('#tp-field');
    if (!field) return;
    const fw = field.clientWidth, fh = field.clientHeight;
    if (fw < 10 || fh < 10) return;
    const size = Math.floor(Math.random() * 40 + 24);
    const pts = Math.max(10, Math.round(120 - size * 1.5 + 20));
    const x = Math.random() * Math.max(0, fw - size);
    const y = Math.random() * Math.max(0, fh - size);
    const life = Math.max(600, 2200 - level * 120);
    const hue = Math.random() * 360;

    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;left:${x}px;top:${y}px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:hsl(${hue},80%,55%);
      box-shadow:0 0 ${size/2}px hsl(${hue},80%,55%);
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      font:700 ${Math.max(10,size/3)}px/1 'Bebas Neue',sans-serif;color:#fff;
      transition:transform .1s;user-select:none;
      animation:tp-pop ${life}ms linear forwards;
    `;
    el.textContent = `+${pts}`;

    const t = { el, timeout: null };
    targets.push(t);

    el.addEventListener('click', () => {
      if (!gameActive || !container) return;
      score += pts;
      level = Math.min(10, Math.floor(score / 200) + 1);
      window.setShellScore(score);
      const scoreEl = container.querySelector('#tp-score-disp');
      if (scoreEl) scoreEl.textContent = score;
      floatText(x + size/2, y, `+${pts}`, `hsl(${hue},80%,60%)`);
      el.remove();
      targets = targets.filter(x => x !== t);
      clearTimeout(t.timeout);
      const lvlEl = container.querySelector('#tp-level');
      if (lvlEl) lvlEl.textContent = level;
    });

    t.timeout = setTimeout(() => {
      el.remove();
      targets = targets.filter(x => x !== t);
    }, life);

    field.appendChild(el);
  }

  function floatText(x, y, text, color) {
    if (!container) return;
    const field = container.querySelector('#tp-field');
    if (!field) return;
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;color:${color};
      font:700 18px/1 'Bebas Neue',sans-serif;pointer-events:none;z-index:5;
      animation:tp-float 0.8s ease forwards;`;
    el.textContent = text;
    field.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function endGame() {
    gameActive = false;
    clearInterval(timerInt);
    clearTimeout(spawnTimeout);
    if (!container) return;
    // FIX: clear all remaining targets properly
    if (targets) targets.forEach(t => { clearTimeout(t.timeout); if (t.el) t.el.remove(); });
    targets = [];

    const best = Store.get('arcade_targetpop_highscore', 0);
    const isNew = score > best;
    if (isNew) Store.set('arcade_targetpop_highscore', score);

    // FIX: use a unique id so it can be cleanly removed on replay
    const panel = document.createElement('div');
    panel.id = 'tp-result';
    panel.style.cssText = 'position:absolute;inset:0;background:#000000cc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:30;';
    panel.innerHTML = `
      <div style="font:700 28px/1 'Bebas Neue',sans-serif;color:#f72585;">TIME'S UP!</div>
      <div style="font:700 48px/1 'Bebas Neue',sans-serif;color:#fff;">${score}</div>
      ${isNew ? `<div style="color:#ffd60a;font:700 13px/1 'DM Mono',monospace;">🏆 NEW BEST!</div>` : `<div style="color:#aaa;font:400 12px/1 'DM Mono',monospace;">BEST: ${best}</div>`}
      <button id="tp-again" style="background:#f72585;border:none;color:#fff;padding:10px 32px;border-radius:8px;font:700 15px/1 'Bebas Neue',sans-serif;cursor:pointer;margin-top:8px;">PLAY AGAIN</button>
    `;
    root.appendChild(panel);

    panel.querySelector('#tp-again').addEventListener('click', () => {
      const p = root.querySelector('#tp-result');
      if (p) p.remove();
      startGame();
    });
  }

  window.start_targetpop = start_targetpop;
  window.stop_targetpop  = stop_targetpop;
})();
