// Bilan de mobilité : 8 tests, chacun noté de 0 à 4, qui alimentent le score des 13 zones.
// Chaque test cite les zones qu'il éclaire avec un poids (le premier est la zone principale).
// Les niveaux sont des repères observables, formulés pour ce bilan : ils ne viennent pas tels quels du livre.
// Les schémas utilisent le moteur de js/diagram.js.

export const TESTS = [
  {
    id: 'squat',
    title: 'Squat profond',
    zones: [[6, 1], [13, 0.5], [10, 0.5], [8, 0.5]],
    sides: false,
    minutes: 2,
    intro: 'Pieds largeur d\'épaules, descends le plus bas possible en gardant le gainage, puis tiens 10 secondes.',
    levels: [
      'Je ne descends pas sous le parallèle',
      'Sous le parallèle, mais les talons décollent',
      'Fond de squat, le dos s\'arrondit',
      'Fond de squat dos neutre, les genoux rentrent',
      'Fond de squat stable et aligné, sans effort',
    ],
    frame: {
      caption: 'Squat profond, talons au sol, dos neutre.',
      torso: -70, head: -78,
      legs: [{ thigh: -12, shin: 105, foot: 0 }],
      arms: [{ upper: -8, fore: -8 }],
      props: [{ t: 'focus', at: ['hip', 0, 0], r: 13 }],
    },
  },
  {
    id: 'overhead',
    title: 'Bras au-dessus de la tête',
    zones: [[1, 1], [2, 1]],
    sides: false,
    minutes: 2,
    intro: 'Dos et fessiers contre un mur. Lève les bras tendus le long du mur, pouces vers l\'arrière, côtes basses.',
    levels: [
      'Je ne peux pas lever les bras à la verticale',
      'Les bras montent mais les coudes plient ou les épaules se haussent',
      'Bras tendus, mais le bas du dos se creuse',
      'Bras tendus, dos stable, sans toucher le mur',
      'Bras tendus contre le mur, côtes basses, sans effort',
    ],
    frame: {
      caption: 'Dos au mur, bras tendus le long du mur.',
      torso: -90, head: -90,
      legs: [{ thigh: 90, shin: 90, foot: 0 }],
      arms: [{ upper: -95, fore: -95 }],
      props: [
        { t: 'wall', at: ['hip', -9, 0] },
        { t: 'focus', at: ['shoulder', -2, -4], r: 12 },
      ],
    },
  },
  {
    id: 'reachback',
    title: 'Main dans le dos',
    zones: [[3, 1], [2, 0.5]],
    sides: true,
    minutes: 2,
    intro: 'Debout, passe une main derrière le dos, paume vers l\'extérieur, et monte le long de la colonne, épaule en arrière.',
    levels: [
      'Je n\'atteins pas le bas du dos',
      'J\'atteins le bas du dos, mais l\'épaule roule vers l\'avant',
      'Je monte à la taille, épaule stable',
      'Je monte entre le bas des omoplates',
      'Je touche l\'omoplate opposée, épaule en arrière',
    ],
    frame: {
      caption: 'Main derrière le dos, qui monte le long de la colonne.',
      torso: -90, head: -90,
      legs: [{ thigh: 90, shin: 90, foot: 0 }],
      arms: [{ upper: 112, fore: 80 }],
      props: [
        { t: 'focus', at: ['shoulder', -3, 3], r: 12 },
        { t: 'arrow', from: ['hip', -16, 2], to: ['hip', -16, -22] },
      ],
    },
  },
  {
    id: 'wrist',
    title: 'Appui des mains au sol',
    zones: [[4, 1]],
    sides: false,
    minutes: 1,
    intro: 'À quatre pattes, mains à plat sous les épaules, doigts vers l\'avant, puis tourne les doigts vers les genoux sans décoller les paumes.',
    levels: [
      'Je ne peux pas poser les paumes à plat sans douleur',
      'Paumes à plat doigts vers l\'avant, mais forte tension',
      'Paumes à plat, tension modérée, les coudes plient',
      'Doigts vers les genoux, paumes à plat, coudes tendus',
      'Doigts vers les genoux, bras tendus, sans effort',
    ],
    frame: {
      caption: 'À quatre pattes, mains à plat, bras tendus.',
      torso: 0, head: -20,
      legs: [{ thigh: 90, shin: 180, foot: 180 }],
      arms: [{ upper: 90, fore: 90 }],
      props: [{ t: 'focus', at: ['hand', 0, -3], r: 11 }],
    },
  },
  {
    id: 'hinge',
    title: 'Charnière, dos plat',
    zones: [[9, 1], [5, 0.5]],
    sides: false,
    minutes: 1,
    intro: 'Debout, jambes tendues, penche-toi depuis les hanches en gardant le dos plat et descends les mains vers le sol.',
    levels: [
      'Je n\'atteins pas les genoux sans arrondir le dos',
      'Mains au milieu du tibia, dos plat',
      'Mains aux chevilles, dos plat',
      'Doigts au sol, dos plat',
      'Paumes au sol, dos plat, sans effort',
    ],
    frame: {
      caption: 'Penché depuis les hanches, jambes tendues, dos plat.',
      torso: 40, head: 45,
      legs: [{ thigh: 90, shin: 90, foot: 0 }],
      arms: [{ upper: 90, fore: 90 }],
      props: [{ t: 'focus', at: ['knee', -8, 6], r: 12 }],
    },
  },
  {
    id: 'couch',
    title: 'Test du canapé',
    zones: [[7, 1], [5, 0.5]],
    sides: true,
    minutes: 3,
    intro: 'Genou au sol dans un coin, pied contre le mur ou le support. Redresse le buste en serrant le fessier, sans cambrer.',
    levels: [
      'Je ne peux pas poser le genou au sol dans l\'angle',
      'Genou au sol, mais le pied ne monte pas contre le mur',
      'Pied contre le mur, buste penché en avant',
      'Buste redressé, mais le bas du dos se creuse',
      'Buste droit, fessier serré, sans cambrer',
    ],
    frame: {
      caption: 'Genou dans l\'angle, pied contre le mur, buste redressé.',
      torso: -90, head: -90,
      legs: [{ thigh: 127, shin: -90, foot: -90 }, { thigh: -5, shin: 90, foot: 0 }],
      arms: [{ upper: 110, fore: 60 }],
      props: [
        { t: 'wall', at: ['knee', -5.5, 0] },
        { t: 'focus', at: ['thigh', 0, 0], r: 14 },
      ],
    },
  },
  {
    id: 'kneeflex',
    title: 'Assis sur les talons',
    zones: [[10, 1], [7, 0.5], [13, 0.5]],
    sides: false,
    minutes: 1,
    intro: 'À genoux, assieds-toi sur les talons, pieds droits, sans aide.',
    levels: [
      'Je ne peux pas m\'asseoir sur les talons',
      'Seulement avec un coussin, ou avec une douleur au genou',
      'Assis sur les talons, forte tension devant la cuisse ou le genou',
      'Assis sur les talons, sans douleur, les pieds s\'ouvrent',
      'Assis sur les talons, pieds droits, sans effort',
    ],
    frame: {
      caption: 'Assis sur les talons, pieds droits.',
      torso: -85, head: -88,
      legs: [{ thigh: 20, shin: 177, foot: 180 }, { thigh: 22, shin: 177, foot: 180 }],
      arms: [{ upper: 75, fore: 25 }],
      props: [{ t: 'focus', at: ['knee', -6, 0], r: 12 }],
    },
  },
  {
    id: 'ankle',
    title: 'Genou vers le mur',
    zones: [[13, 1], [12, 1], [11, 0.5]],
    sides: true,
    minutes: 3,
    intro: 'Pied à plat face à un mur, orteils à quelques centimètres. Envoie le genou toucher le mur sans lever le talon.',
    levels: [
      'Je ne touche pas le mur à 5 cm',
      'Je touche le mur à 5 cm',
      'Je touche le mur à 8 cm',
      'Je touche le mur à 10 cm',
      'Je touche le mur à 12 cm ou plus, talon au sol, genou aligné',
    ],
    frame: {
      caption: 'Pied à plat, le genou touche le mur sans lever le talon.',
      torso: -90, head: -90,
      legs: [{ thigh: 10, shin: 115, foot: 0 }, { thigh: 100, shin: 180, foot: 180 }],
      arms: [{ upper: 69, fore: 69 }],
      props: [
        { t: 'wall', at: ['knee', 5, 0] },
        { t: 'focus', at: ['ankle', 3, -2], r: 11 },
      ],
    },
  },
];

