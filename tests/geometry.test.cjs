const {test}=require('node:test'),assert=require('node:assert/strict');
const {planetaryLines,equatorial,wrap}=require('../miniprogram/core/sky-lines');
const {nearby,prepareLines,EARTH_KM}=require('../miniprogram/core/place-rules');
const RAD=Math.PI/180;
test('rising/setting points satisfy the horizon equation and correct hour-angle signs',()=>{
 for(const [ra,dec,gast] of [[0,0,0],[130,23.4,250],[359,-70,4],[12,89,270]]){
  for(const line of planetaryLines('Sun',ra,dec,gast))for(const p of line.points){
   const h=wrap(gast+p.lon-ra),sinAltitude=Math.sin(p.lat*RAD)*Math.sin(dec*RAD)+Math.cos(p.lat*RAD)*Math.cos(dec*RAD)*Math.cos(h*RAD);
   if(line.angle==='ASC'||line.angle==='DSC'){
    assert.ok(Math.abs(sinAltitude)<1e-12);assert.ok(line.angle==='ASC'?h<=1e-10:h>=-1e-10);
   }else assert.ok(Math.abs(Math.sin(h*RAD))<1e-12);
  }
 }
});
test('equatorial conversion has the expected ecliptic cardinal points',()=>{
 assert.equal(equatorial(0,0,23.4).raDeg,0);assert.ok(Math.abs(equatorial(90,0,23.4).decDeg-23.4)<1e-12);
 assert.ok(Math.abs(equatorial(270,0,23.4).decDeg+23.4)<1e-12);
});
test('spherical distance handles date line and the documented 350 km threshold',()=>{
 const lines=prepareLines([{planet:'Sun',angle:'MC',points:[{lat:0,lon:179}]}]);
 const [near]=nearby(0,-179,lines);assert.ok(Math.abs(near.distanceKm-2*RAD*EARTH_KM)<1e-8);
 const zero=prepareLines([{planet:'Venus',angle:'DSC',points:[{lat:0,lon:0}]}]);
 assert.equal(nearby(0,(350-.001)/EARTH_KM/RAD,zero).length,1);
 assert.equal(nearby(0,(350+.001)/EARTH_KM/RAD,zero).length,0);
});
test('empty and opposite hemisphere lines never invent a match',()=>{
 assert.deepEqual(nearby(0,0,prepareLines([{planet:'Sun',angle:'MC',points:[]}])),[]);
 assert.deepEqual(nearby(0,180,prepareLines([{planet:'Sun',angle:'MC',points:[{lat:0,lon:0}]}])),[]);
});
