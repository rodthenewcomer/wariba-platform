# Références visuelles — Phase 3.4.5R

**Date de collecte :** 22 → 26 août 2026
**Nombre de références :** 54
**Format :** WebP, largeur plafonnée à 1600 px, qualité 82
**Statut :** matériel de travail interne

---

## À quoi sert ce dossier

Ce sont des captures de produits concurrents. Elles servent à fixer un **niveau
d'exigence**, pas un modèle à recopier.

La règle est simple et elle n'est pas négociable :

> On reprend des **mécaniques** — une manière de hiérarchiser, d'animer, de faire
> respirer une page. On ne reprend jamais une **identité** — ni une couleur
> signature, ni une mise en page reconnaissable, ni un texte, ni un objet 3D.

Concrètement : le vert acide de ForTraders, le violet de FundedNext, le bleu de
FTMO, l'or de Topstep appartiennent à ces marques. WARIBA reste cobalt. Ce qu'on
leur emprunte, c'est la **discipline** avec laquelle ils utilisent une couleur
unique sur un fond quasi noir.

Ces fichiers ne sont pas redistribués, ne sont pas servis par l'application, et
ne sortent pas de `docs/`.

---

## Les dix leçons à transposer

### 1. Une seule couleur sature, tout le reste est graphite

**Références :** `01`, `11`, `34`, `35`, `36`, `47`

Sur la grille de KPI de ForTraders (`01`), six tuiles cohabitent. **Une seule**
est remplie de la couleur d'accent : « Total P&L ». Les cinq autres sont des
cartes sombres où l'accent ne teinte que la valeur chiffrée ou l'arc d'un
donut.

C'est ça, le mécanisme : la hiérarchie ne vient pas de la taille des cartes,
elle vient du **remplissage contre le contour**. Une tuile pleine dit « c'est
ici qu'il faut regarder ». Une tuile sombre avec un chiffre coloré dit « ceci
est un chiffre secondaire, il est vivant mais il attend ». Quatre tuiles pleines
côte à côte, et le mécanisme est mort.

La couleur d'accent occupe entre 5 % et 8 % de la surface d'un écran. Elle porte
100 % de la hiérarchie.

**Pour WARIBA :** une seule surface cobalt pleine par section. Le reste du
cobalt vit dans les chiffres, les arcs, les liserés et les états sélectionnés.

---

### 2. Une règle peut occuper un écran entier

**Références :** `34`, `04`

`34` est la meilleure image du lot. ForTraders consacre une **section entière**
à une seule règle : un pavé vert acide plein largeur, du texte noir dessus,
« RULE 1 OF 1 / Maximum Drawdown / Stay above the line. The rest is your call. »,
et une courbe tracée à main levée qui monte vers un point noir. Puis, en
dessous, quatre cartes sombres barrées d'une croix rouge : « Consistency rule »,
« Daily drawdown », « Minimum profitable days » — les règles que *les autres*
imposent et qu'eux n'imposent pas.

Une règle n'est pas une ligne de tableau. C'est une **scène**.

En mobile (`04`), la même idée devient une pile de cartes : petite étiquette en
capitales (`PROFIT TARGET`), valeur géante (`2%`), deux lignes de prose. Et une
carte de la pile — celle intitulée `TIME LIMIT / NONE` — casse le rythme avec
une photographie de planète en fond. Une carte sur quatre rompt le motif : c'est
suffisant pour que la pile ne soit pas une liste.

**Pour WARIBA :** Perte maximale, Limite quotidienne, Meilleure journée et
Réserve de sécurité méritent chacune une scène. Pas quatre lignes d'un tableau.

---

### 3. Un objet produit transforme une carte de prix en objet désirable

**Références :** `05`, `12`, `16`

Les plaques métalliques `25K`, `50K`, `100K`, `PAY AFTER PASS` de ForTraders.
Détail de fabrication, parce que c'est là que tout se joue :

