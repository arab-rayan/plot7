/* ===================== APPEL (audio, caméra, partage d'écran) ===================== */
/* WebRTC de navigateur à navigateur. Firestore sert seulement à se trouver (signalisation).
   Le son et l'image passent directement entre les ordinateurs. */
const ICE={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]};
let CALL={in:false,sid:null,joined:0,pcs:new Map(),mic:null,cam:null,screen:null,micOn:true,hb:null,unsub:null,since:0,ac:null,meters:null};
let PREV_CALLERS=0;
const callPeople=()=>{const seen=new Map();arr('callpeers').filter(p=>Date.now()-p.ts<45000).sort((a,b)=>a.joined-b.joined).forEach(p=>{if(!seen.has(p.id))seen.set(p.id,p)});return [...seen.values()]};
const otherPeers=()=>callPeople().filter(p=>p.id!==CALL.sid);

function onCallPeers(first){
 const L=callPeople();const others=L.filter(p=>p.id!==CALL.sid);
 if(!first&&!CALL.in&&others.length&&PREV_CALLERS===0){const p=others[0];toast(`${p.name} a lancé un appel`,'call','appel','Rejoindre');notifyOS('Appel du Plot 7',`${p.name} a lancé un appel`,'appel')}
 PREV_CALLERS=others.length;
 if(CALL.in){
  others.forEach(p=>{if(!CALL.pcs.has(p.id)&&CALL.joined>p.joined)makePc(p.id)});   // le dernier arrivé appelle les autres
  [...CALL.pcs.keys()].forEach(sid=>{if(!others.some(p=>p.id===sid))dropPc(sid)});
 }
 if(CUR==='appel')callTiles();
}
function makePc(sid){
 const pc=new RTCPeerConnection(ICE);const st={pc,polite:CALL.sid<sid,makingOffer:false,ignoreOffer:false,streams:new Map(),audio:null};CALL.pcs.set(sid,st);
 pc.onicecandidate=e=>{if(e.candidate)sig(sid,'ice',e.candidate.toJSON())};
 pc.onnegotiationneeded=async()=>{try{st.makingOffer=true;await pc.setLocalDescription();sig(sid,'desc',pc.localDescription.toJSON())}catch(e){console.error(e)}finally{st.makingOffer=false}};
 pc.ontrack=e=>{const s=e.streams[0]||new MediaStream([e.track]);st.streams.set(s.id,s);
  if(e.track.kind==='audio'){if(!st.audio){st.audio=document.createElement('audio');st.audio.autoplay=true;$('#callAudio').appendChild(st.audio)}st.audio.srcObject=s;st.audio.play().catch(()=>{});meter(sid,s)}
  s.onremovetrack=()=>{if(!s.getTracks().length)st.streams.delete(s.id);if(CUR==='appel')callTiles()};e.track.onunmute=()=>{if(CUR==='appel')callTiles()};
  if(CUR==='appel')callTiles()};
 pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')pc.restartIce?.();if(CUR==='appel')callTiles()};
 [CALL.mic,CALL.cam,CALL.screen].forEach(s=>s&&s.getTracks().forEach(t=>pc.addTrack(t,s)));
 return st}
function dropPc(sid){const st=CALL.pcs.get(sid);if(!st)return;try{st.pc.close()}catch(e){}st.audio?.remove();CALL.pcs.delete(sid);if(CALL.meters)delete CALL.meters[sid]}
async function onSignal(d){const from=d.from;let st=CALL.pcs.get(from);const data=JSON.parse(d.data);
 if(d.kind==='bye'){dropPc(from);return}
 if(!st)st=makePc(from);const pc=st.pc;
 try{if(d.kind==='desc'){const collision=data.type==='offer'&&(st.makingOffer||pc.signalingState!=='stable');st.ignoreOffer=!st.polite&&collision;if(st.ignoreOffer)return;
   await pc.setRemoteDescription(data);if(data.type==='offer'){await pc.setLocalDescription();sig(from,'desc',pc.localDescription.toJSON())}}
  else if(d.kind==='ice'){try{await pc.addIceCandidate(data)}catch(e){if(!st.ignoreOffer)console.warn(e)}}}
 catch(e){console.error(e)}}
