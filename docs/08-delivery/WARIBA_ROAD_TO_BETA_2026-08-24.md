# WARIBA — état du produit et route vers la bêta privée

```text
DATE          = 2026-08-24
BRANCH        = feat/wariba-phase-3-private-beta-completion
STATUT        = document vivant — remplace les plans de séquencement antérieurs
REMPLACE      = WARIBA_PHASE_3_GAP_CONTRACT.md §12 (séquencement)
SOURCE        = WARIBA_PRODUCT_OS_MASTER_IMPLEMENTATION_MATRIX_2026-08-23.csv
```

Ce document existe parce que la documentation avait pris du retard sur le code.
Trois tranches ont été livrées depuis le dernier audit et six exigences du
Product OS Master ont changé d'état sans que le plan soit réécrit. Il donne
donc deux choses : **où en est réellement le produit**, et **ce qu'il reste
avant qu'un testeur externe puisse s'en servir**.

Tous les chiffres viennent de la matrice, pas d'une appréciation.

---

## 1. Où en est le produit

```text
PRODUCT_OS_REQUIREMENT_COVERAGE = 80.4%   (145.50 / 181)
CRITICAL_PRODUCT_COMPLETENESS   = 81.3%   (126.00 / 155, P0+P1)
P0_ONLY                         = 87.7%   ( 44.75 /  51)

PRIVATE_BETA_PRODUCT_READY      = no
```

Progression depuis l'audit du 23 août :

| Mesure | Audit 23/08 | Après 3.1A | Après 3.2 | Après Help Center |
|---|--:|--:|--:|--:|
| Couverture | 77,1 % | 77,1 % | 79,6 % | **80,4 %** |
| Critique (P0+P1) | 77,4 % | 77,4 % | 80,3 % | **81,3 %** |
| P0 seul | 79,4 % | 79,4 % | 87,7 % | **87,7 %** |

Le bond P0 vient entièrement de la tranche Support + Contestations : la dette
était concentrée dans la bande critique, exactement là où l'audit l'avait
située.

### Les dix plus grandes lacunes de l'audit, revisitées

| # | Lacune | 23/08 | Aujourd'hui |
|--:|---|---|---|
| 1 | Aucun déploiement | MISSING | **PARTIEL** — Dockerfiles realtime/worker, `.env.example`, health/readiness. Aucun environnement n'a encore tourné ailleurs que sur localhost. |
| 2 | Aucun système de support | MISSING | **FAIT** — `app.support_tickets`, `app.ticket_messages`, file Control, RLS, audit. |
| 3 | Aucune contestation | MISSING | **FAIT** — `app.contestations`, preuve liée par identifiants, file Control, décision auditée. |
| 4 | KYC sans provider ni file | UI_ONLY | inchangé — `KYC_PROVIDER_INTEGRATED = false`. |
| 5 | Restauration jamais prouvée | MISSING | inchangé — `pnpm test:recovery` redémarre le realtime, ne restaure pas une base. |
| 6 | Providers externes non branchés | BLOCKED | inchangé — market data, e-mail, PSP, payout : adaptateurs prêts, décisions non prises. |
| 7 | Files opérateur absentes | MISSING | **PARTIEL** — Support et Contestations existent ; Pass Review et KYC manquent. |
| 8 | `/status` absent | MISSING | inchangé — `OPS-010` `LOCKED` non satisfait. L'article d'aide dit maintenant explicitement qu'aucune page d'état n'est publiée. |
| 9 | WariX : vues non sérialisables, 2 indicateurs sur 7 | MISSING | inchangé — l'aide publie EMA et SMA, pas sept. |
| 10 | `/profil`, `/comptes/{id}`, `/parametres` | MISSING | inchangé. |

Deux `VETO` de l'audit sont levés (trader prop-firm, support client). **Quatre
restent** : fondateur (déploiement), opérations prop-firm (files Pass Review et
KYC), opérations payout (aucun provider), conformité (aucun KYC).

---

## 2. Ce qui reste — 56 exigences ouvertes

Réparties par tranche recommandée, telles que la matrice les porte :

```text
tranche 3.3   15 exigences   dont  2 P0
tranche 3.4   12 exigences   dont  0 P0
tranche 3.5   16 exigences   dont 12 P0
tranche 3.6    4 exigences   dont  1 P0
WariX (3.2*)   5 exigences   dont  0 P0
gouvernance    4 exigences   dont  0 P0
```

`*` Cinq exigences WariX portent encore l'étiquette 3.2 dans la matrice ; elles
appartiennent à la tranche WariX Professional et sont replacées ci-dessous.

---

## 3. La route, dans l'ordre où elle doit être parcourue

L'ordre suit §47 du Product OS Master : sécurité financière et d'exécution →
cycle de vie → utilisabilité à distance → supportabilité opérationnelle →
complétude produit → croissance → finition. Une tranche est placée avant une
autre quand elle **débloque** des lignes d'acceptation, pas quand elle est plus
facile.

