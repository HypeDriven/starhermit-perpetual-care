import { frame, onStart, onUpdate, onQuit, onSuspend, openMenu } from 'starhermit:engine';
import * as draw from 'starhermit:draw';
import { onAction, onGesture, pointer, setCursor } from 'starhermit:input';
import { storage } from 'starhermit:storage';
import { fresh, validSave, tick, income, operating, capacity, money, GOAL, DAY_LENGTH, admit, buy, policies, mode, rescue, discharge, chooseEvent } from './model.js';

const C={bg:'#f3f2ec',white:'#fcfcf8',ink:'#193d32',green:'#29674c',sage:'#e2e9dd',muted:'#758276',line:'#d9dfd3',orange:'#d97746',pale:'#f5e9d9',red:'#bc5146',dark:'#173b30',mint:'#b8d5b3'};
let state=fresh(),selected=3,paused=true,speed=1,tab='hospital',help=false,confirmReset=false;
let scale=1,W=1440,H=900,mobile=false,buttons=[],bedHits=[],hover=null,toast='',toastTime=0,clock=0,saveClock=0,zoom=1;
let mx=-1,my=-1,top=0,mapArea=null;
const amount=n=>money(n);
const smallMoney=n=>n>=1000?'$'+(n/1000).toFixed(1)+'k':money(n);
function save(){try{storage.setJson('perpetual-care-v1',state);}catch{}}
onStart(()=>{try{const s=storage.getJson('perpetual-care-v1');if(validSave(s)){state=s;selected=state.patients[0]?.id||1;}}catch{}});
onQuit(save);onSuspend(save);
function notice(text){toast=text;toastTime=3.5;}
function reset(){state=fresh();selected=3;paused=true;help=false;confirmReset=false;save();notice('New hospital. Same shareholders.');}
function patient(){return state.patients.find(p=>p.id===selected)||state.patients[0];}
function setMode(m){const p=patient();if(p){mode(state,p.id,m);notice(p.name+': '+({stabilize:'stabilization',observe:'observation',recover:'recovery care'})[m]+'.');}}
function selectNext(){const i=state.patients.findIndex(p=>p.id===selected);selected=state.patients[(i+1)%state.patients.length]?.id||0;}
function tap(x,y){
 x/=scale;y/=scale;
 for(let i=buttons.length-1;i>=0;i--){const b=buttons[i];if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){if(!b.disabled)b.fn();return;}}
 if(!help&&!state.event&&!state.ended&&!confirmReset){for(let i=bedHits.length-1;i>=0;i--){const b=bedHits[i];if(Math.abs(x-b.x)<b.w&&Math.abs(y-b.y)<b.h){selected=b.id;if(mobile)tab='patients';return;}}}
}
onGesture?.(e=>{if(e.type==='tap')tap(e.x,e.y);});
onAction(e=>{if(!e.pressed)return;if(e.action==='help'){help=!help;return;}if(help||confirmReset||state.event||state.ended)return;if(e.action==='pause')paused=!paused;if(e.action==='speed')speed=speed===1?2:speed===2?4:1;if(e.action==='next')selectNext();if(e.action==='treat')setMode('stabilize');if(e.action==='observe')setMode('observe');if(e.action==='recover')setMode('recover');});

