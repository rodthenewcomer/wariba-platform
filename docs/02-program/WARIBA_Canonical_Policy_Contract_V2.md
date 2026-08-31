# WARIBA Canonical Policy Contract V2

> **STATUS = LOCKED POLICY CONTRACT — PUBLIC ACTIVATION REMAINS GATED**
> **AUTHORITY = CANONICAL POLICY CONTRACT FOR ALL NEW OFFERS AND ACCOUNTS**
> **DECISION_RECORD = POLICY-GOV-004 / WARIBA_V2_DEFINITIVE_RUNTIME_AND_EXPOSURE_GUARDS**
> **EXISTING_ACCOUNTS = KEEP THEIR HISTORICAL POLICY VERSION**
> **DO_NOT_APPLY_RETROACTIVELY = true**

Date : 27 août 2026
Owner : WARIBA Product, Risk, Finance, Legal, Engineering, Operations
Source normative humaine : `docs/02-program/WARIBA_Program_Rulebook_Candidate_V2.md`

## 1. Objet et sémantique d’autorité

Ce contrat est la source de vérité exhaustive et définitive du programme pour
toutes les nouvelles offres et tous les nouveaux comptes attachés à une
policy V2. Il remplace toute valeur V1 comme instruction de travail future.
Les artefacts V1 ne restent applicables qu’aux comptes qui portent déjà leur
identifiant historique.

`LOCKED` qualifie les règles de policy V2. Il ne signifie pas
`PUBLIC_PRODUCTION_READY` : vente, providers, rails, pays, réserve et quotas
restent soumis à leurs gates opérationnels propres.

Les anciennes mentions `CANDIDATE` et `CALIBRATION_REQUIRED` appliquées aux
règles chiffrées de ce contrat sont supersédées par `POLICY-GOV-004`. Les
mentions `OPEN_CALIBRATION` d’un instrument sans spec et `HOLD` d’une
capability externe restent fail-closed; rien n’est inventé.

## 2. Catalogue public canonique — identité et prix (15/15)

Les quinze lignes sont publiques au catalogue. Les gates paid/activation
internes sont traités séparément en §7.

| ID | public_product_name | internal_program_code | account_size | nominal_balance | currency | upfront_price | activation_price | total_price_if_success |
|---|---|---|---:|---:|---|---:|---:|---:|
| ONE-5 | WARIBA ONE | `WARIBA_ONE` | 5K | 5 000 | nominal USD; prix XOF | 19 900 XOF | 0 XOF | 19 900 XOF |
| ONE-10 | WARIBA ONE | `WARIBA_ONE` | 10K | 10 000 | nominal USD; prix XOF | 34 900 XOF | 0 XOF | 34 900 XOF |
| ONE-25 | WARIBA ONE | `WARIBA_ONE` | 25K | 25 000 | nominal USD; prix XOF | 69 900 XOF | 0 XOF | 69 900 XOF |
| ONE-50 | WARIBA ONE | `WARIBA_ONE` | 50K | 50 000 | nominal USD; prix XOF | 119 900 XOF | 0 XOF | 119 900 XOF |
| ONE-100 | WARIBA ONE | `WARIBA_ONE` | 100K | 100 000 | nominal USD; prix XOF | 199 900 XOF | 0 XOF | 199 900 XOF |
| FLEX-5 | WARIBA FLEX | `WARIBA_FLEX` | 5K | 5 000 | nominal USD; prix XOF | 9 900 XOF | 25 900 XOF | 35 800 XOF |
| FLEX-10 | WARIBA FLEX | `WARIBA_FLEX` | 10K | 10 000 | nominal USD; prix XOF | 14 900 XOF | 39 900 XOF | 54 800 XOF |
| FLEX-25 | WARIBA FLEX | `WARIBA_FLEX` | 25K | 25 000 | nominal USD; prix XOF | 24 900 XOF | 109 900 XOF | 134 800 XOF |
| FLEX-50 | WARIBA FLEX | `WARIBA_FLEX` | 50K | 50 000 | nominal USD; prix XOF | 34 900 XOF | 184 900 XOF | 219 800 XOF |
| FLEX-100 | WARIBA FLEX | `WARIBA_FLEX` | 100K | 100 000 | nominal USD; prix XOF | 44 900 XOF | 269 900 XOF | 314 800 XOF |
| INSTANT-5 | WARIBA INSTANT | `WARIBA_INSTANT` | 5K | 5 000 | nominal USD; prix XOF | 39 900 XOF | 0 XOF | 39 900 XOF |
| INSTANT-10 | WARIBA INSTANT | `WARIBA_INSTANT` | 10K | 10 000 | nominal USD; prix XOF | 59 900 XOF | 0 XOF | 59 900 XOF |
| INSTANT-25 | WARIBA INSTANT | `WARIBA_INSTANT` | 25K | 25 000 | nominal USD; prix XOF | 99 900 XOF | 0 XOF | 99 900 XOF |
| INSTANT-50 | WARIBA INSTANT | `WARIBA_INSTANT` | 50K | 50 000 | nominal USD; prix XOF | 169 900 XOF | 0 XOF | 169 900 XOF |
| INSTANT-100 | WARIBA INSTANT | `WARIBA_INSTANT` | 100K | 100 000 | nominal USD; prix XOF | 279 900 XOF | 0 XOF | 279 900 XOF |

