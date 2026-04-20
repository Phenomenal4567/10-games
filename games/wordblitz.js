/* ══════════════════════════════════════════════════════
   ARCADE10 — Word Blitz (FIXED)
   Guess the 5-letter word in 6 tries · 90 second timer
══════════════════════════════════════════════════════ */

(function () {

  const WORDS = `ABOUT ABOVE ABUSE ACTOR ACUTE ADMIT ADOPT ADULT AFTER AGAIN AGENT AGREE AHEAD ALARM ALBUM ALERT ALIKE ALIGN ALIVE ALLEY ALLOW ALONE ALONG ALTER ANGEL ANGLE ANGRY ANKLE ANNEX APART APPLE APPLY ARENA ARGUE ARISE ARMOR ARRAY ARROW ASIDE ASSET ATLAS ATTIC AUDIT AVAIL AVOID AWFUL BAGEL BASIC BASIS BATCH BEACH BEARD BEAST BEGAN BEGIN BEING BELOW BENCH BERRY BIRTH BLACK BLADE BLAME BLAND BLANK BLAST BLAZE BLEED BLEND BLESS BLIND BLOCK BLOOD BLOOM BLOWN BLUES BLUNT BOARD BONUS BOOST BOOTH BORED BOUND BRAIN BRAND BRAVE BREAD BREAK BREED BRIBE BRICK BRIDE BRIEF BRING BROKE BROOK BROWN BRUSH BUILT BULGE BUNCH BURNT BURST CACHE CANDY CARGO CARRY CAUSE CEASE CHAIN CHAIR CHALK CHAOS CHARM CHART CHASE CHEAP CHEAT CHECK CHEEK CHESS CHEST CHOKE CHORD CIVIL CLAIM CLAMP CLASH CLEAN CLEAR CLERK CLICK CLIFF CLING CLOAK CLONE CLOUD COACH COAST COBRA COMET COMIC CORAL COULD COUCH COUNT COURT COVER COVET CRACK CRAFT CRAMP CRANE CRASH CRAWL CRAZE CRISP CROSS CROWD CRUEL CRUSH CUBIC CURRY CURSE CURVE CYCLE DAILY DANCE DATUM DEATH DEBUT DELAY DENSE DEPTH DERBY DEVIL DIGIT DINER DISCO DIZZY DODGE DRAMA DRANK DRAWN DREAD DREAM DRESS DRIED DRIFT DRILL DRINK DRIVE DRONE DROVE DYING EAGER EAGLE EARLY EARTH EIGHT ELITE EMBER EMPTY ENDED ENEMY ENJOY ENTER ENTRY EQUAL ETHIC EVADE EVENT EVERY EVICT EXACT EXERT EXILE EXIST EXTRA FABLE FACED FAINT FAITH FALLS FALSE FANCY FATAL FAULT FEAST FETCH FEVER FIELD FIFTH FIFTY FIGHT FINAL FIRST FIXED FLAME FLARE FLASH FLASK FLESH FLICK FLOCK FLOOD FLOOR FLOUR FLUTE FOCUS FOGGY FORCE FORGE FORTH FOUND FRAME FRANK FRAUD FRESH FROZE FULLY FUNNY GAUGE GHOST GIANT GIVEN GLAND GLARE GLAZE GLEAM GLIDE GLOOM GLORY GLOVE GOING GRACE GRADE GRAFT GRAIN GRAND GRANT GRAPH GRASP GRAVE GRAZE GREED GREET GRIEF GRIND GROAN GROIN GROOM GROPE GROSS GROUT GROVE GROWN GUARD GUESS GUIDE GUILD GUILE GUISE GUSTO HABIT HAPPY HARSH HASTE HAVEN HEART HEAVY HEDGE HEIST HELLO HINGE HONOR HOTEL HOUND HOUSE HOVER HUMID HUMOR HURRY IDEAL IDIOT IMAGE INDEX INFER INNER INPUT INTER IRATE IVORY JEWEL JOINT JOKER JOUST JUDGE JUICE JUICY JUMBO KAYAK KEBAB KNEEL KNIFE KNOCK KNOWN LABEL LANCE LARGE LASER LATER LAUGH LAYER LEARN LEAVE LEGAL LEMON LEVEL LIGHT LIMIT LINED LIVER LOFTY LOGIC LOOSE LOVER LOWER LUCKY MAGIC MAJOR MAKER MANOR MAPLE MARCH MARSH MATCH MAYOR MEDAL MEDIA MERCY MERIT MESSY METAL MIDST MIGHT MINOR MINUS MIRTH MIXED MOIST MONEY MONTH MORAL MOSSY MOTEL MOTTO MOUNT MOURN MOVED MOVIE MUDDY MUTED NAIVE NASTY NAVAL NERVE NEVER NEWLY NINTH NOBLE NOISE NORTH NOTED NOVEL NURSE OFFER OFTEN OLIVE ONSET ORDER OUGHT OUTER OUTDO OXIDE OZONE PAINT PANIC PAPER PARTY PASTA PATCH PAUSE PAVED PEACE PENAL PENNY PERCH PERIL PHASE PHONE PHOTO PIANO PIECE PILOT PIXEL PIZZA PLACE PLAIN PLANK PLANT PLAZA PLEAD PLUCK PLUMB PLUME POINT POLAR POSED PRANK PRESS PRICE PRICK PRIDE PRISM PRIZE PROBE PROOF PROSE PROUD PROVE PROWL PRUNE PULSE PUNCH PUPIL PURGE PURSE QUEEN QUERY QUEST QUICK QUIET QUIRK QUOTA QUOTE RADAR RALLY RAMEN RANCH RANGE RAPID RATIO REACH READY REALM REBEL REFER REIGN RELAX REPAY REPEL REPLY RIDER RIGID RISKY RIVAL RIVER RIVET ROBOT ROCKY ROUGE ROUGH ROUND ROUTE ROYAL RULED RULER RUMOR RURAL RUSTY SADLY SAINT SALAD SAUCE SAVED SAVVY SCARY SCENE SCOPE SCORE SCOUT SCREW SEDAN SEIZE SERUM SEVEN SEVER SEWER SHADE SHAFT SHAKY SHAME SHAPE SHARE SHARK SHARP SHEER SHELF SHELL SHIFT SHINE SHIRT SHOCK SHOUT SHOVE SHOWN SHRUB SHRUG SIEGE SIGHT SILLY SINCE SIXTH SIXTY SIZED SKILL SKULL SLAIN SLANG SLANT SLASH SLAVE SLEEK SLEET SWEPT SWIFT SWIRL SWOOP YACHT YEARN YEAST YOUNG YOUTH ZEBRA ZESTY`;

  const WORD_LIST = [...new Set(WORDS.split(' ').filter(w => w.length === 5))];

  const KB_ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫'],
  ];

  let container, root;
  let targetWord = '';
  let guesses = [];
  let currentInput = '';
  let gameOver = false;
  let timerInterval = null;
  let timeLeft = 90;
  let score = 0;
  let streak = 0;
  let letterStates = {};

  function start_wordblitz(cont) {
    container = cont;
    streak = Store.get('arcade_wordblitz_streak', 0);
    buildUI();
    newGame();
    // FIX: bind with named ref so it can be properly removed
    document.addEventListener('keydown', onKey);
  }

  function stop_wordblitz() {
    clearInterval(timerInterval);
    document.removeEventListener('keydown', onKey);
    container = null;
  }

  function buildUI() {
    container.innerHTML = `
      <div id="wb-root" style="
        display:flex;flex-direction:column;align-items:center;
        width:100%;height:100%;overflow:hidden;
        background:#0a0a0f;padding:10px 8px 4px;box-sizing:border-box;
        gap:8px;
      ">
        <div id="wb-topbar" style="
          display:flex;align-items:center;justify-content:space-between;
          width:100%;max-width:380px;
        ">
          <div style="text-align:center;">
            <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff44;letter-spacing:1px;">STREAK</div>
            <div id="wb-streak" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#ffd60a;">0</div>
          </div>
          <div style="text-align:center;">
            <div id="wb-message" style="font:700 13px/1 'Bebas Neue',sans-serif;color:#ffffff88;letter-spacing:2px;min-height:14px;"></div>
          </div>
          <div style="text-align:center;">
            <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff44;letter-spacing:1px;">TIME</div>
            <div id="wb-timer" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#4cc9f0;">1:30</div>
          </div>
        </div>
        <div id="wb-grid" style="
          display:grid;grid-template-rows:repeat(6,1fr);gap:5px;
          flex:1;min-height:0;width:100%;max-width:320px;padding:0 4px;
        "></div>
        <div id="wb-keyboard" style="
          width:100%;max-width:420px;
          display:flex;flex-direction:column;gap:5px;padding-bottom:4px;
        "></div>
      </div>
    `;
    root = container.querySelector('#wb-root');
    buildGrid();
    buildKeyboard();
  }

  function buildGrid() {
    const grid = container.querySelector('#wb-grid');
    grid.innerHTML = '';
    for (let r = 0; r < 6; r++) {
      const row = document.createElement('div');
      row.id = `wb-row-${r}`;
      row.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:5px;';
      for (let c = 0; c < 5; c++) {
        const tile = document.createElement('div');
        tile.id = `wb-tile-${r}-${c}`;
        tile.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          background:#1a1a2e;border:2px solid #333;border-radius:6px;
          font:700 clamp(16px,4vw,24px)/1 'Bebas Neue',sans-serif;
          color:#fff;aspect-ratio:1;user-select:none;
        `;
        row.appendChild(tile);
      }
      grid.appendChild(row);
    }
  }

  function buildKeyboard() {
    const kb = container.querySelector('#wb-keyboard');
    kb.innerHTML = '';
    KB_ROWS.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.style.cssText = 'display:flex;gap:4px;justify-content:center;';
      row.forEach(key => {
        const btn = document.createElement('button');
        btn.id = `wb-key-${key}`;
        btn.textContent = key;
        const wide = key === 'ENTER' || key === '⌫';
        btn.style.cssText = `
          flex:${wide ? 1.6 : 1};min-width:0;padding:12px 4px;
          background:#2a2a3e;border:none;border-radius:5px;
          font:600 clamp(9px,2.2vw,13px)/1 'DM Sans',sans-serif;
          color:#fff;cursor:pointer;transition:background .1s;
        `;
        btn.addEventListener('click', () => handleKeyPress(key));
        rowEl.appendChild(btn);
      });
      kb.appendChild(rowEl);
    });
  }

  function newGame() {
    targetWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    guesses = [];
    currentInput = '';
    gameOver = false;
    letterStates = {};
    timeLeft = 90;
    score = 0;
    window.setShellScore(0);

    clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);

    // FIX: rebuild grid & keyboard fresh each game
    buildGrid();
    buildKeyboard();
    setMessage('');
    updateStreakDisplay();
    updateTimerDisplay();
    updateCurrentRow();
  }

  function tick() {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 10) {
      const el = container && container.querySelector('#wb-timer');
      if (el) el.style.color = '#ff4444';
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!gameOver) endGame(false, "TIME'S UP!");
    }
  }

  function updateTimerDisplay() {
    if (!container) return;
    const el = container.querySelector('#wb-timer');
    if (!el) return;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  }

  function onKey(e) {
    // FIX: guard — do nothing if game is over or container gone
    if (!container || gameOver) return;
    const key = e.key.toUpperCase();
    if (key === 'ENTER') { e.preventDefault(); handleKeyPress('ENTER'); }
    else if (key === 'BACKSPACE') { e.preventDefault(); handleKeyPress('⌫'); }
    else if (/^[A-Z]$/.test(key)) handleKeyPress(key);
  }

  function handleKeyPress(key) {
    if (!container || gameOver) return;
    if (key === '⌫') {
      if (currentInput.length > 0) {
        currentInput = currentInput.slice(0, -1);
        updateCurrentRow();
      }
    } else if (key === 'ENTER') {
      submitGuess();
    } else if (/^[A-Z]$/.test(key) && currentInput.length < 5) {
      currentInput += key;
      updateCurrentRow();
      // bounce animation on tile
      const col = currentInput.length - 1;
      const tile = getTile(guesses.length, col);
      if (tile) {
        tile.style.animation = 'wb-bounce 0.1s ease';
        setTimeout(() => { if (tile) tile.style.animation = ''; }, 150);
      }
    }
  }

  function updateCurrentRow() {
    if (!container) return;
    const rowIdx = guesses.length;
    for (let c = 0; c < 5; c++) {
      const tile = getTile(rowIdx, c);
      if (!tile) continue;
      tile.textContent = currentInput[c] || '';
      tile.style.border = currentInput[c] ? '2px solid #ffffff66' : '2px solid #333';
    }
  }

  function submitGuess() {
    if (!container || gameOver) return;
    if (currentInput.length !== 5) {
      setMessage('5 letters needed');
      if (container) shakeRow(guesses.length);
      setTimeout(() => setMessage(''), 800);
      return;
    }
    if (!WORD_LIST.includes(currentInput)) {
      setMessage('Not in word list');
      shakeRow(guesses.length);
      setTimeout(() => setMessage(''), 800);
      return;
    }

    const result = scoreGuess(currentInput, targetWord);
    const guess = { word: currentInput, result };
    guesses.push(guess);
    currentInput = '';

    revealRow(guesses.length - 1, guess, () => {
      updateLetterStates(guess);
      updateKeyboard();

      if (guess.word === targetWord) {
        clearInterval(timerInterval);
        const triesBonus = (6 - guesses.length) * 50;
        const timeBonus = timeLeft * 2;
        score = 100 + triesBonus + timeBonus;
        window.setShellScore(score);
        const prevBest = Store.get('arcade_wordblitz_highscore', 0);
        if (score > prevBest) Store.set('arcade_wordblitz_highscore', score);
        streak++;
        Store.set('arcade_wordblitz_streak', streak);
        updateStreakDisplay();
        setTimeout(() => endGame(true), 400);
      } else if (guesses.length >= 6) {
        clearInterval(timerInterval);
        streak = 0;
        Store.set('arcade_wordblitz_streak', 0);
        updateStreakDisplay();
        setTimeout(() => endGame(false), 400);
      } else {
        updateCurrentRow();
      }
    });
  }

  function scoreGuess(guess, target) {
    const result = Array(5).fill('absent');
    const targetArr = target.split('');
    const guessArr  = guess.split('');

    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === targetArr[i]) {
        result[i] = 'correct';
        targetArr[i] = null;
        guessArr[i] = null;
      }
    }
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === null) continue;
      const j = targetArr.indexOf(guessArr[i]);
      if (j !== -1) {
        result[i] = 'present';
        targetArr[j] = null;
      }
    }
    return result;
  }

  const STATE_COLORS = { correct: '#538d4e', present: '#b59f3b', absent: '#3a3a4c' };
  const STATE_BORDER = { correct: '#6aaf5e', present: '#d4b84a', absent: '#4a4a5c' };

  function revealRow(rowIndex, guess, callback) {
    let done = 0;
    for (let c = 0; c < 5; c++) {
      const tile = getTile(rowIndex, c);
      if (!tile) { done++; if (done === 5 && callback) callback(); continue; }
      const delay = c * 120;
      setTimeout(() => {
        tile.style.transition = 'transform .15s';
        tile.style.transform = 'rotateX(90deg) scale(0.9)';
        setTimeout(() => {
          tile.style.background = STATE_COLORS[guess.result[c]];
          tile.style.border = `2px solid ${STATE_BORDER[guess.result[c]]}`;
          tile.style.transform = 'rotateX(0deg) scale(1)';
          done++;
          if (done === 5 && callback) callback();
        }, 150);
      }, delay);
    }
  }

  function updateLetterStates(guess) {
    const priority = { correct: 3, present: 2, absent: 1 };
    guess.word.split('').forEach((letter, i) => {
      const state = guess.result[i];
      const current = letterStates[letter];
      if (!current || priority[state] > priority[current]) letterStates[letter] = state;
    });
  }

  function updateKeyboard() {
    if (!container) return;
    Object.entries(letterStates).forEach(([letter, state]) => {
      const btn = container.querySelector(`#wb-key-${letter}`);
      if (!btn) return;
      btn.style.background = STATE_COLORS[state];
      btn.style.color = '#fff';
    });
  }

  function shakeRow(rowIndex) {
    if (!container) return;
    const row = container.querySelector(`#wb-row-${rowIndex}`);
    if (!row) return;
    row.style.animation = 'none';
    row.offsetHeight;
    row.style.animation = 'wb-shake 0.4s ease';
  }

  if (!document.querySelector('#wb-styles')) {
    const style = document.createElement('style');
    style.id = 'wb-styles';
    style.textContent = `
      @keyframes wb-shake {
        0%,100%{transform:translateX(0)}
        20%{transform:translateX(-6px)}
        40%{transform:translateX(6px)}
        60%{transform:translateX(-4px)}
        80%{transform:translateX(4px)}
      }
      @keyframes wb-bounce {
        0%,100%{transform:scale(1)}
        50%{transform:scale(1.08)}
      }
    `;
    document.head.appendChild(style);
  }

  function endGame(won, overrideMsg) {
    gameOver = true;
    clearInterval(timerInterval);
    if (!container) return;

    const gradeMap = (triesLeft) => {
      if (triesLeft >= 5) return { label: 'GENIUS', color: '#4ade80' };
      if (triesLeft >= 4) return { label: 'GREAT',  color: '#4cc9f0' };
      if (triesLeft >= 3) return { label: 'NICE',   color: '#ffd60a' };
      if (triesLeft >= 2) return { label: 'CLOSE',  color: '#f97316' };
      return { label: 'LUCKY', color: '#f72585' };
    };

    const triesUsed = guesses.length;
    const triesLeft = 6 - triesUsed;
    const grade = won ? gradeMap(triesLeft) : { label: overrideMsg || 'GAME OVER', color: '#ff4444' };

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:absolute;inset:0;z-index:50;background:#000000cc;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:10px;padding:24px;`;

    overlay.innerHTML = `
      <div style="font:700 36px/1 'Bebas Neue',sans-serif;color:${grade.color};
        filter:drop-shadow(0 0 12px ${grade.color}88);letter-spacing:3px;">${grade.label}</div>
      ${won
        ? `<div style="font:700 22px/1 'Bebas Neue',sans-serif;color:#fff;letter-spacing:2px;">${score.toLocaleString()} PTS</div>`
        : `<div style="font:500 14px/1.5 'DM Sans',sans-serif;color:#aaa;">The word was <strong style="color:#fff;">${targetWord}</strong></div>`
      }
      <div style="font:400 12px/1.6 'DM Mono',monospace;color:#666;text-align:center;">
        ${won ? `Solved in ${triesUsed} tr${triesUsed === 1 ? 'y' : 'ies'} · ${timeLeft}s left` : `${triesUsed}/6 tries used`}
      </div>
      <div style="font:500 11px/1 'DM Mono',monospace;color:#ffd60a;">STREAK: ${streak}</div>
      <div style="display:flex;gap:10px;margin-top:8px;">
        <button id="wb-play-again" style="
          background:${grade.color}22;border:1.5px solid ${grade.color};
          color:${grade.color};padding:10px 24px;border-radius:8px;
          font:700 14px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;">PLAY AGAIN</button>
      </div>
    `;

    root.style.position = 'relative';
    root.appendChild(overlay);

    overlay.querySelector('#wb-play-again').addEventListener('click', () => {
      overlay.remove();
      newGame();
    });
  }

  function getTile(row, col) {
    if (!container) return null;
    return container.querySelector(`#wb-tile-${row}-${col}`);
  }

  function setMessage(msg) {
    if (!container) return;
    const el = container.querySelector('#wb-message');
    if (el) el.textContent = msg;
  }

  function updateStreakDisplay() {
    if (!container) return;
    const el = container.querySelector('#wb-streak');
    if (el) el.textContent = streak;
  }

  window.start_wordblitz = start_wordblitz;
  window.stop_wordblitz  = stop_wordblitz;

})();
