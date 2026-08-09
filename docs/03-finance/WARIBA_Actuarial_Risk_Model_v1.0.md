---
title: "WARIBA Actuarial & Risk Model"
version: "1.0"
document_id: "WARIBA-ACTUARIAL-RISK-MODEL"
status: "CANDIDATE MODEL — À CALIBRER AVEC DONNÉES DE BÊTA"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
market: "Afrique francophone"
owner: "WARIBA Finance, Risk, Product & Operations"
depends_on:
  - "WARIBA Product Master Document v1.1"
  - "WARIBA Program Rulebook v1.1"
  - "WARIBA Financial Model v1.1"
  - "WARIBA_RULESET_v1.1.json"
  - "DECISION_LOG.md"
---

# WARIBA Actuarial & Risk Model v1.0

> **Le but de ce modèle n’est pas de prédire parfaitement les payouts. Il sert à empêcher WARIBA de vendre un risque qu’elle ne peut pas financer.**

## Contrôle du document

| Champ | Valeur |
|---|---|
| Devise commerciale | FCFA / XOF |
| Devise des comptes simulés | USD |
| Produit | WARIBA ONE → WARIBA Performance → WARIBA Review |
| Données historiques WARIBA | Aucune |
| Calibration initiale | Hypothèses conservatrices |
| Statut | Modèle candidat, non validé pour production |
| Horizon | Cohortes de 100, 500, 1 000 et 10 000 achats |

---

# 1. Objet

Le modèle doit déterminer :

1. le revenu net par cohorte ;
2. le taux de réussite maximal soutenable ;
3. le coût attendu des payouts ;
4. la réserve nécessaire ;
5. la rentabilité par taille de compte ;
6. le risque du 50K et du 100K ;
7. le niveau de prix minimal viable ;
8. les conditions d’activation commerciale.

Il ne doit jamais servir à garantir un taux de réussite, à justifier une retenue cachée ou à considérer les ventes futures comme une réserve disponible.

---

# 2. Règles utilisées

## 2.1 WARIBA ONE

| Règle | Valeur |
|---|---:|
| Phases | 1 |
| Objectif | 10 % |
| Daily Loss | 3 % avec soft lock |
| Maximum Loss | 10 % EOD trailing |
| Best Day Rule | 50 % |
| Minimum de jours | Aucun |
| Limite de temps | Aucune |
| Overnight | Autorisé |
| Weekend | Interdit |
| Activation après réussite | Gratuite |

## 2.2 WARIBA Performance

| Règle | Valeur |
|---|---:|
| Buffer permanent | 10 % du nominal |
| Buffer retirable | Non |
| Profit éligible | Excédent réalisé au-dessus du buffer |
| Performance Days | 5 nouvelles journées par payout |
| Seuil par jour | 0,50 % du nominal |
| Best Day Rule | 50 % par cycle |
| Payouts #1 à #4 | 85/15 |
| Payout #5 | 90/10 |
| Après payout #5 | WARIBA Review |
| Payout #6 automatique | Non |

## 2.3 Performance Days

| Compte | Seuil quotidien |
|---|---:|
| 5K | 25 USD |
| 10K | 50 USD |
| 25K | 125 USD |
| 50K | 250 USD |
| 100K | 500 USD |

## 2.4 Levier et exposition

| Classe | Levier maximal |
|---|---:|
| Forex | 1:100 |
| XAUUSD | Jusqu’à 1:50 dynamique |
| NAS100 | Jusqu’à 1:20 |

| Compte | Forex agrégé | XAUUSD | NAS100 |
|---|---:|---:|---:|
| 5K | 0,30 lot | 0,05 lot | 1 contrat WARIBA |
| 10K | 0,60 lot | 0,10 lot | 2 contrats WARIBA |
| 25K | 1,50 lot | 0,25 lot | 5 contrats WARIBA |
| 50K | 3,00 lots | 0,50 lot | 10 contrats WARIBA |
| 100K | 6,00 lots | 1,00 lot | 20 contrats WARIBA |

Marge utilisée maximale :

