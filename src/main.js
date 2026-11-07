import { frame, onStart, onUpdate, onQuit, onSuspend, openMenu } from 'starhermit:engine';
import * as draw from 'starhermit:draw';
import { onAction, onGesture, onPointerButton, onWheel, isDown, pointer, setCursor } from 'starhermit:input';
import { storage } from 'starhermit:storage';
import * as M from './model.js';
import * as view from './render.js';
import * as sound from './sound.js';

const C={paper:'#f4f2e9',white:'#fffef7',ink:'#294a3c',muted:'#829080',line:'#dce0d1',green:'#47765b',sage:'#e3e9d8',orange:'#bc7e59',red:'#ad5c4b',dark:'#294b3d',yellow:'#e7d8b3'};
let s=M.fresh(),paused=true,speed=1,tab='rooms',tool={kind:'room',type:'gp'},selected=null,anchor=null,pending=null,hoverTile=null,rotation=0;
let buttons=[],panelRect=null,U=1,W=1440,H=900,mobile=false,scroll=0,maxScroll=0,toast='',toastTimer=0,modal=null,saveTimer=0,clock=0,wallMode=1,roomFilter=null;
let dragUI=false,pinchZoom=1,lastCured=0;
const SAVE='perpetual-care-hospital-v2';
function save(){try{storage.setJson(SAVE,s);}catch{notice('The save could not be written.');}}
onQuit(save);onSuspend(save);
onStart(()=>{try{const saved=storage.getJson(SAVE);if(M.validSave(saved)){s=saved;tool={kind:'select'};tab='hospital';notice('Hospital restored. Take a moment before resuming.');}}catch{}view.init();sound.init();lastCured=s.cured;});
function notice(t){toast=t;toastTimer=4;}
function result(r,success=''){if(!r.ok){notice(r.error);sound.cue('error');return false;}sound.cue('build');if(success)notice(success);save();return true;}
function cancel(){anchor=null;pending=null;tool={kind:'select'};view.disposePreview();}
function selectTab(t){tab=t;scroll=0;anchor=null;pending=null;tool={kind:'select'};if(t==='equipment')roomFilter=selected?.kind==='room'?s.rooms.find(r=>r.id===selected.id)?.type:null;}
function equip(type){tool={kind:'item',type};anchor=null;pending=null;tab='equipment';}
function chooseRoom(type){tool={kind:'room',type};anchor=null;pending=null;tab='rooms';selected=null;scroll=0;notice('Drag a rectangle, or tap two opposite corners.');}
function selectedRoom(){return selected?.kind==='room'?s.rooms.find(r=>r.id===selected.id):null;}
function reset(){s=M.fresh();paused=true;modal=null;selected=null;roomFilter=null;tab='rooms';tool={kind:'room',type:'gp'};anchor=null;pending=null;scroll=0;view.setCamera({x:14,z:11,zoom:1,rotation:0});save();notice('A new lease. A clean floor. Your hospital.');}
function bounds(a,b){return {x:Math.min(a.x,b.x),z:Math.min(a.z,b.z),w:Math.abs(a.x-b.x)+1,h:Math.abs(a.z-b.z)+1};}
function commitRoom(){
 if(!pending)return;const b=pending,r=M.buildRoom(s,tool.type,b.x,b.z,b.w,b.h);
 if(result(r)){selected={kind:'room',id:r.room.id};roomFilter=r.room.type;tab='equipment';tool={kind:'item',type:M.ROOM_TYPES[r.room.type].required[0]};anchor=null;pending=null;scroll=0;notice('Room built. Now place the required equipment inside.');}
}
function hitUI(x,y){return modal||panelRect&&x>=panelRect.x&&x<=panelRect.x+panelRect.w&&y>=panelRect.y&&y<=panelRect.y+panelRect.h||y<(mobile?132:110)||y>H-64||pending&&y>H-144;}
function press(x,y){
 const px=x/U,py=y/U;
 for(let i=buttons.length-1;i>=0;i--){const b=buttons[i];if(px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h){if(!b.disabled){sound.cue('click');b.fn();}return;}}
 if(hitUI(px,py))return;
 const p=view.pick(x,y);if(!p)return;
 if(tool.kind==='room'){
  if(pending)return;
  if(!anchor){anchor=p;notice('Choose the opposite corner.');}
  else{pending=bounds(anchor,p);anchor=null;}return;
 }
 if(tool.kind==='item'){
  const r=M.placeItem(s,tool.type,p.x,p.z,rotation);
  if(result(r,M.EQUIPMENT[tool.type].name+' placed.')){
   const room=s.rooms.find(rr=>rr.id===r.item.room);if(room){selected={kind:'room',id:room.id};const missing=M.roomStatus(s,room).missing;if(missing.length)tool={kind:'item',type:missing[0]};else{tool={kind:'select'};notice(M.roomStatus(s,room).label==='Open'?'Room ready.':M.roomStatus(s,room).label+'.');}}
  }return;
 }
 if(tool.kind==='door'){
  if(result(M.moveDoor(s,selected.id,p.x,p.z),'Door relocated.'))tool={kind:'select'};return;
 }
 if(tool.kind==='sell'){
  const item=M.itemAt(s,p.x,p.z);if(item)result(M.removeItem(s,item.id),'Object sold at half its purchase price.');else{const r=M.roomAt(s,p.x,p.z);if(r){selected={kind:'room',id:r.id};modal='demolish';}else notice('Choose an object or a room to sell.');}return;
 }
 const person=[...s.patients,...s.staff].map(a=>({a,p:view.project(a.x,.6,a.z)})).find(v=>Math.hypot(v.p.x-x,v.p.y-y)<18*U);
 if(person){selected={kind:person.a.type?'staff':'patient',id:person.a.id};tab='inspect';scroll=0;return;}
 const r=M.roomAt(s,p.x,p.z),item=M.itemAt(s,p.x,p.z);
 if(r){selected={kind:'room',id:r.id};roomFilter=r.type;tab='inspect';scroll=0;}
 else if(item){selected={kind:'item',id:item.id};tab='inspect';scroll=0;}
 else selected=null;
}
onGesture(e=>{
 const x=e.x/U,y=e.y/U;
 if(e.type==='tap')press(e.x,e.y);
 if(e.type==='dragStart'){dragUI=!!hitUI(e.startX/U,e.startY/U);if(!dragUI&&tool.kind==='room'&&!pending)anchor=view.pick(e.startX,e.startY);}
 if(e.type==='drag'){
  if(dragUI){if(panelRect&&e.startY/U>panelRect.y+80)scroll=Math.max(0,Math.min(maxScroll,scroll-e.dy/U));}
  else if(tool.kind!=='room'){view.pan(-e.dx/(22*U),-e.dy/(18*U));}
 }
 if(e.type==='dragEnd'&&!dragUI&&tool.kind==='room'&&anchor){const p=view.pick(e.x,e.y);if(p&&!e.cancelled)pending=bounds(anchor,p);anchor=null;}
 if(e.type==='pinchStart')pinchZoom=view.cameraState().zoom;
 if(e.type==='pinch')view.setCamera({zoom:pinchZoom*e.scale});
});
onPointerButton(e=>{if(e.button===2&&e.pressed)cancel();});
onWheel((dx,dy)=>{const p=pointer();if(p&&panelRect&&p.x/U<panelRect.x+panelRect.w&&p.y/U>panelRect.y)scroll=Math.max(0,Math.min(maxScroll,scroll+dy*42));else view.setCamera({zoom:view.cameraState().zoom*Math.exp(-dy*.08)});});
onAction(e=>{
 if(!e.pressed)return;
 if(e.action==='cancel'){if(modal)modal=null;else cancel();return;}
 if(modal)return;
 if(e.action==='pause')paused=!paused;
 if(e.action==='speed')speed=speed===1?2:speed===2?4:1;
 if(e.action==='build')selectTab('rooms');
 if(e.action==='equipment'){selectTab('equipment');roomFilter=null;}
 if(e.action==='hire')selectTab('staff');
 if(e.action==='inspect'){cancel();tab='inspect';}
 if(e.action==='rotate'){if(tool.kind==='item')rotation=(rotation+1)%4;else view.setCamera({rotation:view.cameraState().rotation+1});}
 if(e.action==='rotate_view')view.setCamera({rotation:view.cameraState().rotation-1});
 if(e.action==='walls'){wallMode=(wallMode+1)%3;view.setWalls(wallMode);}
 if(e.action==='help')modal='help';
 if(e.action==='save'){save();notice('Hospital saved.');}
 if(e.action==='confirm')commitRoom();
 if(e.action==='zoom_in')view.setCamera({zoom:view.cameraState().zoom*1.13});
 if(e.action==='zoom_out')view.setCamera({zoom:view.cameraState().zoom/1.13});
});

