# Preuves — Phase 3.4.5A · Coque de marque globale

**Date de capture :** 29 août 2026
**Portée :** en-tête, méga-menu `Parcours`, tiroir mobile, pied de page
**Captures :** 9

---

## Contrôles au moment de la capture

| Contrôle | Résultat |
|---|---|
| Débordement horizontal à 1440 / 390 / 320 px | **0 / 3** |
| `axe` wcag2a+aa sur la coque desktop et le pied de page | **0 critique, 0 sérieux** |
| Méga-menu : `Échap` ferme et rend le focus au déclencheur | passe |
| Tiroir : focus au bouton de fermeture, `Échap`, focus rendu | passe |
| Tiroir 320 px : action principale entièrement à l'écran | passe |
| Chaque destination du pied de page répond < 400 | passe |

Vérifiés par `apps/web/tests/e2e/shell-3-4-5a.spec.ts` (3 tests, tous verts).

---

## Index

| # | Fichier | Ce qu'il montre |
|---|---|---|
| 01 | `01-header-1440.png` | En-tête au repos, transparent sur le héros |
| 02 | `02-megamenu-1440.png` | `Parcours` ouvert : trois mini-identités produit |
| 03 | `03-footer-1440.png` | Pied de page : proposition, colonnes, scène de marque, divulgation |
| 04 | `04-header-390.png` | En-tête mobile |
| 05 | `05-drawer-390.png` | Tiroir : cartes famille, destinations, actions fixes |
| 06 | `06-header-320.png` | En-tête à la largeur minimale supportée |
| 07 | `07-drawer-320.png` | Tiroir à 320 px — l'action principale reste à l'écran |
| 08 | `08-footer-390.png` | Pied de page mobile |
| 09 | `09-megamenu-reduced-motion-1440.png` | Méga-menu en `prefers-reduced-motion` |

---

## Ce que ces captures doivent démontrer

**Sombre et cobalt.** Floutée, la coque reste reconnaissable par sa couleur. Aucune dominante
beige, aucun bandeau blanc de SaaS.

**Le méga-menu est une expérience, pas une liste.** ONE, FLEX et INSTANT ont chacun un glyphe, une
accroche de quatre mots et une phrase — trois identités distinctes à l'intérieur d'une seule marque.

**Le mobile est conçu, pas comprimé.** Le tiroir est plein écran avec les mêmes cartes famille, des
rangées de 56 px et l'action principale ancrée dans la zone du pouce.

**Le pied de page est une scène.** Le mot-symbole occupe une bande réelle sur un horizon cobalt, et
la divulgation de trading simulé est traitée comme du contenu — sa propre bande, son propre titre,
du corps de texte — et non en 10 px gris tout en bas.

**Rien d'inventé.** Aucune récompense, aucune note d'avis, aucun compteur, aucun logo de prestataire.
Les 13 destinations de la navigation existent et répondent.

---

## Ce que ces captures ne couvrent pas

Le contenu des pages appartient aux phases 3.4.5B–N. Les objets 3D finaux (Account Token complet,
ONE Target Reactor, FLEX Bridge, INSTANT Portal) ne sont pas construits : le méga-menu et le tiroir
portent des glyphes de ~600 octets, délibérément, pour ne pas mettre un asset cinématique sur le
chemin critique de chaque route publique.
