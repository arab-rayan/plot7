/* ===================== FICHIERS ===================== */
/* Les fichiers sont envoyés dans un dossier Google Drive partagé (15 Go gratuits) ; Firestore ne garde que le nom et le lien.
   Les anciens fichiers (découpés en morceaux dans Firestore) restent lisibles. Photos réduites automatiquement. */
const CHUNK=700*1024,MAX_FILE=150*1048576,GSCOPE='https://www.googleapis.com/auth/drive';
let GT={tok:null,exp:0};
try{const o=JSON.parse(localStorage.getItem('p7-gt')||'null');if(o&&o.exp>Date.now()+60000)GT=o}catch(e){}
const gLoad=()=>new Promise((res,rej)=>{if(window.google?.accounts?.oauth2)return res();const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
async function gToken(){if(GT.tok&&Date.now()<GT.exp-60000)return GT.tok;
 try{await gLoad()}catch(e){toast('Impossible de joindre Google (réseau bloqué ?).','bad');return null}
 return new Promise(res=>{const tc=google.accounts.oauth2.initTokenClient({client_id:window.GOOGLE_CLIENT_ID,scope:GSCOPE,
  callback:r=>{if(r.access_token){GT={tok:r.access_token,exp:Date.now()+(+r.expires_in||3600)*1000};try{localStorage.setItem('p7-gt',JSON.stringify(GT));localStorage.setItem('p7-g','1')}catch(e){}gPaint();res(GT.tok)}else res(null)},
  error_callback:()=>res(null)});tc.requestAccessToken({prompt:''})})}
async function gFetch(url,o={}){let t=await gToken();if(!t)throw new Error('nogoogle');const go=()=>fetch(url,{...o,headers:{...(o.headers||{}),Authorization:'Bearer '+t}});let r=await go();if(r.status===401){GT={tok:null,exp:0};t=await gToken();if(!t)throw new Error('nogoogle');r=await go()}return r}
async function gFolder(){const m=D.meta.get('drive');if(m?.folderId)return m.folderId;
 const r=await gFetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Plot 7 – fichiers',mimeType:'application/vnd.google-apps.folder'})});
 if(!r.ok)throw new Error('folder');const j=await r.json();await put('meta','drive',{folderId:j.id,ownerId:ME.id,ownerName:ME.name});return j.id}
function gUpload(file,folder,onp){return new Promise(async(res,rej)=>{try{
 const r=await gFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':file.type||'application/octet-stream'},body:JSON.stringify({name:file.name,parents:[folder]})});
 if(!r.ok)return rej(new Error(r.status===404?'noaccess':'init'));const loc=r.headers.get('Location');
 const x=new XMLHttpRequest();x.open('PUT',loc);x.upload.onprogress=e=>{if(e.lengthComputable)onp(e.loaded/e.total)};x.onload=()=>{try{x.status<300?res(JSON.parse(x.responseText).id):rej(new Error('put'))}catch(e){rej(e)}};x.onerror=()=>rej(new Error('net'));x.send(file)}catch(e){rej(e)}})}
async function shrinkImage(file){if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size<350*1024)return file;
 try{const bm=await createImageBitmap(file,{imageOrientation:'from-image'});const k=Math.min(1,1600/Math.max(bm.width,bm.height));const w=Math.round(bm.width*k),h=Math.round(bm.height*k);
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(bm,0,0,w,h);
  const b=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.82));if(!b||(k===1&&b.size>=file.size*0.9))return file;
  return new File([b],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'})}catch(e){return file}}
function gStatus(){const m=D.meta.get('drive');const owner=m&&m.ownerId===ME?.id;
 if(!GT.tok)return `<button class="btn" onclick="gConnect()">${ui('refresh',15)} Se connecter à Google Drive</button><span class="tiny muted">Nécessaire pour envoyer et ouvrir les fichiers</span>`;
 return `<span class="tiny"><b>Drive connecté</b> · 15 Go · photos réduites automatiquement</span><span class="row" style="gap:6px">${m?.folderId?`<a class="btn sm ghost" target="_blank" rel="noopener" href="https://drive.google.com/drive/folders/${m.folderId}">Ouvrir le dossier</a>`:''}${owner?`<button class="btn sm ghost" onclick="gShare()">Partager avec l'équipe</button>`:''}</span>`}
function gPaint(){const el=$('#gst');if(el)el.innerHTML=gStatus()}
async function gConnect(){if(!await gToken())return toast('Connexion Google annulée.','bad');try{await gFolder()}catch(e){}gPaint()}
async function gShare(){const v=await promptBox('Adresses Gmail à qui donner accès (séparées par des virgules)');if(!v)return;let ok=0;const f=await gFolder();
 for(const em of v.split(/[,\s;]+/).filter(x=>x.includes('@'))){try{const r=await gFetch(`https://www.googleapis.com/drive/v3/files/${f}/permissions?sendNotificationEmail=false`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'writer',type:'user',emailAddress:em})});if(r.ok)ok++}catch(e){}}
 toast(ok?`Dossier partagé avec ${ok} personne${ok>1?'s':''}.`:'Partage impossible (adresse invalide ?).',ok?'':'bad')}