// Immediate UI keeps the native and browser clients identical. All hit areas use
// the same logical coordinates as the text and shapes they surround.
function rect(x,y,w,h,c,r=0){if(r)draw.roundRect(x*U,y*U,w*U,h*U,r*U,c);else draw.rect(x*U,y*U,w*U,h*U,c);}
function line(x,y,x2,y2,c=C.line,lw=1){draw.line(x*U,y*U,x2*U,y2*U,c,lw*U);}
function text(t,x,y,size=13,c=C.ink,weight=400,font='sans-serif',align='start'){draw.text(String(t),x*U,y*U,{size:size*U,color:c,weight,font,align});}
function pill(t,x,y,w,c=C.sage){rect(x,y,w,23,c,5);text(t,x+w/2,y+5,10,C.ink,600,'sans-serif','center');}
function label(t,x,y,c=C.muted){text(t,x,y,10,c,600);}
function wrap(t,x,y,w,size=12,c=C.muted,lh=18){let row='',n=0;for(const word of String(t).split(' ')){const next=row?row+' '+word:word;if(draw.measureText(next,{size:size*U}).width>w*U&&row){text(row,x,y+n*lh,size,c);n++;row=word;}else row=next;}if(row)text(row,x,y+n*lh,size,c);return(n+1)*lh;}
function button(t,x,y,w,h,fn,style='plain',disabled=false){
 const p=pointer(),hot=p&&p.x/U>=x&&p.x/U<=x+w&&p.y/U>=y&&p.y/U<=y+h;
 const fill=disabled?'#e6e6dc':style==='primary'?C.green:style==='orange'?C.orange:style==='selected'?C.sage:hot?'#e8ecdE':C.white;
 rect(x,y,w,h,fill,6);if(style==='plain')draw.strokeRoundRect(x*U,y*U,w*U,h*U,6*U,C.line,U);
 text(t,x+w/2,y+(h-14)/2,13,disabled?'#a6aa9c':['primary','orange'].includes(style)?'#fffdf3':C.ink,600,'sans-serif','center');buttons.push({x,y,w,h,fn,disabled});
}
function bar(x,y,w,value,c=C.green){rect(x,y,w,5,C.line,2);rect(x,y,w*Math.max(0,Math.min(1,value)),5,c,2);}
function cross(x,y,size,c){rect(x-size*.16,y-size/2,size*.32,size,c,1);rect(x-size/2,y-size*.16,size,size*.32,c,1);}
function header(){
 const hh=mobile?132:106;rect(0,0,W,hh,C.paper);line(0,hh,W,hh);
 rect(20,17,35,35,C.green,10);cross(37.5,34.5,23,'#f9f2de');text('PERPETUAL CARE',65,17,mobile?18:21,C.ink,600,'serif');label('A HOSPITAL OF YOUR OWN',66,43);
 if(!mobile){line(300,17,300,52);text('ST. MARGIN HOSPITAL',320,19,11,C.muted,600);text('Your recovery is our recurring revenue.',320,39,11,C.muted);}
 const bx=W-(mobile?168:338);button('?',W-54,16,34,35,()=>{modal='help';});button('Options',W-144,16,82,35,openMenu);
 if(!mobile){button('Save',W-214,16,62,35,()=>{save();notice('Hospital saved.');});button('New',W-276,16,54,35,()=>{modal='reset';});}
 const y=mobile?77:70,gap=mobile?W/4:(W-320)/4,start=mobile?20:320;
 const metrics=[['CASH',M.money(s.cash)],['REPUTATION',Math.round(s.reputation)+' / 100'],['CURED',s.cured+' patients'],['ON SITE',s.patients.length+' patients']];
 metrics.forEach(([a,b],i)=>{label(a,start+i*gap,y-7);text(b,start+i*gap,y+8,mobile?16:19,i===0&&s.cash<8000?C.red:C.ink,500,'serif');});
 if(!mobile){label('ESTABLISHED TODAY',21,72);text('A clean slate. A better kind of care.',21,87,11,C.muted);}
}
function footer(){
 rect(0,H-61,W,61,C.paper);line(0,H-61,W,H-61);
 const yy=H-46;
 if(!mobile){text('DAY '+s.day,20,yy+1,13,C.ink,600);text(s.open?'RECEPTION OPEN':'PLANNING · ADMISSIONS CLOSED',20,yy+21,9,s.open?C.green:C.muted);}
 else label('DAY '+s.day,15,yy+8);
 const start=mobile?65:240;
 button(paused?'▶ Play':'Ⅱ Pause',start,yy,mobile?80:100,35,()=>{paused=!paused;},paused?'orange':'plain');
 [1,2,4].forEach((v,i)=>button(v+'×',start+(mobile?87:108)+i*36,yy,31,35,()=>{speed=v;paused=false;},speed===v&&!paused?'selected':'plain'));
 if(!mobile){button(s.open?'Close admissions':'Open hospital',start+235,yy,145,35,()=>{M.setOpen(s,!s.open);if(s.open)paused=false;save();},s.open?'plain':'primary');text('WASD pan · Wheel zoom · Q / R rotate · Esc cancel',start+405,yy+11,11,C.muted);}
 else button(s.open?'Close':'Open',W-77,yy,62,35,()=>{M.setOpen(s,!s.open);if(s.open)paused=false;save();},s.open?'plain':'primary');
}
function card(x,y,w,name,sub,price,fn,active=false,color=C.green,disabled=false){
 if(y<panelRect.y+83||y+63>panelRect.y+panelRect.h-12)return;
 rect(x,y,w,62,active?'#e2e8d6':C.white,7);draw.strokeRoundRect(x*U,y*U,w*U,62*U,7*U,active?C.green:C.line,U);
 rect(x+11,y+13,34,34,color,8);text(name.slice(0,2).toUpperCase(),x+28,y+23,11,'#fffcf0',600,'sans-serif','center');
 text(name,x+55,y+11,13,disabled?C.muted:C.ink,600);text(price,x+w-12,y+35,12,disabled?C.muted:C.green,600,'sans-serif','end');text(sub,x+55,y+34,10,C.muted);
 buttons.push({x,y,w,h:62,fn,disabled});
}
function infoTitle(x,y,title,subtitle,w){text(title,x,y,22,C.ink,500,'serif');return y+34+wrap(subtitle,x,y+33,w,12,C.muted);}
function sidebar(){
 const x=mobile?12:14,y=mobile?H-380:120,w=mobile?W-24:280,h=mobile?306:H-194;panelRect={x,y,w,h};
 rect(x,y,w,h,C.paper,10);draw.strokeRoundRect(x*U,y*U,w*U,h*U,10*U,'#d8decc',U);
 const labels=[['rooms','Rooms'],['equipment','Furnish'],['staff','Staff'],['hospital','Hospital']];
 labels.forEach(([id,t],i)=>button(t,x+8+i*(w-16)/4,y+9,(w-22)/4,31,()=>selectTab(id),tab===id?'selected':'plain'));
 const inner=x+14,iw=w-28,base=y+88;
 let count=0;
 if(tab==='rooms'){
  label(tool.kind==='room'?'DRAW YOUR '+M.ROOM_TYPES[tool.type].name.toUpperCase():'CONSTRUCTION CATALOGUE',inner,y+57);
  for(const[type,r]of Object.entries(M.ROOM_TYPES)){
   const locked=s.cured<(r.unlock||0);card(inner,base+count*70-scroll,iw,r.name,locked?'Unlock at '+r.unlock+' cures':r.min+' × '+r.min+' minimum',locked?'LOCKED':'from '+M.money(M.roomCost(type,r.min,r.min)),()=>chooseRoom(type),tool.kind==='room'&&tool.type===type,r.wall,locked);count++;
  }
  const noteY=base+count*70+12-scroll;
  if(noteY>=base&&noteY+66<y+h){label('BUILD YOUR WAY',inner,noteY);wrap('Draw a rectangle on the floor. Doors face a corridor automatically; you can move them later.',inner,noteY+19,iw,11);}
  count+=1.2;
 }else if(tab==='equipment'){
  const filter=roomFilter?M.ROOM_TYPES[roomFilter].name:'All furnishings';label(filter.toUpperCase(),inner,y+57);
  if(roomFilter)button('All',x+w-52,y+49,36,24,()=>{roomFilter=null;scroll=0;});
  for(const[type,e]of Object.entries(M.EQUIPMENT)){
   if(roomFilter&&!e.rooms?.includes(roomFilter)&&!e.any)continue;
   const r=selectedRoom(),placed=r&&M.roomItems(s,r).some(i=>i.type===type);
   card(inner,base+count*70-scroll,iw,e.name,(placed?'✓ Fitted · ':'')+e.w+' × '+e.h+' tiles',M.money(e.cost),()=>equip(type),tool.kind==='item'&&tool.type===type,placed?'#718a6a':C.orange);count++;
  }
 }else if(tab==='staff'){
  label('GOOD PEOPLE. BETTER HOSPITAL.',inner,y+57);
  for(const[type,a]of Object.entries(M.STAFF_TYPES)){
   const n=s.staff.filter(v=>v.type===type).length;card(inner,base+count*70-scroll,iw,'Hire '+a.name,n+' employed · '+M.money(a.wage)+'/day',M.money(a.cost),()=>{if(result(M.hire(s,type),a.name+' hired. Assignments are automatic.')){}},false,a.color==='#f6f2de'?'#87977f':a.color);count++;
  }
  let yy=base+count*70+12-scroll;
  if(yy>=base&&yy+70<y+h){label('ON THE ROSTER',inner,yy);wrap('Staff choose a matching room automatically. Build a furnished staff room before they need a break.',inner,yy+19,iw,11);}
  count+=1.2;
 }else if(tab==='inspect'){
  label('HOSPITAL INSPECTOR',inner,y+57);inspectPanel(inner,base,iw,y+h-14);count=0;
 }else{
  label('THE BIG PICTURE',inner,y+57);hospitalPanel(inner,base-scroll,iw,y+h-14,base);count=14;
 }
 maxScroll=Math.max(0,count*70-(h-99));scroll=Math.min(scroll,maxScroll);
 if(maxScroll>0){const track=h-105,thumb=Math.max(24,track*(h-99)/(count*70));rect(x+w-6,y+85,2,track,'#e1e5d8',1);rect(x+w-6,y+85+(track-thumb)*scroll/maxScroll,2,thumb,'#a5b49c',1);}
}
function inspectPanel(x,y,w,bottom){
 const r=selectedRoom();
 if(r){
  const t=M.ROOM_TYPES[r.type],status=M.roomStatus(s,r);text(t.name,x,y,23,C.ink,500,'serif');text(r.w+' × '+r.h+' tiles · '+r.completed+' treated',x,y+32,11,C.muted);
  let yy=y+57;yy+=wrap(status.label,x,yy,w,12,status.ready?C.green:C.orange)+12;
  for(const type of t.required){
   if(yy+34>bottom)break;const fitted=M.roomItems(s,r).some(i=>i.type===type);button((fitted?'✓ ':'+ ')+M.EQUIPMENT[type].name,x,yy,w,31,()=>{equip(type);roomFilter=r.type;},fitted?'selected':'plain');yy+=37;
  }
  if(yy+56<bottom){label('MACHINE CONDITION',x,yy+9);bar(x,yy+29,w,r.condition/100,r.condition<30?C.orange:C.green);yy+=49;}
  if(yy+40<bottom){button('Furnish room',x,yy,w,33,()=>{tab='equipment';roomFilter=r.type;scroll=0;});yy+=40;}
  if(yy+40<bottom){button('Move door',x,yy,w,33,()=>{tool={kind:'door'};notice('Choose a wall tile next to the corridor.');});yy+=40;}
  if(yy+40<bottom)button('Demolish room',x,yy,w,33,()=>{modal='demolish';});
 }else if(selected?.kind==='patient'){
  const p=s.patients.find(p=>p.id===selected.id);if(!p){selected=null;return;}text(p.name,x,y,23,C.ink,500,'serif');wrap(M.CONDITIONS[p.condition].name,x,y+34,w,12,C.orange);label('VITALITY',x,y+74);bar(x,y+94,w,p.health/100);label('PATIENCE',x,y+119);bar(x,y+139,w,p.patience/100,p.patience<30?C.orange:C.green);text(p.state==='service'?'Receiving treatment':'Next: '+(M.ROOM_TYPES[p.stage]?.name||'Reception'),x,y+162,13);text('Billed '+M.money(p.billed),x,y+189,12,C.muted);
 }else if(selected?.kind==='staff'){
  const a=s.staff.find(a=>a.id===selected.id);if(!a){selected=null;return;}text(a.name,x,y,22,C.ink,500,'serif');text(M.STAFF_TYPES[a.type].name+' · '+M.money(M.STAFF_TYPES[a.type].wage)+'/day',x,y+34,12,C.muted);label('ENERGY',x,y+74);bar(x,y+94,w,a.energy/100);const r=s.rooms.find(r=>r.id===a.room);wrap(a.resting?'Taking a well-earned break':r?'Assigned to '+M.ROOM_TYPES[r.type].name:'Waiting for a matching room',x,y+121,w,13);if(y+210<bottom)button('Dismiss employee',x,y+174,w,34,()=>{result(M.fire(s,a.id),'Employee dismissed.');selected=null;});
 }else if(selected?.kind==='item'){
  const i=s.items.find(i=>i.id===selected.id);if(!i){selected=null;return;}const e=M.EQUIPMENT[i.type];text(e.name,x,y,21,C.ink,500,'serif');wrap(e.description,x,y+37,w,13);button('Sell for '+M.money(e.cost*.5),x,y+112,w,34,()=>{result(M.removeItem(s,i.id),'Object sold.');selected=null;});
 }else{
  text('Every detail counts.',x,y,22,C.ink,500,'serif');wrap('Click a room, a patient, a member of staff, or a corridor furnishing to inspect it.',x,y+43,w,13);button('Build a room',x,y+131,w,36,()=>selectTab('rooms'),'primary');
 }
}
function hospitalPanel(x,y,w,bottom,minY){
 const show=(yy,height)=>yy>=minY&&yy+height<bottom;
 if(show(y,78)){text('A healthy balance.',x,y,22,C.ink,500,'serif');text('Revenue '+M.money(s.earned),x,y+36,13,C.green);text('Daily costs '+M.money(M.dailyCost(s)),x,y+58,12,C.muted);}
 if(show(y+93,38))button(s.loan?'Repay '+M.money(s.loan):'Take $20,000 loan',x,y+93,w,34,()=>result(s.loan?M.repayLoan(s):M.takeLoan(s),'Bank balance updated.'));
 if(show(y+137,38))button(s.open?'Close admissions':'Open hospital',x,y+137,w,34,()=>{M.setOpen(s,!s.open);if(s.open)paused=false;save();},s.open?'plain':'primary');
 let yy=y+197;
 if(show(yy,25))label('YOUR FIRST HOSPITAL',x,yy);yy+=26;
 for(const o of M.objectives(s)){if(show(yy,50)){text(o.done?'✓':'○',x,yy+1,16,o.done?C.green:C.muted);wrap(o.text,x+25,yy,w-25,12,o.done?C.green:C.ink,16);if(o.progress)text(o.progress,x+25,yy+32,10,C.muted);}yy+=61;}
 if(show(yy+5,20))label('LATEST CORRESPONDENCE',x,yy+5);yy+=33;
 for(const entry of s.log.slice(0,3)){if(show(yy,72)){text(entry.title,x,yy,12,entry.kind==='bad'?C.red:C.green,600);wrap(entry.text,x,yy+22,w,11,C.muted,16);}yy+=86;}
 if(show(yy,40))button('Start a new hospital',x,yy,w,34,()=>{modal='reset';});
}
function constructionHUD(){
 let b=null,check=null;
 if(tool.kind==='room'){
  if(pending)b=pending;else if(anchor&&hoverTile)b=bounds(anchor,hoverTile);else if(hoverTile){const t=M.ROOM_TYPES[tool.type];b={x:hoverTile.x,z:hoverTile.z,w:t.min,h:t.min};}
  if(b)check=M.canBuild(s,tool.type,b.x,b.z,b.w,b.h);
 }else if(tool.kind==='item'&&hoverTile){const f=M.footprint(tool.type,rotation);b={x:hoverTile.x,z:hoverTile.z,...f};check=M.canPlace(s,tool.type,b.x,b.z,rotation);}
 view.preview(b?{...b,ok:check.ok}:null);
 const viewX=mobile?20:318,viewW=W-viewX-20;
 if(pending){
  const yy=mobile?panelRect.y-88:H-142;rect(viewX,yy,viewW,70,C.paper,9);text(pending.w+' × '+pending.h+' '+M.ROOM_TYPES[tool.type].name,viewX+15,yy+12,16,C.ink,500,'serif');
  if(check.ok){text('Door and walls included.',viewX+15,yy+40,11,C.muted);button('Build room '+M.money(check.cost),viewX+viewW-236,yy+17,175,37,commitRoom,'primary');}
  else wrap(check.error,viewX+15,yy+37,viewW-80,11,C.red);
  button('×',viewX+viewW-48,yy+17,33,37,()=>{pending=null;anchor=null;});
 }else{
  const titles={room:'DRAW YOUR HOSPITAL',item:'A PLACE FOR EVERYTHING',door:'RELOCATE THE DOOR',sell:'MAKE ROOM FOR SOMETHING BETTER',select:'YOUR HOSPITAL, IN THE MAKING'};
  const detail=tool.kind==='room'?M.ROOM_TYPES[tool.type].name+' · Drag to build, or tap two corners':tool.kind==='item'?M.EQUIPMENT[tool.type].name+' · '+M.money(M.EQUIPMENT[tool.type].cost)+' · R to rotate':tool.kind==='door'?'Click a wall tile beside a corridor':tool.kind==='sell'?'Click to sell. Rooms require confirmation.':s.rooms.length?'Click a room or a person to inspect them.':'Begin with a GP office. Leave the green central corridor clear.';
  if(!mobile){label(titles[tool.kind]||titles.select,viewX+5,127);text(detail,viewX+5,148,12,C.ink);}
  if(b&&check&&!check.ok&&!mobile){const yy=H-99;rect(viewX,yy,Math.min(viewW,600),27,'#f9f0df',5);text(check.error,viewX+10,yy+7,11,C.orange);}
 }
 // These controls are always reachable without a keyboard.
 const cx=W-(mobile?194:225),cy=mobile?143:121;
 button('−',cx,cy,30,30,()=>view.setCamera({zoom:view.cameraState().zoom/1.15}));button('+',cx+35,cy,30,30,()=>view.setCamera({zoom:view.cameraState().zoom*1.15}));
 button('↻',cx+70,cy,34,30,()=>{if(tool.kind==='item')rotation=(rotation+1)%4;else view.setCamera({rotation:view.cameraState().rotation+1});});
 button(['Walls off','Cutaway','Full walls'][wallMode],cx+109,cy,mobile?73:98,30,()=>{wallMode=(wallMode+1)%3;view.setWalls(wallMode);});
 if(!mobile){button('Select',viewX+5,H-101,65,29,()=>{cancel();tab='inspect';});button('Sell',viewX+77,H-101,55,29,()=>{tool={kind:'sell'};pending=null;anchor=null;});}
 if(tool.kind!=='select'&&!pending)button('Cancel',W-87,mobile?182:H-101,67,29,cancel);
 if(mobile&&selectedRoom()&&!pending){const yy=panelRect.y-77;button('Furnish room',20,yy,139,31,()=>{tab='equipment';roomFilter=selectedRoom().type;scroll=0;});button('Move door',167,yy,108,31,()=>{tool={kind:'door'};notice('Choose a wall tile beside the corridor.');});button('Demolish',283,yy,104,31,()=>{modal='demolish';});}
}
function worldLabels(){
 for(const r of s.rooms){
  const corners=[[r.x,r.z],[r.x+r.w,r.z],[r.x,r.z+r.h],[r.x+r.w,r.z+r.h]].map(([x,z])=>view.project(x,.1,z));
  const p=corners.sort((a,b)=>b.y-a.y)[0];p.x/=U;p.y=p.y/U+24;if(p.x<(mobile?0:310)||p.x>W-25||p.y<(mobile?180:175)||p.y>(mobile?panelRect?.y-25:H-114))continue;
  const status=M.roomStatus(s,r),q=s.patients.filter(a=>a.room===r.id&&a.state==='queue').length,t=M.ROOM_TYPES[r.type],w=mobile?70:100;
  rect(p.x-w/2,p.y-17,w,31,status.ready?'#fbfcf0ed':'#f8eddaed',6);text(t.short+(q?' · '+q+' waiting':''),p.x,p.y-10,11,status.ready?C.green:C.orange,700,'sans-serif','center');text(status.ready?'OPEN':'FITTING OUT',p.x,p.y+4,7,C.muted,600,'sans-serif','center');
 }
 const p=view.project(14.6,1.35,18.5);if(p.x/U>(mobile?0:310)&&p.y/U<(mobile?H-390:H-120)){pill('RECEPTION',p.x/U-46,p.y/U-25,92,'#faf7e9df');}
 if(selected?.kind==='patient'){const a=s.patients.find(a=>a.id===selected.id);if(a){const p=view.project(a.x,1.35,a.z);pill(a.name,p.x/U-60,p.y/U-27,120,C.white);}}
}
function modalUI(){
 if(!modal&&!s.ended)return;rect(0,0,W,H,'#203b32a0');buttons=[];
 const w=Math.min(W-32,650),x=(W-w)/2,h=modal==='help'?Math.min(H-60,610):260,y=(H-h)/2;rect(x,y,w,h,C.paper,13);
 if(modal==='help'){
  label('WELCOME TO PERPETUAL CARE',x+26,y+26);text('Build a hospital. Make it work.',x+26,y+57,mobile?24:32,C.ink,500,'serif');
  const instructions=[['1. Draw a room','Choose Rooms, then drag a rectangle on the floor. You can also tap two opposite corners. Confirm the cost.'],['2. Make room for care','Place the required equipment inside. Doors need a clear path. R rotates furniture; the curved arrow works on touch.'],['3. Hire the right people','Doctors diagnose. Nurses run pharmacies and wards. Specialists run advanced rooms. Assignments are automatic.'],['4. Open your doors','Patients check in, queue for a GP, then seek the treatment their condition needs. Build a pharmacy AND a ward for the first arrivals.'],['5. Keep everyone going','Add benches, plants, toilets and a staff room. Caretakers repair equipment. Cure 6 patients to unlock Diagnostics; 16 unlocks Surgery.']];
  let yy=y+112;for(const[a,b]of instructions){text(a,x+26,yy,14,C.green,600);yy+=23;yy+=wrap(b,x+26,yy,w-52,mobile?11:12,C.muted,mobile?16:18)+16;}
  if(!mobile)text('Space pause · B rooms · E equipment · H hire · V inspect · WASD pan · Q / R rotate',x+26,y+h-83,10,C.muted);
  button('Let’s build something good',x+26,y+h-57,w-52,36,()=>{modal=null;},'primary');
 }else if(modal==='reset'){
  text('A fresh start?',x+26,y+30,29,C.ink,500,'serif');wrap('Your current hospital will be replaced. This resets the building, staff, patients and finances.',x+26,y+83,w-52,14);button('Keep this hospital',x+26,y+h-65,(w-64)/2,38,()=>{modal=null;});button('Start again',x+38+(w-64)/2,y+h-65,(w-64)/2,38,reset,'orange');
 }else if(modal==='demolish'){
  text('Demolish this room?',x+26,y+30,28,C.ink,500,'serif');wrap('The room and its equipment will be sold for half their construction cost. Patients will seek another room.',x+26,y+83,w-52,14);button('Keep room',x+26,y+h-65,(w-64)/2,38,()=>{modal=null;});button('Demolish',x+38+(w-64)/2,y+h-65,(w-64)/2,38,()=>{if(result(M.demolish(s,selected.id),'Room demolished.')){modal=null;selected=null;}},'orange');
 }else if(s.ended){
  text('The board has concerns.',x+26,y+30,28,C.ink,500,'serif');wrap(s.ended,x+26,y+82,w-52,14);button('Start a new hospital',x+26,y+h-65,w-52,38,reset,'primary');
 }
}
onUpdate(dt=>{
 const f=frame();if(f.width<=0||f.height<=0)return;
 clock+=dt;toastTimer=Math.max(0,toastTimer-dt);saveTimer+=dt;
 if(!paused&&!modal&&f.focused&&!f.overlayOpen){let left=Math.min(dt,.15)*speed;while(left>0){const step=Math.min(.1,left);M.tick(s,step);left-=step;}}
 if(s.cured>lastCured){sound.cue('cure');lastCured=s.cured;}
 if(saveTimer>8){saveTimer=0;save();}
 U=Math.max(.8,Math.min(1.1,f.width/1440));W=f.width/U;H=f.height/U;mobile=W<780;
 let px=(isDown('pan_right')?1:0)-(isDown('pan_left')?1:0),pz=(isDown('pan_down')?1:0)-(isDown('pan_up')?1:0);if(px||pz)view.pan(px*dt*8,pz*dt*8);
 view.updateCamera(f.width,f.height,mobile?0:310*U,(mobile?132:106)*U,(mobile?389:64)*U);view.update(s,s.time,selected);
 const p=pointer();hoverTile=p&&!hitUI(p.x/U,p.y/U)?view.pick(p.x,p.y):null;
 buttons=[];header();sidebar();footer();worldLabels();constructionHUD();
 if(toastTimer>0&&!modal){const w=Math.min(mobile?W-28:620,W-40),x=mobile?14:(W+310-w)/2,y=mobile?panelRect.y-43:H-194;rect(x,y,w,34,C.dark,7);text(toast,x+w/2,y+11,mobile?10:12,'#fff8e6',500,'sans-serif','center');}
 modalUI();sound.update(f.focused&&!f.overlayOpen);
 const hot=buttons.some(b=>!b.disabled&&p&&p.x/U>=b.x&&p.x/U<=b.x+b.w&&p.y/U>=b.y&&p.y/U<=b.y+b.h);setCursor(hot?'pointer':hoverTile&&tool.kind!=='select'?'crosshair':'default');
});
