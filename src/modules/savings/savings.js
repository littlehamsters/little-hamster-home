/* Savings module — jar funds, deposits/withdrawals */
const _SV_KEY='savings_jars_v1';
const EMOJIS=['🫙','🎯','✈️','🏠','🚗','🎓','💍','🏥','🎁','🐱','🌿','🍃','💻','📦','🛟','💰'];
const CATEGORIES=[
  {id:'travel',    name:'ท่องเที่ยว',  emoji:'✈️', color:'#5BA9C4'},
  {id:'emergency', name:'ฉุกเฉิน',     emoji:'🛟', color:'#C76A4E'},
  {id:'invest',    name:'ลงทุน',       emoji:'📈', color:'#5E9A6A'},
  {id:'lifestyle', name:'ไลฟ์สไตล์',   emoji:'🛍️', color:'#C79A3F'},
  {id:'education', name:'การศึกษา',    emoji:'🎓', color:'#8A6BA8'},
  {id:'home',      name:'บ้าน/ของใช้', emoji:'🏠', color:'#9A7B4F'},
  {id:'other',     name:'อื่น ๆ',      emoji:'📦', color:'#8A8578'},
];
const catById=id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES[CATEGORIES.length-1];
const SHARED='กองกลาง';
const OWNER_ICON='<i class="ti ti-user"></i>';
const SHARED_ICON='<i class="ti ti-users"></i>';
let state={funds:[]};
let editId=null, txId=null, txType='in', pickedEmoji=EMOJIS[0], histId=null, pickedCat='other', catFilter='all';

/* ---------- storage ---------- */
function _svLoad(){
  try{const r=localStorage.getItem(_SV_KEY);if(r)state=JSON.parse(r);}catch(e){state={funds:[]};}
  if(!state.funds)state.funds=[];
  if(!state.people)state.people=[];
  state.theme='island';
  // migrate: pull any names already used in transactions into the people list
  state.funds.forEach(f=>{
    if(!f.createdAt)f.createdAt=f.tx.length?Math.min(...f.tx.map(t=>t.ts)):Date.now();
    f.tx.forEach(t=>{if(t.who&&!state.people.includes(t.who))state.people.push(t.who);});
  });
  applyTheme('island');
}
function applyTheme(id){
  state.theme=id;
  if(id==='sage')document.getElementById('m-savings').removeAttribute('data-theme');
  else document.getElementById('m-savings').setAttribute('data-theme',id);
}
function _svSave(){try{localStorage.setItem(_SV_KEY,JSON.stringify(state));}catch(e){}}

/* ---------- helpers ---------- */
const _svFmt=n=>Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:2});
const parseNum=s=>{const v=parseFloat(String(s).replace(/,/g,'').trim());return isNaN(v)?null:v;};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function balance(f){return f.tx.reduce((s,t)=>s+(t.type==='in'?t.amt:-t.amt),0);}
function dateStr(ts){const d=new Date(ts);if(isNaN(d))return '—';return d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})+' '+d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});}
function shortDate(iso){if(!iso)return '';const d=new Date(iso+'T00:00:00');return d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});}
function daysLeft(iso){
  if(!iso)return null;
  const t=new Date(iso+'T00:00:00');const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.round((t-today)/86400000);
}
function monthsLabel(days){
  const mo=Math.round(Math.abs(days)/30.44);
  return mo<1?'ไม่ถึง 1 เดือน':mo+' เดือน';
}

