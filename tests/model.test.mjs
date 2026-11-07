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
