---
title: "WARIBA Payment & Payout Architecture — Merchant / PSP Boundary"
version: "1.0"
document_id: "WARIBA-UEMOA-PAYMENT-PAYOUT-ARCHITECTURE"
status: "IMPLEMENTATION MEMO — NOT A FORMAL LEGAL OPINION"
language: "fr-FR / en-US mixed"
brand: "WARIBA"
domain: "wariba.app"
market: "Côte d’Ivoire · Sénégal · Bénin · Togo · Mali · Burkina Faso"
owner: "Engineering (implementation) — PSP contracts and treasury owned by the business"
source_of_truth_priority: 8
depends_on:
  - "WARIBA UEMOA Public Footer — Regulatory Disclosure Compliance Memo v1.0"
  - "WARIBA Legal Center — UEMOA Compliance Memo v1.0"
next_documents:
  - "Signed PSP contracts (PayDunya, CinetPay, Kkiapay or others) — not yet executed"
  - "Formal UEMOA/fintech legal qualification memo (external counsel — not yet commissioned)"
---

# WARIBA Payment & Payout Architecture — Merchant / PSP Boundary v1.0

> **This document is not a formal legal opinion.** It records the payment
> and payout architecture the owner has locked for WARIBA — Lagoon
> Technologies as merchant, third-party PSPs as the regulated payment-
> services layer — the PSP research behind it, and the Legal Center copy
> updated to reflect it precisely. A UEMOA/fintech lawyer still needs to
> confirm the final PSP contracts and real operational flows before this
> is treated as settled.

## Document control

| Field | Value |
|---|---|
| Implemented by | Engineering, from architecture direction and PSP research the owner supplied directly |
| Reviewed by legal counsel | **No — not yet commissioned** |
| Reviewed by PSPs in writing | **No — no PSP contract executed; see §9** |
| Applies to | Legal Center copy only (`apps/web/app/(public)/legal/**`) and this documentation |
| Backend changed | **No** — no trading, risk, payout, pricing, commerce-state, WariX, account-lifecycle, or payment-processing code was touched |

---

## 1. The core business truth

WARIBA is a digital trading simulation and evaluation service, operated by
Lagoon Technologies (Abidjan, Côte d’Ivoire). WARIBA is **not** designed to
operate as a payment institution, an e-money issuer, a customer wallet, a
remittance service, a peer-to-peer payment service, a bank, a broker, or a
customer-money investment service. WARIBA sells access to a digital
service; payment services stay with appropriately authorised PSPs.

## 2. Why the old shorthand was replaced

The footer and Legal Center memos previously described the payment flow as
`Utilisateur → PSP → Lagoon`. That shorthand is accurate but not precise
enough to show *why* WARIBA doesn't become a payment institution by
accident. This document replaces it everywhere with the model below.

## 3. Pay-in (encaissement) architecture

```
USER
  ↓
WARIBA CHECKOUT
  ↓
AUTHORIZED PSP
  ↓
LAGOON MERCHANT ACCOUNT
  ↓
LAGOON CORPORATE TREASURY
```

The payment is consideration for a WARIBA service. It is **not** a customer
deposit, trading capital, investment capital, a wallet top-up, or money
entrusted to WARIBA for investment. Canonical public wording (also in
`apps/web/components/legal/legal-payment-architecture.ts` as
`PAYIN_CLAUSE`):

> Lorsqu’un utilisateur achète un service WARIBA, le paiement est traité
> par un prestataire de services de paiement tiers. Après traitement, les
> fonds correspondants sont crédités au compte marchand de Lagoon
> Technologies et deviennent des fonds de l’entreprise, sous réserve des
> frais, remboursements, contestations et obligations applicables. Les
> sommes versées ne constituent pas un dépôt bancaire, un investissement ou
> un capital confié à WARIBA pour être placé sur les marchés.

## 4. Simulated-account separation

A user paying, say, 25 000 FCFA for a FLEX 100K account does **not** mean
Lagoon Technologies received or holds 100 000 USD. The displayed "taille
nominale" is a simulated value used to compute rules and results — it has
no patrimonial link to the price paid. This is now explicit on
`/legal/trading-simule` (§2, "Taille nominale") via
`NOMINAL_SIZE_SEPARATION_STATEMENT`.

## 5. Payout architecture

