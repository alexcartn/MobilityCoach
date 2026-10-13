// Les 13 zones de travail du livre (chapitre 7), nommées en français.
// up / down : zones voisines en amont (vers le tronc) et en aval (vers les extrémités), classées par pertinence.
// Le livre donne le principe amont-aval et l'exemple du genou ; le reste de la carte suit la même logique.

export const ZONES = [
  { id: 1, region: 'upper', name: 'Haut du dos', covers: 'Colonne thoracique, nuque, omoplate', up: [], down: [5, 2] },
  { id: 2, region: 'upper', name: 'Épaule arrière', covers: 'Grand dorsal, deltoïde postérieur', up: [1], down: [4] },
  { id: 3, region: 'upper', name: 'Épaule avant', covers: 'Pectoraux, deltoïde antérieur', up: [1], down: [4] },
  { id: 4, region: 'upper', name: 'Bras aval', covers: 'Triceps, coude, avant-bras, poignet', up: [2, 3], down: [] },
  { id: 5, region: 'core', name: 'Tronc', covers: 'Psoas, bas du dos, obliques', up: [1], down: [6, 7] },
  { id: 6, region: 'core', name: 'Hanche arrière', covers: 'Fessiers, capsule de la hanche', up: [5], down: [9, 8] },
  { id: 7, region: 'core', name: 'Hanche avant', covers: 'Fléchisseurs de hanche, quadriceps', up: [5], down: [10, 8] },
  { id: 8, region: 'core', name: 'Face interne', covers: 'Adducteurs', up: [6, 7], down: [10] },
  { id: 9, region: 'legs', name: 'Arrière de cuisse', covers: 'Ischio-jambiers', up: [6], down: [10, 12] },
  { id: 10, region: 'legs', name: 'Genou', covers: 'Articulation et tissus autour', up: [7, 9], down: [12, 11] },
  { id: 11, region: 'legs', name: 'Tibia', covers: 'Face interne et avant de la jambe', up: [10], down: [13] },
  { id: 12, region: 'legs', name: 'Mollet', covers: 'Triceps sural, tendon d\'Achille', up: [9, 10], down: [13] },
  { id: 13, region: 'legs', name: 'Cheville et pied', covers: 'Cheville, voûte et plante du pied', up: [12, 11], down: [] },
];

export const REGIONS = [
  { id: 'upper', label: 'Haut du corps' },
  { id: 'core', label: 'Tronc et hanches' },
  { id: 'legs', label: 'Jambes' },
];
