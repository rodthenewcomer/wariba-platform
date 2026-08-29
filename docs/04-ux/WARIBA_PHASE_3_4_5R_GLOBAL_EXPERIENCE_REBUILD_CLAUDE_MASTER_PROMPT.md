# WARIBA — Phase 3.4.5R

## Refonte globale de l'expérience

**Sombre par défaut · Cobalt · Animée · Native sur mobile**

*Prompt maître d'exécution — Claude Code*

| | |
|---|---|
| **Date** | 28 août 2026 |
| **Remplace** | la version anglaise du 3.4.5R et l'intégralité du travail visuel 3.4.5 |
| **Mandat** | refonte visuelle explicite demandée par le propriétaire |
| **Mode** | audit → conception → implémentation → QA navigateur → preuves → commits locaux → **STOP** |
| **Push / PR / déploiement** | **interdits**, sauf instruction contraire ultérieure du propriétaire |
| **Achat public** | reste **fermé**, sauf si une porte déjà acceptée dit explicitement le contraire |
| **Références visuelles** | `docs/04-ux/references/phase-3-4-5R/` — 54 captures + analyse |

---

# Partie I — Le cadre

## 0. Ce que ce document remplace, et pourquoi

Le travail visuel de la phase 3.4.5 est **rejeté**. Pas partiellement : entièrement.

Il ne s'agit pas d'un désaccord de goût. La direction beige, éditoriale et claire
qui avait été prise produisait des pages qu'on ne pouvait pas distinguer d'un
site de logiciel de facturation. Une plateforme de trading financée se juge en
trois secondes sur un téléphone, et le verdict sur ces pages était : *ce n'est
pas sérieux*.

Le fait que des tests techniques soient passés ne rend rien acceptable. Une
route peut être correcte, typée, testée, accessible — et rester une page morte.

Ce qui est rejeté :

- la dominante claire et beige sur les surfaces publiques ;
- les sections construites sur « titre + paragraphe + bordure » ;
- la répétition de la même composition sur toute la hauteur d'une page ;
- l'absence d'objet produit, de donnée visualisée, d'animation ou de matière ;
- les états de chargement génériques ;
- la langue produit rédigée comme un journal de build.

Ce qui n'est **pas** rejeté : tout le socle technique listé au §2. Le back-end
ne se refait pas pour arranger le front-end.

L'objectif tient en une phrase :

> **On garde la vérité technique V2 acceptée. On refait l'expérience entière
> pour que le système visuel soit enfin à la hauteur d'une marque de trading
> premium.**

Public, authentifié, commerce, support, exploitation, poste de travail : une
seule marque, reconnaissable même floue.

---

## 1. Mode d'exécution

### Séquence imposée

1. **Audit** — lire les références, l'existant, les tokens, les routes réelles.
2. **Conception** — produire la matrice route → accroche visuelle (§21) *avant*
   d'écrire du code de composant.
3. **Implémentation** — système d'abord, routes ensuite.
4. **QA navigateur** — Playwright, tailles réelles, mouvement réduit inclus.
5. **Preuves** — captures, inspectées à l'œil, pas seulement générées.
6. **Commits locaux** — atomiques, messages en français, conventionnels.
7. **STOP** — et rapport.

### Interdits durs

- Pas de `git push`, pas de PR, pas de déploiement.
- Pas d'ouverture de l'achat public.
- Pas de régression sur `POLICY-GOV-004` ni sur les politiques `2.1.0*`.
- Pas de constante financière en dur dans un composant client (§36).
- Pas d'affirmation commerciale invérifiable (§41).
- Pas de suppression ni de restauration de `docs/04-ux/evidence/` sans
  instruction explicite.
- Pas d'affaiblissement d'une assertion de test pour faire passer une porte.

### Ce qu'il faut faire quand quelque chose bloque

Ne pas contourner en silence. Si une donnée serveur manque pour rendre une
section honnêtement, la section n'est pas livrée avec une valeur inventée :
elle est livrée avec son état vide conçu (§17), et le manque est consigné dans
le rapport final.

---

## 2. Le socle qui ne bouge pas

Reste autoritaire et intouchable :

- gouvernance 3.4.1 et intégration du référentiel de règles V2 ;
- socle d'exécution des politiques 3.4.2 ;
- Risque / Cycle de vie V2 (3.4.3) ;
- `POLICY-GOV-004` et les politiques successeurs `2.1.0*` (3.4.3A) ;
- propagation plateforme authentifiée et vérité de compte côté serveur (3.4.4) ;
- immutabilité des politiques V1 historiques ;
- épinglage politique ↔ compte en V2 ;
- catalogue canonique de 15 offres ;
- sémantique de cycle de vie ONE / FLEX / INSTANT ;
- neutralité des versements ;
- contrôle de risque pré-trade canonique ;
- `nextAction` canonique et modèles de lecture serveur déjà éprouvés.

L'interface **consomme** cette vérité. Elle ne la recalcule pas, ne la duplique
pas, ne la met pas en cache dans une constante.

---

## 3. Comment lire les références

54 captures sont rangées dans `docs/04-ux/references/phase-3-4-5R/`, avec une
analyse détaillée dans le `README.md` du même dossier. **Lire ce README en
entier avant d'écrire une ligne de CSS.**

La règle d'usage :

> On reprend des **mécaniques**. On ne reprend jamais une **identité**.

Le vert acide de ForTraders, le violet de FundedNext, le bleu de FTMO, l'or de
Topstep, le sarcelle de Funded Futures appartiennent à ces marques. WARIBA reste
cobalt. Ce qu'on leur emprunte, c'est la discipline avec laquelle ils tiennent
une seule couleur sur un fond quasi noir.

Les dix mécaniques retenues, détaillées dans le README :

1. une seule couleur sature, tout le reste est graphite ;
2. une règle peut occuper un écran entier ;
3. un objet produit transforme une carte de prix en objet désirable ;
4. le comparatif d'offres est un composant, pas un tableau ;
5. un tableau de bord se lit en quatre niveaux de surface ;
6. le rail latéral se réduit à des icônes et reste lisible ;
7. les cartes en dégradé saturé portent un objet 3D qui déborde ;
8. la page d'authentification a droit à une accroche visuelle ;
9. l'état de chargement et le temps réel sont des éléments de design ;
10. le tunnel d'achat tient sur une barre collante.

La liste de ce qu'on **ne** reprend pas — récompenses, avis, compteurs de
membres, prix barrés, promesses de disponibilité — est dans le même README et
elle est contraignante.

---

# Partie II — Le système visuel

## 4. Les huit lois

Ces lois sont permanentes. Une route qui en viole une n'est pas finie.

### Loi 1 — Aucune section majeure morte

> Aucune section majeure ne peut se réduire à « titre + paragraphe + bordure ».

Chaque section majeure porte au moins **une** accroche parmi :

1. un objet signature WARIBA ;
2. une animation React ;
3. de l'interface produit réelle, ou une maquette produit fabriquée pour ça ;
4. une visualisation de données ;
5. un aplat de couleur saturé ou une surface illuminée ;
6. une image éditoriale ;
7. un schéma interactif ;
8. une composition typographique autour d'un chiffre géant ;
9. un système de progression visuelle ;
10. une illustration fonctionnelle de marque.

Aucune accroche = section non livrée.

Les routes légales peuvent réduire la densité visuelle au profit de la lecture,
mais gardent une accroche au niveau de la route et une hiérarchie forte.

### Loi 2 — Pas deux compositions identiques d'affilée

Rythme interdit :

```
titre à gauche + carte à droite
titre à gauche + carte à droite
titre à gauche + carte à droite
```

Le catalogue de compositions disponibles est au §8. L'obligation n'est pas de
suivre un ordre imposé, c'est de **varier**.

### Loi 3 — Chaque route déclare son accroche

Pour toute route, il faut pouvoir répondre :

> *Quelle est l'accroche visuelle principale de cette route ?*

Pour toute section majeure :

> *Qu'est-ce qui empêche cette section de redevenir du texte dans une bordure ?*

Si la réponse est vague, la route n'est pas finie. Ces réponses sont consignées
dans la matrice du §21, produite **avant** l'implémentation.

### Loi 4 — Sombre par défaut

WARIBA est une marque de trading sombre.

Le canevas dominant est le graphite quasi noir de l'échelle existante. Les
surfaces claires sont autorisées comme **moments de contraste délibérés** — une
scène de règle en aplat, un encart de preuve — jamais comme fondation.

Les tokens `bone-*` sortent du canevas public. Ils restent disponibles pour les
usages où ils ont encore du sens, mais aucune route majeure n'est bâtie dessus.

Acceptation :

```
ROUTE_MAJEURE_A_DOMINANTE_BEIGE   = 0
ROUTE_MAJEURE_BLANC_SAAS_GENERIQUE = 0
```

### Loi 5 — Le cobalt est la signature

Le cobalt doit jouer pour WARIBA le rôle que le vert joue pour ForTraders, le
violet pour FundedNext, le bleu pour FTMO, l'or pour Topstep.

Une capture floutée doit rester reconnaissable **par sa couleur**.

Le système de couleur existe déjà dans `packages/design-tokens`. Il est audité
et étendu, pas remplacé. Détail au §5.

### Loi 6 — La coque ne bouge pas, les données vivent

C'est la loi de mouvement du produit entier, tirée de la référence `32`.

Ce qui a le droit de bouger : un chiffre, une courbe, un arc, une barre, une
position d'infobulle, une illumination, un liseré au survol.

Ce qui n'a pas le droit de bouger : le conteneur qui les porte.

### Loi 7 — Un chiffre financier a toujours une source

Aucun montant, aucun pourcentage, aucun seuil affiché à un client ne provient
d'une constante d'interface. Il provient du modèle de lecture serveur. Voir §36.

### Loi 8 — Rien d'invérifiable

Aucune récompense, aucun avis, aucun compteur de membres, aucun montant versé,
aucune promesse de délai qui ne soit pas vraie aujourd'hui. WARIBA est jeune :
la crédibilité se construit sur la clarté des règles, pas sur des badges.

---

## 5. Couleur

