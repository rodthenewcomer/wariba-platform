---
title: "WARIBA — Audit d'implémentation Prompts 05, 06, 07, 07B et Appendice 07-A"
date: "2026-08-05"
branch: "fix/prompts-05-07b-audit"
status: "PASS WITH ACTIONS"
---

# 1. Objectif et verdict

Auditer les exigences des Prompts 05, 06, 07, 07B et de l'Appendice 07-A contre
les sources de vérité et le code réellement exécutable, corriger les défauts
prouvés sans inventer de règle, puis remettre la CI en état de vérifier les
gates base de données, RLS, intégration et E2E au lieu de les ignorer.

Verdict : `PASS WITH ACTIONS`.

- Les parcours Prompt 05/06/07 existants restent fonctionnels et les gates
  statiques, unitaires et build passent.
- La comptabilité d'éligibilité Prompt 07B (net après frais, durée de position,
  projection programme, contrôles glissants 3/6) est désormais durable,
  policy-aware et exposée dans WariX.
- Le modèle financier v1.1 ne masque plus le Stress : la contribution Stress
  recalculée est négative et bloque correctement le lancement public.
- La partie production de Prompt 07B et l'Appendice 07-A ne peuvent pas être
  déclarés entièrement livrés sans clé FCS Business, deux nœuds réels, test de
  charge 500/150 et spécifications contractuelles SPX500/énergies. Ces limites
  sont des dépendances/decisions explicites, pas des succès simulés.

# 2. Sources inspectées

Lecture complète dans l'ordre imposé par `AGENTS.md` : Decision Log, Product
Master v1.1/v1.0, Rulebook v1.1/v1.0, rulesets machine v1.1/v1.0, Financial
Model v1.1/v1.0, Actuarial Risk Model, UX Architecture, Design System et tokens,
Engineering Constitution, System Architecture, Security/QA/Operations, Build
Plan et Prompt Pack. Les migrations, contrats, packages domain/policies/
database/application, realtime, worker, UI Web, tests et workflow GitHub ont
ensuite été inspectés.

Le classeur financier v1.1 a été inspecté cellule/formule, rendu sur ses treize
feuilles, puis vérifié visuellement et rescanné pour les erreurs de formule.

# 3. Scope, non-scope et rollback

## Scope implémenté

- policy immuable WARIBA ONE v1.1.1 pour les nouveaux comptes ; comptes
  existants maintenus sur leur policy épinglée ;
- résultat net par fermeture après commission de fermeture et allocation
  déterministe de la commission d'ouverture ;
- durée ouverture→fermeture fondée uniquement sur les timestamps serveur ;
- balance réelle et balance éligible programme séparées sans compteur mutable ;
- target, DLL, Maximum Loss, Best Day et EOD trailing fondés sur la projection
  programme lorsque la policy l'active ;
- warning à 3 fermetures courtes et verrou temporaire des nouvelles entrées à
  6 sur 24 h, sans empêcher les réductions/sorties ;
- historique WariX durable, état du risque et microcopy française ;
- tests E2E nettoyables/idempotents et gates CI non cachables ;
- modèle financier v1.1 raccordé aux cinq paliers, caps par cycle et splits
  85/15 puis 90/10.

## Non-scope imposé par les sources

- aucun capital, paiement, payout ou provider de trading réel ;
- aucun bot, EA, copier, API publique, futures, Redis, Kafka ou Kubernetes ;
- aucune activation live FCS prétendue ;
- aucune spécification SPX500/énergie improvisée ;
- aucune nouvelle règle d'inactivité/réactivation tant que la décision ouverte
  correspondante n'est pas tranchée.

## Rollback/compensation

Avant déploiement, la PR peut être revertée sans migration appliquée. Après
application, la migration ne doit jamais être modifiée : une correction publie
une nouvelle policy/migration, déprécie v1.1.1 si nécessaire et conserve les
comptes déjà épinglés. Les écritures financières restent corrigées par
reversal/adjustment audité, jamais par édition directe.

# 4. Matrice d'acceptation

