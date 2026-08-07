/* ============================================================
   Main — core page behavior: footer year, scroll progress,
   nav background, cursor glow, magnetic buttons, and the
   "contact form" popup. Loaded before animations.js.
   ============================================================ */

/* ---------- footer year ---------- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- scroll progress bar + nav background ---------- */
const progressBar = document.getElementById('progress');
const navEl = document.getElementById('nav');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  progressBar.style.width = scrolled + '%';
  navEl.classList.toggle('scrolled', h.scrollTop > 40);
});

/* ---------- cursor glow (desktop / fine-pointer only) ---------- */
const cursorGlow = document.getElementById('cursor-glow');
if (window.matchMedia('(pointer:fine)').matches) {
  window.addEventListener('mousemove', e => {
    cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
  });
} else {
  cursorGlow.style.display = 'none';
}

/* ---------- magnetic buttons ---------- */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    btn.style.transform = `translate(${x * 0.15}px, ${y * 0.3}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});

/* ---------- contact form → "Available Soon" popup ----------
   The form doesn't send anything yet. Submitting it opens a
   glassmorphism modal instead. Closes via the × button, the
   ESC key, or a click on the dimmed backdrop.
------------------------------------------------------------- */
(function contactModal(){
  const form = document.querySelector('.contact-form');
  const modal = document.getElementById('contactModal');
  const closeBtn = document.getElementById('contactModalClose');
  if (!form || !modal || !closeBtn) return;

  function openModal(){
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    openModal();
  });

  closeBtn.addEventListener('click', closeModal);

  // click outside the card closes the modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // ESC key closes the modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });
})();

/* ==========================================
   WORLD CLOCK
========================================== */

(function(){

const india = document.getElementById("indiaTime");
const italy = document.getElementById("italyTime");

if(!india || !italy) return;

function updateClocks(){

    india.textContent =
    new Date().toLocaleTimeString("en-IN",{

        timeZone:"Asia/Kolkata",

        hour:"2-digit",

        minute:"2-digit"

    });

    italy.textContent =
    new Date().toLocaleTimeString("en-IT",{

        timeZone:"Europe/Rome",

        hour:"2-digit",

        minute:"2-digit"

    });

}

updateClocks();

setInterval(updateClocks,1000);

})();

/* ==========================================
   WORLD STATUS CLOSE
========================================== */

(() => {

    const widget = document.querySelector(".world-status");
    const close = document.getElementById("worldClose");

    if(!widget || !close) return;

    close.addEventListener("click", () => {

        widget.style.opacity = "0";
        widget.style.transform = "translateY(20px) scale(.9)";

        setTimeout(() => {

            widget.style.display = "none";

        }, 300);

    });

    /* ==========================================================
   CINEMATIC INTRO LOADER
========================================================== */

(() => {

    const loader = document.getElementById("introLoader");
    const status = document.getElementById("loaderStatus");
    const bar = document.getElementById("loaderBar");

    if(!loader || !status || !bar) return;

    const steps = [

        {
            text:"Initializing Orbit AI...",
            progress:15
        },

        {
            text:"Loading Constellation...",
            progress:35
        },

        {
            text:"Preparing Projects...",
            progress:55
        },

        {
            text:"Connecting Italy Journey...",
            progress:75
        },

        {
            text:"Almost Ready...",
            progress:92
        },

        {
            text:"Welcome, Explorer.",
            progress:100
        }

    ];

    let i = 0;

    function nextStep(){

        status.textContent = steps[i].text;

        bar.style.width = steps[i].progress + "%";

        i++;

        if(i < steps.length){

            setTimeout(nextStep,700);

        }else{

            setTimeout(()=>{

                loader.classList.add("hide");

            },800);

        }

    }

    window.addEventListener("load",()=>{

        setTimeout(nextStep,500);

    });

})();

})();