```
PERFORMANCE ACCOUNT
      ↓
PAYOUT ELIGIBILITY
      ↓
WARIBA REVIEW / CONTROLS
      ↓
LAGOON AUTHORIZATION
      ↓
LAGOON COMPANY FUNDS
      ↓
PSP TRANSFER ACCOUNT
      ↓
MOBILE MONEY / BANK / SUPPORTED RAIL
      ↓
VERIFIED BENEFICIARY
```

Payouts are paid **from Lagoon Technologies' corporate resources** — a
contractual expenditure of the business, not a withdrawal from a real
trader account, and not investment returns, interest, dividends, or a
brokerage withdrawal. Canonical public wording (`PAYOUT_FUNDING_CLAUSE`):

> Lorsqu’une demande de payout satisfait aux conditions applicables et aux
> vérifications requises, Lagoon Technologies autorise le paiement
> correspondant et le finance à partir de ses propres ressources
> d’entreprise. Le versement est ensuite exécuté par un prestataire de
> paiement tiers vers le bénéficiaire vérifié. Un payout WARIBA ne
> constitue pas le retrait d’un capital réel détenu dans un compte de
> trading client.

## 6. PSP transfer-account model

Some PSPs separate a collection/Pay-in account from a transfer/Payout
account, and some (CinetPay, per its own published terms) allow an internal
recharge from the collection balance into the transfer balance. Either
model is permitted as merchant infrastructure — it remains Lagoon corporate
funds moving inside PSP-operated infrastructure, and must never be
described publicly as customer money stored by WARIBA.

```
PSP COLLECTION ACCOUNT
      ↓
LAGOON MERCHANT FUNDS
      ↓
PSP TRANSFER ACCOUNT
      ↓
BENEFICIARY
```

## 7. No customer wallet — the line WARIBA must not cross

WARIBA must never expose a real-money wallet balance with recharge,
transfer, peer-to-peer send, or free withdrawal functions:

**Not acceptable:**
```
Solde WARIBA : 250 000 FCFA
[ Envoyer à un autre trader ]  [ Recharger ]  [ Retirer ]
```

**Acceptable — what the product already shows:**
```
COMPTE PERFORMANCE                    PAYOUT
Taille nominale simulée               Montant demandé : 300 000 FCFA
100 000 USD                           Statut : En revue
```

