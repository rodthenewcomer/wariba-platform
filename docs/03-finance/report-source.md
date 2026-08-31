# WARIBA Offer Economics & Acquisition V1

Date de contrôle : 26 août 2026. Statut : **décision de pilote, pas LOCK**. Périmètre : ONE, FLEX, INSTANT; 5K/10K/25K/50K/100K; Côte d’Ivoire, Cameroun, Sénégal, Bénin, Burkina Faso, Togo. Aucun code produit ou frontend n’a été modifié.

## Executive Summary

Le portefeuille **CANDIDAT** respecte le critère économique en **Stress**, mais pas en **Disaster**. Avec le mix de souscription **HYPOTHÈSE** 30% ONE / 60% FLEX / 10% INSTANT, et le mix de tailles **HYPOTHÈSE** 25% 5K / 30% 10K / 25% 25K / 15% 50K / 5% 100K :

- Base : contribution moyenne 27 298 XOF par achat; marge 60,1%; LTV/CAC 3,58x.
- Stress : contribution moyenne 8 212 XOF; marge 16,5%; LTV/CAC 1,50x; réserve requise 2,5x = 24 965 XOF par achat, soit 25,0 M XOF par 1 000 achats.
- Disaster : contribution moyenne -80 232 XOF; marge -143,5%; réserve requise = 170,2 M XOF par 1 000 achats.
- Un mix bas de gamme avec 45% de 5K réduit la marge Stress à 4,6%. Un choc CAC +25% la réduit à 8,3%; un choc payout +25% à 8,7%.

**Décision recommandée :** ne pas LOCK les policies maintenant. Autoriser un pilote révocable, instrumenté, avec tailles et pays gated, CAC caps et réserve dédiée. Le 5K ne doit pas être scalé sur Meta : il reste une porte d’entrée organique/partenaire. FLEX 2% et 3% sont rejetés; FLEX 4% est le seul candidat. Le trio 5 Performance Days + buffer + caps progressifs est soutenu par plusieurs références officielles futures et CFD, mais les valeurs WARIBA restent CANDIDATES.

## Decision

### Offre candidate

| Produit | Evaluation | Daily loss | Max loss | Buffer | Best Day | Payout | Leverage | Verdict |
|---|---:|---:|---:|---:|---:|---|---|---|
| ONE | target 8% | 3% soft pause | 8% EOD trailing | 2% | 35% | 5 jours à +0,5%; 80/85/90%; caps | Eval FX 1:50, metals 1:20, indices 1:20, energies 1:10; Performance 1:30/1:15/1:10/1:10 | GO pilote 25K/50K/100K; 10K limité; 5K organique |
| FLEX | target 4% | 3% soft pause | 6% EOD trailing | 3% | 35% | même moteur Performance | Même variante équilibrée que ONE | GO pilote 25K/50K; 100K limité; 5K/10K sans paid scale |
| INSTANT | aucune évaluation | 2% soft pause | 5% EOD trailing | 3% | 30% | 5 jours à +0,5%; mêmes splits/caps | FX 1:30, metals 1:10, indices 1:10, energies 1:5 | 25K beta plafonnée; 50K/100K seulement avec réserve; 5K non scalable |

Les leviers sont des **CANDIDATS**. Le produit doit bloquer les ordres surdimensionnés côté serveur. Une soft daily loss suspend le trading jusqu’au prochain jour; elle ne clôt pas automatiquement le compte et ne doit jamais être présentée comme une breach.

### Prix candidat XOF

| Produit | 5K | 10K | 25K | 50K | 100K |
|---|---:|---:|---:|---:|---:|
| ONE | 19 900 | 34 900 | 69 900 | 119 900 | 199 900 |
| FLEX upfront + activation | 9 900 + 25 900 | 14 900 + 39 900 | 24 900 + 109 900 | 34 900 + 184 900 | 44 900 + 269 900 |
| INSTANT | 39 900 | 59 900 | 99 900 | 169 900 | 279 900 |

Le prix total FLEX n’a pas augmenté par rapport au candidat précédent; une part plus importante a été déplacée à l’upfront pour éviter que WARIBA finance seule la sélection des traders. Ce changement est **CANDIDAT**.

### Opportunité trader

