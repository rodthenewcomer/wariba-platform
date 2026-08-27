# WARIBA Margin & Exposure Calibration V1

> **STATUS = CALIBRATION EXECUTED — CAP STILL NOT LOCKED**
> **CANDIDATE CAPS = 20% Evaluation / 15% Performance ONE-FLEX / 10% INSTANT**
> **PURPOSE = sensitivity model and pilot calibration contract, not a runtime policy**
> **OWNER_DECISION_REQUIRED = yes — voir §12 et §13**
> Date : 27 août 2026 · calibration exécutée en Phase 3.4.3

## 1. Décision de calibration

Les caps 20/15/10 % ne sont ni validés, ni activables. Le dépôt ne fournit pas
les données nécessaires pour conclure : spécification US30 absente, prix de
référence V2 non versionnés, conversions de devise incomplètes, distributions
réelles de stops/slippage/gaps/corrélations inexistantes, et aucune observation
de cohorte V2. Le verdict est donc `OPEN_CALIBRATION`.

Le modèle ci-dessous utilise uniquement des références de sandbox existantes
pour tester la plausibilité mécanique. Elles ne deviennent pas normatives.

## 2. Entrées et statut des données

| Entrée | Valeur de travail | Source repository | Statut |
|---|---|---|---|
| EURUSD | prix 1,08450; contrat 100 000; pas 0,01 | `SANDBOX_BASE_PRICES` + `symbol_specs` V1.1 | `REFERENCE_ONLY` |
| GBPUSD | prix 1,26000; contrat 100 000; pas 0,01 | mêmes sources | `REFERENCE_ONLY` |
| XAUUSD | prix 2 000; contrat 100; pas 0,01 | mêmes sources | `REFERENCE_ONLY` |
| NAS100 | prix 18 000; contrat 1; pas 0,1 | mêmes sources | `REFERENCE_ONLY` |
| US30 | absent des types/specs/provider map | audit repository | `OPEN_CALIBRATION` |
| ONE/FLEX Evaluation leverage | FX 1:50; métal 1:20; indices 1:20 | modèle d’offre du 26 août | `CANDIDATE` |
| ONE/FLEX Performance leverage | FX 1:30; métal 1:15; indices 1:10 | même source | `CANDIDATE` |
| INSTANT leverage | FX 1:30; métal 1:10; indices 1:10 | même source | `CANDIDATE` |
| Cap de marge | 20/15/10% | Rulebook V2 | `CALIBRATION_REQUIRED` |

Les énergies ne sont pas calculées : elles n’appartiennent pas à la matrice
demandée et leurs specs sont également absentes.

## 3. Formules

Pour un compte en USD et un instrument coté en USD :

```text
notional_usd = lots × contract_size × reference_price
required_margin_usd = notional_usd ÷ leverage
margin_cap_usd = nominal_balance × margin_cap_rate
max_total_lots = floor_to_quantity_step(margin_cap_usd × leverage
                                        ÷ (contract_size × reference_price))
risk_budget_0_5 = nominal_balance × 0.005
daily_budget = nominal_balance × daily_loss_rate
maximum_loss_budget = nominal_balance × maximum_loss_rate
loss_for_price_move = lots × contract_size × abs(price_move) + costs
max_lots_for_stop = risk_budget_0_5 ÷ (contract_size × stop_distance + costs_per_lot)
```

Le cap de marge ne garantit pas le risque de 0,5 %. Sans stop obligatoire,
distance de stop et coût de gap, `max_lots_for_stop` est indéterminable. Le
serveur futur doit appliquer séparément marge, exposition brute et budget de
risque; l’un ne remplace pas les autres.

## 4. Budgets par taille et produit

| Taille | Risque 0,5% | Daily ONE/FLEX 3% | ML ONE 8% | ML FLEX 6% | Daily INSTANT 2% | ML INSTANT 5% |
|---:|---:|---:|---:|---:|---:|---:|
| 5 000 | 25 | 150 | 400 | 300 | 100 | 250 |
| 10 000 | 50 | 300 | 800 | 600 | 200 | 500 |
| 25 000 | 125 | 750 | 2 000 | 1 500 | 500 | 1 250 |
| 50 000 | 250 | 1 500 | 4 000 | 3 000 | 1 000 | 2 500 |
| 100 000 | 500 | 3 000 | 8 000 | 6 000 | 2 000 | 5 000 |

