---
title: "WARIBA — Roadmap finale (verrouillée)"
version: "1.0"
document_id: "WARIBA-FINAL-ROADMAP"
status: "LOCKED — document vivant, séquencement de phases"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
owner: "Rodrigue Adebigni"
date_locked: "2026-08-31"
supersedes:
  - "DECISION_LOG.md §28 'Prochaine action opérationnelle' (séquence à 4 étapes du merge Prompt 09, obsolète)"
complements:
  - "docs/08-delivery/WARIBA_ROAD_TO_BETA_2026-08-24.md (suivi granulaire par exigence, matrice de couverture)"
  - "docs/00-decisions/DECISION_LOG.md (autorité supérieure sur toute décision produit/technique)"
---

# WARIBA — Roadmap finale (verrouillée) v1.0

> **Ce document répond à une question différente de celle du Road to Beta.**
> `WARIBA_ROAD_TO_BETA_2026-08-24.md` répond à « quel pourcentage des 181
> exigences du Product OS est fait, et dans quel ordre les fermer ». Ce
> document répond à « dans quel ordre les grands chantiers produit
> arrivent, du site public jusqu'au lancement public » — la séquence de
> phases, pas la matrice de couverture. Les deux documents restent
> vivants, en parallèle, sans se contredire : un chantier de cette roadmap
> peut regrouper plusieurs dizaines de lignes de la matrice.

## Le principe verrouillé

WARIBA est composé de **trois grands produits**, pas deux :

1. **Le site public** — vitrine, Legal Center, conversion.
2. **Le Trader Hub** — gestion de la relation WARIBA : comptes,
   progression, performance, journal, payouts, billing, profil, support.
3. **WariX** — la workstation de trading.

Le Trader Hub et WariX partagent les données et l'identité du trader, **mais
pas le même shell ni les mêmes responsabilités**. Le Trader Hub n'est plus
traité comme un détail entre l'authentification et WariX — c'est une phase
complète et obligatoire au même titre que le site public et WariX
eux-mêmes. C'est la correction que ce verrouillage apporte au séquencement
précédent (§28 du Decision Log), qui n'en faisait pas une phase nommée.

---

## Phase A — Site public 100 %

1. `/offres`
2. `/offres/one`
3. `/offres/flex`
4. `/offres/instant`
5. `/comment-ca-marche`
6. `/regles`
7. `/payouts`
8. `/warix` — marketing
9. `/aide`
10. `/contact`
11. `/afrique-francophone`
12. Legal Center
13. Footer final + disclosures
14. QA de toutes les routes et liens
15. Zéro placeholder / zéro lien mort

## Phase B — Auth complet

`/login`, `/inscription`, vérification email, mot de passe oublié, reset
password, session expirée, lien invalide/expiré, compte déjà existant,
états loading/success/error, `returnTo` correct, mobile premium, cohérence
visuelle totale avec WARIBA.

## Phase C — Trader Hub complet + polish

Le Hub ne reste pas « simplement fonctionnel » — il devient un vrai
**operating system du trader WARIBA**. Surfaces canoniques déjà en place :
Dashboard, Comptes, Performance, Payouts, Facturation, Notifications,
Profil, Paramètres, Support.

- **C1 — Dashboard / Command Center.** D'un dark dashboard à quelques
  cartes vers un *living command center* : état du compte, marge de risque
  restante, distance à l'objectif, ce qui vient de changer, règle qui
  compte maintenant, prochaine action, progression, activité récente,
  performance, payout readiness.
- **C2 — Account lifecycle UX.** La composition de la page change selon
  l'état (aucun compte, Évaluation active, objectif atteint, en
  vérification, validé, Performance, breached/failed, payout ready/pending,
  KYC requis) — pas seulement un badge.
- **C3 — Comptes.** Sélecteur, cartes premium, famille ONE/FLEX/INSTANT,
  taille, état, règles, progression, historique, action suivante, ajout de
  compte, états failed/closed/review.
