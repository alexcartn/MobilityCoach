// Mouvements des schémas (voir js/motion.js). Une fiche absente de la liste reste une image fixe.
// Les angles suivent les schémas (voir js/diagram.js). Par défaut, le mouvement va de l'image 1 de la fiche à son
// image 2 ; `end` décrit une pose d'arrivée quand la fiche n'en a qu'une (il remplace les champs de la pose 1).
//   period     durée d'une boucle, en secondes : lent, avec une courte tenue à chaque bout
//   anchor     articulation clouée au sol
//   slide      le corps glisse le long de `angle` (degrés), de `from` à `to` (unités du schéma)
//   hands      les mains restent posées là où elles sont dans la pose de référence (true, ou [''] pour le côté proche seul)
//   feet       les pieds restent posés (idem)
//   still      types d'accessoires immobiles (le rouleau, le mur, la balle, la boîte ne suivent pas le corps)
//   stillEnds  extrémités immobiles d'une bande
//   refS       avancement (0 à 1) de la pose de référence ; 0,5 pour un va-et-vient centré
//   begin      remplace des champs de l'image 1 pour le départ (continuité des angles : -185 plutôt que 175)
//   grip       les mains tiennent une articulation de la jambe ('knee', 'shin') et la suivent
//   rigidArms  les bras tournent avec le buste (bras croisés, bras tendus au-dessus de la tête)
//   faces      'left' si l'orientation lue dans la pose est fausse (sinon elle est déduite des articulations pliées)

// Les accessoires qui restent en place pendant que le corps bouge.
const TOOLS = ['roller', 'ball', 'bar', 'box', 'wall'];

// À plat ventre (tête à droite) : le talon du côté de la balle va de la jambe tendue à la fesse.
const HEEL_TO_GLUTE = {
  begin: { legs: [{ thigh: 178, shin: 176, foot: 180 }, { thigh: 175, shin: 172, foot: 110 }] },
  end: { legs: [{ thigh: 178, shin: 310, foot: 340 }, { thigh: 175, shin: 172, foot: 110 }] },
};

