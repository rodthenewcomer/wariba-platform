---
title: "WARIBA Legal Center — UEMOA Compliance Memo"
version: "1.0"
document_id: "WARIBA-UEMOA-LEGAL-CENTER"
status: "IMPLEMENTATION MEMO — NOT A FORMAL LEGAL OPINION"
language: "fr-FR / en-US mixed"
brand: "WARIBA"
domain: "wariba.app"
market: "Côte d’Ivoire · Sénégal · Bénin · Togo · Mali · Burkina Faso"
owner: "Engineering (implementation) — requires legal sign-off before commercial launch"
source_of_truth_priority: 8
depends_on:
  - "WARIBA UEMOA Public Footer — Regulatory Disclosure Compliance Memo v1.0"
next_documents:
  - "Formal UEMOA/fintech legal qualification memo (external counsel — not yet commissioned)"
---

# WARIBA Legal Center — UEMOA Compliance Memo v1.0

> **This document is not a formal legal opinion.** No agent — human or AI —
> can self-certify legal compliance. It records what the 11-page public
> Legal Center now says, the sources behind it, what remains unresolved, and
> the launch gates that stay open until a UEMOA/fintech lawyer signs off.
> It extends, rather than replaces,
> [`WARIBA_UEMOA_Public_Footer_Compliance_v1.0.md`](./WARIBA_UEMOA_Public_Footer_Compliance_v1.0.md).

## Document control

| Field | Value |
|---|---|
| Implemented by | Engineering, from research and drafting direction the owner supplied directly |
| Reviewed by legal counsel | **No — not yet commissioned** |
| Applies to | `apps/web/app/(public)/legal/**`, `apps/web/components/legal/**` |
| Depends on | Operator identity and disclosure copy in `packages/ui/src/layouts/legal-disclosure.ts` |

---

## 0. The locked product qualification

This is the central product truth every one of the 11 pages is built around,
and it is not a new position — it is the footer memo's boundary, made
explicit as its own clause:

> **WARIBA est un service numérique de simulation et d’évaluation de
> trading.** Les comptes, ordres, tailles nominales et résultats WARIBA sont
> simulés. WARIBA ne collecte pas l’argent des utilisateurs pour l’investir,
> ne fournit pas de compte de courtage réel, ne gère pas de portefeuille
> client et ne fournit pas de conseil en investissement.

WARIBA is **not** currently presented, anywhere in the Legal Center, as a
broker, a bank, a SGI, an investment adviser, a portfolio manager, an asset
manager, a customer-money investment service, an e-money issuer, a payment
institution, or a live proprietary-capital account provider. This
qualification is a product description, not a claimed regulatory exemption
— see §2.

## 1. Operator

Canonical operator: **Lagoon Technologies**, registered in Abidjan, Côte
d’Ivoire. Support: support@wariba.app. Source of truth:
`packages/ui/src/layouts/legal-disclosure.ts` → `LEGAL_OPERATOR`, read by
every Legal Center page through `LegalPageShell`.

## 2. Target markets

Côte d’Ivoire, Sénégal, Bénin, Togo, Mali, Burkina Faso — target/service
markets, never described as "countries where WARIBA is regulated" or
"countries where WARIBA has an office." Source of truth: `TARGET_MARKETS` in
the same file.

## 3. The 11 Legal Center pages

| # | Route | Title |
|---|---|---|
| 1 | `/legal/mentions-legales` | Mentions légales |
| 2 | `/legal/conditions-utilisation` | Conditions d’utilisation |
| 3 | `/legal/trading-simule` | Disclosure sur le trading simulé |
| 4 | `/legal/risques` | Risques et règles de trading |
| 5 | `/legal/payouts` | Politique de payouts |
| 6 | `/legal/remboursements` | Paiements, annulations et remboursements |
| 7 | `/legal/confidentialite` | Politique de confidentialité |
| 8 | `/legal/cookies` | Politique relative aux cookies |
| 9 | `/legal/lbc-kyc` | LBC / KYC |
| 10 | `/legal/disponibilite-pays` | Disponibilité des services par pays |
| 11 | `/legal/reclamations-litiges` | Réclamations et règlement des litiges |

`/legal` is a 12th page — a hub linking to all 11. Every page shares one
component, `LegalPageShell` (`apps/web/components/legal/LegalPageShell.tsx`):
hero with market-scope chips, an "En clair" plain-French summary, a sticky
table of contents, numbered sections, a collapsible legal-source panel, "À
lire aussi," a version history line, and a contact band — never a commercial
CTA.

