---
title: "WARIBA Decision Log"
version: "1.0"
document_id: "WARIBA-DECISION-LOG"
status: "ACTIVE — SOURCE DE VÉRITÉ DES DÉCISIONS"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
owner: "WARIBA Leadership, Product, Risk, Engineering & Operations"
last_updated: "2026-08-01"
---

# WARIBA Decision Log v1.0

> **Toute décision importante doit être explicite, datée, justifiée et traçable.**

## 1. Objet du registre

Ce document centralise les décisions structurantes de WARIBA.

Il sert à :

- éviter les contradictions entre documents ;
- empêcher les agents IA d’inventer des décisions ;
- distinguer ce qui est verrouillé de ce qui reste hypothétique ;
- documenter les raisons d’une décision ;
- conserver l’historique des changements ;
- identifier les décisions qui bloquent une phase ;
- lier une décision à ses effets produit, financiers, UX, techniques et opérationnels.

Ce fichier doit être lu avant toute grande tâche.

---

# 2. Statuts autorisés

| Statut | Signification |
|---|---|
| `LOCKED` | Décision validée et obligatoire. Toute modification exige une nouvelle décision. |
| `CANDIDATE` | Hypothèse préférée mais non définitivement validée. |
| `OPEN` | Décision non prise. Peut bloquer une implémentation précise. |
| `DEFERRED` | Décision volontairement reportée hors V1 ou hors phase actuelle. |
| `REJECTED` | Option explicitement refusée. |
| `SUPERSEDED` | Décision remplacée par une décision plus récente. |
| `EXPERIMENT` | Décision autorisée uniquement dans un périmètre contrôlé. |

---

# 3. Règles de gouvernance

## 3.1 Modification

Une décision `LOCKED` ne peut être modifiée qu’avec :

1. une nouvelle entrée ;
2. un identifiant unique ;
3. l’impact produit ;
4. l’impact financier ;
5. l’impact UX ;
6. l’impact technique ;
7. l’impact sécurité/opérations ;
8. les documents à mettre à jour ;
9. les tests à modifier ;
10. une validation explicite de Rod.

## 3.2 Non-rétroactivité

Une modification de règle ne s’applique pas automatiquement aux comptes existants.

Les comptes actifs restent attachés à leur policy version, sauf base contractuelle explicite.

## 3.3 Hiérarchie

En cas de contradiction :

1. obligations légales applicables ;
2. conditions contractuelles acceptées ;
3. policy version du compte ;
4. Program Rulebook ;
5. Financial Model ;
6. Product Master ;
7. UX Architecture ;
8. Design System ;
9. Engineering Constitution ;
10. System Architecture ;
11. Security, QA & Operations Standard ;
12. Build Plan ;
13. Prompt Pack ;
14. code.

## 3.4 Agents IA

Codex et Claude Code ne peuvent pas créer ou modifier une décision sans :

- signaler le besoin ;
- proposer une entrée ;
- attendre validation.

---

# 4. Format d’une nouvelle décision

```text
ID:
Date:
Catégorie:
Titre:
Statut:
Décision:
Motif:
Alternatives considérées:
Conséquences:
Documents impactés:
Owner:
Révision:
```

---

# 5. Décisions — Identité et positionnement

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| BRAND-001 | `LOCKED` | La marque principale est **WARIBA**. | WARIBA remplace définitivement R1STER pour ce projet. |
| BRAND-002 | `LOCKED` | Le domaine principal est `wariba.app`. | Aucun autre domaine principal n’est requis pour V1. |
| BRAND-003 | `LOCKED` | Toute référence active à R1STER est interdite. | Éviter confusion, dette de marque et incohérence. |
| BRAND-004 | `LOCKED` | Positionnement : infrastructure de progression pour traders disciplinés. | WARIBA ne se positionne pas comme challenge facile ou casino. |
| BRAND-005 | `LOCKED` | WARIBA n’est pas un broker au lancement. | Le produit est un environnement de trading simulé. |
| BRAND-006 | `LOCKED` | WARIBA ne promet pas automatiquement du capital réel. | WARIBA Review n’est pas une garantie Live. |
| BRAND-007 | `LOCKED` | Marché initial : Afrique francophone. | Langue, paiements, mobile et support sont conçus pour ce marché. |
| BRAND-008 | `LOCKED` | Langue produit V1 : français. | L’anglais reste futur. |
| BRAND-009 | `LOCKED` | Direction de marque : **Quiet Financial Authority**. | Autorité calme, précision et confiance. |
| BRAND-010 | `LOCKED` | Aucun cliché africain visuel ou narratif. | L’identité africaine vient du contexte, pas de symboles génériques. |
| BRAND-011 | `OPEN` | Logo final WARIBA. | Le logo ne bloque pas la fondation technique. |
| BRAND-012 | `OPEN` | Vérification juridique définitive de la marque. | Gate avant lancement public. |
| BRAND-013 | `OPEN` | Renommage de l’ancien projet WARIBA BRVM. | Doit être résolu avant lancement public pour éviter confusion. |

---