| Zone | État prouvé | Corrections de cet audit | Action résiduelle |
|---|---|---|---|
| Prompt 05 — policy publiée/épinglée | PASS | v1.1.1, hashes humain/machine cohérents, compatibilité v1.1.0 | aucune pour le scope livré |
| Prompt 05 — risk engine | PASS WITH ACTIONS | projection programme câblée sur target/DLL/ML/Best Day/EOD | conserver la limite documentée : pas de prix historique exact à 00:00 UTC pour les positions overnight |
| Prompt 05 — inactivité 30 jours | BLOCKED BY DECISION | aucune règle inventée | trancher les actions candidat/réactivation avant implémentation |
| Prompt 06 — Trader Hub | PASS | contrats de risque enrichis sans rendre le client autoritaire | E2E authentifié final en CI |
| Prompt 07 — WariX manuel | PASS | header financier réel, historique des fills, avertissements et entry-lock explicites | E2E navigateur final en CI |
| Prompt 07B — provider abstraction | READY WITH CONFIGURATION | mock/replay/FCS et fail-fast conservés | valider le protocole réel avec `FCS_API_KEY` |
| Prompt 07B — profit ≥ 60 s | PASS | net après frais, pertes toujours comptées, partial/full close, preuves durables | observer les faux positifs en bêta |
| Prompt 07B — contrôles 3/6 | PASS WITH ACTIONS | signal idempotent, verrou des seules entrées, déverrouillage glissant | workflow/case management humain de revue risque à livrer et opérer |
| Prompt 07B — consommateurs Performance/payout | READY FOR PROMPT 08 | règles et projection programme versionnées sans réordonner la construction | câbler buffer, Performance Days, payout et Review dans le Prompt 08 |
| Prompt 07B — active/standby | BLOCKED BY INFRASTRUCTURE | aucune fausse haute disponibilité | bail leader, fencing, takeover et deux nœuds réels à livrer/tester |
| Prompt 07B — charge/chaos | BLOCKED BY INFRASTRUCTURE | CI rend les gates fonctionnels honnêtes | exécuter 500 comptes/150 concurrents et chaos/failover |
| Appendice 07-A — NAS100 | PASS | restriction obsolète annulée dans les sources existantes | validation live FCS toujours requise |
| Appendice 07-A — catalogue provider-driven | READY WITH CONFIGURATION | décisions MARKET-001/006 documentées | découverte réelle FCS, recherche et souscriptions agrégées |
| Appendice 07-A — SPX500/énergies | BLOCKED BY DECISION/CREDENTIAL | aucune spec/ticker inventé | migration `TradableSymbol`/specs/exposition/sessions après validation MARKET-004 et feed réel |
| Modèle financier | PASS WITH ACTIONS | 5 paliers, caps P1–P5, splits, leviers Performance, gate Stress FAIL, audit trail | prix/caps restent candidats ; résoudre Stress et financer la réserve avant public |
| CI | PASS WITH ACTIONS | jobs statique puis Supabase local/DB/RLS/intégration/E2E ; cache désactivé sur gates critiques | preuve finale du job distant sur la PR |

# 5. Revue des 35 rôles

| # | Rôle | Finding explicite |
|---:|---|---|
| 1 | CEO | Le lancement public reste interdit ; aucun succès live ou Stress n'est fabriqué. |
| 2 | COO | Le terminal est opérable en sandbox ; active/standby et runbook failover restent infrastructure-dépendants. |
| 3 | CFO | Le modèle central consomme les cinq paliers/caps/splits ; Stress négatif et réserve insuffisante restent visibles. |
| 4 | CPO | La séparation balance réelle/programme est compréhensible et non punitive. |
| 5 | Chief of Staff | Decision Log, Rulebook, ruleset, migration, tests et rapport sont réconciliés. |
| 6 | Market Strategist | Français et marché initial Afrique francophone conservés ; aucune promesse de marché réel. |
| 7 | Brand Strategist | WARIBA/WariX uniquement ; aucune référence active interdite ajoutée. |
| 8 | Art Director | Quiet Financial Authority, tokens et hiérarchie visuelle conservés. |
| 9 | Content Strategist | Les frais, durées, profits éligibles et verrous sont expliqués sans jargon trompeur. |
| 10 | Growth Lead | Les gates publics, Stress et fournisseurs restent bloquants avant acquisition à l'échelle. |
| 11 | Product Manager | Scope implémenté séparé des décisions et dépendances encore ouvertes. |
| 12 | UX Researcher | L'historique montre ouverture→fermeture, durée, net et statut ; validation terrain reste requise. |
| 13 | Information Architect | Hub, Trade, historique et risque consomment des contrats cohérents. |
| 14 | Product Designer | Alertes warning/entry-lock et métriques programme ajoutées sans faux dashboard. |
| 15 | Design System Lead | Aucun token/couleur ad hoc n'a été introduit dans l'UI. |
| 16 | CRO | Pertes toujours comptées, profit court seul exclu, 3/6 non-breach, closes toujours permises. |
| 17 | Market Specialist | NAS100 existant préservé ; SPX500/énergies non activés sans spec contractuelle. |
| 18 | Execution Specialist | IDs/timestamps serveur, allocations de frais et idempotence sont persistés par fill. |
| 19 | Quant Analyst | Limites 59,999/60,000 ms, signes de PnL et seuils 3/6 couverts par tests. |
| 20 | Market Data Engineer | Mock/replay déterministes ; FCS réel classé BLOCKED BY CREDENTIAL. |
| 21 | Software Architect | Monolithe modulaire et frontières conservés ; aucun service interdit ajouté. |
| 22 | Frontend Lead | Le navigateur affiche mais ne calcule ni n'autorise les données financières. |
| 23 | Backend Lead | Account lock, transaction unique et données policy-aware conservés. |
| 24 | Database Architect | Nouvelle migration append-only, numeric/timestamptz/FK/checks et projection depuis ledger/fills. |
| 25 | Realtime Engineer | Snapshot enrichi et resync existant conservé ; failover multi-nœud non prouvé. |
| 26 | Security Engineer | Aucun secret détecté ; service role absent du navigateur ; deny-by-default inchangé. |
| 27 | SRE | CI locale Supabase ajoutée ; load/chaos/deux nœuds restent bloqués par infrastructure. |
| 28 | QA Lead | Format, lint, typecheck, boundaries, secret scan, unités et build passent ; gates DB/E2E attendent la CI PR. |
| 29 | Payments Lead | Aucun rail réel ajouté ; workflow sandbox et idempotence existants non affaiblis. |
| 30 | Fraud Lead | Fermetures courtes génèrent signaux et revue humaine, jamais breach automatique. |
| 31 | Legal Counsel | Simulé et launch gates restent explicites ; aucun terme de trading réel ajouté. |
| 32 | Privacy Lead | Aucun PII/token ajouté aux logs, documents ou screenshots. |
| 33 | Customer Operations | Historique durable facilite support/dispute ; processus humain de revue 6/24 h reste à opérer. |
| 34 | AI Lead | Sources supérieures respectées ; aucune décision ouverte transformée en code. |
| 35 | Community/Affiliate Lead | Aucun chiffre, témoignage, client ou promesse de payout inventé. |

