// Mouvements des schémas (voir js/motion.js). Une fiche absente de la liste reste une image fixe.
// Les angles suivent les schémas (voir js/diagram.js). Par défaut, le mouvement va de l'image 1 de la fiche à son
// image 2 ; `end` décrit une pose d'arrivée quand la fiche n'en a qu'une (il remplace les champs de la pose 1).
//   period     durée d'une boucle, en secondes : lent, avec une courte tenue à chaque bout
//   anchor     articulation clouée au sol
//   slide      le corps glisse le long de `angle` (degrés), de `from` à `to` (unités du schéma)
//   hands      les mains restent posées là où elles sont dans la pose de référence
//   feet       les pieds restent posés
//   still      types d'accessoires immobiles (le rouleau, le mur, la balle, la boîte ne suivent pas le corps)
//   stillEnds  extrémités immobiles d'une bande
//   refS       avancement (0 à 1) de la pose de référence ; 0,5 pour un va-et-vient centré
//   begin      remplace des champs de l'image 1 pour le départ (continuité des angles : -185 plutôt que 175)
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
};
