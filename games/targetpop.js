/* ARCADE10 — Target Pop (FIXED — rendering + instructions) */
(function () {
  let container, root, animFrame, targets, score, timeLeft, timerInt, gameActive, level, spawnTimeout;

  function start_targetpop(cont) {
    container = cont;
    container.innerHTML = `
      <div id="tp-root" style="position:relative;width:100%;height:100%;background:#0a0a0f;overflow:hidden;cursor:crosshair;user-select:none;">
        <div id="tp-hud" style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:10px 16px;z-index:10;background:linear-gradient(#0a0a0fcc,transparent);">
          <div style="font:700 16px/1 'Bebas Neue',sans-serif;color:#ffd60a;">LEVEL <span id="tp-level">1</span></div>
          <div id="tp-score-disp" style="font:700 22px/1 'Bebas Neue',sans-serif;color:#fff;text-shadow:0 0 10px #ffffff44;">0</div>
          <div style="font:700 16px/1 'Bebas Neue',sans-serif;color:#4cc9f0;"><span id="tp-timer">30</span>s</div>
        </div>
        <div id="tp-field" style="position:absolute;inset:0;top:44px;bottom:0;left:0;right:0;"></div>
        <div id="tp-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0a0a0fdd;z-index:20;">
          <div style="font:700 36px/1 'Bebas Neue',sans-serif;color:#f72585;letter-spacing:3px;text-shadow:0 0 20px #f72585aa;">TARGET POP</div>
          <div style="width:100%;max-width:300px;background:#1a1a2e;border-radius:10px;padding:14px 16px;box-sizing:border-box;text-align:center;">
            <div style="font:500 11px/1 'DM Mono',monospace;color:#ffffff44;letter-spacing:2px;margin-bottom:8px;">HOW TO PLAY</div>
            <p style="font:400 13px/1.7 'DM Sans',sans-serif;color:#ccc;margin:0 0 8px;">Tap or click the <strong style="color:#f72585;">colored circles</strong> before they disappear!</p>
            <p style="font:400 12px/1.6 'DM Sans',sans-serif;color:#888;margin:0;">🔴 Smaller targets = more points<br>⏱ You have 30 seconds · Targets speed up!</p>
          </div>
          <div style="font:400 11px/1 'DM Mono',monospace;color:#ffd60a;">BEST: ${Store.get('arcade_targetpop_highscore')||0}</div>
          <button id="tp-start" style="background:#f72585;border:none;color:#fff;padding:14px 40px;border-radius:10px;font:700 17px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;box-shadow:0 0 20px #f7258566;">PLAY!</button>
        </div>
      </div>`;
    root = container.querySelector('#tp-root');
    container.querySelector('#tp-start').addEventListener('click', startGame);
    injectStyles();
  }

  function stop_targetpop() {
    clearInterval(timerInt); clearTimeout(spawnTimeout); cancelAnimationFrame(animFrame);
    if(targets)targets.forEach(t=>{clearTimeout(t.timeout);t.el&&t.el.remove();}); targets=[];
    container=null;
  }

  function injectStyles() {
    if(!document.querySelector('#tp-styles')){
      const s=document.createElement('style');s.id='tp-styles';
      s.textContent=`
        @keyframes tp-pop{0%{transform:scale(0) rotate(-20deg);opacity:0}12%{transform:scale(1.15) rotate(5deg);opacity:1}18%{transform:scale(0.95) rotate(0deg)}25%{transform:scale(1)}80%{transform:scale(1);opacity:1}100%{transform:scale(0) rotate(10deg);opacity:0}}
        @keyframes tp-float{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-60px);opacity:0}}
        @keyframes tp-pulse{0%,100%{box-shadow:0 0 8px var(--glow)}50%{box-shadow:0 0 22px var(--glow),0 0 40px var(--glow)}}
      `;
      document.head.appendChild(s);
    }
  }

  function startGame() {
    score=0;timeLeft=30;level=1;targets=[];gameActive=true;
    const overlay=root.querySelector('#tp-overlay'); if(overlay)overlay.remove();
    const result=root.querySelector('#tp-result'); if(result)result.remove();
    window.setShellScore(0);
    clearInterval(timerInt);
    timerInt=setInterval(()=>{
      if(!container){clearInterval(timerInt);return;}
      timeLeft--;
      const el=container.querySelector('#tp-timer'); if(el)el.textContent=timeLeft;
      if(timeLeft<=10){const tel=container.querySelector('#tp-timer');if(tel)tel.style.color='#ff4444';}
      if(timeLeft<=0)endGame();
    },1000);
    clearTimeout(spawnTimeout); spawnLoop();
  }

  function spawnLoop() {
    if(!gameActive||!container)return;
    spawnTarget();
    const delay=Math.max(350,1100-level*70);
    spawnTimeout=setTimeout(spawnLoop,delay);
  }

  function spawnTarget() {
    if(!container)return;
    const field=container.querySelector('#tp-field'); if(!field)return;
    // Use offsetWidth/offsetHeight for rendered size
    const fw=field.offsetWidth||field.clientWidth;
    const fh=field.offsetHeight||field.clientHeight;
    if(fw<20||fh<20)return;
    const size=Math.floor(Math.random()*44+26);
    const pts=Math.max(10,Math.round(140-size*1.8));
    const margin=size+4;
    const x=margin+Math.random()*Math.max(1,fw-margin*2);
    const y=margin+Math.random()*Math.max(1,fh-margin*2);
    const life=Math.max(700,2400-level*130);
    const hue=Math.random()*360;
    const glowColor=`hsl(${hue},80%,55%)`;

    const el=document.createElement('div');
    el.style.cssText=`
      position:absolute;left:${x-size/2}px;top:${y-size/2}px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:radial-gradient(circle at 35% 35%,hsl(${hue},90%,72%),hsl(${hue},80%,45%));
      --glow:${glowColor};
      box-shadow:0 0 10px ${glowColor},inset 0 -3px 6px rgba(0,0,0,0.3);
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      font:700 ${Math.max(10,size/3.2)}px/1 'Bebas Neue',sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.5);
      transition:transform .08s;user-select:none;
      animation:tp-pop ${life}ms linear forwards,tp-pulse 1.2s ease infinite;
    `;
    el.textContent=`+${pts}`;

    const t={el,timeout:null};
    targets.push(t);

    el.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(!gameActive||!container)return;
      score+=pts;level=Math.min(10,Math.floor(score/180)+1);
      window.setShellScore(score);
      const scoreEl=container.querySelector('#tp-score-disp');
      if(scoreEl){scoreEl.textContent=score;scoreEl.style.transform='scale(1.2)';setTimeout(()=>{if(scoreEl)scoreEl.style.transform='scale(1)';},100);}
      floatText(x,y-size/2,`+${pts}`,`hsl(${hue},80%,65%)`);
      el.remove(); targets=targets.filter(x=>x!==t); clearTimeout(t.timeout);
      const lvlEl=container.querySelector('#tp-level'); if(lvlEl)lvlEl.textContent=level;
    });

    t.timeout=setTimeout(()=>{el.remove();targets=targets.filter(x=>x!==t);},life);
    field.appendChild(el);
  }

  function floatText(x,y,text,color) {
    if(!container)return;
    const field=container.querySelector('#tp-field'); if(!field)return;
    const el=document.createElement('div');
    el.style.cssText=`position:absolute;left:${x}px;top:${y}px;color:${color};font:700 20px/1 'Bebas Neue',sans-serif;pointer-events:none;z-index:5;text-shadow:0 0 8px ${color};animation:tp-float 0.85s ease forwards;transform:translateX(-50%);`;
    el.textContent=text; field.appendChild(el);
    setTimeout(()=>el.remove(),850);
  }

  function endGame() {
    gameActive=false; clearInterval(timerInt); clearTimeout(spawnTimeout);
    if(!container)return;
    if(targets)targets.forEach(t=>{clearTimeout(t.timeout);if(t.el)t.el.remove();}); targets=[];
    const best=Store.get('arcade_targetpop_highscore',0);
    const isNew=score>best; if(isNew)Store.set('arcade_targetpop_highscore',score);
    const panel=document.createElement('div');panel.id='tp-result';
    panel.style.cssText='position:absolute;inset:0;background:#000000cc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:30;padding:24px;';
    panel.innerHTML=`
      <div style="font:700 30px/1 'Bebas Neue',sans-serif;color:#f72585;letter-spacing:2px;">TIME'S UP!</div>
      <div style="font:700 56px/1 'Bebas Neue',sans-serif;color:#fff;filter:drop-shadow(0 0 14px #ffffff44);">${score}</div>
      ${isNew?`<div style="color:#ffd60a;font:700 14px/1 'DM Mono',monospace;">🏆 NEW BEST!</div>`:`<div style="color:#aaa;font:400 12px/1 'DM Mono',monospace;">BEST: ${best}</div>`}
      <button id="tp-again" style="background:#f72585;border:none;color:#fff;padding:12px 36px;border-radius:10px;font:700 16px/1 'Bebas Neue',sans-serif;cursor:pointer;margin-top:8px;box-shadow:0 0 16px #f7258566;">PLAY AGAIN</button>`;
    root.appendChild(panel);
    panel.querySelector('#tp-again').addEventListener('click',()=>{const p=root.querySelector('#tp-result');if(p)p.remove();startGame();});
  }

  window.start_targetpop=start_targetpop;
  window.stop_targetpop=stop_targetpop;
})();
