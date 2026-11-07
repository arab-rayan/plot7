/* ===================== Utilitaires ===================== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36).slice(-4)+Math.random().toString(36).slice(2,6);
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’'`]/g,' ');
const trunc=(s,n)=>(s||'').length>n?(s.slice(0,n-1)+'…'):(s||'');
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
const todayISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const fmtD=d=>d?new Date(d+(String(d).length===10?'T12:00':'')).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}):'';
const fmtDL=d=>d?new Date(d+(String(d).length===10?'T12:00':'')).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}):'';
const fmtT=ts=>new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const ago=ts=>{const s=(Date.now()-ts)/1000;if(s<60)return 'à l\'instant';if(s<3600)return `il y a ${Math.floor(s/60)} min`;if(s<86400)return `il y a ${Math.floor(s/3600)} h`;if(s<7*86400)return `il y a ${Math.floor(s/86400)} j`;return new Date(ts).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})};
const fmtSize=b=>b<1024?b+' o':b<1048576?(b/1024).toFixed(0)+' Ko':b<1073741824?(b/1048576).toFixed(1).replace('.',',')+' Mo':(b/1073741824).toFixed(2).replace('.',',')+' Go';
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const clone=o=>JSON.parse(JSON.stringify(o??null));

/* ===================== Données partagées ===================== */
// Toutes les collections du Plot 7 sont préfixées « p7_ » dans Firestore.
// Espaces : un espace = une promo ou un plot. « p7 » = Plot virtuel 7 (données d'origine, jamais déplacées).
const SPACE=((new URLSearchParams(location.search).get('ns'))||ls.get('p7-space','p7')).replace(/[^a-z0-9]/gi,'')||'p7';
const PREFIX_DB=SPACE+'_';
const KEY=k=>SPACE==='p7'?'p7-'+k:SPACE+'-'+k;   // réglages du navigateur propres à chaque espace
let SPACES=new Map();
const plotInfo=()=>({...PLOT,...(SPACES.get(SPACE)||{}),...(D.meta.get('plot')||{})});
const COLS=['tasks','events','sites','meta','activity','chat','files','folders','presence','callpeers'];
const D={};COLS.forEach(c=>D[c]=new Map());
let FIRE=false,DBH=null,LIVE=false,FIRST=new Set(),BOOT=Date.now(),LOCAL=false;
const arr=c=>[...D[c].values()];
const members=()=>D.meta.get('members')?.list||(SPACE==='p7'?DEFAULT_MEMBERS:[]);
const member=id=>id==='all'?{id:'all',name:'Tout le groupe',color:'#64748b',role:''}:(members().find(m=>m.id===id)||{id:'',name:'Non attribué',color:'#94a3b8',role:''});
const initials=n=>(n||'?').replace(/\(.*\)/,'').split(/\s+/).filter(x=>/[\p{L}\d]/u.test(x[0]||'')).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'?';
const photoOf=name=>{try{return members().find(x=>x.name===name)?.photo||''}catch(e){return ''}};
const avatar=(name,color,cls='')=>{const ph=photoOf(name);return ph?`<span class="avatar ph ${cls}" style="background:${color||'#64748b'} url('${ph}') center/cover" title="${esc(name)}"></span>`:`<span class="avatar ${cls}" style="background:${color||'#64748b'}" title="${esc(name)}">${esc(initials(name))}</span>`};
const who=id=>{const m=member(id);return `<span class="who">${avatar(m.name,m.color)}${esc(m.name)}</span>`};
const colorOf=name=>{const m=members().find(x=>x.name===name);if(m)return m.color;let h=0;for(const c of name||'')h=(h*31+c.charCodeAt(0))%360;return `hsl(${h} 55% 48%)`};
const pveCfg=()=>({...DEFAULT_PVE,...(D.meta.get('pve')||{})});

async function initStore(){
 try{if(window.FIREBASE_CONFIG&&window.firebase){if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);DBH=firebase.firestore();try{DBH.settings({experimentalForceLongPolling:true,merge:true})}catch(e){}FIRE=true}}catch(e){console.error(e);DBH=null}
 if(FIRE&&firebase.auth){try{await authGate()}catch(e){console.error(e)}}
 if(!DBH){LOCAL=true;localStoreInit()}
 COLS.forEach(subscribe);
 if(FIRE)DBH.collection('spaces').onSnapshot(s=>{SPACES=new Map(s.docs.map(d=>[d.id,{id:d.id,...d.data()}]));renderGate(true);updateShellBits();if(CUR==='equipe')scheduleRender()},()=>{});
 if(FIRE)seedFirestoreIfEmpty();
 if(typeof startPresence==='function')startPresence();
 setTimeout(()=>{if(!LIVE){setLive(false);toast('La base partagée ne répond pas encore. Les données affichées peuvent être incomplètes.','bad')}},12000);
}
function subscribe(col){
 const q=col==='activity'?ref(col).orderBy('ts','desc').limit(200):col==='chat'?ref(col).orderBy('ts','desc').limit(400):ref(col);
 q.onSnapshot(snap=>{
  const m=new Map();snap.docs.forEach(d=>m.set(d.id,{id:d.id,...clone(d.data())}));
  const first=!FIRST.has(col);
  if(!first&&col==='activity'){snap.docChanges().forEach(ch=>{if(ch.type==='added'){const a=ch.doc.data();if(a&&a.ts>BOOT&&a.who!==ME?.name&&!a.quiet)toast(`${a.who} ${a.verb} ${a.label}`,'',a.route)}})}
  if(!first&&col==='chat'&&typeof onChatAdded==='function'){snap.docChanges().forEach(ch=>{if(ch.type==='added')onChatAdded({id:ch.doc.id,...ch.doc.data()})})}
  D[col]=m;FIRST.add(col);if(!snap.metadata?.fromCache)setLive(true);
  if(col==='sites'&&typeof onSitesSnapshot==='function')onSitesSnapshot();
  if(col==='callpeers'&&typeof onCallPeers==='function')onCallPeers(first);
  if(col==='chat'&&CUR==='chat'&&typeof chatLive==='function'){chatLive();updateShellBits();return}
  if(col==='presence'||col==='callpeers'){updateShellBits();if(!['accueil','appel','equipe'].includes(CUR))return}
  scheduleRender();
 },err=>{setLive(false);toast('Connexion à la base interrompue ('+(err?.code||'erreur')+'). Recharge la page.','bad')});
}
function ref(col){return DBH?DBH.collection(PREFIX_DB+col):LS.collection(PREFIX_DB+col)}
function setLive(v){LIVE=v||LIVE;const el=$('#live');if(el){el.className='live'+(LIVE?'':' off');el.querySelector('span').textContent=LOCAL?'Enregistré dans ce navigateur (non partagé)':LIVE?'Synchronisé en direct':'Connexion…'}}
async function put(col,id,data,act){
 data={...data,updatedAt:Date.now(),updatedBy:ME?.name||'?'};
 D[col].set(id,{id,...clone(data)});scheduleRender();
 try{await ref(col).doc(id).set(stripId(data));if(act)logAct(...act);return true}
 catch(e){deny(e);return false}
}
async function del(col,id,act){D[col].delete(id);scheduleRender();try{await ref(col).doc(id).delete();if(act)logAct(...act)}catch(e){deny(e)}}
function stripId(o){const c=clone(o);delete c.id;return c}
function deny(e){const c=e?.code||'';toast(c==='permission-denied'?'Modification refusée par la base (règles Firestore).':c==='resource-exhausted'?'Quota gratuit du jour atteint : réessaie demain.':'Échec de l\'enregistrement ('+(c||e?.message||'erreur')+').','bad')}
async function logAct(verb,label,route,quiet){
 try{await ref('activity').add({who:ME?.name||'?',color:ME?.color||'',verb,label,route:route||'',ts:Date.now(),...(quiet?{quiet:true}:{})});
  const all=arr('activity').sort((a,b)=>a.ts-b.ts);if(all.length>180)for(const a of all.slice(0,all.length-160))ref('activity').doc(a.id).delete().catch(()=>{})}catch(e){}
}

