const {resolveTime}=require('./time');
const LIMITS={name:40,city:100,timezone:100};
// The public range is the local birth date. UTC needs a day of timezone margin.
const UTC_MIN=Date.UTC(1899,11,31),UTC_MAX=Date.UTC(2100,0,2);
function text(value,max,label,optional=false){
 if(optional&&value===undefined)value='';
 if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value)||(!optional&&!value.trim()))throw Error(label+'不能为空或超过 '+max+' 个字符');
 return value;
}
function coordinates(latitude,longitude){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>=90||Math.abs(longitude)>180)throw Error('请填写有效经纬度：纬度须在 −90 与 90 之间，经度须在 −180 与 180 之间');
 return {latitude,longitude};
}
function numeric(value){return typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;}
function normalizeBirth(input){
 const b=Object.assign({},input,coordinates(numeric(input.latitude),numeric(input.longitude)));
 b.name=text(input.name,LIMITS.name,'称呼',true);b.city=text(input.city,LIMITS.city,'出生城市');
 b.timezone=text(input.timezone,LIMITS.timezone,'时区');b.date=text(input.date,10,'出生日期');b.time=text(input.time,5,'出生时间');
 const second=input.second===undefined?'':String(input.second);
 if(!/^\d{0,2}$/.test(second)||Number(second)>59)throw Error('出生时间的秒数须在 00 与 59 之间');
 b.second=second.padStart(2,'0');
 if(!['P','W'].includes(b.system))throw Error('请选择有效的宫制');
 const candidates=resolveTime(b.date,b.time+':'+b.second,b.timezone);
 return {birth:b,candidates};
}
module.exports={LIMITS,UTC_MIN,UTC_MAX,coordinates,normalizeBirth};
