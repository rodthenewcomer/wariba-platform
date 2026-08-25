# WARIBA Phase 3.3 — Operator Closure / Control OS

> Ce rapport conserve le verdict intermédiaire rendu avant les décisions
> `ONE-025` et `UX-SUPPORT-004`. Ces deux décisions sont maintenant `LOCKED`.
> Pour l’état courant et la clôture consolidée, voir
> `WARIBA_ROAD_TO_BETA_2026-08-24.md` et
> `WARIBA_PHASE_3_3_1_EVALUATION_PERFORMANCE_HANDOFF_REPORT_2026-08-24.md`.

```text
DATE        = 2026-08-24
BRANCH      = feat/wariba-phase-3-private-beta-completion
SCOPE       = operator closure only
RECOMMENDATION = PHASE_3_3_BLOCKED
```

Phase 3.3 livre l'OS opérateur sans inventer les deux décisions produit qui
manquent. Control sait maintenant dire ce qui demande une attention humaine,
qui possède le dossier, quels faits autoritatifs existent et si une action est
encore valable. Il ne sait pas — volontairement — faire approuver manuellement
un passage Evaluation → Performance ni remédier un breach erroné, car aucune
source supérieure ne définit ces actions.

---

## 1. Audit findings

| Domaine | Avant | Audit courant | Résultat 3.3 |
|---|---|---|---|
| Overview Control | MISSING | aucune agrégation opérationnelle | DONE |
| Pass Review | BACKEND_ONLY / MISSING | le moteur finalise automatiquement et crée Performance ; la Constitution candidate décrit une autre autorité | PARTIAL, lecture seule |
| Identité | BACKEND_ONLY / UI_ONLY | résultat sandbox staff existant, sans dossier ni file | DONE pour l'OS manuel ; provider BLOCKED_EXTERNAL |
| Support | PARTIAL | reply/resolve présents ; ownership, filtres `mine`, version stale incomplets | DONE |
| Contestations | PARTIAL | preuve et deux issues présentes ; ownership/version/historique opérateur incomplets | DONE dans la policy existante |
| Remédiation contestation | MISSING | aucune transition corrective canonique | BLOCKED par `UX-SUPPORT-004` OPEN |
| RBAC | PARTIAL | capacités Support/Dispute existantes ; assignment/Pass/Identity absents | DONE pour les actions livrées |
| Audit opérateur | PARTIAL | décisions principales auditées ; affectations et dossier identité absents | DONE |
| Concurrence opérateur | MISSING | aucun token de version sur Support/Contestations | DONE |

### Réponses aux questions du council

- **Un trader peut-il rester bloqué ?** Oui, si WARIBA reconnaît un breach
  erroné : aucune remédiation compensatoire n'est encore autorisée. Le passage
  automatique actuel ne bloque pas le trader, mais son futur modèle humain est
  contradictoire.
- **Un opérateur peut-il rester bloqué ?** Oui sur ces deux mêmes décisions ;
  l'UI le dit au lieu d'afficher une commande placebo.
- **Une action non autorisée est-elle possible ?** Les commandes livrées
  vérifient la capacité côté serveur. Les tests cross-role refusent l'accès.
- **Deux opérateurs peuvent-ils écraser le même dossier ?** Non silencieusement :
  verrou de ligne + version attendue, puis refus `stale` du second submit.
- **Des faits importants peuvent-ils être modifiés silencieusement ?** Les
  messages sont append-only, les actions sont auditées et le breach original
  n'est jamais écrit par les commandes Control.
- **L'historique financier peut-il être réécrit par accident ?** Non depuis ces
  commandes. Aucun champ financier n'est éditable et aucun calcul Risk n'a été
  copié dans Control.
- **Le trader comprend-il la décision ?** Les statuts sont projetés en français,
  les messages publics sont distincts des motifs internes et aucun enum brut
  n'est rendu.
- **WARIBA peut-il prouver pourquoi ?** Oui pour toutes les actions livrées :
  acteur, permission, avant/après, motif, cible, date et corrélation.
- **Le support trouve-t-il le dossier ?** Oui par référence WRB/CTS/IDV ou
  compte, statut et affectation, avec file paginée.
- **À 1 000 traders ?** Les files sont filtrées/paginées côté serveur et les
  chemins interrogés sont indexés. Aucun chargement intégral d'historique.
- **Avec un seul opérateur ?** Oui : non affecté, à moi, tous, Overview et âge
  restent compréhensibles sans mécanisme d'équipe avancé.
- **Quelque chose prétend-il fonctionner sans backend ?** Non. Pass Review est
  explicitement non actionnable ; KYC provider reste `false` ; aucun SLA,
  score, priorité ou donnée financière n'est fabriqué.