# 6. Décisions — Vision produit

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| PROD-001 | `LOCKED` | Parcours principal : WARIBA ONE → WARIBA Performance → WARIBA Review. | Structure tout le produit. |
| PROD-002 | `LOCKED` | WARIBA ONE comporte une seule phase. | Simplicité et attractivité. |
| PROD-003 | `LOCKED` | WARIBA Performance reste simulé en V1. | Réduction du risque légal, technique et financier. |
| PROD-004 | `LOCKED` | Maximum cinq payouts avant WARIBA Review. | Progression contrôlée. |
| PROD-005 | `LOCKED` | Aucun compte Live automatique après Review. | Éviter fausse promesse. |
| PROD-006 | `LOCKED` | Le North Star Metric est la progression de traders respectant les règles. | La croissance seule n’est pas le succès. |
| PROD-007 | `LOCKED` | Trois personas : débutant discipliné, intermédiaire, confirmé sous-capitalisé. | Les parcours et contenus doivent couvrir ces profils. |
| PROD-008 | `LOCKED` | Le Hub est le centre de compréhension. | Le trader doit comprendre son état et sa prochaine action rapidement. |
| PROD-009 | `LOCKED` | WARIBA Trade est un espace distinct du Hub. | Séparer compréhension et exécution. |
| PROD-010 | `LOCKED` | La Mission est l’objet central de progression d’un compte. | Elle combine objectifs, règles et prochaine action. |
| PROD-011 | `LOCKED` | WARIBA Guardian est déterministe. | Aucun conseil de trading ou signal. |
| PROD-012 | `LOCKED` | WARIBA Assist explique et escalade. | Il ne modifie ni règle, ni compte, ni payout. |
| PROD-013 | `LOCKED` | Le produit doit fonctionner intégralement sur mobile. | Le marché initial exige une vraie expérience mobile-first. |
| PROD-014 | `LOCKED` | Web responsive + PWA en V1. | App native exclue du lancement. |
| PROD-015 | `DEFERRED` | Application iOS/Android native. | Non nécessaire avant validation produit. |
| PROD-016 | `DEFERRED` | Copy trading. | Complexité et risque hors V1. |
| PROD-017 | `DEFERRED` | Futures. | V1 reste Forex, Gold et indice. |
| PROD-018 | `DEFERRED` | Crypto. | Hors positionnement initial. |
| PROD-019 | `DEFERRED` | API publique. | Hors V1. |
| PROD-020 | `DEFERRED` | Academy complète. | Help Center critique d’abord. |
| PROD-021 | `DEFERRED` | Community, leaderboard et gamification. | Éviter dérive casino/sociale. |
| PROD-022 | `DEFERRED` | Affiliation publique massive. | À lancer seulement après stabilité opérationnelle. |
| PROD-023 | `DEFERRED` | Certificats publics. | Après validation du parcours et protection anti-fraude. |

---

# 7. Décisions — Offre commerciale

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| OFFER-001 | `SUPERSEDED` | Offre 5K à 14 900 FCFA. | Hypothèse de bêta à valider avec données réelles. Voir OFFER-013. |
| OFFER-002 | `SUPERSEDED` | Offre 10K à 27 900 FCFA. | Offre principale candidate. Voir OFFER-014. |
| OFFER-003 | `SUPERSEDED` | Offre 25K à 59 900 FCFA. | Ne doit pas être disponible par défaut. Voir OFFER-015. |
| OFFER-004 | `LOCKED` | Le 10K est l’offre principale candidate. | Meilleur équilibre prix/valeur dans le modèle initial. |
| OFFER-005 | `LOCKED` | Le 25K est derrière un feature flag. | Risque de réserve plus élevé. |
| OFFER-006 | `LOCKED` | Aucun frais d’activation. | Simplification et confiance. |
| OFFER-007 | `LOCKED` | Aucun abonnement obligatoire pour l’évaluation. | WARIBA ONE n’a pas de limite de temps. |
| OFFER-008 | `LOCKED` | Nature simulée visible avant paiement. | Transparence contractuelle. |
| OFFER-009 | `OPEN` | Politique définitive de remboursement. | Dépend du PSP et du conseil juridique. |
| OFFER-010 | `OPEN` | Nombre maximal d’évaluations actives par utilisateur. | Nécessaire avant lancement payant. |
| OFFER-011 | `OPEN` | Reset/repurchase commercial. | Doit être économiquement et éthiquement cadré. |
| OFFER-013 | `CANDIDATE` | Prix public 5K : 22 500 FCFA. | Point d’entrée accessible sans positionnement low-cost extrême. |
| OFFER-014 | `CANDIDATE` | Prix public 10K : 39 900 FCFA. | Offre principale candidate. |
| OFFER-015 | `CANDIDATE` | Prix public 25K : 84 900 FCFA. | Niveau intermédiaire, équivalent indicatif (≈148 USD) sous le seuil psychologique de 150 USD. |
| OFFER-016 | `CANDIDATE` | Prix public 50K : 144 900 FCFA. | Cohérence avec l’exposition et les caps de payout. |
| OFFER-017 | `CANDIDATE` | Prix public 100K : 259 900 FCFA. | Protection accrue face à l’exposition maximale. |
| OFFER-018 | `CANDIDATE` | Prix fondateurs : 16 900 / 34 900 / 74 900 / 124 900 / 229 900 FCFA (5K/10K/25K/50K/100K). | Offre limitée à une cohorte réelle et identifiable ; pas un prix permanent. |
| OFFER-019 | `LOCKED` | Les prix restent candidats jusqu’au modèle actuariel. | Éviter une grille non soutenable. |
| OFFER-020 | `LOCKED` | Aucun frais d’activation après réussite. | Transparence et simplicité. |
| OFFER-021 | `LOCKED` | Chaque taille possède son propre feature flag commercial. | Permettre une ouverture progressive selon la réserve. |
| OFFER-022 | `LOCKED` | La devise commerciale et de règlement est le FCFA (XOF), pas le USD ; l’USD reste un équivalent informatif. | Marché principal Afrique francophone, paiements Wave/Orange Money/Mobile Money ; montant final du checkout figé en FCFA sans conversion surprise. |

---

