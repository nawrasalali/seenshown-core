/* ═══════════════════════════════════════════════
   SEENSHOWN AUTH v3
   - Google OAuth (Supabase redirect)
   - Apple OAuth (Supabase redirect)  
   - Magic link (email OTP)
   - TikTok-style persistence (sign in once, stay in)
   No Railway. Supabase only.
═══════════════════════════════════════════════ */

var SB = 'https://jnvdpmmxlbkxwanqqhfw.supabase.co';
var SBK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudmRwbW14bGJreHdhbnFxaGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzc2MzgsImV4cCI6MjA5MTA1MzYzOH0.QBD3_YiDvJXvO12gE6FR1GthUd1SvC0MmOmVoPaU71M';
var REDIRECT = window.location.origin + '/auth-callback.html';

/* ── USER STATE ── */
window.SS = {
  user: null, session: null, profile: null,
  simsCreated: 0, weeklySimsUsed: 0,
  points: 0, tier: 'free', isSubscriber: false
};

/* ── INIT — restore session from localStorage (TikTok-style) ── */
async function initAuth() {
  try {
    var stored = localStorage.getItem('ss_session');
    if (!stored) return;
    var s = JSON.parse(stored);
    if (!s || !s.access_token) return;
    /* Check not expired */
    if (s.expires_at && Date.now() / 1000 > s.expires_at - 60) {
      /* Try refresh */
      if (s.refresh_token) {
        var ref = await fetch(SB + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: { 'apikey': SBK, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: s.refresh_token })
        });
        var rd = await ref.json();
        if (rd.access_token) {
          s = rd;
          localStorage.setItem('ss_session', JSON.stringify(s));
        } else {
          localStorage.removeItem('ss_session');
          return;
        }
      } else {
        localStorage.removeItem('ss_session');
        return;
      }
    }
    window.SS.session = s;
    window.SS.user = s.user;
    updateAuthUI();
    loadProfile();
  } catch(e) { console.warn('Auth init:', e.message); }
}

/* ── GOOGLE OAUTH — simple redirect ── */
function signInWithGoogle() {
  var url = SB + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(REDIRECT);
  window.location.href = url;
}

/* ── APPLE OAUTH ── */
function signInWithApple() {
  var url = SB + '/auth/v1/authorize?provider=apple&redirect_to=' + encodeURIComponent(REDIRECT);
  window.location.href = url;
}

/* ── MAGIC LINK (email) ── */
async function submitAuth() {
  var emailEl = document.getElementById('authEmail');
  var email = (emailEl ? emailEl.value : '').trim();
  if (!email || !email.includes('@')) { showAuthMsg('Enter a valid email', 'red'); return; }
  var btn = document.getElementById('authSubmitBtn');
  if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
  try {
    var r = await fetch(SB + '/auth/v1/otp', {
      method: 'POST',
      headers: { 'apikey': SBK, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, create_user: true })
    });
    var d = await r.json();
    if (d.error) { showAuthMsg(d.error.message || 'Error', 'red'); }
    else { showAuthMsg('Check your email for the sign-in link', 'green'); if(btn) btn.textContent = 'Link sent!'; }
  } catch(e) { showAuthMsg('Could not send — check connection', 'red'); }
  if (btn) btn.disabled = false;
}

function showAuthMsg(msg, color) {
  var el = document.getElementById('authMsg');
  if (el) { el.textContent = msg; el.style.color = color === 'red' ? 'var(--red)' : 'var(--g)'; }
}

/* ── LOAD PROFILE from Supabase ── */
async function loadProfile() {
  if (!window.SS.user) return;
  try {
    var r = await fetch(SB + '/rest/v1/profiles?user_id=eq.' + window.SS.user.id + '&limit=1', {
      headers: { 'apikey': SBK, 'Authorization': 'Bearer ' + (window.SS.session ? window.SS.session.access_token : SBK) }
    });
    var data = await r.json();
    if (data && data[0]) {
      window.SS.profile = data[0];
      window.SS.points = data[0].points || 0;
      window.SS.tier = data[0].tier || 'free';
      window.SS.isSubscriber = (window.SS.tier !== 'free');
      window.SS.simsCreated = data[0].sims_created || 0;
      var pc = document.getElementById('pointsCount');
      if (pc) pc.textContent = window.SS.points + ' pts';
    }
  } catch(e) {}
}

/* ── UPDATE NAV UI ── */
function updateAuthUI() {
  var btn = document.getElementById('authNavBtn');
  if (!btn) return;
  if (window.SS.user) {
    var meta = window.SS.user.user_metadata || {};
    var name = meta.full_name ? meta.full_name.split(' ')[0] : window.SS.user.email.split('@')[0];
    btn.textContent = name.slice(0, 12);
    btn.style.color = 'var(--g)';
    btn.style.borderColor = 'rgba(38,232,176,0.4)';
    /* Show admin tab */
    var adminTab = document.getElementById('adminTab');
    if (adminTab && window.SS.user.email === 'nawraselali@gmail.com') adminTab.style.display = 'inline-block';
  } else {
    btn.textContent = 'Sign in';
    btn.style.color = '';
    btn.style.borderColor = '';
  }
}

/* ── PROFILE MENU (tap name when signed in) ── */
function showProfileMenu() {
  var u = window.SS.user;
  if (!u) return;
  if (typeof showToast === 'function') showToast('👤 ' + u.email + ' · ' + window.SS.tier);
}

/* ── SIGN OUT ── */
async function signOut() {
  localStorage.removeItem('ss_session');
  try {
    await fetch(SB + '/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': SBK, 'Authorization': 'Bearer ' + (window.SS.session ? window.SS.session.access_token : SBK) }
    });
  } catch(e) {}
  window.SS.user = null; window.SS.session = null; window.SS.profile = null;
  updateAuthUI();
  if (typeof showToast === 'function') showToast('Signed out');
}

/* ── POINTS ── */
async function addPoints(pts) {
  window.SS.points += pts;
  var el = document.getElementById('pointsCount');
  if (el) el.textContent = window.SS.points + ' pts';
  if (!window.SS.user) return;
  try {
    await fetch(SB + '/rest/v1/profiles?user_id=eq.' + window.SS.user.id, {
      method: 'PATCH',
      headers: { 'apikey': SBK, 'Authorization': 'Bearer ' + (window.SS.session ? window.SS.session.access_token : SBK), 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: window.SS.points })
    });
  } catch(e) {}
}

/* ── RECORD SIM CREATED ── */
async function recordSimCreated() {
  window.SS.simsCreated++;
  if (!window.SS.user) return;
  try {
    await fetch(SB + '/rest/v1/profiles?user_id=eq.' + window.SS.user.id, {
      method: 'PATCH',
      headers: { 'apikey': SBK, 'Authorization': 'Bearer ' + (window.SS.session ? window.SS.session.access_token : SBK), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sims_created: window.SS.simsCreated })
    });
  } catch(e) {}
}

/* ── EXPOSE ── */
window.SS_AUTH = {
  init: initAuth,
  showAuth: function(reason) {
    var m = document.getElementById('authModal');
    if (m) { m.style.display = 'flex'; var r = document.getElementById('authReason'); if(r) r.textContent = reason||''; }
  },
  signOut: signOut,
  showProfile: showProfileMenu,
  recordCreated: recordSimCreated,
  addPoints: addPoints,
  signInWithGoogle: signInWithGoogle,
  signInWithApple: signInWithApple,
  submitAuth: submitAuth
};
