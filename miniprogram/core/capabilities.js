const CATEGORIES=['default','nativeFunctionalized','browseOnly','embedded','chatTool'];
function capabilities(wx,category,fallback='default'){
 if(!CATEGORIES.includes(category)){
  const readers=[()=>wx.getApiCategory&&wx.getApiCategory(),()=>wx.getEnterOptionsSync&&wx.getEnterOptionsSync().apiCategory,()=>wx.getLaunchOptionsSync&&wx.getLaunchOptionsSync().apiCategory];
  for(const read of readers){try{const value=read();if(CATEGORIES.includes(value)){category=value;break;}}catch(e){}}
 }
 if(!CATEGORIES.includes(category))category=fallback;
 return {apiCategory:category,canShareFriend:category==='default',canOpenSettings:category!=='browseOnly',canMenuShare:category!=='chatTool'};
}
module.exports={capabilities};
