# WARIBA Help P0 — audit de clarté visuelle

Date : 2026-08-24  
Périmètre : 25 livrables P0 du Content Map, avant gel du Help P0  
Verdict de départ : **corrections ciblées requises**

## Modèle de travail visuel

- **Thèse visuelle** : Quiet Financial Authority. Le diagramme explicite porte la compréhension ; l’illustration premium reste un repère de mémorisation et ne porte jamais seule une règle financière.
- **Ordre du contenu** : titre direct → conséquence lisible en trois secondes → diagramme exact → illustration secondaire lorsque sa métaphore apporte encore de la valeur → équivalent textuel.
- **Interaction** : révélation courte et unique de 200 à 600 ms, jamais de boucle décorative ; en réduction des animations, toute l’information reste visible immédiatement.
- **Signalétique** : bleu = information ou progression ; vert = sain ou disponible ; ambre = attention ou blocage temporaire ; rouge = perte ou conséquence définitive. Chaque couleur est doublée par un mot, un symbole expliqué ou une conséquence écrite.

## Périmètre et non-périmètre

Objectif : permettre à un nouveau trader francophone d’identifier le message principal de chacun des 25 visuels en moins de dix secondes.

Non-périmètre : P1, P2, Phase 3.3, règles, calculs, policies, moteur de risque, payout, routes, authentification, architecture et fichiers applicatifs WariX. Les captures WariX sont seulement relues comme preuves du produit actuel ; elles ne sont ni retouchées ni remplacées par de faux écrans.

## Matrice d’audit initiale

La colonne « Compréhensible < 10 s ? » décrit l’état avant cette passe. « Non » signifie qu’au moins un critère strict du quality gate n’est pas encore démontré, même si l’article complet permet de comprendre.