/* --- magasin local (si config.js est vide : rien n'est partagé) --- */
let LS=null;
function localStoreInit(){
 const listeners={};const data=ls.get(KEY('local-db'),{});
 const persist=()=>ls.set(KEY('local-db'),data);
 const emit=col=>(listeners[col]||[]).forEach(fn=>fn());
 const snap=(col,order,lim)=>{let docs=Object.entries(data[col]||{}).map(([id,v])=>({id,exists:true,data:()=>v,metadata:{fromCache:false}}));if(order)docs.sort((a,b)=>order.dir==='desc'?b.data()[order.f]-a.data()[order.f]:a.data()[order.f]-b.data()[order.f]);if(lim)docs=docs.slice(0,lim);return{docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{fromCache:false}}};
 const coll=(col,order,lim)=>({orderBy:(f,dir)=>coll(col,{f,dir},lim),limit:n=>coll(col,order,n),
  onSnapshot(next){(listeners[col]=listeners[col]||[]).push(()=>next(snap(col,order,lim)));setTimeout(()=>next(snap(col,order,lim)),0);return()=>{}},
  doc:id=>({set:async v=>{(data[col]=data[col]||{})[id]=clone(v);persist();emit(col)},update:async v=>{(data[col]=data[col]||{})[id]={...(data[col][id]||{}),...clone(v)};persist();emit(col)},delete:async()=>{if(data[col])delete data[col][id];persist();emit(col)},get:async()=>({exists:!!(data[col]||{})[id],data:()=>(data[col]||{})[id]})}),
  add:async v=>{const id=uid('a');(data[col]=data[col]||{})[id]=clone(v);persist();emit(col);return{id}}});
 LS={collection:c=>coll(c)};
 if(!Object.keys(data).length)fetch('seed.json').then(r=>r.json()).then(j=>{Object.entries(j).forEach(([c,docs])=>data[PREFIX_DB+c]=docs);persist();Object.keys(j).forEach(c=>emit(PREFIX_DB+c))}).catch(()=>{});
}

