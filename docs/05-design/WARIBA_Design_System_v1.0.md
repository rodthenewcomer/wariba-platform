---
title: "WARIBA Design System"
version: "1.0"
document_id: "WARIBA-DESIGN-SYSTEM"
status: "BASELINE VISUELLE ET UI — PRÊTE POUR ENGINEERING CONSTITUTION ET IMPLÉMENTATION"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
market: "Afrique francophone"
owner: "WARIBA Brand, Product & Design"
source_of_truth_priority: 5
depends_on:
  - "WARIBA Product Master Document v1.0"
  - "WARIBA Program Rulebook v1.0"
  - "WARIBA Financial Model v1.0"
  - "WARIBA UX Architecture v1.0"
next_documents:
  - "WARIBA Engineering Constitution v1.0"
  - "WARIBA System Architecture v1.0"
  - "WARIBA Security QA Operations Standard v1.0"
---

# WARIBA Design System v1.0

> **Quiet Financial Authority.**

## Contrôle du document

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| Produit | WARIBA ONE → WARIBA Performance → WARIBA Review |
| Support initial | Web responsive + PWA |
| Marché initial | Afrique francophone |
| Langue principale | Français |
| État du projet | Dossier créé, aucun code commencé |
| Statut du document | Baseline visuelle avant développement |
| Direction créative | Quiet Financial Authority |
| Interface critique | WARIBA Hub, WARIBA Trade, Performance, Payout, Control |
| Application native | Non en V1 |
| Thèmes | Marketing clair ; Platform adaptative ; Trade sombre par défaut |
| Police interface | Manrope Variable |
| Police données | IBM Plex Mono |
| Référence UX | WARIBA UX Architecture v1.0 |
| Référence règles | WARIBA Program Rulebook v1.0 |

---

# 1. Objet du Design System

Ce document définit l’identité visuelle, les tokens, les composants, les comportements, les règles responsive et les standards de qualité de WARIBA.

Il sert de source de vérité pour :

1. le site public ;
2. WARIBA Hub ;
3. WARIBA Trade ;
4. WARIBA Guardian ;
5. WARIBA Performance ;
6. le Payout Center ;
7. WARIBA Assist ;
8. WARIBA Control ;
9. les emails transactionnels ;
10. les futures interfaces PWA ;
11. les maquettes ;
12. le code frontend ;
13. les tests visuels ;
14. la documentation produit.

Ce document ne remplace pas :

- le Product Master ;
- le Rulebook ;
- l’UX Architecture ;
- l’Engineering Constitution ;
- les règles d’accessibilité ;
- les contrats techniques.

Le Design System ne peut jamais inventer une règle métier.

---

# 2. Vision visuelle

WARIBA doit ressembler à une infrastructure financière sérieuse, moderne et immédiatement crédible.

La plateforme doit communiquer :

- précision ;
- maîtrise ;
- transparence ;
- calme ;
- progression ;
- fiabilité ;
- ambition africaine contemporaine ;
- sophistication sans ostentation.

WARIBA ne doit jamais ressembler à :

- une plateforme crypto spéculative ;
- un casino ;
- un template SaaS générique ;
- un dashboard généré automatiquement ;
- un produit bancaire vieux et bureaucratique ;
- une copie de MT5 ;
- une copie visuelle de Topstep, FTMO ou Tradeify ;
- une application remplie de cartes et de gradients ;
- une marque africaine construite avec des clichés visuels.

---

# 3. Principe central : Quiet Financial Authority

## 3.1 Quiet

L’interface évite :

- bruit visuel ;
- animations gratuites ;
- gradients omniprésents ;
- messages criards ;
- badges décoratifs ;
- grandes ombres floues ;
- couleurs agressives ;
- densité non maîtrisée.

## 3.2 Financial

L’interface privilégie :

- chiffres tabulaires ;
- colonnes alignées ;
- hiérarchie de données ;
- précision des valeurs ;
- provenance des métriques ;
- statuts auditables ;
- timelines ;
- formules consultables ;
- timestamps ;
- comparaisons explicites.

## 3.3 Authority

L’autorité vient de :

- la cohérence ;
- la qualité typographique ;
- l’espace ;
- la maîtrise du contraste ;
- la stabilité des composants ;
- la précision du langage ;
- la qualité des détails ;
- l’absence de promesses exagérées.

---

# 4. Anti-vibe-code manifesto

WARIBA ne doit jamais donner l’impression qu’un agent IA a assemblé un template en quelques heures.

## 4.1 Signes interdits

- gradient violet-bleu en arrière-plan principal ;
- glow autour de chaque carte ;
- verre translucide partout ;
- cartes arrondies à 24–40 px ;
- bento grid répétitive ;
- icône générique dans chaque rectangle ;
- chiffres géants sans contexte ;
- titres marketing vagues ;
- animations de blobs ;
- faux terminal ;
- faux graphique ;
- faux clients ;
- faux investisseurs ;
- logos inventés de partenaires ;
- sections « Trusted by » sans preuve ;
- compteur animé artificiel ;
- dark mode intégral sans respiration ;
- boutons arc-en-ciel ;
- ombres noires lourdes ;
- 15 niveaux de radius ;
- texte gris trop faible ;
- alignements approximatifs ;
- spacing arbitraire ;
- multiples familles de police ;
- emojis dans les états critiques ;
- illustrations 3D génériques ;
- dashboard rempli de cartes dans des cartes ;
- surutilisation de Lucide Icons ;
- couleurs sémantiques utilisées comme couleurs de marque.

## 4.2 Test anti-vibe-code

Une interface WARIBA doit rester crédible :

- sans animation ;
- sans mockup 3D ;
- sans illustration ;
- sans gradient ;
- sans témoignage ;
- avec uniquement sa structure, sa typographie, ses données et ses composants.

---

# 5. Architecture de marque

## 5.1 Marque mère

**WARIBA**

## 5.2 Capacités produit

- WARIBA ONE ;
- WARIBA Hub ;
- WARIBA Trade ;
- WARIBA Guardian ;
- WARIBA Performance ;
- WARIBA Review ;
- WARIBA Assist ;
- WARIBA Control.

Ces noms ne doivent pas devenir huit logos distincts.

## 5.3 Règle de naming

- WARIBA toujours en capitales dans les titres de marque ;
- noms des capacités avec casse normale ;
- jamais `Wariba AI` comme nom principal ;
- jamais `WARIBA Funded` en V1 ;
- jamais `WARIBA Broker` ;
- jamais `WARIBA Casino`, `Game`, `Bet`, `Jackpot`.

---

# 6. Logo — principes

Ce document ne crée pas encore le logo final, mais définit ses contraintes.

## 6.1 Qualités attendues

