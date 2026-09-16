const {normalizeBirth,coordinates}=require('./birth');
const {EXAMPLES}=require('./locations');
const {BODIES}=require('./engine');
const {GOALS}=require('./recommendations');
const TABS=['places','map','chart'],SCOPES=['all','cn'],AXES=['all','ASC','DSC','MC','IC'];
const INITIAL_STATE={tab:'places',placeScope:'all',placeGoal:'overall',planet:'all',angle:'all',analysis:null};
const INITIAL_VIEWPORT={zoom:1,lat:0,lon:0};
function requireValue(ok){if(!ok)throw Error('分享资料不完整或版本不支持，请让分享者重新发送');}
function text(value,max){requireValue(typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f]/.test(value));return value;}
function number(value,min,max){requireValue(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max);return value;}
function location(row){requireValue(Array.isArray(row)&&row.length===4);const point=coordinates(number(row[1],-90,90),number(row[2],-180,180));return Object.assign({city:text(row[0],100),country:text(row[3],80)},point);}
function encodeShare(birth,state,target,viewport){
 birth=normalizeBirth(birth).birth;
 const example=birth.example?EXAMPLES.findIndex(p=>['date','time','second','timezone','latitude','longitude','name','city'].every(k=>p[k]===birth[k])):-1;
 const payload=[1,[birth.name||'',birth.city,birth.date,birth.time,String(birth.second).padStart(2,'0'),birth.timezone,birth.latitude,birth.longitude,birth.utc,birth.system,example],[state.tab,state.placeScope,state.placeGoal,state.planet,state.angle,viewport.zoom,viewport.lat,viewport.lon,target?[target.city||target.name||'地图选点',target.latitude,target.longitude,target.country||'']:null,!!state.analysis]];
 const raw=JSON.stringify(payload);decodeShare(raw);
 return 's='+encodeURIComponent(raw);
}
function decodeShare(value){
 requireValue(typeof value==='string'&&value.length<=8000);
 let payload;try{payload=JSON.parse(value[0]==='['?value:decodeURIComponent(value));}catch(e){throw Error('分享链接已损坏，请让分享者重新发送');}
 requireValue(Array.isArray(payload)&&payload.length===3&&payload[0]===1);
 const b=payload[1],s=payload[2];requireValue(Array.isArray(b)&&b.length===11&&Array.isArray(s)&&s.length===10);
 let birth={name:text(b[0],40),city:text(b[1],100),date:text(b[2],10),time:text(b[3],5),second:text(b[4],2),timezone:text(b[5],100),latitude:number(b[6],-90,90),longitude:number(b[7],-180,180),utc:text(b[8],24),system:b[9],example:false};
 requireValue(['P','W'].includes(birth.system)&&/^\d{2}$/.test(birth.second));
 const normalized=normalizeBirth(birth);birth=normalized.birth;
 const instant=normalized.candidates.find(t=>t.utc===birth.utc);
 requireValue(!!instant);birth.offset=instant.label;
 requireValue(Number.isInteger(b[10])&&b[10]>=-1&&b[10]<EXAMPLES.length);
 if(b[10]>=0){const p=EXAMPLES[b[10]];requireValue(['date','time','second','timezone','latitude','longitude','name','city'].every(k=>p[k]===birth[k]));birth.example=true;if(p.source)birth.source=p.source;}
 requireValue(TABS.includes(s[0])&&SCOPES.includes(s[1])&&GOALS.some(g=>g.key===s[2])&&['all',...BODIES.map(b=>b.key)].includes(s[3])&&AXES.includes(s[4])&&typeof s[9]==='boolean');
 return {birth,state:{tab:s[0],placeScope:s[1],placeGoal:s[2],planet:s[3],angle:s[4]},viewport:{zoom:number(s[5],1,6),lat:number(s[6],-75,75),lon:number(s[7],-180,180)},target:s[8]===null?null:location(s[8]),hasAnalysis:s[9]};
}
function resultTitle(state,relocated){return state.tab==='places'?'推荐地点':state.tab==='map'?'世界行星线':relocated?'重定位星盘':'本命星盘';}
function shareContent(birth,state,target,viewport){const query=encodeShare(birth,state,target,viewport);return {title:'穹野坐标 · '+(birth.name||'我的星图')+' · '+resultTitle(state,!!target),query,path:'/moondata/index?'+query};}
function supportsImageTimeline(version){const a=String(version||'0').split('.').map(Number),b=[3,8,2];for(let i=0;i<3;i++){if((a[i]||0)!==b[i])return (a[i]||0)>b[i];}return true;}
module.exports={encodeShare,decodeShare,shareContent,resultTitle,supportsImageTimeline,INITIAL_STATE,INITIAL_VIEWPORT};