### 5.1 Point de départ : ce qui existe

Le dépôt possède déjà un système de tokens mûr dans
`packages/design-tokens/src/tokens.css`, et une échelle de matière propre au
poste de travail et au Hub dans `apps/web/app/globals.css`.

**Auditer avant de créer.** Aucun nouveau hexadécimal ne doit apparaître dans un
composant de route. `scripts/check-tokens.mjs` existe et doit rester vert.

Ancres actuelles :

| Rôle | Token | Valeur |
|---|---|---|
| Canevas le plus profond | `--wariba-color-ink-960` | `#080B13` |
| Chrome (rail, en-tête) | `--wariba-color-ink-920` | `#0D111A` |
| Module posé sur le fond | `--wariba-color-ink-880` | `#141A27` |
| Puits interactif | `--wariba-color-ink-790` | `#1C2333` |
| Cobalt vif — l'accent | `--wariba-color-cobalt-500` | `#3157F5` |
| Cobalt clair — texte sur sombre | `--wariba-color-cobalt-400` | `#6684FF` |
| Cobalt profond — voiles | `--wariba-color-cobalt-700` | `#1E39AE` |
| Cuivre — identité | `--wariba-color-copper-500` | `#BE6945` |
| Émeraude — atteint, positif | `--wariba-color-emerald-400` | `#36B37E` |
| Ambre — avertissement, attente | `--wariba-color-amber-400` | `#E2A53A` |

### 5.2 Le budget de saturation

C'est la règle la plus importante de cette section, et celle qu'on viole le plus
facilement.

> **Sur un écran donné, le cobalt saturé occupe entre 5 % et 8 % de la surface.
> Une seule surface est remplie de cobalt plein par section.**

Le reste du cobalt vit en filaire : une valeur chiffrée, un arc de donut, un
liseré d'état sélectionné, une icône active, un lien.

Le mécanisme de hiérarchie n'est pas la taille. C'est **plein contre contour**.
Référence `01` : sur six tuiles de KPI, une seule est remplie.

Concrètement, sur une grille de métriques :

- la métrique héroïque → carte remplie cobalt, texte quasi noir dessus ;
- les métriques secondaires → carte graphite, valeur en cobalt clair ;
- les métriques tertiaires → carte graphite, valeur en blanc, libellé en gris.

Quatre cartes remplies côte à côte : le mécanisme est mort, la page est illisible.

### 5.3 Les six rôles sémantiques

Le système en compte six. Six est le plafond. Un septième cesserait d'être une
langue pour devenir une palette, et à ce moment-là la couleur ne dit plus rien.

| Rôle | Sens unique | Emploi |
|---|---|---|
| **Cobalt / indigo** | l'action attendue, et la sélection | CTA principal, onglet actif, ligne sélectionnée, focus |
| **Émeraude** | atteint, sain, positif, financé | profit, palier franchi, compte Performance, validation |
| **Ambre** | avertissement, en attente, en revue | approche de seuil, paiement en cours, revue de passage |
| **Rouge** | rupture, échec, perte | dépassement, paiement échoué, compte disqualifié |
| **Cyan** | donnée et état de marché — informatif | horodatage, session, flux, jamais un verdict |
| **Cuivre** | l'identité WARIBA elle-même | marque, sceau, accent rare de prestige |

Chaque rôle dispose d'un `-wash` (voile translucide pour poser du contenu) et
d'un `-edge` (bordure ou filet). Un composant demande **un rôle et un usage**,
jamais une teinte.

Interdits :

- l'émeraude pour décorer un élément neutre ;
- le rouge pour une information qui n'est pas une rupture ;
- le cyan pour porter un jugement ;
- le cuivre en remplissage de surface large.

### 5.4 Identités par famille produit

Les trois familles restent WARIBA d'abord. La différenciation est **secondaire**
à la marque : elle passe par la matière et la scène, pas par un changement de
teinte primaire.

**ONE** — la preuve, la cible, la progression, la précision.
Accent de scène : cobalt électrique. Objet : `OneTargetReactor`, un anneau-cible
en métal noir et cobalt.

**FLEX** — l'entrée basse, le pont, aujourd'hui → réussite → activation.
Accent de scène : indigo plus profond, glissement cobalt-violet à l'intérieur du
système. Objet : `FlexBridge`, deux modules reliés par un chemin lumineux.

**INSTANT** — l'accès direct, la vitesse, la Performance immédiate.
Accent de scène : cadre cobalt, énergie cyan glacé, émeraude tenue en laisse.
Objet : `InstantPortal`, un portail sombre à cœur lumineux.

INSTANT ne devient pas une page verte. Si on floute la page INSTANT et qu'on
n'y reconnaît plus WARIBA, c'est raté.

### 5.5 Contraste

Cible : **AA au minimum, AAA sur les valeurs financières**.

- texte de corps sur canevas : ≥ 4.5:1 ;
- valeur chiffrée financière : ≥ 7:1 ;
- texte sur aplat cobalt plein : quasi noir `ink-975`, jamais blanc ;
- bordure porteuse de sens (état sélectionné, erreur) : ≥ 3:1 contre son fond ;
- aucune information portée par la couleur seule — toujours doublée d'un
  libellé, d'une icône ou d'une position.

---

## 6. Typographie

### 6.1 Hiérarchie d'affichage

Le défaut de l'ancienne direction était une typographie polie et sans autorité.
Les références partagent toutes le même geste : **un titre énorme, court, et
beaucoup de vide autour**.

| Niveau | Desktop | Mobile | Usage |
|---|---|---|---|
| Display XL | 72–96 px | 40–48 px | héros de route, 4 mots maximum |
| Display L | 48–64 px | 32–36 px | ouverture de section |
| Chiffre héroïque | 56–80 px | 36–44 px | métrique unique de scène |
| Titre | 24–32 px | 20–24 px | titre de carte, de module |
| Corps | 16–17 px | 15–16 px | prose, 65 caractères maximum par ligne |
| Micro-libellé | 11–12 px | 11–12 px | capitales, interlettrage +0.08em, gris |

Le micro-libellé en capitales espacées est un marqueur fort du genre
(références `04`, `40`, `47`). Il sert de sur-titre : `PROFIT TARGET`, `RULE 1
OF 1`, `STEP 2 · MASTER ACCOUNT`. Chez WARIBA : `OBJECTIF DE PERFORMANCE`,
`RÈGLE 1 SUR 1`, `ÉTAPE 2 · COMPTE PERFORMANCE`.

### 6.2 Les chiffres

Un produit financier se juge sur sa typographie chiffrée.

- `font-variant-numeric: tabular-nums` sur **tout** montant, pourcentage,
  compteur, horodatage et identifiant — sans exception ;
- alignement des séparateurs décimaux dans une colonne de tableau ;
- signe explicite sur les variations : `+1 284` / `−312` ;
- devise en suffixe, taille réduite d'un cran, gris moyen : `199 900 <small>FCFA</small>` ;
- identifiants techniques (référence de commande, identifiant de compte) en
  monospace, gris, taille réduite — référence `14`.

### 6.3 Longueurs

Un titre héroïque mobile qui prend sept lignes est un échec de rédaction, pas de
CSS. Limites dures :

- héros mobile : **3 lignes maximum** ;
- titre de section : 2 lignes ;
- paragraphe d'accompagnement : 3 lignes, 2 sur mobile ;
- puce d'argument : 1 ligne.

Si le texte ne rentre pas, on réécrit le texte.

---

## 7. Matière, profondeur, élévation

### 7.1 L'échelle à cinq niveaux

Ce qui sépare un tableau de bord fini d'une page avec des bordures, c'est qu'on
distingue les niveaux **sans lire**.

```
niveau 0   canevas d'application          le plus sombre, le graphique peint dessus
niveau 1   chrome — rail, en-tête          un cran au-dessus
niveau 2   module, carte, panneau          deux crans, c'est là que vit le contenu
niveau 3   puits interactif                champ, ligne, segment, à l'intérieur d'un module
niveau 4   sélection                       une vraie surface, jamais seulement un contour
```

Les alias existent déjà (`--warix-shell`, `--warix-panel`, `--warix-surface`,
`--warix-surface-raised`, `--warix-surface-selected`). Un composant demande un
**rôle** — « la surface sur laquelle repose un contrôle groupé » — pas un des
neuf tokens `surface-*`.

Erreur à ne jamais commettre : poser un module et le fond au même niveau et
compter sur une bordure pour les séparer.

### 7.2 Rayons

| Contexte | Rayon |
|---|---|
| Puits — champ, ligne, segment | 6 px |
| Carte de poste de travail | 8 px |
| Panneau de poste de travail | 10 px |
| Carte de Hub | 12–14 px |
| Carte marketing, scène | 20–28 px |
| Pastille, badge, CTA arrondi | plein |

Un terminal de trading n'est pas une application grand public : 6–10 px se lit
comme de l'ingénierie, 18–24 px se lit comme une page d'atterrissage. Les deux
échelles coexistent parce que WariX et le marketing ne racontent pas la même
chose.

### 7.3 Liseré, ombre, halo

Le sombre ne se sculpte pas à l'ombre portée — elle ne se voit pas. Il se
sculpte au **liseré**.

- **Liseré interne haut** (`rim-light`) : un filet blanc à 6–10 % d'opacité sur
  le bord supérieur d'une surface élevée. C'est ce qui donne l'impression que la
  carte capte une lumière venue d'en haut.
- **Bordure** : `1px` en `color-mix` du gris de couture avec de la transparence.
  Jamais un gris opaque plus clair que la surface.
- **Halo cobalt** : réservé à l'état sélectionné, au focus et au CTA principal
  au survol. Rayon large, opacité faible (`0 0 0 1px` + `0 8px 32px -8px`).
  Jamais en permanence sur une carte au repos.
- **Ombre portée** : uniquement sous les couches flottantes — feuille modale,
  menu, infobulle, barre collante.

### 7.4 Verre

Le verre dépoli est autorisé sur **trois** surfaces et pas une de plus :

1. l'en-tête public quand la page est défilée ;
2. la barre d'achat collante ;
3. les feuilles modales mobiles.

