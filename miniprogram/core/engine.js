const factory = require('../vendor/qy-swisseph');
const astronomy = require('../vendor/astronomy-time');
const {equatorial,planetaryLines}=require('./sky-lines');
const {coordinates,UTC_MIN,UTC_MAX}=require('./birth');
const BODIES = [
  ['Sun','太阳','☉',0,'#e6bb69'], ['Moon','月亮','☽',1,'#a9cbea'],
  ['Mercury','水星','☿',2,'#81c9b4'], ['Venus','金星','♀',3,'#e3a6bb'],
  ['Mars','火星','♂',4,'#e78073'], ['Jupiter','木星','♃',5,'#b4a1ec'],
  ['Saturn','土星','♄',6,'#c5b18d'], ['Uranus','天王星','♅',7,'#69c6db'],
  ['Neptune','海王星','♆',8,'#739ddb'], ['Pluto','冥王星','♇',9,'#c283bd'],
  ['Chiron','凯龙星','⚷',15,'#9caf80'], ['North Node','北交点','☊',11,'#e4c6a3']
].map(([key,name,symbol,body,color])=>({key,name,symbol,body,color}));
let cached;
function norm(x) { let value=x%360; if(value<0)value+=360; return value; }
function createEngine(m) {
  m.FS.mkdir('/ephemeris');
  const engine = {
    version: m.ccall('swe_version_wrap','string',[],[]),
    addFile(name,bytes) { m.FS.writeFile('/ephemeris/'+name,new Uint8Array(bytes)); },
    ready() { m.ccall('swe_set_ephe_path_wrap',null,['string'],['/ephemeris']); },
    orientation(jd) {
      const ptr=m._malloc(48),err=m._malloc(256);
      try {
        const code=m.ccall('qy_obliquity','number',['number','number','number'],[jd,ptr,err]);
        if(code<0)throw Error(m.UTF8ToString(err));
        return {trueObliquity:m.getValue(ptr,'double'),meanObliquity:m.getValue(ptr+8,'double'),sidereal:m.ccall('qy_sidereal','number',['number'],[jd])};
      } finally {m._free(ptr);m._free(err);}
    },
    position(jd,body,flags=2) {
      const ptr=m._malloc(48),err=m._malloc(256);
      try {
        const actual=m.ccall('swe_calc_ut_wrap','number',['number','number','number','number','number'],[jd,body,flags,ptr,err]);
        if(actual<0)throw Error(m.UTF8ToString(err));
        if(!(actual&2))throw Error('所选日期缺少 Swiss Ephemeris 星历数据');
        const values=Array.from({length:6},(_,i)=>m.getValue(ptr+i*8,'double'));
        if(!values.every(Number.isFinite))throw Error('星历返回了无效数值');
        return {longitude:values[0],latitude:values[1],distance:values[2],speed:values[3],flags:actual};
      } finally {m._free(ptr);m._free(err);}
    },
    houses(jd,lat,lon,system='P') {
      const cp=m._malloc(104),ap=m._malloc(80);
      try {
        const code=m.ccall('swe_houses_wrap','number',Array(6).fill('number'),[jd,lat,lon,system.charCodeAt(0),cp,ap]);
        if(code<0)throw Error('该纬度下 Placidus 宫制不可用，请改用整宫制');
        const cusps=Array.from({length:12},(_,i)=>norm(m.getValue(cp+(i+1)*8,'double')));
        const asc=norm(m.getValue(ap,'double')),mc=norm(m.getValue(ap+8,'double'));
        return {cusps,asc,mc,dsc:norm(asc+180),ic:norm(mc+180),system};
      } finally {m._free(cp);m._free(ap);}
    },
    calculate(utc,lat,lon,system='P') {
      const date=new Date(utc);
      if(!Number.isFinite(date.getTime()))throw Error('请检查日期和经纬度');
      coordinates(lat,lon);
      if(date.getTime()<UTC_MIN||date.getTime()>=UTC_MAX)throw Error('当前支持当地出生日期 1900—2099 年');
      // Original date/orientation conventions, from official MIT Astronomy Engine.
      // Planet positions and houses continue to use official Swiss Ephemeris.
      const time=astronomy.MakeTime((date.getTime()-Date.UTC(2000,0,1,12))/86400000),tilt=astronomy.e_tilt(time);
      const jd=time.ut+2451545;
      const orientation={trueObliquity:tilt.tobl,meanObliquity:tilt.mobl,sidereal:15*astronomy.SiderealTime(time)};
      const lines=[],bodies=[];
      for(const body of BODIES) {
        const p=this.position(jd,body.body,2),eq=equatorial(norm(p.longitude),p.latitude,orientation.trueObliquity);
        lines.push(...planetaryLines(body.key,eq.raDeg,eq.decDeg,orientation.sidereal));
        const speed=this.position(jd,body.body,258).speed;
        bodies.push(Object.assign({},body,p,{speed,retrograde:speed<0}));
      }
      if(lines.length!==48)throw Error('行星线计算不完整');
      let houses=null,houseError='';
      try {houses=this.houses(jd,lat,lon,system);} catch(error) {houseError=error.message;}
      return {utc:date.toISOString(),jd,latitude:lat,longitude:lon,obliquity:orientation.meanObliquity,lines,bodies,houses,houseError,engine:'Swiss Ephemeris '+this.version+' · 官方源码构建',method:'browser-in-mundo-compatible-v1'};
    }
  };
  return engine;
}
function initialize() {
  if(cached)return cached;
  cached=(async()=>{
    if(typeof WXWebAssembly==='undefined')throw Error('当前微信环境不支持本地星历，请更新微信后重试');
    const m=await new Promise((resolve,reject)=>{
      factory({instantiateWasm(imports,receive){
        try {Promise.resolve(WXWebAssembly.instantiate('vendor/qy-swisseph.wasm',imports)).then(result=>receive(result.instance||result,result.module)).catch(reject);}
        catch(error){reject(error);}return {};
      }}).then(resolve,reject);
    });
    const engine=createEngine(m),fs=wx.getFileSystemManager();
    for(const [folder,name] of [['moondata','sepl_18'],['moondata','seas_18'],['moondata','semo_18']]){
      engine.addFile(name+'.se1',fs.readFileSync(folder+'/'+name+'.bin'));
    }
    engine.ready();return engine;
  })().catch(error=>{cached=null;throw error;});
  return cached;
}
module.exports={initialize,createEngine,BODIES,norm};