Caps nets **CANDIDATS** des payouts #1-2 : $250 / $400 / $900 / $1 500 / $2 500 selon 5K/10K/25K/50K/100K. Au taux de planification **HYPOTHÈSE** de 600 XOF/USD, le premier cap vaut :

- ONE : 6,9x à 7,7x le prix d’achat.
- FLEX : 4,0x à 4,8x le prix total payé en cas de succès.
- INSTANT : 3,8x à 5,4x; le 5K est sous le plancher de 4x et n’est pas recommandé en paid scale.

Ces multiples sont des plafonds d’opportunité, pas une promesse de gain. Toutes les performances sont simulées; un payout est une reward contractuelle, jamais une garantie de capital réel financé.

## Findings

### Formules du modèle

Pour chaque cellule produit × taille × pays × scénario :

1. `CA attendu = upfront + pass rate × activation rate × activation fee` pour FLEX; prix payé sinon.
2. `Entrée Performance = pass rate` pour ONE; `pass × activation` pour FLEX; 100% pour INSTANT.
3. `Payout attendu = entrée Performance × payout incidence × somme des cycles nets, après buffer, split et caps`.
4. `Contribution avant CAC = CA - frais encaissement - fraude/chargeback - support/infra/KYC - payout - frais payout`.
5. `Contribution après CAC = contribution avant CAC - CAC`.
6. `LTV/CAC = contribution avant CAC / CAC`.
7. `Break-even CAC = contribution avant CAC`.
8. `Réserve requise = payout attendu 30 jours × 2,5` (**CANDIDAT**).

Le modèle traite la réserve comme contrainte de liquidité, pas comme une charge P&L additionnelle.

### Hypothèses de scénarios

| Variable | Base | Stress | Disaster | Statut |
|---|---:|---:|---:|---|
| Pass ONE target 8 | 8% | 12% | 18% | HYPOTHÈSE |
| Pass FLEX target 4 | 15% | 24% | 36% | HYPOTHÈSE |
| Activation FLEX | 70% | 78% | 85% | HYPOTHÈSE |
| Incidence payout conditionnelle ONE/FLEX | 22% | 33% | 50% | HYPOTHÈSE; ancre externe Topstep 33,3% en 2025 |
| Incidence payout INSTANT | 10% | 18% | 35% | HYPOTHÈSE |
| Cycles ONE/FLEX | 1,3 | 1,8 | 2,6 | HYPOTHÈSE |
| Frais encaissement | 4% | 6% | 8% | HYPOTHÈSE |
| Fraude/chargeback | 1,2% | 2,5% | 5% | HYPOTHÈSE |
| CAC | base pays×produit | ×1,55 | ×2,40 | HYPOTHÈSE |