/* ---------- _svRender ---------- */
function monthNet(f){
  const n=new Date(),y=n.getFullYear(),m=n.getMonth();
  return f.tx.reduce((s,t)=>{const d=new Date(t.ts);return (d.getFullYear()===y&&d.getMonth()===m)?s+(t.type==='in'?t.amt:-t.amt):s;},0);
}
function planMonthly(f){
  const bal=balance(f);
  if(f.goal<=0||!f.targetDate||bal>=f.goal)return 0;
  const today=new Date();
  const end=new Date(f.targetDate+'T00:00:00');
  const months=Math.max(1,Math.round((end-today)/(86400000*30.44)));
  return (f.goal-bal)/months;
}
function fundStatus(f){
  const bal=balance(f);
  if(f.closed)return{tone:'closed',label:'ปิดแล้ว'};
  if(f.goal<=0)return{tone:'neutral',label:'⚪ ยังไม่ตั้งเป้า'};
  if(bal>=f.goal)return{tone:'ok',label:'✅ ถึงเป้าแล้ว 🎉'};
  const net=monthNet(f);
  if(f.targetDate){
    const dl=daysLeft(f.targetDate);
    if(dl<0)return{tone:'over',label:`🔴 เลยกำหนด ${monthsLabel(dl)}`};
    if(dl===0)return{tone:'warn',label:'🟠 ครบกำหนดวันนี้'};
    const req=planMonthly(f);
    if(req>0&&net>=req)return{tone:'ok',label:'🟢 เดือนนี้ออมครบแล้ว'};
    if(req>0)return{tone:'warn',label:`🟡 เดือนนี้ยังขาด ~${_svFmt(Math.ceil(req-net))}`};
    return{tone:'ok',label:'🟢 ตามแผน'};
  }
  if(net>0)return{tone:'ok',label:`🔵 เดือนนี้ออม ${_svFmt(net)}`};
  return{tone:'neutral',label:'⚪ เดือนนี้ยังไม่ได้ออม'};
}
function jarCard(f){
  const bal=balance(f);
  const has=f.goal>0;
  const p=has?Math.min(100,bal/f.goal*100):(bal>0?100:0);
  const done=has&&bal>=f.goal;
  const cls=['jar'];if(done&&!f.closed)cls.push('done');if(f.closed)cls.push('closed');
  const st=fundStatus(f);
  const pill=`<span class="status-pill ${st.tone}">${st.label}</span>`;
  const cat=f.category?catById(f.category):null;
  const catChip=cat?`<span class="cat-chip" style="--cc:${cat.color}">${cat.emoji} ${cat.name}</span>`:'';
  const ownerChip=f.owner
    ?`<span class="owner-chip">${OWNER_ICON} ${escapeHtml(f.owner)}</span>`
    :`<span class="owner-chip">${SHARED_ICON} ${SHARED}</span>`;
  const tags=catChip+ownerChip;
  // deadline / countdown
  let deadline='';
  if(f.targetDate&&!f.closed){
    const dl=daysLeft(f.targetDate);
    const dateTxt=shortDate(f.targetDate);
    if(done){
      deadline=`<div class="jar-deadline ok">ครบกำหนด ${dateTxt} · สำเร็จแล้ว</div>`;
    }else if(dl>0){
      const cls=dl<=31?'warn':'';
      deadline=`<div class="jar-deadline ${cls}"><i class="ti ti-clock"></i> เหลือ ${monthsLabel(dl)} · ครบกำหนด ${dateTxt}</div>`;
    }else if(dl===0){
      deadline=`<div class="jar-deadline warn"><i class="ti ti-clock"></i> ครบกำหนดวันนี้</div>`;
    }else{
      deadline=`<div class="jar-deadline over">เลยกำหนดมา ${monthsLabel(dl)} · ${dateTxt}</div>`;
    }
  }
  // monthly saving line
  let monthly='';
  if(!f.closed){
    const net=monthNet(f);
    const req=planMonthly(f);
    monthly=`<div class="jar-month"><i class="ti ti-calendar"></i> เดือนนี้ออม ${_svFmt(net)} บาท`
      +(req>0?` · ควรออม ~${_svFmt(Math.ceil(req))}/เดือน`:'')+`</div>`;
  }
  const actions=f.closed
    ? `<button class="btn btn-primary" onclick="reopenFund('${f.id}')"><i class="ti ti-refresh"></i> เปิดอีกครั้ง</button>
       <button class="btn" onclick="openHist('${f.id}')"><i class="ti ti-history"></i> ประวัติ</button>`
    : `<button class="btn btn-primary" onclick="openTx('${f.id}','in')"><i class="ti ti-plus-minus"></i> ทำรายการ</button>
       <button class="btn" onclick="openHist('${f.id}')"><i class="ti ti-history"></i> ประวัติ</button>`;
  // progress bar
  let progBar='';
  if(has){
    const fillTone=done?'tone-done':(p>=80?'tone-warn':'tone-ok');
    progBar=`<div class="jar-prog-wrap">
      <div class="jar-prog-track"><div class="jar-prog-fill ${fillTone}" style="width:${p.toFixed(1)}%"></div></div>
      <div class="jar-prog-cap"><span>${_svFmt(bal)} บาท</span><span>${p.toFixed(0)}% · เป้า ${_svFmt(f.goal)}</span></div>
    </div>`;
  }
  return `<div class="${cls.join(' ')}">
      <div class="water" style="height:0%"></div>
      <div class="jar-inner">
        <div class="jar-top">
          <span class="jar-emoji">${f.emoji}</span>
          <span class="jar-name">${escapeHtml(f.name)}</span>
          ${has&&!f.closed?`<span class="jar-pct">${p.toFixed(0)}%</span>`:''}
          <button class="jar-menu" onclick="openFund('${f.id}')" title="แก้ไข"><i class="ti ti-settings"></i></button>
        </div>
        ${tags?`<div class="jar-tags">${tags}</div>`:''}
        <div class="jar-bal">${_svFmt(bal)} <small>บาท</small></div>
        ${progBar}
        ${f.desc?`<div class="jar-desc">${escapeHtml(f.desc)}</div>`:''}
        <div class="jar-goal">${has?`เป้าหมาย ${_svFmt(f.goal)} บาท`:'ยังไม่ตั้งเป้าหมาย'}</div>
        <div>${pill}</div>
        ${deadline}
        ${monthly}
        <div class="jar-actions">${actions}</div>
      </div>
    </div>`;
}
function _svRender(){
  const board=document.getElementById('board');
  const active=state.funds.filter(f=>!f.closed);
  const closed=state.funds.filter(f=>f.closed);
  const totalSaved=active.reduce((s,f)=>s+balance(f),0);
  const totalGoal=active.reduce((s,f)=>s+(f.goal||0),0);
  const pct=totalGoal>0?Math.min(100,totalSaved/totalGoal*100):0;

  document.getElementById('summary').innerHTML=`
    <div class="stat accent"><div class="label">รวมเงินออม (กองที่ใช้งาน)</div><div class="num">${_svFmt(totalSaved)} <small>บาท</small></div></div>
    <div class="stat"><div class="label">เป้าหมายรวม</div><div class="num">${totalGoal>0?_svFmt(totalGoal):'—'} <small>${totalGoal>0?'บาท':''}</small></div></div>
    <div class="stat"><div class="label">จำนวนกอง</div><div class="num">${active.length} <small>กอง${closed.length?` · ปิด ${closed.length}`:''}</small></div></div>
    ${totalGoal>0?`<div class="overall-bar">
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
        <div class="cap"><span>ความคืบหน้ารวม</span><span>${pct.toFixed(0)}%</span></div>
      </div>`:''}
  `;

  if(state.funds.length===0){
    document.getElementById('filterbar').innerHTML='';
    board.innerHTML=`<div class="empty"><div class="big"><i class="ti ti-pig-money"></i></div><h3>ยังไม่มีกองเงินออม</h3>
      <p>เริ่มจากสร้างกองแรก เช่น “กองฉุกเฉิน” หรือ “ทริปต่อไป”</p>
      <br><button class="btn btn-primary" onclick="openFund()">+ สร้างกองแรก</button></div>`;
    return;
  }

  // ----- category filter bar -----
  const usedCats=CATEGORIES.filter(c=>state.funds.some(f=>(f.category||'other')===c.id));
  const fb=document.getElementById('filterbar');
  if(usedCats.length>1){
    if(catFilter!=='all'&&!usedCats.some(c=>c.id===catFilter))catFilter='all';
    fb.innerHTML=`<button class="cat-filter ${catFilter==='all'?'active':''}" onclick="setCatFilter('all')">ทั้งหมด</button>`
      +usedCats.map(c=>`<button class="cat-filter ${catFilter===c.id?'active':''}" onclick="setCatFilter('${c.id}')" style="--cc:${c.color}">${c.emoji} ${c.name}</button>`).join('');
  }else{fb.innerHTML='';catFilter='all';}

  const match=f=>catFilter==='all'||(f.category||'other')===catFilter;
  const activeShown=active.filter(match);
  const closedShown=closed.filter(match);

  let html='';
  if(activeShown.length) html+='<div class="grid">'+activeShown.map(jarCard).join('')+'</div>';
  else if(catFilter!=='all') html+='<div class="empty"><h3>ไม่มีกองในหมวดนี้</h3></div>';
  else html+='<div class="empty"><h3>ไม่มีกองที่ใช้งานอยู่</h3><p>กองทั้งหมดถูกปิดไว้ หรือสร้างกองใหม่ได้เลย</p></div>';
  if(closedShown.length){
    html+=`<div class="closed-head">กองที่ปิดแล้ว (${closedShown.length})</div>`;
    html+='<div class="grid">'+closedShown.map(jarCard).join('')+'</div>';
  }
  board.innerHTML=html;
}
function setCatFilter(id){catFilter=id;_svRender();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ---------- fund modal ---------- */
function openFund(id){
  editId=id||null;
  const f=id?state.funds.find(x=>x.id===id):null;
  document.getElementById('fundTitle').textContent=f?'แก้ไขกอง':'สร้างกองใหม่';
  document.getElementById('fName').value=f?f.name:'';
  document.getElementById('fDesc').value=f&&f.desc?f.desc:'';
  document.getElementById('fGoal').value=f&&f.goal?f.goal:'';
  document.getElementById('fDate').value=f&&f.targetDate?f.targetDate:'';
  document.getElementById('fStart').value='';
  document.getElementById('fStart').parentElement.style.display=f?'none':'block';
  pickedEmoji=f?f.emoji:EMOJIS[0];
  buildEmoji();
  pickedCat=f&&f.category?f.category:'other';
  buildCat();
  fillOwnerSelect(f?f.owner:'');
  document.getElementById('fundErr').style.display='none';
  // delete button
  let del=document.getElementById('fundDelete');
  let cls=document.getElementById('fundClose');
  if(f){
    if(!del){del=document.createElement('button');del.id='fundDelete';del.className='btn btn-ghost';del.style.flex='0 0 auto';
      document.querySelector('#fundOverlay .modal-actions').prepend(del);}
    del.textContent='ลบกอง';del.style.display='block';del.classList.remove('arm');
    let armed=false;
    del.onclick=()=>{
      if(!armed){armed=true;del.textContent='กดอีกครั้งเพื่อลบ';del.classList.add('arm');return;}
      state.funds=state.funds.filter(x=>x.id!==id);_svSave();_svRender();_svClose('fundOverlay');
    };
    if(!cls){cls=document.createElement('button');cls.id='fundClose';cls.className='btn';cls.style.flex='0 0 auto';
      document.querySelector('#fundOverlay .modal-actions').prepend(cls);}
    cls.textContent=f.closed?'เปิดกองอีกครั้ง':'ปิดกอง';cls.style.display='block';
    cls.onclick=()=>{f.closed=!f.closed;_svSave();_svRender();_svClose('fundOverlay');};
  }else{
    if(del)del.style.display='none';
    if(cls)cls.style.display='none';
  }
  document.getElementById('fundOverlay').classList.add('show');
  document.getElementById('fName').focus();
}
function buildEmoji(){
  document.getElementById('emojiRow').innerHTML=EMOJIS.map(e=>
    `<button class="emoji-pick ${e===pickedEmoji?'active':''}" onclick="pickEmoji('${e}')">${e}</button>`).join('');
}
function pickEmoji(e){pickedEmoji=e;buildEmoji();}
function buildCat(){
  document.getElementById('catRow').innerHTML=CATEGORIES.map(c=>
    `<button type="button" class="cat-pick ${c.id===pickedCat?'active':''}" onclick="pickCat('${c.id}')"
       style="--cc:${c.color}">${c.emoji} ${c.name}</button>`).join('');
}
function pickCat(id){pickedCat=id;buildCat();}
function fillOwnerSelect(selected){
  const sel=document.getElementById('fOwner');
  let names=[...state.people];
  if(selected&&!names.includes(selected))names.push(selected);
  sel.innerHTML=`<option value="">🤝 ${SHARED} (ใช้ร่วมกัน)</option>`+names.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value=selected||'';
}
function reopenFund(id){const f=state.funds.find(x=>x.id===id);if(f){f.closed=false;_svSave();_svRender();}}
function saveFund(){
  const name=document.getElementById('fName').value.trim();
  const desc=document.getElementById('fDesc').value.trim();
  const goal=parseNum(document.getElementById('fGoal').value)||0;
  const start=parseNum(document.getElementById('fStart').value)||0;
  const targetDate=document.getElementById('fDate').value||'';
  const owner=document.getElementById('fOwner').value||'';
  const err=document.getElementById('fundErr');
  if(!name){err.textContent='ใส่ชื่อกองก่อนนะ';err.style.display='block';return;}
  if(goal<0||start<0){err.textContent='จำนวนเงินต้องไม่ติดลบ';err.style.display='block';return;}
  if(editId){
    const f=state.funds.find(x=>x.id===editId);
    f.name=name;f.desc=desc;f.goal=goal;f.emoji=pickedEmoji;f.targetDate=targetDate;f.category=pickedCat;f.owner=owner;
  }else{
    const f={id:uid(),name,desc,emoji:pickedEmoji,goal,targetDate,category:pickedCat,owner,createdAt:Date.now(),tx:[]};
    if(start>0)f.tx.push({id:uid(),type:'in',amt:start,note:'ยอดเริ่มต้น',who:'',ts:Date.now()});
    state.funds.push(f);
  }
  _svSave();_svRender();_svClose('fundOverlay');
}

/* ---------- transaction modal ---------- */
function openTx(id,type){
  txId=id;txType=type||'in';
  const f=state.funds.find(x=>x.id===id);
  document.getElementById('txTitle').textContent=f.emoji+' '+f.name;
  document.getElementById('txAmt').value='';
  document.getElementById('txNote').value='';
  if(window.moSetDate)window.moSetDate('txDate',todayISO());else document.getElementById('txDate').value=todayISO();
  document.getElementById('txErr').style.display='none';
  setSeg();
  renderHist(f);
  document.getElementById('txOverlay').classList.add('show');
  document.getElementById('txAmt').focus();
}
function todayISO(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

/* ---------- owner asset summary ---------- */
function openAssets(){renderAssets();document.getElementById('assetOverlay').classList.add('show');}
function renderAssets(){
  const groups={};
  state.funds.forEach(f=>{
    const k=f.owner||SHARED;
    if(!groups[k])groups[k]={total:0,funds:[]};
    groups[k].total+=balance(f);groups[k].funds.push(f);
  });
  const grand=Object.values(groups).reduce((s,g)=>s+g.total,0);
  const entries=Object.entries(groups).sort((a,b)=>b[1].total-a[1].total);
  const el=document.getElementById('assetBody');
  if(!entries.length){el.innerHTML='<div class="hist-empty">ยังไม่มีกองเงินออม</div>';return;}
  let html=`<div class="asset-grand">สินทรัพย์รวมทั้งหมด <b>${_svFmt(grand)}</b> บาท</div>`;
  html+=entries.map(([name,g])=>{
    const pct=grand>0?g.total/grand*100:0;
    const funds=g.funds.slice().sort((a,b)=>balance(b)-balance(a)).map(f=>
      `<div class="asset-fund"><span>${f.emoji} ${escapeHtml(f.name)}${f.closed?' <span class="asset-closed">ปิด</span>':''}</span><span>${_svFmt(balance(f))}</span></div>`).join('');
    return `<div class="asset-owner">
      <div class="asset-head">
        <span class="asset-name">${name===SHARED?SHARED_ICON:OWNER_ICON} ${escapeHtml(name)}</span>
        <span class="asset-amt">${_svFmt(g.total)} บาท</span>
      </div>
      <div class="asset-bar"><div class="asset-fill" style="width:${pct}%"></div></div>
      <div class="asset-meta">${g.funds.length} กอง · ${pct.toFixed(0)}% ของทั้งหมด</div>
      <div class="asset-funds">${funds}</div>
    </div>`;
  }).join('');
  el.innerHTML=html;
}

/* ---------- settings: manage people ---------- */
function _svOpenSettings(){
  document.getElementById('setNewName').value='';
  document.getElementById('setErr').style.display='none';
  armRemove=-1;
  renderPeople();
  document.getElementById('setOverlay').classList.add('show');
}
function ownerStats(){
  const map={};
  state.people.forEach(n=>map[n]={total:0,count:0});
  state.funds.forEach(f=>{
    const k=f.owner||SHARED;
    if(!map[k])map[k]={total:0,count:0};
    map[k].total+=balance(f);map[k].count++;
  });
  return map;
}
function renderPeople(){
  const el=document.getElementById('peopleList');
  const stats=ownerStats();
  const row=(n,s,i)=>`<div class="person-item">
      <div>
        <div class="nm"${i===null?' style="color:var(--ink-soft)"':''}>${n===SHARED?SHARED_ICON:OWNER_ICON} ${escapeHtml(n)}</div>
        <div class="owner-sub">ออมรวม ${_svFmt(s.total)} บาท · ${s.count} กอง</div>
      </div>
      ${i===null?'':`<button class="rm${armRemove===i?' arm':''}" onclick="removePerson(${i})">${armRemove===i?'ยืนยันลบ?':'ลบ'}</button>`}
    </div>`;
  let rows=state.people.map((n,i)=>row(n,stats[n]||{total:0,count:0},i));
  // owners referenced by funds but not in the list (incl. กองกลาง)
  Object.keys(stats).forEach(k=>{if(!state.people.includes(k))rows.push(row(k,stats[k],null));});
  el.innerHTML=rows.length?rows.join(''):'<div class="hist-empty">ยังไม่มีเจ้าของ — เพิ่มด้านบนได้เลย</div>';
}
function addPerson(){
  const inp=document.getElementById('setNewName');
  const err=document.getElementById('setErr');
  const name=inp.value.trim();
  if(!name){err.textContent='ใส่ชื่อก่อนนะ';err.style.display='block';return;}
  if(state.people.includes(name)){err.textContent='มีชื่อนี้อยู่แล้ว';err.style.display='block';return;}
  state.people.push(name);_svSave();
  inp.value='';err.style.display='none';
  renderPeople();
}
let armRemove=-1;
function removePerson(i){
  if(armRemove!==i){armRemove=i;renderPeople();return;}
  armRemove=-1;
  state.people.splice(i,1);_svSave();renderPeople();
}
function setSeg(){
  document.querySelectorAll('#txSeg button').forEach(b=>{
    b.classList.toggle('active',b.dataset.type===txType);
  });
}
function txRow(fid,t){
  const sub=[t.who?escapeHtml(t.who):'',dateStr(t.ts)].filter(Boolean).join(' · ');
  return `<div class="hist-item">
      <div>
        <div>${t.type==='in'?'ฝาก':'ถอน'}${t.note?' · '+escapeHtml(t.note):''}</div>
        <div class="d">${sub}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="amt ${t.type==='in'?'in':'out'}">${t.type==='in'?'+':'−'}${_svFmt(t.amt)}</span>
        <button class="del" onclick="delTx('${fid}','${t.id}')">✕</button>
      </div>
    </div>`;
}
function renderHist(f){
  const el=document.getElementById('txHist');
  if(!f.tx.length){el.innerHTML='<h4>ประวัติล่าสุด</h4><div class="muted">ยังไม่มีรายการ</div>';return;}
  const items=[...f.tx].reverse().slice(0,5).map(t=>txRow(f.id,t)).join('');
  el.innerHTML='<h4>ประวัติล่าสุด</h4><div class="hist-list">'+items+'</div>';
}
function openHist(id){
  histId=id;
  const f=state.funds.find(x=>x.id===id);
  document.getElementById('histTitle').textContent=f.emoji+' '+f.name;
  renderHistFull(f);
  document.getElementById('histOverlay').classList.add('show');
}
function renderHistFull(f){
  const el=document.getElementById('histFullList');
  if(!f.tx.length){el.innerHTML='<div class="hist-empty">ยังไม่มีรายการในกองนี้</div>';return;}
  el.innerHTML=[...f.tx].reverse().map(t=>txRow(f.id,t)).join('');
}
function delTx(fid,tid){
  const f=state.funds.find(x=>x.id===fid);
  f.tx=f.tx.filter(t=>t.id!==tid);
  _svSave();_svRender();renderHist(f);
  if(document.getElementById('histOverlay').classList.contains('show'))renderHistFull(f);
}
function saveTx(){
  const amt=parseNum(document.getElementById('txAmt').value);
  const note=document.getElementById('txNote').value.trim();
  const dval=window.moGetDate?window.moGetDate('txDate'):document.getElementById('txDate').value;
  const err=document.getElementById('txErr');
  if(amt===null||amt<=0){err.textContent='ใส่จำนวนเงินที่มากกว่า 0';err.style.display='block';return;}
  const f=state.funds.find(x=>x.id===txId);
  if(txType==='out'&&amt>balance(f)){err.textContent='ถอนเกินยอดคงเหลือในกองนี้';err.style.display='block';return;}
  // build timestamp from chosen date + current time (so same-day order is preserved)
  let ts=Date.now();
  if(dval){const now=new Date();const d=new Date(dval+'T00:00:00');d.setHours(now.getHours(),now.getMinutes(),now.getSeconds());ts=d.getTime();}
  f.tx.push({id:uid(),type:txType,amt,note,ts});
  f.tx.sort((a,b)=>a.ts-b.ts);
  _svSave();_svRender();
  document.getElementById('txAmt').value='';
  document.getElementById('txNote').value='';
  err.style.display='none';
  renderHist(f);
  document.getElementById('txTitle').textContent=f.emoji+' '+f.name;
}

/* ---------- budget → savings link (settings-driven) ---------- */
// list of active (non-closed) funds — used to populate budget's link dropdown
function svGetFunds(){
  if(!state.funds)return[];
  return state.funds.filter(f=>!f.closed).map(f=>({
    id:f.id,
    name:f.name,
    emoji:f.emoji,
    owner:f.owner||'',        // '' = กองกลาง (ใช้ร่วมกัน)
    category:f.category||'',
    bal:balance(f)            // ยอดคงเหลือปัจจุบัน — ช่วยแยกกองที่ชื่อซ้ำ
  }));
}
// idempotent deposit tied to a budget row (srcKey). Editing the budget amount
// updates the same tx; setting 0 / removing the link deletes it; changing the
// fund moves it. Only tx created by budget carry a matching `src`.
function svSyncFromBudget(opts){
  opts=opts||{};
  const srcKey=opts.srcKey;
  if(!srcKey||!state.funds)return;
  let changed=false;
  // drop any previous budget-created tx for this source (across all funds)
  state.funds.forEach(f=>{
    const before=f.tx.length;
    f.tx=f.tx.filter(t=>t.src!==srcKey);
    if(f.tx.length!==before)changed=true;
  });
  const amt=Number(opts.amt)||0;
  if(opts.fundId&&amt>0){
    const f=state.funds.find(x=>x.id===opts.fundId);
    if(f){
      let ts=Date.now();
      if(opts.date){const now=new Date();const d=new Date(opts.date+'T00:00:00');d.setHours(now.getHours(),now.getMinutes(),now.getSeconds());ts=d.getTime();}
      f.tx.push({id:uid(),type:'in',amt,note:opts.note||'',ts,src:srcKey});
      f.tx.sort((a,b)=>a.ts-b.ts);
      changed=true;
    }
  }
  if(changed){_svSave();_svRender();}
  return changed;
}

/* ---------- backup / restore ---------- */
function backup(){
  try{
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;
    a.download='กองเงินออม-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){}
}
function openRestore(){
  document.getElementById('restoreText').value='';
  document.getElementById('restoreErr').style.display='none';
  document.getElementById('restoreOverlay').classList.add('show');
}
function applyImport(text){
  const err=document.getElementById('restoreErr');
  try{
    const d=JSON.parse(text);
    if(!d.funds||!Array.isArray(d.funds))throw 0;
    state=d;
    if(!state.people)state.people=[];
    applyTheme('island');
    _svSave();_svRender();
    _svClose('restoreOverlay');
  }catch(e){err.textContent='ข้อมูลไม่ถูกต้อง ตรวจสอบ JSON อีกครั้ง';err.style.display='block';}
}
function restoreFromFile(file){
  const r=new FileReader();
  r.onload=()=>{document.getElementById('restoreText').value=r.result;document.getElementById('restoreErr').style.display='none';};
  r.readAsText(file);
}

/* ---------- utils ---------- */
function _svClose(id){document.getElementById(id).classList.remove('show');}

/* ---------- wire up ---------- */
document.getElementById('btnNew').onclick=()=>openFund();
document.getElementById('fundCancel').onclick=()=>_svClose('fundOverlay');
document.getElementById('fundSave').onclick=saveFund;
document.getElementById('txCancel').onclick=()=>_svClose('txOverlay');
document.getElementById('txSave').onclick=saveTx;
document.getElementById('btnBackup').onclick=backup;
document.getElementById('btnRestore').onclick=openRestore;
document.getElementById('restoreClose').onclick=()=>_svClose('restoreOverlay');
document.getElementById('restoreApply').onclick=()=>applyImport(document.getElementById('restoreText').value);
document.getElementById('restorePick').onclick=()=>document.getElementById('fileInput').click();
document.getElementById('histClose').onclick=()=>_svClose('histOverlay');
document.getElementById('btnSettings').onclick=_svOpenSettings;
document.getElementById('btnAssets').onclick=openAssets;
document.getElementById('assetClose').onclick=()=>_svClose('assetOverlay');
document.getElementById('setClose').onclick=()=>_svClose('setOverlay');
document.getElementById('setAdd').onclick=addPerson;
document.getElementById('setNewName').addEventListener('keydown',e=>{if(e.key==='Enter')addPerson();});
document.getElementById('fileInput').onchange=e=>{if(e.target.files[0])restoreFromFile(e.target.files[0]);e.target.value='';};
document.querySelectorAll('#txSeg button').forEach(b=>b.onclick=()=>{txType=b.dataset.type;setSeg();});
document.querySelectorAll('.overlay').forEach(o=>o.onclick=e=>{if(e.target===o)o.classList.remove('show');});
document.getElementById('fName').addEventListener('keydown',e=>{if(e.key==='Enter')saveFund();});
document.getElementById('txAmt').addEventListener('keydown',e=>{if(e.key==='Enter')saveTx();});

/* --- expose to global scope (inline handlers + cross-module glue) --- */
Object.assign(window, { _svLoad, applyTheme, _svSave, balance, dateStr, shortDate, daysLeft, monthsLabel, monthNet, planMonthly, fundStatus, jarCard, _svRender, setCatFilter, escapeHtml, openFund, buildEmoji, pickEmoji, buildCat, pickCat, fillOwnerSelect, reopenFund, saveFund, openTx, todayISO, openAssets, renderAssets, _svOpenSettings, ownerStats, renderPeople, addPerson, removePerson, setSeg, txRow, renderHist, openHist, renderHistFull, delTx, saveTx, backup, openRestore, applyImport, restoreFromFile, _svClose, svGetFunds, svSyncFromBudget });
