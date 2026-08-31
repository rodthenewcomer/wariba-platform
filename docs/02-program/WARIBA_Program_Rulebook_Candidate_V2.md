# WARIBA Program Rulebook V2

> **STATUS = LOCKED POLICY RULES — PUBLIC ACTIVATION REMAINS GATED**
> **AUTHORITY = definitive policy for every new offer and account**
> **EXISTING_ACCOUNTS = remain attached to their historical policy versions**
> **DO_NOT_APPLY_RETROACTIVELY = true**

Date de décision : 27 août 2026. Le Decision Record `POLICY-GOV-004` verrouille ce document comme source normative définitive pour toutes les nouvelles offres et tous les nouveaux comptes. Les documents V1 sont historiques et ne gouvernent plus les nouveaux travaux. Les anciens statuts `CANDIDATE`, `CALIBRATION_REQUIRED` ou `GO PILOTE` attachés à une règle de policy dans les tableaux ci-dessous sont supersédés par cette décision; `OPEN_CALIBRATION`, `HOLD`, droit, provider, réserve, pays et quotas restent des gates externes fail-closed.

## Executive Summary

- **Le Rulebook V2 est l’autorité normative définitive.** Les valeurs ONE 8/3/8/35/2, FLEX 4/3/6/35/3 et INSTANT 2/5/30/3 remplacent les valeurs V1 pour toutes les nouvelles offres et tous les nouveaux comptes.
- **ONE est le noyau.** Le modèle financier candidat indique 31,2% de marge Stress à ONE; FLEX tombe à 2,4% en moyenne et son acquisition payante doit être limitée aux 25K/50K; INSTANT reste une bêta avec réserve dédiée. Ces gates d’acquisition ne retirent aucune taille du catalogue public.
- **Les règles sont simples côté trader et strictes côté serveur.** Soft daily = pause, Maximum Loss = terminal, Best Day = simple gate, profits <60 secondes non éligibles, pertes toujours comptées, 5 Performance Days, buffer, split 80/85/90 et caps progressifs.
- **Wave/Mobile Money reste une capacité pays, pas une promesse globale.** Aucun rail ne doit apparaître avant validation juridique, PSP, frais, limites et tests.

## Statuts de décision

- **LOCK** : règle V2 définitive; tout changement exige une policy successeure.
- **GO PILOTE** : gate de lancement/cohorte, pas un statut d’incertitude de la règle.
- **CANDIDATE** : libellé historique supersédé pour une règle V2; reste valable pour une hypothèse économique ou externe explicitement nommée.
- **HOLD** : ne pas implémenter, promettre ou scaler avant fermeture du blocker.

## Tableau comparatif

| Offre | Target | Soft daily | Max loss | Buffer | Best Day | Payout | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ONE | 8% | 3% | 8% EOD trailing | 2% en Performance | 35% | 5 jours à +0,5%; 80/85/90% | GO PILOTE révocable; acquisition payante gated par cellule |
| FLEX | 4% | 3% | 6% EOD trailing | 3% en Performance | 35% | 5 jours à +0,5%; 80/85/90% | GO PILOTE révocable; acquisition payante 25K/50K en priorité |
| INSTANT | Aucun | 2% | 5% EOD trailing | 3% | 30% | 5 jours à +0,5%; 80/85/90% | GO PILOTE révocable en bêta plafonnée; réserve dédiée obligatoire |

## WARIBA ONE

**Une évaluation. Une seule étape vers Performance.** Tailles 5K, 10K, 25K, 50K et 100K. Target 8%, soft daily 3%, Maximum Loss 8% EOD trailing, Best Day 35%, aucun minimum explicite de jours et durée illimitée sous réserve d’inactivité. Après réussite revue, le compte Performance garde 3% soft daily, 8% Maximum Loss, buffer 2%, Best Day 35%, 5 nouveaux Performance Days à +0,5%, split 80/85/90 et caps progressifs. Le paid scale démarre sur 25K-100K; 10K est limité; 5K organique/partenaire.

## WARIBA FLEX

**Commencez maintenant. Payez le reste après votre réussite.** Tailles 5K à 100K, toutes publiables au catalogue. Target 4%, soft daily 3%, Maximum Loss 6% EOD trailing, Best Day 35%. Le prix d’activation est figé au moment de l’achat et n’est payé qu’après une réussite approuvée. Il reste disponible 30 jours; aucun accès Performance avant paiement. En Performance : daily 3%, max 6%, buffer 3%, Best Day 35%, mêmes 5 jours, splits et caps. L’acquisition payante est priorisée sur 25K/50K; 100K est limité et 5K/10K ne sont pas scalés en paid. Cela ne retire aucune taille du catalogue public.

## WARIBA INSTANT

**Pas d’évaluation. Commencez directement sur Performance.** Tailles 5K à 100K, toutes publiables au catalogue, avec une activation de pilote plafonnée. Soft daily 2%, Maximum Loss 5% EOD trailing, buffer 3%, Best Day 30%, leverage conservateur, marge maximale 10% et exposition brute maximale 2,00× le nominal, 5 jours à +0,5%, splits et caps communs. 25K est le noyau bêta; 50K/100K ne s’activent qu’avec réserve dédiée; 5K reste sans paid scale.

