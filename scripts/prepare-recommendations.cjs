// Preserve original comparison parameters; source display names from GeoNames.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=path.join(root,'third_party/geonames/cities.json.gz');
const input=fs.readFileSync(source),raw=JSON.parse(zlib.gunzipSync(input));
const referenceFile='third_party/recommendation-reference/candidates.json';
const referenceBytes=fs.readFileSync(path.join(root,referenceFile)),reference=JSON.parse(referenceBytes);
const names=new Intl.DisplayNames(['zh-CN'],{type:'region'});
const regionName=code=>({CN:'中国',HK:'中国香港',MO:'中国澳门',TW:'中国台湾'}[code]||names.of(code));
const english=new Intl.DisplayNames(['en'],{type:'region'}),codes={USA:'US',UK:'GB',UAE:'AE','Czech Republic':'CZ','South Korea':'KR',Turkey:'TR',Myanmar:'MM'};
for(const code of new Set(raw.cities.map(row=>row[4]))){const name=english.of(code);if(!codes[name])codes[name]=code;}
const normal=name=>name.split(',')[0].normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^st\.?\s/,'saint ').replace(/\bcity\b/g,'').replace(/[^a-z0-9]/g,'');
const byName=new Map();
for(const row of raw.cities)for(const name of new Set([row[1],row[2],...(row[11]||[])])){
 const key=row[4]+'|'+normal(name);if(!byName.has(key))byName.set(key,[]);byName.get(key).push(row);
}
const distance=(c,r)=>Math.hypot((c.lat-r[7])*111,(c.lon-r[8])*111*Math.cos((c.lat+r[7])/2*Math.PI/180));
const candidates=reference.cities.map(c=>{
 const country=c.name==='Hong Kong'?'HK':c.name==='Macau'?'MO':codes[c.country];
 if(!country)throw Error('Unmapped country: '+c.country);
 const matches=(byName.get(country+'|'+normal(c.name))||[]).slice().sort((a,b)=>distance(c,a)-distance(c,b));
 const row=matches[0];
 if(!row||distance(c,row)>200)throw Error('Review GeoNames identity: '+c.name+' / '+country);
 return {id:row[0],name:c.name,displayName:row[3]||c.name,country,countryName:regionName(country),lat:c.lat,lon:c.lon};
});
const file='miniprogram/data/candidates.js';
const data='// Original comparison scope/order/coordinates; GeoNames CC BY 4.0 display metadata.\n// See recommendations-manifest.json for separate sources and redistribution status.\nmodule.exports='+JSON.stringify(candidates)+';\n';
fs.writeFileSync(path.join(root,file),data);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const manifest={method:'browser-original-order-plus-macau-v1',source:'GeoNames display metadata; original comparison scope and reference coordinates separately recorded',sourceURL:'https://download.geonames.org/export/dump/',license:'CC-BY-4.0 for GeoNames metadata; NOASSERTION for reference compilation',sourceSha256:hash(input),reference:{file:referenceFile,sha256:hash(referenceBytes),sourceURL:reference.sourceURL,license:reference.license,redistributionCleared:reference.redistributionCleared},candidateCount:candidates.length,chinaCandidateCount:candidates.filter(c=>['CN','HK','MO','TW'].includes(c.country)).length,selection:'Original 414 entries in original stable tie order, with Macau appended as in Mini Program 0.3.2. Reference coordinates preserve the numerical comparison. GeoNames provides display names and identity; it is not the source of the reference compilation.',output:{file,sha256:hash(data)}};
fs.writeFileSync(path.join(root,'recommendations-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({candidateCount:manifest.candidateCount,chinaCandidateCount:manifest.chinaCandidateCount}));
