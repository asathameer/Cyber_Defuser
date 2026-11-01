/* ═══════════════════════════════════════════════════════
   CYBER DEFUSER: AI HIJACK  |  main.js  v3.0
   Anime Chibi · 5 Puzzles · Drones · Lasers · Gates
   ═══════════════════════════════════════════════════════ */
'use strict';

/* ── roundRect polyfill ── */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
    r = Math.min(r, w/2, h/2);
    this.beginPath();
    this.moveTo(x+r,y); this.lineTo(x+w-r,y);
    this.quadraticCurveTo(x+w,y,x+w,y+r);
    this.lineTo(x+w,y+h-r);
    this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    this.lineTo(x+r,y+h);
    this.quadraticCurveTo(x,y+h,x,y+h-r);
    this.lineTo(x,y+r);
    this.quadraticCurveTo(x,y,x+r,y);
    this.closePath(); return this;
  };
}

/* ═══ 1. CONSTANTS ═══ */
const GRAVITY     = 0.52;
const JUMP_VY     = -13;
const RUN_SPD     = 7.5;
const STAND_H     = 72;
const DUCK_H      = 40;
const PLAYER_W    = 26;
const ROOM_W      = 4000;
const CAM_LEAD    = 0.32;
const IFRAMES_MAX = 80;
const KNOCKBACK_V = 8;

/* ═══ 2. AUDIO ═══ */
let _ac = null;
function getAC(){ if(!_ac) _ac=new(window.AudioContext||window.webkitAudioContext)(); return _ac; }
function tone(freq,dur,vol,type){
  try{
    const a=getAC(),t=a.currentTime,o=a.createOscillator(),g=a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type=type||'sine'; o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(vol||0.2,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.start(t); o.stop(t+dur+0.01);
  }catch(_){}
}
const SFX={
  jump:      ()=>{ tone(250,.12,.18); tone(380,.08,.1); },
  land:      ()=>tone(120,.06,.1,'square'),
  step:      ()=>tone(100,.04,.04,'square'),
  hack:      ()=>{ tone(440,.15,.2); tone(660,.15,.18); tone(880,.2,.15); },
  solve:     ()=>{ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.3,.25),i*120)); },
  wrong:     ()=>{ tone(150,.18,.3,'sawtooth'); tone(100,.18,.25,'sawtooth'); },
  hit:       ()=>{ tone(180,.25,.4,'sawtooth'); tone(90,.2,.35,'square'); },
  collect:   ()=>{ tone(784,.1,.2); tone(1047,.15,.18); },
  coin:      ()=>{ tone(1000,.04,.15); setTimeout(()=>tone(1300,.1,.15), 40); },
  switchSFX: ()=>{ tone(500,.08,.2); tone(700,.12,.18); },
  checkpoint:()=>{ [440,550,660,880].forEach((f,i)=>setTimeout(()=>tone(f,.2,.2),i*80)); },
  glitch:    ()=>{ tone(80,.4,.5,'square'); tone(220,.3,.35,'sawtooth'); },
  win:       ()=>{ [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>tone(f,.35,.28),i*150)); }
};

/* ═══ 3. DATA ═══ */
const COMPANIES=[
  {name:'AMAZON',    floors:6,  boss:'NEMESIS-7', col:[255,150,0],  rPF:3,reward:500 },
  {name:'GOOGLE',    floors:10, boss:'OMEGA-X',   col:[66,133,244], rPF:4,reward:700 },
  {name:'MICROSOFT', floors:14, boss:'CORTEX-9',  col:[0,200,210],  rPF:5,reward:1000},
  {name:'OPENAI',    floors:20, boss:'PHANTOM-1', col:[160,60,255], rPF:6,reward:1400},
  {name:'META',      floors:28, boss:'GODNODE',   col:[24,119,242], rPF:7,reward:2000}
];
function CO(){ return COMPANIES[G.ci]; }

const ROOM_THEMES=[
  {wall:'#060c18',fl:'#030810',acc:'#00f2ff',fog:'rgba(0,30,60,.16)',   name:'SERVER ROOM'  },
  {wall:'#0a0618',fl:'#060312',acc:'#cc44ff',fog:'rgba(30,0,60,.16)',   name:'EXEC SUITE'   },
  {wall:'#06100a',fl:'#030a05',acc:'#00ff88',fog:'rgba(0,40,20,.16)',   name:'DATA CENTER'  },
  {wall:'#100606',fl:'#0a0303',acc:'#ff4466',fog:'rgba(60,0,10,.16)',   name:'SECURITY HUB' },
  {wall:'#08060c',fl:'#050408',acc:'#ffaa00',fog:'rgba(40,20,0,.16)',   name:'ARCHIVE VAULT'},
  {wall:'#060a12',fl:'#030709',acc:'#44aaff',fog:'rgba(0,20,50,.16)',   name:'NETWORK CORE' },
  {wall:'#10080a',fl:'#080406',acc:'#ff6644',fog:'rgba(50,10,0,.16)',   name:'AI LAB'       },
  {wall:'#060c0a',fl:'#030806',acc:'#88ff44',fog:'rgba(10,40,0,.16)',   name:'CONTROL ROOM' }
];

const PUZZLE_TYPES=['ODD','PATTERN','MAZE','SEQUENCE','COLORMEM'];
const SHAPES      =['circle','triangle','square','star'];
const ROTSHAPES   =['arrow','triangle','L'];
const COLORS6     =['#ff4466','#00f2ff','#ffe600','#00ff88','#cc44ff','#ff8800'];
const EMOJI_SETS  =[
  ['🍎','🍊','🍋','🍇','🍓','🫐'],
  ['🐶','🐱','🐭','🐰','🦊','🐻'],
  ['⚡','🔥','💧','🌿','❄️','🌊'],
  ['⭐','🌙','♥','💎','🔑','🎯'],
  ['🚀','✈️','🚗','⛵','🚂','🏍️']
];

/* ═══ 4. STATE ═══ */
const G={
  screen:'login', name:'AGENT', gender:'boy',
  ci:0,fi:0,ri:0,units:0,
  lives:5,maxLives:5,
  room:null,puzzleData:null,
  nearPC:false,nearSwitch:null,transitioning:false
};
const P={
  x:150,y:0,vx:0,vy:0,
  onGround:false,ducking:false,
  facing:1,action:'idle',
  frame:0,frameTick:0,stepTick:0,prevY:0,
  hasCard:false,iframes:0,knockback:0,checkpointX:150
};
const KEYS={};

/* ═══ 5. CANVAS ═══ */
const GC  = document.getElementById('game-canvas');
const CTX = GC.getContext('2d');
const PCV = document.getElementById('puzzle-canvas');
const PCX = PCV.getContext('2d');
let FLOOR_Y=0;

function resize(){
  GC.width=window.innerWidth; GC.height=window.innerHeight;
  FLOOR_Y=GC.height-90;
  if(G.room&&P.y>FLOOR_Y) P.y=FLOOR_Y;
}
resize();
window.addEventListener('resize',resize);

/* ═══ 6. HELPERS ═══ */
function rng(seed){ let s=(seed+1)*48271; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/0xffffffff; }; }
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];} return a; }
function hexToRgb(h){ return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){ return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by; }

/* ═══ 7. ROOM GENERATOR ═══ */
function genRoom(ci,fi,ri){
  const r=rng(ci*100000+fi*1000+ri+7);
  const dif=fi+ci*3;
  const SAFE=450;
  const zone=ROOM_W-SAFE-500;

  /* Tables */
  const obs=[];
  const nT=Math.min(2+(dif/2|0),8);
  for(let i=0;i<nT;i++){
    const bx=SAFE+(zone/nT)*i+r()*(zone/nT*.5);
    obs.push({type:'table',x:bx|0,w:(65+r()*65)|0,h:(55+r()*45)|0});
  }

  /* Ceiling pipes from floor 4+ */
  if(fi>=4){
    const nP=Math.min(1+(dif/5|0),4);
    for(let i=0;i<nP;i++)
      obs.push({type:'pipe',x:(750+i*450+r()*200)|0,w:(70+r()*55)|0});
  }

  /* Security Gates (2 per room) */
  const gateX1=(1500+r()*200)|0;
  const gateX2=(2700+r()*200)|0;
  const gates=[
    {id:0,x:gateX1,open:false},
    {id:1,x:gateX2,open:false}
  ];

  /* Switches (one per gate, placed before each gate) */
  const switches=[
    {id:0,x:(gateX1-380-r()*120)|0,on:false,gateId:0},
    {id:1,x:(gateX2-350-r()*120)|0,on:false,gateId:1}
  ];

  /* Pulsing Lasers */
  const lasers=[];
  const nL=Math.min(1+(dif/3|0),5);
  const lzones=[900,1900,2500,3100,3400];
  for(let i=0;i<nL;i++){
    lasers.push({
      x:(lzones[i]+r()*160)|0,
      period:(90+r()*60)|0,
      onFrames:(28+r()*24)|0,
      t:(r()*80)|0
    });
  }

  /* Patrol Drones */
  const drones=[];
  const nD=Math.min(4+(dif/2|0),8);
  const dzones=[700,1200,1600,2000,2400,2800,3100,3400];
  for(let i=0;i<Math.min(nD,dzones.length);i++){
    const dx=(dzones[i]+r()*250)|0;
    const range=(220+r()*160)|0;
    drones.push({x:dx,y:0,vx:(r()>.5?1:-1)*(1.5+r()*1.2),
      rangeL:dx-range,rangeR:dx+range,w:36,h:28});
  }

  /* Moving Platforms */
  const platforms=[];
  const nPl=Math.min(2+(dif/4|0),5);
  const plzones=[1100,2100,3000,3200,3600];
  for(let i=0;i<Math.min(nPl,plzones.length);i++){
    const px=(plzones[i]+r()*200)|0;
    const range=(140+r()*120)|0;
    platforms.push({
      x:px,y:0,baseY:(110+r()*80)|0,
      w:(90+r()*55)|0,h:12,
      vx:(r()>.5?1:-1)*(1.2+r()*.8),
      rangeL:px-range,rangeR:px+range
    });
  }

  /* Keycard (must collect before hacking) */
  const keycard={x:(3450+r()*130)|0,taken:false};

  /* Mid-room Checkpoint */
  const checkpoint={x:(1900+r()*200)|0,activated:false};

  /* Background Decor */
  const decor=[];
  const dt=['chair','plant','server','chair','plant','server'];
  for(let i=0;i<13;i++)
    decor.push({type:dt[(r()*dt.length)|0],x:(100+i*300+r()*200)|0});

  const pType  =PUZZLE_TYPES[(r()*PUZZLE_TYPES.length)|0];
  const theme  =ROOM_THEMES[(ci*7+fi*3+ri*2)%ROOM_THEMES.length];

  /* Scattered Coins */
  const coins=[];
  const nCoins=10+r()*15|0;
  for(let i=0;i<nCoins;i++){
    coins.push({x:(600+r()*(ROOM_W-1200))|0,y:(FLOOR_Y-20-r()*120)|0,bob:r()*Math.PI*2,collected:false});
  }

  return{obs,gates,switches,lasers,drones,platforms,coins,
    keycard,checkpoint,decor,
    pc:{x:ROOM_W-280,solved:false,glitch:false},
    door:{x:ROOM_W-70},
    pType,theme,
    glitchTimer:20+r()*40,glitching:false,glitchCD:0};
}

