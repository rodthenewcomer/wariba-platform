# WARIBA Phase 3.3 / 3.3.1 — Operator Closure et handoff Evaluation → Performance

```text
DATE             = 2026-08-24
BRANCH           = feat/wariba-phase-3-private-beta-completion
SCOPE            = Phase 3.3 + clôture 3.3.1 uniquement
RECOMMENDATION   = PHASE_3_3_PASS_WITH_ACTIONS
PHASE_3_4_STARTED = no
```

Ce rapport est l'état courant consolidé. Le rapport Operator Closure antérieur
conserve le verdict intermédiaire rendu avant le verrouillage de `ONE-025` et
`UX-SUPPORT-004`; il n'est pas réécrit rétroactivement.

## 1. Audit findings

L'audit de la branche courante a trouvé quatre lacunes opérateur réelles et une
lacune de handoff :

| Domaine | Avant | Classement avant implémentation | Après |
|---|---|---|---|
| Overview Control | aucune agrégation de l'attention humaine | MISSING | DONE |
| Pass Review | résultat Risk automatique sans file ni ownership | BACKEND_ONLY / MISSING | DONE |
| Identité | résultat sandbox sans dossier opérateur | BACKEND_ONLY / UI_ONLY | DONE pour l'OS manuel; provider BLOCKED_EXTERNAL |
| Support / Contestations | files existantes sans ownership/version homogènes | PARTIAL | DONE |
| Evaluation → Performance | parent/enfant stockés mais handoff trader incomplet; passage possible hors finalisation | PARTIAL | DONE |
| Reconnaissance des règles Performance | aucune preuve compte+policy avant premier trade | MISSING | DONE |

Le code existant calculait déjà objectif, limites, Best Day, éligibilité et
provisioning. Aucun de ces calculs n'a été dupliqué dans Control. Les deux
décisions initialement bloquantes sont maintenant `LOCKED` :

- `ONE-025` / `ONE-026` : le passage est automatique et uniquement finalisé par
  la finalisation quotidienne; Control effectue une revue post-résultat.
- `UX-SUPPORT-004` : une erreur WARIBA se corrige par compensation explicite,
  jamais par réécriture du breach.

## 2. Architecture decisions

1. Toute mutation suit `UI → Server Action → application command → transaction
   autoritative → database → read model`.
2. Les files utilisent un owner serveur, un timestamp d'affectation et une
   version optimiste sous verrou de ligne (`ENG-033`).
3. Risk reste l'unique autorité des critères de passage; Control ne possède pas
   de permission `pass_review.decide`.
4. `pass_pending` reste tradable intraday. Seule la finalisation quotidienne
   peut écrire `passed` et provisionner Performance atomiquement.
5. Un compte Performance a exactement une Evaluation source et une policy
   Performance publiée attachée.
6. Le premier trade Performance exige une reconnaissance immuable de la policy
   attachée; le navigateur ne fournit ni trader, ni policy, ni valeur financière.
7. Une correction de contestation crée au plus un nouveau compte ONE sans coût,
   sans copier PnL, ledger ou entitlement; les cas monétaires échouent fermés
   vers Finance/Compliance.
8. Identité reste une coque opérationnelle sans provider, document, selfie ou
   biométrie.

## 3. Database changes

### `20260824204836_operator_closure_control_os.sql`

- `support_tickets`: assignee, date d'affectation, version et index d'activité;
- `contestations`: assignee séparé, date, version et index de file;
- `identity_review_cases`: référence `IDV-*`, compte, motif, état, assignee,
  preuve opaque, motif interne, message trader, version et corrélation;
- RLS propriétaire, grants navigateur révoqués et index correspondant aux
  filtres réels.

### `20260824233544_phase_3_3_product_decision_closure.sql`

- revue post-résultat Pass Review persistée et auditée;
- `source_contestation_id` unique sur le compte de remplacement;
- statuts `correction_required`, `decision_corrected` et
  `finance_compliance_review` avec contraintes de cohérence;
- unicité de la compensation et conservation du compte original.

### `20260825002714_phase_3_3_1_evaluation_performance_handoff.sql`

- `performance_rule_acknowledgements`: owner, compte Performance, policy
  attachée, source, timestamp et corrélation;
