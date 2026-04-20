/* ARCADE10 — Block Drop (Tetris-style) FIXED */
(function(){
  const COLS=10, ROWS=20;
  const SHAPES={
    I:[[1,1,1,1]],
    O:[[1,1],[1,1]],
    T:[[0,1,0],[1,1,1]],
    S:[[0,1,1],[1,1,0]],
    Z:[[1,1,0],[0,1,1]],
    J:[[1,0,0],[1,1,1]],
    L:[[0,0,1],[1,1,1]],
  };
  const COLORS={I:'#4cc9f0',O:'#ffd60a',T:'#a259ff',S:'#4ade80',Z:'#f72585',J:'#f97316',L:'#00b4d8'};
  const PIECES=Object.keys(SHAPES);

  let container,canvas,ctx,board,current,next,score,lines,level,gameActive,gameOver,animFrame,lastDrop,CELL;

  function start_blockdrop(cont){
    container=cont;
    // FIX: calculate cell size dynamically to fit container
    const maxW = Math.min(container.clientWidth - 110, 300);
    const maxH = Math.min(container.clientHeight - 20, 560);
    CELL = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
    if (CELL < 14) CELL = 14;
    const W=COLS*CELL, H=ROWS*CELL;
    container.innerHTML=`
      <div style="display:flex;align-items:flex-start;justify-content:center;width:100%;height:100%;background:#0a0a0f;gap:10px;padding:10px;box-sizing:border-box;">
        <canvas id="bd-canvas" width="${W}" height="${H}" style="border:2px solid #333;border-radius:8px;flex-shrink:0;"></canvas>
        <div style="display:flex;flex-direction:column;gap:10px;padding-top:4px;min-width:76px;">
          <div>
            <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff44;">SCORE</div>
            <div id="bd-score" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#fff;">0</div>
          </div>
          <div>
            <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff44;">LINES</div>
            <div id="bd-lines" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#4cc9f0;">0</div>
          </div>
          <div>
            <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff44;">LEVEL</div>
            <div id="bd-level" style="font:700 18px/1 'Bebas Neue',sans-serif;color:#ffd60a;">1</div>
          </div>
          <div>
            <div style="font:500 10px/1 'DM Mono',monospace;color:#ffffff44;">NEXT</div>
            <canvas id="bd-next" width="76" height="76" style="border:1px solid #333;border-radius:6px;"></canvas>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;margin-top:6px;">
            <button id="bd-rot" style="padding:7px;background:#1a1a2e;border:1.5px solid #333;border-radius:6px;color:#fff;font-size:13px;cursor:pointer;">↻ Rot</button>
            <div style="display:flex;gap:5px;">
              <button id="bd-left" style="flex:1;padding:7px;background:#1a1a2e;border:1.5px solid #333;border-radius:6px;color:#fff;cursor:pointer;">◄</button>
              <button id="bd-right" style="flex:1;padding:7px;background:#1a1a2e;border:1.5px solid #333;border-radius:6px;color:#fff;cursor:pointer;">►</button>
            </div>
            <button id="bd-softdown" style="padding:7px;background:#1a1a2e;border:1.5px solid #333;border-radius:6px;color:#fff;cursor:pointer;">▼ Soft</button>
            <button id="bd-down" style="padding:7px;background:#a259ff22;border:1.5px solid #a259ff;border-radius:6px;color:#a259ff;cursor:pointer;font-size:12px;">⬇ Hard</button>
          </div>
        </div>
      </div>`;
    canvas=container.querySelector('#bd-canvas');
    ctx=canvas.getContext('2d');
    document.addEventListener('keydown',onKey);
    container.querySelector('#bd-rot').addEventListener('click',()=>rotate());
    container.querySelector('#bd-left').addEventListener('click',()=>move(-1));
    container.querySelector('#bd-right').addEventListener('click',()=>move(1));
    container.querySelector('#bd-softdown').addEventListener('click',()=>softDrop());
    container.querySelector('#bd-down').addEventListener('click',()=>hardDrop());
    startGame();
  }

  function stop_blockdrop(){
    cancelAnimationFrame(animFrame);
    animFrame = null;
    document.removeEventListener('keydown',onKey);
    container=null;
  }

  function startGame(){
    cancelAnimationFrame(animFrame);
    animFrame = null;
    board=Array.from({length:ROWS},()=>Array(COLS).fill(null));
    score=0;lines=0;level=1;gameActive=true;gameOver=false;lastDrop=0;
    next=randomPiece();
    spawnPiece();
    window.setShellScore(0);
    updateHUD();
    animFrame = requestAnimationFrame(loop);
  }

  function randomPiece(){
    const k=PIECES[Math.floor(Math.random()*PIECES.length)];
    return {key:k,shape:SHAPES[k].map(r=>[...r]),color:COLORS[k],x:Math.floor(COLS/2)-1,y:0};
  }

  function spawnPiece(){
    current={...next,x:Math.floor(COLS/2)-Math.floor(next.shape[0].length/2),y:0,shape:next.shape.map(r=>[...r])};
    next=randomPiece();
    drawNext();
    if(collision(current,0,0)){endGame();}
  }

  function loop(ts=0){
    if(!container||!gameActive)return;
    const interval=Math.max(80,500-level*40);
    if(ts-lastDrop>interval){lastDrop=ts;drop();}
    draw();
    animFrame=requestAnimationFrame(loop);
  }

  function drop(){
    if(!collision(current,0,1)){current.y++;}
    else{place();clearLines();spawnPiece();}
  }

  // FIX: separate softDrop (one step down) from hardDrop (instant)
  function softDrop(){
    if(!gameActive)return;
    if(!collision(current,0,1)){current.y++;lastDrop=performance.now();}
    else{place();clearLines();spawnPiece();}
  }

  function hardDrop(){
    if(!gameActive)return;
    while(!collision(current,0,1))current.y++;
    place();clearLines();spawnPiece();
    lastDrop=performance.now();
  }

  function move(dx){if(gameActive&&!collision(current,dx,0))current.x+=dx;}

  function rotate(){
    if(!gameActive)return;
    const rotated=current.shape[0].map((_,i)=>current.shape.map(r=>r[i]).reverse());
    const old=current.shape;
    current.shape=rotated;
    // Wall kick: try offset if collision
    if(collision(current,0,0)){
      if(!collision(current,1,0)){current.x+=1;}
      else if(!collision(current,-1,0)){current.x-=1;}
      else{current.shape=old;}
    }
  }

  function collision(piece,dx,dy){
    return piece.shape.some((row,r)=>row.some((v,c)=>{
      if(!v)return false;
      const nx=piece.x+c+dx, ny=piece.y+r+dy;
      return nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&board[ny][nx]);
    }));
  }

  function place(){
    current.shape.forEach((row,r)=>row.forEach((v,c)=>{
      if(v&&current.y+r>=0)board[current.y+r][current.x+c]=current.color;
    }));
  }

  function clearLines(){
    let cleared=0;
    for(let r=ROWS-1;r>=0;){
      if(board[r].every(c=>c)){board.splice(r,1);board.unshift(Array(COLS).fill(null));cleared++;}
      else r--;
    }
    if(cleared){
      const pts=[0,100,300,500,800][cleared]*level;
      score+=pts;lines+=cleared;
      level=Math.floor(lines/10)+1;
      window.setShellScore(score);
      updateHUD();
    }
  }

  function updateHUD(){
    if(!container)return;
    const s=container.querySelector('#bd-score'),l=container.querySelector('#bd-lines'),lv=container.querySelector('#bd-level');
    if(s)s.textContent=score;if(l)l.textContent=lines;if(lv)lv.textContent=level;
  }

  function drawNext(){
    const nc=container&&container.querySelector('#bd-next');
    if(!nc)return;
    const c=nc.getContext('2d');
    c.fillStyle='#0a0a0f';c.fillRect(0,0,76,76);
    const cs=14;
    const ox=Math.floor((4-next.shape[0].length)/2)*cs+8;
    const oy=Math.floor((4-next.shape.length)/2)*cs+8;
    next.shape.forEach((row,r)=>row.forEach((v,col)=>{
      if(v){c.fillStyle=next.color;c.fillRect(ox+col*cs+1,oy+r*cs+1,cs-2,cs-2);}
    }));
  }

  function draw(){
    if(!ctx)return;
    const W=COLS*CELL,H=ROWS*CELL;
    ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#ffffff08';ctx.lineWidth=1;
    for(let r=0;r<ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(W,r*CELL);ctx.stroke();}
    for(let c=0;c<COLS;c++){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,H);ctx.stroke();}
    board.forEach((row,r)=>row.forEach((color,c)=>{
      if(color){ctx.fillStyle=color;ctx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);}
    }));
    // Ghost piece
    if(current&&gameActive){
      let ghost={...current,y:current.y,shape:current.shape.map(r=>[...r])};
      while(!collision(ghost,0,1))ghost.y++;
      ghost.shape.forEach((row,r)=>row.forEach((v,c)=>{
        if(v){ctx.fillStyle=current.color+'33';ctx.fillRect((ghost.x+c)*CELL+1,(ghost.y+r)*CELL+1,CELL-2,CELL-2);}
      }));
    }
    if(current){
      ctx.fillStyle=current.color;
      current.shape.forEach((row,r)=>row.forEach((v,c)=>{
        if(v&&current.y+r>=0)ctx.fillRect((current.x+c)*CELL+1,(current.y+r)*CELL+1,CELL-2,CELL-2);
      }));
    }
  }

  function endGame(){
    gameActive=false;cancelAnimationFrame(animFrame);animFrame=null;
    if(!container)return;
    const best=Store.get('arcade_blockdrop_highscore',0);
    if(score>best)Store.set('arcade_blockdrop_highscore',score);
    ctx.fillStyle='#000000cc';ctx.fillRect(0,0,COLS*CELL,ROWS*CELL);
    ctx.fillStyle='#f72585';ctx.font=`bold ${CELL*1.2}px 'Bebas Neue',sans-serif`;ctx.textAlign='center';
    ctx.fillText('GAME OVER',COLS*CELL/2,ROWS*CELL/2-20);
    ctx.fillStyle='#fff';ctx.font=`${CELL*0.6}px 'DM Sans',sans-serif`;
    ctx.fillText(`Score: ${score}  Lines: ${lines}`,COLS*CELL/2,ROWS*CELL/2+16);
    ctx.fillStyle='#ffffff55';ctx.font=`${CELL*0.5}px 'DM Sans',sans-serif`;
    ctx.fillText('SPACE to restart',COLS*CELL/2,ROWS*CELL/2+40);
    gameOver=true;
  }

  function onKey(e){
    if(!container)return;
    if(e.key===' '){e.preventDefault();if(!gameActive){startGame();return;}}
    if(!gameActive)return;
    if(e.key==='ArrowLeft'||e.key==='a'){e.preventDefault();move(-1);}
    if(e.key==='ArrowRight'||e.key==='d'){e.preventDefault();move(1);}
    // FIX: ArrowDown = soft drop (one step), not hard drop
    if(e.key==='ArrowDown'||e.key==='s'){e.preventDefault();softDrop();}
    if(e.key==='ArrowUp'||e.key==='w'||e.key==='x'){e.preventDefault();rotate();}
    if(e.key==='Shift'||e.key==='Enter'){e.preventDefault();hardDrop();}
  }

  window.start_blockdrop=start_blockdrop;
  window.stop_blockdrop=stop_blockdrop;
})();
