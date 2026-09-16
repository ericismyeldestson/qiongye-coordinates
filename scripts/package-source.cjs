// SPDX-License-Identifier: AGPL-3.0-only
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {audit,walk,sha}=require('./audit-licenses.cjs');
const root=path.resolve(__dirname,'..'),version=require('../package.json').version;
// Explicit allowlist excludes account material, local settings, backups and experiments.
const included=['.gitignore','LICENSE','README.md','THIRD-PARTY-NOTICES.md','package.json','project.config.json','source-release.json','license-notices.json','runtime-provenance.json','vendor-manifest.json','recommendations-manifest.json','locations-manifest.json','miniprogram','native','scripts','tests','third_party'];
audit(root,{release:process.argv.includes('--release')});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qiongye-source-')),name='qiongye-coordinates-'+version;
try{
 const staging=path.join(temp,name);fs.mkdirSync(staging);
 for(const entry of included){const from=path.join(root,entry);if(fs.statSync(from).isDirectory())walk(from);fs.cpSync(from,path.join(staging,entry),{recursive:true});}
 const entries=walk(staging).map(file=>({file,sha256:sha(fs.readFileSync(path.join(staging,file)))}));
 fs.writeFileSync(path.join(staging,'SOURCE-FILES.json'),JSON.stringify({version,files:entries},null,2)+'\n');
 const outdir=path.join(root,'release/source');fs.mkdirSync(outdir,{recursive:true});
 const archive=path.join(outdir,name+'-source.tar.gz');
 cp.execFileSync('tar',['-czf',archive,'-C',temp,name],{env:{...process.env,COPYFILE_DISABLE:'1'}});
 const report={version,archive,files:entries.length,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive)),sourcePublished:require('../source-release.json').sourcePublished};
 fs.writeFileSync(archive+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
