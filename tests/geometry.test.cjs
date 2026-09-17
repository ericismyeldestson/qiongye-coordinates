const {test}=require('node:test'),assert=require('node:assert/strict');
const {planetaryLines,equatorial,wrap}=require('../miniprogram/core/sky-lines');
const {nearby,prepareLines,KM_PER_DEGREE}=require('../miniprogram/core/place-rules');
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
test('original planar distance preserves direct longitude and the 350 km cutoff',()=>{
 const lines=prepareLines([{planet:'Sun',angle:'MC',points:[{lat:0,lon:179}]}]);
 assert.equal(nearby(0,-179,lines).length,0,'Original rules do not wrap the date line');
 const zero=prepareLines([{planet:'Venus',angle:'DSC',points:[{lat:0,lon:0}]}]);
 assert.equal(nearby(0,(350-.001)/KM_PER_DEGREE,zero).length,1);
 assert.equal(nearby(0,350/KM_PER_DEGREE,zero).length,1);
 assert.equal(nearby(0,(350+.001)/KM_PER_DEGREE,zero).length,0);
});
test('dense rendering never replaces the original recommendation sampling grid',()=>{
 const generated=planetaryLines('Sun',0,0,0),lines=prepareLines(generated);
 const mc=lines.find(l=>l.angle==='MC');assert.equal(mc.points.length,18);
 assert.ok(generated.find(l=>l.angle==='MC').points.some(p=>p.lat===0));
 assert.ok(!mc.points.some(p=>p.lat===0),'Reference MC samples are -85,-75,...,85');
 assert.equal(nearby(0,0,[mc]).length,0,'Preserve the original coarse-grid result');
 assert.equal(lines.find(l=>l.angle==='ASC').points.length,171);
});
test('empty and opposite hemisphere lines never invent a match',()=>{
 assert.deepEqual(nearby(0,0,prepareLines([{planet:'Sun',angle:'MC',points:[]}])),[]);
 assert.deepEqual(nearby(0,180,prepareLines([{planet:'Sun',angle:'MC',points:[{lat:0,lon:0}]}])),[]);
});
