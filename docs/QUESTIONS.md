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
7. **Graines de départ « voisines d'une Eau »** : voisinage moore (comme Germination).
8. **Draft.** La pondération 60/30/10 est appliquée *par palier de rareté* (on tire d'abord le palier, puis une loi
   uniformément dedans), sans doublon ni loi déjà au grimoire. Si le grimoire est plein, prendre une loi impose de
   choisir laquelle remplacer. Une loi retirée du grimoire retourne dans le pool.
9. **Annulation des miracles.** Pile (dernier lancé, premier annulé) + « tout annuler ». Les modifications du
   grimoire et le draft ne sont pas annulables (le tirage consomme la graine aléatoire).
10. **Altitude.** Les 3 niveaux sont garantis en découpant le bruit lissé en quantiles (30 / 40 / 30 %).

## Équilibrage (script `npm run sim`, 500 parties, graines 1–500)

| Politique | Victoires | Saison moyenne de victoire | Essence finale moy. |
|-----------|-----------|----------------------------|---------------------|
| `naive` (1re loi, sème près de l'eau) | 11,4 % | 3,9 | 21,8 |
| `greedy` (lois classées, Source quand le rivage est plein) | 82,6 % | 4,4 | 51,7 |

- L'objectif n'est ni impossible ni trivial : le bot naïf gagne parfois, un bot qui pense en « rivages » gagne presque
  toujours mais tard (saisons 4–5). **Aucun chiffre n'a été modifié** après ces résultats.
- Constat de design : **les plantes n'apparaissent que près de l'eau** (Germination) sauf via Cendre fertile et
  Lichen. L'expansion passe donc par la création d'eau (Source, Ruissellement, Pluie des cimes) ou par le feu
  (Embraser + Cendre fertile). Le bot ne joue ni Soulever ni Embraser : un humain a plus d'outils.
- L'Essence s'accumule en fin de partie (50+ pour le bot) : il manque de puits d'Essence si le jeu est allongé.
  À décider avec le futur contenu (Âges suivants).
- Un vrai plafond de difficulté reste à mesurer sur des humains : l'objectif de 8 Forêts exige des agrégats 2D
  (≥ 3 voisins végétaux), pas des lignes le long du rivage.
