# WARIBA Phase 3.4.1 — Closure Report

> **STATUS = DOCUMENTARY PHASE COMPLETE**
> **PROGRAM STATUS = GO PILOTE RÉVOCABLE — NOT LOCKED**
> **V2 RUNTIME/PILOT ACTIVATION = BLOCKED UNTIL P0 CLOSURE**
> Date : 27 août 2026

## 1. Périmètre exécuté

Phase 3.4.1 a été exécutée comme audit, supersession et consolidation
documentaire uniquement. Aucun fichier `apps/**`, `packages/**`, `services/**`,
`supabase/migrations/**`, configuration, base de données ou deployment n’a été
modifié.

Branche auditée : `main`
START SHA : `9dff986e5880130725a64866431ec8e3635f2a16`
END SHA : identique — aucun commit créé
Décision : `POLICY-GOV-003 / WARIBA_OFFER_POLICY_V2_SUPERSESSION`

## 2. Résultat normatif

V2 est la nouvelle source normative de vérité pour les nouvelles offres, le
contenu à propager et les futurs comptes pilotes attachés à une policy V2. Les
valeurs V1 ne pilotent plus les nouveaux travaux. Elles ne survivent que comme
historique et pour l’exécution des comptes déjà épinglés, sans migration
rétroactive.

Le statut reste `GO PILOTE révocable — pas LOCK`. Il ne vaut ni activation du
runtime, ni vente publique prête, ni validation économique/juridique.

## 3. Documents créés

1. `docs/02-program/WARIBA_Program_Rulebook_Candidate_V2.md`
2. `docs/02-program/WARIBA_Canonical_Policy_Contract_V2.md`
3. `docs/03-finance/WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1.md`
4. `docs/06-engineering/WARIBA_RULE_SOURCE_OF_TRUTH_MAP_V2.md`
5. `docs/06-engineering/WARIBA_PHASE_3_4_POLICY_BLAST_RADIUS.md`
6. `docs/08-delivery/WARIBA_PHASE_3_4_1_REPOSITORY_RULE_INVENTORY.md`
7. `docs/08-delivery/WARIBA_PHASE_3_4_1_CLOSURE_REPORT.md`

## 4. Documents modifiés minimalement

1. `docs/00-decisions/DECISION_LOG.md` — Decision Record, hiérarchie V2 et historique v1.33.
2. `docs/00-decisions/WARIBA_PRODUCT_OS_MASTER_CONSTITUTION_2026.md` — portée V1 explicite et routing V2.
3. `docs/01-product/WARIBA_Product_Master_Document_v1.0.md` — bannière historique/superseded.
4. `docs/01-product/WARIBA_Product_Master_Document_v1.1.md` — bannière historique/superseded.
5. `docs/02-program/WARIBA_Program_Rulebook_v1.0.md` — bannière historique/superseded.
6. `docs/02-program/WARIBA_Program_Rulebook_v1.1.md` — bannière historique/superseded.

Les copies préexistantes du candidat V2 sous `docs/00-decisions` et
`docs/03-finance`, le workbook/notebook/report source non suivis et la
suppression préexistante du modèle actuariel root ont été préservés.

## 5. Corrections obligatoires appliquées au Rulebook V2

- EA, bots et API externes : non supportés pendant le pilote; absence de
  support ou tentative d’usage ≠ fraude.
- Copy trading automatisé/liaison automatique : indisponibles; décisions
  manuelles similaires sur ses propres comptes permises; partage, gestion
  tierce et coordination frauduleuse interdits.
- `PAYOUT_DEBIT_CANNOT_CAUSE_TRADING_BREACH = true`, avec texte public et
  contrat de séparation financière/risque.
- Caps 20/15/10 : `CALIBRATION_REQUIRED`, jamais présentés comme actifs.
- Catalogue : les quinze combinaisons sont publiques; `HOLD/LIMITÉ/gated`
  concerne l’acquisition, les quotas, l’activation ou la réserve.

## 6. Vérité produit consolidée

- ONE : 8% target, 3% daily soft, 8% ML EOD, 35% Best Day, buffer 2%.
- FLEX : 4% target, 3% daily soft, 6% ML EOD, 35% Best Day, buffer 3%.
- INSTANT : aucune Evaluation, 2% daily soft, 5% ML EOD, 30% Best Day,
  buffer 3%.
- Payout commun : 5 nouveaux Performance Days à +0,5%, splits
  80/80/85/85/90, caps exacts 5K–100K, Review après #5, aucun #6 automatique.
- Catalogue : 3 programmes × 5 tailles = 15/15, avec prix XOF exacts et
  activation FLEX figée au checkout.
- Trading : profits clôturés <60 s non éligibles, pertes/coûts toujours
  comptés; overnight/weekend autorisés sous calendrier; news Performance
  T−2/T+2; automation/copy automatisé indisponibles.

## 7. Calibration marge/exposition