---

## 2. Architecture decisions

1. `UI → server action → application command → transaction → database/read
   model` reste le seul chemin de mutation.
2. `ENG-033` : affectation serveur + version optimiste pour chaque dossier
   mutable livré.
3. Pass Review lit `account_mission_view` et `account_risk_view`; il ne recalcule
   aucune règle et ne possède aucune commande de décision.
4. Le dossier identité est un workflow opérateur interne. Le résultat produit
   reste `trading_accounts.kyc_sandbox_verified`; `reachableKycStates()` reste
   strictement `not_started | verified` conformément à `UX-HUB-009`.
5. Motif interne et message trader sont deux champs séparés. Aucun internal
   note générique n'est introduit.
6. La contestation référence la preuve canonique. Toute correction future doit
   être compensatoire, jamais un `UPDATE` historique.

Principaux fichiers Phase 3.3 : migration `20260824204836`, read models et
commandes `control-overview`, `control-pass-review`, `control-identity`,
`control-support*`, routes `/control`, composants d'action Support/Contestation/
Identité, projection trader `/verification-identite`, test E2E
`operator-closure.spec.ts`, matrice Product OS, Road to Beta, Decision Log et ce
rapport. Les changements Help P0 déjà présents dans le worktree ne font pas
partie de cette tranche et restent non attribués à 3.3.

```text
PASS_REVIEW_ACTION_BLOCKED_BY_PRODUCT_DECISION = yes
DISPUTE_REMEDIATION_PRODUCT_DECISION_REQUIRED  = yes
KYC_DECISION_BLOCKED_EXTERNAL                  = no (manual sandbox result is canonical)
KYC_PROVIDER_INTEGRATED                        = no
```

---

## 3. Database changes

Migration :
`supabase/migrations/20260824204836_operator_closure_control_os.sql`.

- `app.support_tickets` : `assigned_at`, `version`, contrainte de forme
  d'affectation, index `updated_at desc`.
- `app.contestations` : `assigned_staff_id`, `assigned_at`, `version`, backfill
  depuis `reviewed_by`, contraintes et index assignment/recent activity.
- `app.identity_review_cases` : ID public `IDV-*`, propriétaire, compte
  Performance, motif `first_payout`, statut, assignee, preuve opaque, motif
  interne, message trader, timestamps, version et corrélation.
- Index identité justifiés par les vraies queries : statut+date, assignee+statut,
  user+date, account+date et unicité partielle d'un dossier vivant par compte.
- RLS owner activée ; aucun grant navigateur. La lecture trader passe par le
  BFF avec revalidation de propriété.
- Aucun bucket, document, selfie, biométrie, donnée bancaire ou provider.

Rollback : suppression additive de `identity_review_cases` et de sa séquence ;
les colonnes d'ownership/version peuvent être ignorées par l'ancien code. Le
résultat KYC autoritatif préexistant reste intact.

---

## 4. RBAC changes

| Capability | Rôles directs | Effet |
|---|---|---|
| `dispute.assign` | risk, compliance | prendre un dossier de contestation |
| `pass_review.read` | risk, compliance | voir la file et les résultats système |
| `identity_review.read` | compliance | voir la file/détail identité |
| `identity_review.assign` | compliance | prendre le dossier |
| `identity_review.review` | compliance | demander une information / poursuivre l'examen |
| `identity_review.decide` | compliance | enregistrer le résultat manuel autorisé |

`admin` et `super_admin` héritent selon la hiérarchie existante. Il n'existe
pas de `pass_review.decide`. Support ne gagne ni Risk, ni Identity, ni Payout.
Risk ne gagne aucune mutation Support. Toutes les mutations vérifient le
backend ; l'absence de bouton n'est qu'une conséquence de cette autorité.

---

## 5. Pass Review

**Avant :** le passage automatique et la création Performance existaient, mais
aucune file dédiée ne permettait d'examiner les résultats.

**Après :** `/control/pass-reviews` fournit filtres, pagination, recherche,
statut/âge et détail. Le détail montre trader, compte, programme, nominal,
activation, lifecycle, objectif, limites, Best Day, positions, résultat de
finalisation et les conditions `satisfied/pending/failed`, uniquement à partir
des projections autoritatives.

La file est volontairement en lecture seule. `ONE-025` doit arbitrer la
contradiction entre finalisation automatique livrée et workflow humain de la
Constitution candidate. Aucun champ financier et aucun bouton de passage n'a
été inventé.

---

## 6. Identity Operations

