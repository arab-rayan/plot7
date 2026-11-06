/* ===================== SERVEURS PROXMOX ===================== */
/* Proxmox réserve son cookie de connexion à son propre site : affiché dans un cadre à l'intérieur
   d'un autre site, il répond « 401 : No ticket ». On ouvre donc chaque serveur dans sa fenêtre. */
let SV={st:{},lna:null};
function servers(){const L=D.meta.get('servers')?.list;if(L)return L;const P=pveCfg();const e=(D.sites.get('plot7')?.eq||[]).find(x=>x.type==='serveur');
 return P.host?[{id:'s1',name:e?.name||'Serveur 1',host:P.host,port:P.port||8006,target:P.target||'',role:'Proxmox VE'}]:[]}
const srvUrl=s=>s?.host?`https://${s.host}:${s.port||8006}/`:'';
const svPill=id=>{const s=id?SV.st[id]:(()=>{const v=Object.values(SV.st);return v.includes('ok')?'ok':v.includes('err')?'err':v.includes('checking')?'checking':'idle'})();return `<span class="pill ${s==='ok'?'ok':s==='err'?'bad':s==='checking'?'acc':''}">${s==='ok'?'Joignable':s==='err'?'Injoignable':s==='checking'?'Test…':'Non testé'}</span>`};
async function lnaState(){if(!navigator.permissions)return null;for(const name of ['local-network-access','local-network']){try{return (await navigator.permissions.query({name})).state}catch(e){}}return null}
async function svProbe(id){const s=servers().find(x=>x.id===id);if(!s?.host)return;SV.st[id]='checking';svPaint(id);
 const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),6000);
 try{await fetch(srvUrl(s),{mode:'no-cors',signal:ctl.signal,cache:'no-store'});SV.st[id]='ok'}catch(e){SV.st[id]='err'}finally{clearTimeout(t)}
 SV.lna=await lnaState();svPaint(id)}
function svPaint(id){$$(`[data-svp="${id}"]`).forEach(el=>el.innerHTML=svPill(id));const h=$(`[data-svh="${id}"]`);if(h)h.hidden=SV.st[id]!=='err';const l=$('#svLna');if(l)l.hidden=SV.lna!=='denied'}
function svOpen(id){const s=servers().find(x=>x.id===id);if(!s?.host)return svEdit(id);const W=screen.availWidth,H=screen.availHeight;const w=Math.round(Math.min(W*0.66,1500));
 const win=window.open(srvUrl(s),'proxmox-'+SPACE+'-'+id,`popup,width=${w},height=${H-40},left=${W-w},top=0`);if(!win)toast('Ton navigateur a bloqué la fenêtre : autorise les fenêtres pop-up pour ce site.','bad');else win.focus()}

