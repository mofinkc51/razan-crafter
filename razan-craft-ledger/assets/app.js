/* theme: dark (default) / light / auto (follow the device) */
const THEME_TH={dark:"ธีม: มืด",light:"ธีม: สว่าง",auto:"ธีม: ตามเครื่อง"};
function curTheme(){try{return localStorage.getItem("razan-theme")||"dark"}catch(e){return "dark"}}
function setTheme(t){try{localStorage.setItem("razan-theme",t)}catch(e){}
  if(t==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",t);
  const b=document.getElementById("themebtn");if(b){b.textContent=THEME_TH[t];b.title="กดเพื่อสลับธีม (มืด → สว่าง → ตามเครื่อง)"}}
setTheme(curTheme());
const RAW=window.RAZAN_RECIPES||[];
const TAB_ORDER=["Wolf","Bison","Panda","Sheep","Bat","Rabbit","Cat","Penguin","Mole","Chameleon","Whale","Monkey","Material","Trinket","Special"];
const TAB_TH={Wolf:"Wolf · ดาบ",Bison:"Bison · ขวาน/ค้อน",Panda:"Panda · สนับมือ",Sheep:"Sheep · หนังสือ",Bat:"Bat · คทา",Rabbit:"Rabbit · ปืน",Cat:"Cat · มีด",Penguin:"Penguin · ไม้เท้า",Mole:"Mole · ปืนใหญ่",Chameleon:"Chameleon · ธนู",Whale:"Whale · หอก",Monkey:"Monkey · ไมค์",Material:"Material",Trinket:"Trinket",Special:"Special"};
const TYPE_TH={W:"อาวุธ",A:"ชุด",C:"หมวก/เครื่องประดับ","":""};
const CAT_TH={m:"วัตถุดิบ",w:"อาวุธ",a:"ชุด/หมวก",c:"หมวก",f:"ไอเทม/เงิน",t:"Trinket",k:"ไอเทมพิเศษ",s:"Special"};
const norm=s=>s.toLowerCase().replace(/\s+/g," ").trim();
const ITEMS=new Map();
function item(name,cat){const k=norm(name);let it=ITEMS.get(k);if(!it){it={k,name,cat:cat||"m",recipe:null,usedIn:new Set()};ITEMS.set(k,it)}else if(cat&&it.cat==="m")it.cat=cat;return it}
const outCat=(t,tab)=>t==="W"?"w":t==="A"?"a":t==="C"?"c":tab==="Trinket"?"t":tab==="Special"?"s":"m";
const RECIPES=RAW.map((r,i)=>{const [name,tab,group,type,src,ings]=r;const out=item(name,outCat(type,tab));
  const rec={id:i,name,tab,group,type,src,k:out.k,ing:ings.map(([n,q,c])=>({k:item(n,c==="a"&&false?c:(c||"m")).k,q}))};
  out.recipe=out.recipe||rec;return rec});
RECIPES.forEach(r=>r.ing.forEach(g=>{if(g.k!==r.k)ITEMS.get(g.k).usedIn.add(r.id)}));
const initials=n=>{const w=n.replace(/[^A-Za-z0-9 ]/g,"").split(" ").filter(Boolean);return ((w[0]||"?")[0]+(w[1]?w[1][0]:(w[0]||"")[1]||"")).toUpperCase()};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=n=>{if(n==null||isNaN(n))return "—";const r=Math.round(n*100)/100;return r.toLocaleString("en-US",{maximumFractionDigits:2})};
/* images: IMG = your uploads (IndexedDB, this browser) · REPO_IMG = files in the repo's images/ folder or data/image-urls.json */
let IMG={},REPO_IMG={},BLOBS={},ASSETS=true;const BAD=new Set();
const imgSrc=k=>IMG[k]||REPO_IMG[k]||null;
function imgFail(el){BAD.add(el.getAttribute("src"));const sp=el.parentElement;sp.className="badge m"+(sp.dataset.sm?" sm":"");sp.textContent=sp.dataset.i||"?"}
const badge=(it,sm)=>imgSrc(it.k)&&!BAD.has(imgSrc(it.k))?`<span class="badge img${sm?" sm":""}" data-i="${esc(initials(it.name))}"${sm?' data-sm="1"':""} aria-hidden="true"><img src="${esc(imgSrc(it.k))}" alt="" loading="lazy" onerror="imgFail(this)"></span>`:`<span class="badge ${it.cat}${sm?" sm":""}" aria-hidden="true">${esc(initials(it.name))}</span>`;
const uplBtn=(k,label)=>ASSETS?`<label class="upl">${label}<input type="file" accept="image/*" data-img="${esc(k)}" aria-label="${label}"></label>`:"";

/* ---------- state ---------- */
const LS="razan-ledger-v1";
let S={prices:{},mode:{},queue:[]};
function load(obj){if(!obj)return;S.prices=Object.fromEntries(obj.prices||[]);S.mode=Object.fromEntries(obj.mode||[]);S.queue=(obj.queue||[]).filter(q=>RECIPES[q[0]]).map(([id,n])=>({id,n}))}
const dump=()=>({v:1,prices:Object.entries(S.prices),mode:Object.entries(S.mode),queue:S.queue.map(q=>[q.id,q.n]),at:Date.now()});
try{const s=localStorage.getItem(LS);if(s)load(JSON.parse(s))}catch(e){}
let dbDoc=null,saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(async()=>{const d=dump();try{localStorage.setItem(LS,JSON.stringify(d))}catch(e){}
  if(dbDoc){try{await dbDoc.set(d);setSync(true)}catch(e){setSync(false)}}},700)}
function setSync(on){const el=document.getElementById("sync");el.classList.toggle("on",on);el.textContent=on?"บันทึกในบัญชีแล้ว":"บันทึกในเบราว์เซอร์นี้"}
const IDB=(()=>{let p;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open("razan-ledger",1);r.onupgradeneeded=()=>r.result.createObjectStore("images");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const run=async(mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const t=db.transaction("images",mode);const out=fn(t.objectStore("images"));t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error)})};
  return{put:(k,v)=>run("readwrite",st=>st.put(v,k)),del:k=>run("readwrite",st=>st.delete(k)),
    all:async()=>{const db=await open();return new Promise((res,rej)=>{const out={};const c=db.transaction("images").objectStore("images").openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue()}else res(out)};c.onerror=()=>rej(c.error)})}}})();
