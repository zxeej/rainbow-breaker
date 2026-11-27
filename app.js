import {Game, WIDTH, HEIGHT} from './physics.js';
import {readBest,saveBest} from './storage.js';
const $=id=>document.getElementById(id);
const game=new Game(); window.game=game;
const canvas=$('board'), ctx=canvas.getContext('2d'), root=getComputedStyle(document.documentElement);
const palette=Array.from({length:7},(_,i)=>root.getPropertyValue(`--rain-${i}`).trim());
const ink=root.getPropertyValue('--color-ink').trim(), field=root.getPropertyValue('--color-field').trim();
let store; try {store=window.localStorage;} catch {store=null;}
let best=readBest(store), sound=false, audio=null, lastSound=0, last=0, previousState='', confirmState=null;
let left=false,right=false,drag=null;
const brickLayer=document.createElement('canvas');brickLayer.width=WIDTH;brickLayer.height=HEIGHT;
const brickCtx=brickLayer.getContext('2d');let brickSource=null;
function unlockAudio() {
  try { if(!audio) {const Audio=window.AudioContext||window.webkitAudioContext; if(Audio) audio=new Audio();} audio?.resume().catch(()=>{}); } catch {audio=null;}
}
function tone(type,color=0) {
  if(!sound||!audio||audio.state!=='running'||audio.currentTime-lastSound<.035) return;
  lastSound=audio.currentTime;
  const osc=audio.createOscillator(), gain=audio.createGain(); osc.type='sine';
  osc.frequency.setValueAtTime(type==='brick'?420+color*85:260,audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(type==='brick'?700+color*85:180,audio.currentTime+.06);
  gain.gain.setValueAtTime(.035,audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.09);
  osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime+.1);
}
function primary() {
  unlockAudio();
  if(game.state==='ready') game.launch();
  else if(game.state==='paused') game.resume();
  else if(game.state==='won'||game.state==='gameover') {game.reset();}
  sync(); canvas.focus({preventScroll:true});
}
$('primary').addEventListener('click',primary);
$('pause').addEventListener('click',()=>{if(game.state==='playing') game.pause(); else if(game.state==='paused') game.resume(); sync();});
$('sound').addEventListener('click',()=>{
  unlockAudio(); sound=!sound; $('sound').textContent=sound?'소리 켬':'소리 끔';
  $('sound').setAttribute('aria-pressed',String(sound)); $('sound').setAttribute('aria-label',sound?'효과음 끄기':'효과음 켜기');
  if(sound) tone('paddle');
});
$('restart').addEventListener('click',()=>{
  if(['playing','paused'].includes(game.state) || game.score>0) {
    confirmState=game.state; game.pause(); $('confirm').showModal(); $('cancel').focus();
  } else {game.reset();sync();}
});
function cancelRestart(){ $('confirm').close(); if(confirmState==='playing') game.resume(); confirmState=null;sync(); }
$('cancel').addEventListener('click',cancelRestart);
$('confirm').addEventListener('cancel',e=>{e.preventDefault();cancelRestart();});
$('confirmRestart').addEventListener('click',()=>{$('confirm').close();confirmState=null;game.reset();sync();});
function sync() {
  $('score').textContent=game.score.toLocaleString('ko-KR');
  if(game.score>best) { best=game.score;saveBest(store,best); }
  $('best').textContent=best.toLocaleString('ko-KR');
  $('stage').textContent=`${game.bricks.length-game.score}`;
  $('lives').textContent=`기회 ${game.lives}`; $('balls').textContent=`공 ${game.balls.length} / 조각 ${game.fragments.length}`;
  const paused=game.state==='paused'; $('pause').disabled=!['playing','paused'].includes(game.state);
  $('pause').textContent=paused?'계속하기':'일시정지'; $('pause').setAttribute('aria-label',paused?'게임 계속하기':'게임 일시정지');
  $('overlay').hidden=game.state==='playing';
  if(previousState===game.state) return;
  previousState=game.state;
  const copy={
    ready:['레인보우 브레이커','작은 조각을 패들로 받으면 공이 됩니다.<br>하나씩 모아 무지개 비를 만들어요.','시작','게임판 어디서든 좌우로 드래그'],
    paused:['일시정지','공과 조각이 기다리고 있어요.','계속하기','P 또는 스페이스로 계속'],
    gameover:['게임 종료',`깨뜨린 픽셀 ${game.score.toLocaleString('ko-KR')}개`,'다시 시작','최고 기록은 이 기기에 저장됩니다.'],
    won:['무지개를 모두 지웠어요',`5,850개의 작은 픽셀, 하나의 큰 소나기.`,'다시 시작','모든 조각을 새로 채웁니다.']
  }[game.state];
  if(copy) { $('overlayTitle').innerHTML=copy[0];$('overlayText').innerHTML=copy[1];$('primary').textContent=copy[2];$('overlayHint').textContent=copy[3];$('announcement').textContent=copy[0].replaceAll('<br>',' '); }
}
function position(e) {const rect=canvas.getBoundingClientRect();game.movePaddle((e.clientX-rect.left)/rect.width*WIDTH);}
canvas.addEventListener('pointerdown',e=>{ if(drag!==null)return; unlockAudio();drag=e.pointerId;canvas.setPointerCapture(e.pointerId);position(e);canvas.focus({preventScroll:true});});
canvas.addEventListener('pointermove',e=>{if(e.pointerId===drag)position(e);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
document.addEventListener('keydown',e=>{
  if($('confirm').open)return;
  if(e.code==='ArrowLeft'||e.code==='ArrowRight') {e.preventDefault();if(e.code==='ArrowLeft')left=true;else right=true;}
  if(e.target.tagName==='BUTTON')return;
  if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault(); if(game.state==='playing')game.pause();else primary();sync();}
  if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){e.preventDefault(); if(game.state==='playing')game.pause();else game.resume();sync();}
});
document.addEventListener('keyup',e=>{if(e.code==='ArrowLeft')left=false;if(e.code==='ArrowRight')right=false;});
function unfocus(){left=right=false;drag=null;game.pause();sync();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)unfocus();});window.addEventListener('blur',unfocus);
function resize(){const r=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
new ResizeObserver(resize).observe(canvas);
function draw() {
  ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);
  ctx.fillStyle=field;ctx.fillRect(0,0,WIDTH,HEIGHT);
  if(brickSource!==game.bricks){
    brickSource=game.bricks;brickCtx.clearRect(0,0,WIDTH,HEIGHT);
    for(const b of game.bricks)if(b.alive){brickCtx.fillStyle=palette[b.color];brickCtx.fillRect(b.x,b.y,b.w,b.h);}
  }
  ctx.imageSmoothingEnabled=false;ctx.drawImage(brickLayer,0,0);
  for(let color=0;color<7;color++) {
    ctx.fillStyle=palette[color];ctx.beginPath();
    for(const f of game.fragments)if(f.color===color)ctx.rect(f.x-1,f.y-1,2,2);
    for(const b of game.balls)if(b.color===color)ctx.rect(b.x-1,b.y-1,2,2);
    ctx.fill();
  }
  const p=game.paddle;ctx.fillStyle=ink;ctx.fillRect(p.x-p.w/2,p.y,p.w,p.h);
}
function frame(now){
  const dt=Math.min(Math.max((now-last)/1000,0),1/30);last=now;
  if(!$('confirm').open){if(left||right)game.movePaddle(game.paddle.x+(Number(right)-Number(left))*420*dt);game.update(dt);}
  for(const event of game.events.splice(0)){tone(event.type,event.color);if(event.type==='brick')brickCtx.clearRect(event.x-2,event.y-1.5,4,3);}
  sync();draw(dt);requestAnimationFrame(frame);
}
sync();resize();requestAnimationFrame(frame);
if('serviceWorker' in navigator) {
  let controlled=Boolean(navigator.serviceWorker.controller),reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(controlled&&!reloading){reloading=true;location.reload();}controlled=true;
  });
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{$('instruction').textContent='오프라인 저장을 사용할 수 없어요.';});
}
