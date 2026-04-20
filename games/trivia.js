/* ══════════════════════════════════════════════════════
   ARCADE10 — games/trivia.js
   Progressive difficulty: Easy → Medium → Hard
   Questions 1-4: Easy | 5-7: Medium | 8-10: Hard
══════════════════════════════════════════════════════ */

(function () {

  const QUESTION_COUNT = 10;
  const SCORE_KEY      = 'arcade_trivia_highscore';

  const DIFF_CONFIG = [
    { label: 'EASY',   color: '#4ade80', timer: 20, range: [0,3] },
    { label: 'MEDIUM', color: '#ffd60a', timer: 15, range: [4,6] },
    { label: 'HARD',   color: '#f72585', timer: 10, range: [7,9] },
  ];

  const CATEGORIES = [
    { id: 9,  label: 'General Knowledge' },
    { id: 17, label: 'Science & Nature' },
    { id: 23, label: 'History' },
    { id: 21, label: 'Sports' },
    { id: 11, label: 'Film' },
    { id: 12, label: 'Music' },
    { id: 15, label: 'Video Games' },
    { id: 22, label: 'Geography' },
  ];

  let questions    = [];
  let current      = 0;
  let score        = 0;
  let streak       = 0;
  let correctCount = 0;
  let timerInt     = null;
  let timerLeft    = 20;
  let answered     = false;
  let selectedCat  = null;
  let container    = null;
  let startTime    = 0;

  function getDiff(idx) {
    if (idx <= 3) return DIFF_CONFIG[0];
    if (idx <= 6) return DIFF_CONFIG[1];
    return DIFF_CONFIG[2];
  }

  function decode(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async function fetchQuestions(catId) {
    const catParam = catId ? `&category=${catId}` : '';
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch(`https://opentdb.com/api.php?amount=4&difficulty=easy&type=multiple${catParam}`),
        fetch(`https://opentdb.com/api.php?amount=3&difficulty=medium&type=multiple${catParam}`),
        fetch(`https://opentdb.com/api.php?amount=3&difficulty=hard&type=multiple${catParam}`),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      const all = [];
      for (const data of [d1, d2, d3]) {
        if (data.response_code !== 0 || !data.results?.length) throw new Error('Bad response');
        data.results.forEach(q => all.push({
          category: decode(q.category),
          question: decode(q.question),
          correct:  decode(q.correct_answer),
          answers:  shuffle([...q.incorrect_answers.map(decode), decode(q.correct_answer)]),
        }));
      }
      return all;
    } catch {
      return null;
    }
  }

  function setContent(html) {
    container.innerHTML = `<div class="trivia-wrap">${html}</div>`;
  }

  function showHowToPlay() {
    setContent(`
      <div class="trivia-start">
        <div class="trivia-start-icon">📖</div>
        <h2>HOW TO PLAY</h2>
        <div class="trivia-rules" style="text-align:left;width:100%;max-width:420px;">
          <h4 style="color:#4ade80;">🟢 Questions 1–4 · EASY · 20 seconds each</h4>
          <p style="color:var(--text3);font-size:0.82rem;margin:0 0 14px;">Warm-up questions — straightforward facts and common knowledge. You have plenty of time!</p>

          <h4 style="color:#ffd60a;">🟡 Questions 5–7 · MEDIUM · 15 seconds each</h4>
          <p style="color:var(--text3);font-size:0.82rem;margin:0 0 14px;">The challenge picks up. Think carefully but keep moving.</p>

          <h4 style="color:#f72585;">🔴 Questions 8–10 · HARD · 10 seconds each</h4>
          <p style="color:var(--text3);font-size:0.82rem;margin:0 0 14px;">Expert-level trivia with a tight timer. Stay sharp!</p>

          <h4>🏆 Scoring</h4>
          <ul>
            <li>Correct answer = <strong>100 pts</strong></li>
            <li>Speed bonus = up to <strong>+50 pts</strong></li>
            <li>3 correct in a row → <strong>×2 multiplier</strong></li>
            <li>6 correct in a row → <strong>×3 multiplier</strong></li>
            <li>Wrong answer or timeout → streak resets to 0</li>
          </ul>
        </div>
        <button class="btn-primary" id="backToStartBtn" style="margin-top:8px;">← BACK</button>
      </div>
    `);
    container.querySelector('#backToStartBtn').addEventListener('click', showStart);
  }

  function showStart() {
    const best = Store.get(SCORE_KEY);
    const catOptions = CATEGORIES.map(c =>
      `<button class="cat-btn" data-id="${c.id}">${c.label}</button>`
    ).join('');

    setContent(`
      <div class="trivia-start">
        <div class="trivia-start-icon">🧠</div>
        <h2>TRIVIA RUSH</h2>
        <p>10 questions. Starts easy, gets harder. Beat the clock!</p>
        <div style="display:flex;gap:10px;justify-content:center;margin:4px 0 8px;font-family:var(--font-mono);font-size:0.72rem;">
          <span style="color:#4ade80;background:#4ade8011;padding:3px 8px;border-radius:20px;border:1px solid #4ade8033;">● EASY ×4</span>
          <span style="color:#ffd60a;background:#ffd60a11;padding:3px 8px;border-radius:20px;border:1px solid #ffd60a33;">● MEDIUM ×3</span>
          <span style="color:#f72585;background:#f7258511;padding:3px 8px;border-radius:20px;border:1px solid #f7258533;">● HARD ×3</span>
        </div>
        ${best !== null ? `<p style="font-family:var(--font-mono);font-size:0.8rem;color:var(--accent);">YOUR BEST: ${best}</p>` : ''}
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;width:100%;">
          <p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text3);letter-spacing:0.08em;text-transform:uppercase;">Pick a category (optional)</p>
          <div class="trivia-cats">${catOptions}</div>
        </div>
        <button class="btn-primary" id="triviaStartBtn">START GAME</button>
        <button class="btn-secondary" id="howToPlayBtn" style="margin-top:6px;">📖 HOW TO PLAY</button>
      </div>
    `);

    container.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
        if (selectedCat === Number(btn.dataset.id)) {
          selectedCat = null;
        } else {
          btn.classList.add('selected');
          selectedCat = Number(btn.dataset.id);
        }
      });
    });

    container.querySelector('#triviaStartBtn').addEventListener('click', startGame);
    container.querySelector('#howToPlayBtn').addEventListener('click', showHowToPlay);
  }

  function showLoading() {
    setContent(`
      <div class="trivia-loading">
        <div class="loader"></div>
        <p>Fetching questions…</p>
      </div>
    `);
  }

  function showError() {
    setContent(`
      <div class="trivia-error">
        <div class="err-icon">⚠️</div>
        <p>Couldn't load questions.<br>Check your connection and try again.</p>
        <button class="btn-primary" id="retryBtn">RETRY</button>
        <button class="btn-secondary" id="offlineBtn">PLAY OFFLINE (SAMPLE)</button>
      </div>
    `);
    container.querySelector('#retryBtn').addEventListener('click', startGame);
    container.querySelector('#offlineBtn').addEventListener('click', () => {
      questions = getSampleQuestions();
      beginGame();
    });
  }

  async function startGame() {
    current = 0; score = 0; streak = 0; correctCount = 0; answered = false;
    showLoading();
    const qs = await fetchQuestions(selectedCat);
    if (!qs) { showError(); return; }
    questions = qs;
    beginGame();
  }

  function beginGame() {
    current = 0; score = 0; streak = 0; correctCount = 0;
    startTime = Date.now();
    window.setShellScore(0);
    showQuestion();
  }

  function showQuestion() {
    if (current >= questions.length) { showResults(); return; }
    answered = false;
    const q = questions[current];
    const diff = getDiff(current);
    timerLeft = diff.timer;
    const progress = (current / questions.length) * 100;
    const multiplier = getMultiplier();
    const streakVisible = streak >= 3 ? 'visible' : '';
    const streakLabel = multiplier > 1 ? `🔥 x${multiplier} STREAK` : '';

    // Show difficulty transition banner on first question of each tier
    const isFirstOfTier = current === 0 || current === 4 || current === 7;
    const tierBanner = isFirstOfTier && current > 0 ? `
      <div style="text-align:center;padding:6px;margin-bottom:6px;border-radius:8px;background:${diff.color}11;border:1px solid ${diff.color}44;font-family:var(--font-mono);font-size:0.78rem;color:${diff.color};letter-spacing:1px;animation:fadeIn 0.4s ease;">
        ⚡ DIFFICULTY UP — ${diff.label} MODE — ${diff.timer}s per question
      </div>
    ` : '';

    setContent(`
      ${tierBanner}
      <div class="trivia-progress-wrap">
        <div class="trivia-meta">
          <span class="trivia-q-num">Q${current + 1}/${questions.length}</span>
          <span style="font-family:var(--font-mono);font-size:0.68rem;font-weight:700;color:${diff.color};padding:2px 8px;border-radius:20px;border:1px solid ${diff.color}44;background:${diff.color}11;">${diff.label} · ${diff.timer}s</span>
          <span class="trivia-streak ${streakVisible}" id="streakBadge">${streakLabel}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      </div>
      <div class="timer-bar"><div class="timer-fill" id="timerFill" style="width:100%"></div></div>
      <div class="trivia-question-card">
        <div class="trivia-category-label">${q.category}</div>
        <div class="trivia-question-text">${q.question}</div>
      </div>
      <div class="trivia-answers" id="answersGrid">
        ${q.answers.map((a, i) =>
          `<button class="answer-btn" data-index="${i}" data-answer="${a.replace(/"/g,'&quot;')}">${a}</button>`
        ).join('')}
      </div>
      <div class="mult-toast" id="multToast"></div>
    `);

    container.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(btn, q));
    });

    startTimer(diff.timer);
  }

  function startTimer(seconds) {
    clearInterval(timerInt);
    timerLeft = seconds;
    const fill = container.querySelector('#timerFill');
    if (!fill) return;

    timerInt = setInterval(() => {
      timerLeft -= 0.1;
      const pct = Math.max(0, (timerLeft / seconds) * 100);
      fill.style.width = pct + '%';
      if (pct <= 30) fill.classList.add('danger');
      else if (pct <= 60) fill.classList.add('warn');
      if (timerLeft <= 0 && !answered) {
        clearInterval(timerInt);
        handleTimeout();
      }
    }, 100);
  }

  function stopTimer() { clearInterval(timerInt); }

  function handleAnswer(btn, q) {
    if (answered) return;
    answered = true;
    stopTimer();

    const chosen = btn.textContent;
    const isCorrect = chosen === q.correct;
    const diff = getDiff(current);

    container.querySelectorAll('.answer-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correct) b.classList.add('correct');
    });

    if (isCorrect) {
      btn.classList.add('correct');
      streak++;
      correctCount++;
      const mult = getMultiplier();
      const speedBonus = Math.round((timerLeft / diff.timer) * 50);
      const gained = (100 + speedBonus) * mult;
      score += gained;
      window.setShellScore(score);
      Sound.play('correct');

      const toast = container.querySelector('#multToast');
      if (toast) {
        toast.textContent = mult > 1 ? `+${gained} (x${mult} streak!)` : `+${gained}`;
        toast.style.opacity = '1';
        setTimeout(() => { toast.style.opacity = '0'; }, 900);
      }
    } else {
      btn.classList.add('wrong');
      streak = 0;
      Sound.play('wrong');
    }

    setTimeout(() => { current++; showQuestion(); }, 1100);
  }

  function handleTimeout() {
    if (answered) return;
    answered = true;
    streak = 0;
    Sound.play('wrong');

    const q = questions[current];
    container.querySelectorAll('.answer-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correct) b.classList.add('reveal');
    });

    const toast = container.querySelector('#multToast');
    if (toast) { toast.textContent = "Time's up!"; toast.style.opacity = '1'; }

    setTimeout(() => { current++; showQuestion(); }, 1200);
  }

  function getMultiplier() {
    if (streak >= 6) return 3;
    if (streak >= 3) return 2;
    return 1;
  }

  function showResults() {
    stopTimer();
    const grade = score >= 1200 ? 'S' : score >= 900 ? 'A' : score >= 600 ? 'B' : score >= 300 ? 'C' : 'F';
    const gradeClass = `grade-${grade.toLowerCase()}`;
    const best = Store.get(SCORE_KEY);
    const isNewBest = best === null || score > best;
    if (isNewBest) Store.set(SCORE_KEY, score);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    Sound.play(score >= 600 ? 'win' : 'wrong');

    setContent(`
      <div class="trivia-results">
        <div class="results-grade ${gradeClass}">${grade}</div>
        <div class="results-title">${grade === 'S' ? 'PERFECT RUSH' : grade === 'A' ? 'GREAT GAME' : grade === 'B' ? 'SOLID RUN' : grade === 'C' ? 'NOT BAD' : 'KEEP TRYING'}</div>
        <div class="results-new-best ${isNewBest ? 'show' : ''}">🏆 NEW BEST SCORE!</div>
        <div class="results-grid">
          <div class="results-stat"><div class="results-stat-label">Score</div><div class="results-stat-val highlight" id="animScore">0</div></div>
          <div class="results-stat"><div class="results-stat-label">Correct</div><div class="results-stat-val">${correctCount}/${questions.length}</div></div>
          <div class="results-stat"><div class="results-stat-label">Best</div><div class="results-stat-val">${isNewBest ? score : best}</div></div>
          <div class="results-stat"><div class="results-stat-label">Time</div><div class="results-stat-val">${timeTaken}s</div></div>
        </div>
        <div class="results-btn-row">
          <button class="btn-primary" id="playAgainBtn">PLAY AGAIN</button>
          <button class="btn-secondary" id="changeCatBtn">CHANGE CATEGORY</button>
        </div>
      </div>
    `);

    animateCount(container.querySelector('#animScore'), 0, score, 900);
    container.querySelector('#playAgainBtn').addEventListener('click', startGame);
    container.querySelector('#changeCatBtn').addEventListener('click', () => { selectedCat = null; showStart(); });
  }

  function animateCount(el, from, to, dur) {
    if (!el) return;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * ease);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function getSampleQuestions() {
    return [
      // EASY x4
      { category: 'General Knowledge', question: 'What color is the sky on a clear day?', correct: 'Blue', answers: shuffle(['Blue', 'Green', 'Red', 'Yellow']) },
      { category: 'General Knowledge', question: 'How many sides does a triangle have?', correct: '3', answers: shuffle(['3', '4', '5', '6']) },
      { category: 'Geography', question: 'What is the capital of France?', correct: 'Paris', answers: shuffle(['Paris', 'London', 'Berlin', 'Madrid']) },
      { category: 'Science', question: 'What planet is known as the Red Planet?', correct: 'Mars', answers: shuffle(['Mars', 'Venus', 'Jupiter', 'Saturn']) },
      // MEDIUM x3
      { category: 'History', question: 'In what year did World War II end?', correct: '1945', answers: shuffle(['1945', '1943', '1947', '1939']) },
      { category: 'Science', question: 'What is the chemical symbol for water?', correct: 'H₂O', answers: shuffle(['H₂O', 'CO₂', 'O₂', 'NaCl']) },
      { category: 'Geography', question: 'What is the largest ocean on Earth?', correct: 'Pacific', answers: shuffle(['Pacific', 'Atlantic', 'Indian', 'Arctic']) },
      // HARD x3
      { category: 'History', question: 'Who painted the Mona Lisa?', correct: 'Leonardo da Vinci', answers: shuffle(['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Picasso']) },
      { category: 'Science', question: 'What is the approximate speed of light in km/s?', correct: '299,792', answers: shuffle(['299,792', '150,000', '500,000', '100,000']) },
      { category: 'Geography', question: 'Which country has the most natural lakes?', correct: 'Canada', answers: shuffle(['Canada', 'Russia', 'USA', 'Brazil']) },
    ];
  }

  window.start_trivia = function (el) {
    container = el;
    questions = []; current = 0; score = 0; streak = 0; correctCount = 0;
    selectedCat = null;
    showStart();
  };

  window.stop_trivia = function () {
    stopTimer();
    container = null;
  };

})();
