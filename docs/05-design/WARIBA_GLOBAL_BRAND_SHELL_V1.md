# WARIBA — Coque de marque globale v1

**Phase :** 3.4.5A
**Date :** 29 août 2026
**Portée :** la coque publique commune — tokens, primitives, en-tête, méga-menu, tiroir mobile, pied de page
**Hors portée :** le contenu des pages (3.4.5B–N), les assets 3D finaux, l'authentifié, WariX, Control

---

## 1. Ce que la coque décide, une fois pour toutes

Une coque de marque a une seule raison d'être : prendre les décisions ennuyeuses une fois, pour
qu'aucune des pages qui suivent n'ait à les réinventer.

Sans elle, la page d'accueil invente un rythme vertical, `/offres` en invente un autre, et à la
quatrième page le site a quatre systèmes d'espacement presque identiques — la façon la plus banale
dont un produit cesse d'avoir l'air d'un produit.

Ce que la coque possède :

| Domaine | Source unique |
|---|---|
| Canevas, surfaces, coutures, liserés | `:root` dans `apps/web/app/globals.css` |
| Cobalt de marque, halos, lumière ambiante | idem |
| Rôles typographiques | `.wariba-display` · `.wariba-section-title` · `.wariba-lead` · `.wariba-eyebrow` · `.wariba-figure` |
| Actions | `.wariba-cta-primary` · `.wariba-cta-secondary` · `.wariba-cta-tertiary` |
| Focus | `.wariba-focus-ring`, déclaré une fois |
| Rythme de section | `<PublicSection>` |
| Scènes | `<StrongColorSurface>` · `<DarkProductSurface>` · `<VisualCard>` |
| Icônes | `packages/ui/src/icons/shell-icons.tsx` |
| Navigation | `packages/ui/src/layouts/public-nav.ts` |

---

## 2. Tokens

### 2.1 L'échelle de matière — carbone, pas encre

**Noir d'abord, cobalt ensuite.** C'est la loi la plus importante du système.

La rampe `ink` est décalée vers le bleu de façon systématique — `ink-790` vaut R28 G35 B51, soit
vingt-trois points de bleu au-dessus du rouge. C'est juste là où elle vit : WariX et le Hub sont
navy-graphite par choix. Mais la coque publique en avait hérité, et le résultat se lisait *navy* —
ce qui annule discrètement l'accent. Du cobalt sur du noir bleuté, c'est un bleu parmi deux. Du
cobalt sur du vrai noir, c'est la seule couleur de l'écran.

```
--wariba-canvas-deep      carbon-980  #070708   le sol
--wariba-canvas-base      carbon-960  #0A0A0B   la page
--wariba-canvas-elevated  carbon-940  #0D0D0F   la chrome
--wariba-surface-1        carbon-900  #111214   un panneau
--wariba-surface-2        carbon-850  #151619   un puits interactif
--wariba-surface-3        carbon-800  #191A1E   ce puits, survolé
--wariba-surface-overlay                        verre, pour ce qui flotte
```

`carbon` porte un à cinq points de bleu : assez pour ne pas virer au gris plat, beaucoup trop peu
pour teinter une page. Le contraste entre niveaux vient de la **luminance**, pas de la teinte.

Test : masquez le logo, le CTA, les textes. La première réaction doit être « noir profond », pas
« bleu nuit ».

### 2.2 Le cobalt

```
--wariba-brand-300  cobalt-300  un lien
--wariba-brand-400  cobalt-400  parle sur fond sombre, focus
--wariba-brand-500  cobalt-500  remplit
--wariba-brand-600/700          la profondeur d'une surface pleine
--wariba-brand-wash             12 % — un champ à poser du contenu dessus
--wariba-brand-edge             42 % — une bordure porteuse de sens
```

**Le budget de saturation reste la règle :** une seule surface cobalt pleine par section. La
hiérarchie vient du plein contre le contour, jamais de la taille.

### 2.3 Lumière

Le sombre ne se sculpte pas à l'ombre portée — elle ne se voit pas. Il se sculpte au liseré.

```
--wariba-seam / --wariba-seam-strong    coutures mélangées, jamais un gris opaque
--wariba-inner-highlight                1px blanc à 6 % sur l'arête haute
--wariba-glow-primary / --wariba-glow-soft
--wariba-ambient-cobalt                 le champ ambiant, une fois par composition
```

`.wariba-ambient` pose ce champ **et** `position: relative`. Pour un élément déjà positionné,
utiliser `.wariba-ambient-field`, qui ne peint que la lumière — voir §6.2.

**La lumière est locale.** Le champ ambiant est un seul bloom de 40 rem à 20 %, ancré hors du coin
haut. Il valait auparavant deux radiales de 68 rem à 34 % et 30 % : un champ bleu de la taille de la
page déguisé en dégradé. Les halos appartiennent aux objets — derrière une plaque, sous un CTA,
dans un onglet actif — jamais à la page entière.

### 2.4 Texte sur sombre

```
--wariba-on-dark        ink-50   pas #FFF, qui vibre sur du quasi-noir
--wariba-on-dark-muted  ink-200
--wariba-on-dark-dim    ink-300  et non ink-500 : voir §6.1
```

