// Generates a real mouse/touch playthrough of room drawing and furnishing.
import fs from 'node:fs';
const mobile=process.argv.includes('--phone'),w=mobile?390:1440,h=mobile?844:1000,U=Math.max(.8,Math.min(1.1,w/1440)),panel=mobile?0:310*U,top=(mobile?132:106)*U,bottom=(mobile?389:64)*U;
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
select('Hospital');command('save furnished');command(`${click} Open hospital`);command('frames 10');command('key KeyF 1');command('key KeyF 1');command('frames 1200');command('save running');
if(!mobile){select('Options');command('frames 10');command('expect Frame rate limit');command('save graphics');command('key Escape 1');command('frames 5');}
command('key Space 1');command('frames 5');command('save final');
fs.writeFileSync(mobile?'tests/phone.play':'tests/publish.play',lines.join('\n')+'\n');
