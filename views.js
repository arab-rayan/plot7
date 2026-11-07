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
/* ===================== Tableau de bord ===================== */
const DAYMS=864e5,sum=a=>a.reduce((s,x)=>s+x,0);let SPK=0;
const day0=()=>{const t=new Date();t.setHours(0,0,0,0);return t.getTime()};
function buckets(list,days,shift=0){const out=Array(days).fill(0);const start=day0()-(days-1+shift)*DAYMS;list.forEach(x=>{const t=x.ts;if(!t)return;const i=Math.floor((t-start)/DAYMS);if(i>=0&&i<days)out[i]++});return out}
function spark(a,color){const w=96,h=34,m=Math.max(1,...a),n=a.length,id='sg'+(++SPK);const pts=a.map((x,i)=>[i/(n-1)*w,h-4-(x/m)*(h-10)]);const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('');
 return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".32"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${w} ${h}L0 ${h}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
function dchip(cur,prev){if(!cur&&!prev)return '<span class="dchip">7 j : aucune activité</span>';if(!prev)return `<span class="dchip up">↑ +${cur}</span>`;const p=Math.round((cur-prev)/prev*100);return `<span class="dchip ${p>0?'up':p<0?'down':''}">${p>0?'↑':p<0?'↓':'→'} ${Math.abs(p)} %</span>`}
const kpiCard=(ic,label,val,sub,chip,sp,href)=>`<a class="kc" href="${href}"><div class="kc-top"><span class="kc-ic">${ui(ic,18)}</span><span class="kc-l">${label}</span>${chip||''}</div><div class="kc-mid"><div><div class="kc-v">${val}</div><div class="kc-s">${sub}</div></div>${sp||''}</div></a>`;
const niceMax=m=>{for(const s of [4,8,12,20,40,60,100,200,400,1000])if(m<=s)return s;return Math.ceil(m/100)*100};
const shortD=ms=>new Date(ms).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
let ACT={days:14};
function actData(){const d=ACT.days;return [['Messages','s1',buckets(arr('chat'),d)],['Modifications','s2',buckets(arr('activity'),d)],['Fichiers','s3',buckets(arr('files'),d)]]}
function actChart(){const days=ACT.days,S=actData();const W=760,H=250,pl=34,pr=14,pt=14,pb=30;const ymax=niceMax(Math.max(1,...S.flatMap(s=>s[2])));
 const X=i=>pl+i/(days-1)*(W-pl-pr),Y=v=>H-pb-v/ymax*(H-pt-pb),t0=day0()-(days-1)*DAYMS;
 const grid=[0,1,2,3,4].map(k=>{const val=ymax*k/4,y=Y(val);return `<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" class="gl"/><text x="${pl-8}" y="${y+4}" text-anchor="end" class="ax">${val}</text>`}).join('');
 const xs=[...new Set([0,.25,.5,.75,1].map(f=>Math.round(f*(days-1))))].map(i=>`<text x="${X(i)}" y="${H-8}" text-anchor="${i===0?'start':i===days-1?'end':'middle'}" class="ax">${shortD(t0+i*DAYMS)}</text>`).join('');
 const lines=S.map(([n,c,a])=>{const d=a.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join('');return `<defs><linearGradient id="ag-${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="st-${c}" stop-opacity=".22"/><stop offset="1" class="st-${c}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${X(days-1)} ${Y(0)}L${X(0)} ${Y(0)}Z" fill="url(#ag-${c})"/><path d="${d}" class="ln ${c}"/>`}).join('');
 return `<svg viewBox="0 0 ${W} ${H}" class="actsvg" id="actSvg" role="img" aria-label="Activité du groupe sur ${days} jours">${grid}${xs}${lines}<line id="actX" y1="${pt}" y2="${H-pb}" class="cross" hidden/>${S.map(s=>`<circle id="actP-${s[1]}" r="4.5" class="pt ${s[1]}" hidden/>`).join('')}<rect x="${pl}" y="0" width="${W-pl-pr}" height="${H-pb}" fill="transparent" id="actHit"/></svg><div class="acttip" id="actTip" hidden></div>`}
function bindAct(){const hit=$('#actHit');if(!hit)return;const days=ACT.days,S=actData();const W=760,H=250,pl=34,pr=14,pt=14,pb=30;const ymax=niceMax(Math.max(1,...S.flatMap(s=>s[2])));const X=i=>pl+i/(days-1)*(W-pl-pr),Y=v=>H-pb-v/ymax*(H-pt-pb),t0=day0()-(days-1)*DAYMS;const svg=$('#actSvg'),tip=$('#actTip');
 const move=e=>{const r=svg.getBoundingClientRect();const px=(e.clientX-r.left)/r.width*W;const i=Math.max(0,Math.min(days-1,Math.round((px-pl)/(W-pl-pr)*(days-1))));
  const x=$('#actX');x.hidden=false;x.setAttribute('x1',X(i));x.setAttribute('x2',X(i));S.forEach(s=>{const p=$('#actP-'+s[1]);p.hidden=false;p.setAttribute('cx',X(i));p.setAttribute('cy',Y(s[2][i]))});
  tip.hidden=false;tip.innerHTML=`<b>${new Date(t0+i*DAYMS).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</b>${S.map(s=>`<span><i class="d ${s[1]}"></i>${s[0]}<b>${s[2][i]}</b></span>`).join('')}`;
  const left=X(i)/W*r.width;tip.style.left=(left>r.width*.62?left-tip.offsetWidth-14:left+14)+'px';tip.style.top='18px'};
 const out=()=>{$('#actX').hidden=true;S.forEach(s=>$('#actP-'+s[1]).hidden=true);tip.hidden=true};
 hit.onpointermove=move;hit.onpointerdown=move;hit.onpointerleave=out}
function actCard(){const d=ACT.days,S=actData(),tot=sum(S.flatMap(s=>s[2]));const prev=sum([buckets(arr('chat'),d,d),buckets(arr('activity'),d,d),buckets(arr('files'),d,d)].flatMap(x=>x));
 return `<section class="card actcard" id="actCard"><div class="card-head"><div><div class="eyebrow">Activité du groupe</div><div class="bignum">${tot}<small>actions sur ${d} jours</small> ${dchip(tot,prev)}</div></div>
  <div class="seg" role="tablist">${[7,14,30].map(n=>`<button class="${n===d?'on':''}" onclick="actRange(${n})">${n} j</button>`).join('')}</div></div>
  <div class="legendx">${S.map(s=>`<span><i class="d ${s[1]}"></i>${s[0]} <b>${sum(s[2])}</b></span>`).join('')}</div>
  <div class="actwrap">${actChart()}</div>
  <details class="tblv"><summary>Voir en tableau</summary><table><thead><tr><th>Jour</th>${S.map(s=>`<th>${s[0]}</th>`).join('')}</tr></thead><tbody>${S[0][2].map((_,i)=>`<tr><td>${shortD(day0()-(d-1-i)*DAYMS)}</td>${S.map(s=>`<td>${s[2][i]}</td>`).join('')}</tr>`).reverse().join('')}</tbody></table></details></section>`}
function actRange(n){ACT.days=n;const c=$('#actCard');if(c){c.outerHTML=actCard();bindAct()}}
const PRI_L={haute:'Haute',moyenne:'Moyenne',basse:'Basse'},PRI_N={haute:0,moyenne:1,basse:2};
const owName=t=>t.owner==='all'?'Tout le groupe':t.owner?member(t.owner).name:'Non attribué';
const prioChip=t=>t.priority?`<span class="pchip ${t.priority}">${PRI_L[t.priority]||t.priority}</span>`:'';
const ST_PROG={todo:0,doing:45,review:80,fix:30,done:100};
let CAL={y:new Date().getFullYear(),m:new Date().getMonth()};
function calNav(d){CAL.m+=d;if(CAL.m<0){CAL.m=11;CAL.y--}if(CAL.m>11){CAL.m=0;CAL.y++}const c=$('#calw');if(c)c.outerHTML=calCard()}
function calCard(){const {y,m}=CAL;const first=new Date(y,m,1),n=new Date(y,m+1,0).getDate(),off=(first.getDay()+6)%7,today=todayISO();
 const mark={};arr('tasks').forEach(t=>{if(t.due&&!isDone(t.status))(mark[t.due]=mark[t.due]||{t:0,e:0}).t++});arr('events').forEach(e=>{if(e.date)(mark[e.date]=mark[e.date]||{t:0,e:0}).e++});
 const cells=[...Array(off).fill('<i></i>'),...Array.from({length:n},(_,k)=>{const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(k+1).padStart(2,'0')}`,mk=mark[iso];return `<a href="#taches" class="cd ${iso===today?'today':''} ${mk?'has':''}" title="${mk?`${mk.t} tâche${mk.t>1?'s':''}, ${mk.e} événement${mk.e>1?'s':''}`:''}">${k+1}${mk?`<b class="${mk.e?'ev':''}"></b>`:''}</a>`})];
 const nxt=[...arr('events').filter(e=>e.date>=today).map(e=>({d:e.date,t:e.title,k:'Événement'})),...arr('tasks').filter(t=>t.due>=today&&!isDone(t.status)).map(t=>({d:t.due,t:t.title,k:'Échéance'}))].sort((a,b)=>a.d.localeCompare(b.d)).slice(0,3);
 return `<section class="card calcard" id="calw"><div class="card-head"><h2 style="text-transform:capitalize">${first.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</h2><span class="row" style="gap:4px"><button class="btn sm ghost icon" onclick="calNav(-1)" aria-label="Mois précédent">‹</button><button class="btn sm ghost icon" onclick="calNav(1)" aria-label="Mois suivant">›</button></span></div>
  <div class="cal2"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>${cells.join('')}</div>
  <div class="calnext">${nxt.length?nxt.map(x=>`<div><span class="tiny muted">${fmtD(x.d)} · ${x.k}</span><span class="small">${esc(trunc(x.t,38))}</span></div>`).join(''):'<span class="tiny muted">Rien de prévu pour l\'instant.</span>'}</div></section>`}
const heroArt=`<svg class="heroart" viewBox="0 0 240 190" aria-hidden="true"><defs><linearGradient id="ha1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a98ff"/><stop offset="1" stop-color="#4a56e0"/></linearGradient><linearGradient id="ha2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d7dff" stop-opacity=".9"/><stop offset="1" stop-color="#2a2f8f" stop-opacity=".9"/></linearGradient><linearGradient id="ha3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b44b8"/><stop offset="1" stop-color="#1a1d5c"/></linearGradient></defs>
 <g opacity=".95"><polygon points="120,22 176,54 120,86 64,54" fill="url(#ha1)"/><polygon points="64,54 120,86 120,150 64,118" fill="url(#ha2)"/><polygon points="120,86 176,54 176,118 120,150" fill="url(#ha3)"/></g>
 <g opacity=".55"><polygon points="190,92 222,110 190,128 158,110" fill="url(#ha1)"/><polygon points="158,110 190,128 190,164 158,146" fill="url(#ha2)"/><polygon points="190,128 222,110 222,146 190,164" fill="url(#ha3)"/></g>
 <g stroke="#fff" stroke-opacity=".35" fill="none"><path d="M120 22 120 86M64 54 120 86 176 54"/></g></svg>`;
VIEWS.accueil=function(){
 const T=arr('tasks'),done=T.filter(t=>isDone(t.status)).length,pct=T.length?done/T.length:0;
 const mine=T.filter(t=>t.owner===ME.id&&!isDone(t.status)).sort((a,b)=>(a.due||'9').localeCompare(b.due||'9'));
 const nu=unread();const feed=arr('activity').sort((a,b)=>b.ts-a.ts).slice(0,7);const seen=ls.get(seenKey(),0);
 const msgs=arr('chat').sort((a,b)=>b.ts-a.ts).slice(0,5);const cu=typeof chatUnread==='function'?chatUnread():0;
 const files=arr('files').sort((a,b)=>b.ts-a.ts).slice(0,5);const inCall=callPeople();
 const P=pveCfg();const openT=T.filter(t=>!isDone(t.status)),late=openT.filter(t=>t.due&&t.due<todayISO()),allF=arr('files'),onl=members().filter(m=>presState(m.id)==='on').length;
 $('#view').innerHTML=`
 <section class="hero2"><div class="hero2-txt"><div class="eyebrow">${fmtDL(todayISO())} · ${esc(plotInfo().name)}</div><h1>Bonjour ${esc(ME.name)}, on avance sur le plot.</h1>
   <p>${mine.length?`Tu as <b>${mine.length} tâche${mine.length>1?'s':''}</b> à faire.`:'Aucune tâche à ton nom pour l\'instant.'} ${cu?`<b>${cu} message${cu>1?'s':''}</b> non lu${cu>1?'s':''}.`:''} ${inCall.length?`<b>${inCall.map(p=>esc(p.name)).join(', ')}</b> ${inCall.length>1?'sont':'est'} en appel.`:'Le groupe est synchronisé en direct.'}</p>
   <div class="row" style="margin-top:16px"><a class="btn primary" href="#appel">${ui('phone',16)} ${inCall.length?'Rejoindre l\'appel':'Lancer un appel'}</a><a class="btn" href="#chat">${ui('chat',16)} Discussion</a><a class="btn" href="#serveur">${ui('server',16)} Serveur</a></div></div>${heroArt}</section>
  <section class="kpis4">
   ${kpiCard('tasks','Tâches ouvertes',openT.length,`${done} terminée${done>1?'s':''} · ${Math.round(pct*100)} % d'avancement`,dchip(sum(buckets(arr('activity'),7)),sum(buckets(arr('activity'),7,7))),spark(buckets(arr('activity'),14),'var(--s2)'),'#taches')}
   ${kpiCard('chat','Messages · 7 j',sum(buckets(arr('chat'),7)),`${arr('chat').length} au total`,dchip(sum(buckets(arr('chat'),7)),sum(buckets(arr('chat'),7,7))),spark(buckets(arr('chat'),14),'var(--s1)'),'#chat')}
   ${kpiCard('folder','Fichiers',allF.length,`${fmtSize(allF.reduce((s,f)=>s+(f.size||0),0))} dans le Drive`,dchip(sum(buckets(allF,7)),sum(buckets(allF,7,7))),spark(buckets(allF,14),'var(--s3)'),'#fichiers')}
   ${kpiCard('team','Équipe en ligne',`${onl}<small> / ${members().length}</small>`,late.length?`<span style="color:var(--bad)">${late.length} tâche${late.length>1?'s':''} en retard</span>`:'Aucune tâche en retard','',`<span class="stack">${members().map(m=>`<span class="on-m ${presCls(m.id)}">${avatar(m.name,m.color)}<i></i></span>`).join('')}</span>`,'#equipe')}
  </section>
  <div class="dgrid"><div>${actCard()}</div>
   <section class="card upc"><div class="card-head"><h2>Prochaines tâches</h2><a class="small" href="#taches">Voir tout</a></div>
    ${openT.length?`<ul class="uplist">${openT.slice().sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||(PRI_N[a.priority]??1)-(PRI_N[b.priority]??1)).slice(0,5).map(t=>`<li><button class="chk" title="Marquer comme terminée" onclick="setTaskStatus('${t.id}','done')"></button><div class="up-t"><a href="javascript:void 0" onclick="editTask('${t.id}')">${esc(t.title)}</a><span class="tiny muted">${esc(t.code||'')} · ${esc(owName(t))}${t.due?` · <span style="${t.due<todayISO()?'color:var(--bad)':''}">${fmtD(t.due)}</span>`:''}</span></div>${prioChip(t)}</li>`).join('')}</ul>`:'<div class="empty small">Tout est terminé.</div>'}
    <button class="btn sm" style="margin-top:12px;width:100%;justify-content:center" onclick="editTask()">${ui('plus',14)} Nouvelle tâche</button></section></div>
  <div class="dgrid2"><section class="card"><div class="card-head"><h2>Suivi des tâches</h2><a class="small" href="#taches">Planning</a></div>
    ${T.length?`<div class="tblw"><table class="dtbl"><thead><tr><th>Tâche</th><th>Statut</th><th>Responsable</th><th>Priorité</th><th>Avancement</th></tr></thead><tbody>${T.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,6).map(t=>{const st=TASK_ST.find(s=>s[0]===t.status)||TASK_ST[0],pr=ST_PROG[t.status]||0,u=t.owner&&t.owner!=='all'?member(t.owner):null;return `<tr onclick="editTask('${t.id}')"><td><b>${esc(trunc(t.title,48))}</b><span class="tiny muted" style="display:block">${esc(t.code||'')}</span></td><td><span class="schip" style="--c:${st[2]}">${st[1]}</span></td><td>${u?`<span class="row" style="gap:7px;flex-wrap:nowrap">${avatar(u.name,u.color)}<span class="small">${esc(u.name)}</span></span>`:`<span class="small muted">${esc(owName(t))}</span>`}</td><td>${prioChip(t)||'<span class="muted">—</span>'}</td><td><div class="prg"><div class="bar"><i style="width:${pr}%;background:${st[2]}"></i></div><span class="tiny muted">${pr} %</span></div></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty small">Aucune tâche pour l\'instant.</div>'}</section>
   ${calCard()}</div>

  <div class="grid g-3 stagger" style="margin-top:22px">
  <a class="card hover srv-mini" href="#serveur" style="--i:0"><div class="card-head"><h2>Serveurs</h2><span class="small" style="color:var(--accent)">Ouvrir</span></div>
   <ul class="list">${servers().map(x=>`<li><span class="row" style="flex-wrap:nowrap;gap:10px">${icon('serveur',26)}<span><b class="small">${esc(x.name)}</b><span class="tiny muted mono" style="display:block">${esc(x.host)}</span></span></span>${svPill(x.id)}</li>`).join('')||'<li class="muted small">Aucun serveur : ajoute-le dans la page Serveurs.</li>'}</ul></a>
  <div class="card" style="--i:1"><div class="card-head"><h2>Le groupe</h2><a class="small" href="#equipe">Équipe</a></div>
   <ul class="list">${members().map(m=>{const st=presState(m.id);const c=inCall.some(p=>p.uid===m.id);return `<li><span class="row" style="flex-wrap:nowrap;gap:10px">${avatar(m.name,m.color)}<b class="small">${esc(m.name)}${m.id===ME.id?' <span class="tiny muted">(moi)</span>':''}</b></span><span class="chip ${c?'acc':st==='on'?'ok':st==='away'?'warn':''}">${c?ui('phone',12)+' en appel':esc(presLabel(m.id))}</span></li>`}).join('')}</ul></div>
  <div class="card" style="--i:2"><div class="card-head"><h2>Le plot en bref</h2><a class="small" href="#infra">Schéma</a></div>
   <dl class="kv"><dt>Réseau</dt><dd class="mono">${esc(plotInfo().net)}</dd><dt>Passerelle / DNS</dt><dd class="mono">${esc(plotInfo().gw)}</dd><dt>Serveurs</dt><dd>${servers().length}</dd></dl></div>
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
 countUp();bindAct();
};

/* ===================== ÉQUIPE ===================== */
VIEWS.equipe=function(){const M=members();
 $('#view').innerHTML=pageHead('Équipe',`Les membres de ${esc(plotInfo().name)}. Chacun peut modifier les noms, rôles et couleurs.`)+
 `<div class="grid g-2"><div class="card"><h2 style="margin-bottom:6px">Les membres</h2>${M.map((m,i)=>`<div class="member-row"><label class="on-m pic-edit ${presCls(m.id)}" title="Changer la photo de ${esc(m.name)}">${avatar(m.name,m.color,'lg')}<i></i><span class="me-cam sm">${ui('image',11)}</span><input type="file" accept="image/*" hidden onchange="setPhoto('${m.id}',this.files[0])"></label><div class="grid" style="grid-template-columns:1fr 1.6fr;gap:8px;flex:1"><input value="${esc(m.name)}" onchange="setMember(${i},'name',this.value)" aria-label="Nom"><input value="${esc(m.role||'')}" placeholder="Rôle (ex. pfSense et réseau)" onchange="setMember(${i},'role',this.value)" aria-label="Rôle"></div><input type="color" value="${m.color}" style="width:42px;flex:none" onchange="setMember(${i},'color',this.value)" aria-label="Couleur"></div>`).join('')}</div>
 <div class="card"><h2 style="margin-bottom:10px">Inviter le groupe</h2><ol class="steps"><li>Envoie le lien du site à Selene, Aksil et Walid.</li><li>À l'ouverture, chacun clique sur son nom. Ses messages et modifications apparaissent à son nom.</li><li>Pour être prévenu des messages et des appels quand l'onglet est caché : cloche en haut à droite › « Recevoir les messages et appels… ».</li></ol>
 <p class="small muted">Attention : toute personne qui a le lien peut lire et modifier. N'y mettez ni mot de passe ni information personnelle.</p>
 <h3 style="margin-top:18px">Installer l'application</h3><p class="small muted">Le site s'installe comme une app sur ordinateur, Android et iPhone.</p><button class="btn" onclick="installApp()">${ui('download',16)} Installer l'app</button>
 <h3 style="margin-top:18px">Sauvegarde</h3><p class="small muted">Les données sont dans la base partagée, pas dans l'app : mettre à jour ou réinstaller l'app ne fait rien perdre. Les fichiers partagés sont rangés dans le Google Drive de l'équipe ; la sauvegarde complète ci-dessous te donne une copie quand tu veux.</p>
 <div class="row"><button class="btn" onclick="backupZip()">${ui('download',16)} Sauvegarde complète (zip, avec les fichiers)</button><button class="btn ghost" onclick="exportAll()">Données seules (JSON)</button></div>
 <h3 style="margin-top:18px">Espaces</h3><p class="small muted">Un espace par promo ou par plot, chacun avec ses membres et ses données.</p><button class="btn" onclick="spacesModal()">${ui('team',16)} Gérer les espaces</button>
 <h3 style="margin-top:18px">Mon identité</h3><p class="small">Connecté en tant que <b>${esc(ME.name)}</b>. <button class="btn sm ghost" onclick="$('#meBtn').click()">Changer</button></p></div></div>`};
function setMember(i,k,v){const L=clone(members());L[i][k]=v;put('meta','members',{list:L},['a modifié l\'équipe',L[i].name,'equipe'])}
function exportAll(){const o={exportedAt:new Date().toISOString(),by:ME.name};['tasks','events','sites','meta','chat','files','folders'].forEach(c=>o[c]=arr(c));saveFile(`${slug(plotInfo().name)}-${todayISO()}.json`,new Blob([JSON.stringify(o,null,1)],{type:'application/json'}))}
async function backupZip(){try{await need('jszip')}catch(e){return toast('Module zip indisponible.','bad')}const z=new JSZip();const P=plotInfo();
 const o={exportedAt:new Date().toISOString(),by:ME.name,space:SPACE,name:P.name};['tasks','events','sites','meta','chat','files','folders','activity'].forEach(c=>o[c]=arr(c));z.file('donnees.json',JSON.stringify(o,null,1));
 const F=arr('files');toast(`Préparation de la sauvegarde (${F.length} fichier${F.length>1?'s':''})…`);
 for(const f of F){try{z.file('fichiers/'+((f.path?f.path+'/':'')+f.name),await fileBlob(f.id))}catch(e){}}
 saveFile(`${slug(P.name)}-sauvegarde-${todayISO()}.zip`,await z.generateAsync({type:'blob'}))}
