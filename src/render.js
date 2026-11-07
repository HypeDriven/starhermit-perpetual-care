import { frame, levelSettings } from 'starhermit:engine';
import { Color, Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, PlaneGeometry, OrthographicCamera, DirectionalLight, HemisphereLight, AmbientLight, InstancedMesh, Object3D, Vector2, Vector3, Raycaster, Plane, Box3, GLTFLoader, PCFSoftShadowMap, ACESFilmicToneMapping, renderer, scene } from 'starhermit:scene';
import { WIDTH, DEPTH, ROOM_TYPES, EQUIPMENT, STAFF_TYPES, CONDITIONS, roomStatus, footprint } from './model.js';

const BOX=new BoxGeometry(1,1,1), CYL=new CylinderGeometry(1,1,1,10), SPHERE=new SphereGeometry(1,10,7);
const mats=new Map(),models=new Map(),actors=new Map();
const ghostMaterials=[new MeshBasicMaterial({color:'#cf7163',transparent:true,opacity:.4,depthWrite:false}),new MeshBasicMaterial({color:'#6fa88a',transparent:true,opacity:.4,depthWrite:false})];
const floorGroup=new Group(), building=new Group(), furniture=new Group(), people=new Group(), garden=new Group(), ghosts=new Group(), rubbish=new Group();
const camera=new OrthographicCamera(-24,24,18,-18,.1,180), ray=new Raycaster(), ground=new Plane(new Vector3(0,1,0),0), scratch=new Vector3();
let revision=-1,modelVersion=0,drawnVersion=-1,lastLevel=-1,wallMode=1,lastWallMode=-1;
let litterRevision=-1;
let cam={x:14,z:11,zoom:1,rotation:0}, viewport={w:1440,h:900,panel:286,top:100,bottom:64};
const wallParts=[];
function mat(color,rough=.8){const k=color+':'+rough;if(!mats.has(k))mats.set(k,new MeshStandardMaterial({color,roughness:rough,metalness:rough<.5?.12:0}));return mats.get(k);}
function box(parent,x,y,z,w,h,d,color,rough=.8){const m=new Mesh(BOX,mat(color,rough));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cyl(parent,x,y,z,r,h,color){const m=new Mesh(CYL,mat(color));m.position.set(x,y,z);m.scale.set(r,h,r);m.castShadow=true;parent.add(m);return m;}
function orb(parent,x,y,z,r,color){const m=new Mesh(SPHERE,mat(color));m.position.set(x,y,z);m.scale.set(r,r,r);m.castShadow=true;parent.add(m);return m;}
function plant(parent,x,z,k=1){cyl(parent,x,.2*k,z,.23*k,.4*k,'#bf8061');cyl(parent,x,.23*k,z,.25*k,.06*k,'#d89d78');orb(parent,x,.65*k,z,.35*k,'#6c8d61');orb(parent,x-.18*k,.86*k,z,.23*k,'#84a06d');orb(parent,x+.16*k,.8*k,z-.1*k,.24*k,'#52794e');}
function tree(x,z,scale=1){cyl(garden,x,.7*scale,z,.13*scale,1.4*scale,'#9e8265');orb(garden,x,1.8*scale,z,.9*scale,'#648b65');orb(garden,x+.5*scale,2.1*scale,z,.64*scale,'#77996c');orb(garden,x-.4*scale,2.4*scale,z,.65*scale,'#88a373');}

export function init(){
 scene.background=new Color('#e3e7d7');
 renderer.camera=camera;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;
 scene.add(floorGroup,building,furniture,people,garden,ghosts,rubbish,new HemisphereLight('#fff7df','#8e9e81',1.6),new AmbientLight('#ffffff',.25));
 const sun=new DirectionalLight('#fff4d8',2.4);sun.position.set(-8,28,12);sun.target.position.set(14,0,11);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;sun.shadow.camera.near=.5;sun.shadow.camera.far=85;sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun,sun.target);
 box(floorGroup,14,-.52,11,38,.5,32,'#b2bea0');box(floorGroup,14,-.19,11,28.6,.36,22.6,'#d3c9b0');
 box(floorGroup,14,-.03,11,28.15,.12,22.15,'#c9c9af');
 const n=(WIDTH-2)*(DEPTH-2),tiles=new InstancedMesh(BOX,mat('#ffffff'),n),o=new Object3D();let idx=0;
 for(let z=1;z<DEPTH-1;z++)for(let x=1;x<WIDTH-1;x++){
  o.position.set(x+.5,.018,z+.5);o.scale.set(.982,.055,.982);o.updateMatrixWorld();tiles.setMatrixAt(idx,o.matrix);
  tiles.setColorAt(idx,new Color(x>=12&&x<=15?(z%2?'#c3d2b8':'#d0ddc4'):(x+z)%2?'#eee8d5':'#dfdbc7'));idx++;
 }
 tiles.instanceMatrix.needsUpdate=true;if(tiles.instanceColor)tiles.instanceColor.needsUpdate=true;tiles.receiveShadow=true;floorGroup.add(tiles);
 const corridor=box(floorGroup,14,.064,11,4,.023,20,'#bdcfb1');corridor.castShadow=false;
 for(let x=1;x<WIDTH;x++){const m=box(floorGroup,x,.082,11,.013,.008,20,'#c7ccb9');m.castShadow=false;m.receiveShadow=false;}
 for(let z=1;z<DEPTH;z++){const m=box(floorGroup,14,.082,z,26,.008,.013,'#c7ccb9');m.castShadow=false;m.receiveShadow=false;}
 // Entrance terrace, paths, hedges and lawn frame the editable floor.
 box(garden,14,-.12,23,7,.12,3,'#c6bda6');box(garden,14,-.08,24.5,6,.1,1,'#d7cdb5');
 for(let i=0;i<13;i++){box(garden,1+i*2,.1,-.65,1.7,.4,.65,'#8b9c72');box(garden,1+i*2,.31,-.65,1.7,.08,.7,'#9aab80');}
 for(const[x,z,k]of[[-2,3,1.4],[-2,12,1.15],[30,1,1.3],[31,11,1.45],[29,23,1.1],[-2,23,1.2]])tree(x,z,k);
 for(const[x,z]of[[1,22],[25,22],[-.5,7],[28.5,17]])plant(garden,x,z,1.8);
 box(garden,4,-.05,24,9,.08,1.1,'#d4cbb8');box(garden,24,-.05,24,7,.08,1.1,'#d4cbb8');
 for(let i=0;i<8;i++){cyl(garden,3+i*3,.26,-1.5,.2,.4,'#b9866b');orb(garden,3+i*3,.48,-1.5,.29,i%2?'#d0ac83':'#9baa7b');}
 // A staffed reception point is part of the lease, not a free treatment room.
 box(floorGroup,14.9,.48,18.5,1.5,.9,1,'#8da98e');box(floorGroup,14.9,.95,18.5,1.65,.12,1.1,'#c5ad8a');
 box(floorGroup,14.9,1.19,18.5,.44,.38,.25,'#ede5cc');box(floorGroup,14.9,1.2,18.34,.34,.24,.03,'#53796d');
 const receptionist=personModel('#deca9d',true);receptionist.position.set(15.2,0,17.4);people.add(receptionist);
 plant(floorGroup,16.1,19.2,.9);plant(floorGroup,11.2,19.7,1.1);
 for(const name of ['desk','bed','pharmacy','scanner','sofa','plant'])new GLTFLoader().loadAsync('assets/models/'+name+'.glb').then(g=>{
  const root=g.scene;if(name==='bed')root.rotation.y=Math.PI/2;
  const b=new Box3().setFromObject(root),size=b.getSize(new Vector3()),centre=b.getCenter(new Vector3());
  const norm=new Group();root.position.set(-centre.x,-b.min.y,-centre.z);norm.add(root);norm.userData.size=[size.x,size.y,size.z];
  root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;for(const material of(Array.isArray(m.material)?m.material:[m.material])){material.metalness=0;material.roughness=.85;}}});models.set(name,norm);modelVersion++;
 },()=>{});
}
function personModel(color,staff=false){
 const g=new Group();cyl(g,0,.43,0,.16,.47,color);orb(g,0,.88,0,.16,'#d7ad8c');
 const hair=orb(g,0,.96,-.025,.14,staff?'#5b5144':'#705741');hair.scale.y=.55;
 const left=box(g,-.085,.15,0,.095,.3,.11,'#505b55'),right=box(g,.085,.15,0,.095,.3,.11,'#505b55');
 const larm=box(g,-.19,.48,0,.085,.33,.085,color),rarm=box(g,.19,.48,0,.085,.33,.085,color);
 if(staff)box(g,.07,.58,.145,.08,.08,.018,'#d18e6d');
 g.userData.limbs=[left,right,larm,rarm];return g;
}
function fallback(type){
 const g=new Group();
 if(['bed','exam','operating'].includes(type)){
  box(g,0,.39,0,.78,.16,1.66,'#eee9d9');box(g,0,.51,.17,.7,.14,1.12,type==='operating'?'#8eaaa5':'#a8c3a9');box(g,0,.54,-.57,.68,.17,.42,'#f9f4e7');
  for(const x of[-.34,.34])for(const z of[-.7,.7]){box(g,x,.2,z,.06,.35,.06,'#a2b0a3');orb(g,x,.07,z,.07,'#64766b');}
  box(g,0,.71,-.84,.85,.5,.07,'#c7d1c1');box(g,0,.55,.84,.85,.25,.07,'#c7d1c1');
 }else if(type==='desk'){
  box(g,0,.64,0,.85,.1,.7,'#c0a181');box(g,-.25,.32,0,.28,.6,.58,'#8fa591');box(g,.27,.31,.1,.07,.59,.4,'#8fa591');box(g,0,.9,-.15,.36,.37,.23,'#e6dfcc');box(g,0,.91,-.28,.27,.22,.02,'#486a59');
 }else if(type==='pharmacy'){
  box(g,0,.85,0,.85,1.7,.57,'#d3d8bf');for(let i=0;i<3;i++){box(g,0,.6+i*.4,0,.86,.04,.65,'#8ca58c');for(let j=0;j<3;j++)cyl(g,-.25+j*.25,.73+i*.4,-.03,.065,.2,j%2?'#c79272':'#9cacb5');}
 }else if(type==='scanner'){
  box(g,0,.28,.3,.75,.4,1.8,'#8caea3');const ring=new Mesh(new TorusGeometry(.65,.24,8,20),mat('#d5d4b8'));ring.position.set(0,1.06,-.35);g.add(ring);box(g,0,.52,.4,.7,.12,1.5,'#eee7d1');
 }else if(['sofa','bench'].includes(type)){
  box(g,0,.31,0,1.7,.35,.7,'#b98770');box(g,0,.68,-.29,1.75,.6,.2,'#c1957a');for(const x of[-.8,.8])box(g,x,.51,0,.16,.55,.82,'#c1957a');
 }else if(type==='plant')plant(g,0,0,1);
 else if(type==='toilet'){box(g,0,.12,0,.75,.15,.8,'#c2cabc');cyl(g,0,.35,.1,.26,.35,'#f6f2df');box(g,0,.6,-.25,.48,.75,.22,'#e7e7d5');}
 else if(type==='sink'){box(g,0,.45,0,.7,.8,.55,'#9cb7ad');box(g,0,.88,0,.76,.1,.6,'#f6f2df');cyl(g,0,1,-.19,.035,.25,'#a4b5ad');}
 else if(type==='vending'){box(g,0,.8,0,.8,1.6,.7,'#c68a67');box(g,-.07,1,-.365,.52,.88,.04,'#6f9682');box(g,0,.35,-.365,.5,.16,.04,'#405f52');for(let j=0;j<3;j++)for(let i=0;i<3;i++)box(g,-.23+i*.16,.73+j*.24,-.4,.09,.16,.03,'#ddc89b');}
 else if(type==='bin'){cyl(g,0,.3,0,.27,.6,'#7d9583');cyl(g,0,.62,0,.29,.08,'#b6bfaa');}
 else if(type==='radiator'){box(g,0,.4,0,.8,.65,.2,'#e5decb');for(let x=-.3;x<=.3;x+=.1)box(g,x,.4,-.12,.04,.58,.08,'#b9bca7');}
 return g;
}
function prop(i){
 const e=EQUIPMENT[i.type],source=models.get(e.model),f=footprint(i.type,i.rotation),g=new Group();let shape;
 if(source){shape=source.clone();const [w,h,d]=source.userData.size,fit=Math.min((e.w-.15)/w,(e.h-.15)/d,(['pharmacy','scanner','vending'].includes(i.type)?1.9:1.15)/h);shape.scale.set(fit,fit,fit);}
 else shape=fallback(i.type);
 shape.rotation.y=i.rotation*Math.PI/2;g.add(shape);g.position.set(i.x+f.w/2,.06,i.z+f.h/2);g.userData.item=i.id;return g;
}
function wall(parent,r,x,z,side){
 const d=r.door,isDoor=d.x===x&&d.z===z&&d.side===side,horizontal=side==='north'||side==='south';
 const xx=x+(horizontal?.5:side==='west'?0:1),zz=z+(horizontal?(side==='north'?0:1):.5);
 const g=new Group();g.position.set(xx,0,zz);parent.add(g);
 if(isDoor){
  box(g,0,.018,0,horizontal?.92:.14,.04,horizontal?.14:.92,'#8d8068');
  for(const sign of[-1,1])box(g,horizontal?sign*.45:0,.85,horizontal?0:sign*.45,horizontal?.09:.17,1.7,horizontal?.17:.09,'#d2c7aa');
  box(g,0,1.67,0,horizontal?.98:.18,.12,horizontal?.18:.98,'#d2c7aa');
  box(g,horizontal?-.32:0,1.57,horizontal?0:-.32,horizontal?.18:.19,.12,horizontal?.19:.18,'#77987b');
 }else{
  box(g,0,.4,0,horizontal?1.02:.12,.8,horizontal?.12:1.02,ROOM_TYPES[r.type].wall);
  const upper=box(g,0,1.14,0,horizontal?1.02:.12,.68,horizontal?.12:1.02,'#f0e9d7');
  const cap=box(g,0,1.51,0,horizontal?1.04:.16,.06,horizontal?.16:1.04,'#d8cfb7');
  wallParts.push({upper,cap,g,side});
  box(g,0,.08,0,horizontal?1.03:.15,.08,horizontal?.15:1.03,'#c6c6ad');
 }
}
function rebuild(s){
 building.clear();furniture.clear();wallParts.length=0;
 for(const r of s.rooms){
  const t=ROOM_TYPES[r.type];box(building,r.x+r.w/2,.06,r.z+r.h/2,r.w-.08,.06,r.h-.08,t.color);
  // Fine perimeter trim makes adjacent floors easy to read.
  for(let z=r.z;z<r.z+r.h;z++)for(let x=r.x;x<r.x+r.w;x++)if((x+z)%2)box(building,x+.5,.095,z+.5,.97,.015,.97,t.color);
  for(let x=r.x;x<r.x+r.w;x++){wall(building,r,x,r.z,'north');wall(building,r,x,r.z+r.h-1,'south');}
  for(let z=r.z;z<r.z+r.h;z++){wall(building,r,r.x,z,'west');wall(building,r,r.x+r.w-1,z,'east');}
  const d=r.door;for(let n=0;n<(r.level||0);n++)box(building,d.x+.3+n*.16,1.72,d.z+.5,.11,.11,.11,'#dbb66d',.4);
 }
 for(const i of s.items)furniture.add(prop(i));revision=s.revision;drawnVersion=modelVersion;lastWallMode=-1;
}
export function setCamera(part){Object.assign(cam,part);cam.zoom=Math.max(.55,Math.min(2.7,cam.zoom));}
export function cameraState(){return cam;}
export function pan(dx,dz){const a=Math.PI/4+cam.rotation*Math.PI/2;cam.x+=Math.cos(a)*dx+Math.sin(a)*dz;cam.z+=-Math.sin(a)*dx+Math.cos(a)*dz;cam.x=Math.max(-2,Math.min(30,cam.x));cam.z=Math.max(-2,Math.min(24,cam.z));}
export function setWalls(mode){wallMode=mode;lastWallMode=-1;}
export function updateCamera(w,h,panel,top=100,bottom=64){
 viewport={w,h,panel,top,bottom};const aspect=w/h,pixelScale=Math.min((w-panel-28)/39,(h-top-bottom-45)/27),height=h/Math.max(3,pixelScale)/cam.zoom,a=Math.PI/4+cam.rotation*Math.PI/2;
 camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;
 camera.position.set(cam.x+Math.sin(a)*35,33,cam.z+Math.cos(a)*35);camera.lookAt(cam.x,0,cam.z);
 camera.setViewOffset(w,h,-panel/2,-(top-bottom)/2,w,h);camera.updateProjectionMatrix();
}
export function pick(x,y){
 ray.setFromCamera(new Vector2(x/viewport.w*2-1,1-y/viewport.h*2),camera);const p=ray.ray.intersectPlane(ground,scratch);return p?{x:Math.floor(p.x),z:Math.floor(p.z),wx:p.x,wz:p.z}:null;
}
export function project(x,y,z){const p=new Vector3(x,y,z).project(camera);return{x:(p.x+1)*viewport.w/2,y:(1-p.y)*viewport.h/2};}
export function preview(data){
 ghosts.clear();if(!data)return;
 const material=ghostMaterials[data.ok?1:0];
 const {x,z,w,h}=data,m=new Mesh(BOX,material);m.position.set(x+w/2,.12,z+h/2);m.scale.set(w-.06,.09,h-.06);ghosts.add(m);
 for(const [xx,zz,ww,dd] of [[x,z,w,.06],[x,z+h-.06,w,.06],[x,z,.06,h],[x+w-.06,z,.06,h]])box(ghosts,xx+ww/2,.16,zz+dd/2,ww,.06,dd,data.ok?'#527f62':'#ad544a');
}
export function update(s,time,selected=null){
 const f=frame();if(f.levelIndex!==lastLevel){renderer.shadowMap.enabled=f.levelIndex>=2;renderer.ao=f.levelIndex>=4?{radius:.6,intensity:.55}:null;renderer.bloom=null;renderer.grade=f.levelIndex>=2?{contrast:.08,saturation:.95,vignette:{amount:.12}}:null;renderer.antialias=f.levelIndex>=4?'smaa':f.levelIndex>=2?'fxaa':'off';lastLevel=f.levelIndex;}
 if(revision!==s.revision||drawnVersion!==modelVersion)rebuild(s);
 if(litterRevision!==s.litterRevision){rubbish.clear();for(const l of s.litter){const m=orb(rubbish,l.x,.15,l.z,.13,'#ceb99c');m.scale.set(.18,.045,.14);m.rotation.y=l.id*.8;}litterRevision=s.litterRevision;}
 if(lastWallMode!==wallMode||update.lastRotation!==cam.rotation){
  const a=(cam.rotation%4+4)%4;
  for(const p of wallParts){const front= (a===0&&(p.side==='south'||p.side==='east'))||(a===1&&(p.side==='south'||p.side==='west'))||(a===2&&(p.side==='north'||p.side==='west'))||(a===3&&(p.side==='north'||p.side==='east'));const full=wallMode===2||wallMode===1&&!front;p.upper.visible=full;p.cap.position.y=full?1.51:.83;p.g.visible=wallMode!==0;}
  lastWallMode=wallMode;update.lastRotation=cam.rotation;
 }
 const all=[...s.staff,...s.patients],ids=new Set(all.map(a=>a.id));
 for(const[id,g]of actors)if(!ids.has(id)){people.remove(g);actors.delete(id);}
 for(const a of all){
  let g=actors.get(a.id);if(!g){g=personModel(a.type?STAFF_TYPES[a.type].color:CONDITIONS[a.condition].color,!!a.type);actors.set(a.id,g);people.add(g);}
  g.position.set(a.x,.08,a.z);g.rotation.set(0,a.angle||0,0,'XYZ');g.visible=!(a.amenity?.kind==='toilet'&&!a.path.length);
  const bed=a.state==='service'&&a.bed?s.items.find(i=>i.id===a.bed):null;
  if(bed){const f=footprint(bed.type,bed.rotation),angle=bed.rotation*Math.PI/2;g.position.set(bed.x+f.w/2+Math.sin(angle)*.35,.68,bed.z+f.h/2+Math.cos(angle)*.35);g.rotation.set(-Math.PI/2,angle,0,'YXZ');}
  const walk=a.path.length?Math.sin(time*8+a.id)*.55:0,limbs=g.userData.limbs;limbs[0].rotation.x=walk;limbs[1].rotation.x=-walk;limbs[2].rotation.x=-walk*.65;limbs[3].rotation.x=walk*.65;
  if(a.seat&&!a.path.length){g.position.y=.19;limbs[0].rotation.x=-1.3;limbs[1].rotation.x=-1.3;}
  if(a.amenity?.kind==='drink'&&!a.path.length)limbs[3].rotation.x=-1.9;
  if((a.type==='researcher'||a.training)&&!a.path.length)limbs[3].rotation.x=-.8+Math.sin(time*5)*.08;
  g.scale.setScalar(bed?.85:selected?.kind==='patient'&&selected.id===a.id?1.15:1);
 }
}
export function disposePreview(){ghosts.clear();}
