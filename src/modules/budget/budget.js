/* Budget module — monthly budget, credit cards */
const CC_COLORS=['#6a52c4','#3a6890','#2e7878','#8a5e20','#5a7a62','#a0485c','#4a7a9a'];
const DEFAULT_CC_CARDS=[
  {id:'jcb',name:'JCB',owner:'p2'},{id:'uob',name:'UOB',owner:'p2'},{id:'the1',name:'The1',owner:'p2'},
  {id:'ttb',name:'TTB',owner:'p2'},{id:'shopee_f',name:'Shopee Foam',owner:'p1'},
  {id:'shopee_k',name:'Shopee Kheng',owner:'p2'},{id:'uob_mk',name:'UOB MK',owner:'p2'},
  {id:'ktc',name:'KTC',owner:'p1'},
];
const MONTHS_TH=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

// TYPE: expense = good when actual<=budget, invest/save = good when actual>=budget
const TYPES={
  income: {label:'รายรับ',dot:'#3a6890',style:'background:var(--sky-bg);color:var(--sky);border-color:var(--sky-line)'},
  expense:{label:'รายจ่าย',dot:'#8a5e20',style:'background:var(--amber-bg);color:var(--amber);border-color:var(--amber-line)',goodWhen:'lte'},
  invest: {label:'ลงทุน',  dot:'#2e7878',style:'background:var(--teal-bg);color:var(--teal);border-color:var(--teal-line)',  goodWhen:'gte'},
  save:   {label:'ออม',    dot:'#5a7a62',style:'background:var(--sage-bg);color:var(--sage);border-color:var(--sage-line)',  goodWhen:'gte'},
};

// cfg.fixedIncome = {p1:[{id,name,note}], p2:[...]}
// cfg.fixedExpense = {p1:[{id,name,type,note}], p2:[...]}
let cfg={
  p1:'โฟม',p2:'เข่ง',
  ccCards:[...DEFAULT_CC_CARDS],
  fixedIncome:{p1:[
    {id:'fi_1',name:'เงินเดือน'},{id:'fi_2',name:'โบนัส'},{id:'fi_3',name:'รายได้อื่น'}
  ],p2:[
    {id:'fi_4',name:'เงินเดือน'},{id:'fi_5',name:'โบนัส'},{id:'fi_6',name:'รายได้อื่น'}
  ]},
  fixedExpense:{p1:[
    {id:'fe_1',name:'ค่าบ้าน',type:'expense',goal:22200},
    {id:'fe_3',name:'ค่าน้ำไฟ',type:'expense',goal:4000,utilityLinked:true},
    {id:'fe_4',name:'ค่ากิน',type:'expense',goal:10000,foodLinked:true},
    {id:'fe_cc',name:'ค่าบัตรเครดิต',type:'expense',goal:4000,ccLinked:true},
    {id:'fe_7',name:'เก็บเงิน/ออม',type:'save',goal:15000},
    {id:'fe_dime',name:'ซื้อ Dime',type:'invest',goal:5000},
    {id:'fe_sub',name:'ค่าซับตะไคร้',type:'expense',goal:399},
    {id:'fe_5',name:'ค่า internet+mobile',type:'expense',goal:1500},
    {id:'fe_com',name:'ใส่เข้ากองกลาง',type:'expense',goal:4000},
  ],p2:[
    {id:'fe_9', name:'ค่าบ้าน',            type:'expense', goal:22000},
    {id:'fe_car2',name:'ค่ารถ',            type:'expense', goal:18362},
    {id:'fe_11',name:'ค่าน้ำไฟ',type:'expense',goal:2000,utilityLinked:true},
    {id:'fe_12',name:'ค่ากิน',type:'expense',goal:10000,foodLinked:true},
    {id:'fe_cc2',name:'ค่าบัตรเครดิต',     type:'expense', goal:4000, ccLinked:true},
    {id:'fe_15',name:'เก็บเงิน',           type:'save',    goal:4000},
    {id:'fe_dime2',name:'ซื้อ Dime',       type:'invest',  goal:4000},
    {id:'fe_xrp', name:'ซื้อ XRP,Bitcoin', type:'invest',  goal:5000},
    {id:'fe_13',name:'ค่า internet+mobile',type:'expense', goal:500},
    {id:'fe_com2',name:'กองกลาง',          type:'expense', goal:4000},
  ]},
};

// months[mkey] = {incomes:{p1:{fixedId:amt,...},extras:[{id,name,amt,note}]}, p2:same,
//                 expenses:{p1:{fixedId:{budget,actual},...},extras:[{id,name,type,budget,actual}]}, p2:same,
//                 cc:[{id,cardId,total,p1,p2,note}]}
let months={};
let curMonth=new Date().getMonth();
let curYear=new Date().getFullYear();
let curPerson='p1';

function mkey(){return`${curYear}-${String(curMonth).padStart(2,'0')}`}
function getMD(){
  const k=mkey();
  if(!months[k]) months[k]={
    incomes:{p1:{fixed:{},extras:[]},p2:{fixed:{},extras:[]}},
    expenses:{p1:{fixed:{},extras:[]},p2:{fixed:{},extras:[]}},
    cc:[],hidden:{p1:[],p2:[]},sharedUtility:0,sharedWater:0,sharedElectric:0,sharedFood:0
  };
  ['p1','p2'].forEach(p=>{
    if(!months[k].incomes[p]) months[k].incomes[p]={fixed:{},extras:[]};
    if(!months[k].expenses[p]) months[k].expenses[p]={fixed:{},extras:[]};
  });
  if(!months[k].hidden) months[k].hidden={p1:[],p2:[]};
  if(!months[k].hidden.p1) months[k].hidden.p1=[];
  if(!months[k].hidden.p2) months[k].hidden.p2=[];
  if(months[k].sharedUtility===undefined) months[k].sharedUtility=0;
  if(months[k].sharedWater===undefined) months[k].sharedWater=0;
  if(months[k].sharedFood===undefined) months[k].sharedFood=0;
  if(months[k].sharedElectric===undefined) months[k].sharedElectric=0;
  return months[k];
}

function _bpLoad(){
  try{months=JSON.parse(localStorage.getItem('bp3_months')||'{}')}catch(e){months={}}
  try{const s=JSON.parse(localStorage.getItem('bp3_cfg')||'{}');
    if(s.p1)cfg.p1=s.p1;if(s.p2)cfg.p2=s.p2;
    if(s.ccCards){
      cfg.ccCards=s.ccCards;
      // migrate: เพิ่ม owner ถ้ายังไม่มี
      const defaultOwners={jcb:'p2',uob:'p2',the1:'p2',ttb:'p2',uob_mk:'p2',shopee_k:'p2',shopee_f:'p1',ktc:'p1'};
      cfg.ccCards.forEach(c=>{if(!c.owner)c.owner=defaultOwners[c.id]||'p1';});
      // เพิ่มบัตรใหม่ที่ยังไม่มีใน config
      DEFAULT_CC_CARDS.forEach(dc=>{
        if(!cfg.ccCards.find(c=>c.id===dc.id)) cfg.ccCards.push({...dc});
      });
    }
    if(s.fixedIncome)cfg.fixedIncome=s.fixedIncome;
    if(s.fixedExpense){
      // merge: update goal/name/type from saved, but keep ccLinked from default
      ['p1','p2'].forEach(p=>{
        cfg.fixedExpense[p]=cfg.fixedExpense[p].map(defItem=>{
          const saved=s.fixedExpense[p]&&s.fixedExpense[p].find(x=>x.id===defItem.id);
          return saved?{...defItem,...saved,ccLinked:defItem.ccLinked}:defItem;
        });
        // append any extra items user added that aren't in defaults
        (s.fixedExpense[p]||[]).forEach(savedItem=>{
          if(!cfg.fixedExpense[p].find(x=>x.id===savedItem.id)){
            cfg.fixedExpense[p].push(savedItem);
          }
        });
      });
    }
  }catch(e){}
}
function persist(){
  localStorage.setItem('bp3_months',JSON.stringify(months));
  localStorage.setItem('bp3_cfg',JSON.stringify(cfg));
}

function _bpFmt(n){
  const v=f(n);
  return'฿'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}
