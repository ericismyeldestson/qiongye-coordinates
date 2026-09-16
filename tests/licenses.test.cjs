// SPDX-License-Identifier: AGPL-3.0-only
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {audit}=require('../scripts/audit-licenses.cjs'),root=path.resolve(__dirname,'..');
function copy(t){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qiongye-audit-test-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 for(const item of ['miniprogram','third_party','native','runtime-provenance.json','source-release.json','package.json','license-notices.json','vendor-manifest.json','recommendations-manifest.json','LICENSE'])fs.cpSync(path.join(root,item),path.join(temp,item),{recursive:true});return temp;}
test('all runtime resources have a recorded origin and intact license/build inputs',()=>{assert(audit(root).runtimeFiles>50);});
test('unknown resource cannot enter a runtime package silently',t=>{const dir=copy(t);fs.writeFileSync(path.join(dir,'miniprogram/unreviewed.png'),'unknown');assert.throws(()=>audit(dir),/inventory mismatch/);});
test('replaced WASM fails both sealed inventory and upstream build verification',t=>{const dir=copy(t);fs.appendFileSync(path.join(dir,'miniprogram/vendor/qy-swisseph.wasm'),'tamper');assert.throws(()=>audit(dir),/Runtime content changed/);assert.throws(()=>audit(dir,{seal:true}),/Swiss build output changed/);});
test('missing license fails inspection instead of quietly producing a package',t=>{const dir=copy(t);fs.unlinkSync(path.join(dir,'miniprogram/licenses/CC-BY-4.0.txt'));assert.throws(()=>audit(dir),/inventory mismatch/);});
test('release requires the published corresponding source, not merely a local backup',t=>{const dir=copy(t),file=path.join(dir,'source-release.json');const data=JSON.parse(fs.readFileSync(file));data.sourcePublished=false;fs.writeFileSync(file,JSON.stringify(data));assert.throws(()=>audit(dir,{release:true}),/source has not been published/);});