/* ===================== Identité ===================== */
// Identité gardée seulement le temps de la session : fermer l'onglet ou l'app déconnecte.
const ss={get(k,d){try{const v=sessionStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let ME=ss.get(KEY('me'),null);
let GATE_ENTER=null;
function renderGate(){const box=$('#whoGrid');if(!box||!GATE_ENTER)return;
 const P=plotInfo();const t=$('#gateTitle');if(t)t.textContent=P.name;const e=$('#gateEyebrow');if(e)e.textContent=P.promo||'BTS SIO SISR · Lycée Turgot';
 const sel=$('#spaceSel');if(sel){const L=[...SPACES.values()];if(!SPACES.has(SPACE))L.unshift({id:SPACE,name:P.name});const sg=JSON.stringify(L.map(x=>[x.id,x.name,x.promo]));if(sel.dataset.sig!==sg){sel.dataset.sig=sg;sel.innerHTML=L.map(x=>`<option value="${esc(x.id)}" ${x.id===SPACE?'selected':''}>${esc(x.name)}${x.promo?' · '+esc(x.promo):''}</option>`).join('')}}
 const sig=JSON.stringify(members().map(m=>[m.id,m.name,m.role,m.color]));if(box.dataset.sig===sig)return;box.dataset.sig=sig;
 if(!members().length){box.innerHTML='<p class="small" style="color:#9fb0dd">Chargement des membres…</p>';return}
 box.innerHTML=members().map(m=>`<button class="who-btn" data-id="${m.id}">${avatar(m.name,m.color,'lg')}<span><b>${esc(m.name)}</b><small>${esc(m.role||plotInfo().name)}</small></span></button>`).join('');
 $$('.who-btn',box).forEach(b=>b.onclick=()=>{const m=members().find(x=>x.id===b.dataset.id);GATE_ENTER({name:m.name,id:m.id,color:m.color})})}
function syncMe(){if(!ME?.id)return;const m=members().find(x=>x.id===ME.id);if(m&&(m.name!==ME.name||m.color!==ME.color)){ME={...ME,name:m.name,color:m.color};ss.set(KEY('me'),ME)}}
function gate(){
 const g=document.createElement('div');g.className='gate';g.id='gate';
 g.innerHTML=`<div class="gate-card"><div class="row" style="gap:12px"><div class="brand-mark">${icon('serveur',30)}</div><div><div class="eyebrow" id="gateEyebrow">BTS SIO SISR · Lycée Turgot</div><h1 id="gateTitle">${esc(plotInfo().name)}</h1></div></div>
 <div class="space-sw"><span>Espace</span><select id="spaceSel" aria-label="Choisir l'espace (promo ou plot)"><option>${esc(plotInfo().name)}</option></select><button class="btn sm glass" id="newSpaceBtn" type="button">${ui('plus',14)} Nouvel espace</button></div>
 <p>L'espace de travail du plot : le serveur Proxmox, l'infrastructure, les tâches, la discussion, les fichiers et les appels. Clique sur ton nom pour entrer.</p>
 <div class="who-grid" id="whoGrid"></div>
 <p class="tiny" style="margin-top:14px">Les changements sont visibles en direct par tout le groupe.</p></div>`;
 document.body.appendChild(g);
 const enter=(m)=>{ME=m;ss.set(KEY('me'),m);LAST_ACT=Date.now();g.style.transition='opacity .35s';g.style.opacity='0';setTimeout(()=>g.remove(),350);renderShell();route();if(typeof beat==='function')beat();if(!ls.get(KEY('seen-')+m.id,0))ls.set(KEY('seen-')+m.id,Date.now()-7*864e5)};
 GATE_ENTER=enter;renderGate();
 if(ss.get('p7-autologout',0)){ss.set('p7-autologout',null);setTimeout(()=>toast('Tu as été déconnecté après 30 minutes d\'inactivité.'),400)}
 $('#spaceSel',g).onchange=e=>switchSpace(e.target.value);$('#newSpaceBtn',g).onclick=newSpace;
}

/* ===================== Présence (qui est en ligne) ===================== */
let BEAT=null;
let LAST_ACT=Date.now();
['pointerdown','keydown','wheel','touchstart'].forEach(ev=>addEventListener(ev,()=>{LAST_ACT=Date.now()},{passive:true,capture:true}));
let _mm=0;addEventListener('mousemove',()=>{const n=Date.now();if(n-_mm>5000){_mm=n;LAST_ACT=n}},{passive:true});
async function beat(){if(!ME||!DBH)return;try{await ref('presence').doc(ME.id).set({name:ME.name,color:ME.color,ts:Date.now(),act:LAST_ACT,vis:!document.hidden,page:CUR,off:false})}catch(e){}}
function startPresence(){if(BEAT)return;beat();BEAT=setInterval(()=>{beat();idleCheck()},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)LAST_ACT=Date.now();beat()})}
/* Hors ligne tout de suite quand on ferme l'onglet ou l'app */
async function goOffline(){if(!ME||!DBH)return;try{await ref('presence').doc(ME.id).set({name:ME.name,color:ME.color,ts:Date.now(),off:true})}catch(e){}}
addEventListener('pagehide',()=>{if(!ME||!FIRE||!window.FIREBASE_CONFIG)return;const C=window.FIREBASE_CONFIG;
 try{fetch(`https://firestore.googleapis.com/v1/projects/${C.projectId}/databases/(default)/documents/${PREFIX_DB}presence/${ME.id}?key=${C.apiKey}`,{method:'PATCH',keepalive:true,headers:{'Content-Type':'application/json',...(AUTHTOK?{Authorization:'Bearer '+AUTHTOK}:{})},body:JSON.stringify({fields:{name:{stringValue:ME.name},color:{stringValue:ME.color||''},ts:{integerValue:String(Date.now())},off:{booleanValue:true}}})})}catch(e){}});
/* Déconnexion automatique après 30 minutes sans rien faire (sauf pendant un appel) */
const IDLE_MAX=30*60000;
function idleCheck(){if(!ME)return;if(typeof CALL!=='undefined'&&CALL.in)return;if(Date.now()-LAST_ACT>IDLE_MAX)autoLogout()}
async function autoLogout(){await goOffline();ss.set(KEY('me'),null);ss.set('p7-autologout',1);location.reload()}
const presState=id=>{if(ME&&id===ME.id)return 'on';const p=D.presence.get(id);if(!p||p.off||Date.now()-p.ts>75000)return 'off';if(p.vis===false||Date.now()-(p.act||p.ts)>5*60000)return 'away';return 'on'};
const isOnline=id=>presState(id)==='on';
const presLabel=id=>{const s=presState(id);if(s==='on')return 'en ligne';if(s==='off')return 'hors ligne';const p=D.presence.get(id);const m=Math.round((Date.now()-(p.vis===false?p.ts:(p.act||p.ts)))/60000);return p.vis===false?'absent (onglet caché)':`absent · inactif depuis ${m} min`};
const presCls=id=>({on:'is-on',away:'is-away',off:''})[presState(id)];

/* ===================== Notifications ===================== */
const seenKey=()=>KEY('seen-')+(ME?.id||'');
const unread=()=>arr('activity').filter(a=>a.ts>ls.get(seenKey(),0)&&a.who!==ME?.name);
function toast(msg,kind='',route='',label='Voir'){
 let box=$('#toasts');if(!box){box=document.createElement('div');box.id='toasts';box.className='toasts';document.body.appendChild(box)}
 const t=document.createElement('div');t.className='toast '+kind;t.innerHTML=`${kind==='bad'?'':ui(kind==='call'?'phone':kind==='msg'?'chat':'bell',16)}<span style="flex:1">${esc(msg)}</span>${route?`<a href="#${route}" style="color:inherit;font-weight:700">${esc(label)}</a>`:''}`;
 box.appendChild(t);setTimeout(()=>{t.style.transition='opacity .4s,transform .4s';t.style.opacity='0';t.style.transform='translateY(8px)';setTimeout(()=>t.remove(),400)},kind==='bad'?7000:kind==='call'?12000:5000);
}
function notifyOS(title,body,route){try{if(document.hidden&&'Notification' in window&&Notification.permission==='granted'){const n=new Notification(title,{body,tag:route||'p7'});n.onclick=()=>{window.focus();if(route)location.hash=route;n.close()}}}catch(e){}}
function toggleBell(){
 const host=$('#bellHost');const open=$('#bellPop');if(open){open.remove();return}
 const list=arr('activity').sort((a,b)=>b.ts-a.ts).slice(0,40);const seen=ls.get(seenKey(),0);
 const p=document.createElement('div');p.className='popover';p.id='bellPop';
 p.innerHTML=`<div class="row between" style="padding:14px 16px;border-bottom:1px solid var(--line)"><h3>Activité du groupe</h3><button class="btn sm ghost" id="markRead">Tout marquer comme lu</button></div><ul class="list feed" style="padding:4px 16px 10px">${list.map(a=>`<li class="${a.ts>seen&&a.who!==ME.name?'unread':''}">${avatar(a.who,a.color||colorOf(a.who))}<span class="t small"><b>${esc(a.who)}</b> ${esc(a.verb)} ${a.route?`<a href="#${a.route}">${esc(a.label)}</a>`:esc(a.label)}</span><span class="tiny muted">${ago(a.ts)}</span></li>`).join('')||'<li class="muted">Aucune activité pour le moment.</li>'}</ul>
 ${'Notification' in window&&Notification.permission==='default'?`<div style="padding:0 16px 14px"><button class="btn sm" id="askNotif">${ui('bell',14)} Recevoir les messages et appels même quand l'onglet est caché</button></div>`:''}`;
 host.appendChild(p);$('#markRead').onclick=()=>{ls.set(seenKey(),Date.now());p.remove();renderShell()};
 const an=$('#askNotif');if(an)an.onclick=()=>Notification.requestPermission().then(()=>p.remove());
 setTimeout(()=>document.addEventListener('click',function h(e){if(!host.contains(e.target)){p.remove();document.removeEventListener('click',h)}}),0);
}

/* ===================== Modales ===================== */
function closeModal(){$('#overlay')?.remove()}
function openModal(title,html,wide){closeModal();const o=document.createElement('div');o.className='overlay';o.id='overlay';o.innerHTML=`<div class="modal" style="${wide?'width:min(1000px,100%)':''}" role="dialog" aria-modal="true"><header><h2>${esc(title)}</h2><button class="btn ghost icon" data-close aria-label="Fermer">${ui('close')}</button></header><div class="body">${html}</div></div>`;document.body.appendChild(o);o.addEventListener('mousedown',e=>{if(e.target===o)closeModal()});$('[data-close]',o).onclick=closeModal;return o}
function fieldHtml(f,val){const id='f_'+f.k;let inp;
 if(f.type==='textarea')inp=`<textarea id="${id}" rows="${f.rows||3}">${esc(val??'')}</textarea>`;
 else if(f.type==='select')inp=`<select id="${id}">${f.options.map(o=>`<option value="${esc(o.v)}" ${String(o.v)===String(val??'')?'selected':''}>${esc(o.l)}</option>`).join('')}</select>`;
 else if(f.type==='multi'){const set=new Set(val||[]);inp=`<div class="multi" id="${id}">${f.options.length?f.options.map(o=>`<label><input type="checkbox" value="${esc(o.v)}" ${set.has(o.v)?'checked':''}> ${esc(o.l)}</label>`).join(''):'<span class="muted small">Aucun élément</span>'}</div>`}
 else inp=`<input id="${id}" type="${f.type||'text'}" value="${esc(val??'')}" ${f.placeholder?`placeholder="${esc(f.placeholder)}"`:''}>`;
 return `<label class="field ${f.wide?'wide':''}"><span>${esc(f.label)}</span>${inp}${f.hint?`<small>${esc(f.hint)}</small>`:''}</label>`}
function openForm({title,fields,values={},onSave,onDelete,extra='',wide}){
 const o=openModal(title,`<form class="form" id="mf">${fields.map(f=>fieldHtml(f,values[f.k])).join('')}${extra}<footer>${onDelete?`<button type="button" class="btn danger" id="mfdel">${ui('trash',16)} Supprimer</button>`:''}<span style="flex:1"></span><button type="button" class="btn" data-close2>Annuler</button><button class="btn primary" type="submit">Enregistrer</button></footer></form>`,wide);
 $('[data-close2]',o).onclick=closeModal;
 $('#mf').onsubmit=e=>{e.preventDefault();const v={};fields.forEach(f=>{const el=$('#f_'+f.k);v[f.k]=f.type==='multi'?$$('input:checked',el).map(i=>i.value):el.value.trim()});closeModal();onSave(v)};
 if(onDelete)$('#mfdel').onclick=async()=>{if(await confirmBox('Supprimer définitivement cet élément ?')){closeModal();onDelete()}};
 setTimeout(()=>$('#mf input, #mf textarea')?.focus(),60);
}
function confirmBox(msg,ok='Supprimer'){return new Promise(res=>{const prev=$('#overlay');if(prev)prev.style.display='none';const o=document.createElement('div');o.className='overlay';o.style.zIndex=85;o.innerHTML=`<div class="modal" style="width:min(420px,100%)"><div class="body"><p style="margin:0 0 16px">${esc(msg)}</p><div class="row" style="justify-content:flex-end"><button class="btn" id="cbNo">Annuler</button><button class="btn primary" id="cbOk">${esc(ok)}</button></div></div></div>`;document.body.appendChild(o);const done=v=>{o.remove();if(prev)prev.style.display='';res(v)};$('#cbNo',o).onclick=()=>done(false);$('#cbOk',o).onclick=()=>done(true)})}
function promptBox(label,def=''){return new Promise(res=>{const o=document.createElement('div');o.className='overlay';o.style.zIndex=85;o.innerHTML=`<div class="modal" style="width:min(440px,100%)"><form class="body" id="pbf"><label class="field"><span>${esc(label)}</span><input id="pbi" value="${esc(def)}"></label><div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn" id="pbNo">Annuler</button><button class="btn primary">Valider</button></div></form></div>`;document.body.appendChild(o);const i=$('#pbi',o);i.focus();i.select();$('#pbNo',o).onclick=()=>{o.remove();res(null)};$('#pbf',o).onsubmit=e=>{e.preventDefault();o.remove();res(i.value.trim()||null)}})}

/* ===================== Téléchargements ===================== */
async function saveFile(filename,data){
 const b=data instanceof Blob?data:new Blob([data]);const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}

/* ===================== Routeur & coque ===================== */
const NAV=[['accueil','Accueil','home'],['serveur','Serveurs Proxmox','server'],['infra','Infrastructure','map'],['taches','Tâches et planning','tasks'],['chat','Discussion','chat'],['fichiers','Fichiers','folder'],['appel','Appel','phone'],['equipe','Équipe','team']];
const VIEWS={};let CUR='accueil',renderPending=false,deferRender=false;
function route(){if(typeof tipHide==='function')tipHide();const h=(location.hash||'').slice(1);const prev=CUR;CUR=VIEWS[h]?h:'accueil';if(prev!==CUR&&typeof onLeave==='function')onLeave(prev);$('#rail')?.classList.remove('open');$$('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.r===CUR));
 const c=$('#crumb');if(c)c.textContent=NAV.find(n=>n[0]===CUR)?.[1]||'';$('.content')?.classList.toggle('full',CUR==='infra');$('.content')?.classList.toggle('flush',CUR==='chat');
 const v=$('#view');if(!v)return;v.classList.remove('view');void v.offsetWidth;v.classList.add('view');renderView();window.scrollTo({top:0});updateShellBits();beat()}
function renderView(){const v=$('#view');if(!v||!ME)return;try{VIEWS[CUR]()}catch(e){console.error(e);v.innerHTML=`<div class="empty">Erreur d'affichage : ${esc(e.message)}</div>`}}
function scheduleRender(){if(renderPending)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;syncMe();renderGate();
 const a=document.activeElement;if(a&&$('#view')?.contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)){deferRender=true;updateShellBits();return}
 if(typeof INFRA_BUSY!=='undefined'&&INFRA_BUSY())return;
 if(CUR==='chat'&&typeof chatLive==='function'){updateShellBits();chatLive();return}
 if(CUR==='serveur'){updateShellBits();return}   // ne pas recharger l'écran Proxmox
 updateShellBits();renderView()})}
