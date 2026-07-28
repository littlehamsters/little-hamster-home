/* Firebase — auth + Firestore real-time sync */
/* ═══════════════════════════════════════════════════════════════════
   🐹 Firebase Integration — Auth + Firestore real-time sync
   ═══════════════════════════════════════════════════════════════════ */
var FB_CFG_KEY  = 'fb_config_v1';
var FB_HH_KEY   = 'fb_household_id';
var SYNC_KEYS   = ['bp3_months','bp3_cfg','bp3_theme','mortgage_real_v5','savings_jars_v1','salaryTaxPlanner_v2'];

var _fbAuth=null, _fbDb=null, _fbUser=null, _fbUnsub=null, _fbTimer=null;
var _fbIgnoreNext = false;
var _fbSyncing = false;

/* ── Boot ──────────────────────────────────────────────────────── */
(function fbBoot(){
  /* ── Hardcoded Firebase config ── */
  var HARDCODED = {
    apiKey: "AIzaSyDWizMn4IuIGASA3iIzSSPXId91ESVnlXE",
    authDomain: "littlehamsterhome-52314.firebaseapp.com",
    projectId: "littlehamsterhome-52314",
    storageBucket: "littlehamsterhome-52314.firebasestorage.app",
    messagingSenderId: "160888329707",
    appId: "1:160888329707:web:92190931bf9951f390f5ae"
  };
  localStorage.setItem(FB_CFG_KEY, JSON.stringify(HARDCODED));
  fbInit(HARDCODED);
})();

function fbInit(cfg){
  try{
    var app = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(cfg);
    _fbAuth = firebase.auth(app);
    _fbDb   = firebase.firestore(app);
    _fbDb.enablePersistence({synchronizeTabs:true}).catch(function(){});
    _fbAuth.onAuthStateChanged(function(user){
      if(user){ _fbUser=user; document.getElementById('fb-screen').style.display='none'; fbShowUser(user); fbStartSync(); }
      else { _fbUser=null; document.getElementById('fb-screen').style.display='flex'; fbHideUser(); }
    });
    document.getElementById('fb-signin-btn').disabled = false;
  } catch(e){ fbShowErr('Config ผิดพลาด: '+e.message); }
}

function fbApplyConfig(){
  var raw = document.getElementById('fb-cfg-ta').value.trim();
  try{
    var cfg = JSON.parse(raw);
    if(!cfg.apiKey) throw new Error('ไม่พบ apiKey');
    localStorage.setItem(FB_CFG_KEY, JSON.stringify(cfg));
    location.reload();
  } catch(e){ fbShowErr('Config ไม่ถูกต้อง: '+e.message); }
}

function fbSignIn(){
  if(!_fbAuth){ fbShowErr('กรุณาตั้งค่า Config ก่อน'); return; }
  document.getElementById('fb-signin-btn').disabled = true;
  var p = new firebase.auth.GoogleAuthProvider();
  _fbAuth.signInWithPopup(p).catch(function(e){
    fbShowErr(e.message);
    document.getElementById('fb-signin-btn').disabled = false;
  });
}
function fbSignOut(){
  if(_fbUnsub){ _fbUnsub(); _fbUnsub=null; }
  if(_fbAuth) _fbAuth.signOut();
}

var FIXED_HOUSEHOLD_ID = 'littlehome_foam_keng_2024';

function fbDocRef(){
  localStorage.setItem(FB_HH_KEY, FIXED_HOUSEHOLD_ID);
  return _fbDb.collection('households').doc(FIXED_HOUSEHOLD_ID);
}

function fbStartSync(){
  fbSetSync('busy','กำลังโหลด...');
  fbDocRef().get().then(function(snap){
    if(snap.exists){ var d=snap.data(); _fbSyncing=true; SYNC_KEYS.forEach(function(k){ if(d[k]) _origLS(k,d[k]); }); _fbSyncing=false; }
    fbInitAllApps();
    fbSetSync('ok','ซิงค์แล้ว');
    _fbUnsub = fbDocRef().onSnapshot(function(snap){
      if(!snap.exists||snap.metadata.hasPendingWrites||_fbIgnoreNext) return;
      var d=snap.data(); var chg=false;
      _fbSyncing=true;
      SYNC_KEYS.forEach(function(k){ if(d[k]&&d[k]!==localStorage.getItem(k)){ _origLS(k,d[k]); chg=true; } });
      _fbSyncing=false;
      if(chg){ fbSetSync('ok','ซิงค์แล้ว'); fbRefreshApps(); }
    }, function(){ fbSetSync('err','ออฟไลน์'); });
  }).catch(function(){ fbSetSync('err','โหลดไม่ได้'); fbInitAllApps(); });
}