- unicité par compte, validation owner/programme/policy, trigger d'immutabilité;
- own-select RLS mais aucun grant navigateur; lecture et écriture via BFF;
- index justifiés par compte, utilisateur et policy.

Aucune table de document KYC, aucun bucket sensible et aucun provider n'ont été
créés.

## 4. RBAC changes

Capacités backend réellement utilisées :

| Domaine | Capacités | Rôles métier |
|---|---|---|
| Support | `support.read`, `support.assign`, `support.reply`, `support.resolve` | Support |
| Contestations | `dispute.read`, `dispute.assign`, `dispute.review`, `dispute.resolve`, `dispute.correct`, `dispute.remediate` | lecture Support/Risk/Compliance; mutations Risk/Compliance |
| Pass Review | `pass_review.read`, `pass_review.review`, `pass_review.escalate` | Risk/Compliance |
| Identité | `identity_review.read`, `identity_review.assign`, `identity_review.review`, `identity_review.decide` | Compliance |

Admin/super-admin héritent selon la hiérarchie existante. Chaque Server Action
revalide la session et la capacité. Aucun operator ID fourni par le client
n'est accepté comme autorité. Il n'existe ni `pass_review.decide`, ni édition
de policy, ni mutation financière générique.

## 5. Pass Review

**Avant :** le moteur pouvait atteindre `pass_pending`, passer et provisionner
Performance, mais aucun opérateur ne disposait d'une file; une relance Risk non
quotidienne pouvait aussi finaliser le passage.

**Après :** `/control/pass-reviews` et le détail fournissent recherche, filtres,
pagination, âge neutre, affectation, résultat système, conditions canoniques et
relation Performance. La revue peut être marquée `reviewed` ou
`integrity_escalated` après le résultat. Elle ne peut ni approuver, refuser,
retarder, recalculer ou saisir une valeur. La promotion vers `passed` est
réservée à `daily_finalization` et le provisioning enfant reste exactement une
fois.

```text
PASS_REVIEW_ACTION_BLOCKED_BY_PRODUCT_DECISION = no
```

## 6. Identity Operations

**Avant :** un booléen sandbox pouvait être manipulé sans dossier, ownership ou
historique dédié.

**Après :** `/control/identity` et son détail montrent la raison, le compte, le
gate payout, l'état, l'assignee, l'activité et l'historique. Un résultat manuel
autorisé requiert motif, message public et référence de preuve opaque. Les URL
et contenus documentaires sont refusés. Le trader voit séparément l'avancement
du dossier et le résultat KYC.

```text
KYC_PROVIDER_INTEGRATED       = no
KYC_DECISION_BLOCKED_EXTERNAL = no pour le résultat sandbox manuel canonique
```

La vérification externe réelle reste Phase 3.5.

## 7. Support

**Avant :** file, thread et réponses existaient; ownership, recherche compte,
filtres `mine` et refus stale étaient incomplets.

**Après :** assignation autoritative, recherche WRB/compte, filtres état et
assigned/unassigned/mine, pagination, dernière activité, chronologie et version
optimiste. Les replies sont publiques et append-only. Aucun champ « note
interne » ambigu n'a été introduit.

## 8. Contestations

**Avant :** preuve, `upheld` et `requires_escalation` existaient, sans modèle
d'affectation homogène ni correction canonique.

**Après :** file recherchable/paginée, assignee distinct du décideur, historique,
motifs obligatoires, stale guard et parité trader. `correction_required` confirme
l'erreur sans toucher à la violation; la remédiation idempotente crée un unique
compte de remplacement puis écrit `decision_corrected`. Un compte Performance,
un payout/entitlement ou une conséquence monétaire part vers
`finance_compliance_review` sans compensation automatique.

```text
DISPUTE_REMEDIATION_PRODUCT_DECISION_REQUIRED = no
ORIGINAL_BREACH_REWRITTEN                     = no
```

## 9. Control UX

Routes opérationnelles :

- `/control`: attention requise, attribué à moi, âge/activité et décisions
  récentes;
- `/control/pass-reviews` et `/control/pass-reviews/[accountPublicId]`;
- `/control/identity` et `/control/identity/[publicId]`;
- Support et Contestations durcis sur leurs routes existantes;
- détail compte enrichi par la relation Evaluation/Performance.

