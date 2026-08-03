# Audit d’implémentation — Prompts 01 à 04

Date : 2026-08-03  
Branche inspectée : `feat/prompts-01-04-offers-homepage`  
Verdict global : **PASS WITH ACTIONS**

## Méthode et sources

L’audit a relié chaque exigence du Prompt Pack aux fichiers actifs, migrations, contrats,
implémentations serveur, routes et tests réellement exécutés. Les Rules v1.1 et les décisions
OFFER-023 / AI-015 supersèdent les paramètres v1.0 sans réécrire l’historique.

## Matrice de couverture

| Prompt | Éléments vérifiés | Preuves principales | Verdict |
|---|---|---|---|
| 01 — Repository Foundation | Monorepo pnpm/Turbo, 3 processus, packages imposés, TS strict, lint/format, boundaries, secret scan, health, CI, Supabase, GitHub Actions | `package.json`, `turbo.json`, `.github/workflows/ci.yml`, `scripts/`, `apps/`, `services/`, `packages/` | PASS WITH ACTIONS |
| 02 — Design System & App Shell | Tokens générés, thèmes, composants UI, shells Public/Platform/Trade/Control, focus/reduced motion, catalogue | `docs/05-design/tokens.json`, `packages/design-tokens`, `packages/ui`, `apps/web/app/catalog`, `design-qa.md` | PASS WITH ACTIONS |
| 03 — Identity, Commerce & Activation | Auth Supabase, consentement versionné, prix serveur XOF, cinq offres actives sandbox, webhook signé/replay-safe, fulfillment et activation idempotents, RLS | migrations `00000` à `00005`, `packages/application`, `packages/database`, routes checkout/webhook | PASS WITH ACTIONS |
| 04 — Trading Core | Marché déterministe 5 instruments, WebSocket authentifié, séquences/snapshot/resync, ordres serveur, fills immuables, positions, partial/full/Close All, ledger, exposition agrégée v1.1 | migrations `00003`, `00006`, `00007`, `services/realtime`, `packages/database/src/trading.ts`, tests trading | PASS WITH ACTIONS |

## Résultats exécutés

- Format : Prettier vert.
- Lint : 16 tâches sur 16 vertes.
- Typecheck : 16 tâches sur 16 vertes.
- Import boundaries : aucune violation.
- Secret scan : aucune correspondance.
- Unitaires : 140 tests réussis.
- Intégration avec base liée : 38 tests réussis.
- RLS avec base liée : 15 tests réussis.
- E2E Realtime avec base liée : 7 tests réussis.
- Build : 4 tâches sur 4 vertes, 31 routes Next.js générées.
- Supabase Advisor : aucun finding sécurité.
- Supabase DB lint, schéma `app` : aucune erreur.
- Migration v1.1 distante : appliquée et relue par requête SQL.

## Points corrigés pendant l’audit

- AI-015 autorise désormais Claude, Codex ou tout agent IA explicitement mandaté à construire,
  modifier, tester, auditer et documenter le code ; AI-014 ne bloque plus un constructeur/auditeur unique.
- Le nom produit actif est WariX ; l’ancien libellé « WARIBA Trade » est supersédé.
- Prix contractuels et settlement en XOF, affichage primaire FCFA, USD informatif uniquement.
- 5K, 10K, 25K, 50K et 100K sont activés dans le sandbox, avec flags indépendants.
- Règles v1.1 versionnées : cible 10 %, DLL 3 %, maximum loss 10 % EOD trailing,
  Best Day 50 % non-breach, aucun minimum de jours en Evaluation.
- Exposition agrégée v1.1 ajoutée côté serveur pour Forex/XAUUSD/NAS100.
- Les dépendances pnpm ont une configuration d’overrides compatible avec le lockfile et Corepack.
- Le site public, le centre d’aide, le support et les brouillons légaux ont été reconstruits.

## Actions restantes par gate

1. Prompt 01 : confirmer la CI GitHub après ouverture de PR ; Docker local indisponible pendant
   l’audit, donc `supabase start/reset` local n’a pas été rejoué (base liée et migrations distantes validées).
2. Prompt 02 : rejouer `pnpm test:visual` dans un environnement où l’usage direct de Playwright
   est autorisé afin de produire les cinq breakpoints automatiques et Axe.
3. Prompt 03 : ajouter un vrai parcours navigateur signup → checkout sandbox → Hub ; les
   invariants application/base/RLS sont verts, mais cette trajectoire UI complète n’est pas automatisée.
4. Prompt 04 : ajouter un E2E navigateur desktop/mobile de WariX et un test de deux ordres
   concurrents avec clés distinctes ; les scénarios d’idempotence, reconnexion et isolation sont verts.

## Hors périmètre confirmé

- Le moteur Policy/Risk complet reste Prompt 05 : la policy v1.1 est publiée et épinglable, mais le
  calcul runtime complet du drawdown EOD, de la marge maximale et du passage Evaluation n’est pas
  déclaré terminé ici.
- PSP réel, payout réel, capital réel et vente publique restent interdits.
- Validation juridique locale et validation actuarielle finale des prix restent des gates de lancement.

## Verdict

Les Prompts 01 à 04 sont construits et leurs invariants critiques sont prouvés. Les actions restantes
concernent principalement les gates de CI distante et d’E2E navigateur multi-viewport ; elles ne
justifient pas un faux `PASS` absolu.

Statut : **PASS WITH ACTIONS**
