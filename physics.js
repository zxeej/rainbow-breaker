export const MAX_BALLS = 180;
export const WIDTH = 390, HEIGHT = 680;
export class Game {
  launch() { if(this.state==='ready') this.state='playing'; }
  pause() { if(this.state==='playing') this.state='paused'; }
  resume() { if(this.state==='paused') this.state='playing'; }
  movePaddle(x) {
    if(!Number.isFinite(x)) return;
    this.paddle.x=Math.max(this.paddle.w/2,Math.min(WIDTH-this.paddle.w/2,x));
    if(this.state==='ready') this.balls[0].x=this.paddle.x;
  }
  update(dt) {
    if(this.state!=='playing' || !Number.isFinite(dt) || dt<=0) return;
    dt=Math.min(dt,1/30);
    // Adaptive substeps limit travel to half a radius, even in fast-ball tests.
    const speed=Math.max(360,...this.balls.map(b=>Math.hypot(b.vx,b.vy)));
    const steps=Math.ceil(speed*dt/1.5), h=dt/steps;
    for(let n=0;n<steps;n++) {
      for(const b of [...this.balls]) {
        const ox=b.x, oy=b.y;
        b.x+=b.vx*h; b.y+=b.vy*h;
        if(b.x<b.r) { b.x=b.r; b.vx=Math.abs(b.vx); }
        if(b.x>WIDTH-b.r) { b.x=WIDTH-b.r; b.vx=-Math.abs(b.vx); }
        if(b.y<b.r) { b.y=b.r; b.vy=Math.abs(b.vy); }
        const p=this.paddle;
        if(b.vy>0 && oy+b.r<=p.y && b.y+b.r>=p.y && b.x+b.r>=p.x-p.w/2 && b.x-b.r<=p.x+p.w/2) {
          const angle=Math.max(-1,Math.min(1,(b.x-p.x)/(p.w/2)))*1.05;
          const v=Math.min(530,Math.max(350,Math.hypot(b.vx,b.vy)));
          b.vx=Math.sin(angle)*v; b.vy=-Math.cos(angle)*v; b.y=p.y-b.r-.01;
          this.events.push({type:'paddle',x:b.x,y:b.y});
        }
        for(const brick of this.bricks) {
          if(!brick.alive) continue;
          const cx=Math.max(brick.x,Math.min(brick.x+brick.w,b.x));
          const cy=Math.max(brick.y,Math.min(brick.y+brick.h,b.y));
          if((b.x-cx)**2+(b.y-cy)**2>b.r*b.r) continue;
          if(ox+b.r<=brick.x || ox-b.r>=brick.x+brick.w) { b.vx=-b.vx; b.x=ox; }
          else { b.vy=-b.vy; b.y=oy; }
          this.hitBrick(brick); break;
        }
      }
    }
    this.balls=this.balls.filter(b=>b.y-b.r<=HEIGHT);
    if(this.bricks.every(b=>!b.alive)) {
      this.state=this.stage===3?'won':'stageclear'; this.balls=[];
    } else if(this.balls.length===0) {
      this.lives--; this.state=this.lives>0?'ready':'gameover';
      if(this.lives>0) this.serve();
    }
  }
  serve() {
    this.balls=[{x:this.paddle.x,y:this.paddle.y-8,vx:100,vy:-330-this.stage*20,r:3}];
  }
  buildStage() {
    this.bricks=Array.from({length:14*(9+this.stage)},(_,i)=>({
      x:13+(i%14)*26,y:66+Math.floor(i/14)*13,w:23,h:10,color:Math.floor(Math.floor(i/14)*7/(9+this.stage)),alive:true
    }));
    this.serve();
  }
  nextStage() {
    if(this.state!=='stageclear') return;
    this.stage++; this.state='ready'; this.buildStage();
  }
  reset() { Object.assign(this,new Game()); }
  hitBrick(brick) {
    if(!brick.alive) return;
    brick.alive=false; this.score+=10*this.stage;
    this.events.push({type:'brick',x:brick.x+brick.w/2,y:brick.y+brick.h/2,color:brick.color});
    for(const direction of [-1,1]) if(this.balls.length<MAX_BALLS) {
      this.balls.push({x:brick.x+brick.w/2,y:brick.y+brick.h+4,vx:direction*(95+brick.color*13),vy:260+this.stage*20,r:3});
    }
  }
  constructor() {
    this.events=[];
    this.state = 'ready'; this.lives = 3; this.score = 0; this.stage = 1;
    this.paddle = {x: WIDTH/2, y: HEIGHT-64, w: 84, h: 10};
    this.bricks = Array.from({length:140}, (_,i)=>({
      x:13+(i%14)*26, y:66+Math.floor(i/14)*13, w:23, h:10, color:Math.floor(i/20)%7, alive:true
    }));
    this.balls = [{x:WIDTH/2,y:this.paddle.y-8,vx:100,vy:-330,r:3}];
  }
}
