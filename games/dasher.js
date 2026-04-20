/* ══════════════════════════════════════════════════════
   ARCADE10 — Dash Racer
   Top-down keyboard/touch racer · 3 laps
══════════════════════════════════════════════════════ */
(function(){

  let container, canvas, ctx, animFrame;
  let car, obstacles, coins, particles, score, lap, bestLap, lapTime, totalTime, speed, gameActive, gameOver, keys, spawnTimer;

  const ROAD_W_RATIO = 0.55; // road takes 55% of canvas width
  const CAR_W = 22, CAR_H = 36;
  const BASE_SPEED = 3.5;
  const MAX_SPEED = 9;
  const LAPS_TO_WIN = 3;

  function start_dasher(cont) {
    container = cont;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;height:100%;background:#0a0a0f;overflow:hidden;">
        <canvas id="dr-canvas" style="flex:1;min-height:0;max-width:100%;display:block;"></canvas>
        <div style="display:flex;gap:8px;padding:8px 10px;background:#0d0d18;border-top:1px solid #1a1a2e;width:100%;box-sizing:border-box;justify-content:center;flex-shrink:0;">
          <button id="dr-left"  style="width:64px;height:52px;background:#1a1a2e;border:2px solid #2a2a4a;border-radius:10px;color:#fff;font-size:22px;cursor:pointer;-webkit-tap-highlight-color:transparent;">◄</button>
          <button id="dr-accel" style="width:80px;height:52px;background:#1a2a0a;border:2px solid #3a6a0a;border-radius:10px;color:#4ade80;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;-webkit-tap-highlight-color:transparent;">▲ GAS</button>
          <button id="dr-brake" style="width:64px;height:52px;background:#2a0a0a;border:2px solid #6a2a0a;border-radius:10px;color:#f97316;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;-webkit-tap-highlight-color:transparent;">▼ BRK</button>
          <button id="dr-right" style="width:64px;height:52px;background:#1a1a2e;border:2px solid #2a2a4a;border-radius:10px;color:#fff;font-size:22px;cursor:pointer;-webkit-tap-highlight-color:transparent;">►</button>
        </div>
        <button id="dr-start-btn" style="display:none;background:#4ade80;border:none;color:#0a0a0f;padding:10px 28px;border-radius:8px;font:700 15px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;margin:6px;">▶ START</button>
      </div>`;
    canvas = container.querySelector('#dr-canvas');
    ctx = canvas.getContext('2d');
    keys = {};

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const btns = {
      'dr-left':  'ArrowLeft', 'dr-right': 'ArrowRight',
      'dr-accel': 'ArrowUp',   'dr-brake':  'ArrowDown',
    };
    Object.entries(btns).forEach(([id, key]) => {
      const el = container.querySelector(`#${id}`);
      el.addEventListener('pointerdown', e => { e.preventDefault(); keys[key]=true; el.style.opacity='0.6'; });
      el.addEventListener('pointerup',   () => { keys[key]=false; el.style.opacity='1'; });
      el.addEventListener('pointerleave',() => { keys[key]=false; el.style.opacity='1'; });
    });

    container.querySelector('#dr-start-btn').addEventListener('click', () => {
      container.querySelector('#dr-start-btn').style.display = 'none';
      startGame();
    });

    injectStyles();
    resize();
    showStart();
  }

  function stop_dasher() {
    cancelAnimationFrame(animFrame); animFrame = null;
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    container = null;
  }

  function resize() {
    const w = canvas.offsetWidth || container.clientWidth || 360;
    const h = canvas.offsetHeight || 480;
    canvas.width = w;
    canvas.height = h;
  }

  function injectStyles() {
    if (!document.querySelector('#dr-styles')) {
      const s = document.createElement('style'); s.id = 'dr-styles';
      s.textContent = `@keyframes dr-flash{0%,100%{opacity:1}50%{opacity:0}}`;
      document.head.appendChild(s);
    }
  }

  // ── Road geometry helpers ──────────────────────────────
  function getRoad() {
    const W = canvas.width, H = canvas.height;
    const rw = W * ROAD_W_RATIO;
    const rx = (W - rw) / 2;
    return { rx, rw, W, H };
  }

  function showStart() {
    gameActive = false; gameOver = false;
    resize();
    const { W, H } = getRoad();
    drawRoadBg();
    ctx.fillStyle = '#000000aa'; ctx.fillRect(0,0,W,H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd60a'; ctx.shadowBlur=12; ctx.shadowColor='#ffd60a';
    ctx.font = `bold ${W*0.1}px 'Bebas Neue',sans-serif`;
    ctx.fillText('DASH', W/2, H*0.28);
    ctx.fillText('RACER', W/2, H*0.28 + W*0.115);
    ctx.shadowBlur = 0;
    ctx.fillStyle='#ffffff66'; ctx.font=`${W*0.036}px 'DM Sans',sans-serif`;
    ctx.fillText('🏎️ Top-down racer · 3 laps', W/2, H*0.5);
    ctx.fillStyle='#ffffff44'; ctx.font=`${W*0.03}px 'DM Sans',sans-serif`;
    ctx.fillText('◄ ► Steer  ▲ Gas  ▼ Brake', W/2, H*0.58);
    ctx.fillText('Dodge obstacles · Collect coins', W/2, H*0.64);
    ctx.fillStyle='#ffd60a99'; ctx.font=`${W*0.028}px 'DM Mono',monospace`;
    const pb = Store.get('arcade_racer_pb');
    ctx.fillText(`BEST LAP: ${pb ? fmtTime(pb) : '—'}`, W/2, H*0.72);
    ctx.fillStyle='#4ade8088'; ctx.font=`${W*0.032}px 'DM Sans',sans-serif`;
    ctx.fillText('Tap START or press SPACE', W/2, H*0.8);
    const btn = container && container.querySelector('#dr-start-btn');
    if (btn) btn.style.display = 'inline-block';
  }

  function startGame() {
    cancelAnimationFrame(animFrame); animFrame = null;
    resize();
    const { W, H, rx, rw } = getRoad();
    car = {
      x: rx + rw/2,
      y: H * 0.75,
      vx: 0,
      vy: 0,
      angle: 0, // radians, 0 = up
      w: CAR_W, h: CAR_H,
      color: '#f72585',
    };
    obstacles = []; coins = []; particles = [];
    score = 0; lap = 0; lapTime = 0; totalTime = 0; speed = BASE_SPEED;
    gameActive = true; gameOver = false; spawnTimer = 0;
    bestLap = Store.get('arcade_racer_pb') || null;
    window.setShellScore(0);

    // Lap line position (near top of screen)
    car.lapY = H * 0.12;
    car.lastLapSide = car.y > car.lapY ? 'below' : 'above';
    car.lapCross = false;

    // Spawn initial obstacles and coins
    for (let i = 0; i < 4; i++) spawnObstacle(true);
    for (let i = 0; i < 5; i++) spawnCoin(true);

    animFrame = requestAnimationFrame(loop);
  }

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000), mms = Math.floor((ms % 1000)/10);
    return `${s}.${mms.toString().padStart(2,'0')}s`;
  }

  function spawnObstacle(initial = false) {
    const { rx, rw, H } = getRoad();
    const sz = 18 + Math.random() * 22;
    const x = rx + sz/2 + Math.random() * (rw - sz);
    const y = initial ? (Math.random() * H * 0.6 + H * 0.05) : (-sz - Math.random() * 120);
    const type = Math.random() < 0.4 ? 'cone' : 'car';
    const col = type === 'cone' ? '#f97316' : `hsl(${Math.random()*360},70%,55%)`;
    obstacles.push({ x, y, w: sz, h: sz, type, color: col, speed: 0.4 + Math.random() * 0.6 });
  }

  function spawnCoin(initial = false) {
    const { rx, rw, H } = getRoad();
    const x = rx + 12 + Math.random() * (rw - 24);
    const y = initial ? (Math.random() * H * 0.7 + H * 0.05) : (-20 - Math.random() * 80);
    coins.push({ x, y, r: 8, collected: false });
  }

  // ── Game loop ──────────────────────────────────────────
  function loop(ts) {
    if (!container || !gameActive) return;
    update();
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    const { rx, rw, W, H } = getRoad();
    const dt = 1; // per-frame delta

    // Speed control
    if (keys['ArrowUp']) speed = Math.min(MAX_SPEED, speed + 0.12);
    else speed = Math.max(BASE_SPEED * 0.5, speed - 0.06);
    if (keys['ArrowDown']) speed = Math.max(0.5, speed - 0.3);

    // Steering
    const steerSpeed = 0.045 + speed * 0.006;
    if (keys['ArrowLeft'])  car.angle -= steerSpeed;
    if (keys['ArrowRight']) car.angle += steerSpeed;

    // Move car
    car.x += Math.sin(car.angle) * speed;
    car.y -= Math.cos(car.angle) * speed;

    // Wall clamp (road boundaries)
    const hw = car.w / 2;
    if (car.x < rx + hw) { car.x = rx + hw; car.angle *= 0.6; }
    if (car.x > rx + rw - hw) { car.x = rx + rw - hw; car.angle *= 0.6; }
    // Wrap vertically
    if (car.y < -car.h) car.y = H + car.h;
    if (car.y > H + car.h) car.y = -car.h;

    // Lap detection — crossing the lap line (moving upward = y decreasing)
    const prevSide = car.lastLapSide;
    const curSide = car.y < car.lapY ? 'above' : 'below';
    if (prevSide === 'below' && curSide === 'above') {
      // crossed lap line going upward
      lap++;
      const lapMs = lapTime;
      if (!bestLap || lapMs < bestLap) {
        bestLap = lapMs;
        Store.set('arcade_racer_pb', bestLap);
      }
      lapTime = 0;
      score += 500;
      window.setShellScore(score);
      spawnParticles(car.x, car.lapY, '#ffd60a', 20);
      if (lap >= LAPS_TO_WIN) { endGame(true); return; }
    }
    car.lastLapSide = curSide;
    lapTime += 16; totalTime += 16;

    // Move obstacles down (parallax — they scroll toward player)
    spawnTimer++;
    if (spawnTimer > Math.max(40, 90 - speed * 5)) {
      spawnObstacle(); spawnTimer = 0;
      if (Math.random() < 0.4) spawnCoin();
    }

    obstacles.forEach(o => { o.y += speed * 0.9 + o.speed; });
    coins.forEach(c => { c.y += speed * 0.85; });
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.vx *= 0.92; p.vy *= 0.92; });

    // Remove off-screen
    obstacles = obstacles.filter(o => o.y < H + 60);
    coins = coins.filter(c => c.y < H + 30);
    particles = particles.filter(p => p.life > 0);

    // Collision with obstacles
    obstacles.forEach(o => {
      if (rectsOverlap(car, o)) {
        speed = Math.max(0.5, speed * 0.4);
        car.angle += (Math.random() - 0.5) * 0.8;
        spawnParticles(car.x, car.y, '#ff4444', 10);
        o.hit = true;
      }
    });
    obstacles = obstacles.filter(o => !o.hit);

    // Coin collection
    coins.forEach(c => {
      if (!c.collected && Math.hypot(car.x - c.x, car.y - c.y) < c.r + hw) {
        c.collected = true; score += 50; window.setShellScore(score);
        spawnParticles(c.x, c.y, '#ffd60a', 8);
      }
    });
    coins = coins.filter(c => !c.collected);
  }

  function rectsOverlap(a, b) {
    return Math.abs(a.x - b.x) < (a.w/2 + b.w/2) * 0.75 &&
           Math.abs(a.y - b.y) < (a.h/2 + b.h/2) * 0.75;
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
      particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 20+Math.random()*15, color });
    }
  }

  // ── Drawing ────────────────────────────────────────────
  function drawRoadBg() {
    const { rx, rw, W, H } = getRoad();
    // Sky/ground
    ctx.fillStyle = '#0d1a0d'; ctx.fillRect(0, 0, W, H);
    // Grass sides
    ctx.fillStyle = '#0a1a08'; ctx.fillRect(0, 0, rx, H);
    ctx.fillRect(rx + rw, 0, W - rx - rw, H);
    // Road
    const roadGrad = ctx.createLinearGradient(rx, 0, rx+rw, 0);
    roadGrad.addColorStop(0, '#1a1a1a');
    roadGrad.addColorStop(0.5, '#252525');
    roadGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = roadGrad; ctx.fillRect(rx, 0, rw, H);
    // Road edges
    ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx+rw, 0); ctx.lineTo(rx+rw, H); ctx.stroke();
    // Dashed center line
    ctx.strokeStyle = '#ffffff15'; ctx.lineWidth = 2;
    ctx.setLineDash([24, 18]);
    ctx.beginPath(); ctx.moveTo(rx+rw/2, 0); ctx.lineTo(rx+rw/2, H); ctx.stroke();
    ctx.setLineDash([]);
  }

  function draw() {
    if (!ctx) return;
    const { rx, rw, W, H } = getRoad();
    ctx.clearRect(0, 0, W, H);
    drawRoadBg();

    // Lap line
    const lapAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.004);
    ctx.strokeStyle = `rgba(255,214,10,${lapAlpha})`; ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(rx, car.lapY); ctx.lineTo(rx+rw, car.lapY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,214,10,${lapAlpha * 0.8})`; ctx.font = `bold 10px 'DM Mono',monospace`; ctx.textAlign = 'center';
    ctx.fillText('LAP LINE', rx + rw/2, car.lapY - 6);

    // Obstacles
    obstacles.forEach(o => {
      if (o.type === 'cone') {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y - o.h/2);
        ctx.lineTo(o.x + o.w/2, o.y + o.h/2);
        ctx.lineTo(o.x - o.w/2, o.y + o.h/2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff66';
        ctx.fillRect(o.x - o.w*0.3, o.y + o.h*0.1, o.w*0.6, o.h*0.15);
      } else {
        // Enemy car
        ctx.save(); ctx.translate(o.x, o.y);
        ctx.fillStyle = o.color;
        ctx.fillRect(-o.w/2, -o.h/2, o.w, o.h);
        ctx.fillStyle = '#00000066';
        ctx.fillRect(-o.w/2+2, -o.h/2+3, o.w-4, o.h*0.35);
        ctx.fillRect(-o.w/2+2, o.h/2-o.h*0.3, o.w-4, o.h*0.25);
        ctx.restore();
      }
    });

    // Coins
    coins.forEach(c => {
      const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r * 2);
      glow.addColorStop(0, '#ffd60aaa');
      glow.addColorStop(1, '#ffd60a00');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffd60a'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffd60a';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Particles
    particles.forEach(p => {
      ctx.fillStyle = p.color + Math.round(p.life * 10).toString(16).padStart(2,'0');
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
    });

    // Player car
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow
    ctx.fillStyle = '#00000033'; ctx.fillRect(-car.w/2+2, -car.h/2+4, car.w, car.h);
    // Body
    const cg = ctx.createLinearGradient(-car.w/2, -car.h/2, car.w/2, car.h/2);
    cg.addColorStop(0, '#ff79b0'); cg.addColorStop(1, car.color);
    ctx.fillStyle = cg;
    ctx.beginPath();
    const bw = car.w, bh = car.h;
    ctx.roundRect(-bw/2, -bh/2, bw, bh, 4);
    ctx.fill();
    // Windows
    ctx.fillStyle = '#1a1a3a88';
    ctx.fillRect(-bw/2+3, -bh/2+4, bw-6, bh*0.3);
    ctx.fillRect(-bw/2+3, bh/2-bh*0.28, bw-6, bh*0.22);
    // Wheels
    ctx.fillStyle = '#111';
    [[-bw/2-2,-bh/2+4],[bw/2-3,-bh/2+4],[-bw/2-2,bh/2-10],[bw/2-3,bh/2-10]].forEach(([wx,wy])=>{ctx.fillRect(wx,wy,5,8);});
    // Thrust glow
    if (keys['ArrowUp']) {
      ctx.fillStyle = '#f97316'; ctx.shadowBlur=10; ctx.shadowColor='#f97316';
      ctx.beginPath(); ctx.moveTo(-bw/4, bh/2); ctx.lineTo(0, bh/2+10+Math.random()*6); ctx.lineTo(bw/4, bh/2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // HUD
    ctx.textAlign = 'left';
    // Top bar
    ctx.fillStyle = '#000000aa'; ctx.fillRect(0, 0, W, 42);
    ctx.fillStyle = '#fff'; ctx.font = `bold 13px 'DM Mono',monospace`;
    ctx.fillText(`LAP ${lap}/${LAPS_TO_WIN}`, 10, 16);
    ctx.fillText(`${fmtTime(lapTime)}`, 10, 32);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd60a'; ctx.font = `bold 16px 'Bebas Neue',sans-serif`;
    ctx.fillText(`${score} PTS`, W/2, 22);
    ctx.fillStyle = '#ffffff55'; ctx.font = `10px 'DM Mono',monospace`;
    ctx.fillText(bestLap ? `BEST ${fmtTime(bestLap)}` : 'NO BEST YET', W/2, 36);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4cc9f0'; ctx.font = `bold 13px 'DM Mono',monospace`;
    ctx.fillText(`${Math.round(speed * 25)} KM/H`, W - 10, 22);
    ctx.textAlign = 'left';

    // Speed bar
    const sbW = 60, sbH = 5, sbX = W - sbW - 10, sbY = 30;
    ctx.fillStyle = '#ffffff11'; ctx.fillRect(sbX, sbY, sbW, sbH);
    const pct = (speed - 0.5) / (MAX_SPEED - 0.5);
    const col = `hsl(${120-pct*120},80%,55%)`;
    ctx.fillStyle = col; ctx.fillRect(sbX, sbY, sbW * pct, sbH);
  }

  function endGame(won) {
    gameActive = false; cancelAnimationFrame(animFrame); animFrame = null;
    if (!container) return;

    const finalScore = score;
    const { W, H } = getRoad();
    ctx.fillStyle = '#000000bb'; ctx.fillRect(0,0,W,H);
    ctx.textAlign = 'center';

    if (won) {
      ctx.fillStyle = '#ffd60a'; ctx.shadowBlur = 16; ctx.shadowColor = '#ffd60a';
      ctx.font = `bold ${W*0.09}px 'Bebas Neue',sans-serif`;
      ctx.fillText('FINISH!', W/2, H*0.35);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.font = `bold ${W*0.06}px 'Bebas Neue',sans-serif`;
      ctx.fillText(`${finalScore} PTS`, W/2, H*0.48);
      ctx.fillStyle = '#4ade80'; ctx.font = `${W*0.035}px 'DM Mono',monospace`;
      ctx.fillText(`BEST LAP: ${bestLap ? fmtTime(bestLap) : '—'}`, W/2, H*0.57);
    } else {
      ctx.fillStyle = '#f72585'; ctx.shadowBlur = 14; ctx.shadowColor = '#f72585';
      ctx.font = `bold ${W*0.09}px 'Bebas Neue',sans-serif`;
      ctx.fillText('GAME OVER', W/2, H*0.38);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.font = `${W*0.04}px 'DM Sans',sans-serif`;
      ctx.fillText(`Score: ${finalScore}  Laps: ${lap}`, W/2, H*0.5);
    }

    ctx.fillStyle = '#ffffff44'; ctx.font = `${W*0.028}px 'DM Sans',sans-serif`;
    ctx.fillText('SPACE or tap START to race again', W/2, H*0.68);

    const btn = container && container.querySelector('#dr-start-btn');
    if (btn) btn.style.display = 'inline-block';
    gameOver = true;
  }

  function onKeyDown(e) {
    if (!container) return;
    keys[e.key] = true;
    if (e.key === ' ') {
      e.preventDefault();
      if (!gameActive) { setTimeout(() => { keys[' '] = false; }, 50); startGame(); }
    }
  }
  function onKeyUp(e) { if (!container) return; keys[e.key] = false; }

  window.start_dasher = start_dasher;
  window.stop_dasher  = stop_dasher;

})();
