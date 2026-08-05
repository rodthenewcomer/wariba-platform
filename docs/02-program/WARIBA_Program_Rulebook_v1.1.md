---
title: "WARIBA Program Rulebook — Addendum"
version: "1.1.1"
document_id: "WARIBA-PROGRAM-RULEBOOK-1.1.1"
status: "ACTIVE CANDIDATE POLICY — PRIVATE SANDBOX"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
effective_from: "2026-08-03"
supersedes_sections_of: "WARIBA_Program_Rulebook_v1.0.md"
machine_source: "WARIBA_RULESET_v1.1.json"
---

# WARIBA Program Rulebook — Addendum v1.1.1

> Cet addendum remplace les règles financières v1.0 citées ci-dessous. Le Rulebook v1.0 reste applicable pour les sections non remplacées. La non-rétroactivité demeure obligatoire : un compte conserve la policy version qu’il a acceptée.

## 1. Tailles de comptes WARIBA ONE

| Compte | Balance nominale simulée |
|---|---:|
| WARIBA 5K | 5 000 USD |
| WARIBA 10K | 10 000 USD |
| WARIBA 25K | 25 000 USD |
| WARIBA 50K | 50 000 USD |
| WARIBA 100K | 100 000 USD |

Chaque taille possède un feature flag indépendant. Les cinq tailles sont actives dans le catalogue, le checkout et l’activation Evaluation de la bêta sandbox. Une taille peut rester non commercialisée publiquement même lorsqu’elle est disponible techniquement.

## 2. Tarification WARIBA ONE v1.1

| Compte | Prix public candidat | Prix fondateur candidat | Équivalent USD indicatif |
|---|---:|---:|---:|
| WARIBA 5K | 22 500 FCFA | 16 900 FCFA | ≈ 39 USD |
| WARIBA 10K | 39 900 FCFA | 34 900 FCFA | ≈ 69 USD |
| WARIBA 25K | 84 900 FCFA | 74 900 FCFA | ≈ 148 USD |
| WARIBA 50K | 144 900 FCFA | 124 900 FCFA | ≈ 252 USD |
| WARIBA 100K | 259 900 FCFA | 229 900 FCFA | ≈ 452 USD |

```text
PRICE_STATUS = CANDIDATE_PENDING_ACTUARIAL_VALIDATION
COMMERCIAL_CURRENCY = XOF
SETTLEMENT_CURRENCY = XOF
PRIMARY_DISPLAYED_PRICE = FCFA
USD_EQUIVALENT = INFORMATIONAL_ONLY
EXCHANGE_RATE_EXPOSURE = WARIBA
```

Le prix contractuel du checkout est figé en FCFA. Aucun frais d’activation ni abonnement mensuel obligatoire ne s’ajoute. Le prix fondateur exige une cohorte réelle et explicitement activée.

## 3. WARIBA ONE — Règles d’évaluation v1.1

| Règle | Valeur |
|---|---:|
| Phases | 1 |
| Objectif de profit | 10 % de la balance nominale |
| Daily Loss Limit | 3 % de la balance nominale |
| Conséquence Daily Loss | Soft lock jusqu’au prochain reset |
| Maximum Loss | 10 % EOD trailing |
| Best Day Rule | 50 % maximum, non-breach |
| Minimum de jours | Aucun |
| Journées qualifiées | Aucune |
| Limite de temps | Aucune |
| Inactivité | 30 jours calendaires |
| Overnight | Autorisé |
| Weekend | Interdit |
| News trading | Autorisé en Evaluation |
| Frais d’activation | Aucun |

### 3.1 Objectif de profit

```text
profit_target = nominal_balance × 10 %
```

Seul le profit net réalisé compte. Le passage exige : objectif atteint, Best Day Rule conforme, aucune position ouverte, aucun ordre en attente, aucun hard breach et aucune revue d’intégrité bloquante.

### 3.2 Aucun minimum de jours

WARIBA ONE n’impose aucun minimum formel de jours. La Best Day Rule empêche néanmoins un passage fondé sur une seule journée profitable.

### 3.3 Best Day Rule

