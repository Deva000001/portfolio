/* ==========================================================
   ORBIT AI COMPANION v2.0
========================================================== */

(() => {

const orbit = document.getElementById("orbit");
const bubble = document.getElementById("orbitBubble");
const bubbleText = bubble.querySelector(".orbit-bubble-text");

const chat = document.getElementById("orbitChat");
const messages = document.getElementById("orbitMessages");

const input = document.getElementById("orbitInput");
const send = document.getElementById("orbitSend");
const close = document.getElementById("orbitClose");

if(!orbit) return;

/* ==========================================
   ORBIT KNOWLEDGE BASE
========================================== */

const ORBIT_BRAIN = {

    about: {
        keywords: ["about", "dev", "who is dev", "introduce yourself"],
        reply: `👋 Meet Dev

Dev is a Computer Science graduate with a passion for Artificial Intelligence, Data Science, Android development, storytelling, and filmmaking.

He believes technology should solve real problems while creating experiences people genuinely enjoy.

He's currently preparing for an MSc in Data Science at the University of Messina, Italy 🇮🇹, where he hopes to deepen his expertise in AI and build products with global impact.

Beyond technology, his biggest dream is to travel the world and create cinematic travel documentaries that tell authentic human stories. 🎥🌍`
    },

    projects: {
        keywords: ["project","projects","portfolio","work","ride","app","application"],
        reply: `💼 Featured Projects

🚗 RideRentLink
A smart Android carpooling and rental platform built with Kotlin, Jetpack Compose, and Firebase. It includes document verification, live booking, and real-time management.

📈 Handwriting Detector AI
A machine learning project focused on recognizing and interpreting handwritten text.

🌐 Personal Portfolio
The website you're exploring right now—designed from scratch with custom animations, interactive storytelling, and Orbit as your AI companion.

Want me to take you to the Projects section? 🚀`,
        action: "projects"
    },

    skills: {
        keywords: ["skill","skills","tech","technology","stack","python","java","kotlin","firebase","ai","ml"],
        reply: `🧠 Dev's Tech Stack

🐍 Python
☕ Java
📱 Kotlin
🌐 HTML • CSS • JavaScript
🔥 Firebase
🎨 GSAP Animations
🧠 Artificial Intelligence
📊 Data Science
🤖 Machine Learning
🗄 SQL

He's always learning new technologies and enjoys combining creativity with engineering.`,
        action: "skills"
    },

    italy: {
        keywords: ["italy","messina","masters","msc","university","study","education"],
        reply: `🇮🇹 Why Italy?

Dev is preparing to pursue an MSc in Data Science at the University of Messina.

For him, Italy isn't just about earning a degree—it's about gaining international exposure, learning from a new culture, and growing into an AI engineer capable of building solutions that make a real impact.

And yes... authentic Italian pizza is definitely a bonus. 🍕`,
        action: "journey"
    },

    resume: {
        keywords: ["resume","cv","download resume"],
        reply: `📄 Need Dev's resume?

No problem! I'll open it for you.

It includes his education, technical skills, projects, certifications, and experience.`,
        action: "resume"
    },

    contact: {
        keywords: ["contact","email","linkedin","github","hire","reach"],
        reply: `📬 Let's Connect!

You can connect with Dev through:

💼 LinkedIn
💻 GitHub
📧 Email

Or simply scroll down to the Contact section and send a message directly.`,
        action: "contact"
    },

    experience: {
        keywords: ["experience","internship","work experience"],
        reply: `💼 Experience

Dev has worked on Android application development, AI-powered solutions, and full-stack projects.

His focus is on creating practical products with clean UI, scalable architecture, and meaningful user experiences.

He's continuously building new projects while preparing for his master's journey in Italy.`
    },

    dream: {
        keywords: ["dream","goal","future","ambition"],
        reply: `🌍 Dev's Dream

While AI and Data Science are his professional path, his biggest personal dream is to travel the world creating cinematic travel documentaries.

He wants to combine technology, storytelling, filmmaking, and culture into experiences that inspire people. 🎥✨`
    }
};

/* ==========================================
   Bubble Messages
========================================== */

const randomMessages = [

"👋 Hi! I'm Orbit.",

"🧠 Ask me about Dev.",

"💼 Want to explore the projects?",

"🇮🇹 Curious about the Italy journey?",

"🚀 Ready for a portfolio tour?"

];

let bubbleIndex = 0;

function showBubble(text){

    bubbleText.textContent = text;

    bubble.classList.add("show");

    clearTimeout(showBubble.timer);

    showBubble.timer = setTimeout(()=>{

        bubble.classList.remove("show");

    },5000);

}

setTimeout(()=>{

    showBubble(randomMessages[0]);

},3000);

setInterval(()=>{

    if(chat.classList.contains("open")) return;

    bubbleIndex++;

    if(bubbleIndex>=randomMessages.length){

        bubbleIndex=0;

    }

    showBubble(randomMessages[bubbleIndex]);

},30000);

/* ==========================================
   Open / Close
========================================== */

function openChat(){

    chat.classList.add("open");

    bubble.classList.remove("show");

    orbit.classList.add("waving");

    setTimeout(()=>{

        orbit.classList.remove("waving");

    },800);

}

function closeChat(){

    chat.classList.remove("open");

}

orbit.addEventListener("click",openChat);

close.addEventListener("click",closeChat);

/* ==========================================
   Message Helpers
========================================== */

function addUserMessage(text){

    const div=document.createElement("div");

    div.className="orbit-message";

    div.style.marginLeft="auto";

    div.style.background="rgba(91,139,255,.35)";

    div.innerHTML=text;

    messages.appendChild(div);

    messages.scrollTop=messages.scrollHeight;

}

function addOrbitMessage(text){

    const div=document.createElement("div");

    div.className="orbit-message orbit-message-ai";

    div.innerHTML=text;

    messages.appendChild(div);

    messages.scrollTop=messages.scrollHeight;

}

/* ==========================================
   Fake Typing
========================================== */

function orbitReply(text){

    const typing=document.createElement("div");

    typing.className="orbit-message orbit-message-ai";

    typing.innerHTML="Typing...";

    messages.appendChild(typing);

    messages.scrollTop=messages.scrollHeight;

    setTimeout(()=>{

        typing.remove();

        addOrbitMessage(text);

    },900);

}




/* ---------------- ESC ---------------- */

document.addEventListener("keydown",(e)=>{

    if(e.key==="Escape"){

        closeChat();

    }

});

/* ---------------- Eyes Follow Cursor ---------------- */

const pupils = orbit.querySelectorAll(".ac-pupil");

window.addEventListener("mousemove",(e)=>{

    const rect = orbit.getBoundingClientRect();

    const cx = rect.left + rect.width/2;

    const cy = rect.top + rect.height/2;

    const dx = (e.clientX-cx)*0.05;

    const dy = (e.clientY-cy)*0.05;

    pupils.forEach(p=>{

        p.style.transform = `translate(${dx}px,${dy}px)`;

    });

});

/* ---------------- Random Blink ---------------- */

setInterval(()=>{

    orbit.classList.add("blink");

    setTimeout(()=>{

        orbit.classList.remove("blink");

    },180);

},4500+Math.random()*2500);

function handleMessage(message){

    // Greetings
    if(["hi","hello","hey","hola","hii"].includes(message)){

        orbitReply(`Hey! 👋

I'm Orbit, Dev's digital companion.

Ask me anything about Dev, his projects, skills, Italy journey, or career.

Let's explore! 🚀`);

        return;

    }

    // Thanks
    if(message.includes("thank")){

        orbitReply("You're very welcome! 😊");

        return;

    }

    // Bye
    if(message.includes("bye")){

        orbitReply("Goodbye! Hope to see you again. 👋");

        return;

    }

    // Easter Egg
    if(message.includes("manisha")){

        orbitReply(`😂 Ah... you found one of Dev's secrets.

Yes... Manisha is Dev's best friend.

Just don't tell Dev I told you. 🤫`);

        return;

    }

    // Search Brain
    for(const key in ORBIT_BRAIN){

        const item = ORBIT_BRAIN[key];

        if(item.keywords.some(word=>message.includes(word))){

            orbitReply(item.reply);

            if(item.action){

                setTimeout(()=>{

                    runAction(item.action);

                },1200);

            }

            return;

        }

    }

    orbitReply(`🤔 I don't know that one yet.

Try asking me about:

💼 Projects

🧠 Skills

🇮🇹 Italy

📄 Resume

📬 Contact

🎯 Dream`);
}

/* ==========================================
   ORBIT ACTION MANAGER
========================================== */

const actionButtons =
document.querySelectorAll(".orbit-quick-actions button");

actionButtons.forEach(button => {

    button.addEventListener("click", () => {

        const action = button.dataset.action;

        runAction(action);

    });

});

function runAction(action){

    switch(action){

        case "projects":

            orbitReply(`💼 Let's check out Dev's projects.

I've highlighted the section for you.

Hope you enjoy them! 🚀`);

            document.getElementById("projects")
            ?.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });

        break;



        case "skills":

            orbitReply(`🧠 Here are Dev's strongest skills.

Python • AI • Data Science

Android • Firebase

Web Development

Scrolling there now...`);

            document.getElementById("skills")
            ?.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });

        break;



        case "italy":

            orbitReply(`🇮🇹 Italy is one of the biggest chapters of Dev's journey.

He's pursuing an MSc in Data Science at the University of Messina.

Let's head there!`);

            document.getElementById("journey")
            ?.scrollIntoView({
                behavior:"smooth",
                block:"start"
            });

        break;



        case "tour":

            startPortfolioTour();

        break;

    }

}

/* ==========================================
   PORTFOLIO TOUR
========================================== */

function startPortfolioTour(){

    orbitReply(`🚀 Awesome!

Welcome to the Orbit Portfolio Tour.

Sit back...

I'll guide you through everything. 😄`);

    const sections = [

        "hero",

        "about",

        "journey",

        "projects",

        "skills",

        "contact"

    ];

    let index = 0;

    function next(){

        if(index >= sections.length) return;

        document.getElementById(sections[index])
        ?.scrollIntoView({

            behavior:"smooth",

            block:"start"

        });

        index++;

        setTimeout(next,2500);

    }

    setTimeout(next,1500);

}

function sendMessage(){

    const text = input.value.trim();

    if(!text) return;

    addUserMessage(text);

    input.value = "";

    handleMessage(text.toLowerCase());

}

send.addEventListener("click",sendMessage);

input.addEventListener("keydown",(e)=>{

    if(e.key==="Enter"){

        sendMessage();

    }

});



})();