document.addEventListener('pointerdown',()=>{if(!localStorage.getItem('p7-g')||typeof ME==='undefined'||!ME)return;if((!GT.tok||GT.exp-Date.now()<600000)&&Date.now()-(window.__gtry||0)>30000){window.__gtry=Date.now();GT.tok=null;gToken().then(gPaint).catch(()=>{})}});
/* Dossier Drive réel pour chaque dossier du site (créés à la demande, mémorisés dans Firestore) */
async function gMkdir(name,parent){const r=await gFetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[parent]})});if(!r.ok)throw new Error('mkdir');return (await r.json()).id}
async function gDirId(path){let parent=await gFolder();if(!path)return parent;const parts=path.split('/');
 for(let i=1;i<=parts.length;i++){const p=parts.slice(0,i).join('/');const d=arr('folders').find(x=>x.path===p);
  if(d&&d.drive){parent=d.drive;continue}
  const id=await gMkdir(parts[i-1],parent);if(d){d.drive=id;ref('folders').doc(d.id).update({drive:id}).catch(()=>{})}parent=id}
 return parent}
const gPatch=(id,body)=>gFetch(`https://www.googleapis.com/drive/v3/files/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>{});
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
  <div class="quota" id="gst">${gStatus()}</div></div>
 <div id="upl">${uplHtml()}</div>
 <div class="card flist dropzone" id="dz">${dirs.length||files.length?`<table><thead><tr><th>Nom</th><th>Taille</th><th>Ajouté par</th><th>Date</th><th></th></tr></thead><tbody>
  ${p?`<tr class="up-row" onclick="goFolder('${esc(p.split('/').slice(0,-1).join('/'))}')"><td colspan="5"><span class="row">${ui('folder',18)} ..</span></td></tr>`:''}
  ${dirs.map(d=>{const n=under(d.path);return `<tr class="dir" onclick="goFolder('${esc(d.path)}')"><td><span class="row" style="flex-wrap:nowrap">${folderGlyph()}<b>${esc(d.name)}</b></span></td><td class="muted small">${n.length} fichier${n.length>1?'s':''}</td><td></td><td></td><td class="acts" onclick="event.stopPropagation()">${d.drive?`<a class="btn sm ghost" target="_blank" rel="noopener" title="Ouvrir dans Drive" href="https://drive.google.com/drive/folders/${d.drive}">${ui('ext',15)}</a>`:''}<button class="btn sm ghost" title="Télécharger le dossier (zip)" onclick="zipFolder('${esc(d.path)}')">${ui('download',15)}</button><button class="btn sm ghost" title="Supprimer le dossier" onclick="delFolder('${esc(d.path)}')">${ui('trash',15)}</button></td></tr>`}).join('')}
  ${files.map(f=>{const u=member(f.uid);return `<tr><td><span class="row" style="flex-wrap:nowrap;min-width:0">${fileIcon(f)}<a href="javascript:void 0" onclick="previewFile('${f.id}')" class="fname">${esc(f.name)}</a></span></td><td class="muted small">${fmtSize(f.size)}</td><td>${avatar(u.name||f.byName,u.color)} <span class="small">${esc(u.name||f.byName)}</span></td><td class="muted small">${ago(f.ts)}</td><td class="acts"><button class="btn sm ghost" title="Télécharger" onclick="downloadFile('${f.id}')">${ui('download',15)}</button><button class="btn sm ghost" title="Renommer" onclick="renameFile('${f.id}')">${ui('edit',15)}</button><button class="btn sm ghost" title="Supprimer" onclick="delFile('${f.id}')">${ui('trash',15)}</button></td></tr>`}).join('')}
 </tbody></table>`:`<div class="empty big">${ui('upload',34)}<h3>${p?'Dossier vide':'Aucun fichier pour l\'instant'}</h3><p>${matchMedia('(pointer:coarse)').matches?'Touche « Envoyer des fichiers » en haut.':'Glisse des fichiers ou un dossier ici, ou utilise les boutons en haut.'}</p></div>`}
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
 const u={name:(path?path+'/':'')+file.name,p:0};FL.up.push(u);uplRefresh();const fail=m=>{u.err=m;u.done=Date.now();uplRefresh();return null};
 if(file.size>MAX_FILE)return fail('Trop gros (max 150 Mo)');
 try{if(!await gToken())return fail('Connexion Google requise');
  file=await shrinkImage(file);await ensureFolders(path);const folder=await gDirId(path);const id=uid('f');
  const did=await gUpload(file,folder,p=>{u.p=p;uplRefresh()});
  const meta={name:file.name,path,size:file.size,type:file.type||'',chunks:0,drive:did,uid:ME.id,byName:ME.name,ts:Date.now()};
  await ref('files').doc(id).set(meta);D.files.set(id,{id,...meta});u.p=1;u.done=Date.now();uplRefresh();if(!quietLog)logAct('a partagé',file.name,'fichiers');if(CUR==='fichiers')scheduleRender();return{id,...meta}}
 catch(e){console.error(e);return fail(e.message==='noaccess'?'Pas d\'accès au dossier Drive':'Échec de l\'envoi')}}
function b64Of(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=rej;r.readAsDataURL(blob)})}
async function fileBlob(id){if(BLOBS.has(id))return BLOBS.get(id);const f=D.files.get(id);if(!f)throw new Error('Fichier introuvable');
 if(f.drive){const r=await gFetch(`https://www.googleapis.com/drive/v3/files/${f.drive}?alt=media`);if(!r.ok)throw new Error('drive '+r.status);const b=new Blob([await r.blob()],{type:f.type||'application/octet-stream'});BLOBS.set(id,b);return b}
 const parts=[];for(let i=0;i<f.chunks;i++){const s=await ref('chunks').doc(id+'_'+i).get();const d=s.data()?.d||'';const bin=atob(d);const u8=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u8[k]=bin.charCodeAt(k);parts.push(u8)}
 const b=new Blob(parts,{type:f.type||'application/octet-stream'});BLOBS.set(id,b);return b}
