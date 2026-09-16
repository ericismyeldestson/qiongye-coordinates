const zones = require('../data/timezones');
function civilSeconds(date,time) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}(:\d{2})?$/.test(time))throw Error('请输入完整日期和时间');
  const [y,m,d]=date.split('-').map(Number),[h,mi,s=0]=time.split(':').map(Number);
  const value=Date.UTC(y,m-1,d,h,mi,s),check=new Date(value);
  if(y<1900||y>2099||m<1||m>12||h>23||mi>59||s>59||check.getUTCDate()!==d||check.getUTCMonth()!==m-1)throw Error('请输入 1900—2099 年内的有效日期和时间');
  return value/1000;
}
function offsetAt(utc,zone) {
  const rows=Object.prototype.hasOwnProperty.call(zones,zone)&&zones[zone];if(!rows)throw Error('请选择有效的出生地时区');
  let lo=0,hi=rows.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(rows[mid][0]<=utc)lo=mid;else hi=mid-1;}
  return rows[lo][1];
}
function resolveTime(date,time,zone) {
  const wall=civilSeconds(date,time),rows=Object.prototype.hasOwnProperty.call(zones,zone)&&zones[zone];
  if(!rows)throw Error('请选择有效的出生地时区');
  const candidates=[];
  for(const offset of [...new Set(rows.map(r=>r[1]))]) {
    const utc=wall-offset;
    if(offsetAt(utc,zone)===offset)candidates.push({utc:new Date(utc*1000).toISOString(),offset,label:formatOffset(offset)});
  }
  candidates.sort((a,b)=>a.utc.localeCompare(b.utc));
  if(!candidates.length)throw Error('这个当地时刻因夏令时或时区调整而不存在，请核对出生记录');
  return candidates;
}
function formatOffset(seconds) {
  const n=Math.abs(seconds),pad=v=>String(v).padStart(2,'0');
  return 'UTC'+(seconds<0?'−':'+')+pad(Math.floor(n/3600))+':'+pad(Math.floor(n/60)%60)+(n%60?':'+pad(n%60):'');
}
module.exports={resolveTime,offsetAt,formatOffset,zoneNames:Object.keys(zones)};
