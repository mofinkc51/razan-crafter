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
const knownKey=k=>ITEMS.has(k)||EQ_KEYS.has(k); // recipe items + wearable equipment can both have pictures
const itemName=k=>ITEMS.get(k)?.name||EQ_NAME.get(k)||k;
function imgFail(el){BAD.add(el.getAttribute("src"));const sp=el.parentElement;sp.className="badge m"+(sp.dataset.sm?" sm":"");sp.textContent=sp.dataset.i||"?"}
const badge=(it,sm)=>imgSrc(it.k)&&!BAD.has(imgSrc(it.k))?`<span class="badge img${sm?" sm":""}" data-i="${esc(initials(it.name))}"${sm?' data-sm="1"':""} aria-hidden="true"><img src="${esc(imgSrc(it.k))}" alt="" loading="lazy" onerror="imgFail(this)"></span>`:`<span class="badge ${it.cat}${sm?" sm":""}" aria-hidden="true">${esc(initials(it.name))}</span>`;
const uplBtn=(k,label)=>ASSETS?`<label class="upl">${label}<input type="file" accept="image/*" data-img="${esc(k)}" aria-label="${label}"></label>`:"";

/* ---------- state ---------- */
const LS="razan-ledger-v1";
let S={prices:{},cur:{},mode:{},queue:[],have:new Set(),buy:new Set(),guar:true,rate:null,stock:{},sets:[]};
function load(obj){if(!obj)return;S.prices=Object.fromEntries(obj.prices||[]);S.mode=Object.fromEntries(obj.mode||[]);S.queue=(obj.queue||[]).filter(q=>RECIPES[q[0]]).map(([id,n])=>({id,n}));S.have=new Set(obj.have||[]);S.buy=new Set(obj.buy||[]);S.cur=Object.fromEntries(obj.cur||[]);S.guar=obj.guar===undefined?true:!!obj.guar;S.rate=+obj.rate>0?+obj.rate:null;S.stock=Object.fromEntries((obj.stock||[]).filter(([k,v])=>v>0));S.sets=Array.isArray(obj.sets)?obj.sets.map(cleanSet).filter(Boolean):[]}
const dump=()=>({v:1,prices:Object.entries(S.prices),mode:Object.entries(S.mode),queue:S.queue.map(q=>[q.id,q.n]),have:[...S.have],buy:[...S.buy],cur:Object.entries(S.cur),guar:S.guar,rate:S.rate,stock:Object.entries(S.stock),sets:S.sets,at:Date.now()});
try{const s=localStorage.getItem(LS);if(s)load(JSON.parse(s))}catch(e){}
let dbDoc=null,saveT=null;
function save(){try{localStorage.setItem(LS,JSON.stringify(dump()))}catch(e){}clearTimeout(saveT);saveT=setTimeout(async()=>{const d=dump();
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
    for(const [n,pth] of Object.entries(m)){const k=fileKey(n);if(knownKey(k)&&typeof pth==="string")REPO_IMG[k]=enc(pth)}}catch(e){}}
  render()})();

/* ---------- money: Jil (in-game) and ฿ (real money) are always kept apart ---------- */
const GUAR_FEE=120; // hidden Jil cost of every crafted piece when the guarantee is used
const M0=()=>({j:0,b:0});
const madd=(a,m,f=1)=>({j:a.j+m.j*f,b:a.b+m.b*f});
const mul=(m,f)=>({j:m.j*f,b:m.b*f});
const mnz=m=>!!(m.j||m.b);
const curOf=k=>S.cur[k]==="b"?"b":"j";
const priceOf=k=>{const p=S.prices[k];return p!=null&&p!==""?+p:null};
const pmoney=k=>{const p=priceOf(k);return p==null?null:curOf(k)==="b"?{j:0,b:p}:{j:p,b:0}};
const rate=()=>S.rate>0?S.rate:null; // Jil per 1 ฿, optional
const feeOf=steps=>({j:S.guar?GUAR_FEE*steps:0,b:0});
// <0 when a is cheaper, >0 when b is cheaper, null when they can't be compared (mixed currencies and no rate)
function mcmp(a,b){if(!a.b&&!b.b)return a.j-b.j;if(!a.j&&!b.j)return a.b-b.b;const r=rate();return r?(a.j+a.b*r)-(b.j+b.b*r):null}
function mgap(a,b){if(!a.b&&!b.b)return fmt(Math.abs(a.j-b.j))+" Jil";if(!a.j&&!b.j)return fmt(Math.abs(a.b-b.b))+" ฿";const r=rate();return r?"≈ "+fmt(Math.abs((a.j+a.b*r)-(b.j+b.b*r)))+" Jil":""}
const mval=m=>{const r=rate();return r?m.j+m.b*r:m.j+m.b*1e9};
function fmtM(m){if(!m||!mnz(m))return "0 Jil";const p=[];if(m.j)p.push(fmt(m.j)+" Jil");if(m.b)p.push(fmt(m.b)+" ฿");return p.join(" + ")}
function bigM(m){const p=[];if(m.j||!m.b)p.push(`<span>${fmt(m.j)} <span class="unit">Jil</span></span>`);if(m.b)p.push(`<span>${fmt(m.b)} <span class="unit">฿</span></span>`);return p.join('<span class="plus">+</span>')}
function shareOf(sub,total){const r=rate();if(r){const t=total.j+total.b*r;return t?(sub.j+sub.b*r)/t:0}if(sub.b)return total.b?sub.b/total.b:0;return total.j?sub.j/total.j:0}
function rawList(acc){return Object.entries(acc).map(([k,q])=>{const pm=pmoney(k);return{k,q,has:!!pm,sub:pm?mul(pm,q):M0()}}).sort((a,b)=>mval(b.sub)-mval(a.sub)||a.k.localeCompare(b.k))}
const sumM=list=>list.reduce((s,x)=>madd(s,x.sub),M0());
const stepsOf=crafts=>Object.values(crafts).reduce((s,x)=>s+x,0);
// price input with a Jil / ฿ switch beside it
function pbox(k,f,ph,extra=""){const p=priceOf(k),c=curOf(k);return `<span class="pbox"><input class="pin ${extra}" data-price="${esc(k)}" data-f="${esc(f)}" inputmode="decimal" placeholder="${esc(ph)}" value="${p??""}" aria-label="ราคา ${esc(ITEMS.get(k)?.name||k)}"><button type="button" class="cur ${c}" data-act="cur" data-k="${esc(k)}" title="สลับสกุลเงิน Jil / บาท" aria-label="สกุลเงิน: ${c==="b"?"บาท":"Jil"} กดเพื่อสลับ">${c==="b"?"฿":"Jil"}</button></span>`}
const guarBox=()=>`<label class="chk guar"><input type="checkbox" data-guar ${S.guar?"checked":""}> ใช้การันตี <span class="ghint">+${GUAR_FEE} Jil/ชิ้นที่คราฟ</span></label>`;
const feeRow=(steps,fee)=>S.guar&&steps?`<div class="tr feerow"><span class="nmcell">ค่าการันตี <span class="ghint">${GUAR_FEE} Jil × ทุกชิ้นที่คราฟ</span></span><span class="r num">×${steps.toLocaleString()}</span><span class="r num">${GUAR_FEE} Jil</span><span class="sum">${fmt(fee.j)} Jil</span><span></span></div>`:"";

/* ---------- cost engine ---------- */
let memo=new Map();
function evalItem(k,stack=[]){
  const self=stack.includes(k);if(!self&&memo.has(k))return memo.get(k);
  const it=ITEMS.get(k),price=pmoney(k),hasP=!!price;
  let craft=null;
  if(it.recipe&&!self){let c=feeOf(1),miss=0;for(const g of it.recipe.ing){const e=evalItem(g.k,[...stack,k]);c=madd(c,e.cost,g.q);miss+=e.miss}craft={cost:c,miss}}
  let use="buy";
  // Auto: buy when a price is set and crafting is unpriced, dearer, or in another currency we can't compare
  if(craft){const m=S.mode[k]||"auto";if(m==="buy")use="buy";else if(m==="craft")use="craft";else{const d=hasP&&!craft.miss?mcmp(price,craft.cost):null;use=hasP&&(craft.miss>0||d===null||d<=0)?"buy":"craft"}}
  const r=use==="craft"?{cost:craft.cost,miss:craft.miss,use,craft,price}:{cost:price||M0(),miss:hasP?0:1,use,craft,price};
  if(!self&&!stack.length)memo.set(k,r);else if(!self&&!it.recipe?.ing.some(g=>g.k===k))memo.set(k,r);
  return r}
function recipeCost(rec){let c=feeOf(1),miss=0;for(const g of rec.ing){const e=evalItem(g.k,[rec.k]);c=madd(c,e.cost,g.q);miss+=e.miss}return{cost:c,miss}}
/* ---------- my stock: what you own is used first, intermediates included ---------- */
const stockOf=k=>S.stock[k]||0;
function setStock(k,v){v=Math.max(0,Math.floor(+v||0));if(v)S.stock[k]=v;else delete S.stock[k];save()}
// entries: [[recipe, qty]]. need = total demand, used = taken from stock, gather = still to buy/farm,
// crafts = pieces you still craft (top recipes included), kind = "mid" (crafted on the way) or "leaf" (bought/farmed)
function plan(entries,useStock=true){
  const pool=useStock?{...S.stock}:{},need={},used={},gather={},crafts={},kind={};
  function want(k,q,stack){const it=ITEMS.get(k),e=evalItem(k,stack),mid=e.use==="craft"&&!!it.recipe&&!stack.includes(k);
    kind[k]=kind[k]||(mid?"mid":"leaf");need[k]=(need[k]||0)+q;
    const have=pool[k]||0,t=Math.min(have,q);if(t){pool[k]=have-t;used[k]=(used[k]||0)+t}
    const rest=q-t;if(!rest)return;
    if(mid){crafts[k]=(crafts[k]||0)+rest;for(const g of it.recipe.ing)want(g.k,g.q*rest,[...stack,k])}else gather[k]=(gather[k]||0)+rest}
  for(const [rec,n] of entries){crafts[rec.k]=(crafts[rec.k]||0)+n;for(const g of rec.ing)want(g.k,g.q*n,[rec.k])}
  return{need,used,gather,crafts,kind}}
