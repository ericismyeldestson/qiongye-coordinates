const {test,before}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {resolveTime}=require('../miniprogram/core/time');
const {search,EXAMPLES}=require('../miniprogram/core/locations');
const {splitDateline,angleText,houseOf}=require('../miniprogram/core/chart');
const {createEvaluator,GOALS,CANDIDATES}=require('../miniprogram/core/recommendations');
const base=path.resolve(__dirname,'../miniprogram');
const fixtures=require('./fixtures/swiss-native.json').cases;
const dates=['1900-01-01T12:00:00Z','1920-06-21T00:00:00Z','1961-08-05T05:24:00Z','1989-12-13T13:36:00Z','2000-01-01T12:00:00Z'];
let engine;
before(async()=>{engine=await require('./helpers/engine.cjs').createTestEngine();});
const difference=(a,b)=>Math.abs(((a-b+540)%360)-180);
for(const expected of fixtures)test('official native Swiss numerical reference '+expected.utc,()=>{
 const result=engine.calculate(expected.utc,31.2304,121.4737);
 assert.equal(result.lines.length,48);
 for(const b of result.bodies){const e=expected.bodies.find(p=>p.body===b.body).values;assert.ok(difference(b.longitude,e[0])<1e-7,b.key);assert.ok(Math.abs(b.latitude-e[1])<1e-7,b.key);assert.ok(Math.abs(b.speed-e[3])<1e-7,b.key);}
 for(const e of expected.places){
  if(e.code<0){assert.throws(()=>engine.houses(expected.jd,e.latitude,e.longitude,e.system),/Placidus/);continue;}
  const h=engine.houses(expected.jd,e.latitude,e.longitude,e.system);
  for(let i=0;i<12;i++)assert.ok(difference(h.cusps[i],e.cusps[i])<1e-7);
  assert.ok(difference(h.asc,e.asc)<1e-7);assert.ok(difference(h.mc,e.mc)<1e-7);
 }
});
test('relocation preserves planets and changes local angles',()=>{const a=engine.calculate(dates[4],31.2304,121.4737),b=engine.calculate(dates[4],51.5085,-.1257);assert.deepEqual(a.bodies,b.bodies);assert.deepEqual(a.lines,b.lines);assert.notEqual(a.houses.asc,b.houses.asc);});
test('whole-sign cusps and polar Placidus failure are explicit',()=>{const a=engine.calculate(dates[4],80,10,'P');assert.equal(a.houses,null);assert.match(a.houseError,/Placidus/);const b=engine.calculate(dates[4],80,10,'W');assert.ok(b.houses);assert.ok(b.houses.cusps.every(x=>x%30===0));});
test('invalid dates and coordinates never calculate',()=>{for(const [date,lat,lon]of [['bad',0,0],[dates[0],90,0],[dates[0],0,181],['2100-01-02',0,0]])assert.throws(()=>engine.calculate(date,lat,lon));});
test('Shanghai example is J2000 independent of machine zone',()=>assert.equal(resolveTime('2000-01-01','20:00:00','Asia/Shanghai')[0].utc,new Date(dates[4]).toISOString()));
test('original public demos resolve to original UTC',()=>{assert.equal(resolveTime('1961-08-04','19:24:00','Pacific/Honolulu')[0].utc,'1961-08-05T05:24:00.000Z');assert.equal(resolveTime('1989-12-13','08:36:00','America/New_York')[0].utc,'1989-12-13T13:36:00.000Z');});
test('Beijing and Xinjiang civil clocks differ by two hours',()=>{const a=resolveTime('2000-01-01','12:00:00','Asia/Shanghai')[0],b=resolveTime('2000-01-01','12:00:00','Asia/Urumqi')[0];assert.equal(new Date(b.utc)-new Date(a.utc),7200000);});
test('Shanghai historical summer time preserved',()=>assert.equal(resolveTime('1990-07-01','12:00:00','Asia/Shanghai')[0].offset,32400));
test('DST gap rejected and fold offers both instants',()=>{assert.throws(()=>resolveTime('2024-03-10','02:30:00','America/New_York'),/不存在/);const a=resolveTime('2024-11-03','01:30:00','America/New_York');assert.equal(a.length,2);assert.equal(new Date(a[1].utc)-new Date(a[0].utc),3600000);});
test('leap-day and second validation',()=>{assert.throws(()=>resolveTime('2023-02-29','12:00:00','UTC'));assert.throws(()=>resolveTime('2000-01-01','23:59:60','UTC'));assert.equal(resolveTime('2024-02-29','12:00:00','UTC').length,1);});
test('offline city search supports Chinese and English',()=>{assert.equal(search('上海')[0].english,'Shanghai');assert.equal(search('London')[0].timezone,'Europe/London');assert.ok(search('纽约').some(x=>x.timezone==='America/New_York'));});
test('dateline splits cannot draw a line across the globe',()=>{const parts=splitDateline([{lat:0,lon:176},{lat:1,lon:179},{lat:2,lon:-179},{lat:3,lon:-176}]);assert.equal(parts.length,2);});
test('rounding does not emit 30 degrees inside previous sign',()=>assert.equal(angleText(29.9999999),'金牛 00°00′00″'));
test('house assignment wraps Aries boundary',()=>assert.equal(houseOf(5,[350,20,50,80,110,140,170,200,230,260,290,320]),1));

