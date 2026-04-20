/* ARCADE10 — Neon Snake (FIXED) */
(function () {
  let container, canvas, ctx, animFrame;
  let snake, dir, nextDir, food, score, highscore, speed, gameActive, gameOver;
  const CELL = 20;
  let COLS, ROWS;

  function start_snake(cont) {
    container = cont;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#0a0a0f;gap:12px;padding:12px;box-sizing:border-box;">
        <canvas id="snake-canvas" style="border:2px solid #333;border-radius:8px;max-width:100%;max-height:100%;"></canvas>
        <div style="display:flex;gap:8px;">
          <button id="snake-up" style="width:44px;height:44px;background:#1a1a2e;border:1.5px solid #333;border-radius:8px;color:#fff;font-size:18px;cursor:pointer;">↑</button>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="snake-left" style="width:44px;height:44px;background:#1a1a2e;border:1.5px solid #333;border-radius:8px;color:#fff;font-size:18px;cursor:pointer;">←</button>
          <button id="snake-down" style="width:44px;height:44px;background:#1a1a2e;border:1.5px solid #333;border-radius:8px;color:#fff;font-size:18px;cursor:pointer;">↓</button>
          <button id="snake-right" style="width:44px;height:44px;background:#1a1a2e;border:1.5px solid #333;border-radius:8px;color:#fff;font-size:18px;cursor:pointer;">→</button>
        </div>
        <button id="snake-start" style="background:#4cc9f0;border:none;color:#0a0a0f;padding:10px 28px;border-radius:8px;font:700 15px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;display:none;">▶ START</button>
      </div>
    `;
    canvas = container.querySelector('#snake-canvas');
    ctx = canvas.getContext('2d');
    highscore = Store.get('arcade_snake_highscore', 0);
    setupSize();
    showStart();
    document.addEventListener('keydown', onKey);
    container.querySelector('#snake-up').addEventListener('click', () => tapDir(0,-1));
    container.querySelector('#snake-down').addEventListener('click', () => tapDir(0,1));
    container.querySelector('#snake-left').addEventListener('click', () => tapDir(-1,0));
    container.querySelector('#snake-right').addEventListener('click', () => tapDir(1,0));
    container.querySelector('#snake-start').addEventListener('click', () => {
      container.querySelector('#snake-start').style.display = 'none';
      startGame();
    });
  }

  function stop_snake() {
    cancelAnimationFrame(animFrame);
    animFrame = null;
    document.removeEventListener('keydown', onKey);
    container = null;
  }

  function setupSize() {
    const size = Math.min(container.clientWidth - 24, container.clientHeight - 160, 400);
    canvas.width = Math.floor(size / CELL) * CELL;
    canvas.height = canvas.width;
    COLS = canvas.width / CELL;
    ROWS = canvas.height / CELL;
  }

  function showStart() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4cc9f0';
    ctx.font = "bold 28px 'Bebas Neue', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('NEON SNAKE', canvas.width/2, canvas.height/2 - 30);
    ctx.fillStyle = '#ffffff66';
    ctx.font = "14px 'DM Sans', sans-serif";
    ctx.fillText('Press SPACE or tap START', canvas.width/2, canvas.height/2 + 10);
    ctx.fillStyle = '#ffd60a';
    ctx.font = "13px 'DM Mono', monospace";
    ctx.fillText(`BEST: ${highscore}`, canvas.width/2, canvas.height/2 + 40);
    gameActive = false;
    gameOver = false;
    // Show start button for mobile
    const btn = container && container.querySelector('#snake-start');
    if (btn) btn.style.display = 'inline-block';
  }

  function startGame() {
    // FIX: cancel any running loop before starting new one
    cancelAnimationFrame(animFrame);
    animFrame = null;

    snake = [{x: Math.floor(COLS/2), y: Math.floor(ROWS/2)}];
    dir = {x:1, y:0}; nextDir = {x:1, y:0};
    score = 0; gameActive = true; gameOver = false;
    speed = 150;
    placeFood();
    window.setShellScore(0);
    const startBtn = container && container.querySelector('#snake-start');
    if (startBtn) startBtn.style.display = 'none';
    lastTime = 0;
    animFrame = requestAnimationFrame(loop);
  }

  function placeFood() {
    let pos;
    do { pos = {x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS)}; }
    while (snake.some(s => s.x===pos.x && s.y===pos.y));
    food = pos;
  }

  let lastTime = 0;
  function loop(ts = 0) {
    if (!container || !gameActive) return;
    if (ts - lastTime >= speed) {
      lastTime = ts;
      update();
      draw();
    }
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    dir = {...nextDir};
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snake.some(s=>s.x===head.x&&s.y===head.y)) {
      endGame(); return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      window.setShellScore(score);
      speed = Math.max(60, speed - 3);
      placeFood();
    } else { snake.pop(); }
  }

  function draw() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = '#ffffff06';
    for (let x=0;x<COLS;x++) { ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,canvas.height);ctx.stroke(); }
    for (let y=0;y<ROWS;y++) { ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(canvas.width,y*CELL);ctx.stroke(); }
    snake.forEach((seg, i) => {
      const hue = (i / snake.length) * 60 + 160;
      ctx.fillStyle = i===0 ? '#4cc9f0' : `hsl(${hue},80%,55%)`;
      ctx.shadowBlur = i===0 ? 12 : 4;
      ctx.shadowColor = i===0 ? '#4cc9f0' : `hsl(${hue},80%,55%)`;
      ctx.fillRect(seg.x*CELL+1, seg.y*CELL+1, CELL-2, CELL-2);
    });
    ctx.shadowBlur = 16; ctx.shadowColor = '#f72585';
    ctx.fillStyle = '#f72585';
    ctx.beginPath();
    ctx.arc(food.x*CELL+CELL/2, food.y*CELL+CELL/2, CELL/2-2, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Score overlay
    ctx.fillStyle = '#ffffff88';
    ctx.font = "12px 'DM Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`${score}`, 6, 16);
  }

  function endGame() {
    gameActive = false;
    cancelAnimationFrame(animFrame);
    animFrame = null;
    if (score > highscore) { highscore = score; Store.set('arcade_snake_highscore', highscore); }
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#f72585';
    ctx.font = "bold 32px 'Bebas Neue', sans-serif";
    ctx.textAlign='center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2-20);
    ctx.fillStyle='#fff';
    ctx.font="16px 'DM Sans', sans-serif";
    ctx.fillText(`Score: ${score}  Best: ${highscore}`, canvas.width/2, canvas.height/2+14);
    ctx.fillStyle='#ffffff55';
    ctx.font="13px 'DM Sans', sans-serif";
    ctx.fillText('SPACE or tap START to restart', canvas.width/2, canvas.height/2+42);
    gameOver = true;
    // Show start button again for mobile
    const btn = container && container.querySelector('#snake-start');
    if (btn) btn.style.display = 'inline-block';
  }

  function tapDir(x, y) {
    // FIX: if not active, start the game first
    if (!gameActive) {
      const btn = container && container.querySelector('#snake-start');
      if (btn) btn.style.display = 'none';
      startGame();
      nextDir = {x, y};
      return;
    }
    setDir(x, y);
  }

  function setDir(x, y) {
    if (dir.x === -x && dir.y === -y) return;
    nextDir = {x, y};
  }

  function onKey(e) {
    if (!container) return;
    if ((e.code==='Space'||e.key===' ') && !gameActive) { e.preventDefault(); startGame(); return; }
    const map = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],
                 KeyW:[0,-1],KeyS:[0,1],KeyA:[-1,0],KeyD:[1,0]};
    const d = map[e.code];
    if (d) { e.preventDefault(); if (gameActive) setDir(d[0],d[1]); }
  }

  window.start_snake = start_snake;
  window.stop_snake  = stop_snake;
})();
