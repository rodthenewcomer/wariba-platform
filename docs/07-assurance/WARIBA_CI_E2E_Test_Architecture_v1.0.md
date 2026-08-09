# WARIBA CI / E2E Test Architecture v1.0

## 1. Objectif

Cette norme sépare la boucle de développement rapide de la certification financière complète,
sans supprimer, ignorer ni affaiblir une assertion critique. Elle s'applique aux tests web,
realtime, database, RLS, recovery et load.

## 2. Baseline observée

Le run PR 17 `31197682426`, avant séparation, utilisait deux jobs largement séquentiels :

| Mesure | Durée observée |
|---|---:|
| Wall clock du workflow | 18 min 36 s |
| Static + unit + build | 3 min 27 s |
| Database + RLS + E2E | 14 min 53 s |
| Étape E2E seule | 9 min 43 s |
| Setup Supabase isolé | 3 min 04 s |

Le job long ne lançait pas la charge après l'échec E2E. Un échec navigateur tardif immobilisait
donc toute la chaîne DB/RLS/E2E et masquait la valeur de la parallélisation.

## 3. Cinq tiers

### Tier 1 — Fast local

Commande : `pnpm test:fast`.

Contenu : format, lint, typecheck, boundaries, secret scan et unit tests. Ce tier ne démarre ni
Supabase, ni Playwright, ni realtime/load. Budget : idéalement 5 minutes, maximum 10 minutes.

### Tier 2 — Feature validation

Exécuter le groupe le plus proche :

- domaine/policies : `pnpm test:unit:domain` ;
- web : `pnpm test:unit:web` ;
- trade : `pnpm test:e2e:trade` ;
- pending/realtime : `pnpm test:e2e:pending` ;
- payout : `pnpm test:e2e:payout` ;
- Control : `pnpm test:e2e:control` ;
- mobile : `pnpm test:e2e:mobile`.

Workflow obligatoire : reproduire le test exact, classifier, corriger la cause racine, rejouer le
test exact, rejouer son groupe, puis pousser. Le full E2E et la certification ne sont pas rejoués
après chaque assertion corrigée.

### Tier 3 — PR Fast Gate

`.github/workflows/ci.yml` lance en parallèle :

- `STATIC` : format, lint, typecheck, boundaries, secret scan ;
- `UNIT` : toutes les suites unitaires ;
- `BUILD` : builds du workspace ;
- `DB INTEGRATION` : migrations propres, assertions SQL, intégration smoke ;
- `RLS SMOKE` : frontières critiques trader/staff/finance ;
- `E2E SMOKE` : realtime critique et parcours Playwright `@smoke`.

Une nouvelle révision de la même PR annule le run obsolète. Chaque job publie son résultat et sa
durée ; la synthèse calcule le wall clock. Budget : idéalement 15 minutes, cible dure 20 minutes.

### Tier 4 — Full functional E2E

Le mode `full-functional` de `.github/workflows/certification.yml` exécute en parallèle les groupes
web `auth`, `trade`, `payout`, `control` et le realtime fonctionnel complet. Déclenchement manuel,
nightly, label de jalon ou release candidate. Budget : 30 à 45 minutes.

### Tier 5 — Certification

Le mode `certification` ajoute unit/build, assertions et intégration DB complètes, RLS complet,
restart/recovery et charge 150 connexions. Il est planifié nightly et disponible via
`workflow_dispatch`.

Le dépôt ne possède pas encore de leadership multi-node, fencing ou standby. Par conséquent,
aucun résultat failover/chaos n'est fabriqué : ces gates restent explicitement hors capacité et
la certification release complète ne peut pas être déclarée prête tant que l'architecture HA
n'est pas décidée et implémentée.

## 4. Smoke E2E

Le smoke PR couvre les chemins critiques suivants avec une vraie stack locale :

1. chargement authentifié Hub ;
2. market order, fill, close et historique ;
3. rejet risque expliqué ;
4. protection Stop Loss persistée ;
5. pending order avec SL/TP, trigger unique et reconnect ;
6. partial close ;
7. soft lock et isolation multi-compte ;
8. payout Performance éligible, cap 10K à 500 USD et interdiction d'auto-approbation ;
9. redirection trader hors Control ;
10. visibilité support sans actions finance.

Les tags Playwright actifs sont `@smoke`, `@critical`, `@auth`, `@trade`, `@risk`, `@payout`,
`@control`, `@mobile`, `@recovery` et `@accessibility`.

## 5. Synchronisation realtime

`services/realtime/tests/realtime-test-client.ts` centralise :

- connexion authentifiée ;
- subscription de channels ;
- attente enregistrée avant l'envoi ;
- commande et résultat autoritaire ;
- correlation IDs reçus ;
- diagnostic de timeout avec URL, état socket et événements récents ;
- reconnect et cleanup ;
- fenêtre d'observation explicite pour prouver l'absence de doublon.

`services/realtime/tests/realtime-test-process.ts` centralise le process réel, le health polling,
les logs bornés et l'arrêt. Les tests ne déclenchent jamais une commande avant d'avoir enregistré
l'attente correspondante. Les attentes statiques sont remplacées par visibilité UI, messages
autoritaires ou polling DB borné.

## 6. Données et Supabase

- chaque fixture utilise des users, comptes, ordres, positions, payouts, alerts et idempotency keys
  uniques ;
- les helpers Auth vérifient le statut des créations/suppressions Supabase ;
- les cleanups suppriment le graphe de données server-owned ;
- chaque job DB démarre sa propre stack Supabase Docker locale puis exécute `supabase db reset` ;
- l'état DB n'est jamais mis en cache ;
- aucune URL Supabase distante, staging ou production n'est utilisée par ces workflows.

## 7. Diagnostics et retry

Playwright conserve `trace: retain-on-failure`, `screenshot: only-on-failure` et le rapport HTML en
CI. Les artifacts ne sont uploadés qu'à l'échec. Les tests smoke PR ont zéro retry. Un full/nightly
peut avoir au maximum un retry, mais la première tentative échouée doit rester visible et être
classée `FLAKY_TEST_SUSPECTED`. Aucun retry ne certifie auth/RBAC, RLS, risk, payout, ledger ou
reconciliation.

Classification autorisée : `PRODUCT_BUG`, `TEST_BUG`, `TEST_INFRASTRUCTURE_FAILURE`,
`FLAKY_TEST`, `ENVIRONMENT_FAILURE`, `TIMEOUT_CONFIGURATION`, `DATA_ISOLATION_FAILURE` ou
`LEGITIMATE_REGRESSION`. Un flaky test est un bug ; aucun test critique n'est quarantiné.

## 8. Commandes quotidiennes

```bash
# Codage normal
pnpm test:fast

# Correction ciblée
pnpm test:e2e:trade    # ou payout/control/pending/mobile

# Gate locale équivalente PR (Supabase local requis)
pnpm run ci

# Prompt/jalon
pnpm test:e2e:full
pnpm test:certification

# Certification distante
gh workflow run certification.yml -f mode=certification
```

`pnpm run ci` est requis, car `pnpm ci` est une commande pnpm réservée. La certification ne vise
jamais la production ; le déploiement production reste manuel et séparé.
