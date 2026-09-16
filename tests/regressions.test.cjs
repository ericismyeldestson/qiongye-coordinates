const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'../miniprogram');
const {EXAMPLES}=require('../miniprogram/core/locations');
const {normalizeBirth,UTC_MIN,UTC_MAX}=require('../miniprogram/core/birth');
const {resolveTime}=require('../miniprogram/core/time');
const {encodeShare,decodeShare,INITIAL_STATE,INITIAL_VIEWPORT}=require('../miniprogram/core/share');
const {capabilities}=require('../miniprogram/core/capabilities');
const engineModule=require('../miniprogram/core/engine');
let engine;
before(async()=>{engine=await require('./helpers/engine.cjs').createTestEngine();});
const tick=()=>new Promise(r=>setImmediate(r));
function profile(index=2){const b={...EXAMPLES[index],example:true,system:'P'},t=resolveTime(b.date,b.time+':'+b.second,b.timezone)[0];return {...b,utc:t.utc,offset:t.label};}
function params(b=profile(),state=INITIAL_STATE,target=null,viewport=INITIAL_VIEWPORT){return {s:encodeShare(b,state,target,viewport).slice(2)};}
function api(extra={}){return {getWindowInfo:()=>({pixelRatio:2}),nextTick:fn=>fn(),hideShareMenu(){},showShareMenu(){},getAppBaseInfo:()=>({SDKVersion:'3.17.3'}),showToast(){},showModal(){},pageScrollTo(){},...extra};}
function load(file,wx,app={},init=async()=>engine){let p;const name=path.join(root,file),original=createRequire(name);vm.runInNewContext(fs.readFileSync(name,'utf8'),{Page:x=>p=x,require:n=>n==='../core/engine'?{...engineModule,initialize:init}:original(n),getApp:()=>app,wx,console});p.data=JSON.parse(JSON.stringify(p.data));p.setData=function(update,cb){for(const [key,value] of Object.entries(update)){const parts=key.split('.');if(parts.length===2)this.data[parts[0]][parts[1]]=value;else this.data[key]=value;}if(cb)cb();};return p;}
function form(wx=api(),app={}){return load('pages/index/index.js',wx,app);}
function result(wx=api(),app={},init){return load('moondata/index.js',wx,app,init);}
function node(){const n={calls:0,texts:[],clears:0};const c=new Proxy({measureText:s=>({width:String(s).length*10}),fillText:s=>n.texts.push(s),clearRect:()=>{n.clears++;n.texts=[];}},{get:(obj,k)=>k in obj?obj[k]:()=>{n.calls++;},set:(obj,k,v)=>(obj[k]=v,true)});n.getContext=()=>c;return n;}
// Model conditional node removal with deferred rendering and deferred selector results.
function renderer(p){const commits=[],queries=[],nodes=[];let visible=null,kind=null,exportNode=null;const original=p.setData;
 p.setData=function(v,cb){original.call(p,v);commits.push(()=>{const next=!p.data.loading&&!p.data.error&&!p.data.exportOpen&&(p.data.tab==='map'||p.data.tab==='chart')?p.data.tab:null;if(next!==kind){kind=next;visible=next?node():null;if(visible)nodes.push(visible);}if(p.data.exportOpen&&!exportNode)exportNode=node();if(!p.data.exportOpen)exportNode=null;if(cb)cb();});};
 p.createSelectorQuery=()=>{let selected;return {select(x){selected=x;return this;},selectAll(x){selected=x;return this;},fields(){return this;},exec(cb){const data=selected==='#export-canvas'?[exportNode?{node:exportNode}:null]:[visible?[{node:visible,width:360,height:360}]:[]];queries.push(()=>cb(data));}};};
 return {nodes,commits,queries,get visible(){return visible;},commit(){while(commits.length)commits.shift()();},async flush(){for(let i=0;i<8;i++){await tick();while(commits.length||queries.length){this.commit();if(queries.length)queries.shift()();}}}};
}
function reopened(p,path){p.closeExport();p.setData({exportOpen:true,posterPath:path,exportError:'',albumDenied:false});}

