const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {EXAMPLES}=require('../miniprogram/core/locations');
const {resolveTime}=require('../miniprogram/core/time');
const {encodeShare,decodeShare,shareContent,supportsImageTimeline}=require('../miniprogram/core/share');
const {createEvaluator}=require('../miniprogram/core/recommendations');
const {createExportMethods}=require('../miniprogram/core/export');
const {drawPoster,posterHeight}=require('../miniprogram/core/poster');
const {decorate}=require('../miniprogram/core/chart');
const engineModule=require('../miniprogram/core/engine');
let engine;
before(async()=>{engine=await require('./helpers/engine.cjs').createTestEngine();});
function birth(index=2){const b={...EXAMPLES[index],system:'P',example:true};const t=resolveTime(b.date,b.time+':'+b.second,b.timezone)[0];return {...b,utc:t.utc,offset:t.label};}
const state={tab:'places',placeScope:'cn',placeGoal:'overall',planet:'all',angle:'all',analysis:null};
const viewport={zoom:1,lat:0,lon:0};
function input(b=birth(),s=state,target=null,v=viewport){return encodeShare(b,s,target,v).slice(2);}
function api(){return {hideShareMenu(){},showShareMenu(){},pageScrollTo(){},getWindowInfo:()=>({pixelRatio:2}),nextTick:fn=>fn(),getAppBaseInfo:()=>({SDKVersion:'3.17.3'}),showModal(){},showToast(){}};}
function page(wx=api(),app={}){let config;const filename=path.resolve(__dirname,'../miniprogram/moondata/index.js'),original=createRequire(filename);vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:name=>name==='../core/engine'?{...engineModule,initialize:async()=>engine}:original(name),Page:p=>config=p,wx,getApp:()=>app,console});config.data=JSON.parse(JSON.stringify(config.data));config.setData=function(data,callback){Object.assign(this.data,data);if(callback)callback();};config.prepareCanvas=()=>{};config.draw=()=>{};return config;}
function context(){const text=[];return new Proxy({texts:text,measureText:s=>({width:String(s).length*10}),fillText:(s,x,y)=>text.push({s:String(s),x,y})},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});}
for(const index of [0,1,2])test('friend and timeline reconstruct authentic source birth '+EXAMPLES[index].label,()=>{
 const original=birth(index),shared=decodeShare(input(original)),a=engine.calculate(original.utc,original.latitude,original.longitude,original.system),b=engine.calculate(shared.birth.utc,shared.birth.latitude,shared.birth.longitude,shared.birth.system);
 assert.deepEqual(a,b);assert.equal(shared.birth.example,true);assert.deepEqual(shared.birth.source,original.source);assert.equal(shared.state.placeScope,'cn');assert.equal(decodeShare(decodeURIComponent(input(original))).birth.utc,original.utc);
 const content=shareContent(original,state,null,viewport);assert.equal(content.path,'/moondata/index?'+content.query);assert.ok(content.path.length<2048);
});
test('ambiguous autumn clock preserves the selected UTC instant across sharing',()=>{
 const profile={name:'回拨测试',city:'New York',date:'2024-11-03',time:'01:30',second:'00',timezone:'America/New_York',latitude:40.7128,longitude:-74.006,system:'W',example:false};
 for(const t of resolveTime(profile.date,profile.time+':00',profile.timezone)){const b={...profile,utc:t.utc};assert.equal(decodeShare(input(b)).birth.utc,t.utc);assert.equal(decodeShare(input(b)).birth.system,'W');}
});
test('share payload rejects altered time, coordinates, source labels and damaged links',()=>{
 const valid=JSON.parse(decodeURIComponent(input()));
 const bad=[r=>r[0]=99,r=>r[1][8]='1980-09-12T12:00:00.000Z',r=>r[1][6]=91,r=>r[1][0]='冒充名人',r=>r[2][0]='injected',r=>r[2][8]=['Bad',Infinity,0,''],r=>r[2][3]='bad'];
 for(const mutate of bad){const r=structuredClone(valid);mutate(r);assert.throws(()=>decodeShare(JSON.stringify(r)));}for(const value of ['%ZZ','{}','null','[','a'.repeat(8001)])assert.throws(()=>decodeShare(value));
});
test('cold shared-page load needs no previous form and restores relocation, filter and zoom',async()=>{
 const target={city:'澳门',latitude:22.20056,longitude:113.54611,country:'中国'},s={...state,tab:'map',placeGoal:'love',planet:'Venus',angle:'DSC',analysis:{}},v={zoom:3,lat:23,lon:115};
 const p=page(api(),{pendingBirth:birth(1)});p.onLoad({s:input(birth(),s,target,v)});await new Promise(r=>setImmediate(r));
 assert.equal(p.data.error,'');assert.equal(p.birth.name,birth().name);assert.equal(p.data.relocated,true);assert.equal(p.data.locationName,'澳门');assert.equal(p.data.tab,'map');assert.equal(p.data.lineCount,1);assert.deepEqual(p.viewport,v);assert.equal(p.data.candidateCount,9);
 const expected=engine.calculate(p.birth.utc,target.latitude,target.longitude,p.birth.system);assert.deepEqual(p.current.houses,expected.houses);assert.deepEqual(p.raw.lines,expected.lines);
 assert.equal(p.data.analysis.score,createEvaluator(expected.lines).analyse(target,'love').score);
 const outgoing=p.onShareAppMessage(),timeline=p.onShareTimeline();assert.equal(outgoing.path,'/moondata/index?'+timeline.query);assert.equal(decodeShare(timeline.query.slice(2)).target.city,'澳门');
});
test('damaged share does not fall back to another person and can return to form',()=>{
 let destination;const wx=api();wx.reLaunch=o=>destination=o.url;const p=page(wx,{pendingBirth:birth(1)});p.onLoad({s:'%BAD'});assert.ok(p.data.error);assert.equal(p.birth,undefined);assert.equal(p.data.loading,false);p.retry();assert.equal(destination,'/pages/index/index');assert.equal(p.onShareAppMessage().path,'/pages/index/index');
});
test('poster includes current region, recommendations and source without mutating chart',()=>{
 const b=birth(),raw=engine.calculate(b.utc,b.latitude,b.longitude),e=createEvaluator(raw.lines),cn=e.recommendations('cn'),c=context();
 const snapshot={birth:b,raw,current:decorate(raw),state:{...state,recommendations:cn.cards,candidateCount:cn.candidateCount},target:null,viewport};const before=JSON.stringify(snapshot);drawPoster(c,snapshot);
 assert.ok(c.texts.some(t=>t.s.includes('中国（含港澳台） · 9')));for(const card of cn.cards.filter(c=>c.city))assert.ok(c.texts.some(t=>t.s===card.city.name));assert.ok(c.texts.some(t=>t.s.includes('传记来源记录')));assert.equal(before,JSON.stringify(snapshot));assert.ok(c.texts.every(t=>t.y<posterHeight(snapshot)));
});
test('all poster variants render 12-body chart and keep content inside image',()=>{
 const b=birth(),raw=engine.calculate(b.utc,b.latitude,b.longitude),e=createEvaluator(raw.lines),r=e.recommendations('all'),current=decorate(raw);
 for(const tab of ['places','map','chart']){const c=context(),snapshot={birth:b,raw,current,state:{...state,tab,placeScope:'all',candidateCount:r.candidateCount,recommendations:r.cards,analysis:e.analyse({...b,city:'上海'})},target:null,viewport};drawPoster(c,snapshot);assert.ok(c.texts.every(t=>Number.isFinite(t.x)&&Number.isFinite(t.y)&&t.y<posterHeight(snapshot)));if(tab==='chart')for(const b of current.bodies)assert.ok(c.texts.some(t=>t.s.includes(b.name)));}
});
test('save album reports actual success, cancellation stays quiet and denied access is recoverable',async()=>{
 const messages=[],wx=api();wx.showToast=o=>messages.push(o.title);wx.saveImageToPhotosAlbum=o=>o.fail({errMsg:'saveImageToPhotosAlbum:fail auth deny'});const p=page(wx);p.data.posterPath='wxfile://poster';await p.savePoster();assert.equal(p.data.albumDenied,true);assert.equal(messages.length,0);assert.equal(p.data.shareBusy,false);
 wx.openSetting=o=>o.success({authSetting:{'scope.writePhotosAlbum':true}});await p.openAlbumSettings();assert.equal(p.data.albumDenied,false);
 wx.saveImageToPhotosAlbum=o=>o.fail({errMsg:'saveImageToPhotosAlbum:fail cancel'});await p.savePoster();assert.equal(p.data.exportError,'');assert.equal(messages.length,0);
 wx.saveImageToPhotosAlbum=o=>{assert.equal(o.filePath,'wxfile://poster');o.success({});};await p.savePoster();assert.deepEqual(messages,['已保存到相册']);
});
test('Moments button opens native image menu with restorable path; no fake sent message',async()=>{
 const wx=api(),p=page(wx);p.birth=birth();p.current={};p.viewport=viewport;p.data={...p.data,...state,posterPath:'wxfile://poster'};let request,guide=0,toast=0;wx.showShareImageMenu=o=>{request=o;o.success({});};wx.showModal=()=>guide++;wx.showToast=()=>toast++;
 await p.shareTimelineImage();assert.equal(request.path,'wxfile://poster');assert.equal(decodeShare(request.entrancePath.split('?s=')[1]).birth.utc,birth().utc);assert.equal(request.needShowEntrance,true);assert.equal(toast,0);
 wx.getAppBaseInfo=()=>({SDKVersion:'3.8.1'});await p.shareTimelineImage();assert.equal(guide,1);assert.equal(supportsImageTimeline('3.8.2'),true);
 wx.getAppBaseInfo=()=>({SDKVersion:'3.17.3'});wx.showShareImageMenu=o=>o.fail({errMsg:'cancel'});await p.shareTimelineImage();assert.equal(guide,1);assert.equal(toast,0);
});
test('export uses a fixed snapshot and correct full-size PNG and cover crops',async()=>{
 const wx=api(),p=page(wx);p.birth=birth();p.viewport=viewport;p.raw=engine.calculate(p.birth.utc,p.birth.latitude,p.birth.longitude);p.current=decorate(p.raw);p.data={...p.data,...state,loading:false,...createEvaluator(p.raw.lines).recommendations('cn')};p.data.recommendations=p.data.cards;
 const canvas={getContext:()=>context()},exports=[];p.createSelectorQuery=()=>({select(){return this;},fields(){return this;},exec(fn){fn([{node:canvas}]);}});wx.canvasToTempFilePath=o=>{exports.push(o);o.success({tempFilePath:'wxfile://'+exports.length});};
 await p.openExport();assert.equal(p.data.exportBusy,false);assert.equal(p.data.posterPath,'wxfile://1');assert.equal(exports[0].destWidth,1200);assert.equal(exports[0].destHeight,2360);assert.equal(exports[1].destWidth/exports[1].destHeight,1.25);assert.equal(exports[2].destWidth/exports[2].destHeight,1);
 p.data.placeScope='all';assert.equal(decodeShare(p.onShareTimeline().query.slice(2)).state.placeScope,'cn','open preview is immutable');p.closeExport();assert.equal(decodeShare(p.onShareTimeline().query.slice(2)).state.placeScope,'all');assert.equal(p.onShareTimeline().imageUrl,undefined,'changed result never reuses a stale cover');
});