Le modèle calcule les budgets 0,5%, daily et ML ainsi que la marge/lots max
pour 5K/10K/25K/50K/100K × EURUSD/GBPUSD/XAUUSD/NAS100 sous les trois profils.
US30 reste `OPEN_CALIBRATION` faute de spec repository.

Le verdict reste `OPEN_CALIBRATION` : aucun cap n’est lockable. Le sanity check
montre notamment que 5K INSTANT ne permet pas trois positions minimales
XAUUSD ou NAS100 avec les références sandbox actuelles, et qu’un cap de marge
ne prouve pas un risque 0,5% sans stop/gap/coûts.

## 8. Audit repository et stale references

Inventaire : 191 fichiers uniques.

| Classe | Fichiers |
|---|---:|
| A — NORMATIVE_CURRENT | 3 |
| B — NORMATIVE_SUPPORTING | 14 |
| C — IMPLEMENTATION_REFERENCE | 128 |
| D — HISTORICAL_EVIDENCE | 38 |
| E — DEPRECATED/SUPERSEDED | 8 |

Scan sémantique V1 : 78 occurrences / 30 fichiers — Historical 20,
Superseded normative 12, Implementation to change 37, False positive 9,
Unclassified 0.

Scan prix : 103 occurrences / 58 fichiers — Historical 16, Superseded
normative 24, Implementation to change 49, False positive 14, Unclassified 0.

Les deux scanners peuvent toucher des lignes différentes ou chevauchantes;
leur total brut est 181 hits et ne prétend pas être un nombre dédupliqué de
règles.

## 9. Blockers et décisions ouvertes

### P0 avant tout compte V2

1. `P0-POLICY-IMMUTABILITY` — aucune immutabilité DB de policy publiée.
2. `P0-CONSENT-PINNING` — consentement, commande et activation ne partagent
   pas l’ID/hash exact; re-resolution possible.
3. `P0-PROGRAM-SCHEMA` — FLEX/INSTANT absents des contraintes/types/catalogue.
4. `P0-PAYOUT-RISK` — `payout_debit` entre dans la projection de risque.
5. `P0-MARGIN-ENFORCEMENT` — taux non calibrés/non consommés; gate réel en lots.
6. `P0-NEWS-SESSION` — aucun calendrier versionné ou enforcement serveur.

### Ouverts / HOLD

- prix/taxes/frais et traitement légal définitif;
- reset commercial;
- plafond d’évaluations actives;
- spécification US30/énergies et calendrier provider;
- procédure/délai légal des contestations;
- KYC/provider/rails pays réels;
- promesse Wave globale;
- Disaster economics, réserve, données cohorte et conditions de LOCK.

### P1 de propagation

- unifier `created_at` versus `effective_from` pour la résolution policy;
- séparer catalogue public et gates paid dans Commerce;
- retirer les hardcodes V1 du site/Help;
- étendre Control/Hub/WariX/read models aux trois programmes;
- construire les reason codes V2 et les capabilities pays/rail.

## 10. Phase 3.4.1 — Completion Recap

- Audit files total: 191
- NORMATIVE_CURRENT: 3
- NORMATIVE_SUPPORTING: 14
- IMPLEMENTATION_REFERENCE: 128
- HISTORICAL_EVIDENCE: 38
- DEPRECATED/SUPERSEDED: 8
- Stale references detected: 181 scan hits (78 semantic + 103 price; non deduplicated)
- Stale references resolved: 0 runtime references modified; 36 documentary occurrences made historical/superseded by scope and Decision Record
- Stale references intentionally preserved as historical: 36 scan hits classified HISTORICAL
- Stale references still to change in Phase 3.4.x: 86 scan hits classified IMPLEMENTATION_TO_CHANGE_3_4_X
- Unclassified stale references: 0
- Decision Record created: `docs/00-decisions/DECISION_LOG.md` — `POLICY-GOV-003 / WARIBA_OFFER_POLICY_V2_SUPERSESSION`
- Canonical Policy Contract created: `docs/02-program/WARIBA_Canonical_Policy_Contract_V2.md`
- Source-of-Truth map created: `docs/06-engineering/WARIBA_RULE_SOURCE_OF_TRUTH_MAP_V2.md`
- Blast Radius created: `docs/06-engineering/WARIBA_PHASE_3_4_POLICY_BLAST_RADIUS.md`
- Margin/Exposure calibration created: `docs/03-finance/WARIBA_MARGIN_EXPOSURE_CALIBRATION_V1.md`
- Runtime code changed: no
- Migrations created: no
- Open decisions remaining: policy immutability/pinning; FLEX/INSTANT schema; payout debit risk neutrality; margin caps; news/session calendars; legal/tax/rails/Disaster/LOCK
- Phase 3.4.1 ready: yes — documentary scope complete; V2 runtime/pilot activation remains no until all P0 blockers close

## 11. Stop boundary

La Phase 3.4.1 s’arrête ici. Aucun chantier 3.4.x, aucune migration, aucun
runtime, aucun commit, push, PR, merge ou deployment n’a été démarré.
