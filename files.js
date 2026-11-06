/* ===================== FICHIERS ===================== */
/* Les fichiers sont découpés en morceaux de 700 Ko stockés dans Firestore (offre gratuite, sans carte bancaire).
   Limite : 25 Mo par fichier, environ 700 Mo au total pour rester dans le gigaoctet gratuit. */
const CHUNK=700*1024,MAX_FILE=25*1048576,QUOTA=1073741824;
let FL={path:'',up:[]};
const BLOBS=new Map();
const extOf=n=>(n.split('.').pop()||'').toLowerCase();
const isImg=f=>/^image\//.test(f.type||'')||['png','jpg','jpeg','gif','webp','svg'].includes(extOf(f.name));
const isPdf=f=>f.type==='application/pdf'||extOf(f.name)==='pdf';
const isText=f=>/^text\//.test(f.type||'')||['txt','conf','cfg','sh','md','log','csv','json','xml','yml','yaml','ini','ps1','bat','sql','py','js','html','css'].includes(extOf(f.name));
function fileIcon(f,s=18){const e=extOf(f.name);const c=isImg(f)?'#1f9d74':isPdf(f)?'#c23b3b':['doc','docx','odt'].includes(e)?'#2d6be0':['xls','xlsx','ods','csv'].includes(e)?'#16875f':['ppt','pptx','odp'].includes(e)?'#d9822b':['zip','7z','rar','gz','iso','tar'].includes(e)?'#8b4fd1':'#64748b';
 return `<span class="ficon" style="--fc:${c}">${ui(isImg(f)?'image':'file',s)}<b>${esc((e||'?').slice(0,4))}</b></span>`}
