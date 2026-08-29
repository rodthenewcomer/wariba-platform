# Preuves — Phase 3.4.5A.1 · Élévation visuelle et français natif

**Date :** 29 août 2026
**Portée :** canevas neutre, identités produit du méga-menu, signature de l'en-tête, scène du pied de page, occlusion mobile, coexistence des UI fixes, copy
**Captures :** 9

---

## Contrôles au moment de la capture

| Contrôle | Résultat |
|---|---|
| Débordement horizontal 1440 / 390 / 320 | **0 / 3** |
| Barre d'achat au-dessus du pied de page | **non** |
| Élément du tiroir passant sous le dock, à 320 comme à 390 | **0** |
| `axe` wcag2a+aa — méga-menu et pied de page | **0 critique, 0 sérieux** |
| Formulations traduites / jargon catalogue côté client | **0** |

Vérifiés par `apps/web/tests/e2e/shell-3-4-5a.spec.ts` — 4 tests, tous verts.

---

## Le canevas

| | Avant (`ink`) | Après (`carbon`) |
|---|---|---|
| Canevas profond | `#05070C` — écart bleu +7 | `#070708` — **+1** |
| Canevas de page | `#080B13` — +11 | `#0A0A0B` — **+1** |
| Panneau | `#141A27` — +19 | `#111214` — **+3** |
| Puits | `#1C2333` — +23 | `#151619` — **+4** |

La rampe `ink` reste intacte : WariX et le Hub sont navy-graphite par choix et sont hors périmètre. Seule la coque publique bascule.

---

## Index

| # | Fichier | Ce qu'il montre |
|---|---|---|
| 01 | `01-header-1440.png` | En-tête sur canevas neutre, CTA avec profondeur |
| 02 | `02-megamenu-1440.png` | Trois scènes produit + scène de convergence |
| 03 | `03-footer-1440.png` | Grille de données, horizon retravaillé, objet lointain |
| 04–05 | `04-header-390` · `05-drawer-390` | Mobile |
| 06–07 | `06-header-320` · `07-drawer-320` | Largeur minimale, dock dégagé |
| 08 | `08-footer-390-sans-collision.png` | La barre d'achat s'est retirée : la zone légale est lisible |
| 09 | `09-megamenu-reduced-motion-1440.png` | Méga-menu en `prefers-reduced-motion` |

---

## Ce que ces captures doivent démontrer

**Noir d'abord, cobalt ensuite.** Masquez le CTA : le fond reste noir, pas bleu nuit. Le cobalt n'est plus dilué dans le canevas, il est l'événement — état actif, couture de l'en-tête, scènes produit, horizon du pied de page.

**Les trois familles ont un visage.** Une cible qui se referme sur son centre, un pont dont la travée est éclairée, une ouverture déjà allumée. Reconnaissables sans lire un mot, et toutes trois sur l'échelle cobalt.

**Le quatrième bloc n'est plus un rectangle de texte.** Trois trajets convergent vers un seul point nommé « Performance ». L'argument est dit par la forme.

**Le français ne sonne plus traduit.** « Entrez léger », « Performance immédiate », « Un paiement, une preuve » et « 15 offres · trois parcours · cinq tailles » ont disparu de la surface client.

**Rien n'est occulté.** Le tiroir dégage son dock à 320 px, et la barre d'achat se retire quand le pied de page arrive.

---

## Ce que ces captures ne couvrent pas

Le contenu des pages appartient à 3.4.5B–N. Les objets cinématiques — Account Token complet, ONE Target Reactor, FLEX Bridge, INSTANT Portal — ne sont toujours pas construits : le méga-menu porte des scènes d'environ 1,5 Ko chacune, délibérément, parce que la coque se charge sur chaque route publique.
