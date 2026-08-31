---
title: "WARIBA UEMOA Public Footer — Regulatory Disclosure Compliance Memo"
version: "1.0"
document_id: "WARIBA-UEMOA-FOOTER-COMPLIANCE"
status: "IMPLEMENTATION MEMO — NOT A LEGAL OPINION"
language: "fr-FR / en-US mixed"
brand: "WARIBA"
domain: "wariba.app"
market: "Côte d’Ivoire · Sénégal · Bénin · Togo · Mali · Burkina Faso"
owner: "Engineering (implementation) — requires legal sign-off before commercial launch"
source_of_truth_priority: 8
depends_on:
  - "WARIBA Product Master Document v1.0"
  - "WARIBA Security, QA & Operations Standard v1.0"
next_documents:
  - "Formal UEMOA/fintech legal qualification memo (external counsel — not yet commissioned)"
---

# WARIBA UEMOA Public Footer — Regulatory Disclosure Compliance Memo v1.0

> **This document is not a legal opinion.** It records what the public footer
> now says, why it says it, what it deliberately does not say, and what
> remains open before WARIBA opens commercial payments across the six target
> markets. The owner's own research is clear that the absence of an
> AMF-UMOA "prop firm" category is not a legal exemption — it is a gap that
> a UEMOA/fintech lawyer needs to close before launch, not this memo.

## Document control

| Field | Value |
|---|---|
| Implemented by | Engineering, from copy the owner supplied directly |
| Reviewed by legal counsel | **No — not yet commissioned** |
| Applies to | `packages/ui/src/layouts/PublicFooter.tsx`, `public-nav.ts`, `legal-disclosure.ts` |
| Renders on | Every public route (shared shell, `PublicChrome.tsx`) |

---

## 1. What changed

The public footer's disclosure band went from one short paragraph to seven
titled blocks (`legal-disclosure.ts`), shown as an always-expanded
two-column grid on desktop and a native `<details>` accordion (no client JS)
on mobile, with the first block open by default. The navigation grid grew
from four columns to five — a `Société` column now exists, holding only two
real, already-built routes (`/afrique-francophone`, `/contact`) — and an
operator-identity block sits below the navigation grid.

None of this is new legal reasoning. It is the owner's own drafted copy,
reproduced verbatim in `legal-disclosure.ts`, chosen specifically to avoid
importing Topstep's US-specific CFTC/NFA/FDIC/SIPC references (legally
meaningless for a Côte d'Ivoire-registered operator) while keeping the
architecture that copy demonstrates works: clear operator identification,
explicit simulated-vs-real distinction, no investment-advice framing,
results/payout language that doesn't promise or arbitrarily withhold, and a
link out to the fuller disclosure pages.

## 2. The core legal boundary this footer draws

Per the owner's research: AMF-UMOA has no named category for "prop firm",
"trading challenge" or "simulated proprietary trading program". It does
reserve securities trading for third parties, order reception/transmission,
portfolio management under mandate, and investment advice to authorised
actors, and separately prohibits advertising implying an authorisation that
doesn't exist.

The footer's disclosure content is built around one boundary:

> **WARIBA sells a simulated trading programme.** It does not, in the
> current V1 model, accept funds to invest them, execute real orders for
> customers, manage a customer portfolio, advise on buying or selling
> securities, or present itself as an authorised broker, SGI, or investment
> adviser.

This is a **product description**, not a legal conclusion. The footer does
not say "WARIBA is unregulated" or "WARIBA does not need a licence" —
`legal-disclosure.ts`'s own header comment states this explicitly, and no
disclosure block asserts it. It also does not say "WARIBA is licensed in
Côte d'Ivoire, Sénégal..." — no such claim exists anywhere in the shell.

## 3. Verified operator facts vs. missing fields

`LEGAL_OPERATOR` in `legal-disclosure.ts` holds only what is verified
today:

| Field | Value | Source |
|---|---|---|
| Legal name | Lagoon Technologies | Supplied by owner, this conversation |
| Registered office | Abidjan, Côte d'Ivoire | Supplied by owner, this conversation |
| Support email | support@wariba.app | Already live elsewhere in the product (Section 10, `/contact`) |

**Missing — confirmed absent from this repository by search, not guessed
at, and not displayed anywhere on the public site:**

- `LEGAL_FORM` — exact legal form (SARL, SA, SAS-equivalent under OHADA, etc.)
- `REGISTERED_OFFICE_FULL` — street-level registered address, not just city/country
- `RCCM` — Registre du Commerce et du Crédit Mobilier number
- `TAX_ID` / `NCC` — tax identifier
- `REGISTERED_CAPITAL` — only if legally required to disclose

**LEGAL_IDENTITY_COMPLETE = no.**

When these are available, add them to `LEGAL_OPERATOR` in
`packages/ui/src/layouts/legal-disclosure.ts` — that is the single place
the footer, and nothing else, reads operator identity from.

## 4. Regulatory layers this implementation is consistent with (not certifying against)

Recorded here so the eventual legal review has a starting map, not as a
claim of compliance:

