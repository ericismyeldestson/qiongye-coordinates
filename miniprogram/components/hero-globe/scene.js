// Original decorative composition using locations from our licensed GeoNames set.
// These routes illustrate connections; they are not calculated planetary lines.
const cities=require('../../data/cities');
const byName=new Map(cities.map(c=>[c[2],[c[4],c[5]]]));
const pairs=[['Shanghai','London'],['Beijing','Sydney'],['Chengdu','Paris'],['Hong Kong','Tokyo'],['Taipei','Singapore'],['New York City','Cape Town'],['Vancouver','Seoul'],['Buenos Aires','Madrid'],['Nairobi','Dubai'],['Macau','Melbourne']];
const planets=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const ROUTES=pairs.map(([a,b],i)=>{if(!byName.has(a)||!byName.has(b))throw Error('Missing decorative city');return [planets[i],byName.get(a),byName.get(b),.28+(i%4)*.06];});
const COLORS={Sun:'#e8cc88',Moon:'#cdd9ea',Mercury:'#8fc7e8',Venus:'#eaa9b8',Mars:'#e28063',Jupiter:'#b8a1e3',Saturn:'#9db29b',Uranus:'#7fd4c9',Neptune:'#7f9fe0',Pluto:'#b98cae'};
const RAD=Math.PI/180;
const unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const geo=([lat,lng],r=1)=>[r*Math.cos(lat*RAD)*Math.sin(lng*RAD),r*Math.sin(lat*RAD),r*Math.cos(lat*RAD)*Math.cos(lng*RAD)];
const color=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
function routePoints(start,end,altitude,steps=64){
 const a=geo(start),b=geo(end),angle=Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0)))),sine=Math.sin(angle),points=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,r=1+4*altitude*t*(1-t);
  const v=sine>1e-6?a.map((x,j)=>(x*Math.sin((1-t)*angle)+b[j]*Math.sin(t*angle))/sine):unit(a.map((x,j)=>x*(1-t)+b[j]*t));
  points.push(v.map(x=>x*r));
 }
 return points;
}
// Interleaved position / normal / UV / color. All meshes are created once.
function geometry(){
 const sphere=[],arcs=[],points=[];
 const vertex=(p,n,uv=[0,0],rgb=[1,1,1])=>[...p,...n,...uv,...rgb];
 const at=(i,j)=>{const p=geo([90-i*180/32,j*360/64-180]);return vertex(p,p,[j/64,i/32]);};
 for(let i=0;i<32;i++)for(let j=0;j<64;j++)sphere.push(...at(i,j),...at(i+1,j),...at(i,j+1),...at(i,j+1),...at(i+1,j),...at(i+1,j+1));
 for(const [planet,start,end,height] of ROUTES){
  const rgb=color(COLORS[planet]),path=routePoints(start,end,height),rings=[];
  for(let i=0;i<path.length;i++){
   const before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)],tangent=unit(after.map((x,j)=>x-before[j]));
   const n=unit(cross(tangent,Math.abs(tangent[1])>.9?[1,0,0]:[0,1,0])),b=cross(tangent,n),ring=[];
   for(let j=0;j<6;j++){
    const angle=j*Math.PI/3,normal=n.map((x,k)=>x*Math.cos(angle)+b[k]*Math.sin(angle));
    ring.push(vertex(path[i].map((x,k)=>x+.008*normal[k]),normal,[0,0],rgb));
   }
   rings.push(ring);
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<6;j++){const k=(j+1)%6;arcs.push(...rings[i][j],...rings[i+1][j],...rings[i][k],...rings[i][k],...rings[i+1][j],...rings[i+1][k]);}
  for(const location of [start,end]){const p=geo(location,1.008);points.push(...vertex(p,unit(p),[0,0],rgb));}
 }
 return {sphere:new Float32Array(sphere),arcs:new Float32Array(arcs),points:new Float32Array(points)};
}
function camera(elapsed){
 const lat=18*RAD,lng=(-30-elapsed*.003)*RAD,s=Math.sin(lng),c=Math.cos(lng),a=Math.sin(lat),b=Math.cos(lat);
 // One revolution per 120 seconds; independent WebGL renderer, no Three.js bundle.
 return new Float32Array([c,-a*s,b*s,0,b,a,-s,-a*c,b*c]);
}
module.exports={ROUTES,COLORS,geo,routePoints,geometry,camera};