**Avant :** un booléen sandbox pouvait être changé depuis la file Payout, sans
dossier d'identité, ownership, motif métier ni historique dédié.

**Après :** un trader financièrement éligible mais bloqué uniquement par KYC
peut ouvrir un dossier idempotent. Compliance voit le motif, le compte, le gate
payout, l'affectation, la dernière activité et l'historique. Un résultat positif
requiert un motif humain, un message public et une référence opaque externe ;
les URL sont refusées. Le résultat positif met à jour le booléen existant dans
la même transaction et audite l'avant/après.

Le trader conserve le vrai KYC state `Vérification requise` tant que le résultat
n'est pas positif ; l'avancement du **dossier opérateur** apparaît séparément.
Il n'existe toujours ni provider, ni upload, ni document stocké.

---

## 7. Support

**Avant :** file, thread, reply/request-information/resolve et assignation
partielle existaient.

**Après :** assignee + date + version autoritatives, recherche WRB/compte,
filtres état et assigned/unassigned/mine, dernière activité, pagination,
chronologie, ownership et refus stale. Les replies restent publiques et
append-only ; aucune note interne n'a été glissée dans la conversation trader.

---

## 8. Contestations

**Avant :** preuve détaillée, `upheld` et `requires_escalation` existaient ;
l'opérateur de revue servait implicitement d'assignee.

**Après :** assignee séparé du décideur, filtres/search/pagination, historique
opérateur, motifs obligatoires, version stale et parité trader. Les métadonnées
techniques sont repliées sous « Détails techniques ».

`upheld` et `requires_escalation` restent les seules issues applicatives. Le
breach, les snapshots, transitions, fills et écritures ledger ne sont jamais
mutés. `UX-SUPPORT-004` est l'arbitrage encore requis pour une compensation.

---

## 9. Control UX

Routes ajoutées :

- `/control` — Overview : needs attention, assigned to me, aging et décisions ;
- `/control/pass-reviews` et `/control/pass-reviews/[accountPublicId]` ;
- `/control/identity` et `/control/identity/[publicId]`.

Support et Contestations conservent leurs routes, avec files et détails durcis.
Chaque surface traite loading, empty, error, lecture seule, pending, succès et
stale selon ce qu'elle peut réellement produire. L'âge est informatif : aucune
notion d'urgence ni SLA n'est déduite.

---

## 10. Trader UX effects

- Pass Review : les états Hub existants « Objectif atteint », « Vérification en
  cours » et « Évaluation réussie » restent issus du lifecycle canonique.
- Identité : demande reçue et état du dossier visibles séparément du résultat
  KYC binaire ; aucun enum brut.
- Support : distinction calme entre reçu, en cours, attente trader/opérateur et
  résolu.
- Contestation : prise en examen, information requise, décision maintenue ou
  escalade, sans exposer correlation/version/evidence IDs.
- Correctif responsive Hub : les actions rapides ne créent plus de débordement
  horizontal à 320 px.

Aucune application WariX n'a été modifiée.

---

## 11. Security

- session staff autoritative ; aucun operator ID fourni par le client ;
- capacités granulaires et contrôles backend ;
- cross-role refusé ;
- cross-trader Support/Contestations/Identité refusé ;
- table identité sans grant navigateur ;
- valeurs externes validées, référence preuve sans URL ;
- aucun secret/PII documentaire dans logs, captures ou table ;
- événement Risk original inaccessible aux commandes de contestation.

---

## 12. Concurrency

Chaque action reçoit la version ouverte par l'opérateur. La transaction verrouille
la ligne, compare `expectedVersion`, vérifie l'état et l'owner, écrit la mutation
et l'audit, puis incrémente. Si B a agi après l'ouverture de A, A reçoit
« Ce dossier a changé » et aucun write n'a lieu. L'E2E reproduit le scénario
avec deux sessions navigateur distinctes.

---

## 13. Evidence

Répertoire :
`docs/04-ux/evidence/wariba-phase-3-3-operator-closure/`.

Le README répond aux dix questions de revue humaine pour chaque capture. Le
manifest associe route, état, acteur, viewport et dimensions. Les fixtures sont
synthétiques uniquement dans le test et supprimées au teardown ; la production
rend des états vides réels.

---

## 14. Tests

Exécutions finales, sur Node `24.18.0` et la stack Supabase locale réinitialisée :