document.addEventListener('focusout',()=>{if(deferRender){deferRender=false;setTimeout(scheduleRender,50)}});
window.addEventListener('hashchange',route);
function renderShell(){
 if(!$('#shell')){
  document.body.insertAdjacentHTML('beforeend',`<div class="app" id="shell"><aside class="rail" id="rail">
  <a class="brand" href="javascript:void 0" onclick="spacesModal()" title="Changer d'espace" style="color:inherit;text-decoration:none"><div class="brand-mark">${icon('serveur',28)}</div><div><b id="brandName"></b><small id="brandSub"></small></div></a>
  <nav class="nav" id="nav"></nav>
  <div class="rail-foot"><div class="online" id="online"></div><span class="live off" id="live"><i></i><span>Connexion…</span></span></div></aside>
  <div class="main"><header class="topbar"><button class="btn ghost icon menu-btn" id="menuBtn" aria-label="Menu">${ui('menu')}</button><span class="crumb" id="crumb"></span><span class="sp"></span>
  <a class="callpill" id="callPill" href="#appel" hidden></a>
  <button class="btn sm primary" id="installBtn" hidden onclick="installApp()">${ui('download',15)} Installer l'app</button>
  <div class="bell" id="bellHost"><button class="btn ghost icon" id="bellBtn" aria-label="Notifications">${ui('bell')}<span class="count" id="bellCount" hidden></span></button></div>
  <button class="btn ghost" id="meBtn"></button></header>
  <main class="content"><div id="view" class="view wrap"></div></main></div></div>
  <div class="scrim" id="scrim"></div><nav class="tabbar" id="tabbar" aria-label="Navigation principale"></nav>`);
  $('#scrim').onclick=()=>$('#rail').classList.remove('open');
  $('#menuBtn').onclick=()=>$('#rail').classList.toggle('open');$('#bellBtn').onclick=toggleBell;
  $('#meBtn').onclick=meMenu;
 }
 updateShellBits();setLive(LIVE);
}
function updateShellBits(){
 if(!ME||!$('#nav'))return;const u=unread().length;
 const mineOpen=arr('tasks').filter(t=>t.owner===ME.id&&!isDone(t.status)).length;
 const chatN=typeof chatUnread==='function'?chatUnread():0;const inCall=typeof callPeople==='function'?callPeople().length:0;
 const badge=r=>r==='taches'&&mineOpen?`<span class="badge" title="Tes tâches ouvertes">${mineOpen}</span>`:r==='chat'&&chatN?`<span class="badge hot" title="Messages non lus">${chatN>99?'99+':chatN}</span>`:r==='appel'&&inCall?`<span class="badge live-b" title="En appel">${inCall}</span>`:'';
 $('#nav').innerHTML=NAV.map(([r,l,i])=>`<a href="#${r}" data-r="${r}" class="${r===CUR?'active':''}">${ui(i)}<span>${l}</span>${badge(r)}</a>`).join('');
 const P=plotInfo();const bn=$('#brandName');if(bn){bn.textContent=P.name;$('#brandSub').textContent=`${P.promo?P.promo+' · ':'BTS SIO SISR · '}${P.net||''}`;document.title=P.name}
 const tb=$('#tabbar');if(tb){const T=[['accueil','Accueil','home'],['chat','Discussion','chat'],['appel','Appel','phone'],['fichiers','Fichiers','folder']];const more=!T.some(t=>t[0]===CUR);
  tb.innerHTML=T.map(([r,l,i])=>`<a href="#${r}" class="${r===CUR?'on':''}" ${r==='chat'?`onclick="if(CUR==='chat'&&isMob()&&!CH.list){event.preventDefault();backToRooms()}"`:''}>${ui(i,22)}<span>${l}</span>${badge(r)}</a>`).join('')+`<button type="button" class="${more?'on':''}" onclick="$('#rail').classList.add('open')">${ui('menu',22)}<span>Plus</span>${(mineOpen&&!more)?'<i class="dotb"></i>':''}</button>`}
 const bc=$('#bellCount');bc.hidden=!u;bc.textContent=u>9?'9+':u;
 $('#meBtn').innerHTML=`${avatar(ME.name,ME.color)}<span class="small" style="font-weight:600">${esc(ME.name)}</span>`;
 const on=$('#online');if(on)on.innerHTML=`<div class="tiny" style="color:var(--rail-muted);margin-bottom:8px">Le groupe</div>`+members().map(m=>`<span class="on-m ${presCls(m.id)}" title="${esc(m.name)} · ${presLabel(m.id)}">${avatar(m.name,m.color)}<i></i></span>`).join('');
 if(typeof callPillUpdate==='function')callPillUpdate();
}