## Prix candidats

| Offre | Taille K | Aujourd’hui XOF | Activation XOF | Total si succès XOF | Gate pilote |
| --- | --- | --- | --- | --- | --- |
| ONE | 5 | 19900 | 0 | 19900 | HOLD paid scale; organique/partenaire |
| ONE | 10 | 34900 | 0 | 34900 | LIMITÉ |
| ONE | 25 | 69900 | 0 | 69900 | GO PILOTE |
| ONE | 50 | 119900 | 0 | 119900 | GO PILOTE |
| ONE | 100 | 199900 | 0 | 199900 | GO PILOTE |
| FLEX | 5 | 9900 | 25900 | 35800 | HOLD paid scale |
| FLEX | 10 | 14900 | 39900 | 54800 | HOLD paid scale |
| FLEX | 25 | 24900 | 109900 | 134800 | GO PILOTE |
| FLEX | 50 | 34900 | 184900 | 219800 | GO PILOTE |
| FLEX | 100 | 44900 | 269900 | 314800 | LIMITÉ; coupe-circuit |
| INSTANT | 5 | 39900 | 0 | 39900 | HOLD paid scale |
| INSTANT | 10 | 59900 | 0 | 59900 | LIMITÉ |
| INSTANT | 25 | 99900 | 0 | 99900 | GO PILOTE bêta plafonnée |
| INSTANT | 50 | 169900 | 0 | 169900 | GO financier; HOLD sans réserve dédiée |
| INSTANT | 100 | 279900 | 0 | 279900 | GO financier; HOLD sans réserve dédiée |

Les quinze combinaisons offre × taille appartiennent au catalogue public. La colonne « Gate pilote » pilote uniquement l’acquisition payante, les quotas, l’activation ou le scale interne; elle ne signifie jamais « produit absent du catalogue ». Les prix doivent être présentés comme le total obligatoire au checkout, taxes et frais obligatoires inclus une fois leur traitement fiscal validé. Pour FLEX, le prix total si succès est figé lors de l’achat afin d’éviter tout bait-and-switch.

## Formules exactes du risque

1. Jour WARIBA : 00:00:00-23:59:59 UTC.
2. Plancher quotidien = solde au début du jour - daily_pct × solde initial. L’equity est contrôlée en temps réel, coûts inclus.
3. Si equity <= plancher quotidien : cancel pending, close all, soft_locked jusqu’au prochain reset.
4. HWM EOD = max(solde initial, meilleur solde clôturé aux fins de jours antérieures).
5. Maximum Loss floor = min(solde initial, HWM EOD - max_loss_pct × solde initial).
6. Si equity <= Maximum Loss floor : breach terminal.
7. Les calculs utilisent les unités monétaires mineures du compte; aucun arrondi UI n’autorise un ordre.

## Règle des 60 secondes

- Une tranche clôturée avec profit est éligible si closeAt - openAt >= 60 000 ms.
- Une tranche profitable plus courte reste visible dans le solde mais n’entre pas dans l’objectif, les Performance Days, le Best Day éligible ni le payout.
- Une perte, des commissions, swaps et slippage sont toujours comptés, quelle que soit la durée.
- Une durée courte n’est pas une fraude à elle seule. L’abus exige la preuve d’une exploitation de latence, de prix ou du simulateur.
- Les closes partielles sont calculées lot par lot avec timestamp d’ouverture conservé.

## Payout

Éligibilité financière : compte Performance actif, buffer atteint, 5 nouveaux jours à +0,5% net, Best Day conforme, aucun profit non éligible inclus, positions fermées, aucun ordre bloquant et aucun hold d’intégrité. Le KYC se déclenche à ce stade. Le bouton de demande apparaît seulement après KYC vérifié, méthode disponible et snapshot frais.

Montant net = min(cap applicable, split × profit réalisé éligible retirable au-dessus du buffer). Le cap et le split progressent uniquement après un payout payé. Un payout demandé mais rejeté ou annulé ne change pas le tier.

`PAYOUT_DEBIT_CANNOT_CAUSE_TRADING_BREACH = true`. Un payout autorisé et payé ne peut pas, par son débit comptable, déclencher une perte quotidienne, une perte maximale, une fermeture de compte ou une autre sanction de trading. Les calculs futurs doivent distinguer explicitement les pertes de trading et coûts éligibles des débits de payout autorisés. Le débit reste dans le ledger financier et dans les rapprochements, mais il est neutralisé dans la projection de risque de trading.

| Taille K | Payouts 1-2 USD net | Payouts 3-4 USD net | Payout 5 USD net |
| --- | --- | --- | --- |
| 5 | 250 | 350 | 500 |
| 10 | 400 | 600 | 800 |
| 25 | 900 | 1250 | 1750 |
| 50 | 1500 | 2200 | 3000 |
| 100 | 2500 | 3500 | 5000 |

