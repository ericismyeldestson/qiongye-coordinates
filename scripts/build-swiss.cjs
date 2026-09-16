// Rebuild our WASM from the pinned official AGPL source. Never imports website code.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=path.join(root,'third_party/swisseph');
const meta=JSON.parse(fs.readFileSync(path.join(source,'provenance.json')));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
for(const item of meta.files){if(sha(fs.readFileSync(path.join(source,item.path)))!==item.sha256)throw Error('Upstream input changed: '+item.path);}
const compiler=process.env.QIONGYE_EMCC||'emcc';
const version=cp.execFileSync(compiler,['--version'],{encoding:'utf8'}).split('\n')[0];
if(!/4\.0\.15/.test(version))throw Error('Reproducible build requires Emscripten 4.0.15; got '+version);
const files=['swedate.c','swehouse.c','swejpl.c','swemmoon.c','swemplan.c','sweph.c','swephlib.c'];
const out='miniprogram/vendor/qy-swisseph.js';
const exportedSymbols=['_malloc','_free','_swe_version_wrap','_swe_set_ephe_path_wrap','_swe_calc_ut_wrap','_swe_houses_wrap','_qy_sidereal','_qy_obliquity'];
const args=[...files.map(f=>'third_party/swisseph/'+f),'native/swiss-wrapper.c','-Ithird_party/swisseph','-O2','--no-entry','-sMODULARIZE=1','-sEXPORT_NAME=QiongyeSwiss','-sENVIRONMENT=web,worker','-sALLOW_MEMORY_GROWTH=1','-sFILESYSTEM=1','-sFORCE_FILESYSTEM=1','-sASSERTIONS=0','-sEXPORTED_FUNCTIONS='+JSON.stringify(exportedSymbols),'-sEXPORTED_RUNTIME_METHODS='+JSON.stringify(['ccall','getValue','UTF8ToString','FS']),'-sINCOMING_MODULE_JS_API='+JSON.stringify(['instantiateWasm','locateFile','print','printErr']),'-o',out];
cp.execFileSync(compiler,args,{cwd:root,stdio:'inherit'});
const outputs=[out,'miniprogram/vendor/qy-swisseph.wasm'];
for(const name of ['sepl_18','semo_18','seas_18']){
 const dest='miniprogram/moondata/'+name+'.bin';fs.copyFileSync(path.join(source,'ephe',name+'.se1'),path.join(root,dest));outputs.push(dest);
}
const manifest={upstream:meta.upstream,revision:meta.revision,licenseSelection:meta.licenseSelection,compiler:version,command:['emcc',...args],adapter:'native/swiss-wrapper.c',adapterSha256:sha(fs.readFileSync(path.join(root,'native/swiss-wrapper.c'))),outputs:outputs.map(file=>({file,bytes:fs.statSync(path.join(root,file)).size,sha256:sha(fs.readFileSync(path.join(root,file)))}))};
fs.writeFileSync(path.join(root,'vendor-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
