import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';

function room(s,type,x,z,w=4,h=4){
 const built=M.buildRoom(s,type,x,z,w,h);assert.ok(built.ok,built.error);const r=built.room;
 for(const equipment of M.ROOM_TYPES[type].required){let placed=false;
  for(let zz=z;zz<z+h&&!placed;zz++)for(let xx=x;xx<x+w&&!placed;xx++)if(M.canPlace(s,equipment,xx,zz).ok){assert.ok(M.placeItem(s,equipment,xx,zz).ok);placed=true;}
  assert.ok(placed,'Room can be furnished with '+equipment);
 }
 return r;
}
function hospital(){const s=M.fresh();room(s,'gp',3,3,5,5);room(s,'pharmacy',18,3);room(s,'ward',18,9,5,5);room(s,'staff',3,10);room(s,'toilets',3,16);M.hire(s,'doctor');M.hire(s,'nurse');M.hire(s,'nurse');M.hire(s,'janitor');return s;}
function run(s,seconds){for(let t=0;t<seconds;t+=.2)M.tick(s,.2);}

test('rooms have real footprints, affordable costs, overlap protection and a clear central corridor',()=>{
 const s=M.fresh(),cash=s.cash,r=room(s,'gp',3,3);
 assert.ok(s.cash<cash);assert.equal(s.rooms.length,1);assert.equal(M.canBuild(s,'ward',4,4,4,4).ok,false);
 assert.equal(M.canBuild(s,'gp',11,10,4,4).ok,false);assert.equal(M.canBuild(s,'gp',1,1,2,3).ok,false);
 assert.equal(M.canBuild(s,'gp',25,18,4,4).ok,false);assert.ok(M.pathfind(s,M.ENTRY,r.door));
 s.cash=0;assert.equal(M.canBuild(s,'gp',18,3,4,4).ok,false);
});
test('patients can cross a room wall only through its door',()=>{
 const s=M.fresh(),r=room(s,'pharmacy',3,3,5,5),out=M.doorOutside(r);
 assert.equal(M.canStep(s,out,r.door),true);
 assert.equal(M.canStep(s,{x:r.x+1,z:r.z-1},{x:r.x+1,z:r.z}),r.door.side==='north'&&r.door.x===r.x+1);
 const target={x:r.x+2,z:r.z+2},path=M.pathfind(s,M.ENTRY,target);assert.ok(path);
 assert.ok(path.some(p=>p.x===r.door.x&&p.z===r.door.z));
});
test('equipment respects room types, rotated footprints, doors and access to every object',()=>{
 const s=M.fresh(),r=room(s,'gp',3,3,5,5);
 assert.equal(M.canPlace(s,'pharmacy',4,4).ok,false);assert.equal(M.canPlace(s,'desk',r.door.x,r.door.z).ok,false);
 assert.equal(M.canPlace(s,'bench',5,5).ok,false);assert.equal(M.canPlace(s,'plant',13,17).ok,false);
 assert.deepEqual(M.footprint('bed',1),{w:2,h:1});
 for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)if(M.canPlace(s,'plant',x,z).ok)M.placeItem(s,'plant',x,z);
 assert.ok(M.interiorAccessible(s,r));assert.ok(M.pathfind(s,M.ENTRY,r.door));
});
test('opening a room requires its furnishings and the correct hired staff',()=>{
 const s=M.fresh(),b=M.buildRoom(s,'gp',3,3,4,4);assert.ok(b.ok);assert.equal(M.roomStatus(s,b.room).ready,false);
 const r=room(s,'pharmacy',18,3);assert.match(M.roomStatus(s,r).label,/nurse/);
 M.hire(s,'doctor');assert.equal(M.roomStatus(s,r).ready,false);M.hire(s,'nurse');assert.equal(M.roomStatus(s,r).ready,true);
 assert.equal(s.staff.find(a=>a.type==='nurse').room,r.id);
});
test('a built and staffed hospital receives patients, diagnoses them, treats them and earns revenue',()=>{
 const s=hospital();M.setOpen(s,true);run(s,230);
 assert.ok(s.cured>=5,'At least five patients complete the full treatment chain: '+s.cured);
 assert.ok(s.earned>5000);assert.ok(s.rooms.find(r=>r.type==='gp').completed>0);assert.equal(s.deaths,0);assert.ok(M.validSave(s));
 for(const p of [...s.staff,...s.patients])assert.equal(M.itemAt(s,Math.floor(p.x),Math.floor(p.z)),null);
});
test('admissions can close while existing patients continue care',()=>{
 const s=hospital();M.setOpen(s,true);run(s,40);const count=s.nextId;M.setOpen(s,false);run(s,100);assert.equal(s.nextId,count);assert.ok(s.cured>0);
});
test('progression unlocks advanced rooms and a balanced hospital can meet its objective',()=>{
 const s=hospital();assert.equal(M.canBuild(s,'scanner',18,16,4,4).ok,false);s.cured=6;assert.ok(M.canBuild(s,'scanner',18,16,4,4).ok);
 room(s,'scanner',18,16);M.hire(s,'specialist');s.cured=16;room(s,'surgery',8,10,4,4);M.hire(s,'specialist');M.setOpen(s,true);run(s,500);
 assert.ok(s.cured>=30,'Hospital keeps curing patients: '+s.cured);assert.equal(s.won,true);assert.equal(s.ended,null);
});
test('staff use a furnished staff room to recover energy and caretakers repair machines',()=>{
 const s=hospital(),doctor=s.staff.find(a=>a.type==='doctor');doctor.energy=10;run(s,100);assert.ok(doctor.energy>60);
 const gp=s.rooms.find(r=>r.type==='gp');gp.condition=5;run(s,60);assert.ok(gp.condition>50);assert.ok(M.roomStatus(s,gp).ready);
});
test('room demolition refunds half, removes furnishings and safely reassigns staff',()=>{
 const s=hospital(),r=s.rooms.find(r=>r.type==='gp'),cash=s.cash;assert.ok(M.demolish(s,r.id).ok);assert.ok(s.cash>cash);assert.equal(s.items.some(i=>i.room===r.id),false);assert.equal(s.staff.some(a=>a.room===r.id),false);run(s,2);assert.ok(M.validSave(s));
});
test('daily payroll, loan repayment and deterministic saves preserve balances',()=>{
 const s=hospital(),a=structuredClone(s),b=structuredClone(s);M.setOpen(a,true);M.setOpen(b,true);run(a,200);run(b,200);assert.deepEqual(a,b);assert.equal(a.day,2);assert.ok(a.lastReport.payroll>0);
 assert.ok(M.takeLoan(s).ok);assert.equal(s.loan,20000);assert.equal(M.takeLoan(s).ok,false);assert.ok(M.repayLoan(s).ok);assert.equal(s.loan,0);
 const saved=JSON.parse(JSON.stringify(a));assert.ok(M.validSave(saved));assert.equal(M.validSave({version:1}),false);saved.rooms[0].x=NaN;assert.equal(M.validSave(saved),false);
});