Les codes `WARIBA_FLEX` et `WARIBA_INSTANT` sont les codes canoniques. Le
schéma et les policies versionnées les acceptent. FLEX fige au checkout le
prix d’activation dû après réussite approuvée;
ce droit reste disponible 30 jours. Taxes et frais obligatoires restent
`OPEN_LEGAL_TAX` et ne doivent pas être inventés.

## 3. Vérité risque et cycle (15/15)

Abréviations : `soft` = pause non terminale; `EOD` = fin de jour UTC;
`ML` = Maximum Loss; `BD` = Meilleur Jour. Les seuils s’appliquent au nominal.

| ID | profit_target | minimum_trading_days | evaluation_time_limit | daily_loss_rule | maximum_loss_rule | best_day_rule | permanent_buffer |
|---|---|---:|---|---|---|---|---|
| ONE-5 | 8% réalisé éligible | 0 | illimitée; inactivité §6 | 3% soft, reset UTC | 8% EOD trailing, terminal | 35%, gate non-breach | 2% Performance |
| ONE-10 | 8% réalisé éligible | 0 | illimitée; inactivité §6 | 3% soft, reset UTC | 8% EOD trailing, terminal | 35%, gate non-breach | 2% Performance |
| ONE-25 | 8% réalisé éligible | 0 | illimitée; inactivité §6 | 3% soft, reset UTC | 8% EOD trailing, terminal | 35%, gate non-breach | 2% Performance |
| ONE-50 | 8% réalisé éligible | 0 | illimitée; inactivité §6 | 3% soft, reset UTC | 8% EOD trailing, terminal | 35%, gate non-breach | 2% Performance |
| ONE-100 | 8% réalisé éligible | 0 | illimitée; inactivité §6 | 3% soft, reset UTC | 8% EOD trailing, terminal | 35%, gate non-breach | 2% Performance |
| FLEX-5 | 4% réalisé éligible | 0 | illimitée; activation 30 j après pass | 3% soft, reset UTC | 6% EOD trailing, terminal | 35%, gate non-breach | 3% Performance |
| FLEX-10 | 4% réalisé éligible | 0 | illimitée; activation 30 j après pass | 3% soft, reset UTC | 6% EOD trailing, terminal | 35%, gate non-breach | 3% Performance |
| FLEX-25 | 4% réalisé éligible | 0 | illimitée; activation 30 j après pass | 3% soft, reset UTC | 6% EOD trailing, terminal | 35%, gate non-breach | 3% Performance |
| FLEX-50 | 4% réalisé éligible | 0 | illimitée; activation 30 j après pass | 3% soft, reset UTC | 6% EOD trailing, terminal | 35%, gate non-breach | 3% Performance |
| FLEX-100 | 4% réalisé éligible | 0 | illimitée; activation 30 j après pass | 3% soft, reset UTC | 6% EOD trailing, terminal | 35%, gate non-breach | 3% Performance |
| INSTANT-5 | non applicable | non applicable | non applicable | 2% soft, reset UTC | 5% EOD trailing, terminal | 30%, gate non-breach | 3% |
| INSTANT-10 | non applicable | non applicable | non applicable | 2% soft, reset UTC | 5% EOD trailing, terminal | 30%, gate non-breach | 3% |
| INSTANT-25 | non applicable | non applicable | non applicable | 2% soft, reset UTC | 5% EOD trailing, terminal | 30%, gate non-breach | 3% |
| INSTANT-50 | non applicable | non applicable | non applicable | 2% soft, reset UTC | 5% EOD trailing, terminal | 30%, gate non-breach | 3% |
| INSTANT-100 | non applicable | non applicable | non applicable | 2% soft, reset UTC | 5% EOD trailing, terminal | 30%, gate non-breach | 3% |