- un chanfrein chromé sur les quatre côtés, plus lumineux en haut à gauche ;
- un **liseré spéculaire net sur l'arête basse**, comme une réflexion de studio ;
- un intérieur presque noir, très légèrement dégradé ;
- le chiffre en **contour** seulement, pas en plein — c'est ce qui empêche
  l'objet de ressembler à un badge ;
- le logo posé en bas, petit, en aplat.

Sans cet objet, la carte de prix `05` serait un titre, un prix, trois puces et
un bouton. Avec, elle devient une fiche produit.

**Pour WARIBA :** c'est le brief exact du `WaribaAccountToken`. Titane sombre,
liseré cobalt, chiffre en contour, réflexion basse. Cinq variantes : 5K, 10K,
25K, 50K, 100K.

---

### 4. Le comparatif d'offres est un composant, pas un tableau

**Références :** `35`, `38`, `42`, `45`, `47`, `06`

Le sélecteur de plans de ForTraders est la pièce la plus travaillée de leur
site, et c'est logique : c'est là que la décision d'achat se prend.

Anatomie desktop :

- **Rangée de marchés** en haut (Forex / Crypto / Futures) en pastilles, plus un
  bouton d'aide « Help me choose » aligné à droite ;
- **Rangée de familles** : cinq cartes, chacune avec son nom, un badge éventuel
  (`New`, `Popular`, `⚡`) et **deux micro-arguments cochés** — pas un
  paragraphe, deux lignes ;
- la carte sélectionnée reçoit un **contour d'accent + un voile d'accent très
  faible**, jamais un remplissage plein ;
- en dessous, **deux colonnes de phases** (`1 Evaluation` → `2 Master`) séparées
  par une **flèche circulaire lumineuse** posée sur la ligne de séparation ;
- chaque ligne de spécification = libellé + icône d'info à gauche, **valeur en
  pastille** à droite ;
- certaines lignes contiennent un **micro-sélecteur** dans la pastille
  (`Trailing | Static`) — la valeur est configurable sans quitter la ligne ;
- **rail de droite** : nom du plan, tailles de compte en pastilles, code promo,
  prix barré + prix géant, CTA plein, et deux garanties en petit dessous ;
- un `Show more / Show less` centré qui déplie les lignes secondaires.

En mobile (`06`), ce même comparatif devient un tableau à trois colonnes où la
colonne du milieu — la sienne — est surélevée d'un cran de gris et porte un
badge `LOWER RISK`. Chaque cellule a deux niveaux : la valeur en gras, la
précision en gris dessous.

**Pour WARIBA :** ONE / FLEX / INSTANT sont exactement cette structure.
FLEX y gagne particulièrement — « aujourd'hui » et « à l'activation » sont deux
colonnes naturelles.

---

### 5. Un tableau de bord se lit en quatre niveaux de surface

**Références :** `14`, `15`, `22`, `23`, `26`, `29`, `33`, `40`, `51`

Ce qui distingue un tableau de bord fini d'une page avec des bordures, c'est
qu'on distingue **quatre niveaux** au premier coup d'œil :

1. le fond d'application (le plus sombre) ;
2. la chrome — rail latéral et barre haute — un cran au-dessus ;
3. les modules posés sur le fond, deux crans au-dessus ;
4. les puits interactifs à l'intérieur des modules — champs, lignes, segments.

Tradeify (`14`) le fait avec quatre gris. Lucid (`15`) avec quatre gris et un
vert. Funded Futures (`22`) avec un dégradé sarcelle très sombre. Aucun ne pose
un module et le fond au même niveau.

Détails à retenir carte par carte :

- **Tradeify (`14`)** — la carte de compte : titre, pastille d'état `Active`,
  date de dernier trade, et **identifiant de compte aligné à droite en
  monospace**. En dessous, quatre colonnes de métriques séparées par un filet
  vertical fin. Un **mini-anneau radial** pour « Minimum Profit Required ». Un
  point rouge devant la valeur qui pose problème. `View details` en bouton
  fantôme aligné à droite. Rien ne flotte, tout est aligné sur une grille.
