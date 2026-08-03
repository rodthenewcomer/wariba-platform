---
title: "WARIBA Security, QA & Operations Standard"
version: "1.0"
document_id: "WARIBA-SECURITY-QA-OPERATIONS"
status: "BASELINE D’ASSURANCE — OBLIGATOIRE AVANT BÊTA PRIVÉE"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
market: "Afrique francophone"
owner: "WARIBA Security, QA, SRE, Risk & Operations"
source_of_truth_priority: 8
depends_on:
  - "WARIBA Product Master Document v1.0"
  - "WARIBA Program Rulebook v1.0"
  - "WARIBA Financial Model v1.0"
  - "WARIBA UX Architecture v1.0"
  - "WARIBA Design System v1.0"
  - "WARIBA Engineering Constitution v1.0"
  - "WARIBA System Architecture v1.0"
next_documents:
  - "WARIBA Build Plan v1.0"
  - "WARIBA Prompt Pack v1.0"
---

# WARIBA Security, QA & Operations Standard v1.0

> **Aucun payout fiable sans sécurité. Aucune sécurité crédible sans tests. Aucun test utile sans opérations capables de répondre aux incidents.**

> **Addendum QA Rules v1.1 — 2026-08-03**
> Les gates ajoutent les preuves suivantes : plancher EOD déplacé uniquement
> après clôture finalisée, jamais décroissant et verrouillé au nominal ; payout
> nul au buffer ou sous le buffer ; débit limité à l'excédent ; Performance Days
> non réutilisables ; cap net après split ; exposition 50K/100K ; levier XAUUSD
> dynamique ; marge 30 % Evaluation et 25 % Performance. Une page marketing ne
> peut jamais présenter un montant simulé comme dépôt, capital confié ou gain.

## Contrôle du document

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| État réel du projet | Dossier créé, aucun code commencé |
| Dépôt | GitHub privé `wariba-platform` |
| Architecture | Modular monolith + Web/BFF + Realtime + Worker |
| Environnement initial | Trading simulé |
| Bêta initiale | 10 à 25 traders |
| Capital réel | Non en V1 |
| Paiement réel | Après gates |
| Payout réel | Après gates |
| Base | PostgreSQL / Supabase |
| Auth | Supabase Auth |
| CI | GitHub Actions |
| Agents IA autorisés | Codex, Claude Code ou tout autre agent IA explicitement mandaté |
| Rôles autorisés | Construction, modification, audit et documentation — voir AI-015 |
| Statut | Baseline obligatoire avant bêta privée |

---

# 1. Objet du standard

Ce document définit les conditions minimales de sécurité, de qualité, de fiabilité et d’exploitation de WARIBA.

Il répond à quatre questions :

1. Comment empêcher une personne ou un système non autorisé d’altérer WARIBA ?
2. Comment prouver que les règles, calculs et transitions fonctionnent correctement ?
3. Comment détecter rapidement une anomalie ?
4. Comment continuer, limiter les dégâts, corriger et informer lorsqu’un incident survient ?

Il couvre :

- sécurité applicative ;
- sécurité des comptes ;
- isolation des données ;
- sécurité du trading simulé ;
- sécurité des paiements et payouts ;
- sécurité de WARIBA Control ;
- sécurité de l’infrastructure ;
- développement sécurisé ;
- qualité logicielle ;
- stratégie de tests ;
- tests financiers ;
- tests temps réel ;
- tests de concurrence ;
- tests RLS ;
- tests de résilience ;
- performance ;
- observabilité ;
- gestion des incidents ;
- sauvegardes ;
- reprise ;
- runbooks ;
- support ;
- release gates ;
- responsabilités.

---

# 2. Principes non négociables

## 2.1 Deny by default

Toute action non explicitement autorisée est refusée.

## 2.2 Least privilege

Chaque utilisateur, service, clé, rôle et agent reçoit uniquement les permissions nécessaires.

## 2.3 Server authoritative

Le serveur décide toujours :

- de l’ordre ;
- du fill ;
- du PnL ;
- de la balance ;
- de l’equity ;
- du risque ;
- du payout ;
- du paiement ;
- de l’état du compte.

## 2.4 Defense in depth

Aucune protection unique n’est considérée suffisante.

Exemple :

```text
auth
→ RBAC
→ RLS
→ validation domaine
→ contrainte base
→ audit
```

## 2.5 Immutable evidence

Les événements sensibles ne sont jamais supprimés ni réécrits.

## 2.6 Security before convenience

Une action risquée peut exiger :

- confirmation ;
- MFA ;
- double approbation ;
- délai ;
- justification ;
- contrôle humain.

## 2.7 Fail closed

En cas d’incertitude critique :

- l’ordre est rejeté ;
- le payout reste en attente ;
- le compte passe en lecture seule ;
- la fonction est désactivée.

WARIBA ne doit pas inventer un résultat.

## 2.8 Recovery by design

Chaque fonction critique possède :

- rollback ou compensation ;
- audit ;
- monitoring ;
- runbook ;
- owner.

## 2.9 Human accountability

Aucune IA ne décide seule :

- un rejet payout ;
- une fraude ;
- un bannissement ;
- une correction financière ;
- une suppression de données sensible.

## 2.10 No security theater

Une mesure n’est pas considérée efficace uniquement parce qu’elle est visible.

---

# 3. Classification des actifs

## 3.1 Actifs critiques

- policy versions ;
- symbol specifications ;
- ordres ;
- fills ;
- positions ;
- ledger ;
- balance ;
- risk snapshots ;
- violations ;
- payouts ;
- payment events ;
- rôles et permissions ;
- audit ;
- secrets ;
- KYC ;
- documents.

## 3.2 Actifs importants

- tickets support ;
- notifications ;
- help center ;
- analytics ;
- marketing content ;
- feature flags.

## 3.3 Actifs publics

- homepage ;
- règles publiques ;
- status page ;
- articles ;
- changelog.

---

# 4. Classification des données

| Niveau | Exemples | Contrôles |
|---|---|---|
| Public | règles, marketing, status | lecture publique |
| Internal | métriques, feature flags | staff autorisé |
| Confidential | profils, trades, payouts | auth + RBAC/RLS |
| Restricted | KYC, secrets, admin audit | accès limité + audit |
| Critical Financial | ledger, balances, payouts | serveur uniquement + contraintes + double contrôle |

---

# 5. Modèle de menace initial

## 5.1 Menaces externes

- credential stuffing ;
- brute force ;
- phishing ;
- session theft ;
- account takeover ;
- XSS ;
- CSRF ;
- SQL injection ;
- SSRF ;
- file upload abuse ;
- API abuse ;
- WebSocket abuse ;
- DDoS ;
- bot traffic ;
- webhook forgery ;
- replay attack ;
- dependency compromise.

## 5.2 Menaces internes

- erreur opérateur ;
- abus de permission ;
- modification de payout ;
- lecture KYC injustifiée ;
- suppression d’audit ;
- changement de policy ;
- accès direct DB ;
- secret exposé ;
- action non documentée.

## 5.3 Menaces métier

- double payout ;
- double activation ;
- double order ;
- collusion ;
- multi-compte ;
- chargeback frauduleux ;
- exploitation de stale price ;
- exploitation d’un bug ;
- faux documents ;
- manipulation de flux provider ;
- contournement d’une restriction news/weekend.

