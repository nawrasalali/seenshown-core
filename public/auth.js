/* ═══════════════════════════════════════════════
   SEENSHOWN AUTH — Google, Apple, Magic Link
   TikTok-style: sign in once, stay signed in forever
   Supabase Auth + Economy System
═══════════════════════════════════════════════ */

var SB='https://jnvdpmmxlbkxwanqqhfw.supabase.co';
var SBK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudmRwbW14bGJreHdhbnFxaGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzc2MzgsImV4cCI6MjA5MTA1MzYzOH0.QBD3_YiDvJXvO12gE6FR1GthUd1SvC0MmOmVoPaU71M';

/* ── USER STATE ── */
window.SS={
  user:null,session:null,profile:null,
  simsCreated:0,weeklySimsUsed:0,
  points:0,tier:'free',isSubscriber:false,weeklyResetDate:null
};

var FREE_SIM_LIMIT=5;
var FREE_WEEKLY_LIMIT=5;
var FREE_WEEKS=4;

/* ── SUPABASE FETCH HELPER ── */
async function sbFetch(path,body,method){
  var opts={method:method||'POST',headers:{'apikey':SBK,'Content-Type':'application/json'}};
  if(SS.session&&SS.session.access_token)
    opts.headers['Authorization']='Bearer '+SS.session.access_token;
  else opts.headers['Authorization']='Bearer '+SBK;
  if(body&&method!=='GET')opts.body=JSON.stringify(body);
  var r=await fetch(SB+path,opts);
  return r.json();
}

/* ── INIT — check persisted session (TikTok-style: stay logged in) ── */
async function initAuth(){
  /* Check localStorage for persisted session */
  try{
    var stored=localStorage.getItem('ss_session');
    if(stored){
      var s=JSON.parse(stored);
      if(s&&s.access_token&&s.expires_at&&Date.now()/1000<s.expires_at-60){
        SS.session=s;SS.user=s.user;
        updateAuthUI();
        await loadProfile();
        return;
      }
    }
    /* Try to refresh */
    var r=await sbFetch('/auth/v1/token?grant_type=refresh_token',
      {refresh_token:(JSON.parse(stored||'{}')).refresh_token});
    if(r&&r.access_token){
      SS.session=r;SS.user=r.user;
      localStorage.setItem('ss_session',JSON.stringify(r));
      updateAuthUI();
      await loadProfile();
    }
  }catch(e){}
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

function canCreateSim(){
  if(SS.isSubscriber)return{ok:true};
  if(SS.simsCreated<FREE_SIM_LIMIT)return{ok:true};
  var weeksSinceFirst=SS.weeklyResetDate?
    Math.floor((Date.now()-new Date(SS.weeklyResetDate).getTime())/(7*86400000)):0;
  if(weeksSinceFirst<FREE_WEEKS&&SS.weeklySimsUsed<FREE_WEEKLY_LIMIT)return{ok:true,weekly:true};
  return{ok:false,reason:weeksSinceFirst>=FREE_WEEKS?'weeks_expired':'limit'};
}
function getWeekNumber(){return Math.floor(Date.now()/(7*86400000));}

async function recordSimCreated(){
  SS.simsCreated++;
  if(!SS.user)return;
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
    var name=SS.user.user_metadata&&SS.user.user_metadata.full_name
      ?SS.user.user_metadata.full_name.split(' ')[0]
      :SS.user.email.split('@')[0];
    btn.textContent=name.slice(0,12);
    btn.style.color='var(--g)';
    btn.style.borderColor='rgba(38,232,176,0.4)';
  } else {
    btn.textContent='Sign in';
    btn.style.color='';
    btn.style.borderColor='';
  }
}

/* ── SHOW AUTH MODAL ── */
function showAuthModal(reason){
  var modal=document.getElementById('authModal');
  if(modal){
    document.getElementById('authReason').textContent=reason||'Join SeenShown';
    modal.style.display='flex';
    setTimeout(function(){document.getElementById('authEmail').focus();},100);
  }
}

