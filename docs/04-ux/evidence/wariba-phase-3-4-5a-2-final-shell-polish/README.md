# Preuves — Phase 3.4.5A.2 · Finition finale de la coque

**Date :** 29 août 2026
**Portée :** exactitude du copy, français naturel, densité du méga-menu
**Captures :** 5 · aucun défaut

---

## Revue de copy — chaque phrase modifiée

### 1. Bloc de comparaison du méga-menu

**Avant** — « Les trois mènent au même compte Performance. Ce qui change, c’est quand vous payez. »
**Après** — « Comparez les parcours et choisissez celui qui vous convient. »
**Motif** — **exactitude**. Sur une taille 10K, cinq des six règles diffèrent :

| | ONE | FLEX | INSTANT |
|---|---|---|---|
| Objectif | 8 % | 4 % | aucun |
| Limite quotidienne | 3 % | 3 % | **2 %** |
| Perte maximale | 8 % | **6 %** | **5 %** |
| Meilleure journée | 35 % | 35 % | **30 %** |
| Réserve | 2 % | **3 %** | **3 %** |
| Exposition | 3× | 3× | **2×** |

Le moment du paiement n’est qu’une différence parmi plusieurs. Une généralisation fausse dans un menu est une promesse que le configurateur dément deux clics plus loin.

### 2. Pré-CTA du pied de page

**Avant** — « Choisissez comment vous voulez commencer. / Trois façons d’accéder à un compte Performance. Les règles sont les mêmes pour toutes. »
**Après** — « Quel parcours vous convient ? / Comparez ONE, FLEX et INSTANT avant de commencer. »
**Motif** — **exactitude**. Même généralisation fausse que ci-dessus.

### 3. FLEX — méga-menu et tiroir

**Avant** — « Commencez avec moins. / Payez le reste seulement si vous réussissez. »
**Après** — « Payez moins au départ. / Le reste seulement si vous réussissez. »
**Motif** — **clarté**. « Commencez avec moins » se lit aussi bien comme « un compte plus petit », « moins de capital » ou « moins de risque ». La proposition est financière et rien d’autre : le premier paiement est plus faible.

### 4. FLEX — page produit

**Avant** — « Commencez avec moins. »
**Après** — « Commencez maintenant. Payez le reste après votre réussite. »
**Motif** — **marketing**. Une page a la place de dire la séquence entière ; un menu ne l’a pas. Dans le menu, la précision gagne ; sur la page, c’est l’enchaînement.

### 5. INSTANT

**Avant** — « Vous démarrez directement sur Performance. »
**Après** — « Commencez directement sur Performance. »
**Motif** — **naturalité**. « Commencer » est le verbe du reste de la coque ; « démarrer » y était seul.

---

## Densité du méga-menu

| | avant | après |
|---|---|---|
| Hauteur du panneau | ~560 px | **363 px** |
| Hauteur de carte | 460 px | **314 px** |
| Écart carte / bloc de comparaison | ~150 px | **0 px** |
| Part de la scène dans la carte | 23 % | **38 %** |

Le vide n’a pas été rempli de texte : la hauteur a été réduite et les scènes agrandies. Le panneau se lit en deux secondes.

---

## Contrôles

| Contrôle | Résultat |
|---|---|
| Débordement horizontal 1440 / 390 / 320 | **0 / 3** |
| Occlusion par le dock du tiroir, 320 et 390 | **0** |
| Barre d’achat au-dessus du pied de page | **non** |
| `axe` wcag2a+aa — méga-menu, pied de page | **0 critique, 0 sérieux** |
| Généralisation produit fausse côté client | **0** |

`apps/web/tests/e2e/shell-3-4-5a.spec.ts` — 4 tests, tous verts.

---

## Index

| # | Fichier | Ce qu’il montre |
|---|---|---|
| 01 | `01-megamenu-1440.png` | Méga-menu resserré, quatre blocs à hauteur égale |
| 02 | `02-footer-1440.png` | Pré-CTA corrigé, scène de marque |
| 03 | `03-drawer-390.png` | Tiroir, copy FLEX corrigée |
| 04 | `04-footer-390.png` | Zone légale lisible, barre d’achat retirée |
| 05 | `05-drawer-320.png` | Largeur minimale, dock dégagé |

---

## Note pour les phases futures

Le mini-FLEX reste abstrait : sans son libellé, la courbe ne dit pas encore « paiement initial → réussite → activation ». Ce n’est pas bloquant ici — c’est une mini-identité, pas l’asset. Le véritable **FLEX Bridge**, construit en 3.4.5E, devra représenter la séquence explicitement.
