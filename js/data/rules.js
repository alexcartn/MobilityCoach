// Gainage et règles de la mobilité, reformulés d'après Becoming a Supple Leopard (chapitres 2 et 7).
// Ils servent dans la séance (rappels, gainage) et dans les conseils d'Aujourd'hui.

export const BRACE = {
  title: 'Gainage neutre en 4 étapes',
  intro: 'Debout, dans cet ordre, avant de te mettre en position.',
  steps: [
    { name: 'Fessiers', text: 'Pieds parallèles sous les hanches, visse-les dans le sol et serre fort les fessiers. Le bassin se cale en position neutre.' },
    { name: 'Côtes', text: 'Ramène les côtes basses vers le bas pour empiler la cage thoracique sur le bassin, sans cambrer ni arrondir.' },
    { name: 'Ventre', text: 'Inspire, expire, puis serre les abdos pour verrouiller bassin et côtes : environ 20 % de tension, en continu.' },
    { name: 'Tête', text: 'Tête centrée au-dessus des épaules, regard devant, épaules abaissées et tournées vers l\'extérieur, pouces vers l\'avant.' },
  ],
};

// Les règles de la mobilité, dans l'ordre du livre, puis les trois règles de programmation.
export const RULES = [
  { id: 'test', title: 'Teste, mobilise, reteste', text: 'Tout doit donner un résultat qu\'on peut observer. Teste la position, mobilise, puis refais le même test : si rien ne change, ce n\'était pas la bonne zone.' },
  { id: 'sketchy', title: 'Si c\'est louche, c\'est louche', text: 'Inconfort, oui. Douleur brûlante, impression de déchirure, fourmillements ou engourdissement : tu arrêtes. Reste à l\'entrée de la caverne de la douleur, n\'y entre pas.' },
  { id: 'nodays', title: 'Pas de jour off', text: '15 à 20 minutes chaque jour, par petites doses. Le lendemain d\'un entraînement, c\'est là que tes tissus en ont le plus besoin.' },
  { id: 'painface', title: 'Pas de grimace', text: 'Garde le visage détendu et la respiration calme. Grimacer raccourcit les fléchisseurs du cou et associe la douleur à une expression.' },
  { id: 'realistic', title: 'Mobilise comme tu bouges', text: 'Travaille dans la position que tu veux améliorer (fond du squat, bras au-dessus de la tête) plutôt que couché sur le dos.' },
  { id: 'position', title: 'Toujours en bonne position', text: 'Gainage neutre, chevilles et genoux alignés, dos ni cambré ni arrondi. Sinon tu ancres une mauvaise mécanique au lieu de la corriger.' },
  { id: 'freestyle', title: 'Explore', text: 'Les fiches sont un guide. Tant que la position reste bonne, bouge vers les endroits qui te paraissent les plus raides.' },
  { id: 'pain', title: 'La douleur d\'abord', text: 'Mets la zone douloureuse au centre de ta séance et traite aussi ce qui est au-dessus et en dessous : là où les rats entrent n\'est pas forcément là où ils rongent.' },
  { id: 'dose', title: 'Au moins 2 minutes par position', text: 'Il faut environ 2 minutes pour changer un tissu. Tant que ça s\'améliore, reste jusqu\'à 10 minutes. Trois zones par séance, pas plus.' },
];