Le payout 5 ouvre WARIBA Review. Il n’existe aucun payout 6 automatique. La Review ne peut pas refuser un payout déjà gagné uniquement parce que le trader est très profitable, ni changer rétroactivement sa policy.

## Règles publiques

| Règle | Texte public simple | Effet | Statut |
| --- | --- | --- | --- |
| Nature du compte | Votre compte et vos transactions sont simulés. WARIBA ne vous confie pas automatiquement de capital réel. | Information | LOCK |
| Jour WARIBA | Un jour WARIBA va de 00:00:00 à 23:59:59 UTC. L’heure du prochain reset est toujours affichée. | Calcul serveur | CANDIDATE |
| Objectif | ONE doit atteindre 8% de profit éligible. FLEX doit atteindre 4%. INSTANT n’a pas d’évaluation. | Passage en revue de réussite | CANDIDATE; supersession requise |
| Jours minimums | Il n’y a pas de nombre minimum de jours en Évaluation. La règle de Meilleure Journée doit tout de même être respectée. | Éligibilité | LOCK actuel / confirmé candidat |
| Durée | L’évaluation n’a pas de date limite. L’inactivité s’applique après 30 jours sans trade exécuté. | Compte inactif | LOCK actuel |
| Pause quotidienne | Si votre limite quotidienne est atteinte, WARIBA ferme les positions, annule les ordres et bloque toute nouvelle exposition jusqu’au prochain reset. Le compte n’est pas perdu. | Soft lock | LOCK principe; seuils CANDIDATS |
| Calcul quotidien | Le plancher du jour est le solde au début du jour moins 3% du solde initial pour ONE/FLEX, ou 2% pour INSTANT. L’equity, frais et PnL latent sont contrôlés en continu. | Soft lock si equity atteint le plancher | CANDIDATE |
| Perte maximale | La perte maximale est terminale : 8% ONE, 6% FLEX, 5% INSTANT. Le plancher ne descend jamais. | Hard breach | CANDIDATE |
| EOD trailing | Chaque fin de jour, le meilleur solde clôturé peut remonter le plancher. Le plancher est plafonné au solde initial et ne redescend jamais après un payout. | Calcul serveur | CANDIDATE |
| Meilleure Journée | Votre meilleur jour ne doit pas dépasser 35% du profit total du cycle pour ONE/FLEX, ou 30% pour INSTANT. Si le ratio est trop élevé, continuez à trader : le compte reste ouvert. | Éligibilité reportée; jamais breach | GO PILOTE |
| Trades de moins de 60 secondes | Un profit clôturé avant 60 secondes n’est pas éligible à l’objectif, aux Performance Days ou au payout. Les pertes et les frais comptent toujours. Ce n’est pas un breach à lui seul. | Profit non éligible | LOCK actuel |
| Scalping | Le scalping est autorisé. La durée seule ne rend pas une stratégie frauduleuse; la règle des 60 secondes détermine seulement l’éligibilité du profit. | Surveillance si exploitation technique | GO PILOTE |
| News en Évaluation | Vous pouvez ouvrir, réduire ou fermer pendant les annonces. Les spreads, gaps et slippages comptent normalement. | Aucun retraitement | CANDIDATE |
| News en Performance | De 2 minutes avant à 2 minutes après une annonce à fort impact liée au symbole, vous pouvez réduire ou fermer, mais pas ouvrir ni augmenter l’exposition. Les positions déjà ouvertes peuvent rester. | Ordre d’augmentation refusé; pas breach | CANDIDATE |
| Overnight | Vous pouvez garder une position pendant la nuit. Les swaps et changements de spread comptent. | PnL normal | CANDIDATE |
| Weekend | Vous pouvez garder une position pendant le weekend. Pendant les 30 dernières minutes avant une fermeture de marché de 2 heures ou plus, aucune nouvelle exposition n’est acceptée. | Augmentation refusée; positions existantes conservées | CANDIDATE |
| Gaps, spreads et slippage | Un stop n’est pas un prix garanti. Les exécutions normales du marché comptent. Une erreur de prix prouvée est corrigée de façon symétrique. | Correction auditée si incident provider | GO PILOTE |
| Exposition maximale | Il n’y a pas de limite fixe de nombre de positions. Marge maximale : 20% en Évaluation ONE/FLEX, 15% en Performance ONE/FLEX, 10% en INSTANT. Exposition notionnelle brute maximale : 3,00× le nominal pour ONE/FLEX, 2,00× pour INSTANT. L’égalité est autorisée; le dépassement est refusé. | Ordre refusé; pas breach | LOCK — `POLICY-GOV-004` |
| Positions opposées | Vous pouvez couvrir une position sur le même compte. WARIBA additionne les valeurs absolues des notionnels : les deux côtés utilisent de l’exposition et ne se compensent jamais. | Risque brut agrégé | LOCK — `POLICY-GOV-004` |
| EA, bots et API de trading | WariX ne prend pas en charge les EA, bots ni API de trading externes pendant le pilote. Leur simple absence ou tentative d’usage n’est pas une fraude. Saturer le serveur ou exploiter le flux reste interdit et exige une preuve. | Fonction indisponible; revue technique si abus prouvé | GO PILOTE |
| Copy trading automatisé | Le copy trading automatisé et la liaison automatique de comptes ne sont pas disponibles pendant le pilote. Vous pouvez prendre manuellement des décisions similaires sur vos propres comptes. Le partage de compte, la gestion par un tiers, le service de passage et la coordination frauduleuse entre personnes restent interdits. | Fonction indisponible; hold seulement après preuve d’abus | GO PILOTE |
| Hedging entre personnes | Prendre des positions opposées coordonnées entre plusieurs personnes ou plusieurs identités est interdit. | Revue d’intégrité | GO PILOTE |
| Martingale et grid | Ces méthodes ne sont pas interdites par leur nom. Elles restent soumises aux mêmes limites de marge, de perte et d’exposition brute. Un système sans limite qui exploite le simulateur est interdit. | Ordres refusés ou revue d’abus | CANDIDATE |
| HFT, latency et arbitrage | Exploiter un prix en retard, une erreur de flux, un décalage entre plateformes, le tick scalping ou le spam d’ordres est interdit. | Hold immédiat; preuve et revue avant sanction | LOCK intégrité / GO PILOTE |
| Compte personnel | Votre compte est personnel. Ne partagez pas vos identifiants et ne laissez personne trader à votre place. | Blocage sécurité puis revue | LOCK |
| IP, VPN et VPS | Un VPN ou VPS personnel est autorisé. Un changement de pays, d’appareil ou d’IP n’est pas un breach automatique; WARIBA peut demander une vérification de sécurité. | Step-up sécurité | GO PILOTE |
| Allocation totale | Au pilote, une personne peut avoir au maximum 200K de comptes Performance actifs au total. Toute hausse passe par WARIBA Review. | Nouvelle activation refusée au-delà | CANDIDATE |
| Inactivité | Après 21 jours sans trade exécuté, WARIBA vous avertit. À 30 jours, le compte devient inactif. Une éligibilité financière déjà acquise n’est pas effacée par l’inactivité. | Inactive; réactivation contrôlée | LOCK 30 jours; UX CANDIDATE |
| Reset | La pause quotidienne se réinitialise automatiquement. Après une perte maximale, le compte ne revient pas à la vie. Aucun reset commercial payant n’est promis pendant le pilote. | Nouvel achat distinct seulement | HOLD reset commercial |
| Performance Days | Pour demander un payout, réalisez 5 nouveaux jours à au moins +0,5% net du solde initial. Les jours ne doivent pas être consécutifs. | Éligibilité payout | GO PILOTE |
| Buffer | Les premiers 2% de profit ONE, ou 3% FLEX/INSTANT, restent sur le compte comme coussin. Seul le profit éligible au-dessus peut être payé. | Profit non retirable sous le buffer | CANDIDATE |
| Split | Votre part est 80% pour les payouts 1 et 2, 85% pour les payouts 3 et 4, puis 90% au payout 5. | Calcul net | CANDIDATE |
| Caps | Chaque payout a un montant maximum net selon la taille du compte et votre historique. Le cap augmente après les payouts payés, pas après une simple demande. | Montant plafonné | CANDIDATE |
| Demande de payout | Toutes les positions doivent être fermées. WARIBA fige le calcul, le cap et le split. Une seule demande peut être ouverte à la fois. | Compte restreint pendant la revue | LOCK principe |
| Débit d’un payout autorisé | Un payout autorisé ne peut pas provoquer à lui seul une perte quotidienne, une perte maximale ou la terminaison du compte. | Débit financier neutralisé dans le risque de trading | GO PILOTE; implémentation 3.4.x requise |
| KYC | La vérification d’identité commence lorsque votre premier payout devient financièrement éligible. Aucun transfert n’est envoyé avant validation. | KYC requis | LOCK |
| Wave et Mobile Money | Une méthode apparaît seulement si elle est validée pour votre pays. WARIBA ne promet pas Wave dans tous les pays avant les contrats et tests nécessaires. | Rail affiché par capacité pays | HOLD promesse; CANDIDATE intégration |
| Trader très profitable | Être très profitable n’est pas un abus. WARIBA ne change pas vos règles rétroactivement et ne refuse pas un payout uniquement parce qu’il est élevé. | Payout selon règles; Review après #5 | GO PILOTE |
| WARIBA Review | Après le payout 5, aucun payout 6 n’est automatique. WARIBA examine votre historique pour proposer une continuation, un scaling ou un accord distinct. Aucun capital réel n’est garanti. | Compte en review | LOCK entrée en Review; résultats CANDIDATS |
| Contestation | Vous pouvez contester une décision depuis le Hub dans les 30 jours. La preuve, la policy et les calculs sont conservés; un autre reviewer examine le dossier. | Décision confirmée, corrigée ou information demandée | CANDIDATE juridique |
| Fraude et abus | Une alerte ne vaut pas culpabilité. WARIBA peut bloquer temporairement pour protéger le compte, mais une sanction terminale exige un motif, des preuves, un audit et une voie de recours. | Hold puis décision structurée | LOCK principe / CANDIDATE procédure |