## 5.4 Menaces opérationnelles

- panne base ;
- corruption migration ;
- perte de données ;
- perte de connexion marché ;
- tick gap ;
- provider indisponible ;
- worker bloqué ;
- file de jobs saturée ;
- bug de calcul ;
- incident de déploiement ;
- divergence ledger/snapshot ;
- panne WebSocket ;
- erreur de timezone.

---

# 6. Trust boundaries

```text
Internet
│
├── Public Web
├── Platform Web
├── Control Web [MFA + RBAC]
├── WebSocket
└── Webhooks Providers
        │
        └── Application Layer
                │
                ├── Domain Services
                ├── PostgreSQL
                ├── Private Storage
                ├── Outbox/Workers
                └── External Providers
```

Chaque frontière doit posséder :

- authentification ou validation ;
- autorisation ;
- rate limit ;
- validation input ;
- logging ;
- correlation ID.

---

# 7. Identité et authentification

## 7.1 Trader

- email vérifié selon policy ;
- mot de passe sécurisé ;
- session révocable ;
- appareil journalisé ;
- réauthentification pour action sensible future.

## 7.2 Staff

- MFA obligatoire avant staging réaliste ;
- session courte ;
- appareil reconnu ;
- permissions fines ;
- audit complet.

## 7.3 Password policy

La policy exacte dépend du provider, mais doit inclure :

- longueur minimale suffisante ;
- blocage des mots de passe compromis si disponible ;
- limitation tentatives ;
- reset sécurisé ;
- pas de règles absurdes purement cosmétiques.

## 7.4 Account recovery

Le reset doit :

- invalider le token après usage ;
- expirer ;
- être rate-limité ;
- notifier l’utilisateur ;
- ne pas révéler si un email existe.

## 7.5 Session revocation

Actions :

- logout ;
- logout all devices ;
- revoke suspicious device ;
- revoke staff session.

---

# 8. Autorisation

## 8.1 Modèle

RBAC + permissions fines.

## 8.2 Rôles

- trader ;
- support ;
- risk ;
- finance ;
- integrity ;
- technical ;
- administrator.

## 8.3 Séparation des responsabilités

| Action | Support | Risk | Finance | Integrity | Technical | Admin |
|---|---:|---:|---:|---:|---:|---:|
| Lire ticket | Oui | Selon besoin | Non | Selon besoin | Non | Oui |
| Lire violation | Résumé | Oui | Non | Oui | Diagnostic | Oui |
| Corriger violation | Non | Demande | Non | Non | Non | Approbation requise |
| Approuver payout | Non | Avis | Oui | Avis | Non | Selon permission |
| Déclencher payout | Non | Non | Oui | Non | Non | Selon permission |
| Voir KYC complet | Non | Non | Restreint | Oui | Non | Restreint |
| Modifier policy draft | Non | Oui | Avis | Non | Non | Selon permission |
| Publier policy | Non | Approbation | Avis | Non | Non | Double approbation |
| Activer kill switch | Non | Selon scope | Non | Non | Oui | Oui |

## 8.4 Pas de super-admin silencieux

Un rôle `administrator` ne donne pas automatiquement toutes les permissions financières.

---

# 9. RLS

## 9.1 Principes

Chaque table utilisateur privée possède une policy explicite.

## 9.2 Tests obligatoires

Pour chaque table :

- owner can read ;
- other user cannot read ;
- owner cannot mutate server-only fields ;
- staff role correct can read ;
- unauthorized staff cannot read ;
- service role behavior controlled.

## 9.3 Écriture financière

Aucune écriture client directe sur :

- trading accounts ;
- orders ;
- fills ;
- ledger ;
- violations ;
- payouts ;
- policies.

---

# 10. WARIBA Control

## 10.1 Isolation

`control.wariba.app`.

## 10.2 Contrôles

- MFA ;
- session plus courte ;
- RBAC ;
- CSP stricte ;
- no-index ;
- audit ;
- IP/device signals ;
- actions sensibles confirmées.

## 10.3 Actions critiques

Exigent :

- raison ;
- permission ;
- correlation ID ;
- éventuellement second approbateur ;
- notification interne.

## 10.4 Actions interdites

- édition directe balance ;
- suppression audit ;
- suppression payout ;
- modification policy publiée ;
- suppression fill ;
- modification trade rétroactive sans correction auditable.

---

# 11. Break-glass access

## 11.1 Usage

Uniquement pour incident majeur.

## 11.2 Processus

1. justification ;
2. approbation ;
3. accès temporaire ;
4. MFA ;
5. session enregistrée ;
6. expiration ;
7. revue postérieure.

## 11.3 Aucun accès permanent

Le compte break-glass n’est pas utilisé au quotidien.

---

# 12. Secrets management

## 12.1 Interdictions

Jamais dans :

- Git ;
- README ;
- prompts ;
- tickets ;
- logs ;
- screenshots ;
- analytics ;
- frontend bundle.

## 12.2 Environnements

Secrets distincts :

- local ;
- preview ;
- staging ;
- production.

## 12.3 Rotation

Prévoir :

- owner ;
- fréquence ;
- procédure ;
- impact ;
- révocation.

## 12.4 GitHub Actions

Permissions minimales.

Aucun workflow non approuvé ne reçoit les secrets production.

---

# 13. Sécurité frontend

## 13.1 XSS

- escaping par défaut ;
- aucun HTML non fiable ;
- sanitization explicite si nécessaire ;
- CSP ;
- pas de `dangerouslySetInnerHTML` sans revue.

## 13.2 CSRF

- SameSite ;
- token ou mécanisme adapté ;
- vérification origin ;
- méthodes non-idempotentes protégées.

## 13.3 Clickjacking

- `frame-ancestors` ;
- pas d’iframe Control.

## 13.4 Local storage

Ne pas stocker :

- tokens durables ;
- KYC ;
- secrets ;
- données financières complètes.

## 13.5 Clipboard

Actions de copie explicites.

---

# 14. CSP et headers

Avant production :

```text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Cross-Origin-Opener-Policy
Cross-Origin-Resource-Policy
```

La CSP doit être testée.

Pas de `unsafe-eval` en production.

`unsafe-inline` doit être évité ou strictement contrôlé.

---

# 15. Sécurité API

## 15.1 Validation

Toute entrée est validée.

## 15.2 Auth

Chaque endpoint déclare ses exigences.

## 15.3 Autorisation objet

Vérifier l’accès à la ressource, pas seulement le rôle.

## 15.4 Rate limiting

Par utilisateur, IP et ressource.

## 15.5 Pagination

Limiter taille et coût.

## 15.6 Mass assignment

Les DTO d’écriture n’acceptent que les champs autorisés.

## 15.7 Error leakage

Aucune erreur DB brute dans réponse.

---

# 16. Sécurité WebSocket

## 16.1 Handshake

- token court ;
- validation ;
- expiration ;
- origin ;
- rate limit.

## 16.2 Subscription authorization

Le serveur vérifie chaque channel.

## 16.3 Message validation

Tous les messages sont validés.

## 16.4 Replay

Les commandes sensibles possèdent idempotency key.

## 16.5 Flooding

Limiter :

- messages/seconde ;
- subscriptions ;
- taille payload ;
- connexions.

