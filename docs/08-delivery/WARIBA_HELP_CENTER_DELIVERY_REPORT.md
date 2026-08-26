# WARIBA Help Center — delivery report

```text
SPECIFICATION = WARIBA_HELP_CENTER_CONTENT_MASTER_2026-08-23.md
BRANCH        = feat/wariba-phase-3-private-beta-completion
DATE          = 2026-08-24
SATISFIES     = Constitution §44 (Support) · §146 (Help) · POS-06.07 · POS-44.01
```

`/aide` was a client component holding twenty FAQ entries and a substring
filter. It is now a Help Center: 87 written articles, 77 of them served, a
typed and validated registry, ranked search shared with the Trader Hub, and
every live rule value read from the policy the risk engine actually enforces.

---

## 1. Completion matrix

```text
HELP_ARTICLES_PUBLISHED       = 77    (66 PUBLISH + 11 DYNAMIC)
HELP_ARTICLES_DRAFT_POLICY    = 7
HELP_ARTICLES_DRAFT_PROVIDER  = 3
HELP_SEARCH_READY             = yes
REASON_CODE_HELP_LINKS_READY  = yes   (20 codes, incl. all 8 risk rule codes)
MOBILE_320_READY              = yes   (5 routes, 0 horizontal overflow)
POLICY_DUPLICATION_FOUND      = 0
STALE_RULE_COPY_FOUND         = 0
COMPETITOR_COPY_FOUND         = 0
```

Every count is read from the registry by a test, not typed by hand
(`helpRegistryCounts()`).

### The catalogue, complete

All 87 article IDs the content master's §7 lists exist. None was skipped and
none was invented.

| Catégorie | Articles | Servis | Retenus |
|---|--:|--:|--:|
| Commencer | 7 | 7 | 0 |
| WARIBA ONE | 14 | 13 | 1 |
| Risque & règles | 11 | 10 | 1 |
| Trading & WariX | 9 | 9 | 0 |
| WARIBA Performance | 7 | 7 | 0 |
| Payouts | 7 | 5 | 2 |
| Paiements & facturation | 7 | 5 | 2 |
| Identité & KYC | 6 | 5 | 1 |
| Compte & sécurité | 6 | 3 | 3 |
| Technique & incidents | 5 | 5 | 0 |
| Support & contestations | 8 | 8 | 0 |
| **Total** | **87** | **77** | **10** |

---

## 2. The three claims worth checking

### `POLICY_DUPLICATION_FOUND = 0`

§11.3 names the failure: `3 %` typed into an article, a second article, a React
component and a FAQ entry is four places to update and four chances to
disagree. So no published article states a live rule value in prose. They
interpolate `{{fact:dailyLossRate}}`, or they carry a `ruleTable` block — both
resolve through `buildHelpPolicyFacts`, which reads
`app.policy_versions.parameters_json` for the version in force.

Enforced, not intended:

```ts
// tests/help-registry.test.ts
for (const block of article.body) {
  if (block.kind === 'example' || block.kind === 'ruleTable') continue;
  expect(text).not.toMatch(/\d+([.,]\d+)?\s*%/);
}
```

A worked example may carry numbers — it is the one exemption, and the renderer
prints « Chiffres illustratifs. Les valeurs de votre compte sont celles
affichées dans le Hub » under every single one, not once at the top of a page.

A parameter the published policy does not carry renders **« non publié »**
rather than a plausible figure. The E2E asserts that too: every `[data-fact]`
cell is either a real value or exactly that phrase.

### `STALE_RULE_COPY_FOUND = 0`

Checked as a property over the whole published corpus rather than by reading:
the superseded 8/4/8/40 shape appears nowhere, the Best Day Rule is classified
`pass_condition` and states « ne termine jamais le compte », the daily loss is
`soft_lock` and the maximum loss is `hard_breach`.

Three reconciliations were made **against the code**, not against the master:

| Master said | Repository says | What was published |
|---|---|---|
| HLP-017: « inactivité de 30 jours calendaires » | No inactivity parameter exists in any published policy. The only 30-day mention is a French string in `account-lifecycle.ts`. | No day count. The article says the account can become inactive, that this is not a breach, and that the Hub's status is authoritative. |
| HLP-055: seven indicators | `CHART_INDICATOR_TYPES = ['ema', 'sma']` | EMA and SMA, and « un indicateur listé dans le menu est un indicateur qui calcule ». |
| HLP-110/111: « Consultez /status » | `/status` does not exist (`OPS-010` `LOCKED`, unsatisfied) | The article says no public status page is published yet and does not link to a 404. |

