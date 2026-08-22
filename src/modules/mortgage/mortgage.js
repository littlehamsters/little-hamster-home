/* Mortgage module — payment ledger, amortization, prepay plan */
const STORE_KEY='mortgage_real_v5';
const DEFAULT_DATA=[{"date": "2023-04-30", "foam": 30000, "seng": 5000, "rate": 2.75, "principal": 7328.98, "interest": 18871.02, "prepay": 0, "prepayInt": 0}, {"date": "2023-05-30", "foam": 30000, "seng": 5000, "rate": 2.95, "principal": 7658.81, "interest": 18541.19, "prepay": 0, "prepayInt": 0}, {"date": "2023-06-30", "foam": 30000, "seng": 5000, "rate": 3.15, "principal": 7169.08, "interest": 19030.92, "prepay": 0, "prepayInt": 0}, {"date": "2023-07-30", "foam": 30000, "seng": 5000, "rate": 3.15, "principal": 5953.43, "interest": 20247.57, "prepay": 0, "prepayInt": 0}, {"date": "2023-08-30", "foam": 30000, "seng": 5000, "rate": 3.15, "principal": 5969.35, "interest": 20230.65, "prepay": 0, "prepayInt": 0}, {"date": "2023-09-30", "foam": 30000, "seng": 5000, "rate": 3.15, "principal": 6637.41, "interest": 19562.59, "prepay": 0, "prepayInt": 0}, {"date": "2023-10-30", "foam": 30000, "seng": 5000, "rate": 3.4, "principal": 4968.94, "interest": 21231.06, "prepay": 0, "prepayInt": 0}, {"date": "2023-11-30", "foam": 30000, "seng": 5000, "rate": 3.4, "principal": 5117.26, "interest": 21082.74, "prepay": 0, "prepayInt": 0}, {"date": "2023-12-30", "foam": 30000, "seng": 5000, "rate": 3.4, "principal": 4429.27, "interest": 21770.73, "prepay": 0, "prepayInt": 0}, {"date": "2024-01-30", "foam": 30000, "seng": 5000, "rate": 3.4, "principal": 4442.07, "interest": 21757.93, "prepay": 0, "prepayInt": 0}, {"date": "2024-02-29", "foam": 30000, "seng": 5000, "rate": 3.4, "principal": 5857.81, "interest": 20342.19, "prepay": 0, "prepayInt": 0}, {"date": "2024-03-30", "foam": 30000, "seng": 6000, "rate": 3.4, "principal": 4471.81, "interest": 21728.19, "prepay": 0, "prepayInt": 0}, {"date": "2024-04-30", "foam": 30000, "seng": 5000, "rate": 3.4, "principal": 5185.22, "interest": 21014.78, "prepay": 0, "prepayInt": 0}, {"date": "2024-05-30", "foam": 30000, "seng": 5000, "rate": 3.4, "principal": 4499.7, "interest": 21700.3, "prepay": 0, "prepayInt": 0}, {"date": "2024-06-30", "foam": 23000, "seng": 12000, "rate": 3.4, "principal": 5212.28, "interest": 20987.72, "prepay": 0, "prepayInt": 0}, {"date": "2024-07-30", "foam": 23000, "seng": 12000, "rate": 3.4, "principal": 4527.74, "interest": 21672.26, "prepay": 0, "prepayInt": 0}, {"date": "2024-08-30", "foam": 23000, "seng": 12000, "rate": 3.4, "principal": 4540.82, "interest": 21659.18, "prepay": 0, "prepayInt": 0}, {"date": "2024-09-30", "foam": 23000, "seng": 12000, "rate": 3.28, "principal": 5252.19, "interest": 20947.81, "prepay": 0, "prepayInt": 0}, {"date": "2024-10-30", "foam": 23000, "seng": 12000, "rate": 3.28, "principal": 4569.09, "interest": 21630.91, "prepay": 0, "prepayInt": 0}, {"date": "2024-11-30", "foam": 23000, "seng": 12000, "rate": 3.28, "principal": 5993.39, "interest": 20206.61, "prepay": 0, "prepayInt": 0}, {"date": "2024-12-30", "foam": 23000, "seng": 12000, "rate": 3.28, "principal": 5361.97, "interest": 20838.03, "prepay": 0, "prepayInt": 0}, {"date": "2025-01-30", "foam": 23000, "seng": 12000, "rate": 3.28, "principal": 5376.9, "interest": 20823.1, "prepay": 0, "prepayInt": 0}, {"date": "2025-02-28", "foam": 29000, "seng": 11000, "rate": 3.28, "principal": 7405.57, "interest": 18794.43, "prepay": 0, "prepayInt": 0}, {"date": "2025-03-30", "foam": 29000, "seng": 11000, "rate": 3.28, "principal": 5800.95, "interest": 20399.05, "prepay": 0, "prepayInt": 0}, {"date": "2025-04-30", "foam": 29000, "seng": 11000, "rate": 3.13, "principal": 6711.55, "interest": 19488.45, "prepay": 0, "prepayInt": 0}, {"date": "2025-05-30", "foam": 29000, "seng": 11000, "rate": 3.13, "principal": 6120.89, "interest": 20079.11, "prepay": 0, "prepayInt": 0}, {"date": "2025-06-30", "foam": 29000, "seng": 11000, "rate": 3.13, "principal": 7050.99, "interest": 19149.01, "prepay": 0, "prepayInt": 0}, {"date": "2025-07-30", "foam": 29000, "seng": 11000, "rate": 3.13, "principal": 6431.44, "interest": 19768.56, "prepay": 0, "prepayInt": 0}, {"date": "2025-08-30", "foam": 29000, "seng": 11000, "rate": 2.88, "principal": 7008.33, "interest": 19191.67, "prepay": 0, "prepayInt": 0}, {"date": "2025-09-30", "foam": 29000, "seng": 11000, "rate": 2.88, "principal": 8628.97, "interest": 17571.03, "prepay": 0, "prepayInt": 0}, {"date": "2025-10-30", "foam": 29000, "seng": 11000, "rate": 2.88, "principal": 8064.37, "interest": 18135.63, "prepay": 0, "prepayInt": 0}, {"date": "2025-11-30", "foam": 29000, "seng": 11000, "rate": 2.88, "principal": 8668.49, "interest": 17531.51, "prepay": 0, "prepayInt": 0}, {"date": "2025-12-30", "foam": 29000, "seng": 11000, "rate": 2.83, "principal": 8155.97, "interest": 18044.03, "prepay": 0, "prepayInt": 0}, {"date": "2026-01-30", "foam": 29000, "seng": 11000, "rate": 2.83, "principal": 8439.05, "interest": 17760.95, "prepay": 0, "prepayInt": 0}, {"date": "2026-02-28", "foam": 29000, "seng": 11000, "rate": 2.83, "principal": 10176.18, "interest": 16023.82, "prepay": 0, "prepayInt": 0}, {"date": "2026-03-30", "foam": 29000, "seng": 11000, "rate": 2.78, "principal": 9617.27, "interest": 16582.73, "prepay": 8328.5, "prepayInt": 571.5}, {"date": "2026-04-30", "foam": 22200, "seng": 22200, "rate": 2.3, "principal": 30969.48, "interest": 13430.52, "prepay": 3336.67, "prepayInt": 463.33}, {"date": "2026-05-30", "foam": 22200, "seng": 22200, "rate": 2.3, "principal": 30103.74, "interest": 14296.26, "prepay": 0, "prepayInt": 0}];
let data=[];
let balChart=null, splitChart=null;