(async()=>{
  try{const all=await IDB.all();for(const [k,bl] of Object.entries(all)){BLOBS[k]=bl;IMG[k]=URL.createObjectURL(bl)}}catch(e){}
  const enc=p=>/^(https?:|data:|blob:)/i.test(p)?p:p.split("/").map(encodeURIComponent).join("/");
  for(const f of ["data/image-urls.json","data/images.json"]){try{const r=await fetch(f,{cache:"no-cache"});if(!r.ok)continue;const m=await r.json();
    for(const [n,pth] of Object.entries(m)){const k=fileKey(n);if(ITEMS.has(k)&&typeof pth==="string")REPO_IMG[k]=enc(pth)}}catch(e){}}
  render()})();

/* ---------- cost engine ---------- */
let memo=new Map();
function evalItem(k,stack=[]){
  const self=stack.includes(k);if(!self&&memo.has(k))return memo.get(k);
  const it=ITEMS.get(k),p=S.prices[k];const hasP=p!=null&&p!=="";const price=hasP?+p:null;
  let craft=null;
  if(it.recipe&&!self){let c=0,miss=0;for(const g of it.recipe.ing){const e=evalItem(g.k,[...stack,k]);c+=e.cost*g.q;miss+=e.miss}craft={cost:c,miss}}
  let use="buy";
  if(craft){const m=S.mode[k]||"auto";if(m==="buy")use="buy";else if(m==="craft")use="craft";else use=(hasP&&(craft.miss>0||price<=craft.cost))?"buy":"craft"}
  const r=use==="craft"?{cost:craft.cost,miss:craft.miss,use,craft,price}:{cost:hasP?price:0,miss:hasP?0:1,use,craft,price};
  if(!self&&!stack.length)memo.set(k,r);else if(!self&&!it.recipe?.ing.some(g=>g.k===k))memo.set(k,r);
  return r}
function recipeCost(rec){let c=0,miss=0;for(const g of rec.ing){const e=evalItem(g.k,[rec.k]);c+=e.cost*g.q;miss+=e.miss}return{cost:c,miss}}
function expand(rec,n,acc,crafts){crafts[rec.k]=(crafts[rec.k]||0)+n;
  (function walk(ings,mult,stack){for(const g of ings){const q=g.q*mult;const e=evalItem(g.k,stack);const it=ITEMS.get(g.k);
    if(e.use==="craft"&&it.recipe){crafts[g.k]=(crafts[g.k]||0)+q;walk(it.recipe.ing,q,[...stack,g.k])}else acc[g.k]=(acc[g.k]||0)+q}})(rec.ing,n,[rec.k])}

/* ---------- ui state ---------- */
let U={view:"recipes",tab:"Wolf",q:"",type:"",sel:0,qty:1,open:new Set(),pbFilter:"all",pbQ:"",showDetail:false};
try{const s=JSON.parse(localStorage.getItem(LS+"-ui")||"{}");Object.assign(U,{tab:s.tab||U.tab,sel:s.sel??U.sel,view:s.view||U.view})}catch(e){}
const saveUI=()=>{try{localStorage.setItem(LS+"-ui",JSON.stringify({tab:U.tab,sel:U.sel,view:U.view}))}catch(e){}};