const queueEntries=()=>S.queue.map(e=>[RECIPES[e.id],e.n]);
// rows of things to gather (leaf items): need / have (from stock) / rem (still missing) + price of what's missing
function leafRows(P){return Object.keys(P.need).filter(k=>P.kind[k]==="leaf").map(k=>{const pm=pmoney(k),rem=P.gather[k]||0,have=P.used[k]||0,need=P.need[k];
  return{k,q:need,need,have,rem,has:!!pm,sub:pm?mul(pm,rem):M0()}}).sort((a,b)=>(b.rem>0)-(a.rem>0)||mval(b.sub)-mval(a.sub)||a.k.localeCompare(b.k))}
const midRows=P=>Object.keys(P.need).filter(k=>P.kind[k]==="mid").map(k=>({k,need:P.need[k],have:P.used[k]||0,craft:P.crafts[k]||0})).sort((a,b)=>a.k.localeCompare(b.k));
const planCost=P=>{let c=feeOf(stepsOf(P.crafts));for(const [k,q] of Object.entries(P.gather)){const pm=pmoney(k);if(pm)c=madd(c,pm,q)}return c};
const usedAny=P=>Object.keys(P.used).length>0;
function expand(rec,n,acc,crafts){crafts[rec.k]=(crafts[rec.k]||0)+n;
  (function walk(ings,mult,stack){for(const g of ings){const q=g.q*mult;const e=evalItem(g.k,stack);const it=ITEMS.get(g.k);
    if(e.use==="craft"&&it.recipe){crafts[g.k]=(crafts[g.k]||0)+q;walk(it.recipe.ing,q,[...stack,g.k])}else acc[g.k]=(acc[g.k]||0)+q}})(rec.ing,n,[rec.k])}

/* ---------- ui state ---------- */
let U={view:"recipes",tab:"Wolf",q:"",type:"",sel:0,qty:1,open:new Set(),pbFilter:"all",pbQ:"",showDetail:false,useSel:"",useQ:"",useCat:"all",useTab:"",useDirect:false,useShow:false,invMode:"view",buyNames:false};
try{const s=JSON.parse(localStorage.getItem(LS+"-ui")||"{}");Object.assign(U,{tab:s.tab||U.tab,sel:s.sel??U.sel,view:s.view||U.view,useSel:s.useSel||"",setCls:s.setCls||"",setA:s.setA||""})}catch(e){}
const saveUI=()=>{try{localStorage.setItem(LS+"-ui",JSON.stringify({tab:U.tab,sel:U.sel,view:U.view,useSel:U.useSel,setCls:U.setCls,setA:U.setA}))}catch(e){}};

function render(){memo=new Map();
  const sameView=render._view===U.view;render._view=U.view;
  const keep=sameView?["rail","list","detail","page"].map(c=>{const el=document.querySelector("#main ."+c);return el?[c,el.scrollTop,el.scrollLeft]:null}).filter(Boolean):[];
  const tblX=sameView?[...document.querySelectorAll("#main .tbl")].map(t=>t.scrollLeft):[];const focus=document.activeElement?.dataset?.f;const caret=document.activeElement?.selectionStart;
  document.querySelectorAll("#views button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===U.view));
  const main=document.getElementById("main");main.className=U.view==="recipes"?"v-recipes":U.view==="uses"?"v-uses":"v-other";
  main.innerHTML=U.view==="recipes"?viewRecipes():U.view==="uses"?viewUses():U.view==="prices"?viewPrices():U.view==="sets"?viewSets():viewQueue();
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
    const c=recipeCost(r);html+=`<button class="row" data-act="sel" data-id="${r.id}" aria-current="${r.id===U.sel}">${badge(ITEMS.get(r.k))}<span class="nm">${esc(r.name)}</span>${r.src==="w"?'<span class="tag wiki">wiki</span>':""}<span class="cost${c.miss?" miss":""}">${c.miss?(mnz(c.cost)?"≥"+fmtM(c.cost):"—"):fmtM(c.cost)}</span></button>`}
  if(!list.length)html=`<div class="empty-note">ไม่พบสูตรที่ตรงกับ “${esc(U.q)}” ใน${U.tab==="*"?"ทุกหมวด":esc(TAB_TH[U.tab])}${U.type?" ("+TYPE_TH[U.type]+")":""}</div>`;
  if(elsewhere)html+=`<div style="padding:10px 14px"><button class="chip" data-act="tab" data-t="*" data-keepq="1">พบอีก ${elsewhere} สูตรในหมวดอื่น · ค้นหาทุกหมวด</button></div>`;
  const types=[["","ทั้งหมด"],["W","อาวุธ"],["A","ชุด"],["C","หมวก"]];
  const index=`<section class="index"><div class="search"><input class="inp" id="q" data-f="q" type="search" placeholder="ค้นหาใน${U.tab==="*"?"ทุกหมวด":esc(TAB_TH[U.tab].split(" ·")[0])}…" value="${esc(U.q)}" autocomplete="off"><div class="chips">${types.map(([v,l])=>`<button class="chip" data-act="type" data-t="${v}" aria-pressed="${U.type===v}">${l}</button>`).join("")}</div></div><div class="list">${html}</div></section>`;
  return rail+index+`<section class="detail" id="detail" ${U.showDetail?"":'data-closed="1"'}>${viewDetail()}</section>`}
const railBtn=(t,n)=>`<button data-act="tab" data-t="${t}" aria-current="${U.tab===t}">${esc(TAB_TH[t])} <span class="n">${n}</span></button>`;

function viewDetail(){
  const r=RECIPES[U.sel];if(!r)return `<div class="empty-note">เลือกสูตรทางซ้ายเพื่อดูรายละเอียด</div>`;
  const out=ITEMS.get(r.k),n=Math.max(1,U.qty|0);
  const rc=recipeCost(r);const P=plan([[r,n]]),crafts=P.crafts;
  const raws=leafRows(P).filter(x=>x.rem>0).map(x=>({...x,q:x.rem})),rawT=sumM(raws),missing=raws.filter(x=>!x.has);
  const steps=stepsOf(crafts),fee=feeOf(steps),total=madd(rawT,fee),full=planCost(plan([[r,n]],false)),hasStock=usedAny(P);
  const sell=pmoney(r.k);
  let margin="";if(sell&&!missing.length){const sv=mul(sell,n),d=mcmp(sv,full);margin=d===null?`<div class="sub">ราคาขาย ${fmtM(sv)} · คนละสกุลเงิน ตั้งอัตราแลกเปลี่ยนในสมุดราคาเพื่อคิดกำไร</div>`:`<div class="sub ${d>=0?"":"warn"}">ราคาขาย ${fmtM(sv)} · ${d>=0?"กำไร":"ขาดทุน"} ${mgap(sv,full)}</div>`}
  const usedChips=hasStock?`<div class="stocknote"><span>หักจากของที่มีแล้ว:</span>${Object.entries(P.used).map(([k,q])=>`<button class="chip" data-act="stockedit" data-k="${esc(k)}">${esc(ITEMS.get(k).name)} ×${q.toLocaleString()}</button>`).join("")}</div>`:"";
  const inQ=S.queue.find(x=>x.id===r.id);
  return `<div class="dwrap">
  <button class="btn ghost back" data-act="close">← กลับไปที่รายการ</button>
  <div class="dhead">${badge(out)}<div class="dtitle"><h2>${esc(r.name)}</h2><div class="crumbs"><span>${esc(TAB_TH[r.tab])}</span>${r.group?`<span>· ${esc(r.group)}</span>`:""}${r.type?`<span class="tag">${TYPE_TH[r.type]}</span>`:""}${r.src==="w"?'<span class="tag wiki">สูตรจาก wiki</span>':""}</div></div>
   <div class="qty" title="จำนวนที่จะคราฟ"><button data-act="qty" data-d="-1" aria-label="ลด">−</button><input id="qty" data-f="qty" class="num" inputmode="numeric" value="${n}" aria-label="จำนวน"><button data-act="qty" data-d="1" aria-label="เพิ่ม">+</button></div>
   ${out.usedIn.size?`<button class="btn" data-act="uses" data-k="${esc(r.k)}">ใช้ทำอะไรต่อได้</button>`:""}${uplBtn(r.k,imgSrc(r.k)?"เปลี่ยนรูป":"เพิ่มรูป")}<button class="btn pri" data-act="addq">${inQ?"เพิ่มอีก "+n+" ในรายการ":"เพิ่มในรายการคราฟ"}</button></div>
  <div class="totals">
    <div><label>${hasStock?"ยังต้องจ่าย":"ต้นทุนรวม"} ${n>1?"("+n+" ชิ้น)":""}</label><div class="big">${bigM(total)}</div>${hasStock?`<div class="sub">ต้นทุนเต็มถ้าไม่มีของเลย ${fmtM(full)}</div>`:""}<div class="sub">${n>1?"ชิ้นละ "+fmtM(mul(full,1/n))+(hasStock?" (เต็ม)":""):"ต่อ 1 ชิ้น"}${missing.length?' · <span class="warn">ยังไม่ครบ</span>':""}</div>${S.guar&&steps?`<div class="sub">รวมค่าการันตี ${fmt(fee.j)} Jil</div>`:""}${margin}</div>
    <div><label>วัตถุดิบที่ยังต้องหา</label><div class="mid">${raws.length}</div><div class="sub">${raws.reduce((s,x)=>s+x.q,0).toLocaleString()} ชิ้นรวม</div></div>
    <div><label>ครั้งที่ต้องคราฟ</label><div class="mid">${steps}</div><div class="sub">${Object.keys(crafts).length} สูตร</div>${guarBox()}</div>
    <div><label>ยังไม่มีราคา</label><div class="mid ${missing.length?"warn":""}">${missing.length}</div><div class="sub">${missing.length?"กรอกในช่องประ":"ครบทุกรายการ"}</div></div>
  </div>
  <div class="sec"><h3>โครงสูตร <span class="hint">กดลูกศรเพื่อดูสูตรย่อย · ช่อง “ทำ” เลือกว่าจะคราฟเองหรือซื้อ</span></h3>
   <div class="tbl"><div class="tr h"><span>วัตถุดิบ</span><span class="r">จำนวน</span><span>ทำ</span><span class="r">ราคา/ชิ้น</span><span class="r">รวม</span></div>${tree(r.ing,n,[r.k],1,String(r.id))}
   <div class="tr" style="font-weight:600"><span>ผลรวมต้นทุน${hasStock?' <span class="ghint">(ไม่หักของที่มี)</span>':""}</span><span></span><span></span><span></span><span class="sum">${fmtM(mul(rc.cost,n))}</span></div>
   <div class="tr"><span class="nmcell">${badge(out,1)} ราคาขาย/ซื้อ ${esc(r.name)}</span><span></span><span></span><span>${pbox(r.k,"sell-"+r.k,"ไม่ระบุ")}</span><span class="sum">${sell?fmtM(mul(sell,n)):"—"}</span></div></div></div>
  <div class="sec shop"><h3>รายการต้องซื้อ/ฟาร์ม <span class="hint">วัตถุดิบพื้นฐานที่ยังขาด หักของที่มีแล้ว เรียงตามสัดส่วนต้นทุน</span><span class="legend"><button class="chip" data-act="copyshop">คัดลอกรายการ</button></span></h3>${usedChips}
   <div class="tbl"><div class="tr h"><span>วัตถุดิบ</span><span class="r">จำนวน</span><span class="r">ราคา/ชิ้น</span><span class="r">รวม</span><span>สัดส่วน</span></div>
   ${raws.map(x=>{const it=ITEMS.get(x.k);return `<div class="tr"><span class="nmcell">${badge(it,1)}<a data-act="item" data-k="${esc(x.k)}">${esc(it.name)}</a></span><span class="r num">×${x.q.toLocaleString()}</span><span>${pbox(x.k,"s-"+x.k,"ใส่ราคา",x.has?"":"empty")}</span><span class="sum ${x.has?"":"miss"}">${x.has?fmtM(x.sub):"—"}</span><span class="share"><i style="width:${shareOf(x.sub,rawT)*100}%"></i></span></div>`}).join("")}${feeRow(steps,fee)}</div></div>
  ${usedInBlock(out)}
  </div>`}