Formules canoniques candidates : jour WARIBA `00:00:00–23:59:59 UTC`;
plancher quotidien = solde début de jour − taux daily × nominal; contrôle sur
equity coûts inclus; plancher ML = `min(nominal, max(plancher_précédent,
HWM_EOD − taux_ML × nominal))`. Le plancher ne baisse jamais et se verrouille
au nominal. L’égalité au plancher déclenche l’effet défini.

Un profit de tranche n’est éligible que si sa durée clôturée est ≥60 000 ms.
Les pertes, commissions, swaps et slippage comptent toujours. La durée courte
n’est pas une fraude à elle seule.

## 4. Vérité payout (15/15)

| ID | performance_day_threshold | performance_days_required_per_payout | payout_split_schedule | payout_caps_schedule | max_payouts_before_review |
|---|---|---:|---|---|---:|
| ONE-5 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 250/250/350/350/500 USD net | 5 |
| ONE-10 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 400/400/600/600/800 USD net | 5 |
| ONE-25 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 900/900/1250/1250/1750 USD net | 5 |
| ONE-50 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 1500/1500/2200/2200/3000 USD net | 5 |
| ONE-100 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 2500/2500/3500/3500/5000 USD net | 5 |
| FLEX-5 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 250/250/350/350/500 USD net | 5 |
| FLEX-10 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 400/400/600/600/800 USD net | 5 |
| FLEX-25 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 900/900/1250/1250/1750 USD net | 5 |
| FLEX-50 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 1500/1500/2200/2200/3000 USD net | 5 |
| FLEX-100 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 2500/2500/3500/3500/5000 USD net | 5 |
| INSTANT-5 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 250/250/350/350/500 USD net | 5 |
| INSTANT-10 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 400/400/600/600/800 USD net | 5 |
| INSTANT-25 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 900/900/1250/1250/1750 USD net | 5 |
| INSTANT-50 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 1500/1500/2200/2200/3000 USD net | 5 |
| INSTANT-100 | +0,5% net éligible/UTC day | 5 nouveaux | #1 80%; #2 80%; #3 85%; #4 85%; #5 90% | 2500/2500/3500/3500/5000 USD net | 5 |

Montant net = `min(cap applicable, split × profit éligible retirable au-dessus
du buffer)`. Seuls les payouts payés font progresser tier et cycle. Le payout
#5 ouvre WARIBA Review; aucun payout #6 n’est automatique.

`PAYOUT_DEBIT_CANNOT_CAUSE_TRADING_BREACH = true`. Le débit autorisé reste dans
le ledger financier et les rapprochements, mais il est exclu de la projection
daily/maximum-loss. Cette séparation est implémentée par les projections
financière, éligible et ajustée risque.

## 5. Trading, exposition et intégrité (15/15)

Les cellules identiques sont néanmoins répétées pour rendre la matrice
exhaustive et consommable sans héritage implicite.

