// Principes du livre, reformulés. Non exhaustif : le livre reste la référence.

export const PRINCIPLES = [
  {
    id: 'stretch',
    title: 'Pourquoi pas juste s\'étirer',
    paragraphs: [
      'Tenir un étirement passif en fin d\'amplitude, sans intention, ne règle pas la position, la performance ni la douleur à lui seul.',
      'Ici on parle de mobilisation : on cherche d\'abord la bonne position et le bon mouvement, puis on traite ce qui les limite (articulation, glissement des tissus, muscle).',
    ],
  },
  {
    id: 'brace',
    title: 'Gainage neutre en 4 étapes',
    paragraphs: ['À faire debout, dans cet ordre, avant de t\'asseoir, de porter ou de mobiliser.'],
    steps: [
      'Fessiers : pieds parallèles sous les hanches, visse-les dans le sol et serre les fessiers à fond. Le bassin se cale en position neutre.',
      'Côtes : ramène les côtes basses vers le bas pour empiler la cage thoracique sur le bassin, sans cambrer ni arrondir.',
      'Ventre : inspire, expire, puis serre les abdos pour verrouiller bassin et côtes (au moins environ 20 % de tension en continu). Les fessiers placent, les abdos maintiennent.',
      'Tête et épaules : tête centrée au-dessus des épaules, regard devant, épaules abaissées et tournées vers l\'extérieur (pouces vers l\'avant).',
    ],
    note: 'Une fois lancé, on ne rattrape plus une mauvaise position : on la prépare avant.',
  },
  {
    id: 'onejoint',
    title: 'Une seule articulation',
    paragraphs: [
      'Quand tu te penches ou que tu lèves les bras, le mouvement doit venir des hanches et des épaules, pas de la colonne. Si le dos s\'arrondit ou se cambre, c\'est un défaut de placement ou un manque de mobilité.',
      'Test rapide : bras tendus au-dessus de la tête, puis penche-toi pour descendre vers les orteils, sans que le dos change de forme.',
    ],
  },
  {
    id: 'tunnel',
    title: 'Le tunnel : départ et arrivée',
    paragraphs: [
      'La position de départ d\'un mouvement conditionne son arrivée, et l\'arrivée devient le départ du suivant.',
      'En mobilité, teste les deux extrémités du mouvement pour trouver où ça coince : si le départ est bon mais l\'arrivée mauvaise, le problème est probablement de mobilité.',
    ],
  },
  {
    id: 'systems',
    title: 'La checklist de mobilité',
    paragraphs: ['Quand la position et le mouvement sont corrects mais qu\'une amplitude manque, on passe les trois systèmes en revue, dans cet ordre :'],
    steps: [
      'Mécanique articulaire : replacer l\'articulation (bande de distraction, compression, rotation en bonne position).',
      'Surfaces de glissement : peau, nerfs et muscles doivent glisser les uns sur les autres. Outils : balle, rouleau, bande de compression ; techniques : vague de pression, écraser et mobiliser.',
      'Dynamique musculaire : contracter-relâcher (environ 5 secondes de tension en fin d\'amplitude, relâcher, gagner de l\'amplitude pendant 10 secondes) et petites oscillations lentes en bout de course.',
    ],
    note: 'En règle générale : position, articulation et glissement avant l\'entraînement ; les positions extrêmes en fin d\'amplitude plutôt après.',
  },
  {
    id: 'techniques',
    title: 'Les techniques',
    items: [
      'Vague de pression : poids du corps sur une balle ou un rouleau, muscle relâché, déplacement très lent en travers du tissu. Plus c\'est lent, plus tu supportes de pression.',
      'Écraser et mobiliser : « punaiser » un point sensible avec la balle, puis bouger le membre dans toutes les directions pour décoller les tissus.',
      'Contracter-relâcher : contracter environ 5 secondes, relâcher, puis gagner un peu d\'amplitude pendant 10 secondes. Sur une balle, contracter le muscle puis se laisser s\'enfoncer.',
      'Oscillations : aller-retour lent dans et hors de la tension maximale, sans rebondir. C\'est ce qui fait céder les tissus très raides.',
      'Bande : une bande élastique écarte les surfaces de l\'articulation pour la replacer et atteindre la capsule, plus épaisse qu\'un muscle.',
    ],
  },
  {
    id: 'program',
    title: 'Programmer sa séance',
    paragraphs: ['Le livre vise 15 à 20 minutes par jour, qu\'on peut découper en petites doses.'],
    items: [
      'Ordre : d\'abord les zones douloureuses, puis les positions à améliorer, puis défaire la journée (assis, voiture).',
      'Au moins 2 minutes par position et par côté ; continue tant que ça s\'améliore.',
      'Trois zones par séance au maximum.',
      'Douleur : mobilise au-dessus et en dessous de la zone, pas seulement dessus.',
    ],
  },
  {
    id: 'rules',
    title: 'Les règles de la mobilité',
    items: [
      'Teste, mobilise, reteste. Sans amélioration visible, ce n\'était pas la bonne zone.',
      'Inconfort accepté, mais douleur brûlante, sensation de déchirure, fourmillements ou engourdissement : tu arrêtes.',
      'Pas de jour off, même court.',
      'Visage détendu, respiration calme : pas de grimace.',
      'Mobilise dans la position que tu veux améliorer.',
      'Reste en bonne position pendant la mobilisation (gainage neutre, épaules stables, genoux alignés).',
      'Explore : les fiches sont des repères, tu peux ajuster pour cibler ce qui coince sans perdre la position.',
    ],
  },
];
