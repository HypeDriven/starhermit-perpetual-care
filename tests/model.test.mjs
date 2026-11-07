import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh, tick, buy, admit, discharge, rescue, mode, validSave, chooseEvent, capacity, GOAL } from '../src/model.js';

test('admissions respect bed capacity and retain unique patients',()=>{
 const s=fresh(()=>.5);assert.equal(admit(s),true);assert.equal(admit(s),true);assert.equal(s.patients.length,capacity(s));s.queue.push({...s.patients[0],id:99});assert.equal(admit(s),false);assert.equal(new Set(s.patients.map(p=>p.id)).size,8);
});
test('care has opposite effects and intervention has a cost and cooldown',()=>{
 const s=fresh(()=>.5);const p=s.patients[0],initial=p.health;tick(s,1);assert.ok(p.health<initial);mode(s,p.id,'stabilize');const low=p.health;tick(s,1);assert.ok(p.health>low);const cash=s.cash;assert.equal(rescue(s,p.id),true);assert.equal(s.cash,cash-1200);assert.equal(rescue(s,p.id),false);
});
test('upgrades charge cash once, honor limits, and expand the hospital',()=>{
 const s=fresh(()=>.5);assert.ok(buy(s,'ward'));assert.equal(capacity(s),12);assert.equal(s.cash,7500);assert.equal(buy(s,'ward'),false);assert.equal(buy(s,'unknown'),false);
});
test('dead and recovered patients stop occupying beds',()=>{
 const s=fresh(()=>.5);s.patients[0].health=.01;const id=s.patients[0].id;tick(s,1);assert.equal(s.deaths,1);assert.equal(s.patients.some(p=>p.id===id),false);const p=s.patients[0];p.health=99;p.escape=7;mode(s,p.id,'recover');tick(s,1);assert.equal(s.patients.some(q=>q.id===p.id),false);assert.equal(s.discharges,1);
});
test('events pause the simulation and resolve only once',()=>{
 const s=fresh(()=>.5);tick(s,35);assert.ok(s.event);const elapsed=s.elapsed;tick(s,5);assert.equal(s.elapsed,elapsed);const cash=s.cash;chooseEvent(s,0);assert.equal(s.event,null);assert.equal(s.cash,cash+3000);chooseEvent(s,0);assert.equal(s.cash,cash+3000);
});
test('neglect ends a run; a managed hospital can finish all seven days',()=>{
 const neglected=fresh(()=>.5);for(let i=0;i<560&&!neglected.ended;i++){if(neglected.event)chooseEvent(neglected,1);tick(neglected,1);}assert.equal(neglected.ended.win,false);assert.ok(neglected.deaths>=3);
 const s=fresh(()=>.5);for(let i=0;i<560&&!s.ended;i++){if(s.event)chooseEvent(s,1);for(const p of s.patients)mode(s,p.id,p.health<53?'stabilize':'observe');if(s.cash>15000&&s.levels.coding<2)buy(s,'coding');if(s.cash>14000&&s.levels.compliance<2)buy(s,'compliance');if(s.patients.length<capacity(s))admit(s);tick(s,1);}assert.equal(s.day,7);assert.equal(s.deaths,0);assert.ok(s.revenue>=GOAL);assert.equal(s.ended.win,true);assert.equal(s.audits,3);
});
test('save validation and voluntary discharge preserve simulation invariants',()=>{
 const s=fresh(()=>.5);assert.ok(validSave(JSON.parse(JSON.stringify(s))));assert.equal(validSave({version:1}),false);const p=s.patients[0];p.health=50;const scrutiny=s.scrutiny;assert.ok(discharge(s,p.id));assert.equal(s.scrutiny,scrutiny-4);assert.equal(discharge(s,p.id),false);
});

test('a completed fractional frame remains loadable',()=>{
 const s=fresh(()=>.5);s.elapsed=559.9;s.revenue=GOAL;s.day=7;s.eventIndex=3;tick(s,.4);assert.equal(s.elapsed,560);assert.equal(s.ended.win,true);assert.ok(validSave(s));
});
