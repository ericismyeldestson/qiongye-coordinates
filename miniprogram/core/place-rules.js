// SPDX-License-Identifier: AGPL-3.0-only
// Original scoring specification, implemented as a declarative numeric table.
const METHOD='browser-350km-reference-v1';
const RADIUS_KM=350,KM_PER_DEGREE=111,RAD=Math.PI/180;
const WEIGHTS={
 career:{MC:{Jupiter:3,Sun:3,Venus:2,Mercury:2,Saturn:1,Mars:1},ASC:{Sun:1,Jupiter:1}},
 love:{DSC:{Venus:3,Sun:2,Moon:2,Jupiter:1},ASC:{Venus:1}},
 home:{IC:{Moon:3,Venus:2,Sun:2,Jupiter:1,Saturn:1}},
 creativity:{ASC:{Venus:3,Neptune:3,Sun:2,Mercury:2,Moon:1,Uranus:1},MC:{Venus:2,Neptune:2}},
 growth:{ASC:{Jupiter:3,Mercury:2,Sun:2,Uranus:1,Saturn:1},MC:{Jupiter:3,Mercury:2,Sun:2,Uranus:1,Saturn:1}}
};
function weight(goal,planet,angle){return goal==='overall'?1:((WEIGHTS[goal]||{})[angle]||{})[planet]||0;}
function prepareLines(lines){
 // Dense map points stay separate from the original recommendation grid.
 return lines.map(line=>({planet:line.planet,angle:line.angle,points:line.samplePoints||line.points}));
}
function nearby(latitude,longitude,prepared){
 const result=[];
 for(const line of prepared){
  let distanceKm=Infinity;
  for(const point of line.points){
   const north=(point.lat-latitude)*KM_PER_DEGREE;
   const east=(point.lon-longitude)*(KM_PER_DEGREE*Math.cos((latitude+point.lat)/2*RAD));
   const distance=Math.sqrt(north*north+east*east);
   if(distance<distanceKm)distanceKm=distance;
  }
  // Keep direct longitude subtraction and the inclusive 350 km threshold.
  // Switching to wrapped or spherical distance would change the old rankings.
  if(distanceKm<=RADIUS_KM)result.push({planet:line.planet,angle:line.angle,distanceKm});
 }
 return result.sort((a,b)=>a.distanceKm-b.distanceKm);
}
module.exports={METHOD,RADIUS_KM,KM_PER_DEGREE,WEIGHTS,weight,prepareLines,nearby};