Les files utilisent des tables sémantiques, filtres serveur, états
loading/empty/error/permission/stale/success et libellés français. Aucun SLA,
score, opérateur, cas financier ou priorité n'est fabriqué. Le refresh de la
comparaison Actuarial reste un défaut préexistant documenté en section 15; la
mutation, elle, n'est pas un placebo et reste hors du scope 3.3.

## 10. Trader UX effects

- Evaluation : « Objectif atteint », finalisation en cours puis réussite sont
  distincts; `pass_pending` reste tradable jusqu'à la clôture.
- Handoff : l'Evaluation réussie reste consultable et relie l'unique compte
  Performance; elle ne peut plus ouvrir WariX.
- Performance : onboarding compte-spécifique, comparaison ONE/Performance,
  buffer, journées, Meilleur Jour, chemin payout et policy/version attachée.
- Premier trade : WariX bloque calmement tant que la lecture des règles
  attachées n'est pas reconnue; après reconnaissance, le compte Performance est
  la destination autoritative.
- Identité, Support et Contestations : statuts humains français, sans enum,
  UUID, corrélation ou motif interne.

Les seuls fichiers d'application WariX touchés sont
`apps/web/app/(trade)/trade/page.tsx` et `trade-copy.ts`, pour consommer le
handoff autoritatif. Aucun graphique, ordre, indicateur, donnée marché,
position ou layout n'a été redessiné.

## 11. Security

- autorisation backend deny-by-default et RLS en défense en profondeur;
- appels cross-role refusés, dont Support → décision Risk et Risk → action
  Support;
- isolation cross-trader Support, Contestations, Identité et comptes;
- propriétaire, compte et policy dérivés côté serveur pour la reconnaissance;
- aucune mutation Control de violation, snapshot, fill, ledger ou policy;
- références sensibles opaques; aucun token, document KYC ou banking data dans
  les logs;
- événements structurés pour affectations, décisions, pass, provisioning,
  reconnaissance et premier trade.

## 12. Concurrency

Les commandes opérateur verrouillent la ligne, rechargent l'état, comparent
`expectedVersion`, vérifient l'assignee et l'état légal, écrivent mutation +
audit puis incrémentent la version. Le second submit fondé sur un écran ancien
est refusé avec « Ce dossier a changé » et n'écrase rien.

Le provisioning Performance utilise le verrou du parent et l'unicité
`source_evaluation_account_id`. La reconnaissance des règles est unique par
compte. Le premier événement `performance_first_trade` est écrit exactement une
fois sous le verrou du compte, y compris après retry.

## 13. Evidence

- Operator Closure :
  `docs/04-ux/evidence/wariba-phase-3-3-operator-closure/` — 25 PNG, README et
  manifest; 1440, 1024, 390 et 320.
- Décisions produit :
  `docs/04-ux/evidence/wariba-phase-3-3-product-decision-closure/` — 6 PNG.
- Handoff Evaluation → Performance :
  `docs/04-ux/evidence/wariba-phase-3-3-1-evaluation-performance-handoff/` —
  29 PNG, README et manifest SHA-256 vérifié.

Les captures viennent du produit local avec fixtures synthétiques créées dans
les tests et supprimées au teardown. Elles ne constituent pas des données de
production. La revue visuelle humaine et ses questions sont consignées dans
les README; le passage des tests ne remplace pas l'acceptation propriétaire.

## 14. Tests

Exécutions réelles sous Node `24.18.0` :

- logique Phase 3.3.1 DB Risk + Performance : **9/9**;
- read model application handoff : **2/2**;
- worker daily finalization : **1/1**;
- RLS payouts ciblé : **9/9**;
- ciblage Operator Closure RBAC/read models : **54/54**;
- DB/RLS Support + Contestations : **25/25**;
- Identité transactionnelle : **2/2**;
- E2E Operator Closure : **1/1**, 25 captures;
- E2E handoff : **1/1**, 29 captures, dernier run **2,3 min**;
- ciblage Control après traduction des titres : **3/3**;
- `pnpm test:fast` : format PASS, lint **16/16**, typecheck **16/16**,
  boundaries PASS, secrets PASS, unit **1 551 réussis**;