/* ═══ 8. INIT ROOM ═══ */
function initRoom(ci,fi,ri){
  G.ci=ci; G.fi=fi; G.ri=ri;
  G.lives=G.maxLives||5;
  G.room=genRoom(ci,fi,ri);
  G.nearPC=false; G.nearSwitch=null; G.transitioning=false;

  /* Set drone & platform Y after FLOOR_Y is known */
  G.room.drones.forEach(d=>{ d.y=FLOOR_Y-140-(Math.random()*60|0); });
  G.room.platforms.forEach(p=>{ p.y=FLOOR_Y-p.baseY; });

  P.x=150; P.y=FLOOR_Y; P.vx=0; P.vy=0;
  P.onGround=true; P.ducking=false;
  P.facing=1; P.action='idle';
  P.frame=0; P.frameTick=0; P.stepTick=0;
  P.hasCard=false; P.iframes=0; P.knockback=0; P.checkpointX=150;
}

/* ═══ 9. PHYSICS ═══ */
function updatePlayer(dt){
  if(!G.room||G.transitioning) return;

  const right=KEYS['ArrowRight']||KEYS['d'];
  const left =KEYS['ArrowLeft'] ||KEYS['a'];
  const jump =KEYS['ArrowUp']   ||KEYS['w']||KEYS[' '];
  const duck =KEYS['ArrowDown'] ||KEYS['s'];

  P.ducking=!!(duck&&P.onGround&&P.knockback<=0);
  const hW=PLAYER_W/2;

  /* Timers */
  if(P.iframes>0) P.iframes--;
  if(P.knockback>0){ P.knockback--; P.vx*=0.86; }
  else{
    if(right){ P.vx=P.ducking?RUN_SPD*.55:RUN_SPD;  P.facing= 1; }
    else if(left){ P.vx=P.ducking?-RUN_SPD*.55:-RUN_SPD; P.facing=-1; }
    else P.vx=0;
  }

  /* Jump */
  if(jump&&P.onGround&&!P.ducking&&P.knockback<=0){
    P.vy=JUMP_VY; P.onGround=false; SFX.jump();
  }

  /* Moving platforms advance */
  G.room.platforms.forEach(pl=>{
    pl.x+=pl.vx;
    if(pl.x<=pl.rangeL||pl.x>=pl.rangeR) pl.vx*=-1;
  });

  /* Drones advance */
  G.room.drones.forEach(d=>{
    d.x+=d.vx;
    if(d.x<=d.rangeL||d.x>=d.rangeR) d.vx*=-1;
  });

  /* Lasers tick */
  G.room.lasers.forEach(l=>{ l.t=(l.t+1)%l.period; });

  /* X movement */
  P.prevY=P.y;
  P.x+=P.vx;
  P.x=Math.max(50,P.x);

  /* Table X collision */
  G.room.obs.forEach(ob=>{
    if(ob.type!=='table') return;
    const oTop=FLOOR_Y-ob.h;
    if(P.y>oTop+4){
      const oL=ob.x,oR=ob.x+ob.w,pL=P.x-hW,pR=P.x+hW;
      if(pR>oL+4&&pL<oR-4){
        if(P.vx>0) P.x=oL-hW-1;
        else if(P.vx<0) P.x=oR+hW+1;
      }
    }
  });

  /* Pipe X collision (duck to pass) */
  G.room.obs.forEach(ob=>{
    if(ob.type!=='pipe'||P.ducking) return;
    const oL=ob.x,oR=ob.x+ob.w,pL=P.x-hW,pR=P.x+hW;
    if(pR>oL+4&&pL<oR-4){
      if(P.vx>0) P.x=oL-hW-1;
      else if(P.vx<0) P.x=oR+hW+1;
    }
  });

  /* Gate X collision */
  G.room.gates.forEach(gate=>{
    if(gate.open) return;
    const gL=gate.x-12,gR=gate.x+12,pL=P.x-hW,pR=P.x+hW;
    if(pR>gL+4&&pL<gR-4){
      if(P.vx>0) P.x=gL-hW-1;
      else if(P.vx<0) P.x=gR+hW+1;
    }
  });

  /* Y movement */
  P.vy=Math.min(P.vy+GRAVITY,22);
  P.y+=P.vy;
  P.onGround=false;

  /* Platform landing */
  G.room.platforms.forEach(pl=>{
    const pL=P.x-hW,pR=P.x+hW;
    if(pR>pl.x&&pL<pl.x+pl.w){
      if(P.vy>=0&&P.y>=pl.y&&P.prevY<=pl.y+2){
        P.y=pl.y; P.vy=0; P.onGround=true;
      }
    }
  });

  /* Floor */
  if(P.y>=FLOOR_Y){
    if(P.vy>4) SFX.land();
    P.y=FLOOR_Y; P.vy=0; P.onGround=true;
  }

  /* Table tops */
  G.room.obs.forEach(ob=>{
    if(ob.type!=='table') return;
    const oTop=FLOOR_Y-ob.h,pL=P.x-hW,pR=P.x+hW;
    if(pR>ob.x+4&&pL<ob.x+ob.w-4){
      if(P.vy>=0&&P.y>=oTop&&P.prevY<=oTop+2){
        P.y=oTop; P.vy=0; P.onGround=true;
      }
    }
  });

  /* Animation */
  P.frameTick+=dt;
  if(P.frameTick>90){
    P.frameTick=0; P.frame=(P.frame+1)%4;
    if(P.onGround&&Math.abs(P.vx)>.5){
      P.stepTick++;
      if(P.stepTick>=3){ SFX.step(); P.stepTick=0; }
    }
  }
  P.action=!P.onGround?'jump':P.ducking?'duck':Math.abs(P.vx)>.5?'run':'idle';

  /* Keycard pickup */
  const kc=G.room.keycard;
  if(!kc.taken&&!P.hasCard){
    const pH=P.ducking?DUCK_H:STAND_H;
    if(P.x+hW>kc.x-14&&P.x-hW<kc.x+14&&P.y>FLOOR_Y-30&&P.y-pH<FLOOR_Y){
      kc.taken=true; P.hasCard=true; SFX.collect();
      showToast('🔑  KEYCARD OBTAINED!');
    }
  }

  /* Coins pickup */
  G.room.coins.forEach(c=>{
    if(!c.collected){
      const pH=P.ducking?DUCK_H:STAND_H;
      if(P.x+hW>c.x-8&&P.x-hW<c.x+8&&P.y>c.y-8&&P.y-pH<c.y+8){
        c.collected=true; G.units+=10; SFX.coin();
      }
    }
  });

  /* Checkpoint */
  const cp=G.room.checkpoint;
  if(!cp.activated&&P.x>cp.x){
    cp.activated=true; P.checkpointX=cp.x;
    G.units+=40*(G.fi+1); SFX.checkpoint();
    showToast(`✓ CHECKPOINT  +${40*(G.fi+1)} UNITS`);
  }

  /* Laser hazard */
  if(P.iframes<=0){
    G.room.lasers.forEach(l=>{
      if(l.t>=l.onFrames) return;
      const pH=P.ducking?DUCK_H:STAND_H;
      if(rectsOverlap(P.x-hW,P.y-pH,PLAYER_W,pH,l.x-5,FLOOR_Y-STAND_H-12,10,STAND_H+12))
        hitPlayer();
    });
  }

  /* Drone hazard */
  if(P.iframes<=0){
    G.room.drones.forEach(d=>{
      if(rectsOverlap(P.x-hW,P.y-STAND_H,PLAYER_W,STAND_H,d.x,d.y,d.w,d.h))
        hitPlayer();
    });
  }

  /* Near switch? */
  G.nearSwitch=null;
  G.room.switches.forEach(sw=>{
    if(!sw.on&&Math.abs(P.x-sw.x)<70&&P.onGround) G.nearSwitch=sw;
  });

  /* Near PC? */
  const comp=G.room.pc;
  G.nearPC=!comp.solved&&P.hasCard&&Math.abs(P.x-comp.x)<90&&P.onGround&&!P.ducking;

  /* E key */
  if(KEYS['e']||KEYS['E']){
    KEYS['e']=KEYS['E']=false;
    if(G.nearSwitch) activateSwitch(G.nearSwitch);
    else if(G.nearPC) openPuzzle();
  }

  /* Door advance */
  if(comp.solved&&P.x>=G.room.door.x-30&&!G.transitioning) doTransition();

  /* AI glitch */
  if(!G.room.glitching){
    G.room.glitchTimer-=dt/1000;
    if(G.room.glitchTimer<=0){
      G.room.glitching=true; G.room.glitchCD=2+Math.random()*1.5;
      G.room.pc.glitch=true; SFX.glitch();
    }
  } else {
    G.room.glitchCD-=dt/1000;
    if(G.room.glitchCD<=0){
      G.room.glitching=false;
      G.room.glitchTimer=20+Math.random()*40;
      G.room.pc.glitch=false;
    }
  }
}

let restartTimer = null;

function hitPlayer(){
  if(P.iframes>0 || G.screen!=='game' || G.transitioning) return;
  G.lives--;
  if(G.lives > 0){
    P.iframes=IFRAMES_MAX; P.knockback=28;
    P.vx=P.facing*-KNOCKBACK_V; P.vy=-5.5;
    P.onGround=false; SFX.hit();
    showToast(`⚡  HIT! LIVES REMAINING: ${G.lives}/${G.maxLives||5}`);
  } else {
    G.lives = 0;
    triggerRoundRestart();
  }
}

