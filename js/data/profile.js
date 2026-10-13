// Contextes d'usage, sports, matériel. Les conseils sont reformulés d'après Becoming a Supple Leopard.

export const CONTEXTS = [
  {
    id: 'sport',
    label: 'Sportif',
    tips: [
      'Mobilise dans la position que tu veux améliorer : fond du squat, bras au-dessus de la tête, départ du soulevé de terre.',
      'Avant l\'entraînement : position, capsule articulaire et surfaces de glissement. Les étirements actifs en fin d\'amplitude plutôt après.',
      'Teste avant et après chaque mobilisation : la position s\'est-elle améliorée ?',
    ],
  },
  {
    id: 'back',
    label: 'Mal de dos',
    warning: 'Douleur vive, qui descend dans la jambe ou le bras, engourdissement, ou suite à un choc : avis médical avant de mobiliser.',
    tips: [
      'Commence par les zones autour : bas du dos, hanches, haut du dos. Mobilise sans cambrer ni arrondir, bassin neutre.',
      'Mobiliser au-dessus et en dessous de la zone douloureuse aide souvent plus que d\'appuyer juste dessus.',
      'La douleur passe en premier dans la séance, puis les positions à améliorer.',
    ],
  },
  {
    id: 'sitting',
    label: 'Assis longtemps',
    tips: [
      'Lève-toi et remets ta position en place toutes les 10 à 15 minutes : tenir une bonne position assise longtemps est très coûteux en endurance abdominale.',
      'Compte environ 4 minutes de mobilité par tranche de 30 minutes assis (par exemple 2 minutes de fléchisseurs de hanche de chaque côté).',
      'Zones les plus touchées : fessiers, fléchisseurs de hanche, haut du dos, ischio-jambiers, quadriceps.',
    ],
  },
  {
    id: 'travel',
    label: 'Long trajet',
    tips: [
      'Avant de t\'asseoir : gainage neutre debout, puis assieds-toi en gardant le ventre serré. Corriger sa posture une fois assis revient souvent à passer du dos rond au dos cambré.',
      'Un soutien lombaire aide sur la route. Change de position dès que tu le peux.',
      'À l\'arrivée : défais la position assise (fléchisseurs de hanche, fessiers, haut du dos).',
    ],
  },
];

export const SPORTS = [
  { id: 'run', label: 'Course' },
  { id: 'bike', label: 'Vélo' },
  { id: 'lift', label: 'Musculation / CrossFit' },
  { id: 'other', label: 'Autre sport' },
];

export const EQUIPMENT = [
  { id: 'ball', label: 'Balle de lacrosse' },
  { id: 'peanut', label: 'Double balle scotchée' },
  { id: 'roller', label: 'Rouleau' },
  { id: 'band', label: 'Bande élastique' },
  { id: 'box', label: 'Chaise, banc ou boîte' },
];

export const DURATIONS = [
  { id: 5, label: '5 min' },
  { id: 10, label: '10 min' },
  { id: 15, label: '15 min' },
  { id: 20, label: '20 min' },
];
