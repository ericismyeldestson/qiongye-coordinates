const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {EXAMPLES}=require('../miniprogram/core/locations');
const {decodeShare}=require('../miniprogram/core/share');
function form(){
 let p;const sent=[],file=path.resolve(__dirname,'../miniprogram/pages/index/index.js');
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:x=>p=x,require:createRequire(file),wx:{navigateTo:o=>{sent.push(o.url);o.success({});}}});
 p.data=JSON.parse(JSON.stringify(p.data));p.setData=function(update){for(const [key,value] of Object.entries(update)){const parts=key.split('.');if(parts.length===2)this.data[parts[0]][parts[1]]=value;else this.data[key]=value;}};
 return {p,sent};
}
const query=(p,value)=>p.onCity({detail:{value}});
const change=(p,field,value)=>p.onInput({currentTarget:{dataset:{field}},detail:{value}});
const pending=p=>!p.data.citySelected&&!p.data.manualConfirmed;

test('P3 unmatched Chinese and English city searches immediately explain the empty result and remain blocked',async()=>{
 for(const text of ['不存在的审阅城市xyz','NoSuchBirthCityXYZ']){
  const {p,sent}=form();query(p,text);
  assert.equal(pending(p),true);assert.equal(p.data.cityOptions.length,0);assert.match(p.data.locationHint,/没有找到这个城市.*英文名.*手动填写/);assert.equal(p.data.error,'');
  assert.equal(p.data.form.latitude,EXAMPLES[0].latitude);assert.equal(p.data.form.longitude,EXAMPLES[0].longitude);
  p.toggleAdvanced();p.toggleAdvanced();assert.equal(pending(p),true);
  p.confirmExampleBirth();await p.calculate();assert.equal(sent.length,0);assert.match(p.data.error,/搜索结果/);
 }
});

test('P3 matching Chinese and English queries require selection, then serialize the selected location',async()=>{
 for(const text of ['北京','Beijing']){
  const {p,sent}=form();query(p,'NoSuchBirthCityXYZ');query(p,text);
  assert.equal(pending(p),true);assert.ok(p.data.cityOptions.length);assert.match(p.data.locationHint,/从搜索结果中选择/);
  const index=p.data.cityOptions.findIndex(c=>c.name==='北京');assert.ok(index>=0);
  p.selectCity({currentTarget:{dataset:{index}}});
  assert.equal(pending(p),false);assert.equal(p.data.locationHint,'');assert.equal(p.data.cityOptions.length,0);
  assert.equal(p.data.form.latitude,39.9075);assert.equal(p.data.form.longitude,116.39723);
  p.confirmExampleBirth();await p.calculate();assert.equal(sent.length,1);
  const {birth}=decodeShare(sent[0].split('?s=')[1]);assert.equal(birth.city,'北京');assert.equal(birth.latitude,39.9075);assert.equal(birth.longitude,116.39723);assert.equal(birth.timezone,'Asia/Shanghai');
 }
});

test('P3 empty and whitespace queries show an input prompt rather than a failed search',()=>{
 const {p}=form();for(const text of ['','   ','\t']){
  query(p,'NoSuchBirthCityXYZ');query(p,text);
  assert.equal(pending(p),true);assert.equal(p.data.cityOptions.length,0);assert.match(p.data.locationHint,/请输入出生城市/);assert.doesNotMatch(p.data.locationHint,/没有找到/);
 }
});

test('P3 manual coordinate and timezone changes replace search guidance and require fresh adoption',()=>{
 const {p}=form();query(p,'北京');change(p,'latitude','30.1');change(p,'longitude','120.2');
 assert.equal(pending(p),true);assert.equal(p.data.cityOptions.length,0);assert.match(p.data.locationHint,/坐标或时区已修改/);
 p.confirmManualLocation();assert.equal(pending(p),false);assert.equal(p.data.locationHint,'');assert.equal(p.data.form.latitude,30.1);
 p.confirmExampleBirth();assert.equal(p.data.exampleConfirmed,true);
 for(const edit of [()=>change(p,'latitude','30.2'),()=>change(p,'longitude','120.3'),()=>p.onZone({detail:{value:p.data.zoneNames.indexOf('Asia/Urumqi')}})]){
  edit();assert.equal(pending(p),true);assert.equal(p.data.exampleConfirmed,false);assert.match(p.data.locationHint,/坐标或时区已修改/);
  p.confirmManualLocation();assert.equal(pending(p),false);assert.equal(p.data.locationHint,'');
 }
 query(p,'NoSuchBirthCityXYZ');assert.equal(pending(p),true);assert.match(p.data.locationHint,/没有找到/);
});

test('P3 invalid manual coordinates remain pending until corrected and explicitly adopted',()=>{
 const {p}=form();query(p,'自定义出生地点');change(p,'latitude','91');p.confirmManualLocation();
 assert.equal(pending(p),true);assert.ok(p.data.error);assert.match(p.data.locationHint,/坐标或时区已修改/);
 change(p,'latitude','31.2');p.confirmManualLocation();assert.equal(pending(p),false);assert.equal(p.data.error,'');assert.equal(p.data.locationHint,'');
});

test('P3 presets, personal entry and restored profiles reset previous city-search feedback',async()=>{
 const source=form();await source.p.calculate();const publicToken=source.sent[0].split('?s=')[1];
 change(source.p,'name','资料恢复测试');source.p.confirmExampleBirth();await source.p.calculate();const privateToken=source.sent[1].split('?s=')[1];
 const {p}=form();query(p,'NoSuchBirthCityXYZ');p.startPersonal();assert.equal(pending(p),true);assert.match(p.data.locationHint,/请输入出生城市/);
 for(let index=0;index<EXAMPLES.length;index++){
  query(p,'NoSuchBirthCityXYZ');p.example({currentTarget:{dataset:{index}}});assert.equal(pending(p),false);assert.equal(p.data.locationHint,'');assert.equal(p.data.form.city,EXAMPLES[index].city);
 }
 for(const s of [publicToken,privateToken]){
  query(p,'北京');p.onLoad({s});assert.equal(pending(p),false);assert.equal(p.data.locationHint,'');assert.equal(p.data.cityOptions.length,0);
 }
});