function fbSaveToCloud(){
  if(!_fbUser) return;
  fbSetSync('busy','กำลังบันทึก...');
  var p={updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:_fbUser.displayName||_fbUser.email};
  SYNC_KEYS.forEach(function(k){ p[k]=localStorage.getItem(k)||''; });
  _fbIgnoreNext=true;
  fbDocRef().set(p,{merge:true})
    .then(function(){ fbSetSync('ok','ซิงค์แล้ว'); setTimeout(function(){_fbIgnoreNext=false;},2000); })
    .catch(function(){ fbSetSync('err','บันทึกไม่สำเร็จ'); _fbIgnoreNext=false; });
}

function fbDebounce(){
  if(_fbTimer) clearTimeout(_fbTimer);
  _fbTimer = setTimeout(fbSaveToCloud, 300);
}

/* ── Intercept localStorage writes → trigger cloud save ────────── */
var _origLS = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value){
  _origLS(key, value);
  if(!_fbSyncing && SYNC_KEYS.indexOf(key) !== -1) fbDebounce();
};

function fbApplyRemote(){
  try{ _bpLoad(); _bpRender(); }catch(e){}
  try{ _svLoad(); _svRender(); }catch(e){}
  _moReady=false; _svReady=false; _stReady=false;
  // salary: reload from storage if already initialised
  try{ if(typeof window.stReloadFromStorage==='function') window.stReloadFromStorage(); }catch(e){}
  loadDash();
}
function fbInitAllApps(){ fbApplyRemote(); }
function fbRefreshApps(){ fbApplyRemote(); }

function fbShowHousehold(){
  var id=localStorage.getItem(FB_HH_KEY)||(_fbUser?_fbUser.uid:'—');
  alert('Household ID:\n'+id+'\n\nแชร์ ID นี้ให้สมาชิกในบ้าน');
}
function fbJoinHousehold(){
  var id=prompt('กรอก Household ID:'); if(!id||!id.trim()) return;
  localStorage.setItem(FB_HH_KEY,id.trim());
  if(_fbUnsub){_fbUnsub();_fbUnsub=null;} fbStartSync();
  alert('เข้าร่วม Household สำเร็จ!');
}

function fbShowUser(u){
  var chip=document.getElementById('fb-chip'),av=document.getElementById('fb-av'),nm=document.getElementById('fb-name');
  if(chip) chip.style.display='flex';
  if(av&&u.photoURL) av.src=u.photoURL; else if(av) av.style.display='none';
  if(nm) nm.textContent=u.displayName?u.displayName.split(' ')[0]:u.email.split('@')[0];
  var lo=document.getElementById('fb-logout'); if(lo) lo.style.display='flex';
  var sy=document.getElementById('fb-sync');   if(sy) sy.style.display='flex';
}
function fbHideUser(){
  ['fb-chip','fb-logout','fb-sync'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='none';});
}
function fbSetSync(s,txt){
  var d=document.getElementById('fb-dot'),l=document.getElementById('fb-sync-txt');
  if(d) d.className='fb-dot '+s; if(l) l.textContent=txt;
}
function fbShowErr(msg){ var e=document.getElementById('fb-err'); if(e) e.textContent=msg; }

/* --- expose to global scope (inline handlers + cross-module glue) --- */
Object.assign(window, { fbInit, fbApplyConfig, fbSignIn, fbSignOut, fbDocRef, fbStartSync, fbSaveToCloud, fbDebounce, fbApplyRemote, fbInitAllApps, fbRefreshApps, fbShowHousehold, fbJoinHousehold, fbShowUser, fbHideUser, fbSetSync, fbShowErr });
