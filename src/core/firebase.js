/* Firebase — auth + Firestore real-time sync */
/* ═══════════════════════════════════════════════════════════════════
   🐹 Firebase Integration — Auth + Firestore real-time sync
   ═══════════════════════════════════════════════════════════════════ */
import { SYNC_KEYS } from '../modules/registry.js';
import { applyRemote } from './app.js';

var FB_CFG_KEY  = 'fb_config_v1';
var FB_HH_KEY   = 'fb_household_id';

var _fbAuth=null, _fbDb=null, _fbUser=null, _fbUnsub=null, _fbTimer=null;
var _fbSyncing = false;
var _fbDirty = {};   // keys changed locally, waiting to be pushed (upload only these — same doc, merge)
// keys แก้ในเครื่องแต่ cloud ยังไม่ยืนยัน → เก็บลง localStorage (sync, รอดแม้ Safari iOS ฆ่าแท็บกลางทาง)
// key → เลข version; ลบออกเมื่อ write ของ version นั้นสำเร็จ. ระหว่างนี้ห้ามเอาข้อมูล cloud มาทับ
var FB_PENDING_KEY = 'fb_pending_v1';
var _fbPending = {};
var _fbReady = false;   // true หลังดึง cloud รอบแรกเสร็จ — ก่อนหน้านั้น (ตอนบูต/ยังไม่ล็อกอิน) ไม่นับเป็น pending
try{ _fbPending = JSON.parse(localStorage.getItem(FB_PENDING_KEY)||'{}')||{}; }catch(e){ _fbPending = {}; }
function _fbSavePending(){ try{ _origLS(FB_PENDING_KEY, JSON.stringify(_fbPending)); }catch(e){} }
var _fbBusyAt = 0;   // when "กำลังบันทึก..." first shown → keep visible ≥500ms
var _fbFlushScheduled = false;

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
  _fbReady=false;
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
    // key ที่ยังส่งไม่สำเร็จ (เช่น ปิดแอปก่อนส่งเสร็จ) → ไม่เอาข้อมูล cloud ที่เก่ากว่ามาทับ แล้วส่งขึ้นใหม่
    if(snap.exists){ var d=snap.data(); _fbSyncing=true; SYNC_KEYS.forEach(function(k){ if(d[k]&&!_fbPending[k]) _origLS(k,d[k]); }); _fbSyncing=false; }
    Object.keys(_fbPending).forEach(function(k){ if(SYNC_KEYS.indexOf(k)!==-1) _fbDirty[k]=true; });
    _fbReady=true;
    fbInitAllApps();
    fbSetSync('ok','ซิงค์แล้ว');
    fbSaveToCloud();
    _fbUnsub = fbDocRef().onSnapshot(function(snap){
      if(!snap.exists||snap.metadata.hasPendingWrites) return;
      var d=snap.data(); var chg=false;
      _fbSyncing=true;
      SYNC_KEYS.forEach(function(k){ if(d[k]&&!_fbPending[k]&&!_fbDirty[k]&&d[k]!==localStorage.getItem(k)){ _origLS(k,d[k]); chg=true; } });
      _fbSyncing=false;
      if(chg){ fbSetSync('ok','ซิงค์แล้ว'); fbRefreshApps(); }
    }, function(){ fbSetSync('err','ออฟไลน์'); });
  }).catch(function(){ _fbReady=true; fbSetSync('err','โหลดไม่ได้'); fbInitAllApps(); });   // ออฟไลน์: สิ่งที่แก้ต่อจากนี้ยังนับ pending → ไม่หายตอนออนไลน์
}

function fbSaveToCloud(){
  if(!_fbUser) return;
  var keys=Object.keys(_fbDirty);
  if(!keys.length) return;          // nothing changed → skip write
  _fbDirty={};                      // claim these; re-mark on failure
  // same single doc as before — write ONLY changed fields (merge keeps the rest intact)
  var p={updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:_fbUser.displayName||_fbUser.email};
  keys.forEach(function(k){ p[k]=localStorage.getItem(k)||''; });
  var sent={}; keys.forEach(function(k){ sent[k]=_fbPending[k]; });
  fbDocRef().set(p,{merge:true})
    .then(function(){
      // ยืนยันแล้ว → ปลด pending (ถ้าระหว่างนั้นแก้ต่อ version จะเปลี่ยน → คงไว้รอรอบถัดไป)
      keys.forEach(function(k){ if(_fbPending[k]===sent[k]) delete _fbPending[k]; });
      _fbSavePending();
      // keep "กำลังบันทึก..." visible long enough to notice, even when the write is instant
      var wait=Math.max(0,500-(Date.now()-_fbBusyAt));
      setTimeout(function(){ fbSetSync('ok','ซิงค์แล้ว'); },wait);
    })
    .catch(function(){ fbSetSync('err','บันทึกไม่สำเร็จ'); keys.forEach(function(k){_fbDirty[k]=true;}); });
}

function fbDebounce(){
  // sync ทันที: โชว์สถานะทันทีที่แก้ แล้ว flush ตอนจบ microtask
  // (รวม setItem หลายครั้งในจังหวะเดียว เช่น bp3_months+bp3_cfg → commit ครั้งเดียว)
  if(_fbUser){ _fbBusyAt=Date.now(); fbSetSync('busy','กำลังบันทึก...'); }
  if(_fbFlushScheduled) return;
  _fbFlushScheduled=true;
  Promise.resolve().then(function(){ _fbFlushScheduled=false; fbSaveToCloud(); });
}

/* ── Intercept localStorage writes → trigger cloud save ────────── */
var _origLS = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value){
  _origLS(key, value);
  if(!_fbSyncing && SYNC_KEYS.indexOf(key) !== -1){
    _fbDirty[key]=true;
    if(_fbReady){ _fbPending[key]=(_fbPending[key]||0)+1; _fbSavePending(); }
    fbDebounce();
  }
};

// flush ก่อนออกจากหน้า — Safari iOS แทบไม่ยิง beforeunload (สลับแอป/ล็อกจอ/ปัดทิ้ง)
// จึงต้องฟัง pagehide + visibilitychange ด้วย. ช่องที่กำลังพิมพ์อยู่: ยิง change + blur เอง
// ให้ handler onchange/onblur ของช่องนั้นบันทึกค่าลง localStorage — a.blur() อย่างเดียวไม่พอ
// เพราะตอนหน้าเสีย focus (สลับแอป) เบราว์เซอร์ไม่ยิง blur event ให้ (handler ต่างๆ idempotent ยิงซ้ำได้)
function _fbFlushOnLeave(){
  try{
    var a=document.activeElement;
    if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')){
      a.dispatchEvent(new Event('change',{bubbles:true}));
      a.dispatchEvent(new FocusEvent('blur'));
      a.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));
      a.blur();
    }
  }catch(e){}
  try{ window.dispatchEvent(new Event('lh:flush')); }catch(e){}   // ให้โมดูลที่ debounce ไว้ เขียนทันที
  if(_fbUser && Object.keys(_fbDirty).length) fbSaveToCloud();
}
window.addEventListener('beforeunload', _fbFlushOnLeave);
window.addEventListener('pagehide', _fbFlushOnLeave);
document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden') _fbFlushOnLeave(); });

function fbApplyRemote(){ applyRemote(); }
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
