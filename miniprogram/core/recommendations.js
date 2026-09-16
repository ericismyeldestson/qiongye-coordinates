const rules = require('./place-rules');
const copy = require('../data/place-copy');
const {BODIES} = require('./engine');
const CANDIDATES = require('../data/candidates');
const CHINA_REGIONS = new Set(['CN','TW','HK','MO']);
function isChinaCandidate(city){return CHINA_REGIONS.has(city.country);}
const GOALS = [
  {key:'overall',label:'综合最佳',short:'综合',symbol:'✦',hint:'附近符合距离条件的行星线数量'},
  {key:'career',label:'事业',short:'事业',symbol:'◈',hint:'事业、声誉与公众形象'},
  {key:'love',label:'爱情',short:'爱情',symbol:'♡',hint:'伴侣关系与亲密联结'},
  {key:'home',label:'家园',short:'家园',symbol:'⌂',hint:'家庭、根源与归属感'},
  {key:'creativity',label:'创造力',short:'创造',symbol:'✧',hint:'自我表达、艺术与灵感'},
  {key:'growth',label:'成长',short:'成长',symbol:'↗',hint:'学习、拓展与新的方向'}
];
const AXES={ASC:'上升',DSC:'下降',MC:'中天',IC:'天底'};
const bodies=Object.fromEntries(BODIES.map(b=>[b.key,b]));
function goalFor(key){return GOALS.find(g=>g.key===key)||GOALS[0];}
function sum(lines,goal){return lines.reduce((total,line)=>total+rules.weight(goal,line.planet,line.angle),0);}
function cityView(city,index){return {id:index,geonamesId:city.id,sourceName:city.name,sourceCountry:city.country,name:city.displayName,country:city.countryName,latitude:city.lat,longitude:city.lon};}
function distanceText(km){return km<1?'不足 1 公里':'约 '+Math.round(km)+' 公里';}
function createEvaluator(lines){
  const prepared=rules.prepareLines(lines);
  // Proximity is computed once for the full candidate list. Map filters never affect ranking.
  let candidates;
  const scopes={};
  return {
    recommendations(scope='all'){
      scope=scope==='cn'?'cn':'all';
      if(scopes[scope])return scopes[scope];
      if(!candidates)candidates=CANDIDATES.map((city,index)=>({city:cityView(city,index),nearby:rules.nearby(city.lat,city.lon,prepared)}));
      const pool=candidates.filter(c=>scope!=='cn'||isChinaCandidate({country:c.city.sourceCountry}));
      const cards=GOALS.map(goal=>{
        const ranking=pool.map(c=>({city:c.city,score:sum(c.nearby,goal.key)})).filter(c=>c.score>0)
          .sort((a,b)=>b.score-a.score||a.city.id-b.city.id);
        const best=ranking[0];
        return Object.assign({},goal,{city:best?best.city:null,score:best?best.score:0,tied:best?ranking.filter(c=>c.score===best.score).length:0,matchedCities:ranking.length});
      });
      return scopes[scope]={scope,candidateCount:pool.length,cards};
    },
    analyse(location,key='overall'){
      if(!Number.isFinite(location.latitude)||!Number.isFinite(location.longitude)||Math.abs(location.latitude)>90||Math.abs(location.longitude)>180)throw Error('地点坐标无效');
      const goal=goalFor(key),nearby=rules.nearby(location.latitude,location.longitude,prepared);
      const rows=nearby.map(line=>{
        const b=bodies[line.planet],points=rules.weight(goal.key,line.planet,line.angle);
        return {key:line.planet+'|'+line.angle,planet:line.planet,angle:line.angle,planetName:b.name,symbol:b.symbol,color:b.color,axisName:AXES[line.angle],distanceKm:line.distanceKm,distanceText:distanceText(line.distanceKm),points,meaning:copy.meanings[line.planet+'|'+line.angle]};
      });
      return {name:location.city||location.name||'地图选点',country:location.country||'',latitude:location.latitude,longitude:location.longitude,goal:goal.key,label:goal.label,hint:goal.hint,score:sum(nearby,goal.key),nearbyCount:rows.length,contributingCount:rows.filter(r=>r.points>0).length,
        scores:GOALS.map(g=>({key:g.key,label:g.short,score:sum(nearby,g.key)})),
        // Contributing lines first; distance remains the tie-break within equal contributions.
        rows:rows.sort((a,b)=>b.points-a.points||a.distanceKm-b.distanceKm)};
    }
  };
}
module.exports={GOALS,createEvaluator,goalFor,CANDIDATES,isChinaCandidate};
