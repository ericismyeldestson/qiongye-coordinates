// Spherical horizon geometry, implemented here from coordinate definitions.
// raDeg and decDeg are equatorial-of-date coordinates; gast is degrees.
const RAD=Math.PI/180;
function wrap(deg){return ((deg+180)%360+360)%360-180;}
function equatorial(longitude,latitude,obliquity){
 const l=longitude*RAD,b=latitude*RAD,e=obliquity*RAD;
 const x=Math.cos(b)*Math.cos(l),y=Math.cos(b)*Math.sin(l)*Math.cos(e)-Math.sin(b)*Math.sin(e);
 const z=Math.cos(b)*Math.sin(l)*Math.sin(e)+Math.sin(b)*Math.cos(e);
 return {raDeg:((Math.atan2(y,x)/RAD)%360+360)%360,decDeg:Math.asin(Math.max(-1,Math.min(1,z)))/RAD};
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
 return ['ASC','MC','DSC','IC'].map(angle=>({planet,angle,points:rows[angle]}));
}
module.exports={equatorial,planetaryLines,wrap};
