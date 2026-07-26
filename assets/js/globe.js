/* ============================================================
   Hero Globe — replaces the "DEV" placeholder inside the
   existing .portrait-inner circle with a lightweight, dependency
   -free Canvas 2D globe (no Three.js): a slowly rotating wireframe
   sphere with glass-style shading, glowing India/Italy markers,
   and a looping flight-path animation between them.

   Self-contained; does not read or modify any state from
   main.js or animations.js. Fits entirely inside the same
   270x270 circle the old text occupied.
   ============================================================ */
(function heroGlobe(){
  const canvas = document.getElementById('heroGlobe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- sizing (fixed 270x270 logical box, DPR-aware) ---------- */
  const SIZE = 270;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = SIZE / 2, cy = SIZE / 2;
  const R = SIZE * 0.36; // sphere radius, leaves margin for outer glow

  /* ---------- palette (matches existing --blue-soft / --purple) ---------- */
  const C_BLUE = '91,139,255';   // #5b8bff
  const C_PURPLE = '139,92,246'; // #8b5cf6

  /* ---------- locations ---------- */
  // Hyderabad, India and Messina/Sicily, Italy.
  const INDIA = { lat: 17.385, lon: 78.4867 };
  const ITALY = { lat: 38.19, lon: 15.554 };

  const DEG2RAD = Math.PI / 180;

  /* ---------- 3D projection helpers ---------- */
  // Simple orthographic projection of a point on a sphere rotating
  // around its vertical axis by `rotationDeg` degrees.
  function project(lat, lon, rotationDeg){
    const latRad = lat * DEG2RAD;
    const lonRad = (lon + rotationDeg) * DEG2RAD;
    const x = Math.cos(latRad) * Math.sin(lonRad);
    const y = Math.sin(latRad);
    const z = Math.cos(latRad) * Math.cos(lonRad);
    return {
      x: cx + x * R,
      y: cy - y * R,
      z,
      visible: z > 0.02
    };
  }

  /* ---------- flight state machine ---------- */
  const IDLE = 0, FLYING = 1, ARRIVED = 2, FADING = 3;
  let flightState = IDLE;
  let flightStart = 0;
  let arrivedStart = 0;
  let fadeStart = 0;
  let nextTriggerAt = 2500; // ms, first flight arrives a little sooner
  let routeAlpha = 0;

  const FLIGHT_DURATION = 2800;
  const ARRIVED_HOLD = 1600;
  const FADE_DURATION = 900;

  function randomInterval(){
    return 10000 + Math.random() * 5000; // 10-15s
  }

  /* ---------- drawing ---------- */
  function drawGlow(){
    // Soft outer blue/purple glow behind the sphere.
    const glowR = R * 1.55;
    const grad = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, glowR);
    grad.addColorStop(0, `rgba(${C_BLUE},0.28)`);
    grad.addColorStop(0.6, `rgba(${C_PURPLE},0.14)`);
    grad.addColorStop(1, `rgba(${C_PURPLE},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSphereBody(){
    // Glassy sphere fill: soft highlight upper-left, darker toward the rim.
    const grad = ctx.createRadialGradient(
      cx - R * 0.35, cy - R * 0.4, R * 0.1,
      cx, cy, R * 1.05
    );
    grad.addColorStop(0, 'rgba(120,150,255,0.16)');
    grad.addColorStop(0.55, 'rgba(30,32,45,0.30)');
    grad.addColorStop(1, 'rgba(10,10,14,0.55)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // Thin glowing rim.
    ctx.strokeStyle = `rgba(${C_BLUE},0.55)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawGrid(rotationDeg){
    ctx.lineWidth = 1;

    // Meridians (lines of longitude), every 30 degrees.
    for (let lon = 0; lon < 360; lon += 30){
      ctx.strokeStyle = `rgba(${C_BLUE},0.16)`;
      ctx.beginPath();
      let started = false;
      for (let lat = -90; lat <= 90; lat += 4){
        const p = project(lat, lon, rotationDeg);
        if (!p.visible){ started = false; continue; }
        if (!started){ ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Parallels (lines of latitude), every 30 degrees (skip poles).
    for (let lat = -60; lat <= 60; lat += 30){
      ctx.strokeStyle = `rgba(${C_PURPLE},0.16)`;
      ctx.beginPath();
      let started = false;
      for (let lon = 0; lon <= 360; lon += 4){
        const p = project(lat, lon, rotationDeg);
        if (!p.visible){ started = false; continue; }
        if (!started){ ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  function drawMarker(point, glowBoost, label){
    if (!point.visible) return;
    const pulse = 0.65 + Math.sin(Date.now() / 700) * 0.2;
    const intensity = Math.min(1, pulse + glowBoost);

    const glowR = 9 + glowBoost * 6;
    const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, glowR);
    grad.addColorStop(0, `rgba(${C_BLUE},${0.55 * intensity})`);
    grad.addColorStop(1, `rgba(${C_BLUE},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(point.x, point.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(240,244,255,${0.85 * intensity})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function arcControlPoint(p1, p2){
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    // Push the midpoint outward, away from the sphere's center, so the
    // route bulges up over the globe's surface like a flight path.
    const dx = mx - cx, dy = my - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const bulge = R * 0.4;
    return {
      x: mx + (dx / dist) * bulge,
      y: my + (dy / dist) * bulge
    };
  }

  function pointOnQuad(p0, p1, p2, t){
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }

  function drawRoute(p1, p2, alpha, planeT){
    if (alpha <= 0.001) return;
    const ctrl = arcControlPoint(p1, p2);

    ctx.strokeStyle = `rgba(${C_BLUE},${0.5 * alpha})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, p2.x, p2.y);
    ctx.stroke();

    if (planeT !== null){
      const pos = pointOnQuad(p1, ctrl, p2, planeT);
      const glowR = 6;
      const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
      grad.addColorStop(0, `rgba(${C_PURPLE},${0.9 * alpha})`);
      grad.addColorStop(1, `rgba(${C_PURPLE},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${0.95 * alpha})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function easeInOut(t){
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /* ---------- flight state update ---------- */
  function updateFlight(now, indiaPt, italyPt){
    let italyGlowBoost = 0;
    let planeT = null;

    if (flightState === IDLE){
      routeAlpha = 0;
      if (now >= nextTriggerAt && indiaPt.visible && italyPt.visible){
        flightState = FLYING;
        flightStart = now;
      }
    } else if (flightState === FLYING){
      const t = Math.min(1, (now - flightStart) / FLIGHT_DURATION);
      routeAlpha = 1;
      planeT = easeInOut(t);
      if (t >= 1){
        flightState = ARRIVED;
        arrivedStart = now;
      }
    } else if (flightState === ARRIVED){
      const t = (now - arrivedStart) / ARRIVED_HOLD;
      routeAlpha = 1;
      italyGlowBoost = Math.sin(Math.min(1, t) * Math.PI); // soft glow bump
      if (t >= 1){
        flightState = FADING;
        fadeStart = now;
      }
    } else if (flightState === FADING){
      const t = Math.min(1, (now - fadeStart) / FADE_DURATION);
      routeAlpha = 1 - t;
      if (t >= 1){
        flightState = IDLE;
        nextTriggerAt = now + randomInterval();
      }
    }

    return { italyGlowBoost, planeT };
  }

  /* ---------- main render loop ---------- */
  let rotation = 0; // degrees
  const ROTATION_SPEED = 360 / 55000; // one full turn per ~55s

  function renderFrame(now, rotationDeg){
    ctx.clearRect(0, 0, SIZE, SIZE);
    drawGlow();
    drawSphereBody();
    drawGrid(rotationDeg);

    const indiaPt = project(INDIA.lat, INDIA.lon, rotationDeg);
    const italyPt = project(ITALY.lat, ITALY.lon, rotationDeg);

    const { italyGlowBoost, planeT } = reduceMotion
      ? { italyGlowBoost: 0.3, planeT: null }
      : updateFlight(now, indiaPt, italyPt);

    if (!reduceMotion || routeAlpha > 0){
      drawRoute(indiaPt, italyPt, routeAlpha, planeT);
    }
    drawMarker(indiaPt, 0, 'India');
    drawMarker(italyPt, italyGlowBoost, 'Italy');
  }

  if (reduceMotion){
    // Static, single-frame globe: no rotation, no looping flight
    // animation, but the route/markers are still drawn once so the
    // story still reads at a glance.
    renderFrame(0, -20);
    return;
  }

  let lastTs = null;
  function loop(ts){
    if (lastTs === null) lastTs = ts;
    const dt = ts - lastTs;
    lastTs = ts;
    rotation = (rotation + ROTATION_SPEED * dt) % 360;
    renderFrame(ts, rotation);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
