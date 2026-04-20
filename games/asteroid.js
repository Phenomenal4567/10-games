/* ARCADE10 — Asteroid Blaster (FIXED) */
(function(){
  let container,canvas,ctx,animFrame;
  let ship,bullets,asteroids,particles,score,lives,wave,gameActive,gameOver,keys;

  function start_asteroid(cont){
    container=cont;
    container.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#0a0a0f;">
      <canvas id="ast-canvas" style="max-width:100%;max-height:100%;"></canvas>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button id="ast-left" style="width:50px;height:44px;background:#1a1a2e;border:1.5px solid #333;border-radius:8px;color:#fff;font-size:16px;cursor:pointer;">◄</button>
        <button id="ast-thrust" style="width:50px;height:44px;background:#1a1a2e;border:1.5px solid #333;border-radius:8px;color:#fff;font-size:16px;cursor:pointer;">▲</button>
        <button id="ast-fire" style="width:50px;height:44px;background:#f72585;border:none;border-radius:8px;color:#fff;font-size:16px;cursor:pointer;">🔥</button>
        <button id="ast-right" style="width:50px;height:44px;background:#1a1a2e;border:1.5px solid #333;border-radius:8px;color:#fff;font-size:16px;cursor:pointer;">►</button>
      </div>
      <button id="ast-start-btn" style="background:#4cc9f0;border:none;color:#0a0a0f;padding:10px 28px;border-radius:8px;font:700 15px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;margin-top:8px;display:none;">▶ START</button>
    </div>`;
    canvas=container.querySelector('#ast-canvas');
    ctx=canvas.getContext('2d');
    keys={};
    document.addEventListener('keydown',onKeyDown);
    document.addEventListener('keyup',onKeyUp);
    const mobileBtns={
      'ast-left':'ArrowLeft','ast-right':'ArrowRight',
      'ast-thrust':'ArrowUp','ast-fire':' '
    };
    Object.entries(mobileBtns).forEach(([id,key])=>{
      const el=container.querySelector(`#${id}`);
      el.addEventListener('pointerdown',()=>{keys[key]=true;});
      el.addEventListener('pointerup',()=>{keys[key]=false;});
      el.addEventListener('pointerleave',()=>{keys[key]=false;});
    });
    container.querySelector('#ast-start-btn').addEventListener('click', ()=>{
      container.querySelector('#ast-start-btn').style.display='none';
      startGame();
    });
    resize();
    showStart();
  }

  function stop_asteroid(){
    cancelAnimationFrame(animFrame);
    animFrame=null;
    document.removeEventListener('keydown',onKeyDown);
    document.removeEventListener('keyup',onKeyUp);
    container=null;
  }

  function resize(){
    const w=Math.min(container.clientWidth,container.clientHeight-120,500);
    canvas.width=w; canvas.height=w;
  }

  function showStart(){
    gameActive=false; gameOver=false;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#4cc9f0';ctx.font=`bold ${W*0.07}px 'Bebas Neue',sans-serif`;ctx.textAlign='center';
    ctx.fillText('ASTEROID BLASTER',W/2,H/2-30);
    ctx.fillStyle='#ffffff66';ctx.font=`${W*0.03}px 'DM Sans',sans-serif`;
    ctx.fillText('SPACE=fire  ←→=rotate  ↑=thrust',W/2,H/2+10);
    ctx.fillStyle='#ffffff33';ctx.fillText(`BEST: ${Store.get('arcade_asteroid_highscore',0)}`,W/2,H/2+40);
    ctx.fillStyle='#f7258566';ctx.fillText('Press SPACE or tap START',W/2,H/2+70);
    const btn=container&&container.querySelector('#ast-start-btn');
    if(btn)btn.style.display='inline-block';
  }

  function startGame(){
    cancelAnimationFrame(animFrame);
    animFrame=null;
    score=0; lives=3; wave=1; gameActive=true; gameOver=false;
    ship={x:canvas.width/2,y:canvas.height/2,vx:0,vy:0,angle:0,inv:120};
    bullets=[]; asteroids=[]; particles=[];
    spawnWave(wave);
    window.setShellScore(0);
    const btn=container&&container.querySelector('#ast-start-btn');
    if(btn)btn.style.display='none';
    animFrame=requestAnimationFrame(loop);
  }

  function spawnWave(w){
    const count=3+w;
    for(let i=0;i<count;i++){
      let x,y;
      do{x=Math.random()*canvas.width;y=Math.random()*canvas.height;}
      while(Math.hypot(x-ship.x,y-ship.y)<100);
      spawnAsteroid(x,y,40);
    }
  }

  function spawnAsteroid(x,y,r,vx,vy){
    const speed=1.5+Math.random();
    const angle=Math.random()*Math.PI*2;
    asteroids.push({
      x,y,r,
      vx:vx!==undefined?vx:(Math.cos(angle)*speed),
      vy:vy!==undefined?vy:(Math.sin(angle)*speed),
      pts: r>25?20:r>12?50:100,
      verts:Array.from({length:8},(_,i)=>r*(0.7+Math.random()*0.5)*Math.cos(i/8*Math.PI*2)),
      vertsY:Array.from({length:8},(_,i)=>r*(0.7+Math.random()*0.5)*Math.sin(i/8*Math.PI*2)),
    });
  }

  let lastFire=0;
  function loop(ts=0){
    if(!container||!gameActive)return;
    update(ts); draw();
    animFrame=requestAnimationFrame(loop);
  }

  function update(ts){
    const W=canvas.width,H=canvas.height;
    if(keys['ArrowLeft']||keys['a'])ship.angle-=0.05;
    if(keys['ArrowRight']||keys['d'])ship.angle+=0.05;
    if(keys['ArrowUp']||keys['w']){
      ship.vx+=Math.cos(ship.angle-Math.PI/2)*0.25;
      ship.vy+=Math.sin(ship.angle-Math.PI/2)*0.25;
    }
    ship.vx*=0.98; ship.vy*=0.98;
    ship.x=(ship.x+ship.vx+W)%W; ship.y=(ship.y+ship.vy+H)%H;
    if(ship.inv>0)ship.inv--;
    // FIX: only fire when game is active (prevents firing on restart)
    if((keys[' ']||keys['z'])&&ts-lastFire>300&&gameActive){
      lastFire=ts;
      const bx=ship.x+Math.cos(ship.angle-Math.PI/2)*18;
      const by=ship.y+Math.sin(ship.angle-Math.PI/2)*18;
      bullets.push({x:bx,y:by,vx:Math.cos(ship.angle-Math.PI/2)*8,vy:Math.sin(ship.angle-Math.PI/2)*8,life:60});
    }
    bullets.forEach(b=>{b.x=(b.x+b.vx+W)%W;b.y=(b.y+b.vy+H)%H;b.life--;});
    bullets=bullets.filter(b=>b.life>0);
    asteroids.forEach(a=>{a.x=(a.x+a.vx+W)%W;a.y=(a.y+a.vy+H)%H;});
    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=0.95;p.vy*=0.95;});
    particles=particles.filter(p=>p.life>0);

    bullets.forEach(b=>{
      asteroids.forEach(a=>{
        if(Math.hypot(b.x-a.x,b.y-a.y)<a.r){
          b.life=0;
          score+=a.pts; window.setShellScore(score);
          explode(a);
          if(a.r>20){spawnAsteroid(a.x,a.y,a.r*0.55,a.vx+rand(),a.vy+rand());spawnAsteroid(a.x,a.y,a.r*0.55,a.vx-rand(),a.vy-rand());}
          a.dead=true;
        }
      });
    });
    asteroids=asteroids.filter(a=>!a.dead);

    if(ship.inv===0){
      asteroids.forEach(a=>{
        if(Math.hypot(ship.x-a.x,ship.y-a.y)<a.r+10){
          lives--;
          ship.inv=180;
          explode(ship);
          if(lives<=0)endGame();
        }
      });
    }
    if(asteroids.length===0&&gameActive){wave++;spawnWave(wave);}
  }

  function rand(){return (Math.random()-0.5)*2;}
  function explode(obj){
    for(let i=0;i<16;i++){
      const a=Math.random()*Math.PI*2;const s=1+Math.random()*3;
      particles.push({x:obj.x,y:obj.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:30+Math.random()*20,hue:Math.random()*60+20});
    }
  }

  function draw(){
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffffff22';
    for(let i=0;i<50;i++){ctx.fillRect((i*137)%W,(i*97)%H,1,1);}
    particles.forEach(p=>{
      ctx.fillStyle=`hsla(${p.hue},80%,60%,${p.life/50})`;
      ctx.fillRect(p.x-1,p.y-1,2,2);
    });
    ctx.strokeStyle='#8888ff';ctx.lineWidth=2;
    asteroids.forEach(a=>{
      ctx.save();ctx.translate(a.x,a.y);ctx.beginPath();
      a.verts.forEach((x,i)=>i?ctx.lineTo(x,a.vertsY[i]):ctx.moveTo(x,a.vertsY[i]));
      ctx.closePath();ctx.stroke();ctx.restore();
    });
    ctx.fillStyle='#ffd60a';ctx.shadowBlur=6;ctx.shadowColor='#ffd60a';
    bullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,2,0,Math.PI*2);ctx.fill();});
    ctx.shadowBlur=0;
    if(ship.inv%10<7||ship.inv===0){
      ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);
      ctx.strokeStyle=ship.inv>0?'#ffffff66':'#4cc9f0';ctx.lineWidth=2;
      ctx.shadowBlur=ship.inv>0?0:8;ctx.shadowColor='#4cc9f0';
      ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(10,12);ctx.lineTo(0,7);ctx.lineTo(-10,12);ctx.closePath();ctx.stroke();
      if(keys['ArrowUp']||keys['w']){
        ctx.strokeStyle='#f97316';ctx.beginPath();ctx.moveTo(-5,10);ctx.lineTo(0,22);ctx.lineTo(5,10);ctx.stroke();
      }
      ctx.restore();ctx.shadowBlur=0;
    }
    ctx.fillStyle='#fff';ctx.font=`bold 14px 'DM Mono',monospace`;ctx.textAlign='left';
    ctx.fillText(`WAVE ${wave}  ❤️ ${lives}`,10,20);
  }

  function endGame(){
    gameActive=false;
    cancelAnimationFrame(animFrame);
    animFrame=null;
    if(!container)return;
    const best=Store.get('arcade_asteroid_highscore',0);
    if(score>best)Store.set('arcade_asteroid_highscore',score);
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#000000aa';ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.fillStyle='#f72585';ctx.font=`bold ${W*0.08}px 'Bebas Neue',sans-serif`;
    ctx.fillText('GAME OVER',W/2,H/2-24);
    ctx.fillStyle='#fff';ctx.font=`${W*0.035}px 'DM Sans',sans-serif`;
    ctx.fillText(`Score: ${score}  Wave: ${wave}  Best: ${Math.max(score,best)}`,W/2,H/2+14);
    ctx.fillStyle='#ffffff55';ctx.font=`${W*0.028}px 'DM Sans',sans-serif`;
    ctx.fillText('SPACE or tap START to restart',W/2,H/2+46);
    gameOver=true;
    const btn=container&&container.querySelector('#ast-start-btn');
    if(btn)btn.style.display='inline-block';
  }

  function onKeyDown(e){
    if(!container)return;
    keys[e.key]=true;
    if(e.key===' '){
      e.preventDefault();
      // FIX: only start game on space if not active — don't merge fire+start
      if(!gameActive){
        // clear space key so it doesn't immediately fire
        setTimeout(()=>{keys[' ']=false;},50);
        startGame();
      }
    }
  }
  function onKeyUp(e){if(!container)return;keys[e.key]=false;}

  window.start_asteroid=start_asteroid;
  window.stop_asteroid=stop_asteroid;
})();
