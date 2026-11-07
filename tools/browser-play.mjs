// End-to-end browser construction through the engine's supported localhost
// play-script driver. The test page is served in memory, never published.
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFileSync,existsSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||'.'),out=resolve(process.argv[3]||'/tmp/perpetual-care-browser-play');mkdirSync(out,{recursive:true});
const parent=resolve(root,'..');
const dep=[root,...readdirSync(parent).map(p=>join(parent,p))].find(p=>existsSync(join(p,'node_modules/playwright-core')));
if(!dep)throw new Error('playwright-core is required in the game or a sibling game');
const {chromium}=createRequire(join(dep,'package.json'))('playwright-core');
const helper=process.env.STARHERMIT_CHROME_HELPER||join(parent,'tools/gpu-chrome.mjs');
const {launchChrome}=await import(pathToFileURL(helper));
const index=readFileSync(join(root,'index.html'),'utf8');
const config=JSON.parse(index.match(/id="starhermit-config">([^<]+)/)[1]);
const entry=index.match(/src="([^"]+starhermit\.js)"/)[1];
const manifest={...config.manifest,url:new URL('manifest.json',entry).href};
const settingsOnly=process.argv.includes('--settings');
const depth=process.argv.includes('--depth');
const phoneOnly=process.argv.includes('--phone-only');
let script='',restore=false,restoreScript='';
const types={'.js':'text/javascript','.json':'application/json','.html':'text/html','.glb':'model/gltf-binary','.ogg':'audio/ogg','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon'};
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://x').pathname;
 if(path==='/__play.html'){
  const data=JSON.stringify({entry,manifest,runtime:{play:restore?restoreScript:script,...(settingsOnly?{}:{quality:'molecular'}),ephemeral:false}}).replaceAll('<','\\u003c');
  res.writeHead(200,{'content-type':'text/html'}).end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;display:block}</style></head><body><canvas></canvas><script type="application/json" id="check">${data}</script><script type="module" src="/__driver.mjs"></script></body></html>`);return;
 }
 if(path==='/__driver.mjs'){res.writeHead(200,{'content-type':'text/javascript'}).end("const options=JSON.parse(document.querySelector('#check').textContent);const {start}=await import(options.entry);start({manifest:options.manifest,package:new URL('./',location.href),canvas:document.querySelector('canvas'),runtime:options.runtime}).catch(e=>console.error(e));");return;}
 if(path==='/api/v1/time'){res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({serverTime:Date.now(),serverTimeIso:new Date().toISOString()}));return;}
 const clean=decodeURIComponent(path).replace(/^\//,'');if(clean.split('/').some(p=>p.startsWith('.')||['tests','tools','node_modules'].includes(p))){res.writeHead(404).end();return;}
 try{res.writeHead(200,{'content-type':types[extname(clean)]||'application/octet-stream'}).end(readFileSync(join(root,clean)));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/__play.html`;
const {browser,close,gpu}=await launchChrome(chromium);console.log('Browser play on '+gpu);
let failed=false;
try{
 for(const name of settingsOnly?['desktop']:phoneOnly?['phone']:['desktop','phone']){
  restore=false;script=readFileSync(join(root,'tests',name==='phone'?'phone.play':depth?'management.play':'publish.play'),'utf8');
  restoreScript='frames 20\nexpect A healthy balance.\nexpect RX\nexpect WD\nexpect Play\n';
  if(name==='phone')restoreScript+='touch =Manage\nframes 4\ntouch =Research\nframes 4\nexpect In progress\ntouch =People\nframes 4\nexpect $528/day\nsave restored-management\ntouch =Back to hospital\nframes 4\n';
  else if(depth)restoreScript+='click =Manage\nframes 4\nclick =People\nframes 4\nexpect Level 2\nclick =Research\nframes 4\nexpect Complete\nsave restored-management\nclick =Back to hospital\nframes 4\n';
  restoreScript+='save restored\n';
  if(settingsOnly)script='frames 30\nclick =Options\nframes 10\nexpect Graphics quality\nsave quality-menu\n';
  const viewport=name==='phone'?{width:390,height:844}:{width:1440,height:1000};
  const ctx=await browser.newContext({viewport,isMobile:name==='phone',hasTouch:name==='phone'}),page=await ctx.newPage(),problems=[];
  page.on('pageerror',e=>problems.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type())&&!/^No available adapters\.$|GL Driver Message/.test(m.text()))problems.push(m.type()+': '+m.text());});
  await page.goto(url,{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>globalThis.starhermitResults?.lines?.some(l=>/^(PASS|FAIL)/.test(l))||document.documentElement.dataset.starhermit==='error',null,{timeout:180000});
  const state=await page.evaluate(()=>({state:document.documentElement.dataset.starhermit,results:globalThis.starhermitResults,store:Object.fromEntries(Object.entries(localStorage))}));
  const pass=state.results?.lines?.some(l=>l.startsWith('PASS'))&&!state.results?.lines?.some(l=>l.startsWith('FAIL'))&&problems.length===0;
  writeFileSync(join(out,name+'.json'),JSON.stringify({pass,...state,problems},null,2));await page.screenshot({path:join(out,name+'.png')});
  console.log(`${pass?'PASS':'FAIL'} ${name}: ${JSON.stringify(state.results?.lines)} ${problems.join('; ')}`);failed||=!pass;
  if(settingsOnly){await ctx.close();continue;}
  await page.keyboard.press('Escape');await page.keyboard.press('F6');await page.waitForTimeout(350);
  await page.screenshot({path:join(out,name+'.png')});
  // Reload the same origin, retaining the actual engine's durable save.
  restore=true;await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>globalThis.starhermitResults?.lines?.some(l=>/^(PASS|FAIL)/.test(l))||document.documentElement.dataset.starhermit==='error',null,{timeout:60000}).catch(async e=>{await page.screenshot({path:join(out,name+'-restore-error.png')});console.log('Restore timeout',await page.evaluate(()=>({state:document.documentElement.dataset.starhermit,text:document.body.innerText,results:globalThis.starhermitResults})));throw e;});
  const after=await page.evaluate(()=>({lines:globalThis.starhermitResults?.lines||[],state:document.documentElement.dataset.starhermit,error:document.querySelector('[role=alert]')?.textContent,store:Object.fromEntries(Object.entries(localStorage))}));
  const restored=after.lines.some(l=>l.startsWith('PASS'))&&!after.lines.some(l=>l.startsWith('FAIL'));
  console.log(`${restored?'PASS':'FAIL'} ${name} save/restore`);failed||=!restored;
  writeFileSync(join(out,name+'-restored.json'),JSON.stringify(after,null,2));await page.screenshot({path:join(out,name+'-restored.png')});await ctx.close();
 }
}finally{await close();server.close();}
process.exitCode=failed?1:0;
