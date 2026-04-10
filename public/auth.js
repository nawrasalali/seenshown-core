/* ═══════════════════════════════════════════════
   SEENSHOWN AUTH + ECONOMY SYSTEM
   Supabase Auth, simulation limits, points economy
═══════════════════════════════════════════════ */

var SB='https://jnvdpmmxlbkxwanqqhfw.supabase.co';
var SBK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudmRwbW14bGJreHdhbnFxaGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzc2MzgsImV4cCI6MjA5MTA1MzYzOH0.QBD3_YiDvJXvO12gE6FR1GthUd1SvC0MmOmVoPaU71M';

/* ── CURRENT USER STATE ── */
window.SS={
  user:null,        /* Supabase user object */
  profile:null,     /* profiles row */
  session:null,     /* Supabase session */
  simsCreated:0,    /* total sims created this session/db */
  weeklySimsUsed:0, /* sims used this week (free users) */
  points:0,
  tier:'free',      /* free | scholar | studio | institutional */
  isSubscriber:false,
  weeklyResetDate:null
};

var FREE_SIM_LIMIT=5;
var FREE_WEEKLY_LIMIT=5;
var FREE_WEEKS=4;

/* ── INIT AUTH ── */
async function initAuth(){
  /* Check existing session */
  try{
    var r=await sbFetch('/auth/v1/session',{},'GET');
    if(r&&r.user){
      SS.user=r.user;SS.session=r;
      await loadProfile();
      updateAuthUI();
    }
  }catch(e){}
}

async function sbFetch(path,body,method){
  var opts={method:method||'POST',headers:{'apikey':SBK,'Content-Type':'application/json'}};
  if(SS.session&&SS.session.access_token)opts.headers['Authorization']='Bearer '+SS.session.access_token;
  else opts.headers['Authorization']='Bearer '+SBK;
  if(body&&method!=='GET')opts.body=JSON.stringify(body);
  var r=await fetch(SB+path,opts);
  return r.json();
}

async function loadProfile(){
  if(!SS.user)return;
  try{
    var r=await fetch(SB+'/rest/v1/profiles?user_id=eq.'+SS.user.id+'&limit=1',
      {headers:{'apikey':SBK,'Authorization':'Bearer '+SBK}});
    var data=await r.json();
    if(data&&data[0]){
      SS.profile=data[0];
      SS.points=data[0].points||0;
      SS.tier=data[0].tier||'free';
      SS.isSubscriber=(SS.tier!=='free');
      SS.simsCreated=data[0].sims_created||0;
      SS.weeklySimsUsed=data[0].weekly_sims_used||0;
      SS.weeklyResetDate=data[0].weekly_reset_date;
    }
  }catch(e){}
}

/* ── CAN CREATE SIM? ── */
function canCreateSim(){
  if(SS.isSubscriber)return{ok:true};
  /* Free tier logic */
  if(SS.simsCreated<FREE_SIM_LIMIT)return{ok:true};
  /* Check weekly allowance */
  var weekNum=getWeekNumber();
  var weeksSinceFirst=SS.weeklyResetDate?Math.floor((Date.now()-new Date(SS.weeklyResetDate).getTime())/(7*86400000)):0;
  if(weeksSinceFirst<FREE_WEEKS&&SS.weeklySimsUsed<FREE_WEEKLY_LIMIT)return{ok:true,weekly:true};
  return{ok:false,reason:weeksSinceFirst>=FREE_WEEKS?'weeks_expired':'limit'};
}
function getWeekNumber(){return Math.floor(Date.now()/(7*86400000));}