- Evaluation : 30 % de l’equity ;
- Performance : 25 % de l’equity.

---

# 3. Prix candidats

## 3.1 Prix publics

| Compte | Prix |
|---|---:|
| 5K | 22 500 FCFA |
| 10K | 39 900 FCFA |
| 25K | 84 900 FCFA |
| 50K | 144 900 FCFA |
| 100K | 259 900 FCFA |

## 3.2 Prix fondateurs

| Compte | Prix |
|---|---:|
| 5K | 16 900 FCFA |
| 10K | 34 900 FCFA |
| 25K | 74 900 FCFA |
| 50K | 124 900 FCFA |
| 100K | 229 900 FCFA |

```text
PRICE_STATUS = CANDIDATE_PENDING_ACTUARIAL_VALIDATION
```

---

# 4. Caps nets candidats

| Compte | Payout #1 | Payout #2 | Payout #3 | Payout #4 | Payout #5 |
|---|---:|---:|---:|---:|---:|
| 5K | 250 USD | 350 USD | 500 USD | 750 USD | 1 000 USD |
| 10K | 500 USD | 750 USD | 1 000 USD | 1 500 USD | 2 000 USD |
| 25K | 1 000 USD | 1 500 USD | 2 000 USD | 2 500 USD | 3 000 USD |
| 50K | 2 000 USD | 2 500 USD | 3 000 USD | 4 000 USD | 5 000 USD |
| 100K | 3 000 USD | 4 000 USD | 5 000 USD | 6 000 USD | 8 000 USD |

## Exposition maximale théorique sur cinq payouts

| Compte | Maximum net cumulé |
|---|---:|
| 5K | 2 850 USD |
| 10K | 5 750 USD |
| 25K | 10 000 USD |
| 50K | 16 500 USD |
| 100K | 26 000 USD |

Ces maxima ne sont pas des coûts moyens. Ils supposent cinq cycles réussis au cap.

---

# 5. Variables

## 5.1 Commerciales

| Variable | Symbole |
|---|---|
| Challenges vendus | `N_sold` |
| Prix moyen encaissé | `P_collected` |
| Remboursements | `R_refund` |
| Chargebacks | `R_chargeback` |
| Frais PSP | `C_psp` |
| Support par vente | `C_support` |
| Infrastructure par vente | `C_infra` |
| CAC | `C_cac` |

## 5.2 Progression

| Variable | Symbole |
|---|---|
| Taux de réussite Evaluation | `R_pass` |
| Activation Performance | `R_activate` |
| Construction du buffer | `R_buffer` |
| Éligibilité payout #1 | `R_p1` |
| Progression #1 → #2 | `R_p2` |
| Progression #2 → #3 | `R_p3` |
| Progression #3 → #4 | `R_p4` |
| Progression #4 → #5 | `R_p5` |

## 5.3 Payout

| Variable | Symbole |
|---|---|
| Payout moyen #1 | `A_p1` |
| Payout moyen #2 | `A_p2` |
| Payout moyen #3 | `A_p3` |
| Payout moyen #4 | `A_p4` |
| Payout moyen #5 | `A_p5` |
| Frais de payout | `C_payout_fee` |
| Perte fraude | `C_fraud` |

---

# 6. Formules du modèle

```text
Gross Revenue =
N_sold × P_collected
```

```text
Net Revenue Before Payouts =
Gross Revenue
− Refunds
− Chargebacks
− PSP Fees
− CAC
− Support
− Infrastructure
```

```text
Passed Evaluations =
N_sold × R_pass
```

```text
Performance Activations =
Passed Evaluations × R_activate
```

```text
Buffers Completed =
Performance Activations × R_buffer
```

```text
Payout #1 Recipients =
Buffers Completed × R_p1
```

```text
Payout #2 Recipients =
Payout #1 Recipients × R_p2
```

Même logique jusqu’au payout #5.

```text
Expected Payout Cost =
Σ(Payout Recipients by Rank × Average Payout by Rank)
+ Payout Fees
+ Fraud Losses
```