## 16.6 Disconnect

La déconnexion n’annule pas implicitement une action déjà acceptée.

---

# 17. Sécurité des webhooks

## 17.1 Validation

- signature ;
- timestamp ;
- provider ID ;
- event ID ;
- replay protection ;
- body brut.

## 17.2 Persistance

Stocker l’événement provider avant traitement.

## 17.3 Idempotence

```text
unique(provider, event_id)
```

## 17.4 Réponse

Répondre rapidement, traiter ensuite.

---

# 18. Paiements

## 18.1 Confirmation

Uniquement par webhook serveur valide.

## 18.2 Double paiement

- idempotency ;
- order state ;
- reconciliation ;
- remboursement process.

## 18.3 Manipulation montant

Le serveur contrôle :

- prix ;
- devise ;
- product version ;
- total.

Le client ne fournit pas le montant autoritaire.

## 18.4 PSP sandbox

Aucun provider sandbox autorisé en production.

---

# 19. Payouts

## 19.1 Contrôles

- compte Performance ;
- cycle actif ;
- eligibility snapshot ;
- KYC ;
- payout method ;
- aucun autre payout ouvert ;
- aucune position ;
- aucune contestation bloquante ;
- freeze account.

## 19.2 Double payout

Empêché par :

- unique constraint ;
- idempotency ;
- provider key ;
- state machine ;
- reconciliation.

## 19.3 Double approbation

À activer selon seuil ou risque.

## 19.4 Rejet

Motif structuré obligatoire.

## 19.5 Réserve

Le manque de réserve ne réduit pas un payout déjà gagné.

---

# 20. Trading engine security

## 20.1 Ordre autoritaire

Le serveur ignore tout prix calculé par le client.

## 20.2 Contrôles pré-trade

- account active ;
- market open ;
- price fresh ;
- quantity allowed ;
- margin ;
- risk ;
- news/weekend ;
- idempotency.

## 20.3 Contrôles post-trade

- fill persisted ;
- position updated ;
- ledger updated ;
- risk recalculated ;
- outbox written.

## 20.4 Account lock

Une commande financière par compte à la fois.

## 20.5 Replay

Chaque fill doit être reconstruisible.

---

# 21. Market data security

## 21.1 Integrity

Chaque tick contient :

- provider ;
- symbol ;
- bid ;
- ask ;
- timestamp ;
- sequence.

## 21.2 Stale detection

Le serveur rejette les données périmées.

## 21.3 Gap detection

Détecter trous de sequence.

## 21.4 Sandbox

Seed et version enregistrés.

## 21.5 Production

Provider licencié, credentials protégés.

---

# 22. File uploads

## 22.1 Allowlist

- type ;
- MIME ;
- extension ;
- taille.

## 22.2 Stockage

Privé.

## 22.3 Nom

Généré.

## 22.4 Scanning

Prévoir scan antivirus/malware avant production si le provider le permet.

## 22.5 Images et PDF

Pas de rendu HTML non sécurisé.

## 22.6 URLs

Signed URLs courtes.

---

# 23. Dépendances et supply chain

## 23.1 Avant ajout

Vérifier :

- mainteneur ;
- fréquence ;
- licence ;
- vulnérabilités ;
- poids ;
- usage.

## 23.2 Lockfile

Obligatoire.

## 23.3 CI

- audit ;
- scan ;
- provenance future ;
- SBOM avant public.

## 23.4 Scripts postinstall

Revue renforcée.

## 23.5 Typosquatting

Installation uniquement après vérification du package exact.

---

# 24. Secure SDLC

## 24.1 Avant code

- source de vérité ;
- threat review ;
- critères d’acceptation ;
- test plan.

## 24.2 Pendant code

- branch ;
- lint ;
- types ;
- tests ;
- secrets scan.

## 24.3 PR

- security checklist ;
- risk review ;
- migration review ;
- permission review.

## 24.4 Avant release

- CI ;
- staging ;
- smoke ;
- E2E ;
- audit ciblé ;
- rollback.

---

# 25. Security review triggers

Revue obligatoire lors de :

- auth ;
- RLS ;
- payout ;
- payment ;
- KYC ;
- upload ;
- Control ;
- WebSocket ;
- policy publish ;
- feature flag critique ;
- new provider ;
- migration financière ;
- public launch.

---

# 26. Threat modeling process

Pour chaque feature critique :

```text
Assets
→ Actors
→ Entry points
→ Trust boundaries
→ Abuse cases
→ Controls
→ Residual risk
→ Tests
```

Le résultat est ajouté à la PR ou à un document threat model.

---

# 27. QA strategy

La qualité WARIBA repose sur six couches :

1. statique ;
2. unitaire ;
3. propriété ;
4. intégration ;
5. système/E2E ;
6. opérationnelle.

Aucune couche ne remplace les autres.

---

# 28. Static quality gates

À chaque PR :

- format ;
- lint ;
- typecheck ;
- dependency graph ;
- secret scan ;
- forbidden patterns ;
- build ;
- contract validation.

Patterns interdits à scanner :

- `any` critique ;
- `@ts-ignore` ;
- float financier ;
- secret pattern ;
- hardcoded rule ;
- direct DB access frontend ;
- disabled test ;
- `.only`.

---

# 29. Unit tests

## 29.1 Priorité absolue

- Money ;
- Percentage ;
- ExchangeRate ;
- Daily Loss ;
- Maximum Loss ;
- Consistency ;
- Qualified Days ;
- Profit Target ;
- Payout Base ;
- Split ;
- state machines ;
- permissions.

## 29.2 Format

Given / When / Then.

## 29.3 Pure functions

Les formules critiques doivent être testées indépendamment de DB.

---

# 30. Property-based tests

## 30.1 Risk invariants

Pour toute séquence valide :

- Maximum Loss floor ne monte jamais ;
- soft lock ne devient pas hard breach sans condition ;
- consistance > 40 % ne breach jamais ;
- qualified days ne dépassent pas le nombre de jours finalisés ;
- target latent ne valide pas passage.

## 30.2 Payout invariants

- payout base ≥ 0 ;
- payout base ≤ 50 % profit cycle ;
- payout base ≤ cap ;
- trader cash ≤ payout base ;
- un cycle payé n’est plus payable ;
- aucun payout sans compte gelé ;
- aucun payout sur position ouverte.

## 30.3 Ledger invariants

- balance = somme ledger ;
- reversal ne supprime pas l’original ;
- double event ne double pas résultat.

---

# 31. Integration tests

Couvrent :

- DB ;
- migrations ;
- repositories ;
- transactions ;
- outbox ;
- worker ;
- webhooks ;
- storage ;
- auth ;
- RLS ;
- adapters.

---

# 32. RLS tests

Chaque table protégée possède :

- test owner ;
- test other user ;
- test staff allowed ;
- test staff denied ;
- test anonymous ;
- test service role.

Aucune table sensible sans test.

---

# 33. Migration tests

## 33.1 Fresh install

Toutes migrations depuis zéro.

## 33.2 Upgrade

Version précédente → nouvelle version.

## 33.3 Data integrity

- contraintes ;
- nullability ;
- defaults ;
- indexes ;
- RLS.

## 33.4 Rollback

Stratégie documentée, même si rollback SQL direct impossible.