**Route rename:** `/legal/conditions` (the old three-page draft's route) is
retired in favour of `/legal/conditions-utilisation`, matching this spec's
naming. The two other pre-existing draft pages, `/legal/risques` and
`/legal/confidentialite`, keep their routes and are rebuilt in place on the
new shell. All internal references were found and updated (`public-nav.ts`,
`PublicFooter.tsx`); no other file in the repository linked the old route.

**Why the footer doesn't list all 11 inline:** the "Cadre légal" footer
column holds five items — a link to the `/legal` hub plus the four pages a
first-time visitor is most likely to want (mentions légales, CGU,
confidentialité, risques) — rather than eleven links stacked in one column.
The hub page is the place all 11 are actually enumerated. This mirrors the
footer disclosure band's own restraint (§32 of the build spec: don't dump
40 sources inline).

## 4. Legal-source matrix

Every citation is the owner's own research, reproduced in
`apps/web/components/legal/legal-sources.ts`. Nothing below is this codebase
inventing a law.

**Regional:**

| Institution | Text | Date |
|---|---|---|
| AMF-UMOA | Règlement général — activités réservées aux intervenants agréés | en vigueur |
| BCEAO | Instruction n°001-01-2024 — services de paiement dans l’UMOA | 23 janvier 2024 |
| UEMOA | Règlement n°06/2024/CM/UEMOA — relations financières extérieures | 2024 |
| UEMOA | Directive n°01/2023/CM/UEMOA — protection du consommateur | 2023 |
| UMOA | Loi uniforme LBC/FT/FP | 31 mars 2023 |
| UMOA | Décision n°021/CM/UMOA — seuils de mise en œuvre LBC/FT/FP | 21 décembre 2023 |
| OHADA | Acte uniforme — droit des sociétés commerciales | en vigueur |

**National — privacy authority and AML/CFT law:**

| Market | Privacy authority | AML/CFT/CPF law |
|---|---|---|
| Côte d’Ivoire | ARTCI | Ordonnance n°2023-875 (23 nov. 2023) |
| Bénin | APDP | Loi n°2024-01 (20 fév. 2024) |
| Togo | IPDCP | **Adoptée fév. 2026 — référence de promulgation à confirmer au Journal officiel avant tout affichage définitif** |
| Mali | APDP Mali | Ordonnance n°2024-011/PT-RM (30 août 2024) |
| Burkina Faso | CIL | Loi n°046-2024/ALT (30 déc. 2024) |
| Sénégal | CDP | Loi n°2024-08 (14 fév. 2024) |

The full digital-transactions / privacy / consumer / AML matrix (six rows ×
four columns) is public on `/legal/disponibilite-pays`, rendered by
`LegalCountryMatrix.tsx` from the same `legal-sources.ts` data — one source
of truth, not a second list drifting out of sync.

**Togo's two unconfirmed citations** — the AML/CFT/CPF law adopted February
2026 and the consumer-protection framework update — are flagged
`unconfirmed: true` in the data and rendered with a visible "à confirmer"
caveat everywhere they appear. Neither is presented as settled.

## 5. Payment framework

WARIBA does not present itself as a payment institution anywhere in the
Legal Center. `/legal/payouts` and `/legal/remboursements` both use the
owner's own framing: *"Les paiements peuvent être traités par des
prestataires tiers autorisés, selon leur disponibilité et les règles
applicables."* "Autorisé" is written only in this generic sense — no
specific provider is named as verified-authorised, because none has been
confirmed. Cross-border flows are referenced to Règlement n°06/2024/CM/UEMOA
rather than asserted compliant.

## 6. Consumer-protection framework

`/legal/remboursements` reproduces the existing, already-honest product
truth from `apps/web/content/help/paiements.ts` (`status: 'draft_policy'`,
*"La politique définitive de remboursement n’est pas verrouillée"*) rather
than inventing a refund window. `/legal/conditions-utilisation` and
`/legal/reclamations-litiges` both carry the owner's exact governing-law
sentence preserving mandatory consumer protections, and no complaint-SLA
number (24h/48h/7-day/30-day) is published anywhere.

## 7. Unresolved corporate identifiers

Confirmed absent from this repository by search, not guessed at, and not
displayed anywhere on the public site — unchanged from the footer memo's own
finding:

- `LEGAL_FORM` — exact legal form (SARL, SA, or OHADA equivalent)
- `REGISTERED_OFFICE_FULL` — street-level address
- `RCCM` — Registre du Commerce et du Crédit Mobilier number
- `NCC` / tax identifier
- `REGISTERED_CAPITAL`, if legally required
- Hosting provider name/address (`/legal/mentions-legales` §6 flags this
  explicitly rather than guessing "Vercel" or any other host)

**LEGAL_IDENTITY_COMPLETE = no.** When available, add them to
`LEGAL_OPERATOR` in `legal-disclosure.ts` — every page reads from that one
place.

