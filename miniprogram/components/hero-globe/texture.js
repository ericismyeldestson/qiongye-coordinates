// Render a new atlas from public-domain Natural Earth land and GeoNames cities.
// The lights are decorative marks, not satellite imagery or measured brightness.
const land=require('../../data/world'),cities=require('../../data/cities');
function makeTexture(width=512,height=256){
 const data=new Uint8Array(width*height*4),mask=new Uint8Array(width*height);
 for(const ring of land){
  const xy=ring.map(p=>[(p[0]+180)/360*width,(90-p[1])/180*height]);
  const min=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[1]))));
  const max=Math.min(height-1,Math.ceil(Math.max(...xy.map(p=>p[1]))));
  for(let y=min;y<=max;y++){
   const line=y+.5,crossings=[];
   for(let i=0,j=xy.length-1;i<xy.length;j=i++){
    const a=xy[j],b=xy[i];if((a[1]>line)===(b[1]>line))continue;
    crossings.push(a[0]+(line-a[1])*(b[0]-a[0])/(b[1]-a[1]));
   }
   crossings.sort((a,b)=>a-b);
   for(let i=0;i+1<crossings.length;i+=2)for(let x=Math.max(0,Math.ceil(crossings[i]-.5));x<Math.min(width,crossings[i+1]-.5);x++)mask[y*width+x]=1;
  }
 }
 for(let i=0;i<mask.length;i++){data[i*4]=mask[i]?13:5;data[i*4+1]=mask[i]?28:13;data[i*4+2]=mask[i]?44:26;data[i*4+3]=255;}
 for(const c of cities){
  const x=Math.floor((c[5]+180)/360*width),y=Math.floor((90-c[4])/180*height);
  if(x<0||x>=width||y<0||y>=height)continue;
  const i=(y*width+x)*4;data[i]=178;data[i+1]=151;data[i+2]=98;
 }
 return {width,height,data};
}
module.exports={makeTexture};
