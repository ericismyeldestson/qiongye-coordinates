const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=path.join(root,'third_party/natural-earth');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'provenance.json'))),bytes=fs.readFileSync(path.join(source,'ne_110m_land.geojson'));
if(crypto.createHash('sha256').update(bytes).digest('hex')!==manifest.sha256)throw Error('Natural Earth source changed');
const geo=JSON.parse(bytes),rings=[];
for(const feature of geo.features){
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 for(const polygon of polygons)rings.push(polygon[0].map(p=>p.slice(0,2).map(n=>Math.round(n*1000)/1000)));
}
fs.writeFileSync(path.join(root,'miniprogram/data/world.js'),'// Natural Earth land, public domain; rounded coordinates, exterior rings only.\nmodule.exports='+JSON.stringify(rings)+';\n');