- ciblé RBAC/read models : 5 fichiers, 54/54 tests ;
- ciblé DB/RLS Support + Contestations : 2 fichiers, 25/25 tests ;
- ciblé Identité transactionnelle : 1 fichier, 2/2 tests ;
- preuve E2E `operator-closure.spec.ts` : 1/1 scénario, 25 captures, 4,0 min ;
- `pnpm run ci` : format PASS ; lint 16/16 tâches ; typecheck 16/16 ;
  boundaries PASS ; secrets PASS ; unit 1 552 réussis et 9 ignorés ; build 4/4
  tâches et 112/112 pages ; SQL 24/24 ; intégration 98/98 ; RLS 23/23 ;
  realtime E2E 10/10 ;
- le premier démarrage du smoke web a expiré avant les tests à 180 s ; classé
  `INFRASTRUCTURE_FAILURE`. Relance exacte `@wariba/web test:e2e:smoke` :
  10/10 réussis en 3,3 min.

La gate finale est donc verte par composition : chaque segment de `pnpm run
ci` a réussi, et l'unique segment expiré avant exécution a réussi à la relance
exacte. La certification complète n'a pas été lancée : aucun calcul Risk, état
de lifecycle financier ou package partagé transverse n'a été modifié ; les
tests DB/RLS, intégration et E2E ciblés couvrent la migration additive.

Commandes de reproduction :

```bash
pnpm db:reset
pnpm --filter=@wariba/database exec vitest run tests/support.integration.test.ts tests/support-rls.integration.test.ts --no-file-parallelism --testTimeout=30000
pnpm --filter=@wariba/application exec vitest run tests/operator-identity.integration.test.ts --no-file-parallelism --testTimeout=30000
pnpm --filter=@wariba/web exec playwright test tests/e2e/operator-closure.spec.ts --project=desktop --workers=1
pnpm run ci
pnpm --filter=@wariba/web test:e2e:smoke
```

---

## 15. Pre-existing failures

- Premier `pnpm db:reset` : téléchargement d'image Supabase interrompu ; classé
  `INFRASTRUCTURE_FAILURE`, reprise debug réussie sans changement produit.
- Premier smoke web de la gate : timeout du serveur Playwright à froid avant
  tout test ; même groupe 10/10 vert à la relance exacte.
- Next signale les avertissements non bloquants préexistants `no-img-element`
  dans `HubUserMenu.tsx` et `next start` avec la sortie standalone.
- Les défauts Help P0 déjà présents dans le worktree sont hors scope et ont été
  préservés.

---

## 16. Updated Product OS coverage

Poids : DONE 1 ; PARTIAL/BACKEND_ONLY 0,5 ; UI_ONLY 0,25 ; MISSING et
DOCUMENTATION_ONLY 0. Le dénominateur exclut deferred/obsolete/cannot-verify et
les quatre blockers externes, comme les rapports précédents.

```text
PRODUCT_OS_REQUIREMENT_COVERAGE = 81.4%   (147.25 / 181)
CRITICAL_PRODUCT_COMPLETENESS   = 82.4%   (127.75 / 155)
P0_COMPLETENESS                 = 90.2%   ( 46.00 /  51)
```

Mouvements : `POS-37.01 UI_ONLY→PARTIAL`, `POS-66.01
BACKEND_ONLY→PARTIAL`, `POS-75.01 MISSING→PARTIAL`, `POS-76.01 MISSING→DONE`.

---

## 17. Remaining beta blockers

### CLOSED BY 3.3

- Control Overview ;
- file Identité manuelle ;
- ownership/audit/concurrency Support, Contestations et Identité ;
- visibilité Pass Review autoritative sans calcul dupliqué ;
- filtres/recherche/pagination et états opérationnels ;
- parité trader des dossiers affectés.

### STILL IN 3.3

- `ONE-025` : autorité et transitions d'une éventuelle décision humaine Pass
  Review ;
- `UX-SUPPORT-004` : remédiation compensatoire d'un breach erroné.

### STILL IN 3.4

- lifecycle et routes produit : `/comptes/{id}`, `/profil`, paramètres,
  soft-lock/reset, WARIBA Review trader ;
- preuve publique : `/status`, `/regles`, `/confiance`, incidents trader,
  analytics/acquisition.

### STILL IN 3.5

- providers KYC, paiement, payout, e-mail et market data ;
- checks KYC externes, re-KYC, delivery provider et reprise associée.

### STILL IN 3.6

- audit sécurité formel, observabilité agrégée, rétention/privacy, restauration
  prouvée et persistance éditoriale de l'aide selon roadmap.

### STILL WARIX PROFESSIONALIZATION

- `view=` et vues Performance/Risk ;
- séparation Settings/Risk Center ;
- re-sync après reconnexion ;
- indicateurs au-delà d'EMA/SMA et préférences professionnelles restantes.

---

## 18. 35-role council

