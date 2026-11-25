/* ---------- จัดเซ็ต: build equipment sets per class and compare their stats ----------
   Loaded before app.js. Everything that touches app state (S, U, ITEMS, render, save…) runs at call time. */
const EQ_STATS=["ATK","DEF","AGI","VIT","INT","CHA","TAL","LCK"];
const EQ_SLOTS=[["weapon","อาวุธ"],["armor","ชุด"],["accessory","หมวก"],["trinket","เครื่องประดับ"],["boot","รองเท้า"],["pet","สัตว์เลี้ยง"]];
const EQ_SLOT_TH=Object.fromEntries(EQ_SLOTS);
const EQ_CLASSES=[["wlf","Wolf"],["bsn","Bison"],["pnd","Panda"],["shp","Sheep"],["bat","Bat"],["rab","Rabbit"],["cat","Cat"],["pgn","Penguin"],["mol","Mole"],["chm","Chameleon"],["whl","Whale"],["mnk","Monkey"]];
const EQ_CLASS_TH=Object.fromEntries(EQ_CLASSES);
const eqNorm=s=>s.toLowerCase().replace(/\s+/g," ").trim();
const EQ=new Map(),EQ_KEYS=new Set();
(function(){const d=window.RAZAN_EQUIPMENT||{};for(const [slot,rows] of Object.entries(d)){const seen={};for(const r of rows){const [name,groups,...n]=r;let id=slot+":"+name;if(seen[id])id+=":"+groups;seen[id]=1;
  const e={id,slot,name,k:eqNorm(name),groups:groups.split(" "),st:n.slice(0,8),w:n[8]||0};e.sum=e.st.reduce((a,b)=>a+b,0);EQ.set(id,e);EQ_KEYS.add(e.k)}}})();

const eqFits=(e,cls)=>e.groups.includes(cls)||e.groups.includes("all")||e.groups.includes("mal")||e.groups.includes("fem");
const eqRecipe=e=>{const it=ITEMS.get(e.k);return it&&it.recipe?it.recipe:null};
const eqTag=e=>e.groups.includes("all")?"ทุกอาชีพ":e.groups.includes("mal")?"ตัวผู้":e.groups.includes("fem")?"ตัวเมีย":"";
function eqBadge(e,sm){const s=imgSrc(e.k);const cls={weapon:"w",armor:"a",accessory:"c",trinket:"t"}[e.slot]||"m";
  return s&&!BAD.has(s)?`<span class="badge img${sm?" sm":""}" data-i="${esc(initials(e.name))}"${sm?' data-sm="1"':""} aria-hidden="true"><img src="${esc(s)}" alt="" loading="lazy" onerror="imgFail(this)"></span>`:`<span class="badge ${cls}${sm?" sm":""}" aria-hidden="true">${esc(initials(e.name))}</span>`}
const EQ_NAME=new Map([...EQ.values()].map(e=>[e.k,e.name]));
const setById=id=>(S.sets||[]).find(s=>s.id===id);
/* a set as stored: {id,name,cls,focus,items:{slot:id},bonus:[{s:"INT",v:10,note:"การ์ด"}]} */
function cleanSet(x){if(!x||!x.id||!x.cls)return null;
  const bonus=(Array.isArray(x.bonus)?x.bonus:[]).filter(b=>b&&EQ_STATS.includes(b.s)).map(b=>({s:b.s,v:Math.trunc(+b.v)||0,note:String(b.note||"").slice(0,30)}));
  return {id:String(x.id),name:String(x.name||"เซ็ต").slice(0,40),cls:x.cls,focus:EQ_STATS.includes(x.focus)?x.focus:"",items:x.items&&typeof x.items==="object"?{...x.items}:{},bonus}}
