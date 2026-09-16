const {norm}=require('./engine');
const SIGNS=['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
const SYMBOLS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
function angleText(deg) {
  const arc=Math.round(norm(deg)*3600)%(360*3600),sign=Math.floor(arc/108000),within=arc%108000;
  return SIGNS[sign]+' '+String(Math.floor(within/3600)).padStart(2,'0')+'°'+String(Math.floor(within/60)%60).padStart(2,'0')+'′'+String(within%60).padStart(2,'0')+'″';
}
function houseOf(longitude,cusps){for(let i=0;i<12;i++)if(norm(longitude-cusps[i])<norm(cusps[(i+1)%12]-cusps[i]))return i+1;return null;}
function aspects(bodies) {
  const rules=[['合相',0,8],['六合',60,4],['刑相',90,6],['拱相',120,6],['对冲',180,8]],result=[];
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++) {
    const a=bodies[i],b=bodies[j],sep=Math.min(norm(a.longitude-b.longitude),norm(b.longitude-a.longitude));
    for(const [name,angle,orb] of rules)if(Math.abs(sep-angle)<=orb)result.push({a:a.key,b:b.key,name,angle,orb:Math.abs(sep-angle),label:a.name+' · '+b.name,orbText:Math.abs(sep-angle).toFixed(2)+'°'});
  }
  return result.sort((a,b)=>a.orb-b.orb);
}
function decorate(result){const hs=result.houses;return Object.assign({},result,{bodies:result.bodies.map(b=>Object.assign({},b,{position:angleText(b.longitude),house:hs?houseOf(b.longitude,hs.cusps):'—'})),aspects:aspects(result.bodies),houseRows:hs?hs.cusps.map((v,i)=>({number:i+1,position:angleText(v)})):[],axes:hs?[['ASC',hs.asc],['MC',hs.mc],['DSC',hs.dsc],['IC',hs.ic]].map(([name,v])=>({name,position:angleText(v)})):[]});}
function splitDateline(points) {const chunks=[];let segment=[];for(const p of points){if(segment.length&&Math.abs(p.lon-segment[segment.length-1].lon)>180){if(segment.length>1)chunks.push(segment);segment=[];}segment.push(p);}if(segment.length>1)chunks.push(segment);return chunks;}
module.exports={SIGNS,SYMBOLS,angleText,houseOf,aspects,decorate,splitDateline};