- simple ;
- reconnaissable ;
- lisible à 16 px ;
- compatible monochrome ;
- utilisable sur fond clair et sombre ;
- sérieux ;
- non cliché ;
- non dépendant d’un gradient ;
- sans symbole crypto ;
- sans flèche de croissance générique ;
- sans bouclier cyber générique ;
- sans bougie de trading évidente ;
- sans carte d’Afrique littérale.

## 6.2 Système de logo

Prévoir :

1. wordmark WARIBA ;
2. symbole compact ;
3. lockup horizontal ;
4. lockup vertical ;
5. version monochrome ;
6. favicon ;
7. app icon PWA.

## 6.3 Zone de protection

Minimum :

```text
clear-space = hauteur du W × 0,5
```

## 6.4 Taille minimum

- wordmark digital : 80 px de large ;
- symbole : 16 px ;
- favicon : 16, 32 et 48 px.

---

# 7. Palette principale

# 7.1 Neutres — Wariba Ink

| Token | Valeur | Usage |
|---|---|---|
| `ink-950` | `#0B0D12` | Fond principal Trade |
| `ink-900` | `#121620` | Surface sombre primaire |
| `ink-850` | `#161A24` | Surface élevée |
| `ink-800` | `#1A1F2B` | Carte sombre |
| `ink-700` | `#272D3A` | Bordure forte sombre |
| `ink-600` | `#3A4251` | Texte désactivé sombre |
| `ink-500` | `#555E6E` | Texte secondaire sombre |
| `ink-300` | `#9AA3B1` | Texte clair secondaire |
| `ink-200` | `#C0C6D0` | Texte clair |
| `ink-100` | `#E3E6EB` | Texte clair fort |
| `ink-50` | `#F4F5F7` | Blanc froid |

## 7.2 Neutres chauds — Wariba Bone

| Token | Valeur | Usage |
|---|---|---|
| `bone-50` | `#F7F3EB` | Fond marketing |
| `bone-100` | `#EEE7DB` | Surface secondaire |
| `bone-150` | `#E8DFD1` | Divider chaud |
| `bone-200` | `#D8CDBC` | Bordure forte |
| `bone-300` | `#C0B29F` | Texte chaud secondaire |
| `bone-700` | `#574F44` | Texte chaud |
| `bone-900` | `#27231E` | Texte fort sur fond clair |

## 7.3 Couleur propriétaire — Wariba Cobalt

| Token | Valeur | Usage |
|---|---|---|
| `cobalt-50` | `#F3F5FF` | Fond information léger |
| `cobalt-100` | `#E6EBFF` | Surface sélection |
| `cobalt-200` | `#CAD4FF` | Bordure focus faible |
| `cobalt-300` | `#9CB0FF` | Focus sombre |
| `cobalt-400` | `#6684FF` | Accent interactif |
| `cobalt-500` | `#3157F5` | CTA principal |
| `cobalt-600` | `#2446D8` | Hover CTA |
| `cobalt-700` | `#1E39AE` | Pressed |
| `cobalt-800` | `#1C328C` | Texte accent clair |
| `cobalt-900` | `#192B70` | Surfaces fortes |

## 7.4 Accent propriétaire — Wariba Copper

| Token | Valeur | Usage |
|---|---|---|
| `copper-50` | `#FBF5F2` | Surface éditoriale |
| `copper-100` | `#F3E3DB` | Fond premium |
| `copper-200` | `#E8C3B3` | Bordure |
| `copper-300` | `#D89A7D` | Accent léger |
| `copper-500` | `#BE6945` | Signature de marque |
| `copper-600` | `#A95838` | Hover |
| `copper-700` | `#87452F` | Texte |
| `copper-900` | `#4B291F` | Fond sombre éditorial |

Le cuivre ne remplace pas le cobalt pour les CTA principaux.

---

# 8. Couleurs sémantiques

## 8.1 Success

| Token | Valeur |
|---|---|
| `success-50` | `#EFF9F5` |
| `success-100` | `#DDF2E8` |
| `success-500` | `#258A61` |
| `success-600` | `#1D704E` |
| `success-700` | `#185C41` |

## 8.2 Warning

| Token | Valeur |
|---|---|
| `warning-50` | `#FFF8EA` |
| `warning-100` | `#FCECCB` |
| `warning-500` | `#C88B25` |
| `warning-600` | `#A96E14` |
| `warning-700` | `#85530D` |

## 8.3 Danger

| Token | Valeur |
|---|---|
| `danger-50` | `#FFF3F3` |
| `danger-100` | `#FBE2E2` |
| `danger-500` | `#C94D4D` |
| `danger-600` | `#A73C3C` |
| `danger-700` | `#843030` |

## 8.4 Information

| Token | Valeur |
|---|---|
| `info-50` | `#F0F6FC` |
| `info-100` | `#DDEAF8` |
| `info-500` | `#3673C9` |
| `info-600` | `#2A5EA8` |
| `info-700` | `#244E88` |

## 8.5 Règle sémantique

Le rouge et le vert ne sont jamais utilisés seuls.

Toujours associer :

- icône ;
- texte ;
- label ;
- valeur ;
- forme ou bordure.

---

# 9. Tokens de thème

# 9.1 Thème clair

```css
--bg-canvas: #F7F3EB;
--bg-surface: #FFFFFF;
--bg-subtle: #EEE7DB;
--bg-elevated: #FFFFFF;

--text-primary: #0B0D12;
--text-secondary: #555E6E;
--text-tertiary: #7B8290;
--text-inverse: #FFFFFF;

--border-subtle: #E4DED4;
--border-default: #D8CDBC;
--border-strong: #9AA3B1;

--action-primary: #3157F5;
--action-primary-hover: #2446D8;
--action-primary-pressed: #1E39AE;
--action-primary-text: #FFFFFF;
```

## 9.2 Thème sombre

```css
--bg-canvas: #0B0D12;
--bg-surface: #121620;
--bg-subtle: #1A1F2B;
--bg-elevated: #202633;

--text-primary: #F4F5F7;
--text-secondary: #C0C6D0;
--text-tertiary: #9AA3B1;
--text-inverse: #0B0D12;

--border-subtle: #272D3A;
--border-default: #3A4251;
--border-strong: #555E6E;

--action-primary: #6684FF;
--action-primary-hover: #829AFF;
--action-primary-pressed: #9CB0FF;
--action-primary-text: #0B0D12;
```

## 9.3 Usage des thèmes

- marketing : clair par défaut ;
- Hub : clair ou sombre selon préférence future ;
- Trade : sombre par défaut ;
- Control : clair par défaut ;
- emails : clair ;
- états critiques : indépendants du thème.

---

# 10. Contraste

## 10.1 Cible

WCAG 2.2 AA minimum.

## 10.2 Règles

- texte normal : contraste ≥ 4,5:1 ;
- grand texte : ≥ 3:1 ;
- composants interactifs : ≥ 3:1 ;
- focus : visible sur chaque surface ;
- texte secondaire jamais trop pâle ;
- labels critiques jamais en Stone 300 sur Bone 50 ;
- chart labels testés sur les deux thèmes.

