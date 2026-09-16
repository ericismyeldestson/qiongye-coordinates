const {createRenderer,createMotion}=require('./renderer');
Component({
 data:{ready:false,failed:false},
 lifetimes:{
  attached(){this._alive=true;this._shown=true;this._visible=false;},
  ready(){
   this._observer=this.createIntersectionObserver({thresholds:[0,.01]});
   this._observer.relativeToViewport().observe('.globe',entry=>{if(!this._alive)return;this._visible=entry.intersectionRatio>0;this.syncMotion();});
   this.createSelectorQuery().select('.globe-canvas').fields({node:true,size:true}).exec(async result=>{
    if(!this._alive)return;const box=result&&result[0];
    try{
     if(!box||!box.node||!box.width||!box.height)throw Error('Canvas unavailable');
     const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();
     this._renderer=createRenderer(box.node,box.width,box.height,info.pixelRatio);
     if(!await this._renderer.ready||!this._alive)return;
     this._renderer.draw(0);this.setData({ready:true});
     this._motion=createMotion(box.node,time=>this._renderer.draw(time),()=>this.onCanvasError());this.syncMotion();
    }catch(e){if(this._alive)this.onCanvasError();}
   });
  },
  detached(){this._alive=false;this.release();}
 },
 pageLifetimes:{show(){this._shown=true;this.syncMotion();},hide(){this._shown=false;this.syncMotion();}},
 methods:{
  syncMotion(){if(this._motion)this._motion.setRunning(!!(this._alive&&this._shown&&this._visible));},
  release(){if(this._observer){this._observer.disconnect();this._observer=null;}if(this._motion){this._motion.dispose();this._motion=null;}if(this._renderer){this._renderer.dispose();this._renderer=null;}},
  onCanvasError(){this.release();if(this._alive)this.setData({failed:true,ready:false});}
 }
});
