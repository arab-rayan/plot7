/* ===================== DISCUSSION ===================== */
const CHANS=[['general','Général','Tout le reste'],['serveur','Serveur et VM','Proxmox, pfSense, pannes'],['cours','Cours et docs','Consignes, procédures, oral']];
let CH={chan:'general'};
const readMap=()=>ls.get(KEY('chat-read-')+(ME?.id||''),{});
const markRead=ch=>{const m=readMap();m[ch]=Date.now();ls.set(KEY('chat-read-')+ME.id,m)};
const chanUnread=ch=>{const r=readMap()[ch]||BOOT-864e5;return arr('chat').filter(m=>(m.ch||'general')===ch&&m.uid!==ME?.id&&m.ts>r).length};
function chatUnread(){if(!ME)return 0;return CHANS.reduce((s,[c])=>s+(CUR==='chat'&&CH.chan===c&&!document.hidden?0:chanUnread(c)),0)}
function onChatAdded(m){if(!ME||m.uid===ME.id||m.ts<BOOT)return;const here=CUR==='chat'&&CH.chan===(m.ch||'general')&&!document.hidden;
 if(!here){const ch=CHANS.find(c=>c[0]===(m.ch||'general'));const what=m.remote?'demande de l\'aide à distance (prise en main)':m.file?'📎 '+m.file.name:trunc(m.text,80);toast(`${m.name}${ch&&ch[0]!=='general'?' (#'+ch[1]+')':''} : ${what}`,m.remote?'call':'msg','chat',m.remote?'Aider':'Répondre');notifyOS(`${m.name} · ${plotInfo().name}`,what,'chat')}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&CUR==='chat'&&ME){markRead(CH.chan);updateShellBits()}});

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

VIEWS.chat=function(){
 markRead(CH.chan);
 const online=members().filter(m=>isOnline(m.id)||m.id===ME.id);
 $('#view').innerHTML=`<div class="chat">
  <aside class="chat-side"><h3 class="tiny muted" style="margin:4px 8px 8px;text-transform:uppercase;letter-spacing:.06em">Salons</h3>
   ${CHANS.map(([c,l,d])=>`<button class="chan ${CH.chan===c?'on':''}" onclick="setChan('${c}')"><span class="hash">#</span><span style="flex:1;min-width:0"><b>${l}</b><small>${d}</small></span><span class="badge hot" data-cu="${c}" ${chanUnread(c)&&CH.chan!==c?'':'hidden'}>${chanUnread(c)}</span></button>`).join('')}
   <h3 class="tiny muted" style="margin:18px 8px 8px;text-transform:uppercase;letter-spacing:.06em">En ligne</h3><div id="chatOnline">${onlineList()}</div></aside>
  <section class="chat-main dropzone" id="chatDz"><header class="chat-head"><div><b># ${esc(CHANS.find(c=>c[0]===CH.chan)[1])}</b><span class="tiny muted"> · ${esc(CHANS.find(c=>c[0]===CH.chan)[2])}</span></div><div class="row" style="gap:6px"><a class="btn sm" href="#appel">${ui('phone',14)} Appel</a></div></header>
   <div class="chan-tabs" role="tablist">${CHANS.map(([c,l])=>`<button role="tab" class="${CH.chan===c?'on':''}" onclick="setChan('${c}')"># ${l}<span class="badge hot" data-cu2="${c}" ${chanUnread(c)&&CH.chan!==c?'':'hidden'}>${chanUnread(c)}</span></button>`).join('')}</div>
   <div class="msgs" id="msgs">${msgsHtml()}</div>
   <form class="composer" id="composer"><label class="btn ghost icon" title="Joindre un fichier">${ui('attach',18)}<input type="file" multiple hidden onchange="chatAttach(this.files);this.value=''"></label>
    <textarea id="msgIn" rows="1" placeholder="${matchMedia('(max-width:860px)').matches?'Message #'+esc(CHANS.find(c=>c[0]===CH.chan)[1]):'Écris à #'+esc(CHANS.find(c=>c[0]===CH.chan)[1])+'… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)'}" enterkeyhint="send"></textarea><button class="btn primary icon" title="Envoyer">${ui('send',18)}</button></form>
   <div class="drop-hint">${ui('upload',30)}<b>Dépose pour envoyer dans la discussion</b></div></section></div>`;
 const ta=$('#msgIn');const draft=ls.get(KEY('draft-')+CH.chan,'');ta.value=draft;autoGrow(ta);
 ta.oninput=()=>{autoGrow(ta);ls.set(KEY('draft-')+CH.chan,ta.value)};
 const touch=matchMedia('(pointer:coarse)').matches;ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!touch){e.preventDefault();sendMsg()}};
 ta.onpaste=e=>{const fs=[...(e.clipboardData?.files||[])];if(fs.length){e.preventDefault();chatAttach(fs)}};
 $('#composer').onsubmit=e=>{e.preventDefault();sendMsg();if(touch)ta.focus()};
 const dz=$('#chatDz');dz.ondragover=e=>{if(![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();dz.classList.add('over')};dz.ondragleave=e=>{if(!dz.contains(e.relatedTarget))dz.classList.remove('over')};dz.ondrop=e=>{e.preventDefault();dz.classList.remove('over');chatAttach([...e.dataTransfer.files])};
 bindSwipe($('#msgs'));scrollMsgs(true);loadThumbs();if(matchMedia('(pointer:fine)').matches)ta.focus();
};
const onlineList=()=>members().filter(m=>presState(m.id)!=='off').map(m=>`<div class="row small" style="gap:8px;padding:4px 8px;flex-wrap:nowrap" title="${esc(presLabel(m.id))}"><span class="on-m ${presCls(m.id)}">${avatar(m.name,m.color)}<i></i></span>${esc(m.name)}${callPeople().some(p=>p.uid===m.id)?` <span class="tiny" style="color:var(--ok)">${ui('phone',12)}</span>`:''}</div>`).join('');
function autoGrow(t){t.style.height='auto';t.style.height=Math.min(180,t.scrollHeight)+'px'}
function scrollMsgs(force){const b=$('#msgs');if(!b)return;if(force||b.scrollHeight-b.scrollTop-b.clientHeight<160)b.scrollTop=b.scrollHeight}
function chatLive(){const b=$('#msgs');if(!b){renderView();return}const near=b.scrollHeight-b.scrollTop-b.clientHeight<160;b.innerHTML=msgsHtml();if(near)b.scrollTop=b.scrollHeight;loadThumbs();
 if(!document.hidden)markRead(CH.chan);CHANS.forEach(([c])=>{const n=chanUnread(c);$$(`[data-cu="${c}"],[data-cu2="${c}"]`).forEach(el=>{el.hidden=!n||c===CH.chan;el.textContent=n})});const o=$('#chatOnline');if(o)o.innerHTML=onlineList()}
function setChan(c){CH.chan=c;renderView();updateShellBits();$('.chan-tabs .on')?.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'})}
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
/* Glisser à gauche / à droite sur les messages pour changer de salon (téléphone) */
function bindSwipe(el){if(!el)return;let x0=null,y0=null;el.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
 el.addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0];const dx=t.clientX-x0,dy=t.clientY-y0;x0=null;if(Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*0.6)return;const i=CHANS.findIndex(c=>c[0]===CH.chan);const j=i+(dx<0?1:-1);if(j>=0&&j<CHANS.length)setChan(CHANS[j][0])},{passive:true})}