export const getTest = (id) => TESTS.find((t) => t.id === id);

// Test proposé en avant/après dans une séance, selon la zone travaillée.
export const ZONE_TEST = { 1: 'overhead', 2: 'overhead', 3: 'reachback', 4: 'wrist', 5: 'hinge', 6: 'squat', 7: 'couch', 8: 'squat', 9: 'hinge', 10: 'kneeflex', 11: 'ankle', 12: 'ankle', 13: 'ankle' };

// Profils : on retient le groupe de zones le moins mobile. Le premier groupe qui se détache donne le nom.
export const PROFILE_GROUPS = [
  { id: 'hips', zones: [6, 7, 8], name: 'Hanches verrouillées', label: 'les hanches' },
  { id: 'shoulders', zones: [1, 2, 3], name: 'Épaules enroulées', label: 'les épaules et le haut du dos' },
  { id: 'feet', zones: [11, 12, 13], name: 'Chevilles et pieds raides', label: 'les chevilles et les pieds' },
  { id: 'posterior', zones: [9, 10], name: 'Chaîne arrière tendue', label: 'l\'arrière de cuisse et le genou' },
  { id: 'trunk', zones: [5], name: 'Tronc en tension', label: 'le tronc' },
  { id: 'arms', zones: [4], name: 'Poignets et coudes raides', label: 'les poignets et les coudes' },
];
export const BALANCED_PROFILE = 'Mobilité équilibrée';