Topstep publie 16,8% de Trading Combines réussis, 33,3% des participants au niveau funded ayant reçu un payout, et 0,71% appelés au live en 2025. Ce n’est pas directement transposable au CFD WARIBA, mais c’est une ancre utile et officielle ([Topstep risk disclosure](https://www.topstep.com/risk-disclosure)). Take Profit Trader publie 36,22% de tests passés en 2025; ses conditions et promotions sont différentes ([TPT](https://takeprofittrader.com/control-center)).

### Unit economics par produit

| Produit | Base CM | Base LTV/CAC | Stress CM | Stress LTV/CAC | Break-even CAC Stress | Disaster CM |
|---|---:|---:|---:|---:|---:|---:|
| ONE | 66,6% | 4,35x | 31,2% | 2,01x | 37 729 XOF | -85,8% |
| FLEX | 51,7% | 2,82x | 2,4% | 1,07x | 13 997 XOF | -187,8% |
| INSTANT | 63,7% | 4,14x | 21,6% | 1,69x | 49 059 XOF | -121,7% |
| Portefeuille | 60,1% | 3,58x | 16,5% | 1,50x | 24 623 XOF | -143,5% |

FLEX est le maillon le plus fragile : son CAC Stress souscrit est 13 129 XOF, très proche du break-even de 13 997 XOF. Il faut un coupe-circuit automatique, par cohorte et non en moyenne globale.

### Tailles à ouvrir

| Produit | 5K | 10K | 25K | 50K | 100K |
|---|---|---|---|---|---|
| ONE | NO PAID SCALE (-39,8% CM Stress) | limité (8,2%) | GO pilote (37,2%) | GO pilote (47,6%) | GO pilote (50,4%) |
| FLEX | NO PAID SCALE (-52,6%) | NO PAID SCALE (-18,0%) | GO pilote (16,2%) | GO pilote (18,8%) | limité (4,5%) |
| INSTANT | NO PAID SCALE (-20,3%) | limité (7,8%) | GO pilote (24,7%) | GO pilote (35,9%) | GO pilote financier (38,0%), mais réserve/opérations à valider |

La disponibilité « jusqu’à 100K » est maintenue. Elle ne signifie pas que chaque combinaison doit être exposée à la publicité payante dès le premier jour.

### Pays × CAC

Les audiences Facebook sont des estimations de portée publicitaire Meta, pas des utilisateurs actifs uniques. Fin 2025 : Côte d’Ivoire 8,40 M, Cameroun 5,90 M, Sénégal 3,60 M, Bénin 2,50 M, Burkina Faso 3,90 M, Togo 0,644 M. Sources : [Côte d’Ivoire](https://datareportal.com/reports/digital-2026-cote-divoire), [Cameroun](https://datareportal.com/reports/digital-2026-cameroon), [Sénégal](https://datareportal.com/reports/digital-2026-senegal), [Bénin](https://datareportal.com/reports/digital-2026-benin), [Burkina Faso](https://datareportal.com/reports/digital-2026-burkina-faso), [Togo](https://datareportal.com/reports/digital-2026-togo).

| Pays | CAC ONE Base | FLEX Base | INSTANT Base | CAC ONE Stress | Caveat |
|---|---:|---:|---:|---:|---|
| Côte d’Ivoire | 11 000 | 7 700 | 17 050 | 17 050 | CPC externes indicatifs 50-150 XOF; pas de data WARIBA |
| Cameroun | 12 000 | 8 400 | 18 600 | 18 600 | CPC indicatifs 50-300 XOF; marché CEMAC distinct |
| Sénégal | 15 000 | 10 500 | 23 250 | 23 250 | CPC conversion observé 250-450 XOF sur 22 comptes d’agence |
| Bénin | 10 000 | 7 000 | 15 500 | 15 500 | benchmark local faible; hypothèse à tester |
| Burkina Faso | 11 500 | 8 050 | 17 825 | 17 825 | hypothèse à tester |
| Togo | 14 000 | 9 800 | 21 700 | 21 700 | audience Meta anormale/volatile; paid scale interdit au départ |

Repères non officiels de marché, utiles uniquement pour borner les hypothèses : [Sénégal](https://kolonell.com/en/blog/meta-ads-senegal-budget-sme-roi-2026), [Côte d’Ivoire](https://blog.iambeezy.app/fr/publicite-facebook-ads-pme-cote-ivoire-budget-ciblage-roi-2026/), [Cameroun](https://www.beonweb.cm/fr/blog/publicite-facebook-cameroun-guide-complet-2027). Aucun CAC WARIBA n’est prouvé avant pilote.

### Competitor evidence

Les règles current ont été contrôlées sur des pages officielles. Principaux enseignements :

- FTMO 1-Step : target 10%, daily 3%, max loss 10% EOD trailing, Best Day 50%, split 90%, payout à partir du jour 14 ([rules](https://ftmo.com/en/trading-objectives/), [payout](https://ftmo.com/en/faq/how-do-i-withdraw-my-profits/)).
- ForTraders Pay After Pass : target 2%, daily 3%, max 6% trailing equity, buffer 3%, Best Day 20%, split 80%, activation sous 5 jours ([official help](https://help.fortraders.com/en/articles/15359294-pay-after-pass-account-forex)). Son Instant affiche max loss 5%, buffer 3%, Best Day 15%, 7 profitable days et split 70→90 ([Instant](https://help.fortraders.com/en/articles/15379105-instant-account-forex)).
- FundedNext Stellar 1-Step : target 10%, daily 3%, max 6% static, minimum 2 jours, split 80→95 et cycle standard de 5 jours ouvrés ([offer](https://offer.fundednext.com/stellar50), [reward](https://help.fundednext.com/en/articles/8021119-can-i-reset-my-account-anytime)).
- E8 Signature : target 6%, daily pause 2%, Best Day 35%, buffer voisin du drawdown, 5 jours profitables entre payouts et caps progressifs ([E8 Signature](https://help.e8markets.com/en/articles/11755943-e8-signature-forex)).
- GOAT 1-Step : target 10%, daily 3%, max 6%, 4 jours valides à +0,5%; Sénégal et Togo sont publiés comme restreints ([rules](https://help.goatfundedtrader.com/en/articles/10630134-1-step-model), [countries](https://help.goatfundedtrader.com/en/articles/10742264-how-payouts-work-eligibility-request-processing-and-arrival)).
- Apex : 5 jours qualifiants, Best Day 50%, safety net = drawdown + $100, split 100% et six caps progressifs ([Apex payouts](https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-payouts/)).
- Tradeify : Growth 5 jours et Best Day 35%; Select Flex 5 jours; soft Daily Loss sur plusieurs offres ([pricing](https://help.tradeify.co/en/articles/14369021-tradeify-pricing-reference), [payouts](https://help.tradeify.co/en/articles/11083796-growth-funded-account-payout-policy)).
- MyFundedFutures Flex : 5 jours à seuil nominal, pas de consistency funded, soft pause optionnelle et cap de payout ([MFFU Flex](https://help.myfundedfutures.com/en/articles/15072271-flex-plan-50-000-a-comprehensive-guide)).
- Topstep : 5 journées gagnantes; la société publie que 63% ont perdu leur Combine au jour 1 dans son contexte, ce qui soutient le principe de soft daily risk ([Topstep payout](https://help.topstep.com/en/articles/8284233-topstep-payout-policy), [DLL](https://www.topstep.com/blog/what-is-a-daily-loss-limit)).
- Take Profit Trader : payout au jour 1 au-dessus d’un buffer égal au drawdown; 80%, pas de consistency funded, puis PRO+ 90% sans buffer ([TPT payout](https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172219527581-PRO-Account-Profit-Split-Withdrawal-Rules)).

La matrice complète des 14 acteurs est dans le workbook. Les prix promotionnels, devises et configurations dynamiques sont signalés; les cases current non accessibles sans checkout sont marquées non publiées, jamais devinées.

### Paiements, fraude et infrastructure

Wave publie des APIs de checkout, payout, balance et rapprochement; les payouts sont idempotents et les clés donnent accès à des mouvements de fonds, donc elles doivent rester côté serveur ([Wave Business APIs](https://docs.wave.com/business)). La page Business annonce 1% pour les paiements en masse et 1% au-delà des premiers 20 000 XOF/jour pour l’acceptation physique, mais les tarifs checkout/payout contractuels par pays restent à confirmer ([Wave Business](https://www.wave.com/fr/business/)). La documentation exige que wallet business et destinataire soient dans le même pays pour certains payouts ([Wave payout](https://docs.wave.com/payout/)).

La BCEAO encadre les services de paiement dans l’UMOA et publie 31 établissements de paiement agréés au 28 février 2026. WARIBA doit contracter avec un PSP autorisé et obtenir un avis sur son propre rôle; intégrer une API ne transforme pas WARIBA en PSP ([Instruction 001-01-2024](https://downloads.bceao.int/fr/reglementations/instruction-ndeg001-01-2024-du-23-janvier-2024-relative-aux-services-de-paiement), [liste 2026](https://downloads.bceao.int/index.php/fr/communique-presse/liste-des-etablissements-de-paiement-agrees-dans-lumoa-au-28-fevrier-2026)). Le Cameroun nécessite une analyse CEMAC séparée.

Visa publie pour CEMEA un seuil VAMP « excessive merchant » de 220 points de base, sous conditions de volume et montant. Ce seuil n’est pas une cible acceptable; WARIBA doit déclencher bien avant ([Visa VAMP](https://corporate.visa.com/content/dam/VCOM/corporate/visa-perspectives/security-and-trust/documents/visa-acquirer-monitoring-program-fact-sheet-2025.pdf)). Les hypothèses 1,2% / 2,5% / 5% représentent donc des scénarios économiques, pas des standards de conformité.

Les prix enterprise de redistribution de données ne sont pas publics. Twelve Data publie $229/mois pour un plan individuel Pro et $999/mois Ultra, mais l’usage commercial nécessite un contrat adapté ([Twelve Data](https://twelvedata.com/pricing)). MetaTrader 5 ne publie pas son tarif serveur; l’hébergement et le contrôle restent chez le client ([MetaTrader 5](https://www.metatrader5.com/en/brokers/buy)). Les coûts infra WARIBA sont donc **HYPOTHÈSES** tant que les devis enterprise ne sont pas signés.

## Council review — 45 rôles

Conseil simulé de revue multi-rôles, pas vote de personnes réelles : 16 GO PILOTE, 12 GO SOUS CONDITION, 13 HOLD LOCK, 4 holds spécialisés (leverage agressif, paid scale, promesse Wave, scale INSTANT). Consensus : pilote oui; LOCK non.

Les objections bloquantes convergent sur six points : Disaster non financé, CAC non observé, incidence/cycles payout non observés, droit local non signé, Wave non validé pays par pays, et licence market-data enterprise non chiffrée.

## Conditions de LOCK

1. **Gouvernance** — adopter un Decision Record qui remplace formellement les règles constitutionnelles actuellement marquées locked pour ONE (10/3/10/Best Day 50, buffer 10). Sans supersession, le candidat 8/3/8/35/2 est seulement une proposition.
2. **Cohortes** — minimum 1 000 achats payés et 90 jours, avec au moins 200 achats par produit retenu; intervalles de confiance sur pass, activation, incidence payout, cycles et payout size.
3. **Economics** — contribution réalisée Stress ≥15% au portefeuille et ≥10% par cellule scalée; LTV/CAC ≥1,5x; aucun pays compensé par une moyenne globale.
4. **CAC** — CAC observé par pays×produit×taille×canal; arrêt automatique au break-even CAC minoré de 20%.
5. **Réserve** — réserve liquide dédiée / P90 payouts 30 jours ≥2,5x; trésorerie disponible avant activation des caps.
6. **Disaster** — circuit breaker contractuel et technique : pause ventes/réduction leverage/caps de cohortes, pas de changement rétroactif des droits acquis.
7. **Legal** — avis écrits UMOA et Cameroun; consumer terms; qualification fiscale des fees et rewards; KYC/AML/sanctions; données et recours.
8. **Payments** — contrats PSP agréés, matrice pays/rail/fee/limite, tests payout/réconciliation/refund/chargeback; Wave seulement après validation juridique et technique.
9. **Trading** — règles server-authoritative, EOD précis, ordre surdimensionné rejeté avant exécution, jours et Best Day recalculables.
10. **Market data** — contrats enterprise signés pour usage commercial, affichage et simulation; coûts intégrés au modèle.
11. **Copy** — français simple; « compte simulé », « pause quotidienne », « payout/reward »; aucune promesse de rendement, de capital réel ou de délai garanti.
12. **Audit** — rapprochement indépendant du workbook, des exports de cohortes et du ledger de payouts; validation humaine du conseil avant LOCK.

## Claim-to-source ledger

| Claim | Classification | Evidence | Caveat |
|---|---|---|---|
| 5 Performance Days est commercialement défendable | PROUVÉ comme pratique concurrente | Topstep, Apex, Tradeify, MFFU, E8 | Ne prouve pas le taux WARIBA |
| Soft daily loss est défendable | PROUVÉ comme mécanisme | Topstep, Tradeify, MFFU, E8 | Seuils WARIBA CANDIDATS |
| Meta permet une audience significative dans les six pays | PROUVÉ comme portée publicitaire estimée | DataReportal/Meta | Pas utilisateurs actifs ni acheteurs |
| CAC pays | HYPOTHÈSE | CPC externes + conversion souscrite | Pilote requis |
| Pass rates et payout incidence WARIBA | HYPOTHÈSE | scénarios + ancre Topstep/TPT | Non observés WARIBA |
| Prix et caps WARIBA | CANDIDAT | modèle économique | Pas LOCK |
| Wave est un avantage stratégique | CANDIDAT | APIs et présence publique | Pays, contrat, droit et limites non validés |
| Portefeuille rentable en Stress | RÉSULTAT DE MODÈLE | workbook, hypothèses V1 | Sensible au mix, CAC et payout |
| Portefeuille rentable en Disaster | FAUX dans V1 | workbook | Condition de LOCK non satisfaite |

## Sources et fraîcheur

Toutes les pages concurrentes et réglementaires ont été contrôlées le 26 août 2026. Les promotions peuvent expirer et les pages de checkout peuvent varier par devise, pays ou configuration. Le workbook conserve l’URL et la date de contrôle par concurrent. Les hypothèses sont éditables et ne doivent pas être republiées comme faits.