function tree(ings,mult,stack,lvl,path){let h="";
  for(const g of ings){const it=ITEMS.get(g.k),q=g.q*mult,e=evalItem(g.k,stack),p=path+"/"+g.k;const can=!!it.recipe&&!stack.includes(g.k);
    const opened=U.open.has(p);const m=S.mode[g.k]||"auto";
    const modeHtml=can?`<span class="mode" role="group" aria-label="วิธีได้มา">${[["auto","อัตโนมัติ"],["craft","คราฟ"],["buy","ซื้อ"]].map(([v,l])=>`<button data-act="mode" data-k="${esc(g.k)}" data-m="${v}" aria-pressed="${m===v}" title="${l}">${l==="อัตโนมัติ"?"Auto":l}</button>`).join("")}</span>`:`<span class="mode na">ซื้อ/ฟาร์ม</span>`;
    let cmp="";if(can&&e.craft&&e.price&&!e.craft.miss){const d=mcmp(e.craft.cost,e.price),gap=mgap(e.craft.cost,e.price);cmp=d===null?`<span class="cheaper">คนละสกุลเงิน</span>`:d<0?`<span class="cheaper ok">คราฟถูกกว่า ${gap}</span>`:d>0?`<span class="cheaper bad">ซื้อถูกกว่า ${gap}</span>`:""}
    h+=`<div class="tr lvl${Math.min(lvl,5)}"><span class="nmcell" style="padding-left:${(lvl-1)*18}px"><button class="tw" data-act="tw" data-p="${esc(p)}" ${can?"":"disabled"} aria-label="${opened?"ซ่อน":"แสดง"}สูตรย่อย" aria-expanded="${opened}">${can?(opened?"▾":"▸"):""}</button>${badge(it,1)}<a data-act="item" data-k="${esc(g.k)}">${esc(it.name)}</a></span>
     <span class="r num">×${q.toLocaleString()}</span><span>${modeHtml}</span>
     <span>${pbox(g.k,"t-"+p,e.use==="craft"?fmtM(e.cost):"ใส่ราคา",!e.price&&e.use==="buy"?"empty":"")}</span>
     <span><span class="sum ${e.miss?"miss":""}" style="display:block">${mnz(e.cost)||!e.miss?fmtM(mul(e.cost,q)):"—"}</span>${e.use==="craft"?`<span class="via">คราฟเอง${e.miss?" · ขาดราคา":""}</span>`:cmp?`<span class="via">${cmp}</span>`:""}</span></div>`;
    if(can&&opened)h+=tree(it.recipe.ing,q,[...stack,g.k],lvl+1,p)}
  return h}
function usedInBlock(it){const ids=[...it.usedIn];if(!ids.length)return "";
  return `<div class="sec"><h3>${esc(it.name)} ใช้ทำอะไรได้อีก <span class="hint">ใช้ตรง ${ids.length} สูตร · รวมทางอ้อม ${reach(it.k).size} สูตร</span><span class="legend"><button class="chip" data-act="uses" data-k="${esc(it.k)}">ดูทั้งหมดรวมทางอ้อม →</button></span></h3><div class="used">${ids.slice(0,60).map(id=>{const r=RECIPES[id];return `<button data-act="sel" data-id="${id}">${badge(ITEMS.get(r.k),1)}${esc(r.name)}</button>`}).join("")}</div></div>`}

/* ---------- reverse lookup: what an item can be crafted into ---------- */
const REACH=new Map(),NEED=new Map();
// every recipe that consumes k, directly (depth 1) or through crafted intermediates; path = items from k up to what that recipe consumes
function reach(k){if(REACH.has(k))return REACH.get(k);
  const out=new Map(),seen=new Set([k]);let frontier=[[k,[k]]],depth=1;
  while(frontier.length&&depth<15){const next=[];
    for(const [x,path] of frontier)for(const id of ITEMS.get(x).usedIn){if(out.has(id))continue;const r=RECIPES[id];out.set(id,{depth,path});
      if(!seen.has(r.k)){seen.add(r.k);next.push([r.k,[...path,r.k]])}}
    frontier=next;depth++}
  REACH.set(k,out);return out}
// how many k one craft of rec consumes when every intermediate is crafted yourself
function needOf(rec,k,stack){const key=rec.id+"|"+k;if(NEED.has(key))return NEED.get(key);let n=0;
  for(const g of rec.ing){if(g.k===k)n+=g.q;else{const it=ITEMS.get(g.k);if(it.recipe&&it.recipe.id!==rec.id&&!stack.includes(g.k))n+=g.q*needOf(it.recipe,k,[...stack,g.k])}}
  NEED.set(key,n);return n}
const USE_CATS=[["all","ทั้งหมด"],["base","วัตถุดิบพื้นฐาน"],["craft","คราฟได้"],["gear","อุปกรณ์"]];
function useList(){const q=norm(U.useQ);
  return [...ITEMS.values()].filter(it=>it.usedIn.size>0&&(!q||it.k.includes(q))&&(U.useCat==="all"||(U.useCat==="base"&&!it.recipe)||(U.useCat==="craft"&&it.recipe&&it.cat==="m")||(U.useCat==="gear"&&"wac".includes(it.cat))))
    .sort((a,b)=>reach(b.k).size-reach(a.k).size||a.name.localeCompare(b.name))}
function viewUses(){
  const list=useList();
  if(!ITEMS.has(U.useSel)&&list[0]&&window.innerWidth>1000)U.useSel=list[0].k;
  const rows=list.map(it=>`<button class="row" data-act="usel" data-k="${esc(it.k)}" aria-current="${it.k===U.useSel}">${badge(it)}<span class="nm">${esc(it.name)}</span><span class="cost" title="ใช้ตรง / รวมทางอ้อม">${it.usedIn.size} · ${reach(it.k).size}</span></button>`).join("");
  return `<section class="index"><div class="search"><input class="inp" id="uq" data-f="uq" type="search" placeholder="ค้นหาวัตถุดิบหรือไอเทม…" value="${esc(U.useQ)}" autocomplete="off">
    <div class="chips">${USE_CATS.map(([v,l])=>`<button class="chip" data-act="ucat" data-t="${v}" aria-pressed="${U.useCat===v}">${l}</button>`).join("")}</div>
    <div style="font-size:11px;color:var(--ink3)">ตัวเลขขวา = ใช้ตรง · รวมทางอ้อม (จำนวนสูตร)</div></div>
    <div class="list">${rows||`<div class="empty-note">ไม่พบไอเทมที่ตรงกับ “${esc(U.useQ)}”</div>`}</div></section>
    <section class="detail" id="detail" ${U.useShow?"":'data-closed="1"'}>${viewUseDetail()}</section>`}
