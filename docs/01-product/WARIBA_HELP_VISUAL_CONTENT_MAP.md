# WARIBA Help Center — visual content map

Date: 2026-08-24  
Specification: `WARIBA_HELP_CENTER_VISUAL_MASTER_PROMPTS_2026-08-24.md`  
Scope in this delivery: the explicit 25-item P0 gate, then stop before Phase 3.3.

## Counting contract

The source specification names 42 diagram concepts (`HLP-VIS-001` through
`HLP-VIS-042`) and seven real-product screenshot masters (`HLP-SCR-001`
through `HLP-SCR-007`). They are tracked separately: 42 planned educational
visuals, 7 planned screenshot masters, 49 total assets in the catalogue.

The specification's explicit P0 implementation order contains 25 deliverables:
18 diagrams and 7 screenshots. It omits `HLP-VIS-007`, despite that concept
also carrying a P0 label. This map follows the explicit gate order; VIS-007 is
recorded as the first post-gate item rather than silently becoming a 26th P0
deliverable.

## Truth and production rules

- A diagram receives already-formatted policy facts or read-model labels. It
  does not calculate risk, eligibility or payout amounts in React.
- A missing fact is written as `non publié`; no fallback number is supplied.
- A screenshot is a fresh fixture capture from the current WARIBA runtime;
  evidence from an older WariX/WARIBA surface is not reused.
  Annotation is a separate responsive layer, never a rebuilt product screen.
- WariX is frozen. These assets document it; they do not redesign it.
- Public images contain no e-mail, UUID, correlation ID, secret, raw internal
  enum or provider detail.
- Every visual has a useful accessible name and a text-equivalent summary.

## P0 gate — 25 deliverables

| Asset | Target article | Source | Delivery state |
|---|---|---|---|
| HLP-VIS-001 · Perte quotidienne / perte maximale | `/aide/risque-regles/dll-vs-perte-maximale` | published ONE facts | implemented in this gate |
| HLP-VIS-002 · Plancher EOD glissant | `/aide/risque-regles/trailing-eod` | maximum-loss fact + domain lifecycle | implemented in this gate |
| HLP-VIS-003 · Soft lock quotidien | `/aide/wariba-one/perte-quotidienne` | daily-loss fact + trading permissions | implemented in this gate |
| HLP-VIS-004 · Règle du Meilleur Jour | `/aide/wariba-one/meilleur-jour` | best-day fact | implemented in this gate |
| HLP-VIS-005 · Gain de courte durée | `/aide/wariba-one/profit-court-terme` | minimum-duration fact | implemented in this gate |
| HLP-VIS-006 · Objectif atteint | `/aide/wariba-one/objectif-atteint` | evaluation lifecycle | implemented in this gate |
| HLP-VIS-008 · ONE vers Performance | `/aide/commencer/parcours-one-performance-review` | programme lifecycle + payout-cycle fact | implemented in this gate |
| HLP-VIS-009 · Buffer permanent | `/aide/performance/buffer-permanent` | Performance buffer fact | implemented in this gate |
| HLP-VIS-010 · Performance Days | `/aide/performance/performance-days` | day threshold/count facts | implemented in this gate |
| HLP-VIS-011 · Éligibilité payout | `/aide/payouts/eligibilite-payout` | eligibility read-model vocabulary | implemented in this gate |
| HLP-VIS-012 · Calcul du payout | `/aide/performance/split-des-payouts` | payout domain stages + split facts | implemented in this gate |
| HLP-VIS-013 · Cinq payouts puis Review | `/aide/performance/apres-cinquieme-payout` | split/cycle facts | implemented in this gate |
| HLP-VIS-014 · Statuts payout | `/aide/payouts/statuts-payout` | public payout lifecycle | implemented in this gate |
| HLP-VIS-015 · Ordre refusé | `/aide/risque-regles/ordre-refuse` | public refusal families | implemented in this gate |
| HLP-SCR-001 · Placer un ordre | `/aide/warix/placer-un-ordre` | fresh current WariX fixture | implemented; fresh desktop + mobile captures reviewed |
| HLP-SCR-002 · Stop Loss / Take Profit | `/aide/warix/stop-loss-take-profit` | fresh current WariX fixture | implemented; fresh desktop + mobile captures reviewed |
| HLP-SCR-003 · Clôture partielle | `/aide/warix/reduire-cloturer-close-all` | fresh current WariX fixture | implemented; fresh desktop + mobile captures reviewed |
| HLP-SCR-004 · Limites dans WariX | `/aide/warix/decouvrir-warix` | fresh current WariX fixture | implemented; native risk detail, desktop + mobile reviewed |
| HLP-SCR-005 · Preuve d'un compte terminé | `/aide/risque-regles/lire-preuve-breach` | fresh current trader fixture | implemented; fresh desktop + mobile captures reviewed |
| HLP-SCR-006 · Ouvrir une contestation | `/aide/support/ouvrir-une-contestation` | fresh current trader fixture | implemented; fresh desktop + mobile captures reviewed |
| HLP-SCR-007 · Suivre une demande | `/aide/support/creer-et-suivre-un-ticket` | fresh current support fixture | implemented; fresh desktop + mobile captures reviewed |
| HLP-VIS-016 · Statuts support / contestation | `/aide/support/statuts-ticket-contestation` | public status labels | implemented in this gate |
| HLP-VIS-017 · États du compte | `/aide/risque-regles/permissions-de-trading` | account lifecycle + permissions | implemented in this gate |
| HLP-VIS-018 · Objectif / validation | `/aide/wariba-one/objectif-atteint` | evaluation lifecycle | implemented in this gate |
| HLP-VIS-019 · Règles publiques / compte | `/aide/wariba-one/regles-essentielles` | policy-version facts | implemented in this gate |

