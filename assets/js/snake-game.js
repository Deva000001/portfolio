/* ============================================================
   Snake Game — Canvas engine
   Self-contained IIFE. Reads/writes localStorage for high score.
   No dependencies on other files.
   ============================================================ */


(function(){
  const canvas = document.getElementById('snakeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLS = 22, ROWS = 22;
  let cell = 0;

  const scoreEl = document.getElementById('snakeScore');
  const highEl = document.getElementById('snakeHigh');
  const startBtn = document.getElementById('snakeStartBtn');
  const pauseBtn = document.getElementById('snakePauseBtn');
  const restartBtn = document.getElementById('snakeRestartBtn');
  const overlay = document.getElementById('snakeOverlay');
  const overlayStart = document.getElementById('snakeOverlayStart');
  const gameOverEl = document.getElementById('snakeGameOver');
  const gameOverRestart = document.getElementById('snakeGameOverRestart');
  const finalScoreEl = document.getElementById('snakeFinalScore');
  const newHighEl = document.getElementById('snakeNewHigh');

  let snake, dir, nextDir, food, score, high, running, paused, over, baseSpeed, speed, lastTick, rafId, particles;

  function loadHigh(){
    try { return parseInt(localStorage.getItem('snakeHighScore') || '0', 10) || 0; }
    catch(e){ return 0; }
  }
  function saveHigh(v){
    try { localStorage.setItem('snakeHighScore', String(v)); } catch(e){}
  }
  high = loadHigh();
  highEl.textContent = high;

  function resizeCanvas(){
    const shell = canvas.parentElement;
    const size = Math.floor(shell.clientWidth);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cell = size / COLS;
    if (!running) draw();
  }

  function resetState(){
    const mid = Math.floor(COLS/2);
    snake = [{x:mid,y:mid},{x:mid-1,y:mid},{x:mid-2,y:mid}];
    dir = {x:1,y:0};
    nextDir = {x:1,y:0};
    score = 0;
    baseSpeed = 130;
    speed = baseSpeed;
    over = false;
    paused = false;
    particles = [];
    scoreEl.textContent = '0';
    placeFood();
  }

  function placeFood(){
    let valid = false, fx, fy;
    while(!valid){
      fx = Math.floor(Math.random()*COLS);
      fy = Math.floor(Math.random()*ROWS);
      valid = !snake.some(s => s.x === fx && s.y === fy);
    }
    food = {x:fx, y:fy, pulse:0};
  }

  function spawnParticles(x,y){
    const cx = (x+0.5)*cell, cy = (y+0.5)*cell;
    for(let i=0;i<10;i++){
      const a = (Math.PI*2*i)/10;
      particles.push({
        x:cx, y:cy,
        vx:Math.cos(a)*1.6, vy:Math.sin(a)*1.6,
        life:1
      });
    }
  }

  function update(){
    dir = nextDir;
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snake.some(s => s.x===head.x && s.y===head.y)){
      endGame();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y){
      score++;
      scoreEl.textContent = score;
      spawnParticles(food.x, food.y);
      speed = Math.max(55, baseSpeed - score*4);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function draw(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0,0,w,h);

    // subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for(let i=1;i<COLS;i++){
      ctx.beginPath(); ctx.moveTo(i*cell,0); ctx.lineTo(i*cell,h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*cell); ctx.lineTo(w,i*cell); ctx.stroke();
    }

    // food glow
    if (food){
      food.pulse = (food.pulse + 0.12) % (Math.PI*2);
      const pulseR = 1 + Math.sin(food.pulse)*0.18;
      const fx = (food.x+0.5)*cell, fy = (food.y+0.5)*cell;
      const grad = ctx.createRadialGradient(fx,fy,0,fx,fy,cell*1.6);
      grad.addColorStop(0,'rgba(139,92,246,0.55)');
      grad.addColorStop(1,'rgba(139,92,246,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(fx,fy,cell*1.6,0,Math.PI*2); ctx.fill();

      ctx.fillStyle = '#c9b6ff';
      ctx.beginPath(); ctx.arc(fx,fy,(cell*0.32)*pulseR,0,Math.PI*2); ctx.fill();
    }

    // particles
    particles.forEach(p => {
      ctx.fillStyle = `rgba(91,139,255,${Math.max(p.life,0)})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,2.2,0,Math.PI*2); ctx.fill();
    });

    // snake
    snake.forEach((s,i) => {
      const t = i / Math.max(snake.length-1,1);
      const r = Math.round(91 + (139-91)*t);
      const g = Math.round(139 + (92-139)*t);
      const b = Math.round(255 + (246-255)*t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const pad = i===0 ? 1 : 1.5;
      const rad = i===0 ? 7 : 5;
      roundRect(ctx, s.x*cell+pad, s.y*cell+pad, cell-pad*2, cell-pad*2, rad);
      ctx.fill();
      if (i===0){
        ctx.fillStyle = '#0b0c10';
        const ex = dir.x, ey = dir.y;
        const cx = s.x*cell + cell/2, cy = s.y*cell + cell/2;
        const off = cell*0.18;
        ctx.beginPath();
        ctx.arc(cx + ex*off - ey*off*0.6, cy + ey*off + ex*off*0.6, cell*0.08, 0, Math.PI*2);
        ctx.arc(cx + ex*off + ey*off*0.6, cy + ey*off - ex*off*0.6, cell*0.08, 0, Math.PI*2);
        ctx.fill();
      }
    });
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function tick(ts){
    if (!running || paused){ return; }
    if (!lastTick) lastTick = ts;
    const elapsed = ts - lastTick;
    if (elapsed > speed){
      lastTick = ts;
      update();
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.06; });
      particles = particles.filter(p => p.life > 0);
      if (over) return;
    } else {
      particles.forEach(p => { p.x += p.vx*0.3; p.y += p.vy*0.3; });
    }
    draw();
    rafId = requestAnimationFrame(tick);
  }

  function startGame(){
    resetState();
    running = true;
    over = false;
    lastTick = 0;
    overlay.style.display = 'none';
    gameOverEl.style.display = 'none';
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    resizeCanvas();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function togglePause(){
    if (!running || over) return;
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if (!paused){
      lastTick = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  function endGame(){
    running = false;
    over = true;
    cancelAnimationFrame(rafId);
    finalScoreEl.textContent = score;
    let isNew = false;
    if (score > high){
      high = score;
      saveHigh(high);
      highEl.textContent = high;
      isNew = true;
    }
    newHighEl.style.display = isNew ? 'block' : 'none';
    gameOverEl.style.display = 'flex';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    draw();
  }

  function setDir(x,y){
    if (!running || paused) return;
    if (dir.x === -x && dir.y === -y) return; // no reverse
    nextDir = {x,y};
  }

  // keyboard
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k)){
      if (canvas.getBoundingClientRect().top < window.innerHeight && canvas.getBoundingClientRect().bottom > 0){
        e.preventDefault();
      }
    }
    if (k === 'arrowup' || k === 'w') setDir(0,-1);
    else if (k === 'arrowdown' || k === 's') setDir(0,1);
    else if (k === 'arrowleft' || k === 'a') setDir(-1,0);
    else if (k === 'arrowright' || k === 'd') setDir(1,0);
    else if (k === ' ') togglePause();
  }, {passive:false});

  // touch swipe
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStartX = t.clientX; touchStartY = t.clientY;
  }, {passive:true});
  canvas.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
  }, {passive:true});

  startBtn.addEventListener('click', startGame);
  overlayStart.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  gameOverRestart.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);

  window.addEventListener('resize', () => { resizeCanvas(); });

  // initial paint
  resetState();
  resizeCanvas();
  draw();
})();
