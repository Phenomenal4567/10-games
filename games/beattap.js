/* ══════════════════════════════════════════════════════
   ARCADE10 — Beat Tap (Game 09)
   4-lane rhythm tap game · Canvas + Web Audio API
   Keys: D F J K  |  Mobile: tap lanes
══════════════════════════════════════════════════════ */

(function () {

  // ── Beatmap data (3 tracks, timestamped note arrays) ──
  const TRACKS = [
    {
      id: 'synthwave',
      name: 'Synthwave Drive',
      bpm: 120,
      duration: 60,   // seconds
      // Notes: [timeMs, lane 0-3]
      notes: generateBeatmap(120, 60, 'medium'),
    },
    {
      id: 'chiptune',
      name: 'Chiptune Blitz',
      bpm: 160,
      duration: 55,
      notes: generateBeatmap(160, 55, 'hard'),
    },
    {
      id: 'lofi',
      name: 'Lo-Fi Chill',
      bpm: 85,
      duration: 65,
      notes: generateBeatmap(85, 65, 'easy'),
    },
  ];

  function generateBeatmap(bpm, durationSec, density) {
    const notes = [];
    const beatMs = 60000 / bpm;
    const startMs = 2000; // 2 second lead-in
    const totalMs = durationSec * 1000;
    const densityMap = { easy: 0.45, medium: 0.7, hard: 0.92 };
    const chance = densityMap[density] || 0.6;
    const lanePatterns = {
      easy:   [[0], [2], [1], [3], [0,2], [1,3]],
      medium: [[0], [1], [2], [3], [0,2], [1,3], [0,1], [2,3]],
      hard:   [[0], [1], [2], [3], [0,2], [1,3], [0,1,3], [0,2,3], [1,2]],
    };
    const patterns = lanePatterns[density];

    // Seed random for deterministic maps
    let seed = bpm * 7 + durationSec;
    function rand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // Every half-beat, possibly place a note
    for (let t = startMs; t < totalMs - 1000; t += beatMs / 2) {
      if (rand() < chance) {
        const pat = patterns[Math.floor(rand() * patterns.length)];
        pat.forEach(lane => notes.push([Math.round(t), lane]));
      }
    }
    // Ensure a clear ending - no notes in last 1.5 seconds
    return notes.filter(([t]) => t < (totalMs - 1500));
  }

  // ── Grade thresholds ──
  const GRADES = [
    { min: 0.98, grade: 'SSS' }, { min: 0.95, grade: 'SS' },
    { min: 0.90, grade: 'S'   }, { min: 0.80, grade: 'A'  },
    { min: 0.65, grade: 'B'   }, { min: 0.50, grade: 'C'  },
    { min: 0.30, grade: 'D'   }, { min: 0,    grade: 'F'  },
  ];

  function getGrade(accuracy) {
    return GRADES.find(g => accuracy >= g.min)?.grade ?? 'F';
  }

  // ── Audio engine ──
  class BeatAudio {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this._metroTime = 0;
    }

    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    _osc(freq, type, startTime, dur, gain = 0.15) {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.type = type;
      o.frequency.setValueAtTime(freq, startTime);
      g.gain.setValueAtTime(gain, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      o.start(startTime);
      o.stop(startTime + dur + 0.01);
    }

    hit(lane) {
      if (!this.ctx || this.muted) return;
      const freqs = [261, 329, 392, 523]; // C E G C
      const t = this.ctx.currentTime;
      this._osc(freqs[lane], 'square', t, 0.08, 0.12);
    }

    perfect() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this._osc(880, 'square', t, 0.06, 0.1);
      this._osc(1108, 'square', t + 0.05, 0.06, 0.08);
    }

    miss() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this._osc(120, 'sawtooth', t, 0.15, 0.1);
    }

    beat(bpm) {
      // Play metronome click on each beat
      if (!this.ctx || this.muted) return;
      const interval = 60 / bpm;
      const t = this.ctx.currentTime;
      if (t > this._metroTime + interval - 0.01) {
        this._metroTime = t;
        this._osc(660, 'square', t, 0.02, 0.06);
      }
    }

    playCountdown(bpm, callback) {
      if (!this.ctx) { callback(); return; }
      const beat = 60 / bpm;
      const t = this.ctx.currentTime;
      [0, 1, 2, 3].forEach(i => this._osc(i === 3 ? 880 : 440, 'square', t + i * beat, 0.05, 0.1));
      setTimeout(callback, beat * 4 * 1000);
    }
  }

  // ── Main game state ──
  let container, canvas, ctx, audio;
  let state = 'select'; // select | countdown | playing | result
  let selectedTrack = null;
  let animFrame = null;
  let startTime = 0;
  let elapsed = 0;
  let notes = []; // copy of track notes with hit status
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let totalNotes = 0;
  let hitCounts = { perfect: 0, good: 0, miss: 0 };
  let keyHeld = {};
  let laneFlash = [0, 0, 0, 0];   // flash timers per lane
  let hitFeedback = []; // {lane, text, alpha, y}
  let countdownVal = 0;
  let trackDuration = 0;

  // ── Layout constants (recalculated on resize) ──
  let W, H, LANE_W, LANE_X, TARGET_Y, NOTE_H, FALL_PX_PER_MS;
  const LANES = 4;
  const LANE_KEYS = ['d', 'f', 'j', 'k'];
  const LANE_LABELS = ['D', 'F', 'J', 'K'];
  const LANE_COLORS = ['#f72585', '#7209b7', '#4cc9f0', '#4ade80'];
  const LANE_DARK   = ['#6b0f36', '#2d0560', '#0b5e78', '#1a5c30'];
  const TARGET_H = 14;
  const SCROLL_AHEAD_MS = 1600; // notes visible this many ms ahead

  function recalcLayout() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    const totalW = Math.min(W * 0.82, 360);
    LANE_W = totalW / LANES;
    const startX = (W - totalW) / 2;
    LANE_X = [0, 1, 2, 3].map(i => startX + i * LANE_W);
    TARGET_Y = H - 110;
    NOTE_H = Math.max(16, LANE_W * 0.22);
    FALL_PX_PER_MS = (TARGET_Y - 40) / SCROLL_AHEAD_MS;
  }

  // ── Entry point ────────────────────────────────────────
  function start_beattap(cont) {
    container = cont;
    audio = new BeatAudio();

    // Build HTML wrapper
    container.innerHTML = `
      <div id="bt-root" style="position:relative;width:100%;height:100%;overflow:hidden;background:#0a0a0f;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <canvas id="bt-canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
        <div id="bt-ui" style="position:relative;z-index:10;width:100%;height:100%;pointer-events:none;"></div>
      </div>
    `;

    canvas = container.querySelector('#bt-canvas');
    ctx = canvas.getContext('2d');

    const ro = new ResizeObserver(() => { recalcLayout(); draw(); });
    ro.observe(canvas);
    recalcLayout();

    showTrackSelect();
    setupInput();
  }

  function stop_beattap() {
    cancelAnimationFrame(animFrame);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  }

  // ── Track selection screen ──────────────────────────────
  function showTrackSelect() {
    state = 'select';
    const ui = container.querySelector('#bt-ui');
    ui.style.pointerEvents = 'auto';
    ui.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        height:100%;gap:16px;padding:24px;
      ">
        <div style="font:700 22px/1 'Bebas Neue',sans-serif;color:#fff;letter-spacing:3px;">SELECT TRACK</div>
        <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:360px;">
          ${TRACKS.map((t, i) => `
            <button data-ti="${i}" style="
              background:linear-gradient(135deg,#1a1a2e,#16213e);
              border:1.5px solid #333;border-radius:12px;
              padding:14px 18px;cursor:pointer;text-align:left;
              transition:border-color .2s,transform .15s;
              color:#fff;font-family:inherit;
            ">
              <div style="font:700 15px/1 'Bebas Neue',sans-serif;letter-spacing:2px;color:${LANE_COLORS[i]};">${t.name}</div>
              <div style="font:500 11px/1.4 'DM Sans',sans-serif;color:#888;margin-top:4px;">
                ${t.bpm} BPM · ${t.duration}s · ${t.notes.length} notes
              </div>
              <div style="font:400 10px/1.4 'DM Mono',monospace;color:#555;margin-top:2px;">
                BEST: ${Store.get(`arcade_beattap_grade_${t.id}`) || '—'}
              </div>
            </button>
          `).join('')}
        </div>
        <div style="font:400 11px/1.5 'DM Sans',sans-serif;color:#444;margin-top:4px;text-align:center;">
          Keys: D &nbsp;F &nbsp;J &nbsp;K &nbsp;|&nbsp; or tap lanes on mobile
        </div>
      </div>
    `;

    ui.querySelectorAll('[data-ti]').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = LANE_COLORS[btn.dataset.ti]; btn.style.transform = 'scale(1.02)'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#333'; btn.style.transform = 'scale(1)'; });
      btn.addEventListener('click', () => {
        audio.init();
        startTrack(TRACKS[+btn.dataset.ti]);
      });
    });

    draw();
  }

  // ── Start a track ───────────────────────────────────────
  function startTrack(track) {
    selectedTrack = track;
    totalNotes = track.notes.length;
    notes = track.notes.map(([t, lane]) => ({ t, lane, hit: null })); // hit: null|'perfect'|'good'|'miss'
    score = 0; combo = 0; maxCombo = 0;
    hitCounts = { perfect: 0, good: 0, miss: 0 };
    hitFeedback = [];
    laneFlash = [0, 0, 0, 0];
    trackDuration = track.duration * 1000;

    const ui = container.querySelector('#bt-ui');
    ui.style.pointerEvents = 'none';
    ui.innerHTML = '';

    state = 'countdown';
    countdownVal = 4;
    recalcLayout();

    audio.playCountdown(track.bpm, () => {
      state = 'playing';
      startTime = performance.now();
      animFrame = requestAnimationFrame(loop);
    });

    // Show countdown animation
    let cd = 4;
    const cdInt = setInterval(() => {
      countdownVal = cd--;
      if (cd < 0) clearInterval(cdInt);
    }, 60000 / track.bpm);

    draw();
  }

  // ── Game loop ───────────────────────────────────────────
  function loop(ts) {
    elapsed = ts - startTime;

    // Auto-miss notes too far past target
    const missWindow = 200;
    notes.forEach(n => {
      if (n.hit === null && n.t + missWindow < elapsed) {
        n.hit = 'miss';
        hitCounts.miss++;
        combo = 0;
        audio.miss();
        spawnFeedback(n.lane, 'MISS', '#ff4444');
      }
    });

    // Beat metronome
    if (selectedTrack) audio.beat(selectedTrack.bpm);

    // End of track
    if (elapsed > trackDuration + 1500) {
      finishGame();
      return;
    }

    draw();
    animFrame = requestAnimationFrame(loop);
  }

  // ── Drawing ─────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    if (state === 'select') {
      drawSelectBg();
      return;
    }

    drawLanes();
    drawNotes();
    drawTargetLine();
    drawKeys();
    drawHUD();
    drawFeedback();

    if (state === 'countdown') drawCountdown();
  }

  function drawSelectBg() {
    // Subtle animated gradient bg for select
    for (let i = 0; i < LANES; i++) {
      const gx = (i / LANES) * W;
      const g = ctx.createLinearGradient(gx, 0, gx + W / LANES, H);
      g.addColorStop(0, LANE_DARK[i] + '22');
      g.addColorStop(1, '#00000000');
      ctx.fillStyle = g;
      ctx.fillRect(gx, 0, W / LANES, H);
    }
  }

  function drawLanes() {
    for (let i = 0; i < LANES; i++) {
      const x = LANE_X[i];

      // Lane bg
      ctx.fillStyle = LANE_DARK[i] + '33';
      ctx.fillRect(x, 0, LANE_W, H);

      // Lane dividers
      if (i > 0) {
        ctx.strokeStyle = '#ffffff0d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // Flash when key held
      if (laneFlash[i] > 0) {
        ctx.fillStyle = LANE_COLORS[i] + Math.round(laneFlash[i] * 60).toString(16).padStart(2, '0');
        ctx.fillRect(x, 0, LANE_W, H);
        laneFlash[i] = Math.max(0, laneFlash[i] - 0.08);
      }
    }
  }

  function drawNotes() {
    if (state !== 'playing' && state !== 'countdown') return;
    const now = elapsed;

    notes.forEach(n => {
      if (n.hit !== null && n.hit !== 'pending') return;

      // Position: note arrives at TARGET_Y at time n.t
      const timeUntil = n.t - now;
      if (timeUntil > SCROLL_AHEAD_MS + 100) return; // not visible yet
      if (timeUntil < -300) return; // past miss window

      const y = TARGET_Y - timeUntil * FALL_PX_PER_MS;
      const x = LANE_X[n.lane];
      const r = 6;

      // Glow
      const glow = ctx.createRadialGradient(x + LANE_W / 2, y, 0, x + LANE_W / 2, y, LANE_W * 0.6);
      glow.addColorStop(0, LANE_COLORS[n.lane] + '88');
      glow.addColorStop(1, '#00000000');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 4, y - NOTE_H, LANE_W + 8, NOTE_H + 8);

      // Note body
      const noteX = x + 4;
      const noteW = LANE_W - 8;
      ctx.fillStyle = LANE_COLORS[n.lane];
      ctx.beginPath();
      ctx.roundRect(noteX, y - NOTE_H, noteW, NOTE_H, r);
      ctx.fill();

      // Shine
      ctx.fillStyle = '#ffffff22';
      ctx.beginPath();
      ctx.roundRect(noteX, y - NOTE_H, noteW, NOTE_H / 2, [r, r, 0, 0]);
      ctx.fill();
    });
  }

  function drawTargetLine() {
    for (let i = 0; i < LANES; i++) {
      const x = LANE_X[i];

      // Target zone (tappable area)
      ctx.fillStyle = keyHeld[LANE_KEYS[i]] ? LANE_COLORS[i] + '44' : '#ffffff0a';
      ctx.beginPath();
      ctx.roundRect(x + 4, TARGET_Y - NOTE_H * 0.5, LANE_W - 8, NOTE_H * 1.5 + TARGET_H, 6);
      ctx.fill();

      // Target line
      ctx.fillStyle = keyHeld[LANE_KEYS[i]] ? LANE_COLORS[i] : '#ffffff33';
      ctx.fillRect(x, TARGET_Y, LANE_W, TARGET_H);

      // Glow on target line
      if (keyHeld[LANE_KEYS[i]]) {
        const grd = ctx.createLinearGradient(x, 0, x + LANE_W, 0);
        grd.addColorStop(0, '#00000000');
        grd.addColorStop(0.5, LANE_COLORS[i] + '66');
        grd.addColorStop(1, '#00000000');
        ctx.fillStyle = grd;
        ctx.fillRect(x, TARGET_Y - 20, LANE_W, TARGET_H + 40);
      }
    }
  }

  function drawKeys() {
    for (let i = 0; i < LANES; i++) {
      const x = LANE_X[i] + LANE_W / 2;
      const y = TARGET_Y + TARGET_H + 26;
      const pressed = keyHeld[LANE_KEYS[i]];

      ctx.font = `700 ${Math.round(LANE_W * 0.28)}px 'DM Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = pressed ? LANE_COLORS[i] : '#ffffff44';
      ctx.fillText(LANE_LABELS[i], x, y);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  function drawHUD() {
    // Progress bar
    const progress = Math.min(1, elapsed / trackDuration);
    ctx.fillStyle = '#ffffff0d';
    ctx.fillRect(LANE_X[0], 8, LANE_W * LANES, 4);
    const pGrd = ctx.createLinearGradient(LANE_X[0], 0, LANE_X[0] + LANE_W * LANES, 0);
    pGrd.addColorStop(0, '#f72585'); pGrd.addColorStop(1, '#4cc9f0');
    ctx.fillStyle = pGrd;
    ctx.fillRect(LANE_X[0], 8, LANE_W * LANES * progress, 4);

    // Combo
    if (combo > 1) {
      const cx = W / 2;
      const fontSize = Math.min(28 + combo * 0.3, 50);
      ctx.font = `700 ${Math.round(fontSize)}px 'Bebas Neue', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = combo >= 20 ? '#f72585' : combo >= 10 ? '#ffd60a' : '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.fillText(`${combo}×`, cx, TARGET_Y - NOTE_H * 3 - 10);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    // Score top-left (relative to lanes)
    ctx.font = `500 11px 'DM Mono', monospace`;
    ctx.fillStyle = '#ffffff55';
    ctx.fillText('SCORE', LANE_X[0], 34);
    ctx.font = `700 18px 'Bebas Neue', sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(score, LANE_X[0], 52);

    // Accuracy top-right
    const done = hitCounts.perfect + hitCounts.good + hitCounts.miss;
    const acc = done > 0 ? (hitCounts.perfect + hitCounts.good * 0.5) / done : 1;
    const accStr = (acc * 100).toFixed(1) + '%';
    ctx.textAlign = 'right';
    ctx.font = `500 11px 'DM Mono', monospace`;
    ctx.fillStyle = '#ffffff55';
    ctx.fillText('ACC', LANE_X[3] + LANE_W, 34);
    ctx.font = `700 18px 'Bebas Neue', sans-serif`;
    ctx.fillStyle = acc > 0.9 ? '#4ade80' : acc > 0.7 ? '#ffd60a' : '#ff4444';
    ctx.fillText(accStr, LANE_X[3] + LANE_W, 52);
    ctx.textAlign = 'left';
  }

  function drawFeedback() {
    hitFeedback = hitFeedback.filter(f => f.alpha > 0);
    hitFeedback.forEach(f => {
      const x = LANE_X[f.lane] + LANE_W / 2;
      ctx.font = `700 14px 'Bebas Neue', sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, f.y);
      f.y -= 1.2;
      f.alpha -= 0.025;
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawCountdown() {
    const cx = W / 2, cy = H / 2;
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `700 80px 'Bebas Neue', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(countdownVal > 0 ? countdownVal : 'GO!', cx, cy);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ── Input ────────────────────────────────────────────────
  function setupInput() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Touch lanes
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (!LANE_KEYS.includes(k)) return;
    if (keyHeld[k]) return;
    keyHeld[k] = true;
    const lane = LANE_KEYS.indexOf(k);
    laneFlash[lane] = 1;
    if (state === 'playing') hitLane(lane);
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    keyHeld[k] = false;
  }

  function getTouchLane(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (W / rect.width);
    for (let i = 0; i < LANES; i++) {
      if (x >= LANE_X[i] && x < LANE_X[i] + LANE_W) return i;
    }
    return -1;
  }

  const activeTouches = {};
  function onTouch(e) {
    e.preventDefault();
    [...e.changedTouches].forEach(t => {
      const lane = getTouchLane(t.clientX);
      if (lane < 0) return;
      activeTouches[t.identifier] = lane;
      keyHeld[LANE_KEYS[lane]] = true;
      laneFlash[lane] = 1;
      if (state === 'playing') hitLane(lane);
    });
  }
  function onTouchEnd(e) {
    e.preventDefault();
    [...e.changedTouches].forEach(t => {
      const lane = activeTouches[t.identifier];
      if (lane !== undefined) {
        keyHeld[LANE_KEYS[lane]] = false;
        delete activeTouches[t.identifier];
      }
    });
  }
  function onMouseDown(e) {
    const lane = getTouchLane(e.clientX);
    if (lane < 0) return;
    keyHeld[LANE_KEYS[lane]] = true;
    laneFlash[lane] = 1;
    if (state === 'playing') hitLane(lane);
  }
  function onMouseUp(e) {
    const lane = getTouchLane(e.clientX);
    if (lane >= 0) keyHeld[LANE_KEYS[lane]] = false;
  }

  // ── Hit detection ────────────────────────────────────────
  const PERFECT_WINDOW = 60;  // ms either side
  const GOOD_WINDOW    = 130;

  function hitLane(lane) {
    audio.hit(lane);
    const now = elapsed;

    // Find closest unhit note in this lane within window
    let best = null, bestDelta = Infinity;
    notes.forEach(n => {
      if (n.hit !== null) return;
      if (n.lane !== lane) return;
      const delta = Math.abs(n.t - now);
      if (delta < GOOD_WINDOW && delta < bestDelta) {
        best = n; bestDelta = delta;
      }
    });

    if (!best) return; // empty hit

    if (bestDelta <= PERFECT_WINDOW) {
      best.hit = 'perfect';
      hitCounts.perfect++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      const pts = 100 + Math.min(combo * 5, 200);
      score += pts;
      audio.perfect();
      spawnFeedback(lane, 'PERFECT', '#4cc9f0');
    } else {
      best.hit = 'good';
      hitCounts.good++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      score += 50 + Math.min(combo * 2, 100);
      spawnFeedback(lane, 'GOOD', '#4ade80');
    }

    window.setShellScore(score);
  }

  function spawnFeedback(lane, text, color) {
    hitFeedback.push({
      lane,
      text,
      color,
      alpha: 1,
      y: TARGET_Y - NOTE_H * 2,
    });
  }

  // ── Result screen ────────────────────────────────────────
  function finishGame() {
    cancelAnimationFrame(animFrame);
    state = 'result';

    const total = hitCounts.perfect + hitCounts.good + hitCounts.miss;
    const acc = total > 0 ? (hitCounts.perfect + hitCounts.good * 0.5) / total : 0;
    const grade = getGrade(acc);

    // Save best grade
    const key = `arcade_beattap_grade_${selectedTrack.id}`;
    const gradeOrder = ['F','D','C','B','A','S','SS','SSS'];
    const prev = Store.get(key, 'F');
    if (gradeOrder.indexOf(grade) > gradeOrder.indexOf(prev)) {
      Store.set(key, grade);
    }
    const hsKey = 'arcade_beattap_best';
    if (score > (Store.get(hsKey) || 0)) Store.set(hsKey, score);
    window.setShellScore(score);

    // Draw final canvas state
    draw();

    const ui = container.querySelector('#bt-ui');
    ui.style.pointerEvents = 'auto';

    const gradeColors = { SSS:'#f72585',SS:'#ff9f1c',S:'#ffd60a',A:'#4ade80',B:'#4cc9f0',C:'#a0c4ff',D:'#aaa',F:'#ff4444' };

    ui.innerHTML = `
      <div style="
        position:absolute;inset:0;background:#000000cc;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:12px;padding:24px;
      ">
        <div style="font:700 13px/1 'DM Mono',monospace;letter-spacing:3px;color:#ffffff66;">RESULTS</div>
        <div style="font:700 28px/1 'Bebas Neue',sans-serif;color:#fff;letter-spacing:2px;">${selectedTrack.name}</div>
        <div style="font:700 72px/1 'Bebas Neue',sans-serif;color:${gradeColors[grade] || '#fff'};filter:drop-shadow(0 0 16px ${gradeColors[grade] || '#fff'}88);">${grade}</div>
        <div style="font:700 24px/1 'Bebas Neue',sans-serif;color:#fff;letter-spacing:1px;">${score.toLocaleString()}</div>
        <div style="font:400 13px/1.6 'DM Mono',monospace;color:#aaa;text-align:center;">
          ACCURACY ${(acc * 100).toFixed(1)}%<br>
          PERFECT ${hitCounts.perfect} &nbsp;·&nbsp; GOOD ${hitCounts.good} &nbsp;·&nbsp; MISS ${hitCounts.miss}<br>
          MAX COMBO ${maxCombo}×
        </div>
        <div style="display:flex;gap:10px;margin-top:8px;">
          <button id="bt-retry" style="
            background:${gradeColors[grade]}22;border:1.5px solid ${gradeColors[grade]};
            color:${gradeColors[grade]};padding:10px 24px;border-radius:8px;
            font:700 14px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;
          ">RETRY</button>
          <button id="bt-back" style="
            background:#ffffff0d;border:1.5px solid #ffffff22;
            color:#ffffff99;padding:10px 24px;border-radius:8px;
            font:700 14px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;
          ">TRACK SELECT</button>
        </div>
      </div>
    `;

    ui.querySelector('#bt-retry').addEventListener('click', () => {
      ui.innerHTML = '';
      ui.style.pointerEvents = 'none';
      startTrack(selectedTrack);
    });
    ui.querySelector('#bt-back').addEventListener('click', () => {
      ui.innerHTML = '';
      showTrackSelect();
    });
  }

  // ── Expose to global router ──────────────────────────────
  window.start_beattap = start_beattap;
  window.stop_beattap  = stop_beattap;

})();