---

## 3. Mouvement

Cinq catégories, nommées pour ce qu'elles portent plutôt que pour leur durée.

| Catégorie | Token | Emploi |
|---|---|---|
| `micro` | `--wariba-motion-micro` (120 ms) | survol, pression, onglet, lien |
| `state` | `--wariba-motion-state` (180 ms) | changement d'état, popover |
| `panel` | `--wariba-motion-panel` (240 ms) | méga-menu, tiroir |
| `enter` | `--wariba-motion-enter` (450 ms) | arrivée de section |
| `ambient` | `--wariba-motion-ambient` (9 s) | lumière lente, réflexion |

`prefers-reduced-motion: reduce` coupe les boucles, les translations et les animations de panneau.
Le panneau reste : le menu doit continuer à se comprendre, il arrive simplement au lieu de bouger.

---

## 4. Navigation publique

### 4.1 Les six destinations

Déclarées une fois dans `public-nav.ts`, consommées par l'en-tête, le tiroir et le pied de page.

| Libellé | Destination | Pourquoi celle-là |
|---|---|---|
| Parcours | méga-menu | ONE · FLEX · INSTANT + comparer + comment ça marche |
| WariX | `/warix` | — |
| Comment ça marche | `/programme` | — |
| Règles | `/aide/risque-regles` | il n'existe pas de route `/regles` publique |
| Payouts | `/aide/payouts` | il n'existe pas de route `/payouts` publique |
| Aide | `/aide` | — |

**Écart assumé.** Le brief propose `Règles` et `Payouts` en destinations de premier niveau et
interdit par ailleurs les liens morts. Les deux n'existent aujourd'hui que derrière
authentification (`/comptes/[id]/regles`, `/(platform)/payouts`). La réponse publique aux deux
questions est le centre d'aide, qui a une catégorie pour chacune et lit ses chiffres depuis la
politique publiée. Les libellés restent, les cibles sont réelles.

### 4.2 Le pied de page a quatre colonnes, pas cinq

Le brief propose une colonne `Société`. WARIBA n'a aujourd'hui aucune route d'entreprise publique,
et la phase interdit d'inventer des pages « à propos » ou « équipe » pour la remplir. Quatre
colonnes honnêtes se lisent comme de la maturité ; cinq dont une fabriquée se lisent comme un
gabarit.

### 4.3 Contrat d'interaction du méga-menu

- ouverture au clic **et** au survol avec intention (120 ms), fermeture avec grâce (180 ms) ;
- déclencheur = `<button aria-expanded aria-controls>`, jamais un `div` avec un `mouseenter` ;
- `Échap` ferme **et rend le focus au déclencheur** ;
- clic extérieur ferme ; un changement de route ferme.

### 4.4 Le tiroir mobile est une scène

Colonne en trois parties : en-tête fixe, milieu défilant, actions fixes. Piège de focus, `Échap`,
verrou de défilement, focus rendu au déclencheur. Le voile est retiré de l'arbre d'accessibilité
(§6.3).

---

## 5. Primitives pour les phases B–N

```tsx
<PublicSection tone="canvas|band|deep|ambient" space="tight|default|loose">
<SectionHeader eyebrow title lead align />
<StrongColorSurface tone="brand|deep" media />   // le champ de couleur saturé
<DarkProductSurface media flip />                // la surface où un produit se montre
<VisualCard variant="panel|accent|quiet" interactive />
```

Aucune n'encode de contenu. `StrongColorSurface tone="brand"` dépense le budget de saturation de la
page : au plus une par page.

### Contrat d'accroche visuelle

Chaque route livrée en B–N doit pouvoir répondre :

```
Route :
Accroche visuelle principale :
Sections majeures :
Élément fort par section :
Type de composition :
Adaptation mobile :
```

Une section sans réponse n'est pas finie.

---

## 6. Trois pièges rencontrés, et ce qu'ils coûtent

### 6.1 `ink-500` ne passe pas AA

`#555E6E` à 12 px mesure **2,66:1** sur un module et 3,0:1 sur le canevas. C'était la teinte de tous
les sur-titres et libellés discrets du système : la seule couleur utilisée pour « discret » était la
seule qu'un lecteur malvoyant ne pouvait pas lire. `--wariba-on-dark-dim` vaut `ink-300` (6,4:1).
Discret doit rester lisible, sinon c'est juste invisible.

### 6.2 Une classe non-layerée écrase Tailwind

`globals.css` n'est pas dans un `@layer`, alors que les utilitaires Tailwind le sont. Une règle
non-layerée **gagne** contre un utilitaire, quel que soit l'ordre du source.

`.wariba-ambient { position: relative }` a donc silencieusement transformé le tiroir mobile —
`absolute inset-0` dans un conteneur `fixed inset-0` — en élément `relative` : il est sorti de la
boîte à hauteur d'écran, a pris la hauteur de son contenu, et a poussé son action principale 19 px
sous le bas de l'écran. D'où `.wariba-ambient-field`, qui ne peint que la lumière.