function setTotals(set){const g=[0,0,0,0,0,0,0,0],bn=[0,0,0,0,0,0,0,0];let w=0;
  if(set){for(const id of Object.values(set.items||{})){const e=EQ.get(id);if(!e)continue;e.st.forEach((v,i)=>g[i]+=v);w+=e.w}
    for(const b of set.bonus||[]){const i=EQ_STATS.indexOf(b.s);if(i>=0)bn[i]+=b.v}}
  const t=g.map((v,i)=>v+bn[i]);return{t,g,bn,w,sum:t.reduce((a,b)=>a+b,0)}}
function newSet(cls,base){const n=S.sets.filter(s=>s.cls===cls).length+1;
  const s={id:"s"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:base?base.name+" (สำเนา)":EQ_CLASS_TH[cls]+"-"+n,cls,focus:base?base.focus:"",
    items:{...(base?base.items:{})},bonus:base?(base.bonus||[]).map(b=>({...b})):[]};S.sets.push(s);return s}
const sgn=v=>v>0?"+"+v:v<0?"−"+Math.abs(v):"0";
const statCls=v=>v>0?"up":v<0?"down":"same";

/* octagon chart like the in-game status window: ATK on top, then clockwise LCK TAL CHA INT VIT AGI DEF */
function setRadar(a,b){const order=[0,7,6,5,4,3,2,1],R=104;const vals=[...a.t,...(b?b.t:[])];let max=Math.max(10,...vals);max=Math.ceil(max/10)*10;
  const pt=(i,v)=>{const ang=-Math.PI/2+i*Math.PI/4,r=R*Math.max(0,v)/max;return[(r*Math.cos(ang)).toFixed(1),(r*Math.sin(ang)).toFixed(1)]};
  const ring=f=>order.map((_,i)=>pt(i,max*f).join(",")).join(" ");
  const poly=t=>order.map((s,i)=>pt(i,t[s]).join(",")).join(" ");
  let g=[.25,.5,.75,1].map(f=>`<polygon class="rd-grid" points="${ring(f)}"/>`).join("")+order.map((_,i)=>{const [x,y]=pt(i,max);return `<line class="rd-grid" x1="0" y1="0" x2="${x}" y2="${y}"/>`}).join("");
  const lab=order.map((s,i)=>{const ang=-Math.PI/2+i*Math.PI/4,x=(R+22)*Math.cos(ang),y=(R+18)*Math.sin(ang);return `<text class="rd-lab" x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle">${EQ_STATS[s]}</text>`}).join("");
  return `<svg class="radar" viewBox="-150 -140 300 280" role="img" aria-label="กราฟเทียบสเตตัส">${g}<text class="rd-max" x="4" y="${-R-4}">${max}</text>
   ${b?`<polygon class="rd-b" points="${poly(b.t)}"/>`:""}<polygon class="rd-a" points="${poly(a.t)}"/>${lab}</svg>`}

