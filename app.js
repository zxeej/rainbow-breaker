import {Game, WIDTH, HEIGHT} from './physics.js';
import {readBest,saveBest} from './storage.js';
const $=id=>document.getElementById(id);
const game=new Game(); window.game=game;
const canvas=$('board'), ctx=canvas.getContext('2d'), root=getComputedStyle(document.documentElement);
const palette=Array.from({length:7},(_,i)=>root.getPropertyValue(`--rain-${i}`).trim());
const ink=root.getPropertyValue('--color-ink').trim(), field=root.getPropertyValue('--color-field').trim(), muted=root.getPropertyValue('--color-muted').trim();
let store; try {store=window.localStorage;} catch {store=null;}
let best=readBest(store), sound=false, audio=null, lastSound=0, particles=[], last=0, previousState='', confirmState=null;
let left=false,right=false,drag=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  else if(game.state==='stageclear') game.nextStage();
  else if(game.state==='won'||game.state==='gameover') {game.reset();particles=[];}
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
  } else {game.reset();particles=[];sync();}
});
function cancelRestart(){ $('confirm').close(); if(confirmState==='playing') game.resume(); confirmState=null;sync(); }
$('cancel').addEventListener('click',cancelRestart);
$('confirm').addEventListener('cancel',e=>{e.preventDefault();cancelRestart();});
$('confirmRestart').addEventListener('click',()=>{$('confirm').close();confirmState=null;game.reset();particles=[];sync();});
function sync() {
  $('score').textContent=game.score.toLocaleString('ko-KR');
  if(game.score>best) { best=game.score;saveBest(store,best); }
  $('best').textContent=best.toLocaleString('ko-KR');
  $('stage').innerHTML=`${String(game.stage).padStart(2,'0')} <small>/ 03</small>`;
  $('lives').textContent=`기회 ${game.lives}`; $('balls').textContent=`공 ${game.balls.length}`;
  const paused=game.state==='paused'; $('pause').disabled=!['playing','paused'].includes(game.state);
  $('pause').textContent=paused?'계속하기':'일시정지'; $('pause').setAttribute('aria-label',paused?'게임 계속하기':'게임 일시정지');
  $('overlay').hidden=game.state==='playing';
  if(previousState===game.state) return;
  previousState=game.state;
  const copy={
    ready:[game.lives===3&&game.score===0?'무지개가<br>쏟아진다!':'한 번 더,<br>받아볼까요?', '벽돌 하나가 공 두 개로.<br>어디서든 드래그해 공을 받아요.','플레이','기회는 세 번, 끝까지 받아봐요.'],
    paused:['잠깐, 숨 고르기','공은 그대로 기다리고 있어요.','계속하기','P 또는 스페이스로도 계속할 수 있어요.'],
    stageclear:[`${game.stage} 스테이지 클리어!`,'무지개를 모두 지웠어요.<br>다음 무지개는 조금 더 촘촘해요.','다음 스테이지','점수와 남은 기회는 이어져요.'],
    gameover:['비가 그쳤어요',`이번 점수 ${game.score.toLocaleString('ko-KR')}점.<br>새로운 무지개에 도전해요.`,'다시 도전','최고 기록은 이 기기에 저장돼요.'],
    won:['무지개 완성!',`세 스테이지를 모두 지웠어요.<br>최종 점수 ${game.score.toLocaleString('ko-KR')}점.`,'한 번 더','쏟아지는 공을 끝까지 받아냈네요.']
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
function draw(dt) {
  ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);
  ctx.fillStyle=field;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.globalAlpha=.08; ctx.strokeStyle=muted;ctx.lineWidth=.5;
  for(let y=40;y<HEIGHT;y+=40){ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(WIDTH-12,y);ctx.stroke();}ctx.globalAlpha=1;
  for(const b of game.bricks){if(!b.alive)continue;ctx.fillStyle=palette[b.color];ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,2);ctx.fill();ctx.globalAlpha=.3;ctx.fillStyle=ink;ctx.fillRect(b.x+2,b.y+1,b.w-4,1);ctx.globalAlpha=1;}
  for(let i=0;i<game.balls.length;i++) {
    const b=game.balls[i];ctx.fillStyle=i===0?ink:palette[i%7];
    if(!reduced){const speed=Math.hypot(b.vx,b.vy);ctx.globalAlpha=.18;ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=b.r*1.5;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx/speed*10,b.y-b.vy/speed*10);ctx.stroke();ctx.globalAlpha=1;}
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
  }
  const p=game.paddle;ctx.fillStyle=ink;ctx.beginPath();ctx.roundRect(p.x-p.w/2,p.y,p.w,p.h,5);ctx.fill();
  ctx.fillStyle=palette[3];ctx.fillRect(p.x-10,p.y+3,20,3);
  ctx.globalAlpha=.35;ctx.strokeStyle=muted;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(13,p.y+35);ctx.lineTo(WIDTH-13,p.y+35);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  if(!reduced){for(const q of particles){if(game.state==='playing'){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;}ctx.globalAlpha=Math.max(0,q.life/.35);ctx.fillStyle=palette[q.color];ctx.fillRect(q.x,q.y,2,2);}particles=particles.filter(q=>q.life>0);ctx.globalAlpha=1;}
}
function frame(now){
  const dt=Math.min(Math.max((now-last)/1000,0),1/30);last=now;
  if(!$('confirm').open){if(left||right)game.movePaddle(game.paddle.x+(Number(right)-Number(left))*420*dt);game.update(dt);}
  for(const event of game.events.splice(0)) {tone(event.type,event.color);if(event.type==='brick'&&!reduced){for(let i=0;i<4;i++)particles.push({x:event.x,y:event.y,color:event.color,vx:(i-1.5)*40,vy:40+i*15,life:.35});}}
  if(particles.length>400)particles=particles.slice(-400);
  sync();draw(dt);requestAnimationFrame(frame);
}
sync();resize();requestAnimationFrame(frame);
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{$('instruction').textContent='오프라인 저장을 사용할 수 없어요.';});
