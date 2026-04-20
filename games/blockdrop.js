/* ARCADE10 — Block Drop (FIXED — controls below board, bigger buttons) */
(function(){
  const COLS=10, ROWS=20;
  const SHAPES={I:[[1,1,1,1]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1]],S:[[0,1,1],[1,1,0]],Z:[[1,1,0],[0,1,1]],J:[[1,0,0],[1,1,1]],L:[[0,0,1],[1,1,1]]};
  const COLORS={I:'#4cc9f0',O:'#ffd60a',T:'#a259ff',S:'#4ade80',Z:'#f72585',J:'#f97316',L:'#00b4d8'};
  const PIECES=Object.keys(SHAPES);
  let container,canvas,ctx,board,current,next,score,lines,level,gameActive,gameOver,animFrame,lastDrop,CELL;

  function start_blockdrop(cont){
    container=cont;
    const cw=container.clientWidth||320;
    const ch=container.clientHeight||600;
    // Reserve ~160px for controls below board
    const controlsH=160;
    const availH=ch-controlsH-16;
    const availW=cw-16;
    CELL=Math.floor(Math.min(availW/COLS, availH/ROWS));
    if(CELL<12)CELL=12; if(CELL>28)CELL=28;
    const W=COLS*CELL, H=ROWS*CELL;

    container.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;height:100%;background:#0a0a0f;gap:6px;padding:8px;box-sizing:border-box;">
        <div style="display:flex;align-items:flex-start;justify-content:center;gap:10px;flex-shrink:0;">
          <canvas id="bd-canvas" width="${W}" height="${H}" style="border:2px solid #2a2a3e;border-radius:8px;flex-shrink:0;display:block;"></canvas>
          <div style="display:flex;flex-direction:column;gap:8px;padding-top:4px;min-width:72px;">
            <div>
              <div style="font:500 9px/1 'DM Mono',monospace;color:#ffffff33;letter-spacing:1px;">SCORE</div>
              <div id="bd-score" style="font:700 16px/1 'Bebas Neue',sans-serif;color:#fff;">0</div>
            </div>
            <div>
              <div style="font:500 9px/1 'DM Mono',monospace;color:#ffffff33;letter-spacing:1px;">LINES</div>
              <div id="bd-lines" style="font:700 16px/1 'Bebas Neue',sans-serif;color:#4cc9f0;">0</div>
            </div>
            <div>
              <div style="font:500 9px/1 'DM Mono',monospace;color:#ffffff33;letter-spacing:1px;">LEVEL</div>
              <div id="bd-level" style="font:700 16px/1 'Bebas Neue',sans-serif;color:#ffd60a;">1</div>
            </div>
            <div>
              <div style="font:500 9px/1 'DM Mono',monospace;color:#ffffff33;letter-spacing:1px;">NEXT</div>
              <canvas id="bd-next" width="64" height="64" style="border:1px solid #2a2a3e;border-radius:5px;display:block;"></canvas>
            </div>
          </div>
        </div>
        <!-- CONTROLS BELOW BOARD -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;max-width:320px;flex-shrink:0;">
          <div style="display:flex;align-items:center;gap:8px;justify-content:center;width:100%;">
            <button id="bd-left" style="width:62px;height:54px;background:#1e1e3e;border:2px solid #3a3a5a;border-radius:10px;color:#fff;font-size:22px;cursor:pointer;transition:background .1s;-webkit-tap-highlight-color:transparent;">◄</button>
            <button id="bd-rot" style="width:76px;height:54px;background:#2a1a4e;border:2px solid #7a4aaa;border-radius:10px;color:#c084fc;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:1px;-webkit-tap-highlight-color:transparent;">↻ ROT</button>
            <button id="bd-right" style="width:62px;height:54px;background:#1e1e3e;border:2px solid #3a3a5a;border-radius:10px;color:#fff;font-size:22px;cursor:pointer;transition:background .1s;-webkit-tap-highlight-color:transparent;">►</button>
          </div>
          <div style="display:flex;gap:8px;justify-content:center;width:100%;">
            <button id="bd-softdown" style="flex:1;height:50px;background:#1a2a1e;border:2px solid #3a5a3a;border-radius:10px;color:#4ade80;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:1px;-webkit-tap-highlight-color:transparent;">▼ SOFT</button>
            <button id="bd-down" style="flex:1;height:50px;background:#2a0a1e;border:2px solid #a259ff;border-radius:10px;color:#a259ff;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:1px;-webkit-tap-highlight-color:transparent;">⬇ HARD</button>
          </div>
        </div>
      </div>`;

    canvas=container.querySelector('#bd-canvas');
    ctx=canvas.getContext('2d');
    document.addEventListener('keydown',onKey);

    const btns=[
      ['bd-rot',   ()=>rotate()],
      ['bd-left',  ()=>move(-1)],
      ['bd-right', ()=>move(1)],
      ['bd-softdown',()=>softDrop()],
      ['bd-down',  ()=>hardDrop()],
    ];
    btns.forEach(([id,fn])=>{
      const el=container.querySelector(`#${id}`);
      el.addEventListener('pointerdown',e=>{e.preventDefault();fn();el.style.opacity='0.65';});
      el.addEventListener('pointerup',()=>{el.style.opacity='1';});
      el.addEventListener('pointerleave',()=>{el.style.opacity='1';});
    });
    startGame();
  }

  function stop_blockdrop(){cancelAnimationFrame(animFrame);animFrame=null;document.removeEventListener('keydown',onKey);container=null;}

  function startGame(){
    cancelAnimationFrame(animFrame);animFrame=null;
    board=Array.from({length:ROWS},()=>Array(COLS).fill(null));
    score=0;lines=0;level=1;gameActive=true;gameOver=false;lastDrop=0;
    next=randomPiece();spawnPiece();window.setShellScore(0);updateHUD();
    animFrame=requestAnimationFrame(loop);
  }

  function randomPiece(){const k=PIECES[Math.floor(Math.random()*PIECES.length)];return{key:k,shape:SHAPES[k].map(r=>[...r]),color:COLORS[k],x:Math.floor(COLS/2)-1,y:0};}
  function spawnPiece(){current={...next,x:Math.floor(COLS/2)-Math.floor(next.shape[0].length/2),y:0,shape:next.shape.map(r=>[...r])};next=randomPiece();drawNext();if(collision(current,0,0))endGame();}

  function loop(ts=0){
    if(!container||!gameActive)return;
    const interval=Math.max(80,500-level*40);
    if(ts-lastDrop>interval){lastDrop=ts;drop();}
    draw();animFrame=requestAnimationFrame(loop);
  }

  function drop(){if(!collision(current,0,1)){current.y++;}else{place();clearLines();spawnPiece();}}
  function softDrop(){if(!gameActive)return;if(!collision(current,0,1)){current.y++;lastDrop=performance.now();}else{place();clearLines();spawnPiece();}}
  function hardDrop(){if(!gameActive)return;while(!collision(current,0,1))current.y++;place();clearLines();spawnPiece();lastDrop=performance.now();}
  function move(dx){if(gameActive&&!collision(current,dx,0))current.x+=dx;}
  function rotate(){
    if(!gameActive)return;
    const rotated=current.shape[0].map((_,i)=>current.shape.map(r=>r[i]).reverse());
    const old=current.shape; current.shape=rotated;
    if(collision(current,0,0)){
      if(!collision(current,1,0)){current.x+=1;}
      else if(!collision(current,-1,0)){current.x-=1;}
      else{current.shape=old;}
    }
  }
  function collision(piece,dx,dy){
    return piece.shape.some((row,r)=>row.some((v,c)=>{
      if(!v)return false;
      const nx=piece.x+c+dx,ny=piece.y+r+dy;
      return nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&board[ny][nx]);
    }));
  }
  function place(){current.shape.forEach((row,r)=>row.forEach((v,c)=>{if(v&&current.y+r>=0)board[current.y+r][current.x+c]=current.color;}));}
  function clearLines(){
    let cleared=0;
    for(let r=ROWS-1;r>=0;){if(board[r].every(c=>c)){board.splice(r,1);board.unshift(Array(COLS).fill(null));cleared++;}else r--;}
    if(cleared){const pts=[0,100,300,500,800][cleared]*level;score+=pts;lines+=cleared;level=Math.floor(lines/10)+1;window.setShellScore(score);updateHUD();}
  }
  function updateHUD(){
    if(!container)return;
    const s=container.querySelector('#bd-score'),l=container.querySelector('#bd-lines'),lv=container.querySelector('#bd-level');
    if(s)s.textContent=score;if(l)l.textContent=lines;if(lv)lv.textContent=level;
  }
  function drawNext(){
    const nc=container&&container.querySelector('#bd-next');if(!nc)return;
    const c=nc.getContext('2d');c.fillStyle='#0a0a0f';c.fillRect(0,0,64,64);
    const cs=12,ox=Math.floor((4-next.shape[0].length)/2)*cs+8,oy=Math.floor((4-next.shape.length)/2)*cs+8;
    next.shape.forEach((row,r)=>row.forEach((v,col)=>{if(v){c.fillStyle=next.color;c.fillRect(ox+col*cs+1,oy+r*cs+1,cs-2,cs-2);}}));
  }
  function draw(){
    if(!ctx)return;
    const W=COLS*CELL,H=ROWS*CELL;
    ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#ffffff06';ctx.lineWidth=1;
    for(let r=0;r<ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(W,r*CELL);ctx.stroke();}
    for(let c=0;c<COLS;c++){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,H);ctx.stroke();}
    board.forEach((row,r)=>row.forEach((color,c)=>{if(color){ctx.fillStyle=color;ctx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);ctx.fillStyle='#ffffff18';ctx.fillRect(c*CELL+1,r*CELL+1,CELL-2,4);}}));
    if(current&&gameActive){
      let ghost={...current,y:current.y,shape:current.shape.map(r=>[...r])};
      while(!collision(ghost,0,1))ghost.y++;
      ghost.shape.forEach((row,r)=>row.forEach((v,c)=>{if(v){ctx.fillStyle=current.color+'2a';ctx.fillRect((ghost.x+c)*CELL+1,(ghost.y+r)*CELL+1,CELL-2,CELL-2);}}));
      ctx.fillStyle=current.color;
      current.shape.forEach((row,r)=>row.forEach((v,c)=>{if(v&&current.y+r>=0){ctx.fillRect((current.x+c)*CELL+1,(current.y+r)*CELL+1,CELL-2,CELL-2);ctx.fillStyle='#ffffff25';ctx.fillRect((current.x+c)*CELL+1,(current.y+r)*CELL+1,CELL-2,4);ctx.fillStyle=current.color;}}));
    }
  }
  function endGame(){
    gameActive=false;cancelAnimationFrame(animFrame);animFrame=null;
    if(!container)return;
    const best=Store.get('arcade_blockdrop_highscore',0);if(score>best)Store.set('arcade_blockdrop_highscore',score);
    ctx.fillStyle='#000000cc';ctx.fillRect(0,0,COLS*CELL,ROWS*CELL);
    ctx.fillStyle='#f72585';ctx.font=`bold ${CELL*1.1}px 'Bebas Neue',sans-serif`;ctx.textAlign='center';
    ctx.fillText('GAME OVER',COLS*CELL/2,ROWS*CELL/2-18);
    ctx.fillStyle='#fff';ctx.font=`${CELL*0.55}px 'DM Sans',sans-serif`;
    ctx.fillText(`Score: ${score}  Lines: ${lines}`,COLS*CELL/2,ROWS*CELL/2+14);
    ctx.fillStyle='#ffffff44';ctx.font=`${CELL*0.45}px 'DM Sans',sans-serif`;
    ctx.fillText('SPACE to restart',COLS*CELL/2,ROWS*CELL/2+38);
    gameOver=true;
  }
  function onKey(e){
    if(!container)return;
    if(e.key===' '){e.preventDefault();if(!gameActive){startGame();return;}}
    if(!gameActive)return;
    if(e.key==='ArrowLeft'||e.key==='a'){e.preventDefault();move(-1);}
    if(e.key==='ArrowRight'||e.key==='d'){e.preventDefault();move(1);}
    if(e.key==='ArrowDown'||e.key==='s'){e.preventDefault();softDrop();}
    if(e.key==='ArrowUp'||e.key==='w'||e.key==='x'){e.preventDefault();rotate();}
    if(e.key==='Shift'||e.key==='Enter'){e.preventDefault();hardDrop();}
  }

  window.start_blockdrop=start_blockdrop;
  window.stop_blockdrop=stop_blockdrop;
})();