/* ===================== Statuts ===================== */
const TASK_ST=[['todo','À faire','#8a96ad'],['doing','En cours','#2d5bd8'],['review','À vérifier','#d9822b'],['fix','Bloqué','#c23b3b'],['done','Terminé','#16875f']];
const PRIO=[['haute','Haute'],['moyenne','Moyenne'],['basse','Basse']];
const isDone=s=>s==='done';
const stL=(a,v)=>(a.find(x=>x[0]===v)||[,v])[1];
const memberOpts=()=>[{v:'',l:'— Non attribué'},...members().map(m=>({v:m.id,l:m.name+(m.role?' — '+m.role:'')})),{v:'all',l:'Tout le groupe'}];

/* Remplit Firestore avec les données de départ du Plot 7 au tout premier lancement */
async function seedFirestoreIfEmpty(){try{const m=await ref('meta').doc('plot').get();if(m.exists){setTimeout(ensureSpaceRegistered,1500);return}if(SPACE!=='p7'){missingSpace();return}
 const seed=await (await fetch('seed.json')).json();let b=DBH.batch(),n=0;
 for(const [col,docs] of Object.entries(seed))for(const [id,data] of Object.entries(docs)){b.set(ref(col).doc(id),data);if(++n%400===0){await b.commit();b=DBH.batch()}}
 await b.commit();toast('Espace initialisé.');setTimeout(ensureSpaceRegistered,1500)}catch(e){console.error(e);toast('Impossible d\'initialiser la base ('+(e.code||e.message)+').','bad')}}