Partout ailleurs, une surface opaque de l'échelle. Le verre généralisé écrase la
hiérarchie et coûte cher au rendu sur téléphone.

---

## 8. Grille et rythme de page

### 8.1 Catalogue de compositions

Une page forte alterne. Les types disponibles :

| Type | Description | Référence |
|---|---|---|
| Héros produit | titre géant + arguments icônés + 2 CTA + maquette | `36` |
| Scène de règle | un aplat plein cadre, une règle, un tracé | `34` |
| Aplat saturé | carte pleine couleur avec objet 3D débordant | `18`, `20` |
| Îlot produit sombre | fragment d'interface réelle posé sur le canevas | `13`, `32` |
| Configurateur | sélecteur à gauche, résumé collant à droite | `29`, `48` |
| Matrice comparative | deux phases + rail de prix | `38`, `42` |
| Chiffres géants | 3 à 5 faits en typographie massive | `36` |
| Progression | échelle, paliers, corridor à deux bords | `15`, `22` |
| Éditorial | photographie ou visuel humain | `21` |
| Bento de données | grille de KPI, une seule tuile pleine | `01`, `40` |
| Récit défilant | section épinglée qui se transforme au scroll | `52` |
| Clôture CTA | un fond, une phrase, un bouton | `52`, `54` |

### 8.2 Un rythme type

Pour une page produit publique — indicatif, pas obligatoire :

```
Héros produit sombre
  ↓
Aplat de marque saturé
  ↓
Configurateur / sélecteur de taille
  ↓
Chiffres géants
  ↓
Scène de règle
  ↓
Îlot produit réel
  ↓
Progression / versements
  ↓
Éditorial ou preuve
  ↓
Clôture CTA
```

Ce qui est interdit, c'est de reproduire le même bloc neuf fois.

### 8.3 Respiration

| Contexte | Desktop | Mobile |
|---|---|---|
| Entre deux sections majeures | 120–180 px | 72–96 px |
| Marge latérale de page | 48–80 px | 20–24 px |
| Interne d'une carte marketing | 32–40 px | 20–24 px |
| Interne d'un module de Hub | 20–24 px | 16–20 px |
| Entre les cartes d'une grille | 20–24 px | 12–16 px |

Largeur de lecture maximale : 1240 px pour le contenu de Hub, 1320 px pour le
marketing. Au-delà, la page cesse de s'élargir : on ne gagne rien à étirer une
ligne de texte sur 1900 px.

---

## 9. Objets signature

Une carte de prix sans objet est une ligne de tableau avec un bouton. Les
références `05`, `12` et `16` le démontrent : c'est l'objet qui fait la fiche
produit.

### 9.1 Bibliothèque minimale

| Composant | Rôle | Variantes |
|---|---|---|
| `WaribaAccountToken` | plaque de taille de compte | 5K · 10K · 25K · 50K · 100K |
| `OneTargetReactor` | anneau-cible ONE | 3 états de progression |
| `FlexBridge` | pont FLEX | avant / pendant / après activation |
| `InstantPortal` | portail INSTANT | repos / actif |
| `PerformanceCore` | Journées Performance et paliers | 0/5 → 5/5 |
| `RiskBarrier` | Limite quotidienne et Perte maximale | sûr / proche / rompu |
| `PayoutSeal` | sceau de versement | exemple de règle uniquement |
| `SecurityOrb` | routes d'authentification et de sécurité | repos / succès / erreur |
| `WariXDeviceFrame` | vitrine produit | bureau / mobile |

### 9.2 Le brief du `WaribaAccountToken`

C'est l'objet le plus visible du système. Sa fabrication, dérivée de `05` /
`12` / `16` :

- plaque à coins très arrondis, ratio ≈ 4:3 ;
- **chanfrein** sur les quatre côtés, plus lumineux en haut à gauche ;
- **liseré spéculaire net sur l'arête basse** — c'est ce détail qui fait le
  « métal » ; sans lui l'objet est plat ;
- intérieur presque noir avec un dégradé radial très faible ;
- le chiffre (`25K`) en **contour** seulement, jamais en plein ;
- le mot-symbole WARIBA en bas, petit, en aplat ;
- le métal est titane sombre, la lumière est cobalt — pas chrome neutre.

### 9.3 Technique

On prend la technique la plus légère qui atteint la qualité :

1. SVG en couches + CSS — par défaut ;
2. CSS 3D et dégradés — pour les plaques et les chanfreins ;
3. AVIF/WebP pré-rendu piloté par Motion — pour les objets complexes fixes ;
4. Rive — pour un objet vectoriel à états interactifs ;
5. Spline / WebGL — seulement si le gain est net **et** si le mobile tient.

Tout objet lourd a un repli statique. Aucun objet ne bloque le premier rendu.
Aucune route ne dépend de WebGL pour être compréhensible.

---

# Partie III — Le mouvement

## 10. Doctrine

### 10.1 La loi

> **La coque ne bouge pas. Les données à l'intérieur vivent.**

C'est écrit noir sur blanc par la légende de la référence `32` : « Balance,
equity and drawdown move as the market does — no refresh. » Le cadre du
graphique est parfaitement immobile. Ce qui change, c'est la courbe, les deux
chiffres en haut, et la position de l'infobulle.

### 10.2 Ce qui a le droit de bouger

- un chiffre qui se met à jour ;
- une courbe qui s'étend ou se redessine ;
- un arc, une barre, une jauge qui se remplit ;
- une infobulle qui se déplace le long d'une série ;
- une illumination de progression ;
- un liseré au survol ;
- un tracé SVG qui se dessine à l'entrée dans le viewport ;
- une translation de 2 à 10 px sur un fondu de section.

### 10.3 Ce qui n'a pas le droit de bouger

- les conteneurs, les cartes, les panneaux, les modules ;
- les rebonds, les élastiques, les ressorts marqués ;
- les rotations continues ;
- les glissements de grande amplitude (> 24 px) ;
- les compteurs façon machine à sous ;
- le parallaxe posé partout sans raison ;
- toute animation sur un bloc de texte de corps.

Une animation qui n'explique rien est une animation qui ralentit la page.

---

## 11. Tokens et recettes

### 11.1 Les durées existent déjà

Elles sont dans `packages/design-tokens/src/tokens.css`. **On les utilise, on
n'en invente pas.**

| Token | Valeur | Emploi |
|---|---|---|
| `--wariba-motion-duration-instant` | 80 ms | pression, bascule d'état immédiat |
| `--wariba-motion-duration-fast` | 120 ms | survol, focus |
| `--wariba-motion-duration-interaction` | 140 ms | sélection, onglet |
| `--wariba-motion-duration-default` | 180 ms | transition d'état, popover |
| `--wariba-motion-duration-sheet` | 240 ms | feuille modale, tiroir |
| `--wariba-motion-duration-slow` | 280 ms | transition de panneau |
| `--wariba-motion-duration-celebration` | 420 ms | succès, palier franchi |
| `--wariba-motion-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | par défaut |
| `--wariba-motion-ease-enter` | `cubic-bezier(0, 0, 0, 1)` | entrée |
| `--wariba-motion-ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | sortie |
| `--wariba-motion-duration-reduced` | 1 ms | mouvement réduit |

Durées supplémentaires, pour le marketing uniquement, à ajouter au système si
absentes :

| Rôle | Valeur |
|---|---|
| Révélation de section | 450 ms |
| Tracé SVG | 700–1100 ms |
| Boucle de démonstration produit | 6–9 s |
| Flottement ambiant d'objet 3D | 8–14 s |

### 11.2 CSS ou Motion : la frontière

**CSS** pour tout ce qui est déclenché par un état simple : survol, focus,
pression, ouverture d'accordéon, changement de sélection. Pas de JavaScript pour
un `:hover`.

**Motion** (le paquet `motion` v12, déjà installé dans `apps/web`) pour :

- les entrées et sorties dans l'arbre (`AnimatePresence`) ;
- les valeurs animées pilotées par la donnée (`animate`, `useSpring`) ;
- les séquences orchestrées (`stagger`) ;
- les révélations liées au défilement (`useInView`, `useScroll`) ;
- le partage de disposition (`layoutId`) — avec parcimonie.

**Interdit** : une animation de mise en page globale (`layout` sur un conteneur
de liste entière). C'est le chemin le plus court vers une page qui saute.

### 11.3 Recettes

```
Survol de CTA
  fond          +6 % de luminance     120 ms  standard
  halo cobalt   0 → 0.35 d'opacité     120 ms  standard
  translation   aucune

Pression
  échelle       1 → 0.985               80 ms  exit
  relâchement   0.985 → 1              120 ms  enter

Sélection d'onglet / de taille de compte
  indicateur    layoutId, glisse       140 ms  standard
  contenu       fondu croisé           180 ms  standard
  la carte ne bouge pas

Révélation de section
  opacité       0 → 1                  450 ms  enter
  translation   12 px → 0              450 ms  enter
  déclencheur   useInView, once: true, margin -10 %
  cascade       60 ms entre enfants, 4 enfants maximum

Mise à jour de valeur financière
  chiffre       interpolation           600 ms  standard, tabular-nums
  couleur       flash du rôle           240 ms  puis retour
  jamais de défilement de chiffres

Ouverture de feuille mobile
  translation   100 % → 0              240 ms  enter
  fond          0 → 0.6 d'opacité      180 ms
  fermeture     240 ms  exit

Tracé de règle SVG
  strokeDashoffset  longueur → 0       900 ms  standard
  déclencheur       entrée dans le viewport, une seule fois
```

---

## 12. Micro-interactions

### 12.1 Le principe

Une micro-interaction confirme qu'une action a été comprise. Elle ne décore pas.
Si on ne peut pas dire quel message elle porte, elle n'existe pas.

### 12.2 Catalogue obligatoire

