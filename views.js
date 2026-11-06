/* ===================== Outils d'affichage ===================== */
function ringSvg(p,size=84,color,stroke=9){const r=(size-stroke-3)/2,c=2*Math.PI*r;return `<svg class="ring" width="${size}" height="${size}"><circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" style="stroke-width:${stroke}"/><circle class="val" cx="${size/2}" cy="${size/2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c*(1-p)}" style="stroke-width:${stroke};${color?`stroke:${color}`:''}"/></svg>`}
function animateRings(){requestAnimationFrame(()=>requestAnimationFrame(()=>$$('.ring .val').forEach(e=>e.style.strokeDashoffset=e.dataset.off)))}
function countUp(){$$('[data-count]').forEach(el=>{const to=+el.dataset.count,suf=el.dataset.suf||'';const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/700),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e)+suf;if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)})}
const tabsHtml=(list,cur,fn)=>`<div class="seg big">${list.map(([k,l,i])=>`<button class="${cur===k?'on':''}" onclick="${fn}('${k}')">${i?ui(i,16):''} ${l}</button>`).join('')}</div>`;
const pageHead=(title,sub,actions='')=>`<div class="page-head"><div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>${actions?`<div class="row">${actions}</div>`:''}</div>`;

/* ===================== TÂCHES ET PLANNING ===================== */
let TU={tab:'tableau',owner:''};
const setTU=k=>{TU.tab=k;renderView()};
const weekStart=d=>{const x=new Date(d+'T12:00');x.setDate(x.getDate()-((x.getDay()+6)%7));return x.toISOString().slice(0,10)};
const addDays=(d,n)=>{const x=new Date(d+'T12:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const WEEKS=()=>{const w0=weekStart(todayISO());return [...Array(6)].map((_,i)=>addDays(w0,i*7))};
const weekLabel=w=>{const t=weekStart(todayISO());if(w===t)return 'Cette semaine';if(w===addDays(t,7))return 'Semaine prochaine';return 'Semaine du '+fmtD(w)};
const blockedBy=t=>(t.deps||[]).map(d=>D.tasks.get(d)).filter(x=>x&&!isDone(x.status));
const filtTasks=()=>arr('tasks').filter(t=>!TU.owner||t.owner===TU.owner).sort((a,b)=>(a.code||'').localeCompare(b.code||'',undefined,{numeric:true}));
VIEWS.taches=function(){
 const people=[{id:'',name:'Tout le monde'},...members(),member('all')];
 $('#view').innerHTML=pageHead('Tâches et planning','Crée une tâche, donne-la à quelqu\'un et place-la dans une semaine. Glisse les cartes pour changer leur statut ou leur semaine.',`<button class="btn primary" onclick="editTask()">${ui('plus',16)} Nouvelle tâche</button>`)+
 `<div class="row between" style="margin-bottom:18px">${tabsHtml([['tableau','Tableau','tasks'],['semaines','Semaines','gantt'],['agenda','Agenda','calendar']],TU.tab,'setTU')}
 <div class="people-filter">${people.map(m=>`<button class="pf ${TU.owner===m.id?'on':''}" onclick="TU.owner='${m.id}';renderView()">${m.id?avatar(m.name,m.color):`<span class="avatar" style="background:#64748b">${ui('team',13)}</span>`}<span>${esc(m.id===ME.id?'Moi':m.name)}</span></button>`).join('')}</div></div><div id="tv"></div>`;
 ({tableau:tvBoard,semaines:tvWeeks,agenda:tvAgenda})[TU.tab]();
};
function taskCard(t,withStatus){const bl=blockedBy(t);const m=member(t.owner);const st=TASK_ST.find(s=>s[0]===t.status);
 return `<div class="tcard" style="--c:${m.color}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${t.id}');this.classList.add('dragging')" ondragend="this.classList.remove('dragging')" onclick="editTask('${t.id}')">
 <div class="t">${esc(t.title)}</div>
 <div class="meta">${avatar(m.name,m.color)}${withStatus?`<span class="chip" style="color:${st?.[2]}">${st?.[1]}</span>`:''}${t.priority==='haute'?'<span class="chip bad">Prioritaire</span>':''}${t.due?`<span class="chip ${t.due<todayISO()&&!isDone(t.status)?'bad':''}">${ui('calendar',12)} ${fmtD(t.due)}</span>`:''}${bl.length&&!isDone(t.status)?`<span class="chip warn" title="Attend : ${esc(bl.map(b=>b.title).join(', '))}">En attente</span>`:''}${(t.eqs||[]).length?`<span class="chip">${ui('server',12)} ${t.eqs.length}</span>`:''}</div></div>`}
function tvBoard(){const L=filtTasks();
 $('#tv').innerHTML=!arr('tasks').length?`<div class="empty big">${ui('tasks',34)}<h3>Aucune tâche pour l'instant</h3><p>Commencez par lister ce que chacun doit faire cette semaine.</p><button class="btn primary" onclick="editTask()">Créer la première tâche</button></div>`:
 `<div class="kanban">${TASK_ST.map(([k,l,c])=>{const col=L.filter(t=>t.status===k);return `<div class="col" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="dropTask(event,this,'status','${k}')"><div class="col-h"><span class="dot" style="background:${c}"></span>${l}<span class="n">${col.length}</span></div>${col.map(t=>taskCard(t)).join('')||'<div class="col-empty">Glisse une tâche ici</div>'}${k==='todo'?`<button class="add-in-col" onclick="editTask()">${ui('plus',14)} Ajouter</button>`:''}</div>`}).join('')}</div>`}
function tvWeeks(){const L=filtTasks();const W=WEEKS();const inWeek=(t,w)=>t.start&&weekStart(t.start)===w;
 const unplanned=L.filter(t=>!t.start&&!isDone(t.status));const late=L.filter(t=>t.start&&t.start<W[0]&&!isDone(t.status));const later=L.filter(t=>t.start&&t.start>addDays(W[W.length-1],6));
 const col=(key,title,sub,list,cls='')=>`<div class="col week ${cls}" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="dropTask(event,this,'week','${key}')"><div class="col-h col-h2"><span>${title}</span><span class="tiny muted">${sub}</span></div>${list.map(t=>taskCard(t,true)).join('')||'<div class="col-empty">Glisse une tâche ici</div>'}</div>`;
 $('#tv').innerHTML=`<p class="hint-line">${ui('spark',14)} Glisse une tâche dans une semaine pour la planifier (du lundi au vendredi). Sa date de fin apparaît dans l'agenda.</p><div class="kanban weeks">${col('none','À planifier','pas encore de date',unplanned,'none')}${late.length?col('late','En retard','semaine passée',late,'late'):''}${W.map(w=>col(w,weekLabel(w),`${fmtD(w)} → ${fmtD(addDays(w,4))}`,L.filter(t=>inWeek(t,w)),w===W[0]?'now':'')).join('')}${later.length?col('later','Plus tard','',later):''}</div>`}
function dropTask(e,colEl,kind,val){e.preventDefault();colEl.classList.remove('over');const id=e.dataTransfer.getData('text/plain');const t=clone(D.tasks.get(id));if(!t)return;
 if(kind==='status'){if(t.status===val)return;t.status=val;put('tasks',id,t,['a passé',`« ${t.title} » en ${stL(TASK_ST,val)}`,'taches']);return}
 if(val==='late'||val==='later')return;if(val==='none'){t.start='';t.due='';put('tasks',id,t,['a retiré du planning',`« ${t.title} »`,'taches']);return}
 t.start=val;t.due=addDays(val,4);put('tasks',id,t,['a planifié',`« ${t.title} » (${weekLabel(val).toLowerCase()})`,'taches'])}
function setTaskStatus(id,st){const t=clone(D.tasks.get(id));if(!t||t.status===st)return;t.status=st;put('tasks',id,t,['a passé',`« ${t.title} » en ${stL(TASK_ST,st)}`,'taches'])}
function editTask(id){const t=id?D.tasks.get(id):null;const v=t||{status:'todo',priority:'moyenne',owner:ME.id};const W=WEEKS();const wk=v.start?weekStart(v.start):'';
 const opt=(a,cur)=>a.map(([k,l])=>`<option value="${esc(k)}" ${String(k)===String(cur??'')?'selected':''}>${esc(l)}</option>`).join('');
 const weeks=[['','Plus tard'],...W.map(w=>[w,weekLabel(w)])];if(wk&&!W.includes(wk))weeks.push([wk,'Semaine du '+fmtD(wk)]);
 const o=openModal(t?'Modifier la tâche':'Nouvelle tâche',`<form class="form" id="tf">
 <label class="field wide"><span>Quoi ?</span><input id="t_title" value="${esc(v.title||'')}" placeholder="Ex. Installer la VM pfSense sur le Proxmox" required></label>
 <label class="field"><span>Qui ?</span><select id="t_owner">${opt(memberOpts().map(o=>[o.v,o.l]),v.owner)}</select></label>
 <label class="field"><span>Statut</span><select id="t_status">${opt(TASK_ST,v.status)}</select></label>
 <label class="field wide"><span>Détails (facultatif)</span><textarea id="t_desc" rows="3">${esc(v.desc||'')}</textarea></label>
 <div class="field wide plan-box"><span>${ui('gantt',14)} Mettre dans le planning</span>
  <div class="row" style="gap:8px">${weeks.map(([w,l])=>`<label class="pill-radio"><input type="radio" name="t_week" value="${w}" ${wk===w?'checked':''}><span>${esc(l)}</span></label>`).join('')}</div>
  <div class="row" style="margin-top:12px;gap:12px"><label class="field" style="flex:1;min-width:150px"><span>À finir pour le (facultatif)</span><input type="date" id="t_due" value="${esc(v.due||'')}"></label><label class="field" style="flex:1;min-width:120px"><span>Priorité</span><select id="t_prio">${opt(PRIO,v.priority)}</select></label></div>
  <label class="row small" style="margin-top:12px;flex-wrap:nowrap"><input type="checkbox" id="t_cal"> <span>${ui('calendar',14)} Ajouter aussi un créneau dans l'agenda du groupe</span></label>
  <div class="row" id="t_calbox" hidden style="margin-top:8px;gap:12px"><label class="field" style="flex:1"><span>Jour</span><input type="date" id="t_cdate" value="${esc(v.due||wk||todayISO())}"></label><label class="field" style="flex:1"><span>Heure</span><input type="time" id="t_ctime" value="14:00"></label></div></div>
 <details class="field wide adv"><summary>Relier à une machine ou à une autre tâche (facultatif)</summary>
   <div class="grid g-2" style="margin-top:10px">${fieldHtml({k:'deps',label:'Attend la fin de',type:'multi',options:arr('tasks').filter(x=>!t||x.id!==t.id).map(x=>({v:x.id,l:x.title}))},v.deps)}${fieldHtml({k:'eqs',label:'Machines concernées',type:'multi',options:(D.sites.get('plot7')?.eq||[]).map(e=>({v:e.id,l:e.name}))},v.eqs)}</div></details>
 <footer>${t?`<button type="button" class="btn danger" id="tdel">${ui('trash',16)} Supprimer</button>`:''}<span style="flex:1"></span><button type="button" class="btn" data-close2>Annuler</button><button class="btn primary">Enregistrer</button></footer></form>`,true);
 $('[data-close2]',o).onclick=closeModal;$('#t_cal').onchange=e=>$('#t_calbox').hidden=!e.target.checked;
 if(t)$('#tdel').onclick=async()=>{if(await confirmBox('Supprimer cette tâche ?')){closeModal();arr('tasks').forEach(x=>{if((x.deps||[]).includes(t.id)){const c=clone(x);c.deps=c.deps.filter(d=>d!==t.id);put('tasks',x.id,c)}});del('tasks',t.id,['a supprimé la tâche',`« ${t.title} »`,'taches'])}};
 $('#tf').onsubmit=e=>{e.preventDefault();const g=k=>$('#t_'+k).value.trim();const multi=k=>$$('input:checked',$('#f_'+k)).map(i=>i.value);
  const w=($('input[name=t_week]:checked')||{}).value||'';const due=g('due');const cal=$('#t_cal').checked,cdate=$('#t_cdate').value,ctime=$('#t_ctime').value;
  const nid=t?t.id:'T'+String(Math.max(0,...arr('tasks').map(x=>parseInt((x.code||'').slice(1))||0))+1).padStart(2,'0');
  const data={...(t?stripId(t):{}),code:t?t.code:nid,title:g('title'),owner:g('owner'),status:g('status'),desc:g('desc'),priority:g('prio'),start:w||(due&&!w?'':''),due:due||(w?addDays(w,4):''),deps:multi('deps'),eqs:multi('eqs')};
  if(!w&&due)data.start=weekStart(due);
  closeModal();put('tasks',nid,data,[t?'a modifié la tâche':'a créé la tâche',`« ${data.title} »`,'taches']);
  if(cal)put('events',uid('ev'),{title:data.title,date:cdate||data.due||todayISO(),time:ctime||'',type:'travail',who:[data.owner],desc:'Créneau pour la tâche « '+data.title+' »',taskId:nid},['a ajouté à l\'agenda',`« ${data.title} »`,'taches'])};
 setTimeout(()=>$('#t_title').focus(),60)}

/* Agenda */
let AG={y:new Date().getFullYear(),m:new Date().getMonth()};
const EV_TYPES=[['ap','Séance AP','#2d5bd8'],['reunion','Réunion','#8b4fd1'],['travail','Travail sur une tâche','#16875f'],['rendu','Rendu','#d9822b'],['oral','Oral','#c23b3b']];
function tvAgenda(){
 const first=new Date(AG.y,AG.m,1),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));
 const cells=[...Array(42)].map((_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const evs=arr('events'),T=filtTasks();
 $('#tv').innerHTML=`<div class="row between" style="margin-bottom:12px"><div class="row"><button class="btn icon" onclick="AG.m--;if(AG.m<0){AG.m=11;AG.y--}renderView()" aria-label="Mois précédent">‹</button><h2 style="min-width:180px;text-align:center;text-transform:capitalize">${first.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</h2><button class="btn icon" onclick="AG.m++;if(AG.m>11){AG.m=0;AG.y++}renderView()" aria-label="Mois suivant">›</button><button class="btn sm ghost" onclick="AG.y=new Date().getFullYear();AG.m=new Date().getMonth();renderView()">Aujourd'hui</button></div>
 <div class="row small">${EV_TYPES.map(t=>`<span><span class="dot" style="background:${t[2]}"></span> ${t[1]}</span>`).join('')}<span><span class="dot" style="background:var(--warn)"></span> Fin d'une tâche</span><button class="btn sm primary" onclick="editEvent(null,'${todayISO()}')">${ui('plus',14)} Événement</button></div></div>
 <div class="cal">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>`<div class="h">${d}</div>`).join('')}${cells.map(d=>{const k=iso(d);const E=evs.filter(e=>e.date===k),TT=T.filter(t=>t.due===k&&!isDone(t.status));return `<div class="d ${d.getMonth()!==AG.m?'out':''} ${k===todayISO()?'today':''}" onclick="if(event.target===this||event.target.classList.contains('dn'))editEvent(null,'${k}')"><span class="dn">${d.getDate()}</span>${E.map(e=>{const ty=EV_TYPES.find(x=>x[0]===e.type)||EV_TYPES[1];return `<span class="ev" style="--ec:${ty[2]}" onclick="event.stopPropagation();editEvent('${e.id}')">${e.time?e.time+' ':''}${esc(e.title)}</span>`}).join('')}${TT.map(t=>`<span class="ev" style="--ec:var(--warn)" onclick="event.stopPropagation();editTask('${t.id}')">⚑ ${esc(t.title)}</span>`).join('')}</div>`}).join('')}</div>`}
function gcalLink(e){const d=e.date.replace(/-/g,'');const t=s=>(s||'').replace(':','')+'00';const dates=e.time?`${d}T${t(e.time)}/${d}T${t(e.end||e.time)}`:`${d}/${d}`;return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('[Plot 7] '+e.title)}&dates=${dates}&details=${encodeURIComponent(e.desc||'')}&ctz=Europe/Paris`}
function editEvent(id,date){const e=id?D.events.get(id):null;
 openForm({title:e?'Événement':'Nouvel événement',values:e||{date,type:'ap',who:members().map(m=>m.id)},
  fields:[{k:'title',label:'Titre',wide:true},{k:'type',label:'Type',type:'select',options:EV_TYPES.map(t=>({v:t[0],l:t[1]}))},{k:'date',label:'Date',type:'date'},{k:'time',label:'Début',type:'time'},{k:'end',label:'Fin',type:'time'},{k:'desc',label:'Notes',type:'textarea',wide:true},{k:'who',label:'Participants',type:'multi',options:members().map(m=>({v:m.id,l:m.name}))}],
  extra:e?`<div class="field wide"><a class="btn" href="${gcalLink(e)}" target="_blank" rel="noopener">${ui('calendar',16)} Ajouter à mon Google Agenda</a></div>`:'',
  onSave:v=>put('events',e?e.id:uid('ev'),{...(e?stripId(e):{}),...v},[e?'a modifié l\'événement':'a ajouté à l\'agenda',`« ${v.title} » (${fmtD(v.date)})`,'taches']),
  onDelete:e?()=>del('events',e.id,['a supprimé l\'événement',`« ${e.title} »`,'taches']):null})}

/* ===================== ACCUEIL ===================== */
VIEWS.accueil=function(){
 const T=arr('tasks'),done=T.filter(t=>isDone(t.status)).length,pct=T.length?done/T.length:0;
 const mine=T.filter(t=>t.owner===ME.id&&!isDone(t.status)).sort((a,b)=>(a.due||'9').localeCompare(b.due||'9'));
 const nu=unread();const feed=arr('activity').sort((a,b)=>b.ts-a.ts).slice(0,7);const seen=ls.get(seenKey(),0);
 const msgs=arr('chat').sort((a,b)=>b.ts-a.ts).slice(0,5);const cu=typeof chatUnread==='function'?chatUnread():0;
 const files=arr('files').sort((a,b)=>b.ts-a.ts).slice(0,5);const inCall=callPeople();
 const P=pveCfg();
 $('#view').innerHTML=`
 <section class="hero"><div class="hero-bg"></div><div class="hero-txt">
  <div class="eyebrow light">${fmtDL(todayISO())} · ${esc(plotInfo().name)}</div><h1>Bonjour ${esc(ME.name)}</h1>
  <p>${mine.length?`Tu as <b>${mine.length} tâche${mine.length>1?'s':''}</b> à faire.`:'Aucune tâche à ton nom pour l\'instant.'} ${cu?`<b>${cu} message${cu>1?'s':''}</b> non lu${cu>1?'s':''}.`:''} ${inCall.length?`<b>${inCall.map(p=>esc(p.name)).join(', ')}</b> ${inCall.length>1?'sont':'est'} en appel.`:''}</p>
  <div class="row" style="margin-top:18px"><a class="btn glass" href="#serveur">${ui('server',16)} Serveur</a><a class="btn glass" href="#chat">${ui('chat',16)} Discussion</a><a class="btn glass" href="#appel">${ui('phone',16)} ${inCall.length?'Rejoindre l\'appel':'Lancer un appel'}</a><a class="btn glass" href="#fichiers">${ui('folder',16)} Fichiers</a></div></div>
  <div class="hero-ring">${ringSvg(pct,132,'#ffffff',10)}<div class="hero-ring-txt"><b data-count="${Math.round(pct*100)}" data-suf="%">0%</b><span>des tâches terminées</span></div></div></section>

 <div class="grid g-3 stagger" style="margin-top:22px">
  <a class="card hover srv-mini" href="#serveur" style="--i:0"><div class="row between"><div class="row">${icon('serveur',40)}<div><b>Serveur Proxmox</b><div class="tiny muted mono">${esc(P.host)}:${P.port}</div></div></div>${svPill()}</div>
   <p class="small muted" style="margin:12px 0 0">Ouvre Proxmox dans sa fenêtre, à côté du site (réseau du lycée).</p></a>
  <div class="card" style="--i:1"><div class="card-head"><h2>Le groupe</h2><a class="small" href="#equipe">Équipe</a></div>
   <ul class="list">${members().map(m=>{const on=isOnline(m.id)||m.id===ME.id;const c=inCall.some(p=>p.uid===m.id);return `<li><span class="row" style="flex-wrap:nowrap;gap:10px">${avatar(m.name,m.color)}<b class="small">${esc(m.name)}${m.id===ME.id?' <span class="tiny muted">(moi)</span>':''}</b></span><span class="chip ${c?'acc':on?'ok':''}">${c?ui('phone',12)+' en appel':on?'en ligne':'hors ligne'}</span></li>`}).join('')}</ul></div>
  <div class="card" style="--i:2"><div class="card-head"><h2>Le plot en bref</h2><a class="small" href="#infra">Schéma</a></div>
   <dl class="kv"><dt>Réseau</dt><dd class="mono">${esc(plotInfo().net)}</dd><dt>Passerelle / DNS</dt><dd class="mono">${esc(plotInfo().gw)}</dd><dt>Serveur (actuel)</dt><dd class="mono">${esc(P.host)}</dd><dt>Serveur (prévu)</dt><dd class="mono">${esc(P.target||'')}</dd></dl></div>
 </div>

 <div class="grid g-2" style="margin-top:18px">
  <section class="card"><div class="card-head"><h2>Mes prochaines tâches</h2><button class="btn sm primary" onclick="editTask()">${ui('plus',14)} Tâche</button></div>
   ${mine.length?`<ul class="list">${mine.slice(0,6).map(t=>`<li><span class="row" style="flex-wrap:nowrap;gap:10px;min-width:0"><span class="dot" style="background:${TASK_ST.find(s=>s[0]===t.status)?.[2]}"></span><a href="javascript:void 0" onclick="editTask('${t.id}')">${esc(t.title)}</a></span><span class="row" style="gap:6px;flex-wrap:nowrap">${t.due?`<span class="chip ${t.due<todayISO()?'bad':''}">${fmtD(t.due)}</span>`:''}<button class="btn sm ghost" title="Marquer comme terminée" onclick="setTaskStatus('${t.id}','done')">✓</button></span></li>`).join('')}</ul>`:`<div class="empty small">Rien à ton nom. Crée une tâche ou prends-en une dans le tableau.</div>`}</section>
  <section class="card"><div class="card-head"><h2>Derniers messages</h2><a class="btn sm ghost" href="#chat">Ouvrir</a></div>
   ${msgs.length?`<ul class="list feed">${msgs.map(m=>{const u=member(m.uid);return `<li>${avatar(u.name||m.name,u.color)}<span class="t small"><b>${esc(u.name||m.name)}</b> ${m.remote?'demande une prise en main à distance':m.file?`${ui('attach',12)} ${esc(m.file.name)}`:esc(trunc(m.text,90))}</span><span class="tiny muted">${ago(m.ts)}</span></li>`}).join('')}</ul>`:'<div class="empty small">Pas encore de message.</div>'}</section>
  <section class="card"><div class="card-head"><h2>Fichiers récents</h2><a class="btn sm ghost" href="#fichiers">Tous</a></div>
   ${files.length?`<ul class="list">${files.map(f=>`<li><span class="row" style="flex-wrap:nowrap;gap:10px;min-width:0">${fileIcon(f)}<a href="javascript:void 0" onclick="downloadFile('${f.id}')">${esc(f.name)}</a></span><span class="tiny muted">${fmtSize(f.size)} · ${ago(f.ts)}</span></li>`).join('')}</ul>`:'<div class="empty small">Aucun fichier partagé.</div>'}</section>
  <section class="card"><div class="card-head"><h2>Ce que le groupe a fait</h2><button class="btn sm ghost" onclick="toggleBell()">Tout voir</button></div>
   <ul class="list feed">${feed.map(a=>`<li class="${a.ts>seen&&a.who!==ME.name?'unread':''}">${avatar(a.who,a.color||colorOf(a.who))}<span class="t small"><b>${esc(a.who)}</b> ${esc(a.verb)} ${a.route?`<a href="#${a.route}">${esc(a.label)}</a>`:esc(a.label)}</span><span class="tiny muted">${ago(a.ts)}</span></li>`).join('')||'<li class="muted small">Les modifications de chacun apparaîtront ici.</li>'}</ul></section>
 </div>`;
 animateRings();countUp();
};

/* ===================== ÉQUIPE ===================== */
VIEWS.equipe=function(){const M=members();
 $('#view').innerHTML=pageHead('Équipe',`Les membres de ${esc(plotInfo().name)}. Chacun peut modifier les noms, rôles et couleurs.`)+
 `<div class="grid g-2"><div class="card"><h2 style="margin-bottom:6px">Les membres</h2>${M.map((m,i)=>`<div class="member-row"><span class="on-m ${isOnline(m.id)||m.id===ME.id?'is-on':''}">${avatar(m.name,m.color,'lg')}<i></i></span><div class="grid" style="grid-template-columns:1fr 1.6fr;gap:8px;flex:1"><input value="${esc(m.name)}" onchange="setMember(${i},'name',this.value)" aria-label="Nom"><input value="${esc(m.role||'')}" placeholder="Rôle (ex. pfSense et réseau)" onchange="setMember(${i},'role',this.value)" aria-label="Rôle"></div><input type="color" value="${m.color}" style="width:42px;flex:none" onchange="setMember(${i},'color',this.value)" aria-label="Couleur"></div>`).join('')}</div>
 <div class="card"><h2 style="margin-bottom:10px">Inviter le groupe</h2><ol class="steps"><li>Envoie le lien du site à Selene, Aksil et Walid.</li><li>À l'ouverture, chacun clique sur son nom. Ses messages et modifications apparaissent à son nom.</li><li>Pour être prévenu des messages et des appels quand l'onglet est caché : cloche en haut à droite › « Recevoir les messages et appels… ».</li></ol>
 <p class="small muted">Attention : toute personne qui a le lien peut lire et modifier. N'y mettez ni mot de passe ni information personnelle.</p>
 <h3 style="margin-top:18px">Installer l'application</h3><p class="small muted">Le site s'installe comme une app sur ordinateur, Android et iPhone.</p><button class="btn" onclick="installApp()">${ui('download',16)} Installer l'app</button>
 <h3 style="margin-top:18px">Sauvegarde</h3><p class="small muted">Les données sont dans la base partagée, pas dans l'app : mettre à jour ou réinstaller l'app ne fait rien perdre. Une copie est aussi envoyée chaque jour dans le Google Drive de Rayan.</p>
 <div class="row"><button class="btn" onclick="backupZip()">${ui('download',16)} Sauvegarde complète (zip, avec les fichiers)</button><button class="btn ghost" onclick="exportAll()">Données seules (JSON)</button></div>
 <h3 style="margin-top:18px">Espaces</h3><p class="small muted">Un espace par promo ou par plot, chacun avec ses membres et ses données.</p><button class="btn" onclick="spacesModal()">${ui('team',16)} Gérer les espaces</button>
 <h3 style="margin-top:18px">Mon identité</h3><p class="small">Connecté en tant que <b>${esc(ME.name)}</b>. <button class="btn sm ghost" onclick="$('#meBtn').click()">Changer</button></p></div></div>`};
function setMember(i,k,v){const L=clone(members());L[i][k]=v;put('meta','members',{list:L},['a modifié l\'équipe',L[i].name,'equipe'])}
function exportAll(){const o={exportedAt:new Date().toISOString(),by:ME.name};['tasks','events','sites','meta','chat','files','folders'].forEach(c=>o[c]=arr(c));saveFile(`${slug(plotInfo().name)}-${todayISO()}.json`,new Blob([JSON.stringify(o,null,1)],{type:'application/json'}))}
async function backupZip(){if(!window.JSZip)return toast('Module zip indisponible.','bad');const z=new JSZip();const P=plotInfo();
 const o={exportedAt:new Date().toISOString(),by:ME.name,space:SPACE,name:P.name};['tasks','events','sites','meta','chat','files','folders','activity'].forEach(c=>o[c]=arr(c));z.file('donnees.json',JSON.stringify(o,null,1));
 const F=arr('files');toast(`Préparation de la sauvegarde (${F.length} fichier${F.length>1?'s':''})…`);
 for(const f of F){try{z.file('fichiers/'+((f.path?f.path+'/':'')+f.name),await fileBlob(f.id))}catch(e){}}
 saveFile(`${slug(P.name)}-sauvegarde-${todayISO()}.zip`,await z.generateAsync({type:'blob'}))}
