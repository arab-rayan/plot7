# Plot virtuel 7 — espace de travail du groupe

BTS SIO SISR · Lycée Turgot. Rayan, Selene, Aksil, Walid.

Site statique (GitHub Pages) + base Firestore gratuite (projet Firebase `pilotage-mairie-de-veau`, collections préfixées `p7_`).

## Pages
- **Serveur Proxmox** : l'interface web de Proxmox affichée dans un écran à l'intérieur du site (réseau du lycée).
- **Infrastructure** : schéma modifiable (topologie, plan, 3D, baie, tableaux), exports PDF/PNG/SVG.
- **Tâches et planning**, **Discussion** (3 salons), **Fichiers** (dossiers, 25 Mo max par fichier), **Appel** (audio, caméra, partage d'écran en WebRTC), **Équipe**.

## Mettre à jour le site
Remplace tous les fichiers du dépôt par ceux-ci, puis Commit. Les numéros `?v=7` dans `index.html` forcent les navigateurs à recharger les fichiers : augmente-les à chaque mise à jour.

## Sécurité
Toute personne qui a le lien peut lire et modifier (règles Firestore ouvertes). Les identifiants Proxmox ne passent jamais par le site : on se connecte directement à Proxmox dans l'écran.
- **Application** : installable (manifest + service worker) sur ordinateur, Android et iPhone.