Publishing any of the three as written would have been the exact failure the
content master's own §16 exists to prevent.

### `COMPETITOR_COPY_FOUND = 0`

The master benchmarked four competitors. Not one of their names, product names
or rules appears in WARIBA's help — asserted against the published corpus for
`ftmo`, `lucid`, `tradeify`, `for traders`, `fortraders`, `tradovate`.

---

## 3. Withheld, and why

`DRAFT_POLICY` and `DRAFT_PROVIDER` articles are **written, kept in the
registry, and never served**. That is deliberately stronger than omitting them:
an article nobody wrote is an absence no test can see, while one written and
withheld is a decision anyone can audit. Each names the decision that unblocks
it, and the schema refuses a draft without one.

| Article | État | Bloqué par |
|---|---|---|
| Reset / recommencer une évaluation | `draft_policy` | Politique reset/repurchase — OPEN |
| Pratiques autorisées et interdites | `draft_policy` | Définitions d'intégrité non publiées |
| Trader pendant un payout | `draft_policy` | `PAYOUT_TRADING_FREEZE_POLICY` OPEN |
| Remboursements | `draft_policy` | Politique de remboursement OPEN |
| Plusieurs comptes | `draft_policy` | Maximum d'évaluations actives OPEN |
| Voyage, appareil, VPN/VPS | `draft_policy` | Politique d'intégrité géo non publiée |
| Fermer un compte utilisateur | `draft_policy` | Rétention/suppression — Privacy & Legal |
| Taux de change et frais | `draft_provider` | `OPEN-PAYOUT-001` |
| Moyens de paiement | `draft_provider` | `OPEN-PAYMENT-001` |
| Documents KYC acceptés | `draft_provider` | `KYC_PROVIDER_INTEGRATED = false` |

The E2E requests all five of the most tempting URLs and asserts a **404** on
each. There is no « bientôt disponible » anywhere in the navigation (§9).

---

## 4. Architecture

```text
apps/web/content/help/
  types.ts          block + article schemas (Zod), categories, severities
  index.ts          registry · validation · search · counts
  commencer.ts  wariba-one.ts  risque-regles.ts  warix.ts  performance.ts
  payouts.ts    paiements.ts   identite.ts  compte-securite.ts
  technique.ts  support.ts

packages/application/src/help-policy-facts.ts   published policy → named facts
apps/web/lib/help-links.ts                      reason code → article
apps/web/components/help/                       blocks · chrome · search
apps/web/app/(public)/aide/                     home · [category] · [slug]
```

### Why structured blocks rather than markdown

Three block kinds cannot survive a markdown round trip, and each earns its
place. A `ruleTable` reads the policy at render time. An `example` is visibly
framed as an illustration. And a `table` becomes a stack of key/value cards
below `sm`, because a five-column comparison scrolling sideways at 320px is a
table nobody reads. A renderer can only do that if it knows a table is a table.

The second reason is verification: with blocks, a test can walk the tree and
assert « no published article states a policy percentage in prose ». Against a
markdown blob it would be grepping.

### Search

Build-time index, client-side match, no external service and no query leaves
the browser — which is also why no search string is logged (§14). Ranked rather
than merely filtered: title > exact alias > partial alias > summary > body.
Accent-insensitive in both directions, so « éligible » and « eligible » return
the same articles in the same order.

One index, two surfaces. `/aide` and the Trader Hub's Support home call the
same `searchHelpArticles`, so an answer found in one is found in the other at
the same rank.

### Reason codes

All 8 `RiskViolationRuleCode` values plus 12 operational codes resolve to the
article that owns the subject. A code mapped to a withheld article resolves to
`null` rather than to a 404 — asserted. The link now appears in the Hub's risk
detail panel and on a trader's own contestation page, beside the evidence.

---

## 5. Tests

```text
tests/help-registry.test.ts   25 tests — schema, uniqueness, dead links,
                              drafts withheld, no competitor, no stale rule,
                              no policy value in prose, search ranking
tests/help-links.test.ts       5 tests — every reason code resolves
tests/e2e/help.spec.ts         6 tests — search → article, rule table reads
                              the policy, category, both CTAs, 404 on drafts,
                              390 + 320 with no overflow
```

The E2E asserts the policy binding end to end: `[data-fact="dailyLossRate"]`
reads `3 %` from the seeded policy, and the rendered article contains no
unresolved `{{fact:` token.

### Two stale assertions found and fixed

Neither was caused by this work; both were red before it and were repaired
rather than left for someone else to trip over.