## P0 concept outside the explicit 25-item gate

| Asset | Target article | Source | Delivery state |
|---|---|---|---|
| HLP-VIS-007 · Vue d'ensemble WARIBA ONE | `/aide/wariba-one/regles-essentielles` | published ONE facts | post-gate backlog; intentionally not counted in 25 |

## P1 catalogue

| Asset | Target | Source / condition | State |
|---|---|---|---|
| HLP-VIS-020 · Vérification d'identité | `/aide/identite/quand-kyc-demande` | no provider; reachable public states only | planned |
| HLP-VIS-021 · Statuts de paiement | `/aide/paiements/confirmation-paiement` | public commerce statuses | planned |
| HLP-VIS-022 · Commande vers compte | `/aide/commencer/acheter-et-activer` | commerce lifecycle | planned |
| HLP-VIS-023 · Lire le Hub | `/aide/commencer/bienvenue-dans-wariba` | real Hub fixture | planned |
| HLP-VIS-024 · Activité récente | article owner to be added before implementation | public event translation map | planned |
| HLP-VIS-025 · États du marché | `/aide/technique/donnees-indisponibles` | market presentation contract | planned |
| HLP-VIS-026 · Historique / temps réel | `/aide/warix/graphique-et-execution` | accepted WX3 continuity contract | planned |
| HLP-VIS-027 · Historique sans suite inventée | `/aide/warix/graphique-et-execution` | accepted WX3 refusal path | planned |
| HLP-VIS-028 · Timeframes | `/aide/warix/indicateurs-et-dessins` | exposed WariX intervals | planned |
| HLP-VIS-029 · Indicateurs disponibles | `/aide/warix/indicateurs-et-dessins` | current capability registry | planned |
| HLP-VIS-030 · Market / Limit / Stop | `/aide/warix/ordres-en-attente` | TRADING-ORDER decisions | planned |
| HLP-VIS-031 · Alertes de prix | `/aide/warix/ordres-en-attente` | only while alert surface remains public | planned |
| HLP-VIS-032 · Quand contacter Support | `/aide/support/contacter-le-support` | omit `/status` until route exists | planned |
| HLP-VIS-033 · Demande / contestation | `/aide/support/que-peut-on-contester` | support/dispute contracts | planned |
| HLP-VIS-034 · Compte terminé | `/aide/wariba-one/limite-maximale-depassee` | no reset/repurchase branch | planned |
| HLP-VIS-035 · Anatomie d'une preuve | `/aide/risque-regles/lire-preuve-breach` | public evidence fields only | planned |

The specification labels sixteen concepts P1 even though its report template
says `P1 ... /10`. The catalogue preserves all sixteen explicit concepts and
does not manufacture a ten-item subset.

## P2 catalogue

| Asset | Target | Source / condition | State |
|---|---|---|---|
| HLP-VIS-036 · Facturation | `/aide/paiements/recus-et-facturation` | real receipt screen if available | planned |
| HLP-VIS-037 · Sécurité du compte | `/aide/compte-securite/email-et-mot-de-passe` | current security guidance | planned |
| HLP-VIS-038 · Reconnexion WariX | `/aide/warix/warix-deconnexion` | reconnect/resync contract | planned |
| HLP-VIS-039 · Résultats simulés | `/aide/commencer/capital-simule` | current legal wording | planned |
| HLP-VIS-040 · Version des règles | `/aide/wariba-one/regles-essentielles` | non-retroactive policy contract | planned |
| HLP-VIS-041 · Carte des sujets | `/aide` | published category registry | planned |
| HLP-VIS-042 · Trust journey | `/aide` and future `/confiance` | evidence/support/dispute lifecycle | planned |

## Naming and evidence

- Dynamic visuals use the stable ID as `data-help-visual` and an accessible
  title rather than emitting static financial PNGs.
- Screenshot assets live under `apps/web/public/help/visuals/` and use the
  `HLP-SCR-###-...-desktop|mobile.webp` convention.
- Runtime acceptance evidence lives under
  `docs/04-ux/evidence/wariba-help-visual-system/`. Product states are exercised
  at 1440×900 and 390×844. Long mobile component crops retain the 390 px
  breakpoint but use a 1200 px capture height so fixed navigation cannot cover
  their content. A separate 320 px overflow/reduced-motion gate remains active.

## Generated explanatory illustrations

These are supplementary conceptual illustrations, not screenshots and not a
second policy source. They contain no rule value or product UI; the adjacent
React layer supplies the current facts and full text equivalent.

| Asset | Concept | Consuming visual | Source |
|---|---|---|---|
| HLP-ILL-001 · Deux garde-fous | temporary daily boundary versus permanent account floor | HLP-VIS-001 | built-in image generation; source PNG retained with evidence |
| HLP-ILL-002 · Cliquet EOD | floor rises only at selected day-close checkpoints and never falls | HLP-VIS-002 | built-in image generation; source PNG retained with evidence |
| HLP-ILL-003 · Buffer verrouillé | base, locked permanent buffer, eligible surplus and next cycle | HLP-VIS-009 | built-in image generation; source PNG retained with evidence |