| ID | overnight_policy | weekend_policy | news_policy | automation_policy | copy_trading_policy | hedging_policy | margin_cap | leverage_profile |
|---|---|---|---|---|---|---|---|---|
| ONE-5 | autorisé; coûts normaux | autorisé; pas de nouvelle exposition dans les 30 min avant fermeture ≥2 h | Eval libre; Performance T−2/T+2 high-impact: réduire/fermer oui, ouvrir/augmenter non | EA/bots/API externes non supportés; absence ≠ fraude | automatisé indisponible; manuel propre permis; partage/tiers/coordination interdits | même compte permis; notionnels absolus sans netting | Eval 20%; Perf 15%; brut ≤3,00× nominal; `LOCKED` | Eval FX 1:50, métal 1:20, indices 1:20, énergie 1:10; Perf 1:30/1:15/1:10/1:10; `LOCKED` |
| ONE-10 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut ONE `LOCKED` | même profil ONE `LOCKED` |
| ONE-25 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut ONE `LOCKED` | même profil ONE `LOCKED` |
| ONE-50 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut ONE `LOCKED` | même profil ONE `LOCKED` |
| ONE-100 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut ONE `LOCKED` | même profil ONE `LOCKED` |
| FLEX-5 | autorisé; coûts normaux | autorisé; pas de nouvelle exposition dans les 30 min avant fermeture ≥2 h | Eval libre; Performance T−2/T+2 high-impact: réduire/fermer oui, ouvrir/augmenter non | EA/bots/API externes non supportés; absence ≠ fraude | automatisé indisponible; manuel propre permis; partage/tiers/coordination interdits | même compte permis; notionnels absolus sans netting | Eval 20%; Perf 15%; brut ≤3,00× nominal; `LOCKED` | même profil équilibré que ONE; `LOCKED` |
| FLEX-10 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut FLEX `LOCKED` | même profil FLEX `LOCKED` |
| FLEX-25 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut FLEX `LOCKED` | même profil FLEX `LOCKED` |
| FLEX-50 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut FLEX `LOCKED` | même profil FLEX `LOCKED` |
| FLEX-100 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut FLEX `LOCKED` | même profil FLEX `LOCKED` |
| INSTANT-5 | autorisé; coûts normaux | autorisé; pas de nouvelle exposition dans les 30 min avant fermeture ≥2 h | Performance T−2/T+2 high-impact: réduire/fermer oui, ouvrir/augmenter non | EA/bots/API externes non supportés; absence ≠ fraude | automatisé indisponible; manuel propre permis; partage/tiers/coordination interdits | même compte permis; notionnels absolus sans netting | marge 10%; brut ≤2,00× nominal; `LOCKED` | FX 1:30, métal 1:10, indices 1:10, énergie 1:5; `LOCKED` |
| INSTANT-10 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut INSTANT `LOCKED` | même profil INSTANT `LOCKED` |
| INSTANT-25 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut INSTANT `LOCKED` | même profil INSTANT `LOCKED` |
| INSTANT-50 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut INSTANT `LOCKED` | même profil INSTANT `LOCKED` |
| INSTANT-100 | autorisé; coûts normaux | même règle calendrier serveur | même règle news versionnée | même règle non-support | même règle copy | même règle hedging | même marge et brut INSTANT `LOCKED` | même profil INSTANT `LOCKED` |

Le calendrier news et le calendrier de sessions doivent être versionnés côté
serveur et épinglés au compte. Aucun `if Friday` codé en dur. US30 et les
énergies n’ont pas de spécification d’instrument V2 validée dans le dépôt :
leurs calculs restent `OPEN_CALIBRATION`.

### 5.1 Algorithme d'exposition brute verrouillé

```text
gross_exposure_usd = somme(abs(notional_usd(position_ouverte)))
                   + abs(notional_usd(ordre_entrant))
maximum_gross_exposure_usd = nominal_balance_usd × policy_multiple
ALLOW si gross_exposure_usd <= maximum_gross_exposure_usd
DENY  si gross_exposure_usd >  maximum_gross_exposure_usd
```

Le notionnel utilise la quantité absolue, la taille de contrat versionnée et
le mark serveur actuel. `USDJPY` est déjà notionnel en USD par sa devise de
base; un instrument coté en USD utilise le prix serveur. Une devise de compte,
une conversion, une spec ou un mark manquant retourne
`EXPOSURE_CONVERSION_UNAVAILABLE`. Les pending orders repassent exactement ce
calcul au trigger sous le lock du compte; leur acceptation à la création ne
garantit jamais leur fill.

## 6. Lifecycle, KYC, rails et contestation (15/15)

