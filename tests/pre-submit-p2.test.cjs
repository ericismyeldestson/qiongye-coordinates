const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {EXAMPLES}=require('../miniprogram/core/locations');
const {decodeShare}=require('../miniprogram/core/share');
function form(){
 let p;const sent=[],file=path.resolve(__dirname,'../miniprogram/pages/index/index.js');
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:x=>p=x,require:createRequire(file),wx:{navigateTo:o=>{sent.push(o.url);o.success({});}}});
 p.data=JSON.parse(JSON.stringify(p.data));p.setData=function(update){for(const [key,value] of Object.entries(update)){const parts=key.split('.');if(parts.length===2)this.data[parts[0]][parts[1]]=value;else this.data[key]=value;}};
 return {p,sent,last:()=>decodeShare(sent.at(-1).split('?s=')[1]).birth};
}
const change=(p,field,value)=>p.onInput({currentTarget:{dataset:{field}},detail:{value}});
const pick=(p,index)=>p.example({currentTarget:{dataset:{index}}});
function city(p,name){p.onCity({detail:{value:name}});assert.ok(p.data.cityOptions.length);p.selectCity({currentTarget:{dataset:{index:0}}});}

test('P2 renamed example cannot become a personal chart until the retained birth data is reviewed',async()=>{
 const {p,sent,last}=form();change(p,'name','审阅用昵称');
 assert.equal(p.data.example,false);assert.equal(p.data.exampleEdited,true);assert.equal(p.data.exampleConfirmed,false);
 await p.calculate();assert.equal(sent.length,0);assert.match(p.data.error,/基于示例修改/);
 p.confirmExampleBirth();await p.calculate();assert.equal(sent.length,1);assert.equal(last().name,'审阅用昵称');
 for(const key of ['date','time','city','latitude','longitude','timezone'])assert.equal(last()[key],EXAMPLES[0][key]);
 assert.equal(last().example,false);assert.equal(last().source,undefined);
});

test('P2 date, time, city and seconds edits each require review and invalidate previous review',async()=>{
 const edits=[p=>p.onDate({detail:{value:'2001-01-01'}}),p=>p.onTime({detail:{value:'21:00'}}),p=>city(p,'北京'),p=>change(p,'second','12')];
 for(const edit of edits){const {p,sent}=form();edit(p);await p.calculate();assert.equal(sent.length,0);assert.equal(p.data.exampleEdited,true);
  p.confirmExampleBirth();await p.calculate();assert.equal(sent.length,1);assert.equal(p.data.error,'');
  p.onTime({detail:{value:'22:00'}});assert.equal(p.data.exampleConfirmed,false);await p.calculate();assert.equal(sent.length,1);
 }
});

test('P2 review cannot bypass city selection, manual coordinates or invalid birth data',async()=>{
 const {p,sent}=form();p.onCity({detail:{value:'北京'}});p.confirmExampleBirth();assert.equal(p.data.exampleConfirmed,false);assert.match(p.data.error,/搜索结果/);
 city(p,'北京');p.confirmExampleBirth();assert.equal(p.data.exampleConfirmed,true);
 change(p,'latitude','30.1');p.confirmExampleBirth();assert.equal(p.data.exampleConfirmed,false);
 p.confirmManualLocation();p.confirmExampleBirth();assert.equal(p.data.exampleConfirmed,true);
 change(p,'second','60');p.confirmExampleBirth();assert.equal(p.data.exampleConfirmed,false);await p.calculate();assert.equal(sent.length,0);assert.match(p.data.error,/秒数/);
});

test('P2 personal entry clears every inherited birth field and requires a new date, time and city',async()=>{
 const {p,sent,last}=form();pick(p,1);p.startPersonal();
 for(const key of ['name','date','time','city','latitude','longitude','timezone'])assert.equal(p.data.form[key],'');
 assert.equal(p.data.form.source,undefined);assert.equal(p.data.exampleOrigin,false);assert.equal(p.data.citySelected,false);assert.equal(p.data.manualConfirmed,false);
 await p.calculate();assert.equal(sent.length,0);assert.match(p.data.error,/出生日期/);
 p.onDate({detail:{value:'1990-06-15'}});await p.calculate();assert.match(p.data.error,/出生时间/);
 p.onTime({detail:{value:'09:30'}});await p.calculate();assert.equal(sent.length,0);assert.match(p.data.error,/出生地/);
 city(p,'北京');await p.calculate();assert.equal(sent.length,1);assert.equal(last().utc,'1990-06-15T00:30:00.000Z');
 assert.equal(last().city,'北京');assert.equal(last().date,'1990-06-15');assert.equal(last().time,'09:30');assert.equal(last().example,false);assert.equal(last().source,undefined);assert.equal(p.data.exampleEdited,false);
});

test('P2 personal manual entry starts without inherited timezone or coordinates',async()=>{
 const {p,sent,last}=form();p.startPersonal();p.onDate({detail:{value:'2000-01-02'}});p.onTime({detail:{value:'10:20'}});
 p.onCity({detail:{value:'自定义地点'}});change(p,'latitude','31.2');change(p,'longitude','121.4');
 p.confirmManualLocation();assert.equal(p.data.manualConfirmed,false);assert.match(p.data.error,/时区/);
 p.onZone({detail:{value:p.data.zoneNames.indexOf('Asia/Shanghai')}});p.confirmManualLocation();await p.calculate();
 assert.equal(sent.length,1);assert.equal(last().timezone,'Asia/Shanghai');assert.equal(last().latitude,31.2);assert.equal(last().city,'自定义地点');
});

test('P2 unchanged public examples remain one-tap and choosing a preset resets draft review',async()=>{
 const {p,sent,last}=form();for(let i=0;i<EXAMPLES.length;i++){p.startPersonal();pick(p,i);await p.calculate();assert.equal(sent.length,i+1);assert.equal(last().example,true);assert.equal(last().name,EXAMPLES[i].name);assert.equal(last().time,EXAMPLES[i].time);assert.deepEqual(last().source,EXAMPLES[i].source);}
 change(p,'name','临时称呼');p.confirmExampleBirth();pick(p,1);assert.equal(p.data.exampleEdited,false);assert.equal(p.data.exampleConfirmed,false);await p.calculate();assert.equal(last().example,true);
});

test('P2 restored private profiles stay personal; restored public profiles retain edit review',async()=>{
 const source=form();await source.p.calculate();const shared=source.sent[0].split('?s=')[1];const publicForm=form();publicForm.p.onLoad({s:shared});change(publicForm.p,'name','改称呼');await publicForm.p.calculate();assert.equal(publicForm.sent.length,0);
 publicForm.p.confirmExampleBirth();await publicForm.p.calculate();const privateForm=form();privateForm.p.onLoad({s:publicForm.sent[0].split('?s=')[1]});
 assert.equal(privateForm.p.data.exampleOrigin,false);change(privateForm.p,'name','个人资料的新称呼');await privateForm.p.calculate();assert.equal(privateForm.sent.length,1);assert.equal(privateForm.last().name,'个人资料的新称呼');
});