// safe float — always returns a number, never NaN
function f(v){ return Math.round((parseFloat(String(v).replace(/[^0-9.\-]/g,''))||0)*100)/100; }
// dual-display input helpers: show formatted on blur, raw on focus
function amtFocus(el){ el.value=el.dataset.raw||''; }
function amtBlur(el,cb){
  const v=f(el.value);
  el.dataset.raw=v||'';
  el.value=v?v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  if(cb) cb(v);
}
function amtPaste(el,cb){
  setTimeout(()=>{
    // clean pasted value: remove ฿, spaces, commas (thousand sep), keep digits and dot
    const raw=el.value.replace(/[฿\s,]/g,'').replace(/[^\d.]/g,'');
    el.value=raw;
    el.dataset.raw=raw;
    // auto-blur to format and save
    if(cb) cb(f(raw));
    el.value=f(raw)?f(raw).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  },0);
}
function amtInit(el,v){
  el.dataset.raw=v||'';
  el.value=v&&f(v)?f(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
}
function getCC(id){return cfg.ccCards.find(c=>c.id===id)||{id,name:id}}
function cardColor(id){const i=cfg.ccCards.findIndex(c=>c.id===id);return CC_COLORS[Math.max(0,i)%CC_COLORS.length]}

function calcStatus(type,budget,actual){
  if(!budget&&!actual)return'neutral';
  if(!budget)return'neutral';
  const t=TYPES[type]||TYPES.expense;
  if(!t.goodWhen)return'neutral';
  return t.goodWhen==='gte'?(actual>=budget?'good':'bad'):(actual<=budget?'good':'bad');
}
function statusBadge(type,budget,actual){
  const s=calcStatus(type,budget,actual);
  if(s==='neutral')return`<span class="badge" style="background:var(--card2);color:var(--ink2);border-color:var(--line2)">-</span>`;
  return s==='good'
    ?`<span class="badge" style="background:var(--good-bg);color:var(--good);border-color:var(--good-line)"><i class="ti ti-check" style="font-size:9px"></i> Good</span>`
    :`<span class="badge" style="background:var(--bad-bg);color:var(--bad);border-color:var(--bad-line)"><i class="ti ti-x" style="font-size:9px"></i> Bad</span>`;
}

// ── TOTALS CALC ──
function getIncomeTotal(p){
  const md=getMD();
  const d=md.incomes[p];
  const fixedTotal=cfg.fixedIncome[p].reduce((s,fi)=>s+f(d.fixed[fi.id]),0);
  const extraTotal=(d.extras||[]).reduce((s,e)=>s+f(e.amt),0);
  return fixedTotal+extraTotal;
}
function getSharedUtilityPerPerson(){
  const md=getMD();
  return (f(md.sharedWater)+f(md.sharedElectric))/2;
}
function getSharedFoodPerPerson(){return f(getMD().sharedFood)/2;}
function setSharedFood(v){
  const p1=f(document.getElementById('food-p1')?.dataset.raw||0);
  const p2=f(document.getElementById('food-p2')?.dataset.raw||0);
  const total=p1+p2;
  getMD().sharedFood=total;
  getMD().sharedFoodP1=p1;
  getMD().sharedFoodP2=p2;
  const pp=total/2;
  const tot=document.getElementById('food-total-disp');
  if(tot)tot.textContent='฿'+total.toLocaleString('en-US',{minimumFractionDigits:2});
  const el=document.getElementById('food-per-person');
  if(el)el.textContent='฿'+pp.toLocaleString('en-US',{minimumFractionDigits:2});
  _bpRender();
}
function setSharedWater(v){
  getMD().sharedWater=f(v);
  persist();renderUtility();
  ['p1','p2'].forEach(p=>{renderExpenseCard(p);renderSummaryPerson(p)});
  renderBanner();renderSummaryCommon();
}
function setSharedElectric(v){
  getMD().sharedElectric=f(v);
  persist();renderUtility();
  ['p1','p2'].forEach(p=>{renderExpenseCard(p);renderSummaryPerson(p)});
  renderBanner();renderSummaryCommon();
}
function renderUtility(){
  const md=getMD();
  const water=f(md.sharedWater);
  const electric=f(md.sharedElectric);
  const total=water+electric;
  const per=total/2;

  const setInput=(id,val)=>{
    const el=document.getElementById(id);
    if(el&&!el.matches(':focus')){
      el.dataset.raw=val||'';
      el.value=val?val.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
    }
  };
  setInput('utility-water',water||null);
  setInput('utility-electric',electric||null);
  // food — _bpLoad stored p1/p2 values
  setInput('food-p1',f(md.sharedFoodP1)||null);
  setInput('food-p2',f(md.sharedFoodP2)||null);
  const foodTotal=(f(md.sharedFoodP1)+f(md.sharedFoodP2));
  getMD().sharedFood=foodTotal;
  const foodTotEl=document.getElementById('food-total-disp');
  if(foodTotEl)foodTotEl.textContent='฿'+foodTotal.toLocaleString('en-US',{minimumFractionDigits:2});
  const foodEl=document.getElementById('food-per-person');
  if(foodEl)foodEl.textContent='฿'+(foodTotal/2).toLocaleString('en-US',{minimumFractionDigits:2});

  const totalEl=document.getElementById('utility-total-disp');
  if(totalEl) totalEl.textContent=_bpFmt(total);
  const perEl=document.getElementById('utility-per-person');
  if(perEl) perEl.textContent=_bpFmt(per);

  const disp=document.getElementById('utility-display');
  if(!disp) return;
  if(!total){disp.innerHTML='<div style="font-size:12px;color:var(--ink3);padding:4px 2px">ยังไม่ได้กรอกยอดค่าน้ำ/ค่าไฟ</div>';return;}
  disp.innerHTML=`<div style="display:flex;align-items:center;gap:16px;padding:10px 12px;background:var(--amber-bg);border-radius:12px;border:1px solid var(--amber-line);font-size:13px;flex-wrap:wrap">
    <div><span style="color:var(--ink2)">ค่าน้ำ</span> <strong style="color:var(--amber)">${_bpFmt(water)}</strong></div>
    <div><span style="color:var(--ink2)">ค่าไฟ</span> <strong style="color:var(--amber)">${_bpFmt(electric)}</strong></div>
    <div style="border-left:1px solid var(--amber-line);padding-left:16px"><span style="color:var(--ink2)">รวม</span> <strong style="color:var(--amber)">${_bpFmt(total)}</strong></div>
    <div><span style="color:var(--ink2)">คนละ</span> <strong style="color:var(--amber);font-size:15px">${_bpFmt(per)}</strong></div>
  </div>`;
}

function getCCPersonTotal(p){
  const md=getMD();
  const own=md.cc.reduce((s,c)=>s+f(p==='p1'?(c.p1||0):(c.p2||0)),0);
  const common=md.cc.reduce((s,c)=>s+(f(c.total)-f(c.p1)-f(c.p2)-f(c.other||0)),0)/2;
  return f(own+common);
}
function getExpenseTotal(p){
  // for display in expense card — includes ccLinked as CC actual
  const md=getMD();
  const d=md.expenses[p];
  const fixedTotal=cfg.fixedExpense[p].reduce((s,fe)=>{
    if(fe.ccLinked) return s; // CC already counted in summary via ccOwn+ccShare
    return s+f((d.fixed[fe.id]||{}).actual);
  },0);
  const extraTotal=(d.extras||[]).reduce((s,e)=>s+f(e.actual),0);
  return fixedTotal+extraTotal;
}
function getExpenseDisplayTotal(p){
  // for expense card total row — show ccLinked actual too
  const md=getMD();
  const d=md.expenses[p];
  const hiddenExpD=md.hidden&&md.hidden[p]||[];
  const fixedTotal=cfg.fixedExpense[p].reduce((s,fe)=>{
    if(hiddenExpD.includes(fe.id)) return s;
    if(fe.ccLinked) return s+getCCPersonTotal(p);
    if(fe.foodLinked) return s+getSharedFoodPerPerson();
    if(fe.utilityLinked) return s+getSharedUtilityPerPerson();
    return s+f((d.fixed[fe.id]||{}).actual);
  },0);
  const extraTotal=(d.extras||[]).reduce((s,e)=>s+f(e.actual),0);
  return fixedTotal+extraTotal;
}
function getGoal(fe){ return f(fe.goal); }

// ── MONTH NAV ──
function resetPerson(p){
  const name=p==='p1'?cfg.p1:p==='p2'?cfg.p2:'บัตรเครดิต';
  const label=MONTHS_TH[curMonth]+' '+(curYear+543);
  if(!confirm(`ล้างข้อมูล "${name}" เดือน ${label}?`)) return;
  const md=getMD();
  if(p==='common'){
    md.cc=[];
  } else {
    md.incomes[p]={fixed:{},extras:[]};
    md.expenses[p]={fixed:{},extras:[]};
  }
  persist(); _bpRender();
  _bpToast(`ล้างข้อมูล ${name} เดือน ${label} แล้ว`);
}

function resetMonth(){
  const label=MONTHS_TH[curMonth]+' '+(curYear+543);
  if(!confirm(`ล้างข้อมูลทั้งหมดของเดือน ${label}?\n(รายรับ รายจ่าย และบัตรเครดิตเดือนนี้จะหายทั้งหมด)`)) return;
  delete months[mkey()];
  persist(); _bpRender();
  _bpToast(`ล้างข้อมูลเดือน ${label} แล้ว`);
}

function changeMonth(d){
  curMonth+=d;if(curMonth>11){curMonth=0;curYear++}if(curMonth<0){curMonth=11;curYear--}
  document.getElementById('month-label').textContent=`${MONTHS_TH[curMonth]} ${curYear+543}`;
  _bpRender();
}

// ── PERSON TABS ──
function switchPerson(p,btn){
  curPerson=p;
  document.querySelectorAll('.ptab').forEach(b=>b.className='ptab');
  const cls = p==='p1'?'active-p1':p==='p2'?'active-p2':'active-common';
  btn.classList.add(cls);
  ['p1','p2','common'].forEach(id=>{
    const el=document.getElementById(`sec-${id}`);
    if(el) el.style.display=id===p?'block':'none';
  });
}

// ── RENDER ──
function _bpRender(){
  renderBanner();
  ['p1','p2'].forEach(p=>{renderIncomeCard(p);renderExpenseCard(p);renderSummaryPerson(p)});
  renderCC();renderUtility();renderSummaryCommon();
  updateLabels();populateCCSelect();
  setTimeout(bindDecimalInputs,0);
}

function renderBanner(){
  const inc1=getIncomeTotal('p1'),inc2=getIncomeTotal('p2');
  const md=getMD();
  const ccCommon=md.cc.reduce((s,c)=>s+(f(c.total)-f(c.p1)-f(c.p2)-f(c.other||0)),0);
  const exp1=getExpenseDisplayTotal('p1'),exp2=getExpenseDisplayTotal('p2');
  // คงเหลือ = รายรับ − รายจ่ายที่แสดง (รวม ค่ากิน÷2 + น้ำไฟ÷2 + บัตร + ออม/ลงทุน) ให้ตรงกับการ์ดสรุปด้านล่าง
  const rem1=inc1-exp1;
  const rem2=inc2-exp2;
  const rem=rem1+rem2;
  const isGood=rem>=0;
  const ms=document.getElementById('month-status');
  ms.textContent=isGood?'Good ✓':'Bad ✗';
  ms.style.cssText=`border-color:${isGood?'var(--good-line)':'var(--bad-line)'};background:${isGood?'var(--good-bg)':'var(--bad-bg)'};color:${isGood?'var(--good)':'var(--bad)'}`;

  function personPill(name,clr,bg,bl,inc,exp,rem){
    const rc=rem>=0?clr:'var(--bad)';
    return`<div class="bpill" style="border-color:${bl}">
      <div class="bpill-lbl" style="color:${clr}"><i class="ti ti-user" style="font-size:10px"></i>${name}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;margin-top:6px">
        <div>
          <div style="font-size:9px;color:var(--ink3);margin-bottom:1px">รายรับ</div>
          <div style="font-size:13px;font-weight:700;color:var(--good)">${_bpFmt(inc)}</div>
        </div>
        <div>
          <div style="font-size:9px;color:var(--ink3);margin-bottom:1px">รายจ่าย</div>
          <div style="font-size:13px;font-weight:700;color:var(--amber)">${_bpFmt(exp)}</div>
        </div>
      </div>
      <div style="border-top:1px solid ${bl};margin-top:8px;padding-top:6px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:9px;color:var(--ink3)">คงเหลือ</div>
        <div style="font-size:15px;font-weight:700;color:${rc}">${_bpFmt(rem)}</div>
      </div>
    </div>`;
  }

  document.getElementById('banner').innerHTML=
    personPill(cfg.p1,'var(--sky)','var(--sky-bg)','var(--sky-line)',inc1,exp1,rem1)+
    personPill(cfg.p2,'var(--rose)','var(--rose-bg)','var(--rose-line)',inc2,exp2,rem2)+
    `<div class="bpill" style="border-color:var(--lilac-line)">
      <div class="bpill-lbl" style="color:var(--lilac)"><i class="ti ti-credit-card" style="font-size:10px"></i>บัตรเครดิต</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;margin-top:6px">
        <div>
          <div style="font-size:9px;color:var(--ink3);margin-bottom:1px">กองกลาง</div>
          <div style="font-size:13px;font-weight:700;color:var(--lilac)">${_bpFmt(ccCommon)}</div>
        </div>
        <div>
          <div style="font-size:9px;color:var(--ink3);margin-bottom:1px">คนละ</div>
          <div style="font-size:13px;font-weight:700;color:var(--lilac)">${_bpFmt(ccCommon/2)}</div>
        </div>
      </div>
      <div style="border-top:1px solid var(--lilac-line);margin-top:8px;padding-top:6px;font-size:9px;color:var(--ink3)">${md.cc.length} ใบบัตร</div>
    </div>`+
    `<div class="bpill" style="border-color:${isGood?'var(--good-line)':'var(--bad-line)'}">
      <div class="bpill-lbl"><i class="ti ti-coins" style="font-size:10px"></i>ภาพรวม</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;margin-top:6px">
        <div>
          <div style="font-size:9px;color:var(--ink3);margin-bottom:1px">รายรับรวม</div>
          <div style="font-size:13px;font-weight:700;color:var(--good)">${_bpFmt(inc1+inc2)}</div>
        </div>
        <div>
          <div style="font-size:9px;color:var(--ink3);margin-bottom:1px">รายจ่ายรวม</div>
          <div style="font-size:13px;font-weight:700;color:var(--amber)">${_bpFmt(exp1+exp2)}</div>
        </div>
      </div>
      <div style="border-top:1px solid ${isGood?'var(--good-line)':'var(--bad-line)'};margin-top:8px;padding-top:6px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:9px;color:var(--ink3)">คงเหลือรวม</div>
        <div style="font-size:15px;font-weight:700;color:${isGood?'var(--good)':'var(--bad)'}">${_bpFmt(rem)}</div>
      </div>
    </div>`;
}
function renderIncomeCard(p){
  const md=getMD();const d=md.incomes[p];
  const clr=p==='p1'?'var(--sky)':'var(--rose)';
  const bg=p==='p1'?'var(--sky-bg)':'var(--rose-bg)';
  const bl=p==='p1'?'var(--sky-line)':'var(--rose-line)';
  const total=getIncomeTotal(p);
  let rows='';
  // fixed items
  const hiddenIncIds=md.hidden[p]||[];
  cfg.fixedIncome[p].forEach((fi,i)=>{
    if(hiddenIncIds.includes(fi.id)) return;
    const val=f(d.fixed[fi.id]);
    rows+=`<div class="fixed-item">
      <div class="fixed-item-num" style="background:${bg};border:1px solid ${bl};color:${clr}">${i+1}</div>
      <div style="flex:1;min-width:0"><div class="fixed-item-name">${fi.name}</div>${fi.note?`<div class="fixed-item-sub">${fi.note}</div>`:''}</div>
      <div class="fixed-item-inputs">
        <input class="amt-input ${p==='p2'?'rose':''}" type="text" inputmode="decimal"
          placeholder="0.00" style="border-color:${bl}40"
          onfocus="amtFocus(this)"
          onblur="amtBlur(this,v=>setFixedIncome('${p}','${fi.id}',v))" onpaste="amtPaste(this,v=>setFixedIncome('${p}','${fi.id}',v))"
          data-raw="${val||''}"
          value="${val?f(val).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):''}">
        <button class="del-item-btn" onclick="delFixed('income','${p}','${fi.id}')" title="ลบรายการนี้"><i class="ti ti-trash" style="font-size:13px"></i> ลบ</button>
      </div>
    </div>`;
  });
  // extras
  (d.extras||[]).forEach(e=>{
    rows+=`<div class="fixed-item" style="border-color:${bl}60">
      <div class="fixed-item-num" style="background:${bg};border:1px solid ${bl};color:${clr};opacity:.6">+</div>
      <div style="flex:1;min-width:0"><div class="fixed-item-name">${e.name}</div>${e.note?`<div class="fixed-item-sub">${e.note}</div>`:''}</div>
      <div class="fixed-item-inputs">
        <input class="amt-input ${p==='p2'?'rose':''}" type="text" inputmode="decimal"
          placeholder="0.00"
          onfocus="amtFocus(this)"
          onblur="amtBlur(this,v=>{const ex=getMD().incomes['${p}'].extras.find(x=>x.id===${e.id});if(ex){ex.amt=v;}persist();renderBanner();renderIncomeCard('${p}');renderSummaryPerson('${p}');renderSummaryCommon();})" onpaste="amtPaste(this,v=>{const ex=getMD().incomes['${p}'].extras.find(x=>x.id===${e.id});if(ex){ex.amt=v;}persist();renderBanner();renderIncomeCard('${p}');renderSummaryPerson('${p}');renderSummaryCommon();})"
          data-raw="${e.amt||''}"
          value="${e.amt?f(e.amt).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):''}">
        <button class="del-item-btn" onclick="delExtraIncome('${p}',${e.id})" title="ลบ"><i class="ti ti-trash" style="font-size:13px"></i> ลบ</button>
      </div>
    </div>`;
  });
  document.getElementById(`inc-card-${p}`).innerHTML=`
    <div class="card-head">
      <div class="card-head-left">
        <div class="sicon" style="background:${bg};border:1.5px solid ${bl};font-size:17px;display:flex;align-items:center;justify-content:center">💵</div>
        <div><div class="stitle">รายรับ</div><div class="ssub">${cfg.fixedIncome[p].length+(d.extras||[]).length} รายการ</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-size:17px;font-weight:700;color:${clr}">${_bpFmt(total)}</div>
        <button onclick="resetPerson('${p}')" style="height:26px;padding:0 10px;font-size:11px;font-weight:600;border-radius:8px;border:1px solid var(--bad-line);background:var(--bad-bg);color:var(--bad);cursor:pointer;display:flex;align-items:center;gap:4px;font-family:inherit"><i class=\"ti ti-refresh\" style=\"font-size:12px\"></i> Reset</button>
      </div>
    </div>
    <div class="fixed-list">${rows||'<div class="empty-state"><i class="ti ti-inbox"></i>ไม่มีรายการ</div>'}</div>
    <div class="section-total"><span style="color:var(--ink2)">รวมรายรับ</span><span style="color:${clr}">${_bpFmt(total)}</span></div>
    <div class="add-new-row" style="margin-top:8px">
      <div class="field"><label>ชื่อรายรับเพิ่มเติม</label><input id="extra-inc-name-${p}" type="text" placeholder="เช่น freelance, ดอกเบี้ย"></div>
      <div class="field narrow"><label>จำนวน (฿)</label><input id="extra-inc-amt-${p}" type="text" inputmode="decimal" placeholder="0.00"></div>
      <div class="field xnarrow"><label>หมายเหตุ</label><input id="extra-inc-note-${p}" type="text" placeholder="..."></div>
      <button class="add-btn" style="background:${clr};color:#fff" onclick="addExtraIncome('${p}')"><i class="ti ti-plus"></i>เพิ่ม</button>
    </div>`;
}

function renderExpenseCard(p){
  const md=getMD();const d=md.expenses[p];
  const clr=p==='p1'?'var(--sky)':'var(--rose)';
  const bg=p==='p1'?'var(--sky-bg)':'var(--rose-bg)';
  const bl=p==='p1'?'var(--sky-line)':'var(--rose-line)';
  const hiddenIds=md.hidden&&md.hidden[p]||[];
  const totB=cfg.fixedExpense[p].filter(fe=>!hiddenIds.includes(fe.id)).reduce((s,fe)=>s+getGoal(fe),0)+(d.extras||[]).reduce((s,e)=>s+f(e.budget),0);
  const totA=getExpenseDisplayTotal(p);

  // build table rows
  let trows='';
  let rowNum=0;
  cfg.fixedExpense[p].forEach((fe)=>{
    if(hiddenIds.includes(fe.id)) return;
    rowNum++;
    const fdata=d.fixed[fe.id]||{actual:0};
    const tc=TYPES[fe.type]||TYPES.expense;
    const goal=getGoal(fe);

    if(fe.foodLinked){
      const foodActual=getSharedFoodPerPerson();
      const s=calcStatus(fe.type,goal,foodActual);
      const statusCell=s==='good'?`<span class="badge" style="background:var(--good-bg);color:var(--good);border-color:var(--good-line)">Good</span>`:s==='bad'?`<span class="badge" style="background:var(--bad-bg);color:var(--bad);border-color:var(--bad-line)">Bad</span>`:`<span class="badge" style="background:var(--card2);color:var(--ink2);border-color:var(--line2)">-</span>`;
      trows+=`<tr style="background:var(--amber-bg)">
        <td style="color:var(--amber);font-weight:700;text-align:center">${rowNum}</td>
        <td><span style="font-weight:600;color:var(--amber)">${fe.name}</span> <span style="font-size:10px;background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-line);border-radius:8px;padding:1px 6px">ดึงจากกองกลาง ÷2</span></td>
        <td style="text-align:right;color:var(--teal);font-weight:600">${goal?_bpFmt(goal):'-'}</td>
        <td style="text-align:right"><input class="amt-input" type="text" value="${_bpFmt(foodActual).replace('฿','')}" disabled style="width:120px;font-size:13px;text-align:right;background:var(--amber-bg);color:var(--amber);border-color:var(--amber-line);font-weight:700;cursor:not-allowed;opacity:.85"></td>
        <td style="text-align:center">${statusCell}</td>
        <td style="text-align:center"><button class="del-item-btn" style="height:26px;padding:0 8px;font-size:11px" onclick="delFixed('expense','${p}','${fe.id}')"><i class="ti ti-trash"></i> ลบ</button></td>
      </tr>`;
      return;
    }
    if(fe.utilityLinked){
      const utilActual=getSharedUtilityPerPerson();
      const s=calcStatus(fe.type,goal,utilActual);
      const statusCell=s==='good'?`<span class="badge" style="background:var(--good-bg);color:var(--good);border-color:var(--good-line)">Good</span>`:s==='bad'?`<span class="badge" style="background:var(--bad-bg);color:var(--bad);border-color:var(--bad-line)">Bad</span>`:`<span class="badge" style="background:var(--card2);color:var(--ink2);border-color:var(--line2)">-</span>`;
      trows+=`<tr style="background:var(--amber-bg)">
        <td style="color:var(--amber);font-weight:700;text-align:center">${rowNum}</td>
        <td><span style="font-weight:600;color:var(--amber)">${fe.name}</span> <span style="font-size:10px;background:var(--amber-bg);color:var(--amber);border:1px solid var(--amber-line);border-radius:8px;padding:1px 6px">ดึงจากกองกลาง ÷2</span></td>
        <td style="text-align:right;color:var(--teal);font-weight:600">${goal?_bpFmt(goal):'-'}</td>
        <td style="text-align:right"><input class="amt-input" type="text" value="${_bpFmt(utilActual).replace('฿','')}" disabled style="width:120px;font-size:13px;text-align:right;background:var(--amber-bg);color:var(--amber);border-color:var(--amber-line);font-weight:700;cursor:not-allowed;opacity:.85"></td>
        <td style="text-align:center">${statusCell}</td>
        <td style="text-align:center"><button class="del-item-btn" style="height:26px;padding:0 8px;font-size:11px" onclick="delFixed('expense','${p}','${fe.id}')"><i class="ti ti-trash"></i> ลบ</button></td>
      </tr>`;
      return;
    }
    if(fe.ccLinked){
      const ccActual=getCCPersonTotal(p);
      const s=calcStatus(fe.type,goal,ccActual);
      const statusCell=s==='good'?`<span class="badge" style="background:var(--good-bg);color:var(--good);border-color:var(--good-line)">Good</span>`:s==='bad'?`<span class="badge" style="background:var(--bad-bg);color:var(--bad);border-color:var(--bad-line)">Bad</span>`:`<span class="badge" style="background:var(--card2);color:var(--ink2);border-color:var(--line2)">-</span>`;
      trows+=`<tr style="background:var(--lilac-bg)">
        <td style="color:var(--lilac);font-weight:700;text-align:center">${rowNum}</td>
        <td><span style="font-weight:600;color:var(--lilac)">${fe.name}</span> <span style="font-size:10px;background:var(--lilac-bg);color:var(--lilac);border:1px solid var(--lilac-line);border-radius:8px;padding:1px 6px">ดึงจากบัตร</span></td>
        <td style="text-align:right;color:var(--teal);font-weight:600">${goal?_bpFmt(goal):'-'}</td>
        <td style="text-align:right"><input class="amt-input" type="text" value="${_bpFmt(ccActual)}" disabled style="width:120px;font-size:13px;text-align:right;background:var(--lilac-bg);color:var(--lilac);border-color:var(--lilac-line);font-weight:700;cursor:not-allowed;opacity:0.85"></td>
        <td style="text-align:center">${statusCell}</td>
        <td></td>
      </tr>`;
      // cc sub-rows
      if(md.cc.length){
        md.cc.forEach(c=>{
          const card=getCC(c.cardId);const dot=cardColor(c.cardId);
          const own=f(p==='p1'?c.p1:c.p2);const share=(f(c.total)-f(c.p1)-f(c.p2)-f(c.other))/2;
          trows+=`<tr style="background:var(--card2)">
            <td></td>
            <td style="padding-left:20px;font-size:12px;color:var(--ink2)">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dot};margin-right:5px;vertical-align:middle"></span>
              ${card.name}${c.note?` <span style="color:var(--ink3)">(${c.note})</span>`:''}
              <span style="color:var(--ink3);margin-left:6px">ส่วนตัว ${_bpFmt(own)} + กลาง ${_bpFmt(share)}</span>
            </td>
            <td></td>
            <td style="text-align:right;font-size:12px;font-weight:600;color:var(--lilac)">${_bpFmt(own+share)}</td>
            <td></td><td></td>
          </tr>`;
        });
      } else {
        trows+=`<tr><td></td><td colspan="5" style="font-size:11px;color:var(--ink3);padding-left:20px">ยังไม่มีรายการบัตร</td></tr>`;
      }
      return;
    }

    const actual=f(fdata.actual);
    const s=calcStatus(fe.type,goal,actual);
    const statusCell=s==='good'?`<span class="badge" style="background:var(--good-bg);color:var(--good);border-color:var(--good-line)">Good</span>`:s==='bad'?`<span class="badge" style="background:var(--bad-bg);color:var(--bad);border-color:var(--bad-line)">Bad</span>`:`<span class="badge" style="background:var(--card2);color:var(--ink2);border-color:var(--line2)">-</span>`;
    const typeTag=`<span class="type-tag" style="${tc.style}">${tc.label}</span>`;
    trows+=`<tr>
      <td style="text-align:center;color:var(--ink2)">${rowNum}</td>
      <td>${fe.name} ${typeTag}</td>
      <td style="text-align:right;color:var(--teal);font-weight:600">${goal?_bpFmt(goal):'-'}</td>
      <td style="text-align:right">
        <input class="amt-input ${p==='p2'?'rose':''}" type="text" inputmode="decimal"
          placeholder="0.00" style="width:130px;font-size:13px;text-align:right"
          onfocus="amtFocus(this)"
          onblur="amtBlur(this,v=>setFixedExpense('${p}','${fe.id}','actual',v))" onpaste="amtPaste(this,v=>setFixedExpense('${p}','${fe.id}','actual',v))"
          data-raw="${actual||''}"
          value="${actual?f(actual).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):''}">
      </td>
      <td style="text-align:center">${statusCell}</td>
      <td style="text-align:center"><button class="del-item-btn" style="height:26px;padding:0 8px;font-size:11px" onclick="delFixed('expense','${p}','${fe.id}')"><i class="ti ti-trash"></i> ลบ</button></td>
    </tr>`;
  });

  (d.extras||[]).forEach(e=>{
    rowNum++;
    const tc=TYPES[e.type]||TYPES.expense;
    const s=calcStatus(e.type,e.budget||0,e.actual||0);
    const statusCell=s==='good'?`<span class="badge" style="background:var(--good-bg);color:var(--good);border-color:var(--good-line)">Good</span>`:s==='bad'?`<span class="badge" style="background:var(--bad-bg);color:var(--bad);border-color:var(--bad-line)">Bad</span>`:`<span class="badge" style="background:var(--card2);color:var(--ink2);border-color:var(--line2)">-</span>`;
    trows+=`<tr style="background:var(--card2)">
      <td style="text-align:center;color:var(--ink2);font-style:italic">+</td>
      <td>${e.name} <span class="type-tag" style="${tc.style}">${tc.label}</span></td>
      <td style="text-align:right">
        <input class="amt-input" type="text" inputmode="decimal"
          placeholder="0.00" style="width:120px;font-size:12px;text-align:right;border-color:var(--teal-line);background:var(--teal-bg)"
          onfocus="amtFocus(this)"
          onblur="amtBlur(this,v=>setExtraExpense('${p}',${e.id},'budget',v))" onpaste="amtPaste(this,v=>setExtraExpense('${p}',${e.id},'budget',v))"
          data-raw="${e.budget||''}"
          value="${e.budget?f(e.budget).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):''}">
      </td>
      <td style="text-align:right">
        <input class="amt-input ${p==='p2'?'rose':''}" type="text" inputmode="decimal"
          placeholder="0.00" style="width:120px;font-size:12px;text-align:right"
          onfocus="amtFocus(this)"
          onblur="amtBlur(this,v=>setExtraExpense('${p}',${e.id},'actual',v))" onpaste="amtPaste(this,v=>setExtraExpense('${p}',${e.id},'actual',v))"
          data-raw="${e.actual||''}"
          value="${e.actual?f(e.actual).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):''}">
      </td>
      <td style="text-align:center">${statusCell}</td>
      <td style="text-align:center"><button class="del-item-btn" style="height:26px;padding:0 8px;font-size:11px" onclick="delExtraExpense('${p}',${e.id})"><i class="ti ti-trash"></i> ลบ</button></td>
    </tr>`;
  });

  document.getElementById(`exp-card-${p}`).innerHTML=`
    <div class="card-head">
      <div class="card-head-left">
        <div class="sicon" style="background:var(--amber-bg);border:1.5px solid var(--amber-line);font-size:17px;display:flex;align-items:center;justify-content:center">🧾</div>
        <div><div class="stitle">รายจ่าย</div><div class="ssub">${cfg.fixedExpense[p].length+(d.extras||[]).length} รายการ</div></div>
      </div>
      <button onclick="resetPerson('${p}')" style="height:26px;padding:0 10px;font-size:11px;font-weight:600;border-radius:8px;border:1px solid var(--bad-line);background:var(--bad-bg);color:var(--bad);cursor:pointer;display:flex;align-items:center;gap:4px;font-family:inherit"><i class=\"ti ti-refresh\" style=\"font-size:12px\"></i> Reset</button>
    </div>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:var(--amber-bg);border-bottom:2px solid var(--amber-line)">
          <th style="width:36px;padding:8px 6px;text-align:center;font-size:11px;color:var(--amber);font-weight:700">No</th>
          <th style="padding:8px 8px;text-align:left;font-size:11px;color:var(--amber);font-weight:700">รายการ</th>
          <th style="width:130px;padding:8px 8px;text-align:right;font-size:11px;color:var(--teal);font-weight:700">Goal (฿)</th>
          <th style="width:140px;padding:8px 8px;text-align:right;font-size:11px;color:var(--amber);font-weight:700">ทำได้จริง (฿)</th>
          <th style="width:70px;padding:8px 6px;text-align:center;font-size:11px;color:var(--ink2);font-weight:700">สถานะ</th>
          <th style="width:60px"></th>
        </tr>
      </thead>
      <tbody id="exp-tbody-${p}">
        ${trows}
        <tr style="background:var(--amber-bg);border-top:2px solid var(--amber-line)">
          <td colspan="2" style="padding:9px 8px;font-weight:700;color:var(--amber);font-size:13px">รวม</td>
          <td style="text-align:right;font-weight:700;color:var(--teal);padding:9px 8px">${_bpFmt(totB)}</td>
          <td style="text-align:right;font-weight:700;color:var(--amber);padding:9px 8px">${_bpFmt(totA)}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
    </div>
    <div class="add-new-row" style="margin-top:8px">
      <div class="field"><label>ชื่อรายการเพิ่มเติม</label><input id="extra-exp-name-${p}" type="text" placeholder="เช่น ค่าหมอ, ซื้อของ"></div>
      <div class="field xnarrow"><label>ประเภท</label>
        <select id="extra-exp-type-${p}">
          <option value="expense">รายจ่าย</option>
          <option value="invest">ลงทุน</option>
          <option value="save">ออม</option>
        </select>
      </div>
      <div class="field narrow"><label>Goal</label><input id="extra-exp-budget-${p}" type="text" inputmode="decimal" placeholder="0.00"></div>
      <div class="field narrow"><label>จริง</label><input id="extra-exp-actual-${p}" type="text" inputmode="decimal" placeholder="0.00"></div>
      <button class="add-btn" style="background:var(--amber);color:#fff" onclick="addExtraExpense('${p}')"><i class="ti ti-plus"></i>เพิ่ม</button>
    </div>`;
}

function renderCC(){
  renderUtility();
  const md=getMD();
  const listEl=document.getElementById('cc-list');
  const sumEl=document.getElementById('cc-sum');
  if(!md.cc.length){listEl.innerHTML='<div class="empty-state"><i class="ti ti-inbox"></i>ยังไม่มีรายการบัตร</div>';sumEl.innerHTML='';return}
  listEl.innerHTML=md.cc.map(c=>{
    const card=getCC(c.cardId);const clr=cardColor(c.cardId);
    const other=f(c.other);
    const common=f(c.total)-f(c.p1)-f(c.p2)-f(c.other);
    const owner=card.owner||'p1';
    const ownerName=owner==='p1'?cfg.p1:cfg.p2;
    const ownerClr=owner==='p1'?'var(--sky)':'var(--rose)';
    const ownerBg=owner==='p1'?'var(--sky-bg)':'var(--rose-bg)';
    const ownerBorder=owner==='p1'?'var(--sky-line)':'var(--rose-line)';
    return`<div class="cc-item">
      <div class="cc-dot" style="background:${clr}"></div>
      <div class="cc-name">${card.name}${c.note?` <span class="cc-note">(${c.note})</span>`:''} <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;background:${ownerBg};color:${ownerClr};border:1px solid ${ownerBorder}">👤 ${ownerName}</span></div>
      <div class="cc-chip" style="background:var(--sky-bg);color:var(--sky);border-color:var(--sky-line)">${cfg.p1} ${_bpFmt(c.p1)}</div>
      <div class="cc-chip" style="background:var(--rose-bg);color:var(--rose);border-color:var(--rose-line)">${cfg.p2} ${_bpFmt(c.p2)}</div>
      ${other?`<div class="cc-chip" style="background:var(--sage-bg);color:var(--sage);border-color:var(--sage-line)">อื่นๆ ${_bpFmt(other)}</div>`:''}
      <div class="cc-chip" style="background:var(--teal-bg);color:var(--teal);border-color:var(--teal-line)">กลาง ${_bpFmt(common)}</div>
      <div class="cc-total">${_bpFmt(c.total)}</div>
      <button class="del-item-btn" onclick="delCC(${c.id})" title="ลบ"><i class="ti ti-trash" style="font-size:13px"></i> ลบ</button>
    </div>`;
  }).join('');
  const totT=md.cc.reduce((s,c)=>s+f(c.total),0);
  const totP1=md.cc.reduce((s,c)=>s+f(c.p1),0);
  const totP2=md.cc.reduce((s,c)=>s+f(c.p2),0);
  const totOther=md.cc.reduce((s,c)=>s+f(c.other||0),0);
  const totC=totT-totP1-totP2-totOther;
  // แยกตาม owner
  let p1cardP1=0,p1cardP2=0,p1cardCommon=0; // บัตรโฟม: โฟมรูด เข่งรูด กองกลาง
  let p2cardP1=0,p2cardP2=0,p2cardCommon=0; // บัตรเข่ง: โฟมรูด เข่งรูด กองกลาง
  md.cc.forEach(c=>{
    const common=f(c.total)-f(c.p1)-f(c.p2)-f(c.other||0);
    const card=cfg.ccCards.find(x=>x.id===c.cardId);
    if((card?.owner||'p1')==='p1'){p1cardP1+=f(c.p1);p1cardP2+=f(c.p2);p1cardCommon+=common;}
    else{p2cardP1+=f(c.p1);p2cardP2+=f(c.p2);p2cardCommon+=common;}
  });
  const mkRow=(label,p1v,p2v,cv,clr,bg,bl)=>`
    <div style="background:${bg};border:1.5px solid ${bl};border-radius:14px;padding:14px 16px;flex:1;min-width:200px">
      <div style="font-size:12px;font-weight:700;color:${clr};margin-bottom:10px;display:flex;align-items:center;gap:6px"><i class="ti ti-credit-card" style="font-size:14px"></i> บัตร${label}</div>
      <div style="display:flex;flex-direction:column;gap:0">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid ${bl}"><span style="font-size:12px;color:var(--sky)">${cfg.p1}</span><span style="font-size:13px;font-weight:700;color:var(--sky)">${_bpFmt(p1v)}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:${cv>0?'1px solid '+bl:'none'}"><span style="font-size:12px;color:var(--rose)">${cfg.p2}</span><span style="font-size:13px;font-weight:700;color:var(--rose)">${_bpFmt(p2v)}</span></div>
        ${cv>0?`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><span style="font-size:12px;color:var(--teal)">กองกลาง</span><div style="text-align:right"><div style="font-size:13px;font-weight:700;color:var(--teal)">${_bpFmt(cv)}</div><div style="font-size:10px;color:var(--teal);opacity:.7">คนละ ${_bpFmt(cv/2)}</div></div></div>`:''}
      </div>
    </div>`;
  const p1block=p1cardP1+p1cardP2+p1cardCommon>0?mkRow('บัตร'+cfg.p1,p1cardP1,p1cardP2,p1cardCommon,'var(--sky)','var(--sky-bg)','var(--sky-line)'):'';
  const p2block=p2cardP1+p2cardP2+p2cardCommon>0?mkRow('บัตร'+cfg.p2,p2cardP1,p2cardP2,p2cardCommon,'var(--rose)','var(--rose-bg)','var(--rose-line)'):'';
  sumEl.innerHTML=`
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">${p1block}${p2block}</div>
    <div style="display:flex;justify-content:flex-end;align-items:center;padding-top:8px;border-top:1px solid var(--line);gap:16px">
      ${totOther?`<span style="font-size:12px;color:var(--ink2)">อื่นๆ <strong style="color:var(--sage)">${_bpFmt(totOther)}</strong> <span style="font-size:10px">(ไม่รวม)</span></span>`:''}
      <span style="font-size:13px;font-weight:700;color:var(--ink)">รวมทั้งหมด ${_bpFmt(totT)}</span>
    </div>`;
}

function renderSummaryPerson(p){
  const md=getMD();
  const inc=getIncomeTotal(p);
  const clr=p==='p1'?'var(--sky)':'var(--rose)';
  const bl=p==='p1'?'var(--sky-line)':'var(--rose-line)';
  const bg=p==='p1'?'var(--sky-bg)':'var(--rose-bg)';

  // split expenses: regular vs invest/save
  const d=md.expenses[p];
  const hiddenIds=md.hidden&&md.hidden[p]||[];
  let expenseAmt=0, investSaveAmt=0;
  cfg.fixedExpense[p].forEach(fe=>{
    if(hiddenIds.includes(fe.id)) return;       // ข้ามรายการที่ซ่อน (ให้ตรงกับการ์ดรายจ่าย)
    if(fe.ccLinked){
      // cc counted separately via ccTotal
      return;
    }
    if(fe.foodLinked){ expenseAmt+=getSharedFoodPerPerson(); return; }      // ค่ากิน ÷2
    if(fe.utilityLinked){ expenseAmt+=getSharedUtilityPerPerson(); return; } // ค่าน้ำไฟ ÷2
    const actual=f((d.fixed[fe.id]||{}).actual);
    if(fe.type==='invest'||fe.type==='save') investSaveAmt+=actual;
    else expenseAmt+=actual;
  });
  (d.extras||[]).forEach(e=>{
    if(e.type==='invest'||e.type==='save') investSaveAmt+=f(e.actual);
    else expenseAmt+=f(e.actual);
  });
  const ccTotal=getCCPersonTotal(p);
  const totalOut=expenseAmt+ccTotal;
  const rem=inc-totalOut-investSaveAmt;
  const isGood=rem>=0;

  document.getElementById(`sum-card-${p}`).innerHTML=`
    <div class="card-head"><div class="card-head-left">
      <div class="sicon" style="background:${bg};border:1.5px solid ${bl};font-size:17px;display:flex;align-items:center;justify-content:center">💰</div>
      <div><div class="stitle">สรุป ${p==='p1'?cfg.p1:cfg.p2}</div></div>
    </div></div>
    <div class="sum-list">
      <div class="sum-row sub">
        <span>รายรับรวม</span>
        <span style="color:${clr};font-weight:600">${_bpFmt(inc)}</span>
      </div>
      <div class="sum-row sub">
        <span>รายจ่ายรวม <span style="font-size:10px;color:var(--ink3)">(รวมบัตร)</span></span>
        <span style="color:var(--amber)">− ${_bpFmt(expenseAmt+ccTotal)}</span>
      </div>
      <div class="sum-row sub" style="padding-left:16px">
        <span style="font-size:12px">· รายจ่ายทั่วไป</span>
        <span style="font-size:12px;color:var(--amber)">− ${_bpFmt(expenseAmt)}</span>
      </div>
      <div class="sum-row sub" style="padding-left:16px">
        <span style="font-size:12px">· บัตร (กองกลาง÷2 + ส่วนตัว)</span>
        <span style="font-size:12px;color:var(--lilac)">− ${_bpFmt(ccTotal)}</span>
      </div>
      <div class="sum-row sub">
        <span>ออม + ลงทุน</span>
        <span style="color:var(--teal);font-weight:600">− ${_bpFmt(investSaveAmt)}</span>
      </div>
    </div>
    <div class="remain-box" style="background:${isGood?'var(--good-bg)':'var(--bad-bg)'};border-color:${isGood?'var(--good-line)':'var(--bad-line)'}">
      <div><div class="remain-lbl">คงเหลือ</div><div class="remain-sub">${isGood?'Good ✓':'Bad ✗'}</div></div>
      <div class="remain-val" style="color:${isGood?'var(--good)':'var(--bad)'}">${_bpFmt(rem)}</div>
    </div>`;
}

function renderSummaryCommon(){
  const el=document.getElementById('sum-card-common');
  const se=document.getElementById('settlement-card');
  if(!el)return;
  const inc1=getIncomeTotal('p1'),inc2=getIncomeTotal('p2');
  const exp1=getExpenseTotal('p1'),exp2=getExpenseTotal('p2');
  const md=getMD();
  const ccP1=md.cc.reduce((s,c)=>s+f(c.p1),0);
  const ccP2=md.cc.reduce((s,c)=>s+f(c.p2),0);
  const ccCommon=md.cc.reduce((s,c)=>s+(f(c.total)-f(c.p1)-f(c.p2)-f(c.other||0)),0);
  const totalOut=exp1+exp2+ccP1+ccP2+ccCommon;
  const rem=(inc1+inc2)-totalOut;
  const isGood=rem>=0;
  // itemized per person
  const utilTotal=f(md.sharedWater)+f(md.sharedElectric);
  const util1=utilTotal; // โฟมจ่ายก่อนทั้งหมด
  const util2=0;
  const foodP1actual=f(md.sharedFoodP1)||0;
  const foodP2actual=f(md.sharedFoodP2)||0;
  const food1=foodP1actual;
  const food2=foodP2actual;
  const ccShare=ccCommon/2;
  // cc กองกลางที่แต่ละคนจ่ายจริงตามเจ้าของบัตร
  let ccCommonByP1=0,ccCommonByP2=0,ccP1inP2card=0,ccP2inP1card=0;
  md.cc.forEach(entry=>{
    const common=f(entry.total)-f(entry.p1)-f(entry.p2)-f(entry.other||0);
    const card=cfg.ccCards.find(c=>c.id===entry.cardId);
    const owner=(card?.owner||'p1');
    if(owner==='p1'){
      ccCommonByP1+=Math.max(0,common);
      ccP2inP1card+=f(entry.p2); // เข่งในบัตรโฟม
    } else {
      ccCommonByP2+=Math.max(0,common);
      ccP1inP2card+=f(entry.p1); // โฟมในบัตรเข่ง
    }
  });
  // p1Total = ยอดที่โฟมจ่ายจริง: น้ำไฟทั้งหมด + ค่ากิน + กองกลางบัตรโฟม + โฟมในบัตรเข่ง
  const p1Total=util1+food1+ccCommonByP1+ccP1inP2card;
  // p2Total = ยอดที่เข่งจ่ายจริง: ค่ากิน + กองกลางบัตรเข่ง + เข่งในบัตรโฟม
  const p2Total=util2+food2+ccCommonByP2+ccP2inP1card;
  const avg=(p1Total+p2Total)/2;
  const diff=p1Total-p2Total; // + = p1 จ่ายมากกว่า

  el.innerHTML=`
    <div class="card-head"><div class="card-head-left">
      <div class="sicon" style="background:var(--lilac-bg);border:1.5px solid var(--lilac-line);font-size:17px;display:flex;align-items:center;justify-content:center">🏡</div>
      <div><div class="stitle">สรุปรวมครัวเรือน</div></div>
    </div></div>
    <div class="sum-list">
      <div class="sum-row sub" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span style="font-weight:600;color:var(--sky)">${cfg.p1} <span style="font-size:11px;color:var(--ink3)">▾</span></span>
        <span style="font-weight:700;color:var(--sky)">${_bpFmt(p1Total)}</span>
      </div>
      <div style="display:none">
        <div class="sum-row sub"><span style="padding-left:16px;font-size:12px;color:var(--ink2)">⚡ ค่าน้ำ-ไฟ</span><span style="font-size:12px">${_bpFmt(util1)}</span></div>
        <div class="sum-row sub"><span style="padding-left:16px;font-size:12px;color:var(--ink2)">🍚 ค่ากิน</span><span style="font-size:12px">${_bpFmt(food1)}</span></div>
        <div class="sum-row sub"><span style="padding-left:16px;font-size:12px;color:var(--ink2)">💳 บัตรเครดิต</span><span style="font-size:12px">${_bpFmt(ccCommonByP1+ccP1inP2card)}</span></div>
        <div class="sum-row sub"><span style="padding-left:28px;font-size:11px;color:var(--ink3)">• กองกลาง</span><span style="font-size:11px;color:var(--ink3)">${_bpFmt(ccCommonByP1)}</span></div>
        ${ccP1inP2card>0?`<div class="sum-row sub"><span style="padding-left:28px;font-size:11px;color:var(--ink3)">• ส่วนตัวในบัตรเข่ง</span><span style="font-size:11px;color:var(--ink3)">${_bpFmt(ccP1inP2card)}</span></div>`:''}

      </div>

      <div class="sum-row sub" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span style="font-weight:600;color:var(--rose)">${cfg.p2} <span style="font-size:11px;color:var(--ink3)">▾</span></span>
        <span style="font-weight:700;color:var(--rose)">${_bpFmt(p2Total)}</span>
      </div>
      <div style="display:none">
        <div class="sum-row sub"><span style="padding-left:16px;font-size:12px;color:var(--ink2)">🍚 ค่ากิน</span><span style="font-size:12px">${_bpFmt(food2)}</span></div>
        <div class="sum-row sub"><span style="padding-left:16px;font-size:12px;color:var(--ink2)">💳 บัตรเครดิต</span><span style="font-size:12px">${_bpFmt(ccCommonByP2+ccP2inP1card)}</span></div>
        <div class="sum-row sub"><span style="padding-left:28px;font-size:11px;color:var(--ink3)">• กองกลาง</span><span style="font-size:11px;color:var(--ink3)">${_bpFmt(ccCommonByP2)}</span></div>
        ${ccP2inP1card>0?`<div class="sum-row sub"><span style="padding-left:28px;font-size:11px;color:var(--ink3)">• ส่วนตัวในบัตรโฟม</span><span style="font-size:11px;color:var(--ink3)">${_bpFmt(ccP2inP1card)}</span></div>`:''}

      </div>

      <div class="sum-row divider" style="margin-top:6px">
        <span style="font-weight:700;color:${Math.abs(diff)<1?'var(--good)':diff>0?'var(--rose)':'var(--sky)'}">
          ${Math.abs(diff)<1?'เท่ากัน ✓':(diff>0?cfg.p2+' จ่าย '+cfg.p1:cfg.p1+' จ่าย '+cfg.p2)}
        </span>
        <span style="font-weight:700;font-size:15px;color:${Math.abs(diff)<1?'var(--good)':'var(--bad)'}">
          ${Math.abs(diff)<1?'':_bpFmt(Math.abs(diff)/2)}
        </span>
      </div>
    </div>`;

  // settlement
  if(se) renderSettlement(se,md,cfg,utilTotal,foodP1actual,foodP2actual,ccCommon,ccP1,ccP2,f,_bpFmt);
}

function renderSettlement(se,md,cfg,utilTotal,foodP1,foodP2,ccCommon,ccP1,ccP2,f,_bpFmt){
  const utilOwed=utilTotal/2;
  const foodTotal=foodP1+foodP2;
  const foodP1Diff=foodP1-foodTotal/2;
  let ccCommonP1owes=0,ccCommonP2owes=0;
  let ccP1inP2card=0; // โฟมในบัตรเข่ง → โฟมต้องจ่ายเข่ง
  let ccP2inP1card=0; // เข่งในบัตรโฟม → เข่งต้องจ่ายโฟม
  md.cc.forEach(entry=>{
    const common=f(entry.total)-f(entry.p1)-f(entry.p2)-f(entry.other||0);
    const card=cfg.ccCards.find(c=>c.id===entry.cardId);
    const owner=card?.owner||'p1';
    if(owner==='p1'){
      // บัตรโฟม: กองกลาง p2 ต้องคืน p1 ครึ่ง; p2 ที่รูดในบัตรนี้ p2 เป็นคนรูดเองอยู่แล้ว
      if(common>0) ccCommonP2owes+=common/2;
      ccP2inP1card+=f(entry.p2); // เข่งในบัตรโฟม → เข่งต้องจ่ายโฟม
    } else {
      // บัตรเข่ง: กองกลาง p1 ต้องคืน p2 ครึ่ง; p1 ที่รูดในบัตรนี้ p2 รูดให้ → p1 ต้องจ่ายคืน
      if(common>0) ccCommonP1owes+=common/2;
      ccP1inP2card+=f(entry.p1); // โฟมในบัตรเข่ง → โฟมต้องจ่ายเข่ง
    }
  });
  const ccCommonOwed=ccCommonP2owes-ccCommonP1owes; // net: + = p2 ค้าง p1
  const ccCrossOwed=ccP1inP2card-ccP2inP1card; // net: + = p1 ค้าง p2 (โฟมค้างเข่ง)
  // net: + = p2 ค้าง p1, - = p1 ค้าง p2
  // ccCommonOwed: กองกลาง net
  // ccCrossOwed: + = p1 ค้าง p2 (ลบออกจาก p2owesP1)
  const netP2owesP1=utilOwed+foodP1Diff+ccCommonOwed-ccCrossOwed;
  const items=[];
  if(utilTotal>0)items.push({label:'⚡ ค่าน้ำ-ไฟ',desc:`${cfg.p1} จ่ายก่อน ${_bpFmt(utilTotal)} → ${cfg.p2} คืน ½`,amount:utilOwed,positive:true});
  if(foodTotal>0)items.push({label:'🍚 ค่ากิน',desc:`${cfg.p1} จ่าย ${_bpFmt(foodP1)} / ${cfg.p2} จ่าย ${_bpFmt(foodP2)} → ส่วนต่าง ÷2`,amount:Math.abs(foodP1Diff),positive:foodP1Diff>0,zero:Math.abs(foodP1Diff)<1});
  if(ccCommon>0){
    const netCommon=ccCommonOwed; // + = p2 ค้าง p1
    items.push({
      label:'💳 บัตร (กองกลาง)',
      desc:`กองกลาง ${_bpFmt(ccCommon)} → ตามเจ้าของบัตร`,
      amount:Math.abs(netCommon),
      positive:netCommon<0, // negative = p1 ค้าง p2
      zero:Math.abs(netCommon)<1
    });
  }
  if(Math.abs(ccCrossOwed)>0){
    items.push({
      label:'💳 บัตร (ส่วนตัว)',
      desc:`${ccCrossOwed>0?cfg.p1+' ในบัตร'+cfg.p2:cfg.p2+' ในบัตร'+cfg.p1} → จ่ายคืนเต็ม`,
      amount:Math.abs(ccCrossOwed),
      positive:ccCrossOwed<0, // ccCrossOwed>0 = p1 ค้าง p2 → p2 positive
      zero:false
    });
  }
  const payer=netP2owesP1>1?cfg.p2:netP2owesP1<-1?cfg.p1:null;
  const receiver=netP2owesP1>1?cfg.p1:netP2owesP1<-1?cfg.p2:null;
  const netAmt=Math.abs(netP2owesP1);
  se.innerHTML=`<div class="card-head"><div class="card-head-left">
    <div class="sicon" style="background:var(--good-bg);border:1.5px solid var(--good-line);font-size:17px">⚖️</div>
    <div><div class="stitle">หักล้างรายจ่าย</div><div class="ssub">ใครต้องโอนเงินคืนกัน</div></div>
  </div></div>
  <div class="sum-list" style="margin-bottom:12px">
    ${items.map(i=>`<div class="sum-row sub" style="flex-direction:column;align-items:flex-start;gap:2px">
      <div style="display:flex;justify-content:space-between;width:100%">
        <span style="font-weight:600">${i.label}</span>
        <span style="font-weight:700;color:${i.zero?'var(--ink3)':i.positive?'var(--bad)':'var(--sky)'}">${i.zero?'เท่ากัน':(i.positive?cfg.p2+' → '+cfg.p1:cfg.p1+' → '+cfg.p2)+' '+_bpFmt(i.amount)}</span>
      </div>
      <div style="font-size:11px;color:var(--ink2)">${i.desc}</div>
    </div>`).join('')}
  </div>
  <div style="background:${!payer?'var(--good-bg)':'var(--sky-bg)'};border:1.5px solid ${!payer?'var(--good-line)':'var(--sky-line)'};border-radius:16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between">
    ${!payer?`<div style="font-size:14px;font-weight:700;color:var(--good)">✓ เท่ากัน ไม่ต้องโอน</div>`:`<div><div style="font-size:11px;color:var(--ink2);margin-bottom:2px">สรุป</div><div style="font-size:15px;font-weight:700"><span style="color:var(--rose)">${payer}</span> โอนให้ <span style="color:var(--sky)">${receiver}</span></div></div><div style="font-size:22px;font-weight:700;color:var(--sky)">${_bpFmt(netAmt)}</div>`}
  </div>`;
}

// ── ACTIONS ──
function setFixedIncome(p,fid,v){
  const md=getMD();
  md.incomes[p].fixed[fid]=f(v);
  persist();renderBanner();renderIncomeCard(p);renderSummaryPerson(p);renderSummaryCommon();
}
function setFixedExpense(p,fid,field,v){
  if(field==='goal'){
    const fe=cfg.fixedExpense[p].find(x=>x.id===fid);
    if(fe) fe.goal=f(v);
    persist();renderBanner();renderExpenseCard(p);renderSummaryPerson(p);renderSummaryCommon();
    return;
  }
  const md=getMD();
  if(!md.expenses[p].fixed[fid]) md.expenses[p].fixed[fid]={actual:0};
  md.expenses[p].fixed[fid][field]=f(v);
  persist();renderBanner();renderExpenseCard(p);renderSummaryPerson(p);renderSummaryCommon();
}
function setExtraExpense(p,id,field,v){
  const md=getMD();
  const e=md.expenses[p].extras.find(x=>x.id===id);
  if(e){e[field]=f(v);}
  persist();renderBanner();renderExpenseCard(p);renderSummaryPerson(p);renderSummaryCommon();
}
function addExtraIncome(p){
  const name=document.getElementById(`extra-inc-name-${p}`).value.trim();
  const amt=f(document.getElementById(`extra-inc-amt-${p}`).value);
  const note=document.getElementById(`extra-inc-note-${p}`).value.trim();
  if(!name){_bpToast('กรุณากรอกชื่อ');return}
  const md=getMD();
  md.incomes[p].extras.push({id:Date.now(),name,amt,note});
  document.getElementById(`extra-inc-name-${p}`).value='';
  document.getElementById(`extra-inc-amt-${p}`).value='';
  document.getElementById(`extra-inc-note-${p}`).value='';
  persist();_bpRender();_bpToast('เพิ่มรายรับแล้ว ✓');
}
function delExtraIncome(p,id){
  if(!confirm('ลบรายการนี้?'))return;
  const md=getMD();md.incomes[p].extras=md.incomes[p].extras.filter(e=>e.id!==id);
  persist();_bpRender();_bpToast('ลบแล้ว');
}
function addExtraExpense(p){
  const name=document.getElementById(`extra-exp-name-${p}`).value.trim();
  const type=document.getElementById(`extra-exp-type-${p}`).value;
  const budget=f(document.getElementById(`extra-exp-budget-${p}`).value);
  const actual=f(document.getElementById(`extra-exp-actual-${p}`).value);
  if(!name){_bpToast('กรุณากรอกชื่อ');return}
  const md=getMD();
  md.expenses[p].extras.push({id:Date.now(),name,type,budget,actual});
  document.getElementById(`extra-exp-name-${p}`).value='';
  document.getElementById(`extra-exp-budget-${p}`).value='';
  document.getElementById(`extra-exp-actual-${p}`).value='';
  persist();_bpRender();_bpToast('เพิ่มรายการแล้ว ✓');
}
function delExtraExpense(p,id){
  if(!confirm('ลบรายการนี้?'))return;
  const md=getMD();md.expenses[p].extras=md.expenses[p].extras.filter(e=>e.id!==id);
  persist();_bpRender();_bpToast('ลบแล้ว');
}
function delFixed(section,p,fid){
  const md=getMD();
  if(!md.hidden[p].includes(fid)) md.hidden[p].push(fid);
  if(section==='expense' && md.expenses[p].fixed[fid]) md.expenses[p].fixed[fid].actual=0;
  if(section==='income') md.incomes[p].fixed[fid]=0;
  persist();
  _bpRender();
  _bpToast('ลบออกจากเดือนนี้แล้ว');
}
function delFixedTemplate(section,p,fid){
  if(!confirm('ลบรายการนี้ออกจาก template ทุกเดือน?')) return;
  if(section==='income') cfg.fixedIncome[p]=cfg.fixedIncome[p].filter(fi=>fi.id!==fid);
  else cfg.fixedExpense[p]=cfg.fixedExpense[p].filter(fe=>fe.id!==fid);
  persist();_bpRender();renderFixedListsInModal();_bpToast('ลบออกจาก template แล้ว');
}
function addCC(){
  const cardId=document.getElementById('cc-card').value;
  const total=f(document.getElementById('cc-total').dataset.raw||document.getElementById('cc-total').value);
  const p1=f(document.getElementById('cc-p1').dataset.raw||document.getElementById('cc-p1').value);
  const p2=f(document.getElementById('cc-p2').dataset.raw||document.getElementById('cc-p2').value);
  const other=f(document.getElementById('cc-other').dataset.raw||document.getElementById('cc-other').value);
  const note=document.getElementById('cc-note').value.trim();
  if(!cardId){_bpToast('กรุณาเลือกบัตร');return}
  if(!total||total<=0){_bpToast('กรุณากรอกยอดรวม');return}
  if(p1+p2+other>total){_bpToast('ยอดส่วนต่างๆรวมเกินยอดบัตร');return}
  const md=getMD();
  md.cc.push({id:Date.now(),cardId,total,p1,p2,other,note});
  const clearAmt=el=>{el.dataset.raw='';el.value=''};
  clearAmt(document.getElementById('cc-total'));
  clearAmt(document.getElementById('cc-p1'));
  clearAmt(document.getElementById('cc-p2'));
  clearAmt(document.getElementById('cc-other'));
  document.getElementById('cc-note').value='';
  persist();_bpRender();_bpToast('เพิ่มบัตรแล้ว ✓');
}
function delCC(id){
  const md=getMD();
  md.cc=md.cc.filter(c=>c.id!=id);
  persist();_bpRender();_bpToast('ลบแล้ว');
}

// ── SETTINGS ──
function _bpOpenSettings(){
  document.getElementById('set-p1').value=cfg.p1;
  document.getElementById('set-p2').value=cfg.p2;
  renderCardChips();renderFixedListsInModal();
  document.getElementById('settings-modal').classList.add('open');
  setTimeout(bindDecimalInputs,50);
}
function closeSettings(){document.getElementById('settings-modal').classList.remove('open')}

function renderCardChips(){
  document.getElementById('card-chips').innerHTML=cfg.ccCards.map((c,i)=>`
    <span class="card-chip" style="color:${CC_COLORS[i%CC_COLORS.length]};border-color:${CC_COLORS[i%CC_COLORS.length]}60;display:inline-flex;align-items:center;gap:5px">
      ${c.name}
      <select onchange="setCCOwner('${c.id}',this.value)" style="font-size:10px;border:none;background:transparent;color:${CC_COLORS[i%CC_COLORS.length]};cursor:pointer;font-family:inherit;outline:none">
        <option value="p1" ${c.owner!=='p2'?'selected':''}>👤 ${cfg.p1}</option>
        <option value="p2" ${c.owner==='p2'?'selected':''}>👤 ${cfg.p2}</option>
      </select>
      <button onclick="removeCCCard('${c.id}')" style="width:18px;height:18px;border-radius:50%;border:1.5px solid ${CC_COLORS[i%CC_COLORS.length]}80;background:var(--bad-bg);color:var(--bad);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;font-size:11px;font-weight:700;line-height:1;flex-shrink:0" title="ลบบัตร">×</button>
    </span>`).join('');
}

function renderFixedListsInModal(){
  document.getElementById('set-inc-p1-name').textContent=cfg.p1;
  document.getElementById('set-inc-p2-name').textContent=cfg.p2;
  document.getElementById('set-exp-p1-name').textContent=cfg.p1;
  document.getElementById('set-exp-p2-name').textContent=cfg.p2;
  const chipStyle='display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:12px;font-weight:500;border:1px solid var(--line2);margin:2px;background:var(--card2);color:var(--ink2)';
  document.getElementById('fix-inc-p1-list').innerHTML=cfg.fixedIncome.p1.map(fi=>`<span style="${chipStyle}">${fi.name}<i class="ti ti-x" style="font-size:10px;cursor:pointer" onclick="delFixedTemplate('income','p1','${fi.id}')"></i></span>`).join('');
  document.getElementById('fix-inc-p2-list').innerHTML=cfg.fixedIncome.p2.map(fi=>`<span style="${chipStyle}">${fi.name}<i class="ti ti-x" style="font-size:10px;cursor:pointer" onclick="delFixedTemplate('income','p2','${fi.id}')"></i></span>`).join('');
  const goalRowStyle='display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--card2);border-radius:12px;border:1px solid var(--line);margin-bottom:5px';
  document.getElementById('fix-exp-p1-list').innerHTML=cfg.fixedExpense.p1.map(fe=>`
    <div style="${goalRowStyle}">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600">${fe.name}</div>
        <div style="font-size:10px;color:var(--ink2)">${(TYPES[fe.type]||TYPES.expense).label}</div>
      </div>
      <input type="text" inputmode="decimal" value="${fe.goal||''}" placeholder="0.00"
        style="width:110px;height:30px;padding:0 8px;border-radius:8px;border:1px solid var(--teal-line);background:var(--teal-bg);color:var(--teal);font-size:12px;font-weight:600;font-family:inherit;text-align:right"
        onchange="setGoalInSettings('p1','${fe.id}',this.value)" title="ตั้ง Goal" step="0.01">
      <button class="del-item-btn" style="height:28px;padding:0 8px;font-size:11px" onclick="delFixedTemplate('expense','p1','${fe.id}')"><i class="ti ti-trash" style="font-size:12px"></i> ลบ</button>
    </div>`).join('');
  document.getElementById('fix-exp-p2-list').innerHTML=cfg.fixedExpense.p2.map(fe=>`
    <div style="${goalRowStyle}">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600">${fe.name}</div>
        <div style="font-size:10px;color:var(--ink2)">${(TYPES[fe.type]||TYPES.expense).label}</div>
      </div>
      <input type="text" inputmode="decimal" value="${fe.goal||''}" placeholder="0.00"
        style="width:110px;height:30px;padding:0 8px;border-radius:8px;border:1px solid var(--teal-line);background:var(--teal-bg);color:var(--teal);font-size:12px;font-weight:600;font-family:inherit;text-align:right"
        onchange="setGoalInSettings('p2','${fe.id}',this.value)" title="ตั้ง Goal" step="0.01">
      <button class="del-item-btn" style="height:28px;padding:0 8px;font-size:11px" onclick="delFixedTemplate('expense','p2','${fe.id}')"><i class="ti ti-trash" style="font-size:12px"></i> ลบ</button>
    </div>`).join('');
}

function addCCCard(){
  const name=document.getElementById('new-card-name').value.trim();
  if(!name){_bpToast('กรุณาใส่ชื่อบัตร');return}
  cfg.ccCards.push({id:'card_'+Date.now(),name});
  document.getElementById('new-card-name').value='';
  persist();renderCardChips();populateCCSelect();_bpToast('เพิ่มบัตร '+name);
}
function setCCOwner(id,owner){
  const c=cfg.ccCards.find(x=>x.id===id);
  if(c){c.owner=owner;persist();renderSummaryCommon();}
}
function removeCCCard(id){
  if(!confirm('ลบบัตรนี้?'))return;
  cfg.ccCards=cfg.ccCards.filter(c=>c.id!==id);
  persist();renderCardChips();populateCCSelect();
}
function setGoalInSettings(p,fid,v){
  const fe=cfg.fixedExpense[p].find(x=>x.id===fid);
  if(fe){fe.goal=f(v);}
  persist();_bpRender();
  _bpToast('บันทึก Goal แล้ว ✓');
}

function _bpSaveSettings(){
  cfg.p1=document.getElementById('set-p1').value.trim()||'P1';
  cfg.p2=document.getElementById('set-p2').value.trim()||'P2';
  persist();_bpRender();closeSettings();_bpToast('บันทึกแล้ว ✓');
}
function clearAll(){
  if(!confirm('ล้างข้อมูลทั้งหมด?'))return;
  months={};persist();_bpRender();closeSettings();_bpToast('ล้างข้อมูลแล้ว');
}
function populateCCSelect(){
  const sel=document.getElementById('cc-card');const cur=sel.value;
  sel.innerHTML='<option value="">-- เลือกบัตร --</option>'+cfg.ccCards.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  if(cur)sel.value=cur;
}
function updateLabels(){
  document.getElementById('ptab-p1-name').textContent=cfg.p1;
  document.getElementById('ptab-p2-name').textContent=cfg.p2;
  document.getElementById('cc-lbl-p1').textContent=cfg.p1;
  document.getElementById('cc-lbl-p2').textContent=cfg.p2;
}

// ── THEME ──
function toggleTheme(){
  const dark=document.getElementById('m-budget').getAttribute('data-theme')==='dark';
  document.getElementById('m-budget').setAttribute('data-theme',dark?'':'dark');

  localStorage.setItem('bp3_theme',dark?'':'dark');
}

// ── EXPORT ──
function backupJSON(){
  const data={
    _version:2,
    _exported:new Date().toISOString().slice(0,10),
    _app:'little_home_finance',
    cfg:JSON.parse(localStorage.getItem('bp3_cfg')||'{}'),
    months:JSON.parse(localStorage.getItem('bp3_months')||'{}'),
    theme:localStorage.getItem('bp3_theme')||''
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const d=new Date();
  a.download=`little_home_finance_backup_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  a.click();
  _bpToast('Backup สำเร็จ ✓');
}
function restoreJSON(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data._app||!data.cfg||!data.months){_bpToast('ไฟล์ไม่ถูกต้อง ✗');return;}
      if(!confirm('ยืนยันการ Restore? ข้อมูลปัจจุบันจะถูกแทนที่'))return;
      localStorage.setItem('bp3_cfg',JSON.stringify(data.cfg));
      localStorage.setItem('bp3_months',JSON.stringify(data.months));
      if(data.theme!==undefined)localStorage.setItem('bp3_theme',data.theme);
      location.reload();
    }catch(err){_bpToast('เกิดข้อผิดพลาด ✗');}
  };
  reader.readAsText(file);
  input.value='';
}
function exportCSV(){
  const md=getMD();
  const lines=['\uFEFFประเภท,เจ้าของ,ชื่อ,ประเภทย่อย,ตั้งงบ,จริง'];
  cfg.fixedIncome.p1.forEach(fi=>{const v=md.incomes.p1.fixed[fi.id]||0;lines.push(`รายรับ,${cfg.p1},"${fi.name}",,${v},${v}`)});
  (md.incomes.p1.extras||[]).forEach(e=>lines.push(`รายรับ,${cfg.p1},"${e.name}",,${e.amt},${e.amt}`));
  cfg.fixedIncome.p2.forEach(fi=>{const v=md.incomes.p2.fixed[fi.id]||0;lines.push(`รายรับ,${cfg.p2},"${fi.name}",,${v},${v}`)});
  (md.incomes.p2.extras||[]).forEach(e=>lines.push(`รายรับ,${cfg.p2},"${e.name}",,${e.amt},${e.amt}`));
  cfg.fixedExpense.p1.forEach(fe=>{const fd=md.expenses.p1.fixed[fe.id]||{};lines.push(`รายจ่าย,${cfg.p1},"${fe.name}",${fe.type},${getGoal(fe)},${fd.actual||0}`)});
  (md.expenses.p1.extras||[]).forEach(e=>lines.push(`รายจ่าย,${cfg.p1},"${e.name}",${e.type},${e.budget||0},${e.actual||0}`));
  cfg.fixedExpense.p2.forEach(fe=>{const fd=md.expenses.p2.fixed[fe.id]||{};lines.push(`รายจ่าย,${cfg.p2},"${fe.name}",${fe.type},${getGoal(fe)},${fd.actual||0}`)});
  (md.expenses.p2.extras||[]).forEach(e=>lines.push(`รายจ่าย,${cfg.p2},"${e.name}",${e.type},${e.budget||0},${e.actual||0}`));
  md.cc.forEach(c=>{const card=getCC(c.cardId);lines.push(`บัตรเครดิต,กลาง,${card.name},,${c.total},${c.total}`)});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}));
  a.download=`budget_${curYear}_${String(curMonth+1).padStart(2,'0')}.csv`;
  a.click();_bpToast('Export แล้ว ✓');
}

// ── CHARTS ──
let chartMain=null, chartDonut=null, chartInvest=null, chartStack=null;
let chartCmpP1=null, chartCmpP2=null;
let chartVisible=false;
let chartPerson='p1';
let chartTab='diff';

function toggleChart(){
  chartVisible=!chartVisible;
  const panel=document.getElementById('chart-panel');
  const wrap=document.querySelector('#m-budget .wrap');
  panel.style.display=chartVisible?'block':'none';
  wrap.style.display=chartVisible?'none':'block';
  const btn=document.getElementById('chart-btn');
  btn.style.background=chartVisible?'var(--sky)':'';
  btn.style.color=chartVisible?'#fff':'';
  if(chartVisible){
    // ภาพรวม / เปรียบเทียบรายการ tabs removed — default to ผลต่าง Goal
    document.getElementById('chart-sec-overview').style.display='none';
    document.getElementById('chart-sec-compare').style.display='none';
    if(document.getElementById('chart-sec-diff'))document.getElementById('chart-sec-diff').style.display='block';
    chartTab='diff'; chartPerson='p1';
    renderDiffTable();
  }
}

function setChartTab(tab,btn){
  chartTab=tab;
  document.querySelectorAll('#chart-panel .ptab').forEach(b=>b.className='ptab');
  btn.classList.add(tab==='overview'?'active-p1':tab==='compare'?'active-p2':'active-common');
  document.getElementById('chart-sec-overview').style.display=tab==='overview'?'block':'none';
  document.getElementById('chart-sec-compare').style.display=tab==='compare'?'block':'none';
  document.getElementById('chart-sec-diff').style.display=tab==='diff'?'block':'none';
  if(tab==='compare'){populateCompareSelect();renderCompareChart();}
  else if(tab==='diff'){renderDiffTable();}
  else _bpRenderCharts();
}

function setChartPerson(p,btn){
  chartPerson=p;
  const b1=document.getElementById('cfilt-p1');
  const b2=document.getElementById('cfilt-p2');
  if(b1){b1.style.background=p==='p1'?'var(--sky)':'var(--sky-bg)';b1.style.color=p==='p1'?'#fff':'var(--sky)';b1.style.borderColor='var(--sky-line)';}
  if(b2){b2.style.background=p==='p2'?'var(--rose)':'var(--rose-bg)';b2.style.color=p==='p2'?'#fff':'var(--rose)';b2.style.borderColor='var(--rose-line)';}
  _bpRenderCharts();
}

function populateCompareSelect(){
  const sel=document.getElementById('compare-item');
  if(!sel) return;
  const cur=sel.value;
  const seen=new Set();
  const items=[];
  [...cfg.fixedExpense.p1,...cfg.fixedExpense.p2].forEach(fe=>{
    if(!fe.ccLinked&&!fe.utilityLinked&&!seen.has(fe.name)){seen.add(fe.name);items.push(fe.name);}
  });
  items.push('ค่าบัตรเครดิต (รวม)','ค่าน้ำ-ไฟ (กองกลาง÷2)');
  sel.innerHTML=items.map(n=>`<option value="${n}">${n}</option>`).join('');
  if(cur) sel.value=cur;
  // update titles
  const t1=document.getElementById('cmp-title-p1');if(t1)t1.textContent=cfg.p1;
  const t2=document.getElementById('cmp-title-p2');if(t2)t2.textContent=cfg.p2;
}

function getCCPersonTotalForKey(p,key){
  const md=months[key];
  if(!md||!md.cc) return 0;
  const own=md.cc.reduce((s,c)=>s+f(p==='p1'?(c.p1||0):(c.p2||0)),0);
  const common=md.cc.reduce((s,c)=>s+(f(c.total)-f(c.p1)-f(c.p2)-f(c.other||0)),0)/2;
  return f(own+common);
}

function getItemActual(p,itemName,key){
  const md=months[key];
  if(!md) return 0;
  if(itemName==='ค่าบัตรเครดิต (รวม)') return getCCPersonTotalForKey(p,key);
  if(itemName==='ค่าน้ำ-ไฟ (กองกลาง÷2)') return (f(md.sharedWater)+f(md.sharedElectric))/2;
  const d=(md.expenses&&md.expenses[p])||{fixed:{},extras:[]};
  const fe=cfg.fixedExpense[p].find(x=>x.name===itemName);
  if(fe){
    if(fe.foodLinked) return f(md.sharedFood)/2;
    if(fe.utilityLinked) return (f(md.sharedWater)+f(md.sharedElectric))/2;
    return f((d.fixed[fe.id]||{}).actual);
  }
  const extra=(d.extras||[]).find(e=>e.name===itemName);
  return extra?f(extra.actual):0;
}

function getItemGoal(p,itemName){
  if(itemName==='ค่าบัตรเครดิต (รวม)'||itemName==='ค่าน้ำ-ไฟ (กองกลาง÷2)') return 0;
  const fe=cfg.fixedExpense[p].find(x=>x.name===itemName);
  return fe?getGoal(fe):0;
}

function renderCompareChart(){
  if(!document.getElementById('chart-cmp-p1')) return;
  if(typeof Chart==='undefined'){setTimeout(renderCompareChart,300);return;}
  const sel=document.getElementById('compare-item');
  if(!sel||!sel.value) return;
  const itemName=sel.value;
  const keys=getAllMonthKeys();
  const labels=keys.map(getMonthLabel);
  const gridC='rgba(128,128,128,0.15)';
  const textC='#888';
  const fmtY=v=>'฿'+Math.round(v).toLocaleString('en-US');
  const t1=document.getElementById('cmp-title-p1');if(t1)t1.textContent=cfg.p1+' — '+itemName;
  const t2=document.getElementById('cmp-title-p2');if(t2)t2.textContent=cfg.p2+' — '+itemName;
  ['p1','p2'].forEach(p=>{
    const clr=p==='p1'?'#3a6890':'#a0485c';
    const clrBg=p==='p1'?'#3a689055':'#a0485c55';
    const goal=getItemGoal(p,itemName);
    const actuals=keys.map(k=>getItemActual(p,itemName,k));
    const canvasId='chart-cmp-'+p;
    const existing=p==='p1'?chartCmpP1:chartCmpP2;
    if(existing) existing.destroy();
    const chart=new Chart(document.getElementById(canvasId),{
      data:{labels,datasets:[
        {type:'bar',label:'จริง',data:actuals,backgroundColor:clrBg,borderColor:clr,borderWidth:1.5,borderRadius:5,borderSkipped:false},
        ...(goal?[{type:'line',label:'Goal ฿'+Math.round(goal).toLocaleString('en-US'),data:keys.map(()=>goal),borderColor:'#EF9F27',borderWidth:2,borderDash:[6,4],pointRadius:0,fill:false}]:[])
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:textC,font:{size:11}}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ฿${Math.round(ctx.parsed.y).toLocaleString('en-US')}`}}},
        scales:{
          x:{ticks:{color:textC,font:{size:11},autoSkip:false,maxRotation:30},grid:{color:gridC}},
          y:{ticks:{color:textC,font:{size:11},callback:fmtY},grid:{color:gridC},beginAtZero:true}
        }
      }
    });
    if(p==='p1') chartCmpP1=chart; else chartCmpP2=chart;
  });
}

