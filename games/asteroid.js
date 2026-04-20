/* ARCADE10 — Asteroid Blaster (FIXED — bigger controls, easier start, tutorial) */
(function(){
  let container,canvas,ctx,animFrame;
  let ship,bullets,asteroids,particles,score,lives,wave,gameActive,gameOver,keys;

  function start_asteroid(cont){
    container=cont;
    container.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;height:100%;background:#0a0a0f;gap:0;overflow:hidden;">
        <canvas id="ast-canvas" style="flex:1;min-height:0;max-width:100%;max-height:100%;display:block;"></canvas>
        <!-- CONTROLS -->
        <div style="display:flex;gap:8px;padding:8px 12px;align-items:center;justify-content:center;background:#0d0d18;border-top:1px solid #1a1a2e;width:100%;box-sizing:border-box;flex-shrink:0;">
          <button id="ast-left"   style="width:58px;height:52px;background:#1a1a2e;border:2px solid #2a2a4a;border-radius:10px;color:#fff;font-size:20px;cursor:pointer;-webkit-tap-highlight-color:transparent;">◄</button>
          <button id="ast-thrust" style="width:58px;height:52px;background:#1a2a1a;border:2px solid #2a4a2a;border-radius:10px;color:#4ade80;font-size:20px;cursor:pointer;-webkit-tap-highlight-color:transparent;">▲</button>
          <button id="ast-fire"   style="width:72px;height:52px;background:#3a0a20;border:2px solid #f72585;border-radius:10px;color:#f72585;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:1px;-webkit-tap-highlight-color:transparent;">🔥 FIRE</button>
          <button id="ast-right"  style="width:58px;height:52px;background:#1a1a2e;border:2px solid #2a2a4a;border-radius:10px;color:#fff;font-size:20px;cursor:pointer;-webkit-tap-highlight-color:transparent;">►</button>
        </div>
        <button id="ast-start-btn" style="display:none;background:#4cc9f0;border:none;color:#0a0a0f;padding:10px 28px;border-radius:8px;font:700 15px/1 'Bebas Neue',sans-serif;letter-spacing:2px;cursor:pointer;margin:6px;">▶ START</button>
      </div>`;
    canvas=container.querySelector('#ast-canvas');
    ctx=canvas.getContext('2d');
    keys={};
    document.addEventListener('keydown',onKeyDown);
    document.addEventListener('keyup',onKeyUp);
    const mobileBtns={'ast-left':'ArrowLeft','ast-right':'ArrowRight','ast-thrust':'ArrowUp','ast-fire':' '};
    Object.entries(mobileBtns).forEach(([id,key])=>{
      const el=container.querySelector(`#${id}`);
      el.addEventListener('pointerdown',e=>{e.preventDefault();keys[key]=true;el.style.opacity='0.65';});
      el.addEventListener('pointerup',()=>{keys[key]=false;el.style.opacity='1';});
      el.addEventListener('pointerleave',()=>{keys[key]=false;el.style.opacity='1';});
    });
    container.querySelector('#ast-start-btn').addEventListener('click',()=>{
      container.querySelector('#ast-start-btn').style.display='none';
      startGame();
    });
    resize(); showStart();
  }

  function stop_asteroid(){
    cancelAnimationFrame(animFrame);animFrame=null;
    document.removeEventListener('keydown',onKeyDown);document.removeEventListener('keyup',onKeyUp);
    container=null;
  }

  function resize(){
    // Canvas fills available space
    const w=canvas.offsetWidth||Math.min(container.clientWidth,400);
    const h=canvas.offsetHeight||300;
    const sz=Math.min(w,h,480);
    canvas.width=sz;canvas.height=sz;
  }

  function showStart(){
    gameActive=false;gameOver=false;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,W,H);
    // Stars
    ctx.fillStyle='#ffffff22';for(let i=0;i<60;i++)ctx.fillRect((i*137+i*13)%W,(i*97+i*7)%H,1,1);
    // Title
    ctx.textAlign='center';
    ctx.fillStyle='#4cc9f0';ctx.font=`bold ${W*0.08}px 'Bebas Neue',sans-serif`;
    ctx.shadowBlur=15;ctx.shadowColor='#4cc9f0';
    ctx.fillText('ASTEROID',W/2,H*0.3);ctx.fillText('BLASTER',W/2,H*0.3+W*0.09);
    ctx.shadowBlur=0;
    // Controls guide
    const lineH=W*0.033;const ty=H*0.52;
    ctx.fillStyle='#ffffff55';ctx.font=`${lineH}px 'DM Sans',sans-serif`;
    ctx.fillText('🎮 HOW TO PLAY',W/2,ty);
    ctx.fillStyle='#ffffff44';ctx.font=`${lineH*0.85}px 'DM Sans',sans-serif`;
    ctx.fillText('◄ ► — Rotate ship',W/2,ty+lineH*1.6);
    ctx.fillText('▲ — Thrust forward',W/2,ty+lineH*2.9);
    ctx.fillText('🔥 — Fire bullets',W/2,ty+lineH*4.2);
    ctx.fillText('Destroy all asteroids to advance!',W/2,ty+lineH*5.5);
    ctx.fillStyle='#ffffff22';ctx.font=`${lineH*0.75}px 'DM Mono',monospace`;
    ctx.fillText(`BEST: ${Store.get('arcade_asteroid_highscore',0)}`,W/2,H*0.93);
    ctx.fillStyle='#f72585aa';ctx.font=`${lineH}px 'DM Sans',sans-serif`;
    ctx.fillText('Tap START or press SPACE',W/2,H*0.87);
    const btn=container&&container.querySelector('#ast-start-btn');if(btn)btn.style.display='inline-block';
  }

  function startGame(){
    cancelAnimationFrame(animFrame);animFrame=null;
    score=0;lives=3;wave=1;gameActive=true;gameOver=false;
    resize();
    ship={x:canvas.width/2,y:canvas.height/2,vx:0,vy:0,angle:0,inv:120};
    bullets=[];asteroids=[];particles=[];
    spawnWave(wave);window.setShellScore(0);
    const btn=container&&container.querySelector('#ast-start-btn');if(btn)btn.style.display='none';
    animFrame=requestAnimationFrame(loop);
  }

  function spawnWave(w){
    // Wave 1: only 2 asteroids. Wave 2: 3. Then +1 per wave.
    const count=Math.min(2+Math.max(0,w-1),8);
    for(let i=0;i<count;i++){
      let x,y;
      do{x=Math.random()*canvas.width;y=Math.random()*canvas.height;}
      while(Math.hypot(x-ship.x,y-ship.y)<110);
      spawnAsteroid(x,y,38);
    }
  }

  function spawnAsteroid(x,y,r,vx,vy){
    // Speed scales gently with wave
    const speed=(0.8+Math.random()*0.7)*(1+wave*0.08);
    const angle=Math.random()*Math.PI*2;
    asteroids.push({x,y,r,
      vx:vx!==undefined?vx:Math.cos(angle)*speed,
      vy:vy!==undefined?vy:Math.sin(angle)*speed,
      pts:r>25?20:r>12?50:100,
      verts:Array.from({length:9},(_,i)=>r*(0.65+Math.random()*0.5)*Math.cos(i/9*Math.PI*2)),
      vertsY:Array.from({length:9},(_,i)=>r*(0.65+Math.random()*0.5)*Math.sin(i/9*Math.PI*2)),
    });
  }

  let lastFire=0;
  function loop(ts=0){if(!container||!gameActive)return;update(ts);draw();animFrame=requestAnimationFrame(loop);}

  function update(ts){
    const W=canvas.width,H=canvas.height;
    if(keys['ArrowLeft']||keys['a'])ship.angle-=0.05;
    if(keys['ArrowRight']||keys['d'])ship.angle+=0.05;
    if(keys['ArrowUp']||keys['w']){ship.vx+=Math.cos(ship.angle-Math.PI/2)*0.22;ship.vy+=Math.sin(ship.angle-Math.PI/2)*0.22;}
    ship.vx*=0.98;ship.vy*=0.98;
    ship.x=(ship.x+ship.vx+W)%W;ship.y=(ship.y+ship.vy+H)%H;
    if(ship.inv>0)ship.inv--;
    if((keys[' ']||keys['z'])&&ts-lastFire>280&&gameActive){
      lastFire=ts;
      const bx=ship.x+Math.cos(ship.angle-Math.PI/2)*18;
      const by=ship.y+Math.sin(ship.angle-Math.PI/2)*18;
      bullets.push({x:bx,y:by,vx:Math.cos(ship.angle-Math.PI/2)*9,vy:Math.sin(ship.angle-Math.PI/2)*9,life:65});
    }
    bullets.forEach(b=>{b.x=(b.x+b.vx+W)%W;b.y=(b.y+b.vy+H)%H;b.life--;});
    bullets=bullets.filter(b=>b.life>0);
    asteroids.forEach(a=>{a.x=(a.x+a.vx+W)%W;a.y=(a.y+a.vy+H)%H;});
    particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;p.vx*=0.94;p.vy*=0.94;});
    particles=particles.filter(p=>p.life>0);
    bullets.forEach(b=>{
      asteroids.forEach(a=>{
        if(Math.hypot(b.x-a.x,b.y-a.y)<a.r){
          b.life=0;score+=a.pts;window.setShellScore(score);explode(a);
          if(a.r>18){spawnAsteroid(a.x,a.y,a.r*0.52,a.vx+rand(),a.vy+rand());spawnAsteroid(a.x,a.y,a.r*0.52,a.vx-rand(),a.vy-rand());}
          a.dead=true;
        }
      });
    });
    asteroids=asteroids.filter(a=>!a.dead);
    if(ship.inv===0){
      asteroids.forEach(a=>{
        if(Math.hypot(ship.x-a.x,ship.y-a.y)<a.r+9){lives--;ship.inv=180;explode(ship);if(lives<=0)endGame();}
      });
    }
    if(asteroids.length===0&&gameActive){wave++;spawnWave(wave);}
  }

  function rand(){return(Math.random()-0.5)*2.2;}
  function explode(obj){for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*3.5;particles.push({x:obj.x,y:obj.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:28+Math.random()*22,hue:Math.random()*60+15});}}

  function draw(){
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,W,H);
    // Stars
    ctx.fillStyle='#ffffff18';for(let i=0;i<55;i++)ctx.fillRect((i*137)%W,(i*97)%H,1,1);
    // Particles
    particles.forEach(p=>{ctx.fillStyle=`hsla(${p.hue},80%,60%,${p.life/50})`;ctx.fillRect(p.x-1,p.y-1,2,2);});
    // Asteroids
    ctx.strokeStyle='#7a7aee';ctx.lineWidth=1.5;
    asteroids.forEach(a=>{ctx.save();ctx.translate(a.x,a.y);ctx.beginPath();a.verts.forEach((x,i)=>i?ctx.lineTo(x,a.vertsY[i]):ctx.moveTo(x,a.vertsY[i]));ctx.closePath();ctx.stroke();ctx.restore();});
    // Bullets
    ctx.fillStyle='#ffd60a';ctx.shadowBlur=8;ctx.shadowColor='#ffd60a';
    bullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,2.5,0,Math.PI*2);ctx.fill();});
    ctx.shadowBlur=0;
    // Ship
    if(ship.inv%10<7||ship.inv===0){
      ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);
      ctx.strokeStyle=ship.inv>0?'#ffffff55':'#4cc9f0';ctx.lineWidth=2;
      ctx.shadowBlur=ship.inv>0?0:10;ctx.shadowColor='#4cc9f0';
      ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(11,13);ctx.lineTo(0,8);ctx.lineTo(-11,13);ctx.closePath();ctx.stroke();
      if(keys['ArrowUp']||keys['w']){ctx.strokeStyle='#f97316';ctx.shadowColor='#f97316';ctx.shadowBlur=6;ctx.beginPath();ctx.moveTo(-5,10);ctx.lineTo(0,24);ctx.lineTo(5,10);ctx.stroke();}
      ctx.restore();ctx.shadowBlur=0;
    }
    // HUD
    ctx.fillStyle='#fff';ctx.font=`bold 13px 'DM Mono',monospace`;ctx.textAlign='left';
    ctx.fillText(`WAVE ${wave}`,10,20);
    ctx.textAlign='right';ctx.fillText(`${score}`,W-10,20);
    ctx.textAlign='left';
    // Lives as hearts
    for(let i=0;i<3;i++){ctx.fillStyle=i<lives?'#f72585':'#ffffff22';ctx.font=`14px sans-serif`;ctx.fillText('❤',10+i*20,38);}
    // Wave start hint
    if(wave===1&&asteroids.length>0&&score===0){
      ctx.fillStyle='#ffffff33';ctx.font=`11px 'DM Mono',monospace`;ctx.textAlign='center';
      ctx.fillText('Rotate ◄ ► · Thrust ▲ · Fire 🔥',W/2,H-8);
      ctx.textAlign='left';
    }
  }

  function endGame(){
    gameActive=false;cancelAnimationFrame(animFrame);animFrame=null;if(!container)return;
    const best=Store.get('arcade_asteroid_highscore',0);if(score>best)Store.set('arcade_asteroid_highscore',score);
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#000000bb';ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.fillStyle='#f72585';ctx.shadowBlur=12;ctx.shadowColor='#f72585';ctx.font=`bold ${W*0.09}px 'Bebas Neue',sans-serif`;
    ctx.fillText('GAME OVER',W/2,H/2-20);ctx.shadowBlur=0;
    ctx.fillStyle='#fff';ctx.font=`${W*0.036}px 'DM Sans',sans-serif`;
    ctx.fillText(`Score: ${score}  Wave: ${wave}`,W/2,H/2+16);
    ctx.fillStyle='#ffd60a';ctx.font=`${W*0.03}px 'DM Mono',monospace`;
    ctx.fillText(`BEST: ${Math.max(score,best)}`,W/2,H/2+42);
    ctx.fillStyle='#ffffff44';ctx.font=`${W*0.028}px 'DM Sans',sans-serif`;
    ctx.fillText('SPACE or tap START to restart',W/2,H/2+66);
    gameOver=true;const btn=container&&container.querySelector('#ast-start-btn');if(btn)btn.style.display='inline-block';
  }

  function onKeyDown(e){
    if(!container)return;keys[e.key]=true;
    if(e.key===' '){e.preventDefault();if(!gameActive){setTimeout(()=>{keys[' ']=false;},50);startGame();}}
  }
  function onKeyUp(e){if(!container)return;keys[e.key]=false;}

  window.start_asteroid=start_asteroid;
  window.stop_asteroid=stop_asteroid;
})();