# 8. Décisions — WARIBA ONE

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| ONE-001 | `CANDIDATE` | Objectif de profit : 8 %. | Baseline du Rulebook. |
| ONE-002 | `CANDIDATE` | Daily Loss Limit : 4 % du nominal. | Soft lock quotidien. |
| ONE-003 | `CANDIDATE` | Maximum Loss : 8 % statique. | Hard breach. |
| ONE-004 | `CANDIDATE` | Consistance : 40 %. | Condition de passage, jamais breach. |
| ONE-005 | `CANDIDATE` | Minimum 4 jours de trading. | Empêcher passage instantané. |
| ONE-006 | `CANDIDATE` | Minimum 3 journées qualifiées. | Mesurer une régularité minimale. |
| ONE-007 | `CANDIDATE` | Journée qualifiée : 0,20 % du nominal. | Baseline du Rulebook. |
| ONE-008 | `LOCKED` | Pas de trailing drawdown. | Règles plus lisibles et non ambiguës. |
| ONE-009 | `LOCKED` | Pas de limite de temps. | Confiance et discipline plutôt que pression. |
| ONE-010 | `CANDIDATE` | Inactivité : 30 jours. | Prévenir comptes abandonnés. |
| ONE-011 | `LOCKED` | Overnight autorisé. | Flexibilité. |
| ONE-012 | `LOCKED` | Weekend hold interdit au lancement. | Réduction du risque événementiel. |
| ONE-013 | `LOCKED` | News trading autorisé en Evaluation. | Positionnement plus simple. |
| ONE-014 | `LOCKED` | Le target doit être réalisé. | Le PnL latent ne suffit pas. |
| ONE-015 | `LOCKED` | Le compte ne passe qu’avec positions et ordres fermés. | Éviter passage sur exposition ouverte. |
| ONE-016 | `LOCKED` | Consistance > 40 % ne termine jamais le compte. | C’est une condition d’éligibilité uniquement. |
| ONE-017 | `LOCKED` | Reset quotidien basé sur UTC. | Une seule référence de temps. |
| ONE-018 | `CANDIDATE` | Reset à 00:00 UTC. | Baseline technique du Rulebook. |

---

# 9. Décisions — WARIBA Performance et payouts

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| PERF-001 | `CANDIDATE` | DLL Performance : 3 %. | Baseline plus stricte que l’évaluation. |
| PERF-002 | `CANDIDATE` | Maximum Loss Performance : 6 % statique. | Hard breach. |
| PERF-003 | `CANDIDATE` | Consistance : 40 % par cycle. | Condition de payout, jamais breach. |
| PERF-004 | `CANDIDATE` | 5 journées qualifiées par cycle. | Régularité avant payout. |
| PERF-005 | `CANDIDATE` | Journée qualifiée : 0,30 % du nominal. | Baseline du Rulebook. |
| PERF-006 | `CANDIDATE` | Threshold payout #1 : 4 %. | Premier cycle plus exigeant. |
| PERF-007 | `CANDIDATE` | Threshold payouts #2 à #5 : 3 %. | Progression répétable. |
| PERF-008 | `LOCKED` | Pas de délai fixe de 14 jours. | Éligibilité fondée sur performance et jours qualifiés. |
| PERF-009 | `LOCKED` | Maximum distribuable : 50 % du profit net du cycle. | Protection de la réserve et du compte. |
| PERF-010 | `CANDIDATE` | Split payouts #1 à #4 : 80/20. | Baseline commerciale. |
| PERF-011 | `CANDIDATE` | Split payout #5 : 90/10. | Récompense de progression. |
| PERF-012 | `LOCKED` | Le compte est gelé après une demande de payout valide. | Stabiliser le snapshot et éviter nouvelles expositions. |
| PERF-013 | `LOCKED` | Une seule demande de payout active par cycle. | Empêcher duplication. |
| PERF-014 | `LOCKED` | Le Payout Base entier est débité du compte simulé après paiement. | Cohérence du cycle. |
| PERF-015 | `LOCKED` | Un cycle payé ne peut jamais être payé à nouveau. | Invariant financier. |
| PERF-016 | `LOCKED` | La réserve ne réduit pas rétroactivement un payout gagné. | Gouvernance et confiance. |
| PERF-017 | `LOCKED` | Une revue humaine est requise avant payout réel. | Sécurité et intégrité. |
| PERF-018 | `LOCKED` | Après payout #5, création d’un dossier WARIBA Review. | Pas de cycle automatique supplémentaire sans décision. |
| PERF-019 | `LOCKED` | WARIBA Review ne garantit pas une allocation réelle. | Transparence. |
| PERF-020 | `LOCKED` | Une seule relation Performance issue d’une Evaluation réussie. | Idempotence. |
| PERF-021 | `OPEN` | Critères finaux de WARIBA Review. | Doivent être définis avant public. |
| PERF-022 | `OPEN` | Délai de traitement Review. | Nécessite opérations réelles. |

---

# 10. Décisions — Caps de payout

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| CAP-001 | `CANDIDATE` | 5K P1–P2 : 100 USD. | Baseline du modèle financier. |
| CAP-002 | `CANDIDATE` | 5K P3–P4 : 150 USD. | Baseline du modèle financier. |
| CAP-003 | `CANDIDATE` | 5K P5 : 250 USD. | Baseline du modèle financier. |
| CAP-004 | `CANDIDATE` | 10K P1–P2 : 200 USD. | Baseline du modèle financier. |
| CAP-005 | `CANDIDATE` | 10K P3–P4 : 300 USD. | Baseline du modèle financier. |
| CAP-006 | `CANDIDATE` | 10K P5 : 500 USD. | Baseline du modèle financier. |
| CAP-007 | `EXPERIMENT` | 25K P1–P2 : 400 USD. | Non public au lancement. |
| CAP-008 | `EXPERIMENT` | 25K P3–P4 : 600 USD. | Non public au lancement. |
| CAP-009 | `EXPERIMENT` | 25K P5 : 1 000 USD. | Non public au lancement. |
| CAP-010 | `LOCKED` | Les caps ne doivent pas être augmentés avant données de bêta. | Le scénario Stress est déficitaire. |