function getAllMonthKeys(){
  // always start from Jan 2026, up to current month
  const startY=2026, startM=0;
  const endY=curYear, endM=curMonth;
  const res=[];
  let y=startY, m=startM;
  while(y<endY||(y===endY&&m<=endM)){
    res.push(`${y}-${String(m).padStart(2,'0')}`);
    m++; if(m>11){m=0;y++;}
  }
  return res;
}

function getMonthLabel(key){
  const [y,m]=key.split('-').map(Number);
  const short=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return short[m]+' '+(y+543).toString().slice(2);
}

function getMonthStats(key,p){
  const md=months[key];
  if(!md) return{inc:0,expense:0,cc:0,save:0,invest:0,remain:0};
  const d=(md.expenses&&md.expenses[p])||{fixed:{},extras:[]};
  let expense=0,save=0,invest=0;
  cfg.fixedExpense[p].forEach(fe=>{
    if(fe.ccLinked) return;
    const actual=f((d.fixed[fe.id]||{}).actual);
    if(fe.type==='save') save+=actual;
    else if(fe.type==='invest') invest+=actual;
    else expense+=actual;
  });
  (d.extras||[]).forEach(e=>{
    if(e.type==='save') save+=f(e.actual);
    else if(e.type==='invest') invest+=f(e.actual);
    else expense+=f(e.actual);
  });
  const cc=md.cc?getCCPersonTotal(p):0;
  const incItems=(md.incomes&&md.incomes[p])||{fixed:{},extras:[]};
  const inc=cfg.fixedIncome[p].reduce((s,fi)=>s+f(incItems.fixed[fi.id]),0)+(incItems.extras||[]).reduce((s,e)=>s+f(e.amt),0);
  const remain=inc-expense-cc-save-invest;
  return{inc,expense,cc,save,invest,remain};
}