| ID | Article | Type | Concept principal | Compréhensible < 10 s ? | Problème perceptible | Action |
|---|---|---|---|---|---|---|
| HLP-VIS-001 | `/aide/risque-regles/dll-vs-perte-maximale` | Diagramme + illustration | Temporaire aujourd’hui vs définitif pour le compte | Non | L’illustration horloge/courbe/marches/croix domine avant que les deux conséquences soient nommées ; « temporaire » et « définitif » ne sont pas les premiers repères. | RECOMPOSE |
| HLP-VIS-002 | `/aide/risque-regles/trailing-eod` | Séquence + illustration | Fin de journée → plancher remonte → il ne redescend plus | Non | La métaphore précède l’explication, « EOD » apparaît dans la couche publique et les trois moments ne forment pas encore une séquence causale explicite. | RECOMPOSE |
| HLP-VIS-003 | `/aide/wariba-one/perte-quotidienne` | Séquence | Limite du jour → blocage → reset → reprise possible | Oui | La conséquence temporaire et la reprise conditionnelle sont déjà écrites ; aucun symbole ne porte seul le sens. | KEEP |
| HLP-VIS-004 | `/aide/wariba-one/meilleur-jour` | Barres + conséquences | Une journée trop dominante retarde la réussite sans terminer le compte | Non | La barre la plus forte est distinguée surtout par sa couleur et les hauteurs d’exemple pourraient être lues comme des montants réels. | LABEL |
| HLP-VIS-005 | `/aide/wariba-one/profit-court-terme` | Ligne temporelle | Avant le seuil : gain non contributif ; au seuil ou après : gain potentiellement compté | Oui | Les deux côtés, le seuil dynamique et l’asymétrie des pertes sont déjà nommés. | KEEP |
| HLP-VIS-006 | `/aide/wariba-one/objectif-atteint` | Séquence | Objectif atteint n’est pas encore validation | Oui | La séquence et les conditions persistantes sont explicites. | KEEP |
| HLP-VIS-008 | `/aide/commencer/parcours-one-performance-review` | Parcours | ONE → Performance → cycles → Review | Oui | Parcours long mais lisible comme vue d’ensemble, avec environnement simulé et absence de garantie Live explicites. | KEEP |
| HLP-VIS-009 | `/aide/performance/buffer-permanent` | Empilement + illustration | Ce qui reste verrouillé vs ce qui peut devenir éligible | Non | Le réservoir sans texte apparaît avant le diagramme ; le cadenas et les flèches peuvent suggérer un recyclage ou un retrait total. | RECOMPOSE |
| HLP-VIS-010 | `/aide/performance/performance-days` | Grille de jours | Chaque payout exige de nouvelles journées comptées | Non | Les libellés de carte à 10 px sont trop petits sur mobile ; le cas sans valeur publiée emploie un terme interne. | LABEL |
| HLP-VIS-011 | `/aide/payouts/eligibilite-payout` | Checklist | Cinq conditions séparées avant une demande | Oui | Les conditions, leur caractère à vérifier et l’absence de lecture fictive du compte sont explicites. | KEEP |
| HLP-VIS-012 | `/aide/performance/split-des-payouts` | Cascade | Du profit réalisé au montant finalement payé au trader | Non | « Cap » est moins naturel que « plafond » en français et la dernière étape ne distingue pas assez montant calculé et paiement confirmé. | LABEL |
| HLP-VIS-013 | `/aide/performance/apres-cinquieme-payout` | Cycles | Dernier cycle → Review, sans cycle automatique ni Live garanti | Non | Le chemin nominal est clair, mais le fallback public emploie « policy ». | LABEL |
| HLP-VIS-014 | `/aide/payouts/statuts-payout` | Séquence | Approuvé ne veut pas dire payé | Oui | Le statut intermédiaire et le statut final sont explicitement différenciés. | KEEP |
| HLP-VIS-015 | `/aide/risque-regles/ordre-refuse` | Cause → action | Refus = aucune exécution, puis action utile | Oui | L’absence d’effet financier et chaque action suivante sont écrites. | KEEP |
| HLP-VIS-016 | `/aide/support/statuts-ticket-contestation` | Deux parcours | Demande et contestation suivent des statuts différents | Oui | Les deux familles sont titrées, ordonnées et ne reposent pas sur la couleur seule. | KEEP |
| HLP-VIS-017 | `/aide/risque-regles/permissions-de-trading` | États | L’état du compte détermine les actions disponibles | Oui | Temporaire, validation et compte terminé sont nommés avec leurs conséquences. | KEEP |
| HLP-VIS-018 | `/aide/wariba-one/objectif-atteint` | Comparaison | Objectif atteint vs évaluation validée | Oui | Les deux moments, la vérification intermédiaire et le maintien des règles sont explicites. | KEEP |
| HLP-VIS-019 | `/aide/wariba-one/regles-essentielles` | Comparaison | Règles publiques actuelles vs version attachée au compte | Oui | Les deux sources visibles et leur priorité sont expliquées sans exposer le mécanisme interne. | KEEP |
| HLP-SCR-001 | `/aide/warix/placer-un-ordre` | Capture réelle annotée | Où vérifier puis envoyer un ordre | Non | Le repère « Buy / Sell » reproduit un libellé produit anglophone au lieu de l’expliquer en français. | LABEL |
| HLP-SCR-002 | `/aide/warix/stop-loss-take-profit` | Capture réelle annotée | Où lire et modifier les protections | Oui | Les protections et la confirmation sont nommées sur une capture actuelle, sans reconstruire l’écran. | KEEP |
| HLP-SCR-003 | `/aide/warix/reduire-cloturer-close-all` | Capture réelle annotée | Comment fermer une partie de la position | Oui | Position, quantité actuelle, quantité fermée et reste sont tous repérés. | KEEP |
| HLP-SCR-004 | `/aide/warix/decouvrir-warix` | Capture réelle annotée | Où lire les deux limites dans WariX | Non | Le repère « calcul serveur » est du jargon interne et ne dit pas directement ce que le trader doit lire. | LABEL |
| HLP-SCR-005 | `/aide/risque-regles/lire-preuve-breach` | Capture réelle annotée | Lire la preuve d’un compte terminé | Oui | Règle, conséquence, seuil, valeur, date et version sont identifiés sans donnée sensible. | KEEP |
| HLP-SCR-006 | `/aide/support/ouvrir-une-contestation` | Capture réelle annotée | Ouvrir une contestation depuis la décision | Oui | Décision, motif, explication, action et référence sont repérés sur une capture réelle. | KEEP |
| HLP-SCR-007 | `/aide/support/creer-et-suivre-un-ticket` | Capture réelle annotée | Suivre une demande et répondre dans le même fil | Oui | Référence, statut, activité, conversation et réponse sont lisibles sur desktop et mobile. | KEEP |

## Synthèse d’action initiale

```text
KEEP = 16
LABEL = 6
SIMPLIFY = 0
RECOMPOSE = 3
REGENERATE_LAST_RESORT = 0
TOTAL = 25
```

Les trois sources générées restent reconnaissables et inchangées. La correction sera déterministe : diagramme avant métaphore, libellés français exacts, conséquences écrites, valeurs uniquement dérivées des faits publiés. Aucune régénération n’est justifiée par l’audit initial.

## Vérification ciblée prévue

- tests unitaires `HelpVisual` ;
- lint et typecheck des packages modifiés ;
- E2E Help ciblé et axe sur les pages modifiées ;
- contrôle sans débordement à 320, 375, 390 et 430 px ;
- preuves individuelles à 1440, 390 et 320 px pour les sept visuels critiques ;
- contact sheets desktop et mobile des 25 P0 ;
- contrôle final du diff avec `WARIX_APPLICATION_FILES_MODIFIED = 0`.