**Regional:**
- OHADA corporate-law framework (all six markets)
- AMF-UMOA rules on regulated financial-market activities
- BCEAO Instruction n°001-01-2024 (payment services in the UMOA) — relevant
  because WARIBA must route Wave/Orange Money/other flows through
  authorised banks/PSPs rather than becoming a de facto payment provider
- UEMOA Règlement n°06/2024 (external financial relations) — relevant if
  Lagoon Technologies receives fees or pays out from outside the UEMOA
- UEMOA consumer-protection directive (2023)

**National (digital transactions / consumer / privacy — per market):**

| Market | Digital transactions & consumer | Personal data |
|---|---|---|
| Côte d'Ivoire | Loi 2013-546 (transactions électroniques), Loi 2016-412 (consommation) | Loi 2013-450, ARTCI |
| Bénin | Code du numérique 2017-20 (amended by loi 2020-35), Loi 2007-21 | Code du numérique, APDP |
| Togo | Loi 2017-007 (transactions électroniques) | Loi 2019-014, IPDCP |
| Mali | Loi 2016-012 (transactions électroniques), Loi 2015-036 + décret 2016-0482 | Loi 2013-015 |
| Burkina Faso | Loi 045-2009/AN | Loi 001-2021/AN, CIL |
| Sénégal | Loi 2008-08 (transactions électroniques) | Loi 2008-12, CDP |

This table is **not exhaustive** — tax/VAT, gaming/promotions law, sanctions
screening, advertising rules, IP, permanent-establishment questions and
accounting obligations still need market-by-market validation against the
exact payment and operational flows WARIBA actually runs. The qualification
of the "evaluation fee + simulated trading + contractual payout" model as a
whole is the single highest-priority item — a formal legal memo before
go-live, not this document.

## 5. Payment-provider boundary

No payment-provider logos (Wave, Orange Money, banks, PSPs) were added to
the footer. `ProofRail` on the homepage already illustrates local payment
rails elsewhere on the page — that is a pre-existing decision, out of scope
for this change, and not duplicated here. The footer makes no claim that
WARIBA itself is an e-money issuer or payment institution.

## 6. Prohibited claims — enforced by what's absent, not by a runtime check

The footer contains none of the following, and none should be added
without a documented legal basis:

- AMF-UMOA / BCEAO / SGI / broker / investment-adviser / bank / payment-
  institution status claims
- Regulatory badges, logos, or authorization numbers
- "WARIBA is licensed in [market]" or "WARIBA is regulated by [authority]"
- "WARIBA is exempt from regulation" / "no licence required" (the inverse
  claim is just as unsupported as the positive one)
- Guaranteed payout / guaranteed return / "funded profit" language
- Fake social links, app-store badges, or a newsletter field (none of
  those have a real backend or verified account behind them)

## 7. Routes the footer links to (all verified 200 in this session)

`/offres`, `/challenges/one`, `/challenges/flex`, `/challenges/instant`,
`/programme`, `/aide/risque-regles`, `/aide/payouts`, `/warix`, `/aide`,
`/support`, `/afrique-francophone`, `/contact`, `/legal/conditions`,
`/legal/confidentialite`, `/legal/risques`, `mailto:support@wariba.app`.

`/legal/conditions` and `/legal/risques` already carry their own honest
"brouillon bêta / validation juridique locale requise" framing — the
footer's disclosure summary is consistent with, not a replacement for,
those pages.

## 8. Launch gates (not footer claims — these require action outside this codebase)

- [ ] **REGULATORY_CLASSIFICATION_COUNSEL_SIGNOFF** — UEMOA/fintech lawyer
      confirms the "simulated evaluation + contractual payout" model's
      classification; AMF-UMOA/BCEAO clarification if counsel recommends it
- [ ] **PAYMENT_PROVIDER_AUTHORIZATION_VERIFICATION** — confirm Wave/Orange
      Money/other integrations run through properly authorised
      banks/PSPs/établissements de paiement, per BCEAO Instruction
      n°001-01-2024
- [ ] **CROSS_BORDER_PAYMENT_REVIEW** — Lagoon Technologies' fee receipt and
      any payouts crossing UEMOA borders, against Règlement n°06/2024 and
      its 2025 implementation instructions
- [ ] **COUNTRY_CONSUMER_ECOMMERCE_REVIEW** — per-market e-commerce/
      consumer-protection compliance (contract disclosure, pricing,
      complaint handling) against each of the six national laws above
- [ ] **PRIVACY_REGISTRATION_AND_TRANSFER_REVIEW** — registration with
      ARTCI/APDP/IPDCP/CDP/CIL as applicable, and any cross-border data
      transfer basis
- [ ] **AML_KYC_SANCTIONS_REVIEW** — KYC timing, sanctions screening,
      record-keeping obligations
- [ ] **TAX_VAT_COUNTRY_REVIEW** — per-market tax/VAT treatment of the
      evaluation fee and payout model
- [ ] **MARKET_DATA_LICENSE_REVIEW** — any market-data licensing
      implications of the simulated pricing feed
- [ ] **AGE_AND_COUNTRY_RESTRICTION_REVIEW** — eligibility rules per market

None of these are resolved by this footer change. This memo's only job is
to make sure the public-facing copy doesn't contradict the product's real
legal position while those reviews are pending.