---

# 11. Typographie

## 11.1 Famille principale

**Manrope Variable**

Usage :

- navigation ;
- titres ;
- paragraphes ;
- boutons ;
- formulaires ;
- tableaux ;
- notifications ;
- marketing.

Fallback :

```css
font-family:
  "Manrope",
  "Inter",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

## 11.2 Famille données

**IBM Plex Mono**

Usage limité :

- prix ;
- balance ;
- equity ;
- PnL ;
- order ID ;
- account ID ;
- timestamps ;
- table de trades ;
- formules ;
- logs.

Fallback :

```css
font-family:
  "IBM Plex Mono",
  "SFMono-Regular",
  Consolas,
  monospace;
```

## 11.3 Règles

- maximum deux familles ;
- chiffres tabulaires obligatoires ;
- décimales alignées ;
- aucune police display décorative ;
- aucune police serif en V1 ;
- aucune fausse graisse synthétique ;
- poids 400, 500, 600 et 700 uniquement.

---

# 12. Échelle typographique

| Token | Taille | Line-height | Poids | Usage |
|---|---:|---:|---:|---|
| `display-xl` | 64 px | 68 px | 600 | Hero exceptionnel desktop |
| `display-lg` | 52 px | 58 px | 600 | Hero |
| `display-md` | 42 px | 48 px | 600 | Page marketing |
| `heading-xl` | 34 px | 40 px | 600 | Titre page |
| `heading-lg` | 28 px | 34 px | 600 | Section |
| `heading-md` | 22 px | 28 px | 600 | Carte principale |
| `heading-sm` | 18 px | 24 px | 600 | Sous-section |
| `body-lg` | 18 px | 28 px | 400 | Introduction |
| `body-md` | 16 px | 24 px | 400 | Corps |
| `body-sm` | 14 px | 20 px | 400 | Secondaire |
| `label-md` | 14 px | 18 px | 600 | Bouton / label |
| `label-sm` | 12 px | 16 px | 600 | Badge |
| `data-lg` | 24 px | 30 px | 500 | Balance |
| `data-md` | 16 px | 22 px | 500 | Prix / table |
| `data-sm` | 12 px | 16 px | 500 | Timestamp |

## 12.1 Mobile

Le display mobile ne descend pas sous 38 px pour un hero principal.

Le corps mobile ne descend pas sous 15 px.

Les données critiques ne descendent pas sous 14 px.

---

# 13. Chiffres et données

## 13.1 Tabular numbers

```css
font-variant-numeric: tabular-nums;
```

## 13.2 Monnaie

- FCFA : `27 900 FCFA` ;
- USD : `10 000 USD` ;
- PnL : `+125,40 USD` ;
- pourcentage : `40,0 %` ;
- levier : `1:30`.

## 13.3 Décimales

Le nombre de décimales dépend de l’instrument.

Ne pas afficher des décimales inutiles sur les montants en FCFA.

## 13.4 Signe

Toujours afficher `+` pour un PnL positif dans les contextes de comparaison.

## 13.5 Zéro

Utiliser `—` pour absence de valeur.

Utiliser `0` uniquement lorsqu’il s’agit d’une valeur réellement calculée.

---

# 14. Grille

# 14.1 Marketing desktop

- 12 colonnes ;
- largeur maximum : 1320 px ;
- gutter : 24 px ;
- marge : 32 px ;
- contenu éditorial : 720–800 px.

## 14.2 Platform desktop

- 12 colonnes ;
- largeur fluide ;
- sidebar : 240 px ;
- sidebar compacte : 72 px ;
- content gutter : 24 px.

## 14.3 Trade desktop

- pleine largeur ;
- watchlist : 260–320 px ;
- order ticket : 300–360 px ;
- chart flexible ;
- bottom panel : 260–360 px.

## 14.4 Mobile

- 4 colonnes ;
- marge : 16 px ;
- gutter : 12 px ;
- aucun contenu critique hors écran horizontal.

## 14.5 Tablette

- 8 colonnes ;
- marge : 20–24 px ;
- gutter : 16–20 px.

---

# 15. Espacement

Base 4 px.

| Token | Valeur |
|---|---:|
| `space-0` | 0 |
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-5` | 20 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-10` | 40 px |
| `space-12` | 48 px |
| `space-16` | 64 px |
| `space-20` | 80 px |
| `space-24` | 96 px |
| `space-32` | 128 px |

## 15.1 Règles

- pas de valeur arbitraire ;
- spacing interne carte : 16, 20 ou 24 px ;
- section marketing : 80–128 px desktop ;
- section mobile : 56–80 px ;
- densité Trade plus compacte : 8–16 px.

---

# 16. Radius

| Token | Valeur | Usage |
|---|---:|---|
| `radius-none` | 0 | Tables / charts |
| `radius-xs` | 4 px | Badge compact |
| `radius-sm` | 8 px | Input / contrôle |
| `radius-md` | 10 px | Bouton |
| `radius-lg` | 12 px | Carte |
| `radius-xl` | 16 px | Grande surface |
| `radius-2xl` | 20 px | Modal majeure |

Interdit :

- radius > 20 px dans le produit principal ;
- pill shape pour tous les composants ;
- cartes à 32 px de radius.

---

# 17. Bordures

## 17.1 Épaisseur

- standard : 1 px ;
- sélection forte : 2 px ;
- focus : 2 px ;
- divider : 1 px.

## 17.2 Usage

La hiérarchie repose sur :

1. espace ;
2. fond ;
3. bordure ;
4. typographie ;
5. ombre en dernier recours.

---

# 18. Ombres

## 18.1 Tokens

```css
--shadow-xs: 0 1px 2px rgba(11, 13, 18, 0.06);
--shadow-sm: 0 2px 8px rgba(11, 13, 18, 0.08);
--shadow-md: 0 8px 24px rgba(11, 13, 18, 0.12);
--shadow-lg: 0 16px 48px rgba(11, 13, 18, 0.18);
```

## 18.2 Usage

- dropdown : `shadow-sm` ;
- modal : `shadow-md` ;
- floating order ticket mobile : `shadow-lg` ;
- carte normale : aucune ombre.

---

# 19. Motion

## 19.1 Durées

| Token | Durée |
|---|---:|
| `motion-instant` | 80 ms |
| `motion-fast` | 120 ms |
| `motion-default` | 180 ms |
| `motion-slow` | 280 ms |
| `motion-celebration` | 420 ms max |

## 19.2 Easing

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-enter: cubic-bezier(0, 0, 0, 1);
--ease-exit: cubic-bezier(0.3, 0, 1, 1);
```

## 19.3 Règles