function render(){memo=new Map();
  const sameView=render._view===U.view;render._view=U.view;
  const keep=sameView?["rail","list","detail","page"].map(c=>{const el=document.querySelector("#main ."+c);return el?[c,el.scrollTop,el.scrollLeft]:null}).filter(Boolean):[];
  const tblX=sameView?[...document.querySelectorAll("#main .tbl")].map(t=>t.scrollLeft):[];const focus=document.activeElement?.dataset?.f;const caret=document.activeElement?.selectionStart;
  document.querySelectorAll("#views button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===U.view));
  const main=document.getElementById("main");main.className=U.view==="recipes"?"v-recipes":"v-other";
  main.innerHTML=U.view==="recipes"?viewRecipes():U.view==="prices"?viewPrices():viewQueue();
  for(const [c,t,l] of keep){const el=main.querySelector("."+c);if(el){el.scrollTop=t;el.scrollLeft=l}}
  main.querySelectorAll(".tbl").forEach((t,i)=>{if(tblX[i])t.scrollLeft=tblX[i]});
  const total=ITEMS.size,priced=[...ITEMS.keys()].filter(k=>S.prices[k]!=null&&S.prices[k]!=="").length;
  document.getElementById("pbar").style.width=(priced/total*100)+"%";document.getElementById("ptxt").textContent=priced+"/"+total+" มีราคา";
  document.getElementById("qcnt").textContent=S.queue.length?S.queue.length:"";
  if(focus){const el=document.querySelector(`[data-f="${CSS.escape(focus)}"]`);if(el){el.focus({preventScroll:true});try{if(caret!=null)el.setSelectionRange(caret,caret)}catch(e){}}}
  const cur=main.querySelector('.row[aria-current="true"]');if(cur&&!render._scrolled){cur.scrollIntoView({block:"center"});render._scrolled=true}
  saveUI()}

/* ---------- recipes view ---------- */
function viewRecipes(){
  const counts={};RECIPES.forEach(r=>counts[r.tab]=(counts[r.tab]||0)+1);
  const rail=`<nav class="rail" aria-label="หมวด"><h6>อาชีพ</h6>${TAB_ORDER.slice(0,12).map(t=>railBtn(t,counts[t])).join("")}<h6>อื่นๆ</h6>${TAB_ORDER.slice(12).map(t=>railBtn(t,counts[t])).join("")}<button data-act="tab" data-t="*" aria-current="${U.tab==="*"}">ทั้งหมด <span class="n">${RECIPES.length}</span></button></nav>`;
  const q=norm(U.q);const hit=r=>!q||norm(r.name).includes(q)||r.ing.some(g=>g.k.includes(q));
  let list=RECIPES.filter(r=>(U.tab==="*"||r.tab===U.tab)&&(!U.type||r.type===U.type)&&hit(r));
  const elsewhere=q&&U.tab!=="*"?RECIPES.filter(r=>r.tab!==U.tab&&(!U.type||r.type===U.type)&&hit(r)).length:0;
  let html="",grp=null;
  for(const r of list){const g=U.tab==="*"?r.tab:(r.group||"เริ่มต้น");if(g!==grp){html+=`<div class="grp">${esc(U.tab==="*"?TAB_TH[r.tab]:g)}</div>`;grp=g}
    const c=recipeCost(r);html+=`<button class="row" data-act="sel" data-id="${r.id}" aria-current="${r.id===U.sel}">${badge(ITEMS.get(r.k))}<span class="nm">${esc(r.name)}</span>${r.src==="w"?'<span class="tag wiki">wiki</span>':""}<span class="cost${c.miss?" miss":""}">${c.miss?(c.cost?"≥"+fmt(c.cost):"—"):fmt(c.cost)}</span></button>`}
  if(!list.length)html=`<div class="empty-note">ไม่พบสูตรที่ตรงกับ “${esc(U.q)}” ใน${U.tab==="*"?"ทุกหมวด":esc(TAB_TH[U.tab])}${U.type?" ("+TYPE_TH[U.type]+")":""}</div>`;
  if(elsewhere)html+=`<div style="padding:10px 14px"><button class="chip" data-act="tab" data-t="*" data-keepq="1">พบอีก ${elsewhere} สูตรในหมวดอื่น · ค้นหาทุกหมวด</button></div>`;
  const types=[["","ทั้งหมด"],["W","อาวุธ"],["A","ชุด"],["C","หมวก"]];
  const index=`<section class="index"><div class="search"><input class="inp" id="q" data-f="q" type="search" placeholder="ค้นหาใน${U.tab==="*"?"ทุกหมวด":esc(TAB_TH[U.tab].split(" ·")[0])}…" value="${esc(U.q)}" autocomplete="off"><div class="chips">${types.map(([v,l])=>`<button class="chip" data-act="type" data-t="${v}" aria-pressed="${U.type===v}">${l}</button>`).join("")}</div></div><div class="list">${html}</div></section>`;
  return rail+index+`<section class="detail" id="detail" ${U.showDetail?"":'data-closed="1"'}>${viewDetail()}</section>`}
const railBtn=(t,n)=>`<button data-act="tab" data-t="${t}" aria-current="${U.tab===t}">${esc(TAB_TH[t])} <span class="n">${n}</span></button>`;

function viewDetail(){
  const r=RECIPES[U.sel];if(!r)return `<div class="empty-note">เลือกสูตรทางซ้ายเพื่อดูรายละเอียด</div>`;
  const out=ITEMS.get(r.k),n=Math.max(1,U.qty|0);
  const rc=recipeCost(r);const acc={},crafts={};expand(r,n,acc,crafts);
  const raws=Object.entries(acc).map(([k,q])=>{const p=S.prices[k];const has=p!=null&&p!=="";return{k,q,has,sub:has?+p*q:0}}).sort((a,b)=>b.sub-a.sub||a.k.localeCompare(b.k));
  const total=raws.reduce((s,x)=>s+x.sub,0),missing=raws.filter(x=>!x.has);
  const steps=Object.values(crafts).reduce((s,x)=>s+x,0);
  const op=evalItem(r.k);const sell=op.price;
  let margin="";if(sell!=null&&!missing.length){const d=sell*n-total;margin=`<div class="sub ${d>=0?"":"warn"}">ราคาขาย ${fmt(sell*n)} · ${d>=0?"กำไร":"ขาดทุน"} ${fmt(Math.abs(d))}</div>`}
  const inQ=S.queue.find(x=>x.id===r.id);
  return `<div class="dwrap">
  <button class="btn ghost back" data-act="close">← กลับไปที่รายการ</button>
  <div class="dhead">${badge(out)}<div class="dtitle"><h2>${esc(r.name)}</h2><div class="crumbs"><span>${esc(TAB_TH[r.tab])}</span>${r.group?`<span>· ${esc(r.group)}</span>`:""}${r.type?`<span class="tag">${TYPE_TH[r.type]}</span>`:""}${r.src==="w"?'<span class="tag wiki">สูตรจาก wiki</span>':""}</div></div>
   <div class="qty" title="จำนวนที่จะคราฟ"><button data-act="qty" data-d="-1" aria-label="ลด">−</button><input id="qty" data-f="qty" class="num" inputmode="numeric" value="${n}" aria-label="จำนวน"><button data-act="qty" data-d="1" aria-label="เพิ่ม">+</button></div>
   ${uplBtn(r.k,imgSrc(r.k)?"เปลี่ยนรูป":"เพิ่มรูป")}<button class="btn pri" data-act="addq">${inQ?"เพิ่มอีก "+n+" ในรายการ":"เพิ่มในรายการคราฟ"}</button></div>
  <div class="totals">
    <div><label>ต้นทุนรวม ${n>1?"("+n+" ชิ้น)":""}</label><div class="big">${fmt(total)} <span style="font-size:14px">Jil</span></div><div class="sub">${n>1?"ชิ้นละ "+fmt(total/n)+" Jil":"ต่อ 1 ชิ้น"}${missing.length?' · <span class="warn">ยังไม่ครบ</span>':""}</div>${margin}</div>
    <div><label>วัตถุดิบที่ต้องหา</label><div class="mid">${raws.length}</div><div class="sub">${raws.reduce((s,x)=>s+x.q,0).toLocaleString()} ชิ้นรวม</div></div>
    <div><label>ครั้งที่ต้องคราฟ</label><div class="mid">${steps}</div><div class="sub">${Object.keys(crafts).length} สูตร</div></div>
    <div><label>ยังไม่มีราคา</label><div class="mid ${missing.length?"warn":""}">${missing.length}</div><div class="sub">${missing.length?"กรอกในช่องประ":"ครบทุกรายการ"}</div></div>
  </div>
  <div class="sec"><h3>โครงสูตร <span class="hint">กดลูกศรเพื่อดูสูตรย่อย · ช่อง “ทำ” เลือกว่าจะคราฟเองหรือซื้อ</span></h3>
   <div class="tbl"><div class="tr h"><span>วัตถุดิบ</span><span class="r">จำนวน</span><span>ทำ</span><span class="r">ราคา/ชิ้น</span><span class="r">รวม</span></div>${tree(r.ing,n,[r.k],1,String(r.id))}
   <div class="tr" style="font-weight:600"><span>ผลรวมต้นทุน</span><span></span><span></span><span></span><span class="sum">${fmt(rc.cost*n)}</span></div>
   <div class="tr"><span class="nmcell">${badge(out,1)} ราคาขาย/ซื้อ ${esc(r.name)}</span><span></span><span></span><span><input class="pin num ${sell==null?"":""}" data-price="${esc(r.k)}" data-f="sell-${esc(r.k)}" inputmode="decimal" placeholder="ไม่ระบุ" value="${sell??""}"></span><span class="sum">${sell!=null?fmt(sell*n):"—"}</span></div></div></div>
  <div class="sec shop"><h3>รายการต้องซื้อ/ฟาร์ม <span class="hint">รวมวัตถุดิบพื้นฐานทั้งหมดตามโหมดที่เลือก เรียงตามสัดส่วนต้นทุน</span><span class="legend"><button class="chip" data-act="copyshop">คัดลอกรายการ</button></span></h3>
   <div class="tbl"><div class="tr h"><span>วัตถุดิบ</span><span class="r">จำนวน</span><span class="r">ราคา/ชิ้น</span><span class="r">รวม</span><span>สัดส่วน</span></div>
   ${raws.map(x=>{const it=ITEMS.get(x.k);return `<div class="tr"><span class="nmcell">${badge(it,1)}<a data-act="item" data-k="${esc(x.k)}">${esc(it.name)}</a></span><span class="r num">×${x.q.toLocaleString()}</span><span><input class="pin ${x.has?"":"empty"}" data-price="${esc(x.k)}" data-f="s-${esc(x.k)}" inputmode="decimal" placeholder="ใส่ราคา" value="${x.has?S.prices[x.k]:""}"></span><span class="sum ${x.has?"":"miss"}">${x.has?fmt(x.sub):"—"}</span><span class="share"><i style="width:${total?x.sub/total*100:0}%"></i></span></div>`}).join("")}</div></div>
  ${usedInBlock(out)}
  </div>`}
function tree(ings,mult,stack,lvl,path){let h="";
  for(const g of ings){const it=ITEMS.get(g.k),q=g.q*mult,e=evalItem(g.k,stack),p=path+"/"+g.k;const can=!!it.recipe&&!stack.includes(g.k);
    const opened=U.open.has(p);const m=S.mode[g.k]||"auto";
    const modeHtml=can?`<span class="mode" role="group" aria-label="วิธีได้มา">${[["auto","อัตโนมัติ"],["craft","คราฟ"],["buy","ซื้อ"]].map(([v,l])=>`<button data-act="mode" data-k="${esc(g.k)}" data-m="${v}" aria-pressed="${m===v}" title="${l}">${l==="อัตโนมัติ"?"Auto":l}</button>`).join("")}</span>`:`<span class="mode na">ซื้อ/ฟาร์ม</span>`;
    let cmp="";if(can&&e.craft&&e.price!=null&&!e.craft.miss){const d=e.craft.cost-e.price;cmp=d<0?`<span class="cheaper ok">คราฟถูกกว่า ${fmt(-d)}</span>`:d>0?`<span class="cheaper bad">ซื้อถูกกว่า ${fmt(d)}</span>`:""}
    h+=`<div class="tr lvl${Math.min(lvl,5)}"><span class="nmcell" style="padding-left:${(lvl-1)*18}px"><button class="tw" data-act="tw" data-p="${esc(p)}" ${can?"":"disabled"} aria-label="${opened?"ซ่อน":"แสดง"}สูตรย่อย" aria-expanded="${opened}">${can?(opened?"▾":"▸"):""}</button>${badge(it,1)}<a data-act="item" data-k="${esc(g.k)}">${esc(it.name)}</a></span>
     <span class="r num">×${q.toLocaleString()}</span><span>${modeHtml}</span>
     <span><input class="pin ${e.price==null&&e.use==="buy"?"empty":""}" data-price="${esc(g.k)}" data-f="t-${esc(p)}" inputmode="decimal" placeholder="${e.use==="craft"?fmt(e.cost):"ใส่ราคา"}" value="${e.price??""}" aria-label="ราคา ${esc(it.name)}"></span>
     <span><span class="sum ${e.miss?"miss":""}" style="display:block">${e.cost||!e.miss?fmt(e.cost*q):"—"}</span>${e.use==="craft"?`<span class="via">คราฟเอง${e.miss?" · ขาดราคา":""}</span>`:cmp?`<span class="via">${cmp}</span>`:""}</span></div>`;
    if(can&&opened)h+=tree(it.recipe.ing,q,[...stack,g.k],lvl+1,p)}
  return h}
function usedInBlock(it){const ids=[...it.usedIn];if(!ids.length)return "";
  return `<div class="sec"><h3>${esc(it.name)} ใช้ทำอะไรได้อีก <span class="hint">${ids.length} สูตร</span></h3><div class="used">${ids.slice(0,60).map(id=>{const r=RECIPES[id];return `<button data-act="sel" data-id="${id}">${badge(ITEMS.get(r.k),1)}${esc(r.name)}</button>`}).join("")}</div></div>`}

/* ---------- price book ---------- */
function viewPrices(){
  const q=norm(U.pbQ);const all=[...ITEMS.values()].sort((a,b)=>b.usedIn.size-a.usedIn.size||a.name.localeCompare(b.name));
  const rows=all.filter(it=>{const has=S.prices[it.k]!=null&&S.prices[it.k]!=="";
    if(U.pbFilter==="missing"&&has)return false;if(U.pbFilter==="priced"&&!has)return false;if(U.pbFilter==="craft"&&!it.recipe)return false;if(U.pbFilter==="noimg"&&imgSrc(it.k))return false;if(U.pbFilter==="base"&&(it.recipe||it.cat!=="m"))return false;
    return !q||it.k.includes(q)});
  const f=[["all","ทั้งหมด"],["missing","ยังไม่มีราคา"],["priced","มีราคาแล้ว"],["base","วัตถุดิบพื้นฐาน"],["craft","คราฟได้"],["noimg","ยังไม่มีรูป"]];
  return `<section class="page"><div class="pwrap pb">
   <div class="intro"><div><h2>สมุดราคา</h2><p>ใส่ราคาต่อชิ้นเป็น Jil ครั้งเดียว ทุกสูตรจะคำนวณตามทันที ไอเทมที่คราฟได้จะแสดงต้นทุนคราฟเทียบกับราคาที่ใส่ เรียงตามจำนวนสูตรที่ใช้ของชิ้นนั้น</p><p>${ASSETS?"รูปไอเทม: อัปโหลดทีละแถว หรือเลือกหลายไฟล์พร้อมกันโดยตั้งชื่อไฟล์ตามชื่อไอเทม เช่น Zinc Ore.png ระบบจะจับคู่ให้เอง กด “ส่งออกแพ็ก .zip” เพื่อเก็บราคาและรูปทั้งหมดไว้ในเครื่อง (โฟลเดอร์ images/ แยกไว้) แล้วนำเข้ากลับได้ทุกเมื่อ ("+[...ITEMS.keys()].filter(imgSrc).length+"/"+ITEMS.size+" มีรูป) รูปในโฟลเดอร์ images/ ของ repo จะโหลดให้อัตโนมัติ":"รูปไอเทมที่เจ้าของหน้าใส่ไว้จะแสดงที่นี่"}</p></div>
    <div class="ptools">${ASSETS?`<label class="btn upl" style="border-style:solid;font-size:14px;padding:8px 14px">อัปโหลดรูปหลายไฟล์<input type="file" id="bulkimg" accept="image/*" multiple></label>`:""}<button class="btn" data-act="zipout">ส่งออกแพ็ก .zip</button><label class="btn upl" style="border-style:solid;font-size:14px;padding:8px 14px">นำเข้าแพ็ก .zip<input type="file" id="packin" accept=".zip,.json,application/zip,application/json"></label><label class="btn upl" style="border-style:solid;font-size:14px;padding:8px 14px">นำเข้าจากโฟลเดอร์<input type="file" id="dirin" webkitdirectory multiple></label><button class="btn ghost" data-act="export">คัดลอกราคา (ข้อความ)</button><button class="btn ghost" data-act="import">วางราคา</button></div></div>
   <div class="ptools"><input class="inp" id="pbq" data-f="pbq" type="search" placeholder="ค้นหาไอเทม…" value="${esc(U.pbQ)}"><div class="chips">${f.map(([v,l])=>`<button class="chip" data-act="pbf" data-t="${v}" aria-pressed="${U.pbFilter===v}">${l}</button>`).join("")}</div><span class="hint" style="color:var(--ink3);font-size:12px">${rows.length} รายการ</span></div>
   <div class="tbl"><div class="tr h"><span>ไอเทม</span><span>ประเภท</span><span class="r">ใช้ใน</span><span class="r">ต้นทุนคราฟ</span><span class="r">ราคา/ชิ้น (Jil)</span><span>เทียบ</span><span>รูป</span></div>
   ${rows.slice(0,400).map(it=>{const has=S.prices[it.k]!=null&&S.prices[it.k]!=="";let cc="",cmp="";
     if(it.recipe){const c=recipeCost(it.recipe);cc=c.miss?(c.cost?"≥"+fmt(c.cost):"—"):fmt(c.cost);if(has&&!c.miss){const d=c.cost-+S.prices[it.k];cmp=d<0?`<span class="cheaper ok">คราฟถูกกว่า</span>`:d>0?`<span class="cheaper bad">ซื้อถูกกว่า</span>`:""}}
     return `<div class="tr"><span class="nmcell">${badge(it,1)}${it.recipe?`<a data-act="openrec" data-id="${it.recipe.id}">${esc(it.name)}</a>`:esc(it.name)}</span><span style="font-size:12px;color:var(--ink2)">${CAT_TH[it.cat]||""}</span><span class="r num">${it.usedIn.size||""}</span><span class="r num" style="color:var(--ink2)">${cc}</span><span><input class="pin ${has?"":"empty"}" data-price="${esc(it.k)}" data-f="pb-${esc(it.k)}" inputmode="decimal" placeholder="ใส่ราคา" value="${has?S.prices[it.k]:""}" aria-label="ราคา ${esc(it.name)}"></span><span>${cmp}</span><span class="imgcell">${uplBtn(it.k,imgSrc(it.k)?"เปลี่ยน":"เพิ่มรูป")}${IMG[it.k]&&ASSETS?`<button class="x" data-act="imgdel" data-k="${esc(it.k)}" aria-label="ลบรูป ${esc(it.name)}">×</button>`:""}</span></div>`}).join("")}
   ${rows.length>400?`<div class="empty-note">แสดง 400 รายการแรก ใช้ช่องค้นหาเพื่อหาที่เหลือ</div>`:""}${!rows.length?`<div class="empty-note">ไม่มีไอเทมในตัวกรองนี้</div>`:""}</div></div></section>`}

/* ---------- queue ---------- */
function viewQueue(){
  if(!S.queue.length)return `<section class="page"><div class="pwrap"><div class="intro"><div><h2>รายการคราฟ</h2><p>ยังไม่มีอะไรในรายการ เปิดสูตรที่ต้องการแล้วกด “เพิ่มในรายการคราฟ” ระบบจะรวมวัตถุดิบทุกสูตรให้เป็นรายการเดียวพร้อมต้นทุนรวม</p></div></div><div><button class="btn pri" data-act="view" data-v="recipes">ไปที่สูตรคราฟ</button></div></div></section>`;
  const acc={},crafts={};let rows="";
  for(const [i,e] of S.queue.entries()){const r=RECIPES[e.id];const a={};expand(r,e.n,a,crafts);let c=0,m=0;for(const [k,q] of Object.entries(a)){acc[k]=(acc[k]||0)+q;const p=S.prices[k];if(p!=null&&p!=="")c+=+p*q;else m++}
    rows+=`<div class="tr"><span class="nmcell">${badge(ITEMS.get(r.k),1)}<a data-act="openrec" data-id="${r.id}">${esc(r.name)}</a></span><span><div class="qty" style="height:30px"><button data-act="qq" data-i="${i}" data-d="-1" style="height:30px">−</button><input class="num" data-qi="${i}" data-f="qq-${i}" value="${e.n}" style="height:30px;width:44px"><button data-act="qq" data-i="${i}" data-d="1" style="height:30px">+</button></div></span><span class="sum ${m?"miss":""}">${fmt(c)}${m?` <small>(ขาด ${m})</small>`:""}</span><button class="x" data-act="qdel" data-i="${i}" aria-label="ลบ">×</button></div>`}
  const raws=Object.entries(acc).map(([k,q])=>{const p=S.prices[k];const has=p!=null&&p!=="";return{k,q,has,sub:has?+p*q:0}}).sort((a,b)=>b.sub-a.sub||a.k.localeCompare(b.k));
  const total=raws.reduce((s,x)=>s+x.sub,0),miss=raws.filter(x=>!x.has).length;
  return `<section class="page"><div class="pwrap">
  <div class="intro"><div><h2>รายการคราฟ</h2><p>รวมวัตถุดิบจากทุกสูตรในรายการ ใช้โหมดคราฟ/ซื้อเดียวกับหน้าสูตร</p></div><div class="ptools"><button class="btn" data-act="copyq">คัดลอกรายการวัตถุดิบ</button><button class="btn ghost" data-act="qclear">ล้างรายการ</button></div></div>
  <div class="totals"><div><label>ต้นทุนรวมทั้งรายการ</label><div class="big">${fmt(total)} <span style="font-size:14px">Jil</span></div><div class="sub">${S.queue.length} สูตร${miss?' · <span class="warn">ยังไม่ครบ</span>':""}</div></div>
   <div><label>วัตถุดิบที่ต้องหา</label><div class="mid">${raws.length}</div><div class="sub">${raws.reduce((s,x)=>s+x.q,0).toLocaleString()} ชิ้น</div></div>
   <div><label>ครั้งที่ต้องคราฟ</label><div class="mid">${Object.values(crafts).reduce((s,x)=>s+x,0)}</div><div class="sub">${Object.keys(crafts).length} สูตร</div></div>
   <div><label>ยังไม่มีราคา</label><div class="mid ${miss?"warn":""}">${miss}</div><div class="sub">${miss?"กรอกด้านล่าง":"ครบ"}</div></div></div>
  <div class="sec q"><h3>สูตรในรายการ</h3><div class="tbl"><div class="tr h"><span>ไอเทม</span><span>จำนวน</span><span class="r">ต้นทุน</span><span></span></div>${rows}</div></div>
  <div class="sec shop"><h3>วัตถุดิบรวม</h3><div class="tbl"><div class="tr h"><span>วัตถุดิบ</span><span class="r">จำนวน</span><span class="r">ราคา/ชิ้น</span><span class="r">รวม</span><span>สัดส่วน</span></div>
  ${raws.map(x=>{const it=ITEMS.get(x.k);return `<div class="tr"><span class="nmcell">${badge(it,1)}${esc(it.name)}</span><span class="r num">×${x.q.toLocaleString()}</span><span><input class="pin ${x.has?"":"empty"}" data-price="${esc(x.k)}" data-f="q-${esc(x.k)}" inputmode="decimal" placeholder="ใส่ราคา" value="${x.has?S.prices[x.k]:""}"></span><span class="sum ${x.has?"":"miss"}">${x.has?fmt(x.sub):"—"}</span><span class="share"><i style="width:${total?x.sub/total*100:0}%"></i></span></div>`}).join("")}</div></div></div></section>`}

/* ---------- images ---------- */
const fileKey=n=>norm(n.replace(/\.[a-z0-9]+$/i,"").replace(/[_\-]+/g," "));
async function saveImgs(){}
async function uploadFor(k,file){try{await IDB.put(k,file)}catch(e){toast("บันทึกรูป "+file.name+" ในเบราว์เซอร์ไม่สำเร็จ");return false}
  if(IMG[k])URL.revokeObjectURL(IMG[k]);BLOBS[k]=file;IMG[k]=URL.createObjectURL(file);return true}
async function bulkUpload(files){let ok=0;const miss=[];toast("กำลังอัปโหลด "+files.length+" ไฟล์…");
  for(const f of files){const k=fileKey(f.name);if(!ITEMS.has(k)){miss.push(f.name);continue}if(await uploadFor(k,f))ok++}
  await saveImgs();render();
  if(miss.length)showMiss(ok,miss);else toast("ใส่รูปแล้ว "+ok+" ไอเทม")}
function showMiss(ok,miss){document.getElementById("modal-root").innerHTML=`<div class="modal"><div class="box"><h3 style="margin:0;font-family:var(--f-disp)">ใส่รูปแล้ว ${ok} ไอเทม</h3><p style="margin:0;color:var(--ink2)">${miss.length} ไฟล์ไม่ตรงกับชื่อไอเทมใดเลย ตั้งชื่อไฟล์ให้ตรงกับชื่อในสมุดราคา เช่น <code>Zinc Ore.png</code> หรือ <code>zinc_ore.png</code> แล้วอัปโหลดใหม่ หรือกดปุ่มเพิ่มรูปที่แถวของไอเทมนั้นโดยตรง</p><textarea readonly>${esc(miss.join("\n"))}</textarea><div class="ptools" style="justify-content:flex-end"><button class="btn pri" data-act="mclose">ปิด</button></div></div></div>`}
document.addEventListener("change",async e=>{const t=e.target;
  if(t.dataset.img!=null&&t.files[0]){if(await uploadFor(t.dataset.img,t.files[0])){await saveImgs();render();toast("ใส่รูปแล้ว")}}
  else if(t.id==="bulkimg"&&t.files.length){await bulkUpload([...t.files])}});
/* ---------- pack export / import ---------- */
const EXT={"image/png":"png","image/jpeg":"jpg","image/gif":"gif","image/webp":"webp","image/svg+xml":"svg"};
const safeName=n=>n.replace(/[\\/:*?"<>|]+/g,"_").trim();
async function exportPack(){
  if(!window.JSZip){toast("โหลดตัวสร้าง .zip ไม่สำเร็จ ลองรีเฟรชหน้า");return}
  toast("กำลังรวมไฟล์…");const zip=new JSZip(),imgs={};let fail=0;
  for(const k of new Set([...Object.keys(IMG),...Object.keys(REPO_IMG)])){try{let b=BLOBS[k];if(!b){const r=await fetch(REPO_IMG[k]);if(!r.ok)throw 0;b=await r.blob()}
    const fn="images/"+safeName(ITEMS.get(k)?.name||k)+"."+(EXT[b.type]||"png");zip.file(fn,b);imgs[ITEMS.get(k)?.name||k]=fn}catch(e){fail++}}
  const nm=k=>ITEMS.get(k)?.name||k;
  const ledger={app:"Razan Craft Ledger",version:1,exportedAt:new Date().toISOString(),
    prices:Object.fromEntries(Object.entries(S.prices).map(([k,v])=>[nm(k),v])),
    mode:Object.fromEntries(Object.entries(S.mode).map(([k,v])=>[nm(k),v])),
    queue:S.queue.map(q=>({recipe:RECIPES[q.id].name,qty:q.n})),images:imgs};
  zip.file("ledger.json",JSON.stringify(ledger,null,1));
  zip.file("images/README.txt","วางรูปไอเทมในโฟลเดอร์นี้ ตั้งชื่อไฟล์ตามชื่อไอเทม เช่น Zinc Ore.png แล้วนำเข้าด้วยปุ่ม นำเข้าจากโฟลเดอร์ หรือ นำเข้าแพ็ก .zip\n");
  const blob=await zip.generateAsync({type:"blob"});const d=new Date();
  const fname="razan-ledger-"+d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+".zip";
  try{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fname;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast("ส่งออกแล้ว: ราคา "+Object.keys(S.prices).length+" รายการ รูป "+Object.keys(imgs).length+" รูป"+(fail?" (ดึงรูปไม่ได้ "+fail+")":""))}
  catch(e){toast("บันทึกไฟล์ไม่สำเร็จ")}}
function applyLedger(L){let n=0;const key=x=>{const k=norm(x);return ITEMS.has(k)?k:null};
  for(const [x,v] of Object.entries(L.prices||{})){const k=key(x);if(k&&v!==""&&!isNaN(+v)){S.prices[k]=+v;n++}}
  for(const [x,v] of Object.entries(L.mode||{})){const k=key(x);if(k&&(v==="buy"||v==="craft"))S.mode[k]=v}
  if(Array.isArray(L.queue))for(const q of L.queue){const r=RECIPES.find(r=>norm(r.name)===norm(q.recipe||""));if(r&&q.qty>0){const ex=S.queue.find(e=>e.id===r.id);ex?ex.n=Math.max(ex.n,q.qty):S.queue.push({id:r.id,n:q.qty})}}
  return n}
async function importFiles(entries){ // entries: [{path, blob}]
  let ledger=null,prices=0,ok=0;const miss=[];const imgMap={};
  const lj=entries.find(e=>/(^|\/)ledger\.json$/i.test(e.path))||(entries.length===1&&/\.json$/i.test(entries[0].path)?entries[0]:null);
  if(lj){try{ledger=JSON.parse(await lj.blob.text());prices=applyLedger(ledger.prices?ledger:{prices:ledger});for(const [nm,fp] of Object.entries(ledger.images||{}))imgMap[fp.toLowerCase()]=nm}catch(e){toast("อ่าน ledger.json ไม่ได้")}}
  const imgs=entries.filter(e=>/\.(png|jpe?g|gif|webp|svg)$/i.test(e.path));
  if(imgs.length&&!ASSETS)toast("เบราว์เซอร์นี้เก็บรูปไม่ได้ นำเข้าเฉพาะราคา");
  else for(const e of imgs){const tail=e.path.split("/").slice(-2).join("/").toLowerCase();const nm=imgMap[tail]||imgMap["images/"+e.path.split("/").pop().toLowerCase()];
    const k=nm?norm(nm):fileKey(e.path.split("/").pop());if(!ITEMS.has(k)){miss.push(e.path.split("/").pop());continue}
    const type=e.blob.type||("image/"+(e.path.split(".").pop().toLowerCase().replace("jpg","jpeg").replace("svg","svg+xml")));
    if(await uploadFor(k,new File([e.blob],e.path.split("/").pop(),{type})))ok++}
  if(ok)await saveImgs();save();render();
  if(miss.length)showMiss(ok,miss);else toast("นำเข้าแล้ว: ราคา "+prices+" รายการ รูป "+ok+" รูป")}
async function importPack(file){
  if(/\.json$/i.test(file.name))return importFiles([{path:file.name,blob:file}]);
  if(!window.JSZip){toast("โหลดตัวอ่าน .zip ไม่สำเร็จ ลองรีเฟรชหน้า");return}
  try{toast("กำลังอ่านแพ็ก…");const z=await JSZip.loadAsync(file);const list=[];
    for(const [path,f] of Object.entries(z.files)){if(f.dir||path.startsWith("__MACOSX"))continue;if(/\.(json|png|jpe?g|gif|webp|svg)$/i.test(path))list.push({path,blob:await f.async("blob")})}
    await importFiles(list)}catch(e){toast("เปิดไฟล์ .zip ไม่ได้ ตรวจว่าเป็นไฟล์ที่ส่งออกจากหน้านี้")}}
document.addEventListener("change",e=>{const t=e.target;
  if(t.id==="packin"&&t.files[0])importPack(t.files[0]);
  else if(t.id==="dirin"&&t.files.length)importFiles([...t.files].map(f=>({path:f.webkitRelativePath||f.name,blob:f})))});
/* ---------- events ---------- */
function toast(t){const el=document.createElement("div");el.className="toast";el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),1800)}
async function copy(text,ta){try{await navigator.clipboard.writeText(text);toast("คัดลอกแล้ว")}catch(e){if(ta){ta.focus();ta.select()}toast("คัดลอกอัตโนมัติไม่ได้ กด Ctrl+C")}}
const listText=acc=>Object.entries(acc).map(([k,q])=>`${ITEMS.get(k).name} x${q}`).join("\n");
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(a==="theme"){const order=["dark","light","auto"];setTheme(order[(order.indexOf(curTheme())+1)%3]);return}
  if(a==="view"){U.view=b.dataset.v;render()}
  else if(a==="tab"){U.tab=b.dataset.t;if(!b.dataset.keepq)U.q="";const first=RECIPES.find(r=>U.tab==="*"||r.tab===U.tab);if(first&&window.innerWidth>1000)U.sel=first.id;render();document.querySelector(".list")?.scrollTo(0,0)}
  else if(a==="type"){U.type=b.dataset.t;render()}
  else if(a==="sel"||a==="openrec"){U.sel=+b.dataset.id;U.qty=1;U.open=new Set();U.showDetail=true;if(a==="openrec"){U.view="recipes";U.tab=RECIPES[U.sel].tab;render._scrolled=false}render();document.getElementById("detail")?.scrollTo(0,0)}
  else if(a==="close"){U.showDetail=false;render()}
  else if(a==="item"){const it=ITEMS.get(b.dataset.k);if(it.recipe){U.sel=it.recipe.id;U.tab=it.recipe.tab;U.qty=1;U.open=new Set();render._scrolled=false;render();document.getElementById("detail")?.scrollTo(0,0)}else{U.view="prices";U.pbQ=it.name;U.pbFilter="all";render()}}
  else if(a==="qty"){U.qty=Math.max(1,(U.qty|0)+ +b.dataset.d);render()}
  else if(a==="tw"){const p=b.dataset.p;U.open.has(p)?U.open.delete(p):U.open.add(p);render()}
  else if(a==="mode"){const k=b.dataset.k,m=b.dataset.m;if(m==="auto")delete S.mode[k];else S.mode[k]=m;save();render()}
  else if(a==="addq"){const ex=S.queue.find(x=>x.id===U.sel);if(ex)ex.n+=U.qty;else S.queue.push({id:U.sel,n:U.qty});save();render();toast("เพิ่มในรายการคราฟแล้ว")}
  else if(a==="qq"){const e2=S.queue[+b.dataset.i];e2.n=Math.max(1,e2.n+ +b.dataset.d);save();render()}
  else if(a==="qdel"){S.queue.splice(+b.dataset.i,1);save();render()}
  else if(a==="qclear"){if(b.dataset.sure){S.queue=[];save();render()}else{b.dataset.sure="1";b.textContent="กดอีกครั้งเพื่อยืนยัน";setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="ล้างรายการ"}},3000)}}
  else if(a==="imgdel"){const k=b.dataset.k;if(IMG[k])URL.revokeObjectURL(IMG[k]);delete IMG[k];delete BLOBS[k];IDB.del(k).catch(()=>{});render()}
  else if(a==="pbf"){U.pbFilter=b.dataset.t;render()}
  else if(a==="copyshop"){const acc={},cr={};expand(RECIPES[U.sel],Math.max(1,U.qty|0),acc,cr);copy(RECIPES[U.sel].name+" x"+U.qty+"\n"+listText(acc))}
  else if(a==="copyq"){const acc={},cr={};S.queue.forEach(x=>expand(RECIPES[x.id],x.n,acc,cr));copy(listText(acc))}
  else if(a==="zipout")exportPack();
  else if(a==="export")modal("export");else if(a==="import")modal("import");
  else if(a==="mclose")document.getElementById("modal-root").innerHTML="";
  else if(a==="mcopy")copy(document.getElementById("mta").value,document.getElementById("mta"));
  else if(a==="mapply"){try{const d=JSON.parse(document.getElementById("mta").value);const pr=Array.isArray(d.prices)?Object.fromEntries(d.prices):d.prices||d;let n=0;for(const [k,v] of Object.entries(pr)){const kk=norm(k);if(ITEMS.has(kk)&&v!==""&&!isNaN(+v)){S.prices[kk]=+v;n++}}save();document.getElementById("modal-root").innerHTML="";render();toast("นำเข้า "+n+" ราคา")}catch(err){document.getElementById("merr").textContent="อ่านข้อมูลไม่ได้ ตรวจว่าเป็น JSON ที่ได้จากปุ่มส่งออก"}}
});
function modal(kind){const exp=kind==="export";const txt=exp?JSON.stringify({prices:Object.fromEntries(Object.entries(S.prices).map(([k,v])=>[ITEMS.get(k)?.name||k,v]))},null,1):"";
  document.getElementById("modal-root").innerHTML=`<div class="modal"><div class="box"><h3 style="margin:0;font-family:var(--f-disp)">${exp?"ส่งออกราคา":"นำเข้าราคา"}</h3><p style="margin:0;color:var(--ink2)">${exp?"คัดลอกข้อความนี้ไปเก็บไว้หรือส่งให้เพื่อนในกิลด์":"วางข้อความ JSON ที่ได้จากปุ่มส่งออก ราคาเดิมของไอเทมเดียวกันจะถูกแทนที่"}</p><textarea id="mta" ${exp?"readonly":""} placeholder='{"prices":{"Zinc Ore":120}}'>${esc(txt)}</textarea><div id="merr" style="color:var(--warn);font-size:12px"></div><div class="ptools" style="justify-content:flex-end"><button class="btn ghost" data-act="mclose">ปิด</button>${exp?'<button class="btn pri" data-act="mcopy">คัดลอก</button>':'<button class="btn pri" data-act="mapply">นำเข้า</button>'}</div></div></div>`}
document.addEventListener("input",e=>{const t=e.target;
  if(t.dataset.price!=null){const v=t.value.replace(/[, ]/g,"");if(v===""||isNaN(+v))delete S.prices[t.dataset.price];else S.prices[t.dataset.price]=+v;save();render()}
  else if(t.id==="q"){U.q=t.value;render()}
  else if(t.id==="pbq"){U.pbQ=t.value;render()}
  else if(t.id==="qty"){const v=parseInt(t.value);if(v>0){U.qty=v;render()}}
  else if(t.dataset.qi!=null){const v=parseInt(t.value);if(v>0){S.queue[+t.dataset.qi].n=v;save();render()}}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(document.getElementById("modal-root").innerHTML)document.getElementById("modal-root").innerHTML="";else if(U.showDetail){U.showDetail=false;render()}}});
// detail sheet visibility on narrow screens
const st=document.createElement("style");st.textContent="@media (max-width:1000px){.v-recipes .detail[data-closed]{display:none}}";document.head.appendChild(st);
render();