---

# 34. Contract tests

## 34.1 HTTP

OpenAPI conforme.

## 34.2 WebSocket

Messages conformes.

## 34.3 Providers

Sandbox et production implémentent la même interface.

## 34.4 Policy

JSON conforme au schema.

---

# 35. Concurrency tests

Obligatoires :

- deux order submits même clé ;
- deux order submits différentes simultanées ;
- double close ;
- soft lock pendant order ;
- double payment webhook ;
- double fulfillment ;
- double payout request ;
- double payout approval ;
- worker retry ;
- payout webhook replay.

---

# 36. Realtime tests

## 36.1 Connexion

- auth valide ;
- token expiré ;
- origin invalide ;
- reconnexion.

## 36.2 Séquence

- messages ordonnés ;
- gap ;
- duplication ;
- resync.

## 36.3 Tick

- stale ;
- spread ;
- burst ;
- no data ;
- provider reconnect.

## 36.4 Account state

- risk update ;
- order fill ;
- breach ;
- resync après restart.

---

# 37. E2E critiques

## E2E-001 — Signup

Inscription → vérification → login.

## E2E-002 — Checkout sandbox

Offre → paiement → webhook → activation.

## E2E-003 — Premier trade

Compte actif → order → fill → position.

## E2E-004 — Soft lock

Perte journalière → lock → nouveaux ordres rejetés.

## E2E-005 — Hard breach

Equity floor → compte terminé.

## E2E-006 — Passage

Target + jours + consistance → Performance.

## E2E-007 — Consistance non conforme

Target atteint, ratio 50 % → aucun breach.

## E2E-008 — Payout

Eligibility → request → review → paid → next cycle.

## E2E-009 — Double payout

Retry → une seule demande.

## E2E-010 — Dispute

Violation → preuve → contestation → suivi.

---

# 38. Visual regression

Composants prioritaires :

- Mission Progress ;
- Risk Ribbon ;
- Consistency Meter ;
- Qualified Days ;
- Order Ticket ;
- soft lock ;
- breach ;
- Payout Breakdown ;
- Control payout review ;
- incident mode.

Viewports :

- 320 ;
- 375 ;
- 390 ;
- 768 ;
- 1024 ;
- 1280 ;
- 1440 ;
- 1920.

---

# 39. Accessibility QA

## 39.1 Automatisé

- axe ou équivalent ;
- labels ;
- contrastes de base ;
- landmarks ;
- form errors.

## 39.2 Manuel

- clavier ;
- focus ;
- screen reader ;
- zoom 200 % ;
- mobile touch ;
- reduced motion.

## 39.3 Parcours obligatoires

- signup ;
- checkout ;
- Hub ;
- Trade ;
- payout ;
- dispute.

---

# 40. Mobile QA

Tester :

- réseau lent ;
- perte réseau ;
- orientation ;
- clavier virtuel ;
- safe areas ;
- petite hauteur ;
- tactile ;
- scroll ;
- bottom sheet ;
- PWA installée.

Aucun bouton critique masqué par le clavier.

---

# 41. Cross-browser QA

Cibles initiales :

- Chrome desktop ;
- Edge desktop ;
- Safari desktop ;
- Firefox desktop ;
- Safari iOS ;
- Chrome Android.

La matrice exacte est figée avant bêta.

---

# 42. Performance testing

## 42.1 Frontend

- LCP ;
- INP ;
- CLS ;
- bundle ;
- hydration ;
- chart load.

## 42.2 API

- p50 ;
- p95 ;
- p99 ;
- error rate.

## 42.3 Realtime

- connection count ;
- tick fanout ;
- order ack ;
- risk update ;
- reconnect storm.

## 42.4 Database

- locks ;
- slow queries ;
- index usage ;
- connection pool ;
- deadlocks.

---

# 43. Load test scenarios

## 43.1 Bêta

- 25 traders connectés ;
- 5 symboles ;
- 10 comptes actifs ;
- 20 ordres/minute.

## 43.2 Pre-public

- 100 connexions ;
- 50 comptes exposés ;
- 100 ordres/minute ;
- burst news.

## 43.3 Stress

- reconnexion simultanée ;
- worker backlog ;
- provider lag ;
- DB latency.

---

# 44. Resilience tests

## 44.1 Realtime restart

Attendu :

- reprise ;
- resync ;
- aucune perte durable ;
- aucun double order.

## 44.2 Worker restart

Attendu :

- jobs repris ;
- pas de double notification critique ;
- pas de double payout.

## 44.3 Market provider outage

Attendu :

- stale detection ;
- close-only/paused ;
- incident ;
- pas de faux prix.

## 44.4 DB fail

Attendu :

- fail closed ;
- maintenance ;
- aucune opération financière.

## 44.5 PSP timeout

Attendu :

- pending ;
- reconciliation ;
- pas de double payment/payout.

---

# 45. Chaos testing

Pas avant stabilité de bêta.

Introduire contrôlé :

- latency ;
- dropped messages ;
- duplicate webhook ;
- worker crash ;
- stale ticks ;
- DB connection loss.

Toujours en staging.

---

# 46. Test data management

## 46.1 Aucune donnée production

En local/preview/staging.

## 46.2 Seeds

Déterministes.

## 46.3 PII

Fictive.

## 46.4 Scénarios

Étiquetés `demo`, `sandbox`, `test`.

---

# 47. Bug severity

| Niveau | Définition | Exemple |
|---|---|---|
| S0 | Risque critique immédiat | double payout, corruption ledger |
| S1 | Fonction critique indisponible | trading ou payout bloqué |
| S2 | Fonction importante dégradée | Mission incorrecte non financière |
| S3 | Défaut mineur | UI, texte, spacing |

---

# 48. Bug priority

La priorité dépend de :

- sévérité ;
- fréquence ;
- exposition ;
- contournement ;
- risque financier ;
- risque confiance ;
- risque légal.

Un bug financier rare peut être prioritaire sur un bug UI fréquent.

---

# 49. Release blockers

Bloque toute release :

- CI rouge ;
- test critique échoué ;
- RLS manquant ;
- secret exposé ;
- migration non validée ;
- erreur de payout ;
- erreur de balance ;
- hardcoded policy ;
- divergence Rulebook/code ;
- backup non testé avant public ;
- rollback inconnu ;
- vulnérabilité critique non traitée.

---

# 50. QA sign-off

Avant staging :

- developer sign-off ;
- QA sign-off ;
- security sign-off si critique ;
- product sign-off ;
- risk/finance sign-off si règle ou payout.

---

# 51. Definition of Done sécurité

Une feature critique est terminée lorsque :

- threat model ;
- auth ;
- permission ;
- validation ;
- audit ;
- idempotence ;
- tests ;
- monitoring ;
- error handling ;
- runbook ;
- docs.

---

# 52. Observabilité

## 52.1 Trois piliers

- logs ;
- metrics ;
- traces.

## 52.2 Quatrième pilier produit

- événements métier auditables.

## 52.3 Correlation

Même ID de l’entrée à la fin.

---

# 53. Logs

## 53.1 Format

JSON structuré.

## 53.2 Champs minimums

```text
timestamp
level
service
module
environment
event
correlationId
requestId
userIdHash
accountId
durationMs
errorCode
```

## 53.3 Données interdites