/* ── INCREMENT SIM COUNT ── */
async function recordSimCreated(){
  SS.simsCreated++;
  if(!SS.user)return; /* anonymous — track in localStorage */
  try{
    var body=SS.isSubscriber
      ?{sims_created:SS.simsCreated}
      :{sims_created:SS.simsCreated,weekly_sims_used:(SS.weeklySimsUsed||0)+1};
    await fetch(SB+'/rest/v1/profiles?user_id=eq.'+SS.user.id,{
      method:'PATCH',
      headers:{'apikey':SBK,'Authorization':'Bearer '+SBK,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
  }catch(e){}
}

/* ── AUTH UI ── */
function updateAuthUI(){
  var btn=document.getElementById('authNavBtn');
  if(!btn)return;
  if(SS.user){
    btn.textContent=SS.user.email.split('@')[0].slice(0,10);
    btn.style.background='rgba(38,232,176,0.12)';
    btn.style.color='var(--g)';
    btn.style.borderColor='rgba(38,232,176,0.3)';
  } else {
    btn.textContent='Sign in';
    btn.style.background='';
    btn.style.color='';
    btn.style.borderColor='';
  }
}

/* ── SIGN IN / UP MODAL ── */
function showAuthModal(reason){
  var el=document.getElementById('authModal');
  if(!el)return;
  document.getElementById('authReason').textContent=reason||'Sign in to save and share your simulations';
  el.style.display='flex';
  document.getElementById('authEmail').focus();
}
function hideAuthModal(){document.getElementById('authModal').style.display='none';}

async function submitAuth(){
  var email=(document.getElementById('authEmail').value||'').trim();
  if(!email||!email.includes('@')){showAuthMsg('Enter a valid email address','red');return;}
  var btn=document.getElementById('authSubmitBtn');
  btn.textContent='Sending…';btn.disabled=true;
  try{
    var r=await sbFetch('/auth/v1/otp',{email:email,create_user:true});
    if(r.error){showAuthMsg(r.error.message||'Error','red');}
    else{showAuthMsg('✅ Check your email for a sign-in link','green');btn.textContent='Link sent';}
  }catch(e){showAuthMsg('Could not send — try again','red');}
  btn.disabled=false;
}

function showAuthMsg(msg,color){
  var el=document.getElementById('authMsg');
  el.textContent=msg;
  el.style.color=color==='red'?'var(--red)':'var(--g)';
}

/* ── SIGN OUT ── */
async function signOut(){
  try{await sbFetch('/auth/v1/logout',{},'POST');}catch(e){}
  SS.user=null;SS.session=null;SS.profile=null;SS.isSubscriber=false;
  updateAuthUI();
  showToastGlobal('Signed out');
}

/* ── POINTS: DEDUCT FOR VOTE ── */
async function deductVotePoint(){
  if(!SS.isSubscriber)return false;
  if(SS.points<1){showToastGlobal('Not enough points — buy more to vote');return false;}
  SS.points--;
  updatePointsDisplay();
  if(SS.user){
    fetch(SB+'/rest/v1/profiles?user_id=eq.'+SS.user.id,{
      method:'PATCH',
      headers:{'apikey':SBK,'Authorization':'Bearer '+SBK,'Content-Type':'application/json'},
      body:JSON.stringify({points:SS.points})
    }).catch(function(){});
  }
  return true;
}

/* ── POINTS: CREDIT WINNER ── */
async function creditWinnerPoints(simId,amount){
  /* 20% of votes go to winner — credited by server via Edge Function */
  fetch(SB+'/functions/v1/credit-winner',{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SBK},
    body:JSON.stringify({sim_id:simId,points:amount})
  }).catch(function(){});
}

function updatePointsDisplay(){
  var el=document.getElementById('pointsCount');
  if(el)el.textContent=SS.points+' pts';
  var ep=document.getElementById('earnPts');
  if(ep)ep.textContent=SS.points+' pts = $'+(SS.points*.10).toFixed(2);
}

function showToastGlobal(msg){
  var t=document.getElementById('ptToast');
  if(!t)return;
  t.textContent=msg;t.style.opacity='1';
  setTimeout(function(){t.style.opacity='0';},2800);
}

/* EXPORT */
window.SS_AUTH={
  init:initAuth,
  canCreate:canCreateSim,
  recordCreated:recordSimCreated,
  deductVote:deductVotePoint,
  showAuth:showAuthModal,
  hideAuth:hideAuthModal,
  signOut:signOut,
  updateUI:updateAuthUI
};