| Élément | Retour attendu |
|---|---|
| CTA principal | survol : halo + luminance · pression : 0.985 · focus : anneau cobalt 2 px décalé |
| CTA secondaire | survol : bordure qui s'éclaircit + fond très léger |
| Onglet de famille produit | indicateur glissant (`layoutId`), contenu en fondu croisé |
| Sélection de taille de compte | l'objet change par fondu croisé, le cadre reste immobile |
| Ligne de spécification | survol : fond du puits +4 %, icône d'info qui apparaît |
| Pastille de valeur | changement : flash du rôle 240 ms |
| Bascule dans une ligne (`EOD` / `Suiveuse`) | curseur glissant 140 ms, la ligne ne bouge pas |
| Accordéon de règle | hauteur automatique 240 ms, chevron 180 ms, contenu 120 ms de retard |
| Copie dans le presse-papier | icône → coche 180 ms, retour après 1.6 s, annonce vocale |
| Champ de saisie | focus : bordure cobalt + halo · erreur : bordure rouge + message, **pas de secousse** |
| Case à cocher / interrupteur | tracé de la coche 160 ms, curseur 140 ms |
| Barre de progression | remplissage 600 ms, illumination de tête |
| Journées Performance | le palier franchi s'allume 420 ms, les autres restent |
| Échelle de partage | le palier actif s'élève d'un niveau de surface |
| Refus d'ordre WariX | bordure rouge 240 ms + raison affichée · aucune secousse |
| Chargement de bouton | le libellé cède la place à un indicateur, **largeur figée** |
| Menu mobile | feuille 240 ms, éléments en cascade de 40 ms |
| Filtre / segment | fond glissant, jamais de saut de contenu |
| Infobulle | 180 ms, délai d'ouverture 400 ms, fermeture immédiate |

### 12.3 Interdits

- la secousse (`shake`) sur une erreur — c'est du bruit, pas de l'information ;
- le rebond sur un CTA ;
- une animation au survol d'une carte entière qui la déplace ;
- un compteur animé sur une valeur qui n'a pas changé ;
- une animation qui rejoue à chaque re-rendu.

---

## 13. Squelettes et états de chargement

### 13.1 Le principe

Un état de chargement fait partie du design. Un rectangle gris pulsé répété
partout dit au client que personne ne s'est occupé de cet écran.

Le composant `Skeleton` existe déjà dans `packages/ui/src/components/Skeleton.tsx`.
Sa documentation interne le dit déjà : *« refléter la forme réelle en cours de
chargement — jamais un bloc générique »*. Cette règle n'est aujourd'hui pas
tenue partout. Elle le devient.

### 13.2 Les quatre règles

**1 — Le squelette a la forme de ce qui arrive.**
Une carte de compte à quatre métriques charge en montrant un titre, une
pastille, et quatre colonnes. Pas trois barres empilées.

**2 — Aucun saut de mise en page.**
Le squelette occupe exactement les dimensions finales. Si la hauteur finale
dépend de la donnée, on réserve la hauteur du cas le plus fréquent et on
n'anime pas la différence.

**3 — Le balayage remplace la pulsation.**
`animate-pulse` sur du graphite donne un clignotement sale. On remplace par un
**balayage de luminance cobalt** : un dégradé à 8 % d'opacité qui traverse la
forme de gauche à droite en 1600 ms, avec un `ease` linéaire et un décalage de
80 ms entre les formes voisines. Le décalage est ce qui fait qu'une grille
respire au lieu de clignoter en bloc.

**4 — Mouvement réduit : le balayage s'arrête.**
La forme reste, statique, à sa luminance moyenne. Elle reste identifiable comme
un espace réservé.

### 13.3 Le marqueur

L'attribut `data-skeleton="true"` reste obligatoire sur chaque forme. Il est
inerte pour le rendu et pour les technologies d'assistance, mais il permet au
harnais de preuves de savoir qu'il a photographié un état de chargement — ce
qui est déjà arrivé deux fois.

Une capture de preuve contenant un `[data-skeleton]` visible est rejetée.

### 13.4 Couverture obligatoire

Chaque surface de cette liste a un squelette **dessiné à sa forme** :

**Public**
- catalogue d'offres — grille de cartes avec emplacement d'objet ;
- configurateur — sélecteur + rail de résumé ;
- matrice comparative — deux colonnes de lignes ;
- centre d'aide : recherche et résultats.

**Commerce**
- récapitulatif de commande ;
- état de paiement ;
- provisionnement — voir §13.5 ;
- activation FLEX.

**Plateforme**
- héros du Hub ;
- liste de comptes ;
- détail de compte ;
- tableau de bord Performance — la coque du graphique est dessinée, les axes
  sont présents, seule la série manque ;
- versements ;
- journal ;
- facturation.

**WariX**
- changement de compte ;
- rafraîchissement de données — jamais de squelette plein écran, seules les
  cellules concernées.

### 13.5 Le cas du provisionnement

Le provisionnement n'est pas un chargement : c'est un **processus**. Il ne se
représente pas par un squelette mais par une progression étapée, nommée, avec
un état par étape et une estimation honnête. Référence de composition : `23`.

```
Paiement confirmé            ✓
Compte créé                  ✓
Règles appliquées            ● en cours
Identifiants générés         ○
Accès plateforme             ○
```

Si une étape échoue, elle porte l'état rouge, la raison, et l'action suivante.
Aucun spinner infini.

### 13.6 Ce qui remplace un squelette

- **Contenu déjà connu** : afficher immédiatement, ne pas masquer une donnée
  disponible derrière le chargement de sa voisine ;
- **Rafraîchissement d'une donnée déjà affichée** : garder l'ancienne valeur,
  atténuer légèrement, indiquer l'actualisation par une pastille discrète — ne
  jamais revenir à un squelette ;
- **Action utilisateur** : indicateur dans le bouton, largeur figée ;
- **Chargement long attendu** : progression étapée.

---

## 14. Animations signature

Cinq primitives réutilisables. Chacune respecte la Loi 6.

### `WaribaPerformanceShowcase`

Une coque de tableau de bord sombre, parfaitement immobile. À l'intérieur, une
boucle de 8 secondes :

```
P&L            +1 284 → +1 431
courbe         s'étend d'un point
Journées       3/5 → 4/5
réserve        atteint sa cible
Journées       4/5 → 5/5
versement      passe à « disponible »
```

Étiqueté comme démonstration produit. Aucune valeur présentée comme un résultat
client réel.

### `WaribaFlexJourneyMotion`

```
AUJOURD'HUI  →  Évaluation  →  Réussite  →  Activation  →  Performance
   24 900                                     109 900
```

Les montants viennent de l'offre sélectionnée côté serveur. Le pont s'illumine
segment par segment.

### `WaribaRiskScene`

Un corridor à **deux bords** — modèle : référence `15`. Le bord bas est la
Perte maximale (rouge), le bord haut la cible (émeraude), la Limite quotidienne
est une bande souple à l'intérieur. Un marqueur montre la position. Trois états :
sûr, proche, rompu.

C'est bien meilleur qu'une barre de progression, parce qu'une barre ne montre
qu'un seul bord et que le risque en a deux.

### `WaribaPayoutLadder`

Cinq Journées Performance, puis l'échelle 80 → 80 → 85 → 85 → 90 %, le plafond
propre à la taille, et la revue après le cinquième cycle. Le palier actif s'élève
d'un niveau de surface.

### `WaribaAccountTokenSelector`

5K → 100K. Le cadre est immobile, l'objet change en fondu croisé, la fiche
technique se met à jour ligne par ligne avec un flash de rôle sur les valeurs
modifiées.

---

## 15. Mouvement réduit

`prefers-reduced-motion: reduce` est honoré partout, sans exception.

En mode réduit :

- aucune boucle, aucun flottement ambiant ;
- aucune interpolation de chiffre — la valeur finale s'affiche directement ;
- aucune translation supérieure à 2 px ;
- les fondus sont conservés mais ramenés à 1 ms ;
- les graphiques s'affichent à leur état final ;
- le balayage des squelettes s'arrête ;
- **la compréhension est intégralement préservée** : aucune information ne
  dépend d'une animation pour être perçue.

Une passe de QA complète est exécutée en mode réduit (§48).

---

# Partie IV — Les états

## 16. La règle générale

Un écran a quatre états, pas un. Chargement, vide, erreur, contenu. Les trois
premiers se conçoivent en même temps que le quatrième, pas après.

## 17. États vides

Un état vide qui dit `Aucune donnée` est un bug de conception.

Chaque état vide majeur porte trois choses :

1. **un visuel de marque** — objet signature en version atténuée, ou schéma ;
2. **une explication** — pourquoi c'est vide, en une phrase ;
3. **l'action suivante** — un CTA, un seul.

Référence de composition : `51` — une icône encadrée, un titre, un bouton, le
tout centré dans un module qui occupe la place du contenu à venir.

États vides à concevoir :

| Surface | Message | Action |
|---|---|---|
| Aucun compte | « Vous n'avez pas encore de compte. » | Découvrir les offres |
| Aucun versement | « Votre premier versement apparaîtra ici. » | Voir les conditions |
| Aucune Journée Performance | « Aucune journée qualifiante enregistrée. » | Comprendre les Journées Performance |
| Aucune demande de support | « Aucune demande en cours. » | Ouvrir une demande |
| Aucune contestation | « Aucune contestation ouverte. » | Comprendre la procédure |
| Aucun moyen de paiement | « Aucun moyen de paiement enregistré. » | Ajouter un moyen de paiement |
| Journal vide | « Aucun trade sur la période. » | Changer de période |
| Recherche d'aide sans résultat | « Aucun article ne correspond à « … ». » | Contacter le support |

## 18. États d'erreur

Chaque erreur dit **ce qui s'est passé**, **ce que ça implique**, et **ce qu'il
faut faire**. Dans cet ordre. Jamais un code seul.

Erreurs à concevoir :

- catalogue indisponible ;
- offre retirée ;
- paiement échoué ;
- paiement en attente ;
- paiement d'état inconnu ;
- provisionnement échoué ;
- fenêtre d'activation expirée ;
- session expirée ;
- droits insuffisants ;
- donnée indisponible ;
- capacité de marché indisponible ;
- ordre WariX refusé ;
- erreur réseau ;
- hors ligne ;
- maintenance.