---

# 11. Décisions — Instruments et trading

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| TRD-001 | `LOCKED` | Instruments V1 : EURUSD, GBPUSD, USDJPY, XAUUSD, NAS100. | Scope réduit et clair. |
| TRD-002 | `LOCKED` | Market orders d’abord. | Réduire complexité. |
| TRD-003 | `LOCKED` | Stop Loss et Take Profit supportés. | Fonctionnalité minimale de trading. |
| TRD-004 | `LOCKED` | Partial close, full close et Close All supportés. | Gestion pratique des positions. |
| TRD-005 | `OPEN` | Pending orders avancés. | Hors première vertical slice sauf validation. |
| TRD-006 | `LOCKED` | Prix d’exécution serveur. | Le client n’est jamais autoritaire. |
| TRD-007 | `LOCKED` | Buy open sur ask, sell open sur bid. | Convention de marché. |
| TRD-008 | `LOCKED` | Buy close sur bid, sell close sur ask. | Convention de marché. |
| TRD-009 | `LOCKED` | Les fills sont immuables. | Auditabilité. |
| TRD-010 | `LOCKED` | Les positions sont des projections réconciliables avec les fills. | Intégrité. |
| TRD-011 | `LOCKED` | Le ledger est append-only. | Aucune correction par édition directe. |
| TRD-012 | `LOCKED` | Une commande financière par compte est sérialisée. | Empêcher les race conditions. |
| TRD-013 | `LOCKED` | Aucun ordre offline. | Impossible de garantir prix et état. |
| TRD-014 | `LOCKED` | La reconnexion doit effectuer un resync serveur. | Éviter duplication et divergence. |
| TRD-015 | `OPEN` | Spécifications finales de contrats, commissions et swaps. | Nécessite provider/licence et validation économique. |
| TRD-016 | `OPEN` | Cutoff weekend exact. | Doit être publié avant lancement. |
| TRD-017 | `OPEN` | Provider news et fenêtre exacte en production. | Dépend d’une source fiable. |
| TRD-018 | `LOCKED` | Le levier WARIBA Performance est inférieur à WARIBA ONE (Forex 1:30, XAUUSD/NAS100 1:10 contre 1:50/1:20/1:20) et doit être encodé par programme dans le ruleset machine. | Corrige une lacune : `WARIBA_RULESET_v1.0.json` n’exposait qu’un levier unique par symbole (valeurs WARIBA ONE), sans champ pour WARIBA Performance ; `leverage_by_program` a été ajouté à `symbol_specifications.symbols.*`. |
| TRD-019 | `CANDIDATE` | Valeurs sandbox explicites pour precision/contract size/min-max-step quantity/commission/swap/stale threshold, encodées dans `app.symbol_specs` (Prompt 04). | Ne résout pas TRD-015 (reste `OPEN`) — ce sont des placeholders documentés, pas des specs finales ; nécessaires pour que le moteur d'exécution sandbox fonctionne avant qu'un provider réel n'existe. |
| TRD-020 | `LOCKED` | Modèle de position "hedging" : chaque ordre marché accepté ouvre une nouvelle position (pas de netting/moyenne par symbole). Partial/full close réduisent une position existante par `position_id`. | Simplicité V1 — évite la complexité de moyenne de prix et d'inversion de direction ; `average_open_price` reste toujours le prix du fill d'ouverture unique. |
| TRD-021 | `LOCKED` | Aucun fill partiel au niveau ordre en V1 : un ordre marché accepté est entièrement rempli en un seul fill. | Le marché sandbox déterministe a toujours une liquidité suffisante ; `partially_filled` reste une valeur de state machine valide mais non atteinte tant qu'un scénario de liquidité limitée n'est pas requis. |
| TRD-022 | `LOCKED` | Aucune exécution automatique de Stop Loss / Take Profit en V1 : ce sont des paramètres de risque stockés et modifiables sur une position, pas des ordres en attente déclenchés par le marché. | TRD-005 (pending orders avancés) reste `OPEN` ; le marché sandbox ne surveille pas les positions pour un déclenchement automatique tant que ce périmètre n'est pas validé séparément. |
| TRD-023 | `LOCKED` | `account_sequence` (WebSocket gap detection par compte) réutilise `trading_accounts.version` (déjà le compteur de concurrence optimiste du row lock) plutôt qu'une séquence dédiée. | Chaque écriture transactionnelle de trading incrémente déjà `version` sous verrou ; réutiliser cette valeur évite un générateur de séquence redondant. |

---

# 12. Décisions — Market data

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| DATA-001 | `LOCKED` | Première bêta avec market data sandbox déterministe. | Aucun coût/licence réel prématuré. |
| DATA-002 | `LOCKED` | Seed, version, timestamp et sequence sont enregistrés. | Reproductibilité. |
| DATA-003 | `LOCKED` | Ne pas stocker tous les ticks indéfiniment. | Coût et volume inutiles. |
| DATA-004 | `LOCKED` | Stocker les snapshots liés aux fills et violations. | Preuve et replay. |
| DATA-005 | `LOCKED` | Les prix stale bloquent les nouvelles expositions. | Fail closed. |
| DATA-006 | `LOCKED` | Aucun ancien prix ne doit être présenté comme actuel. | Transparence. |
| DATA-007 | `OPEN` | Provider market data réel. | Gate avant public. |
| DATA-008 | `OPEN` | Licence commerciale market data. | Obligatoire avant utilisation publique réelle. |
| DATA-009 | `OPEN` | Région/provider optimal pour latence Côte d’Ivoire. | À mesurer. |

---