function sig(to,kind,data){ref('signal').add({from:CALL.sid,to,kind,data:JSON.stringify(data),ts:Date.now()}).catch(e=>console.error(e))}

async function joinCall(withCam){
 if(CALL.in||LOCAL)return;if(!window.RTCPeerConnection)return toast('Ce navigateur ne gère pas les appels.','bad');
 CALL.sid=uid('s');CALL.joined=Date.now();CALL.since=Date.now();
 try{CALL.mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});CALL.micOn=true;meter('me',CALL.mic)}
 catch(e){CALL.mic=null;CALL.micOn=false;toast('Micro indisponible ou refusé : tu rejoins sans micro.','bad')}
 CALL.in=true;
 CALL.unsub=ref('signal').where('to','==',CALL.sid).onSnapshot(s=>s.docChanges().forEach(ch=>{if(ch.type==='added'){onSignal(ch.doc.data());ch.doc.ref.delete().catch(()=>{})}}));
 await pushMe();CALL.hb=setInterval(pushMe,15000);
 logAct('a rejoint l\'appel','','appel',true);
 onCallPeers(false);if(withCam)toggleCam();renderView();updateShellBits();
}
async function pushMe(){if(!CALL.in)return;const doc={uid:ME.id,name:ME.name,color:ME.color,joined:CALL.joined,ts:Date.now(),mic:!!(CALL.mic&&CALL.micOn),cam:!!CALL.cam,screen:!!CALL.screen,screenSid:CALL.screen?.id||'',camSid:CALL.cam?.id||''};
 D.callpeers.set(CALL.sid,{id:CALL.sid,...doc});try{await ref('callpeers').doc(CALL.sid).set(doc)}catch(e){}}
async function leaveCall(){if(!CALL.in)return;
 [...CALL.pcs.keys()].forEach(s=>{sig(s,'bye',{});dropPc(s)});
 [CALL.mic,CALL.cam,CALL.screen].forEach(s=>s&&s.getTracks().forEach(t=>t.stop()));
 clearInterval(CALL.hb);CALL.unsub&&CALL.unsub();D.callpeers.delete(CALL.sid);try{await ref('callpeers').doc(CALL.sid).delete()}catch(e){}
 CALL={...CALL,in:false,sid:null,mic:null,cam:null,screen:null,pcs:new Map(),meters:null};
 // ménage : les fiches d'appel abandonnées (onglet fermé brutalement)
 arr('callpeers').filter(p=>Date.now()-p.ts>60000).forEach(p=>ref('callpeers').doc(p.id).delete().catch(()=>{}));
 if(CUR==='appel')renderView();updateShellBits()}
window.addEventListener('pagehide',()=>{if(CALL.in){try{ref('callpeers').doc(CALL.sid).delete()}catch(e){}}});

function toggleMic(){if(!CALL.mic)return toast('Pas de micro disponible.','bad');CALL.micOn=!CALL.micOn;CALL.mic.getAudioTracks().forEach(t=>t.enabled=CALL.micOn);pushMe();callTiles()}
async function addStream(kind,s){CALL[kind]=s;CALL.pcs.forEach(st=>s.getTracks().forEach(t=>st.pc.addTrack(t,s)));await pushMe();callTiles()}
function removeStream(kind){const s=CALL[kind];if(!s)return;CALL.pcs.forEach(st=>st.pc.getSenders().forEach(snd=>{if(snd.track&&s.getTracks().includes(snd.track))st.pc.removeTrack(snd)}));s.getTracks().forEach(t=>t.stop());CALL[kind]=null;pushMe();callTiles()}
async function toggleCam(){if(CALL.cam)return removeStream('cam');try{const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:360}}});addStream('cam',s)}catch(e){toast('Caméra indisponible ou refusée.','bad')}}
async function toggleScreen(){if(CALL.screen)return removeStream('screen');if(!navigator.mediaDevices?.getDisplayMedia)return toast('Le partage d\'écran n\'est pas possible sur cet appareil (ordinateur requis).','bad');
 try{const s=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:15}},audio:false});s.getVideoTracks()[0].onended=()=>{if(CALL.screen===s)removeStream('screen')};addStream('screen',s);logAct('partage son écran','','appel',true)}catch(e){if(e.name!=='NotAllowedError')toast('Partage d\'écran impossible.','bad')}}