- pas d’animation pendant fill critique ;
- pas de compteur animé sur balance ;
- pas de prix qui glisse avec motion lente ;
- feedback immédiat sur ordre ;
- motion réduite respectée ;
- animations de succès discrètes ;
- aucune confetti dans Trade.

---

# 20. Iconographie

## 20.1 Style

- trait 1,5–1,75 px ;
- angles modérés ;
- proportions cohérentes ;
- 16, 20 et 24 px ;
- remplissage limité ;
- aucune icône décorative sans fonction.

## 20.2 Bibliothèque

Une bibliothèque open source peut servir de base, mais :

- usage contrôlé ;
- sélection cohérente ;
- icônes propriétaires pour Mission, Guardian, Risk Ribbon et Review si nécessaire.

## 20.3 Couleurs

L’icône hérite du texte.

Elle ne porte pas seule la sémantique.

---

# 21. Illustration et photographie

## 21.1 Photographie

Direction :

- traders et équipes réels ;
- environnements modernes ;
- Abidjan contemporain ;
- bureaux, mobilité, technologie ;
- lumière naturelle ;
- cadrages éditoriaux ;
- diversité crédible.

Éviter :

- costume devant gratte-ciel générique ;
- trader criant devant six écrans ;
- mains sur clavier avec faux graphique ;
- clichés « Afrique traditionnelle » ;
- images trop sombres ;
- banque d’images américaine non contextualisée.

## 21.2 Illustration

Usage limité :

- onboarding ;
- empty states ;
- explication d’un processus ;
- schémas.

Style :

- géométrique ;
- éditorial ;
- sobre ;
- sans 3D molle ;
- sans personnages cartoon génériques.

---

# 22. Éléments de données

# 22.1 Carte métrique

Doit contenir :

- label ;
- valeur ;
- unité ;
- contexte ;
- statut ;
- détail accessible.

Ne pas afficher uniquement un nombre géant.

## 22.2 Table

- headers sticky si longue ;
- alignement des nombres à droite ;
- colonnes textuelles à gauche ;
- tri explicite ;
- filtre visible ;
- pagination claire ;
- densité configurable dans Control ;
- état vide ;
- état loading ;
- état erreur.

## 22.3 Timeline

- date/heure ;
- acteur ;
- événement ;
- conséquence ;
- lien détail ;
- correlation ID pour Control.

---

# 23. Graphiques financiers

## 23.1 Couleurs

- chandeliers haussiers : `success-500` ;
- chandeliers baissiers : `danger-500` ;
- bid : `info-500` ;
- ask : `copper-500` ou neutre contrasté ;
- grid : neutre faible ;
- position : cobalt ;
- SL : danger ;
- TP : success.

## 23.2 Règles

- pas de palette arc-en-ciel ;
- pas de glow ;
- labels lisibles ;
- crosshair précis ;
- axis compactes ;
- timezone visible ;
- prix bid/ask distincts ;
- lignes position accessibles.

## 23.3 Charts analytics

- barres et lignes simples ;
- maximum cinq séries ;
- légende lisible ;
- valeurs brutes accessibles ;
- aucune 3D ;
- aucun donut inutile ;
- aucune aire gradient excessive.

---

# 24. Composants fondamentaux

# 24.1 Button

Variantes :

- primary ;
- secondary ;
- tertiary ;
- destructive ;
- ghost ;
- text ;
- icon.

Tailles :

- sm : 32 px ;
- md : 40 px ;
- lg : 48 px.

États :

- default ;
- hover ;
- focus ;
- active ;
- loading ;
- disabled.

Règles :

- label d’action ;
- aucun bouton « OK » ambigu ;
- destructive toujours explicite ;
- loader sans changer la largeur ;
- focus visible.

---

# 24.2 Input

États :

- default ;
- hover ;
- focus ;
- filled ;
- error ;
- disabled ;
- readonly.

Doit inclure :

- label ;
- aide ;
- erreur ;
- suffixe/unité ;
- compteur si nécessaire.

Pas de placeholder comme seul label.

---

# 24.3 Select

- recherche si plus de 8 options ;
- option active visible ;
- clavier ;
- état vide ;
- chargement ;
- taille tactiles.

---

# 24.4 Checkbox

Usage :

- consentement ;
- préférences ;
- sélection multiple.

Les consentements sensibles ne sont jamais précochés.

---

# 24.5 Radio

Usage :

- taille de compte ;
- méthode de paiement ;
- choix unique.

---

# 24.6 Switch

Usage :

- préférence réversible ;
- feature flag Control.

Pas pour accepter une condition légale.

---

# 24.7 Tabs

- maximum cinq visibles ;
- overflow géré ;
- état actif net ;
- URL persistante pour sections majeures ;
- pas de tabs imbriqués multiples.

---

# 24.8 Tooltip

- aide courte ;
- jamais pour information obligatoire ;
- accessible clavier ;
- pas sur mobile comme unique canal.

---

# 24.9 Badge

Variantes :

- neutral ;
- information ;
- success ;
- warning ;
- danger ;
- review.

Usage :

- état ;
- type ;
- policy version.

Pas de badge sur chaque ligne sans utilité.

---

# 24.10 Alert

Structure :

- titre ;
- message ;
- action ;
- dismiss si autorisé.

Niveaux :

- information ;
- success ;
- warning ;
- danger ;
- incident.

---

# 24.11 Toast

Usage :

- confirmation légère ;
- action non critique ;
- résultat rapide.

Pas pour :

- hard breach ;
- payout rejection ;
- paiement majeur ;
- erreur nécessitant action.

---

# 24.12 Modal

Usage limité aux décisions qui exigent interruption.

Interdit :

- contenu long ;
- multi-step lourd ;
- information de règle complète ;
- tableau complexe.

---

# 24.13 Drawer / Bottom Sheet

Mobile :

- order ticket ;
- détail position ;
- filtres ;
- confirmation Close All.

Desktop :

- détail rapide ;
- audit ;
- ticket.

---

# 25. Composants propriétaires WARIBA

# 25.1 Account Context

Affiche :

- programme ;
- taille ;
- identifiant ;
- état ;
- policy version ;
- environnement simulé.

Doit être visible avant toute action sensible.

---

# 25.2 Mission Progress

## Contenu

- étape ;
- objectif ;
- conditions ;
- progression ;
- blocage ;
- prochaine action.

## Variantes

- Evaluation ;
- Performance ;
- Review.

## États

- active ;
- attention ;
- reached ;
- waiting ;
- passed ;
- breached ;
- frozen.

---

# 25.3 Risk Ribbon

## Contenu

- état ;
- DLL restante ;
- Maximum Loss restante ;
- reset ;
- news/weekend ;
- connexion.

## Desktop

Barre horizontale compacte.

## Mobile

Bloc sticky sous le header.

## Couleurs

- normal : neutre/cobalt ;
- attention : warning ;
- proche limite : warning fort ;
- soft lock : danger clair ;
- breach : danger fort ;
- stale : info/neutral.