- password ;
- token ;
- secret ;
- document KYC ;
- card data ;
- numéro complet ;
- raw provider payload sensible.

---

# 54. Metrics techniques

## Web/BFF

- requests ;
- latency ;
- error rate ;
- auth failure ;
- checkout conversion technique.

## Realtime

- active sockets ;
- reconnects ;
- message lag ;
- tick lag ;
- stale symbols ;
- order ack ;
- fill latency ;
- event loop lag.

## Worker

- queue depth ;
- oldest job ;
- retries ;
- dead-letter ;
- provider errors.

## DB

- connections ;
- locks ;
- deadlocks ;
- slow queries ;
- replication/backup status.

---

# 55. Metrics métier critiques

- payment confirmed ;
- account activated ;
- orders accepted/rejected ;
- soft locks ;
- breaches ;
- target reached ;
- passes ;
- payout eligible ;
- payout requested ;
- payout approved ;
- payout paid ;
- payout failed ;
- reserve coverage ;
- disputes.

---

# 56. Alerting

## 56.1 Actionnable

Chaque alerte possède :

- owner ;
- seuil ;
- runbook ;
- urgence ;
- canal.

## 56.2 Interdictions

- alertes sans action ;
- alertes trop fréquentes ;
- seuils arbitraires sans validation.

---

# 57. Alertes S0/S1

- double payout detected ;
- ledger mismatch ;
- RLS bypass ;
- production sandbox provider ;
- DB unavailable ;
- market data stale global ;
- payout provider duplicate ;
- unauthorized admin action ;
- audit write failure ;
- reserve coverage critique ;
- secret exposure.

---

# 58. Dashboards

## 58.1 Platform health

- Web ;
- Realtime ;
- Worker ;
- DB ;
- providers.

## 58.2 Trading

- ticks ;
- orders ;
- latency ;
- rejects ;
- stale.

## 58.3 Risk

- locks ;
- breaches ;
- calculation errors ;
- replay divergence.

## 58.4 Payments/Payouts

- pending ;
- failed ;
- age ;
- duplicates ;
- reconciliation.

## 58.5 Treasury

- reserve ;
- projected payouts ;
- coverage ;
- status.

---

# 59. SLO internes candidats

| Service | Cible bêta |
|---|---:|
| Web/BFF | 99,5 % |
| Realtime | 99,5 % |
| Worker | 99,5 % |
| Order ack/reject p95 | < 750 ms |
| Risk update p95 | < 500 ms |
| API read p95 | < 500 ms |
| Webhook processing p95 | < 5 s |
| Queue age critique | < 60 s |

Ces valeurs sont internes et révisables.

---

# 60. Error budgets

Lorsque le budget erreur est dépassé :

- réduire changement ;
- prioriser fiabilité ;
- suspendre feature rollout ;
- corriger causes racines.

Pas de nouvelle promotion si le système payout est instable.

---

# 61. Runbooks obligatoires

Avant bêta :

1. Web down ;
2. Realtime down ;
3. Worker backlog ;
4. Market data stale ;
5. Payment webhook failed ;
6. Payout stuck ;
7. Ledger mismatch ;
8. Balance divergence ;
9. RLS incident ;
10. Secret exposure ;
11. Bad deployment ;
12. DB restore ;
13. Soft lock anomaly ;
14. Hard breach dispute ;
15. Reserve critical.

---

# 62. Format runbook

```text
Title
Severity
Symptoms
Detection
Immediate actions
Safety mode
Diagnosis
Recovery
Validation
Communication
Escalation
Post-incident
Owner
```

---

# 63. Incident severity

| Niveau | Définition |
|---|---|
| SEV-0 | risque financier/sécurité majeur actif |
| SEV-1 | fonction critique indisponible |
| SEV-2 | dégradation importante |
| SEV-3 | incident mineur |

---

# 64. Incident command

Pour SEV-0/1 :

- Incident Commander ;
- Technical Lead ;
- Operations/Support Lead ;
- Communications Lead ;
- Scribe.

Une personne peut couvrir plusieurs rôles en petite équipe, mais les responsabilités sont nommées.

---

# 65. Incident lifecycle

```text
Detected
→ Acknowledged
→ Contained
→ Investigating
→ Recovering
→ Monitoring
→ Resolved
→ Postmortem
```

---

# 66. Containment actions

- close-only ;
- pause symbol ;
- disable checkout ;
- disable payout request ;
- freeze payout processing ;
- maintenance ;
- revoke secret ;
- revoke session ;
- disable feature flag.

Toutes les actions sont auditables.

---

# 67. Communication incident

## 67.1 Interne

- facts ;
- impact ;
- actions ;
- next update.

## 67.2 Utilisateur

- impact observable ;
- fonctions affectées ;
- sécurité des comptes ;
- prochaine mise à jour ;
- aucune spéculation.

## 67.3 Post-incident

- cause ;
- durée ;
- impact ;
- correction ;
- prévention.

---

# 68. Postmortem

Sans blâme.

Contient :

- timeline ;
- cause ;
- contributing factors ;
- detection gaps ;
- response gaps ;
- impact ;
- actions ;
- owners ;
- deadlines.

---

# 69. Sauvegardes

## 69.1 Données critiques

- PostgreSQL ;
- policies ;
- symbol specs ;
- audit ;
- storage restricted ;
- configuration.

## 69.2 Exigences

- automatisées ;
- chiffrées ;
- rétention ;
- monitoring ;
- restauration testée.

## 69.3 Séparation

Backup credentials séparés.

---

# 70. RPO/RTO candidats

| Élément | RPO | RTO |
|---|---:|---:|
| Données financières | ≤ 5 min | ≤ 2 h |
| Auth/profile | ≤ 15 min | ≤ 2 h |
| Help content | ≤ 24 h | ≤ 4 h |
| Status page | N/A | ≤ 15 min |
| Lecture seule | ≤ 15 min | ≤ 30 min |

---

# 71. Restore testing

Avant public :

- restauration DB staging ;
- vérification ledger ;
- vérification policies ;
- vérification auth ;
- vérification storage ;
- rapport.

À répéter régulièrement.

---

# 72. Disaster recovery

Scénarios :

- région indisponible ;
- base corrompue ;
- provider perdu ;
- secret compromis ;
- suppression accidentelle ;
- migration destructive.

Le DR complet multi-région n’est pas requis en V1, mais le plan doit exister.

---

# 73. Business continuity

En cas de panne prolongée :

- suspendre trading ;
- protéger positions selon policy ;
- figer payouts ;
- communiquer ;
- préserver preuves ;
- reprendre depuis snapshot.

Aucune improvisation pendant incident.

---

# 74. Maintenance

## 74.1 Planifiée

- annoncée ;
- fenêtre ;
- impact ;
- status page ;
- validation.

## 74.2 Non planifiée

Incident.

## 74.3 Trading

La maintenance ne doit pas laisser croire que les positions sont gérées si ce n’est pas le cas.

---

# 75. Change management

## 75.1 Types

- standard ;
- normal ;
- emergency.

## 75.2 Standard

Faible risque, procédure connue.

## 75.3 Normal

PR, tests, approval.

## 75.4 Emergency

Incident, approval accélérée, post-review obligatoire.

---

# 76. Release process