function triggerRoundRestart(){
  if(G.screen === 'gameover') return;
  G.screen = 'gameover';
  SFX.glitch();

  const m = document.getElementById('gameover-modal');
  const sub = m ? m.querySelector('.modal-sub') : null;
  if(sub) sub.innerHTML = `All ${G.maxLives||5} lives lost! AI defenses engaged.<br><span style="color:#ff4466;font-size:0.75rem;letter-spacing:2px;display:inline-block;margin-top:8px;">RESTARTING ROUND IN 2 SECONDS...</span>`;
  if(m) m.classList.remove('hidden');

  if(restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(()=>{
    restartCurrentRound();
  }, 2000);
}

function restartCurrentRound(){
  if(restartTimer){ clearTimeout(restartTimer); restartTimer = null; }
  const m = document.getElementById('gameover-modal');
  if(m) m.classList.add('hidden');
  if(G.puzzleData) closePuzzle();
  G.screen = 'game';
  initRoom(G.ci, G.fi, G.ri);
  showToast(`🔄 ROUND RESTARTED · ${G.maxLives||5} LIVES RESTORED`);
}

function activateSwitch(sw){
  if(sw.on) return;
  sw.on=true; SFX.switchSFX();
  const gate=G.room.gates.find(g=>g.id===sw.gateId);
  if(gate) gate.open=true;
  showToast(`🔓  SECURITY GATE ${sw.gateId+1} OPENED`);
}

/* Toast */
let toastMsg='',toastTimer=0;
function showToast(msg){ toastMsg=msg; toastTimer=200; }

/* ═══ 10. RENDERER ═══ */
function renderGame(){
  if(!G.room) return;
  CTX.clearRect(0,0,GC.width,GC.height);
  const camX=Math.max(0,Math.min(P.x-GC.width*CAM_LEAD,ROOM_W-GC.width));
  drawBg(camX);
  drawDecor(camX);
  drawPlatforms(camX);
  drawObs(camX);
  drawLasers(camX);
  drawGates(camX);
  drawSwitches(camX);
  drawCoins(camX);
  drawKeycard(camX);
  drawCheckpoint(camX);
  drawPC(camX);
  drawDoor(camX);
  drawDrones(camX);
  drawChar(camX);
  drawHUD();
  drawToastUI();
  drawPrompts();
}

/* Background */
function drawBg(camX){
  const th=G.room.theme;
  const [ar,ag,ab]=hexToRgb(th.acc);
  const sky=CTX.createLinearGradient(0,0,0,GC.height);
  sky.addColorStop(0,th.wall); sky.addColorStop(1,th.fl);
  CTX.fillStyle=sky; CTX.fillRect(0,0,GC.width,GC.height);
  CTX.fillStyle=th.fog; CTX.fillRect(0,0,GC.width,GC.height);
  for(let y=0;y<GC.height;y+=4){CTX.fillStyle='rgba(0,0,0,.08)';CTX.fillRect(0,y,GC.width,1);}
  CTX.strokeStyle=`rgba(${ar},${ag},${ab},.07)`; CTX.lineWidth=1;
  for(let x=-camX%85;x<GC.width;x+=85){CTX.beginPath();CTX.moveTo(x,0);CTX.lineTo(x,GC.height);CTX.stroke();}
  for(let y=62;y<GC.height;y+=85){CTX.beginPath();CTX.moveTo(0,y);CTX.lineTo(GC.width,y);CTX.stroke();}
  [300,700,1100,1500,1900,2400,2900,3400,3900].forEach(wx=>{
    const sx=wx-camX; if(sx>-160&&sx<GC.width+60) drawWindow(sx,GC.height*.1,ar,ag,ab);
  });
  const fl=CTX.createLinearGradient(0,FLOOR_Y,0,GC.height);
  fl.addColorStop(0,`rgba(${ar*.25|0},${ag*.25|0},${ab*.25|0},1)`);
  fl.addColorStop(1,'#010204');
  CTX.fillStyle=fl; CTX.fillRect(0,FLOOR_Y,GC.width,GC.height-FLOOR_Y);
  CTX.strokeStyle=th.acc; CTX.lineWidth=2; CTX.globalAlpha=.4;
  CTX.beginPath(); CTX.moveTo(0,FLOOR_Y); CTX.lineTo(GC.width,FLOOR_Y); CTX.stroke();
  CTX.globalAlpha=1;
  CTX.strokeStyle=`rgba(${ar},${ag},${ab},.08)`; CTX.lineWidth=1;
  for(let x=-camX%100;x<GC.width;x+=100){CTX.beginPath();CTX.moveTo(x,FLOOR_Y);CTX.lineTo(x,GC.height);CTX.stroke();}
  CTX.fillStyle=`rgba(${ar},${ag},${ab},.14)`; CTX.fillRect(0,0,GC.width,4);
}

function drawWindow(sx,sy,r,g,b){
  const w=100,h=130;
  CTX.fillStyle='#0a1830'; CTX.fillRect(sx,sy,w,h);
  const wg=CTX.createLinearGradient(sx,sy,sx,sy+h);
  wg.addColorStop(0,`rgba(${r*.3|0},${g*.3|0},${b*.4|0},.55)`);
  wg.addColorStop(1,'rgba(0,0,8,.8)');
  CTX.fillStyle=wg; CTX.fillRect(sx,sy,w,h);
  CTX.strokeStyle=`rgba(${r},${g},${b},.22)`; CTX.lineWidth=1;
  CTX.strokeRect(sx,sy,w,h);
  CTX.beginPath(); CTX.moveTo(sx+w/2,sy); CTX.lineTo(sx+w/2,sy+h); CTX.stroke();
  CTX.beginPath(); CTX.moveTo(sx,sy+h/2); CTX.lineTo(sx+w,sy+h/2); CTX.stroke();
  CTX.fillStyle='#000820'; CTX.fillRect(sx,sy+h-25,w,25);
  let bx=sx+3;
  [7,8,6,9,7,8,6].forEach(bw=>{
    CTX.fillStyle='#000a18';
    CTX.fillRect(bx,sy+h-25-(10+(Math.sin(bx)*12|0)),bw,10+(Math.sin(bx)*12|0));
    bx+=bw+3;
  });
}

/* Decor */
function drawDecor(camX){
  G.room.decor.forEach(d=>{
    const sx=d.x-camX; if(sx<-120||sx>GC.width+80) return;
    if(d.type==='chair') drawBgChair(sx);
    else if(d.type==='plant') drawBgPlant(sx);
    else drawBgServer(sx);
  });
}
function drawBgChair(sx){
  const y=FLOOR_Y; CTX.globalAlpha=.38;
  CTX.fillStyle='#151528'; CTX.fillRect(sx,y-42,32,7);
  CTX.fillStyle='#0e0e1c'; CTX.fillRect(sx+6,y-68,20,26);
  CTX.fillStyle='#0a0a14';
  CTX.fillRect(sx+4,y-35,4,35); CTX.fillRect(sx+24,y-35,4,35);
  CTX.globalAlpha=1;
}
function drawBgPlant(sx){
  const y=FLOOR_Y; CTX.globalAlpha=.38;
  CTX.fillStyle='#2a1a08'; CTX.fillRect(sx,y-20,16,20);
  CTX.fillStyle='#074015'; CTX.beginPath(); CTX.ellipse(sx+8,y-26,18,22,0,0,Math.PI*2); CTX.fill();
  CTX.fillStyle='#0a5520'; CTX.beginPath(); CTX.ellipse(sx+8,y-30,12,16,0,0,Math.PI*2); CTX.fill();
  CTX.globalAlpha=1;
}
function drawBgServer(sx){
  const y=FLOOR_Y; const [ar,ag,ab]=hexToRgb(G.room.theme.acc); CTX.globalAlpha=.38;
  CTX.fillStyle='#111'; CTX.fillRect(sx,y-90,28,90);
  CTX.strokeStyle='#2a2a2a'; CTX.lineWidth=1; CTX.strokeRect(sx,y-90,28,90);
  for(let i=0;i<5;i++){
    const on=Math.floor(Date.now()/400+i)%2;
    CTX.fillStyle=on?`rgb(${ar},${ag},${ab})`:'#1a1a1a';
    CTX.fillRect(sx+5,y-85+i*16,5,5);
  }
  CTX.globalAlpha=1;
}

/* Obstacles */
function drawObs(camX){
  G.room.obs.forEach(ob=>{
    const sx=ob.x-camX; if(sx<-220||sx>GC.width+160) return;
    if(ob.type==='table') drawTable(sx,ob.w,ob.h); else drawPipe(sx,ob.w);
  });
}
function drawTable(sx,w,h){
  const ty=FLOOR_Y-h; const acc=G.room.theme.acc;
  CTX.fillStyle='#1a0e04'; CTX.fillRect(sx+8,ty+8,10,h-8); CTX.fillRect(sx+w-18,ty+8,10,h-8);
  CTX.fillStyle='#3a2010'; CTX.fillRect(sx,ty,w,8);
  CTX.fillStyle='#271508'; CTX.fillRect(sx,ty+8,w,h-8);
  CTX.fillStyle='#4a2a14'; CTX.fillRect(sx,ty,w,3);
  CTX.fillStyle='#0c0c0c'; CTX.fillRect(sx+w*.1,ty-4,w*.45,4);
  CTX.fillStyle='#0a0a14'; CTX.fillRect(sx+w*.55,ty-32,w*.3,26);
  CTX.fillStyle=acc; CTX.globalAlpha=.1; CTX.fillRect(sx+w*.56,ty-31,w*.28,24); CTX.globalAlpha=1;
  CTX.strokeStyle=acc; CTX.globalAlpha=.18; CTX.lineWidth=1; CTX.strokeRect(sx,ty,w,h); CTX.globalAlpha=1;
}
function drawPipe(sx,w){
  const bot=FLOOR_Y-STAND_H+2;
  CTX.fillStyle='#180028'; CTX.fillRect(sx,0,w,bot);
  CTX.fillStyle='#210038'; CTX.fillRect(sx+2,0,w-4,bot-3);
  for(let i=0;i<Math.ceil(w/18);i++){
    CTX.fillStyle=i%2===0?'rgba(255,200,0,.55)':'rgba(0,0,0,.15)';
    CTX.fillRect(sx+i*18,bot-11,18,11);
  }
  CTX.strokeStyle='rgba(255,180,0,.55)'; CTX.lineWidth=2; CTX.strokeRect(sx,0,w,bot);
  CTX.fillStyle='rgba(255,220,0,.9)'; CTX.font='bold 10px monospace'; CTX.textAlign='center';
  CTX.fillText('▼ DUCK ▼',sx+w/2,bot-14); CTX.textAlign='left';
}

/* Platforms */
function drawPlatforms(camX){
  G.room.platforms.forEach(pl=>{
    const sx=pl.x-camX; if(sx<-200||sx>GC.width+200) return;
    const [ar,ag,ab]=hexToRgb(G.room.theme.acc);
    CTX.fillStyle='#1a1a2e'; CTX.fillRect(sx,pl.y,pl.w,pl.h);
    CTX.fillStyle=G.room.theme.acc; CTX.globalAlpha=.75;
    CTX.fillRect(sx,pl.y,pl.w,2); CTX.fillRect(sx,pl.y,4,pl.h); CTX.fillRect(sx+pl.w-4,pl.y,4,pl.h);
    CTX.globalAlpha=1;
    const grd=CTX.createLinearGradient(sx,pl.y+pl.h,sx,pl.y+pl.h+30);
    grd.addColorStop(0,`rgba(${ar},${ag},${ab},.18)`); grd.addColorStop(1,'transparent');
    CTX.fillStyle=grd; CTX.fillRect(sx,pl.y+pl.h,pl.w,30);
  });
}

/* Lasers */
function drawLasers(camX){
  G.room.lasers.forEach(l=>{
    const sx=l.x-camX; if(sx<-40||sx>GC.width+40) return;
    const active=l.t<l.onFrames;
    const laserH=STAND_H+22;
    const top=FLOOR_Y-laserH;
    /* Emitter */
    CTX.fillStyle='#1a1a1a'; CTX.fillRect(sx-8,FLOOR_Y-9,16,9);
    CTX.fillStyle='#333'; CTX.fillRect(sx-5,FLOOR_Y-13,10,6);
    if(active){
      const it=(Math.sin(Date.now()/80)+1)/2;
      CTX.fillStyle=`rgba(255,30,30,${.7+it*.28})`; CTX.fillRect(sx-4,top,8,laserH);
      const grd=CTX.createLinearGradient(sx-22,0,sx+22,0);
      grd.addColorStop(0,'transparent'); grd.addColorStop(.5,'rgba(255,0,0,.2)'); grd.addColorStop(1,'transparent');
      CTX.fillStyle=grd; CTX.fillRect(sx-22,top,44,laserH);
      CTX.fillStyle='rgba(255,60,0,.65)';
      CTX.beginPath(); CTX.arc(sx,top,7,0,Math.PI*2); CTX.fill();
    } else {
      const pct=1-(l.t-l.onFrames)/(l.period-l.onFrames);
      CTX.fillStyle='rgba(255,60,0,.15)'; CTX.fillRect(sx-7,FLOOR_Y-13,14,4);
      CTX.fillStyle='rgba(255,60,0,.6)'; CTX.fillRect(sx-7,FLOOR_Y-13,14*Math.max(0,pct)|0,4);
    }
    CTX.fillStyle='rgba(255,200,0,.28)'; CTX.fillRect(sx-4,FLOOR_Y-3,8,3);
  });
}

/* Gates */
function drawGates(camX){
  G.room.gates.forEach(gate=>{
    const sx=gate.x-camX; if(sx<-120||sx>GC.width+120) return;
    const [ar,ag,ab]=hexToRgb(G.room.theme.acc);
    const gTop=FLOOR_Y-210;
    if(gate.open){
      CTX.globalAlpha=.12; CTX.fillStyle=G.room.theme.acc; CTX.fillRect(sx-12,gTop,24,210); CTX.globalAlpha=1;
    } else {
      CTX.fillStyle='#0a0a1a'; CTX.fillRect(sx-12,gTop,24,210);
      const now=Date.now();
      for(let i=0;i<6;i++){
        const p=(Math.sin(now/280+i*1.3)+1)/2;
        CTX.fillStyle=`rgba(${ar},${ag},${ab},${.35+p*.55})`; CTX.fillRect(sx-10,gTop+10+i*32,20,10);
      }
      CTX.strokeStyle=G.room.theme.acc; CTX.lineWidth=2; CTX.globalAlpha=.75;
      CTX.strokeRect(sx-12,gTop,24,210); CTX.globalAlpha=1;
      CTX.font='9px monospace'; CTX.textAlign='center'; CTX.fillStyle=G.room.theme.acc;
      CTX.fillText(`GATE ${gate.id+1}`,sx,gTop-8); CTX.textAlign='left';
    }
  });
}

/* Switches */
function drawSwitches(camX){
  G.room.switches.forEach(sw=>{
    const sx=sw.x-camX; if(sx<-80||sx>GC.width+80) return;
    const y=FLOOR_Y; const [ar,ag,ab]=hexToRgb(G.room.theme.acc);
    CTX.fillStyle='#111'; CTX.fillRect(sx-12,y-60,24,52);
    CTX.strokeStyle=sw.on?'#00ff88':G.room.theme.acc; CTX.lineWidth=1.5; CTX.strokeRect(sx-12,y-60,24,52);
    CTX.fillStyle=sw.on?'#00ff88':'#ff4444';
    CTX.beginPath(); CTX.arc(sx,y-38,9,0,Math.PI*2); CTX.fill();
    if(!sw.on){
      const p=(Math.sin(Date.now()/380)+1)/2;
      CTX.fillStyle=`rgba(${ar},${ag},${ab},${.3+p*.4})`;
      CTX.beginPath(); CTX.arc(sx,y-38,14,0,Math.PI*2); CTX.fill();
    }
    CTX.font='7px monospace'; CTX.textAlign='center';
    CTX.fillStyle=sw.on?'#00ff88':'#aaa';
    CTX.fillText(sw.on?'OPEN':'PRESS E',sx,y-11);
    CTX.fillText(`→G${sw.gateId+1}`,sx,y-3); CTX.textAlign='left';
  });
}

/* Coins */
function drawCoins(camX){
  const now=Date.now();
  G.room.coins.forEach(c=>{
    if(c.collected) return;
    const sx=c.x-camX; if(sx<-20||sx>GC.width+20) return;
    const y=c.y+Math.sin(now/200+c.bob)*4;
    CTX.fillStyle='#ffaa00'; CTX.beginPath(); CTX.arc(sx,y,6,0,Math.PI*2); CTX.fill();
    CTX.fillStyle='#ffdd00'; CTX.beginPath(); CTX.arc(sx,y,4,0,Math.PI*2); CTX.fill();
    CTX.fillStyle='#fff'; CTX.fillRect(sx-1,y-2,2,4);
    CTX.strokeStyle='rgba(255,170,0,0.5)'; CTX.lineWidth=2; CTX.stroke();
  });
}

/* Keycard */
function drawKeycard(camX){
  const kc=G.room.keycard; if(kc.taken) return;
  const sx=kc.x-camX; if(sx<-60||sx>GC.width+60) return;
  const bob=Math.sin(Date.now()/400)*5;
  const y=FLOOR_Y-20+bob;
  const grd=CTX.createRadialGradient(sx,y,0,sx,y,38);
  grd.addColorStop(0,'rgba(255,220,0,.4)'); grd.addColorStop(1,'transparent');
  CTX.fillStyle=grd; CTX.fillRect(sx-38,y-38,76,76);
  CTX.fillStyle='#ffd700'; CTX.beginPath(); CTX.roundRect(sx-13,y-7,26,15,2); CTX.fill();
  CTX.fillStyle='#aa8800'; CTX.fillRect(sx-9,y-3,5,7); CTX.fillRect(sx+1,y-3,8,7);
  CTX.fillStyle='#ccaa00'; CTX.fillRect(sx-4,y-1,8,5);
  CTX.fillStyle='#ffdd00'; CTX.font='bold 8px monospace'; CTX.textAlign='center';
  CTX.fillText('🔑 KEYCARD',sx,y+20); CTX.textAlign='left';
}

/* Checkpoint */
function drawCheckpoint(camX){
  const cp=G.room.checkpoint;
  const sx=cp.x-camX; if(sx<-80||sx>GC.width+80) return;
  const y=FLOOR_Y;
  CTX.fillStyle='#2a2a2a'; CTX.fillRect(sx-2,y-165,4,165);
  CTX.fillStyle=cp.activated?'#00ff88':'#555';
  CTX.beginPath(); CTX.moveTo(sx+2,y-165); CTX.lineTo(sx+34,y-152); CTX.lineTo(sx+2,y-139); CTX.closePath(); CTX.fill();
  if(cp.activated){
    const grd=CTX.createRadialGradient(sx,y-152,0,sx,y-152,55);
    grd.addColorStop(0,'rgba(0,255,136,.22)'); grd.addColorStop(1,'transparent');
    CTX.fillStyle=grd; CTX.fillRect(sx-60,y-210,120,120);
    CTX.fillStyle='#00ff88'; CTX.font='7px monospace'; CTX.textAlign='center';
    CTX.fillText('✓ SAVED',sx,y-172); CTX.textAlign='left';
  } else {
    CTX.fillStyle='#666'; CTX.font='7px monospace'; CTX.textAlign='center';
    CTX.fillText('CHECKPOINT',sx,y-172); CTX.textAlign='left';
  }
}

/* Computer Terminal */
function drawPC(camX){
  const pc=G.room.pc; const sx=pc.x-camX;
  if(sx<-260||sx>GC.width+130) return;
  const y=FLOOR_Y; const now=Date.now(); const {solved,glitch}=pc; const needCard=!P.hasCard&&!solved;
  CTX.fillStyle='#3a2010'; CTX.fillRect(sx-30,y-58,110,10);
  CTX.fillStyle='#1a0e04'; CTX.fillRect(sx-22,y-48,10,48); CTX.fillRect(sx+58,y-48,10,48);
  CTX.fillStyle='#1a1a1a'; CTX.fillRect(sx+18,y-112,10,54); CTX.fillRect(sx+5,y-60,38,5);
  CTX.fillStyle='#111'; CTX.fillRect(sx-10,y-178,80,65);
  const col=glitch?'#ff003a':solved?'#00ff88':needCard?'#ffaa00':'#00f2ff';
  CTX.strokeStyle=col; CTX.lineWidth=glitch?2.5:1; CTX.globalAlpha=glitch?1:.35;
  CTX.strokeRect(sx-10,y-178,80,65); CTX.globalAlpha=1;
  if(glitch){
    CTX.fillStyle=`hsl(${now%360},100%,22%)`; CTX.fillRect(sx-5,y-173,70,55);
    for(let i=0;i<4;i++){const gy=y-173+(Math.random()*55|0);CTX.fillStyle=`rgba(255,0,${Math.random()*200|0},.85)`;CTX.fillRect(sx-5,gy,70,2+Math.random()*5);}
    CTX.font='bold 20px monospace'; CTX.textAlign='center'; CTX.fillStyle='#fff'; CTX.fillText('👁 AI 👁',sx+30,y-147);
    CTX.font='8px monospace'; CTX.fillStyle='#ff9'; CTX.fillText('INTRUSION',sx+30,y-133); CTX.textAlign='left';
  } else if(solved){
    CTX.fillStyle='#001800'; CTX.fillRect(sx-5,y-173,70,55);
    CTX.font='bold 13px monospace'; CTX.textAlign='center'; CTX.fillStyle='#00ff88'; CTX.fillText('✓ SECURED',sx+30,y-144); CTX.textAlign='left';
  } else if(needCard){
    CTX.fillStyle='#1a0e00'; CTX.fillRect(sx-5,y-173,70,55);
    CTX.font='20px sans-serif'; CTX.textAlign='center'; CTX.fillText('🔑',sx+30,y-147);
    CTX.font='7px monospace'; CTX.fillStyle='#ffaa00'; CTX.fillText('CARD REQUIRED',sx+30,y-130); CTX.textAlign='left';
  } else {
    CTX.fillStyle='#000e18'; CTX.fillRect(sx-5,y-173,70,55);
    CTX.font='9px monospace'; CTX.textAlign='center'; CTX.fillStyle='#00f2ff';
    CTX.fillText('> LOCKED_',sx+30,y-154); CTX.fillText('HACK ME',sx+30,y-141);
    if(Math.floor(now/550)%2){CTX.fillStyle='#00f2ff';CTX.fillRect(sx+5,y-133,6,8);}
    CTX.textAlign='left';
    const ag2=CTX.createRadialGradient(sx+30,y-145,0,sx+30,y-145,80);
    ag2.addColorStop(0,'rgba(0,242,255,.12)'); ag2.addColorStop(1,'transparent');
    CTX.fillStyle=ag2; CTX.fillRect(sx-60,y-215,180,155);
  }
}

/* Door */
function drawDoor(camX){
  const d=G.room.door; const sx=d.x-camX;
  if(sx<-160||sx>GC.width+80) return;
  const y=FLOOR_Y; const open=G.room.pc.solved;
  CTX.fillStyle='#0e1e38'; CTX.fillRect(sx,y-185,65,185);
  CTX.fillStyle=open?'#001c1c':'#090d14'; CTX.fillRect(sx+3,y-181,59,181);
  CTX.strokeStyle=open?'#00ff88':'#222'; CTX.lineWidth=1; CTX.globalAlpha=.4;
  CTX.strokeRect(sx+8,y-172,49,160); CTX.globalAlpha=1;
  CTX.font='20px sans-serif'; CTX.textAlign='center';
  CTX.fillStyle=open?'#00ff88':'#ff3333'; CTX.fillText(open?'🚪':'🔒',sx+32,y-86);
  CTX.font='8px monospace'; CTX.fillStyle=open?'#00ff88':'#444';
  CTX.fillText(open?'EXIT':'LOCKED',sx+32,y-12); CTX.textAlign='left';
  if(open){
    const dg=CTX.createRadialGradient(sx+32,y-90,0,sx+32,y-90,60);
    dg.addColorStop(0,'rgba(0,255,136,.22)'); dg.addColorStop(1,'transparent');
    CTX.fillStyle=dg; CTX.fillRect(sx-28,y-200,125,215);
  }
}

/* Drones */
function drawDrones(camX){
  const now=Date.now();
  G.room.drones.forEach(d=>{
    const sx=d.x-camX; if(sx<-100||sx>GC.width+100) return;
    const bob=Math.sin(now/340)*5;
    const sy=d.y+bob;
    CTX.save(); CTX.translate(sx+d.w/2,sy+d.h/2); CTX.scale(d.vx>0?1:-1,1);
    CTX.fillStyle='#1a1a2a';
    CTX.beginPath(); CTX.ellipse(0,0,d.w/2,d.h/2,0,0,Math.PI*2); CTX.fill();
    CTX.strokeStyle='#ff4444'; CTX.lineWidth=1.5; CTX.stroke();
    const rot=now/80;
    [-1,1].forEach(s=>{
      CTX.save(); CTX.translate(s*d.w/2,0); CTX.rotate(rot*s);
      CTX.strokeStyle='rgba(200,200,255,.6)'; CTX.lineWidth=2;
      CTX.beginPath(); CTX.moveTo(-13,0); CTX.lineTo(13,0); CTX.stroke();
      CTX.beginPath(); CTX.moveTo(0,-13); CTX.lineTo(0,13); CTX.stroke();
      CTX.restore();
    });
    const p=(Math.sin(now/300)+1)/2;
    CTX.fillStyle=`rgba(255,0,0,${.4+p*.5})`;
    CTX.beginPath(); CTX.ellipse(4,0,10,7,0,0,Math.PI*2); CTX.fill();
    CTX.fillStyle='#fff'; CTX.beginPath(); CTX.arc(6,-1,3.5,0,Math.PI*2); CTX.fill();
    CTX.fillStyle='#300'; CTX.beginPath(); CTX.arc(7,-1,1.8,0,Math.PI*2); CTX.fill();
    [-9,0,9].forEach((lx,i)=>{
      CTX.fillStyle=i===1?'#ff4444':'rgba(255,200,0,.6)';
      CTX.beginPath(); CTX.arc(lx,d.h/2-2,2.5,0,Math.PI*2); CTX.fill();
    });
    CTX.restore();
    /* Scan beam */
    const bg=CTX.createLinearGradient(sx+d.w/2,sy+d.h,sx+d.w/2,FLOOR_Y);
    bg.addColorStop(0,'rgba(255,30,30,.24)'); bg.addColorStop(1,'transparent');
    CTX.fillStyle=bg;
    CTX.beginPath();
    CTX.moveTo(sx+d.w/2-5,sy+d.h); CTX.lineTo(sx+d.w/2+5,sy+d.h);
    CTX.lineTo(sx+d.w/2+22,FLOOR_Y); CTX.lineTo(sx+d.w/2-22,FLOOR_Y); CTX.closePath(); CTX.fill();
  });
}

/* HUD */
function drawHUD(){
  const c=CO(); const [r,g,b]=c.col; const th=G.room.theme; const [ar,ag,ab]=hexToRgb(th.acc);
  CTX.fillStyle='rgba(0,0,0,.84)'; CTX.fillRect(0,0,GC.width,64);
  CTX.strokeStyle=`rgba(${r},${g},${b},.28)`; CTX.lineWidth=1; CTX.strokeRect(0,0,GC.width,64);
  CTX.fillStyle=`rgb(${r},${g},${b})`; CTX.font='bold 13px monospace'; CTX.fillText(`${c.name} HQ`,14,20);
  CTX.fillStyle='#667'; CTX.font='10px monospace';
  CTX.fillText(`FLOOR ${G.fi+1}/${c.floors}  ·  ROOM ${G.ri+1}/${c.rPF}`,14,38);
  CTX.fillStyle=th.acc; CTX.font='bold 8px monospace'; CTX.fillText(`[ ${th.name} ]`,14,54);

  /* Operative info & 3 Lives */
  CTX.fillStyle='rgba(0,0,0,.65)'; CTX.fillRect(GC.width/2-110,4,220,56);
  CTX.strokeStyle=`rgba(${ar},${ag},${ab},.35)`; CTX.lineWidth=1; CTX.strokeRect(GC.width/2-110,4,220,56);
  CTX.fillStyle='#cee'; CTX.font='bold 11px monospace'; CTX.textAlign='center';
  CTX.fillText(`[ ${G.name} ]`,GC.width/2,17);
  drawCyberLives(GC.width/2,32);
  CTX.fillStyle=P.hasCard?'#ffd700':'rgba(255,215,0,.35)'; CTX.font='bold 9px monospace';
  CTX.textAlign='center'; CTX.fillText(P.hasCard?'🔑 KEYCARD ACQUIRED':'🔑 KEYCARD NEEDED',GC.width/2,50); CTX.textAlign='left';

  CTX.fillStyle='#ffe600'; CTX.font='bold 12px monospace'; CTX.fillText(`⚡ ${G.units}`,GC.width-162,20);
  const tot=c.floors*c.rPF, done=G.fi*c.rPF+G.ri;
  const pct=Math.max(0,(tot-done)/tot);
  CTX.fillStyle='#1a1a1a'; CTX.fillRect(GC.width-162,30,148,9);
  const hbg=CTX.createLinearGradient(GC.width-162,0,GC.width-14,0);
  hbg.addColorStop(0,`rgba(${r},${g},${b},.85)`); hbg.addColorStop(1,'rgba(255,0,80,.85)');
  CTX.fillStyle=hbg; CTX.fillRect(GC.width-162,30,148*pct,9);
  CTX.fillStyle='#445'; CTX.font='7px monospace'; CTX.fillText(`AI:${c.boss} ${Math.round(pct*100)}%`,GC.width-162,52);
  if(P.iframes>0&&Math.floor(P.iframes/6)%2===0){
    CTX.fillStyle='rgba(255,0,0,.1)'; CTX.fillRect(0,64,GC.width,GC.height-64);
  }
}

function drawCyberLives(cx,cy){
  CTX.save();
  const maxL = G.maxLives || 5;
  const spacing = 15;
  const totalW = (maxL - 1) * spacing;
  const startX = cx - totalW / 2;

  CTX.font='bold 10px monospace';
  CTX.fillStyle='#ff88aa';
  CTX.textAlign='right';
  CTX.fillText('LIVES', startX - 12, cy + 3);

  for(let i=0; i<maxL; i++){
    const hx = startX + i * spacing;
    const active = i < G.lives;
    drawCyberHeart(CTX, hx, cy, 6, active);
  }

  CTX.fillStyle = G.lives <= 1 ? '#ff3366' : '#cee';
  CTX.font = 'bold 10px monospace';
  CTX.textAlign = 'left';
  CTX.fillText(`${G.lives}/${maxL}`, startX + totalW + 10, cy + 3);
  CTX.restore();
}

function drawCyberHeart(ctx, x, y, size, active){
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  const s = size;
  ctx.moveTo(0, -s * 0.3);
  ctx.bezierCurveTo(-s * 0.6, -s * 0.9, -s * 1.1, -s * 0.1, 0, s * 0.9);
  ctx.bezierCurveTo(s * 1.1, -s * 0.1, s * 0.6, -s * 0.9, 0, -s * 0.3);
  ctx.closePath();
  if(active){
    ctx.fillStyle = '#ff2a6d';
    ctx.shadowColor = '#ff2a6d';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-s * 0.28, -s * 0.35, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255, 42, 109, 0.12)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fill();
  }
  ctx.restore();
}