const _moFmt=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const _moFmt0=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function _moNv(id){const el=document.getElementById(id);return el?(parseFloat(String(el.value).replace(/,/g,'.'))||0):0;}
const thDate=s=>new Date(s).toLocaleDateString('th-TH',{year:'2-digit',month:'short'});
function _moToast(m){const t=document.getElementById('_moToast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2200);}

function _moLoad(){
  const raw=localStorage.getItem(STORE_KEY);
  if(raw){try{const s=JSON.parse(raw);data=s.data;
    document.getElementById('loanAmt').value=s.loanAmt;
    document.getElementById('name1').value=s.name1||'โฟม';
    document.getElementById('name2').value=s.name2||'เข่ง';
    const pl=s.plan||{};
    document.getElementById('planGoal').value=pl.goal??'500000';
    document.getElementById('planMonthly').value=pl.monthly??'44000';
    document.getElementById('planPrepay').value=pl.prepay??'200000';
    document.getElementById('planRate').value=pl.rate??(data.length?data[data.length-1].rate:'2.30');
    document.getElementById('planAge').value=pl.age??'28';
  }catch(e){data=JSON.parse(JSON.stringify(DEFAULT_DATA));}}
  else{data=JSON.parse(JSON.stringify(DEFAULT_DATA));}
  recalc();
  calcPlan(false);
}
function _moSave(){
  localStorage.setItem(STORE_KEY,JSON.stringify({
    data, loanAmt:_moNv('loanAmt'),
    name1:document.getElementById('name1').value, name2:document.getElementById('name2').value,
    plan:{goal:document.getElementById('planGoal').value, monthly:document.getElementById('planMonthly').value, prepay:document.getElementById('planPrepay').value, rate:document.getElementById('planRate').value, age:document.getElementById('planAge').value}
  }));
}

function recalc(){
  data.sort((a,b)=>new Date(a.date)-new Date(b.date));
  const P0=_moNv('loanAmt')||0;
  const n1=document.getElementById('name1').value, n2=document.getElementById('name2').value;
  document.getElementById('al1').textContent=n1; document.getElementById('al2').textContent=n2;

  let bal=P0, sumP=0, sumI=0, sumF=0, sumS=0, sumPre=0, sumPreI=0;
  data.forEach(r=>{
    r.prepay=r.prepay||0; r.prepayInt=r.prepayInt||0;
    bal-=r.principal+r.prepay; r.balance=bal;
    sumP+=r.principal; sumI+=r.interest; sumF+=r.foam; sumS+=r.seng; sumPre+=r.prepay; sumPreI+=r.prepayInt;
  });
  const lastRate=data.length?data[data.length-1].rate:0;
  const remBal=Math.max(0,P0-sumP-sumPre);

  document.getElementById('remBal').textContent=_moFmt0(remBal);
  document.getElementById('remBalSub').textContent='จากยอดกู้ '+_moFmt0(P0);
  document.getElementById('sumPrin').textContent=_moFmt0(sumP+sumPre);
  document.getElementById('sumInt').textContent=_moFmt0(sumI+sumPreI);
  document.getElementById('sumPay').textContent=_moFmt0(sumP+sumPre+sumI+sumPreI);
  document.getElementById('sumPaySub').textContent='ต้น+ดอก '+data.length+' งวด';

  const pct=P0?(sumP+sumPre)/P0*100:0;
  document.getElementById('progPct').textContent=pct.toFixed(1)+'%';
  document.getElementById('progFill').style.width=Math.min(100,pct)+'%';
  document.getElementById('nPaid').textContent=data.length;
  document.getElementById('avgRate').textContent=lastRate.toFixed(2)+'%';
  setCheer(pct);

  renderSplit(n1,n2,sumF,sumS);
  populateYearFilter();
  renderTable();
  renderYears();
  renderCharts();
  window._remBal=remBal;
  document.getElementById('planStart').textContent=_moFmt0(remBal);
  const lbh=document.getElementById('lastBalHint'); if(lbh) lbh.textContent=_moFmt0(lastBalance());
  planAuto();
  _moSave();
}

function setCheer(pct){
  const el=document.getElementById('cheer'); if(!el) return;
  let msg;
  if(pct>=100) msg='🎊🏡 ปลอดหนี้แล้ว! บ้านเป็นของเราเต็มตัว ยินดีด้วยจริงๆ นะ 🥳🎉';
  else if(pct>=90) msg='🏆 โค้งสุดท้ายของจริง! เกือบปลอดหนี้แล้ว สุดยอดมาก ✨';
  else if(pct>=70) msg='🚀 มาไกลมากแล้ว! อีกนิดเดียวก็ถึงเส้นชัย ลุยต่อ 🔥';
  else if(pct>=50) msg='🎉 เกินครึ่งทางแล้ว! บ้านใกล้เป็นของเราเต็มตัวขึ้นทุกวัน 🏡';
  else if(pct>=30) msg='⛰️ ใกล้ครึ่งทางแล้ว ทำได้ดีมาก ค่อยๆ ไปด้วยกัน 🎯';
  else if(pct>=15) msg='🌤️ ไฟแรงมาก! ผ่านจุดเริ่มต้นมาไกลแล้ว สู้ต่อ 🏃';
  else if(pct>=5) msg='🌿 มาได้สวย! ทุกงวดที่จ่ายคือก้าวที่ใกล้บ้านขึ้น 💪';
  else msg='🌱 เริ่มต้นแล้ว! ก้าวแรกสำคัญที่สุด ค่อยๆ ไปด้วยกันนะ 💪';
  el.textContent='✨ '+pct.toFixed(1)+'% แล้ว — '+msg;
}
function renderSplit(n1,n2,f,s){
  const tot=f+s||1;
  document.getElementById('splitList').innerHTML=`
    <div class="split-item"><div class="split-top"><span class="split-name"><span class="split-dot" style="background:var(--green)"></span>${n1}</span><span class="split-amt" style="color:var(--green)">${_moFmt0(f)}</span></div><div class="split-track"><div class="split-bar" style="background:var(--green);width:${f/tot*100}%"></div></div><div style="font-size:12px;color:var(--txt-3);margin-top:4px">${(f/tot*100).toFixed(1)}% ของยอดจ่ายรวม</div></div>
    <div class="split-item"><div class="split-top"><span class="split-name"><span class="split-dot" style="background:var(--blue)"></span>${n2}</span><span class="split-amt" style="color:var(--blue)">${_moFmt0(s)}</span></div><div class="split-track"><div class="split-bar" style="background:var(--blue);width:${s/tot*100}%"></div></div><div style="font-size:12px;color:var(--txt-3);margin-top:4px">${(s/tot*100).toFixed(1)}% ของยอดจ่ายรวม</div></div>
    <div style="border-top:1px solid var(--line-soft);padding-top:12px;display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--txt-3)">รวมจ่ายเข้าบัญชี</span><strong style="font-family:var(--font-display)">${_moFmt0(tot)} บาท</strong></div>`;
}

function populateYearFilter(){
  const sel=document.getElementById('yearFilter'); if(!sel) return;
  const years=[...new Set(data.map(r=>new Date(r.date).getFullYear()))].sort();
  const prev=sel.value?+sel.value:null;
  sel.innerHTML='';
  years.forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=(y+543);sel.appendChild(o);});
  sel.value=(prev&&years.includes(prev))?prev:years[years.length-1];
  if(window.moInitSelects)window.moInitSelects(sel.parentElement||document);
  if(window.moSelectRefresh)window.moSelectRefresh(sel);
}
function renderTable(){
  const tb=document.getElementById('mainTable'); tb.innerHTML='';
  const sel=document.getElementById('yearFilter');
  const selYear=sel&&sel.value?+sel.value:null;
  data.forEach((r,i)=>{
    const yr=new Date(r.date).getFullYear();
    if(selYear&&yr!==selYear) return;
    const tr=document.createElement('tr');
    const totP=r.principal+(r.prepay||0), totI=r.interest+(r.prepayInt||0);
    tr.innerHTML=`<td>${thDate(r.date)}</td><td>${r.rate.toFixed(2)}</td><td>${_moFmt0(totP+totI)}</td><td><button class="info-btn" onclick="payerRow(${i})" title="แยกผู้จ่าย">i</button></td><td class="prin">${_moFmt(totP)}</td><td class="intr">${_moFmt(totI)}</td><td><button class="info-btn" onclick="detailRow(${i})" title="รายละเอียดต้น/ดอก">i</button></td><td>${_moFmt(r.balance)}</td><td><button class="act-btn" onclick="editRow(${i})" title="แก้ไข"><i class="ti ti-pencil"></i></button><button class="act-btn del" onclick="delRow(${i})" title="ลบ"><i class="ti ti-trash"></i></button></td>`;
    tb.appendChild(tr);
  });
  if(selYear) addYearRow(tb,selYear);
}
function addYearRow(tb,yr){
  const rows=data.filter(r=>new Date(r.date).getFullYear()===yr);
  const p=rows.reduce((s,r)=>s+r.principal+(r.prepay||0),0), i=rows.reduce((s,r)=>s+r.interest+(r.prepayInt||0),0);
  const tr=document.createElement('tr'); tr.className='yr-row';
  tr.innerHTML=`<td colspan="4">รวมปี ${yr+543} (${rows.length} งวด)</td><td>${_moFmt(p)}</td><td>${_moFmt(i)}</td><td colspan="3"></td>`;
  tb.appendChild(tr);
}

