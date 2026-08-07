/* ==========================================================
   Constellation v1.0 - Step 1
   Floating Nodes
========================================================== */

(() => {

    const canvas = document.getElementById("constellationCanvas");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const NODE_COUNT = 20;

    const nodes = [];

    const mouse = {
    x: 0,
    y: 0,
    active: false
};

    let time = 0;

    /* ==========================================
   Constellation States
========================================== */

const STATES = {

    hero: {
        speed: 0.5,
        brightness: 0.8,
        connectionDistance: 80
    },

    discovery: {
        speed: 0.8,
        brightness: 1.0,
        connectionDistance: 95
    },

    creation: {
        speed: 1.3,
        brightness: 1.3,
        connectionDistance: 120
    },

    ending: {
        speed: 0.4,
        brightness: 0.7,
        connectionDistance: 70
    }

};

let currentState = STATES.hero;

let animationState = {
    speed: STATES.hero.speed,
    brightness: STATES.hero.brightness,
    connectionDistance: STATES.hero.connectionDistance
};

let interaction = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 0,
    active: false
};

    function resize() {

        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;

        ctx.setTransform(1,0,0,1,0,0);
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        createNodes();

    }

    canvas.addEventListener("mousemove", (e) => {

    const rect = canvas.getBoundingClientRect();

    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    mouse.active = true;

});

canvas.addEventListener("mouseleave", () => {

    mouse.active = false;

});

    function createNodes(){

        nodes.length = 0;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        const cx = w / 2;
        const cy = h / 2;

        const radius = Math.min(w,h) * 0.42;

        for(let i=0;i<NODE_COUNT;i++){

            const angle = Math.random()*Math.PI*2;

            const r = Math.pow(Math.random(),1.6)*radius;

            const x = cx + Math.cos(angle)*r;
            const y = cy + Math.sin(angle)*r;

            nodes.push({

                baseX:x,
                baseY:y,

                x:x,
                y:y,

               radius: 0.8 + Math.random() * 1.8,

pulse: Math.random() * Math.PI * 2,

speed: 0.5 + Math.random() * 0.8,

depth: 0.4 + Math.random() * 0.6

            });

        }

    }

    function update(){
        // Smoothly interpolate to the current mood
animationState.speed +=
    (currentState.speed - animationState.speed) * 0.03;

animationState.brightness +=
    (currentState.brightness - animationState.brightness) * 0.03;

animationState.connectionDistance +=
    (currentState.connectionDistance - animationState.connectionDistance) * 0.03;

    time += 0.01 * animationState.speed;

    nodes.forEach(node=>{

        let offsetX =
            Math.sin(time * node.speed + node.pulse) * 8;

        let offsetY =
            Math.cos(time * node.speed + node.pulse) * 8;

        if(mouse.active){

            const dx = mouse.x - node.x;
            const dy = mouse.y - node.y;

            const distance = Math.sqrt(dx*dx + dy*dy);

            if(distance < 120){

                offsetX += dx * 0.08 * node.depth;
offsetY += dy * 0.08 * node.depth;

            }

        }

        node.x = node.baseX + offsetX * node.depth;
node.y = node.baseY + offsetY * node.depth;
if (interaction.active) {

    const dx = interaction.x - node.x;
    const dy = interaction.y - node.y;

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < interaction.radius) {

        const force = 1 - dist / interaction.radius;

        node.x += dx * 0.03 * force;
        node.y += dy * 0.03 * force;

    }

}

    });

}
    function drawConnections() {

    

    for (let i = 0; i < nodes.length; i++) {

        const maxDistance = animationState.connectionDistance*
(0.9 + nodes[i].depth * 0.25);

        for (let j = i + 1; j < nodes.length; j++) {

            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < maxDistance) {

                let alpha =
    0.6 +
    animationState.brightness * 0.4;

if(interaction.active){

    const centerX =
    (nodes[i].x + nodes[j].x) / 2;

const centerY =
    (nodes[i].y + nodes[j].y) / 2;

const dx =
    interaction.x - centerX;

const dy =
    interaction.y - centerY;

    const dist = Math.sqrt(dx*dx + dy*dy);

    if(dist < interaction.radius){

        alpha +=
            (1 - dist / interaction.radius) * 0.5;

    }

}

                ctx.beginPath();

                ctx.strokeStyle = `rgba(124,167,255,${alpha * 0.35})`;

                ctx.lineWidth = 0.6;

                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);

                ctx.stroke();
                const t = (time * 120 + i * 8) % distance;

const px =
    nodes[i].x +
    (dx / distance) * t;

const py =
    nodes[i].y +
    (dy / distance) * t;

ctx.beginPath();

const pulseAlpha =
    0.6 + animationState.brightness * 0.4;

ctx.fillStyle =
`rgba(220,235,255,${pulseAlpha})`;

ctx.arc(
    px,
    py,
    1.2,
    0,
    Math.PI * 2
);

ctx.fill();

            }

        }

    }

}

    function draw(){

        ctx.clearRect(
    0,
    0,
    canvas.clientWidth,
    canvas.clientHeight
);
const pulse =
    (Math.sin(time * 2) + 1) / 2;

    // AI Core Glow
const centerX = canvas.clientWidth / 2;
const centerY = canvas.clientHeight / 2;

const coreGlow = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    180
);