// Every shape uses logical pixels; the same interface runs in the native runtime and on phones.
function rect(x,y,w,h,color,r=0){if(r)draw.roundRect(x*scale,y*scale,w*scale,h*scale,r*scale,color);else draw.rect(x*scale,y*scale,w*scale,h*scale,color);}
function stroke(x,y,w,h,color=C.line,r=0,lw=1){if(r)draw.strokeRoundRect(x*scale,y*scale,w*scale,h*scale,r*scale,color,lw*scale);else draw.strokeRect(x*scale,y*scale,w*scale,h*scale,color,lw*scale);}
function text(str,x,y,size=14,color=C.ink,weight=400,font='sans-serif',align='start'){draw.text(String(str),x*scale,y*scale,{size:size*scale,color,weight,font,align});}
function line(x1,y1,x2,y2,c=C.line,lw=1){draw.line(x1*scale,y1*scale,x2*scale,y2*scale,c,lw*scale);}
function circle(x,y,r,c){draw.circle(x*scale,y*scale,r*scale,c);}
function poly(points,c){draw.polygon(points.map(p=>[p[0]*scale,p[1]*scale]),c);}
function label(str,x,y,color=C.muted,size=11){text(str,x,y,size,color,600,'sans-serif');}
function button(str,x,y,w,h,fn,style='plain',disabled=false){
 const hot=mx>=x&&mx<=x+w&&my>=y&&my<=y+h;
 const fill=disabled?'#e6e7df':style==='primary'?C.green:style==='orange'?C.orange:style==='dark'?C.dark:style==='selected'?C.sage:hot?'#e8ecdf':C.white;
 rect(x,y,w,h,fill,6);if(style==='plain'||style==='selected')stroke(x,y,w,h,style==='selected'?C.green:C.line,6);
 const color=disabled?'#9b9f92':['primary','orange','dark'].includes(style)?'#ffffff':C.ink;
 text(str,x+w/2,y+(h-15)/2-1,14,color,600,'sans-serif','center');
 buttons.push({x,y,w,h,fn,disabled});
}
function bar(x,y,w,val,max,color,height=5){rect(x,y,w,height,C.line,height/2);rect(x,y,w*Math.max(0,Math.min(1,val/max)),height,color,height/2);}
function cross(x,y,size,color){rect(x-size*.15,y-size*.5,size*.3,size,color,1);rect(x-size*.5,y-size*.15,size,size*.3,color,1);}
function vitalColor(p){return p.health<30?C.red:p.health>80?C.orange:C.green;}
function wrap(str,x,y,maxWidth,size=14,color=C.muted,lineHeight=21){
 const words=str.split(' ');let current='',row=0;
 for(const word of words){const next=current?current+' '+word:word;if(draw.measureText(next,{size:size*scale,font:'sans-serif'}).width>maxWidth*scale&&current){text(current,x,y+row*lineHeight,size,color);row++;current=word;}else current=next;}
 if(current)text(current,x,y+row*lineHeight,size,color);return (row+1)*lineHeight;
}

function header(){
 rect(0,0,W,mobile?130:82,C.white);line(0,mobile?130:82,W,mobile?130:82);
 rect(26,22,38,38,C.green,10);cross(45,41,23,'#f5f3df');
 text('PERPETUAL',76,20,17,C.ink,700,'serif');text('C A R E',77,42,13,C.ink,400,'sans-serif');
 if(!mobile){line(235,24,235,58);text('HOSPITAL, INC.',255,26,11,C.muted,600);text('A portfolio company of Concern™',255,44,11,C.muted);}
 const nx=mobile?26:493,nw=mobile?(W-68)/3:106;
 ['Hospital','Patients','Corporate'].forEach((s,i)=>{const x=nx+i*(nw+8);const active=tab===s.toLowerCase();button(s,x,mobile?80:22,nw,38,()=>{tab=s.toLowerCase();},active?'selected':'plain');});
 button('?',W-65,22,38,38,()=>{help=true;});
 button('Options',W-163,22,90,38,openMenu);
}
function metrics(){
 const y=mobile?145:106, gap=mobile?12:20,margin=26,w=mobile?(W-64)/2:(W-margin*2-gap*3)/4;
 const metrics=[['CASH RESERVES',amount(state.cash),'Available for questionable investments',C.ink],['INSURANCE / DAY',smallMoney(income(state)*DAY_LENGTH),'Gross. Before the unfortunate expenses.',C.green],['BED OCCUPANCY',state.patients.length+' / '+capacity(state),'A vacant bed is a wasted opportunity.',C.ink],['AUDIT SCRUTINY',Math.round(state.scrutiny)+'%','Next review: day '+(state.day<3?'3':state.day<5?'5':state.day<7?'7':'7'),state.scrutiny>65?C.red:C.orange]];
 metrics.forEach((m,i)=>{const x=margin+(mobile?i%2:i)*(w+gap),yy=y+(mobile?Math.floor(i/2)*101:0),hh=mobile?89:103;rect(x,yy,w,hh,C.white,9);stroke(x,yy,w,hh,C.line,9);label(m[0],x+18,yy+13,C.muted,mobile?10:11);text(m[1],x+18,yy+35,mobile?27:32,m[3],500,'serif');if(!mobile)text(m[2],x+18,yy+80,11,C.muted);else if(i===3)bar(x+18,yy+73,w-36,state.scrutiny,100,C.orange,4);});
}
function toolbar(y,leftW){
 label(tab==='hospital'?'LIVE WARD OVERVIEW':tab==='patients'?'THE REVENUE ROSTER':'CORPORATE DEVELOPMENT',26,y+3,C.ink,12);
 text(tab==='hospital'?'Every bed has a lifetime value.':tab==='patients'?'Human beings. Recurring transactions.':mobile?'Compassion has terrible margins.':'Compassion is not a scalable business model.',26,y+25,mobile?11:13,C.muted);
 if(!mobile){button('−',leftW-230,y,32,30,()=>{zoom=Math.max(.75,zoom-.1);});button('+',leftW-191,y,32,30,()=>{zoom=Math.min(1.25,zoom+.1);});}
 button(paused?'▶ Resume':'Ⅱ Pause',leftW-145,y,117,35,()=>{paused=!paused;},paused?'orange':'plain');
}