# 13. Décisions — UX

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| UX-001 | `LOCKED` | Le Hub est le centre du produit. | Compréhension globale. |
| UX-002 | `LOCKED` | Une Mission existe par compte. | Progression explicite. |
| UX-003 | `LOCKED` | Trade est séparé du Hub. | Concentration. |
| UX-004 | `LOCKED` | Mobile-first réel. | Marché initial. |
| UX-005 | `CANDIDATE` | Navigation trader à cinq entrées. | Hub, Trade, Comptes, Payouts, Plus. |
| UX-006 | `LOCKED` | Risk Ribbon permanent dans Trade. | Risque visible. |
| UX-007 | `CANDIDATE` | Order Ticket en bottom sheet mobile. | Utilisabilité. |
| UX-008 | `LOCKED` | Soft lock distinct visuellement du hard breach. | Compréhension des règles. |
| UX-009 | `LOCKED` | Payout Breakdown complet. | Transparence. |
| UX-010 | `LOCKED` | Support et contestation intégrés au produit. | Décisions contestables. |
| UX-011 | `LOCKED` | Aucun CTA agressif de repurchase après breach. | Confiance. |
| UX-012 | `LOCKED` | Le compte actif est répété avant action sensible. | Éviter erreurs multi-comptes. |
| UX-013 | `LOCKED` | Aucun dark pattern. | Positionnement de confiance. |
| UX-014 | `CANDIDATE` | Trust Center public. | À implémenter avant public. |
| UX-015 | `LOCKED` | Toutes les métriques critiques ouvrent leur formule et source. | Explicabilité. |
| UX-016 | `LOCKED` | La nature simulée est répétée aux moments critiques. | Éviter confusion. |

---

# 14. Décisions — Design System

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| DS-001 | `LOCKED` | Direction : Quiet Financial Authority. | Différenciation. |
| DS-002 | `LOCKED` | Police UI : Manrope Variable. | Lisibilité moderne. |
| DS-003 | `LOCKED` | Police données : IBM Plex Mono. | Données tabulaires. |
| DS-004 | `LOCKED` | Cobalt comme action primaire. | Identité propriétaire. |
| DS-005 | `LOCKED` | Copper comme accent limité. | Signature premium. |
| DS-006 | `LOCKED` | Trade sombre par défaut. | Usage terminal. |
| DS-007 | `CANDIDATE` | Hub clair par défaut. | Lisibilité. |
| DS-008 | `LOCKED` | Control clair par défaut. | Densité opérationnelle. |
| DS-009 | `LOCKED` | Radius maximum 20 px. | Éviter template générique. |
| DS-010 | `LOCKED` | Ombres limitées. | Hiérarchie sobre. |
| DS-011 | `LOCKED` | Pas de gradient principal. | Anti-vibe-code. |
| DS-012 | `LOCKED` | Design tokens centralisés. | Cohérence. |
| DS-013 | `LOCKED` | WCAG 2.2 AA. | Accessibilité. |
| DS-014 | `LOCKED` | Support mobile à partir de 320 px. | Marché initial. |
| DS-015 | `CANDIDATE` | Catalogue interne de composants. | QA et cohérence. |
| DS-016 | `CANDIDATE` | Visual regression tests. | Prévenir régressions. |

---

# 15. Décisions — Architecture et stack

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| ARCH-001 | `LOCKED` | Modular monolith. | Simplicité et cohérence. |
| ARCH-002 | `LOCKED` | Trois processus : Web/BFF, Realtime, Worker. | Contraintes runtime distinctes sans microservices métier. |
| ARCH-003 | `LOCKED` | Next.js + React. | Web/PWA. |
| ARCH-004 | `LOCKED` | Fastify pour Realtime. | WebSocket et performance. |
| ARCH-005 | `LOCKED` | PostgreSQL/Supabase. | Base, Auth, Storage et RLS. |
| ARCH-006 | `LOCKED` | Kysely + SQL explicite. | Typage et contrôle SQL. |
| ARCH-007 | `LOCKED` | pnpm workspaces + Corepack. | Reproductibilité. |
| ARCH-008 | `LOCKED` | Turborepo. | Orchestration monorepo. |
| ARCH-009 | `LOCKED` | Zod aux frontières. | Validation. |
| ARCH-010 | `LOCKED` | Decimal.js + PostgreSQL numeric. | Précision financière. |
| ARCH-011 | `LOCKED` | Lightweight Charts. | Terminal propriétaire. |
| ARCH-012 | `LOCKED` | Transactional outbox PostgreSQL. | Fiabilité événements. |
| ARCH-013 | `LOCKED` | Queue PostgreSQL en V1. | Éviter infrastructure prématurée. |
| ARCH-014 | `LOCKED` | Aucun Redis initial. | Ajout seulement après mesure. |
| ARCH-015 | `REJECTED` | Kafka en V1. | Complexité injustifiée. |
| ARCH-016 | `REJECTED` | Kubernetes en V1. | Complexité injustifiée. |
| ARCH-017 | `REJECTED` | Microservices métier en V1. | Petite équipe et budget contraint. |
| ARCH-018 | `LOCKED` | Une seule région primaire en V1. | Coût et simplicité. |
| ARCH-019 | `LOCKED` | Un seul codebase Next.js avec host routing. | Partage design et maintenance. |
| ARCH-020 | `LOCKED` | `control.wariba.app` comme séparation logique. | Sécurité et UX internes. |
| ARCH-021 | `LOCKED` | Browser sans accès direct aux tables financières. | BFF et serveur autoritaire. |
| ARCH-022 | `LOCKED` | Aucun event sourcing complet. | Audit sans complexité excessive. |
| ARCH-023 | `OPEN` | Provider web final. | À sélectionner avant staging. |
| ARCH-024 | `OPEN` | Provider conteneurs Realtime/Worker. | À comparer coût/latence/WebSocket. |
| ARCH-025 | `OPEN` | Provider analytics. | Adapter obligatoire. |
| ARCH-026 | `OPEN` | Provider observabilité. | À choisir avant bêta. |
| ARCH-027 | `OPEN` | Provider email. | À choisir avant bêta réaliste. |