---

# 25.4 Consistency Meter

Affiche :

- ratio actuel ;
- limite 40 % ;
- meilleure journée ;
- profit total ;
- profit requis pour conformité ;
- évolution.

Ne jamais utiliser une jauge rouge type violation lorsque le ratio dépasse 40 %.

Utiliser :

- statut « En attente de conformité » ;
- guidance mathématique.

---

# 25.5 Qualified Days Tracker

Affiche :

- jours requis ;
- jours finalisés ;
- jours qualifiés ;
- seuil par jour ;
- calendrier ;
- PnL net.

---

# 25.6 Payout Breakdown

Ordre strict :

1. profit net ;
2. limite 50 % ;
3. cap ;
4. Payout Base ;
5. split ;
6. frais ;
7. taux de change ;
8. Trader Cash.

Chaque ligne peut ouvrir la formule.

---

# 25.7 Execution State

États visuels :

- reçu ;
- validé ;
- accepté ;
- exécuté ;
- partiellement exécuté ;
- rejeté ;
- annulé.

Aucun état vague « Processing » sans précision.

---

# 25.8 Policy Version Chip

Affiche :

- numéro ;
- statut ;
- date ;
- lien règle.

Exemple :

```text
Règles 1.0.0
```

---

# 25.9 Evidence Panel

Affiche :

- règle ;
- seuil ;
- valeur ;
- timestamp ;
- événements ;
- conséquence ;
- recours.

---

# 25.10 Reserve Coverage

Control uniquement.

Affiche :

- réserve ;
- payouts 30 jours ;
- couverture ;
- zone ;
- action.

---

# 26. Navigation

# 26.1 Public

Header :

- logo ;
- Offres ;
- Fonctionnement ;
- Règles ;
- Plateforme ;
- Confiance ;
- Aide ;
- Connexion ;
- Commencer.

## 26.2 Platform desktop

Sidebar :

- Hub ;
- Trade ;
- Comptes ;
- Payouts ;
- Aide.

Bas de sidebar :

- notifications ;
- profil ;
- paramètres.

## 26.3 Platform mobile

Bottom navigation :

- Hub ;
- Trade ;
- Comptes ;
- Payouts ;
- Plus.

## 26.4 Control

Sidebar dense :

- Overview ;
- Users ;
- Accounts ;
- Payouts ;
- Treasury ;
- Support ;
- Integrity ;
- Incidents ;
- Audit.

Sections selon rôle.

---

# 27. Marketing website

## 27.1 Fond

Principalement Bone 50.

Sections sombres utilisées avec intention.

## 27.2 Hero

Doit contenir :

- proposition claire ;
- explication compte simulé ;
- CTA ;
- CTA secondaire règles ;
- preuve produit réelle ou prototype étiqueté.

## 27.3 Forme

- typographie forte ;
- image éditoriale ;
- UI product shots ;
- pas de mockup flottant à 45° ;
- pas de gradient plein écran ;
- pas de blobs.

## 27.4 Sections

Alterner :

- contenu éditorial ;
- preuves produit ;
- chiffres vérifiés ;
- règles ;
- tableaux ;
- processus.

---

# 28. WARIBA Hub

## 28.1 Thème

Clair par défaut, compatible sombre futur.

## 28.2 Structure

- page title ;
- account context ;
- next action ;
- mission ;
- risk ;
- activity ;
- support.

## 28.3 Densité

Plus aérée que Trade.

## 28.4 Carte mission

Surface principale, non noyée parmi six cartes égales.

---

# 29. WARIBA Trade

## 29.1 Thème

Sombre par défaut.

## 29.2 Surfaces

- canvas : Ink 950 ;
- panels : Ink 900 ;
- elevated : Ink 850 ;
- borders : Ink 700 ;
- text : Ink 50/200/300.

## 29.3 Densité

Compacte mais lisible.

## 29.4 Priorité

1. prix ;
2. chart ;
3. order ticket ;
4. positions ;
5. risk ribbon ;
6. détails secondaires.

## 29.5 Interdictions

- marketing ;
- upsell ;
- animation publicitaire ;
- popups non critiques ;
- academy invasive ;
- support chat ouvert par défaut.

---

# 30. Payout Center

## 30.1 Ton

Clair, neutre, non festif.

## 30.2 Couleurs

- cobalt pour action ;
- success uniquement après paiement ;
- warning pour action requise ;
- danger pour rejet motivé.

## 30.3 Breakdown

Surface éditoriale claire.

## 30.4 Confirmation

Modal ou page dédiée selon complexité.

---

# 31. WARIBA Control

## 31.1 Thème

Clair par défaut.

## 31.2 Densité

Plus élevée que Platform.

## 31.3 Tableau

- colonnes configurables ;
- filtres ;
- recherche ;
- vues sauvegardées futures ;
- actions contextualisées ;
- aucune action universelle.

## 31.4 Actions sensibles

- couleur destructive ;
- raison obligatoire ;
- confirmation ;
- permission ;
- audit ;
- double approbation selon seuil.

---

# 32. États globaux

Chaque composant critique doit posséder :

- loading ;
- loaded ;
- empty ;
- partial ;
- stale ;
- offline ;
- disabled ;
- unauthorized ;
- forbidden ;
- error ;
- maintenance ;
- incident ;
- read-only.

Le Design System doit documenter les captures de chaque état.

---

# 33. Skeletons

## 33.1 Règles

- refléter la structure réelle ;
- animation subtile ;
- aucun faux chiffre ;
- pas de skeleton pendant plus de quelques secondes sans message.

## 33.2 Trade

- chart placeholder ;
- prices placeholder ;
- ticket désactivé ;
- risk ribbon état connecting.

---

# 34. Empty states

## 34.1 Structure

- titre ;
- explication ;
- action ;
- illustration facultative.

## 34.2 Exemples

### Aucun compte

> Vous n’avez pas encore de compte WARIBA.

CTA : Voir les offres.

### Aucun trade

> Votre historique apparaîtra après votre première exécution.

CTA : Ouvrir Trade.

---

# 35. Erreurs

## 35.1 Style

- fond léger ;
- bordure ;
- icône ;
- texte ;
- code secondaire ;
- action.

## 35.2 Pas de rouge plein écran

Sauf incident terminal critique.

## 35.3 Code

Toujours visible pour support.

---

# 36. Formulaires

## 36.1 Structure

- titre ;
- description ;
- groupe logique ;
- validation inline ;
- action.

## 36.2 Largeur

- auth : 360–440 px ;
- checkout : 520–720 px ;
- settings : 640–800 px ;
- Control : contextuel.

## 36.3 Validation

- après blur ou submit ;
- pas de validation agressive pendant frappe ;
- erreurs persistantes jusqu’à correction.

---

# 37. Tables responsives

## 37.1 Mobile

Transformer en :

