const {geometry,camera}=require('./scene');
const {makeTexture}=require('./texture');
const VERTEX=`
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aUV; attribute vec3 aColor;
uniform mat3 uView; uniform float uDpr;
varying vec3 vNormal; varying vec2 vUV; varying vec3 vColor;
void main(){
 vec3 p=uView*aPosition; vNormal=uView*aNormal; vUV=aUV; vColor=aColor;
 gl_Position=vec4(p.xy/1.68,-p.z/4.0,1.0); gl_PointSize=2.4*uDpr;
}`;
const EARTH=`
precision mediump float;
uniform sampler2D uNight;
varying vec3 vNormal; varying vec2 vUV;
void main(){
 vec3 n=normalize(vNormal); vec3 night=texture2D(uNight,vUV).rgb;
 float light=.85+.4*max(0.0,dot(n,normalize(vec3(-.7,.5,1.0))));
 vec3 base=night*light*1.45;
 float rim=pow(1.0-max(0.0,n.z),4.0);
 gl_FragColor=vec4(base+vec3(.55,.39,.12)*rim*.38,1.0);
}`;
const ARC=`precision mediump float; varying vec3 vColor; void main(){gl_FragColor=vec4(vColor,.9);}`;
const POINT=`precision mediump float; varying vec3 vColor; void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vColor,1.0-smoothstep(.25,.5,r));}`;
const HALO_VERTEX=`attribute vec3 aPosition; varying vec2 vPoint; void main(){vPoint=aPosition.xy*1.68;gl_Position=vec4(aPosition.xy,.99,1.0);}`;
const HALO=`precision mediump float; varying vec2 vPoint; void main(){float r=length(vPoint);float a=exp(-max(0.0,r-1.0)*19.0)*.3*(1.0-smoothstep(1.0,1.25,r));if(r<1.0)a=0.0;gl_FragColor=vec4(.831,.706,.416,a);}`;

function createRenderer(canvas,width,height,dpr=1){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
 if(!gl)throw Error('WebGL unavailable');
 const programs=[],buffers=[],textures=[],images=[];let disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;for(const image of images){image.onload=null;image.onerror=null;}for(const p of programs)gl.deleteProgram(p);for(const b of buffers)gl.deleteBuffer(b);for(const t of textures)gl.deleteTexture(t);};
 function program(vertex,fragment){
  const shaders=[];
  try{
   for(const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(kind);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));}
   const p=gl.createProgram();programs.push(p);for(const s of shaders)gl.attachShader(p,s);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }finally{for(const s of shaders)gl.deleteShader(s);}
 }
 function buffer(data){const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer:b,count:data.length/11};}
 function createTexture(){
  const atlas=makeTexture(),t=gl.createTexture();textures.push(t);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,atlas.width,atlas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,atlas.data);
 }

 try{
  dpr=Math.max(1,Math.min(2,dpr));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);
  const earth=program(VERTEX,EARTH),arc=program(VERTEX,ARC),point=program(VERTEX,POINT),halo=program(HALO_VERTEX,HALO);
  const mesh=geometry(),sphere=buffer(mesh.sphere),routes=buffer(mesh.arcs),cities=buffer(mesh.points);
  const quad=buffer(new Float32Array([-1,-1,0,0,0,0,0,0,0,0,0,1,-1,0,0,0,0,0,0,0,0,0,-1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0]));
  gl.useProgram(earth);gl.uniform1i(gl.getUniformLocation(earth,'uNight'),0);
  // Cache locations outside the animation loop.
  const locations=new Map(programs.map(p=>[p,{view:gl.getUniformLocation(p,'uView'),dpr:gl.getUniformLocation(p,'uDpr'),attributes:[['aPosition',3,0],['aNormal',3,12],['aUV',2,24],['aColor',3,32]].map(([name,size,offset])=>[gl.getAttribLocation(p,name),size,offset])}]));
  function drawMesh(p,mesh,mode,view){
   gl.useProgram(p);const l=locations.get(p);if(l.view!==null)gl.uniformMatrix3fv(l.view,false,view);if(l.dpr!==null)gl.uniform1f(l.dpr,dpr);
   gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
   for(let i=0;i<4;i++)gl.disableVertexAttribArray(i);
   for(const [at,size,offset] of l.attributes)if(at>=0){gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,44,offset);}
   gl.drawArrays(mode,0,mesh.count);
  }
  createTexture();const ready=Promise.resolve(true);
  return {ready,dispose,draw(elapsed=0){
   if(disposed)return;const view=camera(elapsed);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);drawMesh(halo,quad,gl.TRIANGLE_STRIP,view);
   gl.enable(gl.DEPTH_TEST);gl.depthMask(true);drawMesh(earth,sphere,gl.TRIANGLES,view);drawMesh(arc,routes,gl.TRIANGLES,view);drawMesh(point,cities,gl.POINTS,view);
  }};
 }catch(e){dispose();throw e;}
}

// No setData or geometry/texture uploads per frame. Pause preserves rotation phase.
function createMotion(canvas,draw,onError=()=>{}){
 let running=false,disposed=false,frame=null,previous=null,lastDraw=-Infinity,elapsed=0;
 const tick=time=>{
  frame=null;if(!running||disposed)return;
  const now=Number.isFinite(time)?time:Date.now();
  if(previous!==null)elapsed+=Math.min(250,Math.max(0,now-previous));previous=now;
  if(now-lastDraw>=1000/30-.5){try{draw(elapsed);lastDraw=now;}catch(e){running=false;onError(e);return;}}
  if(running&&!disposed)frame=canvas.requestAnimationFrame(tick);
 };
 function setRunning(value){
  if(disposed||running===value)return;running=value;previous=null;lastDraw=-Infinity;
  if(frame!==null){canvas.cancelAnimationFrame(frame);frame=null;}
  if(running)frame=canvas.requestAnimationFrame(tick);
 }
 return {setRunning,dispose(){setRunning(false);disposed=true;}};
}
module.exports={createRenderer,createMotion};
