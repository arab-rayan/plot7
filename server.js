/* ===================== SERVEUR PROXMOX ===================== */
/* Proxmox protège son cookie de connexion : il n'est jamais envoyé quand Proxmox est affiché
   à l'intérieur d'un autre site (d'où « Erreur 401 : No ticket » dans un cadre).
   On ouvre donc Proxmox dans sa propre fenêtre, placée à côté du site. */
let SV={status:'idle',lna:null};
const pveUrl=()=>{const P=pveCfg();return P.host?`https://${P.host}:${P.port||8006}/`:''};
const svPill=()=>{const s=SV.status;return `<span class="pill ${s==='ok'?'ok':s==='err'?'bad':s==='checking'?'acc':''}">${s==='ok'?'Joignable':s==='err'?'Injoignable':s==='checking'?'Test…':'Non testé'}</span>`};
async function lnaState(){if(!navigator.permissions)return null;for(const name of ['local-network-access','local-network']){try{return (await navigator.permissions.query({name})).state}catch(e){}}return null}
async function svProbe(){if(!pveUrl())return;SV.status='checking';svBar();
 const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),6000);
 try{await fetch(pveUrl(),{mode:'no-cors',signal:ctl.signal,cache:'no-store'});SV.status='ok'}catch(e){SV.status='err'}finally{clearTimeout(t)}
 SV.lna=await lnaState();svBar();updateShellBits()}
function svBar(){$$('.svPill').forEach(el=>el.innerHTML=svPill());const h=$('#svDiag');if(h){h.hidden=SV.status!=='err';const l=$('#svLna');if(l)l.hidden=SV.lna!=='denied'}}
function svWindow(){const u=pveUrl();if(!u)return svSettings();const W=screen.availWidth,H=screen.availHeight;const w=Math.round(Math.min(W*0.66,1500));
 const win=window.open(u,'proxmox-'+SPACE,`popup,width=${w},height=${H-40},left=${W-w},top=0`);if(!win)toast('Ton navigateur a bloqué la fenêtre : autorise les fenêtres pop-up pour ce site.','bad');else win.focus()}

VIEWS.serveur=function(){const P=pveCfg();const u=pveUrl();
 $('#view').innerHTML=pageHead('Serveur Proxmox','Le serveur du plot. Proxmox s\'ouvre dans sa propre fenêtre, à côté du site : tu gardes la discussion et l\'appel sous les yeux.')+
 `<section class="card srv-hero"><div class="row between" style="gap:18px">
  <div class="row" style="gap:16px;flex-wrap:nowrap;min-width:0">${icon('serveur',64)}<div style="min-width:0"><div class="row" style="gap:10px"><h2 style="margin:0">${esc((D.sites.get('plot7')?.eq||[]).find(e=>e.type==='serveur')?.name||'Serveur')}</h2><span class="svPill">${svPill()}</span></div>
   <div class="mono small" style="margin-top:6px">${u?esc(u):'Adresse non renseignée'}</div>${P.target&&P.target!==P.host?`<div class="tiny muted" style="margin-top:4px">Adresse prévue : <span class="mono">${esc(P.target)}</span></div>`:''}</div></div>
  <div class="row" style="gap:8px"><button class="btn primary lg" onclick="svWindow()">${ui('ext',18)} Ouvrir Proxmox</button><a class="btn lg" href="${esc(u||'#')}" target="_blank" rel="noopener" title="Dans un nouvel onglet">${ui('plus',16)} Onglet</a><button class="btn lg" onclick="svProbe()" title="Tester la connexion">${ui('refresh',16)} Tester</button><button class="btn lg ghost" onclick="svSettings()" title="Changer l'adresse">${ui('edit',16)}</button></div></div></section>

 <section class="card srv-diag" id="svDiag" ${SV.status==='err'?'':'hidden'}><h3>${ui('close',16)} Le site n'arrive pas à joindre ${esc(P.host||'le serveur')}</h3>
  <p class="small" id="svLna" ${SV.lna==='denied'?'':'hidden'}><b>Chrome bloque l'accès au réseau local pour ce site.</b> Clique sur l'icône de réglages à gauche de l'adresse › « Appareils du réseau local » › <b>Autoriser</b>, puis Tester.</p>
  <ol class="steps"><li><a href="${esc(u||'#')}" target="_blank" rel="noopener">Ouvre ${esc(u)}</a> dans un onglet.</li>
  <li><b>Avertissement de sécurité ?</b> « Paramètres avancés » › « Continuer vers le site » (certificat du serveur, une fois par navigateur), puis Tester.</li>
  <li><b>La page ne charge pas du tout ?</b> Le serveur n'est pas à cette adresse ou tu n'es pas sur le réseau du lycée. Sur la console du serveur, <span class="mono">ip a</span> affiche son adresse (sur vmbr0). Si elle a changé, corrige-la avec le crayon.</li></ol></section>

 <div class="grid g-2" style="margin-top:18px">
  <div class="explain small"><b>Pourquoi Proxmox ne s'affiche pas dans la page ?</b> Proxmox réserve son cookie de connexion à son propre site : affiché à l'intérieur d'un autre site, il refuse tout avec « Erreur 401 : No ticket », dans tous les navigateurs. La fenêtre « Ouvrir Proxmox » se place à droite de l'écran, le site reste à gauche.</div>
  <div class="explain small"><b>Avec l'app installée</b>, Proxmox s'ouvre dans une fenêtre à part de l'app. Pour la console d'une VM : dans Proxmox, sélectionne la VM › <b>Console</b>. Pour montrer ton écran aux autres : page <a href="#appel">Appel</a> › Partager l'écran.</div>
 </div>`;
 if(u)svProbe();
};
function onLeave(prev){}
function svSettings(){const P=pveCfg();
 openForm({title:'Adresse du serveur',values:P,fields:[{k:'host',label:'Adresse IP actuelle du serveur',hint:'Celle qui marche aujourd\'hui (ex. 10.113.4.1).'},{k:'target',label:'Adresse prévue',hint:'Pour mémoire (ex. 10.113.7.1).'},{k:'port',label:'Port de l\'interface Proxmox',type:'number'}],
  onSave:v=>{SV.status='idle';put('meta','pve',{host:v.host.trim(),target:v.target.trim(),port:+v.port||8006},['a changé l\'adresse du serveur',v.host,'serveur']).then(()=>renderView())}})}