Contrat de rédaction future, sous le libellé simple **« Exposition maximale »** :

> WariX limite automatiquement la taille totale de vos positions selon votre
> compte et les marchés tradés. Si un nouvel ordre dépasse votre limite, il
> est refusé avant exécution. Votre compte n'est pas perdu.

## Règles internes invisibles

| Contrôle | Déclencheur | Action serveur | Preuve | Statut |
| --- | --- | --- | --- | --- |
| Version de policy | Création de compte | Figer policyVersionId, paramètres, calendrier et catalogue symboles | Append-only; aucune modification rétroactive | LOCK |
| Pré-trade | Chaque ordre | Vérifier ownership, état, session, symbole, news, leverage, marge et allocation | Reason code et décision conservés | LOCK principe |
| Ordre surdimensionné | Marge après ordre au-dessus du cap | Refuser avant exécution | Pas de breach; expliquer la limite | GO PILOTE |
| Daily soft | Equity <= plancher quotidien | Cancel pending, close all, soft_locked jusqu’au reset | Snapshot balance/equity/PnL/frais | GO PILOTE |
| Maximum Loss | Equity <= plancher EOD | Cancel, close all, breached terminal | Preuve immuable et contestable | GO PILOTE |
| Finalisation EOD | 23:59:59 UTC | Idempotent finalize; HWM et plancher du jour suivant | Clé account+date+policy | GO PILOTE |
| Profit 60 secondes | Close d’une tranche profitable | Éligible si durée >= 60 000 ms; pertes toujours appliquées | Lot-level timestamps et frais | LOCK actuel |
| Best Day | Fin de jour et demande payout | Recalculer max jour positif / profit net éligible du cycle | Non-breach; données rejouables | GO PILOTE |
| Performance Day | Finalisation du jour | Compter si PnL net éligible >= 0,5% du solde initial | Une journée par compte et date UTC | GO PILOTE |
| News | Fenêtre d’événement | Refuser uniquement ouverture/augmentation; autoriser réduction/close | Calendrier versionné; aucun ajout rétroactif | CANDIDATE |
| Automatisation non supportée / charge serveur | Appel EA, bot ou API externe; ou charge anormale prouvée | Refuser l’intégration non supportée; throttle technique si nécessaire; aucune sanction de fraude sur l’absence de support seule | Compteur par compte/device; preuve d’exploitation requise | GO PILOTE |
| Copy automatisé non supporté | Tentative de liaison ou réplication automatique | Refuser la fonction; conserver l’agrégation par bénéficiaire effectif pour l’allocation et l’intégrité | Ne pas traiter une IP, une stratégie similaire ou une décision manuelle seule comme preuve | GO PILOTE |
| Allocation | Performance actif >200K par personne | Refuser activation additionnelle; ouvrir Review si éligible | KYC owner graph | CANDIDATE |
| KYC | Première financially_eligible | Créer/réutiliser dossier; aucun payout request avant verified | État séparé du compte trading | LOCK |
| Payout | Demande valide | Figer eligibility snapshot, split, cap, montant et policy | Une demande active par cycle | LOCK |
| Débit payout et risque | Payout payé | Débiter le ledger financier sans diminuer la projection utilisée pour daily loss / maximum loss | Type d’entrée et projection séparés; test de non-breach | GO PILOTE; implémentation 3.4.x requise |
| Provider payout | Approved | Outbox puis worker idempotent; jamais d’appel réseau dans transaction DB | wariba-payout:{payoutRequestId} | LOCK |
| Réserve | Couverture liquide / P90 30 jours <2,5x | Pause ventes/activations de la cellule; ne pas réduire droits acquis | Alerte CFO/Risk/Trésorerie | GO PILOTE |
| Economics cellule | CM réalisée <10% ou CAC >80% du break-even | Couper acquisition payante de la cellule | Produit × taille × pays × canal | GO PILOTE |
| Economics portefeuille | CM Stress réalisée <15% ou LTV/CAC <1,5x | Geler scale et réviser budget | Fenêtre cohorte explicitée | GO PILOTE |
| INSTANT | Réserve dédiée absente ou quota atteint | Désactiver checkout/activation 50K-100K | Feature flag par taille et pays | GO PILOTE |
| Fraude/chargeback | Seuil contractuel PSP ou seuil interne le plus strict | Hold rail/cellule; ne pas accuser automatiquement le trader | Evidence pack commande-device-provider | CANDIDATE; seuil signé requis |
| Market data | Écart ou retard provider | Kill switch sur symboles affectés; correction symétrique | Conserver ticks, source et horodatage | GO PILOTE |
| Contestation | Ouverte sous 30 jours | Reviewer distinct; préserver preuve; payer part non contestée si possible | SLA mesuré, jamais inventé | CANDIDATE juridique |
| Circuit breaker Disaster | Dérive payout, CAC, fraude ou réserve hors tolérance | Pause ventes, baisse quotas/leverage seulement pour nouveaux comptes | Aucun changement rétroactif | GO PILOTE; LOCK bloqué sans test |