function drawToastUI(){
  if(toastTimer<=0) return; toastTimer--;
  const alpha=Math.min(1,toastTimer/18); const W=GC.width;
  CTX.save(); CTX.globalAlpha=alpha;
  CTX.font='bold 12px monospace'; CTX.textAlign='center';
  const tw=CTX.measureText(toastMsg).width+36;
  CTX.fillStyle='rgba(0,0,0,.9)';
  CTX.beginPath(); CTX.roundRect(W/2-tw/2,GC.height*.15-22,tw,34,5); CTX.fill();
  CTX.strokeStyle=G.room.theme.acc; CTX.lineWidth=1; CTX.stroke();
  CTX.fillStyle='#fff'; CTX.fillText(toastMsg,W/2,GC.height*.15);
  CTX.restore();
}

function drawPrompts(){
  const W=GC.width; const py=GC.height*.13;
  if(G.nearSwitch) { drawPrompt('[ E ]  OVERRIDE GATE',W/2,py); return; }
  const comp=G.room.pc;
  if(Math.abs(P.x-comp.x)<90&&P.onGround&&!comp.solved){
    if(!P.hasCard) drawPrompt('🔑  FIND THE KEYCARD FIRST',W/2,py);
    else drawPrompt('[ E ]  HACK TERMINAL',W/2,py);
  }
}

