"""Build an offline GeoNames city subset and historical civil-time transitions."""
from pathlib import Path
import gzip, json, re, datetime as dt, zoneinfo, hashlib
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'third_party/geonames/cities.json.gz'
OUT = ROOT / 'miniprogram/data'
OUT.mkdir(exist_ok=True)
raw = json.loads(gzip.decompress(SOURCE.read_bytes()))
rows = raw['cities']
selected = {r[0]: r for r in rows if r[10] >= 180000 or (r[4]=='CN' and r[10]>=50000)}
for country in {r[4] for r in rows}:
    top = sorted((r for r in rows if r[4]==country),key=lambda r:r[10],reverse=True)[:2]
    for r in top: selected[r[0]]=r
for name in ['Honolulu','Reading','Nashville','Cambridge','Lhasa','Urumqi']:
    match = sorted((r for r in rows if r[2]==name),key=lambda r:r[10],reverse=True)
    if match:selected[match[0][0]]=match[0]
overrides = {'Shanghai':'上海','Beijing':'北京','Chengdu':'成都','Guangzhou':'广州','Shenzhen':'深圳','Wuhan':'武汉','Hangzhou':'杭州','Chongqing':'重庆','Xian':'西安',"Xi'an":'西安','Nanjing':'南京','Tianjin':'天津','Suzhou':'苏州','Urumqi':'乌鲁木齐','Lhasa':'拉萨','Hong Kong':'香港','Taipei':'台北','Tokyo':'东京','Osaka':'大阪','Seoul':'首尔','Singapore':'新加坡','London':'伦敦','Paris':'巴黎','New York City':'纽约','Los Angeles':'洛杉矶','San Francisco':'旧金山','Sydney':'悉尼','Melbourne':'墨尔本','Honolulu':'檀香山','Reading':'雷丁','Nashville':'纳什维尔','Berlin':'柏林','Moscow':'莫斯科','Bangkok':'曼谷','Dubai':'迪拜','Toronto':'多伦多','Vancouver':'温哥华'}
cities=[]
for r in sorted(selected.values(),key=lambda r:r[10],reverse=True):
    aliases=[x for x in r[11] if re.search(r'[\u4e00-\u9fff]',x) and len(x)<14]
    name=overrides.get(r[2]) or r[3] or (aliases[0] if aliases else r[1])
    cities.append([r[0],name,r[2],r[4],r[7],r[8],r[9],list(dict.fromkeys([r[1],r[3]]+aliases))])
(OUT/'cities.js').write_text('module.exports='+json.dumps(cities,ensure_ascii=False,separators=(',',':'))+';\n')
UTC=dt.timezone.utc
start=int(dt.datetime(1899,12,29,tzinfo=UTC).timestamp())
end=int(dt.datetime(2100,1,3,tzinfo=UTC).timestamp())
zones=sorted({r[6] for r in cities}|{'Asia/Shanghai','Asia/Urumqi','UTC','Pacific/Honolulu','America/New_York'})
table={}
for name in zones:
    z=zoneinfo.ZoneInfo(name)
    def offset(ts): return int(dt.datetime.fromtimestamp(ts,UTC).astimezone(z).utcoffset().total_seconds())
    last=offset(start);transitions=[[start,last]];t=start
    while t<end:
        nxt=min(t+86400,end);new=offset(nxt)
        if new!=last:
            lo,hi=t,nxt
            while hi-lo>1:
                mid=(lo+hi)//2
                if offset(mid)==last:lo=mid
                else:hi=mid
            transitions.append([hi,new]);last=new
        t=nxt
    table[name]=transitions
(OUT/'timezones.js').write_text('module.exports='+json.dumps(table,separators=(',',':'))+';\n')
manifest={'source':'GeoNames existing local catalog; macOS IANA zoneinfo','source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'cities':len(cities),'zones':len(zones),'supported_years':[1900,2099],'coordinates':'WGS84 city centers; manual coordinates supported','timezone_offset_unit':'seconds; includes historical offsets and DST','generated_at':dt.datetime.now(UTC).isoformat()}
(ROOT/'locations-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False))
