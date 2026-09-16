const cities=require('../data/cities');
function normalize(x){return String(x||'').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
const index=cities.map(r=>({id:r[0],name:r[1],english:r[2],country:r[3],latitude:r[4],longitude:r[5],timezone:r[6],search:normalize([r[1],r[2],...r[7]].join(' '))}));
function search(query){const q=normalize(query);if(!q)return [];return index.filter(c=>c.search.includes(q)).sort((a,b)=>(normalize(b.name)===q?1:0)-(normalize(a.name)===q?1:0)).slice(0,12);}
const EXAMPLES=[
  {label:'上海示例',city:'上海',latitude:31.2304,longitude:121.4737,timezone:'Asia/Shanghai',date:'2000-01-01',time:'20:00',second:'00',name:'上海公开测试资料'},
  {label:'李小龙',city:'旧金山',latitude:37+47/60,longitude:-(122+25/60),timezone:'America/Los_Angeles',date:'1940-11-27',time:'07:12',second:'00',name:'李小龙 · 公开出生资料',source:{title:'Astro-Databank · 李小龙',url:'https://www.astro.com/astro-databank/Lee,_Bruce',rating:'AA',summary:'出生证明来源记录 · AA',note:'1940-11-27 07:12，旧金山，美国。Astro-Databank 记为出生证明在档（AA）；来源说明列出 Robert Paige 的出生证明引用及 Sy Scholfield 找到的出生证明。坐标沿用该排盘记录：37°47′N，122°25′W。来源未提供秒，计算使用 00 秒。',checked:'2026-09-15'}},
  {label:'姚明',city:'上海',latitude:31+13/60+20/3600,longitude:121+27/60+29/3600,timezone:'Asia/Shanghai',date:'1980-09-12',time:'19:00',second:'00',name:'姚明 · 公开出生资料',source:{title:'Astro-Databank · 姚明',url:'https://www.astro.com/astro-databank/Ming,_Yao',rating:'B',summary:'传记来源记录 · B',note:'1980-09-12 19:00，上海，中国。Astro-Databank 评级 B（传记资料），Sy Scholfield 引用 Brook Larmer 的《Operation Yao Ming》（Penguin，2005）。这是有出处的传记时间，可靠程度不等同于出生证明。坐标沿用该排盘记录：31°13′20″N，121°27′29″E。来源未提供秒，计算使用 00 秒。',checked:'2026-09-15'}}
];
module.exports={search,EXAMPLES,count:cities.length};
