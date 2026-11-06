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
const PREFIX_DB=(new URLSearchParams(location.search).get('ns')||'p7').replace(/[^a-z0-9]/gi,'')+'_';
const COLS=['tasks','events','sites','meta','activity','chat','files','folders','presence','callpeers'];
const D={};COLS.forEach(c=>D[c]=new Map());
let FIRE=false,DBH=null,LIVE=false,FIRST=new Set(),BOOT=Date.now(),LOCAL=false;
const arr=c=>[...D[c].values()];
const members=()=>D.meta.get('members')?.list||DEFAULT_MEMBERS;
const member=id=>id==='all'?{id:'all',name:'Tout le groupe',color:'#64748b',role:''}:(members().find(m=>m.id===id)||{id:'',name:'Non attribué',color:'#94a3b8',role:''});
const initials=n=>(n||'?').replace(/\(.*\)/,'').split(/\s+/).filter(x=>/[\p{L}\d]/u.test(x[0]||'')).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'?';
const avatar=(name,color,cls='')=>`<span class="avatar ${cls}" style="background:${color||'#64748b'}" title="${esc(name)}">${esc(initials(name))}</span>`;
const who=id=>{const m=member(id);return `<span class="who">${avatar(m.name,m.color)}${esc(m.name)}</span>`};
const colorOf=name=>{const m=members().find(x=>x.name===name);if(m)return m.color;let h=0;for(const c of name||'')h=(h*31+c.charCodeAt(0))%360;return `hsl(${h} 55% 48%)`};
const pveCfg=()=>({...DEFAULT_PVE,...(D.meta.get('pve')||{})});

async function initStore(){
 try{if(window.FIREBASE_CONFIG&&window.firebase){if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);DBH=firebase.firestore();try{DBH.settings({experimentalForceLongPolling:true,merge:true})}catch(e){}FIRE=true}}catch(e){console.error(e);DBH=null}
 if(!DBH){LOCAL=true;localStoreInit()}
 COLS.forEach(subscribe);
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
 const listeners={};const data=ls.get('p7-local-db',{});
 const persist=()=>ls.set('p7-local-db',data);
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
let ME=ls.get('p7-me',null);
let GATE_ENTER=null;
function renderGate(){const box=$('#whoGrid');if(!box||!GATE_ENTER)return;
 const sig=JSON.stringify(members().map(m=>[m.id,m.name,m.role,m.color]));if(box.dataset.sig===sig)return;box.dataset.sig=sig;
 box.innerHTML=members().map(m=>`<button class="who-btn" data-id="${m.id}">${avatar(m.name,m.color,'lg')}<span><b>${esc(m.name)}</b><small>${esc(m.role||'Plot virtuel 7')}</small></span></button>`).join('');
 $$('.who-btn',box).forEach(b=>b.onclick=()=>{const m=members().find(x=>x.id===b.dataset.id);GATE_ENTER({name:m.name,id:m.id,color:m.color})})}
function syncMe(){if(!ME?.id)return;const m=members().find(x=>x.id===ME.id);if(m&&(m.name!==ME.name||m.color!==ME.color)){ME={...ME,name:m.name,color:m.color};ls.set('p7-me',ME)}}
function gate(){
 const g=document.createElement('div');g.className='gate';g.id='gate';
 g.innerHTML=`<div class="gate-card"><div class="row" style="gap:12px"><div class="brand-mark">${icon('serveur',30)}</div><div><div class="eyebrow" style="color:#9fb0dd">BTS SIO SISR · Lycée Turgot</div><h1>Plot virtuel 7</h1></div></div>
 <p>L'espace de travail du plot : le serveur Proxmox, l'infrastructure, les tâches, la discussion, les fichiers et les appels. Clique sur ton nom pour entrer.</p>
 <div class="who-grid" id="whoGrid"></div>
 <p class="tiny" style="margin-top:14px">Les changements sont visibles en direct par tout le groupe.</p></div>`;
 document.body.appendChild(g);
 const enter=(m)=>{ME=m;ls.set('p7-me',m);g.style.transition='opacity .35s';g.style.opacity='0';setTimeout(()=>g.remove(),350);renderShell();route();if(typeof beat==='function')beat();if(!ls.get('p7-seen-'+m.id,0))ls.set('p7-seen-'+m.id,Date.now()-7*864e5)};
 GATE_ENTER=enter;renderGate();
}

/* ===================== Présence (qui est en ligne) ===================== */
let BEAT=null;
async function beat(){if(!ME||!DBH||document.hidden)return;try{await ref('presence').doc(ME.id).set({name:ME.name,color:ME.color,ts:Date.now(),page:CUR})}catch(e){}}
function startPresence(){if(BEAT)return;beat();BEAT=setInterval(beat,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)beat()})}
const isOnline=id=>{const p=D.presence.get(id);return p&&Date.now()-p.ts<150000};

