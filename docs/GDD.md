# Genèse — Game Design Document (Âge I)

> Nom provisoire : **Genèse**. Prototype navigateur, mobile portrait, thème fantasy sombre et sobre.
> Ce document décrit **uniquement l'Âge I**, une partie à la fois, sans méta-progression.
> Les chiffres cités ici vivent dans `src/data/` ; en cas de divergence, le code de `src/data/` fait foi.

## 1. Vision

Un « god game » roguelite. Le joueur est une divinité qui ne pose presque rien elle-même :
elle choisit les **lois** du monde (les entrées d'un grimoire) et accomplit quelques **miracles** ponctuels.
Le monde est une petite grille d'automate cellulaire qui évolue seule.

Boucle visée, en sessions de ~5 minutes : *choisir des lois → regarder le monde vivre → corriger*.

À terme : plusieurs Âges (éléments → vivant → peuples), méta-progression, mode idle joué par une IA.
Le moteur est donc pur, déterministe et jouable par un programme.

## 2. Le monde

- Carte **hexagonale** « pointy-top », **12 colonnes × 9 rangées** (`GRID_COLS`, `GRID_ROWS` dans `src/data/constants.ts`).
  Stockage en coordonnées *odd-r offset* (les rangées impaires sont décalées à droite), calculs de voisinage et de
  distance en coordonnées *axiales* ([Red Blob Games](https://www.redblobgames.com/grids/hexagons/)).
- Chaque case : **altitude** (0 bas, 1 moyen, 2 haut), **élément**, **âge**
  (nombre de cycles depuis son dernier changement, remis à 0 à chaque changement) et
  **lastLawId** (la loi qui l'a transformée en dernier).
- Éléments : **Vide** (terre nue), **Roche**, **Eau**, **Graine**, **Plante**, **Forêt**, **Feu**, **Cendre**.
  « **Végétal** » = Plante ou Forêt.
- **6 voisins** par case, tous équivalents (plus de distinction ortho/moore). Directions : **E, O, NE, NO, SE, SO**.
  Hors carte = pas de voisin.

### Génération (déterministe, à partir d'une graine)

1. Altitude : bruit aléatoire lissé par 1 ou 2 passes de moyenne, puis découpé en quantiles
   pour que les 3 niveaux soient toujours présents.
2. **2 lacs** connexes de 4 à 7 cases d'Eau chacun, en altitude basse (ils ne se touchent pas).
3. **6 Graines**, dont au moins **3** voisines d'une Eau.
4. **10 à 14 Roches**, de préférence en altitude haute.
5. Le reste en Vide.

## 3. Structure d'une partie

- **5 saisons maximum**, **8 cycles par saison**.
- **Objectif** vérifié à la fin de chaque saison : au moins **40 végétaux** dont au moins **12 Forêts**.
  Atteint → **victoire immédiate**.
- **Défaite** :
  - objectif non atteint à la fin de la saison 5 ;
  - ou **monde mort** : 0 végétal, 0 Graine, et Essence inférieure au coût du miracle de vie le moins cher (Semer).
- **Essence** de départ : 12. En fin de saison : +1 par Plante, +2 par Forêt, plus les bonus des lois d'Essence.
- Ordre de fin de saison : Essence → victoire ? → défaite ? → saison suivante.

## 4. Phase d'intervention

Avant chaque saison, y compris la première :

1. **Révélation** (le « draft ») : 3 lois tirées au hasard dans le pool (hors lois déjà présentes dans le grimoire).
   Le joueur en prend 1 ou passe. Tirage pondéré par rareté (60 / 30 / 10).
2. **Grimoire** : 5 emplacements maximum, 2 lois de départ. Le joueur peut réordonner, retirer une loi,
   et remplacer une loi quand le grimoire est plein.
3. **Miracles**, payés en Essence. Plusieurs par phase ; tout est annulable tant que la saison n'est pas lancée.

   | Miracle   | Coût | Effet                                   |
   |-----------|------|------------------------------------------|
   | Semer     | 2    | une Graine sur un Vide ou une Cendre     |
   | Source    | 4    | une Eau sur un Vide                      |
   | Soulever  | 3    | altitude +1 d'une case (maximum 2)       |
   | Embraser  | 1    | un Feu sur un végétal (brûlis volontaire)|
4. **Aperçu** : surligne les cases qui changeraient au prochain cycle, avec l'élément d'arrivée.
   **Lancer la saison**.

## 5. Déroulement d'un cycle

Le numéro de cycle est **global** (1, 2, 3 … sur toute la partie).

**A. Événements.** Pour chaque loi de type *event* du grimoire, dans l'ordre du grimoire, si
`numéro de cycle % période == 0`, l'appliquer (séquentiellement, sur la grille vivante).

**B. Cellules.** Calcul **simultané** à partir d'un instantané de la grille (pris après A).
Pour chaque case, on évalue dans cet ordre et on s'arrête à la première règle qui s'applique :

1. Lois de **protection** du grimoire : si l'une s'applique, la case ne change pas.
2. Lois naturelles de **catastrophe** : Feu → Cendre ; un végétal ayant ≥ 1 Feu voisin → Feu.
3. Lois de **transformation** du grimoire, **dans l'ordre du grimoire**.
4. Lois naturelles d'**usure** : Graine d'âge ≥ 4 → Vide ; Cendre d'âge ≥ 6 → Vide.
5. Sinon rien ne change.

**C. Mise à jour.** Âges (+1 si inchangée, 0 si changée), `lastLawId`, journal.

Les lois naturelles sont toujours actives, hors grimoire, et affichées dans l'UI.

**Événement naturel optionnel — Orage** (désactivé par défaut, `NATURAL_EVENTS` dans `src/data/naturalLaws.ts`) : quand il
est activé, tous les 8 cycles (cycle global % 8 == 0, donc à la fin de chaque saison), la Forêt d'altitude maximale devient
Feu, avec le même départage que Foudre. Il s'applique avant les événements du grimoire. Il sert aux tests d'adversité du
simulateur ; il ne fait pas partie des règles livrées.
Le moteur produit un **journal** par cycle (case, de → vers, loi) que l'UI rejoue.

## 6. Lois

Les lois sont des **données** interprétées par un petit moteur de conditions.
Conditions disponibles : élément ciblé, nombre de voisins d'un type (min/max, filtre
d'altitude relative plus haut/plus bas), voisin dans une direction donnée, âge minimum, altitude de la case,
`within` (cases à distance ≤ d, pas seulement voisines), `anyOf` (OU de listes de conditions), plus une échappatoire `custom` (registre de fonctions) non utilisée à l'Âge I.

### Lois de départ (dans le grimoire)

- **Germination** (transfo) : Graine avec ≥ 1 Eau voisine → Plante.
- **Croissance** (transfo) : Plante avec ≥ 3 végétaux voisins → Forêt.

### Pool (14)

| Loi | Type | Rareté | Effet |
|-----|------|--------|-------|
| Dissémination | transfo | commune | Vide/Cendre avec ≥ 2 Forêts voisines → Graine |
| Pollen | transfo | commune | Vide avec ≥ 3 Plantes voisines → Graine |
| Vent d'ouest | transfo | peu commune | Vide dont le voisin direct à l'ouest (direction O) est un végétal → Graine |
| Cendre fertile | transfo | commune | Cendre avec ≥ 1 végétal voisin → Plante |
| Ruissellement | transfo | commune | Vide avec un voisin Eau d'altitude strictement supérieure → Eau |
| Érosion | transfo | peu commune | Roche avec ≥ 3 Eau voisines → Vide |
| Lichen | transfo | rare | Roche d'âge ≥ 6 avec ≥ 1 Forêt voisine → Plante |
| Mangrove | transfo | rare | Eau avec ≥ 3 Forêts voisines → Forêt |
| Racines humides | protection | commune | Végétal avec ≥ 1 Eau voisine ne change pas |
| Pluie des cimes | event /4 | peu commune | Chaque Vide d'altitude 2 → Eau |
| Foudre | event /5 | rare | La Forêt la plus haute devient Feu (égalité : première ligne par ligne ; aucune Forêt : rien) |
| Offrande | essence | peu commune | +1 Essence par Forêt en fin de saison |
| Cycle des cendres | essence | peu commune | +1 Essence chaque fois qu'un Feu devient Cendre |
| Sources sacrées | essence | rare | En fin de saison, +1 Essence par Eau ayant ≥ 1 Forêt voisine |

## 7. Interface

Le jeu ne parle pas de « cartes » : les lois sont une liste sobre (icône, nom, effet en une ligne).

### Mise en page

- **Paysage (prioritaire)** : la carte occupe toute la hauteur, à gauche (~65 % de la largeur). À droite, un panneau
  défilable avec, dans l'ordre : objectif et Essence, grimoire, lois naturelles (repliables), miracles, boutons
  Aperçu et Lancer la saison (puis graine, debug, nouvelle partie).
  Cible : chaque hexagone fait au moins ~36 px de large sur un écran de 800 × 360 (mesuré : ~38 px).
- **Portrait** (secondaire, fonctionnel) : la carte en haut, le panneau dessous, en défilement.
- **Inspecteur** : bulle près de la case touchée (élément, altitude, âge, « transformée par »).
- **Révélation, victoire et défaite** : surcouche centrée.

### Éléments

- En-tête : « Âge I — Saison x/5 », Essence, objectif (végétaux a/40, forêts b/12) avec barres.
- Carte hexagonale rendue en **SVG** (un polygone par case, emoji en `<text>`, tap sur le polygone) : fond = altitude
  (3 teintes de terre), emoji d'élément avec fond coloré léger.
- Miracle : taper le miracle puis la case (cases valides surlignées). Taper une case sans miracle ouvre l'inspecteur.
- Saison : ~400 ms par cycle, clignotement des cases modifiées, bouton « Passer », résumé de fin de saison.
- Mode debug : cycle par cycle + curseur d'historique de la dernière saison.
- Révélation : choisir 1 loi parmi 3 ou passer ; si le grimoire est plein, choisir la loi remplacée.
- Fin de partie : bilan avec stats, « Nouvelle partie », « Rejouer cette graine », « Voir le monde ».
- Sauvegarde automatique dans `localStorage`.

## 8. Hors périmètre

Âges II et III, méta-progression, mode idle (le moteur est prêt), sons, assets graphiques finaux.