Montants en USD. Le risque 0,5 % est un budget de sensibilité par position, pas
une règle V2 déjà adoptée de stop obligatoire.

## 5. Sensibilité Evaluation — cap candidat 20%

Leverage de référence candidat : FX 1:50, XAUUSD 1:20, indices 1:20.

| Taille | Instrument | Marge 1 lot | Cap marge | Lots max totaux | Budget risque 0,5% |
|---:|---|---:|---:|---:|---:|
| 5K | EURUSD | 2 169,00 | 1 000 | 0,46 | 25 |
| 5K | GBPUSD | 2 520,00 | 1 000 | 0,39 | 25 |
| 5K | XAUUSD | 10 000,00 | 1 000 | 0,10 | 25 |
| 5K | NAS100 | 900,00 | 1 000 | 1,1 | 25 |
| 5K | US30 | `OPEN` | 1 000 | `OPEN_CALIBRATION` | 25 |
| 10K | EURUSD | 2 169,00 | 2 000 | 0,92 | 50 |
| 10K | GBPUSD | 2 520,00 | 2 000 | 0,79 | 50 |
| 10K | XAUUSD | 10 000,00 | 2 000 | 0,20 | 50 |
| 10K | NAS100 | 900,00 | 2 000 | 2,2 | 50 |
| 10K | US30 | `OPEN` | 2 000 | `OPEN_CALIBRATION` | 50 |
| 25K | EURUSD | 2 169,00 | 5 000 | 2,30 | 125 |
| 25K | GBPUSD | 2 520,00 | 5 000 | 1,98 | 125 |
| 25K | XAUUSD | 10 000,00 | 5 000 | 0,50 | 125 |
| 25K | NAS100 | 900,00 | 5 000 | 5,5 | 125 |
| 25K | US30 | `OPEN` | 5 000 | `OPEN_CALIBRATION` | 125 |
| 50K | EURUSD | 2 169,00 | 10 000 | 4,61 | 250 |
| 50K | GBPUSD | 2 520,00 | 10 000 | 3,96 | 250 |
| 50K | XAUUSD | 10 000,00 | 10 000 | 1,00 | 250 |
| 50K | NAS100 | 900,00 | 10 000 | 11,1 | 250 |
| 50K | US30 | `OPEN` | 10 000 | `OPEN_CALIBRATION` | 250 |
| 100K | EURUSD | 2 169,00 | 20 000 | 9,22 | 500 |
| 100K | GBPUSD | 2 520,00 | 20 000 | 7,93 | 500 |
| 100K | XAUUSD | 10 000,00 | 20 000 | 2,00 | 500 |
| 100K | NAS100 | 900,00 | 20 000 | 22,2 | 500 |
| 100K | US30 | `OPEN` | 20 000 | `OPEN_CALIBRATION` | 500 |

## 6. Sensibilité Performance ONE/FLEX — cap candidat 15%

Leverage de référence candidat : FX 1:30, XAUUSD 1:15, indices 1:10.