async function downloadFile(id){const f=D.files.get(id);if(!f)return;toast('Téléchargement de '+f.name+'…');try{saveFile(f.name,await fileBlob(id))}catch(e){toast(String(e.message).includes('404')?'Pas d\'accès au dossier Drive : demande à celui qui l\'a créé de le partager avec toi.':'Téléchargement impossible.','bad')}}
async function previewFile(id){const f=D.files.get(id);if(!f)return;
 if(!(isImg(f)||isPdf(f)||(isText(f)&&f.size<300000)))return downloadFile(id);
 const o=openModal(f.name,`<div class="preview"><div class="empty small">Chargement…</div></div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" onclick="downloadFile('${f.id}')">${ui('download',16)} Télécharger</button></div>`,true);
 try{const b=await fileBlob(id);const box=$('.preview',o);if(!box)return;const url=URL.createObjectURL(b);
  if(isImg(f))box.innerHTML=`<img src="${url}" alt="${esc(f.name)}">`;else if(isPdf(f))box.innerHTML=`<iframe src="${url}" title="${esc(f.name)}"></iframe>`;else box.innerHTML=`<pre>${esc(await b.text())}</pre>`}
 catch(e){const box=$('.preview',o);if(box)box.innerHTML='<div class="empty small">Aperçu impossible.</div>'}}
async function delFile(id,silent){const f=D.files.get(id);if(!f)return;if(!silent&&!await confirmBox(`Supprimer « ${f.name} » pour tout le groupe ?`))return;
 for(let i=0;i<f.chunks;i++)ref('chunks').doc(id+'_'+i).delete().catch(()=>{});
 if(f.drive)gFetch(`https://www.googleapis.com/drive/v3/files/${f.drive}`,{method:'DELETE'}).then(r=>{if(!r.ok)return gFetch(`https://www.googleapis.com/drive/v3/files/${f.drive}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})})}).catch(()=>{});
 await del('files',id,silent?null:['a supprimé le fichier',f.name,'fichiers'])}
async function delFolder(p){const L=under(p);if(!await confirmBox(`Supprimer le dossier « ${p.split('/').pop()} » et ses ${L.length} fichier${L.length>1?'s':''} ?`))return;
 for(const f of L)await delFile(f.id,true);arr('folders').filter(d=>d.path===p||d.path.startsWith(p+'/')).forEach(d=>{if(d.drive&&GT.tok)gPatch(d.drive,{trashed:true});del('folders',d.id)});logAct('a supprimé le dossier',p,'fichiers')}
async function newFolder(){const n=await promptBox('Nom du nouveau dossier');if(!n)return;const name=n.replace(/[\/\\]/g,'-');const np=[FL.path,name].filter(Boolean).join('/');await ensureFolders(np);if(GT.tok)gDirId(np).catch(()=>{});logAct('a créé le dossier',name,'fichiers');scheduleRender()}
async function renameFile(id){const f=D.files.get(id);const n=await promptBox('Nouveau nom',f.name);if(!n||n===f.name)return;if(f.drive&&GT.tok)gPatch(f.drive,{name:n.replace(/[\/\\]/g,'-')});await put('files',id,{...stripId(f),name:n.replace(/[\/\\]/g,'-')},['a renommé',`${f.name} → ${n}`,'fichiers'])}
async function zipFolder(p){try{await need('jszip')}catch(e){return toast('Module zip indisponible.','bad')}const L=under(p);if(!L.length)return toast('Dossier vide.');toast(`Préparation du zip (${L.length} fichiers)…`);
 const z=new JSZip();for(const f of L){const rel=((f.path||'').slice(p.length).replace(/^\//,'')+'/'+f.name).replace(/^\//,'');z.file(rel,await fileBlob(f.id))}
 saveFile((p.split('/').pop()||'fichiers')+'.zip',await z.generateAsync({type:'blob'}))}