- **C4 — Performance.** P&L, equity/balance, win rate, average win/loss,
  profit factor, évolution cumulative, distribution, durée des trades,
  sessions, instruments, calendrier/heatmap si justifié, comparaison de
  périodes, comportement de risque. Jamais de fake data sur un compte vide.
- **C5 — Journal.** Trade list, filtres, détails, entrée/sortie/stop/
  target, execution path, notes, captures et tags si réellement supportés,
  contexte, statistiques dérivées. Pas de faux AI Coach.
- **C6 — Payout Hub.** Readiness, eligibility, KYC si requis, demande, En
  revue, Approuvé, En traitement, Payé, failed/returned si l'architecture le
  prévoit, historique, bénéficiaire, statut clair. `approved ≠ paid` et
  `processing ≠ paid` restent la règle.
- **C7 — Billing / achats.** Commandes, achats, activations FLEX, méthodes
  réellement supportées, reçus, remboursements selon la policy en vigueur,
  statuts de paiement. Pas de fausse carte enregistrée.
- **C8 — Notifications.** Centre partagé avec WariX : Compte, Risque,
  Paiement, KYC, Payout, Sécurité, Système.
- **C9 — Profil + Paramètres Hub.** Profil (identité applicative, pays,
  langue, timezone, préférences) ; Paramètres (sécurité, sessions,
  notifications, confidentialité, appareils, accessibilité, langue,
  timezone).
- **C10 — Support authentifié.** Tickets, références, incidents,
  contestations, contexte de compte, litige payout/paiement, contestation
  de breach. Le Help Center public reste `/aide`.
- **C11 — Hub Mobile.** Navigation : **Hub · Comptes · WariX · Payouts ·
  Plus**, `Plus` regroupant Performance, Facturation, Notifications,
  Profil, Paramètres, Support, Déconnexion.
- **C12 — Visual polish Hub.** Plus de densité utile, moins d'espace noir
  vide, hiérarchie plus forte, couleur sémantique plus riche, états de
  compte visuellement évidents, charts premium, microvisuals, motion
  fonctionnelle, meilleures icônes — vivant, jamais gaming, sans inventer
  un centime de performance.

## Phase D — WariX complet

- **D1 — Shell.** Noir plus profond, meilleur système de couleurs, rail
  global gauche, rail de dessin, rail utilitaire droit, header, sélecteur
  de compte, instrument, chart, execution dock, bottom dock, responsive,
  zéro route vide.
- **D2 — Trading UX.** Order ticket, positions, orders, executions, Stop
  Loss, Take Profit, click-hold-drag sur le chart avec valeurs live pendant
  le drag, risk preview, confirmation, invalid state, alternative
  accessible exacte au drag.
- **D3 — Chart / Trader-native UX.** Muscle memory du trader, crosshair,
  price scale, menus contextuels, outils de dessin, densité de toolbar,
  iconographie trader-native, réglages de chart, préservation du viewport —
  un problème d'ergonomie workstation avant d'être un problème d'esthétique.
- **D4 — Indicators.** Décider : stack actuelle, RealChart, ou TradingView
  si licensing/capacités le justifient. Priorité : un excellent terminal
  avant de reconstruire TradingView depuis zéro.
- **D5 — Risk Center WariX.** Risque quotidien, perte maximale, risque de
  position, distance aux limites, statut, restrictions, contrôles
  personnels uniquement s'ils sont réellement applicables.
- **D6 — WariX Settings.** Risk, Chart, Trading, confirmations, raccourcis,
  timezone, apparence, confidentialité, notifications — pas de toggle
  placebo ; un réglage de risque qui prétend être appliqué doit
  réellement l'être.
- **D7 — Mobile WariX.** Chart-first, jamais trois rails desktop
  compressés — sheets/drawers tactiles premium.

## Phase E — Global product polish

Cohérence design, couleurs, espacement, typographie, icônes,
microinteractions, états vide/chargement/erreur, stale/offline, responsive,
français en priorité, accessibilité, aucune fuite d'anglais, aucune
capacité dupliquée, transitions Hub ↔ WariX. C'est le point où WARIBA est
jugé comme **un seul Product OS**, pas page par page.

## Phase F — Security hardening