---

# 16. Décisions — Engineering

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| ENG-001 | `LOCKED` | TypeScript strict. | Fiabilité. |
| ENG-002 | `LOCKED` | Server authoritative. | Intégrité. |
| ENG-003 | `LOCKED` | Policies immuables par compte. | Non-rétroactivité. |
| ENG-004 | `LOCKED` | UTC partout. | Cohérence temporelle. |
| ENG-005 | `LOCKED` | Clock injectable. | Tests déterministes. |
| ENG-006 | `LOCKED` | Idempotence sur toutes les actions sensibles. | Prévenir doublons. |
| ENG-007 | `LOCKED` | Audit append-only. | Preuve. |
| ENG-008 | `LOCKED` | Aucune balance éditable dans Control. | Intégrité financière. |
| ENG-009 | `LOCKED` | RLS obligatoire. | Isolation des utilisateurs. |
| ENG-010 | `LOCKED` | GitHub privé. | Source de vérité. |
| ENG-011 | `LOCKED` | `main` protégée. | Gouvernance. |
| ENG-012 | `LOCKED` | Pas de branche `develop`. | Simplicité. |
| ENG-013 | `LOCKED` | PR obligatoire pour changements substantiels. | Audit. |
| ENG-014 | `LOCKED` | Production avec approbation manuelle. | Réduction du risque. |
| ENG-015 | `LOCKED` | Aucune migration appliquée ne peut être modifiée. | Historique fiable. |
| ENG-016 | `LOCKED` | Expand-and-contract pour changements destructifs. | Déploiement sûr. |
| ENG-017 | `LOCKED` | Aucune dépendance structurelle sans justification. | Contrôle de complexité. |
| ENG-018 | `LOCKED` | Les formules financières restent hors React/UI. | Séparation des responsabilités. |
| ENG-019 | `LOCKED` | Les décimales sont sérialisées en chaînes. | Éviter perte de précision. |
| ENG-020 | `LOCKED` | Les erreurs exposent un code stable et correlation ID. | Support et audit. |
| ENG-026 | `LOCKED` | Le script `ci` (package.json) s'invoque via `pnpm run ci`, jamais `pnpm ci` seul. | pnpm réserve `ci` comme commande interne (équivalent `npm ci`) et ignore silencieusement le script du même nom sans `run` — trouvé lors de la vérification réelle de Prompt 01 (build agent), corrigé dans AGENTS.md, Engineering Constitution, Build Plan, Prompt Pack et README (2026-08-02). |

---

# 17. Décisions — Sécurité

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| SEC-001 | `LOCKED` | Deny by default. | Toute permission absente est refusée. |
| SEC-002 | `LOCKED` | Least privilege. | Réduire surface d’abus. |
| SEC-003 | `LOCKED` | MFA staff avant staging réaliste. | Protéger Control. |
| SEC-004 | `LOCKED` | Control n’a pas de super-admin silencieux. | Séparation des responsabilités. |
| SEC-005 | `LOCKED` | Secrets jamais dans Git, prompts ou logs. | Sécurité opérationnelle. |
| SEC-006 | `LOCKED` | Sandbox provider en production = fail-fast. | Éviter faux environnement. |
| SEC-007 | `LOCKED` | Webhooks signés, horodatés et idempotents. | Paiements/payouts fiables. |
| SEC-008 | `LOCKED` | File uploads privés et validés. | Protection KYC/support. |
| SEC-009 | `LOCKED` | Aucune biométrie maison. | Utiliser un provider spécialisé si nécessaire. |
| SEC-010 | `LOCKED` | Les signaux d’intégrité ne sanctionnent pas automatiquement. | Revue humaine. |
| SEC-011 | `LOCKED` | Rejet payout exige motif structuré. | Explicabilité. |
| SEC-012 | `CANDIDATE` | Double approbation selon seuil. | Seuil final à définir. |
| SEC-013 | `OPEN` | Seuil final de double approbation. | Dépend du risque et des montants. |
| SEC-014 | `OPEN` | Politique de rétention. | Dépend juridique/privacy. |
| SEC-015 | `CANDIDATE` | Audit indépendant avant scale public. | Assurance sécurité. |

---

# 18. Décisions — QA et fiabilité

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| QA-001 | `LOCKED` | CI dès la Semaine 1. | Aucun développement sérieux sans contrôle. |
| QA-002 | `LOCKED` | Tests unitaires des formules critiques. | Exactitude. |
| QA-003 | `LOCKED` | Property-based tests pour risk, payout et ledger. | Invariants. |
| QA-004 | `LOCKED` | Tests RLS obligatoires. | Isolation. |
| QA-005 | `LOCKED` | Tests de concurrence obligatoires. | Race conditions. |
| QA-006 | `LOCKED` | E2E des parcours critiques. | Vérification de bout en bout. |
| QA-007 | `LOCKED` | Visual regression ciblée. | Composants critiques. |
| QA-008 | `LOCKED` | Accessibility QA sur parcours critiques. | WCAG 2.2 AA. |
| QA-009 | `LOCKED` | Restore test avant lancement public. | Une sauvegarde non restaurée n’est pas validée. |
| QA-010 | `LOCKED` | Aucun S0/S1 ouvert avant bêta privée. | Fiabilité minimale. |
| QA-011 | `LOCKED` | Aucun finding Critical/High non traité avant bêta. | Sécurité minimale. |
| QA-012 | `CANDIDATE` | SLO bêta Web/BFF 99,5 %. | Interne, non contractuel. |
| QA-013 | `CANDIDATE` | Order ack/reject p95 < 750 ms. | Cible interne. |
| QA-014 | `CANDIDATE` | Risk update p95 < 500 ms. | Cible interne. |

