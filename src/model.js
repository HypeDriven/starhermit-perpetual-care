// Pure construction, navigation, staffing, treatment and finance simulation.
export const WIDTH=28, DEPTH=22, DAY_LENGTH=180, ENTRY={x:13,z:20};
import { ROOM_TYPES, EQUIPMENT, STAFF_TYPES, CONDITIONS } from './catalogue.js';
export { ROOM_TYPES, EQUIPMENT, STAFF_TYPES, CONDITIONS } from './catalogue.js';
import * as management from './management.js';
export * from './management.js';
const FIRST=['Robin','Sam','Jules','Casey','Alex','Noor','Jamie','Drew','Ari','Morgan','Lee','Billie','Elliot','Ash','Pip','Frankie'];
const LAST=['Wells','Okafor','Chen','Patel','Moss','Bell','Flores','Stone','Reed','Brooks','Finch','Park'];
const key=(x,z)=>z*WIDTH+x, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z), integer=Number.isInteger;
const fail=error=>({ok:false,error}), DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
const navigationCache=new WeakMap();
function navigation(s){
 let n=navigationCache.get(s);if(n&&n.revision===s.revision)return n;
 n={revision:s.revision,rooms:new Array(WIDTH*DEPTH).fill(null),blocked:new Uint8Array(WIDTH*DEPTH),connected:new Map()};
 for(const r of s.rooms)for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)n.rooms[key(x,z)]=r;
 for(const i of s.items){const f=footprint(i.type,i.rotation);for(let z=i.z;z<i.z+f.h;z++)for(let x=i.x;x<i.x+f.w;x++)n.blocked[key(x,z)]=1;}
 navigationCache.set(s,n);return n;
}
export const money=n=>'$'+Math.round(n).toLocaleString('en-US');
export const within=(x,z)=>integer(x)&&integer(z)&&x>=1&&z>=1&&x<WIDTH-1&&z<DEPTH-1;
export function roomAt(s,x,z){return s.rooms.find(r=>x>=r.x&&z>=r.z&&x<r.x+r.w&&z<r.z+r.h)||null;}
export function footprint(type,rotation=0){const e=EQUIPMENT[type];return rotation%2?{w:e.h,h:e.w}:{w:e.w,h:e.h};}
export function itemAt(s,x,z){return s.items.find(i=>{const f=footprint(i.type,i.rotation);return x>=i.x&&z>=i.z&&x<i.x+f.w&&z<i.z+f.h;})||null;}
export const roomItems=(s,r)=>s.items.filter(i=>i.room===r.id);
export function log(s,title,text,kind='info'){s.log.unshift({title,text,kind,time:s.time});s.log.length=Math.min(s.log.length,40);}
function spend(s,n){s.cash-=n;s.spent+=n;}
function earn(s,n){s.cash+=n;s.earned+=n;}
export function fresh(seed=73){return management.initializeDepth({version:2,seed:seed>>>0,cash:65000,earned:0,spent:0,time:0,day:1,rooms:[],items:[],staff:[],patients:[],nextId:1,cured:0,lost:0,deaths:0,reputation:50,arrival:8,dispatch:0,revision:0,log:[{title:'A fresh start',text:'Build something people can get better in.',kind:'good',time:0}],loan:0,won:false,ended:null,cleanliness:100,open:false,history:[],lastReport:null});}
export function restoreSave(value){return validSave(value)?management.initializeDepth(JSON.parse(JSON.stringify(value))):null;}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function doorOutside(r){const d=r.door;return {x:d.x+(d.side==='east'?1:d.side==='west'?-1:0),z:d.z+(d.side==='south'?1:d.side==='north'?-1:0)};}
function sameDoor(a,b,r){const d=r.door,o=doorOutside(r);return(a.x===d.x&&a.z===d.z&&b.x===o.x&&b.z===o.z)||(b.x===d.x&&b.z===d.z&&a.x===o.x&&a.z===o.z);}
export function canStep(s,a,b,ignoreItems=false){
 if(!within(b.x,b.z))return false;const n=navigation(s);
 if(!ignoreItems&&n.blocked[key(b.x,b.z)])return false;
 const ar=n.rooms[key(a.x,a.z)],br=n.rooms[key(b.x,b.z)];
 if(ar?.id!==br?.id){if(ar&&!sameDoor(a,b,ar))return false;if(br&&!sameDoor(a,b,br))return false;}
 return true;
}
export function pathfind(s,start,end,ignoreItems=false){
 const from={x:Math.floor(start.x),z:Math.floor(start.z)},to={x:Math.floor(end.x),z:Math.floor(end.z)};
 if(!within(from.x,from.z)||!within(to.x,to.z))return null;
 if(from.x===to.x&&from.z===to.z)return [];
 const queue=[from],prev=new Map([[key(from.x,from.z),null]]);
 for(let n=0;n<queue.length;n++)for(const [dx,dz]of DIRS){
  const a=queue[n],b={x:a.x+dx,z:a.z+dz},k=key(b.x,b.z);
  if(prev.has(k)||!canStep(s,a,b,ignoreItems))continue;prev.set(k,a);
  if(b.x===to.x&&b.z===to.z){const path=[b];let p=a;while(p.x!==from.x||p.z!==from.z){path.push(p);p=prev.get(key(p.x,p.z));}return path.reverse();}queue.push(b);
 }
 return null;
}
export function roomCost(type,w,h){const r=ROOM_TYPES[type];return r.base+w*h*r.tile;}
function chooseDoor(s,r){
 const candidates=[];
 for(let x=r.x+1;x<r.x+r.w-1;x++)candidates.push({x,z:r.z,side:'north'},{x,z:r.z+r.h-1,side:'south'});
 for(let z=r.z+1;z<r.z+r.h-1;z++)candidates.push({x:r.x,z,side:'west'},{x:r.x+r.w-1,z,side:'east'});
 candidates.sort((a,b)=>Math.abs(a.x-13.5)*3+Math.abs(a.z-18)-Math.abs(b.x-13.5)*3-Math.abs(b.z-18));
 for(const d of candidates){const o=doorOutside({...r,door:d});if(within(o.x,o.z)&&!roomAt(s,o.x,o.z)&&!itemAt(s,o.x,o.z)&&pathfind(s,ENTRY,o))return d;}return null;
}
export function canBuild(s,type,x,z,w,h){
 const t=ROOM_TYPES[type];if(!t||![x,z,w,h].every(integer))return fail('Choose a room and draw its footprint.');
 if(s.ended)return fail('This hospital has closed.');
 if(s.rooms.length>=50)return fail('The hospital has reached its 50-room limit.');
 if(s.cured<(t.unlock||0))return fail('Cure '+t.unlock+' patients to unlock this room.');
 if(w<t.min||h<t.min)return fail('Minimum room size: '+t.min+' × '+t.min+'.');
 if(w>10||h>10)return fail('Rooms may be at most 10 × 10 tiles.');
 if(!within(x,z)||!within(x+w-1,z+h-1))return fail('Keep the room inside the hospital floor.');
 for(let zz=z;zz<z+h;zz++)for(let xx=x;xx<x+w;xx++){
  if(xx>=12&&xx<=15)return fail('Keep the central entrance corridor clear.');
  if(roomAt(s,xx,zz)||itemAt(s,xx,zz))return fail('That space is already occupied.');
  if([...s.patients,...s.staff].some(p=>Math.floor(p.x)===xx&&Math.floor(p.z)===zz))return fail('Someone is standing in the construction area.');
 }
 const cost=roomCost(type,w,h);if(s.cash<cost)return fail('Not enough cash: '+money(cost)+' needed.');
 const room={id:-1,type,x,z,w,h};room.door=chooseDoor(s,room);if(!room.door)return fail('The room needs a door onto a connected corridor.');
 const temp={...s,rooms:[...s.rooms,room]};if(s.rooms.some(r=>!pathfind(temp,ENTRY,doorOutside(r))))return fail('This would block another room.');
 return {ok:true,cost,door:room.door};
}
export function buildRoom(s,type,x,z,w,h){
 const c=canBuild(s,type,x,z,w,h);if(!c.ok)return c;
 const room={id:s.nextId++,type,x,z,w,h,door:c.door,staff:null,condition:100,completed:0,level:0,closed:false,upgrading:0};spend(s,c.cost);s.rooms.push(room);s.revision++;
 log(s,ROOM_TYPES[type].name+' built','Place the required equipment inside.','good');return {ok:true,room};
}
export function interiorAccessible(s,r){
 const reached=new Set(),q=[r.door];
 for(let i=0;i<q.length;i++){const a=q[i],k=key(a.x,a.z);if(reached.has(k)||itemAt(s,a.x,a.z))continue;reached.add(k);
  for(const[dx,dz]of DIRS){const b={x:a.x+dx,z:a.z+dz};if(roomAt(s,b.x,b.z)?.id===r.id&&!reached.has(key(b.x,b.z)))q.push(b);}}
 if(reached.size<2)return false;
 return roomItems(s,r).every(i=>{const f=footprint(i.type,i.rotation);for(let z=i.z;z<i.z+f.h;z++)for(let x=i.x;x<i.x+f.w;x++)for(const[dx,dz]of DIRS)if(reached.has(key(x+dx,z+dz)))return true;return false;});
}
export function moveDoor(s,id,x,z){
 const r=s.rooms.find(r=>r.id===id);if(!r)return fail('Choose a room first.');let side=null;
 if(x===r.x&&z>r.z&&z<r.z+r.h-1)side='west';else if(x===r.x+r.w-1&&z>r.z&&z<r.z+r.h-1)side='east';else if(z===r.z&&x>r.x&&x<r.x+r.w-1)side='north';else if(z===r.z+r.h-1&&x>r.x&&x<r.x+r.w-1)side='south';
 if(!side)return fail('Choose a wall tile away from the corners.');
 const d={x,z,side},o=doorOutside({...r,door:d});if(itemAt(s,x,z)||itemAt(s,o.x,o.z)||roomAt(s,o.x,o.z)||!pathfind(s,ENTRY,o))return fail('The door needs clear floor on both sides.');
 const old=r.door;r.door=d;if(!interiorAccessible(s,r)){r.door=old;return fail('The equipment would block the new doorway.');}s.revision++;return {ok:true};
}
export function canPlace(s,type,x,z,rotation=0){
 const e=EQUIPMENT[type];if(!e||!integer(x)||!integer(z))return fail('Point at an empty floor tile.');
 if(s.items.length>=350)return fail('The furnishing limit is 350 objects.');
 const f=footprint(type,rotation),r=roomAt(s,x,z);if(s.cash<e.cost)return fail('Not enough cash: '+money(e.cost)+' needed.');
 if(e.corridor&&r)return fail('Place this in a corridor.');if(e.rooms&&!e.rooms.includes(r?.type))return fail('Place this inside '+e.rooms.map(t=>ROOM_TYPES[t].name).join(' or ')+'.');
 for(let zz=z;zz<z+f.h;zz++)for(let xx=x;xx<x+f.w;xx++){
  if(!within(xx,zz)||roomAt(s,xx,zz)?.id!==r?.id||itemAt(s,xx,zz))return fail('The whole object needs empty floor.');
  if((r&&r.door.x===xx&&r.door.z===zz)||s.rooms.some(rr=>{const o=doorOutside(rr);return o.x===xx&&o.z===zz;}))return fail('Keep the doorway clear.');
  if(!r&&xx>=12&&xx<=15)return fail('Keep the central entrance corridor clear.');
  if([...s.patients,...s.staff].some(p=>Math.floor(p.x)===xx&&Math.floor(p.z)===zz))return fail('Someone is standing there.');
 }
 const temp={...s,items:[...s.items,{id:-1,type,x,z,rotation,room:r?.id||null}]};
 if(r&&!interiorAccessible(temp,r))return fail('Leave a walkable path from the door to every object.');
 if(!r&&s.rooms.some(rr=>!pathfind(temp,ENTRY,doorOutside(rr))))return fail('This would block a room entrance.');return {ok:true,room:r?.id||null};
}
export function placeItem(s,type,x,z,rotation=0){const c=canPlace(s,type,x,z,rotation);if(!c.ok)return c;const item={id:s.nextId++,type,x,z,rotation:rotation%4,room:c.room};spend(s,EQUIPMENT[type].cost);s.items.push(item);s.revision++;return {ok:true,item};}
export function removeItem(s,id){const i=s.items.find(i=>i.id===id);if(!i)return fail('Choose an object to sell.');if(i.room&&s.patients.some(p=>p.room===i.room&&p.state==='service'))return fail('Wait for treatment to finish.');s.cash+=Math.round(EQUIPMENT[i.type].cost*.5);s.items=s.items.filter(x=>x!==i);s.revision++;return {ok:true};}
export function demolish(s,id){
 const r=s.rooms.find(r=>r.id===id);if(!r)return fail('Choose a room to demolish.');if(s.patients.some(p=>p.room===id&&p.state==='service'))return fail('Wait for treatment to finish.');
 s.cash+=Math.round((roomCost(r.type,r.w,r.h)+roomItems(s,r).reduce((n,i)=>n+EQUIPMENT[i.type].cost,0))*.5);s.items=s.items.filter(i=>i.room!==id);s.rooms=s.rooms.filter(x=>x!==r);
 for(const a of [...s.patients,...s.staff])if(a.room===id){const inside=a.x>=r.x&&a.x<r.x+r.w&&a.z>=r.z&&a.z<r.z+r.h;a.room=null;a.path=[];if(inside){a.x=doorOutside(r).x+.5;a.z=doorOutside(r).z+.5;}if(a.state&&a.state!=='amenity')a.state='queue';}s.revision++;return {ok:true};
}
export function roomStatus(s,r){
 const t=ROOM_TYPES[r.type],items=roomItems(s,r),missing=t.required.filter(k=>!items.some(i=>i.type===k));
 if(missing.length)return {ready:false,label:'Needs '+missing.map(k=>EQUIPMENT[k].name.toLowerCase()).join(' + '),missing};
 if(r.upgrading>0)return {ready:false,label:'Refitting · '+Math.ceil(r.upgrading)+'s',missing:[]};
 const nav=navigation(s);if(!nav.connected.has(r.id))nav.connected.set(r.id,!!pathfind(s,ENTRY,r.door));
 if(!nav.connected.get(r.id))return {ready:false,label:'Door is blocked',missing:[]};if(r.condition<=10)return {ready:false,label:'Machine broken — hire a caretaker',missing:[]};
 const a=s.staff.find(a=>a.id===r.staff);if(t.staff&&!a)return {ready:false,label:'Needs a '+t.staff,missing:[]};if(a?.training)return {ready:false,label:'Employee in training',missing:[]};if(a?.resting)return {ready:false,label:'Staff taking a break',missing:[]};return {ready:true,label:r.closed?'Intake paused':t.staff?'Open · '+a.name:'Open',missing:[]};
}
function workCell(s,r){
 const cells=[];for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)if(!itemAt(s,x,z)&&!(x===r.door.x&&z===r.door.z))cells.push({x,z});
 cells.sort((a,b)=>dist(a,{x:r.x+r.w/2,z:r.z+r.h/2})-dist(b,{x:r.x+r.w/2,z:r.z+r.h/2}));return cells.find(c=>pathfind(s,r.door,c))||r.door;
}
function patientCell(s,r,p){
 const staff=s.staff.find(a=>a.id===r.staff),occupied=s.patients.filter(a=>a!==p&&a.room===r.id&&['enter','service'].includes(a.state));
 const primary=s.items.find(i=>i.id===p.bed)||roomItems(s,r).find(i=>i.type===(r.type==='ward'?'bed':ROOM_TYPES[r.type].required[0]));
 const target=primary?{x:primary.x,z:primary.z}:{x:r.x+r.w/2,z:r.z+r.h/2},candidates=[];
 for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++){
  if(itemAt(s,x,z)||x===r.door.x&&z===r.door.z||staff&&Math.floor(staff.x)===x&&Math.floor(staff.z)===z||occupied.some(a=>a.destination?.x===x&&a.destination?.z===z))continue;
  candidates.push({x,z});
 }
 candidates.sort((a,b)=>dist(a,target)-dist(b,target));return candidates.find(c=>pathfind(s,r.door,c))||workCell(s,r);
}
function route(s,a,to){const p=pathfind(s,a,to);a.path=p||[];a.routeRevision=s.revision;return p!==null;}
function move(s,a,dt,speed=1.6){
 let travel=dt*speed;while(a.path?.length&&travel>0){const n=a.path[0],here={x:Math.floor(a.x),z:Math.floor(a.z)};
  if(dist(here,n)>0&&!canStep(s,here,n)){a.path=[];return;}
  const dx=n.x+.5-a.x,dz=n.z+.5-a.z,d=Math.hypot(dx,dz);a.angle=Math.atan2(dx,dz);
  if(d<=travel+.0001){a.x=n.x+.5;a.z=n.z+.5;a.path.shift();travel-=d;}else{a.x+=dx/d*travel;a.z+=dz/d*travel;travel=0;}}
}
export function assignStaff(s){
 for(const r of s.rooms)if(r.staff&&!s.staff.some(a=>a.id===r.staff))r.staff=null;
 for(const a of s.staff){if(a.type==='janitor')continue;if(a.room&&!s.rooms.some(r=>r.id===a.room)){a.room=null;a.path=[];}
  if(!a.room){const r=s.rooms.find(r=>ROOM_TYPES[r.type].staff===a.type&&!r.staff);if(r){r.staff=a.id;a.room=r.id;route(s,a,workCell(s,r));}}}
}
export function hire(s,type){
 const t=STAFF_TYPES[type];if(!t)return fail('Choose a staff role.');if(s.cash<t.cost)return fail('Not enough cash for recruitment.');if(s.staff.length>=24)return fail('The staffing limit is 24.');
 const id=s.nextId++,a={id,type,name:FIRST[id%FIRST.length]+' '+LAST[id%LAST.length],x:13.5,z:20.5,energy:100,skill:1+random(s)*.3,room:null,path:[],resting:false};spend(s,t.cost);s.staff.push(a);management.initializeDepth(s);assignStaff(s);log(s,t.name+' hired',a.name+' has joined the team.','good');return {ok:true,staff:a};
}
export function fire(s,id){const a=s.staff.find(a=>a.id===id);if(!a)return fail('Choose a staff member.');for(const r of s.rooms)if(r.staff===id)r.staff=null;s.staff=s.staff.filter(x=>x.id!==id);assignStaff(s);return {ok:true};}
export const dailyCost=s=>260+s.rooms.reduce((n,r)=>n+45+(r.level||0)*35,0)+s.staff.reduce((n,a)=>n+management.wage(a),0)+(s.policies.maintenance==='preventive'?100:0);
export function takeLoan(s){if(s.loan)return fail('Repay the current loan first.');s.loan=20000;s.cash+=20000;log(s,'Bank loan','A $20,000 lifeline. Daily interest is $200.');return {ok:true};}
export function repayLoan(s){if(!s.loan)return fail('There is no outstanding loan.');if(s.cash<s.loan)return fail('You need '+money(s.loan)+' to repay the loan.');s.cash-=s.loan;s.loan=0;return {ok:true};}
export function setOpen(s,v){s.open=!!v;log(s,v?'Doors open':'Admissions paused',v?'Reception is ready for the first patients.':'Existing patients will continue treatment.');}
function spawn(s,contract=null){if(s.patients.length>=55)return false;const choices=CONDITIONS.filter(c=>s.cured>=(c.unlock||0)),c=contract?CONDITIONS[contract.condition]:choices[Math.floor(random(s)*choices.length)],id=s.nextId++;s.patients.push({id,name:FIRST[id%FIRST.length]+' '+LAST[(id*3)%LAST.length],condition:CONDITIONS.indexOf(c),health:contract?58:90,patience:100,x:13.5,z:20.5,stage:'reception',state:'walk',room:null,path:[],progress:0,billed:0,routeRevision:-1,wait:0,angle:Math.PI,thirst:20+random(s)*15,bladder:15+random(s)*15,confidence:0,attempts:0,urgency:contract?4:1,contract:contract?.uid||null,amenity:null,seat:null,bed:null,arrived:s.time});return true;}
function queuePosition(s,p){
 const index=s.patients.filter(q=>q.stage===p.stage&&q.room===p.room&&management.queuePriority(s,q,p)<0&&q.state!=='exit').length;
 if(p.stage==='reception')return {x:13+index%2,z:18+Math.floor(index/2)%3};
 if(p.seat){const bench=s.items.find(i=>i.id===p.seat.id);if(bench&&pathfind(s,p,p.seat.destination))return p.seat.destination;p.seat=null;}
 for(const bench of s.items.filter(i=>i.type==='bench')){
  if(s.patients.filter(q=>q!==p&&q.seat?.id===bench.id).length>=2)continue;
  const dest=amenityApproach(s,p,bench);if(dest&&dist(dest,p)<9){p.seat={id:bench.id,destination:dest};return dest;}
 }
 const r=s.rooms.find(r=>r.id===p.room);if(!r)return {x:12+p.id%4,z:4+p.id%13};
 const o=doorOutside(r),c=[];for(let z=Math.max(1,o.z-3);z<=Math.min(DEPTH-2,o.z+3);z++)for(let x=Math.max(1,o.x-3);x<=Math.min(WIDTH-2,o.x+3);x++)if(!roomAt(s,x,z)&&!itemAt(s,x,z))c.push({x,z});c.sort((a,b)=>dist(a,o)-dist(b,o));return c[index%c.length]||o;
}
function candidateRoom(s,p){const c=s.rooms.filter(r=>r.type===p.stage&&!r.closed&&roomStatus(s,r).ready);c.sort((a,b)=>s.patients.filter(q=>q.room===a.id).length-s.patients.filter(q=>q.room===b.id).length||a.id-b.id);return c.find(r=>pathfind(s,p,doorOutside(r)))||null;}
function finish(s,p){
 const r=s.rooms.find(r=>r.id===p.room),t=ROOM_TYPES[r.type],a=s.staff.find(a=>a.id===r.staff);
 a.experience+=management.researched(s,'training')?2:1;if(a.experience%12===0)a.skill=Math.min(1.9,a.skill+.02);
 r.completed++;r.condition=Math.max(0,r.condition-(r.type==='gp'?1:2)*(management.researched(s,'engineering')?.65:1)/(1+r.level*.15));
 const fee=Math.round(t.fee*s.policies.fees/100),expense=r.type==='gp'?8:r.type==='pharmacy'?25:r.type==='ward'?40:r.type==='scanner'?65:120;
 spend(s,expense);
 if(p.stage==='gp'){
  if(!p.diagnosed){earn(s,fee);p.billed+=fee;}
  p.confidence=Math.min(.99,management.diagnosisConfidence(s,r,a)+p.attempts*.03);p.diagnosed=true;p.stage=CONDITIONS[p.condition].treatment;p.room=null;p.state='queue';p.progress=0;p.path=[];p.seat=null;
 }else if(random(s)>management.treatmentChance(s,r,a,p)){
  s.failedTreatments++;p.attempts++;p.health=Math.max(1,p.health-8);p.patience=Math.max(0,p.patience-8);p.stage='gp';p.room=null;p.state='queue';p.progress=0;p.path=[];p.bed=null;
  log(s,'A second opinion',p.name+' needs a revised diagnosis after unsuccessful treatment. No treatment fee was charged.','bad');
  if(p.attempts>=3)abandon(s,p);
 }else{
  earn(s,fee);p.billed+=fee;s.cured++;if(s.contract&&p.contract===s.contract.uid)s.contract.cured++;
  s.satisfaction=s.satisfaction*.92+clamp(p.patience+(s.policies.fees===80?8:s.policies.fees===125?-12:0),0,100)*.08;
  s.reputation=clamp(s.reputation+1.2+(p.patience>80?.15:0),0,100);p.health=100;p.state='exit';p.stage='leaving';p.room=null;p.bed=null;p.seat=null;route(s,p,ENTRY);
  log(s,'Another happy discharge',p.name+' recovered from '+CONDITIONS[p.condition].name.toLowerCase()+'. +'+money(fee),'good');if(s.cured===6)log(s,'Diagnostics unlocked','Scanner rooms and specialist recruitment are now available.','good');if(s.cured===16)log(s,'Surgery unlocked','Spontaneous paperwork can now be removed surgically.','good');
 }
}
function abandon(s,p,dead=false){if(p.state==='exit')return;s.lost++;if(dead){s.deaths++;spend(s,2500);}s.reputation=clamp(s.reputation-(dead?7:3),0,100);p.state='exit';p.stage='leaving';p.room=null;p.path=[];p.amenity=null;p.seat=null;p.bed=null;route(s,p,ENTRY);log(s,dead?'An unfortunate outcome':'Patient leaving',p.name+(dead?' did not receive care in time.':' left without completing treatment.'),'bad');}
export function sendHome(s,id){const p=s.patients.find(p=>p.id===id);if(!p||p.state==='exit')return fail('Choose a patient still in the hospital.');abandon(s,p);return {ok:true};}
function amenityApproach(s,p,item){
 const f=footprint(item.type,item.rotation),cells=[];
 for(let z=item.z-1;z<=item.z+f.h;z++)for(let x=item.x-1;x<=item.x+f.w;x++){
  if(!within(x,z)||itemAt(s,x,z)||x!==item.x-1&&x!==item.x+f.w&&z!==item.z-1&&z!==item.z+f.h)continue;
  if(s.patients.some(q=>q!==p&&[q.amenity?.destination,q.seat?.destination].some(t=>t&&t.x===x&&t.z===z)))continue;cells.push({x,z});
 }
 cells.sort((a,b)=>dist(a,p)-dist(b,p));return cells.find(c=>pathfind(s,p,c))||null;
}
function startNeed(s,p){
 if(p.health<35||s.time<(p.needRetry||0))return false;p.needRetry=s.time+5;
 const kind=p.bladder>p.thirst&&p.bladder>=70?'toilet':p.thirst>=70?'drink':p.bladder>=70?'toilet':null;if(!kind)return false;
 const candidates=s.items.filter(i=>i.type===(kind==='toilet'?'toilet':'vending')&&!s.patients.some(q=>q!==p&&q.amenity?.id===i.id));candidates.sort((a,b)=>dist(a,p)-dist(b,p));
 for(const item of candidates){const room=s.rooms.find(r=>r.id===item.room);if(kind==='toilet'&&(!room||room.closed||!roomStatus(s,room).ready))continue;const destination=amenityApproach(s,p,item);if(!destination)continue;
  p.state='amenity';p.amenity={id:item.id,kind,destination,progress:0,duration:kind==='toilet'?7/(1+(room.level||0)*.15):4};p.seat=null;route(s,p,destination);return true;}
 return false;
}
function litter(s,p){
 if(s.items.some(i=>i.type==='bin'&&dist(i,p)<4)||s.litter.length>=80)return;
 s.litter.push({id:s.nextId++,x:Math.floor(p.x)+.5,z:Math.floor(p.z)+.5});s.litterRevision++;
}
function amenityTick(s,p,dt){
 const a=p.amenity,item=s.items.find(i=>i.id===a?.id);
 if(!item){p.state='queue';p.amenity=null;p.path=[];return;}
 if(p.routeRevision!==s.revision&&!route(s,p,a.destination)){p.state='queue';p.amenity=null;return;}
 move(s,p,dt);
 if(!p.path.length&&dist(p,{x:a.destination.x+.5,z:a.destination.z+.5})<.2){
  a.progress+=dt;if(a.progress>=a.duration){if(a.kind==='drink'){p.thirst=8;earn(s,12);litter(s,p);}else p.bladder=5;p.patience=clamp(p.patience+(management.researched(s,'hospitality')?20:12),0,100);p.amenity=null;p.state='queue';p.path=[];}
 }
}
function staffTick(s,a,dt){
 a.morale=clamp(a.morale+dt*(a.resting?.12:a.energy<25?-.055:.003)+dt*a.payBonus*.025+(s.cleanliness<60?-dt*.03:0),0,100);
 if(a.morale<25&&!a.moraleWarned){a.moraleWarned=true;log(s,'Staff morale is falling',a.name+' needs rest, cleaner surroundings or better pay.','bad');}
 if(a.morale>55)a.moraleWarned=false;
 if(a.training){a.training.remaining-=dt*(a.trait==='learner'?1.4:1)*(management.researched(s,'training')?1.35:1);a.energy=clamp(a.energy+dt*.4,0,100);if(a.training.remaining<=0){a.training=null;a.rank++;a.skill=Math.min(2,a.skill+.14);a.morale=clamp(a.morale+10,0,100);a.routeRevision=-1;log(s,'Training completed',a.name+' has reached professional level '+(a.rank+1)+'.','good');}return;}
 if(a.type==='janitor'){
  const threshold=s.policies.maintenance==='preventive'?95:s.policies.maintenance==='economy'?45:80;
  const r=s.rooms.filter(r=>r.condition<threshold&&!r.upgrading).sort((a,b)=>a.condition-b.condition)[0];
  const rubbish=s.litter.filter(l=>!s.staff.some(b=>b!==a&&b.cleanTarget===l.id)).sort((l,k)=>dist(l,a)-dist(k,a))[0];
  if(rubbish&&(!r||r.condition>20)){
   if(a.cleanTarget!==rubbish.id||a.routeRevision!==s.revision){a.cleanTarget=rubbish.id;a.cleanProgress=0;route(s,a,rubbish);}
   move(s,a,dt,1.8*(1+a.rank*.08));if(!a.path.length&&dist(a,rubbish)<.2){a.cleanProgress+=dt*a.skill;if(a.cleanProgress>=1.2){s.litter=s.litter.filter(l=>l.id!==rubbish.id);s.litterRevision++;a.cleanTarget=null;}}return;
  }
  a.cleanTarget=null;
  if(r){const t=workCell(s,r);if(a.targetRoom!==r.id||a.routeRevision!==s.revision){a.targetRoom=r.id;route(s,a,t);}move(s,a,dt,1.8*(1+a.rank*.08));if(!a.path.length)r.condition=clamp(r.condition+dt*6*a.skill,0,100);}
  else{if(!a.path.length&&dist(a,{x:14.5,z:16.5})>1)route(s,a,{x:14,z:16});move(s,a,dt);}
  return;
 }
 const r=s.rooms.find(r=>r.id===a.room);if(!r){a.energy=clamp(a.energy+dt*.3,0,100);return;}
 const rest=s.rooms.find(r=>r.type==='staff'&&!r.closed&&roomStatus(s,r).ready&&s.staff.filter(b=>b!==a&&b.resting&&b.restRoom===r.id).length<roomItems(s,r).filter(i=>i.type==='sofa').length*2);
 if(!a.resting&&a.energy<22&&rest){a.resting=true;a.restRoom=rest.id;route(s,a,workCell(s,rest));}
 if(a.resting){const lounge=s.rooms.find(r=>r.id===a.restRoom);if(!lounge){a.resting=false;route(s,a,workCell(s,r));}else{move(s,a,dt);if(!a.path.length)a.energy=clamp(a.energy+dt*5*(1+lounge.level*.15),0,100);if(a.energy>=95){a.resting=false;route(s,a,workCell(s,r));}return;}}
 if(a.routeRevision!==s.revision)route(s,a,workCell(s,r));move(s,a,dt);a.energy=clamp(a.energy-dt*.045*(a.trait==='tireless'?.8:1),5,100);
}
export function tick(s,dt){
 if(s.ended||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.5);s.time+=dt;
 const day=Math.floor(s.time/DAY_LENGTH)+1;if(day!==s.day){const cost=dailyCost(s)+(s.loan?200:0);spend(s,cost);s.day=day;s.lastReport={day:day-1,cured:s.cured-s.dayStart.cured,earned:s.earned-s.dayStart.earned,spent:s.spent-s.dayStart.spent,payroll:cost,cash:s.cash,lost:s.lost-s.dayStart.lost};s.dayStart={earned:s.earned,spent:s.spent,cured:s.cured,lost:s.lost};s.history.push(s.lastReport);s.history=s.history.slice(-14);log(s,'Day '+s.day+' · morning accounts','Payroll and running costs: '+money(cost)+'.');}
 s.arrival-=dt;if(s.open&&s.arrival<=0){spawn(s);s.arrival=Math.max(7,15-s.reputation*.055)*(s.policies.fees===80?.82:s.policies.fees===125?1.22:1);}
 if(s.contract?.pending>0&&spawn(s,s.contract))s.contract.pending--;
 s.dispatch-=dt;const dispatch=s.dispatch<=0;if(dispatch){s.dispatch=1;assignStaff(s);}for(const a of s.staff)staffTick(s,a,dt);
 const comforts=s.items.filter(i=>['plant','radiator'].includes(i.type));
 const targetClean=clamp(100-s.litter.length*5-s.patients.length*.15,0,100);s.cleanliness+=clamp(targetClean-s.cleanliness,-dt*1.5,dt*.7);
 for(const p of [...s.patients]){
  if(p.state==='exit'){if(p.routeRevision!==s.revision)route(s,p,ENTRY);move(s,p,dt,1.8);if(!p.path.length&&dist(p,{x:13.5,z:20.5})<.2)s.patients=s.patients.filter(q=>q!==p);continue;}
  p.health=Math.max(0,p.health-dt*(p.urgency>=4?.09:.035));p.thirst=clamp(p.thirst+dt*.17,0,100);p.bladder=clamp(p.bladder+dt*.13,0,100);
  const comfort=comforts.some(i=>dist(i,p)<4)||p.seat&&!p.path.length,kindStaff=s.staff.some(a=>a.trait==='kind'&&dist(a,p)<4);
  p.patience=clamp(p.patience-dt*(p.state==='service'?.025:comfort?.055:.15)*(s.cleanliness<60?1.5:1)*(s.policies.fees===125?1.2:s.policies.fees===80?.9:1)*(p.thirst>85||p.bladder>85?1.8:1)*(management.researched(s,'hospitality')?.8:1)+(kindStaff?dt*.035:0),0,100);
  if(p.patience<=0||p.health<=0){abandon(s,p,p.health<=0);continue;}
  if(p.state==='amenity'){amenityTick(s,p,dt);continue;}
  if(dispatch&&p.state==='queue'&&startNeed(s,p)){amenityTick(s,p,dt);continue;}
  if(p.stage==='reception'){
   const ahead=s.patients.some(q=>q.stage==='reception'&&q.id<p.id),target=ahead?queuePosition(s,p):{x:13,z:18};
   if(dispatch&&(p.routeRevision!==s.revision||!p.path.length&&dist(p,{x:target.x+.5,z:target.z+.5})>.2))route(s,p,target);move(s,p,dt);
   if(!ahead&&!p.path.length&&dist(p,{x:13.5,z:18.5})<.2){p.progress+=dt;if(p.progress>=2.8){p.stage='gp';p.state='queue';p.progress=0;p.path=[];p.routeRevision=-1;}}continue;
  }
  let r=s.rooms.find(r=>r.id===p.room);
  if(dispatch&&(!r||!roomStatus(s,r).ready||r.closed&&p.state==='queue')&&p.state!=='service'){const replacement=candidateRoom(s,p);if(replacement?.id!==p.room){p.room=replacement?.id||null;p.path=[];p.routeRevision=-1;}r=replacement;}
  if(!r){if(dispatch&&(!p.path.length||p.routeRevision!==s.revision))route(s,p,queuePosition(s,p));move(s,p,dt);p.wait+=dt;continue;}
  const a=s.staff.find(a=>a.id===r.staff),slots=r.type==='ward'?roomItems(s,r).filter(i=>i.type==='bed').length:1,active=s.patients.filter(q=>q.room===r.id&&(q.state==='service'||q.state==='enter')),prior=s.patients.some(q=>q.room===r.id&&management.queuePriority(s,q,p)<0&&q.state==='queue');
  if(p.state==='queue'&&active.length<slots&&!prior&&!r.closed&&roomStatus(s,r).ready&&a&&!a.path.length){p.state='enter';p.seat=null;if(r.type==='ward')p.bed=roomItems(s,r).find(i=>i.type==='bed'&&!active.some(q=>q.bed===i.id))?.id||null;p.destination=patientCell(s,r,p);route(s,p,p.destination);}
  if(p.state==='queue'){const t=queuePosition(s,p);if(dispatch&&(p.routeRevision!==s.revision||!p.path.length&&dist(p,{x:t.x+.5,z:t.z+.5})>.3))route(s,p,t);move(s,p,dt);p.wait+=dt;}
  else if(p.state==='enter'){if(p.routeRevision!==s.revision){p.destination=patientCell(s,r,p);route(s,p,p.destination);}move(s,p,dt);if(!p.path.length&&roomAt(s,Math.floor(p.x),Math.floor(p.z))?.id===r.id){p.state='service';p.progress=0;}}
  else if(p.state==='service'&&roomStatus(s,r).ready&&a&&!a.path.length){p.progress+=dt*a.skill*(.55+a.energy*.0045)*(a.trait==='quick'?1.1:1)*(a.morale<25?.85:1);a.energy=Math.max(5,a.energy-dt*.45*(a.trait==='tireless'?.8:1));if(p.progress>=management.serviceDuration(s,r))finish(s,p);}
 }
 const researchPower=s.staff.filter(a=>a.type==='researcher'&&!a.resting&&!a.training&&!a.path.length&&s.rooms.some(r=>r.id===a.room&&!r.closed&&roomStatus(s,r).ready)).reduce((n,a)=>n+a.skill*(.5+a.energy*.005)*(1+s.rooms.find(r=>r.id===a.room).level*.15),0);
 management.developmentTick(s,dt,researchPower);
 if(s.cash<-15000)s.ended='The hospital is insolvent. Secure a loan before the cash runs out, or start again.';
}
export function objectives(s){const ready=t=>s.rooms.some(r=>r.type===t&&roomStatus(s,r).ready);return [
 {text:'Build and furnish a GP office',done:ready('gp')},
 {text:'Hire a doctor and two nurses',done:s.staff.some(a=>a.type==='doctor')&&s.staff.filter(a=>a.type==='nurse').length>=2},
 {text:'Open a pharmacy and a ward',done:ready('pharmacy')&&ready('ward')},
 {text:'Open the hospital to patients',done:s.open||s.cured>0},
 {text:'Cure 30 patients',done:s.cured>=30,progress:s.cured+' / 30'},
 {text:'Reach 65 reputation with five rooms',done:s.reputation>=65&&s.rooms.length>=5,progress:Math.round(s.reputation)+' rep · '+s.rooms.length+' rooms'},
 ];}
