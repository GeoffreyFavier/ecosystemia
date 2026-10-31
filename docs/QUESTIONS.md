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
8. **Révélation (draft).** La pondération 60/30/10 est appliquée *par palier de rareté* (on tire d'abord le palier, puis une loi
   uniformément dedans), sans doublon ni loi déjà au grimoire. Si le grimoire est plein, prendre une loi impose de
   choisir laquelle remplacer. Une loi retirée du grimoire retourne dans le pool.
9. **Annulation des miracles.** Pile (dernier lancé, premier annulé) + « tout annuler ». Les modifications du
   grimoire et le draft ne sont pas annulables (le tirage consomme la graine aléatoire).
10. **Altitude.** Les 3 niveaux sont garantis en découpant le bruit lissé en quantiles (30 / 40 / 30 %).

## Mise en page hexagonale

11. **Portrait** : la carte tient en 390 px de large, donc des hexagones d'environ 28 px (sous la cible de 36 px,
    qui ne concerne que le paysage). Jouable mais serré au doigt ; si le portrait devient important, prévoir un zoom
    ou un défilement horizontal de la carte.
12. **Inspecteur en bulle** : ancrée en % de la carte (donc suit la mise à l'échelle), placée au-dessus de la case, ou
    en dessous pour les 3 premières rangées ; elle masque brièvement les cases voisines.
13. **Révélation en surcouche** : la carte est visible mais assombrie pendant le choix. Le curseur d'historique (debug)
    n'est utilisable qu'après avoir fermé la révélation (prendre une loi ou passer).

## Équilibrage (script `npm run sim`, 500 parties, graines 1–500)

Carte hexagonale 12×9, objectif 40 végétaux dont 14 Forêts (devenu 12 Forêts, voir plus bas), 2 lacs, 10–14 Roches, 6 Graines.

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

## Historique : première comparaison de variantes (réglages de l'époque : Essence 10, 14 Forêts ; `npm run sim -- --sweep`, 500 parties par variante et par politique, graines 1–500)

Cible indicative : naive ≈ 10 %, greedy ≈ 45 %, victoires réparties entre les saisons 3 et 5.
**Aucune variante n'est appliquée** : les valeurs par défaut sont inchangées (`src/data/variants.ts` ne sert qu'au simulateur).
`S≤3/4/5` = part des victoires obtenues en saison ≤ 3 / 4 / 5.

| Var | Description | naive | naive S≤3/4/5 | greedy | greedy S≤3/4/5 | Forêts finales (greedy) | Plantes jamais Forêt (greedy) |
|-----|-------------|-------|---------------|--------|----------------|-------------------------|-------------------------------|
| A | Réglages actuels (référence) | 5,4 % | 4/22/74 | 23,8 % | 0/7/93 | 11,2 | 26,9 |
| B | GOAL.forests = 12 | 5,6 % | 4/21/75 | 26,6 % | 0/7/93 | 11,2 | 26,9 |
| C | Essence de départ = 15 | 5,8 % | 7/66/28 | 60,8 % | 0/12/88 | 16,8 | 28,0 |
| D | Croissance ≥ 2 voisins et Plante d'âge ≥ 2 | 7,2 % | 6/78/17 | 99,6 % | 1/41/58 | 46,5 | 5,4 |
| E | B + C | 6,0 % | 7/63/30 | 69,6 % | 0/11/89 | 16,6 | 28,1 |
| F* | Essence de départ = 12 | 5,6 % | 4/46/50 | 39,0 % | 0/8/92 | 13,6 | 27,5 |
| G* | B + Essence de départ = 12 | 5,8 % | 7/41/52 | 45,0 % | 0/8/92 | 13,4 | 27,5 |
| H* | Croissance ≥ 2 voisins et Plante d'âge ≥ 4 | 6,8 % | 3/79/18 | 99,6 % | 1/42/57 | 46,5 | 5,6 |
| I* | D + objectif 40 végétaux dont 24 Forêts | 7,0 % | 3/80/17 | 99,6 % | 1/41/58 | 46,5 | 5,4 |
| J* | D + objectif 50 végétaux dont 30 Forêts | 1,4 % | 0/71/29 | 90,0 % | 0/15/85 | 51,8 | 5,9 |
| K* | D + objectif 55 végétaux dont 35 Forêts | 0,8 % | 0/100/0 | 73,0 % | 0/10/90 | 52,4 | 5,9 |

\* Variantes ajoutées en plus de la demande (A–E) pour encadrer la cible.

### Lecture
- **Le goulot est la Croissance, pas l'objectif.** Avec les réglages actuels, ~27 Plantes par partie ne deviennent jamais
  Forêt (le feu n'y est pour rien : 0 végétal brûlé avec ces bots) et ~27 Graines se flétrissent. D (Croissance ≥ 2 voisins)
  supprime le goulot (5 Plantes bloquées) mais rend le jeu trivial pour greedy (99,6 %) ; durcir l'objectif (I–K) ne
  recrée pas de tension tant que la carte permet ~46-52 végétaux.
- **L'âge minimum de la Plante (2 ou 4) ne change rien** (D ≈ H) : le seuil de voisins est le seul levier de Croissance.
- **B (14 → 12 Forêts) pèse peu** (+2,8 points pour greedy) : il manque autant de végétaux que de Forêts.
- **L'Essence de départ est le levier le plus progressif** : 10 → 23,8 %, 12 → 39,0 %, 15 → 60,8 % pour greedy.
- **naive reste à 5-7 % quelle que soit la variante** : elle prend la première loi proposée et ne crée jamais d'eau, donc
  elle mesure surtout un plancher ; elle ne peut pas atteindre « ≈ 10 % » avec ces leviers.
- **Les victoires de greedy tombent à ~90 % en saison 5** pour toutes les variantes « Essence » : aucune ne répartit les
  victoires sur 3-5. Seule la famille D les déplace vers la saison 4 (41 %), au prix d'un jeu trop facile.

### Recommandation de l'époque
**G (appliquée depuis, voir « Itération 2 ») : GOAL.forests = 12 et Essence de départ = 12.** C'est la seule variante qui tombe sur la cible greedy (45,0 %), elle
garde la structure actuelle du jeu et ne touche que deux chiffres de `src/data/constants.ts`. Limites connues : naive
reste à ~6 % et 92 % des victoires de greedy arrivent en saison 5. Si l'on veut des victoires plus précoces, la piste à
tester ensuite est une Croissance **intermédiaire** entre ≥ 3 et ≥ 2 voisins (par exemple ≥ 2 voisins seulement si la
Plante touche aussi de l'eau, ou un seuil de 3 avec les Forêts comptant double), puis re-régler l'Essence.
