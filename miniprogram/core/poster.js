const {drawMap,drawWheel}=require('./render');
const {BODIES}=require('./engine');
const {resultTitle}=require('./share');
const WIDTH=600;
function posterHeight(snapshot){return snapshot.state.tab==='places'?(snapshot.state.analysis?1370:1180):snapshot.state.tab==='chart'?1560:1260;}
function box(c,x,y,w,h){c.fillStyle='#18283e';c.fillRect(x,y,w,h);c.strokeStyle='#3b4a60';c.lineWidth=1;c.strokeRect(x,y,w,h);}
function label(c,value,x,y,size=20,color='#ecdfc6',width=520){c.font=size+'px sans-serif';c.fillStyle=color;c.textAlign='left';c.textBaseline='top';let s=String(value);while(s&&c.measureText(s).width>width)s=s.slice(0,-1);if(s!==String(value))s=s.slice(0,-1)+'…';c.fillText(s,x,y);}
function wrapped(c,value,x,y,width,size=18,lineHeight=28,maxLines=3){c.font=size+'px sans-serif';c.fillStyle='#a6b6ca';c.textAlign='left';c.textBaseline='top';let line='';const lines=[];for(const ch of String(value)){if(line&&c.measureText(line+ch).width>width){lines.push(line);line=ch;}else line+=ch;}lines.push(line);lines.slice(0,maxLines).forEach((line,i)=>{if(i===maxLines-1&&lines.length>maxLines){while(line&&c.measureText(line+'…').width>width)line=line.slice(0,-1);line+='…';}c.fillText(line,x,y+i*lineHeight);});}
function graphic(c,x,y,w,h,draw){c.save();c.translate(x,y);c.beginPath();c.rect(0,0,w,h);c.clip();draw();c.restore();}
function drawPoster(c,s){
 const h=posterHeight(s),{birth,current,raw,state,target,viewport}=s;
 c.fillStyle='#0f1a2b';c.fillRect(0,0,WIDTH,h);
 label(c,'穹野坐标  /  星图',40,34,18,'#d8b97f');
 label(c,resultTitle(state,!!target),40,76,40,'#f0e3cc');
 label(c,birth.name||'我的星图',40,132,23);
 label(c,birth.date+'  '+birth.time+':'+birth.second+'  ·  '+birth.city,40,168,18,'#a6b6ca');
 label(c,birth.offset+'  ·  '+(birth.system==='P'?'Placidus':'整宫制'),40,195,16,'#a6b6ca');
 let y=234;
 if(state.tab==='places'){
  label(c,(state.placeScope==='cn'?'中国（含港澳台）':'全部城市')+' · '+state.candidateCount+' 个候选',40,y,19,'#dfc38f');y+=42;
  state.recommendations.forEach((card,i)=>{
   const featured=i===0,cx=featured?40:40+((i-1)%2)*268,cy=featured?y:y+170+Math.floor((i-1)/2)*158,cw=featured||i===5?520:252,ch=featured?150:140;
   box(c,cx,cy,cw,ch);label(c,card.label,cx+18,cy+15,18,'#a6b6ca',cw-36);
   label(c,card.city?card.city.name:'暂无匹配',cx+18,cy+48,featured?34:26,card.city?'#f0e3cc':'#8293ab',cw-36);
   if(card.city)label(c,card.city.country,cx+18,cy+(featured?89:80),13,'#8fa1b9',cw-36);
   const detail=card.city?(card.key==='overall'?card.score+' 条附近线路':card.score+' 分')+(card.tied>1?' · 同分首位':''):'本范围没有正分主题';
   label(c,detail,cx+18,cy+ch-33,16,'#b3c1d3',cw-36);
  });
  y+=662;
 }else{
  label(c,(target?target.city+' · 重定位':birth.city+' · 出生地'),40,y,22,'#dfc38f');y+=38;
  if(state.tab==='map'){
   const filterName=(BODIES.find(b=>b.key===state.planet)||{name:'全部天体'}).name+' · '+(state.angle==='all'?'全部轴线':state.angle);
   label(c,filterName,40,y,18,'#a6b6ca');y+=32;
   graphic(c,40,y,520,330,()=>drawMap(c,520,330,raw,{planet:state.planet,angle:state.angle},viewport,target||birth));y+=358;
  }else{
   if(current.houses)graphic(c,40,y,520,520,()=>drawWheel(c,520,520,current));
   else wrapped(c,current.houseError||'该地点宫制不可用',50,y+70,490,23,34);
   y+=548;
  }
  const sun=current.bodies.find(b=>b.key==='Sun'),moon=current.bodies.find(b=>b.key==='Moon');
  label(c,'太阳  '+sun.position,40,y,21);label(c,'月亮  '+moon.position,40,y+34,21);label(c,'上升  '+(current.axes[0]?current.axes[0].position:'该宫制不可用'),40,y+68,21);y+=118;
  if(state.tab==='chart'){current.bodies.filter(b=>!['Sun','Moon'].includes(b.key)).forEach((body,i)=>label(c,body.name+' '+body.position+(body.retrograde?' R':''),40+(i%2)*268,y+Math.floor(i/2)*30,15,'#a6b6ca',252));y+=174;}
 }
 if(state.analysis){
  box(c,40,y,520,150);label(c,state.analysis.name+' · '+state.analysis.label,58,y+17,23,'#e8cea0',484);
  label(c,state.analysis.nearbyCount+' 条附近线路 · '+state.analysis.score+' 分',58,y+54,18,'#a6b6ca',484);
  const reason=state.analysis.rows.slice(0,2).map(r=>r.planetName+' '+r.angle+' '+r.distanceText).join(' / ');
  wrapped(c,reason||'约 350 公里内没有匹配线路',58,y+87,484,16,23,2);y+=176;
 }
 wrapped(c,'推荐使用穹野坐标的独立主题规则；“最佳”表示当前候选中的主题匹配，供自我探索参考。',40,h-154,520,16,24,2);
 const source=birth.example&&birth.source?birth.source.summary+'；来源未提供秒位':'按所填出生资料计算';
 label(c,source,40,h-89,15,'#8e9eb5');
 label(c,'Swiss Ephemeris 2.10.03  ·  穹野坐标',40,h-52,15,'#bda879');
 return {width:WIDTH,height:h};
}
module.exports={WIDTH,posterHeight,drawPoster};