Modèle de composition, dérivé de `23` : bande pleine largeur au rôle rouge, une
phrase qui explique, une phrase qui oriente, un bouton d'action. Pas de pavé de
texte, pas de trace technique visible côté client.

## 19. États de succès

Le succès mérite un moment, mais un moment court.

- durée : 420 ms, jamais de confettis ;
- l'objet signature concerné s'illumine et se stabilise ;
- le message dit ce qui est acquis, pas « Succès » ;
- l'action suivante est immédiatement disponible.

Exemples : paiement confirmé, compte provisionné, activation FLEX réussie,
Journée Performance validée, versement demandé.

---

# Partie V — Les surfaces

## 20. En-tête et pied de page

### 20.1 En-tête public

Modèle de composition : `41`.

- barre sombre, opaque en haut de page, verre dépoli une fois défilée ;
- mot-symbole WARIBA à gauche ;
- navigation centrale : uniquement des routes qui existent réellement ;
- à droite : sélecteur de langue, `Se connecter` en fantôme, `Commencer` en
  pastille cobalt pleine ;
- au survol d'un élément à sous-menu : panneau qui descend en 180 ms, pas de
  rebond ;
- mobile : logo, une seule pastille CTA, menu hamburger ouvrant une feuille
  plein écran avec cascade de 40 ms.

Aucun lien mort. Aucun bandeau promotionnel tant qu'aucune campagne réelle
n'existe. Le jour où il y en aura une, ce sera une surface cobalt de marque, pas
une bande criarde avec un code à copier.

### 20.2 Pied de page

Modèle de composition : `46`, en retirant la rangée de récompenses de `43`.

- fond sombre, dense, six colonnes maximum ;
- mot-symbole + une ligne de positionnement ;
- colonnes : Produits, Trading, Comprendre, Entreprise, Légal ;
- uniquement des routes réelles ;
- avertissement de trading simulé, lisible, pas en corps 10 ;
- mentions légales traitées comme du contenu — modèle : `49` : des sous-titres,
  des paragraphes courts, du gris lisible ;
- un dernier moment de marque avant le bas de page.

Interdits : récompenses, logos réglementaires, note d'avis, compteurs sociaux.

---

## 21. Matrice route → accroche visuelle

**À produire avant toute implémentation de route**, dans :

```
docs/05-design/WARIBA_ROUTE_VISUAL_HOOK_MATRIX_V1.md
```

Colonnes :

| Route | Accroche principale | Sections | Élément fort par section | Type de composition | Adaptation mobile | État |
|---|---|---|---|---|---|---|

Elle couvre **toutes** les routes réelles de `apps/web/app`. La liste ci-dessous
est l'arborescence réelle au 28 août 2026 ; si elle a changé, c'est
l'arborescence qui fait foi, pas ce document.

```
Public          /                              /offres
                /challenges/one                /challenges/flex
                /challenges/instant            /programme
                /warix                         /catalog
                /aide  /aide/[category]  /aide/[category]/[slug]
                /legal/conditions  /legal/confidentialite  /legal/risques

Authentif.      /login                         /inscription
                /mot-de-passe-oublie           /recuperation
                /verification-email            /session-expiree

Commerce        /checkout                      /checkout/success
                /checkout/echec                /checkout/sandbox-pay

Plateforme      /bienvenue                     /hub
                /comptes                       /comptes/nouveau
                /comptes/[publicId]/regles
                /comptes/[publicId]/bienvenue-performance
                /performance                   /journal
                /payouts                       /facturation
                /parametres                    /plus
                /verification-identite

Support         /support                       /support/nouveau
                /support/demandes/[publicId]
                /support/contestations/nouvelle
                /support/contestations/[publicId]

Poste           /trade

Exploitation    /control  et ses 26 sous-routes

Système         /403  /erreur  /hors-ligne  /maintenance
```

---

## 22. Routes publiques

### 22.1 `/` — Accueil

**Accroche :** `WaribaPerformanceShowcase` posé dans un `WariXDeviceFrame`, sur
canevas quasi noir, à droite d'un titre de 4 mots.

Rythme attendu :

1. **Héros** — titre display XL, une phrase de positionnement, quatre arguments
   icônés sur une ligne, deux CTA (`Commencer` plein cobalt, `Comment ça marche`
   fantôme), maquette produit animée à droite. Modèle : `36`.
2. **Trois familles** — trois cartes en aplat, chacune portant son objet
   signature qui déborde du coin. Modèle : `18`.
3. **Le parcours en trois étapes** — bandeau horizontal, tracé SVG qui se
   dessine à l'entrée dans le viewport.
4. **Scène de règle** — la Perte maximale seule, en aplat plein cadre.
   Modèle : `34`.
5. **Chiffres du programme** — 3 à 5 faits vérifiables en typographie massive.
6. **Îlot WariX** — fragment d'interface réelle du poste de travail.
7. **Versements** — `WaribaPayoutLadder`.
8. **Clôture** — une phrase, un bouton, un fond.

Mobile : le héros perd la maquette au profit d'une carte KPI unique ; les trois
familles deviennent une pile plein largeur ; la scène de règle devient une pile
de cartes dont une casse le motif (modèle `04`).

### 22.2 `/offres` — Catalogue

**Accroche :** le configurateur, avec les règles qui se résolvent en direct.

Composition, modèle `29` + `48` :

- à gauche, le sélecteur : famille (3 pastilles), taille (5 pastilles), options ;
- à droite, un **rail de résumé collant** : taille choisie, prix géant, CTA, et
  la fiche technique qui se remplit coche par coche — objectif, Limite
  quotidienne, Perte maximale, Meilleure journée, réserve, exposition, Journées
  Performance, partage ;
- chaque changement dans le sélecteur fait flasher les valeurs modifiées du rail
  (240 ms, rôle correspondant) ;
- l'objet `WaribaAccountToken` change en fondu croisé, le cadre reste immobile.

L'état de l'URL est restaurable (§39).

Mobile : le rail devient une **barre collante en bas** portant le prix et le
CTA ; la fiche technique se déplie au-dessus via une feuille. Pour FLEX, la
barre porte **les deux montants**.

### 22.3 `/challenges/one` — ONE

**Accroche :** `OneTargetReactor`, l'anneau-cible qui se remplit au défilement.

- héros : objet + objectif de performance en chiffre géant ;
- matrice à deux phases : Évaluation → Compte Performance, modèle `38` ;
- scène de règle : la Perte maximale 8 % EOD suiveuse en aplat ;
- `WaribaRiskScene` : le corridor à deux bords ;
- `WaribaPayoutLadder` ;
- grille de tailles avec les cinq objets.

### 22.4 `/challenges/flex` — FLEX

**Accroche :** `WaribaFlexJourneyMotion` — le pont qui s'illumine.

C'est la route la plus délicate du site, parce que FLEX a deux montants et que
c'est exactement là qu'un client se sent piégé s'il ne comprend pas.

Obligations de clarté :

- les deux montants sont visibles **ensemble**, jamais l'un sans l'autre ;
- le montant d'activation est annoncé comme **gelé au moment de l'achat** ;
- le total en cas de réussite est affiché, dérivé du serveur ou calculé en
  décimal exact à partir de valeurs immuables ;
- ce qui se passe **en cas d'échec** est écrit noir sur blanc : l'activation
  n'est jamais prélevée ;
- aucun prix barré, aucune remise fictive.

Modèle de composition pour le comparatif : `42` — la colonne « aujourd'hui » et
la colonne « à l'activation » côte à côte, avec la flèche circulaire lumineuse
entre les deux.

### 22.5 `/challenges/instant` — INSTANT

**Accroche :** `InstantPortal`, le portail à cœur lumineux.

- héros : accès direct à la Performance, sans Évaluation ;
- le contraste avec ONE et FLEX est dit visuellement — un schéma à trois voies
  où deux passent par une porte et une n'en passe pas ;
- les contreparties (Limite quotidienne 2 %, Perte maximale 5 %, exposition 2×)
  sont présentées comme des règles, pas cachées ;
- INSTANT reste cobalt. L'émeraude est un accent, pas la teinte de la page.

### 22.6 `/programme` — Comment ça marche

**Accroche :** un récit défilant à sections épinglées.

Chaque étape occupe un écran, avec son objet et son chiffre. Sur mobile, le
récit épinglé devient une pile de cartes en aplat, modèle `18` / `20`.

### 22.7 `/warix` — Poste de travail (public)

**Accroche :** l'interface réelle de WariX, dans son cadre d'appareil, avec la
boucle « la coque ne bouge pas, les données vivent ».

- capture réelle, pas une illustration ;
- trois à quatre capacités mises en avant, chacune avec son fragment
  d'interface, modèle `13` ;
- version mobile du poste de travail montrée, pas seulement évoquée ;
- toute donnée affichée est étiquetée comme démonstration.

### 22.8 `/aide`, `/aide/[category]`, `/aide/[category]/[slug]`

**Accroche :** une recherche qui domine le haut de page, et des catégories en
cartes avec compteur d'articles.

- recherche : champ large, résultats en direct, squelette de résultat dessiné à
  la forme d'un résultat ;
- article : largeur de lecture 68 caractères, sommaire collant à droite en
  desktop, fil d'Ariane, articles liés en bas ;
- chaque article se termine par « Cette réponse vous a aidé ? » et une porte
  vers le support.

### 22.9 `/legal/conditions`, `/legal/confidentialite`, `/legal/risques`

**Accroche :** une hiérarchie de lecture, pas une décoration.

Modèle : `49`. Sous-titres nets, paragraphes courts, sommaire collant, gris
lisible sur graphite, largeur de lecture contrainte. L'avertissement de trading
simulé est traité comme du contenu de premier plan, pas comme une note de bas de
page.

### 22.10 `/catalog`

Route technique de catalogue. Elle reste fonctionnelle et cohérente avec le
système, sans travail marketing.

---

## 23. Routes d'authentification

Gabarit commun, modèle `37` :