| Taille | Instrument | Marge 1 lot | Cap marge | Lots max totaux | Budget risque 0,5% |
|---:|---|---:|---:|---:|---:|
| 5K | EURUSD | 3 615,00 | 750 | 0,20 | 25 |
| 5K | GBPUSD | 4 200,00 | 750 | 0,17 | 25 |
| 5K | XAUUSD | 13 333,33 | 750 | 0,05 | 25 |
| 5K | NAS100 | 1 800,00 | 750 | 0,4 | 25 |
| 5K | US30 | `OPEN` | 750 | `OPEN_CALIBRATION` | 25 |
| 10K | EURUSD | 3 615,00 | 1 500 | 0,41 | 50 |
| 10K | GBPUSD | 4 200,00 | 1 500 | 0,35 | 50 |
| 10K | XAUUSD | 13 333,33 | 1 500 | 0,11 | 50 |
| 10K | NAS100 | 1 800,00 | 1 500 | 0,8 | 50 |
| 10K | US30 | `OPEN` | 1 500 | `OPEN_CALIBRATION` | 50 |
| 25K | EURUSD | 3 615,00 | 3 750 | 1,03 | 125 |
| 25K | GBPUSD | 4 200,00 | 3 750 | 0,89 | 125 |
| 25K | XAUUSD | 13 333,33 | 3 750 | 0,28 | 125 |
| 25K | NAS100 | 1 800,00 | 3 750 | 2,0 | 125 |
| 25K | US30 | `OPEN` | 3 750 | `OPEN_CALIBRATION` | 125 |
| 50K | EURUSD | 3 615,00 | 7 500 | 2,07 | 250 |
| 50K | GBPUSD | 4 200,00 | 7 500 | 1,78 | 250 |
| 50K | XAUUSD | 13 333,33 | 7 500 | 0,56 | 250 |
| 50K | NAS100 | 1 800,00 | 7 500 | 4,1 | 250 |
| 50K | US30 | `OPEN` | 7 500 | `OPEN_CALIBRATION` | 250 |
| 100K | EURUSD | 3 615,00 | 15 000 | 4,14 | 500 |
| 100K | GBPUSD | 4 200,00 | 15 000 | 3,57 | 500 |
| 100K | XAUUSD | 13 333,33 | 15 000 | 1,12 | 500 |
| 100K | NAS100 | 1 800,00 | 15 000 | 8,3 | 500 |
| 100K | US30 | `OPEN` | 15 000 | `OPEN_CALIBRATION` | 500 |

## 7. Sensibilité INSTANT — cap candidat 10%

Leverage de référence candidat : FX 1:30, XAUUSD 1:10, indices 1:10.

| Taille | Instrument | Marge 1 lot | Cap marge | Lots max totaux | Budget risque 0,5% |
|---:|---|---:|---:|---:|---:|
| 5K | EURUSD | 3 615,00 | 500 | 0,13 | 25 |
| 5K | GBPUSD | 4 200,00 | 500 | 0,11 | 25 |
| 5K | XAUUSD | 20 000,00 | 500 | 0,02 | 25 |
| 5K | NAS100 | 1 800,00 | 500 | 0,2 | 25 |
| 5K | US30 | `OPEN` | 500 | `OPEN_CALIBRATION` | 25 |
| 10K | EURUSD | 3 615,00 | 1 000 | 0,27 | 50 |
| 10K | GBPUSD | 4 200,00 | 1 000 | 0,23 | 50 |
| 10K | XAUUSD | 20 000,00 | 1 000 | 0,05 | 50 |
| 10K | NAS100 | 1 800,00 | 1 000 | 0,5 | 50 |
| 10K | US30 | `OPEN` | 1 000 | `OPEN_CALIBRATION` | 50 |
| 25K | EURUSD | 3 615,00 | 2 500 | 0,69 | 125 |
| 25K | GBPUSD | 4 200,00 | 2 500 | 0,59 | 125 |
| 25K | XAUUSD | 20 000,00 | 2 500 | 0,12 | 125 |
| 25K | NAS100 | 1 800,00 | 2 500 | 1,3 | 125 |
| 25K | US30 | `OPEN` | 2 500 | `OPEN_CALIBRATION` | 125 |
| 50K | EURUSD | 3 615,00 | 5 000 | 1,38 | 250 |
| 50K | GBPUSD | 4 200,00 | 5 000 | 1,19 | 250 |
| 50K | XAUUSD | 20 000,00 | 5 000 | 0,25 | 250 |
| 50K | NAS100 | 1 800,00 | 5 000 | 2,7 | 250 |
| 50K | US30 | `OPEN` | 5 000 | `OPEN_CALIBRATION` | 250 |
| 100K | EURUSD | 3 615,00 | 10 000 | 2,76 | 500 |
| 100K | GBPUSD | 4 200,00 | 10 000 | 2,38 | 500 |
| 100K | XAUUSD | 20 000,00 | 10 000 | 0,50 | 500 |
| 100K | NAS100 | 1 800,00 | 10 000 | 5,5 | 500 |
| 100K | US30 | `OPEN` | 10 000 | `OPEN_CALIBRATION` | 500 |

## 8. Scénarios 1, 2 et 3 positions

Pour `n` positions identiques au même prix, la quantité maximale par position
est `floor_to_step(max_total_lots / n)`. Ce scénario teste uniquement la marge;
il ne modélise ni corrélation, ni stop, ni gap.

### Cellules les plus contraintes — 5K

