# WARIBA — Route Parity vs Product OS Master Constitution

> ## Enregistrement daté — ne décrit plus l'état courant
>
> Ce document mesure le code **à sa date**. Trois tranches ont été livrées
> depuis : Phase 3.1A (déployabilité), Phase 3.2 (Support + Contestations) et
> le Centre d'aide. Six exigences ont changé d'état et la couverture est passée
> de 77,1 % à 80,4 %.
>
> **Pour l'état courant et le séquencement restant, voir
> `WARIBA_ROAD_TO_BETA_2026-08-24.md`.**
>
> Il est conservé tel quel : un audit réécrit après coup n'est plus un audit.


**AUDIT_SHA** `42983815fde5fbc83375083f6880e10dbb2d5b9a` (code identical to `main` @ `8c06117`)
**Canonical source** Constitution §6 · **Method** `find apps/web/app -name page.tsx`

`ROUTE_EXISTS` and `PRODUCT_REQUIREMENT_COMPLETE` are scored separately, because a
route that renders is not the same as a capability that works. `/support` is the
clearest case in this repository: the page is real, the support system behind it
does not exist.

---

## Public — 9 of 12 canonical routes

| Canonical route | Exists | Functional | Constitution complete | Gap |
|---|:--:|:--:|:--:|---|
| `/` | yes | yes | partial | Preuve produit WariX faible en héro (§8.1 Phase 3) |
| `/offres` | yes | yes | **done** | — |
| `/programme` | yes | yes | **done** | — |
| `/regles` | **no** | — | **no** | Règles publiques atteignables seulement via `/programme#regles` |
| `/warix` | yes | yes | **done** | Démo interactive simulée, correctement étiquetée |
| `/confiance` | **no** | — | **no** | Aucune page trust/confiance |
| `/aide` | yes | yes | **UI_ONLY** | Contenu embarqué dans `HelpCenterClient.tsx`; aucune table `help_articles` |
| `/support` | yes | yes | **UI_ONLY** | Page statique; aucun ticket, thread ni file opérateur |
| `/status` | **no** | — | **no** | **OPS-010 `LOCKED` — « Status page avant public »** non satisfaite |
| `/legal/conditions` | yes | yes | **done** | — |
| `/legal/confidentialite` | yes | yes | **done** | — |
| `/legal/risques` | yes | yes | **done** | — |

## Auth — 6 of 6

| Canonical route | Exists | Functional | Constitution complete |
|---|:--:|:--:|:--:|
| `/login` | yes | yes | **done** |
| `/inscription` | yes | yes | **done** |
| `/verification-email` | yes | yes | **done** |
| `/mot-de-passe-oublie` | yes | yes | **done** |
| `/recuperation` | yes | yes | **done** |
| `/session-expiree` | yes | yes | **done** |

Le seul domaine à parité complète.

## Commerce — 4 of 4 routes, gated on an external PSP

| Canonical route | Exists | Functional | Constitution complete | Gap |
|---|:--:|:--:|:--:|---|
| `/checkout` | yes | yes | partial | PSP externe absent (`OPEN-PAYMENT-001`) |
| `/checkout/success` | yes | yes | **done** | — |
| `/checkout/echec` | yes | yes | **done** | — |
| `/bienvenue` | yes | yes | **done** | — |

Route hors canon présente : `/checkout/sandbox-pay` (fournisseur de paiement
interne, correctement nommé *sandbox*).

## Trader Hub — 7 of 11

| Canonical route | Exists | Functional | Constitution complete | Gap |
|---|:--:|:--:|:--:|---|
| `/hub` | yes | yes | **done** | — |
| `/comptes` | yes | yes | **done** | — |
| `/comptes/{accountId}` | **no** | — | **no** | Seules `/comptes` et `/comptes/nouveau` existent (§32) |
| `/performance` | yes | yes | **done** | — |
| `/payouts` | yes | yes | **done** | — |
| `/facturation` | yes | yes | **done** | — |
| `/notifications` | **no** | — | **déféré** | `ENG-031` + `UX-HUB-010` `LOCKED` — voir CONFLICT-01 |
| `/profil` | **no** | — | **no** | §41 l'exige; aucun deferral au Decision Log |
| `/parametres` | yes | yes | partial | 2 des 8 domaines §42; page en lecture seule |
| `/support` | **no (Hub)** | — | **no** | La navigation Hub pointe vers la page **publique** |
| `/plus` | yes | yes | **done** | — |

Routes hors canon présentes : `/journal` (le §34 place le journal *dans*
`/performance` — divergence assumée, pas une lacune), `/comptes/nouveau`,
`/verification-identite`.

## WariX — 1 route, 0 of 5 vues sérialisables

| Canonical | Exists | Gap |
|---|:--:|---|
| `/trade?account={id}` | yes | — |
| `?view=trading` | **no** | `page.tsx` ne lit que `{ account?: string }` |
| `?view=performance` | **no** | §57 inatteignable par URL |
| `?view=risk` | **no** | §58 inatteignable par URL |
| `?view=settings` | **no** | Réglages atteints par modale uniquement |
| `?view=help` | **no** | Panneau d'aide contextuel uniquement |

**Preuve :**
```
apps/web/app/(trade)/trade/page.tsx:76
  searchParams: Promise<{ account?: string }>;
```

Conséquence : l'invariant §6 — « changer de `view` ne doit pas remonter
TradeChart, perdre le viewport, le zoom, les drawings, les indicateurs, le
crosshair, l'order draft ou la sélection de symbole » — est **CANNOT_VERIFY**.
Il n'existe pas de `view` à changer. L'invariant n'est pas violé ; il est
inapplicable.

## Control — 19 routes, hors canon §6 (couvert par §74–78)

Présentes : `/control` + accounts, accounts/[id], actuarial, audit, commercial,
incidents, integrity, integrity/[id], market-operations, payouts,
payouts/[payoutId], policies, policies/[id], team, trading, treasury, users,
users/[id].

**Absentes** malgré §75–§77 : file **Pass Review**, file **KYC**, file
**Contestations**.

Sur 19 pages, **4 seulement portent des mutations** (`actuarial`, `integrity`,
`payouts`, `treasury` — chacune avec un `actions.ts`). Les 15 autres sont en
lecture seule, ce qui est cohérent avec le périmètre Prompt 09 mais signifie
qu'un opérateur ne peut pas *agir* sur la majorité des surfaces.

## Routes système hors canon

`/403`, `/erreur`, `/maintenance`, `/hors-ligne`, `/catalog` (catalogue de
composants interne).

---

## Synthèse

| Groupe | Canoniques | Présentes | Complètes |
|---|--:|--:|--:|
| Public | 12 | 9 | 6 |
| Auth | 6 | 6 | 6 |
| Commerce | 4 | 4 | 3 |
| Trader Hub | 11 | 7 | 6 |
| WariX (vues) | 6 | 1 | 1 |
| **Total** | **39** | **27** | **22** |

```text
UNIMPLEMENTED_CANONICAL_ROUTES = 12
  /regles  /confiance  /status  /comptes/{accountId}  /profil
  /support (Hub)  /notifications (déféré LOCKED)
  /trade?view= × 5
```

Onze de ces douze sont de véritables lacunes. `/notifications` est la seule
absence couverte par une décision `LOCKED` explicite.