VIEWS.serveur=function(){const L=servers();
 $('#view').innerHTML=pageHead('Serveurs Proxmox','Chaque serveur s\'ouvre dans sa propre fenêtre, à droite de l\'écran : le site reste à gauche avec la discussion et l\'appel.',`<button class="btn primary" onclick="svEdit()">${ui('plus',16)} Ajouter un serveur</button>`)+
 `<p class="small" id="svLna" ${SV.lna==='denied'?'':'hidden'} style="padding:12px 14px;border-radius:12px;background:var(--bad-soft)"><b>Chrome bloque l'accès au réseau local pour ce site.</b> Clique sur l'icône de réglages à gauche de l'adresse › « Appareils du réseau local » › <b>Autoriser</b>, puis Tester.</p>
 <div class="srv-list">${L.map(s=>`<section class="card srv-hero"><div class="row between" style="gap:18px">
  <div class="row" style="gap:16px;flex-wrap:nowrap;min-width:0">${icon('serveur',58)}<div style="min-width:0"><div class="row" style="gap:10px"><h2 style="margin:0">${esc(s.name)}</h2><span data-svp="${s.id}">${svPill(s.id)}</span></div>
   <div class="mono small" style="margin-top:6px">${s.host?esc(srvUrl(s)):'Adresse non renseignée'}</div>${s.role||s.target?`<div class="tiny muted" style="margin-top:4px">${esc(s.role||'')}${s.role&&s.target?' · ':''}${s.target?`adresse prévue <span class="mono">${esc(s.target)}</span>`:''}</div>`:''}</div></div>
  <div class="row" style="gap:8px"><button class="btn primary lg" onclick="svOpen('${s.id}')">${ui('ext',18)} Ouvrir</button><a class="btn lg" href="${esc(srvUrl(s)||'#')}" target="_blank" rel="noopener" title="Dans un nouvel onglet">${ui('plus',16)} Onglet</a><button class="btn lg" onclick="svProbe('${s.id}')" title="Tester la connexion">${ui('refresh',16)} Tester</button><button class="btn lg ghost" onclick="svEdit('${s.id}')" title="Modifier le nom ou l'adresse">${ui('edit',16)}</button></div></div>
  <div class="srv-help" data-svh="${s.id}" ${SV.st[s.id]==='err'?'':'hidden'}>${ui('close',16)}<div><b>Le site n'arrive pas à joindre ${esc(s.host)}.</b> <a href="${esc(srvUrl(s))}" target="_blank" rel="noopener">Ouvre l'adresse dans un onglet</a> : avertissement de sécurité → « Paramètres avancés » › « Continuer vers le site », puis Tester. Si la page ne charge pas du tout, tu n'es pas sur le réseau du lycée ou l'adresse a changé (<span class="mono">ip a</span> sur la console du serveur).</div></div></section>`).join('')||`<div class="empty big">${icon('serveur',48)}<h3>Aucun serveur</h3><p>Ajoute le serveur Proxmox du plot avec son adresse IP.</p><button class="btn primary" onclick="svEdit()">${ui('plus',16)} Ajouter un serveur</button></div>`}</div>
 <div class="grid g-2" style="margin-top:18px">
  <div class="explain small"><b>Pourquoi pas directement dans la page ?</b> On a essayé : Proxmox refuse de garder la connexion quand il est affiché à l'intérieur d'un autre site (« Erreur 401 : No ticket »), dans tous les navigateurs. C'est une protection de Proxmox, pas un bug du site.</div>
  <div class="explain small"><b>« Non sécurisé » dans la barre d'adresse ?</b> Ça vient du certificat auto-signé de Proxmox, utilisé pour tester si le serveur répond. Le site lui-même reste en HTTPS, et tes données ne passent pas par le serveur.</div>
 </div>`;
 L.forEach(s=>{if(!SV.st[s.id]||SV.st[s.id]==='idle')svProbe(s.id)});
};
function onLeave(prev){if(prev==='chat'&&typeof CH!=='undefined')CH.list=true}
function svEdit(id){const L=clone(servers());const s=id?L.find(x=>x.id===id):null;
 openForm({title:s?'Modifier le serveur':'Ajouter un serveur',values:s||{port:8006,role:'Proxmox VE'},fields:[{k:'name',label:'Nom du serveur',placeholder:'Ex. PVE-PLOT7',wide:true},{k:'host',label:'Adresse IP',placeholder:'Ex. 10.113.7.1'},{k:'port',label:'Port',type:'number'},{k:'role',label:'Rôle (facultatif)',placeholder:'Ex. Proxmox VE 9.2'},{k:'target',label:'Adresse prévue (facultatif)'}],
  onSave:async v=>{if(!v.name||!v.host)return toast('Le nom et l\'adresse IP sont obligatoires.','bad');const data={name:v.name,host:v.host.replace(/^https?:\/\//,'').replace(/[:/].*$/,''),port:+v.port||8006,role:v.role,target:v.target};
   if(s){const old=s.name;Object.assign(s,data);renameEq(old,data.name,data.host)}else L.push({id:uid('s'),...data});
   SV.st={};await put('meta','servers',{list:L},[s?'a modifié le serveur':'a ajouté le serveur',data.name,'serveur']);renderView()},
  onDelete:s?async()=>{await put('meta','servers',{list:L.filter(x=>x.id!==id)},['a retiré le serveur',s.name,'serveur']);renderView()}:null})}
/* Garde le schéma d'infrastructure à jour quand on renomme un serveur */
function renameEq(old,name,ip){const st=clone(D.sites.get('plot7'));if(!st)return;const e=st.eq.find(x=>x.type==='serveur'&&x.name===old);if(!e||(e.name===name&&e.ip===ip))return;e.name=name;e.ip=ip;put('sites','plot7',stripId(st))}