coreGlow.addColorStop(0,"rgba(90,140,255,0.35)");
coreGlow.addColorStop(0.35,"rgba(90,140,255,0.18)");
coreGlow.addColorStop(1,"rgba(90,140,255,0)");

ctx.fillStyle = coreGlow;

ctx.fillRect(
    0,
    0,
    canvas.clientWidth,
    canvas.clientHeight
);

// Draw Lines First
drawConnections();

// Draw Nodes
nodes.forEach(node=>{

    // Glow
const glow = ctx.createRadialGradient(

    node.x,
    node.y,
    0,

    node.x,
    node.y,
    node.radius * (5 + pulse)

);

glow.addColorStop(0,"rgba(124,167,255,0.9)");
glow.addColorStop(0.4,"rgba(124,167,255,0.25)");
glow.addColorStop(1,"rgba(124,167,255,0)");

ctx.fillStyle = glow;

ctx.beginPath();

ctx.arc(
    node.x,
    node.y,
    node.radius * 6,
    0,
    Math.PI*2
);

ctx.fill();

ctx.beginPath();

const brightness =
    0.7 + node.depth * 0.3;

ctx.fillStyle =
`rgba(220,235,255,${brightness})`;

ctx.arc(
    node.x,
    node.y,
    node.radius,
    0,
    Math.PI*2
);

ctx.fill();

});

    }

    function animate(){

        update();

        draw();

        requestAnimationFrame(animate);

    }

    resize();

    window.addEventListener("resize",resize);

    /* ==========================================
   Active Section Detection
========================================== */

const sectionMap = {

    hero: "hero",

    about: "discovery",
    journey: "discovery",
    education: "discovery",
    skills: "discovery",
    learning: "discovery",
    interests: "discovery",

    projects: "creation",
    travel: "creation",
    goals: "creation",

    blog: "ending",
    gallery: "ending",
    resume: "ending",
    contact: "ending"

};

const observer = new IntersectionObserver((entries)=>{

    entries.forEach(entry=>{

        if(!entry.isIntersecting) return;

        const mood = sectionMap[entry.target.id];

        if(mood && STATES[mood]){

            currentState = STATES[mood];

        }

    });

},{
    threshold:0.4
});

document.querySelectorAll("section").forEach(section=>{

    observer.observe(section);

});

/* ==========================================
   Project Hover Interaction
========================================== */

document.querySelectorAll(".project-card").forEach(card => {

    card.addEventListener("mouseenter", () => {

        const rect = card.getBoundingClientRect();

        const canvasRect = canvas.getBoundingClientRect();

interaction.x =
    rect.left - canvasRect.left + rect.width / 2;

interaction.y =
    rect.top - canvasRect.top + rect.height / 2;

        interaction.radius = 220;

        interaction.active = true;

    });

    card.addEventListener("mouseleave", () => {

        interaction.active = false;

    });

});

    animate();

})();