const filesIn=p=>arr('files').filter(f=>(f.path||'')===p).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
const foldersIn=p=>{const set=new Map();arr('folders').forEach(d=>{if((d.parent||'')===p)set.set(d.path,d)});arr('files').forEach(f=>{const fp=f.path||'';if(fp&&fp!==p&&(p===''||fp.startsWith(p+'/'))){const rest=fp.slice(p?p.length+1:0).split('/')[0];const full=p?p+'/'+rest:rest;if(!set.has(full))set.set(full,{path:full,name:rest,parent:p})}});return [...set.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'))};
const under=p=>arr('files').filter(f=>(f.path||'')===p||(f.path||'').startsWith(p+'/'));
const usedBytes=()=>arr('files').reduce((s,f)=>s+(f.size||0),0);

VIEWS.fichiers=function(){
 if(LOCAL){$('#view').innerHTML=pageHead('Fichiers','')+`<div class="empty">Le partage de fichiers a besoin de la base partagée (config.js).</div>`;return}
 const p=FL.path;const dirs=foldersIn(p),files=filesIn(p);const used=usedBytes();
 const crumbs=[['','Fichiers du plot'],...p.split('/').filter(Boolean).map((n,i,a)=>[a.slice(0,i+1).join('/'),n])];
 $('#view').innerHTML=pageHead('Fichiers','Partage des fichiers et des dossiers entre vous quatre : captures, configs, procédures. Glisse-les directement sur la page.',
  `<button class="btn" onclick="newFolder()">${ui('folderplus',16)} Nouveau dossier</button><label class="btn">${ui('folder',16)} Envoyer un dossier<input type="file" webkitdirectory multiple hidden onchange="pickUpload(this)"></label><label class="btn primary">${ui('upload',16)} Envoyer des fichiers<input type="file" multiple hidden onchange="pickUpload(this)"></label>`)+
 `<div class="row between" style="margin-bottom:14px"><nav class="crumbs">${crumbs.map(([k,l],i)=>i<crumbs.length-1?`<a href="javascript:void 0" onclick="goFolder('${esc(k)}')">${esc(l)}</a><span>›</span>`:`<b>${esc(l)}</b>`).join('')}</nav>
  <div class="quota" title="Offre gratuite Firestore : 1 Go (les fichiers prennent environ 1,4 fois leur taille)"><div class="gbar"><i style="width:${Math.min(100,used*1.4/QUOTA*100).toFixed(1)}%"></i></div><span class="tiny muted">${fmtSize(used)} partagés · limite 25 Mo par fichier</span></div></div>
 <div id="upl">${uplHtml()}</div>
 <div class="card flist dropzone" id="dz">${dirs.length||files.length?`<table><thead><tr><th>Nom</th><th>Taille</th><th>Ajouté par</th><th>Date</th><th></th></tr></thead><tbody>
  ${p?`<tr class="up-row" onclick="goFolder('${esc(p.split('/').slice(0,-1).join('/'))}')"><td colspan="5"><span class="row">${ui('folder',18)} ..</span></td></tr>`:''}
  ${dirs.map(d=>{const n=under(d.path);return `<tr class="dir" onclick="goFolder('${esc(d.path)}')"><td><span class="row" style="flex-wrap:nowrap">${folderGlyph()}<b>${esc(d.name)}</b></span></td><td class="muted small">${n.length} fichier${n.length>1?'s':''}</td><td></td><td></td><td class="acts" onclick="event.stopPropagation()"><button class="btn sm ghost" title="Télécharger le dossier (zip)" onclick="zipFolder('${esc(d.path)}')">${ui('download',15)}</button><button class="btn sm ghost" title="Supprimer le dossier" onclick="delFolder('${esc(d.path)}')">${ui('trash',15)}</button></td></tr>`}).join('')}
  ${files.map(f=>{const u=member(f.uid);return `<tr><td><span class="row" style="flex-wrap:nowrap;min-width:0">${fileIcon(f)}<a href="javascript:void 0" onclick="previewFile('${f.id}')" class="fname">${esc(f.name)}</a></span></td><td class="muted small">${fmtSize(f.size)}</td><td>${avatar(u.name||f.byName,u.color)} <span class="small">${esc(u.name||f.byName)}</span></td><td class="muted small">${ago(f.ts)}</td><td class="acts"><button class="btn sm ghost" title="Télécharger" onclick="downloadFile('${f.id}')">${ui('download',15)}</button><button class="btn sm ghost" title="Renommer" onclick="renameFile('${f.id}')">${ui('edit',15)}</button><button class="btn sm ghost" title="Supprimer" onclick="delFile('${f.id}')">${ui('trash',15)}</button></td></tr>`}).join('')}
 </tbody></table>`:`<div class="empty big">${ui('upload',34)}<h3>${p?'Dossier vide':'Aucun fichier pour l\'instant'}</h3><p>Glisse des fichiers ou un dossier ici, ou utilise les boutons en haut.</p></div>`}
 <div class="drop-hint">${ui('upload',30)}<b>Dépose pour envoyer dans « ${esc(p||'Fichiers du plot')} »</b></div></div>`;
 bindDrop($('#dz'),p);
};
const folderGlyph=()=>`<svg width="26" height="21" viewBox="0 0 56 46" aria-hidden="true"><path d="M2 8a4 4 0 0 1 4-4h14l5 5h25a4 4 0 0 1 4 4v3H2z" fill="#d9a22b" opacity=".7"/><rect x="2" y="12" width="52" height="32" rx="5" fill="#e8b33a"/></svg>`;
function goFolder(p){FL.path=p;renderView()}
function uplHtml(){const L=FL.up.filter(u=>!u.done||Date.now()-u.done<4000);if(!L.length)return '';return `<div class="card upl">${L.map(u=>`<div class="upl-row"><span class="small" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.name)}</span><span class="tiny muted">${u.err?`<span style="color:var(--bad)">${esc(u.err)}</span>`:u.done?'Envoyé ✓':Math.round(u.p*100)+' %'}</span><div class="gbar" style="width:120px"><i style="width:${u.p*100}%;${u.err?'background:var(--bad)':''}"></i></div></div>`).join('')}</div>`}
function uplRefresh(){const el=$('#upl');if(el)el.innerHTML=uplHtml()}