```text
best_day_ratio = best_profitable_day / sum_of_positive_day_profits
best_day_ratio <= 50 %
```

Un ratio supérieur à 50 % ne termine pas le compte et ne constitue pas un breach. Il bloque uniquement le passage jusqu’au retour à 50 % ou moins.

### 3.4 Profit éligible et clôtures sous 60 secondes

La balance réelle conserve tous les fills, profits, pertes et frais. La balance
éligible au programme est une projection distincte : elle exclut uniquement le
profit net positif d’une portion clôturée avant 60 secondes révolues depuis son
fill d’ouverture serveur.

```text
net_close_pnl = realized_pnl − closing_commission − allocated_opening_commission

net_close_pnl > 0 et duration_ms < 60000
→ eligible_close_pnl = 0
→ ineligible_short_duration_profit = net_close_pnl

sinon
→ eligible_close_pnl = net_close_pnl
→ ineligible_short_duration_profit = 0
```

Les pertes nettes comptent toujours intégralement, quelle que soit la durée. Les
frais sont appliqués avant la classification : ils réduisent le résultat et peuvent
transformer un profit brut en perte nette comptée. À exactement 60 000 ms, le
profit net positif est éligible. Les horodatages d’ouverture et de clôture sont
exclusivement ceux du serveur.

La balance éligible est utilisée pour l’objectif, la DLL, le Maximum Loss en
temps réel, la Best Day Rule et le plancher EOD trailing. Trois clôtures
profitables sous 60 secondes sur 24 heures déclenchent un avertissement et un
signal de risque. Six suspendent uniquement les nouvelles ouvertures et ouvrent
une revue manuelle ; réduction et clôture restent autorisées. Ce contrôle ne
crée jamais, à lui seul, un breach permanent.

## 4. Daily Loss Limit — 3 % avec soft lock

| Compte | Daily Loss Limit |
|---|---:|
| 5K | 150 USD |
| 10K | 300 USD |
| 25K | 750 USD |
| 50K | 1 500 USD |
| 100K | 3 000 USD |

```text
daily_reference = max(balance_at_reset, equity_at_reset)
daily_floor = daily_reference − nominal_balance × 3 %
```

À l’atteinte du plancher : nouvelles expositions bloquées, ordres en attente annulés, réduction ou liquidation selon la policy, puis soft lock jusqu’au prochain reset. Le compte n’est terminé que si le Maximum Loss Floor est également atteint.

## 5. Maximum Loss — 10 % EOD trailing

```text
drawdown_distance = nominal_balance × 10 %
initial_floor = nominal_balance − drawdown_distance
next_eod_floor = min(
  nominal_balance,
  max(previous_floor, highest_eod_balance − drawdown_distance)
)
```

Le plancher :

- est recalculé uniquement après une journée UTC finalisée ;
- monte avec la plus haute balance EOD ;
- ne redescend jamais ;
- se verrouille à la balance nominale ;
- est contrôlé en temps réel contre l’equity.

```text
equity <= maximum_loss_floor
→ liquidation
→ hard breach
→ compte terminé
```

## 6. Levier, exposition et marge

TRD-018 (verrouillé, jamais supersédé) : le levier WARIBA Performance reste
inférieur à WARIBA ONE. TRD-036 reconduit les ratios de TRD-018 (0,60× Forex,
0,50× XAUUSD/NAS100) sur les nouveaux plafonds Evaluation v1.1.

| Classe | WARIBA ONE (Evaluation) | WARIBA Performance |
|---|---:|---:|
| Forex | 1:100 | 1:60 |
| XAUUSD | Jusqu’à 1:50, dynamique selon l’exposition agrégée | Jusqu’à 1:25, même modèle dynamique |
| NAS100 | Jusqu’à 1:20 | Jusqu’à 1:10 |

| Compte | Forex agrégé | XAUUSD | NAS100 |
|---|---:|---:|---:|
| 5K | 0,30 lot | 0,05 lot | 1 contrat WARIBA |
| 10K | 0,60 lot | 0,10 lot | 2 contrats WARIBA |
| 25K | 1,50 lot | 0,25 lot | 5 contrats WARIBA |
| 50K | 3,00 lots | 0,50 lot | 10 contrats WARIBA |
| 100K | 6,00 lots | 1,00 lot | 20 contrats WARIBA |

