// Les 13 zones de travail du livre (chapitre 7), nommées en français.

export const ZONES = [
  { id: 1, region: 'upper', name: 'Haut du dos', covers: 'Colonne thoracique, nuque, omoplate' },
  { id: 2, region: 'upper', name: 'Épaule arrière', covers: 'Grand dorsal, deltoïde postérieur' },
  { id: 3, region: 'upper', name: 'Épaule avant', covers: 'Pectoraux, deltoïde antérieur' },
  { id: 4, region: 'upper', name: 'Bras aval', covers: 'Triceps, coude, avant-bras, poignet' },
  { id: 5, region: 'core', name: 'Tronc', covers: 'Psoas, bas du dos, obliques' },
  { id: 6, region: 'core', name: 'Hanche arrière', covers: 'Fessiers, capsule de la hanche' },
  { id: 7, region: 'core', name: 'Hanche avant', covers: 'Fléchisseurs de hanche, quadriceps' },
  { id: 8, region: 'core', name: 'Face interne', covers: 'Adducteurs' },
  { id: 9, region: 'legs', name: 'Arrière de cuisse', covers: 'Ischio-jambiers' },
  { id: 10, region: 'legs', name: 'Genou', covers: 'Articulation et tissus autour' },
  { id: 11, region: 'legs', name: 'Tibia', covers: 'Face interne et avant de la jambe' },
  { id: 12, region: 'legs', name: 'Mollet', covers: 'Triceps sural, tendon d\'Achille' },
  { id: 13, region: 'legs', name: 'Cheville et pied', covers: 'Cheville, voûte et plante du pied' },
];

export const REGIONS = [
  { id: 'upper', label: 'Haut du corps' },
  { id: 'core', label: 'Tronc et hanches' },
  { id: 'legs', label: 'Jambes' },
];
