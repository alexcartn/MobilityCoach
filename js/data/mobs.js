// Fiches de mobilisation, reformulées d'après le chapitre 7 de Becoming a Supple Leopard.
// Les schémas sont décrits en angles (voir js/diagram.js) : 0 = droite, 90 = bas, -90 = haut, 180 = gauche.

import { UPPER } from './mobs-upper.js';
import { LOWER } from './mobs-lower.js';
import { HIPS } from './mobs-hips.js';
import { LOWERLEG } from './mobs-lowerleg.js';
import { SHOULDERS } from './mobs-shoulders.js';
import { REST } from './mobs-rest.js';
import { LOT_1 } from './mobs-lot-1.js';
import { LOT_2 } from './mobs-lot-2.js';
import { LOT_3 } from './mobs-lot-3.js';
import { LOT_4 } from './mobs-lot-4.js';

export const SYSTEMS = {
  joint: 'Articulation',
  sliding: 'Glissement des tissus',
  muscle: 'Muscle',
};

export const METHODS = {
  pressure_wave: 'Vague de pression',
  smash_floss: 'Écraser et mobiliser',
  contract_relax: 'Contracter-relâcher',
  oscillation: 'Oscillations',
  band: 'Bande',
  extension: 'Extension active',
};

const CORE = [
  // Zone 7 : hanche avant ---------------------------------------------------------------
  {
    id: 'couch',
    zone: 7,
    name: 'Couch : avant de la hanche et quadriceps',
    summary: 'Ouvre l\'avant de la hanche et de la cuisse, raccourcis par la position assise. Intense : avance par paliers.',
    systems: ['muscle', 'sliding'],
    methods: ['contract_relax', 'oscillation'],
    tools: ['box'],
    toolsNote: 'Un canapé, une chaise solide ou un banc contre un mur.',
    improves: ['Extension de hanche', 'Position haute du squat et du soulevé de terre', 'Posture debout', 'Douleurs du bas du dos, de la hanche et du genou'],
    steps: [
      'Place un support contre un mur. À genoux devant, le genou arrière dans l\'angle au sol, le tibia et le pied appuyés contre le mur ou le support.',
      'Pose l\'autre pied devant toi, tibia vertical. Serre le fessier du côté arrière et gaine le ventre.',
      'Descends les hanches vers le sol pour rapprocher le talon de la fesse.',
      'Reste 1 à 2 minutes, puis redresse le buste en gardant le fessier serré. Si c\'est trop dur, garde les mains sur un support devant toi.',
      'Pour aller plus loin : en fin d\'amplitude, contracte le fessier arrière environ 5 secondes, relâche, puis gagne un peu d\'amplitude pendant 10 secondes. Ou oscille doucement dans et hors de la tension.',
    ],
    faults: [
      'Le genou glisse sur le côté ou s\'écarte du coin.',
      'Tu cambres le bas du dos pour contourner la raideur : fessier serré, ventre gainé.',
      'Le fessier arrière se relâche : reviens à une position plus facile.',
    ],
    retest: [
      'Position haute : debout, fessiers serrés, sans cambrer le bas du dos.',
      'Reprends la position de départ du couch : le talon se rapproche-t-il de la fesse ?',
    ],
    caution: 'Tu dois sentir de l\'inconfort, pas une douleur brûlante ni une décharge nerveuse. Arrête si le genou proteste.',
    seconds: 120, perSide: true, when: 'any',
    relevance: { sitting: 3, travel: 3, sport: 2, back: 2 },
    sports: ['run', 'bike', 'lift'],
    cue: 'Fessier serré, ventre gainé, hanches vers le sol.',
    frames: [
      {
        caption: 'Genou dans l\'angle, pied contre le mur, mains sur la cuisse avant.',
        torso: -62, head: -72,
        legs: [{ thigh: 127, shin: -90, foot: -90 }, { thigh: -5, shin: 90, foot: 0 }],
        arms: [{ upper: 130, fore: 28 }],
        props: [
          { t: 'wall', at: ['knee', -5.5, 0] },
          { t: 'focus', at: ['thigh', 0, 0], r: 14 },
          { t: 'arrow', from: ['hip', 30, -34], to: ['hip', 30, -14] },
        ],
      },
      {
        caption: 'Buste redressé, fessier serré, hanches vers le sol.',
        torso: -90, head: -90,
        legs: [{ thigh: 127, shin: -90, foot: -90 }, { thigh: -5, shin: 90, foot: 0 }],
        arms: [{ upper: 110, fore: 60 }],
        props: [
          { t: 'wall', at: ['knee', -5.5, 0] },
          { t: 'focus', at: ['thigh', 0, 0], r: 14 },
          { t: 'arrow', from: ['hip', 18, -34], to: ['hip', 18, -14] },
        ],
      },
    ],
  },
  {
    id: 'banded_hip_ext',
    zone: 7,
    name: 'Extension de hanche à la bande',
    summary: 'Tire le haut du fémur vers l\'avant de la hanche pour mieux ouvrir la capsule et le muscle.',
    systems: ['joint', 'muscle'],
    methods: ['band', 'contract_relax', 'oscillation'],
    tools: ['band', 'box'],
    toolsNote: 'Un point d\'ancrage solide devant toi, à hauteur basse (pied de rack, poteau).',
    improves: ['Extension de hanche', 'Position haute du squat et du soulevé de terre', 'Posture debout', 'Douleurs du bas du dos, de la hanche et du genou'],
    steps: [
      'Passe la bande au pli de la fesse de la jambe arrière, l\'autre bout accroché devant toi. Recule jusqu\'à ce que la bande soit tendue et mets le genou arrière au sol, pied en rotation interne.',
      'Serre le fessier arrière et gaine le ventre : buste droit, bas du dos non cambré.',
      'Avance tout le corps par-dessus le genou au sol, sans pousser le bassin vers l\'avant.',
      'Oscille doucement dans et hors de la tension. Lève le bras du côté arrière pour atteindre le haut de la hanche.',
    ],
    faults: [
      'Tu cambres le bas du dos en ouvrant la hanche.',
      'Tu pousses le bassin au lieu de déplacer tout le corps vers l\'avant.',
    ],
    retest: ['Position haute : debout, fessiers serrés, sans cambrer.', 'Squat : le bas du mouvement est-il plus stable ?'],
    caution: 'Sans bonne amplitude de départ, préfère la version sans bande (couch) : la bande intensifie beaucoup.',
    seconds: 120, perSide: true, when: 'any',
    relevance: { sitting: 2, sport: 2, back: 1 },
    sports: ['run', 'lift'],
    cue: 'Fesse serrée, avance tout le corps au-dessus du genou.',
    frames: [
      {
        caption: 'Bande au pli de la fesse, ancrée devant. Fesse serrée, poids vers l\'avant.',
        torso: -90, head: -90,
        legs: [{ thigh: 97, shin: 180, foot: 180 }, { thigh: 8, shin: 90, foot: 0 }],
        arms: [{ upper: -105, fore: -105 }, { upper: 110, fore: 60 }],
        props: [
          { t: 'wall', at: ['hip', 100, 0] },
          { t: 'band', from: ['hip', -4, 8], to: ['hip', 100, 20] },
          { t: 'focus', at: ['hip', 6, 6], r: 14 },
          { t: 'arrow', from: ['hip', -26, -14], to: ['hip', -10, -14] },
        ],
      },
    ],
  },
  {
    id: 'quad_smash',
    zone: 7,
    name: 'Quadriceps au rouleau',
    summary: 'Redonne de la souplesse à la grosse masse du devant de la cuisse, qui se raccourcit quand on reste assis.',
    systems: ['sliding'],
    methods: ['pressure_wave', 'smash_floss', 'contract_relax'],
    tools: ['roller'],
    toolsNote: 'Une barre, un tube ou un rouleau dur marchent aussi si le rouleau est trop doux.',
    improves: ['Fonction de la hanche', 'Douleurs du genou, de la hanche et du bas du dos', 'Rotation interne et externe'],
    steps: [
      'À plat ventre sur les avant-bras, rouleau sous une cuisse. Pose l\'autre pied au sol pour répartir ton poids.',
      'Roule lentement d\'un côté à l\'autre, en travers des fibres. Monter et descendre sans intention ne change rien.',
      'Sur un point sensible, arrête-toi, appuie avec tout ton poids puis ramène le talon vers la fesse pour mobiliser les tissus écrasés.',
      'Reste sur la zone jusqu\'à ce que la douleur baisse, puis avance d\'un morceau de cuisse.',
    ],
    faults: [
      'Rouler vite et sans appui : rien ne bouge.',
      'Te cambrer ou lever les hanches pour fuir la douleur : reste gainé.',
    ],
    retest: ['Squat ou position haute : plus facile de rester stable ?', 'Flexion du genou : le talon vient-il plus près de la fesse ?'],
    caution: 'Très inconfortable au début. Respire, visage détendu, reste du côté supportable de la douleur.',
    seconds: 180, perSide: true, when: 'any',
    relevance: { sport: 2, sitting: 2 },
    sports: ['run', 'bike', 'lift'],
    cue: 'Roule lentement en travers, reste sur les points sensibles.',
    frames: [
      {
        caption: 'Rouleau sous la cuisse, appui sur les avant-bras, roulis d\'un côté à l\'autre.',
        torso: 0, head: -18,
        legs: [{ thigh: 172, shin: 172, foot: 110 }, { thigh: 175, shin: 175, foot: 100 }],
        arms: [{ upper: 90, fore: 0 }],
        props: [
          { t: 'roller', at: ['thigh', 0, 13] },
          { t: 'focus', at: ['thigh', 0, 0], r: 13 },
        ],
      },
    ],
  },

  // Zone 5 : tronc ---------------------------------------------------------------------
  {
    id: 'lowback_ball',
    zone: 5,
    name: 'Bas du dos à la balle',
    summary: 'Décolle les tissus raides du bas du dos et du haut du fessier. Un bon point de départ en cas de raideur lombaire.',
    systems: ['sliding'],
    methods: ['pressure_wave'],
    tools: ['ball', 'box'],
    toolsNote: 'Une chaise ou un banc pour poser les pieds.',
    improves: ['Raideur et douleur du bas du dos', 'Posture neutre', 'Capacité de rotation'],
    steps: [
      'Allongé sur le dos, pieds sur une chaise ou un banc, genoux fléchis. Place la balle au-dessus du bassin, à côté de la colonne, jamais dessus.',
      'Gaine le ventre pour garder le bassin neutre : ne cambre pas.',
      'Décale lentement les hanches d\'un côté à l\'autre pour écraser les tissus en travers, de la hanche vers la colonne.',
      'Sur un point sensible, reste dessus et respire jusqu\'à ce que ça relâche.',
    ],
    faults: ['Basculer le bassin et cambrer : ça aggrave la douleur lombaire.'],
    retest: ['Lève les bras au-dessus de la tête en gardant les côtes basses : plus facile ?', 'Squat : le bas du dos reste-t-il stable ?'],
    caution: 'Une douleur vive, qui irradie ou s\'accompagne d\'engourdissement : arrête et demande un avis médical.',
    seconds: 120, perSide: true, when: 'any',
    relevance: { back: 3, sitting: 2, travel: 2 },
    sports: [],
    cue: "Ventre gainé, déplace lentement les hanches d'un côté à l'autre.",
    frames: [
      {
        caption: 'Pieds sur un support, balle sous le bas du dos, ventre gainé.',
        torso: 174, head: 176,
        legs: [{ thigh: -62, shin: 18, foot: 0 }],
        arms: [{ upper: 10, fore: 0 }],
        props: [
          { t: 'box', at: ['ankle', -14, 0], w: 34, h: 33 },
          { t: 'ball', at: ['lowback', 0, 10] },
          { t: 'focus', at: ['lowback', 0, 0], r: 12 },
        ],
      },
    ],
  },
  {
    id: 'pelvis_reset',
    zone: 5,
    name: 'Remettre le bassin d\'aplomb',
    summary: 'Après un « tour de reins » ou si un côté du bassin semble décalé : on s\'appuie sur la rotation et la contre-rotation.',
    systems: ['joint', 'muscle'],
    methods: ['contract_relax'],
    tools: [],
    toolsNote: 'Un ballon ou un coussin à serrer entre les genoux pour finir.',
    improves: ['Douleur du bas du dos après un faux mouvement', 'Symétrie gauche-droite du bassin'],
    steps: [
      'Allongé sur le dos, hanches et genoux fléchis à 90°, une main sur chaque genou.',
      'Pousse un genou avec la main et tire l\'autre vers toi, tout en résistant avec les jambes. Tiens 5 secondes.',
      'Inverse les rôles et tiens 5 secondes. Fais 3 ou 4 allers-retours.',
      'Termine en serrant un ballon ou un coussin entre les genoux de toutes tes forces.',
    ],
    faults: ['Forcer avec les bras sans résister avec les jambes : l\'effort vient des muscles, pas de la poussée.'],
    retest: ['Compare l\'amplitude des deux hanches (ischio-jambiers, fléchisseurs) : l\'écart a-t-il diminué ?'],
    caution: 'Un léger déclic peut arriver : ne le cherche pas. Douleur vive ou irradiante : avis médical.',
    seconds: 90, perSide: false, when: 'any',
    relevance: { back: 3 },
    sports: [],
    cue: "Pousse un genou, tire l'autre, résiste avec les jambes : 5 s, puis inverse.",
    frames: [
      {
        caption: 'Hanches et genoux à 90°. Une main pousse, l\'autre tire, les jambes résistent.',
        torso: 180, head: 180,
        legs: [{ thigh: -80, shin: 0, foot: -80 }, { thigh: -76, shin: 4, foot: -80 }],
        arms: [{ upper: -35, fore: -35 }],
        props: [{ t: 'focus', at: ['hip', 0, 0], r: 14 }],
      },
    ],
  },
  {
    id: 'spinal_twist',
    zone: 5,
    name: 'Torsion allongée',
    summary: 'Une mobilisation globale qui récupère la raideur de toute la région lombaire. Pas la première étape, mais facile et utile.',
    systems: ['muscle'],
    methods: ['oscillation'],
    tools: [],
    toolsNote: '',
    improves: ['Raideur du bas du dos', 'Rotation globale'],
    steps: [
      'Allongé sur le dos, pieds au sol, genoux fléchis.',
      'Garde l\'épaule gauche collée au sol et laisse tomber les genoux vers la droite.',
      'La main droite sur le genou gauche l\'amène vers le sol, le bras gauche tendu, la tête tournée vers la gauche.',
      'Respire calmement. Une bande au pli de la hanche, tirée vers les pieds, rend l\'exercice beaucoup plus efficace.',
    ],
    faults: ['L\'épaule se décolle du sol : réduis l\'amplitude.'],
    retest: ['Rotation du tronc en position assise : plus loin des deux côtés ?'],
    caution: '',
    seconds: 120, perSide: true, when: 'any',
    relevance: { back: 2, sitting: 2, travel: 2 },
    sports: [],
    cue: 'Épaule collée au sol, respire, laisse les genoux tomber.',
    frames: [
      {
        caption: 'Vue du dessus : épaules à plat, genoux qui tombent d\'un côté.',
        view: 'top',
        torso: 180, head: 180,
        legs: [{ thigh: 48, shin: 140, foot: 90 }, { thigh: 44, shin: 136, foot: 90 }],
        arms: [{ upper: -90, fore: -90 }, { upper: 90, fore: 90 }],
        props: [
          { t: 'focus', at: ['lowback', 0, 0], r: 13 },
          { t: 'arrow', from: ['knee', 4, -12], to: ['knee', 22, 6], bend: -10 },
        ],
      },
    ],
  },
  {
    id: 'gut_smash',
    zone: 5,
    name: 'Ventre à la balle (psoas)',
    summary: 'Décolle les couches abdominales et le psoas, très sollicités pour tenir la colonne et durcis par la position assise.',
    systems: ['sliding'],
    methods: ['pressure_wave', 'smash_floss', 'contract_relax'],
    tools: ['softball'],
    toolsNote: 'Une balle souple (balle d\'enfant, petit ballon) ; une balle de lacrosse pour cibler un point.',
    improves: ['Douleurs du bas du dos et de la hanche', 'Stabilité de la colonne', 'Flexion et extension de la hanche'],
    steps: [
      'À plat ventre sur la balle, placée entre la crête du bassin et les côtes, à l\'extérieur du nombril.',
      'Inspire, retiens quelques secondes, puis expire en laissant ton poids s\'enfoncer lentement dans la balle.',
      'Sur un point sensible, reste dessus, puis ramène le talon du même côté vers la fesse pour mobiliser les tissus.',
      'Fais ensuite une vague de pression en tournant lentement le corps sur le côté. Change de côté.',
    ],
    faults: ['Retenir sa respiration en continu ou se crisper : le but est de se laisser aller dans la balle.'],
    retest: ['Bras levés au-dessus de la tête : les côtes restent-elles basses sans effort ?', 'Position haute du squat : plus facile ?'],
    caution: 'À éviter en cas de grossesse, de hernie, de chirurgie abdominale récente ou de douleur vive. Pas avant un effort lourd (soulevé max) : plutôt après.',
    seconds: 180, perSide: true, when: 'after',
    relevance: { sitting: 3, back: 2, travel: 2 },
    sports: [],
    cue: "Expire et laisse ton poids s'enfoncer. Reste supportable.",
    frames: [
      {
        caption: 'À plat ventre, balle sous le ventre, talon ramené vers la fesse.',
        torso: -3, head: -18,
        legs: [{ thigh: 178, shin: -50, foot: -20 }, { thigh: 175, shin: 172, foot: 110 }],
        arms: [{ upper: 90, fore: 0 }],
        props: [
          { t: 'ball', at: ['belly', 0, 12], r: 7 },
          { t: 'focus', at: ['belly', 0, 0], r: 12 },
        ],
      },
    ],
  },

  // Zone 1 : haut du dos ---------------------------------------------------------------
  {
    id: 'tspine_roller',
    zone: 1,
    name: 'Haut du dos au rouleau (extension)',
    summary: 'La base de la mobilité du haut du dos : une extension globale sur le rouleau, pas un simple va-et-vient.',
    systems: ['joint'],
    methods: ['extension'],
    tools: ['roller'],
    toolsNote: '',
    improves: ['Posture', 'Position bras au-dessus de la tête', 'Épaules stables', 'Extension du haut du dos'],
    steps: [
      'Croise les bras sur la poitrine comme pour te serrer dans les bras, rouleau en bas des côtes. Les tissus du haut du dos se tendent et l\'omoplate s\'écarte.',
      'Cambre-toi par-dessus le rouleau pour créer une force d\'extension, et reste jusqu\'à ce que quelque chose change.',
      'Redresse-toi comme pour un abdo, recule les fesses vers les pieds pour glisser le dos le long du rouleau, puis monte d\'un cran.',
      'Au milieu du dos puis à la base de la nuque : serre les fessiers et monte les hanches pour accentuer l\'extension.',
    ],
    faults: [
      'Rouler d\'avant en arrière sans intention : le rouleau doit servir de pivot pour t\'ouvrir en extension.',
      'Cambrer le bas du dos : garde les côtes basses et le ventre serré.',
    ],
    retest: ['Bras levés au-dessus de la tête : l\'épaule monte-t-elle plus haut sans que le dos se creuse ?', 'Suspension à une barre, position du squat arrière : plus stable ?'],
    caution: 'Si la nuque tire, soutiens la tête avec les mains.',
    seconds: 120, perSide: false, when: 'any',
    relevance: { sitting: 3, sport: 2, back: 2, travel: 1 },
    sports: ['bike', 'lift'],
    cue: 'Bras croisés, cambre-toi par-dessus le rouleau, côtes basses.',
    frames: [
      {
        caption: 'Bras croisés, rouleau sous les omoplates, extension par-dessus le rouleau.',
        torso: 172, head: 162,
        legs: [{ thigh: -34, shin: 90, foot: 0 }, { thigh: -36, shin: 88, foot: 0 }],
        arms: [{ upper: -50, fore: 160 }],
        props: [
          { t: 'roller', at: ['upperback', 0, 14] },
          { t: 'focus', at: ['upperback', 0, 0], r: 13 },
        ],
      },
    ],
  },
  {
    id: 'tspine_peanut',
    zone: 1,
    name: 'Haut du dos à la double balle',
    summary: 'Cible une vertèbre à la fois, là où le rouleau passe trop large. Les deux balles encadrent la colonne.',
    systems: ['joint'],
    methods: ['extension'],
    tools: ['peanut'],
    toolsNote: 'Deux balles de lacrosse scotchées ensemble, ou un outil équivalent.',
    improves: ['Posture', 'Position bras au-dessus de la tête', 'Mécanique articulaire du haut du dos'],
    steps: [
      'Bras croisés sur la poitrine pour écarter les omoplates. Place les balles de part et d\'autre de la colonne, dans les creux entre les vertèbres.',
      'Cambre-toi lentement par-dessus les balles, côtes basses ancrées au bassin pour ne pas creuser le bas du dos.',
      'Talons dans le sol, monte les hanches puis redescends, ou roule d\'un côté à l\'autre pour trouver le point qui coince.',
      'Redescends les fesses au sol en restant en extension, puis passe au segment suivant.',
    ],
    faults: ['Poser les balles directement sur les vertèbres : elles doivent les encadrer.', 'Creuser le bas du dos : gaine le ventre.'],
    retest: ['Bras tendus au-dessus de la tête, dos stable : l\'amplitude s\'est-elle améliorée ?'],
    caution: 'Évite la zone du cou. Douleur vive ou qui irradie : arrête.',
    seconds: 120, perSide: false, when: 'any',
    relevance: { sitting: 2, back: 2, sport: 2 },
    sports: ['bike', 'lift'],
    cue: 'Balles de chaque côté de la colonne, extension lente.',
    frames: [
      {
        caption: 'Balles de chaque côté de la colonne, hanches qui montent et descendent.',
        torso: 172, head: 162,
        legs: [{ thigh: -30, shin: 85, foot: 0 }, { thigh: -32, shin: 83, foot: 0 }],
        arms: [{ upper: -50, fore: 160 }],
        props: [
          { t: 'ball', at: ['upperback', 0, 10], r: 4.5 },
          { t: 'focus', at: ['upperback', 0, 0], r: 12 },
        ],
      },
    ],
  },
  {
    id: 'tspine_overhead',
    zone: 1,
    name: 'Haut du dos, bras au-dessus de la tête',
    summary: 'Relie l\'extension du haut du dos à la position bras levés, celle que les épaules doivent tenir au quotidien et en sport.',
    systems: ['joint'],
    methods: ['extension'],
    tools: ['roller'],
    toolsNote: 'Optionnel : une barre ou un cadre de canapé pour ancrer les mains.',
    improves: ['Position bras au-dessus de la tête', 'Extension du haut du dos', 'Rotation', 'Gestes de lancer'],
    steps: [
      'Rouleau à la base des côtes. Lève les bras au-dessus de la tête, coudes tendus, aisselles vers l\'avant, en poussant vers le plafond.',
      'Garde le ventre gainé et les côtes basses, puis cambre-toi par-dessus le rouleau sans creuser le bas du dos.',
      'Variante : ancre les mains (barre, cadre de canapé) et abaisse lentement les hanches vers le sol pour accentuer l\'extension.',
    ],
    faults: [
      'Plier les coudes : l\'épaule devient instable.',
      'Charnière à la base du haut du dos : tu creuses le bas du dos. Gaine le ventre et reste allongé.',
    ],
    retest: ['Bras levés au mur ou debout : monte-t-il plus haut sans compensation ?'],
    caution: '',
    seconds: 120, perSide: false, when: 'any',
    relevance: { sport: 3, sitting: 1 },
    sports: ['lift'],
    cue: 'Bras tendus, aisselles en avant, sans creuser le bas du dos.',
    frames: [
      {
        caption: 'Bras tendus au-dessus de la tête, aisselles vers l\'avant, extension par-dessus le rouleau.',
        torso: 176, head: 168,
        legs: [{ thigh: -22, shin: 90, foot: 0 }, { thigh: -24, shin: 88, foot: 0 }],
        arms: [{ upper: 178, fore: 178 }],
        props: [
          { t: 'roller', at: ['midback', 0, 14] },
          { t: 'focus', at: ['midback', 0, 0], r: 13 },
        ],
      },
    ],
  },

  // Zone 6 : hanche arrière ------------------------------------------------------------
  {
    id: 'glute_smash',
    zone: 6,
    name: 'Fessier à la balle',
    summary: 'Décolle le fessier, durci par la position assise ou par les pieds tournés vers l\'extérieur.',
    systems: ['sliding'],
    methods: ['pressure_wave', 'smash_floss', 'contract_relax'],
    tools: ['ball'],
    toolsNote: '',
    improves: ['Rotation externe de la hanche', 'Douleurs du bas du dos et de la hanche', 'Extension de la hanche et du tronc'],
    steps: [
      'Assis, penché en arrière sur les mains, balle sous le côté du fessier, sur un point sensible.',
      'Laisse le genou tomber vers l\'extérieur, puis ramène-le vers le centre pour mobiliser les tissus écrasés.',
      'Roule lentement d\'un côté à l\'autre en travers des fibres. Sur un point très sensible, contracte quelques secondes puis relâche.',
      'Passe environ 5 minutes par fessier, sans chercher à identifier un muscle précis.',
    ],
    faults: ['Se contenter de rouler sans rester sur la zone sensible jusqu\'à ce que ça change.'],
    retest: ['Debout, serre les fessiers : le côté travaillé se contracte-t-il avec plus de force que l\'autre ?', 'Position basse du squat : plus stable ?'],
    caution: 'Sensible oui, brûlant ou nerveux non. Évite de rouler sur un os.',
    seconds: 300, perSide: true, when: 'any',
    relevance: { sitting: 3, travel: 3, back: 2, sport: 2 },
    sports: ['run', 'bike'],
    cue: 'Reste sur le point sensible, mobilise le genou, respire.',
    frames: [
      {
        caption: 'Assis penché en arrière, balle sous le fessier, genou qui tombe vers l\'extérieur.',
        torso: -121.5, head: -117,
        legs: [{ thigh: -32.5, shin: 79, foot: 0 }, { thigh: -33.5, shin: 85.5, foot: 0 }],
        arms: [{ upper: 100, fore: 90 }],
        props: [
          { t: 'ball', at: ['hip', 0, 10] },
          { t: 'focus', at: ['hip', 0, 2], r: 13 },
        ],
      },
    ],
  },
  {
    id: 'single_leg_flexion',
    zone: 6,
    name: 'Flexion de hanche, une jambe à la fois',
    summary: 'Mobilise le bas du squat une jambe après l\'autre : pied à plat, genou vers l\'extérieur, dos plat.',
    systems: ['joint', 'muscle'],
    methods: ['oscillation', 'contract_relax', 'smash_floss', 'band'],
    tools: ['box'],
    toolsNote: 'Une boîte ou un banc si le sol est trop difficile. Une bande tirant la hanche vers le côté ou l\'arrière multiplie l\'effet.',
    improves: ['Bas du squat', 'Départ du soulevé de terre', 'Fonction globale de la hanche', 'Douleurs du bas du dos et de la hanche'],
    steps: [
      'Pied avant à plat, droit, tibia vertical, jambe arrière glissée derrière toi. Pose le pied sur une boîte si le sol est trop bas.',
      'Pousse le genou avant vers l\'extérieur en gardant le pied bien à plat et le dos plat.',
      'Cherche les coins raides : petits cercles, buste tourné vers le genou ou chute du buste vers le support. Oscille doucement dans et hors de la tension.',
      'Recule les hanches pour atteindre l\'arrière de la hanche et l\'ischio-jambier, puis reviens et explore une autre direction.',
    ],
    faults: [
      'Le pied avant se soulève quand le genou part vers l\'extérieur : plaque-le.',
      'Le genou dépasse du pied : on s\'éloigne de la position de squat à améliorer.',
      'Tu arrondis le bas du dos pour atteindre un coin : repars en position plate.',
    ],
    retest: ['Squat complet : les genoux sortent-ils plus facilement et le dos reste-t-il plat ?', 'Position de départ du soulevé de terre.'],
    caution: 'Une pincée au pli de l\'aine : change l\'angle, ou utilise une bande pour tirer la hanche. Pas de douleur brûlante.',
    seconds: 120, perSide: true, when: 'any',
    relevance: { sport: 3, back: 1, sitting: 1 },
    sports: ['lift'],
    cue: "Pied à plat, genou vers l'extérieur, dos plat, oscille doucement.",
    frames: [
      {
        caption: 'Pied avant à plat, tibia vertical, jambe arrière glissée, dos plat.',
        torso: -45, head: -55,
        legs: [{ thigh: -20, shin: 90, foot: 0 }, { thigh: 160, shin: 170, foot: 100 }],
        arms: [{ upper: 70, fore: 55 }],
        props: [{ t: 'focus', at: ['hip', 0, 0], r: 14 }],
      },
    ],
  },
];

// Le type d'une fiche : les fiches du livre sont des mobilisations ; viennent s'y ajouter des étirements et des activations
// (réveil avant l'effort). Sans `kind`, une fiche est une mobilisation.
export const KINDS = {
  mobilize: 'Mobilisation',
  stretch: 'Étirement',
  activate: 'Activation',
};

// Liste complète : fiches du tronc et de la hanche (ici), puis haut du corps et jambes.
export const MOBS = [...CORE, ...UPPER, ...LOWER, ...HIPS, ...LOWERLEG, ...SHOULDERS, ...REST, ...LOT_1, ...LOT_2, ...LOT_3, ...LOT_4].map((m) => ({ kind: 'mobilize', ...m }));

export const zoneMobs = (zoneId) => MOBS.filter((m) => m.zone === zoneId);
export const getMob = (id) => MOBS.find((m) => m.id === id);