## QA des décisions

| Décision | Verdict | Rôles favorables | Condition ou objection |
| --- | --- | --- | --- |
| Trio ONE/FLEX/INSTANT | GO PILOTE | CEO, Product, Growth | CFO/Risk limitent scale; une seule architecture Performance |
| ONE 8/3/8/35/2 | GO PILOTE | Product Owner ONE, Pricing, Customer Advocate | Nouvelle vérité V2; reste non-LOCK jusqu’aux gates de pilote |
| FLEX target 4% | GO PILOTE | Product Owner FLEX, CFO | 2% et 3% rejetés; 25K/50K seulement en paid scale |
| INSTANT 2/5/30/3 | GO PILOTE limité | Product, Trading Risk | Payout Risk et Trésorerie exigent quota et réserve dédiée |
| 5K disponible mais non scalé | HOLD paid scale | CFO, Performance Marketing | Low-ticket Stress négatif; organique/partenaire seulement |
| Prix V1 | CANDIDATE | Pricing Lead, Growth | Aucun prix n’est LOCK avant fiscalité, checkout et données conversion |
| Leverage équilibré | CANDIDATE | Head of Trading Risk | Market Risk rejette 1:100 et métaux 1:40 |
| Soft daily pause | GO PILOTE | Risk, UX Writing, Support | Doit être serveur, expliqué comme pause, jamais breach |
| EOD maximum loss | CANDIDATE | Chief Risk Officer, Platform | Formule, UTC, arrondis et finalisation doivent être figés |
| Best Day non-breach | GO PILOTE | Payout Risk, Customer Advocate | Évite la fermeture punitive; ratio exact doit être visible |
| Profits >=60 secondes | LOCK actuel | Risk, Integrity, UX Writing | Pertes toujours comptées; pas de sanction sur la durée seule |
| Scalping autorisé | GO PILOTE | Customer Advocate, Trading Risk | Latence/tick exploitation reste interdite |
| News: libre eval, fenêtre Performance | CANDIDATE | Trading Risk, Customer Advocate | Calendrier provider et symbol mapping à valider |
| Overnight/weekend autorisé | CANDIDATE | Product, Market Risk | Blocage d’augmentation avant fermeture; gaps restent au trader |
| EA/bots/API externes non supportés | GO PILOTE | Product, Platform, Security | Fonction indisponible; absence de support jamais assimilée seule à une fraude |
| Copy automatisé non supporté; décisions manuelles propres autorisées | GO PILOTE | Customer Advocate, Fraud, AML/KYC | Owner graph et allocation agrégée indispensables; similitude seule insuffisante |
| Hedging même compte | CANDIDATE | Trading Risk | Risque brut; hedging coordonné entre personnes interdit |
| Martingale/grid sous caps | CANDIDATE | Product, Risk | Aucun passe-droit; stratégie illimitée/exploitative interdite |
| HFT/latency/arbitrage interdits | GO PILOTE | Integrity, Platform, Market Data | Sanction seulement après preuve, pas par heuristique seule |
| Marge et exposition brute | LOCK | Head of Trading Risk | marge 20/15/10 et brut 3,00× ONE/FLEX, 2,00× INSTANT; stricte règle la plus restrictive |
| Inactivité 30 jours | LOCK actuel | Lifecycle, Support | Avertissements 21/28 jours CANDIDATS |
| Reset commercial | HOLD | Governance, Legal Consumer | OFFER-011 OPEN; aucune promesse Phase 3.4 |
| 5 Performance Days | GO PILOTE | Payout Risk, Product, benchmarks officiels | Jour net >=0,5%, non consécutif, recalcul serveur |
| Buffer 2%/3% | CANDIDATE | CFO, Customer Advocate | Cohérent avec cinq jours; non validé par données WARIBA |
| Split 80/85/90 et caps | CANDIDATE | Pricing, Payout Risk, Treasury | Caps nets modélisés; cash réel et fraude non observés |
| WARIBA Review après #5 | LOCK entrée en Review | Risk, Product, Customer Advocate | Continuation/scaling restent décisions séparées |
| KYC au premier financially eligible | LOCK | AML/KYC, Product, Platform | Pas de payout avant verified; pas de KYC lourd inutile à l’achat |
| Wave/Mobile Money | HOLD promesse | Mobile Money, Payments, Compliance | Contrats, pays, frais, limites et droit non signés |
| Contestations et evidence pack | GO SOUS CONDITION | Legal Consumer, Audit, Support | Délai et procédure à valider juridiquement |
| Server-side enforcement | LOCK | Platform, Security, Audit | UI informative; toutes permissions et décisions viennent du serveur |
| LOCK du programme | HOLD LOCK | Présidence, CFO, CRO, Actuaire, Legal | Disaster, CAC, payouts, droit, Wave et market-data non clos |