const setName=s=>s.name.trim()||"ไม่มีชื่อ";
function viewSets(){
  U.setCls=U.setCls||"pgn";U.pickSort=U.pickSort??"";
  const mine=S.sets.filter(s=>s.cls===U.setCls);
  let A=setById(U.setA);if(!A||A.cls!==U.setCls){A=mine[0]||null;U.setA=A?A.id:""}
  let B=setById(U.setB);if(B&&(B.cls!==U.setCls||(A&&B.id===A.id))){B=null;U.setB=""}
  const clsChips=EQ_CLASSES.map(([c,n])=>`<button class="chip" data-act="setcls" data-c="${c}" aria-pressed="${U.setCls===c}">${n}<span class="cnt">${S.sets.filter(s=>s.cls===c).length||""}</span></button>`).join("");
  const setChips=mine.map(s=>`<button class="chip setchip" data-act="setpick" data-id="${s.id}" aria-pressed="${A&&s.id===A.id}">${esc(setName(s))}</button>`).join("")+`<button class="chip newchip" data-act="setnew">+ เซ็ตใหม่</button>`;
  const head=`<div class="intro"><div><h2>จัดเซ็ต ${hi("@sets")}</h2><p>ใส่อุปกรณ์ 6 ช่องและสเตตัสที่เพิ่มเอง เว็บจะรวมค่าทั้ง 8 ให้ บันทึกได้หลายเซ็ตและนำมาเทียบกันได้</p></div>
     <div class="ptools">${ASSETS?`<label class="btn upl">อัปโหลดรูปหลายไฟล์<input type="file" id="bulkimg" accept="image/*" multiple></label>`:""}</div></div>
   <div class="sets-bar"><div class="barrow"><span class="barlab">อาชีพ</span><div class="chips">${clsChips}</div></div><div class="barrow"><span class="barlab">เซ็ต</span><div class="chips">${setChips}</div></div></div>`;
  if(!A)return `<section class="page"><div class="pwrap">${head}<div class="empty-note sets-empty">ยังไม่มีเซ็ตของ ${EQ_CLASS_TH[U.setCls]} กด “+ เซ็ตใหม่” เพื่อเริ่มจัดเซ็ตแรก</div></div>${U.pick?pickerHtml(null):""}</section>`;
  const ta=setTotals(A),tb=B?setTotals(B):null;
  const focusIdx=EQ_STATS.indexOf(A.focus);
  /* status strip: what the set gives, like the in-game status window */
  const strip=`<div class="stripwrap"><div class="striphead"><span class="barlab">สเตตัสรวม ${hi("strip")}</span></div><div class="statstrip">${EQ_STATS.map((s,i)=>`<div class="stbox ${i===focusIdx?"fx":""}"><span class="stl">${s}</span><span class="stv num">${ta.t[i]}</span><span class="stb num">${ta.bn[i]?`<span title="อุปกรณ์ ${ta.g[i]} · เพิ่มเอง ${sgn(ta.bn[i])}">${ta.g[i]} ${sgn(ta.bn[i])}</span>`:tb?`<span class="${statCls(ta.t[i]-tb.t[i])}">${sgn(ta.t[i]-tb.t[i])}</span>`:"&nbsp;"}</span></div>`).join("")}
     <div class="stbox all"><span class="stl">รวม</span><span class="stv num">${ta.sum}</span><span class="stb num">${tb?`<span class="${statCls(ta.sum-tb.sum)}">${sgn(ta.sum-tb.sum)}</span>`:`น.น. ${ta.w}`}</span></div></div></div>`;
  const slotCards=EQ_SLOTS.map(([slot,label])=>{const e=EQ.get(A.items[slot]);const other=B?EQ.get(B.items[slot]):null;const diff=B&&(A.items[slot]||"")!==(B.items[slot]||"");
    const stats=e?e.st.map((v,i)=>v?`<span class="${i===focusIdx?"fx":""}">${EQ_STATS[i]} ${v}</span>`:"").join(""):"";
    return `<div class="slotcard ${e?"":"empty"} ${diff?"diff":""}"><button class="slotbtn" data-act="setslot" data-s="${slot}"><span class="slotlab">${label}${diff?' <span class="difftag">ต่างจาก '+esc(setName(B))+'</span>':""}</span>
      <span class="slotitem">${e?eqBadge(e)+`<span class="slotname">${esc(e.name)}</span>`:'<span class="badge ghost" aria-hidden="true">+</span><span class="slotname muted">ว่าง · กดเพื่อเลือก</span>'}</span>
      ${e?`<span class="slotstats">${stats||'<span>ไม่มีสเตตัส</span>'}</span><span class="slotmeta">${eqRecipe(e)?'<span class="tag craft">คราฟได้</span>':""}${eqTag(e)?`<span class="tag">${eqTag(e)}</span>`:""}<span class="wt">น้ำหนัก ${e.w}</span></span>`:""}
      ${diff?`<span class="slotother">${esc(setName(B))}: ${other?esc(other.name):"ว่าง"}</span>`:""}</button>
      ${e?`<button class="x slotx" data-act="setclear" data-s="${slot}" aria-label="ถอด${label}">×</button>${ASSETS?`<label class="upl slotupl" title="ใช้รูปของคุณสำหรับ ${esc(e.name)}">${hasImg(e.k)?"เปลี่ยนรูป":"เพิ่มรูป"}<input type="file" accept="image/*" data-img="${esc(e.k)}"></label>`:""}`:""}</div>`}).join("");
  const bonusRows=(A.bonus||[]).map((b,i)=>`<div class="bnrow"><select class="inp bnstat" data-bn="s" data-i="${i}" aria-label="สเตตัส">${EQ_STATS.map(s=>`<option${s===b.s?" selected":""}>${s}</option>`).join("")}</select>
      <input class="inp num bnval" data-bn="v" data-i="${i}" data-f="bnv${i}" inputmode="numeric" value="${b.v}" aria-label="ค่าที่เพิ่ม">
      <button class="x" data-act="setbndel" data-i="${i}" aria-label="ลบแถวนี้">×</button></div>`).join("");
  const bonusBox=`<div class="bonusbox"><div class="bnhead"><b>เพิ่มสเตตัส ${hi("bonus")}</b><span class="ghint">ค่าที่ได้นอกจากอุปกรณ์ เช่น แต้มสเตตัสที่อัปเอง การ์ด หรือการตีบวก ใส่ค่าติดลบได้</span></div>
     ${bonusRows?`<div class="bnlist">${bonusRows}</div>`:""}
     <div class="chips bnadd">${EQ_STATS.map(s=>`<button class="chip" data-act="setbnadd" data-stat="${s}">+ ${s}</button>`).join("")}</div></div>`;
  const others=mine.filter(s=>s.id!==A.id);
  const cmpChips=others.length?`<button class="chip" data-act="setcmp" data-id="" aria-pressed="${!B}">ไม่เทียบ</button>`+others.map(s=>`<button class="chip" data-act="setcmp" data-id="${s.id}" aria-pressed="${B&&B.id===s.id}">${esc(setName(s))}</button>`).join(""):'<span class="ghint">สร้างเซ็ตที่ 2 ของอาชีพนี้ (หรือกด “ทำสำเนา”) เพื่อเทียบ</span>';
  const maxAbs=tb?Math.max(1,...ta.t.map((v,i)=>Math.abs(v-tb.t[i]))):1;
  const rows=EQ_STATS.map((s,i)=>{const a=ta.t[i],b=tb?tb.t[i]:0,d=a-b;
    return `<div class="tr ${i===focusIdx?"focusrow":""}"><span class="stn">${s}</span><span class="r num">${a}</span>${tb?`<span class="r num">${b}</span><span class="r num ${statCls(d)}">${sgn(d)}</span><span class="dbar"><i class="${statCls(d)}" style="width:${Math.abs(d)/maxAbs*100}%"></i></span>`:""}</div>`}).join("");
  const dSum=tb?ta.sum-tb.sum:0,dW=tb?ta.w-tb.w:0;
  const cmpTable=`<div class="tbl cmpt ${tb?"two":"one"}"><div class="tr h"><span>สเตตัส</span><span class="r">${esc(setName(A))}</span>${tb?`<span class="r">${esc(setName(B))}</span><span class="r" title="เซ็ตที่เลือก ลบ เซ็ตที่นำมาเทียบ">ต่าง</span><span></span>`:""}</div>${rows}
    <div class="tr sumrow"><span class="stn">รวมทุกค่า</span><span class="r num">${ta.sum}</span>${tb?`<span class="r num">${tb.sum}</span><span class="r num ${statCls(dSum)}">${sgn(dSum)}</span><span></span>`:""}</div>
    <div class="tr"><span class="stn">น้ำหนัก</span><span class="r num">${ta.w}</span>${tb?`<span class="r num">${tb.w}</span><span class="r num ${statCls(-dW)}">${sgn(dW)}</span><span></span>`:""}</div></div>`;
  const breakdown=set=>{const tt=setTotals(set);const cells=(arr,z)=>EQ_STATS.map((_,i)=>`<span class="r num ${arr&&arr[i]?"":"z"}">${arr?arr[i]:""}</span>`).join("");
    const bn=(set.bonus||[]).map(b=>{const arr=EQ_STATS.map(s=>s===b.s?b.v:0);return `<div class="tr bnr"><span class="bdn"><span class="ghint">เพิ่มสเตตัส</span> ${b.s}</span>${cells(arr)}<span class="r num"></span></div>`}).join("");
    return `<div class="tbl bdt"><div class="tr h"><span>${esc(setName(set))}</span>${EQ_STATS.map(s=>`<span class="r">${s}</span>`).join("")}<span class="r">น้ำหนัก</span></div>
    ${EQ_SLOTS.map(([slot,label])=>{const e=EQ.get(set.items[slot]);return `<div class="tr"><span class="bdn"><span class="ghint">${label}</span> ${e?esc(e.name):"—"}</span>${cells(e?e.st:null)}<span class="r num">${e?e.w:""}</span></div>`}).join("")}${bn}
    <div class="tr sumrow"><span>รวม</span>${tt.t.map(v=>`<span class="r num">${v}</span>`).join("")}<span class="r num">${tt.w}</span></div></div>`};
  const craftable=EQ_SLOTS.map(([s])=>EQ.get(A.items[s])).filter(e=>e&&eqRecipe(e));
  return `<section class="page"><div class="pwrap">${head}
   <div class="seteditor">
    <div class="sethead"><input class="inp setname" id="setname" data-f="setname" value="${esc(A.name)}" placeholder="ชื่อเซ็ต" aria-label="ชื่อเซ็ต" maxlength="40">
     <div class="ptools"><button class="btn" data-act="setdup">ทำสำเนา</button>${craftable.length?`<button class="btn" data-act="setqueue">ส่งชิ้นที่คราฟได้ไปรายการคราฟ (${craftable.length})</button>`:""}<button class="btn ghost" data-act="setdel">ลบเซ็ต</button></div></div>
    <div class="focusbar"><span class="barlab">เน้นค่า ${hi("focus")}</span><div class="chips"><button class="chip" data-act="setfocus" data-stat="" aria-pressed="${!A.focus}">ไม่ระบุ</button>${EQ_STATS.map(s=>`<button class="chip" data-act="setfocus" data-stat="${s}" aria-pressed="${A.focus===s}">${s}</button>`).join("")}</div></div>
    ${strip}
    <div class="slotgrid">${slotCards}</div>
    ${bonusBox}
   </div>
   <div class="sec"><h3>เทียบเซ็ต ${hi("cmp")}<span class="hint">ค่าพื้นฐานของอุปกรณ์รวมกับสเตตัสที่เพิ่มเอง · ช่อง “ต่าง” คือเซ็ตนี้ลบเซ็ตที่นำมาเทียบ</span></h3>
    <div class="cmpbar"><span class="barlab">เทียบกับ</span><div class="chips">${cmpChips}</div></div>
    <div class="cmpgrid">${cmpTable}<div class="radarbox">${setRadar(ta,tb)}<div class="rdleg"><span class="la">${esc(setName(A))}</span>${tb?`<span class="lb">${esc(setName(B))}</span>`:""}</div></div></div></div>
   <div class="sec"><h3>แยกตามชิ้น</h3><div class="bdwrap">${breakdown(A)}${B?breakdown(B):""}</div></div>
  </div>${U.pick?pickerHtml(A):""}</section>`}