/* ===================== Application installable ===================== */
let INSTALL=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();INSTALL=e;const b=$('#installBtn');if(b)b.hidden=false});
window.addEventListener('appinstalled',()=>{INSTALL=null;const b=$('#installBtn');if(b)b.hidden=true;toast('Application installée.')});
async function installApp(){if(INSTALL){INSTALL.prompt();const r=await INSTALL.userChoice;if(r.outcome==='accepted'){INSTALL=null;$('#installBtn').hidden=true}return}installHelp()}
function installHelp(){openModal('Installer le site comme une application',`<ol class="steps big-steps">
 <li><b>Ordinateur (Chrome ou Edge) :</b> clique sur l'icône ${ui('download',14)} « Installer » à droite de la barre d'adresse, ou menu ⋮ › « Caster, enregistrer et partager » › « Installer la page en tant qu'application ».</li>
 <li><b>Android (Chrome) :</b> menu ⋮ › « Installer l'application » (ou « Ajouter à l'écran d'accueil »).</li>
 <li><b>iPhone / iPad (Safari) :</b> bouton Partager › « Sur l'écran d'accueil ».</li></ol>
 <p class="small muted">L'application s'ouvre dans sa propre fenêtre, avec son icône. Elle se met à jour toute seule quand le site change.</p>${isStandalone()?'<p class="small"><b>Tu utilises déjà l\'application installée.</b></p>':''}`)}

/* ===================== Espaces (promos / plots) ===================== */
function switchSpace(id){if(!id||id===SPACE)return;if(typeof leaveCall==='function')leaveCall();ls.set('p7-space',id);location.href=location.pathname}
function spacesModal(){const L=[...SPACES.values()];if(!SPACES.has(SPACE))L.unshift({id:SPACE,name:plotInfo().name,promo:plotInfo().promo});
 const o=openModal('Espaces (promos et plots)',`<p class="small muted" style="margin-top:0">Chaque espace a ses propres membres, tâches, discussions, fichiers et schéma. Rien n'est mélangé.</p><ul class="list">${L.map(x=>`<li><span><b>${esc(x.name)}</b>${x.promo?`<span class="tiny muted"> · ${esc(x.promo)}</span>`:''}</span>${x.id===SPACE?'<span class="chip ok">Ouvert</span>':`<button class="btn sm" onclick="switchSpace('${esc(x.id)}')">Ouvrir</button>`}</li>`).join('')}</ul><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" onclick="newSpace()">${ui('plus',16)} Nouvel espace</button></div>`)}
const PAL=['#2d5bd8','#d9822b','#8b4fd1','#1f9d74','#c23b3b','#0e8fa3','#b5486f','#6b7280'];
function newSpace(){if(!DBH||LOCAL)return toast('Il faut la base partagée pour créer un espace.','bad');
 openForm({title:'Nouvel espace (promo ou plot)',values:{promo:'BTS SIO SISR',num:''},fields:[{k:'name',label:'Nom de l\'espace',placeholder:'Ex. Plot 3',wide:true},{k:'promo',label:'Promo',placeholder:'Ex. BTS SIO SISR · 1re année 2026-2027'},{k:'num',label:'Numéro du plot',type:'number',hint:'Sert aux adresses : 10.113.N.x'},{k:'members',label:'Membres (un prénom par ligne)',type:'textarea',rows:4,wide:true}],
 onSave:async v=>{const name=v.name||'Nouvel espace';const n=parseInt(v.num)||0;const names=v.members.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);if(!names.length)return toast('Ajoute au moins un membre.','bad');
  toast('Création de l\'espace…');try{
  const id=(slug(name).replace(/-/g,'').slice(0,10)||'esp')+Math.random().toString(36).slice(2,5);
  let txt=await (await fetch('seed.json',{cache:'no-store'})).text();
  if(n)txt=txt.split('10.113.7.').join(`10.113.${n}.`).split('192.168.7.').join(`192.168.${n}.`).split('P7-').join(`P${n}-`).split('FW-P7').join(`FW-P${n}`);
  txt=txt.split('Plot virtuel 7').join(name);const seed=JSON.parse(txt);const T=Date.now();(seed.sites?.plot7?.eq||[]).forEach(e=>{if(e.type==='serveur')e.notes=''});
  seed.meta.members={list:names.map((x,i)=>({id:'p'+(i+1),name:x,role:'',color:PAL[i%PAL.length]})),updatedAt:T,updatedBy:ME?.name||names[0]};
  seed.meta.plot={...seed.meta.plot,name,promo:v.promo,num:n||null,net:n?`10.113.${n}.x/16`:seed.meta.plot.net,createdAt:T};
  seed.meta.pve={host:n?`10.113.${n}.1`:'',port:8006,target:n?`10.113.${n}.1`:''};
  seed.activity={a0:{who:ME?.name||names[0],color:ME?.color||PAL[0],verb:'a créé',label:`l'espace ${name}`,route:'accueil',ts:T}};
  let b=DBH.batch(),k=0;for(const [col,docs] of Object.entries(seed))for(const [did,data] of Object.entries(docs)){b.set(DBH.collection(id+'_'+col).doc(did),data);if(++k%400===0){await b.commit();b=DBH.batch()}}
  await b.commit();await DBH.collection('spaces').doc(id).set({name,promo:v.promo,plot:n||null,createdAt:T,by:ME?.name||''});
  switchSpace(id)}catch(e){console.error(e);toast('Création impossible ('+(e.code||e.message)+').','bad')}}})}
async function ensureSpaceRegistered(){if(!FIRE)return;try{const r=DBH.collection('spaces').doc(SPACE);const s=await r.get();if(!s.exists){const P=plotInfo();await r.set({name:P.name,promo:P.promo||'BTS SIO SISR',plot:P.num||(SPACE==='p7'?7:null),createdAt:Date.now()})}}catch(e){}}
function missingSpace(){const box=$('#whoGrid')||$('#view');if(!box)return;box.innerHTML=`<div class="empty small" style="color:inherit">Cet espace n'existe pas ou a été supprimé.<br><button class="btn sm" style="margin-top:10px" onclick="ls.set('p7-space','p7');location.href=location.pathname">Revenir au Plot virtuel 7</button></div>`}

/* Bibliothèques chargées seulement quand on en a besoin (site plus rapide à ouvrir) */
const LIBS={jspdf:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',jszip:'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'};
function need(k){if((k==='jspdf'&&window.jspdf)||(k==='jszip'&&window.JSZip))return Promise.resolve();return new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=LIBS[k];sc.onload=res;sc.onerror=rej;document.head.appendChild(sc)})}

