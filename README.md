# Genèse

Prototype de « god game » roguelite pour navigateur mobile. Tu es une divinité : tu ne poses presque rien,
tu choisis les **lois** du monde (les entrées d'un grimoire), tu fais quelques **miracles**, et tu regardes une petite
carte hexagonale d'automate cellulaire vivre seule. Objectif de l'Âge I : 40 végétaux dont 14 Forêts en 5 saisons.

Règles complètes : [`docs/GDD.md`](docs/GDD.md) · choix et questions ouvertes : [`docs/QUESTIONS.md`](docs/QUESTIONS.md).

## Développement

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests du moteur (Vitest)
npm run build      # typecheck + build de production
npm run sim -- --runs 500                  # simulation d'équilibrage (politique naïve)
npm run sim -- --runs 500 --policy greedy  # politique de référence plus maligne (+ diagnostic détaillé)
npm run sim -- --sweep                     # compare les variantes d'équilibrage (src/data/variants.ts)
```

Node ≥ 22.6 est requis pour le script de simulation (il exécute le TypeScript directement).

## Structure

- `src/engine/` — simulation pure et déterministe (RNG à graine, journal par cycle), sans DOM.
- `src/data/` — éléments, lois, miracles, constantes d'équilibrage (tout chiffre de gameplay est ici).
- `src/ui/` — composants Preact.
- `scripts/sim.ts` — simulateur d'équilibrage.
- `tests/` — tests Vitest du moteur.

## Déploiement (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` teste, construit et publie sur Pages à chaque push sur `main`.
À faire une fois : dans *Settings → Pages*, choisir **Source : GitHub Actions**.
La base Vite est `/ecosystemia/` (`vite.config.ts`) : à changer si le dépôt est renommé.