## Changelog de correction Phase 3.4.1

1. Les EA, bots et API externes ne sont pas supportés pendant le pilote; l’absence de support n’est pas une fraude.
2. Le copy trading automatisé et la liaison automatique sont indisponibles; les décisions manuelles similaires sur ses propres comptes restent permises, tandis que partage de compte, gestion tierce et coordination frauduleuse restent interdits.
3. `PAYOUT_DEBIT_CANNOT_CAUSE_TRADING_BREACH = true` est ajouté comme invariant normatif et public.
4. Les caps de marge 20/15/10% passent explicitement à `CALIBRATION_REQUIRED`; aucune application ou promesse n’est autorisée avant fermeture de `WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1`.
5. Les gates `HOLD`, `LIMITÉ`, `gated` et `paid scale` sont requalifiés comme stratégie d’acquisition/activation interne; les quinze combinaisons restent au catalogue public.

## Conseil simulé des 45 rôles

Simulation de fonctions, pas vote de personnes réelles.

| Rôle | Angle | Vote | Condition ou objection |
| --- | --- | --- | --- |
| Présidence du conseil | Gouvernance | HOLD LOCK | Autoriser uniquement un pilote révocable; aucun candidat n'est positif en Disaster |
| CEO | Portefeuille | GO PILOTE | ONE en tête; FLEX contrôlé; INSTANT par cohortes très limitées |
| CFO | Contribution | HOLD LOCK | Exiger CM Stress >=15% réalisée et rapprochement payout cash |
| Chief Risk Officer | Risque de queue | HOLD LOCK | Réserve liquide 2.5x du P90 30 jours et circuit breaker |
| Trésorerie | Liquidité | GO SOUS CONDITION | Préfinancer 25.0M XOF par 1 000 achats Stress selon mix candidat |
| FP&A | Planification | GO PILOTE | Budgets par produit/pays avec CAC caps |
| Actuaire | Fréquence-sévérité | HOLD LOCK | Calibrer incidence, cycles et montants sur données réelles |
| Quant Research | Pass rates | GO PILOTE | Instrumentation complète des transitions et cohortes |
| Pricing Lead | Prix | GO PILOTE | Conserver le prix total FLEX mais déplacer davantage à l'upfront |
| Product Director | Architecture | GO SOUS CONDITION | Documenter explicitement la divergence target ONE 8 / FLEX 4 |
| Product Owner ONE | Offre | GO PILOTE | Target 8, soft daily 3, max loss 8 EOD |
| Product Owner FLEX | Offre | GO PILOTE | Target 4, buffer 3, activation mesurée; pas de target 2 |
| Product Owner INSTANT | Offre | HOLD SCALE | 25K en beta plafonnée; 5K non viable en paid Stress, 50K/100K exigent réserve dédiée |
| Head of Trading Risk | Exposition | GO SOUS CONDITION | Leverage par actif équilibré; order-size blocking serveur |
| Market Risk | Leverage | HOLD AGRESSIF | Refuser variante 1:100 et métaux 1:40 au lancement |
| Payout Risk | Obligation | GO SOUS CONDITION | Caps progressifs, 5 Performance Days et arrêt automatique |
| Growth Lead | Acquisition | GO PILOTE | Mix 30% ONE / 60% FLEX / 10% INSTANT maximum |
| Performance Marketing | Meta CAC | GO SOUS CONDITION | Couper automatiquement au CAC break-even par cellule |
| CRM/Lifecycle | Rétention | GO PILOTE | Mesurer activation FLEX et repeat purchase sans les inclure en V1 |
| Country Lead Côte d’Ivoire | Marché | GO PILOTE | Audience la plus large; checkout et support francophone |
| Country Lead Cameroun | Marché | GO PILOTE | Traiter séparément CEMAC, fiscalité et payout |
| Country Lead Sénégal | Marché | GO PILOTE | CAC plus élevé; avantage Wave potentiellement fort |
| Country Lead Bénin | Marché | GO PILOTE | Bon CAC hypothétique; PSP et disponibilité Wave non prouvés |
| Country Lead Burkina Faso | Marché | GO SOUS CONDITION | PSP agréé et tests opérationnels |
| Country Lead Togo | Marché | HOLD PAID SCALE | Audience Meta anormale et faible; organique/partenaires d'abord |
| Payments Lead | Encaissement | GO SOUS CONDITION | Multi-rail, idempotence, rapprochement et remboursements |
| Mobile Money Lead | Wave | HOLD PROMESSE | Valider contrat, pays, limites, fees et droit de payer des rewards |
| Fraud Lead | Abus | GO SOUS CONDITION | 3DS/device binding/velocity; taux de fraude suivi par rail |
| Chargeback Lead | Disputes | HOLD LOCK | Seuil interne bien inférieur au seuil VAMP; evidence pack automatique |
| AML/KYC Officer | Financial eligibility | GO SOUS CONDITION | KYC avant premier payout financièrement éligible |
| Compliance UMOA | Réglementaire | HOLD LOCK | Avis écrit sur qualification du service et PSP agréés BCEAO |
| Compliance CEMAC | Réglementaire | HOLD LOCK | Avis Cameroun distinct; pas d'extrapolation UMOA |
| Legal Consumer | Conditions commerciales | HOLD LOCK | Rules, caps, simulated performance et voies de recours en français simple |
| Tax Lead | Fiscalité | HOLD LOCK | TVA/impôts/retenues et documentation payouts par pays |
| Data Protection | Données | HOLD LOCK | Base légale KYC, transferts et conservation par pays |
| Information Security | Sécurité | GO SOUS CONDITION | Clés payout côté serveur, IP allowlist, double contrôle |
| Platform Engineering | Disponibilité | GO PILOTE | Ledger payout idempotent et règles server-authoritative |
| Market Data Lead | Infrastructure | HOLD LOCK | Contrat de redistribution et prix enterprise non chiffrés |
| Support Lead | Opérations | GO PILOTE | Scripts simples en français, SLA payout, capacité fraude |
| Finance Operations | Rapprochement | GO SOUS CONDITION | Triple rapprochement commande-compte-payout |
| Analytics Lead | Mesure | GO PILOTE | Cohorte produit x taille x pays x canal x ruleset |
| UX Writing | Clarté | GO PILOTE | Soft daily loss expliqué comme pause, pas breach |
| Customer Advocate | Attractivité | GO SOUS CONDITION | Cap premier payout >=4x prix total de succès |
| Responsible Marketing | Promesses | HOLD LOCK | Interdire funded réel garanti, rendement ou délai garanti |
| Internal Audit | Contrôle | HOLD LOCK | Rejouer le modèle sur exports source et approuver les overrides |

