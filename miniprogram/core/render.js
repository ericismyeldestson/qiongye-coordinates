const land=require('../data/world');
const {BODIES}=require('./engine');
const {SYMBOLS,splitDateline}=require('./chart');
const TAU=Math.PI*2;
function drawMap(ctx,w,h,result,filter,viewport,selected){
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#111d2e';ctx.fillRect(0,0,w,h);
 const unit=Math.min((w-16)/360,(h-26)/170)*viewport.zoom;
 const project=(lon,lat)=>({x:w/2+(lon-viewport.lon)*unit,y:h/2-(lat-viewport.lat)*unit});
 ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
 ctx.strokeStyle='#28374b';ctx.lineWidth=.5;
 for(let lon=-180;lon<=180;lon+=30){const a=project(lon,-85),b=project(lon,85);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
 for(let lat=-60;lat<=60;lat+=30){const a=project(-180,lat),b=project(180,lat);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
 ctx.fillStyle='#26364a';ctx.strokeStyle='#46576b';ctx.lineWidth=.65;
 for(const ring of land){ctx.beginPath();ring.forEach(([lon,lat],i)=>{const p=project(lon,lat);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.fill();ctx.stroke();}
 const colors=Object.fromEntries(BODIES.map(b=>[b.key,b.color]));
 const lines=result?result.lines.filter(l=>(filter.planet==='all'||l.planet===filter.planet)&&(filter.angle==='all'||l.angle===filter.angle)):[];
 for(const line of lines){ctx.strokeStyle=colors[line.planet];ctx.globalAlpha=filter.planet==='all'?.58:.96;ctx.lineWidth=filter.planet==='all'?.9:1.8;ctx.setLineDash(line.angle==='IC'||line.angle==='DSC'?[4,3]:[]);for(const chunk of splitDateline(line.points)){ctx.beginPath();chunk.forEach((q,i)=>{const p=project(q.lon,q.lat);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.stroke();}}
 ctx.globalAlpha=1;ctx.setLineDash([]);
 if(selected){const p=project(selected.longitude,selected.latitude);ctx.fillStyle='#f4dfb2';ctx.strokeStyle='#0b1320';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,4.5,0,TAU);ctx.fill();ctx.stroke();ctx.font='11px sans-serif';ctx.textAlign='center';const label=selected.city||'所选地点';ctx.fillText(label,p.x,Math.max(14,p.y-11));}
 ctx.restore();ctx.font='9px sans-serif';ctx.fillStyle='#8b9bb1';ctx.textAlign='center';
 for(let lon=-180;lon<=180;lon+=60){const x=project(lon,0).x;if(x>=8&&x<=w-8){const label=lon===0?'0°':Math.abs(lon)+'°'+(lon<0?'W':'E');ctx.textAlign=x<25?'left':x>w-25?'right':'center';ctx.fillText(label,x,h-5);}}
 return {unit,project,lineCount:lines.length};
}
function drawWheel(ctx,w,h,result){
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#131f31';ctx.fillRect(0,0,w,h);
 if(!result||!result.houses){
  if(result&&result.houseError){
   ctx.font='16px sans-serif';ctx.fillStyle='#f0b2a5';ctx.textAlign='center';ctx.textBaseline='middle';
   const lines=[];let line='';for(const ch of result.houseError){if(line&&ctx.measureText(line+ch).width>w-48){lines.push(line);line=ch;}else line+=ch;}if(line)lines.push(line);
   lines.forEach((line,i)=>ctx.fillText(line,w/2,h/2+(i-(lines.length-1)/2)*26));
  }
  return;
 }
 const cx=w/2,cy=h/2,r=Math.min(w,h)/2-20,asc=result.houses.asc;
 const point=(lon,radius)=>{const a=(180-lon+asc)*Math.PI/180;return {x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius};};
 const circle=(radius,color)=>{ctx.beginPath();ctx.arc(cx,cy,radius,0,TAU);ctx.strokeStyle=color;ctx.lineWidth=.7;ctx.stroke();};
 circle(r,'#b7a071');circle(r*.84,'#6f6858');circle(r*.72,'#3e4e63');circle(r*.46,'#35465e');
 for(let degree=0;degree<360;degree+=5){const a=point(degree,r),b=point(degree,r*(degree%30===0?.84:degree%10===0?.97:.982));ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=degree%30===0?'#8c8067':'#566175';ctx.stroke();}
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='16px serif';
 for(let i=0;i<12;i++){const p=point(i*30+15,r*.918);ctx.fillStyle=['#dd9784','#adbf8a','#c2b3e3','#8cb4d4'][i%4];ctx.fillText(SYMBOLS[i],p.x,p.y);}
 result.houses.cusps.forEach((lon,i)=>{const a=point(lon,r*.46),b=point(lon,r*.84);ctx.strokeStyle='#3c4e66';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();const next=result.houses.cusps[(i+1)%12];const mid=lon+((next-lon+360)%360)/2,p=point(mid,r*.78);ctx.fillStyle='#8495ac';ctx.font='10px sans-serif';ctx.fillText(String(i+1),p.x,p.y);});
 for(const aspect of result.aspects){if(aspect.angle===0)continue;const a=point(result.bodies.find(b=>b.key===aspect.a).longitude,r*.46),b=point(result.bodies.find(b=>b.key===aspect.b).longitude,r*.46);ctx.strokeStyle=aspect.angle===120||aspect.angle===60?'#648eb0':'#b87476';ctx.globalAlpha=.46;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.globalAlpha=1;
 for(const [label,lon] of [['ASC',result.houses.asc],['MC',result.houses.mc]]){const a=point(lon,r*.46),b=point(lon,r+4),c=point(lon,r+11);ctx.strokeStyle='#dac394';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.font='8px sans-serif';ctx.fillStyle='#ead2a0';ctx.fillText(label,c.x,c.y);}
 const ordered=result.bodies.slice().sort((a,b)=>a.longitude-b.longitude);let seam=0,gap=-1;
 ordered.forEach((b,i)=>{const d=(ordered[(i+1)%ordered.length].longitude-b.longitude+360)%360;if(d>gap){gap=d;seam=(i+1)%ordered.length;}});
 let previous=-Infinity;
 for(let i=0;i<ordered.length;i++){const b=ordered[(seam+i)%ordered.length];let natural=b.longitude;if((seam+i)>=ordered.length)natural+=360;const adjusted=Math.max(natural,previous+12);previous=adjusted;const a=point(b.longitude,r*.47),p=point(adjusted,r*.63);ctx.strokeStyle=b.color;ctx.globalAlpha=.65;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(a.x,a.y,2,0,TAU);ctx.fillStyle=b.color;ctx.fill();ctx.font='18px serif';ctx.fillText(b.symbol,p.x,p.y);if(b.retrograde){ctx.font='8px sans-serif';ctx.fillText('R',p.x+8,p.y+8);}}
}
module.exports={drawMap,drawWheel};