### 3.3 — Fermeture opérateur · **la prochaine**

*15 exigences · 2 P0 · lève le VETO « opérations prop-firm »*

Control possède aujourd'hui 21 surfaces dont 6 mutables. Les deux files qui
manquent sont celles sans lesquelles un compte ne peut pas franchir son étape :

| Exigence | Ce qu'il faut |
|---|---|
| `POS-75.01` File Pass Review | Une file `/control/pass-review` : colonnes §75, détail avec rule snapshot, timeline, trades, ordres, événements risque, intégrité, audit, panneau de décision avec reason code obligatoire. |
| `POS-66.01` Pass Review | `app.performance_review_cases` existe et n'a aucune file. Rendre la décision mutable et auditée. |
| `POS-72.01` WARIBA Review | Même chose après le dernier payout. |
| `POS-26.01` Dashboard soft lock | Séparer visuellement blocage temporaire et compte terminé, avec compte à rebours de reset. |
| `POS-06.15` `/comptes/{accountId}` · `POS-32.02` | La surface Hub canonique qui manque : une page par compte, avec ses règles, sa policy, son historique et ses preuves. |
| `POS-06.20` `/profil` · `POS-41.01` | Idem pour le profil trader. |
| `POS-06.21` `/parametres` · `POS-42.01` | 2 domaines sur 8, en lecture seule. Rendre mutable ce qui doit l'être. |
| `POS-89.01` WariX offline | Re-sync forcé après reconnexion avant réactivation du trading. |
| `POS-129.01` Toasts et feedback | Rejet de breach persistant plutôt qu'éphémère. |

**Condition de sortie :** un opérateur peut faire passer un compte d'évaluation
à Performance sans ouvrir Supabase, et un trader peut ouvrir le détail de son
propre compte.

### 3.4 — Preuve publique et confiance

*12 exigences · 0 P0 · nécessaire avant toute ouverture publique, pas avant une bêta privée*

`/status` (`OPS-010` `LOCKED`), `/regles`, `/confiance`, incidents visibles
côté trader, analytics réellement branché, E2E d'acquisition.

**Dette identifiée pendant la tranche Centre d'aide** (`POS-14.01`) : `/programme`
porte encore des valeurs de règle en dur hors du tableau `#regles` — le titre
« Maximum Loss 10 % EOD trailing », la formule en prose, et
`PERFORMANCE_THRESHOLDS` (buffer et seuil de Performance Day par taille). Le
tableau `#regles` lui-même lit désormais la policy publiée, et les cinq liens
« Règles essentielles » / « Voir les règles » pointent vers l'article canonique.
Le reste de la page doit suivre la même liaison.

**Note de séquencement :** `/status` est verrouillé « avant public », pas avant
une bêta privée fermée. Il peut donc suivre 3.5 si le calendrier l'exige — mais
il ne peut pas être sauté, et l'article d'aide correspondant ne sera dépublié
de son état actuel que lorsque la page existera.

### 3.5 — KYC, payouts et providers · **le vrai mur**

*16 exigences · **12 P0** · lève les VETO conformité, KYC et opérations payout*

C'est la concentration P0 la plus dense du produit, et la seule tranche dont
une partie ne dépend pas de l'ingénierie :

| Bloc | Exigences | Nature |
|---|---|---|
| KYC | `POS-37.01`, `POS-76.01`, `POS-82.01`, `POS-02.07`, `POS-30.01`, `POS-110.01`, `POS-38.01` | Ingénierie **+ choix d'un provider**. |
| Payout | `POS-71.01`, `POS-99.01`, `POS-111.01` | **Décision commerciale** (`OPEN-PAYOUT-001`) avant tout code. |
| Paiement | `POS-98.01`, `POS-18.01` | **Contrat PSP** (`OPEN-PAYMENT-001`). |
| Market data | `POS-100.01` | **Droits d'affichage** (`DATA-011` bloqué par credential). |
| Reprise | `POS-135.01`, `POS-130.01` | Ingénierie, une fois les providers connus. |

Quatre de ces lignes sont `BLOCKED_EXTERNAL` : aucune quantité de code ne les
ferme. Elles attendent une signature.

> **C'est ici que le calendrier de la bêta se décide réellement.** Tout le
> reste est du travail que l'équipe contrôle.

### 3.6 — Sécurité, observabilité et persistance de l'aide

*4 exigences · 1 P0*

Audit de sécurité formel (`POS-97.01`), agrégation des métriques
(`POS-102.01`), rétention et privacy (`POS-147.01`), et la table
`help_articles` qui débloquerait l'édition de l'aide sans déploiement
(`POS-146.01`).

### WariX Professional

*5 exigences · 0 P0*

`view=` sérialisable, vues Performance et Risk, séparation Chart Prefs /
Settings / Risk Center, indicateurs au-delà d'EMA et SMA. Aucune n'est P0 :
le terminal exécute, et c'est ce que la bêta demande de lui.