| ID | inactivity_policy | kyc_trigger | payout_method_capability_rule | dispute_window | rule_status | decision_record_id |
|---|---|---|---|---|---|---|
| ONE-5 | avertir J21; inactive J30; acquis financier conservé | premier `financially_eligible` | afficher seulement rail validé pays; Wave global `HOLD` | 30 jours, `CANDIDATE_LEGAL` | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| ONE-10 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| ONE-25 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| ONE-50 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| ONE-100 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| FLEX-5 | avertir J21; inactive J30; droit d’activation/pass conservé selon contrat | premier `financially_eligible` | afficher seulement rail validé pays; Wave global `HOLD` | 30 jours, `CANDIDATE_LEGAL` | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| FLEX-10 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| FLEX-25 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| FLEX-50 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| FLEX-100 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| INSTANT-5 | avertir J21; inactive J30; acquis financier conservé | premier `financially_eligible` | afficher seulement rail validé pays; Wave global `HOLD` | 30 jours, `CANDIDATE_LEGAL` | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| INSTANT-10 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| INSTANT-25 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; capability gated | `POLICY-GOV-004` |
| INSTANT-50 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; réserve gated | `POLICY-GOV-004` |
| INSTANT-100 | même règle | même trigger | même capability rule | même fenêtre | règles `LOCKED`; réserve gated | `POLICY-GOV-004` |

États KYC minimaux futurs : `not_started`, `required`, `in_progress`,
`verified`, `rejected`, `expired`, `manual_review`. L’éligibilité financière
existe avant la capacité de demander : `financially_eligible != ready_to_request`.

## 7. Catalogue public versus acquisition payante

| Programme | Taille | Catalogue public | Acquisition/activation pilote interne |
|---|---:|---|---|
| ONE | 5K | disponible | organique/partenaire; paid scale HOLD |
| ONE | 10K | disponible | paid limité |
| ONE | 25K/50K/100K | disponible | cellules GO PILOTE sous gates |
| FLEX | 5K/10K | disponible | sans paid scale |
| FLEX | 25K/50K | disponible | priorité paid pilote |
| FLEX | 100K | disponible | limité; circuit breaker |
| INSTANT | 5K | disponible | paid scale HOLD |
| INSTANT | 10K | disponible | limité |
| INSTANT | 25K | disponible | bêta plafonnée |
| INSTANT | 50K/100K | disponible | activation seulement avec réserve dédiée et quota |

`PUBLIC_CATALOG_AVAILABILITY != PAID_ACQUISITION_GATE`. Le site public peut
présenter les quinze offres. Le checkout/activation peut fermer une cellule
selon pays, canal, quota, réserve ou circuit breaker, avec raison explicite.

## 8. Immutabilité de policy par compte

Invariants obligatoires de l’implémentation V2 :

1. une policy publiée est une version immuable; tout changement crée une
   nouvelle ligne et de nouveaux hashes;
2. un compte conserve la policy exacte acceptée au checkout/activation;
3. `policy_version_id`, `machine_hash`, `human_document_hash`, locale,
   timestamp et source d’acceptation sont conservés;
4. un compte Evaluation ne sélectionne jamais une nouvelle policy au moment
   du paiement si une autre version a été acceptée au checkout;
5. un compte Performance enfant reçoit la version Performance explicitement
   compatible avec la policy du parent, jamais « la plus récente » au hasard;
6. un worker, une UI, un support ou Control ne peut repin un compte;
7. retraite/publication modifie l’éligibilité des futurs comptes, jamais les
   paramètres d’un compte existant;
8. toute lecture Risk, Payout, Hub, WariX, Help contextualisée et Control
   utilise l’identifiant exact attaché, avec preuve rejouable.

État runtime : `app.policy_versions` et le pin du compte sont protégés par des
triggers d’immutabilité; consentement, commande et compte conservent l’ID et
les hashes exacts; le lien Evaluation → Performance est explicite. Les
policies 2.1.0 succèdent aux 2.0.0 sans mutation ni repin.

## 9. Source machine versionnée

Le format machine est unique, versionné et dérivé de ce contrat. Familles :

```text
policy_identity
catalog_and_pricing
evaluation_rules
performance_rules
profit_eligibility
trading_permissions
news_calendar_policy
session_calendar_policy
symbol_spec_set
leverage_profile
margin_and_exposure
payout_schedule
kyc_and_rail_capabilities
integrity_and_disputes
acquisition_gates
reason_codes
```

Chaque version porte `id`, `program`, `semantic_version`, `status`,
`effective_from`, `parameters`, `machine_hash`, `human_document_hash`,
`decision_record_id`, `created_at` et `published_at`. Les migrations 3.4.2 et
3.4.3A matérialisent ces contrats append-only.

## 10. Registre des reason codes

