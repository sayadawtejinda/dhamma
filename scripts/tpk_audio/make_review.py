import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
plan = json.load(open(os.path.join(HERE, 'digha_plan.json'), encoding='utf8'))
html = '''<!doctype html><html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digha audio check</title>
<style>:root{--bg:#faf6ef;--c:#fff;--t:#2a2118;--m:#7a6a58;--a:#7b3fb8;--l:#e3d8c8}@media(prefers-color-scheme:dark){:root{--bg:#1b1713;--c:#26201a;--t:#f0e6d6;--m:#a89a86;--l:#3a3128}}
body{margin:0;background:var(--bg);color:var(--t);font:16px/1.7 "Pyidaungsu","Noto Sans Myanmar",system-ui,sans-serif}
#wrap{display:grid;grid-template-columns:260px 1fr;min-height:100vh}@media(max-width:800px){#wrap{grid-template-columns:1fr}}
#side{border-right:1px solid var(--l);padding:10px;overflow:auto;max-height:100vh;position:sticky;top:0}
#side button{display:block;width:100%;text-align:left;background:var(--c);border:1px solid var(--l);border-radius:8px;margin:3px 0;padding:6px 8px;color:var(--t);cursor:pointer;font:inherit;font-size:.85rem}
#side button.on{border-color:var(--a);background:#7b3fb81a}#side button.done{border-left:4px solid #2e9e5b}
#main{padding:14px;max-width:900px}#pl{position:sticky;top:0;z-index:5;background:var(--bg);padding:4px 0}audio{width:100%}#sk{display:flex;gap:6px;align-items:center;justify-content:center;margin-top:4px}#sk button{padding:4px 10px;border-radius:8px;border:1px solid var(--a);background:none;color:var(--a);cursor:pointer;font:inherit}#ct{min-width:70px;text-align:center;font-variant-numeric:tabular-nums}
.row{display:flex;gap:8px;align-items:flex-start;padding:7px 8px;border-bottom:1px solid var(--l);background:var(--c);cursor:pointer}.row:hover{background:#7b3fb812}
.row .tm{flex:none;width:64px;font-variant-numeric:tabular-nums;color:var(--a);font-weight:600}.row.set .tm{color:#2e9e5b}.row .pn{flex:none;width:40px;color:var(--m)}
.row .tx{flex:1;font-size:.9rem;color:var(--m)}.row button{flex:none;border:1px solid var(--a);color:var(--a);background:none;border-radius:6px;padding:2px 8px;cursor:pointer}
.fine{flex:none;display:flex;gap:2px}.row .fine button{padding:2px 6px;font-size:.8rem}.sh{margin:14px 0 4px;font-weight:700;color:var(--a)}.warn{background:#ffe9b3;color:#5a3d00;padding:4px 8px;border-radius:6px;font-size:.85rem;display:inline-block}
.hint{color:var(--m);font-size:.85rem}.top{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.top button{padding:6px 12px;border-radius:8px;border:1px solid var(--a);background:var(--a);color:#fff;cursor:pointer;font:inherit}</style></head><body>
<div id="wrap"><div id="side"></div><div id="main"><h2>ဒီဃနိကာယ် အသံ စစ်ရန်</h2>
<div class="hint">ဖိုင်ကိုရွေး → အတန်းကို နှိပ်ရင် ခန့်မှန်းချိန်ကနေ ဖွင့်မည်။ နားထောင်ကြည့်ပြီး ပိုဒ်အစ အတိအကျကို ရောက်တဲ့အချိန် <b>📍 ဒီမှာစ</b> ကို နှိပ်ပါ (အစိမ်းရောင်ဖြစ်မည်)။ ပြီးရင် <b>⬇ ပြင်ချက်များ သိမ်း</b> ကို နှိပ်ပြီး ဖိုင်ကို ကျွန်တော့်ကို ပေးပါ။ ဒီ browser မှာ အလိုအလျောက် မှတ်ထားသည်။</div>
<div class="top"><button id="exp">⬇ ပြင်ချက်များ သိမ်း</button><span id="cnt" class="hint"></span></div>
<div id="warn"></div><div id="pl"><audio id="au" controls preload="metadata"></audio><div id="sk"><button data-s="-30">⏪ 30</button><button data-s="-10">⏪ 10</button><button data-s="-5">⏪ 5</button><span id="ct" class="hint"></span><button data-s="5">5 ⏩</button><button data-s="10">10 ⏩</button><button data-s="30">30 ⏩</button></div></div><div id="rows"></div></div></div>
<script>
const P=__PLAN__;const BASE='file:///C:/Users/sayad/Downloads/UIdarcakka/DIGHANIKAYA/';
const SN={};P.suttas.forEach(s=>SN[s.no]=s);let OV={};try{OV=JSON.parse(localStorage.getItem('dnov2')||'{}')}catch(e){}
// old marks "file|s|p" -> new "s|p" (seconds from the start of file A (1))
try{const o=JSON.parse(localStorage.getItem('dnov')||'{}');for(const k in o){const [f,s,p]=k.split('|');if(OV[s+'|'+p]===undefined)OV[s+'|'+p]=P.starts[+f-1]+o[k]}}catch(e){}
const mm=t=>{t=Math.round(t);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
// paragraph start times: inside a group of suttas the start of the group and its end are known; every marked paragraph is an extra fixed point; between fixed points time runs with the number of characters
let TM={};function calc(){TM={};P.groups.forEach(g=>{const t0=P.starts[g.fa],t1=P.starts[g.fb];let cum=0,tot=g.paras.reduce((a,x)=>a+x[2],0)||1;
  const pts=[{c:0,t:t0}];g.paras.forEach(x=>{const k=x[0]+'|'+x[1];if(OV[k]!==undefined&&cum>0&&OV[k]>=t0&&OV[k]<t1){const q=pts[pts.length-1];if(OV[k]>q.t&&cum>q.c)pts.push({c:cum,t:OV[k]})}cum+=x[2]});pts.push({c:tot,t:t1});
  cum=0;let j=0;g.paras.forEach(x=>{const k=x[0]+'|'+x[1];if(OV[k]!==undefined&&cum===0)pts[0].t=OV[k]>=t0?OV[k]:t0;while(j<pts.length-2&&cum>=pts[j+1].c)j++;const a=pts[j],b=pts[j+1];TM[k]=b.c>a.c?a.t+(cum-a.c)/(b.c-a.c)*(b.t-a.t):a.t;if(OV[k]!==undefined)TM[k]=OV[k];cum+=x[2]})})}
const fileOf=t=>{let f=0;while(f<P.files.length-1&&P.starts[f+1]<=t)f++;return f};
const save=()=>{try{localStorage.setItem('dnov2',JSON.stringify(OV))}catch(e){};calc();count()};
function items(){const F=P.files.map(f=>({file:f.file,dur:f.dur,it:[]}));P.groups.forEach(g=>g.paras.forEach(x=>{const k=x[0]+'|'+x[1],t=TM[k],f=fileOf(t);F[f].it.push({s:x[0],p:x[1],x:x[3],k,t:t-P.starts[f],set:OV[k]!==undefined})}));return F}
let FI=[];
const au=document.getElementById('au');let cur=1;
function count(){document.getElementById('cnt').textContent='မှတ်ပြီး '+Object.keys(OV).length+' ပိုဒ် — ကျန်တာကို အလိုအလျောက် ပြန်တွက်သည်'}
function side(){FI=items();document.getElementById('side').innerHTML=FI.map(f=>{const ss=[...new Set(f.it.map(i=>i.s))].map(n=>SN[n].name.replace(/^[^။]*။\s*/,'').replace('သုတ္တံ','')).join(' · ');const d=f.it.length&&f.it.some(i=>i.set);return `<button data-f="${f.file}" class="${f.file===cur?'on':''} ${d?'done':''}">A (${f.file}) · ${mm(f.dur)}<br><span style="color:var(--m)">${ss||'—'}</span></button>`}).join('')}
function show(n){cur=n;FI=items();const f=FI[n-1];if(!au.src.endsWith(encodeURI('A ('+n+').mp3'))){au.src=BASE+'A ('+n+').mp3';au.load()}
 const ss=[...new Set(f.it.map(i=>i.s))];const w=ss.filter(s=>SN[s].rate<6||SN[s].rate>9.6).map(s=>SN[s].name);
 document.getElementById('warn').innerHTML=(w.length?'<div class="warn">⚠ ဒီဖိုင်ရဲ့ သုတ္တန် ('+w.join('၊ ')+') က ဖတ်နှုန်း မူမှန်မဟုတ်လို့ ခန့်မှန်းချက် လွဲနိုင်သည် (အတိုချုံးဖတ်ထား/ပိုဖတ်ထားနိုင်)</div>':'')+(SN[ss[0]]&&SN[ss[0]].joined?'<div class="warn">ℹ သုတ္တန်နှစ်ခုကြား နယ်နိမိတ်ကို ခန့်မှန်းထားသည်</div>':'');
 let h='',last=0;f.it.forEach(i=>{const k=i.k,t=i.t;if(i.s!==last){h+=`<div class="sh">${SN[i.s].name}</div>`;last=i.s}
  h+=`<div class="row ${i.set?'set':''}" data-t="${t}" data-k="${k}"><span class="pn">¶${i.p}</span><span class="tm">${mm(t)}</span><span class="tx">${i.x}</span><span class="fine"><button data-d="-2">−2</button><button data-d="-1">−1</button><button data-d="1">+1</button><button data-d="2">+2</button></span><button data-set="1">📍 ဒီမှာစ</button></div>`});
 document.getElementById('rows').innerHTML=h||'<div class="hint">ဒီဖိုင်မှာ ပိုဒ်မရှိ</div>';side()}
document.getElementById('side').onclick=e=>{const b=e.target.closest('[data-f]');if(b)show(+b.dataset.f)};
document.getElementById('rows').onclick=e=>{const r=e.target.closest('.row');if(!r)return;
 if(e.target.dataset.d){const k=r.dataset.k,t=Math.max(0,Math.round(TM[k]+ +e.target.dataset.d));OV[k]=t;save();const y=window.scrollY;show(cur);window.scrollTo(0,y);au.currentTime=Math.max(0,t-P.starts[cur-1]-2);au.play();return}
 if(e.target.dataset.set){OV[r.dataset.k]=Math.round(P.starts[cur-1]+au.currentTime);save();const y=window.scrollY;show(cur);window.scrollTo(0,y);return}
 au.currentTime=Math.max(0,+r.dataset.t-(r.classList.contains('set')?2:12));au.play()};
document.getElementById('exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({marks:OV,times:TM},null,1)],{type:'application/json'}));a.download='digha_corrections2.json';a.click()};
calc();document.getElementById('sk').onclick=e=>{const s=e.target.dataset.s;if(s)au.currentTime=Math.max(0,Math.min(au.duration||1e9,au.currentTime+ +s))};
au.addEventListener('timeupdate',()=>{document.getElementById('ct').textContent=mm(au.currentTime)});
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;const m={ArrowLeft:-5,ArrowRight:5,j:-10,l:10};if(e.key in m){au.currentTime=Math.max(0,au.currentTime+m[e.key]);e.preventDefault()}else if(e.key===' '){au.paused?au.play():au.pause();e.preventDefault()}});
count();show(1);
</script></body></html>'''
open(os.path.join(HERE, 'digha_review.html'), 'w', encoding='utf8').write(html.replace('__PLAN__', json.dumps(plan, ensure_ascii=False)))
print('ok')
