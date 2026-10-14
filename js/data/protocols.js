// Séances prêtes à lancer : des fiches choisies à la main, avec leur durée, pour un moment précis de la journée.
// Un emplacement liste des variantes par ordre de préférence : la première qui va avec le matériel de la personne est
// retenue. La dernière variante d'un emplacement ne demande aucun matériel (node tools/check-mobs.mjs le vérifie).
// `seconds` : temps par position (et par côté pour les fiches qui se font des deux côtés).

import { getMob } from './mobs.js';

export const PROTOCOLS = [
  {
    id: 'wake',
    name: 'Réveil',
    when: 'au lever',
    blurb: 'Dérouille le corps du lit au debout, sans matériel : chevilles, fessiers, hanches, dos, nuque.',
    slots: [
      { ids: ['ankle_pump_long_sit'], seconds: 45 },
      { ids: ['glute_bridge_hold'], seconds: 60 },
      { ids: ['adductor_frog_rock'], seconds: 60 },
      { ids: ['child_pose_lat'], seconds: 60 },
      { ids: ['calf_downdog_pedal'], seconds: 60 },
      { ids: ['deep_squat_pry'], seconds: 60 },
      { ids: ['chin_tuck_wall'], seconds: 40 },
    ],
  },
  {
    id: 'prerun',
    name: 'Avant la course',
    when: 'avant l\'effort',
    blurb: 'Des mouvements actifs plutôt que des étirements longs : chevilles, hanches, genoux et fessiers prêts à travailler.',
    slots: [
      { ids: ['ankle_wall_knee_drive'], seconds: 45 },
      { ids: ['calf_downdog_pedal'], seconds: 60 },
      { ids: ['leg_swing_front_back'], seconds: 40 },
      { ids: ['knee_hug_standing'], seconds: 40 },
      { ids: ['knee_tke_band', 'chair_squat_tempo', 'toe_raise_wall'], seconds: 45 },
      { ids: ['glute_bridge_hold'], seconds: 60 },
      { ids: ['calf_raise_slow'], seconds: 60 },
    ],
  },
  {
    id: 'recover',
    name: 'Récupération',
    when: 'après l\'effort',
    blurb: 'Quand le corps est chaud : on relâche les cuisses, les mollets et les hanches, puis on pose le dos.',
    slots: [
      { ids: ['quad_smash', 'quad_stretch_standing'], seconds: 60 },
      { ids: ['calf_roller', 'soleus_wall_bent'], seconds: 60 },
      { ids: ['hip_er_floor'], seconds: 60 },
      { ids: ['spinal_twist'], seconds: 60 },
      { ids: ['butterfly_fold'], seconds: 90 },
      { ids: ['child_pose_lat'], seconds: 90 },
    ],
  },
  {
    id: 'desk',
    name: 'Bureau',
    when: 'au bureau',
    blurb: 'Cinq minutes entre deux réunions : nuque, hanches, épaules et mollets, avec un mur et une chaise.',
    slots: [
      { ids: ['chin_tuck_wall'], seconds: 40 },
      { ids: ['executive_hip', 'quad_stretch_standing'], seconds: 45 },
      { ids: ['reverse_sleeper'], seconds: 45 },
      { ids: ['calf_raise_slow'], seconds: 40 },
    ],
  },
];

export const getProtocol = (id) => PROTOCOLS.find((p) => p.id === id);

// Les fiches de la séance pour ce matériel : [{ id, seconds }].
export function resolveProtocol(protocol, equipment = []) {
  const have = new Set(equipment);
  return protocol.slots
    .map((slot) => ({ id: slot.ids.find((id) => getMob(id).tools.every((t) => have.has(t))), seconds: slot.seconds }))
    .filter((it) => it.id);
}