function drawPrompt(text,x,y){
  CTX.save(); CTX.font='bold 11px monospace'; CTX.textAlign='center';
  const w=CTX.measureText(text).width+30;
  CTX.fillStyle='rgba(0,0,0,.92)';
  CTX.beginPath(); CTX.roundRect(x-w/2,y-22,w,32,5); CTX.fill();
  CTX.strokeStyle=G.room.theme.acc; CTX.lineWidth=1; CTX.stroke();
  CTX.fillStyle='#fff'; CTX.fillText(text,x,y); CTX.restore();
}

/* ═══ 11. ANIME CHIBI CHARACTER ═══ */
function cCol(g){ return g==='boy'
  ?{skin:'#FFD9B3',hair:'#1a1008',shirt:'#2255dd',pants:'#1a2a3a',shoes:'#222',iris:'#3366ff',hHL:'#3a2a18'}
  :{skin:'#FFD9B3',hair:'#7a0818',shirt:'#dd2277',pants:'#1a2a4a',shoes:'#333',iris:'#cc2266',hHL:'#dd5577'}; }

function animeHead(cx,ctx2,ox,oy,r,gender){
  ctx2.fillStyle=cx.skin; ctx2.beginPath(); ctx2.arc(ox,oy,r,0,Math.PI*2); ctx2.fill();
  ctx2.fillStyle='rgba(255,130,130,.3)';
  ctx2.beginPath(); ctx2.ellipse(ox-r*.48,oy+r*.1,r*.28,r*.16,0,0,Math.PI*2); ctx2.fill();
  ctx2.beginPath(); ctx2.ellipse(ox+r*.48,oy+r*.1,r*.28,r*.16,0,0,Math.PI*2); ctx2.fill();
  const ey=oy-r*.12,ew=r*.3,eh=r*.42;
  [-1,1].forEach(s=>{
    const ex=ox+s*r*.35;
    ctx2.fillStyle='#fff'; ctx2.beginPath(); ctx2.ellipse(ex,ey,ew,eh,0,0,Math.PI*2); ctx2.fill();
    ctx2.fillStyle=cx.iris; ctx2.beginPath(); ctx2.ellipse(ex,ey+eh*.1,ew*.7,eh*.8,0,0,Math.PI*2); ctx2.fill();
    ctx2.fillStyle='#0a0a0a'; ctx2.beginPath(); ctx2.ellipse(ex,ey+eh*.2,ew*.38,eh*.42,0,0,Math.PI*2); ctx2.fill();
    ctx2.fillStyle='#fff'; ctx2.beginPath(); ctx2.arc(ex-ew*.22,ey-eh*.28,ew*.2,0,Math.PI*2); ctx2.fill();
    ctx2.beginPath(); ctx2.arc(ex+ew*.1,ey+eh*.05,ew*.1,0,Math.PI*2); ctx2.fill();
    ctx2.strokeStyle='#222'; ctx2.lineWidth=.8; ctx2.beginPath(); ctx2.ellipse(ex,ey,ew,eh,0,0,Math.PI*2); ctx2.stroke();
    ctx2.strokeStyle='#111'; ctx2.lineWidth=1.4; ctx2.beginPath();
    ctx2.moveTo(ex-ew-1,ey-eh+1); ctx2.lineTo(ex+ew+1,ey-eh); ctx2.stroke();
  });
  ctx2.fillStyle='rgba(180,100,80,.28)'; ctx2.beginPath(); ctx2.arc(ox+r*.06,oy+r*.3,r*.07,0,Math.PI*2); ctx2.fill();
  ctx2.strokeStyle='#cc8870'; ctx2.lineWidth=1.2; ctx2.beginPath();
  ctx2.moveTo(ox-r*.2,oy+r*.52); ctx2.quadraticCurveTo(ox,oy+r*.68,ox+r*.2,oy+r*.52); ctx2.stroke();
  ctx2.fillStyle=cx.hair;
  if(gender==='boy'){
    ctx2.beginPath(); ctx2.arc(ox,oy-r*.15,r*1.04,Math.PI*.82,Math.PI*.18,true); ctx2.fill();
    [[-r*.55,-r*1.0],[-r*.15,-r*1.28],[r*.2,-r*1.22],[r*.58,-r*.88],[r*.85,-r*.5]].forEach(([dx,dy])=>{
      ctx2.beginPath(); ctx2.moveTo(ox+dx-r*.14,oy+dy+r*.38); ctx2.lineTo(ox+dx,oy+dy); ctx2.lineTo(ox+dx+r*.14,oy+dy+r*.38); ctx2.closePath(); ctx2.fill();
    });
    ctx2.beginPath(); ctx2.moveTo(ox-r,oy-r*.22); ctx2.quadraticCurveTo(ox-r*1.4,oy+r*.1,ox-r*1.2,oy+r*.6); ctx2.quadraticCurveTo(ox-r*.9,oy+r*.1,ox-r,oy-r*.22); ctx2.fill();
    ctx2.fillStyle=cx.hHL; ctx2.beginPath(); ctx2.ellipse(ox-r*.08,oy-r*.72,r*.18,r*.09,-.4,0,Math.PI*2); ctx2.fill();
  } else {
    ctx2.beginPath(); ctx2.arc(ox,oy-r*.15,r*1.04,Math.PI*.8,Math.PI*.2,true); ctx2.fill();
    ctx2.fillRect(ox-r,oy-r,r*2,r*.62);
    ctx2.beginPath(); ctx2.moveTo(ox-r*.75,oy-r*.42); ctx2.quadraticCurveTo(ox-r*.6,oy+r*.08,ox-r*.25,oy+r*.04); ctx2.quadraticCurveTo(ox-r*.45,oy-r*.55,ox-r*.75,oy-r*.42); ctx2.fill();
    [-1,1].forEach(s=>{
      ctx2.fillStyle=cx.hair; ctx2.beginPath();
      ctx2.moveTo(ox+s*r*.88,oy-r*.48); ctx2.quadraticCurveTo(ox+s*r*1.55,oy+r*.4,ox+s*r*1.35,oy+r*2.1);
      ctx2.quadraticCurveTo(ox+s*r*1.05,oy+r*1.4,ox+s*r*.88,oy+r*.48); ctx2.quadraticCurveTo(ox+s*r*.68,oy+r*.14,ox+s*r*.88,oy-r*.48); ctx2.fill();
    });
    ctx2.fillStyle='#ff88cc';
    [-1,1].forEach(s=>{ ctx2.beginPath(); ctx2.ellipse(ox+s*r*.88,oy-r*.54,r*.17,r*.11,s*.5,0,Math.PI*2); ctx2.fill(); });
    ctx2.fillStyle=cx.hHL; ctx2.beginPath(); ctx2.ellipse(ox-r*.1,oy-r*.68,r*.2,r*.09,-.4,0,Math.PI*2); ctx2.fill();
  }
}