---

# 19. Décisions — Opérations et trésorerie

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| OPS-001 | `LOCKED` | Réserve payout séparée de la trésorerie d’exploitation. | Gouvernance financière. |
| OPS-002 | `LOCKED` | Couverture cible normale ≥ 2,0x. | Prudence. |
| OPS-003 | `LOCKED` | 1,5x–2,0x = prudence. | Réduire croissance/promotion. |
| OPS-004 | `LOCKED` | 1,2x–1,5x = défensif. | Suspendre 25K et promotions. |
| OPS-005 | `LOCKED` | < 1,2x = critique. | Limiter/suspendre nouvelles ventes. |
| OPS-006 | `LOCKED` | Les actions de réserve affectent seulement les ventes futures. | Non-rétroactivité des payouts gagnés. |
| OPS-007 | `LOCKED` | Kill switches audités. | Contrôle incident. |
| OPS-008 | `LOCKED` | Modes : normal, close-only, paused, maintenance. | Gestion des incidents. |
| OPS-009 | `LOCKED` | Runbooks avant bêta. | Opérabilité. |
| OPS-010 | `LOCKED` | Status page avant public. | Transparence incident. |
| OPS-011 | `OPEN` | Provider status page. | À sélectionner. |
| OPS-012 | `OPEN` | Support SLA final. | Nécessite mesure réelle. |
| OPS-013 | `OPEN` | Payout SLA final. | Nécessite opérations réelles. |
| OPS-014 | `OPEN` | Processus comptable/ledger trésorerie réel. | Gate avant payout réel. |

---

# 20. Décisions — Build et livraison

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| BUILD-001 | `CANDIDATE` | Cible de bêta privée en huit semaines après préparation. | Ambitieuse mais structurée. |
| BUILD-002 | `LOCKED` | Semaine 0 avant code. | Documentation et dépôt d’abord. |
| BUILD-003 | `LOCKED` | Vertical slices. | Chaque phase doit être testable. |
| BUILD-004 | `LOCKED` | Sandbox avant tout provider réel. | Réduire risque. |
| BUILD-005 | `LOCKED` | Première bêta sans paiement réel. | Validation technique avant argent. |
| BUILD-006 | `LOCKED` | Première bêta sans payout réel. | Validation du workflow avant transfert réel. |
| BUILD-007 | `LOCKED` | Première bêta : 10 à 25 testeurs. | Contrôle opérationnel. |
| BUILD-008 | `LOCKED` | Mobile testé chaque semaine. | Pas de rattrapage final. |
| BUILD-009 | `LOCKED` | Audit après Foundation. | Vérifier architecture. |
| BUILD-010 | `LOCKED` | Audit après Trading Core. | Vérifier intégrité. |
| BUILD-011 | `LOCKED` | Audit après Performance/Payout. | Vérifier finance. |
| BUILD-012 | `LOCKED` | Public launch séparé de la bêta privée. | Gates supplémentaires. |
| BUILD-013 | `CANDIDATE` | Budget initial ≈ 1 000 USD. | Contrainte de départ. |
| BUILD-014 | `LOCKED` | Le logo final ne bloque pas le chemin critique. | Éviter retard inutile. |
| BUILD-015 | `LOCKED` | Aucun marketing massif avant stabilité. | Préserver confiance et budget. |

---

# 21. Décisions — Agents IA et prompts

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| AI-001 | `SUPERSEDED` | Codex est le constructeur principal. | Remplacé par AI-014 (2026-08-01). |
| AI-002 | `SUPERSEDED` | Claude Code intervient comme auditeur. | Remplacé par AI-014 (2026-08-01) : rôle fusionné constructeur+auditeur. |
| AI-003 | `LOCKED` | Aucun travail parallèle sur la même branche. | Éviter conflits et incohérences. |
| AI-004 | `LOCKED` | Prompt 00 avant chaque grande session. | Recharger le contexte réel. |
| AI-005 | `LOCKED` | Plan avant code. | Contrôle. |
| AI-006 | `LOCKED` | Un prompt par phase. | Scope maîtrisé. |
| AI-007 | `LOCKED` | Un agent ne fusionne pas sa propre PR. | Gouvernance. |
| AI-008 | `LOCKED` | Un agent ne modifie pas une règle. | Source de vérité documentaire. |
| AI-009 | `LOCKED` | Un agent ne prétend jamais qu’un test a réussi sans l’exécuter. | Honnêteté technique. |
| AI-010 | `LOCKED` | Un agent ne désactive pas un test pour obtenir du vert. | Intégrité QA. |
| AI-011 | `LOCKED` | Un agent ne reçoit aucun secret réel. | Sécurité. |
| AI-012 | `LOCKED` | Prompt 12 est un audit indépendant. | Trouver les défauts, pas valider par complaisance. |
| AI-013 | `LOCKED` | Prompt 13 ne lance jamais automatiquement le public. | Bêta privée seulement. |
| AI-014 | `LOCKED` | Claude Code est l'agent constructeur ET auditeur principal ; Codex n'est plus utilisé sur ce projet. | Décision explicite de Rod (2026-08-01). Remplace AI-001 et AI-002. Un agent ne fusionne toujours pas sa propre PR sans revue humaine (AI-007 inchangé). |

---

# 22. Décisions bloquantes avant Prompt 01

