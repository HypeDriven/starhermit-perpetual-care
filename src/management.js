// Persistent hospital policy, professional development, research and contracts.
// Navigation and clinical flow live in model.js; this module changes only data.
import {ROOM_TYPES,EQUIPMENT,STAFF_TYPES,CONDITIONS} from './catalogue.js';
import {initializeOperations,operationsSaveValid} from './operations.js';

export const RESEARCH={
 protocols:{name:'Diagnostic protocols',cost:2200,work:90,description:'+7% diagnostic confidence throughout the hospital.'},
 formulary:{name:'Better medicines',cost:3400,work:130,requires:['protocols'],description:'+6% treatment success and 15% faster pharmacy care.'},
 engineering:{name:'Reliable machines',cost:3000,work:110,description:'35% less machine wear; unlocks level III and IV room refits.'},
 training:{name:'Teaching hospital',cost:2800,work:100,requires:['protocols'],description:'Staff train 35% faster and gain experience twice as quickly.'},
 hospitality:{name:'Patient hospitality',cost:2000,work:95,description:'Amenities restore more comfort; queuing patients lose patience 20% slower.'},
 precision:{name:'Precision medicine',cost:5000,work:160,requires:['formulary','engineering'],cures:16,description:'+5% success in advanced departments; thorough diagnoses are faster.'},
};
export const TRAITS={
 steady:{name:'Steady hands',description:'+3% treatment success.'},
 quick:{name:'Quick thinker',description:'Works 10% faster.'},
 kind:{name:'People person',description:'Calms nearby waiting patients.'},
 learner:{name:'Fast learner',description:'Trains 40% faster.'},
 tireless:{name:'Tireless',description:'Uses 20% less energy.'},
};
export const POLICY_CHOICES={fees:[80,100,125],queue:['fifo','urgent'],diagnosis:['balanced','thorough','fast'],maintenance:['balanced','preventive','economy']};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fail=error=>({ok:false,error});
function record(s,title,text,kind='info'){s.log.unshift({title,text,kind,time:s.time});s.log.length=Math.min(40,s.log.length);}
function spend(s,n){s.cash-=n;s.spent+=n;}
function earn(s,n){s.cash+=n;s.earned+=n;}
const price=n=>'$'+Math.round(n).toLocaleString('en-US');
export function initializeDepth(s){
 s.depthVersion=1;
 s.policies={fees:100,queue:'fifo',diagnosis:'balanced',maintenance:'balanced',...s.policies};
 s.research??={completed:[],active:null};s.contract??=null;s.contractsWon??=0;s.contractsFailed??=0;s.contractCooldown??=0;s.contractSequence??=0;
 s.litter??=[];s.litterRevision??=0;s.failedTreatments??=0;s.rating??=s.won?1:0;s.satisfaction??=75;
 s.dayStart??={earned:s.earned,spent:s.spent,cured:s.cured,lost:s.lost};
 for(const r of s.rooms){r.level??=0;r.closed??=false;r.upgrading??=0;}
 const traits=Object.keys(TRAITS);
 for(const a of s.staff){a.trait??=traits[a.id%traits.length];a.rank??=0;a.experience??=0;a.morale??=85;a.payBonus??=0;a.training??=null;}
 for(const p of s.patients){p.thirst??=25;p.bladder??=20;p.confidence??=0;p.attempts??=0;p.urgency??=1;p.amenity??=null;p.seat??=null;p.bed??=null;p.arrived??=s.time;}
 return initializeOperations(s);
}
export const researched=(s,id)=>s.research.completed.includes(id);
export const wage=a=>Math.round(STAFF_TYPES[a.type].wage*(1+a.rank*.15+a.payBonus));
export function setPolicy(s,key,value){if(!POLICY_CHOICES[key]?.includes(value))return fail('Choose one of the listed policies.');s.policies[key]=value;record(s,'Policy updated',key==='fees'?'Treatment fees are now '+value+'% of the standard tariff.':key==='queue'?(value==='urgent'?'Urgent patients move to the front of clinical queues.':'Patients are treated in arrival order.'):'The '+key+' policy is now '+value+'.');return {ok:true};}
export function researchAvailable(s,id){
 const r=RESEARCH[id];if(!r)return 'Choose a research project.';
 if(researched(s,id))return 'Research complete.';
 if(r.cures&&s.cured<r.cures)return 'Requires '+r.cures+' cures.';
 const missing=(r.requires||[]).filter(p=>!researched(s,p));if(missing.length)return 'First research '+missing.map(p=>RESEARCH[p].name.toLowerCase()).join(' and ')+'.';
 return null;
}
export function startResearch(s,id){
 const why=researchAvailable(s,id);if(why)return fail(why);
 if(s.research.active)return fail('Finish the current project first.');
 const r=RESEARCH[id];if(s.cash<r.cost)return fail('Research funding needs '+price(r.cost)+'.');
 spend(s,r.cost);s.research.active={id,progress:0};record(s,'Research commissioned',r.name+'. A furnished lab and researcher will carry out the work.','good');return {ok:true};
}
export function roomQuality(s,r){const decor=s.items.filter(i=>i.room===r.id&&['plant','radiator'].includes(i.type)).length;return clamp(48+Math.min(24,r.w*r.h*.9)+Math.min(12,decor*4)+(r.level||0)*6,0,100);}
export function upgradeCost(r){return Math.round((1800+ROOM_TYPES[r.type].base*.4)*(1+(r.level||0)*.75));}
export function upgradeRoom(s,id){
 const r=s.rooms.find(r=>r.id===id);if(!r)return fail('Choose a room first.');
 if((r.level||0)>=3)return fail('This room is fully upgraded.');
 if(r.level>=1&&!researched(s,'engineering'))return fail('Research Reliable machines to unlock level III and IV refits.');
 if(r.upgrading>0)return fail('The refit is already underway.');
 if(s.patients.some(p=>p.room===id&&['enter','service'].includes(p.state)))return fail('Pause room intake and finish the current treatment before refitting.');
 if(s.patients.some(p=>p.amenity&&s.items.some(i=>i.id===p.amenity.id&&i.room===id))||s.staff.some(a=>a.resting&&a.restRoom===id))return fail('Pause room intake and wait for the current visitors to leave before refitting.');
 const cost=upgradeCost(r);if(s.cash<cost)return fail('This refit costs '+price(cost)+'.');
 spend(s,cost);r.level=(r.level||0)+1;r.upgrading=12;r.condition=100;s.revision++;
 record(s,'Refit approved',ROOM_TYPES[r.type].name+' upgrade '+r.level+' will be ready in 12 seconds.','good');return {ok:true};
}
export function toggleRoom(s,id){const r=s.rooms.find(r=>r.id===id);if(!r)return fail('Choose a room first.');r.closed=!r.closed;return {ok:true};}
export function trainingCost(a){return 900+700*(a.rank||0);}
export function trainStaff(s,id){
 const a=s.staff.find(a=>a.id===id);if(!a)return fail('Choose an employee.');
 if(a.covering)return fail('Finish temporary cover before starting a course.');
 if(a.training)return fail('Training is already in progress.');if(a.rank>=3)return fail('This employee has completed all training.');
 if(s.patients.some(p=>p.room===a.room&&['enter','service'].includes(p.state)))return fail('Let this employee finish their current patient first.');
 const cost=trainingCost(a);if(s.cash<cost)return fail('Training costs '+price(cost)+'.');
 spend(s,cost);a.training={remaining:45+15*a.rank,total:45+15*a.rank};a.resting=false;record(s,'Professional development',a.name+' is attending training. Their room temporarily needs cover.');return {ok:true};
}
export function raisePay(s,id){const a=s.staff.find(a=>a.id===id);if(!a)return fail('Choose an employee.');if(a.payBonus>=.5)return fail('The maximum pay bonus is 50%.');a.payBonus=Math.min(.5,a.payBonus+.1);a.morale=clamp(a.morale+18,0,100);record(s,'A little appreciation',a.name+' receives a permanent 10% pay increase.');return {ok:true};}
export function assignEmployee(s,id,roomId){
 const a=s.staff.find(a=>a.id===id),r=s.rooms.find(r=>r.id===roomId);
 if(!a||!r||ROOM_TYPES[r.type].staff!==a.type)return fail('Choose a room matching this employee’s role.');
 if(a.covering)return fail('Finish temporary cover before changing assignments.');
 const current=s.rooms.find(r=>r.id===a.room);
 if(s.patients.some(p=>(p.room===r.id||p.room===current?.id)&&['enter','service'].includes(p.state)))return fail('Wait until both employees have finished their patients.');
 const other=s.staff.find(b=>b.id===r.staff);
 if(current)current.staff=other?.id||null;
 if(other){other.room=current?.id||null;other.path=[];other.routeRevision=-1;other.resting=false;}
 r.staff=a.id;a.room=r.id;a.path=[];a.routeRevision=-1;a.resting=false;return {ok:true};
}
export function diagnosisConfidence(s,r,a){return clamp(.77+(a.skill-1)*.19+(r.level||0)*.025+(roomQuality(s,r)-65)*.001+(researched(s,'protocols')?.07:0)+(s.policies.diagnosis==='thorough'?.07:s.policies.diagnosis==='fast'?-.09:0),.55,.99);}
export function treatmentChance(s,r,a,p){return clamp(.87+(a.skill-1)*.12+(r.level||0)*.022+(a.trait==='steady'?.03:0)+(p.confidence-.8)*.35+(r.condition-70)*.00045+(researched(s,'formulary')?.06:0)+(researched(s,'precision')&&['scanner','surgery'].includes(r.type)?.05:0)-(a.energy<25?.07:0)-(s.cleanliness<65?.06:0)-(r.type==='surgery'?.05:r.type==='scanner'?.02:0),.55,.995);}
export function serviceDuration(s,r){let n=ROOM_TYPES[r.type].time||1;n/=1+(r.level||0)*.12;if(r.type==='gp')n*=s.policies.diagnosis==='thorough'?(researched(s,'precision')?1.08:1.25):s.policies.diagnosis==='fast'?.8:1;if(r.type==='pharmacy'&&researched(s,'formulary'))n*=.85;return n;}
export function queuePriority(s,a,b){if(s.policies.queue==='urgent'){const ua=(a.urgency||1)+(100-a.health)/25,ub=(b.urgency||1)+(100-b.health)/25;if(Math.abs(ua-ub)>.1)return ub-ua;}return a.id-b.id;}
function equipped(s,type){return s.rooms.some(r=>r.type===type&&r.condition>10&&r.staff&&ROOM_TYPES[type].required.every(t=>s.items.some(i=>i.room===r.id&&i.type===t)));}
export function contractOffers(s){
 return [
  {id:'grant',name:'Community care grant',description:'Cure six patients in three minutes. Every successful discharge counts.',target:6,duration:180,reward:4500,penalty:700,ready:s.cured>=3},
  {id:'inspection',name:'Quality inspection',description:'Two cures, no deaths or walkouts, and at least 85% cleanliness when the inspector returns.',target:2,duration:120,reward:3800,penalty:500,ready:s.cured>=3},
  {id:'emergency',name:'Emergency referral',description:'Four urgent arrivals need care within three minutes. Prepare space and consider urgent-first triage.',target:4,duration:180,reward:6500,penalty:1200,ready:s.cured>=3&&equipped(s,'gp')&&(equipped(s,'pharmacy')||equipped(s,'ward'))},
 ];
}
export function acceptContract(s,id){
 if(s.contract)return fail('Finish the active contract first.');if(s.time<s.contractCooldown)return fail('New contracts are available after the current review period.');
 const offer=contractOffers(s).find(c=>c.id===id);if(!offer?.ready)return fail('Cure three patients and prepare the required departments first.');
 const c={...offer,uid:++s.contractSequence,start:s.time,deadline:s.time+offer.duration,baseline:s.cured,lost:s.lost,cured:0,pending:0};
 if(id==='emergency'){c.treatment=equipped(s,'pharmacy')?'pharmacy':'ward';c.condition=CONDITIONS.findIndex(v=>v.treatment===c.treatment);c.pending=4;}
 s.contract=c;record(s,'Contract accepted',offer.name+'. The deadline is '+offer.duration+' simulation seconds away.','good');return {ok:true};
}
export function contractProgress(s){const c=s.contract;if(!c)return 0;return c.id==='emergency'?c.cured:s.cured-c.baseline;}
function finishContract(s,success){const c=s.contract;if(success){earn(s,c.reward);s.contractsWon++;s.reputation=clamp(s.reputation+3,0,100);}else{spend(s,c.penalty);s.contractsFailed++;s.reputation=clamp(s.reputation-2,0,100);}record(s,success?'Contract completed':'Contract missed',c.name+(success?' · '+price(c.reward)+' awarded.':' · '+price(c.penalty)+' administrative penalty.'),success?'good':'bad');s.contract=null;s.contractCooldown=s.time+35;}
export function hospitalRatings(s){return [
 {stars:1,title:'A promising practice',reward:8000,done:s.cured>=30&&s.reputation>=65&&s.rooms.length>=5,requirements:'30 cures · 65 reputation · 5 rooms'},
 {stars:2,title:'A regional institution',reward:12000,done:s.cured>=70&&s.reputation>=75&&s.research.completed.length>=2&&s.staff.filter(a=>a.rank>0).length>=2,requirements:'70 cures · 75 reputation · 2 discoveries · 2 trained staff'},
 {stars:3,title:'A centre of excellence',reward:18000,done:s.cured>=130&&s.reputation>=85&&s.contractsWon>=3&&s.research.completed.length>=5&&s.rooms.filter(r=>r.level>=2).length>=3,requirements:'130 cures · 85 reputation · 3 contracts · 5 discoveries · 3 level-III rooms'},
 ];}