| Domaine | Codes minimaux futurs |
|---|---|
| Daily | `DAILY_LOSS_SOFT_LOCKED`, `DAILY_RESET_COMPLETED` |
| Maximum Loss | `MAXIMUM_LOSS_BREACHED` |
| Best Day | `BEST_DAY_NOT_YET_COMPLIANT` |
| Profit | `PROFIT_SHORT_DURATION_INELIGIBLE`, `TARGET_NOT_REACHED` |
| Payout | `PAYOUT_BUFFER_NOT_REACHED`, `PERFORMANCE_DAYS_INSUFFICIENT`, `PAYOUT_CAP_APPLIED`, `PAYOUT_REVIEW_AFTER_FIFTH`, `PAYOUT_DEBIT_RISK_NEUTRAL` |
| News/session | `NEWS_EXPOSURE_INCREASE_BLOCKED`, `MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED` |
| Exposition | `MARGIN_CAP_NOT_CALIBRATED`, `MARGIN_CAP_EXCEEDED`, `GROSS_EXPOSURE_EXCEEDED`, `EXPOSURE_CONVERSION_UNAVAILABLE` |
| Automation/copy | `AUTOMATION_UNSUPPORTED`, `AUTOMATED_COPY_UNSUPPORTED`, `ACCOUNT_SHARING_REVIEW`, `THIRD_PARTY_MANAGEMENT_REVIEW` |
| Commerce | `PAID_ACQUISITION_CELL_GATED`, `ACTIVATION_QUOTA_REACHED`, `RESERVE_GATE_CLOSED` |
| KYC/rail | `KYC_REQUIRED`, `KYC_NOT_VERIFIED`, `PAYOUT_RAIL_UNAVAILABLE_FOR_COUNTRY` |

Ces codes sont le registre contractuel. Les codes Daily, Maximum Loss,
news/session, marge, exposition brute et conversion indisponible sont émis par
le runtime pré-trade; les capabilities externes restent fail-closed.

## 11. Claim Registry

| Claim | Valeur / statut | Source | Usage autorisé |
|---|---|---|---|
| Statut V2 | règles de policy `LOCKED`; activation publique gated | `POLICY-GOV-004` | toute nouvelle offre et tout nouveau compte |
| Catalogue | 15 combinaisons publiques | Rulebook V2 §Prix | site/checkout futurs après implémentation |
| Prix | grille §2 | Rulebook V2 | norme V2; pas d’ancienne grille V1 |
| Règles risque | ONE 8/3/8/35/2; FLEX 4/3/6/35/3; INSTANT 2/5/30/3 | Rulebook V2 | policies V2 2.1.0 |
| Payout | 5 jours, splits 80/80/85/85/90, caps §4 | Rulebook V2 | policies V2 2.1.0 |
| Economics Stress | portefeuille candidat ≥15% dans le modèle | `WARIBA_Offer_Economics_Acquisition_V1.xlsx` | hypothèse de modèle; jamais preuve réalisée |
| Economics Disaster | échec du modèle candidat | même source | blocker LOCK et circuit breaker |
| Leverage | profils §5 | Rulebook V2 + calibration | `LOCKED` dans les profils 2.1.0 |
| Marge/exposition | marge 20/15/10; brut 3× ONE/FLEX, 2× INSTANT | `POLICY-GOV-004` | enforcement serveur actif pour policies 2.1.0 |
| Wave global | non validé | Rulebook V2 | `HOLD`; aucune promesse |
| Compte réel | jamais automatique ni garanti | Rulebook V2 | texte public obligatoire |
| Runtime V2 | policy/risk/lifecycle backend implémenté; activation externe bloquée | clôtures 3.4.2–3.4.3A | ne pas confondre enforcement backend et vente publique |

## 12. Conditions de propagation

La propagation peut commencer uniquement selon le blast radius versionné. Les
gates P0 avant toute activation V2 sont : policy DB immuable; consentement et
commande liés à l’ID/hash exact; schémas ONE/FLEX/INSTANT; projection payout
neutre pour le risque; marge calibrée et appliquée côté serveur; calendriers
news/session versionnés; catalogue public séparé des gates paid; contenu public
et Help sans valeurs V1 actives.

Le passage à `LOCKED` reste soumis aux conditions du Rulebook V2 : données
réelles suffisantes, Stress/Disaster, réserve, droit UMOA/CEMAC, PSP/rails,
market data, KYC/AML/fiscalité/recours, réconciliation et validation humaine.
