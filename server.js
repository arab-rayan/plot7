/* ===================== SERVEUR PROXMOX ===================== */
/* L'interface web de Proxmox est affichée dans un écran à l'intérieur du site (iframe).
   Rien à installer sur le serveur. */
let SV={status:'idle',full:false,key:0};
const pveUrl=()=>{const P=pveCfg();return `https://${P.host}:${P.port}/`};
const svPill=()=>{const s=SV.status;return `<span class="pill ${s==='ok'?'ok':s==='err'?'bad':s==='checking'?'acc':''}">${s==='ok'?'Joignable':s==='err'?'Injoignable':s==='checking'?'Test…':'Non testé'}</span>`};
/* Test simple : le serveur répond-il (et le certificat est-il accepté) ? */
async function svProbe(){SV.status='checking';svBar();
 const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),6000);
 try{await fetch(pveUrl(),{mode:'no-cors',signal:ctl.signal,cache:'no-store'});SV.status='ok'}catch(e){SV.status='err'}finally{clearTimeout(t)}
 svBar();updateShellBits()}
function svBar(){const el=$('#svPill');if(el)el.innerHTML=svPill();const h=$('#svHelp');if(h)h.hidden=SV.status!=='err'}
function svReload(){const f=$('#pveFrame');if(f){f.src='about:blank';setTimeout(()=>{f.src=pveUrl()},50)}svProbe()}
function svFull(){const w=$('#pveWrap');if(!w)return;if(document.fullscreenElement)document.exitFullscreen();else w.requestFullscreen?.()}
function svWindow(){const w=Math.min(1400,screen.availWidth-80),h=Math.min(900,screen.availHeight-80);window.open(pveUrl(),'proxmox-plot7',`popup,width=${w},height=${h},left=40,top=40`)}

VIEWS.serveur=function(){const P=pveCfg();
 $('#view').innerHTML=`<div class="srv-page">
 <div class="srv-bar"><div class="row" style="gap:10px;flex-wrap:nowrap;min-width:0">${icon('serveur',30)}<div style="min-width:0"><b>Proxmox · P7-S1</b><div class="tiny muted mono" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pveUrl())}${P.target&&P.target!==P.host?` → prévu ${esc(P.target)}`:''}</div></div><span id="svPill">${svPill()}</span></div>
  <div class="row" style="gap:6px"><button class="btn sm" onclick="svReload()" title="Recharger">${ui('refresh',15)} Recharger</button><button class="btn sm" onclick="svFull()" title="Plein écran">${ui('fit',15)} Plein écran</button><button class="btn sm" onclick="svWindow()" title="Ouvrir Proxmox dans une fenêtre séparée">${ui('ext',15)} Fenêtre</button><button class="btn sm ghost" onclick="svSettings()" title="Changer l'adresse">${ui('edit',15)}</button><button class="btn sm ghost" onclick="svTips()" title="Aide">?</button></div></div>
 <div class="srv-help" id="svHelp" ${SV.status==='err'?'':'hidden'}>${ui('close',16)}<div><b>Le serveur ne répond pas.</b> Tu dois être sur le réseau du lycée. Si c'est le cas, <a href="${esc(pveUrl())}" target="_blank" rel="noopener">ouvre Proxmox une fois dans un onglet</a>, clique sur « Paramètres avancés » › « Continuer vers le site » pour accepter le certificat, puis reviens ici et clique sur <b>Recharger</b>.</div></div>
 <div class="pve-wrap" id="pveWrap"><iframe id="pveFrame" src="${esc(pveUrl())}" title="Interface Proxmox" allow="local-network; local-network-access; fullscreen; clipboard-read; clipboard-write"></iframe></div></div>`;
 svProbe();
};
function onLeave(prev){}
function svTips(){openModal('Utiliser Proxmox dans le site',`<ol class="steps big-steps">
 <li><b>Être au lycée.</b> Le serveur (${esc(pveCfg().host)}) n'est joignable que depuis le réseau du lycée.</li>
 <li><b>Accepter le certificat, une fois par navigateur.</b> <a href="${esc(pveUrl())}" target="_blank" rel="noopener">Ouvre Proxmox dans un onglet</a>, « Paramètres avancés » › « Continuer vers le site ». Sans ça, l'écran reste blanc.</li>
 <li><b>Se connecter dans l'écran</b> avec ton compte Proxmox (ex. root, royaume « Linux PAM »). Si Chrome demande l'accès aux appareils du réseau local, clique sur <b>Autoriser</b>.</li>
 <li><b>Si tu reviens sans cesse à l'écran de connexion :</b> Chrome et Safari bloquent la connexion d'un autre site affiché dans un cadre. Utilise <b>Firefox</b> pour rester dans le site, ou le bouton <b>Fenêtre</b> : Proxmox s'ouvre dans une fenêtre à côté, et le site reste ouvert.</li></ol>`)}
function svSettings(){const P=pveCfg();
 openForm({title:'Adresse du serveur',values:P,fields:[{k:'host',label:'Adresse IP actuelle',hint:'Pour l\'instant 10.113.4.1 (ancien Plot 4).'},{k:'target',label:'Adresse prévue (Plot 7)',hint:'Pour mémoire. À recopier dans « Adresse IP actuelle » une fois changée sur le serveur.'},{k:'port',label:'Port de l\'interface Proxmox',type:'number'}],
  onSave:v=>put('meta','pve',{host:v.host.trim(),target:v.target.trim(),port:+v.port||8006},['a changé l\'adresse du serveur',v.host,'serveur']).then(()=>renderView())})}
