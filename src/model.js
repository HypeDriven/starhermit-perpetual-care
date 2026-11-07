// Pure construction, navigation, staffing, treatment and finance simulation.
export const WIDTH=28, DEPTH=22, DAY_LENGTH=180, ENTRY={x:13,z:20};
export const ROOM_TYPES={
 gp:{name:'GP office',short:'GP',color:'#bed2bb',wall:'#6f967c',base:900,tile:90,min:3,staff:'doctor',required:['desk','exam'],time:10,fee:380,description:'Every cure begins with a diagnosis.'},
 pharmacy:{name:'Pharmacy',short:'RX',color:'#d8d9b6',wall:'#a2ad73',base:1200,tile:95,min:3,staff:'nurse',required:['pharmacy'],time:12,fee:1350,description:'A prescription for modern life.'},
 ward:{name:'Ward',short:'WD',color:'#b9d2d0',wall:'#6a9d9b',base:1600,tile:95,min:4,staff:'nurse',required:['bed'],time:21,fee:1900,description:'A little rest. A very itemized bill.'},
 scanner:{name:'Diagnostics',short:'DX',color:'#c9c4dc',wall:'#9184b1',base:2200,tile:110,min:4,staff:'specialist',required:['scanner'],time:16,fee:2400,unlock:6,description:'Look deeper. Invoice accordingly.'},
 surgery:{name:'Surgery',short:'OR',color:'#dbbec3',wall:'#ae7d86',base:3200,tile:125,min:4,staff:'specialist',required:['operating'],time:23,fee:3400,unlock:16,description:'Precision care for improbable ailments.'},
 staff:{name:'Staff room',short:'TEA',color:'#e5cfaf',wall:'#b69a70',base:650,tile:65,min:3,staff:null,required:['sofa'],description:'Because doctors are people, allegedly.'},
 toilets:{name:'Toilets',short:'WC',color:'#d4d9dc',wall:'#8d9da5',base:600,tile:65,min:3,staff:null,required:['toilet','sink'],description:'The foundation of civilized medicine.'},
};
export const EQUIPMENT={
 desk:{name:'Doctor desk',cost:1100,w:1,h:1,rooms:['gp'],model:'desk',description:'Required in a GP office.'},
 exam:{name:'Examination couch',cost:850,w:1,h:2,rooms:['gp'],model:'bed',description:'Required in a GP office.'},
 pharmacy:{name:'Medicine cabinet',cost:1600,w:1,h:1,rooms:['pharmacy'],model:'pharmacy',description:'Required in a pharmacy.'},
 bed:{name:'Hospital bed',cost:950,w:1,h:2,rooms:['ward'],model:'bed',description:'Each bed accommodates another inpatient.'},
 scanner:{name:'Diagnostic scanner',cost:4200,w:2,h:2,rooms:['scanner'],model:'scanner',description:'Required in Diagnostics.'},
 operating:{name:'Operating table',cost:5200,w:1,h:2,rooms:['surgery'],model:'bed',description:'Required in Surgery.'},
 sofa:{name:'Comfortable sofa',cost:450,w:2,h:1,rooms:['staff'],model:'sofa',description:'Restores staff energy.'},
 toilet:{name:'Toilet cubicle',cost:350,w:1,h:1,rooms:['toilets'],description:'An essential public service.'},
 sink:{name:'Wash basin',cost:200,w:1,h:1,rooms:['toilets'],description:'Required for working toilets.'},
 bench:{name:'Waiting bench',cost:220,w:2,h:1,corridor:true,model:'sofa',description:'Nearby patients wait more patiently.'},
 plant:{name:'Potted plant',cost:100,w:1,h:1,any:true,model:'plant',description:'Makes the hospital feel cared for.'},
 vending:{name:'Drinks machine',cost:650,w:1,h:1,corridor:true,description:'Refreshments improve patient comfort.'},
 bin:{name:'Litter bin',cost:80,w:1,h:1,corridor:true,description:'A cleaner hospital is a happier hospital.'},
 radiator:{name:'Radiator',cost:180,w:1,h:1,any:true,description:'Comfort, without a prescription.'},
};
export const STAFF_TYPES={
 doctor:{name:'Doctor',cost:1200,wage:480,color:'#f6f2de',description:'Diagnoses patients in GP offices.'},
 nurse:{name:'Nurse',cost:900,wage:350,color:'#75aaa6',description:'Works in pharmacies and wards.'},
 specialist:{name:'Specialist',cost:1900,wage:700,color:'#ad99c0',description:'Runs scanners and surgery.'},
 janitor:{name:'Caretaker',cost:650,wage:240,color:'#cc9563',description:'Repairs machines and keeps things clean.'},
};
export const CONDITIONS=[
 {name:'Chronic Mondays',treatment:'pharmacy',color:'#d59b5c'},
 {name:'Inbox inflammation',treatment:'pharmacy',color:'#a4b2cb'},
 {name:'Executive exhaustion',treatment:'ward',color:'#b38eae'},
 {name:'Acute overthinking',treatment:'ward',color:'#99b49c'},
 {name:'Imaginary hiccups',treatment:'scanner',color:'#cab875',unlock:6},
 {name:'Spontaneous paperwork',treatment:'surgery',color:'#b68476',unlock:16},
];
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
export function fresh(seed=73){return {version:2,seed:seed>>>0,cash:65000,earned:0,spent:0,time:0,day:1,rooms:[],items:[],staff:[],patients:[],nextId:1,cured:0,lost:0,deaths:0,reputation:50,arrival:8,dispatch:0,revision:0,log:[{title:'A fresh start',text:'Build something people can get better in.',kind:'good',time:0}],loan:0,won:false,ended:null,cleanliness:100,open:false,history:[],lastReport:null};}
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
 const room={id:s.nextId++,type,x,z,w,h,door:c.door,staff:null,condition:100,completed:0};spend(s,c.cost);s.rooms.push(room);s.revision++;
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
 for(const a of [...s.patients,...s.staff])if(a.room===id){a.room=null;a.path=[];a.x=doorOutside(r).x+.5;a.z=doorOutside(r).z+.5;if(a.state)a.state='queue';}s.revision++;return {ok:true};
}
export function roomStatus(s,r){
 const t=ROOM_TYPES[r.type],items=roomItems(s,r),missing=t.required.filter(k=>!items.some(i=>i.type===k));
 if(missing.length)return {ready:false,label:'Needs '+missing.map(k=>EQUIPMENT[k].name.toLowerCase()).join(' + '),missing};
 const nav=navigation(s);if(!nav.connected.has(r.id))nav.connected.set(r.id,!!pathfind(s,ENTRY,r.door));
 if(!nav.connected.get(r.id))return {ready:false,label:'Door is blocked',missing:[]};if(r.condition<=10)return {ready:false,label:'Machine broken — hire a caretaker',missing:[]};
 const a=s.staff.find(a=>a.id===r.staff);if(t.staff&&!a)return {ready:false,label:'Needs a '+t.staff,missing:[]};if(a?.resting)return {ready:false,label:'Staff taking a break',missing:[]};return {ready:true,label:t.staff?'Open · '+a.name:'Open',missing:[]};
}
function workCell(s,r){
 const cells=[];for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)if(!itemAt(s,x,z)&&!(x===r.door.x&&z===r.door.z))cells.push({x,z});
 cells.sort((a,b)=>dist(a,{x:r.x+r.w/2,z:r.z+r.h/2})-dist(b,{x:r.x+r.w/2,z:r.z+r.h/2}));return cells.find(c=>pathfind(s,r.door,c))||r.door;
}
function patientCell(s,r,p){
 const staff=s.staff.find(a=>a.id===r.staff),occupied=s.patients.filter(a=>a!==p&&a.room===r.id&&['enter','service'].includes(a.state));
 const primary=roomItems(s,r).find(i=>i.type===(r.type==='ward'?'bed':ROOM_TYPES[r.type].required[0]));
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
 const id=s.nextId++,a={id,type,name:FIRST[id%FIRST.length]+' '+LAST[id%LAST.length],x:13.5,z:20.5,energy:100,skill:1+random(s)*.3,room:null,path:[],resting:false};spend(s,t.cost);s.staff.push(a);assignStaff(s);log(s,t.name+' hired',a.name+' has joined the team.','good');return {ok:true,staff:a};
}
export function fire(s,id){const a=s.staff.find(a=>a.id===id);if(!a)return fail('Choose a staff member.');for(const r of s.rooms)if(r.staff===id)r.staff=null;s.staff=s.staff.filter(x=>x.id!==id);assignStaff(s);return {ok:true};}
export const dailyCost=s=>260+s.rooms.length*45+s.staff.reduce((n,a)=>n+STAFF_TYPES[a.type].wage,0);
export function takeLoan(s){if(s.loan)return fail('Repay the current loan first.');s.loan=20000;s.cash+=20000;log(s,'Bank loan','A $20,000 lifeline. Daily interest is $200.');return {ok:true};}
export function repayLoan(s){if(!s.loan)return fail('There is no outstanding loan.');if(s.cash<s.loan)return fail('You need '+money(s.loan)+' to repay the loan.');s.cash-=s.loan;s.loan=0;return {ok:true};}
export function setOpen(s,v){s.open=!!v;log(s,v?'Doors open':'Admissions paused',v?'Reception is ready for the first patients.':'Existing patients will continue treatment.');}
function spawn(s){if(s.patients.length>=55)return;const choices=CONDITIONS.filter(c=>s.cured>=(c.unlock||0)),c=choices[Math.floor(random(s)*choices.length)],id=s.nextId++;s.patients.push({id,name:FIRST[id%FIRST.length]+' '+LAST[(id*3)%LAST.length],condition:CONDITIONS.indexOf(c),health:90,patience:100,x:13.5,z:20.5,stage:'reception',state:'walk',room:null,path:[],progress:0,billed:0,routeRevision:-1,wait:0,angle:Math.PI});}
function queuePosition(s,p){
 const index=s.patients.filter(q=>q.stage===p.stage&&q.room===p.room&&q.id<p.id&&q.state!=='exit').length;
 if(p.stage==='reception')return {x:13+index%2,z:18+Math.floor(index/2)%3};
 const r=s.rooms.find(r=>r.id===p.room);if(!r)return {x:12+p.id%4,z:4+p.id%13};
 const o=doorOutside(r),c=[];for(let z=Math.max(1,o.z-3);z<=Math.min(DEPTH-2,o.z+3);z++)for(let x=Math.max(1,o.x-3);x<=Math.min(WIDTH-2,o.x+3);x++)if(!roomAt(s,x,z)&&!itemAt(s,x,z))c.push({x,z});c.sort((a,b)=>dist(a,o)-dist(b,o));return c[index%c.length]||o;
}
function candidateRoom(s,p){const c=s.rooms.filter(r=>r.type===p.stage&&roomStatus(s,r).ready);c.sort((a,b)=>s.patients.filter(q=>q.room===a.id).length-s.patients.filter(q=>q.room===b.id).length||a.id-b.id);return c.find(r=>pathfind(s,p,doorOutside(r)))||null;}
function finish(s,p){
 const r=s.rooms.find(r=>r.id===p.room),t=ROOM_TYPES[r.type];earn(s,t.fee);p.billed+=t.fee;r.completed++;r.condition=Math.max(0,r.condition-(r.type==='gp'?1:2));
 if(p.stage==='gp'){p.diagnosed=true;p.stage=CONDITIONS[p.condition].treatment;p.room=null;p.state='queue';p.progress=0;p.path=[];}
 else{s.cured++;s.reputation=clamp(s.reputation+1.2,0,100);p.health=100;p.state='exit';p.stage='leaving';p.room=null;route(s,p,ENTRY);log(s,'Another happy discharge',p.name+' recovered from '+CONDITIONS[p.condition].name.toLowerCase()+'. +'+money(t.fee),'good');if(s.cured===6)log(s,'Diagnostics unlocked','Scanner rooms and specialist recruitment are now available.','good');if(s.cured===16)log(s,'Surgery unlocked','Spontaneous paperwork can now be removed surgically.','good');}
}
function abandon(s,p,dead=false){if(p.state==='exit')return;s.lost++;if(dead){s.deaths++;spend(s,2500);}s.reputation=clamp(s.reputation-(dead?7:3),0,100);p.state='exit';p.stage='leaving';p.room=null;p.path=[];route(s,p,ENTRY);log(s,dead?'An unfortunate outcome':'Patient leaving',p.name+(dead?' did not receive care in time.':' ran out of patience.'),'bad');}
function staffTick(s,a,dt){
 if(a.type==='janitor'){
  const r=s.rooms.filter(r=>r.condition<90).sort((a,b)=>a.condition-b.condition)[0];
  if(r){const t=workCell(s,r);if(a.targetRoom!==r.id||a.routeRevision!==s.revision){a.targetRoom=r.id;route(s,a,t);}move(s,a,dt,1.8);if(!a.path.length)r.condition=clamp(r.condition+dt*6,0,100);}
  else{if(!a.path.length&&dist(a,{x:14.5,z:16.5})>1)route(s,a,{x:14,z:16});move(s,a,dt);}
  s.cleanliness=clamp(s.cleanliness+dt*.5,0,100);return;
 }
 const r=s.rooms.find(r=>r.id===a.room);if(!r){a.energy=clamp(a.energy+dt*.3,0,100);return;}
 const rest=s.rooms.find(r=>r.type==='staff'&&roomStatus(s,r).ready);
 if(!a.resting&&a.energy<22&&rest){a.resting=true;a.restRoom=rest.id;route(s,a,workCell(s,rest));}
 if(a.resting){if(!s.rooms.some(r=>r.id===a.restRoom)){a.resting=false;route(s,a,workCell(s,r));}else{move(s,a,dt);if(!a.path.length)a.energy=clamp(a.energy+dt*5,0,100);if(a.energy>=95){a.resting=false;route(s,a,workCell(s,r));}return;}}
 if(a.routeRevision!==s.revision)route(s,a,workCell(s,r));move(s,a,dt);a.energy=clamp(a.energy-dt*.045,5,100);
}
export function tick(s,dt){
 if(s.ended||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.5);s.time+=dt;
 const day=Math.floor(s.time/DAY_LENGTH)+1;if(day!==s.day){const cost=dailyCost(s)+(s.loan?200:0);spend(s,cost);s.day=day;s.lastReport={day:day-1,cured:s.cured,earned:s.earned,payroll:cost,cash:s.cash};s.history.push(s.lastReport);s.history=s.history.slice(-14);log(s,'Day '+s.day+' · morning accounts','Payroll and running costs: '+money(cost)+'.');}
 s.arrival-=dt;if(s.open&&s.arrival<=0){spawn(s);s.arrival=Math.max(7,15-s.reputation*.055);}
 s.dispatch-=dt;const dispatch=s.dispatch<=0;if(dispatch){s.dispatch=1;assignStaff(s);}for(const a of s.staff)staffTick(s,a,dt);
 const comforts=s.items.filter(i=>['bench','plant','vending','radiator'].includes(i.type)),toilets=s.rooms.some(r=>r.type==='toilets'&&roomStatus(s,r).ready);
 s.cleanliness=clamp(s.cleanliness-dt*s.patients.length*.002,0,100);
 for(const p of [...s.patients]){
  if(p.state==='exit'){if(p.routeRevision!==s.revision)route(s,p,ENTRY);move(s,p,dt,1.8);if(!p.path.length&&dist(p,{x:13.5,z:20.5})<.2)s.patients=s.patients.filter(q=>q!==p);continue;}
  p.health=Math.max(0,p.health-dt*.035);const comfort=comforts.some(i=>dist(i,p)<4);p.patience=clamp(p.patience-dt*(p.state==='service'?.025:comfort?.055:.15)*(s.cleanliness<60?1.5:1)*(toilets?.8:1),0,100);
  if(p.patience<=0||p.health<=0){abandon(s,p,p.health<=0);continue;}
  if(p.stage==='reception'){
   const ahead=s.patients.some(q=>q.stage==='reception'&&q.id<p.id),target=ahead?queuePosition(s,p):{x:13,z:18};
   if(dispatch&&(p.routeRevision!==s.revision||!p.path.length&&dist(p,{x:target.x+.5,z:target.z+.5})>.2))route(s,p,target);move(s,p,dt);
   if(!ahead&&!p.path.length&&dist(p,{x:13.5,z:18.5})<.2){p.progress+=dt;if(p.progress>=2.8){p.stage='gp';p.state='queue';p.progress=0;p.path=[];p.routeRevision=-1;}}continue;
  }
  let r=s.rooms.find(r=>r.id===p.room);
  if(dispatch&&(!r||!roomStatus(s,r).ready)&&p.state!=='service'){const replacement=candidateRoom(s,p);if(replacement?.id!==p.room){p.room=replacement?.id||null;p.path=[];p.routeRevision=-1;}r=replacement;}
  if(!r){if(dispatch&&(!p.path.length||p.routeRevision!==s.revision))route(s,p,queuePosition(s,p));move(s,p,dt);p.wait+=dt;continue;}
  const a=s.staff.find(a=>a.id===r.staff),slots=r.type==='ward'?roomItems(s,r).filter(i=>i.type==='bed').length:1,active=s.patients.filter(q=>q.room===r.id&&(q.state==='service'||q.state==='enter')),prior=s.patients.some(q=>q.room===r.id&&q.id<p.id&&q.state==='queue');
  if(p.state==='queue'&&active.length<slots&&!prior&&roomStatus(s,r).ready&&a&&!a.path.length){p.state='enter';p.destination=patientCell(s,r,p);route(s,p,p.destination);}
  if(p.state==='queue'){const t=queuePosition(s,p);if(dispatch&&(p.routeRevision!==s.revision||!p.path.length&&dist(p,{x:t.x+.5,z:t.z+.5})>.3))route(s,p,t);move(s,p,dt);p.wait+=dt;}
  else if(p.state==='enter'){if(p.routeRevision!==s.revision){p.destination=patientCell(s,r,p);route(s,p,p.destination);}move(s,p,dt);if(!p.path.length&&roomAt(s,Math.floor(p.x),Math.floor(p.z))?.id===r.id){p.state='service';p.progress=0;}}
  else if(p.state==='service'&&roomStatus(s,r).ready&&a&&!a.path.length){p.progress+=dt*a.skill*(.55+a.energy*.0045);a.energy=Math.max(5,a.energy-dt*.45);if(p.progress>=ROOM_TYPES[r.type].time)finish(s,p);}
 }
 if(s.cured>=30&&s.reputation>=65&&s.rooms.length>=5&&!s.won){s.won=true;log(s,'A hospital worth coming home from','30 patients cured, five rooms, and a reputation to be proud of. Keep building.','good');}
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
 return s.staff.every(a=>STAFF_TYPES[a.type]&&Number.isFinite(a.energy))&&s.patients.every(p=>CONDITIONS[p.condition]&&Number.isFinite(p.health)&&Number.isFinite(p.patience))&&Array.isArray(s.log);
}