```text
PR
→ CI
→ Review
→ Merge
→ Staging
→ Migration staging
→ Smoke
→ E2E
→ Approval
→ Backup
→ Production
→ Smoke
→ Monitoring
```

---

# 77. Release checklist

- [ ] version identifiée ;
- [ ] changelog ;
- [ ] migrations ;
- [ ] backup ;
- [ ] rollback ;
- [ ] feature flags ;
- [ ] policy impact ;
- [ ] provider impact ;
- [ ] support informed ;
- [ ] monitoring ready ;
- [ ] status page ready.

---

# 78. Rollback

## 78.1 Application

Revenir à l’artefact précédent.

## 78.2 Database

- pas de rollback destructif aveugle ;
- forward fix ou expand-contract ;
- décision explicite.

## 78.3 Policy

Policy publiée immuable.

Pas de rollback par édition.

---

# 79. Production access

## 79.1 Limité

Seuls rôles nécessaires.

## 79.2 Journalisé

Toute session.

## 79.3 Pas de DB GUI libre

Accès direct exceptionnel.

## 79.4 Read-only

Privilégier lecture.

---

# 80. On-call

Avant public :

- owner principal ;
- backup ;
- horaires ;
- canal ;
- escalade ;
- runbooks.

La petite équipe doit rester réaliste sur la couverture.

---

# 81. Support operations

## 81.1 Catégories

- account ;
- rules ;
- trade ;
- violation ;
- payment ;
- payout ;
- KYC ;
- security ;
- incident.

## 81.2 Priorité

Alignée avec severity.

## 81.3 Escalade

- Support → Risk ;
- Support → Finance ;
- Support → Security ;
- Support → Technical ;
- Support → Legal.

---

# 82. Disputes

## 82.1 Preuve

- policy ;
- calculation ;
- timestamps ;
- orders/fills ;
- price snapshots ;
- logs partageables.

## 82.2 Indépendance

La décision finale ne doit pas être prise uniquement par l’auteur initial lorsque possible.

## 82.3 Audit

Chaque étape.

---

# 83. Fraud and integrity operations

## 83.1 Signals

- device anomalies ;
- identity mismatch ;
- payment mismatch ;
- pattern collusion ;
- opposite hedging ;
- stale exploitation ;
- API abuse.

## 83.2 Decision

Signal ≠ sanction.

## 83.3 Human review

Obligatoire pour :

- reject payout ;
- ban ;
- permanent freeze.

---

# 84. Treasury operations

## 84.1 Daily checks

- reserve ;
- payable ;
- provider balances ;
- pending payouts ;
- projected 30-day payouts ;
- coverage.

## 84.2 Thresholds

- ≥ 2,0x normal ;
- 1,5–2,0 prudence ;
- 1,2–1,5 défensif ;
- < 1,2 critique.

## 84.3 Actions

- suspendre les nouvelles ventes des tailles à plus forte exposition ;
- réduire promotions ;
- limiter ventes ;
- alimenter réserve.

Jamais réduire un payout gagné.

---

# 85. Reconciliation

## 85.1 Payments

Comparer :

- provider events ;
- payment attempts ;
- purchase orders ;
- receipts ;
- fulfillment.

## 85.2 Payouts

Comparer :

- payout requests ;
- provider transfers ;
- ledger debit ;
- cycle close ;
- receipt.

## 85.3 Trading

Comparer :

- fills ;
- positions ;
- ledger ;
- snapshots.

---

# 86. Daily operational checks

- service health ;
- stale symbols ;
- queue age ;
- failed webhooks ;
- payout age ;
- ledger mismatch ;
- backup status ;
- security alerts ;
- reserve coverage ;
- support backlog.

---

# 87. Weekly operational review

- incidents ;
- error budget ;
- payouts ;
- pass/breach patterns ;
- fraud signals ;
- QA defects ;
- release quality ;
- backup test status ;
- costs ;
- Decision Log.

---

# 88. Monthly risk review

- pass rate ;
- payout rate ;
- cap utilization ;
- reserve ;
- dispute rate ;
- breach distribution ;
- unusual execution ;
- support drivers ;
- security findings ;
- provider risk.

---

# 89. Private beta gates

Avant premier bêta-testeur :

- no real payments ;
- no real payouts ;
- sandbox providers ;
- CI verte ;
- RLS tests ;
- auth ;
- account isolation ;
- deterministic market ;
- order flow ;
- risk tests ;
- payout sandbox ;
- Control ;
- audit ;
- monitoring ;
- status ;
- incident runbooks ;
- backups local/staging ;
- support owner.

---

# 90. Paid beta gates

Avant premier paiement réel :

- legal gate ;
- PSP contract ;
- webhook security ;
- refund policy ;
- KYC path ;
- payment reconciliation ;
- security review ;
- production secrets ;
- backup restore ;
- support ;
- incident communication.

---

# 91. Real payout gates

Avant premier payout réel :

- payout provider/rail ;
- KYC ;
- beneficiary match ;
- payout formula tests ;
- double payout tests ;
- finance RBAC ;
- dual approval rule ;
- reconciliation ;
- reserve funded ;
- treasury ledger/process ;
- payout runbook ;
- failure simulation.

---

# 92. Public launch gates

- security audit ;
- legal approval ;
- data license ;
- PSP ;
- KYC ;
- support ;
- privacy ;
- backup restore ;
- status page ;
- SLO monitoring ;
- incident drill ;
- load test ;
- vulnerability triage ;
- policy/rules parity ;
- gates commerciaux indépendants 5K/10K/25K/50K/100K ;
- reserve coverage ;
- no critical open bugs.

---

# 93. Security testing before public

- SAST ;
- dependency scan ;
- secret scan ;
- DAST ciblé ;
- auth abuse ;
- RLS abuse ;
- API authorization ;
- WebSocket authorization ;
- upload abuse ;
- webhook replay ;
- rate limit ;
- session fixation ;
- CSP ;
- headers ;
- admin privilege tests.

## 93.1 Preuve de construction Prompts 01 à 04 — 2026-08-03

- `pnpm audit --prod` : aucune vulnérabilité connue après mise à niveau de Kysely 0.28.17 et overrides PostCSS 8.5.18 / Sharp 0.35.3 ;
- secret scan : vert ;
- tests RLS réels : 15/15 ;
- tests WebSocket auth/isolation/reconnexion réels : 7/7 ;
- aucune de ces preuves ne remplace l'audit indépendant Prompt 12 ni la sélection du scanner final SQO-006.

---

# 94. Penetration testing

Avant scale public :

- externe ou indépendant ;
- scope défini ;
- retest ;
- rapport ;
- remediation.

Au minimum, audit approfondi indépendant de :

- auth ;
- RLS ;
- Control ;
- payment ;
- payout ;
- WebSocket.

---

# 95. Vulnerability management

## 95.1 Severity

- Critical ;
- High ;
- Medium ;
- Low.

## 95.2 SLA interne candidat

| Severity | Délai cible |
|---|---:|
| Critical | immédiat / 24 h |
| High | 7 jours |
| Medium | 30 jours |
| Low | planifié |

Les délais sont internes, non contractuels.

---

# 96. Responsible disclosure

Avant public :

- canal sécurité ;
- instructions ;
- accusé de réception ;
- triage ;
- aucune promesse de bounty sans programme réel.

