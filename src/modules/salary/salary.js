/* Salary & tax module — monthly income, Thai progressive tax */
/* ================================================================
   SALARY & TAX PLANNER — JS engine (auto-saves via Firebase intercept)
   ================================================================ */
(function(){
"use strict";
const ST_MONTHS=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const ST_KEY="salaryTaxPlanner_v2";
const ST_OLD="salaryTaxPlanner_v1";
const fmt=n=>(+(n||0)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const num=v=>{const x=parseFloat(String(v==null?"":v).replace(/,/g,""));return isNaN(x)?0:x;};
const fmt2=n=>num(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtIn=v=>{const n=num(v);return n===0?"":n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});};
const uid=()=>"p"+Math.random().toString(36).slice(2,8);
const blank=()=>ST_MONTHS.map(()=>({salary:0,ot:0,bonus:0,sso:0,wht:0,pvdPct:0}));
const DED_IDS=["stDSpouse","stDChild","stDChild2","stDParent","stDMaternity","stDLife","stDHealth","stDParentHealth","stDRMF","stDPension","stDESG","stDHome","stDEreceipt","stDDonate","stDDonateEdu"];
const DED_MAP={stDSpouse:"dSpouse",stDChild:"dChild",stDChild2:"dChild2",stDParent:"dParent",stDMaternity:"dMaternity",stDLife:"dLife",stDHealth:"dHealth",stDParentHealth:"dParentHealth",stDRMF:"dRMF",stDPension:"dPension",stDESG:"dESG",stDHome:"dHome",stDEreceipt:"dEreceipt",stDDonate:"dDonate",stDDonateEdu:"dDonateEdu"};

// ── State ──
let state={year:"2568",activeId:null,people:[]};
const newPerson=n=>({id:uid(),name:n||"คนใหม่",income:blank(),ded:{}});
const active=()=>state.people.find(p=>p.id===state.activeId)||state.people[0];

// ── Tax engine ──
const BRK=[[0,150000,0],[150000,300000,.05],[300000,500000,.10],[500000,750000,.15],[750000,1000000,.20],[1000000,2000000,.25],[2000000,5000000,.30],[5000000,Infinity,.35]];
function calcTax(net){let tax=0;const d=[];for(const [lo,hi,r] of BRK){const a=Math.max(0,Math.min(net,hi)-lo);if(net>lo)tax+=a*r;d.push({lo,hi,rate:r,amt:a,t:net>lo?a*r:0,active:net>lo&&net<=hi});}return{tax,detail:d};}
const marginal=net=>{let r=0;for(const [lo,,rate] of BRK)if(net>lo)r=rate;return r;};
function compute(p){
  const inc=p.income;
  const tSal=inc.reduce((s,m)=>s+num(m.salary),0),tOT=inc.reduce((s,m)=>s+num(m.ot),0),tBon=inc.reduce((s,m)=>s+num(m.bonus),0);
  const tSSO=inc.reduce((s,m)=>s+num(m.sso),0),tWHT=inc.reduce((s,m)=>s+num(m.wht),0);
  const pvdC=inc.reduce((s,m)=>s+num(m.salary)*num(m.pvdPct)/100,0);
  const income=tSal+tOT+tBon,exp=Math.min(income*.5,100000);
  const d=p.ded||{},g=k=>num(d[k]);
  const spouse=g("dSpouse")>0?60000:0,child=g("dChild")*30000,child2=g("dChild2")*30000;
  const parent=Math.min(g("dParent"),4)*30000,mat=Math.min(g("dMaternity"),60000);
  const sso=Math.min(tSSO,9000);
  const lh=Math.min(g("dLife")+Math.min(g("dHealth"),25000),100000),ph=Math.min(g("dParentHealth"),15000);
  const pvdD=Math.min(pvdC,tSal*.15,500000);
  const retire=Math.min(Math.min(g("dRMF"),income*.3)+Math.min(g("dPension"),income*.15,200000)+pvdD,500000);
  const esg=Math.min(g("dESG"),income*.3,300000),home=Math.min(g("dHome"),100000),erec=Math.min(g("dEreceipt"),50000);
  const fix=60000+spouse+child+child2+parent+mat+sso+lh+ph+retire+esg+home+erec;
  const base=Math.max(0,income-exp-fix);
  const donate=Math.min(g("dDonate")+g("dDonateEdu")*2,base*.10);
  const totalAllow=fix+donate,net=Math.max(0,income-exp-totalAllow);
  const{tax,detail}=calcTax(net);
  return{tSal,tOT,tBon,tSSO,tWHT,pvdC,pvdD,income,exp,totalAllow,net,tax,detail,
    eff:income>0?tax/income:0,diff:tWHT-tax,mg:marginal(net),
    caps:{lifeHealth:{used:lh,cap:100000},parentHealth:{used:ph,cap:15000},
      retire:{used:retire,cap:500000},esg:{used:esg,cap:Math.min(300000,income*.3)},
      home:{used:home,cap:100000},ereceipt:{used:erec,cap:50000}}};
}

// ── Auto-save (debounced localStorage → Firebase intercept picks it up) ──
let _saveT=null;
function autoSave(){
  gatherDed();
  state.year=document.getElementById("taxYear").value;
  clearTimeout(_saveT);
  _saveT=setTimeout(()=>localStorage.setItem(ST_KEY,JSON.stringify(state)),800);
}

// ── People selector ──
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function renderPeople(){
  const bar=document.getElementById("stPeoplebar");
  let opts="";
  state.people.forEach(p=>{opts+=`<option value="${p.id}"${p.id===state.activeId?" selected":""}>${esc(p.name||"—")}</option>`;});
  opts+=`<option value="__add__">＋ เพิ่มคนใหม่…</option>`;
  bar.innerHTML=`<span class="pl">บัญชีของ:</span>
    <select id="stPersonSelect" class="pselect mo-sel">${opts}</select>
    <button class="btn" id="stAddPersonBtn">＋ เพิ่มคน</button>
    <button class="btn" id="stRenameBtn"><i class="ti ti-pencil"></i> เปลี่ยนชื่อ</button>
    <button class="btn danger" id="stDelPersonBtn"><i class="ti ti-trash"></i> ลบบัญชีนี้</button>`;
  document.getElementById("stPersonSelect").addEventListener("change",async e=>{
    const v=e.target.value;
    if(v==="__add__"){await addPerson();renderPeople();}else selPerson(v);
  });
  document.getElementById("stAddPersonBtn").addEventListener("click",addPerson);
  document.getElementById("stRenameBtn").addEventListener("click",()=>renamePerson(state.activeId));
  document.getElementById("stDelPersonBtn").addEventListener("click",()=>delPerson(state.activeId));
  document.getElementById("stViewingWho").textContent="ครัวเรือนทั้งหมด "+state.people.length+" คน";
}
function selPerson(id){autoSave();state.activeId=id;loadUI();renderPeople();}
async function addPerson(){
  const def="คนที่ "+(state.people.length+1);
  const name=await modal("ชื่อสมาชิก เช่น โฟม / เข่ง / สมชาย",{input:true,value:def,ok:"เพิ่ม"});
  if(name===null)return;
  const p=newPerson((name||"").trim()||def);
  state.people.push(p);state.activeId=p.id;loadUI();renderPeople();autoSave();
}
async function renamePerson(id){
  const p=state.people.find(x=>x.id===id);if(!p)return;
  const n=await modal("เปลี่ยนชื่อบัญชี",{input:true,value:p.name,ok:"บันทึก"});
  if(n===null)return;p.name=(n||"").trim()||p.name;renderPeople();refresh();autoSave();
}
async function delPerson(id){
  if(state.people.length<=1){await modal("ต้องมีบัญชีอย่างน้อย 1 คน",{ok:"เข้าใจแล้ว",cancel:""});return;}
  const p=state.people.find(x=>x.id===id);if(!p)return;
  if(!await modal("ลบบัญชีของ \""+p.name+"\" ?",{ok:"ลบ"}))return;
  state.people=state.people.filter(x=>x.id!==id);
  if(state.activeId===id)state.activeId=state.people[0].id;
  loadUI();renderPeople();autoSave();
}

// ── Income table ──
function buildTable(){
  const p=active();const tb=document.getElementById("stIncomeBody");tb.innerHTML="";
  p.income.forEach((m,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${ST_MONTHS[i]}</td>
      <td><input class="tinput stInc money" data-i="${i}" data-k="salary" type="text" inputmode="numeric" value="${fmtIn(m.salary)}" placeholder="0"></td>
      <td><input class="tinput stInc money" data-i="${i}" data-k="ot"     type="text" inputmode="numeric" value="${fmtIn(m.ot)}"     placeholder="0"></td>
      <td><input class="tinput stInc money" data-i="${i}" data-k="bonus"  type="text" inputmode="numeric" value="${fmtIn(m.bonus)}"  placeholder="0"></td>
      <td><input class="tinput stInc money" data-i="${i}" data-k="sso"    type="text" inputmode="numeric" value="${fmtIn(m.sso)}"    placeholder="0"></td>
      <td><input class="tinput stInc" data-i="${i}" data-k="pvdPct" type="number" step="0.5" value="${m.pvdPct||""}" placeholder="0"><div class="pvdbaht st-num" id="stPvd${i}">฿0</div></td>
      <td><input class="tinput stInc money" data-i="${i}" data-k="wht"    type="text" inputmode="numeric" value="${fmtIn(m.wht)}"    placeholder="0"></td>
      <td class="st-num" id="stNet${i}">0</td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll(".stInc").forEach(inp=>{
    inp.addEventListener("input",e=>{active().income[+e.target.dataset.i][e.target.dataset.k]=num(e.target.value);refresh();});
    if(inp.classList.contains("money")){
      inp.addEventListener("focus",e=>{const n=num(e.target.value);e.target.value=n===0?"":String(n);});
      inp.addEventListener("blur", e=>{e.target.value=fmtIn(e.target.value);});
    }
  });
}

// ── Deduction sync ──
function gatherDed(){
  const p=active();if(!p)return;
  DED_IDS.forEach(eid=>{p.ded[DED_MAP[eid]]=num(document.getElementById(eid).value);});
}
function loadUI(){
  const p=active();
  document.getElementById("stDPersonal").value="60,000";
  DED_IDS.forEach(eid=>{document.getElementById(eid).value=fmtIn(p.ded[DED_MAP[eid]]);});
  buildTable();refresh();
}

// ── Render ──
function refresh(){
  autoSave();
  const p=active(),r=compute(p);
  p.income.forEach((m,i)=>{
    const pa=num(m.salary)*num(m.pvdPct)/100,net=num(m.salary)+num(m.ot)+num(m.bonus)-num(m.sso)-num(m.wht)-pa;
    const el=document.getElementById("stNet"+i);if(el)el.textContent=fmt(net);
    const pv=document.getElementById("stPvd"+i);if(pv)pv.textContent="฿"+fmt(pa);
  });
  document.getElementById("stTSalary").textContent=fmt(r.tSal);
  document.getElementById("stTOT").textContent=fmt(r.tOT);
  document.getElementById("stTBonus").textContent=fmt(r.tBon);
  document.getElementById("stTSSO").textContent=fmt(r.tSSO);
  document.getElementById("stTPVD").textContent="฿"+fmt(r.pvdC);
  document.getElementById("stTWHT").textContent=fmt(r.tWHT);
  document.getElementById("stTNet").textContent=fmt(r.income-r.tSSO-r.tWHT-r.pvdC);
  document.getElementById("stDIncome").value=fmt2(r.income);
  document.getElementById("stDExpense").value=fmt2(r.exp);
  document.getElementById("stDSSO").value=fmt2(Math.min(r.tSSO,9000));
  document.getElementById("stDPVD").value=fmt2(r.pvdD);
  document.getElementById("stSumIncome").textContent=fmt(r.income);
  document.getElementById("stSumTax").textContent=fmt(r.tax);
  document.getElementById("stSumEff").textContent="อัตราเฉลี่ย "+(r.eff*100).toFixed(1)+"%";
  document.getElementById("stSumWHT").textContent=fmt(r.tWHT);
  const de=document.getElementById("stSumDiff"),dl=document.getElementById("stDiffLbl"),ds=document.getElementById("stDiffSub");
  if(r.diff>=0){de.textContent="+"+fmt(r.diff);de.className="val st-num good";dl.textContent="ได้คืนภาษี";ds.textContent="หักไว้เกิน ขอคืนได้";}
  else{de.textContent="-"+fmt(-r.diff);de.className="val st-num bad";dl.textContent="ต้องจ่ายเพิ่ม";ds.textContent="หักไว้ไม่พอ จ่ายตอนยื่น";}
  const ln=(k,v,o={})=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--st-line-soft);${o.bold?'font-weight:600;':''}${o.top?'border-top:2px solid var(--st-line);margin-top:4px;':''}"><span style="color:${o.bold?'var(--st-ink)':'var(--st-muted)'}">${k}</span><span class="st-num" style="${o.color?'color:'+o.color:''}">${v}</span></div>`;
  let h=ln("เงินได้พึงประเมิน",fmt(r.income))+ln("หักค่าใช้จ่าย","-"+fmt(r.exp))+ln("หักค่าลดหย่อนรวม","-"+fmt(r.totalAllow))+ln("เงินได้สุทธิ (ฐานภาษี)",fmt(r.net),{bold:true,top:true})+ln("ภาษีที่ต้องชำระ",fmt(r.tax),{bold:true,color:'var(--st-clay)'})+ln("อัตราภาษีขั้นสูงสุด",(r.mg*100)+"%");
  document.getElementById("stResLines").innerHTML=h;
  const co=document.getElementById("stResCallout");
  co.innerHTML=r.diff>=0?`<div class="callout"><span class="ic"><i class="ti ti-circle-check"></i></span><div>หัก ณ ที่จ่ายไว้ <b>${fmt(r.tWHT)}</b> มากกว่าภาษีจริง <b>${fmt(r.tax)}</b> — ยื่นแล้ว<b> ขอคืนได้ ${fmt(r.diff)} บาท</b></div></div>`:`<div class="callout clay"><span class="ic"><i class="ti ti-alert-triangle"></i></span><div>หัก ณ ที่จ่ายไว้ <b>${fmt(r.tWHT)}</b> น้อยกว่าภาษีจริง <b>${fmt(r.tax)}</b> — ตอนยื่นต้อง<b> จ่ายเพิ่ม ${fmt(-r.diff)} บาท</b></div></div>`;
  let bh="";r.detail.forEach(b=>{const span=b.hi===Infinity?1e6:(b.hi-b.lo);const pct=b.amt>0?Math.min(100,b.amt/span*100):0;bh+=`<div class="bracket-row${b.active?' br-row-active':''}"><div class="br-rate">${b.rate*100}%</div><div class="br-track"><div class="br-fill" style="width:${pct}%"></div></div><div class="br-amt">${fmt(b.lo)}–${b.hi===Infinity?"ขึ้นไป":fmt(b.hi)}</div><div class="br-tax">${b.t>0?fmt(b.t):"—"}</div></div>`;});
  bh+=`<div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:2px solid var(--st-line);font-weight:600"><span>รวมภาษี</span><span class="st-num" style="color:var(--st-clay)">${fmt(r.tax)}</span></div>`;
  document.getElementById("stBrackets").innerHTML=bh;
  renderPlan(r);renderHouse();
}

// ── Planner ──
const LEVERS=[{key:"retire",name:"กลุ่มเกษียณ (RMF/บำนาญ/PVD)",sub:"เพดานรวม 500,000 หรือ 30% ของเงินได้"},{key:"esg",name:"Thai ESG / ESGX",sub:"30% ของเงินได้ สูงสุด 300,000"},{key:"lifeHealth",name:"ประกันชีวิต + สุขภาพตัวเอง",sub:"รวมไม่เกิน 100,000"},{key:"parentHealth",name:"ประกันสุขภาพบิดามารดา",sub:"ไม่เกิน 15,000"},{key:"home",name:"ดอกเบี้ยกู้ซื้อบ้าน",sub:"ไม่เกิน 100,000"},{key:"ereceipt",name:"Easy E-Receipt",sub:"ไม่เกิน 50,000"}];
function renderPlan(r){
  document.getElementById("stPlanMarginal").textContent=(r.mg*100)+"%";
  let h="";LEVERS.forEach(l=>{const c=r.caps[l.key],rem=Math.max(0,c.cap-c.used);h+=`<div class="lever"><div class="name">${l.name}<small>${l.sub}</small></div><div class="col"><div class="k">ใช้ไปแล้ว</div><div class="v st-num">${fmt(c.used)}</div></div><div class="col"><div class="k">เพดานคงเหลือ</div><div class="v st-num">${fmt(rem)}</div></div><div class="col"><div class="k">ประหยัดได้สูงสุด</div><div class="v st-num save">${fmt(rem*r.mg)}</div></div></div>`;});
  document.getElementById("stLevers").innerHTML=h;
  const sel=document.getElementById("stSimType");
  if(sel.options.length===0){LEVERS.forEach(l=>{const o=document.createElement("option");o.value=l.key;o.textContent=l.name;sel.appendChild(o);});sel.addEventListener("change",runSim);document.getElementById("stSimAmt").addEventListener("input",runSim);}
  runSim();
}
function runSim(){
  const r=compute(active()),key=document.getElementById("stSimType").value||"retire",amt=num(document.getElementById("stSimAmt").value);
  const c=r.caps[key],used=Math.min(amt,Math.max(0,c.cap-c.used));
  const newTax=calcTax(Math.max(0,r.net-used)).tax;
  document.getElementById("stSimUsed").textContent=fmt(used);document.getElementById("stSimSave").textContent=fmt(r.tax-newTax);document.getElementById("stSimNewTax").textContent=fmt(newTax);
}

// ── Household ──
function renderHouse(){
  const tb=document.getElementById("stHouseBody");tb.innerHTML="";
  let TI=0,TA=0,TN=0,TT=0,TW=0,TD=0;
  state.people.forEach(p=>{
    const r=compute(p);TI+=r.income;TA+=r.totalAllow;TN+=r.net;TT+=r.tax;TW+=r.tWHT;TD+=r.diff;
    const diffTxt=(r.diff>=0?"+":" -")+fmt(Math.abs(r.diff)),diffCls=r.diff>=0?"good":"bad";
    const tr=document.createElement("tr");
    tr.innerHTML=`<td><span class="house-name" data-id="${p.id}">${esc(p.name)}</span></td><td class="st-num">${fmt(r.income)}</td><td class="st-num">${fmt(r.totalAllow)}</td><td class="st-num">${fmt(r.net)}</td><td class="st-num">${fmt(r.tax)}</td><td class="st-num">${fmt(r.tWHT)}</td><td class="st-num ${diffCls}">${diffTxt}</td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll(".house-name").forEach(el=>el.addEventListener("click",()=>{selPerson(el.dataset.id);document.querySelector('[data-stab="income"]').click();}));
  ["stHIncome","stHAllow","stHNet","stHTax","stHWHT"].forEach((id,i)=>document.getElementById(id).textContent=fmt([TI,TA,TN,TT,TW][i]));
  const hd=document.getElementById("stHDiff");hd.textContent=(TD>=0?"+":" -")+fmt(Math.abs(TD));hd.className="st-num "+(TD>=0?"good":"bad");
  document.getElementById("stHouseNote").innerHTML=TD>=0?`รวมทั้งครัวเรือนภาษีที่ต้องชำระ <b>${fmt(TT)}</b> บาท หักไว้เกิน <b>ขอคืนได้รวม ${fmt(TD)}</b> บาท`:`รวมทั้งครัวเรือนภาษีที่ต้องชำระ <b>${fmt(TT)}</b> บาท ต้อง<b>จ่ายเพิ่มรวม ${fmt(-TD)}</b> บาทตอนยื่น`;
}

// ── Persistence: load from localStorage ──
function load(){
  try{
    const raw=localStorage.getItem(ST_KEY);
    if(raw){const s=JSON.parse(raw);if(s.people&&s.people.length){state=s;return;}}
    const old=localStorage.getItem(ST_OLD);
    if(old){const s=JSON.parse(old);const p=newPerson("คนที่ 1");if(s.income&&s.income.length===12)p.income=s.income;if(s.ded)p.ded=s.ded;state.year=s.year||"2568";state.people=[p];state.activeId=p.id;}
  }catch(e){}
}
function seed(){
  if(!state.people||!state.people.length)state.people=[newPerson("คนที่ 1")];
  state.people.forEach(p=>{if(!p.income||p.income.length!==12)p.income=blank();if(!p.ded)p.ded={};});
  if(!state.activeId||!state.people.find(p=>p.id===state.activeId))state.activeId=state.people[0].id;
}

// ── Modal engine (salary-scoped) ──
let _mRes=null,_mIsInput=false;
function modal(msg,opts={}){
  return new Promise(res=>{
    document.getElementById("stModalMsg").textContent=msg;
    const inp=document.getElementById("stModalInput");
    _mIsInput=!!opts.input;
    if(opts.input){inp.style.display="block";inp.type=opts.numeric?"number":"text";inp.className="st-modal-input"+(opts.numeric?" num":"");inp.value=opts.value!==undefined?opts.value:"";setTimeout(()=>{inp.focus();try{inp.select();}catch(e){}},40);}
    else inp.style.display="none";
    document.getElementById("stModalOk").textContent=opts.ok||"ตกลง";
    const cc=document.getElementById("stModalCancel");
    if(opts.cancel===""){cc.style.display="none";}else{cc.style.display="";cc.textContent=opts.cancel||"ยกเลิก";}
    document.getElementById("stModalOverlay").classList.add("show");
    _mRes=res;
  });
}
function closeModal(v){document.getElementById("stModalOverlay").classList.remove("show");const r=_mRes;_mRes=null;if(r)r(v);}
document.getElementById("stModalOk").addEventListener("click",()=>closeModal(_mIsInput?document.getElementById("stModalInput").value:true));
document.getElementById("stModalCancel").addEventListener("click",()=>closeModal(_mIsInput?null:false));
document.getElementById("stModalOverlay").addEventListener("click",e=>{if(e.target.id==="stModalOverlay")closeModal(_mIsInput?null:false);});
document.getElementById("stModalInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();closeModal(document.getElementById("stModalInput").value);}else if(e.key==="Escape")closeModal(null);});

// ── Tabs ──
document.querySelectorAll("[data-stab]").forEach(t=>t.addEventListener("click",()=>{
  document.querySelectorAll("[data-stab]").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll("#m-salary .panel").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");document.getElementById("stPanel-"+t.dataset.stab).classList.add("active");
}));

// ── Deduction inputs formatting ──
function setupDed(){
  document.querySelectorAll(".stDed").forEach(i=>{
    i.type="text";i.setAttribute("inputmode","numeric");
    i.addEventListener("focus",e=>{const n=num(e.target.value);e.target.value=n===0?"":String(n);});
    i.addEventListener("blur", e=>{e.target.value=fmtIn(e.target.value);});
    i.addEventListener("input",refresh);
  });
}

// ── Events ──
document.getElementById("taxYear").addEventListener("change",refresh);
document.getElementById("stAddPerson2").addEventListener("click",addPerson);
document.getElementById("stPrintBtn").addEventListener("click",()=>window.print());
document.getElementById("stFillAll").addEventListener("click",async()=>{
  const who=active().name;
  const sal=await modal("เงินเดือนต่อเดือนของ "+who+" (บาท)",{input:true,numeric:true,value:"",ok:"ถัดไป"});if(sal===null)return;
  const sso=await modal("ประกันสังคมต่อเดือน (ปกติ 750 บาท)",{input:true,numeric:true,value:"750",ok:"ถัดไป"});if(sso===null)return;
  const pvd=await modal("กองทุนสำรองเลี้ยงชีพ กี่ % (ใส่ 0 ถ้าไม่มี)",{input:true,numeric:true,value:"0",ok:"ถัดไป"});if(pvd===null)return;
  const wht=await modal("ภาษีหัก ณ ที่จ่ายต่อเดือน (ใส่ 0 ถ้าไม่ทราบ)",{input:true,numeric:true,value:"0",ok:"กรอกทั้งปี"});if(wht===null)return;
  active().income=ST_MONTHS.map(()=>({salary:num(sal),ot:0,bonus:0,sso:num(sso),wht:num(wht),pvdPct:num(pvd)}));
  buildTable();refresh();
});
document.getElementById("stClearIncome").addEventListener("click",async()=>{
  if(!await modal("ล้างข้อมูลรายได้ของ "+active().name+" ?",{ok:"ล้าง"}))return;
  active().income=blank();buildTable();refresh();
});
window.addEventListener("beforeunload",()=>{
  gatherDed();state.year=document.getElementById("taxYear").value;
  localStorage.setItem(ST_KEY,JSON.stringify(state));
});

// ── Init (called by showModule once) ──
function initUI(){document.getElementById("taxYear").value=state.year;renderPeople();loadUI();}
window.stInit=function(){load();seed();setupDed();initUI();};
// Called by fbApplyRemote when Firestore pushes new data
window.stReloadFromStorage=function(){
  try{load();seed();initUI();}catch(e){}
};
// Called by loadDash() to get accurate household tax summary
window.stGetHomeSummary=function(){
  try{
    if(!state.people||!state.people.length){load();seed();}
    if(!state.people||!state.people.length)return null;
    let totIncome=0,totTax=0,totWHT=0;
    state.people.forEach(p=>{const r=compute(p);totIncome+=r.income;totTax+=r.tax;totWHT+=r.tWHT;});
    return{totIncome,totTax,diff:totWHT-totTax};
  }catch(e){return null;}
};

})();
