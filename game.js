(() => {
  'use strict';
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  const $=id=>document.getElementById(id);
  const ui={place:$('place'),objective:$('objectiveText'),action:$('actionButton'),actionText:$('actionText'),sheet:$('sheet'),help:$('help'),transition:$('transition')};
  const R=.23, STEP=.25;
  const scenes={
    outside:{w:16,h:14,spawn:{x:8,y:11.5},points:[{id:'door',x:8,y:5.15,label:'1층 입구',action:'들어가기'}],objects:[
      {x:1.2,y:.5,w:13.5,h:3.7,z:0,t:'building'},
      ...[3,5,11,13].map(x=>({x,y:7,w:1.25,h:1.2,z:17,t:'planter'})),
      {x:2.7,y:10,w:2,h:.6,z:12,t:'bench'},{x:11.3,y:10,w:2,h:.6,z:12,t:'bench'}]},
    inside:{w:16,h:14,spawn:{x:8,y:11.5},points:[{id:'history',x:3,y:3.1,label:'기념 전시',action:'살펴보기'},{id:'exit',x:8,y:12.7,label:'야외 광장',action:'밖으로 나가기'}],objects:[
      {x:1,y:.8,w:5.2,h:.6,z:87,t:'wall'},
      {x:10,y:1,w:4.7,h:1.35,z:28,t:'cafe'},
      ...[2,7.5,13.2].map(x=>({x,y:4.8,w:.55,h:.55,z:118,t:'column'})),
      {x:2.6,y:8,w:2.5,h:.65,z:13,t:'bench'}, {x:11,y:8,w:2.5,h:.65,z:13,t:'bench'},
      {x:1.1,y:7.2,w:.85,h:.85,z:15,t:'plant'},{x:14.1,y:7.2,w:.85,h:.85,z:15,t:'plant'}]}
  };
  const state={scene:'outside',player:{...scenes.outside.spawn},path:[],target:null,pending:null,near:null,time:0,walk:0,moving:false,frozen:false,completed:false,keys:{},zoom:1};
  let width=innerWidth,height=innerHeight,scale=1,ox=0,oy=0;
  function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  addEventListener('resize',resize);resize();
  function camera(){scale=Math.min((width-24)/1030,(height-180)/790,1.35);scale=Math.max(.25,scale);const base=scale;ox=width/2-(state.player.x-state.player.y)*34*base*(state.zoom-1);oy=130+215*base+Math.max(0,(height-180-790*base)/2)-(state.player.x+state.player.y)*17*base*(state.zoom-1);scale*=state.zoom;}
  const iso=(x,y,z=0)=>({x:ox+(x-y)*34*scale,y:oy+(x+y)*17*scale-z*scale});
  function inverse(x,y){const a=(x-ox)/(34*scale),b=(y-oy)/(17*scale);return{x:(a+b)/2,y:(b-a)/2};}
  function poly(ps,color,stroke){ctx.beginPath();ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(.5,scale*.7);ctx.stroke();}}
  function floor(x,y,w,h,color,z=0,stroke){poly([iso(x,y,z),iso(x+w,y,z),iso(x+w,y+h,z),iso(x,y+h,z)],color,stroke);}
  function box(x,y,w,h,z,top='#eeeae2',front='#d8d3ca',side='#b4bdbb',base=0){poly([iso(x,y+h,base+z),iso(x+w,y+h,base+z),iso(x+w,y+h,base),iso(x,y+h,base)],front);poly([iso(x+w,y,base+z),iso(x+w,y+h,base+z),iso(x+w,y+h,base),iso(x+w,y,base)],side);floor(x,y,w,h,top,base+z);}
  function frontRect(x,y,w,bottom,h,color){poly([iso(x,y,bottom),iso(x+w,y,bottom),iso(x+w,y,bottom+h),iso(x,y,bottom+h)],color);}
  function sideRect(x,y,h,bottom,z,color){poly([iso(x,y,bottom),iso(x,y+h,bottom),iso(x,y+h,bottom+z),iso(x,y,bottom+z)],color);}
  function line(a,b,color,lw=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=lw*scale;ctx.stroke();}
  function ellipse(x,y,r,color,z=0){const p=iso(x,y,z);ctx.beginPath();ctx.ellipse(p.x,p.y,r*scale,r*.47*scale,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function faceText(text,x,y,z,size=15,color='#315057'){const p=iso(x,y,z);ctx.save();ctx.translate(p.x,p.y);ctx.transform(scale,scale*.5,0,scale,0,0);ctx.font=`600 ${size}px sans-serif`;ctx.textAlign='left';ctx.fillStyle=color;ctx.fillText(text,0,0);ctx.restore();}
  function tree(x,y,z=0){ellipse(x+.2,y+.2,24,'#263d3920');box(x-.06,y-.06,.12,.12,31,'#806e56','#806e56','#675741',z);const p=iso(x,y,z+44);poly([{x:p.x,y:p.y-22*scale},{x:p.x+24*scale,y:p.y-3*scale},{x:p.x+17*scale,y:p.y+20*scale},{x:p.x-18*scale,y:p.y+15*scale},{x:p.x-24*scale,y:p.y-5*scale}],'#7b9980');poly([{x:p.x,y:p.y-22*scale},{x:p.x+24*scale,y:p.y-3*scale},{x:p.x+17*scale,y:p.y+20*scale},{x:p.x-2*scale,y:p.y+6*scale}],'#607f6c');}
  function rail(x,y,w,z){frontRect(x,y,w,z,15,'#c4e2e349');line(iso(x,y,z+16),iso(x+w,y,z+16),'#819c9e',1.2);for(let a=0;a<=w;a+=.7)line(iso(x+a,y,z),iso(x+a,y,z+16),'#98afb0',.8);}
  function building(){
    // Stepped limestone mass, narrow vertical windows and glazed ground level.
    floor(1.2,3.5,14,2,'#586b6621');
    box(1.2,.5,13.5,3.7,54,'#ecebe4','#cfd3cf','#aebbb9');
    for(let a=1.45;a<14.4;a+=.45)frontRect(a,4.205,.34,4,44,a%1>.5?'#66898f':'#7f9fa2');
    for(let a=.65;a<4;a+=.48)sideRect(14.71,a,.36,4,44,'#537e88');
    box(1.05,.45,13.8,3.85,7,'#efede5','#f4f1e9','#cdd5d1',54);
    // Roof garden / terrace strips.
    for(const x of [2,4,11.5,13.4]){box(x,3.25,.7,.65,6,'#9aa68a','#d8d6ca','#b5bfb4',61);tree(x+.35,3.58,67);}
    rail(1.3,4.23,13.3,61);
    // Upper academic wing on slim pillars.
    for(const x of [3,5,7,9,11,13])box(x,2.5,.22,.3,29,'#d5d9d4','#c7cec9','#a5b5b3',61);
    box(2.6,.55,11.5,2.3,142,'#f4f2eb','#deded5','#bdc9c7',90);
    for(let row=0;row<6;row++)for(let col=0;col<32;col++)frontRect(2.82+col*.35,2.86,.13,99+row*21,14,'#54707a');
    for(let row=0;row<6;row++)for(let col=0;col<6;col++)sideRect(14.11,.7+col*.34,.14,99+row*21,14,'#456771');
    // Distinct horizontal glazed band interrupts the regular window grid.
    frontRect(2.8,2.875,7.9,179,29,'#658791');
    for(let a=2.8;a<10.7;a+=.35)line(iso(a,2.88,179),iso(a,2.88,208),'#ced8d5',1.1);
    faceText('310',12.9,2.88,220,16);
    // Shallow entrance steps and glass vestibule; these are walkable.
    for(let i=0;i<5;i++)box(6.9,4.25+i*.17,2.3,.18,5-i,'#e2e2da','#c5ccc6','#bac6bf');
    frontRect(7.2,4.23,1.65,0,40,'#416b76');
    for(const x of [7.2,8.02,8.85])line(iso(x,4.235,0),iso(x,4.235,40),'#dfebe6',1.5);
    box(6.9,3.95,2.3,.7,4,'#f7f3e8','#d0d5ce','#b8c8c2',42);
    faceText('100주년기념관',5.4,4.24,49,10,'#52666b');
    // Broad lateral stair flight and landings, sculpted rather than textured.
    for(let i=0;i<12;i++)box(14.9,1+i*.36,.85,.37,52-i*4.2,'#e7e7df','#bcc7c1','#a5b6b0');
  }
  function lobbyBack(){
    box(.5,.25,15,.45,117,'#faf7ef','#e0dfd8','#b7c4c3');
    for(let x=6.8;x<15;x+=.55)frontRect(x,.71,.47,8,84,'#aac6c9');
    for(let x=7;x<15;x+=1.1)frontRect(x,.72,.018,8,84,'#edf0e8');
    // A partial upper gallery gives height while leaving the floor readable.
    box(.5,.4,15,1.4,12,'#f6f4ed','#e8e7df','#bacac8',117);
    rail(.6,1.82,14.7,129);
    for(let x=1;x<15;x+=.8)ellipse(x,1.65,2.2,'#ffedba',115);
    box(.5,1.8,.4,6.2,12,'#f6f4ed','#e2e1d8','#c4d1cd',117);
    for(let y=2;y<8;y+=.75){sideRect(.92,y,.67,129,15,'#d2e6e84a');line(iso(.93,y,145),iso(.93,y+.75,145),'#829ca1',1);}
  }
  function object(o){const{x,y,w,h,z,t}=o;
    if(t==='building'){building();return;}
    if(t==='bench'){box(x,y,w,h,z,'#c1a987','#9b8265','#826f58');for(let a=.15;a<w;a+=.22)line(iso(x+a,y,z),iso(x+a,y+h,z),'#917d63',.7);return;}
    if(t==='planter'||t==='plant'){box(x,y,w,h,z,'#b7b9a3','#dedcd1','#b2beb3');floor(x+.1,y+.1,w-.2,h-.2,'#8e9b80',z+.2);tree(x+w/2,y+h/2,z);return;}
    if(t==='column'){box(x,y,w,h,z,'#dfe4df','#bec9c5','#91a7a8');return;}
    if(t==='wall'){box(x,y,w,h,z,'#bcbab1','#494e4b','#333e3d');frontRect(x+.2,y+h+.01,w-.4,22,41,'#85a9b5');for(let row=0;row<7;row++)for(let col=0;col<17;col++)frontRect(x+.28+col*.27,y+h+.02,.22,24+row*5.3,3.8,(row+col)%3?'#789ca8':'#a7c0c5');faceText('DONORS WALL',x+.3,y+h+.03,72,12,'#dddccf');return;}
    if(t==='cafe'){box(x,y,w,h,z,'#dfc69e','#b8986e','#8c826b');box(x,y,w,.17,85,'#e3d6b7','#c6ad81','#968b70');faceText('CAFE',x+.7,y+.19,62,13,'#fff5dc');box(x+.35,y+.4,.8,.55,12,'#435553','#364746','#243a3c',z);}
  }
  function drawGround(){
    ctx.fillStyle=state.scene==='outside'?'#e5eae4':'#e8ece9';ctx.fillRect(0,0,width,height);
    const s=scenes[state.scene];floor(-.3,-.3,s.w+.6,s.h+.6,'#bdc9c2',-13);box(0,0,s.w,s.h,12,'#d7dbd1','#c3cdc2','#aebeb5',-12);
    for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++)floor(x,y,1,1,state.scene==='outside'?((x+y)%3?'#d9ded5':'#dde2d9'):((x+y)%3?'#e5e1d5':'#ebe7db'),0,'#b3bcb525');
    if(state.scene==='outside'){for(const x of [0,15.45])floor(x,.1,.5,13.8,'#a6b899');floor(7.2,5.3,1.6,8,'#e7e8dc');for(let y=6;y<13;y+=1.25)floor(7.94,y,.05,.45,'#afbcb4');}
    else{floor(7.2,2,1.6,11,'#f1eee3');for(let x=2;x<15;x+=3)floor(x,5,.09,8,'#abb8b33b');lobbyBack();}
  }
  function player(){const{x,y}=state.player,p=iso(x,y),bob=state.moving?Math.sin(state.walk*2)*1.2:0,k=scale;ellipse(x,y,12,'#3a555538');ctx.save();ctx.translate(p.x,p.y);ctx.scale(k,k);const step=state.moving?Math.sin(state.walk)*3:0;
    ctx.fillStyle='#3b5158';ctx.fillRect(-6,-14+step,5,13);ctx.fillRect(1,-14-step,5,13);ctx.fillStyle='#f7f5e9';ctx.fillRect(-7,-2+step,7,3);ctx.fillRect(1,-2-step,7,3);
    ctx.fillStyle='#668c99';ctx.beginPath();ctx.roundRect(-9,-32+bob,18,20,5);ctx.fill();ctx.fillStyle='#e5bb98';ctx.fillRect(-11,-28+bob,4,13);ctx.fillRect(7,-28+bob,4,13);ctx.beginPath();ctx.arc(0,-40+bob,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#39413c';ctx.beginPath();ctx.arc(0,-43+bob,8,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-8,-44+bob,3,6);ctx.fillStyle='#c7d7d4';ctx.fillRect(-6,-29+bob,12,12);ctx.restore();}
  function marker(){if(!state.target)return;const p=iso(state.target.x,state.target.y);ctx.strokeStyle='#487d83';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y,9,4.5,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#487d83';ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();
    if(state.path.length){ctx.beginPath();const a=iso(state.player.x,state.player.y);ctx.moveTo(a.x,a.y);for(const n of state.path){const b=iso(n.x,n.y);ctx.lineTo(b.x,b.y);}ctx.setLineDash([2,7]);ctx.strokeStyle='#527e8050';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);}}
  function pointMarkers(){for(const point of scenes[state.scene].points){const p=iso(point.x,point.y);ellipse(point.x,point.y,14,'#407b7e18');ctx.beginPath();ctx.ellipse(p.x,p.y,11*scale,5*scale,0,0,Math.PI*2);ctx.strokeStyle='#659899';ctx.lineWidth=1;ctx.stroke();const ty=p.y-25;ctx.font='600 11px sans-serif';const tw=ctx.measureText(point.label).width;ctx.fillStyle='#ffffffeb';ctx.beginPath();ctx.roundRect(p.x-tw/2-10,ty-15,tw+20,25,12);ctx.fill();ctx.fillStyle='#35585c';ctx.textAlign='center';ctx.fillText(point.label,p.x,ty+1);}}
  function blocked(x,y){const s=scenes[state.scene];return x<R+.15||y<R+.15||x>s.w-R-.15||y>s.h-R-.15||s.objects.some(o=>x+R>o.x&&x-R<o.x+o.w&&y+R>o.y&&y-R<o.y+o.h);}
  function clearLine(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.08);for(let i=1;i<=n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;return true;}
  // A flood search explores the reachable component; unreachable taps snap to its nearest cell.
  function route(target){const s=scenes[state.scene],cols=s.w/STEP+1,rows=s.h/STEP+1,total=cols*rows,prev=new Int32Array(total).fill(-1),seen=new Uint8Array(total),q=[];
    const id=(x,y)=>y*cols+x,pos=n=>({x:(n%cols)*STEP,y:Math.floor(n/cols)*STEP});
    let start=-1,bestD=Infinity;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=Math.round(state.player.x/STEP)+dx,y=Math.round(state.player.y/STEP)+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const p={x:x*STEP,y:y*STEP},d=Math.hypot(p.x-state.player.x,p.y-state.player.y);if(d<bestD&&!blocked(p.x,p.y)&&clearLine(state.player,p)){start=id(x,y);bestD=d;}}
    if(start<0)return[];seen[start]=1;q.push(start);let best=start,dist=Infinity;
    for(let head=0;head<q.length;head++){const n=q[head],p=pos(n),d=Math.hypot(target.x-p.x,target.y-p.y);if(d<dist){dist=d;best=n;}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n%cols+dx,y=Math.floor(n/cols)+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const next=id(x,y),b=pos(next);if(seen[next]||blocked(b.x,b.y)||!clearLine(p,b))continue;seen[next]=1;prev[next]=n;q.push(next);}}
    const raw=[];for(let n=best;n!==-1;n=prev[n])raw.push(pos(n));raw.reverse();if(!blocked(target.x,target.y)&&clearLine(pos(best),target))raw.push(target);
    const result=[];let from=state.player,i=0;while(i<raw.length){let j=i;while(j+1<raw.length&&clearLine(from,raw[j+1]))j++;result.push(raw[j]);from=raw[j];i=j+1;}return result;
  }
  function go(target,point=null){state.path=route(target);state.target=state.path.length?state.path[state.path.length-1]:null;state.pending=point;}
  let down=null;canvas.addEventListener('pointerdown',e=>{if(state.frozen||!e.isPrimary)return;down={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup',e=>{if(!down||down.id!==e.pointerId)return;const d=down;down=null;if(state.frozen||Math.hypot(e.clientX-d.x,e.clientY-d.y)>14)return;const point=scenes[state.scene].points.find(n=>{const p=iso(n.x,n.y);return Math.abs(e.clientX-p.x)<42&&Math.abs(e.clientY-(p.y-15))<35;});go(point||inverse(e.clientX,e.clientY),point?.id||null);});canvas.addEventListener('pointercancel',()=>{down=null;});
  function update(dt){if(state.frozen){state.moving=false;return;}let moved=0;const sx=(state.keys.ArrowRight||state.keys.d?1:0)-(state.keys.ArrowLeft||state.keys.a?1:0),sy=(state.keys.ArrowDown||state.keys.s?1:0)-(state.keys.ArrowUp||state.keys.w?1:0);
    if(sx||sy){state.path=[];state.pending=null;state.target=null;let dx=sx+sy,dy=sy-sx,len=Math.hypot(dx,dy);dx=dx/len*3*dt;dy=dy/len*3*dt;const old={...state.player};if(!blocked(state.player.x+dx,state.player.y))state.player.x+=dx;if(!blocked(state.player.x,state.player.y+dy))state.player.y+=dy;moved=Math.hypot(state.player.x-old.x,state.player.y-old.y);}
    else if(state.path.length){const p=state.path[0],dx=p.x-state.player.x,dy=p.y-state.player.y,d=Math.hypot(dx,dy),step=Math.min(d,3.4*dt);if(d<.015)state.path.shift();else{const n={x:state.player.x+dx/d*step,y:state.player.y+dy/d*step};if(clearLine(state.player,n)){state.player=n;moved=step;if(step===d)state.path.shift();}else{state.path=[];state.pending=null;}}}
    state.moving=moved>0;if(state.moving)state.walk+=dt*9;
    const near=scenes[state.scene].points.find(p=>Math.hypot(p.x-state.player.x,p.y-state.player.y)<1.05);state.near=near?.id||null;ui.action.hidden=!near;if(near)ui.actionText.textContent=near.action;
    if(!state.path.length){state.target=null;if(state.pending){const id=state.pending;state.pending=null;if(id===state.near)interact();}}
  }
  function resetInput(){state.keys={};state.path=[];state.pending=null;state.target=null;down=null;}
  function changeScene(next){resetInput();state.frozen=true;ui.transition.classList.add('active');setTimeout(()=>{state.scene=next;state.player={...scenes[next].spawn};state.near=null;ui.action.hidden=true;ui.place.textContent=next==='inside'?'310관 · 1층 로비':'310관 · 야외 광장';ui.objective.textContent=next==='inside'?'전시 벽을 터치해 둘러보세요':'입구 표식을 터치하면 안으로 이동합니다';setTimeout(()=>{ui.transition.classList.remove('active');state.frozen=false;},300);},350);}
  function interact(){if(state.frozen)return;if(state.near==='door')changeScene('inside');else if(state.near==='exit')changeScene('outside');else if(state.near==='history'){resetInput();state.frozen=true;state.completed=true;ui.sheet.hidden=false;ui.objective.textContent='탐색 완료 · 원하는 곳을 터치해 산책하세요';$('closeSheet').focus();}}
  function closePanel(el){el.hidden=true;state.frozen=false;resetInput();}
  ui.action.onclick=interact;$('helpButton').onclick=()=>{resetInput();state.frozen=true;ui.help.hidden=false;};$('closeHelp').onclick=$('helpConfirm').onclick=()=>closePanel(ui.help);$('closeSheet').onclick=$('sheetConfirm').onclick=()=>closePanel(ui.sheet);
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.key==='Escape'){if(!ui.help.hidden)closePanel(ui.help);if(!ui.sheet.hidden)closePanel(ui.sheet);return;}state.keys[e.key]=true;state.keys[e.key.toLowerCase()]=true;if(e.code==='Space')interact();});addEventListener('keyup',e=>{delete state.keys[e.key];delete state.keys[e.key.toLowerCase()];});addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});
  $('zoomIn').onclick=()=>{state.zoom=Math.min(2.5,state.zoom+.5);};$('zoomOut').onclick=()=>{state.zoom=Math.max(1,state.zoom-.5);};
  let last=performance.now();function loop(now){const dt=Math.min(.035,(now-last)/1000);last=now;state.time+=dt;camera();update(dt);drawGround();marker();const items=scenes[state.scene].objects.map(o=>({depth:o.x+o.y+o.w/2+o.h/2,draw:()=>object(o)}));items.push({depth:state.player.x+state.player.y,draw:player});items.sort((a,b)=>a.depth-b.depth).forEach(o=>o.draw());pointMarkers();requestAnimationFrame(loop);}requestAnimationFrame(loop);
})();