---

# 97. Privacy operations

## 97.1 Data inventory

Maintenir :

- donnée ;
- finalité ;
- source ;
- owner ;
- stockage ;
- accès ;
- rétention ;
- suppression.

## 97.2 Access requests

Processus futur selon obligations applicables.

## 97.3 Deletion

Ne pas supprimer ce qui doit être conservé légalement ou pour audit sans politique.

## 97.4 Logs

Pseudonymisés.

---

# 98. Retention

Statut : `OPEN` avant production.

Classes à définir :

- auth/session ;
- trading ;
- payouts ;
- audit ;
- KYC ;
- support ;
- analytics ;
- backups.

Aucune durée légale n’est inventée.

---

# 99. Data deletion process

- request ;
- identity verification ;
- legal check ;
- scope ;
- execute ;
- audit ;
- confirmation.

Les événements financiers peuvent être anonymisés plutôt que supprimés si nécessaire.

---

# 100. Key management

- provider-managed encryption ;
- secrets rotation ;
- least privilege ;
- no shared personal accounts ;
- key inventory ;
- revoke procedure.

---

# 101. Environment isolation

## Local

Aucune donnée réelle.

## Preview

Aucune donnée réelle.

## Staging

Données fictives.

## Production

Accès contrôlé.

Aucun copier-coller de production vers staging sans anonymisation approuvée.

---

# 102. Configuration safety

Au démarrage :

- validate env ;
- refuse sandbox provider en production ;
- refuse missing secret ;
- refuse invalid URLs ;
- refuse weak control config ;
- refuse unversioned policy.

---

# 103. Feature flag safety

## 103.1 Flags critiques

- 25K ;
- payments ;
- payouts ;
- trading ;
- symbol ;
- maintenance.

## 103.2 Audit

Toute modification.

## 103.3 Safe default

Off.

## 103.4 Expiration

Les flags temporaires possèdent owner et date de revue.

---

# 104. QA environments

## Local

Développement rapide.

## CI

Tests déterministes.

## Preview

Visual/UX.

## Staging

E2E, load, security.

## Production

Smoke non destructif.

---

# 105. Smoke tests production

Après release :

- homepage ;
- login ;
- Hub read ;
- WebSocket handshake ;
- market status ;
- health ;
- payment provider health non transactionnel ;
- worker ;
- Control login.

Pas de vrai paiement ou payout automatique en smoke.

---

# 106. Synthetic monitoring

Scénarios non financiers :

- public page ;
- auth page ;
- health ;
- read-only API ;
- WebSocket connect.

Utilisateurs synthétiques clairement identifiés.

---

# 107. Database operations

## 107.1 Query review

Toute query critique analysée.

## 107.2 Slow query threshold

Défini et monitoré.

## 107.3 Locks

Monitorer :

- duration ;
- deadlock ;
- contention.

## 107.4 Connection pool

Limiter et surveiller.

---

# 108. Data integrity checks

Jobs réguliers :

- ledger vs balance ;
- positions vs fills ;
- payout vs ledger ;
- payment vs fulfillment ;
- account status vs transition ;
- policy reference valid ;
- orphan rows ;
- outbox backlog.

---

# 109. Calculation integrity

## 109.1 Golden scenarios

Scénarios de référence validés par Risk/Finance.

## 109.2 Version

Chaque calcul enregistre version.

## 109.3 Diff test

Nouvelle version comparée sur historique synthétique.

## 109.4 Approval

Toute modification calcul critique requiert Risk + Engineering.

---

# 110. Policy parity

CI vérifie :

- Rulebook parameters ;
- policy JSON ;
- seed DB ;
- UI labels ;
- tests.

Un écart bloque.

---

# 111. Symbol specification parity

CI ou test vérifie :

- precision ;
- leverage ;
- margin ;
- sessions ;
- weekend ;
- commission ;
- swap ;
- stale threshold.

---

# 112. Security ownership

| Domaine | Owner primaire |
|---|---|
| Auth/RBAC | Security/Engineering |
| RLS | Database/Security |
| Trading | Trading Engineering |
| Risk | CRO/Risk Engineering |
| Payout | Finance + Engineering |
| Payments | Payments Lead |
| Control | Security + Operations |
| Infra | SRE |
| Privacy | Privacy Lead |
| Incidents | Incident Commander |
| QA | QA Lead |

---

# 113. QA ownership

| Test | Owner |
|---|---|
| Unit | Développeur |
| Property | Quant/Risk + Développeur |
| Integration | Backend/QA |
| RLS | Database/Security |
| E2E | QA/Product |
| Visual | Frontend/Design |
| Accessibility | Frontend/QA |
| Load | SRE/Realtime |
| Security | Security |

---

# 114. Operations ownership

| Processus | Owner |
|---|---|
| Release | Engineering/SRE |
| Backup | SRE/Database |
| Payment reconciliation | Payments/Finance |
| Payout reconciliation | Finance |
| Market operations | Trading/Market Data |
| Support | Customer Operations |
| Disputes | Risk/Operations |
| Reserve | CFO/Treasury |
| Incident response | Incident Commander |

---

# 115. Agent IA controls

## 115.1 Agents IA mandatés

Codex, Claude Code ou tout autre agent IA explicitement mandaté peut :

- écrire code ;
- écrire tests ;
- créer migrations ;
- préparer PR.

Ne peut pas :

- accéder production ;
- voir secrets ;
- fusionner seul ;
- changer règle ;
- approuver payout ;
- désactiver sécurité.

## 115.2 Audit indépendant

Un agent IA distinct de l’implémentation auditée intervient sur branche ou snapshot lorsqu’un audit indépendant est requis.

Aucun accès production.

## 115.3 Prompt security

Ne jamais inclure :

- secrets ;
- KYC ;
- données réelles ;
- tokens ;
- provider credentials.

## 115.4 Review

Tout code généré est relu et testé.

---

# 116. Security PR checklist

- [ ] Input validated.
- [ ] Auth required.
- [ ] Object authorization.
- [ ] RLS tested.
- [ ] Secrets absent.
- [ ] Sensitive logs absent.
- [ ] Rate limit considered.
- [ ] Idempotency considered.
- [ ] Audit added.
- [ ] Error leakage checked.
- [ ] File upload safe.
- [ ] Provider webhook verified.
- [ ] Threat cases tested.

---

# 117. QA PR checklist

- [ ] Acceptance criteria mapped.
- [ ] Unit tests.
- [ ] Edge cases.
- [ ] Negative cases.
- [ ] Concurrency if relevant.
- [ ] Integration tests.
- [ ] E2E if critical.
- [ ] Mobile.
- [ ] Accessibility.
- [ ] Visual states.
- [ ] CI green.

---

# 118. Operations PR checklist

- [ ] Metrics.
- [ ] Logs.
- [ ] Alerts.
- [ ] Runbook.
- [ ] Feature flag.
- [ ] Rollback.
- [ ] Migration plan.
- [ ] Provider failure mode.
- [ ] Support impact.
- [ ] Changelog.

---

# 119. Launch decision framework

Une fonctionnalité critique peut être :

- `READY_FOR_LOCAL`
- `READY_FOR_PREVIEW`
- `READY_FOR_STAGING`
- `READY_FOR_PRIVATE_BETA`
- `READY_FOR_PAID_BETA`
- `READY_FOR_PUBLIC`
- `BLOCKED`

