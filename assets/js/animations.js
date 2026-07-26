/* ============================================================
   Animations — scroll reveals, typing effect, hero particle
   network, skill bar fills, and the floating AI companion.
   Runs after main.js; no shared state between the two files.
   ============================================================ */

/* ---------- reveal on scroll ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      revealObserver.unobserve(en.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ---------- animate skill bars when visible ---------- */
const skillBars = document.querySelectorAll('.bar-fill');
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.style.width = en.target.dataset.fill + '%';
      barObserver.unobserve(en.target);
    }
  });
}, { threshold: 0.4 });
skillBars.forEach(b => barObserver.observe(b));

/* ---------- hero typing animation ---------- */
(function typingAnimation(){
  const roles = ["Computer Science Graduate", "Future Data Scientist", "AI Enthusiast", "Filmmaker", "Traveler", "Technology Creator"];
  const typingEl = document.getElementById('typing');
  if (!typingEl) return;

  let roleIndex = 0, charIndex = 0, deleting = false;

  function typeLoop(){
    const word = roles[roleIndex];
    if (!deleting) {
      charIndex++;
      typingEl.innerHTML = word.slice(0, charIndex) + '<span class="cursor-blink">&nbsp;</span>';
      if (charIndex === word.length) { deleting = true; setTimeout(typeLoop, 1300); return; }
    } else {
      charIndex--;
      typingEl.innerHTML = word.slice(0, charIndex) + '<span class="cursor-blink">&nbsp;</span>';
      if (charIndex === 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; }
    }
    setTimeout(typeLoop, deleting ? 35 : 65);
  }
  typeLoop();
})();

/* ---------- hero particle network canvas ---------- */
(function heroParticles(){
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize(){
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
  }

  function initParticles(){
    const count = Math.min(60, Math.floor(canvas.width / 28));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3
    }));
  }

  function animateParticles(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    for (let i = 0; i < particles.length; i++){
      for (let j = i + 1; j < particles.length; j++){
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) {
          ctx.strokeStyle = `rgba(91,139,255,${0.14 * (1 - d / 130)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(139,92,246,0.5)';
      ctx.beginPath(); ctx.arc(particles[i].x, particles[i].y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(animateParticles);
  }

  resize(); initParticles(); animateParticles();
  window.addEventListener('resize', () => { resize(); initParticles(); });
})();

/* ---------- floating AI companion ---------- */
(function aiCompanion(){
  const bot = document.getElementById('aiCompanion');
  if (!bot) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight;
  window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });

  let t = 0;
  let dir = 1;
  let x = 40;
  const speed = 0.35;
  let lastWave = 0;
  let lastBlink = 0;

  function frame(ts){
    t += 1;
    const vw = window.innerWidth;
    const botW = bot.offsetWidth || 56;

    x += dir * speed;
    if (x > vw - botW - 20) { dir = -1; }
    if (x < 20) { dir = 1; }

    const bob = Math.sin(t / 28) * 6;
    const facing = dir; // face direction via scaleX
    bot.style.transform = `translate(${x}px, ${bob}px) scaleX(${facing})`;

    // look toward cursor if close
    const rect = bot.getBoundingClientRect();
    const bx = rect.left + rect.width / 2, by = rect.top + rect.height / 2;
    const dxm = mouseX - bx, dym = mouseY - by;
    const dist = Math.hypot(dxm, dym);
    const pupils = bot.querySelectorAll('.ac-pupil');

    if (dist < 260){
      const maxOff = 1.6;
      const nx = Math.max(-1, Math.min(1, dxm / 140)) * maxOff * facing; // account for flip
      const ny = Math.max(-1, Math.min(1, dym / 140)) * maxOff;
      pupils.forEach(p => p.style.transform = `translate(${nx}px, ${ny}px)`);

      if (dist < 130 && ts - lastWave > 3500){
        lastWave = ts;
        bot.classList.remove('waving');
        void bot.offsetWidth; // restart animation
        bot.classList.add('waving');
      }
    } else {
      pupils.forEach(p => p.style.transform = 'translate(0,0)');
    }

    // occasional blink
    if (ts - lastBlink > 4200 + Math.random() * 2500){
      lastBlink = ts;
      bot.classList.add('blink');
      setTimeout(() => bot.classList.remove('blink'), 140);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
