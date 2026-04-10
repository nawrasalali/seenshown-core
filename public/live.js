/* ═══════════════════════════════════════════════
   SEENSHOWN LIVE COMPETE + STREAMING
   Supabase Realtime channels for live rooms
   WebRTC for optional voice
═══════════════════════════════════════════════ */

var SB_WS='wss://jnvdpmmxlbkxwanqqhfw.supabase.co/realtime/v1';
var SBK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudmRwbW14bGJreHdhbnFxaGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzc2MzgsImV4cCI6MjA5MTA1MzYzOH0.QBD3_YiDvJXvO12gE6FR1GthUd1SvC0MmOmVoPaU71M';
var SB='https://jnvdpmmxlbkxwanqqhfw.supabase.co';

window.LIVE={
  ws:null,
  roomId:null,
  role:null,         /* 'host_a' | 'host_b' | 'viewer' */
  heartbeatTimer:null,
  viewers:0,
  votesA:0,
  votesB:0,
  myDomain:null,
  opponentDomain:null,
  micStream:null,
  peerConn:null
};

/* ── GENERATE ROOM ID ── */
function genRoomId(){return 'room_'+Math.random().toString(36).slice(2,8);}

/* ── CREATE LIVE COMPETE ROOM ── */
async function createLiveRoom(domain,simTitle){
  var roomId=genRoomId();
  LIVE.roomId=roomId;LIVE.role='host_a';LIVE.myDomain=domain;
  /* Save room to Supabase */
  try{
    await fetch(SB+'/rest/v1/live_rooms',{
      method:'POST',
      headers:{'apikey':SBK,'Authorization':'Bearer '+SBK,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({room_id:roomId,host_a_domain:domain,host_a_title:simTitle||domain,status:'waiting',votes_a:0,votes_b:0,viewers:0})
    });
  }catch(e){}
  connectLiveWS(roomId);
  showLiveRoom(roomId,'host_a',domain,null);
  return roomId;
}

/* ── JOIN LIVE ROOM ── */
async function joinLiveRoom(roomId,domain){
  LIVE.roomId=roomId;LIVE.myDomain=domain;
  /* Check if slot B is open */
  try{
    var r=await fetch(SB+'/rest/v1/live_rooms?room_id=eq.'+roomId+'&limit=1',
      {headers:{'apikey':SBK,'Authorization':'Bearer '+SBK}});
    var data=await r.json();
    if(!data||!data[0]){showToastGlobal('Room not found');return;}
    var room=data[0];
    if(!room.host_b_domain){
      /* Take slot B */
      LIVE.role='host_b';LIVE.opponentDomain=room.host_a_domain;
      await fetch(SB+'/rest/v1/live_rooms?room_id=eq.'+roomId,{
        method:'PATCH',
        headers:{'apikey':SBK,'Authorization':'Bearer '+SBK,'Content-Type':'application/json'},
        body:JSON.stringify({host_b_domain:domain,status:'live'})
      });
      showLiveRoom(roomId,'host_b',domain,room.host_a_domain);
    } else {
      /* Join as viewer */
      LIVE.role='viewer';LIVE.opponentDomain=null;
      showLiveRoom(roomId,'viewer',room.host_a_domain,room.host_b_domain);
    }
  }catch(e){showToastGlobal('Could not join room');}
  connectLiveWS(roomId);
}

/* ── WEBSOCKET CHANNEL ── */
function connectLiveWS(roomId){
  if(LIVE.ws)LIVE.ws.close();
  var wsUrl=SB_WS+'/websocket?apikey='+SBK+'&vsn=1.0.0';
  LIVE.ws=new WebSocket(wsUrl);
  LIVE.ws.onopen=function(){
    /* Join realtime channel */
    LIVE.ws.send(JSON.stringify({topic:'realtime:'+roomId,event:'phx_join',payload:{},ref:'1'}));
    /* Heartbeat every 30s */
    LIVE.heartbeatTimer=setInterval(function(){
      if(LIVE.ws&&LIVE.ws.readyState===1)
        LIVE.ws.send(JSON.stringify({topic:'phoenix',event:'heartbeat',payload:{},ref:'hb'}));
    },30000);
  };
  LIVE.ws.onmessage=function(e){
    try{
      var msg=JSON.parse(e.data);
      handleLiveMsg(msg);
    }catch(err){}
  };
  LIVE.ws.onclose=function(){if(LIVE.heartbeatTimer)clearInterval(LIVE.heartbeatTimer);};
}

/* ── HANDLE INCOMING MESSAGES ── */
function handleLiveMsg(msg){
  if(!msg.payload)return;
  var p=msg.payload;
  /* Vote update */
  if(p.type==='vote'){
    if(p.side==='A'){LIVE.votesA++;updateLiveVotes();}
    else{LIVE.votesB++;updateLiveVotes();}
  }
  /* Viewer count */
  if(p.type==='viewers'){LIVE.viewers=p.count;updateViewerCount();}
  /* Host B joined */
  if(p.type==='host_b_joined'){LIVE.opponentDomain=p.domain;updateLiveRoomUI();}
  /* Room ended */
  if(p.type==='end'){endLiveRoom();}
}

/* ── BROADCAST EVENT ── */
function broadcastLive(payload){
  if(!LIVE.ws||LIVE.ws.readyState!==1)return;
  LIVE.ws.send(JSON.stringify({
    topic:'realtime:'+LIVE.roomId,
    event:'broadcast',
    payload:payload,
    ref:'bc'
  }));
}

/* ── LIVE VOTE ── */
async function castLiveVote(side){
  if(LIVE.role==='viewer'&&!window.SS.isSubscriber){
    showToastGlobal('Subscribe to vote · Free users can like only');
    return;
  }
  var ok=await window.SS_AUTH.deductVote();
  if(!ok)return;
  broadcastLive({type:'vote',side:side});
  if(side==='A')LIVE.votesA++;else LIVE.votesB++;
  updateLiveVotes();
  /* Disable vote buttons after voting */
  document.getElementById('liveVoteA')&&(document.getElementById('liveVoteA').disabled=true);
  document.getElementById('liveVoteB')&&(document.getElementById('liveVoteB').disabled=true);
}

/* ── LIVE MIC — WebRTC ── */
async function startMic(){
  try{
    LIVE.micStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    document.getElementById('micBtn')&&(document.getElementById('micBtn').textContent='🔴 Mic On');
    showToastGlobal('🎙️ Microphone live');
  }catch(e){showToastGlobal('Could not access microphone');}
}
function stopMic(){
  if(LIVE.micStream)LIVE.micStream.getTracks().forEach(function(t){t.stop();});
  LIVE.micStream=null;
  document.getElementById('micBtn')&&(document.getElementById('micBtn').textContent='🎙️ Mic');
}

/* ── UI HELPERS ── */
function updateLiveVotes(){
  var elA=document.getElementById('liveVotesA');
  var elB=document.getElementById('liveVotesB');
  if(elA)elA.textContent=LIVE.votesA+' votes';
  if(elB)elB.textContent=LIVE.votesB+' votes';
}
function updateViewerCount(){
  var el=document.getElementById('liveViewers');
  if(el)el.textContent='👁 '+LIVE.viewers+' watching';
}
function updateLiveRoomUI(){
  var el=document.getElementById('liveWaiting');
  if(el&&LIVE.opponentDomain)el.textContent='vs '+LIVE.opponentDomain;
}

/* ── END ROOM ── */
async function endLiveRoom(){
  broadcastLive({type:'end'});
  if(LIVE.ws)LIVE.ws.close();
  if(LIVE.heartbeatTimer)clearInterval(LIVE.heartbeatTimer);
  stopMic();
  /* Determine winner & credit points */
  if(LIVE.role==='host_a'||LIVE.role==='host_b'){
    var myVotes=LIVE.role==='host_a'?LIVE.votesA:LIVE.votesB;
    var winnerPoints=Math.round(myVotes*.2); /* 20% of votes received */
    if(winnerPoints>0&&window.SS.user){
      window.SS.points+=winnerPoints;
      window.SS_AUTH.updateUI();
      showToastGlobal('🏆 You earned '+winnerPoints+' points from this competition!');
    }
  }
  /* Update room status */
  if(LIVE.roomId){
    fetch(SB+'/rest/v1/live_rooms?room_id=eq.'+LIVE.roomId,{
      method:'PATCH',
      headers:{'apikey':SBK,'Authorization':'Bearer '+SBK,'Content-Type':'application/json'},
      body:JSON.stringify({status:'ended',votes_a:LIVE.votesA,votes_b:LIVE.votesB})
    }).catch(function(){});
  }
  document.getElementById('liveModal')&&(document.getElementById('liveModal').style.display='none');
  LIVE.roomId=null;LIVE.role=null;LIVE.votesA=0;LIVE.votesB=0;
}

/* ── SHOW LIVE ROOM UI ── */
function showLiveRoom(roomId,role,domainA,domainB){
  var modal=document.getElementById('liveModal');
  if(!modal)return;
  modal.style.display='flex';
  document.getElementById('liveRoomId').textContent='Room: '+roomId;
  document.getElementById('liveRoleLabel').textContent=
    role==='host_a'?'You are Player A':role==='host_b'?'You are Player B':'Watching';
  document.getElementById('liveDomainA').textContent=DOMAIN_LABELS[domainA]||domainA||'—';
  document.getElementById('liveDomainB').textContent=domainB?DOMAIN_LABELS[domainB]||domainB:'Waiting for opponent…';
  /* Show share link for host A */
  if(role==='host_a'){
    var shareUrl='https://seenshown.com/?live='+roomId;
    document.getElementById('liveShareUrl').textContent=shareUrl;
    document.getElementById('liveShareRow').style.display='flex';
  }
  /* Show vote buttons for non-hosts or host B */
  if(role==='viewer'||role==='host_b'){
    document.getElementById('liveVoteRow').style.display='flex';
  }
  /* Mic button for hosts */
  if(role==='host_a'||role==='host_b'){
    document.getElementById('liveMicRow').style.display='flex';
  }
}

/* ── FIND PUBLIC ROOMS TO JOIN ── */
async function loadPublicRooms(){
  try{
    var r=await fetch(SB+'/rest/v1/live_rooms?status=eq.waiting&order=created_at.desc&limit=10',
      {headers:{'apikey':SBK,'Authorization':'Bearer '+SBK}});
    return await r.json();
  }catch(e){return [];}
}

window.LIVE_API={
  create:createLiveRoom,
  join:joinLiveRoom,
  vote:castLiveVote,
  end:endLiveRoom,
  startMic:startMic,
  stopMic:stopMic,
  loadRooms:loadPublicRooms
};
