/* App shell — unified backup/restore, nav (showModule), dashboard (loadDash) */
/* ═══════════════════════════════════════════════
   Unified Backup / Restore  (ครอบคลุมทั้ง 3 แอพ)
   ═══════════════════════════════════════════════ */
function unifiedBackup(){
  var d=new Date();
  var payload={
    version:1, created:d.toISOString(),
    note:'Little Home unified backup — mortgage + savings + budget + salary tax',
    budget:{
      months: localStorage.getItem('bp3_months'),
      cfg:    localStorage.getItem('bp3_cfg'),
      theme:  localStorage.getItem('bp3_theme')
    },
    mortgage: localStorage.getItem('mortgage_real_v5'),
    savings:  localStorage.getItem('savings_jars_v1'),
    salary:   localStorage.getItem('salaryTaxPlanner_v2')
  };
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='little_home_'+d.toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function unifiedRestore(file){
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var d=JSON.parse(e.target.result);
      var apps=[];
      if(d.budget){
        if(d.budget.months) localStorage.setItem('bp3_months', d.budget.months);
        if(d.budget.cfg)    localStorage.setItem('bp3_cfg',    d.budget.cfg);
        if(d.budget.theme)  localStorage.setItem('bp3_theme',  d.budget.theme);
        apps.push('งบประมาณ');
      }
      if(d.mortgage){ localStorage.setItem('mortgage_real_v5', d.mortgage); apps.push('ผ่อนบ้าน'); }
      if(d.savings){  localStorage.setItem('savings_jars_v1',  d.savings);  apps.push('กองออม'); }
      if(d.salary){   localStorage.setItem('salaryTaxPlanner_v2', d.salary); apps.push('ภาษีเงินเดือน'); }
      // Reinit all loaded apps
      _moReady=false; _svReady=false; _stReady=false;
      try{ _bpLoad(); }catch(ex){}
      loadDash();
      alert('นำเข้าสำเร็จ ✓\n' + apps.join(' · '));
    }catch(err){ alert('ไฟล์ไม่ถูกต้อง: '+err.message); }
  };
  reader.readAsText(file);
}