function bindDrop(el,path){if(!el)return;
 el.ondragover=e=>{if(![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();el.classList.add('over')};
 el.ondragleave=e=>{if(!el.contains(e.relatedTarget))el.classList.remove('over')};
 el.ondrop=async e=>{e.preventDefault();el.classList.remove('over');const items=[...e.dataTransfer.items||[]].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);
  if(items.length){const out=[];for(const it of items)await walkEntry(it,'',out);uploadMany(out,path)}else uploadMany([...e.dataTransfer.files].map(f=>({file:f,rel:''})),path)}}
function walkEntry(entry,rel,out){return new Promise(res=>{
 if(entry.isFile)entry.file(f=>{out.push({file:f,rel});res()},()=>res());
 else if(entry.isDirectory){const r=entry.createReader();const all=[];const read=()=>r.readEntries(async es=>{if(!es.length){for(const x of all)await walkEntry(x,rel?rel+'/'+entry.name:entry.name,out);res()}else{all.push(...es);read()}},()=>res());read()}
 else res()})}
function pickUpload(inp){const L=[...inp.files].map(f=>{const r=f.webkitRelativePath||'';return{file:f,rel:r?r.split('/').slice(0,-1).join('/'):''}});inp.value='';uploadMany(L,FL.path)}

async function ensureFolders(path){if(!path)return;const parts=path.split('/');for(let i=1;i<=parts.length;i++){const p=parts.slice(0,i).join('/');if(!arr('folders').some(d=>d.path===p)){const id='d'+slug(p).slice(0,60)+'-'+(Math.abs([...p].reduce((h,c)=>h*31+c.charCodeAt(0)|0,7))).toString(36);D.folders.set(id,{id,path:p,name:parts[i-1],parent:parts.slice(0,i-1).join('/')});await ref('folders').doc(id).set({path:p,name:parts[i-1],parent:parts.slice(0,i-1).join('/'),uid:ME.id,ts:Date.now()})}}}
async function uploadMany(list,base){if(!list.length)return;let n=0;
 for(const {file,rel} of list){const path=[base,rel].filter(Boolean).join('/');const f=await uploadOne(file,path,true);if(f)n++}
 if(n)logAct(`a partagé ${n} fichier${n>1?'s':''}`,`dans « ${base||'Fichiers du plot'} »`,'fichiers');
 setTimeout(uplRefresh,4200)}
async function uploadOne(file,path,quietLog){
 const u={name:(path?path+'/':'')+file.name,p:0};FL.up.push(u);uplRefresh();
 if(file.size>MAX_FILE){u.err='Trop gros (max 25 Mo)';u.done=Date.now();uplRefresh();return null}
 if(usedBytes()+file.size>QUOTA*0.7){u.err='Espace gratuit presque plein';u.done=Date.now();uplRefresh();return null}
 try{await ensureFolders(path);const id=uid('f');const n=Math.max(1,Math.ceil(file.size/CHUNK));
  for(let i=0;i<n;i++){const b64=await b64Of(file.slice(i*CHUNK,(i+1)*CHUNK));await ref('chunks').doc(id+'_'+i).set({d:b64});u.p=(i+1)/n;uplRefresh()}
  const meta={name:file.name,path,size:file.size,type:file.type||'',chunks:n,uid:ME.id,byName:ME.name,ts:Date.now()};
  await ref('files').doc(id).set(meta);D.files.set(id,{id,...meta});u.done=Date.now();uplRefresh();if(!quietLog)logAct('a partagé',file.name,'fichiers');if(CUR==='fichiers')scheduleRender();return{id,...meta}}
 catch(e){u.err=e.code==='resource-exhausted'?'Quota du jour atteint':'Échec de l\'envoi';u.done=Date.now();uplRefresh();console.error(e);return null}}
function b64Of(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=rej;r.readAsDataURL(blob)})}
async function fileBlob(id){if(BLOBS.has(id))return BLOBS.get(id);const f=D.files.get(id);if(!f)throw new Error('Fichier introuvable');
 const parts=[];for(let i=0;i<f.chunks;i++){const s=await ref('chunks').doc(id+'_'+i).get();const d=s.data()?.d||'';const bin=atob(d);const u8=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u8[k]=bin.charCodeAt(k);parts.push(u8)}
 const b=new Blob(parts,{type:f.type||'application/octet-stream'});BLOBS.set(id,b);return b}
