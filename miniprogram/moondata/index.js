const {initialize,BODIES}=require('../core/engine');
const {decorate}=require('../core/chart');
const {drawMap,drawWheel}=require('../core/render');
const {search}=require('../core/locations');
const {createEvaluator,GOALS}=require('../core/recommendations');
const {decodeShare,encodeShare}=require('../core/share');
const {createExportMethods}=require('../core/export');
Page(Object.assign({},createExportMethods(wx),{
 data:{canRetry:false,apiCategory:'default',canShareFriend:true,canOpenSettings:true,canMenuShare:true,shareInvalid:false,loading:true,error:'',tab:'places',result:null,birth:null,planet:'all',angle:'all',planets:BODIES,angles:['all','ASC','DSC','MC','IC'],lineCount:48,relocationQuery:'',cityOptions:[],relocated:false,locationName:'',activeTable:'planets',lineDetail:'',expanded:false,placeScope:'all',recommendations:[],candidateCount:0,analysis:null,placeGoal:'overall',goals:GOALS,methodExpanded:false,exportOpen:false,exportBusy:false,shareBusy:false,posterPath:'',exportError:'',albumDenied:false,exportHeight:1180},
 onLoad(options={}){
  this.startCapabilities();this.syncShareMenu();
  try{
   if(options.s===undefined)throw Error('星图资料缺失，请重新填写，或让分享者重新发送');
   this.shared=decodeShare(options.s);this.birth=this.shared.birth;this.viewport=this.shared.viewport;
   this.setData(Object.assign({birth:this.birth,locationName:this.birth.city},this.shared.state));this.run();
  }catch(e){this.setData({loading:false,canRetry:false,error:e.message||'无法打开分享的星图'});}
 },
 onShow(){this.refreshCapabilities();},
 onUnload(){this.unloaded=true;this.exportGeneration=(this.exportGeneration||0)+1;this.activeExportAction=null;this.invalidateCanvas();this.stopCapabilities();},
 onReady(){this.pageReady=true;this.prepareCanvas();},
 async run(){
  if(this.unloaded)return;
  this.invalidateCanvas();this.setData({loading:true,error:'',canRetry:false});this.syncShareMenu();let phase='load';
  try{
   this.engine=await initialize();if(this.unloaded)return;phase='calculate';
   this.raw=this.engine.calculate(this.birth.utc,this.birth.latitude,this.birth.longitude,this.birth.system);this.current=decorate(this.raw);this.places=createEvaluator(this.raw.lines);
   const recommended=this.places.recommendations(this.data.placeScope);
   this.setData({result:this.current,loading:false,recommendations:recommended.cards,candidateCount:recommended.candidateCount},()=>{
    if(this.unloaded)return;
    const shared=this.shared;this.shared=null;
    const ready=()=>{if(this.unloaded)return;if(shared)this.viewport=shared.viewport;this.filterChanged();this.prepareCanvas();this.syncShareMenu();};
    if(shared&&shared.target)this.relocate(shared.target,ready);
    else if(shared&&shared.hasAnalysis)this.resetBirth(ready);
    else ready();
   });
  }catch(error){if(!this.unloaded){this.setData({loading:false,canRetry:phase==='load',error:error.message||error.errMsg||'星历加载失败，请重试'});this.syncShareMenu();}}
 },
 retry(){if(this.birth&&this.data.canRetry)this.run();else this.editBirth();},
 editBirth(){let query='';try{if(this.birth)query='?'+encodeShare(this.birth,this.data,this.target,this.viewport);}catch(e){}wx.reLaunch({url:'/pages/index/index'+query});},
 invalidateCanvas(){this.canvasGeneration=(this.canvasGeneration||0)+1;this.canvases=null;this.geometry=null;this.touch=null;},
 prepareCanvas(){
  this.invalidateCanvas();
  if(this.unloaded||!this.pageReady||this.data.loading||this.data.exportOpen||!this.current||this.data.tab==='places')return;
  const generation=this.canvasGeneration,tab=this.data.tab;
  wx.nextTick(()=>{
   if(this.unloaded||generation!==this.canvasGeneration||this.data.exportOpen)return;
   this.createSelectorQuery().selectAll('.astro-canvas').fields({node:true,size:true}).exec(res=>{
   if(this.unloaded||generation!==this.canvasGeneration||tab!==this.data.tab||this.data.exportOpen)return;
   const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),dpr=info.pixelRatio||1;
   this.canvases=((res&&res[0])||[]).filter(item=>item.node&&item.width>0&&item.height>0).map(item=>{
    const node=item.node,ctx=node.getContext('2d');node.width=Math.round(item.width*dpr);node.height=Math.round(item.height*dpr);ctx.scale(dpr,dpr);return {ctx,w:item.width,h:item.height};
   });this.draw();
   });
  });
 },
 draw(){if(!this.canvases)return;const c=this.canvases[0];if(!c)return;if(this.data.tab==='map'){const selected=this.target||{latitude:this.birth.latitude,longitude:this.birth.longitude,city:this.birth.city};this.geometry=drawMap(c.ctx,c.w,c.h,this.raw,{planet:this.data.planet,angle:this.data.angle},this.viewport,selected);}else drawWheel(c.ctx,c.w,c.h,this.current);},
 setTab(e){this.invalidateCanvas();this.setData({tab:e.currentTarget.dataset.tab},()=>this.prepareCanvas());},
 chooseScope(e){const scope=e.currentTarget.dataset.scope,r=this.places.recommendations(scope);this.setData({placeScope:r.scope,recommendations:r.cards,candidateCount:r.candidateCount});},
 chooseRecommendation(e){const card=this.data.recommendations[e.currentTarget.dataset.index];if(!card||!card.city)return;this.setData({placeGoal:card.key,relocationQuery:'',cityOptions:[],planet:'all',angle:'all',lineCount:48});this.relocate(Object.assign({},card.city,{city:card.city.name}),()=>wx.pageScrollTo({selector:'#city-analysis',duration:250}));},
 chooseGoal(e){const goal=e.currentTarget.dataset.goal,location=this.target||{city:this.birth.city,latitude:this.birth.latitude,longitude:this.birth.longitude};this.setData({placeGoal:goal,analysis:this.places.analyse(location,goal)});},
 toggleMethod(){this.setData({methodExpanded:!this.data.methodExpanded});},
 viewPlace(e){const tab=e.currentTarget.dataset.tab;this.invalidateCanvas();this.setData({tab},()=>{this.prepareCanvas();wx.pageScrollTo({scrollTop:0,duration:250});});},
 showPlaceLine(e){const row=this.data.analysis.rows[e.currentTarget.dataset.index];if(!row)return;this.invalidateCanvas();this.setData({tab:'map',planet:row.planet,angle:row.angle,lineCount:1},()=>{this.prepareCanvas();wx.pageScrollTo({scrollTop:0,duration:250});});},
 setTable(e){this.setData({activeTable:e.currentTarget.dataset.tab});},
 choosePlanet(e){this.setData({planet:e.currentTarget.dataset.key},()=>this.filterChanged());},
 chooseAngle(e){this.setData({angle:e.currentTarget.dataset.key},()=>this.filterChanged());},
 filterChanged(){const n=this.raw.lines.filter(l=>(this.data.planet==='all'||l.planet===this.data.planet)&&(this.data.angle==='all'||l.angle===this.data.angle)).length;this.setData({lineCount:n});this.draw();},
 zoom(e){this.viewport.zoom=Math.min(6,Math.max(1,this.viewport.zoom*Number(e.currentTarget.dataset.factor)));this.draw();},
 reset(){this.viewport={zoom:1,lat:0,lon:0};this.draw();},
 touchStart(e){if(!this.geometry)return;const t=e.touches[0];this.touch={x:t.x,y:t.y,lon:this.viewport.lon,lat:this.viewport.lat,moved:false};},
 touchMove(e){if(!this.touch||!this.geometry)return;const t=e.touches[0],dx=t.x-this.touch.x,dy=t.y-this.touch.y;if(Math.abs(dx)+Math.abs(dy)>6)this.touch.moved=true;this.viewport.lon=Math.max(-180,Math.min(180,this.touch.lon-dx/this.geometry.unit));this.viewport.lat=Math.max(-75,Math.min(75,this.touch.lat+dy/this.geometry.unit));this.draw();},
 touchEnd(){if(!this.touch||!this.geometry)return;if(!this.touch.moved){const c=this.canvases[0],lon=this.viewport.lon+(this.touch.x-c.w/2)/this.geometry.unit,lat=this.viewport.lat-(this.touch.y-c.h/2)/this.geometry.unit;if(Math.abs(lon)<=180&&Math.abs(lat)<85)this.relocate({latitude:lat,longitude:lon,city:'地图选点'});}this.touch=null;},
 onCity(e){this.setData({relocationQuery:e.detail.value,cityOptions:search(e.detail.value)});},
 selectCity(e){const c=this.data.cityOptions[e.currentTarget.dataset.index];this.setData({cityOptions:[],relocationQuery:c.name});this.relocate(Object.assign({},c,{city:c.name}));},
 relocate(target,after){this.target=target;this.viewport={zoom:2,lat:Math.max(-75,Math.min(75,target.latitude)),lon:target.longitude};const next=Object.assign({},this.raw,{latitude:target.latitude,longitude:target.longitude,houses:null,houseError:''});try{next.houses=this.engine.houses(this.raw.jd,target.latitude,target.longitude,this.birth.system);}catch(e){next.houseError=e.message;}this.current=decorate(next);this.invalidateCanvas();this.setData({result:this.current,relocated:true,locationName:target.city,coordinateText:target.latitude.toFixed(4)+'°, '+target.longitude.toFixed(4)+'°',analysis:this.places.analyse(target,this.data.placeGoal)},()=>{if(this.unloaded)return;this.prepareCanvas();if(typeof after==='function')after();});},
 resetBirth(after){this.target=null;this.viewport={zoom:1,lat:0,lon:0};this.current=decorate(this.raw);this.invalidateCanvas();this.setData({result:this.current,relocated:false,locationName:this.birth.city,relocationQuery:'',cityOptions:[],analysis:this.places.analyse({city:this.birth.city,latitude:this.birth.latitude,longitude:this.birth.longitude},this.data.placeGoal)},()=>{if(this.unloaded)return;this.prepareCanvas();if(typeof after==='function')after();});},
 toggleDetails(){this.setData({expanded:!this.data.expanded});},
 showLineHelp(){wx.showModal({title:'如何查看行星线',content:'每个天体有四条轴线：ASC 上升、DSC 下降、MC 中天、IC 天底。先选一个天体，再筛选轴线。地图支持拖动和缩放，轻点地点可计算同一出生时刻的重定位星盘。地图是全球概览，不用于精确导航。',showCancel:false});},
 exportResult(){if(!this.current)return;const document={format:'qiongye-coordinates-0.4',birth:this.birth,location:this.target||{city:this.birth.city,latitude:this.birth.latitude,longitude:this.birth.longitude},result:this.current,places:{method:require('../core/place-rules').METHOD,scope:this.data.placeScope,candidateCount:this.data.candidateCount,recommendations:this.data.recommendations,analysis:this.data.analysis}};wx.setClipboardData({data:JSON.stringify(document,null,2),success:()=>wx.showToast({title:'完整结果已复制',icon:'success'})});}
}));
