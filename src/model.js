export const DAY_LENGTH = 80;
export const GOAL = 300000;
export const names = ['Alex Morgan', 'Robin Wells', 'Sam Okafor', 'Jules Chen', 'Casey Patel', 'Drew Flores', 'Taylor Reed', 'Jamie Moss', 'Ari Brooks', 'Lee Novak', 'Noor Bell', 'River Stone'];
export const ailments = ['Acute Monday syndrome', 'Chronic inbox fatigue', 'Premium-grade malaise', 'Spontaneous paperwork', 'Executive exhaustion', 'Recurring inconvenience'];
export const policies = [
  { id:'coding', title:'Billing optimization', subtitle:'Every pillow is a procedure.', cost:6500, max:3 },
  { id:'nurse', title:'Another actual nurse', subtitle:'An unfortunate operating expense.', cost:4200, max:3 },
  { id:'ward', title:'Open the east wing', subtitle:'Four more recurring relationships.', cost:10500, max:1 },
  { id:'compliance', title:'Compliance department', subtitle:'Put a nicer font on the problem.', cost:5500, max:3 },
  { id:'retention', title:'Discharge labyrinth', subtitle:'Your freedom is awaiting approval.', cost:7000, max:2 }
];
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const money = n => '$'+Math.round(n).toLocaleString('en-US');
export function patient(id, rng=Math.random) {
  return {id, name:names[(id-1)%names.length], ailment:ailments[(id-1)%ailments.length], health:36+rng()*33, decline:.22+rng()*.16, plan:id%3===0?'PLATINUM':id%3===1?'GOLD':'SILVER', rate:id%3===0?105:id%3===1?82:66, mode:'observe', stay:0, billed:0, cooldown:0, escape:0};
}
export function fresh(rng=Math.random) {
  const s={version:1,cash:18000,revenue:0,expenses:0,scrutiny:9,elapsed:0,day:1,patients:[],queue:[],nextId:7,levels:{coding:0,nurse:0,ward:0,compliance:0,retention:0},deaths:0,discharges:0,audits:0,admitted:6,log:[],arrival:9,billTick:0,eventIndex:0,event:null,ended:null};
  for(let i=1;i<=6;i++) s.patients.push(patient(i,rng));
  s.patients[0].health=43; s.patients[1].health=67; s.patients[2].health=31; s.patients[3].health=57;
  s.queue.push(patient(7,rng),patient(8,rng));s.nextId=9;
  log(s,'Board memo','Welcome. Think of a bed as a subscription.','memo');
  return s;
}
export function capacity(s){return 8+4*s.levels.ward;}
export function income(s){return s.patients.reduce((n,p)=>n+p.rate*(1+.17*s.levels.coding)*(p.health>=35&&p.health<=75?1.3:1),0);}
export function operating(s){return 130+s.levels.nurse*32+s.levels.ward*45+s.levels.compliance*20+s.patients.filter(p=>p.mode==='recover').length*23;}
export function log(s,title,text,kind='normal'){s.log.unshift({title,text,kind,time:s.elapsed});s.log=s.log.slice(0,20);}
export function admit(s){
  if(s.ended||s.patients.length>=capacity(s)||!s.queue.length)return false;
  const p=s.queue.shift();s.patients.push(p);s.admitted++;log(s,'New admission',p.name+' joined the revenue ecosystem.');return true;
}
export function mode(s,id,m){const p=s.patients.find(p=>p.id===id);if(!p||!['stabilize','observe','recover'].includes(m))return false;p.mode=m;return true;}
export function rescue(s,id){
 const p=s.patients.find(p=>p.id===id);if(!p||p.cooldown>0||s.cash<1200||s.ended)return false;
 s.cash-=1200;s.expenses+=1200;p.health=Math.min(94,p.health+24);p.cooldown=14;log(s,'Vitality intervention',p.name+': +24 vitality. '+money(1200)+' well spent.','good');return true;
}
export function discharge(s,id){
 const p=s.patients.find(p=>p.id===id);if(!p||s.ended)return false;
 const fine=p.health<35?1500:0;s.cash-=fine;s.expenses+=fine;s.scrutiny=clamp(s.scrutiny+(fine?7:-4),0,100);s.patients=s.patients.filter(x=>x.id!==id);s.discharges++;
 log(s,'Subscription cancelled',p.name+' was discharged.'+(fine?' Unsafe discharge: $1,500 penalty.':' Scrutiny −4.'),fine?'bad':'normal');return true;
}
export function buy(s,id){
 const policy=policies.find(p=>p.id===id);if(!policy||s.ended||s.levels[id]>=policy.max)return false;
 const cost=policy.cost*(1+s.levels[id]*.6);if(s.cash<cost)return false;s.cash-=cost;s.expenses+=cost;s.levels[id]++;
 log(s,'Capital allocation',policy.title+' approved. '+money(cost)+' invested.','good');return true;
}
export function settleAudit(s){
 s.audits++;const fine=Math.round(Math.max(0,s.scrutiny-24)*120);s.cash-=fine;s.expenses+=fine;
 log(s,'Insurance audit',fine?money(fine)+' clawed back. The paperwork had concerns.':'The forms are immaculate. The auditor leaves.',fine?'bad':'good');
 s.scrutiny=Math.max(2,s.scrutiny-21-4*s.levels.compliance);
}
const events=[
 {title:'A patient says they feel better.',body:'Their family is celebrating. Investor relations has requested a different tone.',a:'Offer the premium observation package',b:'Celebrate the recovery',effect:'family'},
 {title:'The pillows have become billable.',body:'An insurer’s new comfort allowance has left a very profitable loophole.',a:'Introduce therapeutic pillow care',b:'Keep the ordinary pillows',effect:'pillow'},
 {title:'A nurse has developed a conscience.',body:'She suggests that “getting people healthy” should be a performance indicator.',a:'Fund a staff wellness seminar',b:'Actually improve staffing',effect:'nurse'}
];
export function chooseEvent(s,choice){
 const e=s.event;if(!e)return;
 if(e.effect==='family'){if(choice===0){s.cash+=3000;s.revenue+=3000;s.scrutiny+=7;}else{s.scrutiny=Math.max(0,s.scrutiny-10);for(const p of s.patients)p.health=clamp(p.health+4,0,99);}}
 if(e.effect==='pillow'){if(choice===0){s.cash+=4500;s.revenue+=4500;s.scrutiny+=10;}else s.scrutiny=Math.max(0,s.scrutiny-7);}
 if(e.effect==='nurse'){if(choice===0){s.cash-=1500;s.expenses+=1500;s.scrutiny+=3;}else if(s.cash>=3200){s.cash-=3200;s.expenses+=3200;s.levels.nurse=Math.min(3,s.levels.nurse+1);s.scrutiny=Math.max(0,s.scrutiny-5);}else{s.scrutiny+=4;}}
 log(s,'Corporate decision',choice===0?e.a:e.b,choice===0?'memo':'good');s.event=null;
}
export function tick(s,dt){
 if(s.ended||s.event)return;
 dt=Math.max(0,Math.min(dt,7*DAY_LENGTH-s.elapsed));
 s.elapsed+=dt;
 const oldDay=s.day;s.day=Math.min(7,Math.floor(s.elapsed/DAY_LENGTH)+1);
 for(const p of [...s.patients]){
  p.stay+=dt;p.cooldown=Math.max(0,p.cooldown-dt);
  const recovery=p.mode==='stabilize'?.57:p.mode==='recover'?1.28:0;
  p.health=clamp(p.health+(recovery-p.decline+s.levels.nurse*.032)*dt,0,100);
  if(p.health<25)s.scrutiny+=dt*.09;
  if(p.health>88)p.escape+=dt;else p.escape=Math.max(0,p.escape-dt*.5);
  if(p.escape>7+5*s.levels.retention){s.patients=s.patients.filter(x=>x.id!==p.id);s.discharges++;log(s,'Patient recovered',p.name+' escaped into a full and meaningful life.','normal');s.scrutiny=Math.max(0,s.scrutiny-3);}
  if(p.health<=0){s.patients=s.patients.filter(x=>x.id!==p.id);s.deaths++;s.cash-=6000;s.expenses+=6000;s.scrutiny+=18;log(s,'Revenue stream lost',p.name+' died. $6,000 settlement.','bad');}
 }
 const gross=income(s)*dt,expense=operating(s)*dt;s.cash+=gross-expense;s.revenue+=gross;s.expenses+=expense;
 for(const p of s.patients)p.billed+=p.rate*(1+.17*s.levels.coding)*(p.health>=35&&p.health<=75?1.3:1)*dt;
 s.scrutiny=clamp(s.scrutiny+dt*(.008+s.levels.coding*.035-s.levels.compliance*.045+Math.max(0,s.patients.length-6-s.levels.nurse*2)*.022),0,100);
 s.arrival-=dt;
 if(s.arrival<=0){s.arrival=15;if(s.queue.length<4)s.queue.push(patient(s.nextId++));}
 if(s.day!==oldDay){log(s,'Day '+s.day+' of 7','Daily overhead booked. Another beautiful day of recurring revenue.','memo');if(s.day===3||s.day===5||s.day===7)settleAudit(s);}
 const eventAt=[35,175,335];
 if(s.eventIndex<events.length&&s.elapsed>=eventAt[s.eventIndex])s.event={...events[s.eventIndex++]};
 if(s.deaths>=3)s.ended={win:false,title:'Your license has expired.',body:'Three patients died. The board would like to clarify that this was not the retention strategy.'};
 else if(s.scrutiny>=100)s.ended={win:false,title:'The auditors brought handcuffs.',body:'Scrutiny reached 100%. Your explanation of “patient lifetime value” was entered into evidence.'};
 else if(s.cash<0)s.ended={win:false,title:'A terminal cash-flow event.',body:'The hospital is insolvent. Apparently compassion was not the only thing you could run out of.'};
 else if(s.elapsed>=7*DAY_LENGTH)s.ended={win:s.revenue>=GOAL,title:s.revenue>=GOAL?'A healthy return on illness.':'The board expected more.',body:s.revenue>=GOAL?'Seven days. '+money(s.revenue)+' billed. The board has renewed your contract. Your patients are still considering theirs.':'You survived the week, but missed the '+money(GOAL)+' billing target. The shareholders send their mildest regards.'};
}
export function validSave(s){return !!s&&s.version===1&&Number.isFinite(s.cash)&&Number.isFinite(s.elapsed)&&s.elapsed>=0&&s.elapsed<=560&&Array.isArray(s.patients)&&s.patients.length<=12&&s.patients.every(p=>Number.isFinite(p.health)&&p.health>=0&&p.health<=100)&&Array.isArray(s.queue)&&s.levels&&['coding','nurse','ward','compliance','retention'].every(k=>Number.isInteger(s.levels[k])&&s.levels[k]>=0&&s.levels[k]<=3);}