Les limites sont agrégées, jamais réinitialisées par ordre ou par paire. La marge utilisée maximale est de 30 % de l’equity en Evaluation et 25 % en Performance.

## 7. WARIBA Performance v1.1

| Règle | Valeur |
|---|---:|
| Daily Loss Limit | 3 % avec soft lock |
| Maximum Loss | 10 % EOD trailing |
| Best Day Rule | 50 % par cycle |
| Minimum général de jours | Aucun |
| Performance Days | 5 nouvelles journées par payout |
| Overnight | Autorisé |
| Weekend | Interdit |
| News à fort impact | Nouvelles expositions interdites ±2 minutes |
| Marge utilisée maximale | 25 % |

### 7.1 Performance Days

| Compte | Profit net réalisé minimum par Performance Day |
|---|---:|
| 5K | 25 USD |
| 10K | 50 USD |
| 25K | 125 USD |
| 50K | 250 USD |
| 100K | 500 USD |

Une Performance Day est une journée UTC finalisée, utilise uniquement le profit net réalisé, n’a pas besoin d’être consécutive et ne peut pas être réutilisée après un payout payé.

## 8. Payout Buffer permanent

| Compte | Buffer permanent | Payout Buffer Floor |
|---|---:|---:|
| 5K | 500 USD | 5 500 USD |
| 10K | 1 000 USD | 11 000 USD |
| 25K | 2 500 USD | 27 500 USD |
| 50K | 5 000 USD | 55 000 USD |
| 100K | 10 000 USD | 110 000 USD |

Le buffer est non retirable, construit une seule fois, permanent après payout et distinct du Maximum Loss Floor. À la balance exacte du Payout Buffer Floor, le montant retirable est zéro.

## 9. Calcul du payout

```text
excess_available = max(0, realized_balance − payout_buffer_floor)
gross_payout_base = min(
  excess_available,
  requested_gross_amount,
  gross_equivalent_of_net_cap
)
trader_cash = gross_payout_base × trader_split
wariba_share = gross_payout_base × wariba_split
account_debit = gross_payout_base
```

La limite universelle de 50 % du profit est supprimée. Seul l’excédent réalisé au-dessus du buffer est éligible.

## 10. Caps nets candidats

Les caps désignent le cash maximal versé au trader après split.

| Compte | Payout #1 | Payout #2 | Payout #3 | Payout #4 | Payout #5 |
|---|---:|---:|---:|---:|---:|
| 5K | 250 USD | 350 USD | 500 USD | 750 USD | 1 000 USD |
| 10K | 500 USD | 750 USD | 1 000 USD | 1 500 USD | 2 000 USD |
| 25K | 1 000 USD | 1 500 USD | 2 000 USD | 2 500 USD | 3 000 USD |
| 50K | 2 000 USD | 2 500 USD | 3 000 USD | 4 000 USD | 5 000 USD |
| 100K | 3 000 USD | 4 000 USD | 5 000 USD | 6 000 USD | 8 000 USD |

```text
CAP_STATUS = CANDIDATE_PENDING_FINANCIAL_SIMULATION
```

## 11. Profit Split et Review

| Payout | Trader | WARIBA |
|---|---:|---:|
| #1 à #4 | 85 % | 15 % |
| #5 | 90 % | 10 % |

Après le cinquième payout payé, le compte entre dans WARIBA Review. Aucun sixième payout, aucun compte Live et aucune allocation réelle ne sont garantis.

## 12. Justification publique

WARIBA récompense les performances reproductibles. Le buffer permanent protège la base du compte ; les cinq nouvelles Performance Days démontrent une répétabilité entre deux payouts. Ces journées ne sont pas un second objectif de profit.

## 13. Gates commerciales

Les prix et caps restent candidats. Le 50K et le 100K ne peuvent pas être ouverts publiquement avant validation du scénario Stress, de la réserve dédiée, de la marge et des contrôles Risk/CFO. Les cinq tailles restent toutefois actives pour la bêta sandbox privée.