| Test | Ce qu'il affirmait | Réalité |
|---|---|---|
| `hub.spec.ts:21` | « Perte quotidienne restante » sur `/hub` | Cette chaîne n'existe que dans `comptes/AccountCard.tsx`, rendue sur `/comptes`. Le Hub écrit « Risque jour restant » et « Perte quotidienne ». Corrigé pour suivre les deux libellés réels, plus un `.first()` sur « Positions ouvertes », qui apparaît légitimement deux fois. |
| `wariba-product-os-phase2.spec.ts:348` | `hub-empty-state` sur le Hub d'un trader sans compte | Phase 2.5 a remplacé cette carte par le Launchpad et l'assertion n'a jamais suivi. Corrigé pour vérifier ce que le test cherche réellement : une porte d'entrée réelle lisant le catalogue publié, avec un chemin vers l'achat. |

Les deux ont été prouvées antérieures en remisant les modifications de cette
tranche et en relançant : échec identique.

---

## 6. Coverage after the Help Center

```text
PRODUCT_OS_REQUIREMENT_COVERAGE = 80.4%   (145.50 / 181)   was 79.6%
CRITICAL_PRODUCT_COMPLETENESS   = 81.3%   (126.00 / 155)   was 80.3%
P0_ONLY                         = 87.7%   ( 44.75 /  51)   unchanged
```

Three rows moved, all P1:

| ID | Avant | Après | Pourquoi |
|---|:--:|:--:|---|
| `POS-06.07` Route `/aide` | UI_ONLY | **DONE** | Un vrai centre d'aide derrière la route : registre typé, recherche, catégories, articles, valeurs liées à la policy. |
| `POS-44.01` Recherche + Help Center | PARTIAL | **DONE** | La recherche est réelle, classée et partagée avec le Support authentifié. |
| `POS-146.01` Surfaces d'aide / éducation | UI_ONLY | **PARTIAL** | 77 articles publiés et liés aux reason codes, mais **aucune persistance ni versionnage d'article**. |

`POS-146.01` stays PARTIAL deliberately. `HELP_ARTICLE_DATABASE = deferred`:
there is no `help_articles` table, so changing a sentence still requires a
deploy. That is an acceptable beta posture and an unacceptable thing to score
as complete.

---

## 7. Duplication found outside the Help Center, and what was done

Writing a canonical source for the rules exposed the copies. `/programme`
carried the same four rule values as literal strings in a React array, plus one
claim — « inactivité après 30 jours » — that no published policy carries at all.
The footer and four Hub actions labelled « Règles essentielles » or « Voir les
règles » pointed at that marketing table rather than at the article that now
owns the subject.

**Closed in this slice:**

| Surface | Avant | Après |
|---|---|---|
| `/programme#regles` | Tableau littéral : `10 %`, `3 %`, `10 %`, `50 %` | Lit `buildHelpPolicyFacts`, comme le Centre d'aide. Un `data-fact` par ligne. |
| `/programme#regles` | « Limite de temps · inactivité après 30 jours » | Ligne retirée. Aucune policy publiée ne porte ce paramètre. |
| Footer public « Règles essentielles » | `/programme#regles` | `/aide/wariba-one/regles-essentielles` |
| Hub — « Voir les règles » (×4) | `/programme#regles` | Idem. Un trader connecté n'est plus renvoyé vers une page marketing. |

**Encore ouvert, et enregistré plutôt que corrigé en douce :** `/programme`
contient toujours des valeurs de règle en dur ailleurs que dans ce tableau —
le titre « Maximum Loss 10 % EOD trailing », la formule en prose, et
`PERFORMANCE_THRESHOLDS` (buffer et seuil de Performance Day par taille).
Elles appartiennent à `POS-14.01` « Site public complet et véridique »
(`PARTIAL`, tranche 3.4) et sont notées dans `WARIBA_ROAD_TO_BETA_2026-08-24.md`.

Le compteur `POLICY_DUPLICATION_FOUND = 0` porte sur le Centre d'aide, qui est
le périmètre de cette tranche. Il ne prétend pas que le reste du site est déjà
lié à la policy.

---

## 8. What the Help Center still does not have

```text
HELP_ARTICLE_DATABASE   deferred   No table, no per-article versioning, no CMS.
                                   Editing requires a deploy.
HELP_ARTICLE_ANALYTICS  minimal    `help_article_viewed` and `help_support_cta`
                                   log to the structured sink. No funnel, and
                                   deliberately no raw search string (§14).
HELP_LOCALES            fr only    The registry carries no locale field yet;
                                   adding one is a schema change, not a rewrite.
HELP_SEO                partial    Titles and descriptions are set per article.
                                   No sitemap and no structured data.
```
