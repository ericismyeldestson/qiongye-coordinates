const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../miniprogram');
async function createTestEngine(){
 const wasm=fs.readFileSync(path.join(root,'vendor/qy-swisseph.wasm'));
 const module=await require('../../miniprogram/vendor/qy-swisseph')({instantiateWasm(imports,receive){WebAssembly.instantiate(wasm,imports).then(result=>receive(result.instance,result.module));return {};}});
 const engine=require('../../miniprogram/core/engine').createEngine(module);
 for(const name of ['sepl_18','semo_18','seas_18'])engine.addFile(name+'.se1',fs.readFileSync(path.join(root,'moondata',name+'.bin')));
 engine.ready();return engine;
}
module.exports={createTestEngine};
