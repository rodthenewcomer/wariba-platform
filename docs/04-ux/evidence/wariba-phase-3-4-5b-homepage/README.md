# Preuves — Phase 3.4.5B · Page d’accueil

**Date :** 29 août 2026
**Captures :** 22 · 14 sections en 1440, cinq repères en 390, deux en 320, une passe en mouvement réduit
**Défauts au moment de la capture :** 0

---

## Le rythme — quatorze sections, aucune répétition

| # | Section | Composition | Accroche visuelle |
|---|---|---|---|
| 1 | Héros | titre géant + maquette | Tableau de bord animé, coque fixe |
| 2 | ONE | texte gauche / objet droite | **ONE Target Reactor** |
| 2 | INSTANT | objet gauche / texte droite | **INSTANT Portal** |
| 3 | FLEX | champ cobalt plein cadre | **FLEX Bridge** — la séquence complète |
| 4 | Configurateur | objet gauche / choix droite | **Account Token** qui change |
| 5 | Le parcours | quatre vignettes en grille | Quatre mini-scènes |
| 6 | Perte maximale | texte gauche / graphique droite | **Courbe et plancher** |
| 7 | Les chiffres | tuile cobalt + deux cartes | **Journées Performance** animées |
| 8 | WariX | surface produit sombre | **Maquette du terminal** |
| 9 | Suivi | maquette gauche / texte droite | Tableau de bord complet |
| 10 | Partage | texte gauche / échelle droite | **Payout Ladder** |
| 11 | Confiance | grille de six | Six faits vérifiables |
| 12 | Éditorial | photographie plein cadre | Rupture humaine |
| 13 | FAQ | objet gauche / accordéon droite | **Performance Core** |
| 14 | Clôture | scène centrée | Surface profonde et CTA |

Deux sections consécutives ne partagent jamais la même composition. Le champ cobalt plein (§3) est utilisé **une seule fois** sur la page — c'est le budget de saturation.

---

## Contrôles

| Contrôle | Résultat |
|---|---|
| Débordement horizontal — 320 / 390 / 430 / 768 / 1440 | **0 / 5** |
| Squelette visible dans une capture | **0** |
| Erreur JavaScript en page | **0** |
| `axe` wcag2a+aa sur la page complète | **0 critique, 0 sérieux** |
| Généralisation de règle entre ONE, FLEX et INSTANT | **0** |
| Langage catalogue en position marketing | **0** |

`apps/web/tests/e2e/home-3-4-5b.spec.ts` — 3 tests. `shell-3-4-5a.spec.ts` — 4 tests, aucun régressé.

---

## Trois défauts trouvés et corrigés pendant la passe

**`Reveal` poussait la page hors de l'écran.** Enveloppant presque toujours un élément de grille, il héritait de `min-width: auto` et refusait de rétrécir : la maquette du héros dépassait de 4 px à 390 comme à 320. `min-w-0` est devenu son défaut — la correction vaut pour toutes les pages à venir.

**La plaque de compte ne rentrait pas à 320.** 254 px fixes plus les gouttières et le rembourrage du panneau dépassent un écran de 320. `AccountToken` accepte désormais une largeur fluide.

**`ink-500` est revenu.** Sur l'état « en construction » du versement : 2,4:1. La même teinte déjà écartée en 3.4.5A.1 — elle réapparaît partout où un composant est écrit sans y penser.

---

## Ce que la page ne fait pas

Aucune récompense, aucun avis, aucun compteur de traders, aucun montant versé, aucun témoignage. WARIBA est jeune : la section « Pas de promesse. Des règles. » remplace la preuve sociale par six faits vérifiables contre le back-end.

Tous les chiffres — objectif, limites, réserve, barème, prix, total FLEX — viennent du catalogue canonique. Rien n'est calculé sur cette page.

Les objets sont des approximations premium en SVG, pas les assets 3D définitifs : `OneTargetReactor`, `FlexBridge`, `InstantPortal`, `PerformanceCore` et `AccountToken` sont chacun dans leur fichier, remplaçables sans toucher à la page.