/* ── GOOGLE OAUTH ── */
async function signInWithGoogle(){
  var r=await sbFetch('/auth/v1/authorize',null,'GET'+(
    '?provider=google&redirect_to='+encodeURIComponent(window.location.origin+'/auth-callback.html')
  ));
  /* Supabase returns a URL to redirect to */
  try{
    var data=await fetch(SB+'/auth/v1/authorize?provider=google&redirect_to='+
      encodeURIComponent(window.location.origin+'/auth-callback.html'),
      {method:'GET',headers:{'apikey':SBK}});
    if(data.url||data.redirectedUrl){
      window.location.href=data.url||data.redirectedUrl;
    } else {
      /* Direct redirect */
      window.location.href=SB+'/auth/v1/authorize?provider=google&redirect_to='+
        encodeURIComponent(window.location.origin+'/auth-callback.html');
    }
  }catch(e){
    window.location.href=SB+'/auth/v1/authorize?provider=google&redirect_to='+
      encodeURIComponent(window.location.origin+'/auth-callback.html');
  }
}

/* ── APPLE OAUTH ── */
function signInWithApple(){
  window.location.href=SB+'/auth/v1/authorize?provider=apple&redirect_to='+
    encodeURIComponent(window.location.origin+'/auth-callback.html');
}

/* ── MAGIC LINK (email) ── */
async function submitAuth(){
  var email=(document.getElementById('authEmail').value||'').trim();
  if(!email||!email.includes('@')){showAuthMsg('Enter a valid email address','red');return;}
  var btn=document.getElementById('authSubmitBtn');
  btn.textContent='Sending…';btn.disabled=true;
  try{
    var r=await sbFetch('/auth/v1/otp',{email:email,create_user:true});
    if(r.error){showAuthMsg(r.error.message||'Error','red');}
    else{showAuthMsg('✅ Check your email — tap the link to sign in','green');btn.textContent='Link sent!';}
  }catch(e){showAuthMsg('Could not send — try again','red');}
  btn.disabled=false;
}

function showAuthMsg(msg,color){
  var el=document.getElementById('authMsg');
  if(el){el.textContent=msg;el.style.color=color==='red'?'var(--red)':'var(--g)';}
}

/* ── SIGN OUT ── */
async function signOut(){
  localStorage.removeItem('ss_session');
  try{await sbFetch('/auth/v1/logout',{});}catch(e){}
  SS.user=null;SS.session=null;SS.profile=null;
  updateAuthUI();
  if(typeof showToast==='function')showToast('Signed out');
}

/* ── PROFILE MENU ── */
function showProfileMenu(){
  var name=SS.user.user_metadata&&SS.user.user_metadata.full_name
    ?SS.user.user_metadata.full_name
    :SS.user.email;
  if(typeof showToast==='function'){
    showToast('👤 '+name+' · '+SS.tier+' · '+SS.points+' pts');
  }
}

/* ── HANDLE AUTH CALLBACK (called from auth-callback.html) ── */
function handleAuthCallback(access_token,refresh_token,user){
  var session={access_token,refresh_token,user,expires_at:Date.now()/1000+3600};
  SS.session=session;SS.user=user;
  localStorage.setItem('ss_session',JSON.stringify(session));
  updateAuthUI();
  loadProfile();
  if(typeof showToast==='function')showToast('Welcome to SeenShown! ✅');
}

/* ── ECONOMY ── */
async function addPoints(pts){
  SS.points+=pts;
  var el=document.getElementById('pointsCount');
  if(el)el.textContent=SS.points+' pts';
  if(!SS.user)return;
  try{
    await fetch(SB+'/rest/v1/profiles?user_id=eq.'+SS.user.id,{
      method:'PATCH',
      headers:{'apikey':SBK,'Authorization':'Bearer '+SBK,'Content-Type':'application/json'},
      body:JSON.stringify({points:SS.points})
    });
  }catch(e){}
}

/* ── EXPOSE ── */
window.SS_AUTH={
  init:initAuth,
  showAuth:showAuthModal,
  signOut:signOut,
  showProfile:showProfileMenu,
  recordCreated:recordSimCreated,
  addPoints:addPoints,
  signInWithGoogle:signInWithGoogle,
  signInWithApple:signInWithApple,
  submitAuth:submitAuth
};