- cartes ligne ;
- liste clé/valeur ;
- drawer détail.

Ne pas forcer un scroll horizontal pour des données critiques.

## 37.2 Trade

Les positions mobiles affichent :

- symbole ;
- direction ;
- taille ;
- PnL ;
- action ;
- détail expandable.

---

# 38. Notifications visuelles

## 38.1 In-app center

- liste chronologique ;
- groupe par jour ;
- importance ;
- état ;
- action.

## 38.2 Critiques

Utiliser :

- bordure forte ;
- label ;
- modal/page si action nécessaire.

---

# 39. Emails transactionnels

## 39.1 Style

- largeur 600 px ;
- fond Bone ;
- contenu blanc ;
- logo ;
- titre ;
- message ;
- action ;
- référence ;
- footer légal.

## 39.2 Types

- vérification email ;
- paiement confirmé ;
- compte activé ;
- soft lock ;
- breach ;
- passage ;
- payout action requise ;
- payout payé ;
- ticket.

## 39.3 Règles

- aucun marketing dans email critique ;
- aucun faux délai ;
- aucun CTA ambigu.

---

# 40. Responsive détaillé

## 40.1 Breakpoints

```css
--bp-xs: 320px;
--bp-sm: 480px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
--bp-2xl: 1440px;
--bp-3xl: 1920px;
```

## 40.2 Mobile

- 16 px margin ;
- 44 px touch targets ;
- bottom nav 64–72 px ;
- sticky risk ribbon ;
- bottom sheets ;
- aucune interaction hover-only.

## 40.3 Tablet

- navigation compacte ;
- panels repliables ;
- chart prioritaire.

## 40.4 Desktop

- densité maîtrisée ;
- panels persistants ;
- raccourcis clavier.

---

# 41. Accessibilité visuelle

## 41.1 Focus

Token :

```css
outline: 2px solid var(--focus);
outline-offset: 2px;
```

## 41.2 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

## 41.3 Zoom

Support 200 % sans perte de contenu critique.

## 41.4 Color blindness

- formes différentes ;
- labels ;
- contrastes ;
- patterns facultatifs sur chart.

---

# 42. Content design

## 42.1 Titres

Orientés action ou réponse.

Préférer :

- « Votre progression »
- « Limite quotidienne »
- « Détail du payout »

Éviter :

- « Dashboard Overview »
- « Insights »
- « Your Journey »
- « Unlock Potential ».

## 42.2 Boutons

Verbe + objet.

- Commencer l’évaluation ;
- Ouvrir Trade ;
- Fermer la position ;
- Demander le payout ;
- Voir le calcul ;
- Ouvrir une contestation.

## 42.3 Messages

Une phrase = une idée.

## 42.4 Français

- pas de franglais inutile ;
- conserver certains termes reconnus avec explication ;
- cohérence stricte.

---

# 43. Microcopy critique

## 43.1 Compte simulé

> Ce compte est un environnement de trading simulé. La taille nominale n’est pas un dépôt vous appartenant.

## 43.2 Consistance

> Votre objectif est atteint, mais votre meilleure journée représente encore plus de 40 % du profit total. Continuez à trader jusqu’à conformité. Votre compte n’est pas en violation.

## 43.3 Soft lock

> Votre limite de perte quotidienne est atteinte. Les nouveaux ordres augmentant l’exposition sont bloqués jusqu’au prochain reset.

## 43.4 Payout estimé

> Estimation calculée à partir des données actuelles. Le montant final sera figé lors de la demande.

## 43.5 Review

> Après cinq payouts, votre compte entre dans WARIBA Review. Cette étape ne garantit pas une allocation de capital réel.

---

# 44. Design tokens — nomenclature

## 44.1 Structure

```text
category.role.state.theme
```

Exemples :

```text
color.bg.canvas.light
color.text.primary.dark
color.border.subtle.light
color.action.primary.hover
space.4
radius.lg
shadow.md
motion.default
font.body.md
```

## 44.2 Pas de noms de composants dans les tokens globaux

Éviter :

```text
dashboard-blue
card-gray
trade-red
```

Préférer :

```text
color.action.primary
color.status.danger
color.bg.surface
```

---

# 45. Exemple tokens.json

```json
{
  "color": {
    "brand": {
      "cobalt": {
        "500": "#3157F5",
        "600": "#2446D8"
      },
      "copper": {
        "500": "#BE6945"
      }
    },
    "semantic": {
      "success": "#258A61",
      "warning": "#C88B25",
      "danger": "#C94D4D",
      "info": "#3673C9"
    }
  },
  "space": {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "6": "24px",
    "8": "32px"
  },
  "radius": {
    "sm": "8px",
    "md": "10px",
    "lg": "12px",
    "xl": "16px"
  }
}
```

---

# 46. Architecture package UI

Structure recommandée :

```text
packages/
├── design-tokens/
│   ├── src/
│   │   ├── color.json
│   │   ├── typography.json
│   │   ├── spacing.json
│   │   ├── radius.json
│   │   ├── shadow.json
│   │   └── motion.json
│   └── build/
├── ui/
│   ├── primitives/
│   ├── components/
│   ├── patterns/
│   ├── wariba/
│   ├── hooks/
│   ├── styles/
│   └── tests/
└── icons/
```

---

# 47. Niveaux de composants

## 47.1 Primitives

- Box ;
- Stack ;
- Grid ;
- Text ;
- Icon ;
- Divider ;
- VisuallyHidden.

## 47.2 Components

- Button ;
- Input ;
- Select ;
- Dialog ;
- Tabs ;
- Table ;
- Alert ;
- Badge ;
- Tooltip.

## 47.3 Patterns

- PageHeader ;
- FormSection ;
- EmptyState ;
- DataTable ;
- FilterBar ;
- DetailPanel ;
- Timeline.

## 47.4 WARIBA components

- AccountContext ;
- MissionProgress ;
- RiskRibbon ;
- ConsistencyMeter ;
- QualifiedDaysTracker ;
- PayoutBreakdown ;
- ExecutionState ;
- PolicyVersionChip ;
- EvidencePanel ;
- ReserveCoverage.

---

# 48. Composants et logique métier

Le composant reçoit des données déjà calculées.

Interdit :

```tsx
const dllRemaining = nominal * 0.04 - lossToday;
```

Autorisé :

```tsx
<RiskRibbon
  dailyLossRemaining={riskSnapshot.dailyLossRemaining}
  dailyLossLimit={riskSnapshot.dailyLossLimit}
  status={riskSnapshot.status}
/>
```

Le Design System affiche.

Le domaine calcule.

---

# 49. Storybook / catalogue interne

Avant multiplication des écrans, documenter :

- variantes ;
- thèmes ;
- responsive ;
- keyboard ;
- accessibility ;
- loading ;
- errors ;
- empty ;
- real content.

Chaque composant propriétaire doit avoir :

