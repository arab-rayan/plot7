/* ===================== DISCUSSION ===================== */
const CHANS=[['general','Général','Tout le reste','chat','#2d5bd8'],['serveur','Serveur et VM','Proxmox, pfSense, pannes','server','#d9822b'],['cours','Cours et docs','Consignes, procédures, oral','docs','#1f9d74']];
let CH={chan:'general',list:true};
const isMob=()=>matchMedia('(max-width:860px)').matches;
const inRooms=()=>isMob()&&CH.list;                       // téléphone : liste des salons affichée
const viewing=c=>CUR==='chat'&&!document.hidden&&!inRooms()&&CH.chan===c;
const readMap=()=>ls.get(KEY('chat-read-')+(ME?.id||''),{});
const markRead=ch=>{const m=readMap();m[ch]=Date.now();ls.set(KEY('chat-read-')+ME.id,m)};
const chanUnread=ch=>{const r=readMap()[ch]||BOOT-864e5;return arr('chat').filter(m=>(m.ch||'general')===ch&&m.uid!==ME?.id&&m.ts>r).length};
function chatUnread(){if(!ME)return 0;return CHANS.reduce((s,[c])=>s+(viewing(c)?0:chanUnread(c)),0)}
function onChatAdded(m){if(!ME||m.uid===ME.id||m.ts<BOOT)return;const here=viewing(m.ch||'general');
 if(!here){const ch=CHANS.find(c=>c[0]===(m.ch||'general'));const what=m.remote?'demande de l\'aide à distance (prise en main)':m.file?'📎 '+m.file.name:trunc(m.text,80);toast(`${m.name}${ch&&ch[0]!=='general'?' (#'+ch[1]+')':''} : ${what}`,m.remote?'call':'msg','chat',m.remote?'Aider':'Répondre');notifyOS(`${m.name} · ${plotInfo().name}`,what,'chat')}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&CUR==='chat'&&ME&&!inRooms()){markRead(CH.chan);updateShellBits()}});

const linkify=s=>esc(s).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g,'<br>');
function msgsHtml(){const L=arr('chat').filter(m=>(m.ch||'general')===CH.chan).sort((a,b)=>a.ts-b.ts);
 if(!L.length)return `<div class="empty chat-empty">${ui('chat',30)}<h3>Aucun message dans #${esc(CHANS.find(c=>c[0]===CH.chan)?.[1]||'')}</h3><p>Écris le premier : il apparaîtra en direct chez les autres.</p></div>`;
 let out='',prev=null,day='';
 for(const m of L){const d=new Date(m.ts).toDateString();if(d!==day){day=d;out+=`<div class="day-sep"><span>${new Date(m.ts).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</span></div>`;prev=null}
  const u=member(m.uid);const cont=prev&&prev.uid===m.uid&&m.ts-prev.ts<5*60000;const mine=m.uid===ME.id;
  out+=`<div class="msg ${cont?'cont':''} ${mine?'mine':''}" data-id="${m.id}">${cont?`<span class="msg-t tiny">${fmtT(m.ts)}</span>`:avatar(u.name||m.name,u.color||colorOf(m.name))}<div class="msg-b">${cont?'':`<div class="msg-h"><b style="color:${u.color||'inherit'}">${esc(u.name||m.name)}</b><span class="tiny muted">${fmtT(m.ts)}</span></div>`}
   ${m.text?`<div class="msg-txt">${linkify(m.text)}</div>`:''}${m.file?attHtml(m.file):''}${m.remote?remoteHtml(m,mine):''}</div>${mine?`<button class="btn sm ghost icon msg-del" title="Supprimer" onclick="delMsg('${m.id}')">${ui('trash',14)}</button>`:''}</div>`;prev=m}
 return out}
function attHtml(f){const ok=D.files.has(f.id);const img=ok&&isImg(f)&&f.size<CHUNK;
 return `<div class="att ${img?'img':''}" onclick="${ok?`previewFile('${f.id}')`:''}">${img?`<img data-fid="${f.id}" alt="${esc(f.name)}">`:''}<span class="row" style="flex-wrap:nowrap;gap:8px">${fileIcon(f)}<span style="min-width:0"><b class="small">${esc(f.name)}</b><span class="tiny muted" style="display:block">${ok?fmtSize(f.size):'Fichier supprimé'}</span></span>${ok?`<button class="btn sm ghost icon" title="Télécharger" onclick="event.stopPropagation();downloadFile('${f.id}')">${ui('download',15)}</button>`:''}</span></div>`}
async function loadThumbs(){for(const im of $$('img[data-fid]:not([src])')){const id=im.dataset.fid;try{im.src=URL.createObjectURL(await fileBlob(id))}catch(e){}}}