- certification, segments terminés : property **2/2**, build **4/4**, SQL
  **24/24**, intégration database **213/213**, application **56/56**, worker
  **1/1**, RLS **68/68**, realtime E2E **10/10**;
- recovery : **1/1**;
- failover : **1/1**, takeover **4 083 ms**, sans doublon;
- load : **150/150 connexions**, 0 échec, 0 drop, snapshot p95 **404 ms**.

La certification Web exhaustive a été arrêtée volontairement après plus de 32
minutes et 94 scénarios atteints sur 327 : plusieurs timeouts de cinq minutes
rendaient la poursuite contraire au budget de test. Elle n'est donc pas déclarée
verte. Les trois assertions Control liées aux titres anglais ont été corrigées
et rejouées 3/3.

## 15. Pre-existing failures

Séparés des régressions 3.3 :

1. `help-p0-visual-clarity.spec.ts` détecte une violation Axe **serious** sur
   `HLP-VIS-012` : contrastes mesurés 1,86:1 et 1,61:1. Surface Help P0
   préexistante, hors scope 3.3; non corrigée ici.
2. Le scénario Actuarial enregistre bien la comparaison et l'audit, mais la vue
   reste sur « Aucune comparaison » sans rechargement. Reproduit isolément;
   hors scope Operator Closure et laissé inchangé après retrait d'un correctif
   expérimental insuffisant.
3. Le parcours Support a expiré à 300 s dans la grande suite; sa relance ciblée
   n'a pas atteint le test parce que le `webServer` Playwright a expiré à 180 s
   pendant le build. Les tests ciblés Support/Operator Closure restent verts,
   mais ce cas exhaustif n'est pas certifié.
4. Next affiche les warnings non bloquants `no-img-element` dans
   `HubUserMenu.tsx` et `next start` avec `output: standalone`.

Aucune de ces causes ne touche les calculs Risk, le provisioning, la
reconnaissance des règles, les permissions ou la concurrence de Phase 3.3.

## 16. Updated Product OS coverage

Calcul direct des 190 lignes CSV. Poids : DONE 1; PARTIAL/BACKEND_ONLY 0,5;
UI_ONLY 0,25; MISSING/DOCUMENTATION_ONLY 0. Deferred, obsolete,
cannot-verify et blockers externes sont exclus du dénominateur historique.

```text
ROWS                              = 190
DONE                              = 132
PARTIAL                           = 32
MISSING                           = 14
BACKEND_ONLY                      = 1
BLOCKED_EXTERNAL                  = 4
DOCUMENTATION_ONLY                = 2
INTENTIONALLY_DEFERRED            = 3
CANNOT_VERIFY                     = 1
OBSOLETE                          = 1

PRODUCT_OS_REQUIREMENT_COVERAGE   = 82.0% (148.50 / 181)
CRITICAL_PRODUCT_COMPLETENESS     = 83.2% (129.00 / 155)
P0_COMPLETENESS                   = 91.2% ( 46.50 /  51)
```

## 17. Remaining beta blockers

### CLOSED BY 3.3

- Overview Control, Pass Review, Identité manuelle;
- ownership, audit, recherche, pagination et stale guards;
- revue post-résultat et escalade intégrité;
- correction compensatoire sans réécriture du breach;
- handoff atomique Evaluation → Performance;
- onboarding et reconnaissance de la policy attachée;
- parité Trader/Support/Control et observabilité jusqu'au premier trade.

### STILL IN 3.4 — non démarré

- `/profil`, paramètres et autres routes produit/lifecycle ouvertes;
- WARIBA Review trader, soft-lock/reset et feedback lifecycle restant;
- `/status`, `/regles`, `/confiance`, incidents publics et analytics selon la
  Road to Beta actuelle.

### STILL IN 3.5

- providers KYC, paiement, payout, e-mail et market data;
- checks externes, re-KYC, rails réels, delivery et retry provider;
- décisions/contrats `OPEN-PAYOUT-001`, `OPEN-PAYMENT-001` et droits market
  data.

### STILL IN 3.6

- audit sécurité formel, métriques agrégées, rétention/privacy, restauration DB
  prouvée et persistance éditoriale Help.

### STILL WariX PROFESSIONALIZATION

- vues sérialisables, vues Performance/Risk, re-sync;
- indicateurs au-delà d'EMA/SMA, préférences et personnalisation du chart;
- aucun de ces éléments n'a été commencé ici.