function viewUseDetail(){
  const it=ITEMS.get(U.useSel);if(!it)return `<div class="empty-note">เลือกวัตถุดิบทางซ้ายเพื่อดูว่าใช้คราฟอะไรได้บ้าง</div>`;
  const R=reach(it.k);
  const all=[...R.entries()].map(([id,info])=>{const r=RECIPES[id];return{r,...info,need:needOf(r,it.k,[r.k])}});
  const ti=t=>TAB_ORDER.indexOf(t);
  const tabCount={};all.forEach(x=>tabCount[x.r.tab]=(tabCount[x.r.tab]||0)+1);
  if(U.useTab&&!tabCount[U.useTab])U.useTab="";
  const shown=all.filter(x=>(!U.useTab||x.r.tab===U.useTab)&&(!U.useDirect||x.depth===1))
    .sort((a,b)=>ti(a.r.tab)-ti(b.r.tab)||a.depth-b.depth||a.r.id-b.r.id);
  const direct=all.filter(x=>x.depth===1).length,maxDepth=all.reduce((m,x)=>Math.max(m,x.depth),0);
  const pm=pmoney(it.k),has=!!pm;
  const src=it.recipe?`<div class="crumbs" style="margin-top:6px">คราฟได้จาก: ${it.recipe.ing.map(g=>`<a class="ulink" data-act="usel" data-k="${esc(g.k)}">${esc(ITEMS.get(g.k).name)}</a> ×${g.q}`).join(" · ")}</div>`:"";
  let body="",grp=null;
  for(const x of shown){
    if(x.r.tab!==grp){grp=x.r.tab;body+=`<div class="tr gh"><span>${esc(TAB_TH[grp])}</span><span></span><span></span><span></span><span></span><span class="r num">${tabCount[grp]} สูตร</span></div>`}
    const via=x.depth===1?`<span class="direct">ใช้ตรง</span>`:x.path.slice(1).map(k=>`<a class="ulink" data-act="usel" data-k="${esc(k)}">${esc(ITEMS.get(k).name)}</a>`).join(" → ");
    body+=`<div class="tr"><span class="nmcell">${badge(ITEMS.get(x.r.k),1)}<a data-act="openrec" data-id="${x.r.id}">${esc(x.r.name)}</a></span>
      <span style="font-size:12px;color:var(--ink2)">${x.r.type?TYPE_TH[x.r.type]:esc(x.r.group||"")}</span>
      <span class="r num" title="ขั้นที่">${x.depth}</span><span class="r num">×${x.need.toLocaleString()}</span>
      <span class="sum ${has?"":"miss"}">${has?fmtM(mul(pm,x.need)):"—"}</span><span class="path">${via}</span></div>`}
  return `<div class="dwrap">
  <button class="btn ghost back" data-act="uclose">← กลับไปที่รายการ</button>
  <div class="dhead">${badge(it)}<div class="dtitle"><h2>${esc(it.name)}</h2><div class="crumbs"><span class="tag">${CAT_TH[it.cat]||"วัตถุดิบ"}</span>${it.recipe?"<span>คราฟได้</span>":"<span>ซื้อ/ฟาร์ม</span>"}</div>${src}</div>
   ${it.recipe?`<button class="btn" data-act="openrec" data-id="${it.recipe.id}">เปิดสูตรของชิ้นนี้</button>`:""}</div>
  <div class="totals">
    <div><label>ใช้คราฟต่อได้ทั้งหมด</label><div class="big">${all.length} <span style="font-size:14px">สูตร</span></div><div class="sub">ใช้ตรง ${direct} · ทางอ้อม ${all.length-direct}</div></div>
    <div><label>อาชีพ/หมวดที่ใช้</label><div class="mid">${Object.keys(tabCount).length}</div><div class="sub">${Object.keys(tabCount).sort((a,b)=>ti(a)-ti(b)).slice(0,4).map(t=>TAB_TH[t].split(" ·")[0]).join(", ")}${Object.keys(tabCount).length>4?"…":""}</div></div>
    <div><label>ไกลสุด</label><div class="mid">${maxDepth} ขั้น</div><div class="sub">นับจากชิ้นนี้ถึงสูตรปลายทาง</div></div>
    <div><label>ราคา/ชิ้น</label><div style="margin-top:4px">${pbox(it.k,"up-"+it.k,"ใส่ราคา",has?"":"empty")}</div><div class="sub">ใช้คำนวณคอลัมน์มูลค่า</div></div>
  </div>
  <div class="sec uses"><h3>${esc(it.name)} ใช้คราฟอะไรได้บ้าง <span class="hint">“ใช้ต่อ 1 ชิ้น” นับรวมทุกขั้น ถ้าคราฟของกลางทางเอง · กดชื่อของกลางทางเพื่อไล่ต่อ</span></h3>
   <div class="chips"><button class="chip" data-act="utab" data-t="" aria-pressed="${!U.useTab}">ทุกหมวด ${all.length}</button>${Object.keys(tabCount).sort((a,b)=>ti(a)-ti(b)).map(t=>`<button class="chip" data-act="utab" data-t="${t}" aria-pressed="${U.useTab===t}">${esc(TAB_TH[t].split(" ·")[0])} ${tabCount[t]}</button>`).join("")}
    <span style="flex:1"></span><button class="chip" data-act="udirect" aria-pressed="${U.useDirect}">เฉพาะใช้ตรง</button></div>
   ${all.length?`<div class="tbl"><div class="tr h"><span>สูตรปลายทาง</span><span>ประเภท</span><span class="r">ขั้น</span><span class="r">ใช้ต่อ 1 ชิ้น</span><span class="r">มูลค่า</span><span>เส้นทาง</span></div>${body||'<div class="empty-note">ไม่มีสูตรในตัวกรองนี้</div>'}</div>`:`<div class="empty-note">${esc(it.name)} ไม่ได้ใช้คราฟอะไรต่อ</div>`}</div>
  </div>`}

/* ---------- price book ---------- */
function viewPrices(){
  const q=norm(U.pbQ);const all=[...ITEMS.values()].sort((a,b)=>b.usedIn.size-a.usedIn.size||a.name.localeCompare(b.name));
  const rows=all.filter(it=>{const has=S.prices[it.k]!=null&&S.prices[it.k]!=="";
    if(U.pbFilter==="missing"&&has)return false;if(U.pbFilter==="priced"&&!has)return false;if(U.pbFilter==="craft"&&!it.recipe)return false;if(U.pbFilter==="noimg"&&imgSrc(it.k))return false;if(U.pbFilter==="base"&&(it.recipe||it.cat!=="m"))return false;if(U.pbFilter==="stock"&&!stockOf(it.k))return false;
    return !q||it.k.includes(q)});
  const f=[["all","ทั้งหมด"],["missing","ยังไม่มีราคา"],["priced","มีราคาแล้ว"],["base","วัตถุดิบพื้นฐาน"],["craft","คราฟได้"],["noimg","ยังไม่มีรูป"],["stock","มีในคลัง"]];
  return `<section class="page"><div class="pwrap pb">
   <div class="intro"><div><h2>สมุดราคา</h2><p>ใส่ราคาต่อชิ้นครั้งเดียว ทุกสูตรจะคำนวณตามทันที กดปุ่มข้างช่องราคาเพื่อสลับว่าเป็น <b>Jil</b> (เงินในเกม) หรือ <b>฿</b> (เงินจริง) ยอดรวมจะแยกสองสกุลเสมอ ไอเทมที่คราฟได้จะแสดงต้นทุนคราฟเทียบกับราคาที่ใส่</p><p>${ASSETS?"รูปไอเทม: อัปโหลดทีละแถว หรือเลือกหลายไฟล์พร้อมกันโดยตั้งชื่อไฟล์ตามชื่อไอเทม เช่น Zinc Ore.png ระบบจะจับคู่ให้เอง กด “ส่งออกแพ็ก .zip” เพื่อเก็บราคาและรูปทั้งหมดไว้ในเครื่อง (โฟลเดอร์ images/ แยกไว้) แล้วนำเข้ากลับได้ทุกเมื่อ ("+[...ITEMS.keys()].filter(imgSrc).length+"/"+ITEMS.size+" มีรูป) รูปในโฟลเดอร์ images/ ของ repo จะโหลดให้อัตโนมัติ":"รูปไอเทมที่เจ้าของหน้าใส่ไว้จะแสดงที่นี่"}</p></div>
    <div class="ptools">${ASSETS?`<label class="btn upl" style="border-style:solid;font-size:14px;padding:8px 14px">อัปโหลดรูปหลายไฟล์<input type="file" id="bulkimg" accept="image/*" multiple></label>`:""}<button class="btn" data-act="zipout">ส่งออกแพ็ก .zip</button><label class="btn upl" style="border-style:solid;font-size:14px;padding:8px 14px">นำเข้าแพ็ก .zip<input type="file" id="packin" accept=".zip,.json,application/zip,application/json"></label><label class="btn upl" style="border-style:solid;font-size:14px;padding:8px 14px">นำเข้าจากโฟลเดอร์<input type="file" id="dirin" webkitdirectory multiple></label><button class="btn ghost" data-act="export">คัดลอกราคา (ข้อความ)</button><button class="btn ghost" data-act="import">วางราคา</button></div></div>
   <div class="settings"><label class="chk">อัตราแลกเปลี่ยน 1 ฿ = <input class="pin rate" id="rate" data-f="rate" inputmode="decimal" placeholder="ไม่ระบุ" value="${S.rate||""}"> Jil</label><span class="ghint">ไม่บังคับ ใช้เทียบราคาข้ามสกุลและคิดกำไรเท่านั้น ยอดรวมยังแยก Jil กับ ฿ เหมือนเดิม</span>${guarBox()}</div>
   <div class="ptools"><input class="inp" id="pbq" data-f="pbq" type="search" placeholder="ค้นหาไอเทม…" value="${esc(U.pbQ)}"><div class="chips">${f.map(([v,l])=>`<button class="chip" data-act="pbf" data-t="${v}" aria-pressed="${U.pbFilter===v}">${l}</button>`).join("")}</div><span class="hint" style="color:var(--ink3);font-size:12px">${rows.length} รายการ</span></div>
   <div class="tbl"><div class="tr h"><span>ไอเทม</span><span>ประเภท</span><span class="r">ใช้ใน</span><span class="r">ต้นทุนคราฟ</span><span class="r">ราคา/ชิ้น</span><span>เทียบ</span><span class="r">มีแล้ว</span><span>รูป</span></div>
   ${rows.slice(0,400).map(it=>{const has=S.prices[it.k]!=null&&S.prices[it.k]!=="";let cc="",cmp="";
     if(it.recipe){const c=recipeCost(it.recipe);cc=c.miss?(mnz(c.cost)?"≥"+fmtM(c.cost):"—"):fmtM(c.cost);if(has&&!c.miss){const d=mcmp(c.cost,pmoney(it.k));cmp=d===null?`<span class="cheaper">คนละสกุลเงิน</span>`:d<0?`<span class="cheaper ok">คราฟถูกกว่า</span>`:d>0?`<span class="cheaper bad">ซื้อถูกกว่า</span>`:""}}
     return `<div class="tr"><span class="nmcell">${badge(it,1)}${it.recipe?`<a data-act="openrec" data-id="${it.recipe.id}">${esc(it.name)}</a>`:it.usedIn.size?`<a data-act="uses" data-k="${esc(it.k)}">${esc(it.name)}</a>`:esc(it.name)}</span><span style="font-size:12px;color:var(--ink2)">${CAT_TH[it.cat]||""}</span><span class="r num">${it.usedIn.size?`<a class="ulink" data-act="uses" data-k="${esc(it.k)}" title="ดูว่าใช้คราฟอะไรได้บ้าง">${it.usedIn.size}</a>`:""}</span><span class="r num" style="color:var(--ink2)">${cc}</span><span>${pbox(it.k,"pb-"+it.k,"ใส่ราคา",has?"":"empty")}</span><span>${cmp}</span><span><input class="pin stkin" data-stock="${esc(it.k)}" data-f="ps-${esc(it.k)}" inputmode="numeric" placeholder="0" value="${stockOf(it.k)||""}" aria-label="มี ${esc(it.name)} แล้วกี่ชิ้น"></span><span class="imgcell">${uplBtn(it.k,imgSrc(it.k)?"เปลี่ยน":"เพิ่มรูป")}${IMG[it.k]&&ASSETS?`<button class="x" data-act="imgdel" data-k="${esc(it.k)}" aria-label="ลบรูป ${esc(it.name)}">×</button>`:""}</span></div>`}).join("")}
   ${rows.length>400?`<div class="empty-note">แสดง 400 รายการแรก ใช้ช่องค้นหาเพื่อหาที่เหลือ</div>`:""}${!rows.length?`<div class="empty-note">ไม่มีไอเทมในตัวกรองนี้</div>`:""}</div></div></section>`}