```text
Contribution Margin =
Net Revenue Before Payouts
− Expected Payout Cost
```

```text
Expected Payout Cost Per Sale =
Expected Payout Cost ÷ N_sold
```

```text
Payout Ratio =
Expected Payout Cost ÷ Gross Revenue
```

---

# 7. Calcul individuel d’un payout

```text
Payout Buffer Floor =
Nominal Balance × 1.10
```

```text
Excess Available =
max(0, Realized Balance − Payout Buffer Floor)
```

```text
Gross Payout Base =
min(
  Excess Available,
  Requested Gross Amount,
  Gross Equivalent Of Net Cap
)
```

Payouts #1 à #4 :

```text
Trader Cash = Gross Payout Base × 0.85
WARIBA Share = Gross Payout Base × 0.15
```

Payout #5 :

```text
Trader Cash = Gross Payout Base × 0.90
WARIBA Share = Gross Payout Base × 0.10
```

```text
Ending Balance =
Starting Realized Balance − Gross Payout Base
```

La balance après payout ne peut jamais descendre sous le Payout Buffer Floor.

---

# 8. Scénarios actuariels

Ces hypothèses sont des outils de stress, pas des prévisions.

## 8.1 Conservative

| Variable | Hypothèse |
|---|---:|
| Pass rate | 5 % |
| Activation Performance | 98 % |
| Buffer completion | 15 % |
| Payout #1 eligibility | 60 % |
| P1 → P2 | 35 % |
| P2 → P3 | 25 % |
| P3 → P4 | 20 % |
| P4 → P5 | 15 % |
| Payout moyen / cap | 35 % |
| Refund | 3 % |
| Chargeback | 1 % |

## 8.2 Base

| Variable | Hypothèse |
|---|---:|
| Pass rate | 8 % |
| Activation Performance | 98 % |
| Buffer completion | 20 % |
| Payout #1 eligibility | 65 % |
| P1 → P2 | 40 % |
| P2 → P3 | 30 % |
| P3 → P4 | 25 % |
| P4 → P5 | 20 % |
| Payout moyen / cap | 45 % |
| Refund | 4 % |
| Chargeback | 1,5 % |

## 8.3 Aggressive

| Variable | Hypothèse |
|---|---:|
| Pass rate | 12 % |
| Activation Performance | 99 % |
| Buffer completion | 30 % |
| Payout #1 eligibility | 70 % |
| P1 → P2 | 50 % |
| P2 → P3 | 40 % |
| P3 → P4 | 35 % |
| P4 → P5 | 30 % |
| Payout moyen / cap | 60 % |
| Refund | 5 % |
| Chargeback | 2 % |

## 8.4 Stress

| Variable | Hypothèse |
|---|---:|
| Pass rate | 18 % |
| Activation Performance | 100 % |
| Buffer completion | 40 % |
| Payout #1 eligibility | 80 % |
| P1 → P2 | 60 % |
| P2 → P3 | 50 % |
| P3 → P4 | 45 % |
| P4 → P5 | 40 % |
| Payout moyen / cap | 80 % |
| Refund | 7 % |
| Chargeback | 3 % |

---

# 9. Hypothèses de coûts

| Coût | Hypothèse initiale |
|---|---:|
| PSP encaissement | 3,5 % |
| Frais payout | 2,0 % du payout |
| Support par vente | 1 500 FCFA |
| Infrastructure par vente | 750 FCFA |
| Fraude | 1 % du payout en Base |
| CAC | 0 à 8 000 FCFA selon canal |

Le CAC doit être suivi séparément pour l’organique, l’affiliation, les influenceurs, la publicité et les partenariats.

---

# 10. Mix produit

## 10.1 Lancement prudent

| Compte | Part des ventes |
|---|---:|
| 5K | 25 % |
| 10K | 50 % |
| 25K | 20 % |
| 50K | 5 % |
| 100K | 0 % |

## 10.2 Public élargi

| Compte | Part des ventes |
|---|---:|
| 5K | 20 % |
| 10K | 40 % |
| 25K | 25 % |
| 50K | 10 % |
| 100K | 5 % |

