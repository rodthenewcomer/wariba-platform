# Preuves — Phase 3.4.5R · Refonte globale de l'expérience

**Date de capture :** 29 août 2026
**Build :** production (`pnpm build && pnpm start`), pas le serveur de développement
**Captures :** 26 · pleine page · 8 routes × 1440 / 390 / 320 px, plus deux passes en mouvement réduit

---

## Contrôles automatiques au moment de la capture

Chaque capture a été vérifiée avant d'être écrite :

| Contrôle | Résultat |
|---|---|
| Débordement horizontal (`scrollWidth > innerWidth`) | **0 / 26** |
| Squelette visible (`[data-skeleton]` présent au moment du tir) | **0 / 26** |

Le second contrôle existe parce que le harnais a déjà photographié deux fois un
état de chargement en le prenant pour l'écran final. L'attribut `data-skeleton`
est inerte au rendu et invisible aux technologies d'assistance ; il ne sert
qu'à rendre cette confusion impossible.

---

## Index

| # | Fichier | Route | Largeur |
|---|---|---|---|
| 01–03 | `01-accueil-1440` · `02-accueil-390` · `03-accueil-320` | `/` | 1440 · 390 · 320 |
| 04–06 | `04-offres-*` | `/offres` | 1440 · 390 · 320 |
| 07–09 | `07-programme-*` | `/programme` | 1440 · 390 · 320 |
| 10–12 | `10-one-*` | `/challenges/one` | 1440 · 390 · 320 |
| 13–15 | `13-flex-*` | `/challenges/flex` | 1440 · 390 · 320 |
| 16–18 | `16-instant-*` | `/challenges/instant` | 1440 · 390 · 320 |
| 19–21 | `19-aide-*` | `/aide` | 1440 · 390 · 320 |
| 22–24 | `22-login-*` | `/login` | 1440 · 390 · 320 |
| 25 | `25-accueil-reduced-motion` | `/` | 1440, `prefers-reduced-motion: reduce` |
| 26 | `26-offres-reduced-motion` | `/offres` | 1440, `prefers-reduced-motion: reduce` |

---

## Ce que ces captures doivent démontrer

**Sombre par défaut.** Aucune route majeure à dominante beige ou blanc SaaS.
Les tokens `bone-*` sont sortis du canevas public.

**Budget de saturation tenu.** Une seule surface cobalt pleine par section. La
hiérarchie vient du remplissage contre le contour, pas de la taille — visible
sur la grille des trois familles de l'accueil et sur le rail de prix du
configurateur.

**Aucune section morte.** Chaque section majeure porte une accroche : objet
signature, scène de règle plein cadre, corridor de risque à deux bords, échelle
de partage, démonstration produit animée, ou visuel éditorial.

**Mobile natif, pas comprimé.** À 390 et 320 px la composition change — le rail
de résumé devient une barre d'achat collante, les colonnes deviennent des
piles — au lieu d'être mise à l'échelle.

**Mouvement réduit préservé.** Captures 25 et 26 : rien ne bouge, rien ne
manque. Aucune information ne dépend d'une animation pour être perçue.

---

## Ce que ces captures ne couvrent pas

Le Hub, le tunnel d'achat authentifié, WariX et Control conservent leur design
actuel : seule la propagation des couleurs y a été appliquée. Ils feront l'objet
d'une passe séparée et ne sont donc pas photographiés ici.