/* ---------- inventory-style preview of everything to gather ---------- */
const qtyShort=n=>n>=10000?(Math.round(n/100)/10).toLocaleString("en-US")+"k":n.toLocaleString("en-US");
const INV_MODES=[["view","ดูข้อมูล"],["count","นับของที่มี"],["buy","เลือกไปรับซื้อ"]];
const INV_HINT={view:"กดช่องเพื่อดูว่าของชิ้นนั้นใช้ทำอะไรได้",count:"กดช่องเพื่อใส่จำนวนที่มีอยู่ หรือกรอกในคอลัมน์ “มีแล้ว” ของตารางด้านล่าง",buy:"กดช่องเพื่อเพิ่มหรือเอาออกจากคลังรับซื้อ (ใช้จำนวนที่ยังขาด)"};
const hasImg=k=>{const s=imgSrc(k);return !!s&&!BAD.has(s)};
const stOf=x=>x.rem<=0?"done":x.have>0?"part":"none";
function slotHtml(x,where){const it=ITEMS.get(x.k),st=stOf(x),inBuy=S.buy.has(x.k)&&x.rem>0;
  const pic=hasImg(x.k)?`<img src="${esc(imgSrc(x.k))}" alt="" loading="lazy" onerror="slotFail(this)">`:`<span class="slot-ini">${esc(initials(it.name))}</span>`;
  const inv=where==="inv",cls="slot"+(inv&&st==="done"?" got":"")+(inv&&st==="part"?" part":"")+(inv&&inBuy?" picked":"");
  const act=where==="buy"?(U.invMode==="buy"?"slot":"uses"):"slot";
  const n=where==="buy"?x.rem:(x.rem>0?x.rem:x.need);
  const tip=`${it.name} · ต้องใช้ ${x.need.toLocaleString()} · มี ${x.have.toLocaleString()} · ขาด ${x.rem.toLocaleString()}`;
  return `<button class="${cls}" data-act="${act}" data-k="${esc(x.k)}" title="${esc(tip)}" aria-label="${esc(tip)}" aria-pressed="${U.invMode==="buy"?inBuy:"false"}">${pic}${inv&&st==="done"?'<span class="slot-ok" aria-hidden="true">✓</span>':""}${inv&&st==="part"?`<span class="slot-have num" aria-hidden="true">มี ${qtyShort(x.have)}</span>`:""}${inv&&inBuy?'<span class="slot-buy" aria-hidden="true">ซื้อ</span>':""}<span class="slot-n num">${qtyShort(n)}</span></button>`}
function invPreview(rows){
  const withImg=rows.filter(x=>hasImg(x.k)),noImg=rows.filter(x=>!hasImg(x.k));
  const done=rows.filter(x=>stOf(x)==="done").length,part=rows.filter(x=>stOf(x)==="part").length,none=rows.length-done-part;
  const buy=rows.filter(x=>S.buy.has(x.k)&&x.rem>0),missRows=rows.filter(x=>x.rem>0);
  const modeBar=`<div class="inv-tools"><span class="mode-seg" role="group" aria-label="โหมดคลังรวม">${INV_MODES.map(([v,l])=>`<button data-act="invmode" data-m="${v}" aria-pressed="${U.invMode===v}">${l}</button>`).join("")}</span><span class="inv-hint">${INV_HINT[U.invMode]}</span></div>`;
  const chip=x=>{const it=ITEMS.get(x.k),st=stOf(x),p=S.buy.has(x.k)&&x.rem>0;return `<button data-act="slot" data-k="${esc(x.k)}" class="${st==="done"?"got":st==="part"?"part":""}${p?" picked":""}">${badge(it,1)}${esc(it.name)} <b class="num">${st==="part"?x.have.toLocaleString()+"/":""}${x.need.toLocaleString()}</b>${st==="done"?' <span class="ok">✓</span>':""}${p?' <span class="buytag">ซื้อ</span>':""}</button>`};
  const buyPanel=(buy.length||U.invMode==="buy")?`<div class="inv inv-buy" id="buyPanel"><div class="inv-head">รับซื้อ<span class="num">${buy.length} ชนิด</span></div>
     ${buy.length?`<div class="inv-grid">${buy.map(x=>slotHtml(x,"buy")).join("")}</div>`:`<div class="empty-note" style="padding:18px">ยังว่างอยู่ กดช่องในคลังรวมเพื่อเลือกของที่จะรับซื้อ</div>`}</div>
     <div class="ptools inv-actions"><button class="btn" data-act="buymiss">เพิ่มของที่ยังขาดทั้งหมด (${missRows.length})</button>${buy.length?`<button class="btn pri" data-act="buysave">บันทึกเป็นรูป</button><button class="btn" data-act="buycopy">คัดลอกรูป</button><label class="chk"><input type="checkbox" id="buynames" ${U.buyNames?"checked":""}> ใส่ชื่อใต้ช่องในรูป</label><button class="btn ghost" data-act="buyclear">ล้างรับซื้อ</button>`:""}</div>`:"";
  return `<div class="sec"><h3>คลังรวม <span class="hint">${rows.length} ชนิด · ครบ ${done} · มีบางส่วน ${part} · ยังไม่มี ${none}</span>${rows.some(x=>x.have)?`<span class="legend"><button class="chip" data-act="invreset">ล้างจำนวนที่มีในรายการนี้</button></span>`:""}</h3>
   ${modeBar}
   <div class="inv-pair">
   <div class="inv-col">${withImg.length?`<div class="inv"><div class="inv-head">คลังรวม<span class="num">ครบ ${withImg.filter(x=>stOf(x)==="done").length}/${withImg.length}</span></div><div class="inv-grid">${withImg.map(x=>slotHtml(x,"inv")).join("")}</div></div>`:""}
   ${noImg.length?`<div class="inv-miss"><div class="inv-miss-h">ยังไม่มีรูป <span class="num">${noImg.length} ชนิด</span></div><div class="used">${noImg.map(chip).join("")}</div></div>`:""}</div>
   <div class="inv-col">${buyPanel}</div></div>
  </div>`}
// small dialog to type how many of an item you own
function stockModal(k){const it=ITEMS.get(k);if(!it)return;const P=plan(queueEntries(),false),need=P.need[k]||0,have=stockOf(k);
  document.getElementById("modal-root").innerHTML=`<div class="modal"><div class="box stockbox"><div class="dhead" style="align-items:center">${badge(it)}<div class="dtitle"><h3 style="margin:0;font:600 18px var(--f-disp)">${esc(it.name)}</h3><div class="crumbs">${need?`ต้องใช้ ${need.toLocaleString()} ชิ้นในรายการคราฟ`:"ไม่ได้ใช้ในรายการคราฟตอนนี้"}</div></div></div>
   <label for="stk" style="font-size:13px;color:var(--ink2)">มีอยู่แล้วกี่ชิ้น</label>
   <div class="qty stkqty"><button data-act="stk" data-d="-1" aria-label="ลด">−</button><input id="stk" data-k="${esc(k)}" class="num" inputmode="numeric" value="${have||""}" placeholder="0" autocomplete="off"><button data-act="stk" data-d="1" aria-label="เพิ่ม">+</button></div>
   <div class="ptools" style="justify-content:space-between">${need?`<button class="btn" data-act="stkfull" data-n="${need}">ครบ (${need.toLocaleString()})</button>`:"<span></span>"}<span class="ptools"><button class="btn ghost" data-act="stkclear">ล้าง</button><button class="btn pri" data-act="mclose">เสร็จ</button></span></div></div></div>`;
  const i=document.getElementById("stk");i.focus();i.select()}