## Ordre de propagation technique

| Ordre | Lot | Contenu | Gate |
| --- | --- | --- | --- |
| 0 | Decision Record de supersession | Remplacer formellement les anciennes valeurs ONE/Performance; versionner toutes les décisions | Aucun code ni copy publique avant approbation |
| 1 | Policy schema canonique | Définir UTC, arrondis, formules EOD/daily, 60s, news, symbols, leverage, caps, splits et reason codes | Contrat reviewé par Product/Risk/Legal |
| 2 | Données et migrations | Policies immuables, account policy snapshot, daily finalization, eligible PnL, cycles, holds, allocation graph | Migrations réversibles et invariants DB |
| 3 | Risk Engine | Pré-trade, soft lock, hard breach, EOD trailing, exposure et circuit breakers | Tests de frontière exacts et concurrence |
| 4 | Order Gateway / WariX execution | Toutes les ouvertures, augmentations, réductions et closes passent par les permissions serveur | Aucun calcul d’autorisation dans le client |
| 5 | PnL et finalisation | Ledger des fills/frais, durée lot-level, jours UTC, Best Day, Performance Days | Rejeu déterministe sur données brutes |
| 6 | Lifecycle ONE/FLEX/INSTANT | pass_pending, revue, activation FLEX, création Performance unique, quotas INSTANT | Transitions idempotentes et auditables |
| 7 | Eligibility, KYC et payout | financially_eligible séparé de ready_to_request; buffer, split, caps, freeze | Aucun payout sans snapshot frais |
| 8 | Adapters PSP / Mobile Money | Capabilities pays/rail, idempotence, webhook, réconciliation, refund/returned | Wave reste masqué tant que le gate pays échoue |
| 9 | Control et kill switches | Cohortes, CAC, reserve, fraud, market-data, quotas et double approbation | RBAC, MFA et audit |
| 10 | Read models API | Compte, risque, progression, KYC, payout, nextAction, méthode disponible | Une seule vérité serveur pour Hub et WariX |
| 11 | WariX | Afficher seuils, reset, exposure, news et permissions; exécuter uniquement ce que le serveur autorise | Pas de checkout, KYC complet ni demande payout |
| 12 | Trader Hub | Comptes, activation FLEX, progression, KYC, payout, contestations et reçus | Aucun doublon fonctionnel avec WariX |
| 13 | Site public / Checkout / Help | Offres, tableaux prix, règles simples, simulateur de payout, statuts pays | Contenu généré depuis policy facts; aucune promesse HOLD |
| 14 | Certification | Unit, property, integration, E2E, replay, accessibilité, responsive, sécurité et evidence bundle | Preuve SHA/policy matching; revue humaine séparée |
| 15 | Activation pilote | Feature flags par produit×taille×pays×canal, quotas et budgets | GO cellule par cellule; arrêt automatique |

## Conditions avant activation publique

Decision Record adopté; 1 000 achats et 90 jours avec 200 achats par produit retenu; marge Stress réalisée >=15% portefeuille et >=10% par cellule; LTV/CAC >=1,5x; CAC observé; réserve/P90 30 jours >=2,5x; Disaster circuit breaker testé; avis UMOA et CEMAC; PSP et market-data contracts; KYC/AML/fiscalité/recours; rapprochement indépendant; validation humaine.

## Caveats

Toutes les performances sont simulées. Les règles de policy sont verrouillées; les capacités pays, rails, contrats provider, réserve, quotas, droit et données économiques réelles restent gated. Aucun résultat de modèle n’est une promesse de marge, de payout, de rendement ou de délai.
