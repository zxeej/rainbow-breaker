export const MAX_BALLS=6000;
export const WIDTH=390, HEIGHT=680;
const COLS=90,ROWS=65,LEFT=15,TOP=48,BW=4,BH=3;
export class Game {
 constructor(){
  this.events=[];this.state='ready';this.lives=3;this.score=0;
  this.paddle={x:WIDTH/2,y:HEIGHT-64,w:100,h:4};
  this.bricks=Array.from({length:COLS*ROWS},(_,i)=>({x:LEFT+i%COLS*BW,y:TOP+Math.floor(i/COLS)*BH,w:BW,h:BH,color:Math.floor(Math.floor(i/COLS)*7/ROWS),alive:true}));
  this.fragments=[];this.serve();this.collisionChecks=0;
 }
 serve(){this.balls=[{x:this.paddle.x,y:this.paddle.y-5,vx:38,vy:-115,r:1,color:6}];}
 launch(){if(this.state==='ready')this.state='playing';}
 pause(){if(this.state==='playing')this.state='paused';}
 resume(){if(this.state==='paused')this.state='playing';}
 reset(){Object.assign(this,new Game());}
 movePaddle(x){if(!Number.isFinite(x))return;this.paddle.x=Math.max(this.paddle.w/2,Math.min(WIDTH-this.paddle.w/2,x));if(this.state==='ready')this.balls[0].x=this.paddle.x;}
 hitBrick(brick){
  if(!brick.alive)return;brick.alive=false;this.score++;
  this.fragments.push({x:brick.x+2,y:brick.y+1.5,vy:115,color:brick.color});
  this.events.push({type:'brick',x:brick.x+2,y:brick.y+1.5,color:brick.color});
 }
 aim(b){
  const offset=Math.max(-1,Math.min(1,(b.x-this.paddle.x)/(this.paddle.w/2)));
  const angle=offset*1.12, speed=Math.min(280,Math.max(122,Math.hypot(b.vx||0,b.vy)));
  // Never trap a centred ball in an endless vertical groove.
  b.vx=Math.sin(angle)*speed;if(Math.abs(b.vx)<24)b.vx=(b.color%2?1:-1)*24;
  b.vy=-Math.sqrt(speed*speed-b.vx*b.vx);b.y=this.paddle.y-b.r-.01;
 }
 update(dt){
  if(this.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,1/30);this.collisionChecks=0;
  // Each projectile has its own substeps: a fast outlier cannot multiply all work.
  for(const b of this.balls){
   const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/(b.r*.5))),h=dt/steps;
   for(let n=0;n<steps;n++){
    const ox=b.x,oy=b.y;b.x+=b.vx*h;b.y+=b.vy*h;
    if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx);}if(b.x>WIDTH-b.r){b.x=WIDTH-b.r;b.vx=-Math.abs(b.vx);}
    if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy);}
    const p=this.paddle;
    if(b.vy>0&&oy+b.r<=p.y&&b.y+b.r>=p.y&&b.x+b.r>=p.x-p.w/2&&b.x-b.r<=p.x+p.w/2){this.aim(b);this.events.push({type:'paddle'});}
    // Fixed dense grid: only cells overlapped by the tiny projectile are queried.
    const c0=Math.max(0,Math.floor((b.x-b.r-LEFT)/BW)),c1=Math.min(COLS-1,Math.floor((b.x+b.r-LEFT)/BW));
    const r0=Math.max(0,Math.floor((b.y-b.r-TOP)/BH)),r1=Math.min(ROWS-1,Math.floor((b.y+b.r-TOP)/BH));
    let hit=false;
    for(let row=r0;row<=r1&&!hit;row++)for(let col=c0;col<=c1;col++){
     const brick=this.bricks[row*COLS+col];this.collisionChecks++;if(!brick.alive)continue;
     const cx=Math.max(brick.x,Math.min(brick.x+BW,b.x)),cy=Math.max(brick.y,Math.min(brick.y+BH,b.y));
     if((b.x-cx)**2+(b.y-cy)**2>b.r*b.r)continue;
     if(ox+b.r<=brick.x||ox-b.r>=brick.x+BW){b.vx=-b.vx;b.x=ox;}else{b.vy=-b.vy;b.y=oy;}
     this.hitBrick(brick);hit=true;break;
    }
   }
  }
  this.balls=this.balls.filter(b=>b.y-b.r<=HEIGHT);
  const p=this.paddle,remaining=[];
  for(const f of this.fragments){
   const oy=f.y;f.y+=f.vy*dt;
   if(oy-1<=p.y&&f.y+1>=p.y&&f.x+1>=p.x-p.w/2&&f.x-1<=p.x+p.w/2){
    if(this.balls.length<MAX_BALLS){const b={x:f.x,y:p.y-2,vx:0,vy:128,r:1,color:f.color};this.aim(b);this.balls.push(b);this.events.push({type:'catch',color:f.color});}
   }else if(f.y-1<=p.y)remaining.push(f);
  }
  this.fragments=remaining;
  if(this.bricks.every(b=>!b.alive)){this.state='won';this.balls=[];this.fragments=[];}
  else if(!this.balls.length&&!this.fragments.length){this.lives--;this.state=this.lives?'ready':'gameover';if(this.lives)this.serve();}
 }
}