async function downloadFile(id){const f=D.files.get(id);if(!f)return;toast('Téléchargement de '+f.name+'…');try{saveFile(f.name,await fileBlob(id))}catch(e){toast('Téléchargement impossible.','bad')}}
async function previewFile(id){const f=D.files.get(id);if(!f)return;
 if(!(isImg(f)||isPdf(f)||(isText(f)&&f.size<300000)))return downloadFile(id);
 const o=openModal(f.name,`<div class="preview"><div class="empty small">Chargement…</div></div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" onclick="downloadFile('${f.id}')">${ui('download',16)} Télécharger</button></div>`,true);
 try{const b=await fileBlob(id);const box=$('.preview',o);if(!box)return;const url=URL.createObjectURL(b);
  if(isImg(f))box.innerHTML=`<img src="${url}" alt="${esc(f.name)}">`;else if(isPdf(f))box.innerHTML=`<iframe src="${url}" title="${esc(f.name)}"></iframe>`;else box.innerHTML=`<pre>${esc(await b.text())}</pre>`}
 catch(e){const box=$('.preview',o);if(box)box.innerHTML='<div class="empty small">Aperçu impossible.</div>'}}
async function delFile(id,silent){const f=D.files.get(id);if(!f)return;if(!silent&&!await confirmBox(`Supprimer « ${f.name} » pour tout le groupe ?`))return;
 for(let i=0;i<f.chunks;i++)ref('chunks').doc(id+'_'+i).delete().catch(()=>{});await del('files',id,silent?null:['a supprimé le fichier',f.name,'fichiers'])}
async function delFolder(p){const L=under(p);if(!await confirmBox(`Supprimer le dossier « ${p.split('/').pop()} » et ses ${L.length} fichier${L.length>1?'s':''} ?`))return;
 for(const f of L)await delFile(f.id,true);arr('folders').filter(d=>d.path===p||d.path.startsWith(p+'/')).forEach(d=>del('folders',d.id));logAct('a supprimé le dossier',p,'fichiers')}
async function newFolder(){const n=await promptBox('Nom du nouveau dossier');if(!n)return;const name=n.replace(/[\/\\]/g,'-');await ensureFolders([FL.path,name].filter(Boolean).join('/'));logAct('a créé le dossier',name,'fichiers');scheduleRender()}
async function renameFile(id){const f=D.files.get(id);const n=await promptBox('Nouveau nom',f.name);if(!n||n===f.name)return;await put('files',id,{...stripId(f),name:n.replace(/[\/\\]/g,'-')},['a renommé',`${f.name} → ${n}`,'fichiers'])}
async function zipFolder(p){if(!window.JSZip)return toast('Module zip indisponible.','bad');const L=under(p);if(!L.length)return toast('Dossier vide.');toast(`Préparation du zip (${L.length} fichiers)…`);
 const z=new JSZip();for(const f of L){const rel=((f.path||'').slice(p.length).replace(/^\//,'')+'/'+f.name).replace(/^\//,'');z.file(rel,await fileBlob(f.id))}
 saveFile((p.split('/').pop()||'fichiers')+'.zip',await z.generateAsync({type:'blob'}))}
