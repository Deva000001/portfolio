/* ============================================================
   Dragon Companion — a procedurally-animated holographic
   skeletal dragon that lives above the page and chases the
   cursor.

   INDEPENDENCE GUARANTEE
   -----------------------------------------------------------
   This file is fully self-contained. It:
     - creates its own <canvas>, appends it to <body>, and
       styles it entirely from JS (no CSS file edits needed)
     - reads colors from the page's CSS custom properties
       (--blue, --blue-soft, --purple) so it matches the site,
       but falls back to hard-coded values if those vars are
       ever renamed, so it never throws
     - never calls preventDefault / stopPropagation, never
       listens with { capture: true } in a way that would
       swallow events, and the canvas has pointer-events:none
       so it can NEVER intercept a click, hover, or scroll
     - does not touch, query-select-and-mutate, or remove any
       existing DOM node except to read .project-card bounding
       boxes (read-only) for the "curiosity" behavior
     - disables itself completely (no canvas, no listeners) on
       touch devices and when prefers-reduced-motion is set

   If anything about the page ever needs the dragon gone, the
   only line to remove is the <script> tag that loads this file.
   ============================================================ */

(function DragonCompanion() {
  'use strict';

  /* ---------------------------------------------------------
     0. Bail out entirely on touch devices / reduced motion.
     A cursor-chasing creature has nothing to chase without a
     real pointer, and reduced-motion users asked for calm UI.
  --------------------------------------------------------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (prefersReducedMotion || isCoarsePointer) return;

  /* ---------------------------------------------------------
     1. Config — tweak here to customize without touching logic.
  --------------------------------------------------------- */
  const CFG = {
    segmentCount: 26,        // spine joints, head → tail tip
    segmentLength: 13,       // px between joints
    maxTurnPerJoint: 0.30,   // radians; lower = stiffer spine
    headEase: 0.14,          // how eagerly the head chases its target
    idleAfterMs: 3000,       // ms of stillness before idle behavior
    headRadius: 15,
    tailFadeStart: 0.62,     // fraction of body where tapering to a point begins
    ribEveryN: 2,            // draw ribs every Nth body segment
    dpiCap: 1.5,             // cap devicePixelRatio for perf on retina screens
    curiousSelector: '.project-card',
    sleepAfterHiddenMs: 30000 // tab must be inactive this long before the dragon sleeps
  };

  /* ---------------------------------------------------------
     2. Colors — pull from the page's own design tokens.
  --------------------------------------------------------- */
  const rootStyles = getComputedStyle(document.documentElement);
  const COLOR = {
    core: (rootStyles.getPropertyValue('--blue-soft') || '#5b8bff').trim(),
    edge: (rootStyles.getPropertyValue('--blue') || '#2f6fff').trim(),
    accent: (rootStyles.getPropertyValue('--purple') || '#8b5cf6').trim()
  };

  /* ---------------------------------------------------------
     3. Canvas — fixed, fullscreen, click-through, styled in JS.
  --------------------------------------------------------- */
  const canvas = document.createElement('canvas');
  canvas.id = 'dragon-companion-canvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '45',            // above content & cursor-glow, below nav(1000)/modal(2000)
    mixBlendMode: 'screen'   // glows lift off the dark background instead of flattening it
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
     4. Spine chain — array of {x, y, angle}. segments[0] is
     the head; the last few taper into the tail tip.
  --------------------------------------------------------- */
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 2;
  const segments = [];
  for (let i = 0; i < CFG.segmentCount; i++) {
    segments.push({ x: startX - i * CFG.segmentLength, y: startY, angle: 0 });
  }

  // Radius taper: wide at the neck, narrowing smoothly to a point at the tail.
  function radiusAt(i) {
    const t = i / (CFG.segmentCount - 1);
    if (t < 0.12) return CFG.headRadius * (0.55 + t * 3.5);      // skull → neck flare
    if (t < CFG.tailFadeStart) return CFG.headRadius * (1 - t * 0.55);
    const tailT = (t - CFG.tailFadeStart) / (1 - CFG.tailFadeStart);
    return CFG.headRadius * (1 - CFG.tailFadeStart * 0.55) * (1 - tailT) ** 1.6;
  }

  /* ---------------------------------------------------------
     5. Pointer + behavior state.
  --------------------------------------------------------- */
  const pointer = { x: startX, y: startY };
  const headTarget = { x: startX, y: startY };
  let lastMoveTime = performance.now();
  let curiousEl = null; // element being "looked at" when hovered

  let state = 'idle';       // 'chasing' | 'idle' | 'curious' | 'sleeping'
  let idlePhase = { angle: 0, nextShiftAt: 0, offsetX: 0, offsetY: 0 };
  let breathPhase = 0;
  let tailFlickPhase = 0;
  let tailImpulse = 0;      // decays after clicks; boosts tail sway
  let blink = { active: false, until: 0, next: performance.now() + 2000 + Math.random() * 3000 };
  let headTwitch = { x: 0, y: 0, until: 0 };

  // Sleep state — the dragon dozes off if the tab has been inactive
  // (switched away from, or backgrounded) for CFG.sleepAfterHiddenMs.
  // hiddenAt marks when the tab went away; asleep flips true only once
  // the tab comes back and that absence turns out to have been long
  // enough. It wakes on the visitor's first mouse movement.
  const sleepState = { asleep: false, hiddenAt: null };
  const restSpot = { x: 60, y: window.innerHeight - 60 }; // curls up in the corner, out of the way

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sleepState.hiddenAt = performance.now();
    } else if (sleepState.hiddenAt !== null) {
      const awayFor = performance.now() - sleepState.hiddenAt;
      if (awayFor >= CFG.sleepAfterHiddenMs) {
        sleepState.asleep = true;
        restSpot.x = 60;
        restSpot.y = window.innerHeight - 60;
      }
      sleepState.hiddenAt = null;
    }
  });

  window.addEventListener('mousemove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    lastMoveTime = performance.now();
    sleepState.asleep = false; // any real cursor movement wakes it
  }, { passive: true });

  // Click reaction: particle burst + tail whip + head twitch. Non-blocking,
  // read-only w.r.t. the click's normal behavior (never calls preventDefault).
  window.addEventListener('pointerdown', (e) => {
    spawnBurst(e.clientX, e.clientY);
    tailImpulse = 1;
    headTwitch = {
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 30,
      until: performance.now() + 160
    };
  }, { passive: true });

  // Curiosity: glance toward project cards on hover. Read-only listeners.
  document.querySelectorAll(CFG.curiousSelector).forEach((el) => {
    el.addEventListener('mouseenter', () => { curiousEl = el; }, { passive: true });
    el.addEventListener('mouseleave', () => {
      if (curiousEl === el) curiousEl = null;
    }, { passive: true });
  });

  /* ---------------------------------------------------------
     6. Particle system (click burst). Fixed-size pool, no
     per-frame allocation once warmed up.
  --------------------------------------------------------- */
  const MAX_PARTICLES = 60;
  const particles = Array.from({ length: MAX_PARTICLES }, () => ({ active: false }));

  function spawnBurst(x, y) {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < 14; i++) {
      const p = particles[i];
      if (p.active) continue;
      const a = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.4;
      p.active = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed;
      p.life = 1;
      p.decay = 0.02 + Math.random() * 0.02;
      p.size = 1.5 + Math.random() * 2;
      spawned++;
    }
  }

  function updateParticles() {
    for (const p of particles) {
      if (!p.active) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= p.decay;
      if (p.life <= 0) p.active = false;
    }
  }

  function drawParticles() {
    ctx.save();
    for (const p of particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = COLOR.core;
      ctx.shadowColor = COLOR.accent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------
     7. Update loop — behavior state machine + chain physics.
  --------------------------------------------------------- */
  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function updateBehaviorState(now) {
    if (sleepState.asleep) {
      state = 'sleeping';
      return;
    }
    const stillFor = now - lastMoveTime;
    if (curiousEl) {
      state = 'curious';
    } else if (stillFor > CFG.idleAfterMs) {
      state = 'idle';
    } else {
      state = 'chasing';
    }
  }

  function updateHeadTarget(now) {
    if (state === 'sleeping') {
      // A small, slow orbit around the rest spot — the existing follow-chain
      // physics turns this into a natural, loose coil rather than needing
      // any separate "curled pose" to hand-draw.
      const orbitAngle = now * 0.00025;
      headTarget.x = restSpot.x + Math.cos(orbitAngle) * 10;
      headTarget.y = restSpot.y + Math.sin(orbitAngle) * 10;
      return;
    }

    if (state === 'curious' && curiousEl) {
      const r = curiousEl.getBoundingClientRect();
      headTarget.x = r.left + r.width / 2;
      headTarget.y = r.top + r.height * 0.35;
      return;
    }

    if (state === 'idle') {
      // Slow autonomous wandering near the last known cursor position —
      // reads as "looking around" rather than a frozen sprite.
      if (now > idlePhase.nextShiftAt) {
        idlePhase.offsetX = (Math.random() - 0.5) * 90;
        idlePhase.offsetY = (Math.random() - 0.5) * 60;
        idlePhase.nextShiftAt = now + 1400 + Math.random() * 1800;
      }
      headTarget.x = pointer.x + idlePhase.offsetX;
      headTarget.y = pointer.y + idlePhase.offsetY;
      return;
    }

    // chasing
    headTarget.x = pointer.x;
    headTarget.y = pointer.y;
  }

  function updateChain(now) {
    const ease = state === 'sleeping' ? CFG.headEase * 0.12
      : state === 'idle' ? CFG.headEase * 0.35
      : CFG.headEase;
    const twitchActive = now < headTwitch.until;
    const tx = headTarget.x + (twitchActive ? headTwitch.x : 0);
    const ty = headTarget.y + (twitchActive ? headTwitch.y : 0);

    const head = segments[0];
    head.x += (tx - head.x) * ease;
    head.y += (ty - head.y) * ease;

    const dxh = tx - head.x, dyh = ty - head.y;
    if (Math.hypot(dxh, dyh) > 0.01) head.angle = Math.atan2(dyh, dxh);

    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1];
      const cur = segments[i];
      let angle = Math.atan2(prev.y - cur.y, prev.x - cur.x);

      // Constrain how sharply each joint can bend relative to the one
      // before it — this is what makes the body curve like a spine
      // instead of kinking, and gives turns natural, weighted inertia.
      const diff = normalizeAngle(angle - prev.angle);
      const clamped = Math.max(-CFG.maxTurnPerJoint, Math.min(CFG.maxTurnPerJoint, diff));
      angle = prev.angle + clamped;

      cur.angle = angle;
      cur.x = prev.x - Math.cos(angle) * CFG.segmentLength;
      cur.y = prev.y - Math.sin(angle) * CFG.segmentLength;
    }

    // Tail sway: a lagging sine wave applied as lateral offset to the
    // rearmost segments, stronger while moving, flicking when idle,
    // whipping right after a click.
    tailFlickPhase += 0.05 + (state === 'chasing' ? 0.05 : 0);
    tailImpulse *= 0.93;
    const tailStartIdx = Math.floor(segments.length * CFG.tailFadeStart);
    for (let i = tailStartIdx; i < segments.length; i++) {
      const t = (i - tailStartIdx) / (segments.length - tailStartIdx);
      const amp = (state === 'sleeping' ? 0.4 : state === 'idle' ? 2 : 3.2) + tailImpulse * 10;
      const sway = Math.sin(tailFlickPhase - t * 2.4) * amp * t;
      const seg = segments[i];
      const perp = seg.angle + Math.PI / 2;
      seg.x += Math.cos(perp) * sway * 0.06;
      seg.y += Math.sin(perp) * sway * 0.06;
    }
  }

  function updateIdleDetails(now) {
    breathPhase += state === 'sleeping' ? 0.02 : state === 'idle' ? 0.045 : 0.02;
    if (state === 'sleeping') return; // eyes stay closed the whole time — no blink cycle needed
    if (!blink.active && now > blink.next) {
      blink.active = true;
      blink.until = now + 140;
      blink.next = now + 2500 + Math.random() * 4000;
    } else if (blink.active && now > blink.until) {
      blink.active = false;
    }
  }

  /* ---------------------------------------------------------
     8. Rendering — holographic wireframe skeleton.
  --------------------------------------------------------- */
  function strokeGlow(pathFn, width, alpha) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // outer soft glow pass
    ctx.shadowColor = COLOR.accent;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = COLOR.edge;
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = width * 2.1;
    pathFn();
    ctx.stroke();
    // crisp inner pass
    ctx.shadowBlur = 4;
    ctx.strokeStyle = COLOR.core;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    pathFn();
    ctx.stroke();
    ctx.restore();
  }

  function drawSpine() {
    strokeGlow(() => {
      ctx.beginPath();
      ctx.moveTo(segments[0].x, segments[0].y);
      for (let i = 1; i < segments.length; i++) {
        const mx = (segments[i - 1].x + segments[i].x) / 2;
        const my = (segments[i - 1].y + segments[i].y) / 2;
        ctx.quadraticCurveTo(segments[i - 1].x, segments[i - 1].y, mx, my);
      }
    }, 1.6, 0.85);
  }

  function drawRibs() {
    const breath = 1 + Math.sin(breathPhase) * (state === 'sleeping' ? 0.14 : state === 'idle' ? 0.08 : 0.03);
    for (let i = 3; i < segments.length * CFG.tailFadeStart; i += CFG.ribEveryN) {
      const seg = segments[i];
      const r = radiusAt(i) * breath;
      const perp = seg.angle + Math.PI / 2;
      const x1 = seg.x + Math.cos(perp) * r;
      const y1 = seg.y + Math.sin(perp) * r;
      const x2 = seg.x - Math.cos(perp) * r;
      const y2 = seg.y - Math.sin(perp) * r;
      strokeGlow(() => {
        ctx.beginPath();
        ctx.moveTo(seg.x, seg.y);
        ctx.lineTo(x1, y1);
        ctx.moveTo(seg.x, seg.y);
        ctx.lineTo(x2, y2);
      }, 1, 0.4);
    }
  }

  function drawHead() {
    const head = segments[0];
    const a = head.angle;
    const fwd = { x: Math.cos(a), y: Math.sin(a) };
    const perp = { x: -fwd.y, y: fwd.x };
    const r = CFG.headRadius;

    // skull outline (elongated, angular — reptilian, not cartoon-round)
    const nose = { x: head.x + fwd.x * r * 1.6, y: head.y + fwd.y * r * 1.6 };
    const jawL = { x: head.x + fwd.x * r * 0.6 + perp.x * r * 0.55, y: head.y + fwd.y * r * 0.6 + perp.y * r * 0.55 };
    const jawR = { x: head.x + fwd.x * r * 0.6 - perp.x * r * 0.55, y: head.y + fwd.y * r * 0.6 - perp.y * r * 0.55 };
    const crown = { x: head.x - fwd.x * r * 0.5, y: head.y - fwd.y * r * 0.5 };

    strokeGlow(() => {
      ctx.beginPath();
      ctx.moveTo(nose.x, nose.y);
      ctx.lineTo(jawL.x, jawL.y);
      ctx.lineTo(crown.x, crown.y);
      ctx.lineTo(jawR.x, jawR.y);
      ctx.closePath();
    }, 1.4, 0.9);

    // horns — two lines sweeping back from the crown
    const hornBase = crown;
    [-1, 1].forEach((side) => {
      const tip = {
        x: hornBase.x - fwd.x * r * 1.1 + perp.x * r * 0.5 * side,
        y: hornBase.y - fwd.y * r * 1.1 + perp.y * r * 0.5 * side
      };
      strokeGlow(() => {
        ctx.beginPath();
        ctx.moveTo(hornBase.x, hornBase.y);
        ctx.lineTo(tip.x, tip.y);
      }, 1.2, 0.75);
    });

    // eyes — glowing dots that blink, and stay closed while asleep
    const eyesClosed = blink.active || state === 'sleeping';
    [-1, 1].forEach((side) => {
      const ex = head.x + fwd.x * r * 0.35 + perp.x * r * 0.3 * side;
      const ey = head.y + fwd.y * r * 0.35 + perp.y * r * 0.3 * side;
      ctx.save();
      ctx.shadowColor = COLOR.accent;
      ctx.shadowBlur = eyesClosed ? 2 : 10;
      ctx.fillStyle = COLOR.core;
      ctx.globalAlpha = eyesClosed ? 0.15 : 1;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 2.4, eyesClosed ? 0.4 : 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function render() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawSpine();
    drawRibs();
    drawHead();
    drawParticles();
  }

  /* ---------------------------------------------------------
     9. Main loop — pauses when the tab isn't visible.
  --------------------------------------------------------- */
  function tick(now) {
    if (!document.hidden) {
      updateBehaviorState(now);
      updateHeadTarget(now);
      updateChain(now);
      updateIdleDetails(now);
      updateParticles();
      render();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();