- histoire ;
- usage ;
- non-usage ;
- états ;
- tests ;
- exemples réalistes.

---

# 50. Données de démonstration

Les stories utilisent :

- noms fictifs clairement identifiés ;
- données cohérentes ;
- montants réalistes ;
- règles WARIBA ;
- aucun faux payout public.

Exemple :

```text
Compte test : DEMO-10K-001
Balance : 10 640 USD
Equity : 10 590 USD
DLL restante : 310 USD
Consistency : 43 %
```

---

# 51. Visual QA

## 51.1 Viewports

Minimum :

- 320 × 568 ;
- 375 × 812 ;
- 390 × 844 ;
- 768 × 1024 ;
- 1024 × 768 ;
- 1280 × 800 ;
- 1440 × 900 ;
- 1920 × 1080.

## 51.2 Thèmes

- clair ;
- sombre ;
- contraste élevé futur.

## 51.3 États

- normal ;
- loading ;
- empty ;
- error ;
- disabled ;
- soft lock ;
- breach ;
- payout review ;
- offline ;
- stale.

---

# 52. Regression visuelle

Mettre en place après implémentation :

- screenshots automatisés ;
- seuil de différence ;
- validation manuelle ;
- composants critiques prioritaires ;
- aucune mise à jour automatique des baselines sans revue.

Composants critiques :

- Risk Ribbon ;
- Mission ;
- Payout Breakdown ;
- Order Ticket ;
- Control payout review ;
- soft lock ;
- breach.

---

# 53. Performance visuelle

## 53.1 Fonts

- variable font ;
- subsets ;
- préchargement minimal ;
- fallback stable ;
- aucune fonte bloquante inutile.

## 53.2 Images

- formats modernes ;
- dimensions réservées ;
- lazy loading ;
- compression ;
- images hero optimisées.

## 53.3 Motion

- transform/opacity ;
- pas de layout thrashing ;
- aucune animation lourde dans Trade.

---

# 54. Security-sensitive UI

## 54.1 Données privées

- masquage partiel ;
- reveal contrôlé ;
- pas de données KYC dans toast ;
- pas de secret dans URL ;
- clipboard explicite.

## 54.2 Admin

- action sensible clairement différenciée ;
- permission ;
- confirmation ;
- raison ;
- audit.

## 54.3 Impersonation

Si future fonction :

- bandeau permanent ;
- durée limitée ;
- sortie claire ;
- audit.

---

# 55. Règles par espace

# 55.1 Public

- plus éditorial ;
- plus respirant ;
- lumière ;
- photographie ;
- CTA cobalt ;
- cuivre signature.

## 55.2 Platform

- fonctionnel ;
- hiérarchie ;
- progression ;
- données ;
- actions.

## 55.3 Trade

- compact ;
- sombre ;
- temps réel ;
- aucun marketing.

## 55.4 Control

- dense ;
- clair ;
- tables ;
- audit ;
- permissions.

---

# 56. Composants interdits en V1

- carousel marketing automatique ;
- chat bubble flottante permanente dans Trade ;
- 3D hero ;
- NFT-like cards ;
- leaderboard ;
- badges gamifiés ;
- streak artificiel ;
- confetti ;
- loot box ;
- avatar animé ;
- heatmap décorative ;
- score IA opaque ;
- dark pattern de repurchase ;
- timer de promotion.

---

# 57. Certificats

Statut : `DEFERRED`.

Lorsqu’ils seront ajoutés :

- données vérifiables ;
- QR ou URL ;
- aucune promesse Live ;
- design sobre ;
- pas de faux diplôme ;
- protection contre falsification.

---

# 58. Internationalisation

## 58.1 Langue V1

Français.

## 58.2 Structure

Les composants doivent accepter :

- labels longs ;
- pluriels ;
- dates ;
- devises ;
- formats locaux.

## 58.3 Anglais futur

Ne pas coder les strings directement dans les composants.

---

# 59. Dates et temps

## 59.1 Affichage

- timezone locale en préférence ;
- UTC explicitement sur règles ;
- date absolue ;
- relative facultative.

Exemple :

```text
1 août 2026, 15:42 UTC
```

## 59.2 Reset

Toujours afficher :

- heure ;
- timezone ;
- compte à rebours informatif ;
- pas de timer dramatique.

---

# 60. Data density

## 60.1 Marketing

Faible à moyenne.

## 60.2 Hub

Moyenne.

## 60.3 Trade

Élevée contrôlée.

## 60.4 Control

Élevée.

## 60.5 Densité configurable

Control peut proposer :

- confortable ;
- compacte.

Pas nécessaire en V1 Platform.

---

# 61. Audit des six expériences critiques

## 61.1 Homepage

Doit exprimer :

- autorité ;
- clarté ;
- mobile ;
- règles ;
- produit réel.

## 61.2 Checkout

Doit exprimer :

- sécurité ;
- prix ;
- transparence ;
- nature simulée.

## 61.3 Hub

Doit exprimer :

- état ;
- progression ;
- prochaine action.

## 61.4 Trade

Doit exprimer :

- contrôle ;
- exécution ;
- risque.

## 61.5 Payout

Doit exprimer :

- calcul ;
- preuve ;
- confiance.

## 61.6 Control

Doit exprimer :

- procédure ;
- audit ;
- responsabilité.

---

# 62. Critères de qualité avant code

Le Design System est prêt pour implémentation lorsque :

1. palette claire et sombre validée ;
2. typographie validée ;
3. grid validée ;
4. spacing validé ;
5. components inventory validé ;
6. composants WARIBA définis ;
7. états critiques définis ;
8. responsive défini ;
9. accessibilité définie ;
10. anti-vibe-code checklist acceptée ;
11. token naming accepté ;
12. structure package acceptée ;
13. visual QA défini ;
14. aucune règle métier calculée par UI ;
15. aucune contradiction UX/Rulebook.

---

# 63. Checklist anti-vibe-code finale

Avant validation d’une page :

- [ ] Aucun gradient générique dominant.
- [ ] Aucun glassmorphism inutile.
- [ ] Aucun faux chiffre.
- [ ] Aucun faux testimonial.
- [ ] Aucun faux partenaire.
- [ ] Aucun bloc bento répétitif sans raison.
- [ ] Aucun composant décoratif sans fonction.
- [ ] Aucun hover obligatoire sur mobile.
- [ ] Aucun texte secondaire illisible.
- [ ] Aucune carte imbriquée inutile.
- [ ] Aucun radius excessif.
- [ ] Aucune animation gratuite.
- [ ] Aucune icône dans chaque carte par défaut.
- [ ] Aucune donnée critique sans source.
- [ ] Aucune règle cachée.
- [ ] Aucun CTA agressif après breach.
- [ ] Aucun langage crypto/casino.
- [ ] Aucun style copié d’une prop firm existante.
- [ ] Hiérarchie visible sans couleur.
- [ ] L’interface reste crédible en noir et blanc.

