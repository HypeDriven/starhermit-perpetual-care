import * as M from './model.js';

export function drawManagement({s,x,y,w,h,section,scroll,selected,onTab,onClose,onBuild,onInspect,result,ui}){
 const {rect,text,label,wrap,button,bar,C}=ui;
 rect(x,y,w,h,C.paper,13);label('ST. MARGIN · MANAGEMENT DESK',x+24,y+23);
 text('Good care takes good decisions.',x+24,y+46,w<600?25:31,C.ink,500,'serif');
 const tabs=[['policies','Policies'],['research','Research'],['people','People'],['rooms','Rooms'],['contracts','Contracts']];
 tabs.forEach(([id,name],i)=>button(name,x+18+i*(w-36)/5,y+96,(w-44)/5,32,()=>onTab(id),section===id?'selected':'plain'));
 const left=x+24,iw=w-48,bodyY=y+145,bottom=y+h-72;
 let cursor=bodyY-scroll;
 function row(height,paint){if(cursor>=bodyY&&cursor+height<=bottom){rect(left,cursor,iw,height-8,C.white,8);paint(left+14,cursor+12,iw-28);}cursor+=height;}
 const action=(r,msg)=>result(r,msg);
 if(section==='policies'){
  const choices=[
   ['fees','Treatment fees','Lower fees bring more patients. Premium fees pay more, but patience runs out faster.',[[80,'80% · Community'],[100,'100% · Standard'],[125,'125% · Premium']]],
   ['queue','Clinical triage','Urgent-first considers referral priority and declining health; reception still checks everyone in.',[['fifo','Arrival order'],['urgent','Urgent first']]],
   ['diagnosis','Diagnosis policy','Thorough appointments improve confidence. Fast appointments shorten queues, with more treatment risk.',[['fast','Fast'],['balanced','Balanced'],['thorough','Thorough']]],
   ['maintenance','Maintenance policy','Preventive care repairs below 95% and adds $100/day. Economy waits until 45%; balanced repairs below 80%.',[['economy','Economy'],['balanced','Balanced'],['preventive','Preventive']]],
  ];
  for(const[key,name,description,options]of choices)row(128,(xx,yy,ww)=>{
   text(name,xx,yy,17,C.ink,600);wrap(description,xx,yy+28,ww,11,C.muted,16);
   const bw=(ww-(options.length-1)*7)/options.length;
   options.forEach(([value,title],i)=>button(title,xx+i*(bw+7),yy+77,bw,28,()=>action(M.setPolicy(s,key,value),'Policy updated.'),s.policies[key]===value?'selected':'plain'));
  });
  row(105,(xx,yy,ww)=>{
   text('The accounts',xx,yy,19,C.ink,500,'serif');text('Income '+M.money(s.earned)+' · Spending '+M.money(s.spent),xx,yy+30,12,C.green);text('Daily overhead '+M.money(M.dailyCost(s))+' · Satisfaction '+Math.round(s.satisfaction)+'%',xx,yy+53,11,C.muted);
  });
  if(s.lastReport)row(105,(xx,yy,ww)=>{const r=s.lastReport;text('Day '+r.day+' report',xx,yy,18,C.ink,500,'serif');text(r.cured+' cures · '+(r.lost||0)+' walkouts / losses',xx,yy+29,12);text('Income '+M.money(r.earned)+' · Outgoings '+M.money(r.spent||r.payroll),xx,yy+52,12,C.muted);});
  for(const r of M.hospitalRatings(s))row(97,(xx,yy,ww)=>{text('★'.repeat(r.stars)+'  '+r.title,xx,yy,17,s.rating>=r.stars?C.green:C.ink,500,'serif');wrap(r.requirements,xx,yy+29,ww,11,C.muted,16);text(s.rating>=r.stars?'Development grant awarded':'Development grant '+M.money(r.reward),xx,yy+62,11,s.rating>=r.stars?C.green:C.orange);});
 }else if(section==='research'){
  row(123,(xx,yy,ww)=>{
   const active=s.research.active,staff=s.staff.filter(a=>a.type==='researcher'),working=staff.filter(a=>!a.training&&!a.resting&&!a.path.length&&s.rooms.some(r=>r.id===a.room&&!r.closed&&M.roomStatus(s,r).ready)).length;
   text(active?M.RESEARCH[active.id].name:'A little curiosity goes a long way.',xx,yy,ww<450?18:21,C.ink,500,'serif');
   text(working+' active researchers · '+s.research.completed.length+' discoveries',xx,yy+31,12,C.muted);
   if(active){bar(xx,yy+57,ww,active.progress/M.RESEARCH[active.id].work);text(working?'Research advances while the hospital is running.':'Waiting for a furnished lab and an available researcher.',xx,yy+75,11,working?C.green:C.orange);}
   else wrap('Fund a project, then run a furnished lab with a researcher. Benefits apply to every department.',xx,yy+56,ww,12,C.muted,17);
  });
  row(57,(xx,yy,ww)=>button('Build a research lab',xx,yy,ww,29,onBuild,'primary'));
  for(const[id,r]of Object.entries(M.RESEARCH))row(126,(xx,yy,ww)=>{
   const complete=M.researched(s,id),active=s.research.active?.id===id,why=M.researchAvailable(s,id);
   text(r.name,xx,yy,17,complete?C.green:C.ink,600);wrap(r.description,xx,yy+27,ww,12,C.muted,17);
   const title=complete?'✓ Complete':active?'In progress':'Fund '+M.money(r.cost);
   button(title,xx,yy+77,Math.min(ww,176),28,()=>action(M.startResearch(s,id),'Research funded. Keep the lab staffed.'),complete?'selected':'plain',complete||!!s.research.active||!!why);
   if(!complete&&!active)wrap(why||r.work+'s with one researcher',xx+Math.min(ww,176)+10,yy+79,ww-Math.min(ww,176)-10,10,C.muted,13);
  });
 }else if(section==='people'){
  if(!s.staff.length)row(100,(xx,yy,ww)=>{text('A hospital needs people.',xx,yy,21,C.ink,500,'serif');wrap('Hire staff from the Staff catalogue, then return here to train them, raise their pay and assign departments.',xx,yy+35,ww,12);});
  const people=[...s.staff].sort((a,b)=>(selected?.kind==='staff'&&a.id===selected.id?-1:selected?.kind==='staff'&&b.id===selected.id?1:a.id-b.id));
  for(const a of people)row(183,(xx,yy,ww)=>{
   const room=s.rooms.find(r=>r.id===a.room),rooms=s.rooms.filter(r=>M.ROOM_TYPES[r.type].staff===a.type);
   text(a.name+' · '+M.STAFF_TYPES[a.type].name,xx,yy,ww<450?15:18,C.ink,600);text('Level '+(a.rank+1)+' · '+M.money(M.wage(a))+'/day · '+a.experience+' cases',xx,yy+26,11,C.muted);
   text(M.TRAITS[a.trait].name+' · '+M.TRAITS[a.trait].description,xx,yy+47,11,C.green);
   const half=(ww-20)/2;label('ENERGY '+Math.round(a.energy)+'%',xx,yy+70);bar(xx,yy+88,half,a.energy/100);label('MORALE '+Math.round(a.morale)+'%',xx+half+20,yy+70);bar(xx+half+20,yy+88,half,a.morale/100,a.morale<30?C.orange:C.green);
   text(a.training?'Training · '+Math.ceil(a.training.remaining)+'s remaining':a.resting?'Taking a break':room?'Assigned: '+M.ROOM_TYPES[room.type].name+' #'+room.id:'Waiting for a matching room',xx,yy+101,11,C.muted);
   const gap=6,bw=(ww-gap*2)/3;
   button(a.training?'Training…':a.rank>=3?'Fully trained':'Train '+M.money(M.trainingCost(a)),xx,yy+130,bw,28,()=>action(M.trainStaff(s,a.id),'Training started.'),'plain',!!a.training||a.rank>=3);
   button('+10% pay',xx+bw+gap,yy+130,bw,28,()=>action(M.raisePay(s,a.id),'Pay and morale updated.'),'plain',a.payBonus>=.5);
   button('Next room',xx+(bw+gap)*2,yy+130,bw,28,()=>{const next=rooms[(rooms.findIndex(r=>r.id===a.room)+1)%rooms.length];action(M.assignEmployee(s,a.id,next.id),'Assignment updated.');},'plain',rooms.length===0);
  });
 }else if(section==='rooms'){
  if(!s.rooms.length)row(88,(xx,yy,ww)=>{text('Make room for good care.',xx,yy,21,C.ink,500,'serif');wrap('Build your first room to unlock refits, intake controls and department performance.',xx,yy+34,ww,12);});
  const rooms=[...s.rooms].sort((a,b)=>(selected?.kind==='room'&&a.id===selected.id?-1:selected?.kind==='room'&&b.id===selected.id?1:a.id-b.id));
  for(const r of rooms)row(171,(xx,yy,ww)=>{
   const status=M.roomStatus(s,r),n=s.patients.filter(p=>p.room===r.id&&p.state==='queue').length;
   text(M.ROOM_TYPES[r.type].name+' #'+r.id+' · Level '+(r.level+1),xx,yy,18,C.ink,600);wrap(status.label,xx,yy+27,ww,11,status.ready?C.green:C.orange,16);
   const half=(ww-20)/2;label('CONDITION '+Math.round(r.condition)+'%',xx,yy+54);bar(xx,yy+72,half,r.condition/100,r.condition<40?C.orange:C.green);label('ROOM QUALITY '+Math.round(M.roomQuality(s,r))+'%',xx+half+20,yy+54);bar(xx+half+20,yy+72,half,M.roomQuality(s,r)/100);
   const a=s.staff.find(a=>a.id===r.staff),clinical=M.ROOM_TYPES[r.type].time;
   const performance=r.upgrading>0?'Refit '+Math.ceil(r.upgrading)+'s':a&&clinical?(r.type==='gp'?Math.round(M.diagnosisConfidence(s,r,a)*100)+'% confidence':Math.round(M.treatmentChance(s,r,a,{confidence:.85})*100)+'% success at 85% confidence')+' · '+Math.ceil(M.serviceDuration(s,r))+'s/case':r.type==='research'?'Research speed +'+(r.level*15)+'%':r.type==='staff'?'Two rest places per sofa':'Visitors use amenities on their own.';
   wrap(r.completed+' procedures · '+n+' waiting · '+performance,xx,yy+86,ww,10,C.muted,13);
   const bw=(ww-12)/3;
   button(r.level>=3?'Maximum level':r.upgrading>0?'Refitting…':'Upgrade '+M.money(M.upgradeCost(r)),xx,yy+117,bw,29,()=>action(M.upgradeRoom(s,r.id),'Refit started. This room will reopen in 12 seconds.'),'plain',r.level>=3||r.upgrading>0);
   button(r.closed?'Resume intake':'Pause intake',xx+bw+6,yy+117,bw,29,()=>action(M.toggleRoom(s,r.id),r.closed?'Intake paused; current care continues.':'Room intake resumed.'),r.closed?'selected':'plain');
   button('Inspect',xx+(bw+6)*2,yy+117,bw,29,()=>onInspect(r.id));
  });
 }else{
  row(s.contract?153:100,(xx,yy,ww)=>{
   const c=s.contract;
   text(c?c.name:'A little responsibility pays.',xx,yy,ww<450?18:22,C.ink,500,'serif');
   if(c){const left=Math.max(0,Math.ceil(c.deadline-s.time));text(M.contractProgress(s)+' / '+c.target+' cures · '+left+'s remaining',xx,yy+32,13,C.green);bar(xx,yy+60,ww,M.contractProgress(s)/c.target);wrap(c.id==='inspection'?'Keep cleanliness at 85% or more, with no walkouts or deaths.':'The deadline uses simulation time. Prepare capacity before you resume.',xx,yy+78,ww,12,C.muted,17);}
   else wrap(s.time<s.contractCooldown?'The board is reviewing the last contract. New work in '+Math.ceil(s.contractCooldown-s.time)+' simulation seconds.':s.contractsWon+' contracts completed. New offers unlock after your third cure.',xx,yy+35,ww,12,C.muted,17);
  });
  for(const c of M.contractOffers(s))row(151,(xx,yy,ww)=>{
   text(c.name,xx,yy,18,C.ink,600);wrap(c.description,xx,yy+28,ww,12,C.muted,17);
   button(c.ready?'Accept '+(c.id==='emergency'?'referral':'contract'):'Requires 3 cures',xx,yy+95,Math.min(175,ww/2),30,()=>action(M.acceptContract(s,c.id),'Contract accepted. Resume when you are ready.'),'plain',!c.ready||!!s.contract||s.time<s.contractCooldown);
   text('Reward '+M.money(c.reward)+' · Risk '+M.money(c.penalty),xx+Math.min(175,ww/2)+10,yy+105,10,C.orange);
  });
  for(const r of M.hospitalRatings(s))row(97,(xx,yy,ww)=>{text('★'.repeat(r.stars)+'  '+r.title,xx,yy,17,s.rating>=r.stars?C.green:C.ink,500,'serif');wrap(r.requirements,xx,yy+29,ww,11,C.muted,16);text(s.rating>=r.stars?'Rating awarded':'Development grant '+M.money(r.reward),xx,yy+62,11,C.orange);});
 }
 const contentHeight=cursor-(bodyY-scroll),max=Math.max(0,contentHeight-(bottom-bodyY));
 if(max>0){const height=bottom-bodyY,thumb=Math.max(24,height*height/contentHeight);rect(x+w-10,bodyY,3,height,C.line,2);rect(x+w-10,bodyY+(height-thumb)*scroll/max,3,thumb,'#a4b298',2);}
 button('Back to hospital',x+w-172,y+h-52,148,32,onClose,'primary');
 label('SIMULATION PAUSED WHILE PLANNING',x+24,y+h-42);
 return {max,body:{x:left,y:bodyY,w:iw,h:bottom-bodyY}};
}