Le 100K reste désactivé tant que les conditions de gate ne sont pas remplies.

---

# 11. Réserve payout

La réserve payout est séparée de la trésorerie d’exploitation.

Elle exclut :

- les ventes futures ;
- le nominal simulé ;
- les créances ;
- les fonds nécessaires aux salaires, taxes et infrastructure.

```text
Required Payout Reserve =
Projected Payouts Next 30 Days × Safety Multiplier
```

## Multiplicateurs candidats

| Phase | Multiplicateur |
|---|---:|
| Bêta payante | 3,0x |
| Lancement limité | 2,5x |
| Opérations stables | 2,0x |

```text
Reserve Coverage =
Available Payout Reserve
÷
Projected Payouts Next 30 Days
```

| Coverage | Statut | Action |
|---|---|---|
| ≥ 2,0x | Normal | Ventes normales |
| 1,5x–2,0x | Prudence | Réduire promotions |
| 1,2x–1,5x | Défensif | Désactiver 50K/100K |
| < 1,2x | Critique | Suspendre ventes futures |

Aucun payout gagné ne peut être réduit rétroactivement.

---

# 12. Gate de réserve par compte

| Compte | Gate avant activation |
|---|---|
| 5K | Couvrir 10 payouts #1 moyens Base |
| 10K | Couvrir 10 payouts #1 moyens Base |
| 25K | Couvrir 10 payouts #1 moyens Stress |
| 50K | Couvrir 10 payouts #1 au cap |
| 100K | Couvrir 10 payouts #1 au cap + validation CFO/Risk |

| Compte | Cap #1 | Réserve pour 10 payouts au cap |
|---|---:|---:|
| 5K | 250 USD | 2 500 USD |
| 10K | 500 USD | 5 000 USD |
| 25K | 1 000 USD | 10 000 USD |
| 50K | 2 000 USD | 20 000 USD |
| 100K | 3 000 USD | 30 000 USD |

Ces réserves sont des gates commerciales, pas des dépenses nécessaires pour construire la bêta sandbox.

---

# 13. Cohortes à simuler

## 100 ventes

Mesurer :

- activation ;
- support ;
- exposition utilisée ;
- qualité des règles ;
- comportement des traders.

## 500 ventes

Mesurer :

- pass rate ;
- buffer completion ;
- payout #1 ;
- payout moyen ;
- remboursements et chargebacks.

## 1 000 ventes

Décider :

- prix définitifs ;
- ouverture du 50K ;
- caps ;
- réserve ;
- promotions.

## 10 000 ventes

Tester :

- concentration des payouts ;
- ouverture du 100K ;
- variance extrême ;
- besoin de capital ;
- scaling.

---

# 14. Break-even

```text
Unit Contribution =
Collected Price
− PSP Fee
− Refund Cost
− Chargeback Cost
− Support Cost
− Infrastructure Cost
− Expected Payout Cost Per Sale
− CAC
```

```text
Break-even Sales =
Fixed Monthly Costs
÷
Average Unit Contribution
```

Un produit ne doit pas être vendu si sa contribution unitaire Base est négative.

Le 50K et le 100K doivent également survivre à une variante située entre Aggressive et Stress.

---

# 15. Risques de concentration

```text
Payout Concentration By Product =
Product Payout Cost ÷ Total Payout Cost
```

```text
Top 10 Trader Concentration =
Payouts To Top 10 Traders ÷ Total Payouts
```

Gate candidat :

> Aucun produit ne doit représenter plus de 40 % du passif payout projeté sans revue Risk/CFO.

---

# 16. Stress tests obligatoires

1. Pass rate doublé.
2. Payout moyen égal au cap.
3. Chargebacks doublés.
4. CAC doublé.
5. Dollar +15 % face au FCFA.
6. Vingt traders 50K/100K atteignent un cap le même mois.
7. Bug permettant un double payout.
8. Buffer mal appliqué.
9. Campagne d’affiliation à forte fraude.
10. Concentration inhabituelle sur le 100K.

---

# 17. Risque de change