```
┌─────────────────────────┬──────────────────────────────┐
│  canevas quasi noir      │  citation ou message court   │
│                          │                              │
│  titre display L         │  maquette produit réelle     │
│  boutons sociaux         │  coupée par le bord droit    │
│  séparateur « ou »       │                              │
│  champs                  │                              │
│  CTA cobalt plein largeur│                              │
│  lien secondaire         │                              │
└─────────────────────────┴──────────────────────────────┘
```

La colonne de droite montre **le produit** — Hub ou WariX — jamais une
illustration abstraite. En dessous de 1024 px, elle disparaît et le formulaire
se centre.

| Route | Spécificité |
|---|---|
| `/login` | `SecurityOrb` au repos ; message d'erreur générique, jamais « ce compte n'existe pas » |
| `/inscription` | force du mot de passe en barre à quatre segments ; consentement politique explicite (§40) |
| `/mot-de-passe-oublie` | après envoi, l'état de succès remplace le formulaire ; pas de fuite d'existence de compte |
| `/recuperation` | jeton validé côté serveur avant affichage du formulaire ; jeton invalide = état d'erreur conçu |
| `/verification-email` | trois états : en attente, réussie, lien expiré — chacun avec son visuel |
| `/session-expiree` | explique, propose la reconnexion, **conserve la destination** (§39) |

---

## 24. Routes commerce

### 24.1 `/checkout`

**Accroche :** le récapitulatif, traité comme un objet, pas comme un tableau.

- à gauche : identité de l'offre avec son `WaribaAccountToken`, la fiche
  technique résolue, le consentement politique ;
- à droite (desktop) : le récapitulatif collant — montant, ce qui est prélevé
  aujourd'hui, ce qui ne l'est pas, moyen de paiement, CTA ;
- en bas (mobile) : **barre collante** — modèle `48` — portant le total et le
  CTA, avec le détail dépliable au-dessus ;
- squelette dessiné : la carte d'offre, les lignes de spécification, le bloc de
  montant.

Pour FLEX, le récapitulatif porte **les deux montants et le total en cas de
réussite**, sur trois lignes distinctes et nommées.

### 24.2 `/checkout/success`

État de succès (§19), puis progression de provisionnement étapée (§13.5), puis
`nextAction` serveur comme CTA unique.

### 24.3 `/checkout/echec`

Trois causes distinctes, trois traitements : refus du moyen de paiement,
abandon, erreur technique. Chacune dit ce qu'il faut faire. La reprise ne crée
jamais une seconde commande (§37).

### 24.4 `/checkout/sandbox-pay`

Surface de test. Elle reste visuellement cohérente et **clairement identifiée
comme environnement de test**, sans ambiguïté possible avec un paiement réel.

---

## 25. Routes plateforme

L'échelle de matière du Hub (§7.1) est déjà en place dans `globals.css`. Ce qui
manque, ce sont les composants qui l'exploitent.

### 25.1 `/bienvenue`

Première ouverture après création de compte. Une seule chose à faire, dite en
une phrase, avec l'objet correspondant. Pas un tableau de bord vide.

### 25.2 `/hub`

**Accroche :** la carte de compte actif, et le corridor de risque.

Composition, synthèse de `22`, `23` et `14` :

- **bandeau haut** : salutation, sélecteur de compte, heure de réinitialisation
  quotidienne en compte à rebours, CTA principal ;
- **rangée de KPI** : quatre à cinq tuiles, **une seule remplie cobalt** — celle
  qui porte l'action attendue. Chaque tuile a une valeur, un libellé, et une
  **sous-légende de deux lignes** qui explique la valeur (modèle `40`) ;
- **carte d'état** : si le compte a une action en attente, elle occupe une bande
  pleine largeur avec son rôle sémantique ;
- **progression** : cinq barres étiquetées — objectif, Perte maximale, Journées
  Performance, cohérence, exposition — chacune avec `courant / cible` au-dessus
  et le pourcentage coloré selon l'état en dessous (modèle `22`) ;
- **corridor de risque** : `WaribaRiskScene`, deux bords, marqueur de position
  (modèle `15`) ;
- **score de santé** : anneau + **qualificatif en mots**. Un score seul est
  froid ; un score plus une phrase est un conseil ;
- **actions rapides** : trois maximum, en rail latéral desktop, en cartes
  mobile (modèle `51`).

Rail latéral : 244 px déplié, 72 px replié, infobulle au survol en mode replié,
déconnexion ancrée en bas (modèle `07` / `26`). Mobile : barre d'onglets fixe de
70 px, contenu réservant sa hauteur plus le `safe-area-inset`.

### 25.3 `/comptes` et `/comptes/nouveau`

Liste : filtres en segments (`Tous / Évaluation / Performance / Clos`), puis une
carte par compte, modèle `14` + `15` :

- titre, pastille d'état, date de dernière activité, identifiant en monospace
  aligné à droite ;
- quatre colonnes de métriques séparées par un filet fin ;
- badges de configuration (`EOD`, `ONE`, `FLEX`, `INSTANT`) ;
- corridor de risque compact ;
- `Voir le détail` en bouton fantôme aligné à droite.

État vide : §17.

`/comptes/nouveau` réutilise le configurateur de `/offres` (§22.2).

### 25.4 `/comptes/[publicId]/regles`

**Accroche :** chaque règle est une scène, pas une ligne.

Les règles épinglées au compte, dans l'ordre d'importance, chacune avec sa
valeur, son état courant, et une phrase qui explique ce qui se passe si elle est
franchie. La version de politique épinglée est affichée, discrètement mais
lisiblement.

### 25.5 `/comptes/[publicId]/bienvenue-performance`

Moment de passage. Il mérite une célébration courte (§19) et une explication
claire de ce qui change : nouvelles règles, nouveaux paliers, nouvelle échelle
de partage.

### 25.6 `/performance`

**Accroche :** le graphique, en tant que plus grande surface ininterrompue de
l'écran.

- graphique équité / solde avec pastille `LIVE` si le flux est actif
  (modèle `32`) ;
- infobulle à deux séries datées ;
- légende en pastilles circulaires ;
- en dessous, la grille de KPI avec sous-légendes (modèle `40`) ;
- mélange d'outcomes en **barre horizontale empilée**, pas en camembert ;
- contributions signées par instrument, ligne de zéro visible ;
- squelette : les axes et le cadre sont dessinés, seule la série manque.

### 25.7 `/journal`

Table dense, lisible, chiffres tabulaires, filtres en segments, et une ligne de
détail dépliable. Pas de squelette plein écran au changement de filtre : seules
les lignes se rechargent.

### 25.8 `/payouts`

**Accroche :** `WaribaPayoutLadder`.

Paliers, plafond de la taille, cycle en cours, historique. Aucune preuve de
paiement client tant qu'il n'y en a pas de réelle — les exemples sont étiquetés
comme illustration de règle.

### 25.9 `/facturation`

Modèle `24` + `30`, en plus sobre : moyens de paiement en cartes, commandes en
table filtrable, reçus téléchargeables. Chiffres tabulaires, états en pastilles
sémantiques.

### 25.10 `/parametres`, `/plus`, `/verification-identite`

- `/parametres` : liste de sections à gauche, détail à droite (modèle `39`) ;
  chaque réglage porte une phrase d'explication, pas seulement un libellé ;
- `/plus` : point d'entrée mobile vers les surfaces secondaires, en liste de
  navigation nette ;
- `/verification-identite` : progression étapée, états de document clairs, et
  la raison de chaque demande expliquée.

---

## 26. Support et contestations

Modèle de composition : `44`, en retirant toute promesse de disponibilité non
tenue.

- `/support` : canaux réellement disponibles, chacun avec son état réel ; centre
  d'aide mis en avant avant le formulaire ;
- `/support/nouveau` : formulaire court, catégorie, pièce jointe, et une
  estimation honnête du délai — ou aucune estimation ;
- `/support/demandes/[publicId]` : fil de conversation, état en pastille,
  horodatage ;
- `/support/contestations/nouvelle` : la procédure est expliquée **avant** le
  formulaire — ce qui est contestable, sous quel délai, avec quelles pièces ;
- `/support/contestations/[publicId]` : chronologie d'instruction, état, décision
  quand elle existe.

---

## 27. `/trade` — WariX

Le poste de travail garde sa densité propre. Il ne prend pas les rayons ni les
espacements du marketing.

Travail attendu :

- l'échelle de matière à cinq niveaux est appliquée jusqu'au bout ;
- la sélection est une **surface**, jamais seulement un contour coloré ;
- rafraîchissement de données : jamais de squelette plein écran, seules les
  cellules concernées s'atténuent ;
- refus d'ordre : bordure rouge 240 ms + raison lisible, aucune secousse ;
- mobile : le poste de travail a une composition qui lui est propre, pas une
  réduction du bureau (§30) ;
- toute donnée de démonstration est étiquetée comme telle.

---

## 28. Exploitation — `/control`

Control n'est pas une surface client, mais c'est une surface WARIBA. Elle a le
droit d'être dense ; elle n'a pas le droit d'être laide ni ambiguë.

Vingt-six sous-routes existent : comptes, actuariat, audit, commercial,
contestations, identité, incidents, intégrité, opérations de marché, revues de
passage, versements, politiques, support, équipe, trading, trésorerie,
utilisateurs.

Règles pour l'ensemble :

- **échelle de matière du poste de travail**, pas celle du marketing : rayons
  6–10 px, densité haute, chiffres tabulaires partout ;
- **une grammaire de table unique** — même en-tête, même tri, même pagination,
  même filtre en segments, même ligne dépliable. Aujourd'hui chaque sous-route
  a tendance à réinventer sa table ; c'est la première chose à consolider ;
- **les rôles sémantiques portent le même sens qu'ailleurs** : l'ambre est une
  attente, le rouge est une rupture, jamais l'inverse ;
- **toute action irréversible** — annulation, remboursement, disqualification,
  publication de politique — passe par une confirmation qui répète l'effet en
  clair et nomme la cible ;
- **toute décision est tracée** : qui, quand, sur quelle version de politique ;
- les états de chargement suivent le §13 : squelette à la forme de la table,
  jamais un spinner de page ;