## 18. 35-role council

Réponses de red-team : un trader ne reste plus sans destination dans le
handoff; un opérateur trouve les files sans ouvrir Supabase; une mutation
illégale est refusée backend; deux opérateurs ne s'écrasent pas; les faits Risk
et financiers restent immuables; le trader reçoit une explication humaine;
l'audit prouve acteur, cible, avant/après, motif et date; les files sont
paginées/indexées pour 1 000 traders; un seul opérateur peut travailler via
« non attribué / à moi / tous »; aucune opération sans backend n'est présentée.

| # | Rôle | Verdict | Motif |
|--:|---|:---:|---|
| 1 | Founder / CEO | WARNING | Phase 3.3 est opérable; la bêta reste bloquée par providers et déploiement. |
| 2 | Head of Product | PASS | `ONE-025/026`, `UX-SUPPORT-004`, `PERF-036` et `UX-HUB-011` sont verrouillées. |
| 3 | Prop-firm Operations Director | PASS | Files, ownership, actions permises et compensation existent. |
| 4 | Professional Trader | PASS | Handoff et règles Performance sont explicites. |
| 5 | Beginner Trader | PASS | Prochaine étape en français humain, sans enum. |
| 6 | Funded Trader | PASS | Compte Performance et prérequis payout sont visibles. |
| 7 | Risk Director | PASS | Risk reste autorité; original immuable. |
| 8 | Quant / Risk Engineer | PASS | Aucun calcul dupliqué dans Control. |
| 9 | Trading Operations Analyst | PASS | Files filtrées, paginées et attribuées. |
| 10 | Compliance Officer | WARNING | Workflow manuel sûr; provider KYC absent. |
| 11 | KYC / Identity Operations Specialist | WARNING | Résultat opérable sans document; vérification externe en 3.5. |
| 12 | Fraud & Integrity Analyst | PASS | Escalade séparée du pass et des sanctions. |
| 13 | Dispute / Appeals Reviewer | PASS | Correction compensatoire explicite et auditée. |
| 14 | Customer Support Lead | PASS | Recherche, contexte parent/enfant, thread et stale guard. |
| 15 | Customer Success Lead | PASS | Trader informé sans détails internes. |
| 16 | Finance Operations Lead | WARNING | Cas monétaires échouent fermés; rails absents. |
| 17 | Payout Operations Specialist | WARNING | Payout réel reste Phase 3.5. |
| 18 | Legal / Terms Reviewer | PASS | Effets de passage et correction sont maintenant documentés. |
| 19 | Privacy Engineer | PASS | Aucun document KYC; interne/public séparés. |
| 20 | Security Engineer | PASS | Autorisation serveur, RLS et isolation négative. |
| 21 | Backend Architect | PASS | Commandes transactionnelles et idempotentes. |
| 22 | PostgreSQL / Supabase Architect | PASS | Contraintes, locks, RLS et index justifiés. |
| 23 | RBAC / Authorization Engineer | PASS | Capacités granulaires; pas de super-admin silencieux. |
| 24 | Frontend Architect | PASS | Read models serveur et deux seuls fichiers WariX lifecycle. |
| 25 | Design System Lead | PASS | Control dense, sobre et tokenisé. |
| 26 | Senior Fintech Product Designer | PASS | Identité, preuve et action hiérarchisées. |
| 27 | Mobile UX Specialist | PASS | Surfaces trader vérifiées à 390 et 320. |
| 28 | Accessibility Specialist | WARNING | Surfaces 3.3 à 0 critical/serious; un contraste Help P0 préexiste. |
| 29 | French UX Writer | PASS | Aucun jargon développeur trader. |
| 30 | SRE / Reliability Engineer | WARNING | Recovery/failover/load verts; déploiement et restauration DB restent ouverts. |
| 31 | Observability Engineer | PASS | Funnel durable de l'objectif au premier trade. |
| 32 | QA Lead | WARNING | Ciblés verts; certification Web exhaustive incomplète. |
| 33 | Test Automation Engineer | WARNING | Bootstrap Playwright et scénario Support à stabiliser. |
| 34 | Product Analytics Specialist | WARNING | Événements présents; agrégation reportée. |
| 35 | Independent Red-Team Product Auditor | WARNING | Aucun VETO 3.3; actions préexistantes et full E2E empêchent un PASS sans réserve. |