/* ===================== Notifications ===================== */
const seenKey=()=>'p7-seen-'+(ME?.id||'');
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
const NAV=[['accueil','Accueil','home'],['serveur','Serveur Proxmox','server'],['infra','Infrastructure','map'],['taches','Tâches et planning','tasks'],['chat','Discussion','chat'],['fichiers','Fichiers','folder'],['appel','Appel','phone'],['equipe','Équipe','team']];
const VIEWS={};let CUR='accueil',renderPending=false,deferRender=false;
function route(){if(typeof tipHide==='function')tipHide();const h=(location.hash||'').slice(1);const prev=CUR;CUR=VIEWS[h]?h:'accueil';if(prev!==CUR&&typeof onLeave==='function')onLeave(prev);$('#rail')?.classList.remove('open');$$('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.r===CUR));
 const c=$('#crumb');if(c)c.textContent=NAV.find(n=>n[0]===CUR)?.[1]||'';$('.content')?.classList.toggle('full',CUR==='infra'||CUR==='serveur');$('.content')?.classList.toggle('flush',CUR==='chat');
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
  <div class="brand"><div class="brand-mark">${icon('serveur',28)}</div><div><b>Plot virtuel 7</b><small>BTS SIO SISR · 10.113.7.x</small></div></div>
  <nav class="nav" id="nav"></nav>
  <div class="rail-foot"><div class="online" id="online"></div><span class="live off" id="live"><i></i><span>Connexion…</span></span></div></aside>
  <div class="main"><header class="topbar"><button class="btn ghost icon menu-btn" id="menuBtn" aria-label="Menu">${ui('menu')}</button><span class="crumb" id="crumb"></span><span class="sp"></span>
  <a class="callpill" id="callPill" href="#appel" hidden></a>
  <button class="btn sm primary" id="installBtn" hidden onclick="installApp()">${ui('download',15)} Installer l'app</button>
  <div class="bell" id="bellHost"><button class="btn ghost icon" id="bellBtn" aria-label="Notifications">${ui('bell')}<span class="count" id="bellCount" hidden></span></button></div>
  <button class="btn ghost" id="meBtn"></button></header>
  <main class="content"><div id="view" class="view wrap"></div></main></div></div>`);
  $('#menuBtn').onclick=()=>$('#rail').classList.toggle('open');$('#bellBtn').onclick=toggleBell;
  $('#meBtn').onclick=async()=>{if(await confirmBox(`Tu es connecté en tant que ${ME.name}. Changer d'identité ?`,'Changer')){if(typeof leaveCall==='function')await leaveCall();ls.set('p7-me',null);ME=null;location.reload()}};
 }
 updateShellBits();setLive(LIVE);
}
function updateShellBits(){
 if(!ME||!$('#nav'))return;const u=unread().length;
 const mineOpen=arr('tasks').filter(t=>t.owner===ME.id&&!isDone(t.status)).length;
 const chatN=typeof chatUnread==='function'?chatUnread():0;const inCall=typeof callPeople==='function'?callPeople().length:0;
 const badge=r=>r==='taches'&&mineOpen?`<span class="badge" title="Tes tâches ouvertes">${mineOpen}</span>`:r==='chat'&&chatN?`<span class="badge hot" title="Messages non lus">${chatN>99?'99+':chatN}</span>`:r==='appel'&&inCall?`<span class="badge live-b" title="En appel">${inCall}</span>`:'';
 $('#nav').innerHTML=NAV.map(([r,l,i])=>`<a href="#${r}" data-r="${r}" class="${r===CUR?'active':''}">${ui(i)}<span>${l}</span>${badge(r)}</a>`).join('');
 const bc=$('#bellCount');bc.hidden=!u;bc.textContent=u>9?'9+':u;
 $('#meBtn').innerHTML=`${avatar(ME.name,ME.color)}<span class="small" style="font-weight:600">${esc(ME.name)}</span>`;
 const on=$('#online');if(on)on.innerHTML=`<div class="tiny" style="color:var(--rail-muted);margin-bottom:8px">Le groupe</div>`+members().map(m=>`<span class="on-m ${isOnline(m.id)||m.id===ME.id?'is-on':''}" title="${esc(m.name)} · ${isOnline(m.id)||m.id===ME.id?'en ligne':'hors ligne'}">${avatar(m.name,m.color)}<i></i></span>`).join('');
 if(typeof callPillUpdate==='function')callPillUpdate();
}

/* ===================== Statuts ===================== */
const TASK_ST=[['todo','À faire','#8a96ad'],['doing','En cours','#2d5bd8'],['review','À vérifier','#d9822b'],['fix','Bloqué','#c23b3b'],['done','Terminé','#16875f']];
const PRIO=[['haute','Haute'],['moyenne','Moyenne'],['basse','Basse']];
const isDone=s=>s==='done';
const stL=(a,v)=>(a.find(x=>x[0]===v)||[,v])[1];
const memberOpts=()=>[{v:'',l:'— Non attribué'},...members().map(m=>({v:m.id,l:m.name+(m.role?' — '+m.role:'')})),{v:'all',l:'Tout le groupe'}];

/* Remplit Firestore avec les données de départ du Plot 7 au tout premier lancement */
async function seedFirestoreIfEmpty(){try{const m=await ref('meta').doc('plot').get();if(m.exists)return;
 const seed=await (await fetch('seed.json')).json();let b=DBH.batch(),n=0;
 for(const [col,docs] of Object.entries(seed))for(const [id,data] of Object.entries(docs)){b.set(ref(col).doc(id),data);if(++n%400===0){await b.commit();b=DBH.batch()}}
 await b.commit();toast('Espace du Plot 7 initialisé.')}catch(e){console.error(e);toast('Impossible d\'initialiser la base ('+(e.code||e.message)+').','bad')}}

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