## Clôture après corrections

Les 25 crops desktop et les 25 crops mobile ont été relus dans les contact sheets finales. Les sept visuels financiers ou opérationnels critiques ont également été relus individuellement à 1440, 390 et 320 px.

| ID | < 10 s | Un message | Symboles expliqués | Français public | Valeur réelle | 320 lisible | Couleur doublée | Parité article |
|---|---|---|---|---|---|---|---|---|
| HLP-VIS-001 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-002 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-003 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-004 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-005 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-006 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-008 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-009 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-010 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-011 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-012 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-013 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-014 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-015 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-SCR-001 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-SCR-002 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-SCR-003 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-SCR-004 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-SCR-005 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-SCR-006 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-SCR-007 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-016 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-017 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-018 | oui | oui | oui | oui | oui | oui | oui | oui |
| HLP-VIS-019 | oui | oui | oui | oui | oui | oui | oui | oui |

### Résultat d’action

```text
KEEP = 16
LABEL = 6
SIMPLIFY = 0
RECOMPOSE = 3
REGENERATE_LAST_RESORT = 0
TOTAL = 25
```

- HLP-VIS-001 place maintenant **TEMPORAIRE** et **DÉFINITIF** avant la métaphore, avec les deux conséquences écrites et des signaux ✓/✕ accompagnés de texte.
- HLP-VIS-002 est devenu une séquence causale : journée terminée → clôture plus haute → plancher remonté → plancher qui ne redescend plus. L’illustration vient ensuite comme repère.
- HLP-VIS-009 distingue d’abord `EXCÉDENT DISPONIBLE`, `BUFFER PERMANENT — reste dans le compte` et `BASE DU COMPTE SIMULÉ`, puis présente le réservoir comme métaphore secondaire.
- Les barres du Meilleur Jour indiquent visiblement la meilleure journée et précisent que leurs hauteurs ne sont pas des montants.
- Les fallbacks ne publient plus `policy`, le diagramme de payout dit `plafond`, et les annotations des captures utilisent un français trader.
- Le contraste des détails de séquence est porté au token accessible et les formules Help défilables sont accessibles au clavier.

### Revue relative finale

Les trois visuels les plus forts sont HLP-VIS-001, HLP-VIS-002 et HLP-VIS-009 : leur message exact précède désormais leur métaphore et reste lisible à 320 px.

Aucun visuel ne reste sous le quality gate. Relativement, HLP-VIS-008 et les captures HLP-SCR-001/HLP-SCR-002 restent les plus denses parce qu’ils montrent respectivement un parcours complet et des interfaces produit réelles ; leurs titres, repères externes et rendus mobiles maintiennent néanmoins une lecture en moins de dix secondes.

## Preuves et tests finaux

- Contact sheets :
  - `docs/04-ux/evidence/wariba-help-p0-visual-clarity/00-contact-sheet-desktop.png`
  - `docs/04-ux/evidence/wariba-help-p0-visual-clarity/01-contact-sheet-mobile.png`
- Captures sources : 25 desktop + 25 mobile sous `raw/`.
- Captures critiques : 21 fichiers sous `critical/` (7 concepts × 1440/390/320).
- Manifest de provenance : `docs/04-ux/evidence/wariba-help-p0-visual-clarity/manifest.json`.
- UI unit : 82/82.
- Help éditorial unit : 10/10.
- Help E2E existant : 8/8.
- Capture et quatre largeurs : 1/1, 25 visuels à 320/375/390/430.
- Axe pages modifiées + reduced motion : 1/1, aucune violation critique ou sérieuse restante.
- UI et Web lint/typecheck : verts.
- Build Web production : vert ; un warning préexistant `HubUserMenu` sur `<img>` reste hors scope.

Les échecs intermédiaires ont été classés et résolus : une invocation Vitest sans environnement DOM (`TEST_BUG`), deux démarrages Playwright sans le gate d’environnement (`INFRASTRUCTURE_FAILURE`), puis deux findings axe Help (`PRODUCT_BUG`) corrigés à la racine. Aucun échec final ne reste ouvert.

## Gel

```text
P0_VISUALS_REVIEWED = 25
UNDERSTANDABLE_IN_10_SECONDS = yes
MOBILE_320_READY = yes
VISUAL_RULE_PARITY = yes
WARIX_APPLICATION_FILES_MODIFIED = 0
HELP_P0 = frozen_after_human_validation
```

Ne pas commencer P1, P2, Phase 3.3, WariX ou Marketing depuis cette passe.