Les ventes sont en FCFA et les obligations payout peuvent être libellées en USD.

```text
FX Exposure =
USD Payout Liability
− USD Reserve Or Hedge
```

Règles candidates :

- source et timestamp du taux enregistrés ;
- spread transparent ;
- marge de change incluse dans la réserve ;
- recalcul de la réserve après variation importante ;
- buffer FX candidat de 5 % des payouts projetés.

---

# 18. Données à collecter

## Commerce

- compte acheté ;
- prix encaissé ;
- promotion ;
- PSP ;
- source ;
- refund ;
- chargeback.

## Evaluation

- premier trade ;
- temps jusqu’au breach ;
- temps jusqu’au pass ;
- pass rate ;
- Best Day ;
- exposition moyenne ;
- marge maximale utilisée.

## Performance

- activation ;
- buffer construit ;
- délai jusqu’au buffer ;
- Performance Days ;
- breach avant payout ;
- éligibilité.

## Payout

- montant demandé ;
- montant approuvé ;
- rang ;
- cap atteint ;
- délai ;
- frais ;
- fraude ;
- dispute.

## Support

- tickets par vente ;
- tickets par payout ;
- coût ;
- motif ;
- délai de résolution.

---

# 19. Calibration

## Après 100 ventes

Réviser :

- support ;
- chargeback ;
- exposition ;
- compréhension des règles.

## Après 500 ventes

Réviser :

- pass rate ;
- buffer completion ;
- payout #1 ;
- payout moyen ;
- CAC.

## Après 1 000 ventes

Décider :

- prix ;
- ouverture 50K ;
- caps ;
- réserve.

## Après 5 000 ventes

Décider :

- ouverture 100K ;
- scaling ;
- caps avancés ;
- éventuel payout #6 ;
- éventuelle allocation Live.

---

# 20. Gates de prix

Un prix peut passer de `CANDIDATE` à `LOCKED` si :

- contribution Base positive ;
- scénario Aggressive supportable ;
- Stress absorbable par la réserve ;
- CAC réaliste ;
- support financé ;
- payout ratio acceptable ;
- absence de dépendance aux ventes futures.

Un prix est refusé si le modèle dépend :

- d’un pass rate artificiellement faible ;
- de retenues non annoncées ;
- de retards arbitraires de payout ;
- de nouvelles ventes pour payer les anciens traders ;
- d’une ouverture non financée du 50K ou du 100K.

---

# 21. Gates d’activation commerciale

## 5K

Activable après validation PSP et bêta.

## 10K

Produit principal, activable après scénarios Base et Aggressive.

## 25K

Réserve dédiée obligatoire.

## 50K

Exige :

- scénario Stress ;
- réserve couvrant 20 000 USD de payouts #1 au cap ;
- validation Risk/CFO ;
- feature flag.

## 100K

Exige :

- au moins 1 000 ventes réelles analysées ;
- scénario Stress soutenable ;
- réserve couvrant 30 000 USD de payouts #1 au cap ;
- limite de ventes ;
- validation Risk/CFO ;
- feature flag renforcé.

---

# 22. Décisions initiales

| ID | Statut | Décision |
|---|---|---|
| ARM-001 | `LOCKED` | Prix candidats avant calibration. |
| ARM-002 | `LOCKED` | Caps candidats avant Stress test. |
| ARM-003 | `LOCKED` | Le nominal simulé n’est jamais une réserve. |
| ARM-004 | `LOCKED` | Réserve payout séparée. |
| ARM-005 | `LOCKED` | Les revenus futurs ne financent pas les obligations actuelles. |
| ARM-006 | `LOCKED` | 50K sous feature flag. |
| ARM-007 | `LOCKED` | 100K sous feature flag renforcé. |
| ARM-008 | `LOCKED` | Aucun payout gagné n’est réduit rétroactivement. |
| ARM-009 | `LOCKED` | Quatre scénarios obligatoires. |
| ARM-010 | `LOCKED` | Les données réelles remplacent les hypothèses. |
| ARM-011 | `CANDIDATE` | Prix publics : 22 500 / 39 900 / 84 900 / 144 900 / 259 900 FCFA. |
| ARM-012 | `CANDIDATE` | Prix fondateurs : 16 900 / 34 900 / 74 900 / 124 900 / 229 900 FCFA. |
| ARM-013 | `CANDIDATE` | Multiplicateur initial de réserve : 3,0x. |
| ARM-014 | `CANDIDATE` | Buffer FX : 5 %. |
| ARM-015 | `OPEN` | CAC réel. |
| ARM-016 | `OPEN` | Frais PSP réels. |
| ARM-017 | `OPEN` | Pass rate réel. |
| ARM-018 | `OPEN` | Payout moyen réel. |
| ARM-019 | `OPEN` | Coût support réel. |
| ARM-020 | `OPEN` | Fraude réelle. |