/* ---------- รับซื้อ: draw/* ---------- รับซื้อ: draw the buy list to a PNG (same look as the panel) ---------- */
function loadImg(src){return new Promise(res=>{if(!src)return res(null);const im=new Image();if(/^https?:/i.test(src)&&!src.startsWith(location.origin))im.crossOrigin="anonymous";im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src})}
async function buyCanvas(){
  const acc=plan(queueEntries()).gather;
  const items=Object.entries(acc).filter(([k])=>S.buy.has(k)).map(([k,q])=>({k,q,it:ITEMS.get(k)})).sort((a,b)=>a.it.name.localeCompare(b.it.name));
  if(!items.length)return null;
  try{await document.fonts.ready}catch(e){}
  const css=getComputedStyle(document.documentElement),v=n=>css.getPropertyValue(n).trim();
  const col={bg:v("--panel"),raise:v("--raise"),line:v("--line"),slot:v("--bg"),ink:v("--ink"),ink3:v("--ink3"),jil:v("--jil"),onink:v("--panel")};
  const names=U.buyNames,cols=Math.min(6,items.length),S0=76,G=10,P=22,H=58,NH=names?30:0;
  const rows=Math.ceil(items.length/cols),W=P*2+cols*S0+(cols-1)*G,Ht=H+P+rows*(S0+NH)+(rows-1)*G+P+18;
  const dpr=2,c=document.createElement("canvas");c.width=W*dpr;c.height=Ht*dpr;const x=c.getContext("2d");x.scale(dpr,dpr);
  const rr=(X,Y,w,h,r)=>{x.beginPath();x.roundRect?x.roundRect(X,Y,w,h,r):x.rect(X,Y,w,h)};
  x.fillStyle=col.bg;rr(0,0,W,Ht,14);x.fill();x.strokeStyle=col.line;x.lineWidth=1;rr(.5,.5,W-1,Ht-1,14);x.stroke();
  x.fillStyle=col.raise;x.fillRect(1,1,W-2,H-1);x.fillStyle=col.line;x.fillRect(0,H,W,1);
  x.fillStyle=col.ink;x.font='700 26px "Chakra Petch","IBM Plex Sans Thai",sans-serif';x.textBaseline="middle";x.fillText("รับซื้อ",P,H/2+1);
  x.fillStyle=col.ink3;x.font='500 13px "IBM Plex Sans Thai",sans-serif';x.textAlign="right";x.fillText(items.length+" ชนิด",W-P,H/2+1);x.textAlign="left";
  const imgs=await Promise.all(items.map(o=>hasImg(o.k)?loadImg(imgSrc(o.k)):null));
  items.forEach((o,i)=>{const cx=P+(i%cols)*(S0+G),cy=H+P+Math.floor(i/cols)*(S0+NH+G);
    x.fillStyle=col.slot;rr(cx,cy,S0,S0,10);x.fill();x.strokeStyle=col.line;rr(cx+.5,cy+.5,S0-1,S0-1,10);x.stroke();
    const im=imgs[i];if(im){const pad=9,sz=S0-pad*2,r=Math.min(sz/im.width,sz/im.height),w=im.width*r,h=im.height*r;x.imageSmoothingQuality="high";x.drawImage(im,cx+(S0-w)/2,cy+(S0-h)/2,w,h)}
    else{x.fillStyle=col.ink3;x.font='700 20px "Chakra Petch",sans-serif';x.textAlign="center";x.fillText(initials(o.it.name),cx+S0/2,cy+S0/2);x.textAlign="left"}
    const t=qtyShort(o.q);x.font='600 13px "IBM Plex Mono",monospace';const bw=Math.max(24,x.measureText(t).width+12),bh=22,bx=cx+S0-bw+4,by=cy+S0-bh+4;
    x.fillStyle=col.bg;rr(bx-2,by-2,bw+4,bh+4,13);x.fill();x.fillStyle=col.ink;rr(bx,by,bw,bh,11);x.fill();
    x.fillStyle=col.onink;x.textAlign="center";x.fillText(t,bx+bw/2,by+bh/2+1);x.textAlign="left";
    if(names){x.fillStyle=col.ink;x.font='500 11px "IBM Plex Sans Thai",sans-serif';x.textAlign="center";let n=o.it.name;while(x.measureText(n).width>S0+G-2&&n.length>3)n=n.slice(0,-2)+"…";x.fillText(n,cx+S0/2,cy+S0+15);x.textAlign="left"}});
  x.fillStyle=col.ink3;x.font='400 11px "IBM Plex Sans Thai",sans-serif';const d=new Date();x.fillText("Razan Craft Ledger · "+d.toLocaleDateString("th-TH"),P,Ht-16);
  return c}
async function buyExport(kind){
  let c;try{c=await buyCanvas()}catch(e){toast("สร้างรูปไม่สำเร็จ");return}if(!c)return;
  let blob;try{blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(),"image/png"))}catch(e){toast("สร้างรูปไม่สำเร็จ: มีรูปจากเว็บอื่นที่ไม่อนุญาตให้นำมาวาด");return}
  if(kind==="copy"){try{await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);toast("คัดลอกรูปแล้ว วางในแชตได้เลย")}catch(e){toast("เบราว์เซอร์นี้คัดลอกรูปไม่ได้ ใช้ “บันทึกเป็นรูป” แทน")}return}
  const d=new Date(),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="razan-buy-"+d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+".png";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast("บันทึกรูปแล้ว")}
// an image that fails to load moves its item to the "no image" list on the next render
function slotFail(el){BAD.add(el.getAttribute("src"));clearTimeout(slotFail.t);slotFail.t=setTimeout(render,50)}