/* picker: choose a piece for a slot, or (image mode) attach your own picture to any piece */
function pickerHtml(A){const slot=U.pick,cls=A?A.cls:U.setCls,cur=A?EQ.get(A.items[slot]):null;const q=eqNorm(U.pickQ||"");const imgMode=!A||U.pickImg;
  const si=U.pickSort===""?EQ_STATS.indexOf(A?A.focus:""):U.pickSort==="sum"?-1:EQ_STATS.indexOf(U.pickSort);
  let list=[...EQ.values()].filter(e=>e.slot===slot&&eqFits(e,cls)&&(!q||e.k.includes(q))&&(!U.pickCraft||eqRecipe(e))&&(!U.pickNoImg||!hasImg(e.k)));
  list.sort((a,b)=>(si>=0?b.st[si]-a.st[si]:0)||b.sum-a.sum||a.name.localeCompare(b.name));
  const sortLabel=si>=0?EQ_STATS[si]:"รวมทุกค่า";
  const noImg=[...EQ.values()].filter(e=>e.slot===slot&&eqFits(e,cls)&&!hasImg(e.k)).length;
  const rows=list.map(e=>{const on=cur&&cur.id===e.id;
    const inner=`<span class="pkname">${eqBadge(e,1)}<span><b>${esc(e.name)}</b>${eqRecipe(e)?' <span class="tag craft">คราฟได้</span>':""}${eqTag(e)?` <span class="tag">${eqTag(e)}</span>`:""}${on?' <span class="tag on">ใส่อยู่</span>':""}${imgMode?(hasImg(e.k)?' <span class="tag">มีรูปแล้ว · กดเพื่อเปลี่ยน</span>':' <span class="tag warn">กดเพื่อเพิ่มรูป</span>'):""}</span></span>
     ${e.st.map((v,i)=>{const d=v-(cur?cur.st[i]:0);return `<span class="pkst ${i===si?"sorted":""}"><span class="num">${v}</span>${cur&&!on&&d&&!imgMode?`<small class="${statCls(d)}">${sgn(d)}</small>`:""}</span>`}).join("")}
     <span class="pkst"><span class="num">${e.w}</span></span>`;
    return imgMode?`<label class="pkrow img">${inner}<input type="file" accept="image/*" data-img="${esc(e.k)}" hidden></label>`:`<button class="pkrow ${on?"on":""}" data-act="setequip" data-id="${esc(e.id)}">${inner}</button>`}).join("");
  return `<div class="picker" role="dialog" aria-label="เลือก${EQ_SLOT_TH[slot]}"><div class="pkbox">
   <div class="pkhead"><div><h3>${imgMode?"ใส่รูป":"เลือก"}${EQ_SLOT_TH[slot]} · ${EQ_CLASS_TH[cls]} ${hi("pick")}</h3><div class="ghint">${list.length} ชิ้น · เรียงตาม ${sortLabel}${imgMode?" · กดแถวเพื่อเลือกไฟล์รูปจากเครื่อง":cur?" · ตัวเลขเล็กคือส่วนต่างเทียบกับ "+esc(cur.name):""}</div></div><button class="btn ghost" data-act="setpickclose">ปิด</button></div>
   <div class="pktools"><input class="inp" id="pickq" data-f="pickq" type="search" placeholder="ค้นหาชื่อ…" value="${esc(U.pickQ||"")}" autocomplete="off">
    <div class="chips"><span class="ghint">เรียงตาม</span>${EQ_STATS.map(s=>`<button class="chip" data-act="setsort" data-v="${s}" aria-pressed="${si===EQ_STATS.indexOf(s)}">${s}</button>`).join("")}<button class="chip" data-act="setsort" data-v="sum" aria-pressed="${si<0}">รวม</button></div>
    <label class="chk"><input type="checkbox" id="pickcraft" ${U.pickCraft?"checked":""}> เฉพาะที่คราฟได้</label>
    <label class="chk"><input type="checkbox" id="picknoimg" ${U.pickNoImg?"checked":""}> ยังไม่มีรูป (${noImg})</label>
    ${A&&ASSETS?`<div class="mode-seg" role="group" aria-label="โหมด"><button data-act="setpickmode" data-v="" aria-pressed="${!U.pickImg}">เลือกใส่เซ็ต</button><button data-act="setpickmode" data-v="1" aria-pressed="${!!U.pickImg}">ใส่รูป</button></div>`:""}
    ${cur&&!imgMode?`<button class="btn ghost" data-act="setclear" data-s="${slot}">ถอดออก</button>`:""}</div>
   <div class="pkhdr"><span>ไอเทม</span>${EQ_STATS.map(s=>`<span>${s}</span>`).join("")}<span>น.น.</span></div>
   <div class="list pklist">${rows||'<div class="empty-note">ไม่พบไอเทมที่ตรงกับเงื่อนไข</div>'}</div></div></div>`}