function visitor(s,extra={}){
 const p={id:s.nextId++,name:'Robin Test',condition:0,health:90,patience:100,x:13.5,z:17.5,stage:'gp',state:'queue',room:null,path:[],progress:0,billed:0,routeRevision:-1,wait:0,angle:0,thirst:25,bladder:20,confidence:.85,attempts:0,urgency:1,amenity:null,seat:null,bed:null,arrived:s.time,careStep:0,careHistory:[],supplyReserved:false,roomWait:0,...extra};s.patients.push(p);return p;
}
test('the previous hospital save migrates in place without losing rooms, patients or finances',()=>{
 const s=hospital();M.setOpen(s,true);run(s,35);const old=JSON.parse(JSON.stringify(s));
 for(const k of ['depthVersion','policies','research','contract','contractsWon','contractsFailed','contractCooldown','contractSequence','litter','litterRevision','rating','satisfaction','dayStart'])delete old[k];
 for(const a of old.staff)for(const k of ['trait','rank','experience','morale','payBonus','training'])delete a[k];
 for(const p of old.patients)for(const k of ['thirst','bladder','confidence','attempts','urgency','amenity','seat','bed','arrived'])delete p[k];
 const restored=M.restoreSave(old);assert.ok(restored);assert.equal(restored.cash,s.cash);assert.equal(restored.rooms.length,s.rooms.length);assert.equal(restored.patients.length,s.patients.length);assert.equal(restored.policies.fees,100);assert.ok(M.validSave(restored));run(restored,10);assert.ok(M.validSave(restored));
});
test('research needs actual staff in a furnished lab and persists a partially completed project',()=>{
 const s=hospital();assert.ok(M.startResearch(s,'protocols').ok);run(s,20);assert.equal(s.research.active.progress,0);
 const lab=room(s,'research',8,10);M.hire(s,'researcher');run(s,45);assert.ok(s.research.active.progress>0);
 const restored=M.restoreSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.research.active.progress,s.research.active.progress);run(restored,120);assert.ok(M.researched(restored,'protocols'));assert.equal(restored.research.active,null);
 assert.equal(M.startResearch(restored,'protocols').ok,false);assert.ok(M.startResearch(restored,'formulary').ok);assert.ok(lab.staff);
});
test('room refits cost money, take the room offline, and require engineering for later levels',()=>{
 const s=hospital(),r=s.rooms.find(r=>r.type==='gp'),a=s.staff.find(a=>a.id===r.staff),p=visitor(s,{confidence:.8}),before=M.diagnosisConfidence(s,r,a),cash=s.cash;
 assert.ok(M.upgradeRoom(s,r.id).ok);assert.ok(s.cash<cash);assert.equal(M.roomStatus(s,r).ready,false);run(s,13);assert.ok(M.roomStatus(s,r).ready);assert.ok(M.diagnosisConfidence(s,r,a)>before);assert.equal(M.upgradeRoom(s,r.id).ok,false);
 s.research.completed.push('engineering');p.state='service';p.room=r.id;assert.equal(M.upgradeRoom(s,r.id).ok,false);p.state='queue';p.room=null;assert.ok(M.upgradeRoom(s,r.id).ok);
});
test('training creates downtime, improves skill and raises wages; pay improves morale',()=>{
 const s=hospital(),a=s.staff.find(a=>a.type==='doctor'),skill=a.skill,wage=M.wage(a),cash=s.cash;
 assert.ok(M.trainStaff(s,a.id).ok);assert.ok(s.cash<cash);assert.equal(M.roomStatus(s,s.rooms.find(r=>r.id===a.room)).ready,false);run(s,70);assert.equal(a.training,null);assert.equal(a.rank,1);assert.ok(a.skill>skill);assert.ok(M.wage(a)>wage);
 a.morale=20;const before=M.dailyCost(s);assert.ok(M.raisePay(s,a.id).ok);assert.equal(a.morale,38);assert.ok(M.dailyCost(s)>before);
});
test('manual staff assignments swap cover without leaving two employees owning a room',()=>{
 const s=hospital(),a=s.staff.find(a=>a.type==='nurse'),other=s.staff.filter(a=>a.type==='nurse')[1],original=a.room,target=other.room;
 assert.ok(M.assignEmployee(s,a.id,target).ok);assert.equal(a.room,target);assert.equal(other.room,original);assert.equal(s.rooms.find(r=>r.id===target).staff,a.id);assert.equal(M.assignEmployee(s,a.id,s.rooms.find(r=>r.type==='gp').id).ok,false);
});
test('thirsty patients walk to a drinks machine, pay, and leave litter that a caretaker removes',()=>{
 const s=M.fresh();assert.ok(M.placeItem(s,'vending',10,16).ok);const p=visitor(s,{thirst:95});run(s,18);
 assert.ok(p.thirst<30);assert.equal(s.earned,12);assert.equal(s.litter.length,1);M.hire(s,'janitor');run(s,30);assert.equal(s.litter.length,0);
});
test('working toilets relieve bladder needs and nearby bins prevent drinks litter',()=>{
 const s=M.fresh();room(s,'toilets',3,16,3,3);const p=visitor(s,{x:8.5,z:17.5,bladder:95});run(s,28);assert.ok(p.bladder<25);
 assert.ok(M.placeItem(s,'vending',10,14).ok);assert.ok(M.placeItem(s,'bin',9,14).ok);p.thirst=96;p.needRetry=0;run(s,25);assert.ok(p.thirst<30);assert.equal(s.litter.length,0);
});
test('waiting benches reserve at most two places and unavailable amenities do not trap care',()=>{
 const s=M.fresh();M.placeItem(s,'bench',10,14);const patients=Array.from({length:4},()=>visitor(s));run(s,8);assert.equal(patients.filter(p=>p.seat).length,2);
 assert.ok(M.placeItem(s,'vending',9,18).ok);const thirsty=patients[0];thirsty.thirst=98;thirsty.needRetry=0;run(s,2);assert.equal(thirsty.state,'amenity');const vending=s.items.find(i=>i.type==='vending');assert.ok(M.removeItem(s,vending.id).ok);run(s,2);assert.equal(thirsty.state,'queue');assert.equal(thirsty.amenity,null);
});
test('fees, triage and diagnostic policies change the actual care calculations',()=>{
 const s=hospital(),r=s.rooms.find(r=>r.type==='gp'),a=s.staff.find(a=>a.id===r.staff),normal=M.serviceDuration(s,r),confidence=M.diagnosisConfidence(s,r,a);
 assert.ok(M.setPolicy(s,'diagnosis','fast').ok);assert.ok(M.serviceDuration(s,r)<normal);assert.ok(M.diagnosisConfidence(s,r,a)<confidence);
 M.setPolicy(s,'diagnosis','thorough');assert.ok(M.diagnosisConfidence(s,r,a)>confidence);assert.ok(M.serviceDuration(s,r)>normal);
 const first=visitor(s),urgent=visitor(s,{health:35,urgency:4});assert.ok(M.queuePriority(s,first,urgent)<0);M.setPolicy(s,'queue','urgent');assert.ok(M.queuePriority(s,first,urgent)>0);assert.equal(M.setPolicy(s,'fees',999).ok,false);
});
test('a failed treatment gets a second opinion, without charging a cure fee',()=>{
 const s=hospital(),r=s.rooms.find(r=>r.type==='pharmacy'),a=s.staff.find(a=>a.id===r.staff);run(s,30);a.energy=30;s.cleanliness=20;s.seed=123456;
 while(true){const seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;if(seed/4294967296>.98)break;s.seed=seed;}
 const p=visitor(s,{state:'service',stage:'pharmacy',room:r.id,progress:100,diagnosed:true,confidence:.55}),earned=s.earned;M.tick(s,.1);assert.equal(s.failedTreatments,1);assert.equal(s.earned,earned);assert.equal(p.stage,'gp');assert.equal(p.attempts,1);
});
test('closed intake finishes existing treatment while redirecting new queues',()=>{
 const s=hospital();run(s,30);const r=s.rooms.find(r=>r.type==='gp'),a=s.staff.find(a=>a.id===r.staff),p=visitor(s,{state:'service',room:r.id,progress:100}),waiting=visitor(s,{room:r.id});M.toggleRoom(s,r.id);M.tick(s,.1);assert.equal(p.diagnosed,true);assert.notEqual(waiting.state,'enter');assert.ok(M.roomStatus(s,r).ready);assert.equal(r.closed,true);
});
test('community and inspection contracts pay once and missed contracts impose their stated penalty',()=>{
 const s=hospital();s.cured=3;assert.ok(M.acceptContract(s,'grant').ok);const c=s.contract,cash=s.cash;s.cured+=6;M.tick(s,.1);assert.equal(s.contract,null);assert.equal(s.contractsWon,1);assert.equal(s.cash,cash+c.reward);M.tick(s,.1);assert.equal(s.cash,cash+c.reward);
 assert.equal(M.acceptContract(s,'inspection').ok,false);run(s,36);assert.ok(M.acceptContract(s,'inspection').ok);const penalty=s.contract.penalty,before=s.cash;s.contract.deadline=s.time+.1;M.tick(s,.2);assert.equal(s.contractsFailed,1);assert.equal(s.cash,before-penalty);
});
test('emergency contracts create exactly four urgent referrals and only count their cures',()=>{
 const s=hospital();s.cured=3;assert.ok(M.acceptContract(s,'emergency').ok);const uid=s.contract.uid;run(s,1);const referrals=s.patients.filter(p=>p.contract===uid);assert.equal(referrals.length,4);assert.ok(referrals.every(p=>p.urgency===4));s.cured+=10;assert.equal(M.contractProgress(s),0);run(s,160);assert.equal(s.contractsWon,1);assert.equal(s.contract,null);
});
test('hospital ratings provide one-time goals and retain all development details across save/load',()=>{
 const s=hospital();s.cured=30;s.reputation=70;const cash=s.cash;M.tick(s,.1);assert.equal(s.rating,1);assert.equal(s.cash,cash+8000);M.tick(s,.1);assert.equal(s.cash,cash+8000);
 s.cured=70;s.reputation=80;s.research.completed=['protocols','engineering'];s.staff[0].rank=1;s.staff[1].rank=1;M.tick(s,.1);assert.equal(s.rating,2);const copy=M.restoreSave(JSON.parse(JSON.stringify(s)));assert.ok(copy);assert.deepEqual(copy,s);
 copy.research.completed.push('unreal-project');assert.equal(M.validSave(copy),false);
});

