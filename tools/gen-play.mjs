// Generates a real mouse/touch playthrough of room drawing and furnishing.
import fs from 'node:fs';
const mobile=process.argv.includes('--phone'),w=mobile?390:1440,h=mobile?844:1000,U=Math.max(.8,Math.min(1.1,w/1440)),panel=mobile?0:310*U,top=(mobile?132:106)*U,bottom=(mobile?389:64)*U;
const operations=process.argv.includes('--operations'),depth=process.argv.includes('--depth');
const scale=Math.min((w-panel-28)/39,(h-top-bottom-45)/27),elevation=33/Math.hypot(35,33);
const at=(x,z)=>[(w+panel)/2+((x-14)-(z-11))*Math.SQRT1_2*scale,(h+top-bottom)/2+((x-14)+(z-11))*Math.SQRT1_2*elevation*scale].map(Math.round).join(' ');
const lines=[`# viewport ${w}x${h}@1`,'frames 15','expect PERPETUAL CARE'];
const click=mobile?'touch':'click';
function command(t){lines.push(t);}
function select(t){command(`${click} =${t}`);command('frames 4');}
function build(type,name,x,z,ww,hh){
 select('Rooms');command(`${click} ${name}`);command('frames 4');
 if(mobile){command(`${click} ${at(x+.5,z+.5)}`);command(`${click} ${at(x+ww-.5,z+hh-.5)}`);}else command(`drag ${at(x+.5,z+.5)} ${at(x+ww-.5,z+hh-.5)} 20`);
 command('frames 5');command('expect Build room');command(`${click} Build room`);command('frames 8');
}
function place(x,z){command(`${click} ${at(x+.5,z+.5)}`);command('frames 5');}
function hire(name){select('Staff');command(`${click} Hire ${name}`);command('frames 5');}
build('gp','GP office',3,3,5,5);place(3,3);place(4,3);hire('Doctor');
build('pharmacy','Pharmacy',18,3,4,4);place(18,3);hire('Nurse');
build('ward','Ward',18,9,5,5);place(18,9);hire('Nurse');
if(!mobile){
 build('staff','Staff room',3,10,4,4);place(3,10);
 build('toilets','Toilets',3,16,3,3);place(3,16);place(4,16);hire('Caretaker');
}
if(depth){
 build('research','Research lab',8,10,4,4);place(8,10);hire('Researcher');
 select('Manage');select('Research');command('expect Diagnostic protocols');command('click Fund $2,200');command('frames 5');command('save research');select('Back to hospital');
 select('Manage');select('People');command('click Train $900');command('frames 5');command('click +10% pay');command('frames 5');command('save staff-development');select('Back to hospital');
 select('Manage');select('Rooms');command('click Upgrade $2,440');command('frames 5');command('save refit');select('Policies');command('click Urgent first');command('click Thorough');command('frames 5');command('save policies');select('Back to hospital');
}
if(operations){
 // Exercise paid expansion and free relocation before the hospital opens.
 command('key Escape 1');command('frames 4');place(6,6);select('Manage');select('Rooms');command(`${click} Expand room`);command('frames 4');
 if(mobile){place(2,2);place(8,8);}else command(`drag ${at(2.5,2.5)} ${at(8.5,8.5)} 20`);
 command('frames 5');command('expect Expand $');command(`${click} Expand $`);command('frames 5');command('expect Room expanded.');command('save expanded');
 select('Manage');select('Rooms');command(`${click} Rearrange`);command('frames 4');place(3,3);command('key KeyR 1');place(4,5);command('expect Furnishing moved');command('save rearranged');command('key Escape 1');command('frames 4');
 select('Manage');select('Supplies');command('expect Keep the cupboards ready.');command(`${click} Manual`);command('frames 4');command(`${click} Automatic`);command('frames 4');command('save supplies');
 command(`${click} Build a store room`);command('frames 4');
 if(mobile){place(18,16);place(21,19);}else command(`drag ${at(18.5,16.5)} ${at(21.5,19.5)} 20`);
 command('frames 5');command(`${click} Build room`);command('frames 5');place(18,16);command('key Escape 1');command('frames 4');
 select('Manage');select('Supplies');command(`${click} Order 24`);command('frames 4');command('expect Delivery ordered');command('save delivery-ordered');select('Back to hospital');command(`${click} Flow`);command('frames 4');command('expect Flow on');
}
select('Hospital');command('save furnished');command(`${click} Open hospital`);command('frames 10');command('key KeyF 1');command('key KeyF 1');command('frames 1200');command('save running');
if(depth){command('frames 1800');select('Manage');select('Contracts');command('expect Community care grant');command('click Accept contract');command('frames 5');command('expect Contract accepted');command('save contract');select('Back to hospital');command('frames 120');command('save developed-hospital');}
if(!mobile){select('Options');command('frames 10');command('expect Frame rate limit');command('save graphics');command('key Escape 1');command('frames 5');}
if(mobile&&!operations){
 select('Manage');command('touch Urgent first');command('frames 4');select('Research');command('expect Diagnostic protocols');command('touch Fund $2,200');command('frames 5');command('save mobile-research');select('People');command('touch +10% pay');command('frames 5');select('Rooms');command('expect ROOM QUALITY');select('Contracts');command('expect Community care grant');command('save mobile-contracts');select('Back to hospital');
}
command('key Space 1');command('frames 5');command('save final');
fs.writeFileSync(operations?(mobile?'tests/operations-phone.play':'tests/operations.play'):depth?'tests/management.play':mobile?'tests/phone.play':'tests/publish.play',lines.join('\n')+'\n');