const CHART_COLORS={
  inc:    {bg:'#3d7a5266',bd:'#3d7a52'},
  expense:{bg:'#EF9F2766',bd:'#EF9F27'},
  cc:     {bg:'#7a509066',bd:'#7a5090'},
  save:   {bg:'#5a7a6266',bd:'#5a7a62'},
  invest: {bg:'#2e787866',bd:'#2e7878'},
  remain: {bd:'#a0485c'},
  p1:     {bg:'#3a689066',bd:'#3a6890'},
  p2:     {bg:'#a0485c66',bd:'#a0485c'},
};

function makeLegend(elId, items){
  document.getElementById(elId).innerHTML=items.map(it=>
    `<span style="display:flex;align-items:center;gap:5px">
      <span style="width:12px;height:12px;border-radius:3px;background:${it.bg||it.bd};border:1.5px solid ${it.bd};flex-shrink:0"></span>
      <span>${it.label}</span>
    </span>`
  ).join('');
}

function _bpRenderCharts(){
  if(typeof Chart==='undefined'){setTimeout(_bpRenderCharts,300);return;}
  const keys=getAllMonthKeys();
  const labels=keys.map(getMonthLabel);
  const ps=chartPerson==='both'?['p1','p2']:[chartPerson];
  const pName=p=>p==='p1'?cfg.p1:cfg.p2;
  const gridC='rgba(128,128,128,0.15)';
  const textC='#888';
  const fmtY=v=>'฿'+Math.round(v).toLocaleString('en-US');
  const ITEM_COLORS=['#3a6890','#a0485c','#2e7878','#8a5e20','#5a7a62','#6a5090','#d85a30','#185fa5','#639922','#ba7517'];

  // destroy old charts
  if(window._itemCharts) window._itemCharts.forEach(c=>{try{c.destroy()}catch(e){}});
  window._itemCharts=[];

  const container=document.getElementById('chart-items-container');
  if(!container) return;
  container.innerHTML='';

  // build item list from first person's fixed expenses (merged with p2 if both)
  const seenNames=new Set();
  const allItems=[];
  ps.forEach(p=>{
    cfg.fixedExpense[p].forEach(fe=>{
      const displayName=fe.ccLinked?'ค่าบัตรเครดิต':fe.utilityLinked?'ค่าน้ำ-ไฟ (กองกลาง÷2)':fe.name;
      if(!seenNames.has(displayName)){seenNames.add(displayName);allItems.push({name:displayName,fe,p});}
    });
  });

  // helper: get actual for item by key/person
  function getAct(itemName,p,key){
    const md=months[key];if(!md)return 0;
    if(itemName==='ค่าบัตรเครดิต') return getCCPersonTotalForKey(p,key);
    if(itemName==='ค่าน้ำ-ไฟ (กองกลาง÷2)') return (f(md.sharedWater)+f(md.sharedElectric))/2;
    const d=(md.expenses&&md.expenses[p])||{fixed:{},extras:[]};
    // find fe in this person's config
    const fe=cfg.fixedExpense[p].find(x=>x.name===itemName&&!x.ccLinked&&!x.utilityLinked);
    if(fe) return f((d.fixed[fe.id]||{}).actual);
    const ex=(d.extras||[]).find(e=>e.name===itemName);
    return ex?f(ex.actual):0;
  }
  function getGoalForItem(itemName,p){
    const fe=cfg.fixedExpense[p].find(x=>x.name===itemName||
      (x.ccLinked&&itemName==='ค่าบัตรเครดิต')||
      (x.utilityLinked&&itemName==='ค่าน้ำ-ไฟ (กองกลาง÷2)'));
    return fe?getGoal(fe):0;
  }

  allItems.forEach((item,idx)=>{
    const clr=ITEM_COLORS[idx%ITEM_COLORS.length];
    const tc=TYPES[item.fe&&item.fe.type]||TYPES.expense;

    // build card
    const card=document.createElement('div');
    card.className='card';
    card.style.marginBottom='1rem';

    // determine type tag
    const typeTag=tc?`<span class="type-tag" style="${tc.style}">${tc.label}</span>`:'';

    // goal line per person
    const goalLines=ps.map(p=>`${pName(p)}: ฿${Math.round(getGoalForItem(item.name,p)).toLocaleString('en-US')}`).join(' / ');

    card.innerHTML=`
      <div class="card-head"><div class="card-head-left">
        <div class="sicon" style="background:${clr}22;border:1.5px solid ${clr}66;color:${clr}"><i class="ti ti-chart-bar"></i></div>
        <div>
          <div class="stitle" style="display:flex;align-items:center;gap:6px">${item.name} ${typeTag}</div>
          <div class="ssub">Goal: ${goalLines}</div>
        </div>
      </div></div>
      <div style="position:relative;width:100%;height:200px">
        <canvas id="item-chart-${idx}" role="img" aria-label="${item.name}"></canvas>
      </div>`;
    container.appendChild(card);

    // build datasets
    const datasets=[];
    ps.forEach((p,pi)=>{
      const barClr=chartPerson==='both'?(p==='p1'?'#3a6890':'#a0485c'):clr;
      const suf=chartPerson==='both'?` (${pName(p)})`:'';
      const actuals=keys.map(k=>getAct(item.name,p,k));
      datasets.push({type:'bar',label:'จริง'+suf,data:actuals,backgroundColor:barClr+'55',borderColor:barClr,borderWidth:1.5,borderRadius:4,borderSkipped:false});
      // เส้นลากยอดแท่ง
      datasets.push({type:'line',label:'แนวโน้ม'+suf,data:actuals,borderColor:barClr,borderWidth:2,pointRadius:3,pointBackgroundColor:barClr,pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:0,spanGaps:true,order:0});
      const goalVal=getGoalForItem(item.name,p);
      if(goalVal>0){
        datasets.push({type:'line',label:'Goal'+suf+' ฿'+Math.round(goalVal).toLocaleString('en-US'),data:keys.map(()=>goalVal),borderColor:'#EF9F27',borderWidth:1.5,borderDash:[5,4],pointRadius:0,fill:false,order:0});
      }
    });

    const chart=new Chart(document.getElementById('item-chart-'+idx),{
      data:{labels,datasets},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:textC,font:{size:11},boxWidth:12}},
          tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ฿${Math.round(ctx.parsed.y).toLocaleString('en-US')}`}}},
        scales:{
          x:{ticks:{color:textC,font:{size:11},autoSkip:false,maxRotation:30},grid:{color:gridC}},
          y:{ticks:{color:textC,font:{size:11},callback:fmtY},grid:{color:gridC},beginAtZero:true}
        }
      }
    });
    window._itemCharts.push(chart);
  });
}
let diffPerson='p1';
let mainDiffPerson='p1';

function setMainDiffPerson(p,btn){
  mainDiffPerson=p;
  const b1=document.getElementById('main-dfilt-p1');
  const b2=document.getElementById('main-dfilt-p2');
  if(b1){b1.style.background=p==='p1'?'var(--sky)':'var(--sky-bg)';b1.style.color=p==='p1'?'#fff':'var(--sky)';}
  if(b2){b2.style.background=p==='p2'?'var(--rose)':'var(--rose-bg)';b2.style.color=p==='p2'?'#fff':'var(--rose)';}
  renderMainDiffTable();
}

function renderMainDiffTable(){
  const container=document.getElementById('main-diff-container');
  if(!container) return;
  // reuse same logic as renderDiffTable but with mainDiffPerson and main-diff-container
  const savedDiffPerson=diffPerson;
  const savedContainer='diff-table-container';
  diffPerson=mainDiffPerson;
  // temporarily point renderDiffTable to our container
  const orig=document.getElementById('diff-table-container');
  // create temp element
  const tmp=document.createElement('div');
  tmp.id='diff-table-container';
  tmp.style.display='none';
  document.body.appendChild(tmp);
  renderDiffTable();
  container.innerHTML=tmp.innerHTML;
  document.body.removeChild(tmp);
  diffPerson=savedDiffPerson;
}

function setDiffPerson(p,btn){
  diffPerson=p;
  const b1=document.getElementById('dfilt-p1');
  const b2=document.getElementById('dfilt-p2');
  if(b1){b1.style.background=p==='p1'?'var(--sky)':'var(--sky-bg)';b1.style.color=p==='p1'?'#fff':'var(--sky)';b1.style.borderColor='var(--sky-line)';}
  if(b2){b2.style.background=p==='p2'?'var(--rose)':'var(--rose-bg)';b2.style.color=p==='p2'?'#fff':'var(--rose)';b2.style.borderColor='var(--rose-line)';}
  renderDiffTable();
}

function renderDiffTable(){
  const dp1=document.getElementById('dp1-name');if(dp1)dp1.textContent=cfg.p1;
  const dp2=document.getElementById('dp2-name');if(dp2)dp2.textContent=cfg.p2;
  const container=document.getElementById('diff-table-container');
  if(!container)return;
  const p=diffPerson;
  const keys=getAllMonthKeys();
  const clr=p==='p1'?'var(--sky)':'var(--rose)';
  const bg=p==='p1'?'var(--sky-bg)':'var(--rose-bg)';
  const bl=p==='p1'?'var(--sky-line)':'var(--rose-line)';

  const items=[];
  cfg.fixedExpense[p].forEach(fe=>{
    const name=fe.ccLinked?'ค่าบัตรเครดิต':fe.utilityLinked?'ค่าน้ำ-ไฟ':fe.foodLinked?'ค่ากิน':fe.name;
    items.push({name,goal:getGoal(fe),type:fe.type,ccLinked:fe.ccLinked,utilityLinked:fe.utilityLinked,foodLinked:fe.foodLinked,id:fe.id});
  });
  if(!items.length){container.innerHTML='<div class="empty-state">ไม่มีรายการ</div>';return;}

  function getActual(item,key){
    const md=months[key];if(!md)return null;
    if(item.ccLinked)return getCCPersonTotalForKey(p,key);
    if(item.utilityLinked)return(f(md.sharedWater)+f(md.sharedElectric))/2;
    if(item.foodLinked){
      // Jan-Apr 26: ใช้ค่าที่กรอกตรงใน fixed expense
      const d=(md.expenses&&md.expenses[p])||{fixed:{},extras:[]};
      const fixedV=f((d.fixed[item.id]||{}).actual);
      if(fixedV>0) return fixedV;
      // พ.ค. 26 เป็นต้นไป: ดึงจาก sharedFoodP1/P2
      const v=p==='p1'?f(md.sharedFoodP1):f(md.sharedFoodP2);
      return v>0?v:null;
    }
    const d=(md.expenses&&md.expenses[p])||{fixed:{},extras:[]};
    const v=f((d.fixed[item.id]||{}).actual);
    return v||null;
  }

  function fmtAmt(v){return v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}

  let html='<div style="display:flex;flex-direction:column;gap:1.5rem">';

  items.forEach(item=>{
    const tc=TYPES[item.type]||TYPES.expense;
    const isExpType=(item.type==='expense'||item.ccLinked);

    // build month rows
    let monthRows='';
    let prevActual=null;
    keys.forEach(k=>{
      const actual=getActual(item,k);
      const hasData=actual!==null&&actual>0;

      // diff vs previous month
      let diffText='-';
      let diffColor='var(--ink3)';
      if(hasData&&prevActual!==null){
        const diff=f(actual-prevActual);
        const sign=diff>0?'+':'';
        diffColor=diff===0?'var(--ink2)'
          :(isExpType?(diff>0?'#E24B4A':'#3d7a52'):(diff>0?'#3d7a52':'#E24B4A'));
        diffText=diff===0?'±0.00':sign+fmtAmt(diff);
      }

      const [y,m]=k.split('-').map(Number);
      const mshort=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][m];
      const mlabel=mshort+' '+(y+543).toString().slice(2);

      monthRows+=`
        <div style="display:flex;align-items:center;background:var(--card);border-radius:14px;padding:14px 18px;border:1px solid var(--line);box-shadow:0 1px 4px rgba(0,0,0,.05);opacity:${hasData?1:0.45}">
          <div style="width:52px;font-size:12px;font-weight:700;color:${clr};flex-shrink:0">${mlabel}</div>
          <div style="flex:1;font-size:15px;font-weight:500;color:var(--ink);text-align:right;padding-right:24px">${hasData?fmtAmt(actual):'-'}</div>
          <div style="min-width:90px;text-align:right;font-size:15px;font-weight:700;color:${diffColor}">${diffText}</div>
        </div>`;

      if(hasData) prevActual=actual;
    });

    if(!monthRows) return;

    html+=`<div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:0 4px">
        <div style="background:${bg};border:1.5px solid ${bl};color:${clr};width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
          ${({'ค่าบ้าน':'🏠','ค่ารถ':'🚗','ค่าน้ำไฟ':'💡','ค่าน้ำ-ไฟ':'💡','ค่ากิน':'🍚','ค่าบัตรเครดิต':'💳','เก็บเงิน':'🐷','ออม':'🐷','ลงทุน':'📈','ซื้อ Dime':'🪙','ซื้อ XRP,Bitcoin':'₿','ค่าซับตะไคร้':'📺','ค่า internet+mobile':'📱','กองกลาง':'🤝','ใส่เข้ากองกลาง':'🤝'}[item.name])||'💰'}
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px">${item.name} <span class="type-tag" style="${tc.style}">${tc.label}</span></div>
          ${item.goal?`<div style="font-size:11px;color:var(--teal)">Goal ฿${fmtAmt(item.goal)} / เดือน</div>`:'<div style="font-size:11px;color:var(--ink3)">ยังไม่ได้ตั้ง Goal</div>'}
        </div>
        <div style="margin-left:auto;display:flex;gap:16px;font-size:10px;color:var(--ink2)">
          <span>Payment Amount (THB)</span>
          <span style="min-width:90px;text-align:right">vs เดือนก่อน</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">${monthRows}</div>
    </div>`;
  });

  html+='</div>';
  container.innerHTML=html;
}
const HAM_MSGS=['อย่าลืมบันทึกค่าใช้จ่าย! 🌿','ออมเงินทุกเดือนนะ 🌱','Good job! คุมงบได้ดีมาก 💚','อย่าซื้อของเกินงบล่ะ 🐹','วันนี้กินอะไรอร่อยๆ ไหม? 🥜','ลงทุนสม่ำเสมอนะ 📈','เก่งมาก! บันทึกครบเลย ⭐','น้องเชียร์ให้ประหยัดนะ 🤍'];
let hamIdx=0;
function hamsterClick(){
  const el=document.getElementById('ham-speech');
  el.textContent=HAM_MSGS[hamIdx%HAM_MSGS.length];
  hamIdx++;
  el.style.opacity='1';
  setTimeout(()=>el.style.opacity='0',2500);
}

function _bpToast(msg,dur=2200){
  const el=document.getElementById('_bpToast');el.textContent=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),dur);
}

// ── DECIMAL INPUT HELPER ──
function numOnly(e){
  const allow=['0','1','2','3','4','5','6','7','8','9','.','Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'];
  if(!allow.includes(e.key))e.preventDefault();
  // allow only one dot
  if(e.key==='.'&&e.target.value.includes('.'))e.preventDefault();
}
// attach to all decimal inputs after _bpRender
function bindDecimalInputs(){
  document.querySelectorAll('input[inputmode="decimal"]').forEach(el=>{
    el.onkeydown=numOnly;
  });
}

// ── INIT ──
// Pre-_bpLoad historical data (Jan-Mar 2026 Foam)
_bpLoad();

// migrate food Jan-Apr 2026 into sharedFoodP1/P2
const foodHistory2026={
  '2026-00':{p1:9063.25,p2:9063.25},
  '2026-01':{p1:8559.69,p2:8559.69},
  '2026-02':{p1:8469.78,p2:8469.78},
  '2026-03':{p1:11943.25,p2:11943.25},
};
const utilHistory2026={
  '2026-00':{total:1618.55*2},
  '2026-01':{total:1346.04*2},
  '2026-02':{total:2441.38*2},
  '2026-03':{total:2494.36*2},
};
Object.entries(utilHistory2026).forEach(([key,val])=>{
  if(!months[key]) months[key]={incomes:{p1:{fixed:{},extras:[]},p2:{fixed:{},extras:[]}},expenses:{p1:{fixed:{},extras:[]},p2:{fixed:{},extras:[]}},cc:[],hidden:{p1:[],p2:[]},sharedUtility:0,sharedWater:0,sharedElectric:0,sharedFood:0};
  if(!months[key].sharedWater&&!months[key].sharedElectric) months[key].sharedWater=val.total;
});
Object.entries(foodHistory2026).forEach(([key,val])=>{
  if(!months[key]) months[key]={incomes:{p1:{fixed:{},extras:[]},p2:{fixed:{},extras:[]}},expenses:{p1:{fixed:{},extras:[]},p2:{fixed:{},extras:[]}},cc:[],hidden:{p1:[],p2:[]},sharedUtility:0,sharedWater:0,sharedElectric:0,sharedFood:0};
  if(!months[key].sharedFoodP1||months[key].sharedFoodP1===0) months[key].sharedFoodP1=val.p1;
  if(!months[key].sharedFoodP2||months[key].sharedFoodP2===0) months[key].sharedFoodP2=val.p2;
  if(!months[key].sharedFood||months[key].sharedFood===0) months[key].sharedFood=val.p1+val.p2;
});
// merge preload into months (only if not already set)
if(typeof _preload !== 'undefined') Object.entries(_preload).forEach(([key, val]) => {
  if (!months[key]) {
    months[key] = val;
  } else {
    // merge expenses p1 fixed only
    const ex = months[key].expenses && months[key].expenses.p1;
    const src = val.expenses && val.expenses.p1;
    if (ex && src) {
      Object.entries(src.fixed || {}).forEach(([fid, fval]) => {
        if (!ex.fixed[fid] || !ex.fixed[fid].actual) ex.fixed[fid] = fval;
      });
    }
    // merge cc only if empty
    if ((!months[key].cc || months[key].cc.length === 0) && val.cc && val.cc.length > 0) {
      months[key].cc = val.cc;
    }
  }
});
persist();
const savedTheme=localStorage.getItem('bp3_theme');
if(savedTheme==='dark'){document.getElementById('m-budget').setAttribute('data-theme','dark');}
document.getElementById('month-label').textContent=`${MONTHS_TH[curMonth]} ${curYear+543}`;
_bpRender();
document.getElementById('settings-modal').addEventListener('click',function(e){if(e.target===this)closeSettings();});

// Home dashboard summary for the latest month (income / expense / remaining status)
function bpGetHomeSummary(){
  try{
    const keys=getAllMonthKeys();
    if(!keys.length) return null;
    const key=keys[keys.length-1]; // เดือนล่าสุด
    const a=getMonthStats(key,'p1'), b=getMonthStats(key,'p2');
    const income=a.inc+b.inc;
    const outflow=(a.expense+a.cc+a.save+a.invest)+(b.expense+b.cc+b.save+b.invest);
    const remain=a.remain+b.remain; // = income - outflow
    return { label:getMonthLabel(key), income, expense:outflow, remain, good:remain>=0 };
  }catch(e){ return null; }
}
window.bpGetHomeSummary=bpGetHomeSummary;

/* --- expose to global scope (inline handlers + cross-module glue) --- */
Object.assign(window, { mkey, getMD, _bpLoad, persist, _bpFmt, f, amtFocus, amtBlur, amtPaste, amtInit, getCC, cardColor, calcStatus, statusBadge, getIncomeTotal, getSharedUtilityPerPerson, getSharedFoodPerPerson, setSharedFood, setSharedWater, setSharedElectric, renderUtility, getCCPersonTotal, getExpenseTotal, getExpenseDisplayTotal, getGoal, resetPerson, resetMonth, changeMonth, switchPerson, _bpRender, renderBanner, renderIncomeCard, renderExpenseCard, renderCC, renderSummaryPerson, renderSummaryCommon, renderSettlement, setFixedIncome, setFixedExpense, setExtraExpense, addExtraIncome, delExtraIncome, addExtraExpense, delExtraExpense, delFixed, delFixedTemplate, addCC, delCC, _bpOpenSettings, closeSettings, renderCardChips, renderFixedListsInModal, addCCCard, setCCOwner, removeCCCard, setGoalInSettings, _bpSaveSettings, clearAll, populateCCSelect, updateLabels, toggleTheme, backupJSON, restoreJSON, exportCSV, toggleChart, setChartTab, setChartPerson, populateCompareSelect, getCCPersonTotalForKey, getItemActual, getItemGoal, renderCompareChart, getAllMonthKeys, getMonthLabel, getMonthStats, makeLegend, _bpRenderCharts, setMainDiffPerson, renderMainDiffTable, setDiffPerson, renderDiffTable, hamsterClick, _bpToast, numOnly, bindDecimalInputs });