Auth, autorisation, Supabase RLS, IDOR, rate limiting, CSRF, XSS,
injection, webhooks, idempotence, secrets, sécurité de session, reset
password, vérification email, RBAC admin, permissions payout, permissions
KYC, journaux d'audit, isolation service-role, CORS, CSP, storage, threat
modeling, MFA staff.

## Phase G — Full certification / tests

Toutes les routes publiques, Auth, Commerce, ONE, FLEX, INSTANT, Hub,
lifecycle, WariX, orders, positions, SL/TP, risque, payouts, paiements,
KYC, mobile, Chrome/Safari/Edge, offline, données obsolètes, webhooks
dupliqués, expiration de session, pannes provider, reconnexion/
réconciliation. La Constitution sépare déjà Fast Visual Loop et
certification complète — les passes visuelles ciblées restent la norme
jusqu'ici, pas les suites massives.

## Phase H — Real production services

Vercel production, domaine, Supabase production, migrations, RLS,
sauvegardes/PITR si pertinent, URLs auth de production, provider e-mail,
PSP réel (PayDunya, CinetPay, Kkiapay), provider KYC, market data,
storage, Sentry/monitoring, analytics compatible vie privée.

## Phase I — Private beta

Ajustement léger de la page d'accueil, pas de redesign. Ajouter **BÊTA
PRIVÉE** et un CTA adapté (« Demander mon accès » ou « Rejoindre la bêta
privée » selon le workflow final), avec une disclosure honnête sur
l'évolution possible des fonctionnalités, paiements et disponibilités.
Pas de fausse rareté.

## Phase J — Real users

Cohortes bêta, comportement, support, bugs, compréhension des règles,
conversion, UX de trading, UX de payout, friction KYC, mobile,
observabilité.

## Phase K — Iterate → public launch

Corriger, simplifier, renforcer, QA finale de lancement, ouverture
commerciale.

---

## Roadmap résumée

```text
SITE PUBLIC 100 %
→ AUTH COMPLET
→ TRADER HUB COMPLET
→ TRADER HUB POLISH
→ WARIX COMPLET
→ WARIX POLISH
→ GLOBAL PRODUCT POLISH
→ SECURITY HARDENING
→ FULL TESTING / CERTIFICATION
→ PRODUCTION SERVICES
→ PRIVATE BETA
→ REAL USERS
→ ITERATE
→ PUBLIC LAUNCH
```

**Treasury avancé / intelligent PSP routing / finance OS restent après le
lancement, pas avant.** Voir
`docs/07-assurance/WARIBA_UEMOA_Payment_Payout_Architecture_v1.0.md` et
`docs/03-finance/WARIBA_Treasury_Payout_Reserve_Gap_Analysis_v1.0.md` pour
l'état actuel de ce chantier et pourquoi il attend un PSP sous contrat.

## Où en est chaque phase aujourd'hui (2026-08-31)

| Phase | État |
|---|---|
| A — Site public | En cours. Homepage, Legal Center (11 pages), footer et disclosures réglementaires livrés cette session. `/offres/{one,flex,instant}`, `/comment-ca-marche`, `/regles`, `/payouts` marketing restent à construire comme routes dédiées — `/programme`, `/aide/risque-regles` et `/aide/payouts` en tiennent lieu aujourd'hui. |
| B — Auth complet | Construit (Prompts 01–04) ; polish visuel/mobile non audité contre cette roadmap. |
| C — Trader Hub complet + polish | Surfaces canoniques existantes (Dashboard, Comptes, Performance, Payouts, Facturation, Notifications, Profil, Paramètres, Support) ; le travail C1–C12 ci-dessus n'a pas démarré. |
| D — WariX complet | Baseline WX1 gelée ; WX2 (graphique/market data) en cours par ailleurs. D1–D7 ci-dessus non démarrés comme chantier unique. |
| E–K | Non démarrées. |

Ce tableau est une photo prise à la date du document, pas un tracker —
`WARIBA_ROAD_TO_BETA_2026-08-24.md` (ou sa prochaine révision) reste la
source des pourcentages et des exigences P0/P1 fermées.
