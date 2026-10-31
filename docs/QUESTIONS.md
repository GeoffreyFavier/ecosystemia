# Questions ouvertes et choix faits

Chaque règle ambiguë a été tranchée au plus simple. À revalider après les premiers tests sur téléphone.

## Règles ambiguës — choix retenus

1. **Événements et cellules dans un même cycle.** Une case modifiée par un événement (Foudre, Pluie des cimes) à
   l'étape A est *figée* pour l'étape B du même cycle. Sans cela, la Foudre créerait un Feu qui redeviendrait
   Cendre immédiatement (le Feu n'existerait jamais). L'instantané de B est pris *après* A, donc les voisins
   réagissent au nouveau Feu dès ce cycle. Les événements ignorent les lois de protection (elles ne concernent
   que l'étape B).
2. **Événements successifs.** Plusieurs lois « event » le même cycle s'appliquent séquentiellement, dans l'ordre
   du grimoire, sur la grille vivante. Au sein d'une même loi, le calcul est simultané.
3. **Numéro de cycle.** Global, commence à 1 (le premier cycle de la partie est le n°1). Pluie des cimes tombe
   donc aux cycles 4, 8, 12… et Foudre aux cycles 5, 10, 15…
4. **Âge.** Une case qui change passe à 0 ; sinon +1 à la fin du cycle. Une Graine née au cycle *t* a donc
   l'âge 4 au début du cycle *t+5* et se flétrit alors (elle a eu 4 cycles pour germiner).
   Un miracle « Soulever » ne change pas l'âge ; les autres le remettent à 0.
5. **Monde mort.** « Coût du miracle le moins cher » est pris parmi les miracles *capables de rendre la vie*
   (Semer, 2) et non Embraser (1) : avec 1 Essence, 0 végétal et 0 Graine, rien ne peut renaître. Le champ
   `createsLife` des miracles porte ce choix. La vérification se fait en fin de saison, après le calcul d'Essence
   et après la victoire ; la défaite « monde mort » est prioritaire sur « objectif non atteint » à la saison 5.
6. **Racines humides** protège aussi de la Croissance (un végétal protégé « ne change pas », quoi qu'il arrive,
   y compris en Forêt). C'est volontaire : la loi est un compromis (immunité au feu contre arrêt de la croissance
   au bord de l'eau). À surveiller en test.
7. **Graines de départ « voisines d'une Eau »** : un des 6 voisins est de l'Eau (comme Germination).
8. **Draft.** La pondération 60/30/10 est appliquée *par palier de rareté* (on tire d'abord le palier, puis une loi
   uniformément dedans), sans doublon ni loi déjà au grimoire. Si le grimoire est plein, prendre une loi impose de
   choisir laquelle remplacer. Une loi retirée du grimoire retourne dans le pool.
9. **Annulation des miracles.** Pile (dernier lancé, premier annulé) + « tout annuler ». Les modifications du
   grimoire et le draft ne sont pas annulables (le tirage consomme la graine aléatoire).
10. **Altitude.** Les 3 niveaux sont garantis en découpant le bruit lissé en quantiles (30 / 40 / 30 %).

## Équilibrage (script `npm run sim`, 500 parties, graines 1–500)

Carte hexagonale 12×9, objectif 40 végétaux dont 14 Forêts, 2 lacs, 10–14 Roches, 6 Graines.

| Politique | Victoires | Saison moy. de victoire | Essence finale moy. | Végétaux finaux moy. (Forêts) |
|-----------|-----------|-------------------------|---------------------|-------------------------------|
| `naive` (1re loi, sème près de l'eau) | 5,4 % | 4,7 | 27,7 | 22,4 (3,1) |
| `greedy` (lois classées, Source quand le rivage est plein) | 23,8 % | 4,9 | 52,6 | 38,1 (11,2) |

*Avant le passage à l'hexagonal (8×8, objectif 24/8) : naive 11,4 %, greedy 82,6 %.*

- **Ni impossible ni trivial.** Le bot naïf gagne parfois (5 %), le bot « malin » environ une fois sur quatre, et
  presque toutes les victoires arrivent à la **saison 5** : l'objectif est serré. Les bots ne jouent ni Soulever ni
  Embraser (le feu comme moteur de croissance via Cendre fertile) : un humain a plus d'outils, la difficulté réelle
  est donc probablement un peu plus basse. **Aucun chiffre n'a été retouché** pour la sim, comme demandé.
- Le goulot reste les **14 Forêts** : le bot `greedy` atteint 38 végétaux en moyenne (presque l'objectif) mais seulement
  11 Forêts. Si c'est trop dur en jeu réel, le levier le plus simple est `GOAL.forests` (ex. 12) dans `src/data/constants.ts`.
- À 6 voisins, Croissance (≥ 3 végétaux) se déclenche plus facilement qu'à 8 voisins moore sur 4 axes, mais les Forêts
  sont aussi plus exposées au feu (le feu touche les 6 voisins).
- L'Essence s'accumule encore en fin de partie (50+ pour le bot) : pas assez de puits d'Essence.
- Les plantes n'apparaissent qu'au bord de l'eau (Germination), sauf via Cendre fertile et Lichen : l'expansion passe
  par la création d'eau (Source, Ruissellement, Pluie des cimes) ou par le feu.
