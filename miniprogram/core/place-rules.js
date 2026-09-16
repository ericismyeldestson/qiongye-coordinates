// Project-authored topic/scoring policy: interest categories, not probabilities.
const METHOD='qy-spherical-samples-topic-v1';
const RADIUS_KM=350,EARTH_KM=6371.0088,RAD=Math.PI/180;
const THEMES={
 Sun:{career:2,creativity:2,growth:1},Moon:{home:2,love:1},
 Mercury:{career:1,creativity:1,growth:2},Venus:{love:2,creativity:2,home:1},
 Mars:{career:1,growth:2},Jupiter:{career:1,growth:2},
 Saturn:{career:2,home:1,growth:1},Uranus:{creativity:2,growth:1},
 Neptune:{creativity:2,love:1},Pluto:{growth:2,career:1},
 Chiron:{growth:2,home:1},'North Node':{growth:2}
};
const AXIS_THEMES={ASC:{growth:1,creativity:1},MC:{career:2},DSC:{love:2},IC:{home:2}};
function weight(goal,planet,angle){
 if(goal==='overall')return 1;
 const base=(THEMES[planet]||{})[goal]||0;
 return base?base+((AXIS_THEMES[angle]||{})[goal]||0):0;
}
function vector(lat,lon){const p=lat*RAD,l=lon*RAD,c=Math.cos(p);return [c*Math.cos(l),c*Math.sin(l),Math.sin(p)];}
function prepareLines(lines){return lines.map(line=>({planet:line.planet,angle:line.angle,vertices:line.points.map(p=>vector(p.lat,p.lon))}));}
function nearby(latitude,longitude,prepared){
 const v=vector(latitude,longitude),found=[],limit=Math.cos(RADIUS_KM/EARTH_KM);
 for(const line of prepared){
  let best=-1;
  for(const p of line.vertices){const d=p[0]*v[0]+p[1]*v[1]+p[2]*v[2];if(d>best)best=d;}
  if(best>=limit-1e-14){const distanceKm=EARTH_KM*Math.acos(Math.max(-1,Math.min(1,best)));found.push({planet:line.planet,angle:line.angle,distanceKm});}
 }
 return found;
}
module.exports={METHOD,RADIUS_KM,EARTH_KM,weight,prepareLines,nearby};