---

# 23. Verdict

WARIBA peut rester accessible uniquement si :

1. l’évaluation filtre réellement ;
2. le buffer de 10 % réduit fortement l’accès au premier payout ;
3. les caps contrôlent le risque extrême ;
4. la réserve existe avant l’ouverture des grands comptes ;
5. le 50K et le 100K restent désactivables ;
6. les prix sont recalibrés avec des données réelles.

Le modèle devient dangereux si :

- le pass rate dépasse fortement les hypothèses ;
- le buffer est trop facile à construire ;
- les caps sont atteints fréquemment ;
- le dollar monte fortement ;
- les chargebacks sont sous-estimés ;
- WARIBA paie les anciens traders avec les ventes futures.

Cette version 1.0 constitue le cadre actuariel initial. Elle doit être transformée en modèle calculable avant que les prix, les caps, le 50K et le 100K puissent passer au statut définitif.

---

# 24. Appendice 08-A — configuration persistée et preuve de modèle

Les constantes `SCENARIO_ASSUMPTIONS` sont seulement des seeds. L'autorité
éditable est `app.actuarial_scenario_assumptions` : nom, version, hypothèses,
créateur, date, statut effectif, notes et motif. Chaque run conserve un snapshot
immuable des hypothèses et inputs ainsi que le résultat. Les scénarios
Conservative, Base, Aggressive, Stress et Custom sont modifiables/exécutables
dans Control, avec historique et comparaison.

MODEL, ACTUAL et VARIANCE sont trois artefacts distincts et ne se recouvrent
jamais. MODEL est la simulation : hypothèses persistées en entrée, cohorte
projetée en sortie, figée dans `app.actuarial_scenario_runs`. ACTUAL est
mesuré exclusivement à partir de lignes réellement écrites par la plateforme
(`app.purchase_orders` payés, comptes WARIBA_PERFORMANCE, comptes ayant
atteint le buffer, payouts `paid` par rang, coût net des reversals) —
aucune imputation, aucune extrapolation. VARIANCE est la différence
déterministe `actual − model`, métrique par métrique, enregistrée dans
`app.actuarial_variance_runs` avec `as_of`, taille de cohorte modélisée,
taille d'échantillon réel, identité de métrique, valeur MODEL, valeur ACTUAL,
variance absolue et variance relative.

Un enregistrement de variance n'écrit jamais en retour sur le run MODEL, et
ACTUAL n'est jamais ajusté vers MODEL. Quand la plateforme n'a pas encore
produit assez de données réelles, `coverage` vaut `insufficient_data`
(échantillon nul) ou `partial` (moins de 30 achats réels) plutôt que de
présenter un écart nul comme une validation. C'est précisément pourquoi
`ACTUARIAL_MODEL_VALIDATED` reste **false** : le sandbox ne fournit pas
l'échantillon qu'une validation actuarielle réelle exigerait.

Les cohortes 100/500/1 000/10 000 et les invariants de comptes non négatifs,
rangs non croissants, produit désactivé à zéro, coûts bornés et totaux
réconciliés sont testés. Les conversions `Number` restent confinées aux
headcounts entiers probabilistes ; toutes les valeurs monétaires utilisent
Decimal.js et PostgreSQL `numeric`.
