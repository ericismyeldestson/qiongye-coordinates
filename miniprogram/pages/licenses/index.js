const notices=require('../../data/licenses');
Page({data:{...notices,expanded:''},toggle(e){const id=e.currentTarget.dataset.id;this.setData({expanded:this.data.expanded===id?'':id});},copySource(){if(!this.data.sourceURL){wx.showToast({title:'当前开发版本尚未发布源码链接',icon:'none'});return;}wx.setClipboardData({data:this.data.sourceURL});}});