test('independent recommendations use licensed coordinates and consistent scores',()=>{
 const raw=engine.calculate(dates[4],31.2304,121.4737),evaluator=createEvaluator(raw.lines);
 for(const scope of ['all','cn']){
  const r=evaluator.recommendations(scope);
  assert.equal(r.candidateCount,scope==='cn'?CANDIDATES.filter(c=>['CN','HK','MO','TW'].includes(c.country)).length:CANDIDATES.length);
  for(const card of r.cards.filter(c=>c.city)){
   const a=evaluator.analyse(card.city,card.key);assert.equal(a.score,card.score);assert.equal(a.score,a.rows.reduce((n,r)=>n+r.points,0));
   assert.ok(a.rows.every(r=>r.meaning&&r.distanceKm<=350.000001));
  }
 }
 const previous=JSON.stringify(evaluator.recommendations());evaluator.analyse(search('巴黎')[0],'love');assert.equal(JSON.stringify(evaluator.recommendations()),previous);
});
test('China scope includes CN, HK, MO and TW and every candidate resolves to source coordinates',()=>{
 const rows=require('../miniprogram/data/cities');
 for(const code of ['CN','HK','MO','TW'])assert.ok(CANDIDATES.some(c=>c.country===code));
 for(const c of CANDIDATES){const r=rows.find(r=>r[0]===c.id);assert.ok(r);assert.equal(c.lat,r[4]);assert.equal(c.lon,r[5]);}
 const cn=createEvaluator([]).recommendations('cn');assert.ok(cn.cards.every(c=>c.city===null));
});
test('all 48 independently authored interpretations are available',()=>{
 const lines=require('../miniprogram/core/engine').BODIES.flatMap(b=>['ASC','MC','DSC','IC'].map(angle=>({planet:b.key,angle,points:[{lat:0,lon:0}]})));
 for(const goal of GOALS){const a=createEvaluator(lines).analyse({latitude:0,longitude:0},goal.key);assert.equal(a.rows.length,48);assert.ok(a.rows.every(r=>r.meaning.length>25));}
});
const publicProfiles=[
 {label:'李小龙',date:'1940-11-27',time:'07:12',zone:'America/Los_Angeles',utc:'1940-11-27T15:12:00.000Z',lat:37+47/60,lon:-(122+25/60),sun:245+15/60,moon:221+24/60,asc:246+12/60,rating:'AA'},
 {label:'姚明',date:'1980-09-12',time:'19:00',zone:'Asia/Shanghai',utc:'1980-09-12T11:00:00.000Z',lat:31+13/60+20/3600,lon:121+27/60+29/3600,sun:169+50/60,moon:203+3/60,asc:11+52/60,rating:'B'}
];
for(const p of publicProfiles)test('public example factual chart anchors '+p.label,()=>{
 const e=EXAMPLES.find(e=>e.label===p.label),utc=resolveTime(e.date,e.time+':'+e.second,e.timezone)[0].utc;assert.equal(utc,p.utc);
 const result=engine.calculate(utc,e.latitude,e.longitude);assert.ok(difference(result.bodies[0].longitude,p.sun)<1/60);assert.ok(difference(result.bodies[1].longitude,p.moon)<1/60);assert.ok(difference(result.houses.asc,p.asc)<1/60);
});
test('celebrity preset buttons reset all birth fields and do not retain old-person data',async()=>{
 let page;const app={},sent=[],filename=path.join(base,'pages/index/index.js');
 const shared=()=>require('../miniprogram/core/share').decodeShare(sent.at(-1).split('?s=')[1]).birth;
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:require('node:module').createRequire(filename),Page:config=>page=config,getApp:()=>app,wx:{navigateTo(o){sent.push(o.url);o.success({});}}});
 page.data=JSON.parse(JSON.stringify(page.data));page.setData=function(data){for(const [key,value] of Object.entries(data)){if(key.startsWith('form.'))this.data.form[key.slice(5)]=value;else this.data[key]=value;}};
 assert.deepEqual(EXAMPLES.map(p=>p.label),['上海示例','李小龙','姚明']);
 for(const expected of publicProfiles){page.data.system='W';page.data.systemIndex=1;page.example({currentTarget:{dataset:{index:EXAMPLES.findIndex(e=>e.label===expected.label)}}});await page.calculate();assert.equal(shared().utc,expected.utc);assert.equal(shared().system,'P');assert.equal(shared().source.rating,expected.rating);assert.equal(shared().name.startsWith(expected.label),true);}
 page.onTime({detail:{value:'20:00'}});page.confirmExampleBirth();await page.calculate();assert.equal(shared().example,false);assert.equal(shared().source,undefined,'edited input must not retain a sourced-celebrity claim');assert.equal(app.pendingBirth,undefined);
});