- **Lucid (`15`)** — la même carte, avec en plus une **grappe de badges**
  (`EVAL`, `EOD DRAWDOWN`, `NO DLL`) et les logos des plateformes disponibles.
  Surtout : une **piste de progression** qui va de `MLL` (rouge, à gauche) à
  `CONSISTENCY` (ambre, à droite) avec un marqueur `C`. C'est le meilleur
  rendu de corridor de risque du lot — bien meilleur qu'une barre de
  progression, parce qu'il montre les *deux* bords.
- **Funded Futures (`22`)** — « Account Progress » : cinq barres étiquetées, la
  valeur au format `courant / cible` au-dessus, le pourcentage **coloré selon
  l'état** en dessous. Et un « Account Health Score » en anneau `70/100` avec un
  qualificatif en mots (« Good — You're on the right track »). Un score seul est
  froid ; un score plus une phrase est un conseil.
- **Topstep (`23`)** — le rail « PATH TO FUNDING » est traité comme un
  **document** : des sous-titres soulignés, des liens, de la prose en italique.
  Ce n'est pas une liste de KPI, c'est une notice. Et quand le compte est
  disqualifié, une **bande rouge pleine largeur** le dit en une phrase, suivie
  de l'action à faire.
- **EdgeForensics (`40`)** — le plus abouti. Libellés en monospace capitales
  gris, valeur en gros, **puis une sous-légende de deux lignes qui explique la
  valeur** (`Gross $7,867 · Fees $(1,004)`). Un « Trade Outcome Mix » en barre
  horizontale empilée plutôt qu'en camembert. Des contributions signées par
  instrument avec une ligne de zéro visible, les barres partant à gauche ou à
  droite. Et un score de risque en **bandes** : quatre pastilles
  `LOW / MODERATE / HIGH / CRITICAL`, celle qui s'applique étant entourée.
  Une bande nommée est plus fiable qu'une jauge en demi-cercle.
- **TopstepX (`33`)** — jauges en demi-cercle et donut de profit factor avec les
  deux montants signés étiquetés à chaque extrémité de l'arc.

**Pour WARIBA :** le Hub a déjà son échelle graphite à quatre niveaux dans
`globals.css`. Ce qui manque, ce sont les composants qui l'exploitent : la carte
de compte à quatre colonnes, le corridor de risque à deux bords, le score avec
sa phrase, la sous-légende sous chaque KPI.

---

### 6. Le rail latéral se réduit à des icônes, et reste lisible

**Références :** `07`, `09`, `10`, `26`, `22`, `51`

Trois captures du même rail TopstepX replié : logo carré en haut, six icônes
espacées, une icône de déconnexion ancrée en bas. Largeur ≈ 56 px. L'icône
active a un fond, les autres non.

Topstep (`26`) montre la version dépliée et repliée du même écran : la largeur
récupérée va au contenu, pas à la marge.

**Pour WARIBA :** le Hub a déjà `--hub-sidebar-expanded: 244px` et
`--hub-sidebar-collapsed: 72px`. L'état replié doit garder l'infobulle au survol
et l'ancrage bas.

---

### 7. Les cartes en dégradé saturé portent un objet 3D qui déborde

**Références :** `03`, `13`, `18`, `20`

FundedNext (`18`, `20`) : chaque étape est une carte plein cadre en dégradé
saturé — gris chromé, violet, vert. Dedans : `STEP 2` en petites capitales en
haut à gauche, un mot géant (`Trade`, `Pass`, `Reward`), deux lignes de
description, et un **objet 3D chromé qui déborde du coin bas-droit**. Flèche
pour « Pass », médaille étoilée pour « Reward », bougies pour « Trade ».

L'objet est toujours de la **même couleur que la carte**, en plus clair. Ce
n'est pas un pictogramme posé dessus, c'est une matière.

FTMO (`13`) fait la variante « produit » : dégradé, une pastille d'icône en haut
à gauche, et un **fragment d'interface réelle qui dépasse du bord droit** —
juste assez pour qu'on comprenne que le produit existe.

**Pour WARIBA :** les trois étapes du parcours FLEX (aujourd'hui → réussite →
activation) et les trois familles produit sont exactement ce format. Objet
cobalt sur carte cobalt, une nuance plus clair.

---

### 8. La page d'authentification a droit à une accroche visuelle

**Références :** `37`, `50`

Écran scindé. À gauche, fond noir pur, formulaire centré, `Sign In` en très
gros, deux boutons sociaux blancs pleine largeur, un séparateur `or`, deux
champs, un CTA d'accent plein largeur. À droite : une **citation client en haut**
et une **maquette tablette du vrai produit**, coupée par le bord droit.

Aucune illustration décorative. La colonne de droite montre le produit.

**Pour WARIBA :** connexion, inscription, mot de passe oublié, récupération,
vérification e-mail et session expirée partagent ce gabarit. La colonne de
droite montre le Hub ou WariX — pas une illustration abstraite.

---

### 9. L'état de chargement et le temps réel sont des éléments de design

**Références :** `32`, `01`, `31`

`32` est la référence d'animation du projet. Une carte de graphique avec :

- `Balance` et `Equity` en haut, chacun avec une icône d'info, valeur en gros ;
- une **pastille `LIVE`** — point plein + texte, en contour d'accent ;
- cinq séries en légende avec des pastilles circulaires ;
- une infobulle figée au milieu du graphique montrant deux valeurs datées ;
- et la légende en dessous : « Balance, equity and drawdown move as the market
  does — no refresh. »

Le principe est écrit noir sur blanc par leur propre légende :

> **La coque ne bouge pas. Les données à l'intérieur vivent.**

Aucun conteneur ne glisse, aucune carte n'apparaît en fondu, rien ne rebondit.
Ce qui change, c'est un chiffre, une courbe, une position d'infobulle.

**Pour WARIBA :** c'est la loi de mouvement du produit entier. Elle vaut pour le
Hub, pour Performance, pour WariX, et pour les animations marketing.

---

### 10. Le tunnel d'achat tient sur une barre collante

**Références :** `48`, `29`, `17`

ForTraders (`48`) : deux étapes en haut (`1 Set Up` — `2 Payment`), onglets de
marché, cartes radio de type de challenge en grille avec badges, grille de
capital, et surtout une **barre collante en bas de l'écran** qui contient :
total, champ code promo + `Apply`, champ code affilié + `Apply`, case
d'acceptation des conditions, et `Continue` en plein largeur d'accent.

Funded Futures (`29`) : sélecteur à gauche, **carte de résumé collante à droite**
avec la taille choisie, le prix géant, le CTA en dégradé, puis la liste des
règles résolues avec une coche verte devant chacune. Le résumé change à chaque
clic dans le sélecteur.

Tradeify (`17`) : les étapes sont numérotées (`1. Account Type`, `2. Size`,
`3. Platform`, `4. Bundle and save`), et le rail de droite affiche la fiche
technique du choix courant, coche par coche.

**Pour WARIBA :** le configurateur d'offre doit afficher les règles résolues au
fur et à mesure du choix — cible, Limite quotidienne, Perte maximale, réserve,
exposition — et non après validation. Pour FLEX, la barre collante doit porter
les **deux** montants.

---

## Ce qu'on ne reprend pas

Ces éléments sont présents dans les références et sont **interdits** chez WARIBA
tant qu'ils ne correspondent pas à une réalité vérifiable :

| Vu dans | Interdit chez WARIBA |
|---|---|
| `43` bandeau « Awards & Recognition » | Récompenses ou distinctions inventées |
| `03` « Trustpilot 73k+ reviews », « loved by 62.5k+ » | Note d'avis, nombre d'avis, nombre de membres |
| `03`, `17`, `22` bandeaux promo avec code | Bandeau promotionnel sans campagne réelle |
| `05`, `12`, `17`, `28` prix barrés | Prix barré, remise ou « prix normal » fictif |
| `19`, `44` « Available 24/7 », « 21 languages » | Promesse de disponibilité non tenue |
| `03` « $352.3M+ Total Rewarded » | Montant de gains versés non prouvé |
| `17` témoignage avec photo et badge vérifié | Témoignage, portrait ou avis non authentique |
| `11`, `31` certificat de paiement nominatif | Preuve de paiement client tant qu'il n'y en a pas |
| `36` note « 4.5 (277 reviews) » | Agrégat d'avis |
| `08` « 100K+ Awesome members » | Taille de communauté |

Ce qui construit la confiance à la place : des règles claires, des versions de
politique stables, des prix lisibles, un vrai centre d'aide, un vrai support,
WariX, et l'avertissement de trading simulé affiché avant l'achat.

Deux références montrent la bonne manière de traiter le juridique :
`49` (FundingPips) et `43` (ForTraders) — des titres courts, des paragraphes
brefs, sur fond sombre, sans les noyer en pied de page en corps 10.

---

## Index des fichiers

### Marketing public — desktop

| Fichier | Source | Ce qu'on y regarde |
|---|---|---|
| `34-fortraders-instant-pro-one-rule.webp` | ForTraders | Scène de règle plein cadre, aplat d'accent, courbe dessinée |
| `36-fortraders-desktop-hero-monetize.webp` | ForTraders | Héros : titre géant, 4 arguments icônés, 2 CTA, maquette tablette |
| `47-fortraders-choose-your-challenge.webp` | ForTraders | Titre de section + sélecteur complet |
| `35-fortraders-plan-matrix-instant.webp` | ForTraders | Matrice de plans, variante Instant |
| `38-fortraders-plan-matrix-fast-static.webp` | ForTraders | Matrice de plans, deux phases + rail de prix |
| `42-fortraders-plan-matrix-pay-after-pass.webp` | ForTraders | Matrice paiement différé, deux montants |
| `45-fortraders-plan-matrix-fast-static-alt.webp` | ForTraders | Même matrice, état replié |
| `41-fortraders-global-header.webp` | ForTraders | Barre de navigation seule |
| `46-fortraders-footer-columns.webp` | ForTraders | Pied de page, colonnes de liens |
| `43-fortraders-footer-awards.webp` | ForTraders | Pied de page complet + mentions légales |
| `44-ftmo-customer-support-desktop.webp` | FTMO | Section support : canaux, photo, chiffres |
| `49-fundingpips-legal-disclosure-footer.webp` | FundingPips | Bloc de mentions légales lisible |
| `32-fortraders-realtime-equity-chart.webp` | ForTraders | Carte graphique temps réel, pastille LIVE |
| `31-fortraders-tablet-journal-ai-coach.webp` | ForTraders | Maquette tablette du produit |

### Marketing public — pages entières

| Fichier | Source | Ce qu'on y regarde |
|---|---|---|
| `52-fortraders-landing-pay-after-pass-full.webp` | ForTraders | Rythme complet d'une page produit |
| `53-fortraders-landing-two-routes-full.webp` | ForTraders | Rythme d'une page à deux parcours |
| `54-fortraders-landing-instant-funding-full.webp` | ForTraders | Rythme d'une page accès direct |

### Marketing public — mobile

| Fichier | Source | Ce qu'on y regarde |
|---|---|---|
| `16-fortraders-mobile-hero-pay-after-pass.webp` | ForTraders | Héros mobile + objet métallique |
| `04-fortraders-mobile-rule-scenes.webp` | ForTraders | Pile de scènes de règle, une carte qui casse le motif |
| `05-fortraders-mobile-pricing-25k-token.webp` | ForTraders | Carte de prix mobile avec objet |
| `12-fortraders-mobile-pricing-50k-100k.webp` | ForTraders | Enchaînement de cartes de prix |
| `06-fortraders-mobile-comparison-matrix.webp` | ForTraders | Comparatif 3 colonnes en mobile |
| `11-fortraders-mobile-step2-reward-certificate.webp` | ForTraders | Carte d'étape avec objet certificat |
| `02-topstep-mobile-why-choose-gold.webp` | Topstep | Carrousel d'arguments, en-tête mobile |
| `03-fundednext-mobile-hero-violet.webp` | FundedNext | Héros mobile saturé, 3 arguments, 2 CTA |
| `18-fundednext-mobile-step-cards-3d.webp` | FundedNext | Cartes d'étape dégradées + objets 3D |
| `20-fundednext-mobile-how-it-works.webp` | FundedNext | Section « comment ça marche » mobile |
| `13-ftmo-mobile-gradient-program-cards.webp` | FTMO | Cartes dégradées avec fragment d'interface |
| `21-ftmo-mobile-why-choose-editorial.webp` | FTMO | Visuel éditorial photographique |
| `19-ftmo-mobile-customer-support.webp` | FTMO | Support en mobile |
| `08-ftmo-mobile-discord-community-card.webp` | FTMO | Carte communauté illustrée |

### Authentification

| Fichier | Source | Ce qu'on y regarde |
|---|---|---|
| `37-fortraders-signin-split-screen.webp` | ForTraders | Écran scindé formulaire / produit |
| `50-fortraders-signin-split-screen-alt.webp` | ForTraders | Même gabarit, seconde capture |

### Tableaux de bord

| Fichier | Source | Ce qu'on y regarde |
|---|---|---|
| `14-tradeify-accounts-dashboard.webp` | Tradeify | Carte de compte à 4 métriques, anneau radial |
| `15-lucid-account-summary-dashboard.webp` | Lucid | Badges, corridor de risque à deux bords |
| `22-fundedfutures-hub-dashboard-teal.webp` | Funded Futures | Progression à 5 barres, score de santé |
| `23-topstep-dashboard-path-to-funding.webp` | Topstep | Rail « parcours » traité en document |
| `26-topstep-dashboard-collapsed-rail.webp` | Topstep | Même écran, rail replié |
| `51-fortraders-app-hub-empty-state.webp` | ForTraders | Cartes d'action rapide + état vide |
| `40-edgeforensics-report-overview.webp` | EdgeForensics | KPI avec sous-légendes, bandes de risque |
| `33-topstepx-analytics-kpi-gauges.webp` | TopstepX | Jauges demi-cercle, donut signé |
| `39-topstepx-risk-settings.webp` | TopstepX | Réglages : liste à gauche, détail à droite |
| `25-topstepx-tutorials-grid.webp` | TopstepX | Grille de ressources |
| `07-topstepx-icon-rail-a.webp` | TopstepX | Rail d'icônes replié |
| `09-topstepx-icon-rail-b.webp` | TopstepX | Rail d'icônes replié |
| `10-topstepx-icon-rail-c.webp` | TopstepX | Rail d'icônes replié |

### Achat et facturation

| Fichier | Source | Ce qu'on y regarde |
|---|---|---|
| `48-fortraders-app-new-challenge-configurator.webp` | ForTraders | Configurateur + barre d'achat collante |
| `29-fundedfutures-challenge-selector.webp` | Funded Futures | Sélecteur + résumé collant à droite |
| `17-tradeify-add-account-configurator.webp` | Tradeify | Étapes numérotées + fiche technique |
| `27-topstep-combine-pricing-columns.webp` | Topstep | Trois colonnes de prix, une recommandée |
| `28-lucid-pricing-carousel-eval.webp` | Lucid | Carrousel de trois offres |
| `24-tradeify-billing-payment-methods.webp` | Tradeify | Moyens de paiement, tableau de commandes |
| `30-topstep-billing-cards-tables.webp` | Topstep | Facturation dense : cartes, filtres, tableaux |

### Journal et performance

| Fichier | Source | Ce qu'on y regarde |
|---|---|---|
| `01-fortraders-journal-kpi-bento.webp` | ForTraders | Grille de KPI, une seule tuile pleine |