/* Indicateur « parle » */
function meter(key,stream){try{CALL.ac=CALL.ac||new (window.AudioContext||window.webkitAudioContext)();const src=CALL.ac.createMediaStreamSource(stream);const an=CALL.ac.createAnalyser();an.fftSize=256;src.connect(an);CALL.meters=CALL.meters||{};CALL.meters[key]=an;if(!CALL.meterTimer)CALL.meterTimer=setInterval(()=>{if(!CALL.meters)return;const buf=new Uint8Array(128);Object.entries(CALL.meters).forEach(([k,a])=>{a.getByteFrequencyData(buf);const v=buf.reduce((s,x)=>s+x,0)/buf.length;const el=document.querySelector(`.tile[data-k="${k}"]`);if(el)el.classList.toggle('speaking',v>18&&(k!=='me'||CALL.micOn))})},180)}catch(e){}}

/* ---------- Affichage ---------- */
function peerVideo(sid,p){const st=CALL.pcs.get(sid);if(!st)return{};let screen=null,cam=null;st.streams.forEach(s=>{const v=s.getVideoTracks().find(t=>t.readyState==='live'&&!t.muted);if(!v)return;if(p.screenSid&&s.id===p.screenSid)screen=s;else if(p.camSid&&s.id===p.camSid)cam=s;else if(p.screen&&!screen)screen=s;else if(p.cam&&!cam)cam=s});return{screen:p.screen?screen:null,cam:p.cam?cam:null}}
VIEWS.appel=function(){
 const L=callPeople();
 if(!CALL.in){$('#view').innerHTML=pageHead('Appel','Appel vocal du groupe, avec caméra et partage d\'écran. Fonctionne depuis Chrome, Edge ou Firefox sur ordinateur.')+
  `<section class="card call-lobby"><div class="lobby-ico">${ui('phone',40)}</div><h2>${L.length?`${L.map(p=>esc(p.name)).join(', ')} ${L.length>1?'sont':'est'} en appel`:'Personne n\'est en appel'}</h2>
  <div class="row" style="justify-content:center;gap:-6px;margin:8px 0 18px">${L.map(p=>avatar(p.name,p.color,'lg')).join('')}</div>
  <div class="row" style="justify-content:center"><button class="btn primary lg" onclick="joinCall()" ${LOCAL?'disabled':''}>${ui('phone',18)} ${L.length?'Rejoindre l\'appel':'Lancer un appel'}</button><button class="btn lg" onclick="joinCall(true)" ${LOCAL?'disabled':''}>${ui('cam',18)} Avec caméra</button></div>
  <p class="small muted" style="margin-top:18px">Les autres reçoivent une notification. Ton navigateur va demander l'accès au micro.</p></section>
  <div class="grid g-2" style="margin-top:18px"><div class="explain small"><b>Partager ton écran.</b> Une fois dans l'appel, clique sur « Partager l'écran » et choisis la fenêtre (par exemple l'interface Proxmox). Les autres la voient en grand, en direct.</div>
  <div class="explain small"><b>Si ça ne connecte pas.</b> Le son et l'image passent directement entre les ordinateurs. Ça marche sur le même réseau (au lycée) et en général depuis la maison. Certains réseaux très filtrés bloquent ces connexions : essaie alors depuis un partage de connexion 4G.</div></div>`;return}
 $('#view').innerHTML=`<div class="call-wrap"><div class="call-top row between"><div><h1 style="font-size:22px;margin:0">Appel du plot</h1><span class="small muted" id="callTimer"></span></div><span class="tiny muted">${ui('dot',10)} Son et image directs entre navigateurs</span></div>
  <div id="tiles" class="tiles"></div>
  <div class="call-bar"><button class="cbtn ${CALL.micOn?'':'off'}" id="bMic" onclick="toggleMic()" title="Micro">${ui(CALL.micOn?'mic':'micoff',22)}<span>Micro</span></button>
   <button class="cbtn ${CALL.cam?'on':''}" onclick="toggleCam()" title="Caméra">${ui(CALL.cam?'cam':'camoff',22)}<span>Caméra</span></button>
   <button class="cbtn ${CALL.screen?'on':''}" onclick="toggleScreen()" title="Partager l'écran">${ui('screen',22)}<span>${CALL.screen?'Arrêter le partage':'Partager l\'écran'}</span></button>
   <button class="cbtn hang" onclick="leaveCall()" title="Quitter">${ui('phoneoff',22)}<span>Quitter</span></button></div></div>`;
 callTiles();
};
function callTiles(){const box=$('#tiles');if(!box||!CALL.in){if(CUR==='appel'&&!CALL.in)renderView();return}
 const me={id:CALL.sid,uid:ME.id,name:ME.name,color:ME.color,mic:!!(CALL.mic&&CALL.micOn)};
 const items=[{k:'me',p:me,screen:CALL.screen,cam:CALL.cam,self:true},...otherPeers().map(p=>({k:p.id,p,...peerVideo(p.id,p),state:CALL.pcs.get(p.id)?.pc.connectionState}))];
 const spot=items.find(i=>i.screen&&!i.self)||items.find(i=>i.screen);
 const tsig=JSON.stringify([spot?.k,items.map(i=>[i.k,i.p.name,i.p.color,i.p.mic,!!i.screen,!!i.cam,i.state,i.screen?.id,i.cam?.id])]);
 if(box.dataset.sig!==tsig){box.dataset.sig=tsig;
 box.className='tiles '+(spot?'has-spot':'n'+Math.min(items.length,4));
 const tile=(i,isSpot)=>`<div class="tile ${isSpot?'spot':''}" data-k="${i.k}" style="--c:${i.p.color||'#64748b'}">${isSpot?`<video autoplay playsinline muted data-v="${i.k}:screen"></video><button class="btn sm glass fs" onclick="this.parentNode.querySelector('video').requestFullscreen?.()">${ui('fit',14)} Plein écran</button>`:i.cam?`<video autoplay playsinline muted data-v="${i.k}:cam" class="${i.self?'mirror':''}"></video>`:`<div class="tile-av">${avatar(i.p.name,i.p.color,'xl')}</div>`}
  <div class="tile-name">${i.p.mic?'':ui('micoff',13)} ${esc(i.p.name)}${i.self?' (moi)':''}${isSpot?' · partage d\'écran':''}${!i.self&&i.state&&i.state!=='connected'?` <span class="tiny" style="opacity:.8">· ${i.state==='failed'?'connexion impossible':'connexion…'}</span>`:''}</div></div>`;
 box.innerHTML=(spot?tile(spot,true):'')+`<div class="tile-strip">${items.map(i=>tile(i,false)).join('')}</div>`;}
 $$('video[data-v]',box).forEach(v=>{const [k,kind]=v.dataset.v.split(':');const it=items.find(i=>i.k===k);const s=it?.[kind];if(s&&v.srcObject!==s)v.srcObject=s;v.play?.().catch(()=>{})});
 const t=$('#callTimer');if(t){const s=Math.floor((Date.now()-CALL.since)/1000);t.textContent=`${items.length} participant${items.length>1?'s':''} · ${Math.floor(s/60)} min ${String(s%60).padStart(2,'0')} s`}}
setInterval(()=>{if(CALL.in&&CUR==='appel'){const t=$('#callTimer');if(t){const n=callPeople().length;const s=Math.floor((Date.now()-CALL.since)/1000);t.textContent=`${n} participant${n>1?'s':''} · ${Math.floor(s/60)} min ${String(s%60).padStart(2,'0')} s`}}callPillUpdate()},1000);
function callPillUpdate(){const el=$('#callPill');if(!el)return;const n=callPeople().length;
 if(CALL.in){el.hidden=false;el.className='callpill in';const s=Math.floor((Date.now()-CALL.since)/1000);el.innerHTML=`${ui('phone',14)} En appel · ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}${CALL.screen?' · écran partagé':''}`}
 else if(n){el.hidden=false;el.className='callpill';el.innerHTML=`${ui('phone',14)} Appel en cours (${n}) · Rejoindre`}else el.hidden=true}