---

## 4. Les trois choses qui ne sont dans aucune tranche

Elles ne sont pas des exigences de la matrice, et ce sont pourtant elles qui
décident si une bêta privée est possible.

### 4.1 Un environnement qui tourne

Phase 3.1A a livré les Dockerfiles, les `.env.example`, les endpoints de santé
et de readiness. **Rien n'a encore tourné ailleurs que sur localhost.** Tant
que c'est vrai, aucune des 145 exigences faites n'est atteignable par un
testeur — ce qui est exactement pourquoi l'audit avait classé le déploiement
premier.

À faire : choisir l'hébergement (`ARCH-023`/`ARCH-024`, tous deux `OPEN`),
provisionner une base managée, poser les secrets, déployer, et vérifier les
health checks depuis l'extérieur.

### 4.2 Une restauration prouvée

`pnpm test:recovery` redémarre le service temps réel. Il ne restaure aucune
base. Aucune procédure de restauration n'a jamais été exécutée sur ce projet.

À faire : une procédure écrite, un essai réel sur une copie, et un chiffre de
RPO/RTO mesuré plutôt qu'estimé.

### 4.3 Un e-mail sortant

`EMAIL_PROVIDER=sandbox`, `ARCH-027` `OPEN`. Aucune vérification d'adresse,
aucune récupération de mot de passe et aucune notification de cycle de vie ne
sort réellement du système aujourd'hui.

À faire : un provider, et la matrice de delivery (`POS-130.01`).

---

## 5. Chemin le plus court vers une bêta privée

Si l'objectif est **un testeur externe qui peut acheter, trader, échouer,
contester et obtenir une réponse**, alors :

```text
1. Environnement déployé            §4.1   ingénierie          débloque tout
2. E-mail sortant                   §4.3   décision + intégration
3. Tranche 3.3 — fermeture opérateur       ingénierie          lève 1 VETO
4. Restauration prouvée             §4.2   ingénierie
5. Provider KYC + file              3.5    décision + ingénierie  lève 2 VETO
6. Décision payout + provider       3.5    décision            lève 1 VETO
```

Les étapes 1, 3 et 4 sont entièrement sous contrôle de l'équipe. Les étapes 2,
5 et 6 commencent par une décision, pas par du code — et ce sont elles qui
portent les quatre `VETO` restants.

**Une bêta privée sans payout réel est atteignable après les étapes 1 à 4.**
Elle permettrait d'observer le parcours complet jusqu'à l'éligibilité payout,
avec une file KYC manuelle en Control, à condition d'être annoncée pour ce
qu'elle est. C'est une décision produit, pas une conclusion technique — mais
elle raccourcit le chemin de plusieurs semaines de négociation fournisseur.

---

## 6. État de la documentation

Les documents ci-dessous sont des **enregistrements datés** : ils décrivent
l'état du code à leur date et ne sont pas mis à jour rétroactivement.

| Document | Date | Statut |
|---|---|---|
| `WARIBA_PRODUCT_OS_MASTER_IMPLEMENTATION_AUDIT_2026-08-23.md` | 23/08 | Enregistrement. Ses chiffres (77,1 %) sont ceux de sa date. |
| `WARIBA_PRODUCT_OS_MASTER_ROUTE_PARITY_2026-08-23.md` | 23/08 | Enregistrement. `/support` et `/aide` y sont `UI_ONLY` ; ils ne le sont plus. |
| `WARIBA_PHASE_3_SOURCE_AUDIT.md` | 23/08 | Enregistrement. |
| `WARIBA_PHASE_3_GAP_CONTRACT.md` | 23/08 | Constats confirmés ; **séquencement remplacé par ce document**. |

Ceux-ci sont **vivants** et reflètent l'état courant :

| Document | Rôle |
|---|---|
| `WARIBA_PRODUCT_OS_MASTER_IMPLEMENTATION_MATRIX_2026-08-23.csv` | La matrice des 190 exigences. Mise à jour à chaque tranche. |
| `WARIBA_ROAD_TO_BETA_2026-08-24.md` | Ce document. État courant et séquencement. |
| `WARIBA_PHASE_3_2_DELIVERY_REPORT.md` | Support + Contestations. |
| `WARIBA_HELP_CENTER_DELIVERY_REPORT.md` | Centre d'aide. |
| `DECISION_LOG.md` | Autorité supérieure sur tous les précédents. |

---

## 7. Ce que ce document n'affirme pas

- Que 80,4 % de couverture signifie 80 % du travail restant fait. Les quatre
  lignes `BLOCKED_EXTERNAL` peuvent coûter plus longtemps que les quinze
  exigences de la tranche 3.3.
- Qu'une date de bêta est calculable aujourd'hui. Trois des six étapes du §5
  commencent par une décision commerciale non prise.
- Que les exigences marquées `DONE` sont parfaites. Elles sont complètes au
  sens de la matrice, prouvées par des tests, et rien de plus.
