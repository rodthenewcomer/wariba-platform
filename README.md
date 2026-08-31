# WARIBA

**Plateforme francophone d'évaluation, de trading simulé et de progression pour traders.**

[![CI](https://github.com/rodthenewcomer/wariba-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/rodthenewcomer/wariba-platform/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-24%20LTS-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)

Le terminal de trading s'appelle **WariX**. WARIBA fait passer des traders par un
programme d'évaluation simulé (WARIBA ONE) puis, en cas de réussite, un compte
WARIBA Performance avec partage de profit — sans jamais engager de fonds réels
des traders sur un marché live.

> **Statut** — WX1 est la baseline visuelle WariX acceptée et gelée. WX2 construit
> séparément le socle graphique et market data sans rouvrir ce design : famille
> professionnelle `1m / 3m / 5m / 15m / 30m / 1h / 4h / 1D / 1W / 1M`, cache
> historique PostgreSQL, identité/capacités de source, pagination et continuité
> après redémarrage. Les lacunes observées sont signalées et ne sont réparées
> que par une capacité d'historique vérifiée. Aucun historique, volume ou carnet d'ordres indisponible
> chez le provider n'est fabriqué. Aucune vente publique n'est autorisée avant
> les gates actuariels, juridiques, de réserve et de providers réels — voir
> `docs/00-decisions/DECISION_LOG.md`.

## Ce qui est construit

| Domaine                       | Fonctionnalités                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Site public**               | Homepage à 12 sections, Legal Center (11 pages + hub, `/legal`), footer avec divulgation réglementaire UEMOA/AMF-UMOA/BCEAO, `/contact`, `/afrique-francophone` |
| **Commerce & activation**     | Catalogue cinq tailles (5K–100K), checkout sandbox, consentement versionné, activation de compte idempotente                                                    |
| **Moteur de risque**          | DLL 3 % soft lock, Maximum Loss 10 % EOD trailing, Best Day Rule 50 %, éligibilité de profit sous 60 s, snapshots quotidiens                                    |
| **WariX — exécution**         | Market orders, Stop Loss / Take Profit, clôture partielle (25/50/75/personnalisée), Close All atomique, réduction en file pendant une donnée obsolète           |
| **WariX — ordres en attente** | Achat/Vente Limit/Stop server-authoritative (GTC), déclenchement sur tick réel, lignes glissables sur le graphique                                              |
| **WariX — alertes de prix**   | Franchissement de seuil (pas d'égalité), évaluation serveur, centre de notifications                                                                            |
| **WariX — graphique**         | Chandeliers `lightweight-charts`, intervalles professionnels `1m` à `1M`, historique durable paginé, raccord historique/temps réel sans doublon                 |
| **WariX — poste de travail**  | Baseline WX1 acceptée et gelée, rail utilitaire droit 48 px, graphique dimensionné par son conteneur, adaptation mobile et reduced motion                       |
| **Trader Hub**                | État de compte, mission, historique de journées, fil d'activité, multi-comptes                                                                                  |
| **Support & contestations**   | Demandes suivies sous référence, fil en ajout seul garanti par trigger, contestation liée à sa preuve, files opérateur dans Control                             |
| **Centre d'aide**             | 77 articles servis, recherche classée et insensible aux accents, valeurs de règle lues depuis la policy publiée, lien reason code → article                     |
| **Control**                   | Panneau staff RBAC (support/risk/finance/compliance/admin) — intégrité, utilisateurs, payouts, support, contestations                                           |
| **Fiabilité**                 | RLS Postgres sur chaque table sensible, idempotence sur chaque commande financière, resync WebSocket sur reconnexion                                            |

## Routes publiques

| Route                                            | Description                                                                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/programme`, `/warix`, `/offres`           | Site public — vitrine, programme, terminal démo, tarifs                                                                                                                      |
| `/challenges/{one,flex,instant}`                 | Pages parcours ONE / FLEX / INSTANT                                                                                                                                          |
| `/contact`, `/afrique-francophone`               | Contact, section régionale Afrique francophone                                                                                                                               |
| `/legal`, `/legal/*`                             | Legal Center — hub + 11 pages (mentions légales, CGU, trading simulé, risques, payouts, remboursements, confidentialité, cookies, LBC/KYC, disponibilité pays, réclamations) |
| `/aide`, `/aide/{catégorie}/{article}`           | Centre d'aide public                                                                                                                                                         |
| `/support`                                       | Explication publique, et système de support authentifié                                                                                                                      |
| `/inscription`, `/login`, `/mot-de-passe-oublie` | Authentification                                                                                                                                                             |
| `/catalog`, `/checkout`                          | Achat d'un compte WARIBA ONE                                                                                                                                                 |
| `/hub`, `/trade`, `/comptes`, `/payouts`         | Espace trader authentifié                                                                                                                                                    |
| `/control/*`                                     | Espace staff (RBAC support/finance/admin)                                                                                                                                    |

## Sources de vérité

Lire `AGENTS.md` avant toute tâche. Toute décision produit/technique engageante
est enregistrée dans `docs/00-decisions/DECISION_LOG.md` — une décision non
écrite est une hypothèse, jamais une règle. Les addenda v1.1 du Product Master
et du Program Rulebook, le ruleset v1.1, le modèle financier v1.1 et le modèle
actuariel complètent les baselines v1.0 dans `docs/`.

**Où en est le produit, et ce qu'il reste :** deux documents vivants, pour
deux questions différentes. `docs/08-delivery/WARIBA_FINAL_ROADMAP_2026-08-31.md`
verrouille la séquence de phases — site public → auth → **Trader Hub complet**
→ WariX → polish global → security hardening → certification → production →
bêta privée → lancement, avec le Trader Hub comme chantier complet au même
titre que le site public et WariX. `docs/08-delivery/WARIBA_ROAD_TO_BETA_2026-08-24.md`
reste la matrice granulaire : pourcentage de couverture et exigences P0/P1
encore ouvertes. Les audits datés de `docs/08-delivery/` décrivent le code à
leur date et ne sont pas mis à jour rétroactivement.

## Prérequis

- Node.js 24 LTS (voir `.nvmrc`)
- pnpm via Corepack (`corepack enable`)
- Docker (pour Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Démarrage

```bash
corepack enable
pnpm install
pnpm db:start     # Supabase local (nécessite Docker)
pnpm dev
```

## Commandes principales

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:rls
pnpm run ci        # tout ce qui tourne en CI, dans l'ordre (pnpm réserve "ci", "run" est obligatoire)
```

## Structure

```text
apps/web/           Next.js — Web/BFF (Public, Platform, Trade, Control via route groups)
services/realtime/   Fastify + WebSocket — moteur temps réel (exécution, ticks, ordres en attente, alertes)
services/worker/     Jobs asynchrones
packages/*           Packages partagés (voir AGENTS.md §6) :
                      adapters, application, config, contracts, database,
                      design-tokens, domain, observability, policies,
                      test-utils, ui, validation
supabase/            Config, migrations et tests Supabase locaux
docs/                Documents de référence WARIBA (source de vérité)
```

## Architecture

Voir `docs/06-engineering/WARIBA_System_Architecture_v1.0.md` et les ADR dans
`docs/00-decisions/architecture/`. Le contrat WX2 détaillé est dans
`docs/06-engineering/WARIX_WX2_CHART_MARKET_DATA_FOUNDATION.md` et le prompt
normalisé dans `docs/09-prompts/WARIX_WX2_IMPLEMENTATION_PROMPT.md`.