| ID | Statut | Décision / action |
|---|---|---|
| PRE-001 | `LOCKED` | Tous les documents de référence doivent être présents dans le dépôt. |
| PRE-002 | `LOCKED` | `AGENTS.md` doit être présent à la racine. |
| PRE-003 | `LOCKED` | `DECISION_LOG.md` doit être présent. |
| PRE-004 | `LOCKED` | Généré (2026-08-01). |
| PRE-005 | `LOCKED` | Généré (2026-08-01). |
| PRE-006 | `LOCKED` | Dépôt privé créé : github.com/rodthenewcomer/wariba-platform (branche `main`, encore vide de code/docs). |
| PRE-007 | `LOCKED` | Documents copiés dans docs/ (2026-08-01), branche feat/repository-foundation. |
| PRE-008 | `LOCKED` | Branche créée et poussée (2026-08-01). |
| PRE-009 | `SUPERSEDED` | Codex n'est plus l'agent constructeur — voir AI-014. |
| PRE-010 | `LOCKED` | Aucun code produit avant Prompt 00 et Prompt 01. |

---

# 23. Décisions ouvertes prioritaires — P0

Ces décisions ne bloquent pas toutes la fondation, mais bloqueront des phases précises.

| ID | Sujet | Bloque |
|---|---|---|
| OPEN-P0-001 | Formules exactes commissions/swaps sandbox puis réels | Trading Core final |
| OPEN-P0-002 | Cutoff weekend exact | Risk/Trading production |
| OPEN-P0-003 | Pending orders V1 | Trading scope |
| OPEN-P0-004 | Nombre maximal de comptes actifs | Commerce/public |
| OPEN-P0-005 | Politique reset/repurchase | Commerce/public |
| OPEN-P0-006 | KYC provider et parcours réel | Payout réel |
| OPEN-P0-007 | PSP réel | Paid beta |
| OPEN-P0-008 | Payout rails réels | Payout réel |
| OPEN-P0-009 | Provider market data réel | Public |
| OPEN-P0-010 | Avis juridique local | Public payant |
| OPEN-P0-011 | Politique de remboursement | Paid beta |
| OPEN-P0-012 | Critères WARIBA Review | Après payout #5 réel |
| OPEN-P0-013 | Politique de rétention | Production |
| OPEN-P0-014 | Provider hosting/région | Staging |
| OPEN-P0-015 | Provider observabilité | Bêta |
| OPEN-P0-016 | Seuil double approbation payout | Payout réel |
| OPEN-P0-017 | Logo final | Public branding |
| OPEN-P0-018 | Renommage ancien projet BRVM | Public WARIBA |

---

# 24. Décisions rejetées

| ID | Statut | Option rejetée | Motif |
|---|---|---|---|
| REJ-001 | `REJECTED` | R1STER comme marque actuelle. | Remplacé par WARIBA. |
| REJ-002 | `REJECTED` | MT5 white-label comme cœur produit. | WARIBA veut un terminal propriétaire. |
| REJ-003 | `REJECTED` | App native au lancement. | Budget et délai. |
| REJ-004 | `REJECTED` | Microservices dès le départ. | Surarchitecture. |
| REJ-005 | `REJECTED` | Kafka/Kubernetes. | Inutile pour bêta. |
| REJ-006 | `REJECTED` | Trailing drawdown. | Complexité et incompréhension. |
| REJ-007 | `REJECTED` | Frais d’activation. | Transparence commerciale. |
| REJ-008 | `REJECTED` | Délai fixe de 14 jours avant payout. | Déblocage fondé sur conditions. |
| REJ-009 | `REJECTED` | Split 70/30. | Préférence 80/20 puis 90/10. |
| REJ-010 | `REJECTED` | Consistance comme breach. | Elle ne bloque que l’éligibilité. |
| REJ-011 | `REJECTED` | Faux témoignages, faux payouts, faux partenaires. | Confiance. |
| REJ-012 | `REJECTED` | Design crypto/casino. | Positionnement. |
| REJ-013 | `REJECTED` | Agent IA donnant des signaux de trading. | Sécurité produit. |
| REJ-014 | `REJECTED` | Édition manuelle directe des balances. | Intégrité. |
| REJ-015 | `REJECTED` | Production automatique à chaque push. | Risque. |

---

# 25. Historique des versions

## v1.1 — 2026-08-02

Grille tarifaire candidate à cinq paliers (5K/10K/25K/50K/100K), prix fondateurs, et bascule de la devise commerciale de l’USD vers le FCFA (XOF) — voir OFFER-013 à OFFER-022. Statut `CANDIDATE_PENDING_ACTUARIAL_MODEL` jusqu’au WARIBA Actuarial & Risk Model v1.0. Documents mis à jour : Program Rulebook §7, Product Master Document §9, WARIBA_RULESET_v1.0.json (`commercial_offers`), Financial Model (feuille Hypothèses), Prompt Pack (Prompt 03, Prompt 08).

## v1.0 — 2026-08-01

Création initiale consolidée à partir de :

- Product Master ;
- Program Rulebook ;
- Financial Model ;
- UX Architecture ;
- Design System ;
- Engineering Constitution ;
- System Architecture ;
- Security, QA & Operations Standard ;
- Build Plan ;
- Prompt Pack ;
- AGENTS.md.

---

# 26. Prochaine action opérationnelle

`WARIBA_RULESET_v1.0.json` et `tokens.json` ont été générés (2026-08-01). Il reste :

```text
1. Créer le dépôt GitHub privé
2. Copier tous les documents
3. Créer la branche feat/repository-foundation
4. Lancer Codex
5. Envoyer Prompt 00
6. Examiner le rapport
7. Envoyer Prompt 01
```

---

# 27. Principe final

Une décision non écrite est une hypothèse.

Une hypothèse ne doit jamais devenir silencieusement :

- une règle ;
- une condition contractuelle ;
- une migration ;
- une formule ;
- une permission ;
- un comportement utilisateur ;
- un engagement commercial.

WARIBA doit rester gouverné par des décisions explicites, pas par les habitudes d’un agent ou les raccourcis d’un développeur.
