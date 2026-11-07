import {ROOM_TYPES,CONDITIONS} from './catalogue.js';

export const SUPPLIES={
 medicine:{name:'Medicines',unit:15,batch:12,capacity:24,extra:32,rooms:['pharmacy']},
 linen:{name:'Clean linen',unit:8,batch:12,capacity:24,extra:24,rooms:['ward','physio']},
 sterile:{name:'Sterile kits',unit:40,batch:6,capacity:12,extra:16,rooms:['surgery']},
};
const fail=error=>({ok:false,error});
function record(s,title,text,kind='info'){s.log.unshift({title,text,kind,time:s.time});s.log.length=Math.min(40,s.log.length);}
export function initializeOperations(s){
 s.operationsVersion=1;s.stock??={medicine:24,linen:24,sterile:12};s.deliveries??=[];s.supplyMode??='automatic';s.supplySequence??=0;s.deliveryNotice??=-100;s.lastDelivery??=-100;
 for(const r of s.rooms){r.cover??=null;r.openedAt??=s.time;r.busyTime??=0;r.waitTotal??=0;r.started??=0;}
 for(const a of s.staff)a.covering??=null;
 for(const p of s.patients){p.careStep??=0;p.careHistory??=[];p.supplyReserved??=false;p.roomWait??=0;}
 return s;
}
export function carePlan(p){const c=CONDITIONS[p.condition];return c.journey||[c.treatment];}
export function supplyFor(type){return Object.keys(SUPPLIES).find(k=>SUPPLIES[k].rooms.includes(type))||null;}
export function storageShelves(s){return s.items.filter(i=>i.type==='shelves'&&s.rooms.some(r=>r.id===i.room&&r.type==='store'&&!r.closed&&r.upgrading<=0)).length;}
export function stockCapacity(s,key){return SUPPLIES[key].capacity+storageShelves(s)*SUPPLIES[key].extra;}
export function supplyReady(s,type){const k=supplyFor(type);return !k||s.stock[k]>=1;}
export function reserveSupply(s,p,type){if(p.supplyReserved)return true;const k=supplyFor(type);if(k){if(s.stock[k]<1)return false;s.stock[k]--;p.supplyReserved=true;}return true;}
export function supplyQuote(s,key,rush=false){
 const t=SUPPLIES[key];if(!t)return null;
 const incoming=s.deliveries.filter(d=>d.type===key).reduce((n,d)=>n+d.quantity,0),free=Math.max(0,stockCapacity(s,key)-s.stock[key]-incoming);
 const bulk=storageShelves(s)>0,quantity=Math.min(free,t.batch*(bulk?2:1));
 return {quantity,cost:Math.round(quantity*t.unit*(bulk?.85:1)*(rush?1.8:1)),eta:rush?8:45};
}
export function orderSupplies(s,key,rush=false){
 if(s.deliveries.length>=30)return fail('Wait for an incoming delivery before placing another order.');
 const q=supplyQuote(s,key,rush);if(!q)return fail('Choose a supply category.');if(q.quantity<=0)return fail('That stock is full or already on its way.');if(s.cash<q.cost)return fail('The delivery needs $'+q.cost+'.');
 s.cash-=q.cost;s.spent+=q.cost;s.deliveries.push({id:++s.supplySequence,type:key,quantity:q.quantity,eta:q.eta,orderedAt:s.time,arrival:s.time+q.eta,rush});
 record(s,rush?'Express supplies ordered':'Supplies ordered',q.quantity+' '+SUPPLIES[key].name.toLowerCase()+' arrive in '+q.eta+'s.');return {ok:true};
}
export function rushDelivery(s,id){
 const d=s.deliveries.find(d=>d.id===id);if(!d)return fail('That delivery has already arrived.');if(d.arrival-s.time<=8)return fail('The delivery is already close.');
 const cost=Math.max(50,Math.round(d.quantity*SUPPLIES[d.type].unit*.8));if(s.cash<cost)return fail('Express delivery needs $'+cost+'.');
 s.cash-=cost;s.spent+=cost;d.arrival=s.time+8;d.rush=true;return {ok:true};
}
export function setSupplyMode(s,mode){if(!['automatic','manual'].includes(mode))return fail('Choose automatic or manual ordering.');s.supplyMode=mode;return {ok:true};}
export function suppliesTick(s){
 for(const d of [...s.deliveries])if(s.time>=d.arrival){
  s.stock[d.type]+=d.quantity;s.deliveries=s.deliveries.filter(x=>x!==d);s.lastDelivery=s.time;record(s,'Delivery received',d.quantity+' '+SUPPLIES[d.type].name.toLowerCase()+' unloaded at reception.','good');
 }
 if(s.supplyMode!=='automatic'||!s.open&&!s.patients.length)return;
 for(const [key,t]of Object.entries(SUPPLIES))if(s.stock[key]<=Math.ceil(t.batch/2)&&!s.deliveries.some(d=>d.type===key)&&s.rooms.some(r=>t.rooms.includes(r.type))){
  const result=orderSupplies(s,key);if(!result.ok&&s.time-s.deliveryNotice>45){record(s,'Supply budget warning','Automatic ordering is waiting for enough cash. Departments may need to pause intake.','bad');s.deliveryNotice=s.time;}
 }
}
export function operationsSaveValid(s){
 if(s.operationsVersion===undefined)return true;
 if(s.operationsVersion!==1||!s.stock||!Object.keys(SUPPLIES).every(k=>Number.isInteger(s.stock[k])&&s.stock[k]>=0)||!['automatic','manual'].includes(s.supplyMode))return false;
 if(!Array.isArray(s.deliveries)||s.deliveries.length>30||!s.deliveries.every(d=>SUPPLIES[d.type]&&Number.isInteger(d.quantity)&&d.quantity>0&&Number.isFinite(d.arrival)))return false;
 return s.rooms.every(r=>[r.openedAt,r.busyTime,r.waitTotal,r.started].every(Number.isFinite))&&s.patients.every(p=>Number.isInteger(p.careStep)&&p.careStep>=0&&p.careStep<carePlan(p).length&&Array.isArray(p.careHistory));
}
