// SPDX-License-Identifier: AGPL-3.0-only
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module'),root=path.resolve(__dirname,'../miniprogram');
function runtime(instantiate){
 // No browser WebAssembly/fetch/document/TextDecoder: use the exact WeChat entry path.
 const module={exports:{}},context=vm.createContext({console,module,exports:module.exports});
 vm.runInContext(fs.readFileSync(path.join(root,'vendor/qy-swisseph.js'),'utf8'),context);
 const factory=context.module.exports,calls=[];
 context.module={exports:{}};
 context.WXWebAssembly={instantiate:(file,imports)=>{calls.push(file);return instantiate(file,imports);}};
 context.wx={getFileSystemManager:()=>({readFileSync:file=>fs.readFileSync(path.join(root,file))})};
 const localRequire=createRequire(path.join(root,'core/engine.js'));
 context.require=name=>name==='../vendor/qy-swisseph'?factory:localRequire(name);
 vm.runInContext(fs.readFileSync(path.join(root,'core/engine.js'),'utf8'),context);
 return {engine:context.module.exports,calls};
}
const actualInstantiate=(file,imports)=>WebAssembly.instantiate(fs.readFileSync(path.join(root,file)),imports);
test('official build initializes through WeChat adapter without browser globals',{timeout:5000},async()=>{
 const r=runtime(actualInstantiate),a=await r.engine.initialize(),b=await r.engine.initialize();
 assert.equal(a,b);assert.equal(r.calls.length,1);assert.equal(r.calls[0],'vendor/qy-swisseph.wasm');
 const chart=a.calculate('2000-01-01T12:00:00.000Z',31.23,121.47);
 assert.equal(chart.bodies.length,12);assert.equal(chart.lines.length,48);assert.equal(chart.houses.cusps.length,12);
 assert(Math.abs(chart.bodies[0].longitude-280.3689186699)<1e-7);
});
test('asynchronous WASM failure rejects and permits retry',{timeout:5000},async()=>{
 let fail=true;const r=runtime((file,imports)=>fail?Promise.reject(Error('load failed')):actualInstantiate(file,imports));
 await assert.rejects(r.engine.initialize(),/load failed/);fail=false;
 const engine=await r.engine.initialize();assert.match(engine.version,/2\.10\.03/);assert.equal(r.calls.length,2);
});