| Profil | Instrument | 1 position | 2 positions | 3 positions | Verdict de praticabilité mécanique |
|---|---|---:|---:|---:|---|
| Evaluation 20% | EURUSD | 0,46 | 0,23 | 0,15 | possible aux pas actuels |
| Evaluation 20% | GBPUSD | 0,39 | 0,19 | 0,13 | possible |
| Evaluation 20% | XAUUSD | 0,10 | 0,05 | 0,03 | possible |
| Evaluation 20% | NAS100 | 1,1 | 0,5 | 0,3 | possible |
| Performance 15% | EURUSD | 0,20 | 0,10 | 0,06 | possible |
| Performance 15% | GBPUSD | 0,17 | 0,08 | 0,05 | possible |
| Performance 15% | XAUUSD | 0,05 | 0,02 | 0,01 | possible au minimum, sans headroom |
| Performance 15% | NAS100 | 0,4 | 0,2 | 0,1 | possible au minimum, sans headroom |
| INSTANT 10% | EURUSD | 0,13 | 0,06 | 0,04 | possible |
| INSTANT 10% | GBPUSD | 0,11 | 0,05 | 0,03 | possible |
| INSTANT 10% | XAUUSD | 0,02 | 0,01 | impossible | cap trop bas pour 3 positions minimales |
| INSTANT 10% | NAS100 | 0,2 | 0,1 | impossible | cap trop bas pour 3 positions minimales |

Le nombre de positions n’est pas un objectif produit. Cette table prouve
seulement que 5K INSTANT × XAUUSD/NAS100 a une contrainte d’usage réelle sous
les specs de référence actuelles.

## 9. Cas volatils et headroom

Hypothèses de stress, non normatives : prix/notional +5% et +10% pour FX;
+10%, +25% et +50% pour XAUUSD/NAS100. À quantité constante, la marge augmente
dans la même proportion. Une position ouverte exactement au cap le dépasse au
premier mouvement adverse de notional.

| Stress prix/notional | Quantité maximale prudente par rapport au max théorique |
|---:|---:|
| +5% | max théorique ÷ 1,05 = 95,24% du max |
| +10% | max théorique ÷ 1,10 = 90,91% du max |
| +25% | max théorique ÷ 1,25 = 80,00% du max |
| +50% | max théorique ÷ 1,50 = 66,67% du max |

Le futur moteur doit définir si le cap s’applique à la marge initiale, à la
marge recalculée au mark, ou aux deux; comment il traite une position devenue
au-dessus du cap sans nouvel ordre; et quel headroom bloque une augmentation.
Ces décisions sont `OPEN_CALIBRATION`.

## 10. Validation demandée sur données pilote

Mesurer au minimum par programme × taille × instrument × pays × cohorte :

- distribution de quantité, positions simultanées et marge utilisée;
- distances de stop, risque prévu et perte réalisée;
- slippage/spread/gap par percentile, news et fermeture;
- fréquence de refus de marge et abandons après refus;
- daily/ML proximity et breaches;
- corrélation d’exposition brute entre symboles;
- disponibilité provider, contrat size, tick value et conversion;
- résultats séparés pour 5K, en particulier INSTANT XAUUSD/NAS100.

Gates de décision proposés comme protocole, pas comme résultats : données
suffisantes; spécifications instruments signées; tests 1/2/3 positions;
scénarios volatils; raison de refus en français; aucun contournement via ordre
pending/partial/hedge; approbation Trading Risk, Market Risk, Product et QA.

## 11. Recommandation

- Maintenir `20/15/10 = CALIBRATION_REQUIRED`.
- Ne pas publier ces pourcentages comme limites effectives.
- Ne pas activer INSTANT 5K sur XAUUSD/NAS100 avant décision d’usage; les
  scénarios trois positions sont impossibles avec les références actuelles.
- Ne pas conclure qu’un cap protège le risque 0,5 % sans stop-distance et gap.
- Conserver US30 en `OPEN_CALIBRATION` jusqu’à une spec de contrat versionnée.
- Une nouvelle version de ce document devra enregistrer les données, le
  verdict cap par cap, les approbateurs et le Decision Record correspondant.


---

## 12. Calibration exécutée — Phase 3.4.3

Les §5 à §9 étaient calculées à la main et n'étaient donc pas rejouables. La
Phase 3.4.3 les a portées dans un modèle exécutable :

