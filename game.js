(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = {
    place: document.getElementById('place'), objective: document.getElementById('objectiveText'),
    action: document.getElementById('actionButton'), actionText: document.getElementById('actionText'),
    stick: document.getElementById('stick'), joystick: document.getElementById('joystick'),
    sheet: document.getElementById('sheet'), help: document.getElementById('help'), transition: document.getElementById('transition')
  };
  const TILE_W = 76, TILE_H = 38;
  const state = { scene:'outside', player:{x:2.2,y:7.4}, input:{x:0,y:0}, keys:{}, near:null, frozen:false, time:0, completed:false };
  const scenes = {
    outside: { w:10, h:10, spawn:{x:2.2,y:7.4}, door:{x:6.5,y:2.65}, obstacles:[
      {x:-1,y:-1,w:12,h:1.8},{x:-1,y:9.1,w:12,h:2},{x:-1,y:0,w:1.7,h:11},{x:9.2,y:0,w:2,h:11},
      {x:2.7,y:0.2,w:6.2,h:2.25},{x:2.7,y:2.15,w:2.55,h:.9},{x:7.75,y:2.15,w:1.15,h:.9},
      {x:1.1,y:3.5,w:1.1,h:1.1},{x:7.9,y:6.25,w:1.1,h:1.1}
    ]},
    inside: { w:11, h:9, spawn:{x:5.5,y:7.5}, history:{x:1.45,y:2.6}, exit:{x:5.5,y:8.25}, obstacles:[
      {x:-1,y:-1,w:13,h:1.45},{x:-1,y:8.55,w:13,h:2},{x:-1,y:0,w:1.35,h:10},{x:10.65,y:0,w:2,h:10},
      {x:.25,y:.25,w:3.2,h:1},{x:7.55,y:.25,w:3.2,h:1},{x:4.35,y:.3,w:2.3,h:.8},
      {x:1.25,y:4.7,w:2.1,h:.8},{x:7.65,y:4.7,w:2.1,h:.8},{x:4.5,y:3.15,w:2,h:1.15}
    ]}
  };
  function resize(){ const dpr=Math.min(devicePixelRatio||1,2); canvas.width=innerWidth*dpr; canvas.height=innerHeight*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
  addEventListener('resize',resize); resize();
  function origin(){ return {x:innerWidth/2, y: state.scene==='outside' ? Math.max(195,innerHeight*.27) : Math.max(180,innerHeight*.25)}; }
  function iso(x,y,z=0){ const o=origin(); return {x:o.x+(x-y)*TILE_W/2, y:o.y+(x+y)*TILE_H/2-z}; }
  function poly(points,fill,stroke){ ctx.beginPath(); points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();} }
  function tile(x,y,color){ const p=iso(x,y), a={x:p.x,y:p.y-TILE_H/2}, b={x:p.x+TILE_W/2,y:p.y}, c={x:p.x,y:p.y+TILE_H/2}, d={x:p.x-TILE_W/2,y:p.y}; poly([a,b,c,d],color,'#ffffff0c'); }
  function box(x,y,w,h,z,top,left,right){ const A=iso(x,y,z),B=iso(x+w,y,z),C=iso(x+w,y+h,z),D=iso(x,y+h,z); const a=iso(x,y),b=iso(x+w,y),c=iso(x+w,y+h),d=iso(x,y+h); poly([D,C,c,d],left); poly([B,C,c,b],right); poly([A,B,C,D],top,'#15241d18'); }
  function circleIso(x,y,r,color){ const p=iso(x,y); ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.46,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill(); }
  function drawTree(x,y,s=1){ const p=iso(x,y); circleIso(x,y,17*s,'#13251c28'); ctx.fillStyle='#76563e';ctx.fillRect(p.x-3*s,p.y-29*s,6*s,28*s); ctx.beginPath();ctx.arc(p.x,p.y-39*s,17*s,0,Math.PI*2);ctx.fillStyle='#427358';ctx.fill();ctx.beginPath();ctx.arc(p.x-9*s,p.y-35*s,12*s,0,Math.PI*2);ctx.fillStyle='#5f8d61';ctx.fill(); }
  function drawOutside(){
    ctx.fillStyle='#9ec7ba';ctx.fillRect(0,0,innerWidth,innerHeight);
    const grd=ctx.createLinearGradient(0,0,0,innerHeight);grd.addColorStop(0,'#86b6ae');grd.addColorStop(.58,'#cfdfbd');grd.addColorStop(1,'#203d33');ctx.fillStyle=grd;ctx.fillRect(0,0,innerWidth,innerHeight);
    for(let y=0;y<10;y++)for(let x=0;x<10;x++) tile(x,y,(x+y)%2?'#abbc8b':'#b4c596');
    for(let y=3;y<9;y++)for(let x=3;x<8;x++) tile(x,y,(x+y)%2?'#c9c5b2':'#d6d1bd');
    // 310 building: monumental, pale stone, dark glazed entrance.
    box(2.7,.2,6.2,2.6,118,'#d9d4c5','#aaa998','#858c83');
    box(3.05,.35,5.5,2.3,92,'#d6d0bf','#b9b5a6','#92968d');
    const facade=iso(5.95,.2,92); ctx.fillStyle='#eef0e8';ctx.fillRect(facade.x-107,facade.y-48,214,48);
    for(let i=0;i<7;i++){ctx.fillStyle=i===3?'#293e3c':'#748b8a';ctx.fillRect(facade.x-98+i*29,facade.y-41,19,31);}
    const door=iso(6.5,2.68,1); ctx.fillStyle='#203a38';ctx.fillRect(door.x-29,door.y-52,58,52); ctx.fillStyle='#d9b45d';ctx.fillRect(door.x-2,door.y-48,4,48);
    ctx.fillStyle='#39463f';ctx.font='800 12px sans-serif';ctx.textAlign='center';ctx.fillText('CHUNG-ANG UNIVERSITY',facade.x,facade.y-61);
    ctx.fillStyle='#887548';ctx.font='900 15px sans-serif';ctx.fillText('310',facade.x,facade.y-78);
    // entrance glow and route
    const pulse=18+Math.sin(state.time*3)*4;ctx.beginPath();ctx.arc(door.x,door.y-5,pulse,0,Math.PI*2);ctx.fillStyle='#ffd46628';ctx.fill();
    drawTree(1.65,4.05,.9); drawTree(8.45,6.8,1); drawTree(1.2,7.4,.75);
    box(3.15,5.6,1.1,.35,10,'#9a7b58','#70573e','#604b39'); box(6.8,5.6,1.1,.35,10,'#9a7b58','#70573e','#604b39');
  }
  function drawInside(){
    const bg=ctx.createLinearGradient(0,0,0,innerHeight);bg.addColorStop(0,'#78998c');bg.addColorStop(1,'#20382f');ctx.fillStyle=bg;ctx.fillRect(0,0,innerWidth,innerHeight);
    for(let y=0;y<9;y++)for(let x=0;x<11;x++) tile(x,y,(x+y)%2?'#d8d2c3':'#e3ddd0');
    // rear and side architectural volumes
    box(.25,.25,3.2,1,68,'#d8d1c0','#a8aa9d','#8f958d'); box(7.55,.25,3.2,1,68,'#d8d1c0','#a8aa9d','#8f958d');
    box(4.35,.3,2.3,.8,98,'#e6dfcd','#a9a99d','#90958d');
    // reception / benches / planter
    box(4.5,3.15,2,1.15,28,'#9a7e5d','#6b5744','#5d4c3e');
    box(1.25,4.7,2.1,.8,12,'#b79870','#80694f','#6b5948'); box(7.65,4.7,2.1,.8,12,'#b79870','#80694f','#6b5948');
    const plant=iso(5.5,4.25,32);ctx.beginPath();ctx.arc(plant.x,plant.y,16,0,Math.PI*2);ctx.fillStyle='#4e7a58';ctx.fill();
    // history wall at left rear
    const h=iso(1.55,1.27,42);ctx.fillStyle='#273d36';ctx.fillRect(h.x-55,h.y-38,110,49);ctx.fillStyle='#e3bd63';ctx.fillRect(h.x-47,h.y-30,36,4);ctx.fillStyle='#f0e7d0';ctx.font='800 10px sans-serif';ctx.textAlign='left';ctx.fillText('HISTORY',h.x-47,h.y-13);ctx.fillStyle='#9fc0ad';ctx.fillRect(h.x+10,h.y-28,29,28);
    const glow=22+Math.sin(state.time*3)*4;ctx.beginPath();ctx.arc(h.x,h.y+14,glow,0,Math.PI*2);ctx.fillStyle='#ffd46625';ctx.fill();
    // exit floor marker
    const e=iso(5.5,8.25);ctx.fillStyle='#4c625b';ctx.font='800 10px sans-serif';ctx.textAlign='center';ctx.fillText('EXIT',e.x,e.y);
  }
  function drawPlayer(){ const p=iso(state.player.x,state.player.y); circleIso(state.player.x,state.player.y,13,'#14231e38'); const bob=Math.sin(state.time*8)*1.5; ctx.fillStyle='#263b34';ctx.fillRect(p.x-7,p.y-29+bob,14,23);ctx.beginPath();ctx.arc(p.x,p.y-35+bob,9,0,Math.PI*2);ctx.fillStyle='#e5b98d';ctx.fill();ctx.fillStyle='#f0c85e';ctx.fillRect(p.x-6,p.y-27+bob,12,13);ctx.fillStyle='#172822';ctx.fillRect(p.x-7,p.y-14+bob,5,14);ctx.fillRect(p.x+2,p.y-14+bob,5,14); }
  function collides(x,y){ const r=.25; return scenes[state.scene].obstacles.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h); }
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function update(dt){
    if(state.frozen)return; let x=state.input.x+(state.keys.ArrowRight||state.keys.d?1:0)-(state.keys.ArrowLeft||state.keys.a?1:0); let y=state.input.y+(state.keys.ArrowDown||state.keys.s?1:0)-(state.keys.ArrowUp||state.keys.w?1:0); const l=Math.hypot(x,y); if(l>1){x/=l;y/=l;} const speed=2.45*dt; if(!collides(state.player.x+x*speed,state.player.y))state.player.x+=x*speed; if(!collides(state.player.x,state.player.y+y*speed))state.player.y+=y*speed;
    const s=scenes[state.scene]; let near=null; if(state.scene==='outside'&&distance(state.player,s.door)<1.15)near='door'; if(state.scene==='inside'&&distance(state.player,s.history)<1.35)near='history'; if(state.scene==='inside'&&distance(state.player,s.exit)<.85)near='exit'; if(near!==state.near){state.near=near; syncUI();}
  }
  function syncUI(){ const labels={door:'들어가기',history:'살펴보기',exit:'밖으로 나가기'}; ui.action.hidden=!state.near; if(state.near)ui.actionText.textContent=labels[state.near]; }
  function interact(){ if(state.frozen)return; if(state.near==='door')changeScene('inside'); else if(state.near==='exit')changeScene('outside'); else if(state.near==='history')openHistory(); }
  function changeScene(next){ state.frozen=true;ui.transition.classList.add('active');setTimeout(()=>{state.scene=next;state.player={...scenes[next].spawn};state.near=null;ui.place.textContent=next==='inside'?'310관 · 1층 로비':'310관 · 야외 광장';ui.objective.textContent=next==='inside'?(state.completed?'로비를 자유롭게 둘러보세요':'히스토리 월을 찾아보세요'):'빛나는 입구까지 걸어가세요';syncUI();setTimeout(()=>{ui.transition.classList.remove('active');state.frozen=false;},350);},500); }
  function openHistory(){ state.frozen=true;state.completed=true;ui.sheet.hidden=false;ui.objective.textContent='1층 탐색 완료 · 자유롭게 둘러보세요'; }
  function closePanel(el){el.hidden=true;state.frozen=false;}
  ui.action.addEventListener('click',interact); document.getElementById('helpButton').onclick=()=>{state.frozen=true;ui.help.hidden=false;};
  document.getElementById('closeHelp').onclick=document.getElementById('helpConfirm').onclick=()=>closePanel(ui.help);document.getElementById('closeSheet').onclick=document.getElementById('sheetConfirm').onclick=()=>closePanel(ui.sheet);
  addEventListener('keydown',e=>{state.keys[e.key]=true;state.keys[e.key.toLowerCase()]=true;if(e.code==='Space'){e.preventDefault();interact();}}); addEventListener('keyup',e=>{state.keys[e.key]=false;state.keys[e.key.toLowerCase()]=false;});
  let pointer=null; function joy(e){ const r=ui.joystick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),max=31,k=Math.min(1,max/(len||1));ui.stick.style.transform=`translate(${dx*k}px,${dy*k}px)`;state.input.x=dx/(len||1)*Math.min(1,len/max);state.input.y=dy/(len||1)*Math.min(1,len/max);}
  ui.joystick.addEventListener('pointerdown',e=>{pointer=e.pointerId;ui.joystick.setPointerCapture(pointer);joy(e);});ui.joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)joy(e);});function end(e){if(e.pointerId===pointer){pointer=null;state.input.x=state.input.y=0;ui.stick.style.transform='';}}ui.joystick.addEventListener('pointerup',end);ui.joystick.addEventListener('pointercancel',end);
  let last=performance.now();function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;state.time+=dt;update(dt);state.scene==='outside'?drawOutside():drawInside();drawPlayer();requestAnimationFrame(loop);}requestAnimationFrame(loop);
  // Keep first visit discoverable, but do not block immediate play.
  if(!sessionStorage.getItem('cau310-help')){state.frozen=true;ui.help.hidden=false;sessionStorage.setItem('cau310-help','1');}
})();
