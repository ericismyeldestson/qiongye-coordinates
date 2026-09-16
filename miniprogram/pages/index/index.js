const {EXAMPLES,search,count}=require('../../core/locations');
const {zoneNames}=require('../../core/time');
const {normalizeBirth}=require('../../core/birth');
const {decodeShare,shareContent,INITIAL_STATE,INITIAL_VIEWPORT}=require('../../core/share');
const EMPTY_LOCATION_HINT='请输入出生城市，或展开坐标设置手动填写。';
const MANUAL_LOCATION_HINT='坐标或时区已修改，请核对后采用手动地点。';
Page({
 data:{form:Object.assign({},EXAMPLES[0]),example:true,exampleOrigin:true,exampleEdited:false,exampleConfirmed:false,examples:EXAMPLES,cityOptions:[],locationHint:'',zoneNames,zoneIndex:zoneNames.indexOf('Asia/Shanghai'),advanced:false,error:'',citySelected:true,manualConfirmed:false,submitting:false,cityCount:count,system:'P',systems:['Placidus 普拉西德','Whole Sign 整宫制'],systemIndex:0},
 onLoad(options={}){if(options.s===undefined)return;try{const {birth}=decodeShare(options.s);this.setData({form:birth,example:birth.example,exampleOrigin:birth.example,exampleEdited:false,exampleConfirmed:false,system:birth.system,systemIndex:birth.system==='W'?1:0,zoneIndex:zoneNames.indexOf(birth.timezone),cityOptions:[],locationHint:'',citySelected:birth.example,manualConfirmed:!birth.example});}catch(e){this.setData({error:'原出生资料无法还原，请重新填写。'});}},
 onUnload(){this.unloaded=true;},
 applyBirthEdit(update){this.setData(Object.assign({example:false,exampleEdited:this.data.exampleOrigin,exampleConfirmed:false,error:''},update));},
 onInput(e){const key=e.currentTarget.dataset.field,update={['form.'+key]:e.detail.value};if(key==='latitude'||key==='longitude')Object.assign(update,{citySelected:false,manualConfirmed:false,cityOptions:[],locationHint:MANUAL_LOCATION_HINT});this.applyBirthEdit(update);},
 onDate(e){this.applyBirthEdit({'form.date':e.detail.value});},
 onTime(e){this.applyBirthEdit({'form.time':e.detail.value});},
 onCity(e){const query=e.detail.value,cityOptions=search(query),locationHint=!query.trim()?EMPTY_LOCATION_HINT:cityOptions.length?'请从搜索结果中选择出生城市。':'没有找到这个城市，可尝试英文名，或展开坐标设置手动填写。';this.applyBirthEdit({'form.city':query,cityOptions,locationHint,citySelected:false,manualConfirmed:false});},
 selectCity(e){const c=this.data.cityOptions[e.currentTarget.dataset.index];if(!c)return;this.applyBirthEdit({'form.city':c.name,'form.latitude':c.latitude,'form.longitude':c.longitude,'form.timezone':c.timezone,zoneIndex:zoneNames.indexOf(c.timezone),cityOptions:[],locationHint:'',citySelected:true,manualConfirmed:false});},
 example(e){const f=Object.assign({},EXAMPLES[e.currentTarget.dataset.index]);this.setData({form:f,system:'P',systemIndex:0,zoneIndex:zoneNames.indexOf(f.timezone),cityOptions:[],locationHint:'',citySelected:true,manualConfirmed:false,example:true,exampleOrigin:true,exampleEdited:false,exampleConfirmed:false,error:''});},
 startPersonal(){if(this.data.submitting)return;this.setData({form:{name:'',date:'',time:'',second:'00',city:'',latitude:'',longitude:'',timezone:''},example:false,exampleOrigin:false,exampleEdited:false,exampleConfirmed:false,system:'P',systemIndex:0,zoneIndex:0,cityOptions:[],locationHint:EMPTY_LOCATION_HINT,citySelected:false,manualConfirmed:false,advanced:false,error:''});},
 showExampleSource(){const s=this.data.example&&this.data.form.source;if(!s)return;wx.showModal({title:s.title,content:s.note+'\n\n'+s.url,confirmText:'复制链接',cancelText:'关闭',success:r=>{if(r.confirm)wx.setClipboardData({data:s.url});}});},
 toggleAdvanced(){this.setData({advanced:!this.data.advanced});},
 onZone(e){const i=Number(e.detail.value);this.applyBirthEdit({zoneIndex:i,'form.timezone':zoneNames[i],citySelected:false,manualConfirmed:false,cityOptions:[],locationHint:MANUAL_LOCATION_HINT});},
 onSystem(e){const i=Number(e.detail.value);this.setData({systemIndex:i,system:i?'W':'P'});},
 confirmManualLocation(){try{const {birth}=normalizeBirth(Object.assign({},this.data.form,{system:this.data.system}));this.setData({'form.latitude':birth.latitude,'form.longitude':birth.longitude,manualConfirmed:true,cityOptions:[],locationHint:'',error:''});}catch(e){this.setData({error:e.message});}},
 validatedBirth(){
  if(!this.data.form.date)throw Error('请选择出生日期');
  if(!this.data.form.time)throw Error('请选择当地出生时间');
  if(!this.data.citySelected&&!this.data.manualConfirmed)throw Error('请从搜索结果选择出生地，或在坐标设置中明确采用手动坐标与时区');
  return normalizeBirth(Object.assign({},this.data.form,{system:this.data.system,example:this.data.example}));
 },
 confirmExampleBirth(){if(!this.data.exampleEdited)return;try{this.validatedBirth();this.setData({exampleConfirmed:true,error:''});}catch(e){this.setData({exampleConfirmed:false,error:e.message});}},
 async calculate(){
  if(this.data.submitting)return;
  this.setData({submitting:true,error:''});
  try{
   const {birth,candidates}=this.validatedBirth();
   if(this.data.exampleEdited&&!this.data.exampleConfirmed)throw Error('这份资料基于示例修改，请先核对出生资料并确认');
   if(!birth.example)delete birth.source;
   let choice=candidates[0];
   if(candidates.length>1){const result=await new Promise((resolve,reject)=>wx.showActionSheet({itemList:candidates.map((c,i)=>(i?'第二次':'第一次')+' '+c.label),alertText:'时钟回拨，此时间出现两次。请选择记录对应的偏移。',success:resolve,fail:reject}));choice=candidates[result.tapIndex];}
   if(this.unloaded)return;
   if(!choice)throw Error('请选择记录对应的时间');
   Object.assign(birth,{utc:choice.utc,offset:choice.label});
   const info=shareContent(birth,INITIAL_STATE,null,INITIAL_VIEWPORT);
   await new Promise((resolve,reject)=>wx.navigateTo({url:info.path,success:resolve,fail:reject}));
  }catch(e){if(!this.unloaded&&!(e.errMsg&&e.errMsg.includes('cancel')))this.setData({error:e.message||e.errMsg||'请检查出生资料'});}
  finally{if(!this.unloaded)this.setData({submitting:false});}
 }
});
