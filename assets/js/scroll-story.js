/* Simplified scroll-story.js */
(function heroSequenceBackground(){
const canvas = document.getElementById("globalSequenceCanvas");

if(!canvas || typeof gsap==="undefined") return;
gsap.registerPlugin(ScrollTrigger);
const ctx=canvas.getContext("2d");
const FRAME_COUNT=300;
const FRAME_PATH="assets/images/sequence/";
const images=[];
const seq={frame:0};
let highestLoaded=0;
function frameSrc(i){
return FRAME_PATH+"male"+String(i).padStart(4,"0")+".png";
}
function resize(){
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
draw(seq.frame);
}
function draw(index){
const safe=Math.min(index,highestLoaded);
const img=images[safe];
if(!img||!img.complete||img.naturalWidth===0) return;
const h=canvas.width/img.width;
const v=canvas.height/img.height;
const r=Math.max(h,v);
const x = (canvas.width - img.width * r) / 2;
const y = (canvas.height - img.height * r) / 2;
ctx.clearRect(0,0,canvas.width,canvas.height);
ctx.globalAlpha=0.75;
ctx.drawImage(img,0,0,img.width,img.height,x,y,img.width*r,img.height*
r);
ctx.globalAlpha=1;
}
function render(){ draw(seq.frame); }
function imageLoaded(i){
return function(){
if(i>highestLoaded) highestLoaded=i;
if(i===0){
canvas.classList.add("ready");
render();
}
ScrollTrigger.refresh();
}
}
resize();
window.addEventListener("resize",resize);
for(let i=1;i<=FRAME_COUNT;i++){
const img=new Image();
img.onload=imageLoaded(i-1);
img.onerror=imageLoaded(i-1);
img.src=frameSrc(i);
images.push(img);
}
gsap.to(seq,{

frame:FRAME_COUNT-1,

snap:"frame",

ease:"none",

scrollTrigger:{

trigger:document.documentElement,

start:0,

end: ()=> document.documentElement.scrollHeight - window.innerHeight,

scrub:0.3

},

onUpdate:render

});
gsap.to(canvas,{

scale:1.08,

ease:"none",

scrollTrigger:{

trigger:document.body,

start:"top top",

end:"bottom bottom",

scrub:true

}

});



})();
