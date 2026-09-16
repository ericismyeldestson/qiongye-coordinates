const {shareContent,resultTitle,supportsImageTimeline}=require('./share');
const {WIDTH,posterHeight,drawPoster}=require('./poster');
const {capabilities}=require('./capabilities');
function createExportMethods(wx){
 const call=(name,options,context)=>new Promise((resolve,reject)=>{if(typeof wx[name]!=='function'){reject(Error('当前微信暂不支持此操作'));return;}wx[name](Object.assign({},options,{success:resolve,fail:reject}),context);});
 return {
  refreshCapabilities(category){
   if(this.unloaded)return this.data;
   const next=capabilities(wx,category,this.data.apiCategory||'default');
   if(Object.keys(next).some(key=>this.data[key]!==next[key])){this.setData(next);this.syncShareMenu();}
   return next;
  },
  startCapabilities(){
   this.refreshCapabilities();
   if(wx.onApiCategoryChange&&wx.offApiCategoryChange){this.apiCategoryListener=e=>this.refreshCapabilities(e.apiCategory);wx.onApiCategoryChange(this.apiCategoryListener);}
  },
  stopCapabilities(){if(this.apiCategoryListener&&wx.offApiCategoryChange)wx.offApiCategoryChange(this.apiCategoryListener);this.apiCategoryListener=null;},
  syncShareMenu(){
   if(this.unloaded)return;
   const menus=['shareAppMessage','shareTimeline'];
   if(this.current&&!this.data.loading&&!this.data.error&&!this.data.shareInvalid&&this.data.canMenuShare!==false){if(wx.showShareMenu)wx.showShareMenu({menus});}
   else if(wx.hideShareMenu)wx.hideShareMenu({menus});
  },
  capabilityHelp(){wx.showModal({title:'打开完整小程序后继续',content:'当前微信页面暂不支持此操作。请通过微信提供的入口打开完整小程序，再继续分享或调整权限。当前星图资料会保留。',showCancel:false});},
  snapshotResult(){return JSON.parse(JSON.stringify({birth:this.birth,raw:this.raw,current:this.current,state:{tab:this.data.tab,placeScope:this.data.placeScope,placeGoal:this.data.placeGoal,planet:this.data.planet,angle:this.data.angle,recommendations:this.data.recommendations,candidateCount:this.data.candidateCount,analysis:this.data.analysis},target:this.target||null,viewport:this.viewport}));},
  currentShare(){const s=this.data.exportOpen&&this.exportSnapshot?this.exportSnapshot:{birth:this.birth,state:this.data,target:this.target,viewport:this.viewport};return shareContent(s.birth,s.state,s.target,s.viewport);},
  shareFailure(error){if(!this.unloaded){this.setData({shareInvalid:true,exportError:error.message||'分享资料有误，请返回修改出生资料。'});this.syncShareMenu();}},
  onShareAppMessage(){
   if(this.current&&!this.data.error){try{const info=this.currentShare(),cover=this.exportImages&&this.exportImages.query===info.query?this.exportImages.friend:null;return Object.assign({title:info.title,path:info.path},cover?{imageUrl:cover}:{});}catch(e){this.shareFailure(e);}}
   return {title:'穹野坐标 · 填写出生资料',path:'/pages/index/index'};
  },
  onShareTimeline(){
   if(this.current&&!this.data.error){try{const info=this.currentShare(),cover=this.exportImages&&this.exportImages.query===info.query?this.exportImages.timeline:null;return Object.assign({title:info.title,query:info.query},cover?{imageUrl:cover}:{});}catch(e){this.shareFailure(e);}}
   return {title:'穹野坐标 · 星图资料暂不可用',query:'invalid=1'};
  },
  async openExport(){
   if(!this.current||this.data.loading||this.data.error||this.data.exportBusy)return;
   this.refreshCapabilities();
   const generation=this.exportGeneration=(this.exportGeneration||0)+1;
   this.activeExportAction=null;this.exportImages=null;
   if(this.invalidateCanvas)this.invalidateCanvas();
   this.setData({exportOpen:true,exportBusy:true,shareBusy:false,shareInvalid:false,exportError:'',posterPath:'',albumDenied:false,exportLabel:resultTitle(this.data,!!this.target)});
   try{
    this.exportSnapshot=this.snapshotResult();
    const info=this.currentShare(),height=posterHeight(this.exportSnapshot);
    this.setData({exportHeight:height});
    const canvas=await new Promise((resolve,reject)=>wx.nextTick(()=>this.createSelectorQuery().select('#export-canvas').fields({node:true}).exec(res=>res&&res[0]&&res[0].node?resolve(res[0].node):reject(Error('图片画布尚未准备好，请重试')))));
    if(this.unloaded||generation!==this.exportGeneration)return;
    canvas.width=WIDTH*2;canvas.height=height*2;const ctx=canvas.getContext('2d');ctx.scale(2,2);drawPoster(ctx,this.exportSnapshot);
    const render=(height,destWidth,destHeight)=>call('canvasToTempFilePath',{canvas,x:0,y:0,width:WIDTH*2,height:height*2,destWidth,destHeight,fileType:'png'},this);
    const poster=await render(height,WIDTH*2,height*2);
    if(this.unloaded||generation!==this.exportGeneration)return;
    this.setData({posterPath:poster.tempFilePath});
    // Covers are optional; a closed panel never starts another crop.
    try{
     const friend=await render(480,600,480);
     if(this.unloaded||generation!==this.exportGeneration)return;
     const timeline=await render(600,600,600);
     if(!this.unloaded&&generation===this.exportGeneration)this.exportImages={query:info.query,friend:friend.tempFilePath,timeline:timeline.tempFilePath};
    }catch(e){if(!this.unloaded&&generation===this.exportGeneration)this.exportImages=null;}
   }catch(e){if(!this.unloaded&&generation===this.exportGeneration)this.setData({exportError:e.message||e.errMsg||'图片生成失败，请重试'});}
   finally{if(!this.unloaded&&generation===this.exportGeneration)this.setData({exportBusy:false});}
  },
  closeExport(){this.exportGeneration=(this.exportGeneration||0)+1;this.activeExportAction=null;this.setData({exportOpen:false,exportBusy:false,shareBusy:false},()=>this.prepareCanvas());},
  holdExport(){},
  previewPoster(){if(this.data.posterPath)wx.previewImage({urls:[this.data.posterPath],current:this.data.posterPath});},
  beginExportAction(){
   if(this.unloaded||this.data.shareBusy||this.data.exportBusy)return null;
   const token={generation:this.exportGeneration||0};this.activeExportAction=token;
   this.setData({shareBusy:true,exportError:''});return token;
  },
  isCurrentExportAction(token){return !this.unloaded&&this.activeExportAction===token&&token.generation===(this.exportGeneration||0);},
  finishExportAction(token){if(this.isCurrentExportAction(token)){this.activeExportAction=null;this.setData({shareBusy:false});}},
  async savePoster(){
   if(!this.data.posterPath)return;
   const token=this.beginExportAction();if(!token)return;
   const filePath=this.data.posterPath;this.setData({albumDenied:false});
   try{await call('saveImageToPhotosAlbum',{filePath});if(this.isCurrentExportAction(token))wx.showToast({title:'已保存到相册',icon:'success'});}
   catch(e){const message=e.errMsg||e.message||'';if(!/cancel/i.test(message)&&this.isCurrentExportAction(token)){const denied=/auth|denied|permission/i.test(message);this.setData({albumDenied:denied,exportError:denied?'相册权限未开启。请允许微信和小程序保存图片，或点图片预览后保存。':'未能保存图片，请重试，或点图片预览后保存。'});}}
   finally{this.finishExportAction(token);}
  },
  async openAlbumSettings(){
   if(!this.refreshCapabilities().canOpenSettings){this.capabilityHelp();return;}
   const token=this.beginExportAction();if(!token)return;
   try{const setting=await call('openSetting',{});if(this.isCurrentExportAction(token)){const allowed=!!(setting.authSetting&&setting.authSetting['scope.writePhotosAlbum']);this.setData({albumDenied:!allowed,exportError:allowed?'小程序相册权限已开启，请再次保存；也请确认系统允许微信访问相册。':'相册权限仍未开启，可点图片预览。'});}}
   catch(e){if(this.isCurrentExportAction(token)&&!/cancel/i.test(e.errMsg||e.message||''))this.setData({exportError:'未能打开设置，可点图片预览后保存。'});}
   finally{this.finishExportAction(token);}
  },
  async shareTimelineImage(){
   if(!this.data.posterPath)return;
   const token=this.beginExportAction();if(!token)return;
   try{
    const info=wx.getAppBaseInfo?wx.getAppBaseInfo():wx.getSystemInfoSync();
    if(!wx.showShareImageMenu||!supportsImageTimeline(info.SDKVersion)){this.timelineHelp();return;}
    const path=this.data.posterPath,entrancePath=this.currentShare().path;
    await call('showShareImageMenu',{path,needShowEntrance:true,entrancePath});
   }catch(e){if(this.isCurrentExportAction(token)&&!/cancel/i.test(e.errMsg||e.message||''))this.timelineHelp();}
   finally{this.finishExportAction(token);}
  },
  timelineHelp(){wx.showModal({title:'分享到朋友圈',content:'可点击右上角“···”，使用微信提供的分享入口。也可以保存这张结果图，再到朋友圈选择图片发布。',showCancel:false});}
 };
}
module.exports={createExportMethods};
