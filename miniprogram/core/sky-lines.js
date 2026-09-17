// Spherical horizon geometry, implemented here from coordinate definitions.
// raDeg and decDeg are equatorial-of-date coordinates; gast is degrees.
const RAD=Math.PI/180;
function wrap(deg){return ((deg+180)%360+360)%360-180;}
function equatorial(longitude,latitude,obliquity){
 const l=longitude*RAD,b=latitude*RAD,e=obliquity*RAD;
 const ra=Math.atan2(Math.sin(l)*Math.cos(e)-Math.tan(b)*Math.sin(e),Math.cos(l))*(180/Math.PI);
 const dec=Math.asin(Math.sin(b)*Math.cos(e)+Math.cos(b)*Math.sin(e)*Math.sin(l))*(180/Math.PI);
 return {raDeg:ra<0?ra+360:ra,decDeg:dec};
}
function planetaryLines(planet,raDeg,decDeg,gast){
 const meridian=wrap(raDeg-gast),rows={ASC:[],MC:[],DSC:[],IC:[]};
 for(let quarter=-356;quarter<=356;quarter++){
  const lat=quarter/4;
  rows.MC.push({lat,lon:meridian});rows.IC.push({lat,lon:wrap(meridian+180)});
  const cosine=-Math.tan(lat*RAD)*Math.tan(decDeg*RAD);
  if(Math.abs(cosine)>1)continue;
  const hour=Math.acos(cosine)/RAD;
  rows.ASC.push({lat,lon:wrap(meridian-hour)});
  rows.DSC.push({lat,lon:wrap(meridian+hour)});
 }
 return ['MC','IC','ASC','DSC'].map(angle=>({planet,angle,points:rows[angle],
  samplePoints:rows[angle].filter(point=>point.lat>=-85&&point.lat<=85&&
   (angle==='MC'||angle==='IC'?(point.lat+85)%10===0:Number.isInteger(point.lat)))
 }));
}
module.exports={equatorial,planetaryLines,wrap};