function cTorso(cx,c2,ox,y,w,h){ c2.fillStyle=cx.shirt; c2.beginPath(); c2.roundRect(ox-w/2,y,w,h,4); c2.fill(); }
function cLeg(cx,c2,lx,ty,len,rot){ c2.save(); c2.translate(lx,ty); c2.rotate(rot); c2.fillStyle=cx.pants; c2.fillRect(-4,0,9,len-5); c2.fillStyle=cx.shoes; c2.fillRect(-5,len-6,13,6); c2.restore(); }
function cArm(cx,c2,ax,ay,rot){ c2.save(); c2.translate(ax,ay); c2.rotate(rot); c2.fillStyle=cx.shirt; c2.fillRect(-4,0,8,14); c2.fillStyle=cx.skin; c2.beginPath(); c2.arc(0,16,4.5,0,Math.PI*2); c2.fill(); c2.restore(); }

function poseIdle(cx,gd,fr){ const bob=Math.sin(fr*.9)*1.4,r=14,tY=-40+bob; cLeg(cx,CTX,-5,-20+bob,20,0); cLeg(cx,CTX,5,-20+bob,20,0); cTorso(cx,CTX,0,tY,20,18); cArm(cx,CTX,-12,tY+2,.1); cArm(cx,CTX,12,tY+2,-.1); animeHead(cx,CTX,0,tY-r-1+bob,r,gd); }
function poseRun(cx,gd,fr){ const s=fr*1.7,la=Math.sin(s)*.42,aa=Math.sin(s+Math.PI)*.32,r=14,tY=-42; CTX.rotate(.07); cLeg(cx,CTX,-5,-22,20,-la); cLeg(cx,CTX,5,-22,20,la); cTorso(cx,CTX,0,tY,20,18); cArm(cx,CTX,-12,tY+2,aa); cArm(cx,CTX,12,tY+2,-aa); animeHead(cx,CTX,2,tY-r-1,r,gd); }
function poseJump(cx,gd){ const r=14,tY=-44; cLeg(cx,CTX,-6,-22,20,-.38); cLeg(cx,CTX,6,-22,20,.38); cTorso(cx,CTX,0,tY,20,18); cArm(cx,CTX,-12,tY+2,-.85); cArm(cx,CTX,12,tY+2,.85); animeHead(cx,CTX,0,tY-r-1,r,gd); }
function poseDuck(cx,gd){ const r=13,tY=-28; cLeg(cx,CTX,-6,-16,16,-.44); cLeg(cx,CTX,6,-16,16,.44); cTorso(cx,CTX,0,tY,18,14); cArm(cx,CTX,-11,tY+2,.55); cArm(cx,CTX,11,tY+2,-.55); animeHead(cx,CTX,2,tY-r,r,gd); }

function drawChar(camX){
  const sx=P.x-camX; if(sx<-80||sx>GC.width+80) return;
  const cx=cCol(G.gender);
  if(P.iframes>0&&Math.floor(P.iframes/6)%2===0) CTX.globalAlpha=.35;
  CTX.save(); CTX.translate(sx,P.y); CTX.scale(P.facing,1);
  if(P.action==='duck') poseDuck(cx,G.gender);
  else if(P.action==='jump') poseJump(cx,G.gender);
  else if(P.action==='run') poseRun(cx,G.gender,P.frame);
  else poseIdle(cx,G.gender,P.frame);
  CTX.restore(); CTX.globalAlpha=1;
}

function renderPreview(id,gender){
  const pv=document.getElementById(id); if(!pv) return;
  const pc=pv.getContext('2d'); pc.clearRect(0,0,pv.width,pv.height);
  const cx=cCol(gender); const r=13,tY=-36;
  pc.save(); pc.translate(pv.width/2,pv.height-4);
  pc.fillStyle=cx.pants; pc.fillRect(-7,-18,7,18); pc.fillRect(2,-18,7,18);
  pc.fillStyle=cx.shoes; pc.fillRect(-9,-4,11,5); pc.fillRect(2,-4,11,5);
  pc.fillStyle=cx.shirt; pc.beginPath(); pc.roundRect(-9,tY,18,16,3); pc.fill();
  pc.fillStyle=cx.shirt; pc.fillRect(-15,tY+2,6,12); pc.fillRect(10,tY+2,6,12);
  pc.fillStyle=cx.skin; pc.beginPath(); pc.arc(-12,tY+14,4,0,Math.PI*2); pc.fill();
  pc.beginPath(); pc.arc(13,tY+14,4,0,Math.PI*2); pc.fill();
  animeHead(cx,pc,0,tY-r-1,r,gender); pc.restore();
}

/* ═══ 12. PUZZLE SYSTEM ═══ */
function openPuzzle(){
  G.screen='puzzle';
  document.getElementById('puzzle-overlay').classList.remove('hidden');
  document.getElementById('puzzle-floor-info').textContent=`FLOOR ${G.fi+1} · ROOM ${G.ri+1} · ${G.room.pType}`;
  document.getElementById('puzzle-result').textContent=''; document.getElementById('puzzle-result').className='p-result';
  G.puzzleData=buildPuzzle(G.room.pType); SFX.hack(); startPuzzleLoop();
}
function closePuzzle(){ G.screen='game'; document.getElementById('puzzle-overlay').classList.add('hidden'); G.puzzleData=null; if(puzzleRaf){cancelAnimationFrame(puzzleRaf);puzzleRaf=null;} }
function onSolved(){ G.room.pc.solved=true; closePuzzle(); SFX.solve(); G.units+=80*(G.fi+1); const fl=document.getElementById('solve-flash'); fl.classList.remove('hidden'); setTimeout(()=>fl.classList.add('hidden'),1400); }
function buildPuzzle(t){ if(t==='ODD')return buildOdd(); if(t==='PATTERN')return buildPattern(); if(t==='MAZE')return buildMaze(); if(t==='SEQUENCE')return buildSeq(); if(t==='COLORMEM')return buildMem(); return buildOdd(); }