document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b||!b.dataset.act.startsWith("set"))return;const a=b.dataset.act;const A=setById(U.setA);
  if(a==="setcls"){U.setCls=b.dataset.c;U.setA="";U.setB="";U.pick=null}
  else if(a==="setpick"){U.setA=b.dataset.id;if(U.setB===U.setA)U.setB=""}
  else if(a==="setnew"){const s=newSet(U.setCls);U.setA=s.id;save()}
  else if(a==="setdup"&&A){const s=newSet(A.cls,A);U.setB=A.id;U.setA=s.id;save();toast("ทำสำเนาแล้ว กำลังเทียบกับ "+setName(A))}
  else if(a==="setdel"&&A){if(!b.dataset.sure){b.dataset.sure="1";b.textContent="กดอีกครั้งเพื่อลบ “"+setName(A)+"”";setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="ลบเซ็ต"}},3000);return}
    S.sets=S.sets.filter(s=>s.id!==A.id);U.setA="";if(U.setB===A.id)U.setB="";save()}
  else if(a==="setfocus"&&A){A.focus=b.dataset.stat;U.pickSort="";save()}
  else if(a==="setslot"){U.pick=b.dataset.s;U.pickQ="";U.pickImg=false}
  else if(a==="setpickclose"){U.pick=null}
  else if(a==="setpickmode"){U.pickImg=!!b.dataset.v}
  else if(a==="setequip"&&A){const id=b.dataset.id,e2=EQ.get(id);if(e2){A.items[e2.slot]=id;save()}U.pick=null}
  else if(a==="setclear"&&A){delete A.items[b.dataset.s];U.pick=null;save()}
  else if(a==="setcmp"){U.setB=b.dataset.id}
  else if(a==="setsort"){U.pickSort=b.dataset.v}
  else if(a==="setbnadd"&&A){(A.bonus=A.bonus||[]).push({s:b.dataset.stat,v:0,note:""});save();render();
    const el=document.querySelector(`[data-f="bnv${A.bonus.length-1}"]`);if(el){el.focus({preventScroll:true});el.select()}return}
  else if(a==="setbndel"&&A){A.bonus.splice(+b.dataset.i,1);save()}
  else if(a==="setqueue"&&A){let n=0;for(const [s] of EQ_SLOTS){const e2=EQ.get(A.items[s]),r=e2&&eqRecipe(e2);if(!r)continue;if(!S.queue.find(q=>q.id===r.id)){S.queue.push({id:r.id,n:1});n++}}save();toast(n?"เพิ่ม "+n+" ชิ้นในรายการคราฟ":"ชิ้นที่คราฟได้อยู่ในรายการคราฟครบแล้ว")}
  else return;
  render()});
document.addEventListener("input",e=>{const t=e.target;const A=setById(U.setA);
  if(t.id==="setname"&&A){A.name=t.value.slice(0,40);save();render()}
  else if(t.dataset.bn&&A){const r=A.bonus[+t.dataset.i];if(!r)return;const f=t.dataset.bn;
    if(f==="s")r.s=t.value;else if(f==="note")r.note=t.value.slice(0,30);
    else{const raw=t.value.replace(/[^\d-]/g,"");if(raw===""||raw==="-"){r.v=0;save();return}r.v=Math.trunc(+raw)||0}
    save();render()}
  else if(t.id==="pickq"){U.pickQ=t.value;render()}
  else if(t.id==="pickcraft"){U.pickCraft=t.checked;render()}
  else if(t.id==="picknoimg"){U.pickNoImg=t.checked;render()}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&U.view==="sets"&&U.pick){U.pick=null;render()}});