## 8. Unresolved business-policy decisions

- **Age policy** — `/legal/conditions-utilisation` §4 publishes 18+ as a
  deliberately conservative default (this is a business policy WARIBA can
  set unilaterally, unlike a fabricated registration number), explicitly
  flagged as pending per-country legal confirmation rather than presented as
  final.
- **Refund policy** — genuinely undecided; `/legal/remboursements` says so
  rather than inventing a window.
- **Complaint SLA** — no numeric commitment published; "délai raisonnable"
  language only, per the owner's own instruction.
- **KYC provider** — none integrated yet (`content/help/identite.ts`:
  `KYC_PROVIDER_INTEGRATED = false`); `/legal/lbc-kyc` describes the controls
  WARIBA applies without naming a vendor.

## 9. The three things the owner asked not to get wrong

**AML page does not overclaim.** `/legal/lbc-kyc` never states Lagoon
Technologies is a financial institution subject to CENTIF reporting
obligations. It uses the owner's own sentence: *"Lorsque la loi impose une
déclaration, une conservation, une coopération ou une mesure de gel, WARIBA
agit conformément aux exigences applicables et coopère avec les autorités
compétentes."* A dedicated amber rail card on that page states the
classification question is still open.

**Privacy is treated as a real launch gate, not a finished policy.**
`/legal/confidentialite` §9 lists all six national data-protection
authorities and includes an explicit caution callout: formalities
(registration/declaration/authorisation) are not confirmed complete for any
of the six markets. See launch gate `PRIVACY_FORMALITIES_COMPLETE` below.

**Payments stay with authorised third-party PSPs.** No page describes
WARIBA itself as executing payment transfers; every payment-adjacent page
uses "prestataires tiers" language and cites BCEAO Instruction
n°001-01-2024 as the applicable framework, not as a framework WARIBA is
shown to already satisfy.

## 10. Consistency check across the public app (§39 of the build spec)

Searched `app/(public)`, `components/marketing`, and `content/help` for:
`funded`, `capital réel`, `compte financé`, `argent réel`, `investment`,
`ROI`, `garanti(e)`, `guaranteed`, `broker`, `courtage`.

**Result: every match found uses these terms to deny the claim, never to
assert it** — e.g. *"aucun capital réel confié,"* *"n’entraîne pas
automatiquement un capital réel,"* *"aucune allocation n’est garantie."* No
marketing copy needed rewriting. The two literal source-code matches
(`PerformanceShowcase.tsx`'s own comment about "the claim a funded-trading
homepage actually needs" and `wariba-path-geometry.ts`'s unrelated use of
"guaranteed" in a geometry comment) are code comments, not user-facing
copy, and were left untouched.

## 11. Launch gates

Unresolved by this Legal Center build — carried forward from the footer
memo, with two split more precisely now that per-page content exists:

- [ ] **REGULATORY_CLASSIFICATION_COUNSEL_SIGNOFF** — UEMOA/fintech lawyer
      confirms the "simulated evaluation + contractual payout" model's
      classification under AMF-UMOA
- [ ] **PAYMENT_PROVIDER_AUTHORIZATION_VERIFICATION** — confirm payment
      integrations run through properly authorised banks/PSPs per BCEAO
      Instruction n°001-01-2024
- [ ] **CROSS_BORDER_PAYMENT_REVIEW** — against Règlement n°06/2024
- [ ] **COUNTRY_CONSUMER_ECOMMERCE_REVIEW** — six national consumer laws
- [ ] **PRIVACY_FORMALITIES_COMPLETE** — ARTCI / APDP / IPDCP / APDP Mali /
      CIL / CDP registrations, declarations or authorisations, per market
- [ ] **AML_KYC_SANCTIONS_REVIEW** — including Lagoon Technologies' own
      classification under the UMOA uniform AML/CFT/CPF law
- [ ] **TOGO_AML_LAW_CITATION_CONFIRMED** — promulgation reference at the
      Journal officiel, before `unconfirmed: true` is removed from
      `legal-sources.ts`
- [ ] **AGE_POLICY_PER_COUNTRY_CONFIRMED** — 18+ default reviewed per market
- [ ] **REFUND_POLICY_LOCKED** — a real business decision, then reflected on
      `/legal/remboursements`
- [ ] **TAX_VAT_COUNTRY_REVIEW**
- [ ] **HOSTING_PROVIDER_DISCLOSED** — once confirmed internally
- [ ] **RCCM_NCC_LEGAL_FORM_VERIFIED**

None of these are resolved by this build. Its job was to make the
public-facing Legal Center accurate to WARIBA's real, current legal
position — not to close these gaps.
