(() => {
  'use strict';
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  const $=id=>document.getElementById(id);
  const ui={place:$('place'),objective:$('objectiveText'),action:$('actionButton'),actionText:$('actionText'),sheet:$('sheet'),help:$('help'),transition:$('transition')};
  const R=.23, STEP=.25;
  const scenes={
    outside:{w:42,h:34,spawn:{x:7.4,y:12.2},points:[
      {id:'door',x:9.7,y:11.9,label:'1층 입구 · 303관 방향',action:'들어가기'},
      {id:'garden',x:19,y:16.2,label:'테라스 정원',action:'정원 둘러보기'},
      {id:'lower',x:9.6,y:24.7,label:'하부 광장',action:'광장 둘러보기'}],objects:[]},
    inside:{w:16,h:14,spawn:{x:8,y:11.5},points:[{id:'history',x:3,y:3.1,label:'기념 전시',action:'살펴보기'},{id:'exit',x:8,y:12.7,label:'야외 광장',action:'밖으로 나가기'}],objects:[
      {x:1,y:.8,w:5.2,h:.6,z:87,t:'wall'},
      {x:10,y:1,w:4.7,h:1.35,z:28,t:'cafe'},
      ...[2,7.5,13.2].map(x=>({x,y:4.8,w:.55,h:.55,z:118,t:'column'})),
      {x:2.6,y:8,w:2.5,h:.65,z:13,t:'bench'}, {x:11,y:8,w:2.5,h:.65,z:13,t:'bench'},
      {x:1.1,y:7.2,w:.85,h:.85,z:15,t:'plant'},{x:14.1,y:7.2,w:.85,h:.85,z:15,t:'plant'}]}
  };
  const state={scene:'outside',player:{...scenes.outside.spawn},path:[],target:null,pending:null,near:null,time:0,walk:0,moving:false,frozen:false,completed:false,keys:{},zoom:innerWidth<600?2.25:1.35,plan:false,pan:{x:0,y:0}};
  let width=innerWidth,height=innerHeight,scale=1,ox=0,oy=0;
  function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  addEventListener('resize',resize);resize();
  function camera(){
    if(state.scene==='outside'){
      const project=(x,y,z)=>state.plan?{x:y*34,y:x*34}:{x:(x+y)*34,y:(-x+y)*17-z};
      const corners=[[0,0],[42,0],[42,34],[0,34]].flatMap(([x,y])=>[project(x,y,0),project(x,y,220)]);
      const xmin=Math.min(...corners.map(p=>p.x)),xmax=Math.max(...corners.map(p=>p.x)),ymin=Math.min(...corners.map(p=>p.y)),ymax=Math.max(...corners.map(p=>p.y));
      const base=Math.min((width-28)/(xmax-xmin),(height-190)/(ymax-ymin),1);
      scale=base*state.zoom;const center=project(19,15,60),focus=project(state.player.x,state.player.y,elevation(state.player.x,state.player.y));
      const blend=Math.min(.7,Math.max(0,state.zoom-1)*.32);
      ox=width/2-(center.x*(1-blend)+focus.x*blend)*scale+state.pan.x;
      oy=height*.53-(center.y*(1-blend)+focus.y*blend)*scale+state.pan.y;
    }else{
      scale=Math.min((width-24)/1030,(height-180)/790,1.35);scale=Math.max(.2,scale);const base=scale;ox=width/2-(state.player.x-state.player.y)*34*base*(state.zoom-1);oy=130+215*base+Math.max(0,(height-180-790*base)/2)-(state.player.x+state.player.y)*17*base*(state.zoom-1);scale*=state.zoom;
    }
  }
  const iso=(x,y,z=0)=>state.scene==='outside'?(state.plan?{x:ox+y*34*scale,y:oy+x*34*scale}:{x:ox+(x+y)*34*scale,y:oy+(-x+y)*17*scale-z*scale}):({x:ox+(x-y)*34*scale,y:oy+(x+y)*17*scale-z*scale});
  function inverse(x,y){
    if(state.scene!=='outside'){const a=(x-ox)/(34*scale),b=(y-oy)/(17*scale);return{x:(a+b)/2,y:(b-a)/2};}
    if(state.plan)return{x:(y-oy)/(34*scale),y:(x-ox)/(34*scale)};
    const a=(x-ox)/(34*scale),b=(y-oy)/scale,candidates=[];
    for(const surf of surfaces){const xx=((17-surf.my)*a-surf.c-b)/(34+surf.mx-surf.my),yy=a-xx;if(inPoly(xx,yy,surf.p))candidates.push({x:xx,y:yy});}
    candidates.sort((p,q)=>(-q.x+q.y)-(-p.x+p.y));return candidates[0]||{x:(17*a-b)/34,y:(17*a+b)/34};
  }
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
  const site=window.CAU_SITE;
  const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  // Horizontal dimensions follow mapped footprints; elevations and stair widths are interpreted.
  const tower=[[12.337,8.731],[24.489,8.507],[25.562,8.88],[26.839,10.256],[27.817,12.17],[28.107,17.468],[26.4,17.55],[25.8,12.8],[24.8,11.5],[13,11.55],[10.877,11.735]];
  const mapped=id=>site.paths.find(p=>p.osmWay===id).points;
  function stair(id,from,to,za,zb,width=1.45){const dx=to[0]-from[0],dy=to[1]-from[1],len=Math.hypot(dx,dy),nx=-dy/len*width/2,ny=dx/len*width/2,mx=(zb-za)*dx/(len*len),my=(zb-za)*dy/(len*len);return{id,from,to,p:[[from[0]+nx,from[1]+ny],[to[0]+nx,to[1]+ny],[to[0]-nx,to[1]-ny],[from[0]-nx,from[1]-ny]],c:za-mx*from[0]-my*from[1],mx,my,color:'#d9ded6'};}
  const surfaces=[
    {id:'upper',p:mapped('744062066'),c:96,mx:0,my:0,color:'#e2e2d9'},
    stair('upper-stair',[9.44,12.65],[10.63,15.18],96,48),
    {id:'middle-walk',p:mapped('744062067'),c:48,mx:0,my:0,color:'#e2e2d8'},
    {id:'garden-link',p:rect(13.2,18,2.5,3.3),c:48,mx:0,my:0,color:'#e2e2d8'},
    {id:'garden',p:rect(15.2,12.5,8.5,6.1),c:48,mx:0,my:0,color:'#e2e3d7'},
    stair('lower-stair',[10.92,20.08],[6.64,22.42],48,0),
    {id:'lower-landing',p:[[5.8,22.2],[7.3,21.8],[8.5,24],[7.1,24.6]],c:0,mx:0,my:0,color:'#e6e5dc'},
    {id:'lower',p:mapped('744062057'),c:0,mx:0,my:0,color:'#e6e5dc'}
  ];
  // OSM stair endpoints meet polygon boundaries at a node; small landings give the avatar clearance.
  for(const stairSurface of surfaces.filter(s=>s.from))for(const point of [stairSurface.from,stairSurface.to])surfaces.push({id:stairSurface.id+'-landing',p:rect(point[0]-.85,point[1]-.85,1.7,1.7),c:stairSurface.c+stairSurface.mx*point[0]+stairSurface.my*point[1],mx:0,my:0,color:'#e1e3da',landing:true});
  const planters=[{x:16,y:13.3,w:1.25,h:1.25},{x:19,y:13.3,w:1.25,h:1.25},{x:22,y:13.3,w:1.25,h:1.25},{x:16,y:16.6,w:1.25,h:1.25},{x:22,y:16.6,w:1.25,h:1.25}];
  function inPoly(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  function surfaceAt(x,y){return surfaces.filter(s=>s.from).find(s=>inPoly(x,y,s.p))||surfaces.filter(s=>s.landing).find(s=>inPoly(x,y,s.p))||surfaces.find(s=>inPoly(x,y,s.p));}
  function elevation(x,y){if(state.scene!=='outside')return 0;const s=surfaceAt(x,y);return s?s.c+s.mx*x+s.my*y:0;}
  function shape(p,color,z=0,stroke){poly(p.map(([x,y])=>iso(x,y,typeof z==='function'?z(x,y):z)),color,stroke);}
  function prism(p,base,top,colors=['#e9e8df','#cbd2cd','#b5c5c1'],windows=false){
    if(state.plan){shape(p,colors[0],0,'#778e8580');return;}
    const edges=p.map((a,i)=>({a,b:p[(i+1)%p.length]})).sort((u,v)=>(-u.a[0]-u.b[0]+u.a[1]+u.b[1])-(-v.a[0]-v.b[0]+v.a[1]+v.b[1]));
    for(const{a,b}of edges){const ax=b[0]-a[0],ay=b[1]-a[1],len=Math.hypot(ax,ay);poly([iso(...a,base),iso(...b,base),iso(...b,top),iso(...a,top)],ax>0?colors[1]:colors[2]);
      if(windows&&len>.5){const count=Math.max(1,Math.floor(len/.48));for(let row=0;row<7;row++)for(let col=0;col<count;col++){const t=(col+.3)/count,u=(col+.62)/count,z=base+12+row*(top-base-26)/7;const aa=[a[0]+ax*t,a[1]+ay*t],bb=[a[0]+ax*u,a[1]+ay*u];poly([iso(...aa,z),iso(...bb,z),iso(...bb,z+13),iso(...aa,z+13)],row===5?'#7897a0':'#5a767e');}}
      if(windows&&len>6){const cut=t=>[a[0]+ax*t,a[1]+ay*t],lo=top-64,hi=top-39;poly([iso(...cut(.12),lo),iso(...cut(.84),lo),iso(...cut(.84),hi),iso(...cut(.12),hi)],'#75949e');for(let t=.12;t<=.84;t+=.025)line(iso(...cut(t),lo),iso(...cut(t),hi),'#c4d4d1',.8);}
    }shape(p,colors[0],top,'#ffffff70');
  }
  function siteText(text,x,y,z=0,size=11,color='#4d6c70'){const p=iso(x,y,z);ctx.font=`600 ${size}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,p.x,p.y);}
  function siteGround(){
    ctx.fillStyle='#e8ede7';ctx.fillRect(0,0,width,height);
    shape([[0,0],[42,0],[42,34],[0,34]],'#d7e0d2',-16);
    shape([[13,0],[42,0],[42,8],[29,9],[25,7],[13,6]],'#b5c6a9',40);
    // Roads and woodland trail follow OSM centerlines, not decorative curves.
    ctx.save();ctx.beginPath();[[0,0],[42,0],[42,34],[0,34]].map(p=>iso(...p,-16)).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
    for(const way of site.paths.filter(p=>!p.area&&p.kind!=='steps')){ctx.beginPath();way.points.map(p=>iso(...p,way.kind==='service'?70:45)).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineWidth=(way.kind==='service'?32:9)*scale;ctx.lineJoin='round';ctx.strokeStyle=way.kind==='service'?'#b5c2ba':'#c6ceb6';ctx.stroke();}ctx.restore();
    const podium=site.features.find(f=>f.id==='310').footprint;
    prism(podium,-12,48,['#d8dfd5','#bdc9c5','#a9bdbb']);
    for(const surf of surfaces){
      const z=(x,y)=>surf.c+surf.mx*x+surf.my*y;
      if(!surf.from){prism(surf.p,-12,surf.c,[surf.color,'#bbc8c1','#acbfb9']);}
      else{
        const p=surf.p;for(let i=0;i<18;i++){const t=i/18,u=(i+1)/18,at=(a,b,v)=>[a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v],a=at(p[0],p[1],t),b=at(p[0],p[1],u),c=at(p[3],p[2],u),d=at(p[3],p[2],t);prism([a,b,c,d],-12,z(...a),[i%2?'#e1e3da':'#d6dcd4','#adbeb6','#a8bab4']);}
      }
      shape(surf.p,surf.color,z,'#f6f7ef60');
      if(surf.from){for(let i=0;i<=18;i++){const t=i/18,p=surf.p,a=[p[0][0]+(p[1][0]-p[0][0])*t,p[0][1]+(p[1][1]-p[0][1])*t],b=[p[3][0]+(p[2][0]-p[3][0])*t,p[3][1]+(p[2][1]-p[3][1])*t];line(iso(...a,z(...a)),iso(...b,z(...b)),'#9cafaa',1);}}
    }
  }

  function siteObjects(){
    const list=[];
    for(const f of site.features.filter(f=>f.id!=='310')){
      const x=f.footprint.reduce((n,p)=>n+p[0],0)/f.footprint.length,y=f.footprint.reduce((n,p)=>n+p[1],0)/f.footprint.length;
      list.push({depth:-x+y,draw:()=>{ctx.save();ctx.globalAlpha=.6;prism(f.footprint,f.id==='303'||f.id==='305'?96:0,(f.id==='303'||f.id==='305'?96:0)+f.height*.5,['#d3dbd5','#b8c8c2','#a6bdb8']);ctx.restore();siteText(f.id+' '+f.name,x,y,(f.id==='303'||f.id==='305'?96:0)+f.height*.5+12,10,'#647e79');}});
    }
    list.push({depth:-7,draw:()=>{
      // Open pilotis beneath the bent upper mass.
      for(let x=13;x<25;x+=1.6)prism(rect(x,10.8,.22,.24),48,134,['#dfe2d9','#b7c5bf','#8fa8a7']);
      prism(tower,134,306,['#eeeee6','#dadfd6','#b6c7c4'],true);
      if(!state.plan){shape([[14,9.2],[22.8,9.05],[23,10.3],[14.2,10.4]],'#88a7ae',307);for(let x=14.5;x<23;x+=.6)line(iso(x,9.2,308),iso(x,10.3,308),'#dce9e5',1);}
      siteText('310',12,10.8,312,15,'#41676c');
      // North-facing vestibule on the 303-side upper level.
      prism([[10.8,11.75],[11.55,11.7],[12.5,13.6],[11.8,14]],96,124,['#d6e5df','#658d97','#84a5ab']);
    }});
    for(const o of planters)list.push({depth:-o.x+o.y,draw:()=>{prism(rect(o.x,o.y,o.w,o.h),48,56,['#95a789','#d4d8c9','#b7c4b2']);tree(o.x+o.w/2,o.y+o.h/2,56);}});
    // The lower glazed hall is offset from the tall upper wing, as in the approach photographs.
    list.push({depth:-6,draw:()=>{if(!state.plan){const x=25.6;for(let y=12.7;y<17.4;y+=.45){const a=iso(x,y,0),b=iso(x,y+.32,0),c=iso(x,y+.32,42),d=iso(x,y,42);poly([a,b,c,d],'#71949c');}siteText('310',x,14.8,49,11);}}});
    for(let i=0;i<15;i++){const x=14+i*1.8,y=2.5+(i%3)*1.1;list.push({depth:-x+y,draw:()=>tree(x,y,45)});}
    list.push({depth:-state.player.x+state.player.y,draw:player});
    list.sort((a,b)=>a.depth-b.depth).forEach(o=>o.draw());
    if(!state.plan)for(const sf of surfaces.filter(s=>s.from)){for(const [ia,ib]of[[0,1],[3,2]]){const a=sf.p[ia],b=sf.p[ib],z=p=>sf.c+sf.mx*p[0]+sf.my*p[1];line(iso(...a,z(a)+12),iso(...b,z(b)+12),'#809e9d',1);for(let i=0;i<=8;i++){const t=i/8,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];line(iso(...p,z(p)),iso(...p,z(p)+12),'#809e9d',.9);}}}
    // Compass respects geographic axes, including the plan-view mode.
    const a={x:width-44,y:height-105},b=state.plan?{x:a.x,y:a.y-25}:{x:a.x-20,y:a.y+10};line(a,b,'#587a78',1.5/scale);ctx.fillStyle='#587a78';ctx.font='600 11px sans-serif';ctx.textAlign='center';ctx.fillText('N',b.x,b.y-6);
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
    if(t==='bench'){box(x,y,w,h,z,'#c1a987','#9b8265','#826f58');for(let a=.15;a<w;a+=.22)line(iso(x+a,y,z),iso(x+a,y+h,z),'#917d63',.7);return;}
    if(t==='planter'||t==='plant'){box(x,y,w,h,z,'#b7b9a3','#dedcd1','#b2beb3');floor(x+.1,y+.1,w-.2,h-.2,'#8e9b80',z+.2);tree(x+w/2,y+h/2,z);return;}
    if(t==='column'){box(x,y,w,h,z,'#dfe4df','#bec9c5','#91a7a8');return;}
    if(t==='wall'){box(x,y,w,h,z,'#bcbab1','#494e4b','#333e3d');frontRect(x+.2,y+h+.01,w-.4,22,41,'#85a9b5');for(let row=0;row<7;row++)for(let col=0;col<17;col++)frontRect(x+.28+col*.27,y+h+.02,.22,24+row*5.3,3.8,(row+col)%3?'#789ca8':'#a7c0c5');faceText('DONORS WALL',x+.3,y+h+.03,72,12,'#dddccf');return;}
    if(t==='cafe'){box(x,y,w,h,z,'#dfc69e','#b8986e','#8c826b');box(x,y,w,.17,85,'#e3d6b7','#c6ad81','#968b70');faceText('CAFE',x+.7,y+.19,62,13,'#fff5dc');box(x+.35,y+.4,.8,.55,12,'#435553','#364746','#243a3c',z);}
  }
  function drawGround(){
    if(state.scene==='outside'){siteGround();return;}
    ctx.fillStyle=state.scene==='outside'?'#e5eae4':'#e8ece9';ctx.fillRect(0,0,width,height);
    const s=scenes[state.scene];floor(-.3,-.3,s.w+.6,s.h+.6,'#bdc9c2',-13);box(0,0,s.w,s.h,12,'#d7dbd1','#c3cdc2','#aebeb5',-12);
    for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++)floor(x,y,1,1,state.scene==='outside'?((x+y)%3?'#d9ded5':'#dde2d9'):((x+y)%3?'#e5e1d5':'#ebe7db'),0,'#b3bcb525');
    if(state.scene==='outside'){for(const x of [0,15.45])floor(x,.1,.5,13.8,'#a6b899');floor(7.2,5.3,1.6,8,'#e7e8dc');for(let y=6;y<13;y+=1.25)floor(7.94,y,.05,.45,'#afbcb4');}
    else{floor(7.2,2,1.6,11,'#f1eee3');for(let x=2;x<15;x+=3)floor(x,5,.09,8,'#abb8b33b');lobbyBack();}
  }
  function player(){const{x,y}=state.player,p=iso(x,y,elevation(x,y)),bob=state.moving?Math.sin(state.walk*2)*1.2:0,k=state.scene==='outside'?Math.max(.48,scale*1.15):scale;ellipse(x,y,12,'#3a555538',elevation(x,y));ctx.save();ctx.translate(p.x,p.y);ctx.scale(k,k);const step=state.moving?Math.sin(state.walk)*3:0;
    ctx.fillStyle='#3b5158';ctx.fillRect(-6,-14+step,5,13);ctx.fillRect(1,-14-step,5,13);ctx.fillStyle='#f7f5e9';ctx.fillRect(-7,-2+step,7,3);ctx.fillRect(1,-2-step,7,3);
    ctx.fillStyle='#668c99';ctx.beginPath();ctx.roundRect(-9,-32+bob,18,20,5);ctx.fill();ctx.fillStyle='#e5bb98';ctx.fillRect(-11,-28+bob,4,13);ctx.fillRect(7,-28+bob,4,13);ctx.beginPath();ctx.arc(0,-40+bob,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#39413c';ctx.beginPath();ctx.arc(0,-43+bob,8,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-8,-44+bob,3,6);ctx.fillStyle='#c7d7d4';ctx.fillRect(-6,-29+bob,12,12);ctx.restore();}
  function marker(){if(!state.target)return;const p=iso(state.target.x,state.target.y,elevation(state.target.x,state.target.y));ctx.strokeStyle='#487d83';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y,9,4.5,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#487d83';ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();
    if(state.path.length){ctx.beginPath();const a=iso(state.player.x,state.player.y,elevation(state.player.x,state.player.y));ctx.moveTo(a.x,a.y);for(const n of state.path){const b=iso(n.x,n.y,elevation(n.x,n.y));ctx.lineTo(b.x,b.y);}ctx.setLineDash([2,7]);ctx.strokeStyle='#527e8050';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);}}
  function pointMarkers(){for(const point of scenes[state.scene].points){const z=elevation(point.x,point.y),p=iso(point.x,point.y,z);ellipse(point.x,point.y,14,'#407b7e18',z);ctx.beginPath();ctx.ellipse(p.x,p.y,11*scale,5*scale,0,0,Math.PI*2);ctx.strokeStyle='#659899';ctx.lineWidth=1;ctx.stroke();const ty=p.y-25;ctx.font='600 11px sans-serif';const tw=ctx.measureText(point.label).width;ctx.fillStyle='#ffffffeb';ctx.beginPath();ctx.roundRect(p.x-tw/2-10,ty-15,tw+20,25,12);ctx.fill();ctx.fillStyle='#35585c';ctx.textAlign='center';ctx.fillText(point.label,p.x,ty+1);}}
  function blocked(x,y){if(state.scene==='outside'){if(x<R||y<R||x>42-R||y>34-R)return true;const samples=[[x,y],[x-R,y],[x+R,y],[x,y-R],[x,y+R]];return samples.some(([a,b])=>!surfaceAt(a,b)||inPoly(a,b,tower))||planters.some(o=>x+R>o.x&&x-R<o.x+o.w&&y+R>o.y&&y-R<o.y+o.h);}const s=scenes[state.scene];return x<R+.15||y<R+.15||x>s.w-R-.15||y>s.h-R-.15||s.objects.some(o=>x+R>o.x&&x-R<o.x+o.w&&y+R>o.y&&y-R<o.y+o.h);}
  function clearLine(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.04);let previous=elevation(a.x,a.y);for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;if(blocked(x,y))return false;const z=elevation(x,y);if(Math.abs(z-previous)>2.5)return false;previous=z;}return true;}
  // A flood search explores the reachable component; unreachable taps snap to its nearest cell.
  function route(target){const STEP=state.scene==='outside'?.5:.25;const s=scenes[state.scene],cols=s.w/STEP+1,rows=s.h/STEP+1,total=cols*rows,prev=new Int32Array(total).fill(-1),seen=new Uint8Array(total),q=[];
    const id=(x,y)=>y*cols+x,pos=n=>({x:(n%cols)*STEP,y:Math.floor(n/cols)*STEP});
    let start=-1,bestD=Infinity;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=Math.round(state.player.x/STEP)+dx,y=Math.round(state.player.y/STEP)+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const p={x:x*STEP,y:y*STEP},d=Math.hypot(p.x-state.player.x,p.y-state.player.y);if(d<bestD&&!blocked(p.x,p.y)&&clearLine(state.player,p)){start=id(x,y);bestD=d;}}
    if(start<0)return[];seen[start]=1;q.push(start);let best=start,dist=Infinity;
    for(let head=0;head<q.length;head++){const n=q[head],p=pos(n),d=Math.hypot(target.x-p.x,target.y-p.y);if(d<dist){dist=d;best=n;}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=n%cols+dx,y=Math.floor(n/cols)+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const next=id(x,y),b=pos(next);if(seen[next]||blocked(b.x,b.y)||!clearLine(p,b))continue;seen[next]=1;prev[next]=n;q.push(next);}}
    const raw=[];for(let n=best;n!==-1;n=prev[n])raw.push(pos(n));raw.reverse();if(!blocked(target.x,target.y)&&clearLine(pos(best),target))raw.push(target);
    const result=[];let from=state.player,i=0;while(i<raw.length){let j=i;while(j+1<raw.length&&clearLine(from,raw[j+1]))j++;result.push(raw[j]);from=raw[j];i=j+1;}return result;
  }
  function go(target,point=null){state.path=route(target);state.target=state.path.length?state.path[state.path.length-1]:null;state.pending=point;}
  let down=null;
  canvas.addEventListener('pointerdown',e=>{if(state.frozen||!e.isPrimary)return;down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,id:e.pointerId,drag:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!down||e.pointerId!==down.id||state.scene!=='outside')return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>10)down.drag=true;if(down.drag){state.pan.x+=e.clientX-down.lastX;state.pan.y+=e.clientY-down.lastY;}down.lastX=e.clientX;down.lastY=e.clientY;});
  canvas.addEventListener('pointerup',e=>{if(!down||down.id!==e.pointerId)return;const d=down;down=null;if(state.frozen||d.drag||Math.hypot(e.clientX-d.x,e.clientY-d.y)>14)return;const point=scenes[state.scene].points.find(n=>{const p=iso(n.x,n.y,elevation(n.x,n.y));return Math.abs(e.clientX-p.x)<60&&Math.abs(e.clientY-(p.y-22))<22;});go(point||inverse(e.clientX,e.clientY),point?.id||null);});canvas.addEventListener('pointercancel',()=>{down=null;});
  function update(dt){if(state.frozen){state.moving=false;return;}let moved=0;const sx=(state.keys.ArrowRight||state.keys.d?1:0)-(state.keys.ArrowLeft||state.keys.a?1:0),sy=(state.keys.ArrowDown||state.keys.s?1:0)-(state.keys.ArrowUp||state.keys.w?1:0);
    if(sx||sy){state.path=[];state.pending=null;state.target=null;let dx=sx+sy,dy=sy-sx,len=Math.hypot(dx,dy);dx=dx/len*3*dt;dy=dy/len*3*dt;const old={...state.player};if(clearLine(state.player,{x:state.player.x+dx,y:state.player.y}))state.player.x+=dx;if(clearLine(state.player,{x:state.player.x,y:state.player.y+dy}))state.player.y+=dy;moved=Math.hypot(state.player.x-old.x,state.player.y-old.y);}
    else if(state.path.length){const p=state.path[0],dx=p.x-state.player.x,dy=p.y-state.player.y,d=Math.hypot(dx,dy),step=Math.min(d,3.4*dt);if(d<.015)state.path.shift();else{const n={x:state.player.x+dx/d*step,y:state.player.y+dy/d*step};if(clearLine(state.player,n)){state.player=n;moved=step;if(step===d)state.path.shift();}else{state.path=[];state.pending=null;}}}
    state.moving=moved>0;if(state.moving)state.walk+=dt*9;
    const near=scenes[state.scene].points.find(p=>Math.hypot(p.x-state.player.x,p.y-state.player.y)<1.05);state.near=near?.id||null;ui.action.hidden=!near;if(near)ui.actionText.textContent=near.action;
    if(!state.path.length){state.target=null;if(state.pending){const id=state.pending;state.pending=null;if(id===state.near)interact();}}
  }
  function resetInput(){state.keys={};state.path=[];state.pending=null;state.target=null;down=null;}
  function changeScene(next){resetInput();state.frozen=true;ui.transition.classList.add('active');setTimeout(()=>{state.scene=next;state.zoom=next==='outside'?(width<600?2.25:1.35):1;$('planMap').textContent='배치도';$('planMap').disabled=next!=='outside';state.pan={x:0,y:0};state.plan=false;state.player={...scenes[next].spawn};state.near=null;ui.action.hidden=true;ui.place.textContent=next==='inside'?'310관 · 1층 로비':'310관 · 캠퍼스 산책';ui.objective.textContent=next==='inside'?'전시 벽을 터치해 둘러보세요':'303관 방향 입구를 터치해 들어가세요';setTimeout(()=>{ui.transition.classList.remove('active');state.frozen=false;},300);},350);}
  function interact(){if(state.frozen)return;if(state.near==='door')changeScene('inside');else if(state.near==='exit')changeScene('outside');else if(state.near==='garden'||state.near==='lower'){ui.objective.textContent=state.near==='garden'?'테라스 정원 · 계단을 따라 다른 높이로 이동하세요':'하부 광장 · 계단을 따라 1층 입구로 돌아가세요';}else if(state.near==='history'){resetInput();state.frozen=true;state.completed=true;ui.sheet.hidden=false;ui.objective.textContent='탐색 완료 · 원하는 곳을 터치해 산책하세요';$('closeSheet').focus();}}
  function closePanel(el){el.hidden=true;state.frozen=false;resetInput();}
  ui.action.onclick=interact;$('helpButton').onclick=()=>{resetInput();state.frozen=true;ui.help.hidden=false;};$('closeHelp').onclick=$('helpConfirm').onclick=()=>closePanel(ui.help);$('closeSheet').onclick=$('sheetConfirm').onclick=()=>closePanel(ui.sheet);
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.key==='Escape'){if(!ui.help.hidden)closePanel(ui.help);if(!ui.sheet.hidden)closePanel(ui.sheet);return;}state.keys[e.key]=true;state.keys[e.key.toLowerCase()]=true;if(e.code==='Space')interact();});addEventListener('keyup',e=>{delete state.keys[e.key];delete state.keys[e.key.toLowerCase()];});addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});
  $('zoomIn').onclick=()=>{state.zoom=Math.min(4,state.zoom+.4);};$('zoomOut').onclick=()=>{state.zoom=Math.max(.8,state.zoom-.4);};$('fitMap').onclick=()=>{state.zoom=1;state.pan={x:0,y:0};};$('planMap').onclick=()=>{if(state.scene!=='outside')return;state.plan=!state.plan;state.pan={x:0,y:0};$('planMap').textContent=state.plan?'입체 보기':'배치도';};
  let last=performance.now();function loop(now){const dt=Math.min(.035,(now-last)/1000);last=now;state.time+=dt;camera();update(dt);drawGround();marker();if(state.scene==='outside'){siteObjects();}else{const items=scenes[state.scene].objects.map(o=>({depth:o.x+o.y+o.w/2+o.h/2,draw:()=>object(o)}));items.push({depth:state.player.x+state.player.y,draw:player});items.sort((a,b)=>a.depth-b.depth).forEach(o=>o.draw());}pointMarkers();requestAnimationFrame(loop);}requestAnimationFrame(loop);
})();