**Toute classe de ce fichier qui ressemble à un utilitaire porte le même risque.**

### 6.3 Deux contrôles, un seul nom

Le voile du tiroir était un `<button aria-label="Fermer le menu">`, exactement comme la croix. Le
panneau annonçait donc deux contrôles de nom identique. Le voile est maintenant `aria-hidden` et
hors du parcours de tabulation : le clic extérieur ferme toujours, et les chemins accessibles —
`Échap` et la croix — sont sans ambiguïté.

---

## 6bis. Coexistence des surfaces fixes — 3.4.5A.1 §19

Deux systèmes fixes qui s'ignorent finissent l'un sur l'autre. Ici, le perdant était la divulgation
de trading simulé : la barre d'achat mobile s'affichait par-dessus.

La barre appartient au commerce, le pied de page à la coque : aucun des deux ne peut porter la
correction. La coque, si. `FixedUiCoordinator` publie la position du lecteur sur l'élément racine :

```css
[data-wariba-footer='visible'] .commerce-mobile-paybar { … }
```

Chaque surface flottante décide alors de son comportement. La règle retenue : **la barre se retire
quand le pied de page arrive.** Des trois issues possibles — masquer la barre, rembourrer le pied de
page, réduire la barre — seule la première améliore aussi la page : une barre d'achat sert pendant
qu'on choisit, et arrivé à la bande légale on a fini de choisir.

Contrat de test :

```
CONTENT_OCCLUDED_BY_FIXED_UI = 0
FOOTER_OCCLUDED_BY_STICKY_COMMERCE = 0
```

`overflow: none` ne suffit pas : le tiroir passait ce test tout en cachant la carte INSTANT sous son
dock. Le critère est plus fort — défilement en fin de course, aucun élément ne chevauche l'arête
haute du dock.

---

## 6ter. La loi de langue

> **Si une phrase ressemble à du jargon produit, à une traduction de l'anglais, ou à quelque chose
> qu'un trader francophone ne dirait jamais, elle ne sort pas en production.**

Cinq tests, sur chaque phrase importante :

1. un francophone dirait-il réellement cette phrase ?
2. est-ce compris en moins de trois secondes ?
3. vend-elle un bénéfice, ou récite-t-elle la structure du produit ?
4. semble-t-elle traduite ?
5. peut-on retirer 20 à 30 % des mots sans perdre le sens ?

Ce que cette passe a corrigé :

| Avant | Après | Pourquoi |
|---|---|---|
| `15 offres · trois parcours · cinq tailles` | `Trois parcours · cinq tailles de compte` | Personne ne cherche une entreprise à quinze SKU |
| `Un paiement, une preuve` | `Une évaluation. Une seule étape.` | Une formule n'informe pas |
| `Entrez léger, payez après` | `Commencez avec moins.` | Ce n'est pas du français prononcé |
| `Performance immédiate` | `Pas d'évaluation.` | Se lisait comme une promesse de rendement |
| `Le bon parcours commence par une règle comprise.` | `Choisissez comment vous voulez commencer.` | Un slogan qui a besoin d'être expliqué a échoué |
| `Comparer les 15 offres` | `Comparer les parcours` | Le nombre de références n'est pas une proposition de valeur |

---

## 6quater. Le filtre d'exactitude

La loi de langue a quatre filtres, pas trois. Aux tests de naturalité, de clarté et de marketing
s'ajoute celui qui a manqué en A.1 :

> **Est-ce rigoureusement vrai pour ONE, FLEX *et* INSTANT ?**

Deux phrases avaient passé les trois premiers filtres et échouaient au quatrième : « les trois
mènent au même compte Performance, ce qui change c'est quand vous payez » et « les règles sont les
mêmes pour toutes ». Sur une taille 10K, cinq des six règles diffèrent — objectif 8/4/aucun,
quotidien 3/3/2, perte maximale 8/6/5, meilleure journée 35/35/30, réserve 2/3/3, exposition
3/3/2×.

Une phrase élégante et fausse est pire qu'une phrase plate : le configurateur la dément deux clics
plus loin, et c'est la crédibilité de tout le reste qui part avec.

**Toute phrase qui généralise une règle produit est interdite tant qu'elle n'a pas été vérifiée
contre les trois familles.**

### Note pour 3.4.5E

Le mini-FLEX du méga-menu reste abstrait : sans son libellé, la courbe ne dit pas encore
« paiement initial → réussite → activation ». Le véritable **FLEX Bridge** devra représenter cette
séquence explicitement.

---

## 7. Documents liés

- [`WARIBA_COLOR_AND_SEMANTIC_SYSTEM.md`](./WARIBA_COLOR_AND_SEMANTIC_SYSTEM.md) — familles et sens sémantiques
- [`WARIBA_MOTION_SYSTEM.md`](./WARIBA_MOTION_SYSTEM.md) — durées et courbes canoniques
- [`WARIBA_Design_System_v1.0.md`](./WARIBA_Design_System_v1.0.md) — le système de composants
- [`../04-ux/references/phase-3-4-5R/README.md`](../04-ux/references/phase-3-4-5R/README.md) — l'analyse des références concurrentes
