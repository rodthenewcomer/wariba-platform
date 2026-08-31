# Preuves — Phase 3.4.5B.1 · Section 01, Héros

**Date :** 29 août 2026
**Portée :** section 01 uniquement · 6 captures · 0 défaut

---

## Le copy, testé ligne par ligne

### Titre — conservé tel quel

> **Tradez avec des règles claires.**
> **Progressez sans perdre le fil.**

Les sept tests passent. « Perdre le fil » est idiomatique et intraduisible mot à mot depuis l'anglais, ce qui est précisément le signe qu'il a été pensé en français.

Ce qu'il remplace : « Tradez. Progressez. Passez sur Performance. » — trois verbes dont le dernier n'est vrai que pour deux parcours sur trois. INSTANT ne « passe » pas après une évaluation, puisqu'il n'en a pas. Une promesse fausse pour un tiers du catalogue n'a rien à faire dans un `H1`.

### Supporting copy — resserré

| | |
|---|---|
| **Avant** | ONE, FLEX ou INSTANT : choisissez votre façon de commencer, suivez vos limites et voyez clairement ce qu'il vous reste à accomplir. |
| **Après** | ONE, FLEX ou INSTANT : choisissez votre façon de commencer. Vos limites et votre progression restent visibles en permanence. |

**Motif : test 6, compression.** Trois propositions enchaînées, 22 mots, dont deux qui disent la même chose sous deux angles. La version courte en fait 18 et se lit d'un souffle.

### CTA

- **Principal** — `Choisir mon parcours` → `/offres`
- **Secondaire** — `Voir comment ça marche` → `/programme`

`Découvrir WariX` est retiré : WariX a sa propre section plus bas, avec son propre WOW produit.

### Divulgation

> Trading entièrement simulé. Aucun dépôt ni capital réel ne vous est confié.

Sous les CTA, séparée du titre. Une seconde ligne dit que les achats ne sont pas encore ouverts.

---

## Le WARIBA Market Field

Sept couches, toutes bon marché : deux dégradés CSS, un halo radial, trois tracés SVG, seize nœuds.

| Couche | Implémentation | Budget |
|---|---|---|
| 1 · Canevas | carbone, peint par la section | — |
| 2 · Grille | deux `repeating-linear-gradient`, 3,5 %, masqué en horizon | 1 nœud |
| 3 · Trajectoires | 3 `path` SVG, dégradés cobalt, aucune échelle ni axe | 3 nœuds |
| 4 · Signaux | 4 points en `animateMotion` sur les tracés | 4 nœuds |
| 5 · Pulsations | 6 micro-ticks, 2 sémantiques, 4 cobalt | 6 nœuds |
| 6 · Lumière | un halo, à droite de la colonne de texte | 1 nœud |
| 7 · Profondeur | les tracés s'affinent en s'éloignant | — |

**Ce qui n'y est pas :** particules, matrix, crypto, globe, chandeliers, nébuleuse, lens flare, dégradé arc-en-ciel. Aucune librairie ajoutée. Aucun Lottie. Aucun Spline. Aucun WebGL.

**Boucle :** 13 à 21 s selon le signal — trois durées premières entre elles, donc le point de boucle ne se répète jamais à l'identique.

**Zone de calme :** le champ est masqué sous le tiers gauche. Le pixel le plus actif de la page n'est jamais derrière une lettre fine.

**Sans JavaScript :** la scène statique est rendue côté serveur — grille, tracés, halo. Seuls les éléments mobiles s'ajoutent après montage. Trois issues correctes depuis un seul chemin de code : pas de JS → héros complet ; mouvement réduit → même chose ; sinon → la boucle.

---

## Contrôles

| Contrôle | Résultat |
|---|---|
| Débordement — 320 / 390 / 430 / 768 / 1440 | **0 / 5** |
| Mouvement réduit — `data-animated` | **false**, 0 signal |
| Anneau de focus sur le CTA | **2 px** |
| Erreur JavaScript | **0** |
| `axe` wcag2a+aa | **0 critique, 0 sérieux** |
| Terminal ou tableau de bord dans le héros | **non** |

`home-3-4-5b.spec.ts` 3 tests · `shell-3-4-5a.spec.ts` 4 tests — 7/7.

---

## Red team — ce qui a été trouvé, et corrigé

**Mobile.** Le titre cassait en « Progressez / sans / perdre le fil. » à 320 — une ligne portant une préposition seule. `text-wrap: balance` égalise les longueurs, ce qui est juste pour un titre de section et faux sur une mesure étroite. Passé en `pretty`.

**Technique — et c'est le plus sérieux.** Le CTA du header apparaissait à 320 alors qu'il est marqué `hidden sm:inline-flex`. Cause : cette feuille de style n'est pas dans un `@layer`, donc `.wariba-cta-primary { display: inline-flex }` bat l'utilitaire `hidden` quel que soit l'ordre du source. C'est **le même piège que 3.4.5A.1 §6.2**, où `.wariba-ambient` avait silencieusement rendu le tiroir `relative`. Une note ne suffisait pas : les classes de composant sont désormais dans `@layer components`.

**CRO.** Le héros ne montre plus de produit, donc rien ne prouve encore que WARIBA existe. C'est assumé : la preuve arrive à la section suivante. Si le taux de scroll s'effondre, c'est là qu'il faudra regarder, pas ici.

**Concurrence.** À côté de FTMO ou FundedNext, WARIBA a moins de densité commerciale au-dessus de la ligne de flottaison — pas de bandeau de chiffres, pas de logos. C'est délibéré : WARIBA n'a pas encore ces chiffres et les inventer coûterait plus que le gain.

---

## Index

| Fichier | Largeur |
|---|---|
| `hero-1440.png` | 1440 |
| `hero-768.png` | 768 |
| `hero-430.png` | 430 |
| `hero-390.png` | 390 |
| `hero-320.png` | 320 |
| `hero-1440-reduced-motion.png` | 1440, `prefers-reduced-motion: reduce` |