function renderYears(){
  const years=[...new Set(data.map(r=>new Date(r.date).getFullYear()))].sort();
  const wrap=document.getElementById('yearCards'); wrap.innerHTML='';
  years.forEach(yr=>{
    const rows=data.filter(r=>new Date(r.date).getFullYear()===yr);
    const p=rows.reduce((s,r)=>s+r.principal+(r.prepay||0),0), i=rows.reduce((s,r)=>s+r.interest+(r.prepayInt||0),0);
    const pre=rows.reduce((s,r)=>s+(r.prepay||0),0), preI=rows.reduce((s,r)=>s+(r.prepayInt||0),0);
    const hasPre=pre>0||preI>0;
    const d=document.createElement('div'); d.className='year-card';
    d.innerHTML=`<div class="yc-year" style="display:flex;justify-content:space-between;align-items:center">ปี ${yr+543}${hasPre?`<button class="info-btn" onclick="yearDetail(${yr})" title="รายละเอียดโปะ">i</button>`:''}</div>
      <div class="yc-line"><span class="lbl">จำนวนงวด</span><span class="val">${rows.length}</span></div>
      <div class="yc-line"><span class="lbl">เงินต้น</span><span class="val green">${_moFmt0(p)}</span></div>
      <div class="yc-line"><span class="lbl">ดอกเบี้ย</span><span class="val amber">${_moFmt0(i)}</span></div>
      <div class="yc-line"><span class="lbl">รวมจ่าย</span><span class="val">${_moFmt0(p+i)}</span></div>`;
    wrap.appendChild(d);
  });
}
function yearDetail(yr){
  const rows=data.filter(r=>new Date(r.date).getFullYear()===yr);
  const prin=rows.reduce((s,r)=>s+r.principal,0), pre=rows.reduce((s,r)=>s+(r.prepay||0),0);
  const intr=rows.reduce((s,r)=>s+r.interest,0), preI=rows.reduce((s,r)=>s+(r.prepayInt||0),0);
  const totP=prin+pre, totI=intr+preI;
  document.getElementById('modalArea').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <h3>รายละเอียดปี ${yr+543}</h3>
    <p class="sub">${rows.length} งวด</p>
    <div class="dl-sec">เงินต้น</div>
    <div class="dl-row"><span class="dl-lbl">งวดต้น</span><span class="dl-val">${_moFmt(prin)}</span></div>
    <div class="dl-row"><span class="dl-lbl">โปะต้น</span><span class="dl-val">${_moFmt(pre)}</span></div>
    <div class="dl-row total"><span class="dl-lbl">รวมต้น</span><span class="dl-val" style="color:var(--green)">${_moFmt(totP)}</span></div>
    <div class="dl-sec">ดอกเบี้ย</div>
    <div class="dl-row"><span class="dl-lbl">งวดดอก</span><span class="dl-val">${_moFmt(intr)}</span></div>
    <div class="dl-row"><span class="dl-lbl">โปะดอก</span><span class="dl-val">${_moFmt(preI)}</span></div>
    <div class="dl-row total"><span class="dl-lbl">รวมดอก</span><span class="dl-val" style="color:var(--amber)">${_moFmt(totI)}</span></div>
    <div class="dl-sec">รวมจ่ายทั้งปี</div>
    <div class="dl-row total"><span class="dl-lbl">เงินต้น + ดอกเบี้ย</span><span class="dl-val">${_moFmt(totP+totI)}</span></div>
    <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">ปิด</button>
    </div></div></div>`;
}

function renderCharts(){
  const labels=data.map(r=>thDate(r.date));
  const balData=data.map(r=>Math.round(r.balance));
  const prinData=data.map(r=>Math.round(r.principal+(r.prepay||0)));
  const intData=data.map(r=>Math.round(r.interest));
  const grid='#eef2f7', tick='#94a3b8';
  if(balChart)balChart.destroy();
  balChart=new Chart(document.getElementById('balChart'),{
    data:{labels,datasets:[
      {type:'line',label:'เงินต้นคงเหลือ',data:balData,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.10)',fill:true,yAxisID:'y',tension:.3,pointRadius:0,borderWidth:2.5,order:0},
      {type:'bar',label:'งวดต้น',data:prinData,backgroundColor:'#16a34a',yAxisID:'y1',stack:'s',order:1},
      {type:'bar',label:'งวดดอก',data:intData,backgroundColor:'#f97316',yAxisID:'y1',stack:'s',order:1}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{color:tick,font:{family:'Inter'},boxWidth:12}},
      tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.raw.toLocaleString('th-TH')}}},
      scales:{
        x:{ticks:{color:tick,maxTicksLimit:10,font:{size:10}},grid:{color:grid}},
        y:{position:'left',ticks:{color:'#3b82f6',callback:v=>(v/1e6).toFixed(1)+'M',font:{size:10}},grid:{color:grid}},
        y1:{position:'right',ticks:{color:tick,callback:v=>(v/1000)+'k',font:{size:10}},grid:{display:false},max:50000}
      }}
  });
  const n1=document.getElementById('name1').value, n2=document.getElementById('name2').value;
  const f=data.reduce((s,r)=>s+r.foam,0), s=data.reduce((s,r)=>s+r.seng,0);
  if(splitChart)splitChart.destroy();
  splitChart=new Chart(document.getElementById('splitChart'),{
    type:'doughnut',
    data:{labels:[n1,n2],datasets:[{data:[f,s],backgroundColor:['#16a34a','#3b82f6'],borderColor:'#ffffff',borderWidth:3}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',
      plugins:{legend:{position:'bottom',labels:{color:tick,font:{family:'Inter'},boxWidth:12,padding:14}},
      tooltip:{callbacks:{label:c=>c.label+': '+c.raw.toLocaleString('th-TH')+' บาท'}}}}
  });
}

function showView(v,btn){
  document.getElementById('view-overview').classList.toggle('hidden', v!=='overview');
  document.getElementById('view-detail').classList.toggle('hidden', v!=='detail');
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(v==='detail') renderCharts();
}

function switchTab(id,btn){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active'); btn.classList.add('active');
}

function lastBalance(){
  return data.length ? data[data.length-1].balance : (_moNv('loanAmt')||0);
}
function calcNewInstallment(){
  const bal=lastBalance();
  const rate=_moNv('aRate')||0;
  const inst=(_moNv('aFoam')||0)+(_moNv('aSeng')||0);
  const dateStr=window.moGetDate('aDate');
  let days=30;
  if(dateStr){const d=new Date(dateStr); days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();}
  document.getElementById('aInstallShow').value=inst?inst.toFixed(2):'';
  if(rate>0){
    const intAmt=bal*(rate/100)*(days/365);
    document.getElementById('aInt').value=intAmt.toFixed(2);
    if(inst>0) document.getElementById('aPrin').value=Math.max(0,inst-intAmt).toFixed(2);
  }
}

function addRow(){
  const r={
    date:window.moGetDate('aDate'),
    foam:_moNv('aFoam')||0,
    seng:_moNv('aSeng')||0,
    rate:_moNv('aRate')||0,
    principal:_moNv('aPrin')||0,
    interest:_moNv('aInt')||0,
    prepay:_moNv('aPrepay')||0,
    prepayInt:_moNv('aPrepayInt')||0
  };
  if(!r.date){_moToast('กรุณาเลือกวันที่');return;}
  data.push(r);
  ['aDate','aFoam','aSeng','aRate','aInstallShow','aPrin','aInt','aPrepay','aPrepayInt'].forEach(id=>document.getElementById(id).value='');
  const _adp=document.getElementById('aDate'); if(_adp) _adp.dataset.iso='';
  recalc(); _moToast('เพิ่มงวดเรียบร้อย'); 
  document.querySelector('.tab').click();
}
function delRow(i){
  const r=data[i];
  document.getElementById('modalArea').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <h3>ลบงวด ${thDate(r.date)}?</h3>
    <p class="sub">รายการงวดนี้จะถูกลบ และระบบจะคำนวณยอดคงเหลือใหม่ทั้งหมด</p>
    <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" style="background:var(--red)" onclick="confirmDel(${i})">ลบงวดนี้</button>
    </div></div></div>`;
}
function confirmDel(i){ data.splice(i,1); closeModal(); recalc(); _moToast('ลบงวดแล้ว'); }

