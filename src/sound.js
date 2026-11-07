import { files } from 'starhermit:engine';
import { OfflineAudioContext, createClip, loadClip, play, context } from 'starhermit:audio';

const clips=new Map();let music=null,musicClip=null,requested=false;
async function tone(name,notes,duration,gain=.2){
 const rate=22050,ctx=new OfflineAudioContext(1,Math.ceil(rate*duration),rate);
 for(const [frequency,start,length]of notes){const osc=ctx.createOscillator(),env=ctx.createGain();osc.type='sine';osc.frequency.value=frequency;env.gain.setValueAtTime(0,start);env.gain.linearRampToValueAtTime(gain,start+.006);env.gain.exponentialRampToValueAtTime(.0001,start+length);osc.connect(env).connect(ctx.destination);osc.start(start);osc.stop(start+length);}
 clips.set(name,createClip(await ctx.startRendering()));
}
export function init(){
 tone('click',[[550,0,.06]],.08,.09);tone('build',[[262,0,.1],[392,.055,.13],[524,.11,.17]],.3,.13);tone('error',[[180,0,.13],[146,.1,.13]],.25,.09);tone('cure',[[524,0,.2],[660,.12,.22],[784,.25,.28]],.55,.1);
 if(files.exists('assets/audio/hospital.ogg'))loadClip('assets/audio/hospital.ogg').then(c=>{musicClip=c;});
}
export function cue(name){const clip=clips.get(name);if(clip)try{play(clip,{bus:name==='cure'?'effects':'interface',gain:1});}catch{}}
export function update(active){
 if(context.state!=='running'||!musicClip)return;
 if(active&&!music){try{music=play(musicClip,{bus:'music',gain:.22,loop:true});}catch{}}
 if(!active&&music){music.stop();music=null;}
}