- moteur : `packages/domain/src/margin-calibration.ts`
- preuves : `packages/domain/tests/margin-calibration.test.ts`

Le modèle dérive chaque cellule des specs réellement seedées
(`app.symbol_specs`, jeu `WARIBA-SANDBOX-SYMBOLS-1.1.0`) et de
`SANDBOX_BASE_PRICES`. Aucun prix n'est inventé : un instrument sans quote
versionnée retourne `open_calibration` et ne produit ni marge, ni quantité,
ni levier.

### 12.1 Verdict mécanique — matrice 5 tailles × 3 profils × 5 instruments

```text
cellules totales            = 75
cellules infaisables        = 0
cellules « minimum seul »   = 2
symboles OPEN_CALIBRATION   = US30
utilisable mécaniquement    = oui
```

Les deux cellules contraintes sont `5K / INSTANT 10% / XAUUSD` et
`5K / INSTANT 10% / NAS100` : le cap n'y porte que **deux** positions de
taille minimale, pas trois. C'est exactement la contrainte que la §8
signalait, désormais reproductible par test. Toutes les autres cellules
portent au moins trois positions minimales.

### 12.2 Ce que le cap de marge ne protège pas

La colonne nouvelle du modèle est la sensibilité au mouvement de prix. Pour
un mouvement adverse de 1 % à la quantité maximale autorisée par le cap :

| Profil | Instrument | notional / nominal au cap | perte sur 1 % | en % du budget daily |
|---|---|---:|---:|---:|
| Evaluation 20% | EURUSD | 9,98× | 3,35 % du nominal | **335 %** |
| Evaluation 20% | GBPUSD | 9,99× | 3,35 % du nominal | **335 %** |
| Evaluation 20% | XAUUSD | 4,00× | 1,34 % du nominal | 134 % |
| Evaluation 20% | NAS100 | 4,00× | 1,33 % du nominal | 133 % |
| Performance 15% | EURUSD | 4,49× | 1,51 % du nominal | 151 % |
| INSTANT 10% | EURUSD | 2,99× | 1,51 % du nominal | 151 % |

Conclusion factuelle : **aucun des trois caps candidats ne borne une
journée à l'intérieur de son propre budget daily.** Un cap de marge limite
le collatéral immobilisé, pas le coût d'un mouvement. Sous 20 % avec un
levier FX 1:50, l'exposition notionnelle atteignable vaut ~10× le nominal.

### 12.3 Le garde-fou dérivé

Pour qu'un mouvement adverse de `m` reste dans le budget daily `d` :

```text
notional / nominal <= d / m
```

soit, pour un mouvement de 1 % :

```text
ONE / FLEX (daily 3%)  -> 3,00 × nominal
INSTANT    (daily 2%)  -> 2,00 × nominal
```

Dérivation implémentée et testée : `deriveGrossNotionalCapRate`.

## 13. Recommandation Phase 3.4.3

```text
MARGIN_EXPOSURE_CALIBRATION_READY   = yes  (calibration exécutée et rejouable)
20_15_10_VALIDATED                  = yes, comme cap de MARGE uniquement
                                      non, comme borne de RISQUE
RECOMMENDED_VALUES                  = conserver 20 / 15 / 10 en cap de marge
                                      + ajouter un plafond d'exposition brute
                                        3,00× nominal (ONE/FLEX)
                                        2,00× nominal (INSTANT)
OWNER_DECISION_REQUIRED             = yes
```

Trois raisons maintiennent la décision chez le propriétaire :

1. le plafond d'exposition brute est une **nouvelle** valeur de policy; le
   Canonical Policy Contract V2 §8 interdit d'éditer une version publiée, il
   faudra donc une nouvelle version de policy en 3.4.4, pas une correction
   en place;
2. US30 et les énergies restent sans spécification d'instrument versionnée;
3. distances de stop, gaps et corrélations réelles restent absentes — le
   modèle prouve une condition nécessaire, jamais suffisante.

Tant que cette décision n'est pas prise, `app.margin_profiles.calibration_status`
reste `calibration_required` pour les cinq profils V2 et le moteur pré-trade
refuse toute augmentation d'exposition V2 avec
`MARGIN_CAP_NOT_CALIBRATED`. Aucune valeur n'est publiée comme limite active.