A consistency search of `app/(public)`, `components/marketing`, and
`content/help` for `wallet`, `portefeuille électronique`, `solde réel`,
`capital client`, `argent détenu`, `retrait du compte`, `fonds confiés`,
`broker`, and `établissement de paiement` found **zero occurrences used as
a positive claim** — the only hits are correct-direction denials ("ce n'est
pas un dépôt," "n'exploite pas... de portefeuille électronique," "ne
devient pas elle-même un établissement de paiement"). No public copy needed
correcting.

## 8. Treasury model (conceptual — not implemented in code)

```
WARIBA REVENUE
     ↓
PSP COLLECTION
     ↓
LAGOON BANK / TREASURY
        /        |        \
       /         |         \
OPERATIONS   TAX RESERVE   PAYOUT RESERVE
                              ↓
                         PSP PAYOUT
                              ↓
                           TRADER
```

The payout reserve is Lagoon corporate treasury, not segregated customer
money, unless a future legal structure requires otherwise. This is a
business/treasury-management concern, not something this codebase
implements — no ledger, reserve-tracking, or accounting code was added or
changed by this task.

## 9. PSP research and provider priority

The owner evaluated six PSP candidates against WARIBA's six target markets
and its Pay-in + Payout requirement. **None of these are contracted.** No
PSP name or logo appears on the public site; this table exists to guide
which onboarding conversations happen first.

| Provider | Pay-in | Payout | Coverage of the 6 target markets | Notes |
|---|---|---|---|---|
| **PayDunya** | Yes | Yes | 6/6 (CI, SN, BJ, TG, ML, BF) | Best overall market fit; no published KYB SLA; a pricing discrepancy between its public fee page and its indexed CGU (subscription fee) needs written clarification before treating any rate as final |
| **CinetPay** | Yes | Yes | Regional | **Confirmed** on the BCEAO's list of payment institutions authorised in Côte d’Ivoire, as CINETPAY AFRICA SA, no. EP.CI.007/2025 (BCEAO register, consulted by the owner) — authorisation in Côte d’Ivoire is not proof that every rail is commercially available in all six target markets; per-market confirmation still required |
| **Kkiapay** | Yes | Yes | 4/6 (CI, SN, BJ, TG — no Mali or Burkina Faso currently) | Publishes a concrete account-activation SLA: ~24h after document submission |
| **FedaPay** | Yes | Yes (activation-gated) | ~4–5/6 depending on rail | Publishes account validation up to 36 business hours; payout activation typically 24–72h per support |
| **FeexPay** | Yes | Yes | 5/6 (no Mali currently) | Ivorian, BCEAO-authorised as EP.CI.006/2025 per its own site; publishes indicative Pay-in/Payout fee percentages that must be confirmed in writing for Lagoon specifically |
| **HUB2** | Yes | Yes | 6/6 | Strong technical fit; presents as enterprise/contact-sales rather than fast self-service onboarding |

**Provider-validation priority, in parallel, none exclusive:**

1. **PayDunya** — primary candidate for full 6-market coverage
2. **CinetPay** — primary candidate / redundancy, confirmed BCEAO-authorised in Côte d’Ivoire
3. **Kkiapay** — fastest published onboarding SLA, useful for an initial CI+SN+BJ+TG launch

The target end-state is **at least two live PSPs**, with pay-in and payout
routed per country/rail, so a single provider's incident doesn't stop
WARIBA from taking payments or paying out:

```
WARIBA PAYMENT ORCHESTRATOR
              ┌→ PayDunya
Paiement  ────┤
              └→ CinetPay
```

This routing layer is a future engineering task, not something this
documentation-only pass builds.

## 10. PSP contract checklist — confirm in writing before production activation

For each PSP, before it goes live for WARIBA:

- Business model accepted: simulation/evaluation service + contractual payouts
- Pay-in allowed / Payout allowed
- Per-country availability: CI, SN, BJ, TG, ML, BF
- Supported rails: Mobile Money, cards, bank
- Settlement time; payout pre-funding requirements
- Min/max transaction limits
- KYB requirements (Lagoon Technologies) and KYC requirements (end user)
- Fees and reserves
- Chargeback policy; refund support
- API access and webhooks
- Brand-usage terms (logo display rights — not exercised until this is confirmed)

None of these are confirmed for any provider as of this document's version.

## 11. Legal Center pages updated

The following pages were refined to use the precise merchant/PSP wording
above (`apps/web/components/legal/legal-payment-architecture.ts` is the
single canonical source these pages import from, rather than each
paraphrasing the same idea):

| Page | What changed |
|---|---|
| `/legal/conditions-utilisation` | §7 (Description de WARIBA) gained the merchant-boundary statement; §11 (Paiements) gained the Pay-in clause; §12 (Payouts) gained the payout-funding clause |
| `/legal/payouts` | §7 (Traitement du paiement) now states payouts are funded from Lagoon's own treasury, with a callout explaining a payout is not a withdrawal from a simulated balance; §8 (Prestataires tiers) clarifies Lagoon stays merchant, not payment institution |
| `/legal/remboursements` | §1 (Paiements) gained the Pay-in clause |
| `/legal/trading-simule` | §2 (Taille nominale) gained the nominal-size/price separation statement |
| `/legal/disponibilite-pays` | §6 (Paiements transfrontaliers) gained the merchant-boundary statement |

`/legal/mentions-legales`, `/legal/confidentialite`, `/legal/cookies`,
`/legal/lbc-kyc`, and `/legal/reclamations-litiges` were left unchanged —
none of them make a payment-architecture claim that needed refining.

## 12. What remains open

- No PSP contract is executed; `PAYDUNYA_STATUS` / `CINETPAY_STATUS` /
  `KKIAPAY_STATUS` are all **"candidat évalué — dossier d’onboarding non
  encore ouvert."**
- Per-market rail availability (which Mobile Money network, in which
  country, for which PSP) is unconfirmed beyond what each provider
  publishes about itself.
- The multi-PSP routing/orchestration layer described in §9 is a future
  engineering task.
- Treasury/payout-reserve tracking (§8) is a future accounting/engineering
  task — final classification of collections and payouts must be validated
  with Lagoon's accountant or tax adviser.
- Regulatory classification counsel sign-off (tracked in the Legal Center
  memo) still applies to this payment architecture as much as to the
  product qualification generally.