function buildOdd(){ const set=EMOJI_SETS[Math.random()*EMOJI_SETS.length|0],pool=shuffle(set),main=pool[0],odd=pool[1],pos=Math.random()*6|0,items=Array(6).fill(main); items[pos]=odd; return{type:'ODD',items,pos,sel:-1,cells:null}; }
function buildPattern(){ const rc=shuffle([...COLORS6]).slice(0,3),cs=shuffle([...SHAPES]).slice(0,3),grid=[]; for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push({shape:cs[c],color:rc[r]}); const ans=grid[8],wr=[{shape:cs[(cs.indexOf(ans.shape)+1)%3],color:ans.color},{shape:ans.shape,color:rc[(rc.indexOf(ans.color)+1)%3]},{shape:cs[(cs.indexOf(ans.shape)+2)%3],color:rc[(rc.indexOf(ans.color)+1)%3]}],ch=shuffle([ans,...wr]); return{type:'PATTERN',grid,choices:ch,correct:ch.indexOf(ans),sel:-1,cells:null,cCells:null}; }
function buildMaze(){ const sz=7,maze=Array.from({length:sz},()=>Array(sz).fill(1)); function carve(r,c){maze[r][c]=0;shuffle([[0,2],[2,0],[0,-2],[-2,0]]).forEach(([dr,dc])=>{const nr=r+dr,nc=c+dc;if(nr>=0&&nr<sz&&nc>=0&&nc<sz&&maze[nr][nc]===1){maze[r+dr/2|0][c+dc/2|0]=0;carve(nr,nc);}});} carve(0,0); maze[sz-1][sz-1]=0; return{type:'MAZE',maze,size:sz,pos:{r:0,c:0},end:{r:sz-1,c:sz-1}}; }
function buildSeq(){ const shape=ROTSHAPES[Math.random()*3|0],color=COLORS6[Math.random()*6|0],start=[0,90,180,270][Math.random()*4|0],seq=[0,1,2,3].map(i=>(start+i*90)%360),ans=(start+360)%360,wr=[(ans+90)%360,(ans+180)%360,(ans+270)%360],ch=shuffle([ans,...wr]); return{type:'SEQUENCE',seq,color,shape,choices:ch,correct:ch.indexOf(ans),sel:-1,cCells:null}; }
function buildMem(){ return{type:'COLORMEM',seq:shuffle([...COLORS6]).slice(0,4),phase:'show',showIdx:0,tick:0,input:[],shuffled:null,inputCells:null}; }

let puzzleRaf=null,pTick=0;
function startPuzzleLoop(){ if(puzzleRaf)cancelAnimationFrame(puzzleRaf); pTick=0; function loop(){pTick++;if(G.screen!=='puzzle'||!G.puzzleData)return;renderPuzzle();puzzleRaf=requestAnimationFrame(loop);} puzzleRaf=requestAnimationFrame(loop); }

function renderPuzzle(){
  const W=PCV.width,H=PCV.height; PCX.clearRect(0,0,W,H);
  const bg=PCX.createLinearGradient(0,0,0,H); bg.addColorStop(0,'#001226'); bg.addColorStop(1,'#060110');
  PCX.fillStyle=bg; PCX.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=3){PCX.fillStyle='rgba(0,0,0,.2)';PCX.fillRect(0,y,W,1);}
  ['tl','tr','bl','br'].forEach(c=>{const cx=c.includes('l')?0:W,cy=c.includes('t')?0:H,sx=c.includes('l')?1:-1,sy=c.includes('t')?1:-1;PCX.strokeStyle='#00f2ff';PCX.lineWidth=1;PCX.globalAlpha=.35;PCX.beginPath();PCX.moveTo(cx,cy+sy*28);PCX.lineTo(cx,cy);PCX.lineTo(cx+sx*28,cy);PCX.stroke();PCX.globalAlpha=1;});
  const pd=G.puzzleData;
  if(pd.type==='ODD')renderOdd(pd,W,H); else if(pd.type==='PATTERN')renderPattern(pd,W,H);
  else if(pd.type==='MAZE')renderMaze(pd,W,H); else if(pd.type==='SEQUENCE')renderSeq(pd,W,H);
  else renderMem(pd,W,H);
}
function pHdr(t,s,W){PCX.fillStyle='#00f2ff';PCX.font='bold 15px Orbitron,monospace';PCX.textAlign='center';PCX.fillText(t,W/2,36);PCX.fillStyle='#3a6070';PCX.font='10px monospace';PCX.fillText(s,W/2,54);PCX.textAlign='left';}

function renderOdd(pd,W){
  pHdr('ODD ONE OUT','CLICK THE ONE THAT DOES NOT BELONG',W);
  document.getElementById('puzzle-hint').textContent='FIVE ARE THE SAME — FIND THE DIFFERENT EMOJI';
  const cW=120,cH=112,sX=(W-3*cW)/2,sY=76; pd.cells=[];
  for(let i=0;i<6;i++){const x=sX+(i%3)*cW,y=sY+(i/3|0)*cH,sel=pd.sel===i;pd.cells.push({x,y,w:cW-10,h:cH-10});PCX.fillStyle=sel?'rgba(0,242,255,.14)':'rgba(255,255,255,.04)';PCX.fillRect(x,y,cW-10,cH-10);PCX.strokeStyle=sel?'#00f2ff':'rgba(0,242,255,.18)';PCX.lineWidth=sel?2:1;PCX.strokeRect(x,y,cW-10,cH-10);PCX.font='44px sans-serif';PCX.textAlign='center';PCX.fillStyle='#fff';PCX.fillText(pd.items[i],x+(cW-10)/2,y+(cH-10)/2+15);}
  PCX.textAlign='left';
}
function renderPattern(pd,W){
  pHdr('PATTERN MATRIX','FIND THE MISSING CELL',W);
  document.getElementById('puzzle-hint').textContent='ROW = SAME COLOR  ·  COLUMN = SAME SHAPE';
  const cs=68,gp=6,gW=3*(cs+gp)-gp,sX=(W-gW)/2,sY=72; pd.cells=[];
  for(let i=0;i<9;i++){const x=sX+(i%3)*(cs+gp),y=sY+(i/3|0)*(cs+gp);pd.cells.push({x,y,w:cs,h:cs});if(i===8){PCX.fillStyle='rgba(0,242,255,.06)';PCX.fillRect(x,y,cs,cs);PCX.strokeStyle='#00f2ff';PCX.lineWidth=2;PCX.setLineDash([5,4]);PCX.strokeRect(x,y,cs,cs);PCX.setLineDash([]);PCX.fillStyle='#00f2ff';PCX.font='bold 24px Orbitron';PCX.textAlign='center';PCX.fillText('?',x+cs/2,y+cs/2+9);PCX.textAlign='left';}else{PCX.fillStyle='rgba(255,255,255,.03)';PCX.fillRect(x,y,cs,cs);PCX.strokeStyle='rgba(0,242,255,.14)';PCX.lineWidth=1;PCX.strokeRect(x,y,cs,cs);drawShape2(PCX,pd.grid[i].shape,pd.grid[i].color,x+cs/2,y+cs/2,20);}}
  const chS=68,chG=14,chT=4*(chS+chG)-chG,chX=(W-chT)/2,chY=sY+3*(cs+gp)+22;pd.cCells=[];
  PCX.fillStyle='#2a3a44';PCX.font='9px monospace';PCX.textAlign='center';PCX.fillText('SELECT THE MISSING PATTERN:',W/2,chY-10);PCX.textAlign='left';
  for(let i=0;i<4;i++){const x=chX+i*(chS+chG),sel=pd.sel===i;pd.cCells.push({x,y:chY,w:chS,h:chS});PCX.fillStyle=sel?'rgba(0,242,255,.15)':'rgba(255,255,255,.04)';PCX.fillRect(x,chY,chS,chS);PCX.strokeStyle=sel?'#00f2ff':'rgba(0,242,255,.13)';PCX.lineWidth=sel?2:1;PCX.strokeRect(x,chY,chS,chS);drawShape2(PCX,pd.choices[i].shape,pd.choices[i].color,x+chS/2,chY+chS/2,18);}
}
function renderMaze(pd,W){
  pHdr('FIREWALL MAZE','ARROW KEYS / WASD — REACH THE GREEN CELL',W);
  document.getElementById('puzzle-hint').textContent='NAVIGATE THROUGH OPEN PATHS';
  const sz=pd.size,cs=46,mW=sz*cs,sX=(W-mW)/2,sY=74;
  for(let r=0;r<sz;r++)for(let c=0;c<sz;c++){const x=sX+c*cs,y=sY+r*cs;if(pd.maze[r][c]===1){PCX.fillStyle='#090120';PCX.fillRect(x,y,cs,cs);}else{PCX.fillStyle='#010610';PCX.fillRect(x,y,cs,cs);PCX.strokeStyle='rgba(0,60,160,.16)';PCX.lineWidth=.5;PCX.strokeRect(x,y,cs,cs);}if(r===pd.end.r&&c===pd.end.c){PCX.fillStyle='#00ff88';PCX.fillRect(x+8,y+8,cs-16,cs-16);PCX.fillStyle='#000';PCX.font='14px monospace';PCX.textAlign='center';PCX.fillText('◼',x+cs/2,y+cs/2+5);PCX.textAlign='left';}}
  const px=sX+pd.pos.c*cs,py=sY+pd.pos.r*cs,gl=PCX.createRadialGradient(px+cs/2,py+cs/2,0,px+cs/2,py+cs/2,cs/2);
  gl.addColorStop(0,'rgba(0,242,255,.9)');gl.addColorStop(1,'transparent');PCX.fillStyle=gl;PCX.fillRect(px,py,cs,cs);
  PCX.font='14px monospace';PCX.textAlign='center';PCX.fillStyle='#fff';PCX.fillText('▶',px+cs/2+2,py+cs/2+5);PCX.textAlign='left';
}
function renderSeq(pd,W){
  pHdr('VISUAL SEQUENCE','WHAT COMES NEXT? (90° ROTATION EACH STEP)',W);
  document.getElementById('puzzle-hint').textContent='SHAPE ROTATES CLOCKWISE — FIND STEP 5';
  const iS=64,ga=14,sX=(W-4*(iS+ga)+50)/2,sY=90;
  for(let i=0;i<4;i++){const cx2=sX+i*(iS+ga)+iS/2;drawRotShape2(PCX,pd.shape,pd.color,cx2,sY+iS/2,22,pd.seq[i]);PCX.fillStyle='#3a5566';PCX.font='16px monospace';PCX.textAlign='center';if(i<3)PCX.fillText('→',cx2+iS/2+ga/2,sY+iS/2+6);}
  PCX.fillStyle='#00f2ff';PCX.font='bold 20px monospace';PCX.textAlign='center';PCX.fillText('→ ?',sX+4*(iS+ga)+25,sY+iS/2+7);PCX.textAlign='left';
  const chS=72,chG=16,chT=4*(chS+chG)-chG,chX=(W-chT)/2,chY=sY+iS+44;pd.cCells=[];
  PCX.fillStyle='#2a3a44';PCX.font='9px monospace';PCX.textAlign='center';PCX.fillText('CLICK THE NEXT ROTATION:',W/2,chY-12);PCX.textAlign='left';
  for(let i=0;i<4;i++){const x=chX+i*(chS+chG),sel=pd.sel===i;pd.cCells.push({x,y:chY,w:chS,h:chS});PCX.fillStyle=sel?'rgba(0,242,255,.14)':'rgba(255,255,255,.04)';PCX.fillRect(x,chY,chS,chS);PCX.strokeStyle=sel?'#00f2ff':'rgba(0,242,255,.13)';PCX.lineWidth=sel?2:1;PCX.strokeRect(x,chY,chS,chS);drawRotShape2(PCX,pd.shape,pd.color,x+chS/2,chY+chS/2,24,pd.choices[i]);}
}
function renderMem(pd,W){
  const showing=pd.phase==='show';
  pHdr('COLOR MEMORY',showing?'MEMORIZE THE ORDER':'CLICK COLORS IN THE SAME ORDER',W);
  document.getElementById('puzzle-hint').textContent=showing?'WATCHING...':`INPUT: ${pd.input.length}/${pd.seq.length}`;
  const bW=84,bH=84,gap=16,n=pd.seq.length,tot=n*(bW+gap)-gap,sX=(W-tot)/2,bY=125;
  if(showing){
    if(pTick%85===1&&pd.showIdx<pd.seq.length) pd.showIdx++;
    if(pd.showIdx>=pd.seq.length&&!pd._switching){pd._switching=true;setTimeout(()=>{if(G.puzzleData){G.puzzleData.phase='input';G.puzzleData.shuffled=shuffle([...pd.seq]);}},900);}
    pd.seq.forEach((col,i)=>{const x=sX+i*(bW+gap),act=i===pd.showIdx-1;PCX.globalAlpha=act?1:.22;PCX.fillStyle=col;PCX.fillRect(x,bY,bW,bH);if(act){PCX.shadowColor=col;PCX.shadowBlur=28;PCX.strokeStyle='#fff';PCX.lineWidth=3;PCX.strokeRect(x,bY,bW,bH);PCX.shadowBlur=0;}PCX.globalAlpha=1;PCX.strokeStyle='rgba(255,255,255,.18)';PCX.lineWidth=1;PCX.strokeRect(x,bY,bW,bH);});
    PCX.fillStyle='#3a5566';PCX.font='11px monospace';PCX.textAlign='center';PCX.fillText(`${pd.showIdx} / ${pd.seq.length}`,W/2,bY+bH+28);PCX.textAlign='left';
  } else {
    if(!pd.shuffled) pd.shuffled=shuffle([...pd.seq]); pd.inputCells=[];
    pd.shuffled.forEach((col,i)=>{const x=sX+i*(bW+gap);pd.inputCells.push({x,y:bY,w:bW,h:bH,color:col});PCX.fillStyle=col;PCX.globalAlpha=.85;PCX.fillRect(x,bY,bW,bH);PCX.globalAlpha=1;PCX.strokeStyle='rgba(255,255,255,.3)';PCX.lineWidth=1;PCX.strokeRect(x,bY,bW,bH);});
    const dotY=bY+bH+36;
    for(let i=0;i<pd.seq.length;i++){const dx=(W/2-(pd.seq.length*22)/2)+i*22;PCX.fillStyle=i<pd.input.length?pd.seq[i]:'#1a2530';PCX.beginPath();PCX.arc(dx,dotY,9,0,Math.PI*2);PCX.fill();PCX.strokeStyle='rgba(255,255,255,.18)';PCX.lineWidth=1;PCX.stroke();}
    PCX.fillStyle='#3a5566';PCX.font='9px monospace';PCX.textAlign='center';PCX.fillText('CLICK IN ORDER',W/2,dotY+22);PCX.textAlign='left';
  }
}
function drawShape2(c,sh,col,cx,cy,r){c.fillStyle=col;if(sh==='circle'){c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();}else if(sh==='triangle'){c.beginPath();c.moveTo(cx,cy-r);c.lineTo(cx+r,cy+r);c.lineTo(cx-r,cy+r);c.closePath();c.fill();}else if(sh==='square'){c.fillRect(cx-r,cy-r,r*2,r*2);}else{c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2===0?r:r*.44;i===0?c.moveTo(cx+rr*Math.cos(a),cy+rr*Math.sin(a)):c.lineTo(cx+rr*Math.cos(a),cy+rr*Math.sin(a));}c.closePath();c.fill();}}
function drawRotShape2(c,sh,col,cx,cy,sz,ang){c.save();c.translate(cx,cy);c.rotate(ang*Math.PI/180);c.fillStyle=col;if(sh==='arrow'){c.beginPath();c.moveTo(0,-sz);c.lineTo(sz*.55,0);c.lineTo(sz*.22,0);c.lineTo(sz*.22,sz*.8);c.lineTo(-sz*.22,sz*.8);c.lineTo(-sz*.22,0);c.lineTo(-sz*.55,0);c.closePath();c.fill();}else if(sh==='triangle'){c.beginPath();c.moveTo(0,-sz);c.lineTo(sz,sz);c.lineTo(-sz,sz);c.closePath();c.fill();}else{c.fillRect(-sz*.5,-sz,sz*.4,sz);c.fillRect(-sz*.5,-sz*.42,sz,sz*.4);}c.restore();}