function editRow(i){
  const r=data[i];
  const n1=document.getElementById('name1').value, n2=document.getElementById('name2').value;
  document.getElementById('modalArea').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal"><h3>แก้ไขงวด ${thDate(r.date)}</h3>
    <div class="add-grid">
      <div class="field"><label>วันที่</label><input type="date" class="mo-dp" id="eDate" value="${r.date}"></div>
      <div class="field"><label>${n1}</label><input type="text" inputmode="decimal" id="eFoam" value="${r.foam}"></div>
      <div class="field"><label>${n2}</label><input type="text" inputmode="decimal" id="eSeng" value="${r.seng}"></div>
      <div class="field"><label>ดอกเบี้ย %</label><input type="text" inputmode="decimal" step="0.01" id="eRate" value="${r.rate}"></div>
      <div class="field"><label>งวดต้น</label><input type="text" inputmode="decimal" step="0.01" id="ePrin" value="${r.principal}"></div>
      <div class="field"><label>งวดดอก</label><input type="text" inputmode="decimal" step="0.01" id="eInt" value="${r.interest}"></div>
      <div class="field"><label>โปะต้น</label><input type="text" inputmode="decimal" step="0.01" id="ePrepay" value="${r.prepay||0}"></div>
      <div class="field"><label>โปะดอก</label><input type="text" inputmode="decimal" step="0.01" id="ePrepayInt" value="${r.prepayInt||0}"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="saveEdit(${i})">บันทึก</button>
    </div></div></div>`;
  if (window.moInitDatePickers) window.moInitDatePickers(document.getElementById('modalArea'));
}
function saveEdit(i){
  data[i]={date:window.moGetDate('eDate'),foam:_moNv('eFoam')||0,seng:_moNv('eSeng')||0,rate:_moNv('eRate')||0,principal:_moNv('ePrin')||0,interest:_moNv('eInt')||0,prepay:_moNv('ePrepay')||0,prepayInt:_moNv('ePrepayInt')||0};
  closeModal(); recalc(); _moToast('บันทึกการแก้ไขแล้ว');
}
function payerRow(i){
  const r=data[i];
  const n1=document.getElementById('name1').value, n2=document.getElementById('name2').value;
  const tot=r.foam+r.seng||1;
  document.getElementById('modalArea').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <h3>ผู้จ่ายงวด ${thDate(r.date)}</h3>
    <p class="sub">เงินเข้าบัญชีรวม ${_moFmt(r.foam+r.seng)} บาท</p>
    <div class="dl-row"><span class="dl-lbl">${n1}</span><span class="dl-val" style="color:var(--green)">${_moFmt0(r.foam)} <span style="color:var(--txt-3);font-size:12px">(${(r.foam/tot*100).toFixed(1)}%)</span></span></div>
    <div class="dl-row"><span class="dl-lbl">${n2}</span><span class="dl-val" style="color:var(--blue)">${_moFmt0(r.seng)} <span style="color:var(--txt-3);font-size:12px">(${(r.seng/tot*100).toFixed(1)}%)</span></span></div>
    <div class="dl-row total"><span class="dl-lbl">รวมเงินเข้าบัญชี</span><span class="dl-val">${_moFmt(r.foam+r.seng)}</span></div>
    <div class="split-track" style="margin-top:14px"><div class="split-bar" style="background:var(--green);width:${r.foam/tot*100}%"></div></div>
    <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">ปิด</button>
      <button class="btn btn-primary" onclick="editRow(${i})">แก้ไขงวดนี้</button>
    </div></div></div>`;
}
function detailRow(i){
  const r=data[i];
  const totP=r.principal+(r.prepay||0), totI=r.interest+(r.prepayInt||0);
  document.getElementById('modalArea').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <h3>รายละเอียดงวด ${thDate(r.date)}</h3>
    <p class="sub">อัตราดอกเบี้ย ${r.rate.toFixed(2)}% ต่อปี</p>
    <div class="dl-sec">เงินต้น</div>
    <div class="dl-row"><span class="dl-lbl">งวดต้น</span><span class="dl-val">${_moFmt(r.principal)}</span></div>
    <div class="dl-row"><span class="dl-lbl">โปะต้น</span><span class="dl-val">${_moFmt(r.prepay||0)}</span></div>
    <div class="dl-row total"><span class="dl-lbl">รวมต้น</span><span class="dl-val" style="color:var(--green)">${_moFmt(totP)}</span></div>
    <div class="dl-sec">ดอกเบี้ย</div>
    <div class="dl-row"><span class="dl-lbl">งวดดอก</span><span class="dl-val">${_moFmt(r.interest)}</span></div>
    <div class="dl-row"><span class="dl-lbl">โปะดอก</span><span class="dl-val">${_moFmt(r.prepayInt||0)}</span></div>
    <div class="dl-row total"><span class="dl-lbl">รวมดอก</span><span class="dl-val" style="color:var(--amber)">${_moFmt(totI)}</span></div>
    <div class="dl-sec">ยอดคงเหลือหลังงวดนี้</div>
    <div class="dl-row total"><span class="dl-lbl">เงินต้นคงเหลือ</span><span class="dl-val" style="color:var(--blue)">${_moFmt(r.balance)}</span></div>
    <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">ปิด</button>
      <button class="btn btn-primary" onclick="editRow(${i})">แก้ไขงวดนี้</button>
    </div></div></div>`;
}
function closeModal(){document.getElementById('modalArea').innerHTML='';}

function openSettings(){
  const loan=document.getElementById('loanAmt').value;
  const n1=document.getElementById('name1').value, n2=document.getElementById('name2').value;
  document.getElementById('modalArea').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <h3>ตั้งค่าข้อมูลสินเชื่อ</h3>
    <p class="sub">ข้อมูลพื้นฐานของสินเชื่อ ใช้เป็นฐานในการคำนวณยอดคงเหลือและแผนการผ่อน</p>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label>ยอดกู้ตั้งต้น (บาท)</label><input type="text" inputmode="decimal" id="sLoan" value="${loan}"></div>
      <div class="field"><label>ชื่อผู้จ่ายคนที่ 1</label><input type="text" id="sName1" value="${n1}"></div>
      <div class="field"><label>ชื่อผู้จ่ายคนที่ 2</label><input type="text" id="sName2" value="${n2}"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:22px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="saveSettings()">บันทึก</button>
    </div></div></div>`;
}
function saveSettings(){
  document.getElementById('loanAmt').value=_moNv('sLoan')||0;
  document.getElementById('name1').value=document.getElementById('sName1').value||'ผู้จ่าย 1';
  document.getElementById('name2').value=document.getElementById('sName2').value||'ผู้จ่าย 2';
  closeModal(); recalc(); _moToast('บันทึกการตั้งค่าแล้ว');
}

