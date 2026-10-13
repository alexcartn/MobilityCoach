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

export const MOTIONS = {
  // Le buste se redresse, le genou arrière reste contre le mur.
  couch: { period: 6, anchor: 'knee', still: ['wall'] },

  // Le corps glisse sur le rouleau, qui tourne sur place ; les avant-bras restent posés, les bras pivotent autour des coudes.
  quad_smash: { period: 7, slide: { angle: 172, from: -8, to: 8 }, hands: 'forearm', still: ['roller'], refS: 0.5 },

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
};