// A procedural isometric hospital. Furniture, patients, and staff are all engine drawing primitives.
let iso={x:0,y:0,s:1};
function point(x,z,h=0){return [iso.x+(x-z)*iso.s,iso.y+(x+z)*iso.s*.5-h*iso.s];}
function face(points,color){poly(points.map(p=>point(p[0],p[1],p[2]||0)),color);}
function tile(x,z,w,d,c){face([[x,z],[x+w,z],[x+w,z+d],[x,z+d]],c);}
function box(x,z,w,d,h,top,left,right){
 face([[x,z+d],[x+w,z+d],[x+w,z+d,h],[x,z+d,h]],left);
 face([[x+w,z],[x+w,z+d],[x+w,z+d,h],[x+w,z,h]],right);
 face([[x,z,h],[x+w,z,h],[x+w,z+d,h],[x,z+d,h]],top);
}
function isoLine(x,z,x2,z2,h,c,lw=1){const a=point(x,z,h),b=point(x2,z2,h);line(a[0],a[1],b[0],b[1],c,lw);}
function person(x,z,color,phase,lying=false){
 if(lying){box(x,z,10,18,8,color,'#97b5a3','#789f8b');const p=point(x+5,z-1,10);circle(p[0],p[1],4.5*iso.s,'#d5a883');return;}
 const p=point(x,z,0);draw.ellipse(p[0]*scale,(p[1]+2)*scale,7*iso.s*scale,3*iso.s*scale,'#566d4728');
 const step=Math.sin(phase)*2;isoLine(x-2,z,x-2+step,z,0,'#344f49',2.6*iso.s);const a=point(x-2,z,0),b=point(x-2,z,9);line(a[0],a[1],b[0],b[1],'#3b554f',2.5*iso.s);
 const c=point(x+2,z,0),d=point(x+2,z,9);line(c[0]+step,c[1],d[0],d[1],'#3b554f',2.5*iso.s);
 box(x-4,z-3,8,6,17,color,color,'#7c9e92');const head=point(x,z,23);circle(head[0],head[1],4.6*iso.s,'#d3a17d');const hair=point(x,z,25.5);draw.ellipse(hair[0]*scale,hair[1]*scale,4.6*iso.s*scale,2.3*iso.s*scale,'#48524b');
}
function plant(x,z){box(x,z,10,10,10,'#d5a27d','#bc825f','#a66d52');const p=point(x+5,z+5,17);circle(p[0],p[1],8*iso.s,'#5c865a');circle(p[0]-4*iso.s,p[1]-6*iso.s,5*iso.s,'#729765');circle(p[0]+5*iso.s,p[1]-5*iso.s,5.5*iso.s,'#456f4d');}
function monitor(x,z,p){
 box(x,z,2,10,22,'#c4d0c7','#a7b5a9','#8c9f93');box(x-1,z-1,3,13,30,'#c4d0c7','#b0bbb2','#6f8b7c');
 const a=point(x+3,z,28),b=point(x+3,z+11,28),c=point(x+3,z+11,19),d=point(x+3,z,19);poly([a,b,c,d],'#214b42');
 const wave=[0,.15,.22,.36,.42,.49,.57,.65,.76,1];for(let i=1;i<wave.length;i++){const z1=z+wave[i-1]*10,z2=z+wave[i]*10;const h1=23+([0,0,-1,0,4,-3,0,0,0,0][i-1]),h2=23+([0,0,-1,0,4,-3,0,0,0,0][i]);const q=point(x+3,z1,h1),r=point(x+3,z2,h2);line(q[0],q[1],r[0],r[1],p?vitalColor(p):'#839e8b',.9*iso.s);}
}
function bed(x,z,p,index){
 if(p&&p.id===selected){tile(x-7,z-7,39,56,'#c7dbb0');isoLine(x-7,z-7,x+32,z-7,0,C.green,2);isoLine(x-7,z-7,x-7,z+49,0,C.green,2);}
 const shadow=point(x+14,z+21);draw.ellipse(shadow[0]*scale,shadow[1]*scale,24*iso.s*scale,10*iso.s*scale,'#80907820');
 for(const dx of [2,21])for(const dz of [4,35])box(x+dx,z+dz,2,2,6,'#9aa9a2','#8b9e92','#71877c');
 box(x,z,25,42,9,'#c1cec6','#afc1b4','#92aa9a');box(x-1,z-1,27,2,18,'#b9cdc4','#b0c3b9','#9bb5a5');box(x-1,z+40,27,2,14,'#b9cdc4','#afc3b5','#90a99b');
 box(x+1,z+3,23,35,11,'#fcfaf1','#d5dfd4','#bacdc0');box(x+4,z+4,16,9,13,'#fffcf4','#e4e8d9','#c8d6c7');
 if(p){person(x+8,z+14,'#afc4dc',clock*2,true);box(x+2,z+22,21,15,14,p.id===selected?'#78a38f':'#93b6a5','#739d8c','#5e907c');}
 monitor(x+31,z+1,p);box(x-13,z+4,10,11,14,'#d3b797','#ba9c7c','#a98b71');
 const q=point(x+12,z+20,48);
 if(p){const color=vitalColor(p);rect(q[0]-22,q[1]-9,44,25,C.white,5);circle(q[0]-13,q[1]+3,2.8,color);text(Math.round(p.health)+'%',q[0]-5,q[1]-4,10,color,700,'monospace');bar(q[0]-19,q[1]+11,38,p.health,100,color,2);bedHits.push({x:point(x+12,z+18)[0],y:point(x+12,z+18)[1]-20*iso.s,w:35*iso.s,h:44*iso.s,id:p.id});}
 else {text('VACANT',q[0],q[1]+5,8,'#83917f',500,'sans-serif','center');}
 const n=point(x+13,z+48);text(String(index+1).padStart(2,'0'),n[0],n[1],9,'#849282',600,'monospace','center');
}
function hospital(x,y,w,h){
 mapArea={x,y,w,h};rect(x,y,w,h,'#e8ecdf',10);stroke(x,y,w,h,'#e0e5d7',10);
 // The plotting grid makes the campus feel like a live operating plan.
 for(let a=x+20;a<x+w;a+=27)for(let b=y+19;b<y+h;b+=27)circle(a,b,.7,'#c7d0c0');
 label('ST. MARGIN MEMORIAL',x+22,y+21,C.green,11);text('EST. THIS FISCAL YEAR',x+22,y+39,9,C.muted,500,'monospace');
 rect(x+w-126,y+17,106,29,'#f9fbf1',15);circle(x+w-111,y+31,3,paused?C.orange:C.green);text(paused?'SHIFT PAUSED':'LIVE OPERATIONS',x+w-101,y+25,9,C.ink,600);
 const rw=350,rd=240;iso.s=Math.min((w-72)/(rw+rd),(h-104)/((rw+rd)*.5+85))*zoom;iso.x=x+w*.5-(rw-rd)*iso.s*.5;iso.y=y+h*.47-80*iso.s;
 const shadow=point(170,135,-16);draw.ellipse(shadow[0]*scale,shadow[1]*scale,275*iso.s*scale,102*iso.s*scale,'#4e6b3b12');
 box(-6,-6,rw+12,rd+12,0,'#c1cbb6','#adbda4','#a8b89e');
 // Tiled foundation and three differently zoned rooms around a central corridor.
 for(let z=0;z<rd;z+=20)for(let a=0;a<rw;a+=20){const ward=z<100?'#e2e9dd':z>=150?'#f0e5ce':'#d1dbce';tile(a,z,Math.min(20,rw-a),20,((a/20+z/20)%2===0)?ward:(z<100?'#e9eee2':z>=150?'#f6ebd6':'#d9e2d6'));}
 // Back walls are low cutaways, with glass panels and a long clerestory.
 box(-4,-4,rw+8,4,42,'#f8faf1','#d6dfd0','#b2c7b5');box(-4,0,4,rd,42,'#f7f8ec','#d6dfce','#b4c6b2');
 for(let a=22;a<rw-15;a+=46){face([[a,-.1,15],[a+30,-.1,15],[a+30,-.1,34],[a,-.1,34]],'#a3c6bd');const p=point(a+15,0,15),q=point(a+15,0,34);line(p[0],p[1],q[0],q[1],'#eff4e8',1.5*iso.s);}
 for(let z=20;z<rd-10;z+=48){face([[.1,z,14],[.1,z+27,14],[.1,z+27,34],[.1,z,34]],'#a3c6bd');}
 // Room separators, doors, and wall signs.
 box(0,101,119,3,21,'#fbfaf0','#d7e0ce','#becfb8');box(151,101,199,3,21,'#fbfaf0','#d7e0ce','#becfb8');
 box(0,147,119,3,17,'#fcfaf0','#d9deca','#bdcdb3');box(151,147,199,3,17,'#fcfaf0','#d9deca','#bdcdb3');
 box(173,0,3,101,17,'#f6f7e9','#d2ddc8','#b7cbb2');box(173,150,3,90,17,'#f6f0df','#dbd7c0','#bfccab');
 const positions=[[30,34],[107,34],[207,34],[284,34],[30,175],[107,175],[207,175],[284,175]];
 if(state.levels.ward){positions.push([37,110],[108,110],[215,110],[286,110]);}
 positions.forEach(([a,z],i)=>bed(a,z,state.patients[i],i));
 // Nurse station: telephones, terminals, forms, and a very prominent money plant.
 if(!state.levels.ward){box(223,112,65,19,18,'#d5b38a','#b69672','#9d7c5e');box(220,110,71,23,20,'#f2ecdc','#d0d7c7','#b4c6b2');box(247,114,17,4,31,'#6f8c7c','#446b58','#345c4d');box(274,117,10,7,22,'#fcfcf3','#d0d8cd','#bdcdbc');person(262,137,'#fbfbf5',clock*2);}
 plant(8,8);plant(160,8);plant(330,8);plant(6,222);plant(326,223);
 box(7,112,27,10,9,'#a4c4b0','#719d82','#58886f');box(7,112,27,3,21,'#a4c4b0','#719d82','#58886f');
 if(!state.levels.ward){for(let i=0;i<2+state.levels.nurse;i++){const t=clock*.3+i*1.7;const a=85+Math.sin(t)*79,z=125+Math.cos(t*.8)*5;person(a,z,i%2?'#fbfaf2':'#83b2a5',clock*6+i);}}
 const nameA=point(80,13,42),nameB=point(253,13,42);text('OBSERVATION A',nameA[0],nameA[1],9,C.green,700,'sans-serif','center');text('PREMIUM CARE B',nameB[0],nameB[1],9,C.green,700,'sans-serif','center');
 if(!paused){const p=point(185,245,2);const lift=(clock%2.8)*12;text('+'+smallMoney(income(state)*.4),p[0],p[1]-lift,13,C.green,700,'monospace','center');}
 // Map legend and interaction hint.
 const ly=y+h-33;circle(x+24,ly+6,3,C.green);text('35–75%  BILLABLE SWEET SPOT',x+35,ly,9,C.green,600);if(!mobile){circle(x+246,ly+6,3,C.red);text('CRITICAL',x+257,ly,9,C.red,600);}text(mobile?'TAP A BED':'CLICK A BED TO MANAGE',x+w-21,ly,9,C.muted,600,'sans-serif','end');
}