/* ---------- queue ---------- */
function viewQueue(){
  if(!S.queue.length)return `<section class="page"><div class="pwrap"><div class="intro"><div><h2>รายการคราฟ</h2><p>ยังไม่มีอะไรในรายการ เปิดสูตรที่ต้องการแล้วกด “เพิ่มในรายการคราฟ” ระบบจะรวมวัตถุดิบทุกสูตรให้เป็นรายการเดียวพร้อมต้นทุนรวม</p></div></div><div><button class="btn pri" data-act="view" data-v="recipes">ไปที่สูตรคราฟ</button></div></div></section>`;
  if(S.have.size){const F=plan(queueEntries(),false);for(const k of S.have)if(F.need[k])S.stock[k]=Math.max(stockOf(k),F.need[k]);S.have.clear();save()} // old ✓ ticks become counts
  let rows="";
  for(const [i,e] of S.queue.entries()){const r=RECIPES[e.id],Pi=plan([[r,e.n]],false),c=planCost(Pi),m=Object.keys(Pi.gather).filter(k=>!pmoney(k)).length;
    rows+=`<div class="tr"><span class="nmcell">${badge(ITEMS.get(r.k),1)}<a data-act="openrec" data-id="${r.id}">${esc(r.name)}</a></span><span><div class="qty" style="height:30px"><button data-act="qq" data-i="${i}" data-d="-1" style="height:30px">−</button><input class="num" data-qi="${i}" data-f="qq-${i}" value="${e.n}" style="height:30px;width:44px"><button data-act="qq" data-i="${i}" data-d="1" style="height:30px">+</button></div></span><span class="sum ${m?"miss":""}">${fmtM(c)}${m?` <small>(ขาดราคา ${m})</small>`:""}</span><button class="x" data-act="qdel" data-i="${i}" aria-label="ลบ">×</button></div>`}
  const P=plan(queueEntries()),crafts=P.crafts,rowsAll=leafRows(P),mids=midRows(P);
  const missRows=rowsAll.filter(x=>x.rem>0),rawT=sumM(rowsAll),steps=stepsOf(crafts),fee=feeOf(steps),total=madd(rawT,fee);
  const full=planCost(plan(queueEntries(),false)),hasStock=usedAny(P),noPrice=missRows.filter(x=>!x.has).length;
  const done=rowsAll.filter(x=>x.rem<=0).length,part=rowsAll.filter(x=>x.rem>0&&x.have>0).length;
  return `<section class="page"><div class="pwrap">
  <div class="intro"><div><h2>รายการคราฟ</h2><p>รวมวัตถุดิบจากทุกสูตรในรายการ หักของที่มีอยู่แล้วก่อน (รวมของกลางทาง) ใช้โหมดคราฟ/ซื้อเดียวกับหน้าสูตร</p></div><div class="ptools"><button class="btn" data-act="copyq">คัดลอกของที่ยังขาด</button><button class="btn ghost" data-act="qclear">ล้างรายการ</button></div></div>
  <div class="totals"><div><label>${hasStock?"ยังต้องจ่าย":"ต้นทุนรวมทั้งรายการ"}</label><div class="big">${bigM(total)}</div>${hasStock?`<div class="sub">ต้นทุนเต็มถ้าไม่มีของเลย ${fmtM(full)}</div>`:""}<div class="sub">${S.queue.length} สูตร${noPrice?' · <span class="warn">ยังไม่ครบ</span>':""}</div>${S.guar&&steps?`<div class="sub">รวมค่าการันตี ${fmt(fee.j)} Jil</div>`:""}</div>
   <div><label>ยังต้องหา</label><div class="mid ${missRows.length?"":"ok"}">${missRows.length} <span style="font-size:13px">ชนิด</span></div><div class="sub">${missRows.reduce((s,x)=>s+x.rem,0).toLocaleString()} ชิ้น · ครบแล้ว ${done} · มีบางส่วน ${part}</div></div>
   <div><label>ครั้งที่ต้องคราฟ</label><div class="mid">${steps}</div><div class="sub">${Object.keys(crafts).length} สูตร</div>${guarBox()}</div>
   <div><label>ยังไม่มีราคา</label><div class="mid ${noPrice?"warn":""}">${noPrice}</div><div class="sub">${noPrice?"กรอกด้านล่าง":"ครบ"}</div></div></div>
  <div class="sec q"><h3>สูตรในรายการ</h3><div class="tbl"><div class="tr h"><span>ไอเทม</span><span>จำนวน</span><span class="r">ต้นทุนเต็ม</span><span></span></div>${rows}</div></div>
  ${invPreview(rowsAll)}
  ${mids.length?`<div class="sec mids"><h3>ของกลางทาง <span class="hint">ของที่ต้องคราฟก่อน ถ้ามีอยู่แล้วกรอกจำนวน เว็บจะไม่แตกสูตรของส่วนนั้นอีก</span></h3><div class="tbl"><div class="tr h"><span>ไอเทม</span><span class="r">ต้องใช้</span><span class="r">มีแล้ว</span><span class="r">ต้องคราฟ</span></div>
   ${mids.map(x=>{const it=ITEMS.get(x.k);return `<div class="tr ${x.craft?"":"done"}"><span class="nmcell">${badge(it,1)}<a data-act="item" data-k="${esc(x.k)}">${esc(it.name)}</a></span><span class="r num">×${x.need.toLocaleString()}</span><span><input class="pin stkin" data-stock="${esc(x.k)}" data-f="sm-${esc(x.k)}" inputmode="numeric" placeholder="0" value="${stockOf(x.k)||""}" aria-label="มี ${esc(it.name)} แล้วกี่ชิ้น"></span><span class="r num">${x.craft?"×"+x.craft.toLocaleString():'<span class="okt">ไม่ต้องคราฟ</span>'}</span></div>`}).join("")}</div></div>`:""}
  <div class="sec shop"><h3>วัตถุดิบรวม  <div class="sec shop stk"><h3>วัตถุดิบรวม <span class="hint">กรอก “มีแล้ว” ได้เลย ราคาคิดเฉพาะส่วนที่ยังขาด</span></h3><div class="tbl"><div class="tr h"><span>วัตถุดิบ</span><span class="r">ต้องใช้</span><span class="r">มีแล้ว</span><span class="r">ยังขาด</span><span class="r">ราคา/ชิ้น</span><span class="r">รวม</span><span>สัดส่วน</span></div>
  ${rowsAll.map(x=>{const it=ITEMS.get(x.k),st=stOf(x);return `<div class="tr ${st}"><span class="nmcell">${badge(it,1)}<a data-act="item" data-k="${esc(x.k)}">${esc(it.name)}</a></span><span class="r num">×${x.need.toLocaleString()}</span><span><input class="pin stkin" data-stock="${esc(x.k)}" data-f="sq-${esc(x.k)}" inputmode="numeric" placeholder="0" value="${stockOf(x.k)||""}" aria-label="มี ${esc(it.name)} แล้วกี่ชิ้น"></span><span class="r num">${st==="done"?'<span class="okt">ครบ</span>':`<span class="${st==="part"?"partt":""}">${x.rem.toLocaleString()}</span>`}</span><span>${pbox(x.k,"q-"+x.k,"ใส่ราคา",x.has||!x.rem?"":"empty")}</span><span class="sum ${x.has||!x.rem?"":"miss"}">${!x.rem?"—":x.has?fmtM(x.sub):"—"}</span><span class="share"><i style="width:${shareOf(x.sub,rawT)*100}%"></i></span></div>`}).join("")}${S.guar&&steps?`<div class="tr feerow"><span class="nmcell">ค่าการันตี <span class="ghint">${GUAR_FEE} Jil × ทุกชิ้นที่คราฟ</span></span><span class="r num">×${steps.toLocaleString()}</span><span></span><span></span><span class="r num">${GUAR_FEE} Jil</span><span class="sum">${fmt(fee.j)} Jil</span><span></span></div>`:""}</div></div></div></section>`}

/* ---------- images ---------- */
const fileKey=n=>norm(n.replace(/\.[a-z0-9]+$/i,"").replace(/[_\-]+/g," "));
async function saveImgs(){}
async function uploadFor(k,file){try{await IDB.put(k,file)}catch(e){toast("บันทึกรูป "+file.name+" ในเบราว์เซอร์ไม่สำเร็จ");return false}
  if(IMG[k])URL.revokeObjectURL(IMG[k]);BLOBS[k]=file;IMG[k]=URL.createObjectURL(file);return true}
async function bulkUpload(files){let ok=0;const miss=[];toast("กำลังอัปโหลด "+files.length+" ไฟล์…");
  for(const f of files){const k=fileKey(f.name);if(!knownKey(k)){miss.push(f.name);continue}if(await uploadFor(k,f))ok++}
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
    const fn="images/"+safeName(itemName(k))+"."+(EXT[b.type]||"png");zip.file(fn,b);imgs[itemName(k)]=fn}catch(e){fail++}}
  const nm=k=>ITEMS.get(k)?.name||k;
  const ledger={app:"Razan Craft Ledger",version:1,exportedAt:new Date().toISOString(),
    prices:Object.fromEntries(Object.entries(S.prices).map(([k,v])=>[nm(k),v])),
    cur:Object.fromEntries(Object.entries(S.cur).map(([k,v])=>[nm(k),v])),guarantee:S.guar,rate:S.rate,
    stock:Object.fromEntries(Object.entries(S.stock).map(([k,v])=>[nm(k),v])),
    mode:Object.fromEntries(Object.entries(S.mode).map(([k,v])=>[nm(k),v])),
    queue:S.queue.map(q=>({recipe:RECIPES[q.id].name,qty:q.n})),sets:S.sets,images:imgs};
  zip.file("ledger.json",JSON.stringify(ledger,null,1));
  zip.file("images/README.txt","วางรูปไอเทมในโฟลเดอร์นี้ ตั้งชื่อไฟล์ตามชื่อไอเทม เช่น Zinc Ore.png แล้วนำเข้าด้วยปุ่ม นำเข้าจากโฟลเดอร์ หรือ นำเข้าแพ็ก .zip\n");
  const blob=await zip.generateAsync({type:"blob"});const d=new Date();
  const fname="razan-ledger-"+d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+".zip";
  try{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fname;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast("ส่งออกแล้ว: ราคา "+Object.keys(S.prices).length+" รายการ รูป "+Object.keys(imgs).length+" รูป"+(fail?" (ดึงรูปไม่ได้ "+fail+")":""))}
  catch(e){toast("บันทึกไฟล์ไม่สำเร็จ")}}
function applyLedger(L){let n=0;const key=x=>{const k=norm(x);return ITEMS.has(k)?k:null};
  for(const [x,v] of Object.entries(L.prices||{})){const k=key(x);if(k&&v!==""&&!isNaN(+v)){S.prices[k]=+v;n++}}
  for(const [x,v] of Object.entries(L.mode||{})){const k=key(x);if(k&&(v==="buy"||v==="craft"))S.mode[k]=v}
  for(const [x,v] of Object.entries(L.cur||{})){const k=key(x);if(k){if(v==="b")S.cur[k]="b";else delete S.cur[k]}}
  if(typeof L.guarantee==="boolean")S.guar=L.guarantee;if(+L.rate>0)S.rate=+L.rate;
  for(const [x,v] of Object.entries(L.stock||{})){const k=key(x);if(k&&+v>=0){if(+v)S.stock[k]=Math.floor(+v);else delete S.stock[k]}}
  if(Array.isArray(L.sets))for(const x of L.sets){const o=cleanSet(x);if(!o)continue;const i=S.sets.findIndex(s=>s.id===x.id);i>=0?S.sets[i]=o:S.sets.push(o)}
  if(Array.isArray(L.queue))for(const q of L.queue){const r=RECIPES.find(r=>norm(r.name)===norm(q.recipe||""));if(r&&q.qty>0){const ex=S.queue.find(e=>e.id===r.id);ex?ex.n=Math.max(ex.n,q.qty):S.queue.push({id:r.id,n:q.qty})}}
  return n}