const chanOf=c=>CHANS.find(x=>x[0]===c)||CHANS[0];
const lastMsg=c=>arr('chat').filter(m=>(m.ch||'general')===c).sort((a,b)=>b.ts-a.ts)[0];
const roomIco=(c,s=22)=>{const k=chanOf(c);return `<span class="room-ico" style="--rc:${k[4]}">${ui(k[3],s)}</span>`};
function roomsHtml(){return CHANS.map(([c,l,d])=>{const m=lastMsg(c),n=chanUnread(c);const who=m?(m.uid===ME.id?'Toi':(member(m.uid).name||m.name)):'';
 const txt=m?(m.remote?'demande une prise en main':m.file?'📎 '+m.file.name:m.text):d;
 return `<button class="room ${n?'unread':''}" onclick="openChan('${c}')">${roomIco(c)}<span class="room-body"><span class="room-top"><b>${esc(l)}</b><span class="tiny ${n?'room-new':'muted'}">${m?ago(m.ts):''}</span></span><span class="room-last">${m?`<b>${esc(who)} :</b> `:''}${esc(trunc(txt||'',70))}</span></span>${n?`<span class="room-badge">${n>99?'99+':n}</span>`:'<svg class="room-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>'}</button>`}).join('')}
VIEWS.chat=function(){
 if(inRooms()){
  $('#view').innerHTML=`<div class="rooms"><div class="rooms-head"><div><h1>Discussion</h1><p class="small muted">Choisis un salon</p></div><a class="btn" href="#appel">${ui('phone',16)} Appel</a></div>
   <div class="rooms-online">${members().map(m=>`<span class="ro-m" title="${esc(presLabel(m.id))}"><span class="on-m ${presCls(m.id)}">${avatar(m.name,m.color,'lg')}<i></i></span><small>${esc(m.id===ME.id?'Moi':m.name)}</small></span>`).join('')}</div>
   <div class="card room-list" id="roomList">${roomsHtml()}</div></div>`;return}
 markRead(CH.chan);const k=chanOf(CH.chan);
 $('#view').innerHTML=`<div class="chat">
  <aside class="chat-side"><h3 class="tiny muted" style="margin:4px 8px 8px;text-transform:uppercase;letter-spacing:.06em">Salons</h3>
   ${CHANS.map(([c,l,d])=>`<button class="chan ${CH.chan===c?'on':''}" onclick="setChan('${c}')">${roomIco(c,16)}<span style="flex:1;min-width:0"><b>${l}</b><small>${d}</small></span><span class="badge hot" data-cu="${c}" ${chanUnread(c)&&CH.chan!==c?'':'hidden'}>${chanUnread(c)}</span></button>`).join('')}
   <h3 class="tiny muted" style="margin:18px 8px 8px;text-transform:uppercase;letter-spacing:.06em">En ligne</h3><div id="chatOnline">${onlineList()}</div></aside>
  <section class="chat-main dropzone" id="chatDz"><header class="chat-head"><div class="row" style="gap:10px;flex-wrap:nowrap;min-width:0"><button class="btn ghost icon back-btn" onclick="backToRooms()" aria-label="Retour aux salons"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg><span class="badge hot" id="backBadge" hidden></span></button>${roomIco(CH.chan,18)}<div style="min-width:0"><b>${esc(k[1])}</b><span class="tiny muted chat-sub"> ${esc(k[2])}</span></div></div><a class="btn sm" href="#appel">${ui('phone',14)} Appel</a></header>
   <div class="msgs" id="msgs">${msgsHtml()}</div>
   <form class="composer" id="composer"><label class="btn ghost icon" title="Joindre un fichier">${ui('attach',18)}<input type="file" multiple hidden onchange="chatAttach(this.files);this.value=''"></label>
    <textarea id="msgIn" rows="1" placeholder="${isMob()?'Message':'Écris à '+esc(k[1])+'… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)'}" enterkeyhint="send"></textarea><button class="btn primary icon" title="Envoyer">${ui('send',18)}</button></form>
   <div class="drop-hint">${ui('upload',30)}<b>Dépose pour envoyer dans la discussion</b></div></section></div>`;
 const ta=$('#msgIn');const draft=ls.get(KEY('draft-')+CH.chan,'');ta.value=draft;autoGrow(ta);
 ta.oninput=()=>{autoGrow(ta);ls.set(KEY('draft-')+CH.chan,ta.value)};
 const touch=matchMedia('(pointer:coarse)').matches;ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!touch){e.preventDefault();sendMsg()}};
 ta.onpaste=e=>{const fs=[...(e.clipboardData?.files||[])];if(fs.length){e.preventDefault();chatAttach(fs)}};
 $('#composer').onsubmit=e=>{e.preventDefault();sendMsg();if(touch)ta.focus()};
 const dz=$('#chatDz');dz.ondragover=e=>{if(![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();dz.classList.add('over')};dz.ondragleave=e=>{if(!dz.contains(e.relatedTarget))dz.classList.remove('over')};dz.ondrop=e=>{e.preventDefault();dz.classList.remove('over');chatAttach([...e.dataTransfer.files])};
 bindSwipe($('#msgs'));backBadge();scrollMsgs(true);loadThumbs();if(matchMedia('(pointer:fine)').matches)ta.focus();
};
const onlineList=()=>members().filter(m=>presState(m.id)!=='off').map(m=>`<div class="row small" style="gap:8px;padding:4px 8px;flex-wrap:nowrap" title="${esc(presLabel(m.id))}"><span class="on-m ${presCls(m.id)}">${avatar(m.name,m.color)}<i></i></span>${esc(m.name)}${callPeople().some(p=>p.uid===m.id)?` <span class="tiny" style="color:var(--ok)">${ui('phone',12)}</span>`:''}</div>`).join('');
function autoGrow(t){t.style.height='auto';t.style.height=Math.min(180,t.scrollHeight)+'px'}
function scrollMsgs(force){const b=$('#msgs');if(!b)return;if(force||b.scrollHeight-b.scrollTop-b.clientHeight<160)b.scrollTop=b.scrollHeight}
function chatLive(){if(inRooms()){const r=$('#roomList');if(r)r.innerHTML=roomsHtml();else renderView();return}
 const b=$('#msgs');if(!b){renderView();return}const near=b.scrollHeight-b.scrollTop-b.clientHeight<160;b.innerHTML=msgsHtml();if(near)b.scrollTop=b.scrollHeight;loadThumbs();
 if(!document.hidden)markRead(CH.chan);CHANS.forEach(([c])=>{const n=chanUnread(c);$$(`[data-cu="${c}"]`).forEach(el=>{el.hidden=!n||c===CH.chan;el.textContent=n})});backBadge();const o=$('#chatOnline');if(o)o.innerHTML=onlineList()}
function backBadge(){const el=$('#backBadge');if(!el)return;const n=CHANS.reduce((s,[c])=>s+(c===CH.chan?0:chanUnread(c)),0);el.hidden=!n;el.textContent=n}
function setChan(c){CH.chan=c;renderView();updateShellBits()}
/* Téléphone : liste des salons → conversation, avec retour (bouton, geste ou bouton Retour du téléphone) */
function openChan(c){CH.chan=c;CH.list=false;try{history.pushState({p7chat:1},'',location.href)}catch(e){}renderView();updateShellBits()}
function backToRooms(){if(history.state?.p7chat){history.back();return}CH.list=true;renderView();updateShellBits()}
addEventListener('popstate',()=>{if(CUR==='chat'&&isMob()&&!CH.list){CH.list=true;renderView();updateShellBits()}});
async function sendMsg(extra){const ta=$('#msgIn');const text=(ta?.value||'').trim();if(!text&&!extra)return;
 const m={uid:ME.id,name:ME.name,text:extra?(extra.text||''):text,ch:CH.chan,ts:Date.now(),...(extra?.file?{file:extra.file}:{}),...(extra?.remote?{remote:extra.remote}:{})};
 if(!extra){ta.value='';autoGrow(ta);ls.set(KEY('draft-')+CH.chan,'')}
 const id=uid('m');D.chat.set(id,{id,...m});chatLive();scrollMsgs(true);
 try{await ref('chat').doc(id).set(m)}catch(e){D.chat.delete(id);chatLive();deny(e)}}
async function chatAttach(files){files=[...files];if(!files.length||LOCAL)return;const ch=CH.chan;
 for(const f of files){toast(`Envoi de ${f.name}…`);const meta=await uploadOne(f,'Discussion',true);if(meta)await sendMsg({file:{id:meta.id,name:meta.name,size:meta.size,type:meta.type}});setTimeout(uplRefresh,4200)}
 CH.chan=ch}
async function delMsg(id){if(!await confirmBox('Supprimer ce message pour tout le monde ?'))return;D.chat.delete(id);chatLive();ref('chat').doc(id).delete().catch(deny)}
const remoteHtml=(m,mine)=>{const c=(m.remote.code||'').replace(/(\d{4})(?=\d)/g,'$1 ');const old=Date.now()-m.ts>5*60000;return `<div class="att remote"><div class="row" style="gap:10px;flex-wrap:nowrap">${ui('terminal',20)}<div><b class="small">${mine?'Tu demandes':'Demande'} une prise en main à distance</b><div class="mono" style="font-size:16px;letter-spacing:.06em">${esc(c)}</div><span class="tiny muted">${old?'Code expiré (plus de 5 min) : redemande-en un.':'Code valable 5 minutes.'}</span></div></div>${!mine&&!old?`<button class="btn sm primary" style="margin-top:8px" onclick="giveRemote('${esc(m.remote.code)}')">${ui('ext',14)} Prendre la main</button>`:''}</div>`};
/* Glisser vers la droite dans une conversation : retour à la liste des salons (téléphone) */
function bindSwipe(el){if(!el)return;let x0=null,y0=null;el.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
 el.addEventListener('touchend',e=>{if(x0==null||!isMob())return;const t=e.changedTouches[0];const dx=t.clientX-x0,dy=t.clientY-y0;x0=null;if(dx>80&&Math.abs(dy)<Math.abs(dx)*0.5)backToRooms()},{passive:true})}