function board(x,y,w){
 rect(x,y,w,127,C.dark,10);label('A NOTE FROM THE BOARD',x+20,y+17,'#9ec3a5',10);text('Alive. Admitted. Profitable.',x+20,y+38,21,'#f6f4e2',500,'serif');
 text('Bill '+amount(GOAL)+' by the end of day 7.',x+20,y+70,12,'#c3d2bd');bar(x+20,y+99,w-40,state.revenue,GOAL,'#a7c58c',4);text(Math.round(state.revenue/GOAL*100)+'%',x+w-20,y+78,10,'#bed4ae',500,'monospace','end');
}
function patientPanel(x,y,w){
 const p=patient();rect(x,y,w,385,C.white,10);stroke(x,y,w,385,C.line,10);label('PATIENT LIFETIME VALUE',x+20,y+18,C.muted,10);
 if(!p){text('No subscriptions active.',x+20,y+54,21,C.ink,500,'serif');wrap('Admit a patient from the waiting room. Empty beds have a tragic prognosis.',x+20,y+94,w-40);return;}
 const color=vitalColor(p);text(p.name,x+20,y+42,25,C.ink,500,'serif');text(p.ailment,x+20,y+77,12,C.muted);rect(x+20,y+102,70,22,p.plan==='PLATINUM'?'#ede9da':C.sage,4);text(p.plan,x+55,y+108,9,C.green,700,'monospace','center');text(smallMoney(p.rate*DAY_LENGTH)+'/day',x+w-20,y+104,13,C.green,600,'monospace','end');
 label('VITALITY',x+20,y+145,C.muted,10);text(Math.round(p.health)+'%',x+w-20,y+139,24,color,500,'serif','end');
 const bx=x+20,by=y+176,bw=w-40;rect(bx,by,bw,10,'#e8e8de',5);rect(bx+bw*.35,by,bw*.4,10,'#b9cfad',2);circle(bx+bw*p.health/100,by+5,7,color);circle(bx+bw*p.health/100,by+5,3,C.white);
 text('DEAD',bx,by+17,8,C.muted,500,'monospace');text('BILLABLE',bx+bw*.55,by+17,8,C.green,600,'monospace','center');text('DISCHARGED',bx+bw,by+17,8,C.muted,500,'monospace','end');
 const sign=p.mode==='observe'?'↓': '↑';text(p.health<30?'Critical. A dead patient cannot renew.':p.health<35?'Below the bonus range. Stabilize to 35%.':p.health>82?'Recovery risk. They may leave soon.':'Stable enough to bill. Sick enough to stay.',x+20,y+218,11,color,500);
 const bw3=(w-48)/3;
 ['Stabilize','Observe','Recover'].forEach((s,i)=>button(s,x+16+i*(bw3+8),y+246,bw3,40,()=>{setMode(['stabilize','observe','recover'][i]);},p.mode===['stabilize','observe','recover'][i]?'selected':'plain'));
 text(sign+' '+(p.mode==='observe'?'Vitality falls slowly. Zero treatment cost.':p.mode==='stabilize'?'Vitality rises slowly. Watch for recovery.':'Fast recovery. Costs $23 / second.'),x+20,y+298,10,C.muted);
 button(p.cooldown>0?'Intervention · '+Math.ceil(p.cooldown)+'s':'Intervene +24 · $1,200',x+16,y+325,w-32,42,()=>{if(rescue(state,p.id))notice('Vitality +24. Invoice delivered separately.');},'primary',p.cooldown>0||state.cash<1200);
}
function admissionPanel(x,y,w){
 rect(x,y,w,117,C.white,9);stroke(x,y,w,117,C.line,9);label('WAITING ROOM',x+18,y+15,C.muted,10);text(state.queue.length+' prospective revenue streams',x+18,y+37,13,C.ink,500);
 button(state.patients.length>=capacity(state)?'All beds occupied':'Admit next patient  +',x+16,y+66,w-32,36,()=>{if(admit(state)){selected=state.patients[state.patients.length-1].id;notice('Patient admitted. Welcome to the portfolio.');}},'plain',!state.queue.length||state.patients.length>=capacity(state));
}
function roster(x,y,w,h){
 rect(x,y,w,h,C.white,10);stroke(x,y,w,h,C.line,10);label('PATIENT',x+22,y+19);label('VITALITY',x+w*.41,y+19);label('CARE PLAN',x+w*.59,y+19);label('TOTAL BILLED',x+w-145,y+19);
 state.patients.forEach((p,i)=>{const yy=y+48+i*46;if(yy+43>y+h)return;const active=selected===p.id;rect(x+10,yy,w-20,42,active?C.sage:i%2===0?'#f8f9f2':C.white,5);circle(x+26,yy+20,4,vitalColor(p));text(p.name,x+40,yy+8,13,C.ink,600);text(p.plan,x+40,yy+26,8,C.muted,500,'monospace');text(Math.round(p.health)+'%',x+w*.41,yy+12,15,vitalColor(p),600,'monospace');text(p.mode,x+w*.59,yy+13,12,C.muted);text(amount(p.billed),x+w-24,yy+12,14,C.green,500,'monospace','end');buttons.push({x:x+10,y:yy,w:w-20,h:42,fn:()=>{selected=p.id;}});});
 if(!state.patients.length)text('The beds are empty. The shareholders are uneasy.',x+24,y+70,15,C.muted);
}
function corporate(x,y,w,h){
 rect(x,y,w,h,'#e8ecdf',10);const gap=16,cw=(w-48)/2;
 policies.forEach((p,i)=>{const xx=x+16+(i%2)*(cw+16),yy=y+16+Math.floor(i/2)*137;const level=state.levels[p.id],cost=p.cost*(1+level*.6),full=level>=p.max;rect(xx,yy,cw,123,C.white,8);text(p.title,xx+16,yy+14,17,C.ink,500,'serif');text(p.subtitle,xx+16,yy+40,11,C.muted);label(['coding','retention'].includes(p.id)?'PROFIT +  /  SCRUTINY +':p.id==='nurse'?'VITALITY +  /  OVERHEAD +':p.id==='ward'?'CAPACITY +4  /  OVERHEAD +':'AUDIT RISK −  /  OVERHEAD +',xx+16,yy+60,C.green,8);button(full?'Fully invested':amount(cost)+'  →',xx+16,yy+81,cw-32,30,()=>{if(buy(state,p.id))notice(p.title+' approved.');},full?'selected':'plain',full||state.cash<cost);});
}
function ledger(x,y,w,h){
 rect(x,y,w,h,C.white,9);stroke(x,y,w,h,C.line,9);label('INTERNAL CORRESPONDENCE',x+18,y+16,C.muted,10);text('CONFIDENTIAL · FOR INVESTORS ONLY',x+w-18,y+16,9,C.muted,500,'monospace','end');
 state.log.slice(0,3).forEach((l,i)=>{const yy=y+44+i*32;if(yy+24>y+h)return;circle(x+22,yy+7,2.5,l.kind==='bad'?C.red:l.kind==='good'?C.green:C.orange);text(l.title.toUpperCase(),x+34,yy,9,l.kind==='bad'?C.red:C.green,700);const max=w-211;text(l.text.length>Math.floor(max/5.8)?l.text.slice(0,Math.floor(max/5.8)-1)+'…':l.text,x+184,yy-1,11,C.muted);});
}
function footer(y){
 line(26,y,W-26,y);text('“Your recovery is our recurring revenue.”',26,y+(mobile?8:16),mobile?12:13,C.green,400,'serif');
 text('DAY '+state.day+' / 7',mobile?26:W-335,y+(mobile?30:17),11,C.ink,600,'monospace');const hours=8+Math.floor((state.elapsed%DAY_LENGTH)/DAY_LENGTH*16);text(String(hours).padStart(2,'0')+':'+String(Math.floor((state.elapsed%DAY_LENGTH)/DAY_LENGTH*16*60)%60).padStart(2,'0'),mobile?W-107:W-237,y+(mobile?30:17),11,C.muted,500,'monospace');
 if(!mobile){[1,2,4].forEach((n,i)=>button(n+'×',W-163+i*43,y+8,36,31,()=>{speed=n;},speed===n?'selected':'plain'));}
}
function modalBase(title,eyebrow,h=400,w=570){
 w=Math.min(w,W-40);rect(0,0,W,H,'#102e25bb');const x=(W-w)/2,y=Math.max(80,(H-h)/2);rect(x+7,y+9,w,h,'#06251922',14);rect(x,y,w,h,C.white,13);label(eyebrow,x+30,y+27,C.orange,mobile?8:10);wrap(title,x+30,y+56,w-60,mobile?23:29,C.ink,30);return {x,y,w,h};
}
function overlays(){
 if(help){buttons=[];const {x,y,w}=modalBase('The business of staying sick.','EXECUTIVE ONBOARDING',566,610);
  const rows=[['01','Keep them alive.','Vitality at 0 means death, a $6,000 settlement, and scrutiny. Three deaths end your tenure.'],['02','Keep them billable.','Vitality from 35–75 earns a 30% insurance bonus. Stabilize raises it; Observe lets it drift down.'],['03','Watch the exits.','Above 88 vitality, patients soon recover and leave. Recover care is fast, expensive, and occasionally useful.'],['04','Manage the optics.','Coding boosts billing and scrutiny. Nurses slow decline. Compliance softens audits on days 3, 5, and 7.']];
  rows.forEach((r,i)=>{const yy=y+111+i*83;circle(x+43,yy+15,15,C.sage);text(r[0],x+43,yy+9,10,C.green,600,'monospace','center');text(r[1],x+73,yy-2,17,C.ink,500,'serif');wrap(r[2],x+73,yy+23,w-107,12,C.muted,18);});
  text('Space: pause   ·   1 / 2 / 3: care plan   ·   Tab: next patient   ·   F: speed',x+30,y+460,11,C.muted);button('I understand the business model  →',x+30,y+495,w-60,43,()=>{help=false;},'primary');
 }
 else if(confirmReset){buttons=[];const {x,y,w}=modalBase('Liquidate this hospital?','NEW MANAGEMENT',260,530);wrap('This resets the current seven-day run. Your existing patients, upgrades, and spectacular invoices will be lost.',x+30,y+105,w-60,14,C.muted);button('Keep the hospital',x+30,y+185,220,43,()=>{confirmReset=false;});button('Start a new run',x+266,y+185,w-296,43,reset,'orange');}
 else if(state.event){buttons=[];const e=state.event,{x,y,w}=modalBase(e.title,'AN OPPORTUNITY HAS PRESENTED ITSELF',350,650);wrap(e.body,x+30,y+110,w-60,15,C.muted,23);button(e.a,x+30,y+219,w-60,43,()=>{chooseEvent(state,0);save();},'primary');button(e.b,x+30,y+275,w-60,43,()=>{chooseEvent(state,1);save();});}
 else if(state.ended){buttons=[];const e=state.ended,{x,y,w}=modalBase(e.title,e.win?'QUARTERLY EARNINGS CALL':'AN UNSCHEDULED BOARD MEETING',400,630);wrap(e.body,x+30,y+114,w-60,15,C.muted,23);text(amount(state.revenue),x+30,y+205,40,C.green,500,'serif');label('LIFETIME BILLING',x+30,y+253);text(state.deaths+' deaths  ·  '+state.discharges+' discharges  ·  '+state.audits+' audits',x+30,y+280,13,C.muted);button('Accept a new management position  →',x+30,y+328,w-60,43,reset,'primary');}
}
onUpdate(dt=>{
 const f=frame();if(f.width<=0||f.height<=0)return;
 clock+=dt;toastTime=Math.max(0,toastTime-dt);saveClock+=dt;
 if(f.focused&&!f.overlayOpen&&!paused&&!help&&!confirmReset&&!state.ended&&!state.event){tick(state,Math.min(dt,.12)*speed);}
 if(saveClock>6){save();saveClock=0;}
 mobile=f.width/f.height<1.25;scale=Math.min(f.width/(mobile?480:1440),f.height/(mobile?1000:1000));W=f.width/scale;H=f.height/scale;top=mobile?363:236;
 const p=pointer();mx=p?p.x/scale:-1;my=p?p.y/scale:-1;buttons=[];bedHits=[];rect(0,0,W,H,C.bg);header();metrics();
 if(!mobile){
  const leftW=W-390,rightX=W-363,rightW=337;toolbar(top,leftW);const yy=top+65,hh=H-yy-220;
  if(tab==='hospital')hospital(26,yy,leftW-52,hh);else if(tab==='patients')roster(26,yy,leftW-52,hh);else corporate(26,yy,leftW-52,hh);
  ledger(26,H-201,leftW-52,132);board(rightX,top,rightW);patientPanel(rightX,top+143,rightW);admissionPanel(rightX,top+544,rightW);
  footer(H-51);
 }else{
  toolbar(top,W);const yy=top+63,hh=H-yy-173;
  if(tab==='hospital'){
   hospital(26,yy,W-52,hh);
   button('Stabilize all',26,yy+hh+14,(W-64)/2,38,()=>{state.patients.forEach(p=>mode(state,p.id,'stabilize'));notice('Stabilization ordered. Watch their recovery.');});
   button('Admit patient +',38+(W-64)/2,yy+hh+14,(W-64)/2,38,()=>{if(admit(state))notice('Admitted to the revenue ecosystem.');},'primary',!state.queue.length||state.patients.length>=capacity(state));
  }else if(tab==='patients'){
   patientPanel(26,yy,W-52);button('← Previous',26,yy+399,(W-64)/2,38,()=>{const i=state.patients.findIndex(p=>p.id===selected);selected=state.patients[(i-1+state.patients.length)%state.patients.length]?.id||0;});button('Next patient →',38+(W-64)/2,yy+399,(W-64)/2,38,selectNext);
  }else corporate(26,yy,W-52,Math.max(430,hh));
  text('DAY '+state.day+' OF 7 · BILLED '+smallMoney(state.revenue)+' / '+smallMoney(GOAL),26,H-110,11,C.green,600,'monospace');footer(H-51);
 }
 if(!mobile){text('SPACE to pause  ·  1 / 2 / 3 to change care',26,top+47,10,C.muted);}
 // Management actions are always available below the main floor.
 if(!mobile&&tab==='hospital'){const leftW=W-390;button('Stabilize all',leftW-500,top,118,35,()=>{state.patients.forEach(p=>mode(state,p.id,'stabilize'));notice('Stabilization ordered across the ward.');});button('Observe all',leftW-374,top,113,35,()=>{state.patients.forEach(p=>mode(state,p.id,'observe'));notice('Observation ordered across the ward.');});}
 button('New run',mobile?26:W-363,H-92,90,29,()=>{confirmReset=true;});
 const pp=patient();if(pp)button('Discharge patient',mobile?128:W-261,H-92,mobile?W-154:235,29,()=>{discharge(state,pp.id);selected=state.patients[0]?.id||0;notice('Discharged. Scrutiny adjusted.');},'plain');
 overlays();
 if(toastTime>0&&!state.event&&!state.ended&&!help&&!confirmReset){const tw=Math.min(W-60,520);rect((W-tw)/2,H-110,tw,40,C.dark,7);text(toast,W/2,H-98,12,'#f8f8e9',500,'sans-serif','center');}
 hover=buttons.find(b=>!b.disabled&&mx>=b.x&&mx<=b.x+b.w&&my>=b.y&&my<=b.y+b.h);setCursor(hover?'pointer':'default');
});