| # | Rôle | Verdict | Motif |
|--:|---|:--:|---|
| 1 | Founder / CEO | WARNING | OS opérateur réel ; bêta encore bloquée par décisions et environnement. |
| 2 | Head of Product | VETO | `ONE-025` et `UX-SUPPORT-004` non arbitrés. |
| 3 | Prop-firm Operations Director | VETO | aucune action humaine canonique pour passage/remédiation. |
| 4 | Professional Trader | PASS | preuves et statuts lisibles, aucun calcul Control. |
| 5 | Beginner Trader | PASS | français calme, prochaine action explicite. |
| 6 | Funded Trader | WARNING | provider/payout hors 3.3. |
| 7 | Risk Director | VETO | remédiation d'un breach erroné non définie. |
| 8 | Quant / Risk Engineer | PASS | Risk reste unique propriétaire des calculs. |
| 9 | Trading Operations Analyst | PASS | files, ownership, âge et search réels. |
| 10 | Compliance Officer | WARNING | shell manuel sûr ; provider absent. |
| 11 | KYC / Identity Operations Specialist | WARNING | aucun document stocké ; checks provider encore absents. |
| 12 | Fraud & Integrity Analyst | PASS | escalade conservée, aucune sanction inventée. |
| 13 | Dispute / Appeals Reviewer | VETO | pas de compensation après erreur reconnue. |
| 14 | Customer Support Lead | PASS | ownership, recherche, thread, stale et audit. |
| 15 | Customer Success Lead | PASS | états trader compréhensibles. |
| 16 | Finance Operations Lead | WARNING | rails/providers restent 3.5. |
| 17 | Payout Operations Specialist | WARNING | payout inchangé par scope. |
| 18 | Legal / Terms Reviewer | VETO | effets contractuels pass/remédiation à décider. |
| 19 | Privacy Engineer | PASS | aucun document/biométrie ; notes interne/public séparées. |
| 20 | Security Engineer | PASS | deny-by-default et mutations backend. |
| 21 | Backend Architect | PASS | commandes transactionnelles et read models. |
| 22 | PostgreSQL / Supabase Architect | PASS | migration additive, contraintes, RLS et index justifiés. |
| 23 | RBAC / Authorization Engineer | PASS | granularité et tests cross-role. |
| 24 | Frontend Architect | PASS | Server Components/read models, aucun write Supabase navigateur. |
| 25 | Design System Lead | PASS | Control dense et cohérent, tokens existants. |
| 26 | Senior Fintech Product Designer | PASS | identité/preuve/action hiérarchisées. |
| 27 | Mobile UX Specialist | PASS | trader 320/390 sans overflow ; Control ciblé desktop. |
| 28 | Accessibility Specialist | PASS | axe 0 critical/serious sur surfaces testées. |
| 29 | French UX Writer | PASS | enums et jargon retirés des surfaces trader. |
| 30 | SRE / Reliability Engineer | WARNING | déploiement/restauration hors 3.3 restent ouverts. |
| 31 | Observability Engineer | PASS | mutations structurées et corrélées, sans secrets. |
| 32 | QA Lead | PASS | scénarios négatifs et evidence gate ciblés. |
| 33 | Test Automation Engineer | PASS | fixtures réelles, stale multi-session, RLS. |
| 34 | Product Analytics Specialist | WARNING | aucun faux KPI ; analytics provider absent. |
| 35 | Independent Red-Team Product Auditor | VETO | Phase 3.3 ne peut être PASS tant que deux décisions bloquent l'acceptation. |

---

## 19. Final matrix

```text
PHASE_3_3_OPERATOR_CLOSURE_READY       = no
CONTROL_OVERVIEW_READY                 = yes

PASS_REVIEW_QUEUE_READY                = yes
PASS_REVIEW_DETAIL_READY               = yes
PASS_REVIEW_AUTHORIZED_ACTIONS_READY   = no
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

ACCESSIBILITY_CRITICAL                 = 0
ACCESSIBILITY_SERIOUS                  = 0
WARIX_APPLICATION_FILES_MODIFIED       = 0
```

---

## 20. Recommendation

```text
PHASE_3_3_BLOCKED
NEXT_RECOMMENDED_SLICE = 3.3 Product decision closure for ONE-025 and UX-SUPPORT-004
```

Ne pas commencer 3.4. L'étape suivante est un arbitrage propriétaire court,
puis l'implémentation ciblée des seules transitions approuvées avec leurs tests
et preuves.

Proposition de PR après arbitrage et validation propriétaire :
`feat(control): close Phase 3.3 operator workflows`. Aucun commit, push, merge
ou déploiement n'a été effectué pendant cette tranche.