export const MOTIONS = {
  // Le buste se redresse, le genou arrière reste contre le mur.
  couch: { period: 6, anchor: 'knee', still: ['wall'] },

  // Le corps glisse sur le rouleau, qui tourne sur place ; les avant-bras glissent au sol avec lui, coudes sous les épaules.
  quad_smash: { period: 7, slide: { angle: 172, from: -8, to: 8 }, still: ['roller'], refS: 0.5 },

  // Le buste descend sur la jambe avant, les mains restent au sol, la hanche ne bouge pas.
  hip_er_floor: { period: 7, end: { torso: -6, head: -14 }, anchor: 'hip', hands: true },

  // Allongé sur le rouleau, les pieds poussent : le dos roule sur le rouleau, les genoux se plient.
  tspine_roller: { period: 7, slide: { angle: 172, from: -9, to: 9 }, feet: true, still: ['roller'], refS: 0.5 },

  // Pieds sur la boîte : le bassin va et vient au-dessus de la balle, qui ne bouge pas.
  high_glute_smash: { period: 6, slide: { angle: 174, from: -6, to: 6 }, feet: true, still: ['ball', 'box'], refS: 0.5 },

  // À quatre pattes : le bassin recule vers les talons, la bande reste tendue vers le mur.
  hip_capsule: {
    period: 6, anchor: 'knee', hands: true, stillEnds: { band: ['to'] },
    end: { legs: [{ thigh: 72, shin: 180, foot: 180 }, { thigh: 72, shin: 180, foot: 180 }] },
  },

  // ---- Haut du dos (zone 1) ----
  // Les hanches montent puis descendent, le dos pivote sur les balles ; bras croisés solidaires du buste.
  tspine_peanut: { period: 7, anchor: 'upperback', feet: true, rigidArms: true, still: TOOLS, end: { torso: 166, head: 160 } },

  // Extension : les hanches descendent, le dos se cambre par-dessus le rouleau, bras tendus avec le buste.
  tspine_overhead: { period: 7, anchor: 'midback', feet: true, rigidArms: true, still: TOOLS, end: { torso: 188, head: 184 } },

  // Idem, mais les mains restent ancrées au-dessus de la tête.
  tspine_overhead_anchor: { period: 7, anchor: 'midback', feet: true, hands: true, still: TOOLS, end: { torso: 188, head: 184 } },

  // Vue du dessus : le corps roule de haut en bas sur le rouleau.
  tspine_side_roll: { period: 7, slide: { angle: 180, from: -8, to: 8 }, still: TOOLS, refS: 0.5 },

  // Balle sous l'omoplate, hanches montées : le bras tendu passe du plafond au-dessus de la tête.
  scapula_ball_overhead: { period: 6, still: TOOLS, end: { arms: [{ upper: -182, fore: -182 }] } },

  // Baguette sur la première côte : le bras se baisse le long du corps puis remonte au-dessus de la tête.
  first_rib: { period: 6, still: TOOLS, begin: { arms: [{ upper: -185, fore: -185 }] }, end: { arms: [{ upper: 0, fore: 0 }] } },

  // ---- Épaule arrière (zone 2) ----
  // Le corps glisse le long du rouleau, sous le grand dorsal.
  lat_roller: { period: 7, slide: { angle: 178, from: -8, to: 8 }, feet: true, still: TOOLS, refS: 0.5 },

  // Debout face à la bande : le buste s'incline plus bas, fesses en arrière, la bande se tend.
  banded_overhead: { period: 6, anchor: 'hip', hands: true, still: TOOLS, stillEnds: { band: ['to'] }, end: { torso: -14, head: -26 } },

  // Même chose, la bande tient le coude.
  overhead_er_band: { period: 6, anchor: 'hip', still: TOOLS, stillEnds: { band: ['to'] }, end: { torso: -14, head: -26 } },

  // Balle sous l'aisselle, coude levé du sol : le bras se plie et se tend, la main descend vers le sol derrière la tête.
  overhead_smash_lying: { period: 6, still: TOOLS, begin: { arms: [{ upper: 200, fore: 200 }] }, end: { arms: [{ upper: 200, fore: 128 }] } },

  // Debout contre le mur, bras levé : le coude se plie, la main passe derrière la tête, la balle ne bouge pas.
  overhead_wall_smash: {
    period: 6, still: TOOLS,
    end: { arms: [{ upper: -100, fore: -20 }, { upper: 110, fore: -130 }] },
  },

  // ---- Épaule avant et bras (zones 3 et 4) ----
  // Mains sur le plan de travail : les genoux plient, le buste descend, les bras restent tendus derrière.
  sink_mob: {
    period: 6, anchor: 'hand', feet: true, still: TOOLS,
    begin: { legs: [{ thigh: 88, shin: 92, foot: 0 }, { thigh: 88, shin: 92, foot: 0 }], arms: [{ upper: 109, fore: 109 }] },
    end: { legs: [{ thigh: 30, shin: 105, foot: 0 }, { thigh: 30, shin: 105, foot: 0 }], arms: [{ upper: 140, fore: 140 }] },
  },

  // Le buste s'incline plus en avant, bras serré derrière le dos ; la bande, fixée au mur, tire l'épaule.
  bully_band: { period: 6, anchor: 'hip', rigidArms: true, still: TOOLS, stillEnds: { band: ['to'] }, end: { torso: -40, head: -54 } },

  // Les hanches redescendent sur les mains, les épaules restent collées au sol, les pieds poussent.
  bilateral_ir_floor: { period: 6, anchor: 'shoulder', feet: true, begin: { torso: 166, head: 170 }, end: { torso: 179, head: 178 } },

  // Le coude se plie, la main monte vers l'épaule, puis il se tend.
  voodoo_elbow: { period: 5, still: TOOLS, end: { arms: [{ upper: 70, fore: -78 }] } },

  // La main est tirée vers le visage : le coude oscille en fin de flexion.
  elbow_distraction_band: {
    period: 5, still: TOOLS, stillEnds: { band: ['to'] },
    begin: { arms: [{ upper: 30, fore: -92 }, { upper: 20, fore: -110 }] },
    end: { arms: [{ upper: 30, fore: -106 }, { upper: 20, fore: -126 }] },
  },

  // Balle sous l'arrière du bras : le coude plie et tend.
  triceps_smash: { period: 6, still: TOOLS, end: { arms: [{ upper: 30, fore: 22 }] } },

  // À genoux, paume au sol : le buste descend vers l'avant, le coude plie contre la bande.
  elbow_extension_band: { period: 6, anchor: 'knee', hands: true, still: TOOLS, stillEnds: { band: ['to'] }, end: { torso: -22, head: -34 } },

  // À quatre pattes, la base de la main plaquée : le corps avance au-dessus de la main, coude verrouillé.
  wrist_band: {
    period: 6, slide: { angle: 0, from: 0, to: 7 }, still: TOOLS, stillEnds: { band: ['to'] },
    end: { arms: [{ upper: 100.4, fore: 100.4 }] },
  },

  // ---- Tronc (zone 5) ----
  // À plat ventre sur la balle : le talon revient vers la fesse, le corps ne bouge pas.
  gut_smash: { period: 6, still: TOOLS, ...HEEL_TO_GLUTE },
  global_gut_smash: { period: 6, still: TOOLS, ...HEEL_TO_GLUTE },

  // Assis jambes croisées, bras levé : le buste se penche de côté (le dessin est de profil, comme la fiche).
  lateral_hip_opener: { period: 6, anchor: 'hip', rigidArms: true, begin: { torso: -90, head: -90 }, end: { torso: -68, head: -64 } },

  // Balle sur l'abdomen, mains qui poussent : le genou monte vers la poitrine puis revient.
  psoas_floss_ball: {
    period: 6, still: TOOLS,
    end: { legs: [{ thigh: -125, shin: 25, foot: 0 }, { thigh: -10, shin: -2, foot: -70 }] },
  },

  // ---- Hanches (zones 6, 7 et 8) ----
  // Genou arrière au sol, pied avant posé : tout le corps avance au-dessus du genou, buste droit.
  banded_hip_ext: {
    period: 6, anchor: 'knee', feet: true, still: TOOLS, stillEnds: { band: ['to'] },
    end: { legs: [{ thigh: 116, shin: 180, foot: 180 }, { thigh: 8, shin: 90, foot: 0 }] },
  },

  // Pied avant posé, les hanches reculent vers l'arrière de la hanche, buste plus penché ; la jambe arrière glisse.
  single_leg_flexion: { period: 6, slide: { angle: 180, from: 0, to: 8 }, feet: [''], hands: true, end: { torso: -34, head: -44 } },
  hip_flexion_box: { period: 6, slide: { angle: 180, from: 0, to: 7 }, feet: [''], hands: true, still: TOOLS, end: { torso: -28, head: -38 } },

  // Le buste s'incline plus en avant, dos plat, les mains restent sur le pied et le genou.
  hip_er_box: { period: 6, anchor: 'hip', hands: true, still: TOOLS, end: { torso: -12, head: -22 } },
  executive_hip: { period: 6, anchor: 'hip', hands: true, still: TOOLS, end: { torso: -36, head: -44 } },

  // La fente descend : les hanches vont vers le bas et l'avant, les pieds restent posés.
  banded_hip_lunge: { period: 6, slide: { angle: 70, from: 0, to: 8 }, feet: true, still: TOOLS, stillEnds: { band: ['to'] } },

  // Le genou arrière dans l'angle du mur, le buste se redresse (comme le couch).
  super_couch: { period: 6, anchor: 'knee', still: ['wall'], stillEnds: { band: ['to'] }, end: { torso: -90, head: -90, arms: [{ upper: 110, fore: 60 }] } },

  // Le genou arrière est d'abord au sol ; le pied glisse vers l'arrière jusqu'à tendre la jambe.
  trailing_leg_ext: {
    period: 7, slide: { angle: 90, from: 10, to: 0 }, feet: [''], still: TOOLS, stillEnds: { band: ['to'] },
    begin: { legs: [{ thigh: 15, shin: 105, foot: 0 }, { thigh: 100, shin: 180, foot: 180 }] },
    end: { legs: [{ thigh: 15, shin: 105, foot: 0 }, { thigh: 140, shin: 140, foot: 130 }] },
  },

  // ---- Arrière de cuisse et genou (zones 9 et 10) ----
  // Assis, balle sous la cuisse : la jambe se tend puis se plie.
  hamstring_ball: {
    period: 6, still: TOOLS,
    begin: { legs: [{ thigh: 0, shin: 8, foot: -45 }, { thigh: 0, shin: 90, foot: 0 }] },
    end: { legs: [{ thigh: 0, shin: 90, foot: 0 }, { thigh: 0, shin: 90, foot: 0 }] },
  },

  // Penché à dos plat, mains sur le banc : les fesses reculent, les genoux plient puis se tendent.
  hamstring_floss: { period: 6, slide: { angle: 110, from: 0, to: 6 }, feet: true, hands: true, still: TOOLS },
  posterior_chain_floss: { period: 6, slide: { angle: 110, from: 0, to: 6 }, feet: true, hands: true, still: TOOLS, stillEnds: { band: ['to'] } },

  // Pied sur la boîte : les hanches reculent, la jambe se tend.
  posterior_chain_box: { period: 6, slide: { angle: 180, from: 0, to: 8 }, feet: [''], hands: true, still: TOOLS, stillEnds: { band: ['to'] } },

  // Allongé, hanche pliée : le genou se plie puis se tend vers le plafond, les mains tiennent la cuisse ou la bande.
  hamstring_supine: {
    period: 6,
    begin: { legs: [{ thigh: -82, shin: 8, foot: 0 }, { thigh: 0, shin: 0, foot: -80 }] },
    end: { legs: [{ thigh: -82, shin: -80, foot: -20 }, { thigh: 0, shin: 0, foot: -80 }] },
  },
  hamstring_band_supine: {
    period: 6, still: TOOLS,
    begin: { legs: [{ thigh: -82, shin: 8, foot: 0 }, { thigh: 0, shin: 0, foot: -80 }] },
    end: { legs: [{ thigh: -82, shin: -80, foot: -20 }, { thigh: 0, shin: 0, foot: -80 }] },
  },

  // Balle dans le creux du genou : le talon se rapproche de la fesse, les mains tirent la jambe.
  knee_gap_smash: {
    period: 6, still: TOOLS, grip: 'knee',
    begin: { legs: [{ thigh: -52, shin: 50, foot: -20 }, { thigh: 0, shin: 0, foot: -80 }] },
    end: { legs: [{ thigh: -70, shin: 75, foot: 0 }, { thigh: 0, shin: 0, foot: -80 }] },
  },

  // À plat ventre, balle au-dessus de la rotule : le talon revient vers la fesse.
  suprapatellar_smash: { period: 6, still: TOOLS, ...HEEL_TO_GLUTE },

  // Assis jambe tendue : le genou se plie, le talon glisse vers la fesse.
  voodoo_knee: { period: 6, begin: { legs: [{ thigh: 0, shin: 0, foot: -75 }] }, end: { legs: [{ thigh: -62, shin: 74, foot: 0 }] } },

  // ---- Jambe, cheville et pied (zones 11 à 13) ----
  // Le pied bouge pendant que la balle reste sur le tibia : les orteils se relèvent, le talon reste posé.
  medial_shin: { period: 5, still: TOOLS, end: { legs: [{ thigh: -50, shin: 85, foot: -35 }, { thigh: 0, shin: 0, foot: -80 }] } },
  double_ball_shin: { period: 5, still: TOOLS, begin: { legs: [{ thigh: 0, shin: 0, foot: -85 }] }, end: { legs: [{ thigh: 0, shin: 0, foot: -25 }] } },
  calf_roller: {
    period: 5, still: TOOLS,
    begin: { legs: [{ thigh: -20, shin: -20, foot: -80 }, { thigh: -26, shin: -16, foot: -80 }] },
    end: { legs: [{ thigh: -20, shin: -20, foot: -28 }, { thigh: -26, shin: -16, foot: -80 }] },
  },
  voodoo_calf: { period: 5, begin: { legs: [{ thigh: 0, shin: 0, foot: -85 }] }, end: { legs: [{ thigh: 0, shin: 0, foot: -25 }] } },
  voodoo_ankle: { period: 5, end: { legs: [{ thigh: 0, shin: 90, foot: -32 }, { thigh: 15, shin: 95, foot: 0 }] } },

  // À genoux : le corps glisse sur la balle ou le rouleau, du genou vers la cheville ; les mains restent posées.
  anterior_shin: { period: 7, slide: { angle: 0, from: -6, to: 6 }, refS: 0.5, still: TOOLS, begin: { arms: [{ upper: 81, fore: 81 }] }, end: { arms: [{ upper: 99, fore: 99 }] } },
  shin_roller: { period: 7, slide: { angle: 0, from: -6, to: 6 }, refS: 0.5, still: TOOLS, begin: { arms: [{ upper: 81, fore: 81 }] }, end: { arms: [{ upper: 99, fore: 99 }] } },

  // Assis sur les talons, mains derrière : le buste part en arrière, les genoux se décollent un peu.
  shin_stretch: {
    period: 6, anchor: 'ankle', hands: true,
    end: { torso: -116, head: -110, legs: [{ thigh: -22, shin: 152, foot: 180 }, { thigh: -20, shin: 152, foot: 180 }] },
  },

  // Le genou avance au-dessus du pied posé, le genou arrière reste au sol, la bande reste tendue vers le mur.
  heel_cord_band: {
    period: 6, anchor: 'knee2', feet: [''], hands: true, still: TOOLS, stillEnds: { band: ['to'] },
    end: { legs: [{ thigh: 10, shin: 115, foot: 0 }, { thigh: 114, shin: 180, foot: 180 }] },
  },
  ankle_band: {
    period: 6, anchor: 'knee2', feet: [''], hands: true, still: TOOLS, stillEnds: { band: ['to'] },
    end: { legs: [{ thigh: 10, shin: 115, foot: 0 }, { thigh: 114, shin: 180, foot: 180 }] },
  },

  // À genoux devant la boîte, coudes posés : le corps recule et se baisse pour ajouter de la tension.
  bilateral_shoulder_flexion: { period: 6, anchor: 'knee', hands: 'forearm', still: TOOLS, end: { torso: -44, head: -56, legs: [{ thigh: 76, shin: 180, foot: 180 }] } },

  // À quatre pattes, genoux écartés : les hanches glissent vers l'arrière, les genoux restent posés.
  adductor_frog_rock: { period: 6, slide: { angle: 180, from: 0, to: -14 }, feet: true },

  // Assis, plantes jointes : le buste s'incline vers les pieds, les mains les tiennent.
  butterfly_fold: { period: 7, end: { torso: -12, head: -4 }, anchor: 'hip', rigidArms: true },

  // Debout face au mur, le pied reste posé : le genou se tend contre la bande puis se replie.
  knee_tke_band: { period: 5, anchor: 'ankle', still: TOOLS, stillEnds: { band: ['to'] } },

  // Le talon avant reste au sol, le genou avance vers le mur, les mains restent sur le mur.
  soleus_wall_bent: { period: 6, anchor: 'ankle', hands: true, still: TOOLS, end: { legs: [{ thigh: 46, shin: 118, foot: 0 }, { thigh: 100, shin: 100, foot: 0 }] } },

  // Chien tête en bas : les genoux se plient à tour de rôle, les mains restent au sol.
  calf_downdog_pedal: { period: 6, hands: true },

  // Le pied reste à plat, le genou avance jusqu'au mur.
  ankle_wall_knee_drive: { period: 6, anchor: 'ankle', hands: true, still: TOOLS, end: { legs: [{ thigh: 52, shin: 118, foot: 0 }, { thigh: 100, shin: 100, foot: 0 }] } },

  // Couché sur le côté : le corps glisse le long de la cuisse, le rouleau reste en place.
  it_band_roller: { period: 7, slide: { angle: 0, from: -10, to: 10 }, still: TOOLS, refS: 0.5 },

  // Les hanches reculent sur la chaise, les pieds restent posés, la chaise ne bouge pas.
  chair_squat_tempo: { period: 6, anchor: 'ankle', feet: true, still: TOOLS },

  // Les orteils se relèvent, les talons restent au sol.
  toe_raise_wall: { period: 4, still: TOOLS },

  // Montée sur les pointes : le corps monte de la hauteur du pied qui se redresse, les mains restent sur le mur.
  calf_raise_slow: { period: 5, hands: true, slide: { angle: -90, from: 0, to: 8 }, still: TOOLS },

  // Pointer, puis ramener les orteils : seul le pied tourne autour de la cheville.
  ankle_pump_long_sit: { period: 4 },

  // La tête recule contre le mur.
  chin_tuck_wall: { period: 5, still: TOOLS },

  // La jambe libre passe de l'avant à l'arrière comme un pendule.
  leg_swing_front_back: { period: 4 },

  // Le genou monte vers la poitrine, le pied d'appui reste posé.
  knee_hug_standing: { period: 5, anchor: 'ankle2' },

  // Le bassin monte, les épaules et les pieds restent posés.
  glute_bridge_hold: { period: 6, anchor: 'shoulder', feet: true },

  // À genoux, coudes sur le banc : la poitrine descend entre les bras, les coudes restent posés.
  tspine_bench_prayer: { period: 7, anchor: 'knee', still: TOOLS },

  // Vue du dessus : le bras du dessus s'ouvre en arc, la tête le suit, le bassin ne bouge pas.
  open_book_rotation: { period: 7, anchor: 'hip' },

  // À plat ventre : les bras décollent du sol.
  prone_y_raise: { period: 5, anchor: 'hip' },

  // Les bras montent jusqu'au mur derrière la tête.
  wall_overhead_reach: { period: 6, still: TOOLS },

  // À quatre pattes : le corps bascule vers l'avant au-dessus des mains, qui restent posées.
  wrist_quadruped_rock: { period: 6, slide: { angle: 0, from: 0, to: 10 }, hands: true, feet: true },

  // Sur le dos : un bras part derrière la tête, la jambe opposée s'allonge, le bassin reste au sol.
  dead_bug_slow: { period: 7, anchor: 'hip' },

  // À quatre pattes : un bras et la jambe opposée s'allongent, le genou et la main d'appui restent posés.
  bird_dog_slow: { period: 7, anchor: 'knee' },

  // Debout, talon devant : le buste se penche un peu plus à plat, les pieds restent posés.
  hamstring_heel_forward: { period: 7, anchor: 'ankle2', feet: true, end: { torso: -24, head: -36, arms: [{ upper: 66, fore: 56 }] } },

  // Assis au bord de la chaise : le buste se penche vers la jambe tendue, la chaise reste en place.
  hamstring_chair_fold: { period: 7, anchor: 'ankle2', still: TOOLS, end: { torso: -20, head: -32, arms: [{ upper: 58, fore: 48 }] } },

  // Les hanches reculent, les pieds restent posés, les mains descendent vers les genoux.
  hip_hinge_drill: { period: 6, anchor: 'ankle', feet: true },

  // Sur une jambe : le buste penche et l'autre jambe part derrière, le pied d'appui reste posé.
  single_leg_hinge: { period: 7, anchor: 'ankle2' },

  // De la charnière au squat profond : les pieds restent posés, les mains restent aux pieds.
  squat_to_stand: { period: 8, anchor: 'ankle', feet: true },

  // Le genou appuie sur la serviette qui reste en place.
  quad_set_towel: { period: 5, anchor: 'hip', still: TOOLS },

  // Marche sur les talons puis sur les pointes : les jambes passent l'une devant l'autre.
  heel_walk: { period: 5 },
  toe_walk: { period: 5 },

  // À genoux sur une jambe : le genou arrière reste au sol, le pied avant reste posé, les hanches avancent.
  kneeling_hip_flexor: { period: 7, anchor: 'knee2', feet: [''] },
};