/* Téléphone : cacher la barre du bas quand le clavier est ouvert */
document.addEventListener('focusin',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))document.body.classList.add('kb')});
document.addEventListener('focusout',()=>setTimeout(()=>{if(!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))document.body.classList.remove('kb')},120));

/* ===================== Photo de profil ===================== */
function meMenu(){const o=openModal('Mon profil',`<div class="me-box"><label class="me-pic" title="Changer ma photo">${avatar(ME.name,ME.color,'xl')}<span class="me-cam">${ui('image',16)}</span><input type="file" accept="image/*" hidden onchange="setPhoto(ME.id,this.files[0])"></label>
 <div><h3 style="margin:0">${esc(ME.name)}</h3><p class="small muted" style="margin:4px 0 12px">Touche ta photo pour la changer.</p><div class="row" style="gap:8px">${members().find(m=>m.id===ME.id)?.photo?`<button class="btn sm" onclick="setPhoto(ME.id,null)">${ui('trash',14)} Retirer la photo</button>`:''}<button class="btn sm" id="switchMe">Changer d'identité</button><button class="btn sm" id="lockDev">${ui('close',14)} Verrouiller cet appareil</button></div></div></div>`);
 $('#lockDev',o).onclick=lockDevice;$('#switchMe',o).onclick=async()=>{closeModal();if(typeof leaveCall==='function')await leaveCall();await goOffline();ss.set(KEY('me'),null);ME=null;location.reload()}}