export function developmentTick(s,dt,researchPower){
 for(const r of s.rooms)r.upgrading=Math.max(0,r.upgrading-dt);
 const project=s.research.active;
 if(project&&researchPower>0){project.progress+=dt*researchPower;if(project.progress>=RESEARCH[project.id].work){s.research.completed.push(project.id);record(s,'Research complete',RESEARCH[project.id].name+' is now in use throughout the hospital.','good');s.research.active=null;}}
 if(s.contract){const c=s.contract,progress=contractProgress(s);if(c.id!=='inspection'&&progress>=c.target)finishContract(s,true);else if(s.time>=c.deadline)finishContract(s,progress>=c.target&&(c.id!=='inspection'||s.lost===c.lost&&s.cleanliness>=85));}
 const next=hospitalRatings(s)[s.rating];if(next?.done){s.rating=next.stars;s.won=true;earn(s,next.reward);record(s,'Hospital rating: '+next.stars+' star'+(next.stars>1?'s':''),next.title+' · '+price(next.reward)+' development grant.','good');}
}
export function depthSaveValid(s){
 if(s.depthVersion===undefined)return true;
 if(s.depthVersion!==1||!s.policies||!Object.entries(POLICY_CHOICES).every(([k,v])=>v.includes(s.policies[k])))return false;
 if(!s.research||!Array.isArray(s.research.completed)||s.research.completed.some(id=>!RESEARCH[id])||new Set(s.research.completed).size!==s.research.completed.length)return false;
 const active=s.research.active;if(active&&(!RESEARCH[active.id]||!Number.isFinite(active.progress)||active.progress<0||s.research.completed.includes(active.id)))return false;
 if(!Array.isArray(s.litter)||s.litter.length>80||!s.litter.every(l=>Number.isInteger(l.id)&&Number.isFinite(l.x)&&Number.isFinite(l.z)))return false;
 return Number.isInteger(s.rating)&&s.rating>=0&&s.rating<=3&&s.staff.every(a=>TRAITS[a.trait]&&Number.isInteger(a.rank)&&a.rank>=0&&a.rank<=3&&Number.isFinite(a.morale)&&Number.isFinite(a.payBonus)&&(!a.training||Number.isFinite(a.training.remaining)&&Number.isFinite(a.training.total)))&&s.patients.every(p=>[p.thirst,p.bladder,p.confidence,p.attempts].every(Number.isFinite))&&(!s.contract||['grant','inspection','emergency'].includes(s.contract.id)&&Number.isFinite(s.contract.deadline))&&operationsSaveValid(s);
}