test('furniture relocation is free, preserves identity, rotates, and rejects blocked or occupied placements atomically',()=>{
 const s=hospital(),r=s.rooms[0],item=M.roomItems(s,r).find(i=>i.type==='exam'),cash=s.cash,id=item.id;
 let destination;for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)if(M.canMoveItem(s,id,x,z,1).ok)destination={x,z};
 assert.ok(destination);assert.ok(M.moveItem(s,id,destination.x,destination.z,1).ok);assert.equal(item.id,id);assert.equal(item.rotation,1);assert.equal(s.cash,cash);assert.ok(M.interiorAccessible(s,r));
 const snapshot=structuredClone(s);assert.equal(M.moveItem(s,id,r.door.x,r.door.z).ok,false);assert.deepEqual(s,snapshot);
 visitor(s,{room:r.id,state:'enter'});assert.equal(M.moveItem(s,id,3,3).ok,false);
});
test('room extensions preserve furnishings, staff and level while charging only extra tiles and construction',()=>{
 const s=hospital(),r=s.rooms[0],before=structuredClone(r),items=structuredClone(M.roomItems(s,r)),cash=s.cash;
 const check=M.canExpandRoom(s,r.id,2,2,7,7);assert.ok(check.ok,check.error);assert.equal(check.cost,(49-25)*M.ROOM_TYPES.gp.tile+300);
 assert.ok(M.expandRoom(s,r.id,2,2,7,7).ok);assert.equal(s.cash,cash-check.cost);assert.equal(r.id,before.id);assert.equal(r.staff,before.staff);assert.equal(r.level,before.level);assert.deepEqual(M.roomItems(s,r),items);assert.ok(M.pathfind(s,M.ENTRY,r.door));
 const snapshot=structuredClone(s);assert.equal(M.expandRoom(s,r.id,10,2,7,7).ok,false);assert.equal(M.expandRoom(s,r.id,3,3,4,4).ok,false);assert.deepEqual(s,snapshot);
 visitor(s,{room:r.id,state:'service'});assert.equal(M.expandRoom(s,r.id,1,1,9,9).ok,false);
});
test('stock orders respect capacity, charge once, deliver on time, and persist while travelling',()=>{
 const s=M.fresh();s.stock.medicine=10;const cash=s.cash;assert.ok(M.orderSupplies(s,'medicine').ok);assert.equal(s.cash,cash-180);assert.equal(s.stock.medicine,10);assert.equal(s.deliveries.length,1);
 assert.ok(M.orderSupplies(s,'medicine').ok);assert.equal(s.deliveries[1].quantity,2);assert.equal(M.orderSupplies(s,'medicine').ok,false);
 run(s,44);assert.equal(s.stock.medicine,10);const restored=M.restoreSave(JSON.parse(JSON.stringify(s)));assert.ok(restored);run(restored,2);assert.equal(restored.stock.medicine,24);assert.equal(restored.deliveries.length,0);
 const broken=structuredClone(s);broken.stock.linen=-1;assert.equal(M.restoreSave(broken),null);
});
test('storage shelves increase capacity and unlock bulk prices; express deliveries arrive earlier',()=>{
 const s=M.fresh(),r=room(s,'store',3,3);assert.equal(M.storageShelves(s),1);assert.equal(M.stockCapacity(s,'medicine'),56);s.stock.medicine=0;
 const quote=M.supplyQuote(s,'medicine');assert.equal(quote.quantity,24);assert.equal(quote.cost,306);assert.ok(M.orderSupplies(s,'medicine').ok);const d=s.deliveries[0];assert.ok(M.rushDelivery(s,d.id).ok);assert.equal(M.rushDelivery(s,d.id).ok,false);run(s,9);assert.equal(s.stock.medicine,24);assert.equal(s.deliveries.length,0);
 M.toggleRoom(s,r.id);assert.equal(M.stockCapacity(s,'medicine'),24);assert.equal(M.supplyQuote(s,'medicine').quantity,0);
});
test('automatic ordering responds to clinical demand and funds, while manual mode waits for an order',()=>{
 const s=hospital();s.stock.medicine=0;s.cash=0;M.setOpen(s,true);M.tick(s,.1);assert.equal(s.deliveries.length,0);assert.ok(s.log.some(l=>l.title==='Supply budget warning'));
 s.cash=1000;M.tick(s,.1);assert.equal(s.deliveries.length,1);assert.equal(s.deliveries[0].type,'medicine');M.tick(s,.1);assert.equal(s.deliveries.length,1);
 const manual=hospital();M.setSupplyMode(manual,'manual');manual.stock.medicine=0;M.setOpen(manual,true);run(manual,1);assert.equal(manual.deliveries.length,0);
});
test('the last dose finishes an admitted case and empty stock keeps the next patient queued',()=>{
 const s=hospital();run(s,30);M.setSupplyMode(s,'manual');s.stock.medicine=1;const r=s.rooms.find(r=>r.type==='pharmacy');
 const p=visitor(s,{stage:'pharmacy',room:r.id,diagnosed:true,confidence:.99}),waiting=visitor(s,{stage:'pharmacy',room:r.id,diagnosed:true});M.tick(s,.1);assert.equal(p.state,'enter');assert.equal(s.stock.medicine,0);assert.equal(waiting.state,'queue');assert.equal(M.roomStatus(s,r).ready,true);assert.equal(M.roomStatus(s,r).intake,false);
 p.state='service';p.progress=100;p.x=20.5;p.z=5.5;s.seed=1;M.tick(s,.1);assert.equal(p.state,'exit');assert.equal(s.cured,1);assert.equal(waiting.state,'queue');assert.equal(s.stock.medicine,0);assert.ok(M.orderSupplies(s,'medicine',true).ok);run(s,9);assert.notEqual(waiting.state,'queue');
});
test('new departments unlock at their cure milestones and follow-up care counts a cure only after the final department',()=>{
 const s=hospital();assert.equal(M.canBuild(s,'psychiatry',8,10,4,4).ok,false);s.cured=10;const psych=room(s,'psychiatry',8,10);M.hire(s,'doctor');assert.equal(M.canBuild(s,'physio',8,16,4,4).ok,false);s.cured=22;const physio=room(s,'physio',8,16);M.hire(s,'specialist');run(s,30);assert.ok(M.roomStatus(s,psych).ready);assert.ok(M.roomStatus(s,physio).ready);
 const p=visitor(s,{condition:7,stage:'psychiatry',room:psych.id,state:'service',progress:100,diagnosed:true,confidence:.99}),cured=s.cured;s.seed=1;M.tick(s,.1);assert.equal(s.cured,cured);assert.equal(p.careStep,1);assert.equal(p.stage,'pharmacy');assert.deepEqual(p.careHistory.map(h=>h.stage),['psychiatry']);assert.ok(M.restoreSave(JSON.parse(JSON.stringify(s))));
 const pharmacy=s.rooms.find(r=>r.type==='pharmacy');p.room=pharmacy.id;p.stage='pharmacy';p.state='service';p.progress=100;s.seed=1;M.tick(s,.1);assert.equal(s.cured,cured+1);assert.equal(p.state,'exit');assert.deepEqual(p.careHistory.map(h=>h.stage),['psychiatry','pharmacy']);assert.ok(M.validSave(s));
});
test('a failed follow-up retains previous completed care when returning for a second opinion',()=>{
 const s=hospital();run(s,30);const r=s.rooms.find(r=>r.type==='ward');const p=visitor(s,{condition:9,careStep:1,careHistory:[{stage:'physio',time:1,fee:2600}],stage:'ward',room:r.id,state:'service',progress:100,diagnosed:true,confidence:.55});
 while(true){const seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;if(seed/4294967296>.99)break;s.seed=seed;}M.tick(s,.1);assert.equal(p.stage,'gp');assert.equal(p.careStep,1);assert.equal(p.careHistory.length,1);assert.equal(s.cured,0);
});
test('spare staff cover training without taking permanent ownership and hand back after the course',()=>{
 const s=hospital(),r=s.rooms[0],primary=s.staff.find(a=>a.id===r.staff);run(s,30);const spare=M.hire(s,'doctor').staff;assert.equal(spare.room,null);assert.ok(M.trainStaff(s,primary.id).ok);run(s,20);
 assert.equal(r.staff,primary.id);assert.equal(r.cover,spare.id);assert.equal(spare.covering,r.id);assert.equal(M.workingStaff(s,r),spare);assert.equal(M.roomStatus(s,r).ready,true);assert.equal(M.trainStaff(s,spare.id).ok,false);assert.ok(M.restoreSave(JSON.parse(JSON.stringify(s))));
 run(s,70);assert.equal(primary.training,null);assert.equal(r.cover,null);assert.equal(spare.covering,null);assert.equal(r.staff,primary.id);assert.equal(M.workingStaff(s,r),primary);
});
test('department statistics measure actual waiting and work, and existing 2.1 saves migrate operations in place',()=>{
 const s=hospital();M.setOpen(s,true);run(s,150);const r=s.rooms[0],m=M.roomMetrics(s,r);assert.ok(r.started>0);assert.ok(r.busyTime>0);assert.ok(m.utilisation>0&&m.utilisation<=100);assert.ok(m.averageWait>=0);assert.ok(m.casesPerDay>0);
 const old=structuredClone(s);for(const k of ['operationsVersion','stock','deliveries','supplyMode','supplySequence','lastDelivery','deliveryNotice'])delete old[k];for(const r of old.rooms)for(const k of ['cover','openedAt','busyTime','waitTotal','started'])delete r[k];for(const p of old.patients)for(const k of ['careStep','careHistory','supplyReserved','roomWait'])delete p[k];
 const restored=M.restoreSave(old);assert.ok(restored);assert.equal(restored.cash,s.cash);assert.equal(restored.rooms.length,s.rooms.length);assert.equal(restored.stock.medicine,24);assert.ok(M.validSave(restored));run(restored,5);assert.ok(M.validSave(restored));
});
test('firing a permanent provider promotes their temporary cover into the vacant assignment',()=>{
 const s=hospital(),r=s.rooms[0],primary=s.staff.find(a=>a.id===r.staff),spare=M.hire(s,'doctor').staff;run(s,30);assert.ok(M.trainStaff(s,primary.id).ok);run(s,15);assert.equal(r.cover,spare.id);
 assert.ok(M.fire(s,primary.id).ok);assert.equal(r.staff,spare.id);assert.equal(r.cover,null);assert.equal(spare.covering,null);assert.equal(spare.room,r.id);assert.ok(M.trainStaff(s,spare.id).ok);
});
test('a rehabilitation referral physically completes diagnosis, physiotherapy and ward aftercare',()=>{
 const s=hospital();s.cured=22;room(s,'physio',8,16);M.hire(s,'specialist');run(s,30);const before=s.cured,p=visitor(s,{condition:9,confidence:.99});run(s,150);
 assert.equal(s.cured,before+1);assert.deepEqual(p.careHistory.map(h=>h.stage),['physio','ward']);assert.equal(s.stock.linen,22);assert.ok(s.rooms.find(r=>r.type==='physio').busyTime>0);assert.ok(M.validSave(s));
});