Council : **24 PASS · 11 WARNING · 0 VETO**.

## 19. Final matrix

```text
PHASE_3_3_OPERATOR_CLOSURE_READY       = yes
CONTROL_OVERVIEW_READY                 = yes

PASS_REVIEW_QUEUE_READY                = yes
PASS_REVIEW_DETAIL_READY               = yes
PASS_REVIEW_AUTHORIZED_ACTIONS_READY   = yes
PASS_REVIEW_TRADER_PARITY_READY        = yes

IDENTITY_QUEUE_READY                   = yes
IDENTITY_DETAIL_READY                  = yes
IDENTITY_OPERATIONAL_STATE_READY       = yes
KYC_PROVIDER_INTEGRATED                = no

SUPPORT_QUEUE_READY                    = yes
SUPPORT_ASSIGNMENT_READY               = yes
SUPPORT_REPLY_READY                    = yes
SUPPORT_CONCURRENCY_READY              = yes

CONTESTATION_QUEUE_READY               = yes
CONTESTATION_ASSIGNMENT_READY          = yes
CONTESTATION_REVIEW_READY              = yes
CONTESTATION_DECISION_READY            = yes

ORIGINAL_BREACH_IMMUTABLE              = yes
OPERATOR_DECISIONS_AUDITED             = yes
OPERATOR_ASSIGNMENTS_AUDITED           = yes

RBAC_BACKEND_ENFORCED                  = yes
CROSS_ROLE_MUTATION_BLOCKED            = yes
CROSS_TRADER_ACCESS_BLOCKED            = yes

CONTROL_PLACEBO_ACTIONS                = 0
CONTROL_PLACEBO_FILTERS                = 0
TRADER_RAW_ENUMS                       = 0
TRADER_INTERNAL_METADATA               = 0
FAKE_FINANCIAL_VALUES_PRODUCTION       = 0

MOBILE_TRADER_320_READY                = yes
MOBILE_TRADER_390_READY                = yes
CONTROL_1024_NO_BREAKAGE               = yes
CONTROL_1440_READY                     = yes

ACCESSIBILITY_CRITICAL_PHASE_3_3       = 0
ACCESSIBILITY_SERIOUS_PHASE_3_3        = 0
PRE_EXISTING_HELP_P0_SERIOUS           = 1
WARIX_APPLICATION_FILES_MODIFIED       = 2

EVAL_INTRADAY_PASS_BLOCKED             = yes
PASS_REQUIRES_DAILY_FINALIZATION       = yes
PERFORMANCE_PROVISIONING_EXACTLY_ONCE  = yes
EVALUATION_PERFORMANCE_LINKED          = yes
PERFORMANCE_POLICY_ATTACHED            = yes
PERFORMANCE_RULES_ONBOARDING_READY     = yes
PERFORMANCE_RULES_ACK_READY            = yes
PERFORMANCE_DASHBOARD_READY            = yes
WARIX_PERFORMANCE_CONTEXT_READY        = yes
EVALUATION_NON_TRADABLE_AFTER_PASS     = yes
HANDOFF_OBSERVABILITY_READY            = yes
```

`WARIX_APPLICATION_FILES_MODIFIED = 2` est l'écart explicite au target zéro :
les deux fichiers consomment uniquement l'interface lifecycle autoritative,
comme l'exception du scope le permet. Aucun autre fichier d'application WariX
n'a été modifié.

## 20. Recommendation

```text
PHASE_3_3_PASS_WITH_ACTIONS
NEXT_RECOMMENDED_SLICE = stabiliser les failures préexistants listés en §15,
                         puis Phase 3.4 selon la Road to Beta
```

Les actions ne rouvrent pas la logique 3.3 : corriger le contraste Help P0,
stabiliser le bootstrap/Support E2E et fermer le refresh Actuarial avant une
certification exhaustive. Phase 3.4 n'a pas été commencée. Aucun provider,
déploiement, marketing, landing page, paiement, KYC vendor, Help P1/P2 ou
professionnalisation WariX n'a été ajouté. Aucun commit, push, PR, merge ou
déploiement n'a été effectué.