export function validSave(s){
 if(!s||s.version!==2||![s.cash,s.time,s.seed,s.nextId,s.cured,s.reputation].every(Number.isFinite)||s.time<0||s.nextId<1)return false;
 if(!Array.isArray(s.rooms)||s.rooms.length>50||!Array.isArray(s.items)||s.items.length>350||!Array.isArray(s.staff)||s.staff.length>24||!Array.isArray(s.patients)||s.patients.length>60)return false;
 const ids=[...s.rooms,...s.items,...s.staff,...s.patients].map(x=>x.id);if(ids.some(id=>!integer(id)||id<1)||new Set(ids).size!==ids.length)return false;
 if(!s.rooms.every(r=>ROOM_TYPES[r.type]&&[r.x,r.z,r.w,r.h].every(integer)&&r.w>=ROOM_TYPES[r.type].min&&r.h>=ROOM_TYPES[r.type].min&&within(r.x,r.z)&&within(r.x+r.w-1,r.z+r.h-1)&&r.door&&within(r.door.x,r.door.z)&&['north','south','east','west'].includes(r.door.side)&&Number.isFinite(r.condition)))return false;
 if(!s.items.every(i=>EQUIPMENT[i.type]&&within(i.x,i.z)&&integer(i.rotation)&&i.rotation>=0&&i.rotation<4))return false;
 if(![...s.staff,...s.patients].every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)&&a.x>=0&&a.x<WIDTH&&a.z>=0&&a.z<DEPTH&&Array.isArray(a.path)&&a.path.every(p=>within(p.x,p.z))))return false;
 return s.staff.every(a=>STAFF_TYPES[a.type]&&Number.isFinite(a.energy))&&s.patients.every(p=>CONDITIONS[p.condition]&&Number.isFinite(p.health)&&Number.isFinite(p.patience))&&Array.isArray(s.log)&&management.depthSaveValid(s);
}