var _moReady=false,_svReady=false,_stReady=false;function showModule(n){document.querySelectorAll(".m-app").forEach(function(e){e.style.display="none";});document.getElementById("m-"+n).style.display="block";document.querySelectorAll(".nav-btn").forEach(function(b){b.classList.remove("active");});var _nb=document.getElementById("nav-"+n);if(_nb)_nb.classList.add("active");if(n==="mortgage"){_moReady=true;_moLoad();setTimeout(function(){window.dispatchEvent(new Event("resize"));},80);}if(n==="savings"){_svReady=true;_svLoad();_svRender();setTimeout(function(){window.dispatchEvent(new Event("resize"));},80);}if(n==="salary"){if(!_stReady){_stReady=true;window.stInit();}else{try{if(typeof window.stReloadFromStorage==="function")window.stReloadFromStorage();}catch(e){}}}if(n==="home"){loadDash();}window.scrollTo(0,0);}
function loadDash(){var C=314.159;try{var mo=JSON.parse(localStorage.getItem("mortgage_real_v5")||"null");if(mo&&mo.data&&mo.data.length){var loan=mo.loanAmt||7590000,last=mo.data[mo.data.length-1];var rem=last.balance||0,paid=loan-rem,pct=paid/loan*100;var fb=function(v){return Math.round(v).toLocaleString("th-TH");};document.getElementById("mo-pct").textContent=pct.toFixed(1)+"%";var rf=document.getElementById("mo-ring");rf.style.strokeDasharray=C.toFixed(2);rf.style.strokeDashoffset=(C*(1-pct/100)).toFixed(2);document.getElementById("mo-rem").textContent=fb(rem)+" ฿";document.getElementById("mo-paid").textContent=fb(paid)+" ฿";}else{document.getElementById("mo-pct").textContent="ยังไม่มีข้อมูล";}}catch(e){console.error(e);}try{var sv=JSON.parse(localStorage.getItem("savings_jars_v1")||"null");if(sv&&sv.funds&&sv.funds.length){var act=sv.funds.filter(function(f){return!f.closed;});var tot=act.reduce(function(s,f){return s+(f.tx||[]).reduce(function(a,t){return a+(t.type==="in"?t.amt:-t.amt);},0);},0);var ts=[];sv.funds.forEach(function(f){(f.tx||[]).forEach(function(t){ts.push(t.ts||0);});});var ld=ts.length?new Date(Math.max.apply(null,ts)).toLocaleDateString("th-TH",{day:"numeric",month:"short"}):"-";document.getElementById("sv-total").textContent=Math.round(tot).toLocaleString("th-TH")+" ฿";document.getElementById("sv-funds").textContent=act.length+" กอง";document.getElementById("sv-last").textContent=ld;}else{document.getElementById("sv-total").textContent="ยังไม่มีข้อมูล";}}catch(e){console.error(e);}try{var bp=JSON.parse(localStorage.getItem("bp3_months")||"null");var d=new Date();var mkey=d.getFullYear()+"-"+String(d.getMonth()).padStart(2,"0");var mnames=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];document.getElementById("bp-month").textContent=mnames[d.getMonth()]+" "+(d.getFullYear()+543);if(bp&&bp[mkey]){var mon=bp[mkey];var nExp=0;try{["p1","p2"].forEach(function(p){if(mon.expenses&&mon.expenses[p]){nExp+=Object.keys(mon.expenses[p].fixed||{}).length;nExp+=(mon.expenses[p].extras||[]).length;}});}catch(ex){}document.getElementById("bp-status").textContent="มีข้อมูลแล้ว ✓";document.getElementById("bp-status").className="chip-val green";document.getElementById("bp-count").textContent=nExp+" รายการ";}else{document.getElementById("bp-status").textContent="ยังไม่มีข้อมูล";document.getElementById("bp-count").textContent="-";}}catch(e){console.error(e);}
try{
  var stFmt2=function(v){return Math.round(v).toLocaleString("th-TH");};
  var stSum=typeof window.stGetHomeSummary==="function"?window.stGetHomeSummary():null;
  if(!stSum){
    // fallback: read localStorage directly
    var stRaw=JSON.parse(localStorage.getItem("salaryTaxPlanner_v2")||"null");
    if(stRaw&&stRaw.people&&stRaw.people.length){
      var _TI=0,_TT=0,_TW=0;
      stRaw.people.forEach(function(p){
        var inc=(p.income||[]);
        var income=inc.reduce(function(s,m){return s+(+m.salary||0)+(+m.ot||0)+(+m.bonus||0);},0);
        var tSSO=inc.reduce(function(s,m){return s+(+m.sso||0);},0);
        var pvdC=inc.reduce(function(s,m){return s+(+m.salary||0)*(+m.pvdPct||0)/100;},0);
        var tWHT=inc.reduce(function(s,m){return s+(+m.wht||0);},0);
        var exp=Math.min(income*.5,100000);
        var d=p.ded||{},g=function(k){return +d[k]||0;};
        var sso=Math.min(tSSO,9000),pvdD=Math.min(pvdC,income*.15,500000);
        var fix=60000+(g("dSpouse")>0?60000:0)+g("dChild")*30000+g("dChild2")*30000
          +Math.min(g("dParent"),4)*30000+Math.min(g("dMaternity"),60000)+sso
          +Math.min(g("dLife")+Math.min(g("dHealth"),25000),100000)+Math.min(g("dParentHealth"),15000)
          +Math.min(Math.min(g("dRMF"),income*.3)+Math.min(g("dPension"),income*.15,200000)+pvdD,500000)
          +Math.min(g("dESG"),income*.3,300000)+Math.min(g("dHome"),100000)+Math.min(g("dEreceipt"),50000);
        var base=Math.max(0,income-exp-fix);
        var donate=Math.min(g("dDonate")+g("dDonateEdu")*2,base*.10);
        var net=Math.max(0,income-exp-fix-donate);
        var tax=0;[[0,150000,0],[150000,300000,.05],[300000,500000,.10],[500000,750000,.15],[750000,1000000,.20],[1000000,2000000,.25],[2000000,5000000,.30],[5000000,1e9,.35]].forEach(function(b){if(net>b[0])tax+=(Math.min(net,b[1])-b[0])*b[2];});
        _TI+=income;_TT+=tax;_TW+=tWHT;
      });
      stSum={totIncome:_TI,totTax:_TT,diff:_TW-_TT};
    }
  }
  if(stSum){
    var diff2=stSum.diff,diffEl=document.getElementById("st-home-diff");
    document.getElementById("st-home-tax").textContent=stFmt2(stSum.totTax)+" ฿";
    document.getElementById("st-home-income").textContent=stFmt2(stSum.totIncome)+" ฿";
    if(diffEl){diffEl.textContent=(diff2>=0?"+":"")+stFmt2(diff2)+" ฿";diffEl.className="chip-val "+(diff2>=0?"green":"");diffEl.style.color=diff2>=0?"":"#B85040";}
  }else{document.getElementById("st-home-tax").textContent="ยังไม่มีข้อมูล";}
}catch(e){console.error(e);}}
loadDash();

/* --- expose to global scope (inline handlers + cross-module glue) --- */
Object.assign(window, { unifiedBackup, unifiedRestore, showModule, loadDash });