function exportData(){
  const blob=new Blob([localStorage.getItem(STORE_KEY)||'{}'],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='mortgage_'+new Date().toISOString().slice(0,10)+'.json'; a.click(); _moToast('สำรองข้อมูลแล้ว');
}
function importData(ev){
  const f=ev.target.files[0]; if(!f)return;
  const rd=new FileReader();
  rd.onload=e=>{try{const s=JSON.parse(e.target.result);data=s.data||[];
    if(s.loanAmt)document.getElementById('loanAmt').value=s.loanAmt;
    if(s.name1)document.getElementById('name1').value=s.name1;
    if(s.name2)document.getElementById('name2').value=s.name2;
    recalc();_moToast('นำเข้าสำเร็จ');}catch(err){_moToast('ไฟล์ไม่ถูกต้อง');}};
  rd.readAsText(f);
}

let planChart=null;
function planAuto(){
  const monthly=_moNv('planMonthly')||0, prepay=_moNv('planPrepay')||0;
  const yearly=monthly*12;
  const y=document.getElementById('planYearly'); if(y) y.value=_moFmt0(yearly);
  const t=document.getElementById('planTotalYr'); if(t) t.value=_moFmt0(yearly+prepay);
  if(typeof data!=='undefined') _moSave();
}

function calcPlan(doScroll){
  const startBal=window._remBal||0;
  const monthly=_moNv('planMonthly')||0;
  const prepayYr=_moNv('planPrepay')||0;
  const rate=_moNv('planRate')||0;
  const startAge=_moNv('planAge')||0;
  if(!monthly||startBal<=0){ _moToast('กรุณากรอกเงินงวด/เดือน'); return; }

  // actual data aggregated by calendar year
  const actByYear={};
  data.forEach(r=>{
    const y=new Date(r.date).getFullYear();
    if(!actByYear[y]) actByYear[y]={p:0,i:0,end:0};
    actByYear[y].p+=r.principal+(r.prepay||0);
    actByYear[y].i+=r.interest+(r.prepayInt||0);
    actByYear[y].end=r.balance;
  });

  // project forward month-by-month from the month after the last actual entry
  const projByYear={};
  const lastDate=data.length?new Date(data[data.length-1].date):new Date();
  const lastActualYear=data.length?new Date(data[data.length-1].date).getFullYear():new Date().getFullYear();
  let d=new Date(lastDate); d.setMonth(d.getMonth()+1);
  let bal=startBal, projInt=0, tooLow=false, safety=0;
  while(bal>0.01 && safety<1200){
    safety++;
    const y=d.getFullYear();
    const days=new Date(y,d.getMonth()+1,0).getDate();
    const intAmt=bal*(rate/100)*(days/365);
    let prin=monthly-intAmt;
    if(prin<=0){ tooLow=true; break; }
    if(prin>bal) prin=bal;
    bal-=prin; projInt+=intAmt;
    if(!projByYear[y]) projByYear[y]={p:0,i:0,end:bal};
    projByYear[y].p+=prin; projByYear[y].i+=intAmt;
    if(d.getMonth()===11 && prepayYr>0 && bal>0){ const ap=Math.min(prepayYr,bal); bal-=ap; projByYear[y].p+=ap; }
    projByYear[y].end=bal;
    d.setMonth(d.getMonth()+1);
  }
  const paidOff=bal<=0.01;

  const allYears=[...new Set([...Object.keys(actByYear),...Object.keys(projByYear)].map(Number))].sort((a,b)=>a-b);
  const rows=allYears.map(y=>{
    const a=actByYear[y]||{p:0,i:0,end:null}, pj=projByYear[y]||null;
    const kind = y<lastActualYear ? 'past' : (y===lastActualYear ? 'now' : 'future');
    return {year:y, yearNo:y-2023+1, age:startAge+(y-2023), p:(a.p||0)+(pj?pj.p:0), i:(a.i||0)+(pj?pj.i:0), end:pj?pj.end:a.end, kind};
  });

  const res=document.getElementById('planResult'); res.classList.remove('hidden');
  const warn=document.getElementById('planWarn');
  if(tooLow){
    warn.innerHTML='<div style="background:var(--red-soft);color:var(--red);border-radius:9px;padding:14px;font-size:14px;margin-top:14px">⚠️ เงินงวด/เดือน น้อยกว่าดอกเบี้ย — ยอดหนี้จะไม่ลดลง กรุณาเพิ่มเงินงวดหรือโปะเพิ่ม</div>';
    ['planPayoff','planPayoffAge','planYearsLeft','planIntLeft'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('planPayoffSub').textContent='ผ่อนไม่หมด';
    document.getElementById('planTable').innerHTML='';
    if(planChart){planChart.destroy();planChart=null;}
    return;
  }
  const payoffRow=rows[rows.length-1];
  document.getElementById('planPayoff').textContent=payoffRow.year+543;
  document.getElementById('planPayoffSub').textContent='พ.ศ.';
  document.getElementById('planPayoffAge').textContent=payoffRow.age+' ปี';
  document.getElementById('planYearsLeft').textContent=(payoffRow.year-lastActualYear)+' ปี';
  document.getElementById('planIntLeft').textContent=_moFmt0(projInt);
  warn.innerHTML='<div style="background:var(--green-soft);color:var(--green);border-radius:9px;padding:14px;font-size:14px;margin-top:14px">🎉 ตามแผนนี้คาดปลอดหนี้ปี '+(payoffRow.year+543)+' ตอนอายุ '+payoffRow.age+' ปี</div>';

  const tb=document.getElementById('planTable'); tb.innerHTML='';
  rows.forEach(rw=>{
    const tr=document.createElement('tr');
    tr.className = rw===payoffRow ? 'payoff-row' : (rw.kind==='past' ? 'past-row' : (rw.kind==='now' ? 'now-row' : ''));
    const endTxt=rw.end!=null?_moFmt(Math.max(0,rw.end)):'-';
    tr.innerHTML='<td>'+rw.age+'</td><td>'+rw.yearNo+'</td><td>'+(rw.year+543)+'</td><td class="prin">'+_moFmt(rw.p)+'</td><td class="intr">'+_moFmt(rw.i)+'</td><td>'+endTxt+'</td>';
    tb.appendChild(tr);
  });
  const lg=document.getElementById('planLegend');
  if(lg) lg.innerHTML='<span><i style="background:var(--surface-2)"></i> อดีต (ข้อมูลจริง)</span><span><i style="background:var(--blue-soft)"></i> ปีปัจจุบัน</span><span><i style="background:transparent;border:1px solid var(--line)"></i> พยากรณ์</span><span><i style="background:var(--green-soft)"></i> ปีที่ผ่อนหมด</span>';

  const labels=rows.map(r=>String(r.year+543));
  if(planChart)planChart.destroy();
  planChart=new Chart(document.getElementById('planChart'),{
    type:'line',
    data:{labels,datasets:[{label:'เงินต้นคงเหลือ',data:rows.map(r=>Math.round(Math.max(0,r.end||0))),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.10)',fill:true,tension:.25,pointRadius:2,borderWidth:2.5}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw.toLocaleString('en-US')+' บาท'}}},
      scales:{x:{ticks:{color:'#94a3b8',maxTicksLimit:10,font:{size:10}},grid:{color:'#eef2f7'}},
              y:{ticks:{color:'#94a3b8',callback:v=>(v/1e6).toFixed(1)+'M',font:{size:10}},grid:{color:'#eef2f7'}}}}
  });

  if(doScroll) res.scrollIntoView({behavior:'smooth',block:'nearest'});
}

/* --- expose to global scope (inline handlers + cross-module glue) --- */
Object.assign(window, { _moNv, _moToast, _moLoad, _moSave, recalc, setCheer, renderSplit, populateYearFilter, renderTable, addYearRow, renderYears, yearDetail, renderCharts, showView, switchTab, lastBalance, calcNewInstallment, addRow, delRow, confirmDel, editRow, saveEdit, payerRow, detailRow, closeModal, openSettings, saveSettings, exportData, importData, planAuto, calcPlan });
