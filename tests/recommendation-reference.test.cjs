const {test,before}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const reference=require('./fixtures/recommendation-reference.json');
const {createEvaluator,CANDIDATES,GOALS}=require('../miniprogram/core/recommendations');
const rules=require('../miniprogram/core/place-rules');
let engine;before(async()=>{engine=await require('./helpers/engine.cjs').createTestEngine();});
for(const expected of reference.cases)test('original recommendation regression '+expected.utc,()=>{
 const result=engine.calculate(expected.utc,31.2304,121.4737),e=createEvaluator(result.lines),prepared=rules.prepareLines(result.lines);
 for(const scope of ['all','cn']){
  const actual=e.recommendations(scope).cards.map(c=>({goal:c.key,city:c.city?.sourceName||null,score:c.score,tied:c.tied,matchedCities:c.matchedCities}));
  assert.deepEqual(actual,expected[scope]);
 }
 const matrix=CANDIDATES.map(c=>{const lines=rules.nearby(c.lat,c.lon,prepared);return GOALS.map(g=>lines.reduce((s,l)=>s+rules.weight(g.key,l.planet,l.angle),0));});
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(matrix)).digest('hex'),expected.scoreMatrixSha256,'Every city/topic score matches the reference, beyond the first card');
});
test('all 288 original topic/planet/axis weights remain fixed',()=>{
 for(const goal of reference.weights)for(const line of goal.lines)assert.equal(rules.weight(goal.goal,line.planet,line.angle),line.weight,goal.goal+' '+line.planet+' '+line.angle);
});
test('licensed orientation subset works without browser or Node globals',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../miniprogram/vendor/astronomy-time.js'),'utf8');
 const exports={};vm.runInNewContext(code,{exports,globalThis:undefined,window:undefined,self:undefined,global:undefined,Date,Math});
 const official=require('../third_party/astronomy-engine/astronomy');
 for(const row of reference.cases){const date=new Date(row.utc),a=exports.MakeTime(date),b=official.MakeTime(date);
  assert.equal(a.tt,b.tt);assert.equal(exports.e_tilt(a).tobl,official.e_tilt(b).tobl);assert.equal(exports.SiderealTime(a),official.SiderealTime(b));
 }
});