- les états vides suivent le §17, même sur une file d'attente vide — surtout sur
  une file d'attente vide, parce qu'un opérateur doit pouvoir distinguer
  « rien à traiter » de « la donnée n'a pas chargé ».

Modèle de composition pour les écrans de réglage et de politique : `39` — liste
de sections à gauche, détail à droite, actions `Annuler` / `Enregistrer` ancrées
en haut à droite du panneau de détail.

---

## 29. Routes système

Ce sont les routes qu'on voit au pire moment. Elles méritent autant de soin que
l'accueil, et elles en reçoivent généralement zéro.

Gabarit commun : canevas quasi noir, objet signature en version atténuée,
titre display L, une phrase d'explication, une phrase d'orientation, un CTA
principal, un lien secondaire. Centré, respirant, jamais un texte nu sur fond
blanc.

| Route | Ce qu'elle dit | Action |
|---|---|---|
| `/403` | « Cette page ne vous est pas accessible. » — sans révéler ce qu'elle contient | Retour au Hub |
| `/erreur` | « Quelque chose s'est mal passé de notre côté. » + référence d'incident courte | Réessayer · Contacter le support |
| `/hors-ligne` | « Vous n'êtes plus connecté au réseau. » + ce qui reste consultable | Réessayer |
| `/maintenance` | « WARIBA est en maintenance. » + fenêtre estimée si elle est connue, sinon rien | Voir l'état du service |

Une page 404 est également requise, au même gabarit, avec une orientation utile
plutôt qu'un renvoi sec vers l'accueil.

Interdits : trace technique visible, code d'erreur seul, illustration
humoristique, page blanche du framework.

---

## 30. Mobile

### 28.1 Le mobile n'est pas un desktop rétréci

C'est la leçon des références `04`, `06`, `16`, `18`, `20` : les meilleures
versions mobiles **changent de composition**, elles ne compriment pas.

Transformations autorisées et attendues :

| Desktop | Mobile |
|---|---|
| Matrice comparative à colonnes | tableau à 3 colonnes, celle du milieu surélevée (`06`) |
| Rail de résumé collant | barre collante en bas |
| Récit défilant épinglé | pile de cartes en aplat |
| Grille de KPI 4 colonnes | 2 colonnes, la tuile héroïque en pleine largeur |
| Menu de navigation | feuille plein écran |
| Table dense | cartes empilées |
| Rail latéral | barre d'onglets fixe |

### 28.2 Tailles auditées

```
320 × 568    360 × 800    375 × 812    390 × 844    430 × 932
768 × 1024   1024 × 768   1280 × 800   1366 × 768   1440 × 900   1920 × 1080
```

320 px est une contrainte réelle, pas théorique. Aucun débordement horizontal à
aucune de ces largeurs.

### 28.3 Règles dures

- cible tactile ≥ 44 × 44 px ;
- marge latérale 20–24 px ;
- `env(safe-area-inset-*)` respecté en haut et en bas ;
- une barre fixe réserve toujours sa hauteur dans le contenu ;
- pas de survol comme seul moyen d'accéder à une information ;
- les feuilles se ferment au geste et à la touche Échap ;
- le clavier virtuel ne masque jamais le champ actif ni son CTA.

---

## 31. Accessibilité

- WCAG 2.2 AA sur toutes les routes clientes ;
- contrastes du §5.5 ;
- focus **visible** partout : anneau cobalt 2 px, décalé de 2 px, jamais
  supprimé ;
- ordre de tabulation logique, pièges de focus dans les modales, restitution du
  focus à la fermeture ;
- toute icône seule porte un nom accessible ;
- les régions dynamiques annoncent leurs changements (`aria-live="polite"` pour
  les mises à jour de données, `assertive` uniquement pour les erreurs
  bloquantes) ;
- les graphiques ont une alternative textuelle ou un tableau de données
  équivalent ;
- les squelettes restent `aria-hidden` ;
- `prefers-reduced-motion` honoré (§15) ;
- le configurateur est entièrement utilisable au clavier — flèches dans les
  groupes de pastilles, Entrée pour sélectionner ;
- la langue du document est `fr`.

---

## 32. Performance

Budgets, mesurés sur la construction de production :

| Métrique | Cible |
|---|---|
| LCP mobile 4G | < 2.5 s |
| INP | < 200 ms |
| CLS | < 0.05 |
| JS initial par route publique | < 180 Ko compressé |
| Objet signature le plus lourd | < 120 Ko |
| Police | 2 familles maximum, `font-display: swap`, préchargement du display |

Règles :

- aucun objet lourd ne bloque le premier rendu ;
- les images sont en AVIF/WebP, dimensionnées, `loading="lazy"` hors du premier
  écran ;
- les animations n'animent que `transform` et `opacity` ;
- pas de `will-change` permanent ;
- les boucles hors écran sont mises en pause (`useInView`) ;
- la maquette produit du héros est différée après le premier rendu utile.

---

# Partie VI — La vérité produit

## 33. Assertions produit V2

Ces valeurs sont des **assertions de test** contre le catalogue canonique. Ce ne
sont pas des constantes d'interface.

**ONE** — Évaluation requise · objectif 8 % · Limite quotidienne 3 % souple ·
Perte maximale 8 % EOD suiveuse · Meilleure journée 35 % · réserve 2 % ·
exposition 3× · 5 Journées Performance · journée qualifiante à +0,50 % ·
échelle de partage 80/80/85/85/90.

**FLEX** — Évaluation requise · objectif 4 % · Limite quotidienne 3 % souple ·
Perte maximale 6 % EOD suiveuse · Meilleure journée 35 % · réserve 3 % ·
exposition 3× · premier paiement immédiat · montant d'activation gelé à l'achat ·
Performance uniquement après paiement d'activation réussi · 5 Journées
Performance · +0,50 % · 80/80/85/85/90.

**INSTANT** — pas d'Évaluation · Performance directe · Limite quotidienne 2 %
souple · Perte maximale 5 % EOD suiveuse · Meilleure journée 30 % · réserve 3 % ·
exposition 2× · 5 Journées Performance · +0,50 % · 80/80/85/85/90.

Les combinaisons 5K / 10K / 25K / 50K / 100K restent au catalogue public quand
la disponibilité à l'achat le permet.

## 34. Assertions de prix

À vérifier contre le modèle de lecture canonique. Jamais en dur dans l'interface.