Chaque statut possède des gates.

---

# 120. Decision Log initial

| ID | Décision | Statut | Motif |
|---|---|---|---|
| SQO-001 | Deny by default | `LOCKED` | Sécurité |
| SQO-002 | MFA staff | `LOCKED` | Control |
| SQO-003 | RLS obligatoire | `LOCKED` | Isolation |
| SQO-004 | Double payout impossible par design | `LOCKED` | Finance |
| SQO-005 | Audit append-only | `LOCKED` | Preuve |
| SQO-006 | CI obligatoire | `LOCKED` | Qualité |
| SQO-007 | Property tests financiers | `LOCKED` | Invariants |
| SQO-008 | Concurrency tests | `LOCKED` | Race conditions |
| SQO-009 | Staging avant production | `LOCKED` | Fiabilité |
| SQO-010 | Production manuelle | `LOCKED` | Contrôle |
| SQO-011 | Restore test avant public | `LOCKED` | Reprise |
| SQO-012 | Runbooks avant bêta | `LOCKED` | Opérations |
| SQO-013 | Pen test avant scale public | `CANDIDATE` | Assurance |
| SQO-014 | 25K désactivé par défaut | `SUPERSEDED` | Remplacé par SQO-021 / OFFER-023 |
| SQO-015 | Aucun paiement réel en première bêta | `LOCKED` | Réduction risque |
| SQO-016 | Aucun payout réel sans KYC/reconciliation | `LOCKED` | Finance |
| SQO-017 | Sandbox interdit en production | `LOCKED` | Sécurité |
| SQO-018 | Retention policy | `OPEN` | Juridique/privacy |
| SQO-019 | Exact SLO production | `OPEN` | Mesure |
| SQO-020 | Vulnerability disclosure | `CANDIDATE` | Public launch |
| SQO-021 | Cinq tailles actives en sandbox, flags indépendants et révocables | `LOCKED` | Couverture E2E sans autorisation de vente publique |

---

# 121. Décisions ouvertes

1. provider observabilité ;
2. provider status page ;
3. provider error tracking ;
4. DAST tool ;
5. SAST tool final ;
6. dependency scanner final ;
7. antivirus uploads ;
8. pen test provider ;
9. retention ;
10. incident communication channel ;
11. on-call tooling ;
12. backup retention ;
13. exact RPO/RTO production ;
14. exact SLO production ;
15. dual approval threshold ;
16. Control device policy ;
17. IP allowlist future ;
18. responsible disclosure ;
19. WAF/CDN ;
20. vulnerability SLA public ;
21. security contact ;
22. support SLA ;
23. payout SLA ;
24. emergency maintenance policy ;
25. data export controls.

---

# 122. Audit des 35 rôles

| # | Rôle | Exigence Security/QA/Ops |
|---:|---|---|
| 1 | CEO | Confiance avant croissance. |
| 2 | COO | Runbooks et responsabilités. |
| 3 | CFO | Réconciliation et réserve. |
| 4 | CPO | Gates alignés sur expérience. |
| 5 | Chief of Staff | Decision Log. |
| 6 | Market Strategist | Résilience réseau/mobile. |
| 7 | Brand Strategist | Incident communication crédible. |
| 8 | Art Director | États critiques cohérents. |
| 9 | Content Strategist | Messages précis. |
| 10 | Growth Lead | Pas de scale si error budget dépassé. |
| 11 | Product Manager | Release blockers. |
| 12 | UX Researcher | Tests utilisateurs. |
| 13 | Information Architect | Permissions et navigation. |
| 14 | Product Designer | États loading/error/offline. |
| 15 | Design System Lead | Visual regression. |
| 16 | CRO | Invariants risk. |
| 17 | Market Specialist | Market incident handling. |
| 18 | Execution Specialist | Order/fill integrity. |
| 19 | Quant Analyst | Property tests. |
| 20 | Market Data Engineer | Stale/gap resilience. |
| 21 | Software Architect | Defense in depth. |
| 22 | Frontend Lead | XSS/CSP/accessibility. |
| 23 | Backend Lead | Idempotence/transactions. |
| 24 | Database Architect | RLS/backups/integrity. |
| 25 | Realtime Engineer | Flooding/reconnect/resync. |
| 26 | Security Engineer | Threat model and controls. |
| 27 | SRE | SLO, alerts, recovery. |
| 28 | QA Lead | Multi-layer QA. |
| 29 | Payments Lead | Webhook/reconciliation. |
| 30 | Fraud Lead | Human-reviewed signals. |
| 31 | Legal Counsel | Evidence and retention gates. |
| 32 | Privacy Lead | Classification/minimization. |
| 33 | Customer Operations | Support/disputes/incidents. |
| 34 | AI Lead | No secret or production access. |
| 35 | Community/Affiliate Lead | No growth during instability. |

---

# 123. Definition of Done du standard

Ce document est considéré complet lorsque :

1. les principaux actifs sont classifiés ;
2. les menaces initiales sont couvertes ;
3. les frontières sont définies ;
4. auth, RBAC et RLS sont cadrés ;
5. payment/payout/trading sont sécurisés ;
6. le QA model est complet ;
7. les tests critiques sont listés ;
8. les release blockers sont définis ;
9. l’observabilité est définie ;
10. les incidents sont définis ;
11. les sauvegardes et restore sont définis ;
12. les gates bêta/public sont définis ;
13. les responsabilités sont attribuées ;
14. les décisions ouvertes sont enregistrées ;
15. tout agent IA mandaté peut implémenter les fondations sans inventer les contrôles.

---

# 124. Gates avant Build Plan

Le Build Plan peut commencer lorsque :

- Product Master validé ;
- Rulebook validé ;
- Financial Model disponible ;
- UX Architecture validée ;
- Design System validé ;
- Engineering Constitution validée ;
- System Architecture validée ;
- Security/QA/Ops Standard validé ;
- dépôt GitHub créé ;
- aucune architecture majeure restante nécessaire à la première semaine.

---

# 125. Conclusion

WARIBA doit être capable de prouver trois choses :

1. le système a calculé correctement ;
2. seules les personnes autorisées ont agi ;
3. une panne ou une erreur ne peut pas produire silencieusement une perte de contrôle.

La sécurité de WARIBA ne repose pas sur une simple page de connexion.

Elle repose sur :

- RLS ;
- RBAC ;
- transactions ;
- idempotence ;
- audit ;
- tests ;
- monitoring ;
- sauvegardes ;
- procédures ;
- responsabilités ;
- décisions humaines documentées.

La qualité ne signifie pas seulement que l’application fonctionne.

Elle signifie que WARIBA continue à produire un résultat fiable lorsque :

- deux requêtes arrivent ;
- un provider répond deux fois ;
- le réseau tombe ;
- le prix devient stale ;
- le worker redémarre ;
- un opérateur se trompe ;
- un utilisateur conteste ;
- une release échoue.

Cette version 1.0 devient la source de vérité pour l’assurance qualité, la sécurité et les opérations de WARIBA. Aucun prompt, agent ou développeur ne peut supprimer un contrôle critique pour accélérer la livraison sans Decision Log, analyse de risque et approbation explicite.