---

# 64. Decision Log Design initial

| ID | Décision | Statut | Motif |
|---|---|---|---|
| DS-001 | Direction Quiet Financial Authority | `LOCKED` | Différenciation et confiance |
| DS-002 | Manrope + IBM Plex Mono | `LOCKED` | Lisibilité et données |
| DS-003 | Cobalt comme action primaire | `LOCKED` | Identité propriétaire |
| DS-004 | Copper comme accent limité | `LOCKED` | Signature premium |
| DS-005 | Marketing clair | `CANDIDATE` | Autorité éditoriale |
| DS-006 | Trade sombre par défaut | `LOCKED` | Usage trading |
| DS-007 | Hub clair par défaut | `CANDIDATE` | Lisibilité |
| DS-008 | Control clair par défaut | `LOCKED` | Densité et opérations |
| DS-009 | Radius maximum 20 px | `LOCKED` | Anti-template |
| DS-010 | Ombres limitées | `LOCKED` | Hiérarchie sobre |
| DS-011 | Pas de gradient principal | `LOCKED` | Anti-vibe-code |
| DS-012 | Design tokens centralisés | `LOCKED` | Cohérence |
| DS-013 | Risk Ribbon propriétaire | `LOCKED` | Risque visible |
| DS-014 | Mission Progress propriétaire | `LOCKED` | Parcours |
| DS-015 | Payout Breakdown propriétaire | `LOCKED` | Transparence |
| DS-016 | WCAG 2.2 AA | `LOCKED` | Accessibilité |
| DS-017 | Mobile 320 px supporté | `LOCKED` | Marché initial |
| DS-018 | Storybook/catalogue interne | `CANDIDATE` | Contrôle qualité |
| DS-019 | Visual regression tests | `CANDIDATE` | Fiabilité |
| DS-020 | Logo final séparé du coding | `OPEN` | Identité à concevoir |

---

# 65. Décisions ouvertes

1. logo final ;
2. symbole ;
3. favicon ;
4. éventuel thème sombre Hub ;
5. éventuel thème clair Trade ;
6. photographie de lancement ;
7. illustrations onboarding ;
8. icon set final ;
9. timeframes chart ;
10. indicateurs V1 ;
11. densité Control ;
12. thème high contrast ;
13. certificat ;
14. anglais ;
15. animations de passage ;
16. sound feedback ;
17. raccourcis clavier ;
18. chart color accessibility ;
19. dark mode marketing ;
20. branded email illustrations.

---

# 66. Réconciliation avec les 35 rôles

| # | Rôle | Exigence Design System |
|---:|---|---|
| 1 | CEO | Identité crédible et durable. |
| 2 | COO | Composants opérables dans tous les états. |
| 3 | CFO | Payout et réserve lisibles sans manipulation. |
| 4 | CPO | Design aligné sur ONE → Performance → Review. |
| 5 | Chief of Staff | Decision Log design maintenu. |
| 6 | Market Strategist | Mobile et contexte francophone. |
| 7 | Brand Strategist | WARIBA distinctif et non générique. |
| 8 | Art Director | Quiet Financial Authority. |
| 9 | Content Strategist | Microcopy cohérente. |
| 10 | Growth Lead | Conversion sans dark patterns. |
| 11 | Product Manager | Priorité aux expériences critiques. |
| 12 | UX Researcher | Composants testables. |
| 13 | Information Architect | Navigation claire. |
| 14 | Product Designer | États et responsive complets. |
| 15 | Design System Lead | Tokens et gouvernance. |
| 16 | CRO | Risk Ribbon et seuils visibles. |
| 17 | Market Specialist | Fiches instrument lisibles. |
| 18 | Execution Specialist | États d’ordre précis. |
| 19 | Quant Analyst | Données tabulaires et formules. |
| 20 | Market Data Engineer | Stale data visible. |
| 21 | Software Architect | Packages séparés et tokens. |
| 22 | Frontend Lead | API UI cohérente. |
| 23 | Backend Lead | UI sans logique métier. |
| 24 | Database Architect | IDs, timeline et preuves. |
| 25 | Realtime Engineer | Connexion et états temps réel. |
| 26 | Security Engineer | Actions sensibles distinctes. |
| 27 | SRE | Maintenance et incident mode. |
| 28 | QA Lead | Visual QA et regression. |
| 29 | Payments Lead | Checkout/payout transparents. |
| 30 | Fraud Lead | Signaux sans jugement visuel automatique. |
| 31 | Legal Counsel | Nature simulée visible. |
| 32 | Privacy Lead | Données privées protégées. |
| 33 | Customer Operations | Support et erreurs clairs. |
| 34 | AI Lead | Assist non anthropomorphisé comme conseiller. |
| 35 | Community/Affiliate Lead | Aucune preuve sociale artificielle. |

---

# 67. Gates avant Engineering Constitution

Le prochain document peut commencer lorsque :

- les tokens sont acceptés ;
- les composants fondamentaux sont définis ;
- les composants propriétaires sont définis ;
- les règles responsive sont définies ;
- les thèmes sont définis ;
- l’accessibilité est définie ;
- la nomenclature est définie ;
- les interdictions anti-vibe-code sont verrouillées ;
- la structure package UI est définie ;
- les décisions ouvertes sont consignées.

---

# 68. Definition of Done

Le Design System v1.0 est considéré complet lorsque :

1. une page peut être dessinée sans inventer de couleur ;
2. un composant peut être codé sans inventer de spacing ;
3. Trade peut être conçu sans inventer de densité ;
4. Hub peut être conçu sans inventer de hiérarchie ;
5. Payout peut être conçu sans inventer d’ordre d’information ;
6. Control peut être conçu sans inventer de statut ;
7. les thèmes clair et sombre sont cohérents ;
8. les composants critiques possèdent tous leurs états ;
9. le mobile est couvert ;
10. l’accessibilité est intégrée ;
11. les visual tests sont planifiés ;
12. aucun agent ne peut transformer WARIBA en template SaaS générique.

---

# 69. Conclusion

WARIBA doit paraître moderne en 2026 non parce qu’elle accumule des effets visuels, mais parce qu’elle possède :

- une hiérarchie parfaite ;
- une typographie maîtrisée ;
- des données lisibles ;
- un système de composants cohérent ;
- des états explicites ;
- une excellente expérience mobile ;
- un terminal précis ;
- une transparence inhabituelle dans l’industrie.

Le Design System doit rendre visible la philosophie du produit :

> Clarté avant persuasion. Risque avant performance. Preuve avant croissance.

Cette version 1.0 devient la source de vérité visuelle de WARIBA. Aucun agent de design ou de code n’est autorisé à remplacer les tokens, les composants propriétaires, la direction créative ou les règles anti-vibe-code sans Decision Log.