# 6. Fichiers et migration principaux

- `supabase/migrations/20260805060651_prompt_07b_program_eligibility.sql` ;
- `packages/domain/src/profit-eligibility.ts` ;
- `packages/policies/src/profit-eligibility-policy.ts` et risk engine ;
- `packages/database/src/program-eligibility.ts`, trading, risk et daily finalization ;
- contrats trading, snapshot realtime et mappers ;
- composants `/trade`, fixtures/setup/teardown E2E ;
- `.github/workflows/ci.yml`, `scripts/run-test-gate.mjs`, `turbo.json` ;
- Decision Log, Product Master, Rulebook, ruleset et Financial Model v1.1.

# 7. Tests et résultats

Résultats locaux au 2026-08-05 sous Node 24.18.0 :

- `pnpm format:check` — PASS ;
- `pnpm lint` — 16/16 tâches PASS ;
- `pnpm typecheck --force` — 16/16 tâches PASS ;
- `pnpm boundaries:check` — PASS, zéro violation ;
- `pnpm secrets:scan` — PASS, zéro correspondance ;
- `pnpm test:unit --force` — 16/16 tâches, 275 tests PASS ;
- `pnpm build --force` — 4/4 tâches PASS, Next.js 29/29 pages ;
- Financial Model — treize feuilles rendues, zéro erreur de formule détectée.

Les tests DB/RLS/intégration/E2E ne sont pas déclarés PASS localement : Docker
n'est pas disponible et la base Supabase hébergée n'a volontairement pas reçu
la migration non déployée. Le job GitHub `Database, RLS and E2E` démarre une
Supabase isolée, applique toutes les migrations puis exécute ces gates sans
cache. Son résultat doit être joint à la PR avant merge.

# 8. Risques et actions ouvertes

1. `DATA-011` — clé FCS Business absente : parsing/souscription live non prouvés.
2. active/standby, leader lease/fencing, takeover et load balancer non livrés.
3. charge 500/150, chaos et reconnexion pendant failover non exécutés.
4. MARKET-004 — SPX500/énergies exigent specs, schéma, sessions, exposition et
   feed réel ; aucune activation sûre n'est possible aujourd'hui.
5. EOD : faute de snapshot prix historique à 00:00 UTC, l'equity de frontière
   des positions overnight reste approximée par la balance, limite déjà
   documentée et à corriger avant staging réaliste.
6. Le modèle financier Stress est négatif ; prix/caps restent `CANDIDATE` et
   aucun lancement public n'est autorisé.
7. Le runtime Performance/payout n'est pas anticipé ici : l'ordre de
   construction impose Prompt 08. La projection et les règles v1.1.1 sont
   prêtes, mais le câblage buffer/Performance Days/payout/Review reste à faire.

# 9. Commandes de vérification

```bash
corepack pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm boundaries:check
pnpm secrets:scan
pnpm test:unit
pnpm build
supabase start
supabase db reset
pnpm db:test
pnpm test:integration
pnpm test:rls
pnpm test:e2e
```

Utiliser `pnpm run ci` et non `pnpm ci` pour le script agrégé.

# 10. Proposition de PR

Titre : `fix: complete Prompt 07B eligibility and restore full CI gates`

La PR doit rester non fusionnée par l'agent et requiert : CI distante verte,
revue risque/finance de la policy v1.1.1, revue de la migration, et acceptation
explicite des actions externes ci-dessus.
