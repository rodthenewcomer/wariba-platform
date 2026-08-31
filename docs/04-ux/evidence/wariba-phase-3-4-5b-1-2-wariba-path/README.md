# Preuves — Phase 3.4.5B.1.2 · WARIBA PATH

**Date :** 30 août 2026

**Portée :** Hero uniquement

**Build :** production, Node.js 24.18.0

**Verdict :** `BLOCKED`

Le Hero remplace la courbe montante du Market Field par une signature composée
de deux bornes, d'une trajectoire centrale non monotone et d'un resserrement
précis. Le canevas reste neutral-black ; le cobalt est limité aux lignes, aux
marqueurs et au signal.

## Implémentation

- upper boundary + lower boundary dérivées d'une même géométrie ;
- trajectoire centrale avec replis visibles, sans hausse continue ;
- corridor qui s'élargit, se resserre puis se rouvre ;
- signal et pulse synchronisés sur la progression réelle jusqu'au resserrement ;
- une seule durée mobile, partagée par le signal et son pulse ;
- composition mobile descendue sous la divulgation ;
- état statique server-rendered avec petits marqueurs ;
- signal absent du DOM en reduced motion ;
- aucune dépendance, logique métier ou modification backend.

## Copy

Le H1, le supporting copy et les deux CTA sont inchangés. La divulgation utilise
la formulation demandée :

> Le trading est entièrement simulé. Le montant affiché sur votre compte n’est
> ni un dépôt ni du capital réel qui vous est confié.

## Contrôles ciblés

| Contrôle | Résultat |
|---|---|
| Prettier ciblé | pass |
| ESLint ciblé | pass |
| Web typecheck | pass |
| Build production | pass, 106 pages générées |
| Hero Playwright | 4/4 |
| Débordement 320 px | aucun |
| Axe WCAG 2 A/AA | 0 critique, 0 sérieux |
| Console production, mouvement normal | 0 erreur, 0 warning |
| Reduced motion WARIBA PATH | `data-animated=false`, 0 `animateMotion` |
| Console production, chargement initial reduced motion | 1 erreur React #418 |

Le build conserve un warning préexistant `@next/next/no-img-element` dans
`app/(platform)/HubUserMenu.tsx`, hors portée du Hero.

## Blocage exact

Lorsqu'on charge directement la homepage avec
`prefers-reduced-motion: reduce`, WARIBA PATH reste correctement statique mais
React émet une erreur d'hydratation `#418` sur un texte. Le défaut vient des
scènes animées situées plus bas sur la homepage, qui rendent une frame différente
entre le serveur et le premier rendu client selon `useReducedMotion`.

Cette phase interdit de modifier les autres sections. Le défaut est donc
documenté et non masqué. Tant qu'il reste présent :

```text
PHASE_3_4_5B_1_2_READY = no
READY_FOR_SECTION_02 = no
```

## Évaluation visuelle

| Axe | Score |
|---|---:|
| Desktop WOW | 8,6 / 10 |
| Mobile WOW | 8,1 / 10 |
| Originalité | 8,4 / 10 |
| Reconnaissance de marque | 8,3 / 10 |

Le mobile est volontairement plus silencieux. À 390 px, les trois lignes sont
visibles dans la bande basse sans traverser la divulgation. À 320 px, la capture
complète du Hero montre la même grammaire ; le premier viewport reste consacré au
message et aux actions.

## Creative red team

1. La silhouette n'est plus une simple ligne montante : **pass**.
2. Le mouvement décrit un système borné plutôt qu'un screensaver : **pass**.
3. Le canevas reste visuellement noir : **pass**.
4. Le cobalt reste localisé : **pass**.
5. Le H1 reste dominant : **pass**.
6. Aucune règle de risque, visualisation FLEX ou interface WariX n'entre dans le Hero : **pass**.
7. Le coût reste faible : un SVG, peu de nœuds, opacity/transform, aucun asset externe : **pass**.
8. Runtime reduced motion sans erreur : **blocked**, erreur React #418 hors Hero.

## Captures

| Fichier | Contexte |
|---|---|
| `hero-wariba-path-1440.png` | production, 1440 × 900 |
| `hero-wariba-path-390.png` | production, 390 × 844 |
| `hero-wariba-path-320.png` | production, Hero complet à 320 px |
| `hero-wariba-path-320-viewport.png` | production, 320 × 568 |
| `hero-wariba-path-1440-reduced-motion.png` | production, reduced motion |

## Commandes de vérification

```bash
npx -y -p node@24.18.0 -c "pnpm --filter @wariba/web typecheck"
npx -y -p node@24.18.0 -c "pnpm --filter @wariba/web build"
npx -y -p node@24.18.0 -c "pnpm --filter @wariba/web exec playwright test --config=/Users/rodrigueadebigni/wariba-platform/output/playwright/wariba-path/playwright.hero.config.ts"
```

Aucune suite DB, RLS, property, lifecycle, multi-browser ou certification n'a
été lancée.
