/* ============================================================
   Roach Swarm — small procedural "creatures" that randomly
   spawn at screen edges, skitter around erratically, flee the
   cursor when it gets close, and despawn after a while.

   Rendered in the same holographic wireframe language as the
   dragon (glow, blue/purple tokens) rather than literally
   brown/gross, so it stays on-brand rather than reading as an
   actual pest on the page.

   INDEPENDENCE GUARANTEE — same rules as dragon-companion.js:
     - own canvas, styled entirely from JS, pointer-events:none
     - never preventDefault/stopPropagation, never blocks clicks
     - touches no existing DOM node
     - disables itself on touch devices / prefers-reduced-motion
     - to remove entirely: delete the <script> tag that loads it
   ============================================================ */

(function RoachSwarm() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (prefersReducedMotion || isCoarsePointer) return;

  /* ---------------------------------------------------------
     Config
  --------------------------------------------------------- */
  const CFG = {
    maxAlive: 5,
    spawnEveryMinMs: 3500,
    spawnEveryMaxMs: 9000,
    bodyLength: 9,
    bodyWidth: 5,
    legSpan: 7,
    baseSpeed: 1.1,
    fleeSpeed: 3.4,
    fleeRadius: 130,      // cursor proximity that triggers a flee burst
    wanderTurnRate: 0.35, // max random turn per direction change
    freezeChance: 0.006,  // per-frame chance to pause mid-scurry
    lifespanMs: 14000,    // despawns (fades) after this long if not clicked
    dpiCap: 1.5
  };

  const rootStyles = getComputedStyle(document.documentElement);
  const COLOR = {
    core: (rootStyles.getPropertyValue('--blue-soft') || '#5b8bff').trim(),
    edge: (rootStyles.getPropertyValue('--blue') || '#2f6fff').trim(),
    accent: (rootStyles.getPropertyValue('--purple') || '#8b5cf6').trim()
  };

  /* ---------------------------------------------------------
     Canvas
  --------------------------------------------------------- */
  const canvas = document.createElement('canvas');
  canvas.id = 'roach-swarm-canvas';
  Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '44', mixBlendMode: 'screen'
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let dpr = Math.min(window.devicePixelRatio || 1, CFG.dpiCap);
  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, CFG.dpiCap);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  /* ---------------------------------------------------------
     Pointer tracking (read-only, passive)
  --------------------------------------------------------- */
  const pointer = { x: -9999, y: -9999 };
  window.addEventListener('mousemove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    // Clicking near a roach makes it bolt away fast, then despawn —
    // a small reward for interacting rather than an actual "squish."
    for (const r of roaches) {
      if (!r.alive) continue;
      if (Math.hypot(r.x - e.clientX, r.y - e.clientY) < 22) {
        r.angle = Math.atan2(r.y - e.clientY, r.x - e.clientX);
        r.fleeUntil = performance.now() + 500;
        r.despawnAt = performance.now() + 550;
        spawnPoof(r.x, r.y);
      }
    }
  }, { passive: true });

  /* ---------------------------------------------------------
     Tiny particle poof (click reaction), fixed-size pool
  --------------------------------------------------------- */
  const MAX_PARTICLES = 30;
  const particles = Array.from({ length: MAX_PARTICLES }, () => ({ active: false }));
  function spawnPoof(x, y) {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < 8; i++) {
      const p = particles[i];
      if (p.active) continue;
      const a = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.4;
      Object.assign(p, {
        active: true, x, y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 1, decay: 0.04 + Math.random() * 0.03, size: 1 + Math.random() * 1.5
      });
      spawned++;
    }
  }
  function updateParticles() {
    for (const p of particles) {
      if (!p.active) continue;
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.9; p.vy *= 0.9;
      p.life -= p.decay;
      if (p.life <= 0) p.active = false;
    }
  }
  function drawParticles() {
    for (const p of particles) {
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = COLOR.core;
      ctx.shadowColor = COLOR.accent;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------
     Roaches
  --------------------------------------------------------- */
  const roaches = [];
  let nextSpawnAt = performance.now() + 1200;

  function edgeSpawnPoint() {
    const side = Math.floor(Math.random() * 4);
    const w = window.innerWidth, h = window.innerHeight;
    if (side === 0) return { x: -10, y: Math.random() * h, angle: 0 };
    if (side === 1) return { x: w + 10, y: Math.random() * h, angle: Math.PI };
    if (side === 2) return { x: Math.random() * w, y: -10, angle: Math.PI / 2 };
    return { x: Math.random() * w, y: h + 10, angle: -Math.PI / 2 };
  }

  function spawnRoach() {
    const p = edgeSpawnPoint();
    roaches.push({
      x: p.x, y: p.y, angle: p.angle,
      legPhase: Math.random() * Math.PI * 2,
      alive: true, opacity: 0,
      fleeUntil: 0,
      spawnedAt: performance.now(),
      despawnAt: performance.now() + CFG.lifespanMs,
      frozenUntil: 0
    });
  }

  function updateRoaches(now) {
    if (now > nextSpawnAt && roaches.filter(r => r.alive).length < CFG.maxAlive) {
      spawnRoach();
      nextSpawnAt = now + CFG.spawnEveryMinMs + Math.random() * (CFG.spawnEveryMaxMs - CFG.spawnEveryMinMs);
    }

    for (let i = roaches.length - 1; i >= 0; i--) {
      const r = roaches[i];

      // fade in, then fade out near despawn / after being clicked
      const age = now - r.spawnedAt;
      const timeLeft = r.despawnAt - now;
      r.opacity = Math.min(1, age / 300, Math.max(0, timeLeft / 400));
      if (timeLeft <= 0) { roaches.splice(i, 1); continue; }

      const fleeing = now < r.fleeUntil || Math.hypot(r.x - pointer.x, r.y - pointer.y) < CFG.fleeRadius;
      if (fleeing && now >= r.fleeUntil) {
        // start a flee burst away from the cursor
        r.angle = Math.atan2(r.y - pointer.y, r.x - pointer.x) + (Math.random() - 0.5) * 0.6;
        r.fleeUntil = now + 260 + Math.random() * 200;
      }

      // freeze-then-dart pattern: real skittish movement, not a smooth glide
      if (now < r.frozenUntil) {
        // holding still
      } else if (!fleeing && Math.random() < CFG.freezeChance) {
        r.frozenUntil = now + 200 + Math.random() * 500;
      } else {
        if (!fleeing && Math.random() < 0.04) {
          r.angle += (Math.random() - 0.5) * CFG.wanderTurnRate * 4;
        }
        const speed = fleeing ? CFG.fleeSpeed : CFG.baseSpeed;
        r.x += Math.cos(r.angle) * speed;
        r.y += Math.sin(r.angle) * speed;
        r.legPhase += speed * 0.9;
      }

      // wrap despawn if it wanders far off-screen
      const margin = 40;
      if (r.x < -margin || r.x > window.innerWidth + margin ||
          r.y < -margin || r.y > window.innerHeight + margin) {
        r.despawnAt = Math.min(r.despawnAt, now + 1);
      }
    }
  }

  /* ---------------------------------------------------------
     Rendering — small glowing wireframe body, skittering legs
  --------------------------------------------------------- */
  function drawRoach(r) {
    ctx.save();
    ctx.globalAlpha = r.opacity;
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);

    ctx.shadowColor = COLOR.accent;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = COLOR.core;
    ctx.fillStyle = 'rgba(10,10,14,0.6)';
    ctx.lineWidth = 1;

    // body — simple elongated oval outline
    ctx.beginPath();
    ctx.ellipse(0, 0, CFG.bodyLength, CFG.bodyWidth, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // antennae
    ctx.beginPath();
    ctx.moveTo(CFG.bodyLength * 0.8, -1.5);
    ctx.lineTo(CFG.bodyLength * 1.6, -5);
    ctx.moveTo(CFG.bodyLength * 0.8, 1.5);
    ctx.lineTo(CFG.bodyLength * 1.6, 5);
    ctx.stroke();

    // legs — 3 pairs, animated with a simple alternating phase
    for (let i = 0; i < 3; i++) {
      const lx = -CFG.bodyLength * 0.5 + i * CFG.bodyLength * 0.55;
      const swing = Math.sin(r.legPhase + i * 2.1) * 4;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(lx, side * CFG.bodyWidth * 0.6);
        ctx.lineTo(lx + swing * 0.4, side * (CFG.bodyWidth + CFG.legSpan));
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const r of roaches) drawRoach(r);
    drawParticles();
  }

  /* ---------------------------------------------------------
     Main loop
  --------------------------------------------------------- */
  function tick(now) {
    if (!document.hidden) {
      updateRoaches(now);
      updateParticles();
      render();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