| Taille | ONE | FLEX (aujourd'hui + activation) | INSTANT |
|---|---|---|---|
| 5K | 19 900 | 9 900 + 25 900 | 39 900 |
| 10K | 34 900 | 14 900 + 39 900 | 59 900 |
| 25K | 69 900 | 24 900 + 109 900 | 99 900 |
| 50K | 119 900 | 34 900 + 184 900 | 169 900 |
| 100K | 199 900 | 44 900 + 269 900 | 279 900 |

Montants en XOF. Le total FLEX en cas de réussite est visible, dérivé du serveur
ou calculé en décimal exact à partir de valeurs immuables. Aucun prix barré,
aucune remise fictive.

## 35. Catalogue

Quinze offres. Le catalogue public affiche l'intégralité de ce que le serveur
expose, sans filtrage côté client. Une offre retirée a son état d'erreur conçu
(§18), elle ne disparaît pas silencieusement.

## 36. Interdiction des constantes financières

Interdit dans tout composant client :

```ts
const OBJECTIF_ONE = 8
const OBJECTIF_FLEX = 4
const QUOTIDIEN_INSTANT = 2
const PREMIER_PALIER = 80
```

La règle vaut pour : prix, montant d'activation, objectif, Limite quotidienne,
Perte maximale, Meilleure journée, réserve, effet de levier, exposition,
partage, plafond de versement, version de politique, fenêtre d'activation,
action suivante.

## 37. Paiement

- l'état de paiement fait autorité côté serveur ; l'interface n'en déduit rien ;
- un rappel dupliqué ne crée jamais un second compte ni une seconde commande ;
- la reprise après échec est idempotente ;
- l'état « inconnu » existe et a son traitement — il ne se traduit ni par
  « réussi » ni par « échoué » ;
- la fenêtre d'activation FLEX et son expiration sont des états serveur.

## 38. `nextAction`

L'action suivante affichée au client vient du serveur. L'interface ne la
recalcule pas, ne la devine pas, et n'en affiche jamais deux en concurrence.

## 39. Restauration d'état

- le configurateur est **restaurable par URL** : famille, taille, options ;
- un partage de lien reproduit exactement l'écran ;
- l'authentification conserve la destination (`return-to`) à travers la
  connexion, l'inscription et l'expiration de session ;
- les UTM survivent au parcours d'achat.

## 40. Consentement

L'identité de la politique consentie est enregistrée au moment de l'achat :
version, horodatage, portée. L'interface affiche laquelle, lisiblement.

## 41. Avertissement de trading simulé

Affiché clairement **avant** l'achat, dans les termes juridiques déjà validés du
dépôt.

Ne jamais laisser entendre : un dépôt chez un courtier, un capital réel confié,
un revenu garanti, un salaire, un versement garanti, un rendement
d'investissement.

---

# Partie VII — La langue

## 42. Écriture UX française

### 40.1 Le ton

WARIBA parle à des traders, en français, comme un professionnel qui respecte son
interlocuteur. Ni familier, ni administratif.

Trois règles :

1. **On dit ce qui se passe, pas ce que le système fait.**
   Non : « La requête de provisionnement a été soumise. »
   Oui : « Votre compte est en cours de création. »

2. **On donne l'action avant l'explication quand il y a urgence, l'explication
   avant l'action quand il y a un choix.**

3. **On ne fait pas de phrase là où un mot suffit, et on ne coupe pas une phrase
   qui a besoin d'exister.**

### 40.2 Vocabulaire

| À utiliser | À bannir de l'interface client |
|---|---|
| Limite quotidienne | DLL, daily loss limit |
| Perte maximale | MLL, max loss, drawdown |
| Meilleure journée | best day, consistency |
| Réserve de sécurité | buffer, buffer floor |
| Journées Performance | performance days |
| Profit éligible | eligible profit |
| Exposition totale | gross exposure |
| Compte Performance | funded account |
| Montant d'activation | activation fee |
| Objectif de performance | profit target |
| Suiveuse en fin de journée | EOD trailing |
| Version de règles | policy version |

`HWM`, `policy gate`, `eligibility engine`, `read model`, `nextAction` :
vocabulaire interne, jamais affiché.

### 40.3 Mécanique de la langue

- typographie française : espace insécable avant `: ; ! ?` et `%` ;
- séparateur de milliers : espace insécable — `199 900 FCFA` ;
- décimale : virgule — `+0,50 %` ;
- guillemets français « … » dans la prose ;
- dates en toutes lettres dans la prose, format court dans les tables ;
- pas de majuscule en milieu de phrase sauf sur les termes produit définis
  (Journées Performance, Compte Performance, Perte maximale) ;
- écriture inclusive : formulation neutre par défaut (« votre compte », « la
  personne qui trade »), jamais de point médian.

### 40.4 Boutons

Un verbe à l'infinitif, deux à trois mots.

Oui : `Commencer`, `Choisir cette taille`, `Payer 24 900 FCFA`,
`Demander un versement`, `Comprendre les règles`.

Non : `Soumettre`, `OK`, `Cliquez ici`, `En savoir plus` répété six fois sur la
même page.

### 40.5 Messages d'erreur

Structure en trois temps, toujours :

```
Ce qui s'est passé.     Le paiement n'a pas abouti.
Ce que ça implique.     Aucun montant n'a été prélevé.
Ce qu'il faut faire.    [Réessayer]  ou  [Changer de moyen de paiement]
```

Jamais de code technique seul. Jamais de « Une erreur est survenue » sans suite.

### 40.6 Passe de relecture

Une passe de relecture complète est exécutée sur **tous** les textes clients :
public, authentifié, commerce, erreurs, états vides, courriels, infobulles,
libellés de formulaire, messages de validation. Les incohérences de vocabulaire
sont corrigées globalement, pas route par route.

---

# Partie VIII — Qualité et livraison

## 43. Revue visuelle adverse

Pour chaque écran principal, répondre :

1. Comprend-on la route en 5 secondes ?
2. Floutée, est-elle reconnaissable comme WARIBA ?
3. Quelle est son accroche visuelle ?
4. Y a-t-il une section réduite à « texte + bordure » ?
5. Deux sections consécutives partagent-elles la même composition ?
6. Y a-t-il plus d'une surface cobalt pleine par section ?
7. La version mobile change-t-elle de composition, ou compresse-t-elle ?
8. Les quatre états — chargement, vide, erreur, contenu — existent-ils ?
9. Une animation explique-t-elle quelque chose, ou décore-t-elle ?
10. Une affirmation invérifiable est-elle affichée ?

Toute réponse défavorable est un défaut à corriger, pas à documenter.

## 44. QA d'accroche visuelle

Pour chaque route de la matrice du §21, vérifier que l'accroche déclarée est
effectivement présente dans le rendu, à 1440 px **et** à 390 px.

## 45. Preuves

Captures générées après gel du candidat, puis **inspectées à l'œil**. Une
capture contenant un `[data-skeleton]` visible, un texte tronqué, un
débordement, ou un état de chargement, est rejetée.

**Public** — accueil, `/offres` par famille, ONE, FLEX, INSTANT, `/programme`,
`/warix`, `/aide`, une page légale. En 1440 et 390. FLEX également en 320.

**Authentification** — connexion, inscription, mot de passe oublié,
récupération, vérification e-mail, session expirée. En 1440 et 390.

**Commerce** — récapitulatif ONE, FLEX, INSTANT ; paiement en attente, réussi,
échoué ; provisionnement ; échec de provisionnement ; activation FLEX.

**Plateforme** — bienvenue, Hub, comptes, détail de compte, règles de compte,
Performance, journal, versements, facturation, paramètres, vérification
d'identité.

**Support** — support, nouvelle demande, demande, nouvelle contestation.

**WariX** — bureau et mobile.

**Control** — un état représentatif.

**États transverses** — un squelette par famille de surface, un état vide, un
état d'erreur, un rendu en mouvement réduit.

## 46. Livrables de conception

```
docs/05-design/WARIBA_ROUTE_VISUAL_HOOK_MATRIX_V1.md
docs/05-design/WARIBA_COLOR_AND_SEMANTIC_SYSTEM.md      (mis à jour)
docs/05-design/WARIBA_MOTION_SYSTEM.md                  (mis à jour)
docs/05-design/WARIBA_SKELETON_AND_LOADING_SYSTEM.md    (nouveau)
docs/05-design/WARIBA_SIGNATURE_ASSETS.md               (nouveau)
docs/05-design/WARIBA_UX_WRITING_FR.md                  (nouveau)
```

## 47. Livrables techniques

- tokens consolidés, aucun hexadécimal dans un composant de route ;
- `Skeleton` étendu : balayage cobalt, décalage en cascade, variantes de forme ;
- primitives de mouvement partagées dans `packages/ui` ;
- objets signature dans `packages/ui`, avec repli statique ;
- composants de configurateur, de matrice comparative, de carte de compte, de
  corridor de risque, d'échelle de versement.

## 48. QA navigateur

Chemin de construction de production, conformément à la convention du dépôt.

Scénarios minimaux :

- catalogue 15/15 ;
- configurateur restaurable par URL ;
- destination conservée à travers l'authentification ;
- achat ONE de bout en bout ;
- FLEX : paiement initial ;
- FLEX : réussite → activation, montant gelé vérifié ;
- rappel de paiement dupliqué ;
- INSTANT : accès direct à la Performance ;
- échec de paiement puis reprise ;
- récapitulatif en mobile 320 ;
- configurateur au clavier seul ;
- changement de compte ;
- rendu en `prefers-reduced-motion` ;
- passe d'accessibilité automatisée sur les routes clientes.

Aucune assertion n'est affaiblie pour faire passer une porte. Un défaut de
harnais se corrige dans le harnais et se documente.

## 49. Portes techniques

```
format
lint
typecheck
build
unit
property
integration
e2e
check:tokens
a11y
```

Toutes vertes avant le rapport final.

## 50. Commits

- atomiques, un sujet par commit ;
- messages en français, format conventionnel ;
- ordre : tokens → primitives → objets → composants → routes → preuves → docs ;
- **aucun push, aucune PR, aucun déploiement**.

Exemples :

```
feat(design): consolider l'échelle de matière et le budget de saturation cobalt
feat(ui): donner au squelette la forme de ce qu'il attend
feat(offres): faire du configurateur un objet qui résout les règles en direct
fix(flex): montrer les deux montants ensemble, jamais l'un sans l'autre
```

---

## 51. Critères d'acceptation

### Global

```
ROUTE_MAJEURE_A_DOMINANTE_BEIGE            = 0
ROUTE_MAJEURE_BLANC_SAAS_GENERIQUE         = 0
SECTION_SANS_ACCROCHE_VISUELLE             = 0
COMPOSITIONS_IDENTIQUES_CONSECUTIVES       = 0
SURFACE_COBALT_PLEINE_PAR_SECTION          ≤ 1
HEXADECIMAL_DANS_COMPOSANT_DE_ROUTE        = 0
LIEN_MORT                                  = 0
```

### Mouvement et chargement

```
CONTENEUR_ANIME_EN_TRANSLATION_> 24px      = 0
COMPTEUR_TYPE_MACHINE_A_SOUS               = 0
SQUELETTE_GENERIQUE_RECTANGULAIRE          = 0
SAUT_DE_MISE_EN_PAGE_A_L_ARRIVEE_DONNEE    = 0
SPINNER_INFINI                             = 0
ROUTE_SANS_ETAT_DE_CHARGEMENT_DESSINE      = 0
ROUTE_CASSEE_EN_MOUVEMENT_REDUIT           = 0
```

### Produit et commerce

```
CONSTANTE_FINANCIERE_EN_DUR                = 0
PRIX_BARRE_OU_REMISE_FICTIVE               = 0
FLEX_AVEC_UN_SEUL_MONTANT_VISIBLE          = 0
AFFIRMATION_INVERIFIABLE                   = 0
CATALOGUE_INCOMPLET                        = 0
```

### Langue

```
SIGLE_INTERNE_AFFICHE_AU_CLIENT            = 0
MESSAGE_D_ERREUR_SANS_ACTION               = 0
ETAT_VIDE_DISANT_AUCUNE_DONNEE             = 0
```

### Accessibilité et mobile

```
CONTRASTE_SOUS_AA                          = 0
FOCUS_INVISIBLE                            = 0
CIBLE_TACTILE_< 44px                       = 0
DEBORDEMENT_HORIZONTAL_A_320px             = 0
```

---

## 52. Format du rapport final

```
1.  Ce qui a été refait, et pourquoi
2.  Matrice route → accroche : état de couverture
3.  Système de couleur : ce qui a changé dans les tokens
4.  Système de mouvement : primitives livrées
5.  Squelettes : couverture par surface
6.  Objets signature : livrés, différés, abandonnés
7.  Micro-interactions : catalogue implémenté
8.  États vides, erreurs, succès : couverture
9.  Mobile : transformations de composition appliquées
10. Accessibilité : résultats
11. Performance : budgets mesurés
12. Vérité commerce : vérifications passées
13. Langue : passe de relecture, glossaire appliqué
14. Preuves : liste, avec les captures rejetées et pourquoi
15. Portes techniques : résultats
16. Revue visuelle adverse : réponses par route
17. Ce qui reste ouvert, et ce que ça bloque
18. Commits produits
```

## 53. Condition d'arrêt

S'arrêter après le rapport. Ne pas pousser. Ne pas ouvrir de PR. Ne pas
déployer. Ne pas ouvrir l'achat public.

## 54. La barre de qualité

La question finale n'est pas « est-ce que ça compile ».

C'est :

> **Si on met une capture de WARIBA à côté d'une capture de ForTraders, de
> FundedNext ou de FTMO, est-ce qu'un trader voit trois produits sérieux et un
> quatrième qui l'est aussi — ou est-ce qu'il voit trois produits et un site
> web ?**

Tant que la réponse n'est pas la première, la phase n'est pas finie.
