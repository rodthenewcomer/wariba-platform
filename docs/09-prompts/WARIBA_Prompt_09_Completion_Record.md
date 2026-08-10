# WARIBA Prompt 09 — WARIBA Control : dossier de clôture

Document d'état courant. Il décrit ce qui est réellement implémenté et
certifié à la clôture du Prompt 09. Il ne réécrit aucun document historique.

| Champ | Valeur |
|---|---|
| Prompt | 09 — WARIBA Control (console d'exploitation interne) |
| Branche | `feat/prompt-09-wariba-control` |
| Jalons | 1 à 6, tous acceptés |
| Portée | Visibilité et opérations gouvernées ; aucun panneau d'administration générique |

---

## 1. Architecture d'information finale

Quatorze aires d'exploitation, déclarées une seule fois dans
`packages/application/src/control-navigation.ts`. La navigation et les gardes
lisent la même table : un menu construit à partir d'une liste et des pages
protégées par une autre est exactement ainsi qu'une surface devient visible
sans être ouvrable — ou pire, ouvrable sans être visible.

| # | Aire | Route | Autorité de lecture |
|---|---|---|---|
| 1 | Overview | `/control` | aucune (chaque panneau porte la sienne) |
| 2 | Users | `/control/users` | `account.view` |
| 3 | Accounts | `/control/accounts` | `account.view` |
| 4 | Trading | `/control/trading` | `account.view` |
| 5 | Risk & Integrity | `/control/integrity` | `risk.view` |
| 6 | Payouts | `/control/payouts` | `payout.view` |
| 7 | Market Ops | `/control/market-operations` | `market_operations.view` |
| 8 | Incidents | `/control/incidents` | `incident.view` |
| 9 | Treasury | `/control/treasury` | `treasury.view` |
| 10 | Actuarial | `/control/actuarial` | `actuarial.view` |
| 11 | Policies | `/control/policies` | `policy.view` |
| 12 | Commercial | `/control/commercial` | `commercial_product.view` |
| 13 | Audit | `/control/audit` | `audit_evidence.view` |
| 14 | Team Access | `/control/team` | `staff_directory.view` |

Aucune aire ne reste un placeholder. La navigation est cosmétique :
`requireControlArea()` s'exécute avant toute récupération de données, y
compris en saisie d'URL directe.

---

## 2. Matrice de rôles

Rôles canoniques : `support`, `risk`, `finance`, `compliance`, `admin`,
`super_admin`. `admin`/`super_admin` sont des sur-ensembles.

| Aire | support | risk | finance | compliance |
|---|---|---|---|---|
| Overview | ✅ | ✅ | ✅ | ✅ |
| Users / Accounts / Trading | ✅ | ❌ | ❌ | ❌ |
| Risk & Integrity | ❌ | ✅ | ❌ | ❌ |
| Payouts | ✅ | ❌ | ✅ | ❌ |
| Market Ops | ❌ | ✅ | ❌ | ❌ |
| Incidents | ❌ | ✅ | ✅ | ❌ |
| Treasury | ❌ | ❌ | ✅ | ❌ |
| Actuarial | ❌ | ✅ | ✅ | ❌ |
| Policies | ❌ | ✅ | ❌ | ✅ |
| Commercial | ❌ | ❌ | ❌ | ❌ |
| Audit | ❌ | ❌ | ❌ | ✅ |
| Team Access | ❌ | ❌ | ❌ | ❌ |

`risk` n'entre volontairement pas dans l'explorateur générique `/control/accounts` :
Risk & Integrity est sa voie d'accès à un compte, avec la preuve d'intégrité
et sans l'identité du trader. Moindre privilège assumé, pas un oubli.

---

## 3. Frontières lecture / écriture

Lire une surface n'a jamais impliqué d'agir dessus. Chaque mutation porte sa
propre permission, vérifiée au point de la mutation — jamais déduite d'une
autorité de lecture ni d'un rendu de bouton.

**Écritures autorisées sous Prompt 09**

| Opération | Permission | Surface |
|---|---|---|
| Approuver / refuser un payout | `payout.approve` / `payout.reject` | Payout queue |
| Soumettre / régler / annuler un payout | `payout.settle` / `payout.reverse` | Payout queue |
| KYC sandbox / méthode de payout | `sandbox_kyc.modify` / `payout_method.modify` | Payout queue |
| Poser / lever un integrity hold | `integrity_hold.place` / `.clear` | Risk & Integrity |
| Écriture de réserve | `treasury.modify` | Treasury |
| Hypothèses, exécution et comparaison actuarielles | `actuarial.modify` | Actuarial |

**Lecture seule, sans opération serveur correspondante**

Policies, Commercial, Team Access, Trading, Audit, Incidents, Market Ops.
Ces surfaces ne cachent pas une capacité : aucune n'existe.

Absences certifiées : pas de `policy.publish`, `policy.approve`,
`policy.retire`, `staff.modify`, `staff.invite`, `staff.remove`,
`staff.impersonate`, `admin.modify`. Le test interroge l'ensemble réel des
permissions (`CONTROL_PERMISSIONS`), pas une liste parallèle.

---

## 4. Autorisation au niveau section

L'autorisation façonne la **récupération**, pas l'affichage. Un modèle de
lecture qui chargerait tout et laisserait la page masquer des sections aurait
déjà mis la donnée sur le réseau, dans l'arbre de rendu et dans tout log qui
la capture.

- Détail de compte : `overview`/`trading` → `account.view` ; `risk` →
  `risk.view` ; `payout` → `payout.view` ; `reconciliation_evidence` →
  `reconciliation.view` ; `audit_evidence` → `audit_evidence.view` ;
  `incident_evidence` → `incident.view`.
- Détail de payout : preuve payout → `payout.view` ; preuve d'audit →
  `audit_evidence.view` ; réconciliation → `reconciliation.view`.
- Investigation risque : identité minimale du compte, jamais le trader.

L'ensemble des sections dérive du rôle seul — rien dans l'URL n'y participe.

---

## 5. Vérités opérationnelles préservées

- **ACTUARIAL_MODEL_VALIDATED = false.** Un échantillon comparable n'est pas
  un modèle validé.
- **LAST_VALID_TICK_AGE_SOURCE = UNAVAILABLE.** Affiché « inconnu », jamais
  déduit d'une absence d'alerte.
- **POLICY_MUTATION_AUTHORIZED = false.**
- **COMMERCIAL_MUTATION_SURFACED = false.**
- **FEATURE_FLAG_RUNTIME_STATE = SANDBOX_PRODUCT_FEATURE_FLAGS** — canonique
  mais compilé, pas un service de flags.
- **FOUNDER_COHORT_GATE = NON IMPLÉMENTÉ.**
- Invariants financiers inchangés : cycles P1–P5, P5 → WARIBA Review,
  buffer permanent 10 %, splits 85/15 puis 90/10, aucun abattement universel
  de 50 %, débit du compte = base brute approuvée, soumission provider ≠
  règlement, annulation par écriture compensatoire.

---

## 6. Limites des providers externes

| Domaine | État |
|---|---|
| Données de marché réelles | Non — `mock`/`replay` ; FCS non branché |
| Rail de payout réel | Non — `mock`/`manual` uniquement |
| KYC réel | Non — sandbox |
| Service de feature flags | Non — constante de build |
| MT5 / cTrader / futures / crypto | Hors périmètre |

---

## 7. Décisions ouvertes acceptées à la clôture

Aucune n'invalide le Prompt 09 : chacune est une absence documentée, pas un
comportement incorrect.

| Décision | Impact | Pourquoi non bloquant |
|---|---|---|
| `LAST_VALID_TICK_AGE_SOURCE` | Market Ops ne peut pas dater le dernier tick valide | Le champ est rendu « inconnu ». Aucune santé n'est fabriquée ; la décision est d'ajouter une persistance, pas de deviner. |
| ARCH-FLAG-001 | Aucun pilotage de flag à l'exécution | La source canonique existe et est affichée avec sa portée. Changer un flag reste un déploiement, ce que la console dit explicitement. |
| ARCH-FLAG-002 | Clé inconnue = fail-closed | Comportement correct ; seule la présentation devait distinguer « inconnue » de « désactivée », ce qu'elle fait. |
| POLICY-GOV-002 | Lignes v1.0.0 avec `status='retired'` et `retired_at` nul | Les deux champs sont affichés séparément et jamais synthétisés l'un depuis l'autre. Corriger la donnée exigerait une mutation de politique, non autorisée. |
| ACTUARIAL-VARIANCE-002 | ACTUAL = population persistée, sans appariement de cohorte | La comparaison est présentée comme un ordre de grandeur, et le modèle reste NON VALIDÉ. |

---

## 8. Vérité de production

`PUBLIC_PRODUCTION_READY = false`. Le Prompt 09 livre une console
d'exploitation certifiée ; il ne lève aucun gate actuariel, juridique,
de réserve ou de provider réel.
