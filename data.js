/* ===================== Données de départ du Plot virtuel 7 ===================== */
const PLOT={num:7,name:'Plot virtuel 7',net:'10.113.7.x/16',gw:'10.113.10.113',dns:'10.113.10.113'};
const DEFAULT_MEMBERS=[
 {id:'p1',name:'Rayan',role:'',color:'#2d5bd8'},
 {id:'p2',name:'Selene',role:'',color:'#d9822b'},
 {id:'p3',name:'Aksil',role:'',color:'#8b4fd1'},
 {id:'p4',name:'Walid',role:'',color:'#1f9d74'}
];
const DEFAULT_PVE={host:'10.113.4.1',port:8006,target:'10.113.7.1'};
const EQ={
 cloud:{l:'Internet',cat:'Réseau',d:'Le réseau public mondial. Tout ce qui vient d\'Internet est considéré comme non fiable : il doit passer par un pare-feu avant d\'atteindre le SI.'},
 box:{l:'Box opérateur (FAI)',cat:'Réseau',d:'Fournie par l\'opérateur, elle relie le bâtiment à Internet (fibre ou ADSL). Elle sert de point d\'entrée WAN ; le pare-feu du site se place juste derrière elle.'},
 routeur:{l:'Routeur',cat:'Réseau',d:'Équipement de niveau 3 (couche réseau) : il fait passer les paquets d\'un réseau IP à un autre en consultant sa table de routage.'},
 parefeu:{l:'Pare-feu',cat:'Sécurité',d:'Filtre le trafic entre zones selon des règles (adresses, ports, protocoles). Ici il route aussi entre les VLAN, termine le tunnel VPN vers la mairie et peut héberger le portail captif.'},
 switch:{l:'Switch (commutateur)',cat:'Réseau',d:'Relie les équipements d\'un réseau local. Un switch de niveau 2 commute les trames grâce aux adresses MAC et sépare les VLAN (norme 802.1Q) ; un switch de niveau 3 sait aussi router entre VLAN. Un switch PoE alimente les bornes Wi-Fi par le câble.'},
 wifi:{l:'Point d\'accès Wi-Fi',cat:'Réseau',d:'Diffuse des réseaux sans fil (SSID). Chaque SSID est associé à un VLAN : le Wi-Fi des agents et celui du public ne se voient pas. Alimenté en PoE par le switch.'},
 brassage:{l:'Panneau de brassage',cat:'Câblage',d:'Point d\'arrivée des câbles des prises murales dans la baie. Des cordons courts le relient au switch : on peut changer une prise de VLAN sans toucher au câblage du bâtiment.'},
 onduleur:{l:'Onduleur (UPS)',cat:'Énergie',d:'Batterie qui maintient l\'alimentation de la baie quelques minutes en cas de coupure et protège des surtensions. Il participe à la continuité de service.'},
 serveur:{l:'Serveur / hyperviseur',cat:'Serveurs',d:'Machine physique puissante. Avec un hyperviseur (Proxmox VE), elle héberge plusieurs machines virtuelles : c\'est la mutualisation demandée par le CDC (EX-17).'},
 vm:{l:'Machine virtuelle',cat:'Serveurs',d:'Serveur logiciel qui tourne sur un hyperviseur. Plusieurs VM partagent le même matériel, se sauvegardent facilement et peuvent basculer sur un autre hôte en cas de panne.'},
 nas:{l:'NAS (stockage réseau)',cat:'Serveurs',d:'Boîtier de disques accessible par le réseau. Ici il reçoit les sauvegardes des machines virtuelles (EX-14).'},
 poste:{l:'Poste du plot',cat:'Postes',d:'Ordinateur de la salle utilisé par un membre du plot. On s\'en sert pour administrer le serveur Proxmox (interface web sur le port 8006) et pour tester les services des machines virtuelles.'},
 public:{l:'Poste public',cat:'Postes',d:'Ordinateur en libre accès pour les usagers. Session invitée sans données persistantes, placé dans un VLAN séparé des agents.'},
 borne:{l:'Borne catalogue (OPAC)',cat:'Postes',d:'Écran en mode kiosque qui n\'affiche que le catalogue en ligne de la bibliothèque. Aucun autre usage possible.'},
 automate:{l:'Automate de prêt / retour',cat:'Métier',d:'Fourni par un prestataire : l\'usager y enregistre lui-même ses prêts et retours (QR code, code-barres). Nous documentons son raccordement et son flux vers le logiciel de gestion, pas son fonctionnement interne.'},
 imprimante:{l:'Imprimante réseau',cat:'Périphériques',d:'Imprimante raccordée au réseau, placée dans le VLAN des périphériques et partagée via le serveur d\'impression.'},
 peripherique:{l:'Périphérique USB',cat:'Périphériques',d:'Équipement branché en USB sur un poste (ici un lecteur de codes-barres). Il n\'a pas d\'adresse IP.'},
 mobile:{l:'Terminal mobile',cat:'Postes',d:'Smartphone ou tablette d\'un usager ou d\'un agent, connecté en Wi-Fi.'},
 service:{l:'Service / application',cat:'Logique',d:'Service logiciel (application métier, annuaire…). Il appartient à l\'architecture logique : il tourne sur une VM ou un serveur.'}
};
const EQ_FIELDS={ // champs spécifiques par type
 switch:[['niveau','Niveau OSI','select',['2','3']],['ports','Nombre de ports'],['poe','PoE','select',['Oui','Non']]],
 wifi:[['ssid','SSID diffusés'],['norme','Norme Wi-Fi']],
 parefeu:[['logiciel','Logiciel'],['vpn','VPN']],
 serveur:[['cpu','CPU / RAM'],['stockage','Stockage']],
 vm:[['hote','Hôte (hyperviseur)'],['services','Services']],
 poste:[['session','Session']],public:[['session','Session']],
 imprimante:[['modele','Modèle']],onduleur:[['autonomie','Autonomie']],brassage:[['ports','Nombre de ports']]
};
const LINKS={
 rj45:{l:'Câble cuivre RJ45',layer:'physique',dash:''},
 trunk:{l:'Trunk 802.1Q (plusieurs VLAN)',layer:'physique',dash:''},
 fibre:{l:'Fibre optique',layer:'physique',dash:''},
 wifi:{l:'Liaison Wi-Fi',layer:'physique',dash:'2 5'},
 usb:{l:'USB',layer:'physique',dash:'1 3'},
 wan:{l:'Liaison Internet / WAN',layer:'physique',dash:''},
 vpn:{l:'Tunnel VPN IPsec',layer:'logique',dash:'10 5'},
 flux:{l:'Flux applicatif',layer:'logique',dash:'6 4'},
 auth:{l:'Authentification',layer:'logique',dash:'6 4'},
 backup:{l:'Sauvegarde',layer:'logique',dash:'6 4'}
};
const VLAN_COLORS={1:'#2d5bd8',2:'#1f9d74',10:'#2d5bd8',20:'#d9822b',30:'#1f9d74',40:'#8b4fd1',99:'#c23b3b',100:'#0e8fa3',200:'#b5486f'};