async function importFiles(entries){ // entries: [{path, blob}]
  let ledger=null,prices=0,ok=0;const miss=[];const imgMap={};
  const lj=entries.find(e=>/(^|\/)ledger\.json$/i.test(e.path))||(entries.length===1&&/\.json$/i.test(entries[0].path)?entries[0]:null);
  if(lj){try{ledger=JSON.parse(await lj.blob.text());prices=applyLedger(ledger.prices?ledger:{prices:ledger});for(const [nm,fp] of Object.entries(ledger.images||{}))imgMap[fp.toLowerCase()]=nm}catch(e){toast("อ่าน ledger.json ไม่ได้")}}
  const imgs=entries.filter(e=>/\.(png|jpe?g|gif|webp|svg)$/i.test(e.path));
  if(imgs.length&&!ASSETS)toast("เบราว์เซอร์นี้เก็บรูปไม่ได้ นำเข้าเฉพาะราคา");
  else for(const e of imgs){const tail=e.path.split("/").slice(-2).join("/").toLowerCase();const nm=imgMap[tail]||imgMap["images/"+e.path.split("/").pop().toLowerCase()];
    const k=nm?norm(nm):fileKey(e.path.split("/").pop());if(!knownKey(k)){miss.push(e.path.split("/").pop());continue}
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
function openUses(k){U.view="uses";U.useSel=k;U.useShow=true;U.useTab="";U.useQ="";render._scrolled=false;render();document.getElementById("detail")?.scrollTo(0,0)}
const listText=acc=>Object.entries(acc).map(([k,q])=>`${ITEMS.get(k).name} x${q}`).join("\n");
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(a==="theme"){const order=["dark","light","auto"];setTheme(order[(order.indexOf(curTheme())+1)%3]);return}
  if(a==="view"){U.view=b.dataset.v;render()}
  else if(a==="tab"){U.tab=b.dataset.t;if(!b.dataset.keepq)U.q="";const first=RECIPES.find(r=>U.tab==="*"||r.tab===U.tab);if(first&&window.innerWidth>1000)U.sel=first.id;render();document.querySelector(".list")?.scrollTo(0,0)}
  else if(a==="type"){U.type=b.dataset.t;render()}
  else if(a==="sel"||a==="openrec"){U.sel=+b.dataset.id;U.qty=1;U.open=new Set();U.showDetail=true;if(a==="openrec"){U.view="recipes";U.tab=RECIPES[U.sel].tab;render._scrolled=false}render();document.getElementById("detail")?.scrollTo(0,0)}
  else if(a==="close"){U.showDetail=false;render()}
  else if(a==="item"){const it=ITEMS.get(b.dataset.k);if(it.recipe){U.sel=it.recipe.id;U.tab=it.recipe.tab;U.qty=1;U.open=new Set();render._scrolled=false;render();document.getElementById("detail")?.scrollTo(0,0)}else openUses(it.k)}
  else if(a==="uses")openUses(b.dataset.k);
  else if(a==="cur"){const k=b.dataset.k;if(S.cur[k]==="b")delete S.cur[k];else S.cur[k]="b";save();render()}
  else if(a==="invmode"){U.invMode=b.dataset.m;render()}
  else if(a==="slot"){const k=b.dataset.k;if(U.invMode==="count")stockModal(k);else if(U.invMode==="buy"){S.buy.has(k)?S.buy.delete(k):S.buy.add(k);save();render()}else openUses(k)}
  else if(a==="buymiss"){let n=0;for(const [k,q] of Object.entries(plan(queueEntries()).gather))if(q>0&&!S.buy.has(k)){S.buy.add(k);n++}save();render();toast(n?"เพิ่ม "+n+" ชนิดในรับซื้อ":"ของที่ขาดอยู่ในรับซื้อครบแล้ว")}
  else if(a==="stockedit")stockModal(b.dataset.k);
  else if(a==="stk"){const i=document.getElementById("stk");const v=Math.max(0,(parseInt(i.value)||0)+ +b.dataset.d);i.value=v||"";setStock(i.dataset.k,v);render()}
  else if(a==="stkfull"){const i=document.getElementById("stk");i.value=b.dataset.n;setStock(i.dataset.k,+b.dataset.n);render()}
  else if(a==="stkclear"){const i=document.getElementById("stk");i.value="";setStock(i.dataset.k,0);render()}
  else if(a==="buyclear"){if(b.dataset.sure){S.buy.clear();save();render()}else{b.dataset.sure="1";b.textContent="กดอีกครั้งเพื่อยืนยัน";setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="ล้างรับซื้อ"}},3000)}}
  else if(a==="invreset"){if(b.dataset.sure){const F=plan(queueEntries(),false);for(const k of Object.keys(F.need))delete S.stock[k];save();render()}else{b.dataset.sure="1";b.textContent="กดอีกครั้งเพื่อล้างจำนวนที่มีของทุกชิ้นในรายการนี้";setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="ล้างจำนวนที่มีในรายการนี้"}},3000)}}
  else if(a==="buysave")buyExport("save");
  else if(a==="buycopy")buyExport("copy");
  else if(a==="usel"){U.useSel=b.dataset.k;U.useShow=true;if(U.view!=="uses"){U.view="uses";render._scrolled=false}render();document.getElementById("detail")?.scrollTo(0,0)}
  else if(a==="uclose"){U.useShow=false;render()}
  else if(a==="ucat"){U.useCat=b.dataset.t;render()}
  else if(a==="utab"){U.useTab=b.dataset.t;render()}
  else if(a==="udirect"){U.useDirect=!U.useDirect;render()}
  else if(a==="qty"){U.qty=Math.max(1,(U.qty|0)+ +b.dataset.d);render()}
  else if(a==="tw"){const p=b.dataset.p;U.open.has(p)?U.open.delete(p):U.open.add(p);render()}
  else if(a==="mode"){const k=b.dataset.k,m=b.dataset.m;if(m==="auto")delete S.mode[k];else S.mode[k]=m;save();render()}
  else if(a==="addq"){const ex=S.queue.find(x=>x.id===U.sel);if(ex)ex.n+=U.qty;else S.queue.push({id:U.sel,n:U.qty});save();render();toast("เพิ่มในรายการคราฟแล้ว")}
  else if(a==="qq"){const e2=S.queue[+b.dataset.i];e2.n=Math.max(1,e2.n+ +b.dataset.d);save();render()}
  else if(a==="qdel"){S.queue.splice(+b.dataset.i,1);save();render()}
  else if(a==="qclear"){if(b.dataset.sure){S.queue=[];save();render()}else{b.dataset.sure="1";b.textContent="กดอีกครั้งเพื่อยืนยัน";setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="ล้างรายการ"}},3000)}}
  else if(a==="imgdel"){const k=b.dataset.k;if(IMG[k])URL.revokeObjectURL(IMG[k]);delete IMG[k];delete BLOBS[k];IDB.del(k).catch(()=>{});render()}
  else if(a==="pbf"){U.pbFilter=b.dataset.t;render()}
  else if(a==="copyshop"){const acc=plan([[RECIPES[U.sel],Math.max(1,U.qty|0)]]).gather;copy(RECIPES[U.sel].name+" x"+U.qty+"\n"+listText(acc))}
  else if(a==="copyq"){copy(listText(plan(queueEntries()).gather))}
  else if(a==="zipout")exportPack();
  else if(a==="export")modal("export");else if(a==="import")modal("import");
  else if(a==="mclose")document.getElementById("modal-root").innerHTML="";
  else if(a==="mcopy")copy(document.getElementById("mta").value,document.getElementById("mta"));
  else if(a==="mapply"){try{const d=JSON.parse(document.getElementById("mta").value);const pr=Array.isArray(d.prices)?Object.fromEntries(d.prices):d.prices||d;let n=0;for(const [k,v] of Object.entries(pr)){const kk=norm(k);if(ITEMS.has(kk)&&v!==""&&!isNaN(+v)){S.prices[kk]=+v;n++}}for(const [k,v] of Object.entries(d.cur||{})){const kk=norm(k);if(ITEMS.has(kk)){if(v==="b")S.cur[kk]="b";else delete S.cur[kk]}}save();document.getElementById("modal-root").innerHTML="";render();toast("นำเข้า "+n+" ราคา")}catch(err){document.getElementById("merr").textContent="อ่านข้อมูลไม่ได้ ตรวจว่าเป็น JSON ที่ได้จากปุ่มส่งออก"}}
});
function modal(kind){const exp=kind==="export";const txt=exp?JSON.stringify({prices:Object.fromEntries(Object.entries(S.prices).map(([k,v])=>[ITEMS.get(k)?.name||k,v])),cur:Object.fromEntries(Object.entries(S.cur).map(([k,v])=>[ITEMS.get(k)?.name||k,v]))},null,1):"";
  document.getElementById("modal-root").innerHTML=`<div class="modal"><div class="box"><h3 style="margin:0;font-family:var(--f-disp)">${exp?"ส่งออกราคา":"นำเข้าราคา"}</h3><p style="margin:0;color:var(--ink2)">${exp?"คัดลอกข้อความนี้ไปเก็บไว้หรือส่งให้เพื่อนในกิลด์":"วางข้อความ JSON ที่ได้จากปุ่มส่งออก ราคาเดิมของไอเทมเดียวกันจะถูกแทนที่"}</p><textarea id="mta" ${exp?"readonly":""} placeholder='{"prices":{"Zinc Ore":120}}'>${esc(txt)}</textarea><div id="merr" style="color:var(--warn);font-size:12px"></div><div class="ptools" style="justify-content:flex-end"><button class="btn ghost" data-act="mclose">ปิด</button>${exp?'<button class="btn pri" data-act="mcopy">คัดลอก</button>':'<button class="btn pri" data-act="mapply">นำเข้า</button>'}</div></div></div>`}
document.addEventListener("input",e=>{const t=e.target;
  if(t.id==="stk"){setStock(t.dataset.k,t.value);render()}
  else if(t.dataset.stock!=null){setStock(t.dataset.stock,t.value.replace(/[, ]/g,""));render()}
  else if(t.dataset.guar!=null){S.guar=t.checked;save();render()}
  else if(t.id==="rate"){const v=+t.value.replace(/[, ]/g,"");S.rate=v>0?v:null;save();render()}
  else if(t.dataset.price!=null){const v=t.value.replace(/[, ]/g,"");if(v===""||isNaN(+v))delete S.prices[t.dataset.price];else S.prices[t.dataset.price]=+v;save();render()}
  else if(t.id==="q"){U.q=t.value;render()}
  else if(t.id==="pbq"){U.pbQ=t.value;render()}
  else if(t.id==="uq"){U.useQ=t.value;render()}
  else if(t.id==="buynames"){U.buyNames=t.checked}
  else if(t.id==="qty"){const v=parseInt(t.value);if(v>0){U.qty=v;render()}}
  else if(t.dataset.qi!=null){const v=parseInt(t.value);if(v>0){S.queue[+t.dataset.qi].n=v;save();render()}}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="stk"){document.getElementById("modal-root").innerHTML="";return}if(e.key==="Escape"){if(document.getElementById("modal-root").innerHTML)document.getElementById("modal-root").innerHTML="";else if(U.view==="uses"&&U.useShow){U.useShow=false;render()}else if(U.showDetail){U.showDetail=false;render()}}});
// detail sheet visibility on narrow screens
const st=document.createElement("style");st.textContent="@media (max-width:1000px){.v-recipes .detail[data-closed],.v-uses .detail[data-closed]{display:none}}";document.head.appendChild(st);
render();
