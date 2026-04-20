/* ARCADE10 — Slide Puzzle (FIXED — better instructions + visual cues) */
(function () {
  let container, root, tiles, blankIdx, moves, size, gameActive, timerInt, elapsed;

  function start_slidepuzzle(cont) { container=cont; showSizeSelect(); }
  function stop_slidepuzzle() { clearInterval(timerInt); document.removeEventListener('keydown',onKey); container=null; }

  function showSizeSelect() {
    if(!container)return;
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#0a0a0f;gap:14px;padding:20px;box-sizing:border-box;overflow-y:auto;">
        <div style="font:700 26px/1 'Bebas Neue',sans-serif;color:#fff;letter-spacing:3px;">SLIDE PUZZLE</div>

        <!-- HOW TO PLAY -->
        <div style="width:100%;max-width:320px;background:#1a1a2e;border-radius:10px;padding:14px 16px;box-sizing:border-box;">
          <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff33;letter-spacing:2px;margin-bottom:10px;">HOW TO PLAY</div>
          <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;">
            <div style="font:700 20px/1 sans-serif;flex-shrink:0;">👆</div>
            <p style="font:400 12px/1.6 'DM Sans',sans-serif;color:#ccc;margin:0;"><strong style="color:#fff;">Tap</strong> any numbered tile next to the empty space to slide it in.</p>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;">
            <div style="font:700 20px/1 sans-serif;flex-shrink:0;">🎯</div>
            <p style="font:400 12px/1.6 'DM Sans',sans-serif;color:#ccc;margin:0;"><strong style="color:#fff;">Goal:</strong> arrange tiles 1→N in order, left-to-right, top-to-bottom. Empty space goes bottom-right.</p>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="font:700 20px/1 sans-serif;flex-shrink:0;">⌨️</div>
            <p style="font:400 12px/1.6 'DM Sans',sans-serif;color:#888;margin:0;">Arrow keys also work on desktop.</p>
          </div>
        </div>

        <!-- SOLVED EXAMPLE (3x3 mini) -->
        <div style="width:100%;max-width:320px;">
          <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff22;letter-spacing:2px;margin-bottom:8px;text-align:center;">SOLVED STATE (3×3)</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-width:160px;margin:0 auto;">
            ${[1,2,3,4,5,6,7,8,0].map(v=>`<div style="height:44px;border-radius:6px;${v===0?'background:#1a1a2e;border:2px dashed #333;':'background:linear-gradient(135deg,#a259ff,#7c3aed);border:none;box-shadow:0 2px 6px #a259ff33;'}display:flex;align-items:center;justify-content:center;font:700 16px/1 'Bebas Neue',sans-serif;color:#fff;">${v||''}</div>`).join('')}
          </div>
        </div>

        <div style="font:500 11px/1 'DM Mono',monospace;color:#ffffff44;letter-spacing:2px;">SELECT DIFFICULTY</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          ${[[3,'Easy','3×3 · 8 tiles'],[4,'Medium','4×4 · 15 tiles'],[5,'Hard','5×5 · 24 tiles']].map(([n,label,sub])=>`
            <button data-n="${n}" style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:1.5px solid #333;border-radius:12px;padding:16px 22px;cursor:pointer;color:#fff;font-family:inherit;min-width:90px;transition:border-color .2s,transform .15s;text-align:center;">
              <div style="font:700 22px/1 'Bebas Neue',sans-serif;color:#a259ff;">${n}×${n}</div>
              <div style="font:600 11px/1.4 'DM Sans',sans-serif;color:#aaa;margin-top:4px;">${label}</div>
              <div style="font:400 10px/1.4 'DM Sans',sans-serif;color:#666;margin-top:2px;">${sub}</div>
              <div style="font:400 10px 'DM Mono',monospace;color:#555;margin-top:3px;">BEST: ${Store.get(`arcade_slide_best_${n}x${n}`)||'—'} moves</div>
            </button>
          `).join('')}
        </div>
      </div>`;
    container.querySelectorAll('[data-n]').forEach(btn=>{
      btn.addEventListener('mouseenter',()=>{btn.style.borderColor='#a259ff';btn.style.transform='scale(1.04)';});
      btn.addEventListener('mouseleave',()=>{btn.style.borderColor='#333';btn.style.transform='scale(1)';});
      btn.addEventListener('click',()=>startGame(+btn.dataset.n));
    });
  }

  function startGame(n) {
    size=n;moves=0;elapsed=0;gameActive=true;
    tiles=[...Array(n*n).keys()]; blankIdx=n*n-1;
    for(let i=0;i<1000;i++){const neighbors=getNeighbors(blankIdx,n);const swap=neighbors[Math.floor(Math.random()*neighbors.length)];[tiles[blankIdx],tiles[swap]]=[tiles[swap],tiles[blankIdx]];blankIdx=swap;}
    buildUI();clearInterval(timerInt);timerInt=setInterval(()=>{elapsed++;updateHUD();},1000);
    window.setShellScore(0);document.removeEventListener('keydown',onKey);document.addEventListener('keydown',onKey);
  }

  function getNeighbors(idx,n){const r=Math.floor(idx/n),c=idx%n,res=[];if(r>0)res.push(idx-n);if(r<n-1)res.push(idx+n);if(c>0)res.push(idx-1);if(c<n-1)res.push(idx+1);return res;}

  function buildUI() {
    if(!container)return;
    const cw=container.clientWidth||360;
    const ch=container.clientHeight||600;
    const cellSize=Math.min(Math.floor((Math.min(cw,ch)-100)/size),86);
    container.innerHTML=`
      <div id="sp-root" style="display:flex;flex-direction:column;align-items:center;width:100%;height:100%;background:#0a0a0f;padding:12px;box-sizing:border-box;gap:10px;position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;max-width:${size*cellSize+20}px;">
          <div style="text-align:center;">
            <div style="font:500 9px/1 'DM Mono',monospace;color:#ffffff33;">MOVES</div>
            <div id="sp-moves" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#fff;">0</div>
          </div>
          <div style="text-align:center;">
            <div style="font:500 9px/1 'DM Mono',monospace;color:#ffffff33;">TIME</div>
            <div id="sp-time" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#4cc9f0;">0s</div>
          </div>
          <div style="text-align:center;">
            <div style="font:500 9px/1 'DM Mono',monospace;color:#ffffff33;">BEST</div>
            <div style="font:700 18px/1 'Bebas Neue',sans-serif;color:#ffd60a;">${Store.get(`arcade_slide_best_${size}x${size}`)||'—'}</div>
          </div>
        </div>
        <div style="font:400 11px/1 'DM Mono',monospace;color:#ffffff33;letter-spacing:1px;">TAP A TILE NEXT TO THE EMPTY SPACE TO SLIDE IT</div>
        <div id="sp-grid" style="display:grid;grid-template-columns:repeat(${size},${cellSize}px);grid-template-rows:repeat(${size},${cellSize}px);gap:5px;"></div>
        <button id="sp-back" style="background:#ffffff08;border:1.5px solid #ffffff15;color:#888;padding:8px 20px;border-radius:8px;font:700 12px/1 'Bebas Neue',sans-serif;cursor:pointer;letter-spacing:1px;margin-top:auto;">CHANGE SIZE</button>
      </div>`;
    root=container.querySelector('#sp-root');
    container.querySelector('#sp-back').addEventListener('click',()=>{clearInterval(timerInt);document.removeEventListener('keydown',onKey);showSizeSelect();});
    renderGrid(cellSize);
  }

  function renderGrid(cellSize) {
    if(!container)return;
    const cs=cellSize||Math.min(Math.floor((Math.min(container.clientWidth,container.clientHeight)-100)/size),86);
    const grid=container.querySelector('#sp-grid'); if(!grid)return;
    grid.innerHTML='';
    tiles.forEach((val,idx)=>{
      const isNeighbor=getNeighbors(blankIdx,size).includes(idx);
      const el=document.createElement('div');
      el.style.cssText=`
        width:${cs}px;height:${cs}px;border-radius:8px;
        display:flex;align-items:center;justify-content:center;
        font:700 ${Math.round(cs*0.35)}px/1 'Bebas Neue',sans-serif;
        cursor:${val===0?'default':isNeighbor?'pointer':'default'};
        transition:background .12s,transform .1s,box-shadow .12s;
        ${val===0
          ? 'background:#111128;border:2px dashed #2a2a4a;'
          : isNeighbor
            ? 'background:linear-gradient(135deg,#a259ff,#7c3aed);color:#fff;box-shadow:0 0 12px #a259ff55,0 3px 8px rgba(0,0,0,0.4);border:2px solid #b47aff;'
            : 'background:linear-gradient(135deg,#2a2050,#1e1840);color:#ffffff88;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid #3a305a;'
        }
      `;
      el.textContent = val===0 ? '' : val;
      el.dataset.idx=idx;
      if(val!==0&&isNeighbor){
        el.addEventListener('click',()=>tryMove(idx));
        el.addEventListener('mouseenter',()=>{el.style.transform='scale(1.05)';});
        el.addEventListener('mouseleave',()=>{el.style.transform='scale(1)';});
      }
      grid.appendChild(el);
    });
  }

  function tryMove(idx) {
    if(!gameActive)return;
    const neighbors=getNeighbors(blankIdx,size);if(!neighbors.includes(idx))return;
    [tiles[blankIdx],tiles[idx]]=[tiles[idx],tiles[blankIdx]];blankIdx=idx;moves++;updateHUD();renderGrid();
    if(isSolved())finishGame();
  }

  function onKey(e) {
    if(!container||!gameActive)return;
    const r=Math.floor(blankIdx/size),c=blankIdx%size;let target=-1;
    if(e.key==='ArrowUp'&&r<size-1)target=blankIdx+size;
    if(e.key==='ArrowDown'&&r>0)target=blankIdx-size;
    if(e.key==='ArrowLeft'&&c<size-1)target=blankIdx+1;
    if(e.key==='ArrowRight'&&c>0)target=blankIdx-1;
    if(target>=0){e.preventDefault();tryMove(target);}
  }

  function updateHUD() {
    if(!container)return;
    const m=container.querySelector('#sp-moves'),t=container.querySelector('#sp-time');
    if(m)m.textContent=moves;if(t)t.textContent=elapsed+'s';
    window.setShellScore(Math.max(0,1000-moves*5));
  }

  function isSolved(){return tiles.every((v,i)=>v===(i===size*size-1?0:i+1));}

  function finishGame() {
    gameActive=false;clearInterval(timerInt);document.removeEventListener('keydown',onKey);if(!container)return;
    const key=`arcade_slide_best_${size}x${size}`;const prev=Store.get(key,Infinity);const isNew=moves<prev;
    if(isNew)Store.set(key,moves);const finalScore=Math.max(0,1000-moves*5);
    const overlay=document.createElement('div');
    overlay.style.cssText='position:absolute;inset:0;background:#000000cc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:20;';
    overlay.innerHTML=`
      <div style="font:700 13px/1 'DM Mono',monospace;letter-spacing:3px;color:#ffffff66;">SOLVED! 🎉</div>
      <div style="font:700 52px/1 'Bebas Neue',sans-serif;color:#a259ff;filter:drop-shadow(0 0 14px #a259ff88);">${finalScore}</div>
      <div style="font:400 13px/1.6 'DM Mono',monospace;color:#aaa;text-align:center;">${moves} moves · ${elapsed}s<br>${isNew?'<span style="color:#ffd60a;">★ NEW BEST!</span>':`Best: ${Store.get(key)} moves`}</div>
      <div style="display:flex;gap:10px;">
        <button id="sp-retry" style="background:#a259ff22;border:1.5px solid #a259ff;color:#a259ff;padding:10px 24px;border-radius:8px;font:700 14px/1 'Bebas Neue',sans-serif;cursor:pointer;">PLAY AGAIN</button>
        <button id="sp-sizes" style="background:#ffffff0d;border:1.5px solid #ffffff22;color:#ffffff99;padding:10px 24px;border-radius:8px;font:700 14px/1 'Bebas Neue',sans-serif;cursor:pointer;">CHANGE SIZE</button>
      </div>`;
    root.appendChild(overlay);
    overlay.querySelector('#sp-retry').addEventListener('click',()=>{overlay.remove();startGame(size);});
    overlay.querySelector('#sp-sizes').addEventListener('click',()=>showSizeSelect());
  }

  window.start_slidepuzzle=start_slidepuzzle;
  window.stop_slidepuzzle=stop_slidepuzzle;
})();