PCV.addEventListener('click',e=>{
  if(G.screen!=='puzzle'||!G.puzzleData) return;
  const rect=PCV.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(PCV.width/rect.width),my=(e.clientY-rect.top)*(PCV.height/rect.height);
  const pd=G.puzzleData;
  if(pd.type==='ODD')clickOdd(pd,mx,my); else if(pd.type==='PATTERN')clickPat(pd,mx,my);
  else if(pd.type==='SEQUENCE')clickSeq(pd,mx,my); else if(pd.type==='COLORMEM')clickMem(pd,mx,my);
});
function hitCell(cells,mx,my){if(!cells)return -1;for(let i=0;i<cells.length;i++){const c=cells[i];if(mx>=c.x&&mx<c.x+c.w&&my>=c.y&&my<c.y+c.h)return i;}return -1;}
function wrongFB(){SFX.wrong();const el=document.getElementById('puzzle-result');el.textContent='✕  WRONG';el.className='p-result error';setTimeout(()=>{if(el){el.textContent='';el.className='p-result';}},800);}
function clickOdd(pd,mx,my){const i=hitCell(pd.cells,mx,my);if(i<0)return;pd.sel=i;if(i===pd.pos)onSolved();else{wrongFB();setTimeout(()=>{pd.sel=-1;},500);}}
function clickPat(pd,mx,my){const i=hitCell(pd.cCells,mx,my);if(i<0)return;pd.sel=i;if(i===pd.correct)onSolved();else{wrongFB();setTimeout(()=>{pd.sel=-1;},500);}}
function clickSeq(pd,mx,my){const i=hitCell(pd.cCells,mx,my);if(i<0)return;pd.sel=i;if(i===pd.correct)onSolved();else{wrongFB();setTimeout(()=>{pd.sel=-1;},500);}}
function clickMem(pd,mx,my){if(pd.phase!=='input')return;const i=hitCell(pd.inputCells,mx,my);if(i<0)return;const col=pd.inputCells[i].color;if(col===pd.seq[pd.input.length]){pd.input.push(col);SFX.step();if(pd.input.length>=pd.seq.length)onSolved();}else{wrongFB();pd.input=[];}}

/* ═══ 13. TRANSITIONS ═══ */
function doTransition(){if(G.transitioning)return;G.transitioning=true;G.units+=60*(G.fi+1);const ov=document.getElementById('transition-overlay');ov.classList.remove('hidden');ov.classList.add('active');setTimeout(()=>{ov.classList.remove('active');ov.classList.add('hidden');nextRoom();},1200);}
function nextRoom(){const c=CO();if(G.ri+1>=c.rPF){if(G.fi+1>=c.floors)showAIWin();else showFloorClear();}else{G.ri++;initRoom(G.ci,G.fi,G.ri);}}
function showFloorClear(){const bonus=350*(G.fi+1);G.units+=bonus;document.getElementById('fc-floor-num').textContent=G.fi+1;document.getElementById('fc-units').textContent=`+${bonus}`;document.getElementById('floor-clear-modal').classList.remove('hidden');document.getElementById('fc-next-btn').onclick=()=>{document.getElementById('floor-clear-modal').classList.add('hidden');G.fi++;G.ri=0;initRoom(G.ci,G.fi,G.ri);SFX.win();};}
function showAIWin(){const c=CO();G.units+=c.reward;SFX.win();document.getElementById('ad-company').textContent=c.name;document.getElementById('ad-boss').textContent=c.boss;document.getElementById('ad-units').textContent=`+${c.reward}`;document.getElementById('ai-defeat-modal').classList.remove('hidden');document.getElementById('ad-next-btn').onclick=()=>{document.getElementById('ai-defeat-modal').classList.add('hidden');G.ci=(G.ci+1)%COMPANIES.length;G.fi=0;G.ri=0;initRoom(G.ci,G.fi,G.ri);};}

/* ═══ 14. GAME LOOP ═══ */
let lastTs=0;
function gameLoop(ts){const dt=Math.min(ts-lastTs,100);lastTs=ts;if(G.screen==='game'||G.screen==='puzzle'){if(G.screen==='game')updatePlayer(dt);renderGame();}requestAnimationFrame(gameLoop);}

/* ═══ 15. KEYBOARD ═══ */
document.addEventListener('keydown',e=>{
  if(G.screen==='gameover'){
    if(e.key==='Enter'||e.key===' '||e.key==='r'||e.key==='R'){
      e.preventDefault();
      restartCurrentRound();
      return;
    }
  }
  KEYS[e.key]=true;
  if(G.screen==='puzzle'&&G.puzzleData&&G.puzzleData.type==='MAZE'){mazeKey(e.key);e.preventDefault();return;}
  if(e.key==='Escape'&&G.screen==='puzzle'){closePuzzle();return;}
  if(G.screen==='game'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','e','E'].includes(e.key))e.preventDefault();
});
document.addEventListener('keyup',e=>{KEYS[e.key]=false;});
function mazeKey(key){const pd=G.puzzleData;if(!pd)return;const mv={ArrowUp:[-1,0],w:[-1,0],ArrowDown:[1,0],s:[1,0],ArrowLeft:[0,-1],a:[0,-1],ArrowRight:[0,1],d:[0,1]};const v=mv[key];if(!v)return;const nr=pd.pos.r+v[0],nc=pd.pos.c+v[1];if(nr>=0&&nr<pd.size&&nc>=0&&nc<pd.size&&pd.maze[nr][nc]===0){pd.pos={r:nr,c:nc};if(nr===pd.end.r&&nc===pd.end.c)onSolved();}}

/* ═══ 16. BOOT ═══ */
(function boot(){
  renderPreview('preview-boy','boy');
  renderPreview('preview-girl','girl');
  let gender='boy';
  const bBtn=document.getElementById('gender-boy'),gBtn=document.getElementById('gender-girl');
  bBtn.addEventListener('click',()=>{gender='boy';bBtn.classList.add('selected');gBtn.classList.remove('selected');});
  gBtn.addEventListener('click',()=>{gender='girl';gBtn.classList.add('selected');bBtn.classList.remove('selected');});
  document.getElementById('login-start-btn').addEventListener('click',()=>{
    const n=document.getElementById('player-name-input').value.trim();
    G.name=(n||'AGENT').toUpperCase().slice(0,12);G.gender=gender;
    document.getElementById('login-screen').classList.add('hidden');
    G.screen='game';initRoom(0,0,0);
    try{if(_ac&&_ac.state==='suspended')_ac.resume();}catch(_){}
    requestAnimationFrame(ts=>{lastTs=ts;gameLoop(ts);});
  });
  document.getElementById('player-name-input').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('login-start-btn').click();});
  document.getElementById('puzzle-exit-btn').addEventListener('click',closePuzzle);
  document.getElementById('go-retry-btn').addEventListener('click', restartCurrentRound);
})();
