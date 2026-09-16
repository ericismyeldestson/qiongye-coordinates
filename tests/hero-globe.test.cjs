const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {ROUTES,geo,routePoints,geometry,camera}=require('../miniprogram/components/hero-globe/scene');
const {createMotion}=require('../miniprogram/components/hero-globe/renderer');

test('independent globe routes have real coordinates and valid geometry',()=>{
 for(const [,start,end,height] of ROUTES){const route=routePoints(start,end,height);assert.equal(route.length,65);
  for(const [got,want] of [[route[0],geo(start)],[route.at(-1),geo(end)]])for(let i=0;i<3;i++)assert.ok(Math.abs(got[i]-want[i])<1e-12);
  assert.ok(Math.abs(Math.hypot(...route[32])-1-height)<1e-12);
 }
 const mesh=geometry();for(const data of Object.values(mesh)){assert.equal(data.length%11,0);assert.ok(data.every(Number.isFinite));}assert.equal(mesh.points.length/11,ROUTES.length*2);
});

test('hero camera starts at 18N 30W and completes a two-minute rotation',()=>{
 const point=geo([18,-30]),view=camera(0);const transformed=[0,1,2].map(i=>point.reduce((s,v,j)=>s+v*view[j*3+i],0));
 assert.ok(Math.abs(transformed[0])<1e-6);assert.ok(Math.abs(transformed[1])<1e-6);assert.ok(Math.abs(transformed[2]-1)<1e-6);
 assert.notDeepEqual(camera(30000),view);for(let i=0;i<9;i++)assert.ok(Math.abs(camera(120000)[i]-view[i])<1e-6);
});

function clockCanvas(){let id=0;const callbacks=new Map();return {requestAnimationFrame(cb){callbacks.set(++id,cb);return id;},cancelAnimationFrame(key){callbacks.delete(key);},frame(time){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(cb=>cb(time));},count(){return callbacks.size;}};}
test('hero motion caps render frequency and pauses without rotating through time spent hidden',()=>{
 const canvas=clockCanvas(),frames=[],motion=createMotion(canvas,t=>frames.push(t));motion.setRunning(true);motion.setRunning(true);assert.equal(canvas.count(),1);
 for(let i=0;i<=60;i++)canvas.frame(i*1000/60);assert.ok(frames.length>=29&&frames.length<=31,frames.length);assert.ok(Math.abs(frames.at(-1)-1000)<1);
 motion.setRunning(false);assert.equal(canvas.count(),0);const last=frames.at(-1);canvas.frame(15000);assert.equal(frames.at(-1),last);
 motion.setRunning(true);canvas.frame(20000);assert.equal(frames.at(-1),last);canvas.frame(20040);assert.equal(frames.at(-1),last+40);
 motion.dispose();motion.setRunning(true);assert.equal(canvas.count(),0);
});

test('hero rendering failure stops scheduling and invokes fallback once',()=>{
 const canvas=clockCanvas();let errors=0;const motion=createMotion(canvas,()=>{throw Error('context lost');},()=>errors++);
 motion.setRunning(true);canvas.frame(0);canvas.frame(100);assert.equal(errors,1);assert.equal(canvas.count(),0);motion.dispose();
});

function component(){
 let definition,queryCallback,visibilityCallback,resolveReady;const running=[],draws=[];let released=0,motionReleased=0,disconnected=0;
 const ready=new Promise(r=>resolveReady=r),renderer={ready,draw:t=>draws.push(t),dispose:()=>released++};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../miniprogram/components/hero-globe/index.js'),'utf8'),{
  Component:x=>definition=x,require:()=>({createRenderer:()=>renderer,createMotion:()=>({setRunning:x=>running.push(x),dispose:()=>motionReleased++})}),wx:{getWindowInfo:()=>({pixelRatio:3})}
 });
 const p={...definition.methods,data:{...definition.data},setData:update=>Object.assign(p.data,update),createIntersectionObserver:()=>({relativeToViewport(){return this;},observe:(selector,cb)=>visibilityCallback=cb,disconnect:()=>disconnected++}),createSelectorQuery:()=>({select(){return this;},fields(){return this;},exec:cb=>queryCallback=cb})};
 return {p,definition,running,draws,ready:async()=>{definition.lifetimes.attached.call(p);definition.lifetimes.ready.call(p);const task=queryCallback([{node:{},width:130,height:130}]);return {finish:async()=>{resolveReady(true);await task;}};},visible:value=>visibilityCallback({intersectionRatio:value?1:0}),counts:()=>({released,motionReleased,disconnected})};
}

test('hero component runs only while both on screen and on the visible page, and releases on detach',async()=>{
 const c=component(),loading=await c.ready();await loading.finish();assert.equal(c.p.data.ready,true);assert.deepEqual(c.draws,[0]);assert.equal(c.running.at(-1),false);
 c.visible(true);assert.equal(c.running.at(-1),true);c.definition.pageLifetimes.hide.call(c.p);assert.equal(c.running.at(-1),false);
 c.visible(true);assert.equal(c.running.at(-1),false);c.definition.pageLifetimes.show.call(c.p);assert.equal(c.running.at(-1),true);
 c.visible(false);assert.equal(c.running.at(-1),false);c.definition.lifetimes.detached.call(c.p);assert.deepEqual(c.counts(),{released:1,motionReleased:1,disconnected:1});
});

test('hero texture loading completed after page exit cannot start an animation or update detached UI',async()=>{
 const c=component(),loading=await c.ready();c.definition.lifetimes.detached.call(c.p);await loading.finish();assert.equal(c.p.data.ready,false);assert.deepEqual(c.draws,[]);assert.deepEqual(c.running,[]);assert.equal(c.counts().released,1);
});