/* recadre au centre en 160×160, JPEG léger (~10 Ko), stocké avec le membre */
function squarePhoto_unused(file){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const S=160,c=document.createElement('canvas');c.width=c.height=S;const k=Math.min(img.width,img.height);c.getContext('2d').drawImage(img,(img.width-k)/2,(img.height-k)/2,k,k,0,0,S,S);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',0.82))};img.onerror=()=>{URL.revokeObjectURL(u);rej()};img.src=u})}
async function setPhoto(id,file){if(file){if(!/^image\//.test(file.type))return toast('Choisis une image.','bad');return openCropper(id,file)}
 const L=clone(members());const m=L.find(x=>x.id===id);if(!m)return;delete m.photo;closeModal();await put('meta','members',{list:L},['a retiré sa photo de profil','','equipe']);toast('Photo retirée.');renderShell()}
async function savePhoto(id,data){const L=clone(members());const m=L.find(x=>x.id===id);if(!m)return;m.photo=data;closeModal();
 await put('meta','members',{list:L},[id===ME.id?'a changé sa photo de profil':`a changé la photo de ${m.name}`,'','equipe']);toast('Photo mise à jour.');renderShell()}

/* Recadrage : glisser pour déplacer, pincer / molette / curseur pour zoomer, bouton pour pivoter */
function openCropper(id,file){const img=new Image();const url=URL.createObjectURL(file);
 img.onerror=()=>{URL.revokeObjectURL(url);toast('Image illisible.','bad')};
 img.onload=()=>{const S=300;const C={rot:0,z:1,x:0,y:0};
  const o=openModal('Recadrer la photo',`<div class="crop-wrap"><div class="crop-stage" id="cropStage"><canvas id="cropCv"></canvas><div class="crop-mask"></div></div>
   <div class="crop-tools"><button type="button" class="btn icon" id="cZo" title="Dézoomer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
   <input type="range" id="cZ" min="1" max="5" step="0.01" value="1" aria-label="Zoom"><button type="button" class="btn icon" id="cZi" title="Zoomer">${ui('plus',18)}</button><button type="button" class="btn icon" id="cRot" title="Pivoter">${ui('rotate',18)}</button></div>
   <p class="tiny muted" style="text-align:center;margin:6px 0 0">Glisse la photo pour la placer · pince ou utilise le curseur pour zoomer</p>
   <footer class="row" style="margin-top:14px;justify-content:space-between"><label class="btn ghost">${ui('image',16)} Autre image<input type="file" accept="image/*" hidden id="cOther"></label><span class="row" style="gap:8px"><button type="button" class="btn" data-close2>Annuler</button><button type="button" class="btn primary" id="cSave">Enregistrer</button></span></footer></div>`);
  const cv=$('#cropCv',o),st=$('#cropStage',o),dpr=Math.min(2,window.devicePixelRatio||1);cv.width=cv.height=S*dpr;
  const dims=()=>C.rot%180?[img.height,img.width]:[img.width,img.height];
  const scale=()=>{const [w,h]=dims();return S/Math.min(w,h)*C.z};
  const clamp=()=>{const [w,h]=dims(),k=scale();const mx=Math.max(0,(w*k-S)/2),my=Math.max(0,(h*k-S)/2);C.x=Math.max(-mx,Math.min(mx,C.x));C.y=Math.max(-my,Math.min(my,C.y))};
  const draw=(ctx,size)=>{const f=size/S;ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.save();ctx.translate(size/2+C.x*f,size/2+C.y*f);ctx.rotate(C.rot*Math.PI/180);const k=scale()*f;ctx.scale(k,k);ctx.drawImage(img,-img.width/2,-img.height/2);ctx.restore()};
  const paint=()=>{clamp();draw(cv.getContext('2d'),cv.width);$('#cZ',o).value=C.z};
  const zoomTo=(z,cx=0,cy=0)=>{const nz=Math.max(1,Math.min(5,z));const r=nz/C.z;C.x=cx+(C.x-cx)*r;C.y=cy+(C.y-cy)*r;C.z=nz;paint()};
  const P=new Map();let last=null;
  st.onpointerdown=e=>{st.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});last=null};
  st.onpointermove=e=>{if(!P.has(e.pointerId))return;const prev=P.get(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});const ratio=S/st.clientWidth;
   if(P.size===1){C.x+=(e.clientX-prev.x)*ratio;C.y+=(e.clientY-prev.y)*ratio;paint()}
   else if(P.size===2){const [a,b]=[...P.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(last)zoomTo(C.z*d/last);last=d}};
  st.onpointerup=st.onpointercancel=e=>{P.delete(e.pointerId);last=null};
  st.onwheel=e=>{e.preventDefault();const r=st.getBoundingClientRect(),ratio=S/r.width;zoomTo(C.z*Math.exp(-e.deltaY*0.0015),(e.clientX-r.left)*ratio-S/2,(e.clientY-r.top)*ratio-S/2)};
  $('#cZ',o).oninput=e=>zoomTo(+e.target.value);$('#cZi',o).onclick=()=>zoomTo(C.z*1.2);$('#cZo',o).onclick=()=>zoomTo(C.z/1.2);
  $('#cRot',o).onclick=()=>{C.rot=(C.rot+90)%360;C.x=C.y=0;paint()};
  $('#cOther',o).onchange=e=>{const f=e.target.files[0];if(f){URL.revokeObjectURL(url);openCropper(id,f)}};
  $('[data-close2]',o).onclick=()=>{URL.revokeObjectURL(url);closeModal()};
  $('#cSave',o).onclick=()=>{const out=document.createElement('canvas');out.width=out.height=256;draw(out.getContext('2d'),256);URL.revokeObjectURL(url);savePhoto(id,out.toDataURL('image/jpeg',0.85))};
  paint()};
 img.src=url}


/* ===================== Verrou : mot de passe commun ===================== */
/* Le mot de passe n'est écrit nulle part dans le site : il est vérifié par Firebase Authentication,
   et les règles de la base refusent toute lecture ou écriture sans connexion. L'appareil est mémorisé 30 jours. */
const AUTH_EMAIL='equipe@plot7-turgot.app',AUTH_DAYS=30,LOCK_MAX=5,LOCK_MIN=15;
let AUTH=null,AUTHTOK='';
const lockSt=()=>{try{return JSON.parse(localStorage.getItem('p7-lk')||'{}')}catch(e){return {}}};
const lockSave=o=>{try{localStorage.setItem('p7-lk',JSON.stringify(o))}catch(e){}};
async function authGate(){AUTH=firebase.auth();try{await AUTH.setPersistence(firebase.auth.Auth.Persistence.LOCAL)}catch(e){}
 AUTH.onIdTokenChanged(u=>{if(u)u.getIdToken().then(t=>AUTHTOK=t).catch(()=>{});else AUTHTOK=''});
 const u=await new Promise(res=>{const off=AUTH.onAuthStateChanged(x=>{off();res(x)})});
 const ts=+localStorage.getItem('p7-auth-ts')||0;
 if(u&&Date.now()-ts<AUTH_DAYS*864e5){u.getIdToken().then(t=>AUTHTOK=t).catch(()=>{});return}
 if(u)await AUTH.signOut();
 await showLock()}
const padlockSvg=()=>`<svg viewBox="0 0 120 140" class="padlock" aria-hidden="true"><g class="shackle"><path d="M34 62V44a26 26 0 0 1 52 0v18" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></g><rect x="18" y="60" width="84" height="66" rx="15" fill="currentColor"/><circle cx="60" cy="89" r="8.5" fill="#0b1430"/><rect x="55.5" y="93" width="9" height="19" rx="4.5" fill="#0b1430"/></svg>`;
function showLock(){return new Promise(done=>{
 const L=document.createElement('div');L.className='lock';L.id='lock';
 L.innerHTML=`<div class="lock-card"><div class="lock-ic">${padlockSvg()}</div><h1>Accès privé</h1><p class="lock-sub" id="lkMsg">Entre le mot de passe du groupe.</p>
  <form id="lkForm" autocomplete="off"><div class="lock-field"><input id="lkPw" type="password" placeholder="Mot de passe" autocomplete="current-password" autocapitalize="off" spellcheck="false" aria-label="Mot de passe"><button type="button" id="lkEye" aria-label="Afficher le mot de passe">${ui('eye',18)}</button></div>
  <button class="btn primary lg" id="lkGo" type="submit" style="width:100%;justify-content:center">Déverrouiller</button></form>
  <p class="tiny" style="margin-top:14px;color:#8fa2d6">Cet appareil sera mémorisé ${AUTH_DAYS} jours. ${LOCK_MAX} erreurs de suite bloquent l'accès ${LOCK_MIN} minutes.</p></div>`;
 document.body.appendChild(L);
 const msg=$('#lkMsg',L),pw=$('#lkPw',L),go=$('#lkGo',L),form=$('#lkForm',L);let tm=null;
 const say=(t,cls)=>{msg.textContent=t;msg.className='lock-sub '+(cls||'')};
 const state=cls=>{L.classList.remove('bad','ok','out');if(cls)L.classList.add(cls)};
 $('#lkEye',L).onclick=()=>{pw.type=pw.type==='password'?'text':'password'};
 function checkBlock(){const s=lockSt();if(s.until&&s.until>Date.now()){state('out');pw.disabled=go.disabled=true;const tick=()=>{const r=Math.max(0,s.until-Date.now());if(r<=0){clearInterval(tm);lockSave({n:0});pw.disabled=go.disabled=false;state();say('Tu peux réessayer.');pw.focus();return}
   say(`Accès bloqué. Réessaie dans ${String(Math.floor(r/60000)).padStart(2,'0')}:${String(Math.floor(r/1000)%60).padStart(2,'0')}.`,'err')};clearInterval(tm);tick();tm=setInterval(tick,500);return true}return false}
 checkBlock();
 form.onsubmit=async e=>{e.preventDefault();if(checkBlock()||!pw.value)return;go.disabled=true;state();say('Vérification…');
  try{await AUTH.signInWithEmailAndPassword(AUTH_EMAIL,pw.value);
   try{localStorage.setItem('p7-auth-ts',String(Date.now()))}catch(e){}lockSave({n:0});state('ok');say('Bienvenue !','okc');
   setTimeout(()=>{L.style.transition='opacity .45s';L.style.opacity='0';setTimeout(()=>{L.remove();done()},450)},950)}
  catch(err){go.disabled=false;const c=err.code||'';
   if(c==='auth/network-request-failed'){say('Pas de connexion à internet.','err');return}
   const s=lockSt();let n=(s.n||0)+1;if(c==='auth/too-many-requests')n=LOCK_MAX;
   pw.value='';state('bad');setTimeout(()=>L.classList.remove('bad'),650);
   if(n>=LOCK_MAX){lockSave({n,until:Date.now()+LOCK_MIN*60000});setTimeout(checkBlock,700)}
   else{lockSave({n});say(`Mot de passe incorrect. Il te reste ${LOCK_MAX-n} essai${LOCK_MAX-n>1?'s':''}.`,'err');pw.focus()}}};
 setTimeout(()=>pw.focus(),200)})}
async function lockDevice(){try{await goOffline()}catch(e){}try{if(typeof gDisconnect==='function')await gDisconnect(true)}catch(e){}
 try{await AUTH?.signOut()}catch(e){}try{localStorage.removeItem('p7-auth-ts')}catch(e){}ss.set(KEY('me'),null);location.reload()}