test('F01 internal navigation is self-contained; absent/renamed/corrupt parameters never read stale birth',async()=>{
 const app={pendingBirth:profile(1)},sent=[],wx=api({navigateTo:o=>{sent.push(o.url);o.success({});}}),p=form(wx,app);p.example({currentTarget:{dataset:{index:2}}});await p.calculate();assert.equal(sent.length,1);
 const payload=sent[0].split('?s=')[1];assert.equal(decodeShare(payload).birth.utc,profile(2).utc);assert.equal(app.pendingBirth.utc,profile(1).utc);
 for(const options of [{},{wrong:payload},{s:''},{s:'%BAD'}]){const q=result(api(),app);q.onLoad(options);await tick();assert.ok(q.data.error);assert.equal(q.birth,undefined);assert.equal(q.current,undefined);}
 for(let i=0;i<2;i++){const q=result(api(),app);q.onLoad({s:payload});await tick();assert.equal(q.data.error,'');assert.equal(q.birth.utc,profile(2).utc);}
});
test('L01 city editing stays blocked across expanding/collapsing settings until a result is selected or manual coordinates adopted',async()=>{
 const sent=[],p=form(api({navigateTo:o=>{sent.push(o.url);o.success({});}}));p.onCity({detail:{value:'北京'}});
 for(let i=0;i<3;i++){p.toggleAdvanced();await p.calculate();assert.equal(sent.length,0);assert.match(p.data.error,/搜索结果|手动坐标/);}
 p.selectCity({currentTarget:{dataset:{index:0}}});p.confirmExampleBirth();await p.calculate();let b=decodeShare(sent[0].split('?s=')[1]).birth;assert.equal(b.city,'北京');assert.notEqual(b.latitude,EXAMPLES[0].latitude);
 p.onCity({detail:{value:'家中'}});p.onInput({currentTarget:{dataset:{field:'latitude'}},detail:{value:'30.1'}});p.confirmManualLocation();p.toggleAdvanced();p.confirmExampleBirth();await p.calculate();b=decodeShare(sent[1].split('?s=')[1]).birth;assert.equal(b.city,'家中');assert.equal(b.latitude,30.1);
 p.onInput({currentTarget:{dataset:{field:'longitude'}},detail:{value:'120.1'}});await p.calculate();assert.equal(sent.length,2,'editing an adopted location requires re-adoption');
 p.example({currentTarget:{dataset:{index:1}}});assert.equal(p.data.manualConfirmed,false);await p.calculate();assert.equal(decodeShare(sent[2].split('?s=')[1]).birth.utc,profile(1).utc);
});
test('F05 every accepted boundary form payload can be encoded and decoded; rejected text/coordinates never navigate',async()=>{
 const sent=[],p=form(api({navigateTo:o=>{sent.push(o.url);o.success({});}}));
 for(const lat of [-89.9999995,0,89.9999995])for(const second of ['', '5','59']){p.data.form={...EXAMPLES[0],name:'名'.repeat(40),city:'城'.repeat(100),latitude:String(lat),second};p.data.example=false;p.data.citySelected=false;p.data.manualConfirmed=false;p.confirmManualLocation();await p.calculate();assert.equal(p.data.error,'');const b=decodeShare(sent.at(-1).split('?s=')[1]).birth;assert.equal(b.latitude,lat);assert.equal(b.second,second.padStart(2,'0'));}
 const count=sent.length;for(const bad of [{city:'城'.repeat(101)},{name:'名'.repeat(41)},{latitude:'90'},{latitude:'-90'},{longitude:'180.001'},{second:'60'},{timezone:'__proto__'},{latitude:''}]){p.data.form={...EXAMPLES[0],...bad};p.data.citySelected=true;await p.calculate();assert.ok(p.data.error);assert.equal(sent.length,count);}
 for(const lat of [-89.9999995,89.9999995])assert.equal(decodeShare(params(profile(),INITIAL_STATE,{city:'地点',latitude:lat,longitude:180}).s).target.latitude,lat);
});
test('F05 invalid late share state is handled without throwing or forwarding a wrong result',async()=>{
 const p=result(api());p.birth={...profile(),city:'城'.repeat(101)};p.current={};p.viewport={...INITIAL_VIEWPORT};p.data.loading=false;
 let friend,timeline;assert.doesNotThrow(()=>friend=p.onShareAppMessage());assert.equal(friend.path,'/pages/index/index');assert.doesNotThrow(()=>timeline=p.onShareTimeline());assert.equal(timeline.query,'invalid=1');assert.equal(p.data.shareInvalid,true);
 await p.openExport();assert.ok(p.data.exportError);assert.equal(p.data.posterPath,'');assert.equal(p.data.exportBusy,false);
});
test('F06 actual ephemeris handles local-date UTC margins and sharing round trips on both ends',()=>{
 const zones=require('../miniprogram/data/timezones');assert.ok(Object.values(zones).flat().every(row=>Math.abs(row[1])<86400));
 for(const [date,time,zone] of [['1900-01-01','00:00','Asia/Shanghai'],['1900-01-01','00:00','Pacific/Auckland'],['2099-12-31','23:59','America/New_York'],['2099-12-31','23:59','Pacific/Honolulu']]){
  const {birth,candidates}=normalizeBirth({...EXAMPLES[0],example:false,date,time,second:'59',timezone:zone,system:'P'});birth.utc=candidates[0].utc;
  const shared=decodeShare(params(birth).s).birth,a=engine.calculate(birth.utc,birth.latitude,birth.longitude),b=engine.calculate(shared.utc,shared.latitude,shared.longitude);assert.equal(a.bodies.length,12);assert.equal(a.lines.length,48);assert.deepEqual(a,b);assert.ok(a.bodies.every(b=>b.flags&2));
 }
 for(const utc of [new Date(UTC_MIN).toISOString(),new Date(UTC_MAX-1000).toISOString()])assert.equal(engine.calculate(utc,31.23,121.47).bodies.length,12);
 for(const utc of [new Date(UTC_MIN-1).toISOString(),new Date(UTC_MAX).toISOString()])assert.throws(()=>engine.calculate(utc,31.23,121.47));
 for(const date of ['1899-12-31','2100-01-01'])assert.throws(()=>normalizeBirth({...EXAMPLES[0],date,system:'P'}));
});
test('DST form selection and cancellation preserve exact chosen instant without duplicate or stale navigation',async()=>{
 let sheet;const sent=[],p=form(api({showActionSheet:o=>sheet=o,navigateTo:o=>{sent.push(o.url);o.success({});}}));p.data.form={...EXAMPLES[0],city:'纽约',date:'2024-11-03',time:'01:30',timezone:'America/New_York',latitude:40.7,longitude:-74};p.data.example=false;
 const candidates=resolveTime('2024-11-03','01:30:00','America/New_York');for(const i of [0,1]){const pending=p.calculate();await p.calculate();sheet.success({tapIndex:i});await pending;assert.equal(decodeShare(sent.at(-1).split('?s=')[1]).birth.utc,candidates[i].utc);}
 const cancel=p.calculate();sheet.fail({errMsg:'showActionSheet:fail cancel'});await cancel;assert.equal(sent.length,2);assert.equal(p.data.submitting,false);
 const gone=p.calculate();p.onUnload();sheet.success({tapIndex:0});await gone;assert.equal(sent.length,2);
});
test('F02 wheel is cleared during polar errors and redrawn in stable space after recovery and export cycles',async()=>{
 let n=0;const wx=api({canvasToTempFilePath:o=>o.success({tempFilePath:'poster-'+(++n)})}),p=result(wx),r=renderer(p);p.onLoad(params(profile(),{...INITIAL_STATE,tab:'chart'}));p.onReady();await r.flush();assert.ok(r.visible.calls>0);const old=r.visible;
 p.relocate({city:'极地',latitude:80,longitude:20});await r.flush();assert.equal(r.visible,old);assert.equal(p.current.houses,null);assert.ok(p.current.houseError);assert.ok(r.visible.clears>=2);assert.equal(r.visible.texts.join(''),p.current.houseError);p.resetBirth();await r.flush();assert.equal(r.visible,old);assert.ok(p.current.houses);assert.ok(r.visible.calls>0);assert.equal(r.visible.width,720);
 p.relocate({city:'极地',latitude:80,longitude:20});await r.flush();p.relocate({city:'北京',latitude:39.9,longitude:116.4});await r.flush();assert.ok(r.visible.calls>0);
 const exportPromise=p.openExport();await r.flush();await exportPromise;assert.equal(r.visible,null);p.closeExport();await r.flush();assert.ok(r.visible.calls>0);assert.equal(p.data.locationName,'北京');
});
test('F02 stale selector results cannot overwrite a new canvas or resurrect one after unload/export',async()=>{
 const p=result(api()),r=renderer(p);p.onLoad(params(profile(),{...INITIAL_STATE,tab:'chart'}));p.onReady();await r.flush();
 p.prepareCanvas();const stale=r.queries.shift();p.setTab({currentTarget:{dataset:{tab:'map'}}});r.commit();const latest=r.queries.shift();latest();const ctx=p.canvases[0].ctx;stale();assert.equal(p.canvases[0].ctx,ctx);
 p.prepareCanvas();const closing=r.queries.shift();p.invalidateCanvas();p.setData({exportOpen:true});r.commit();closing();assert.equal(p.canvases,null);
 p.closeExport();r.commit();p.onUnload();while(r.queries.length)r.queries.shift()();assert.equal(p.canvases,null);
});
for(const method of ['savePoster','openAlbumSettings','shareTimelineImage'])test('F03 delayed '+method+' callbacks cannot alter reopened panel or release a newer operation',async()=>{
 const queues=[],notices=[],wx=api({saveImageToPhotosAlbum:o=>queues.push(o),openSetting:o=>queues.push(o),showShareImageMenu:o=>queues.push(o),showToast:o=>notices.push(o),showModal:o=>notices.push(o)}),p=result(wx);p.birth=profile();p.current={};p.viewport={...INITIAL_VIEWPORT};p.data.loading=false;p.data.exportOpen=true;p.data.posterPath='A';
 const a=p[method]();reopened(p,'B');const b=p[method]();assert.equal(queues.length,2);queues[0].fail({errMsg:'fail auth denied'});await a;assert.equal(p.data.shareBusy,true);assert.equal(p.data.albumDenied,false);assert.equal(p.data.exportError,'');assert.equal(notices.length,0);
 queues[1].success({authSetting:{'scope.writePhotosAlbum':true}});await b;assert.equal(p.data.shareBusy,false);assert.equal(p.data.albumDenied,false);assert.ok(!p.data.exportError.includes('未开启'));
 reopened(p,'C');const c=p[method]();p.onUnload();const snapshot=JSON.stringify(p.data);queues[2].fail({errMsg:'fail auth denied'});await c;assert.equal(JSON.stringify(p.data),snapshot);
});
test('F03 old save success and cancellation cannot show misleading toast or unlock a current save',async()=>{
 const q=[],toasts=[],p=result(api({saveImageToPhotosAlbum:o=>q.push(o),showToast:o=>toasts.push(o.title)}));p.data.posterPath='A';p.data.loading=false;
 for(const outcome of ['success','cancel']){const a=p.savePoster();reopened(p,'B');const b=p.savePoster();const old=q.shift(),fresh=q.shift();if(outcome==='success')old.success({});else old.fail({errMsg:'fail cancel'});await a;assert.equal(p.data.shareBusy,true);assert.equal(toasts.length,0);fresh.fail({errMsg:'fail cancel'});await b;assert.equal(p.data.shareBusy,false);}
});
test('F04 browseOnly hides forbidden controls, blocks setting calls, and updates capabilities without changing the result',async()=>{
 let category='browseOnly',listener,removed,settings=0,help=0;const wx=api({getApiCategory:()=>category,onApiCategoryChange:f=>listener=f,offApiCategoryChange:f=>removed=f,openSetting:o=>{settings++;o.success({authSetting:{'scope.writePhotosAlbum':true}});},showModal:()=>help++}),p=result(wx);
 p.onLoad(params(profile(),{...INITIAL_STATE,placeScope:'cn',tab:'map',planet:'Venus',angle:'MC'},{city:'澳门',latitude:22.2,longitude:113.5},{zoom:3,lat:25,lon:115}));await tick();const before=JSON.stringify({birth:p.birth,current:p.current,viewport:p.viewport,target:p.target,scope:p.data.placeScope});
 assert.equal(p.data.canShareFriend,false);assert.equal(p.data.canOpenSettings,false);await p.openAlbumSettings();assert.equal(settings,0);assert.equal(help,1);
 category='default';listener({apiCategory:category});p.onShow();assert.equal(p.data.canShareFriend,true);assert.equal(p.data.canOpenSettings,true);assert.equal(JSON.stringify({birth:p.birth,current:p.current,viewport:p.viewport,target:p.target,scope:p.data.placeScope}),before);await p.openAlbumSettings();assert.equal(settings,1);
 p.onUnload();assert.equal(removed,listener);category='browseOnly';listener({apiCategory:category});assert.equal(p.data.canShareFriend,true,'removed/late listeners cannot update unloaded page');
 const wxml=fs.readFileSync(root+'/moondata/index.wxml','utf8');assert.match(wxml,/wx:if="\{\{canShareFriend\}\}"[^>]*open-type="share"/);assert.match(wxml,/albumDenied && canOpenSettings/);
 assert.equal(capabilities(api({getEnterOptionsSync:()=>({apiCategory:'browseOnly'})})).canShareFriend,false);assert.equal(capabilities(api({getApiCategory(){throw Error('old API')},getEnterOptionsSync:()=>({apiCategory:'browseOnly'})})).canOpenSettings,false);
});
test('F06 resource failures can retry; data failures can edit original birth instead of looping; unloaded failures stay quiet',async()=>{
 let reject,tries=0,url;const p=result(api({reLaunch:o=>url=o.url}),{},()=>++tries===1?Promise.reject(Error('资源暂不可用')):Promise.resolve(engine));p.onLoad(params());await tick();assert.equal(p.data.canRetry,true);p.retry();await tick();assert.equal(p.data.error,'');assert.equal(p.current.bodies.length,12);
 const broken=result(api({reLaunch:o=>url=o.url}),{},async()=>({calculate(){throw Error('资料不支持')}}));broken.onLoad(params());await tick();assert.equal(broken.data.canRetry,false);broken.retry();assert.ok(url.startsWith('/pages/index/index?s='));const edit=form();edit.onLoad({s:url.split('?s=')[1]});assert.equal(edit.data.form.utc,profile().utc);
 const gone=result(api(),{},()=>new Promise((a,b)=>reject=b));gone.onLoad(params());gone.onUnload();const state=JSON.stringify(gone.data);reject(Error('late failure'));await tick();assert.equal(JSON.stringify(gone.data),state);
});
