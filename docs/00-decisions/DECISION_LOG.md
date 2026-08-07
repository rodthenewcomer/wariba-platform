---
title: "WARIBA Decision Log"
version: "1.0"
document_id: "WARIBA-DECISION-LOG"
status: "ACTIVE — SOURCE DE VÉRITÉ DES DÉCISIONS"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
owner: "WARIBA Leadership, Product, Risk, Engineering & Operations"
last_updated: "2026-08-06"
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

Aucun agent IA ne peut créer ou modifier une décision sans :

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
| PROD-009 | `SUPERSEDED` | WARIBA Trade est un espace distinct du Hub. | Renommé WariX par PROD-024. |
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
| PROD-024 | `LOCKED` | **WariX** est le nom public du terminal propriétaire de trading simulé de WARIBA ; il reste distinct du Hub. | Décision explicite de Rod (2026-08-03). La route technique `/trade` peut rester stable. |

---

# 7. Décisions — Offre commerciale

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| OFFER-001 | `SUPERSEDED` | Offre 5K à 14 900 FCFA. | Hypothèse de bêta à valider avec données réelles. Voir OFFER-013. |
| OFFER-002 | `SUPERSEDED` | Offre 10K à 27 900 FCFA. | Offre principale candidate. Voir OFFER-014. |
| OFFER-003 | `SUPERSEDED` | Offre 25K à 59 900 FCFA. | Ne doit pas être disponible par défaut. Voir OFFER-015. |
| OFFER-004 | `LOCKED` | Le 10K est l’offre principale candidate. | Meilleur équilibre prix/valeur dans le modèle initial. |
| OFFER-005 | `SUPERSEDED` | Le 25K est derrière un feature flag et désactivé par défaut. | Remplacé par OFFER-023 pour la bêta sandbox. |
| OFFER-006 | `LOCKED` | Aucun frais d’activation. | Simplification et confiance. |
| OFFER-007 | `LOCKED` | Aucun abonnement obligatoire pour l’évaluation. | WARIBA ONE n’a pas de limite de temps. |
| OFFER-008 | `LOCKED` | Nature simulée visible avant paiement. | Transparence contractuelle. |
| OFFER-009 | `OPEN` | Politique définitive de remboursement. | Dépend du PSP et du conseil juridique. |
| OFFER-010 | `OPEN` | Nombre maximal d’évaluations actives par utilisateur. | Nécessaire avant lancement payant. |
| OFFER-011 | `OPEN` | Reset/repurchase commercial. | Doit être économiquement et éthiquement cadré. |
| OFFER-012 | `LOCKED` | Implémenter les comptes 50K et 100K. | Catalogue sandbox complet ; la commercialisation publique reste soumise aux gates. |
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
| OFFER-023 | `LOCKED` | Les cinq tailles WARIBA ONE — 5K, 10K, 25K, 50K et 100K — sont actives dans le catalogue, le checkout et l’activation Evaluation de la bêta sandbox. | Décision explicite de Rod (2026-08-03). Les feature flags indépendants restent des kill switches. Cette activation ne vaut ni approbation de vente publique, ni validation des prix candidats, ni définition des caps de payout 50K/100K. |

---

# 8. Décisions — WARIBA ONE

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| ONE-001 | `SUPERSEDED` | Objectif de profit : 8 %. | Remplacé par ONE-019. |
| ONE-002 | `SUPERSEDED` | Daily Loss Limit : 4 % du nominal. | Remplacé par ONE-020. |
| ONE-003 | `SUPERSEDED` | Maximum Loss : 8 % statique. | Remplacé par ONE-021. |
| ONE-004 | `SUPERSEDED` | Consistance : 40 %. | Remplacé par ONE-022. |
| ONE-005 | `SUPERSEDED` | Minimum 4 jours de trading. | Remplacé par ONE-023. |
| ONE-006 | `SUPERSEDED` | Minimum 3 journées qualifiées. | Remplacé par ONE-024. |
| ONE-007 | `SUPERSEDED` | Journée qualifiée : 0,20 % du nominal. | Remplacé par ONE-024. |
| ONE-008 | `SUPERSEDED` | Pas de trailing drawdown. | Remplacé par ONE-021 : EOD trailing 10 %. |
| ONE-009 | `LOCKED` | Pas de limite de temps. | Confiance et discipline plutôt que pression. |
| ONE-010 | `CANDIDATE` | Inactivité : 30 jours. | Prévenir comptes abandonnés. |
| ONE-011 | `LOCKED` | Overnight autorisé. | Flexibilité. |
| ONE-012 | `LOCKED` | Weekend hold interdit au lancement. | Réduction du risque événementiel. |
| ONE-013 | `LOCKED` | News trading autorisé en Evaluation. | Positionnement plus simple. |
| ONE-014 | `LOCKED` | Le target doit être réalisé. | Le PnL latent ne suffit pas. |
| ONE-015 | `LOCKED` | Le compte ne passe qu’avec positions et ordres fermés. | Éviter passage sur exposition ouverte. |
| ONE-016 | `SUPERSEDED` | Consistance > 40 % ne termine jamais le compte. | Ratio remplacé par 50 % dans ONE-022 ; le caractère non-breach est conservé. |
| ONE-017 | `LOCKED` | Reset quotidien basé sur UTC. | Une seule référence de temps. |
| ONE-018 | `CANDIDATE` | Reset à 00:00 UTC. | Baseline technique du Rulebook. |
| ONE-019 | `LOCKED` | Objectif Evaluation porté à 10 % du nominal, calculé sur le profit net réalisé. | Alignement du programme v1.1 et du modèle actuariel. |
| ONE-020 | `LOCKED` | Daily Loss porté à 3 % avec soft lock jusqu’au prochain reset. | Protection quotidienne sans terminaison automatique du compte. |
| ONE-021 | `LOCKED` | Maximum Loss remplacé par 10 % EOD trailing ; le plancher ne baisse jamais et se verrouille au nominal. | Protéger la progression tout en versionnant le plancher par journée finalisée. |
| ONE-022 | `LOCKED` | Best Day Rule portée à 50 %, non-breach et bloquante uniquement pour le passage. | Contrôle de concentration. |
| ONE-023 | `LOCKED` | Aucun minimum de jours en Evaluation. | La Best Day Rule contrôle la concentration sans délai artificiel. |
| ONE-024 | `LOCKED` | Suppression des journées qualifiées en Evaluation. | Élimination d’une règle devenue redondante. |

---

# 9. Décisions — WARIBA Performance et payouts

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| PERF-001 | `SUPERSEDED` | DLL Performance : 3 %. | Règle conservée et verrouillée dans PERF-032 avec le soft lock v1.1. |
| PERF-002 | `SUPERSEDED` | Maximum Loss Performance : 6 % statique. | Remplacé par PERF-033. |
| PERF-003 | `SUPERSEDED` | Consistance : 40 % par cycle. | Remplacé par PERF-034. |
| PERF-004 | `SUPERSEDED` | 5 journées qualifiées par cycle. | Remplacé par les Performance Days de PERF-025 et PERF-026. |
| PERF-005 | `SUPERSEDED` | Journée qualifiée : 0,30 % du nominal. | Remplacé par PERF-026. |
| PERF-006 | `SUPERSEDED` | Threshold payout #1 : 4 %. | Remplacé par le buffer permanent et les caps. |
| PERF-007 | `SUPERSEDED` | Threshold payouts #2 à #5 : 3 %. | Remplacé par le buffer permanent et les caps. |
| PERF-008 | `LOCKED` | Pas de délai fixe de 14 jours. | Éligibilité fondée sur performance et jours qualifiés. |
| PERF-009 | `SUPERSEDED` | Maximum distribuable : 50 % du profit net du cycle. | Supprimé par PERF-029 ; buffer et caps deviennent les protections principales. |
| PERF-010 | `SUPERSEDED` | Split payouts #1 à #4 : 80/20. | Remplacé par PERF-027. |
| PERF-011 | `SUPERSEDED` | Split payout #5 : 90/10. | Remplacé par PERF-028 et conservé au même ratio. |
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
| PERF-023 | `LOCKED` | Buffer permanent de 10 % avant tout payout. | Coussin non retirable. |
| PERF-024 | `LOCKED` | Seul l’excédent net réalisé au-dessus du buffer est retirable. | Protection permanente du compte. |
| PERF-025 | `LOCKED` | Cinq nouvelles Performance Days sont requises par payout et ne peuvent pas être réutilisées. | Répétabilité. |
| PERF-026 | `LOCKED` | Une Performance Day vaut au moins 0,50 % du nominal. | Règle proportionnelle. |
| PERF-027 | `LOCKED` | Split 85/15 pour les payouts #1 à #4. | Nouvelle offre v1.1. |
| PERF-028 | `LOCKED` | Split 90/10 au payout #5. | Récompense de continuité. |
| PERF-029 | `LOCKED` | Suppression de la limite universelle de distribution de 50 %. | Le buffer, les Performance Days, les caps et le split protègent WARIBA. |
| PERF-030 | `CANDIDATE` | Nouvelle grille de caps nets 5K–100K par rang de payout. | Validation du modèle financier calculable et du scénario Stress requise. |
| PERF-031 | `LOCKED` | WARIBA Review après le cinquième payout payé. | Aucun sixième payout automatique. |
| PERF-032 | `LOCKED` | DLL Performance : 3 % avec soft lock. | Alignement v1.1 entre Evaluation et Performance. |
| PERF-033 | `LOCKED` | Maximum Loss Performance : 10 % EOD trailing. | Même modèle de plancher versionné que l’Evaluation. |
| PERF-034 | `LOCKED` | Best Day Rule : 50 % par cycle, non-breach. | Contrôle de concentration avant payout. |
| PERF-035 | `LOCKED` | Aucun minimum général de jours en Performance hors cinq Performance Days par payout. | Éviter un délai artificiel distinct de la preuve requise. |

---

# 10. Décisions — Caps de payout

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| CAP-001 | `SUPERSEDED` | 5K P1–P2 : 100 USD. | Remplacé par PERF-030. |
| CAP-002 | `SUPERSEDED` | 5K P3–P4 : 150 USD. | Remplacé par PERF-030. |
| CAP-003 | `SUPERSEDED` | 5K P5 : 250 USD. | Remplacé par PERF-030. |
| CAP-004 | `SUPERSEDED` | 10K P1–P2 : 200 USD. | Remplacé par PERF-030. |
| CAP-005 | `SUPERSEDED` | 10K P3–P4 : 300 USD. | Remplacé par PERF-030. |
| CAP-006 | `SUPERSEDED` | 10K P5 : 500 USD. | Remplacé par PERF-030. |
| CAP-007 | `SUPERSEDED` | 25K P1–P2 : 400 USD. | Remplacé par PERF-030. |
| CAP-008 | `SUPERSEDED` | 25K P3–P4 : 600 USD. | Remplacé par PERF-030. |
| CAP-009 | `SUPERSEDED` | 25K P5 : 1 000 USD. | Remplacé par PERF-030. |
| CAP-010 | `LOCKED` | Les caps ne doivent pas être augmentés avant données de bêta. | Le scénario Stress est déficitaire. |

---

# 11. Décisions — Instruments et trading

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| TRD-001 | `LOCKED` | Instruments V1 : EURUSD, GBPUSD, USDJPY, XAUUSD, NAS100. | Scope réduit et clair. |
| TRD-002 | `LOCKED` | Market orders d’abord. | Réduire complexité. |
| TRD-003 | `LOCKED` | Stop Loss et Take Profit supportés. | Fonctionnalité minimale de trading. |
| TRD-004 | `LOCKED` | Partial close, full close et Close All supportés. | Gestion pratique des positions. |
| TRD-005 | `SUPERSEDED par TRADING-ORDER-001` | Pending orders avancés. | Prompt 7 Appendice 07-D résout ce point, override explicite de la décision de scope prise au 07-C (UX-TRADING-003, désormais `SUPERSEDED par UX-TRADING-009`) — voir la nouvelle série TRADING-ORDER-*/TRADING-ALERT-* ci-dessous pour le détail verrouillé. |
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
| TRD-024 | `SUPERSEDED` par TRD-036 | Levier Forex maximal 1:100 en Evaluation et Performance. | Contredisait TRD-018 (toujours `LOCKED`, jamais supersédé) sans le mentionner — `WARIBA_RULESET_v1.1.json` et `symbol_specs` avaient encodé le même levier pour les deux programmes. |
| TRD-025 | `SUPERSEDED` par TRD-036 | XAUUSD jusqu’à 1:50 avec modèle dynamique selon l’exposition agrégée, sans distinction de programme. | Même lacune que TRD-024 — implémenté à levier identique pour Evaluation et Performance. |
| TRD-026 | `SUPERSEDED` par TRD-036 | NAS100 jusqu’à 1:20, sans distinction de programme. | Même lacune que TRD-024/025. |
| TRD-027 | `LOCKED` | Limites d’exposition agrégées par taille de compte. | Le levier seul ne contrôle pas l’exposition. |
| TRD-028 | `LOCKED` | Marge utilisée maximale : 30 % Evaluation, 25 % Performance. | Protection de l’equity. |
| TRD-029 | `LOCKED` | `ExecutionStateValue` (WariX) n’a pas d’état `partially-filled` — préparation/envoi client, puis reçu/validé/accepté/rempli/rejeté/annulé côté serveur. | Corrige une dérive : TRD-021 (verrouillé) rend ce fill partiel structurellement inatteignable en V1, mais le type UI le portait encore. Corriger la dérive plutôt que construire une interface pour un état impossible. |
| TRD-030 | `LOCKED` | Le levier effectif et les bornes de quantité (min/max/pas) par symbole sont exposés au client WebSocket via un message `symbol_specs` (une fois par connexion), lu depuis `app.symbol_specs` déjà en base. | Nécessaire pour que WariX calcule marge estimée et validation de quantité côté client sans deviner une valeur ; `services/realtime` sélectionnait déjà ces colonnes en base sans les transmettre. |
| TRD-031 | `LOCKED` | La concentration par bucket d’exposition (Forex combiné, XAUUSD, NAS100) affichée dans Guardian est purement informative et réutilise les mêmes buckets que la porte d’exposition agrégée (`packages/database/src/trading.ts`, `FOREX_SYMBOLS`). | Évite la dérive entre ce qui bloque réellement un ordre et ce qui est affiché comme concentration ; jamais bloquant par elle-même (Rulebook §9.5). |
| TRD-032 | `OPEN` | Aucun calendrier news/weekend n’existe encore — le champ de restriction dans Guardian et Risk Ribbon reste présent mais toujours vide. | Ne prolonge pas TRD-016 (déjà `OPEN`) : fabriquer un faux calendrier violerait la clause d’arrêt du prompt. Absence honnête plutôt que valeur inventée, en attendant la résolution de TRD-016/TRD-017. |
| TRD-033 | `LOCKED` | Règle des 60 secondes minimum d'éligibilité de profit (Prompt 07B §4) : sur un close (partiel ou total), le PnL net de la portion (`realized_pnl` moins commission de clôture et quote-part déterministe de la commission d'ouverture) n'est compté dans `eligible_realized_pnl` que s'il est non positif ou si la durée entre `positions.opened_at` et l'horodatage serveur du fill de clôture est ≥ 60000 ms. Un profit net positif plus court est enregistré dans `ineligible_short_duration_profit`, toujours visible. Toute perte nette compte intégralement ; les frais sont appliqués avant la classification. | Le modèle hedging (TRD-020 : un seul fill d'ouverture par position) permet une allocation déterministe par portion, avec attribution du reliquat de commission au dernier close. Les deux horodatages sont exclusivement serveur. |
| TRD-034 | `LOCKED` | `program_eligible_balance` est la balance ledger réelle moins la somme durable des `ineligible_short_duration_profit`. Cette projection autoritaire est utilisée par la DLL, le Maximum Loss courant, la Best Day Rule, l'objectif d'évaluation et le plancher EOD trailing ; les snapshots quotidiens conservent balance réelle et balance éligible. | Intégration dédiée dans `program-eligibility.ts`, `risk.ts`, `risk-engine-inputs.ts`, `daily-finalization.ts` et le snapshot realtime, avec backfill et contraintes SQL. Aucune balance mutable parallèle n'est introduite. |
| TRD-035 | `LOCKED` | Surveillance glissante 24h des clôtures profitables sous 60s (Prompt 07B) : 3 occurrences = avertissement pédagogique + signal de risque journalisé, sans conséquence ; 6 occurrences = verrouillage temporaire des nouvelles ouvertures (clôtures/réductions toujours autorisées) + compte marqué pour revue manuelle. Jamais de breach automatique permanent à partir de ce seul signal. | `evaluateShortDurationMonitoring` lit directement les fills durables. La porte serveur `openPosition` refuse uniquement `market_open` à partir de six occurrences ; les clôtures ne passent pas par cette porte. Les franchissements exacts 3/6 sont audités sans doublon. |
| TRD-036 | `LOCKED` | Réaffirme TRD-018 sur les valeurs v1.1 : levier Evaluation inchangé (Forex 1:100, XAUUSD 1:50, NAS100 1:20) ; levier Performance abaissé à Forex 1:60, XAUUSD 1:25, NAS100 1:10 (mêmes ratios que TRD-018 : 0,60× Forex, 0,50× XAUUSD/NAS100, appliqués aux nouveaux plafonds Evaluation v1.1). | Trouvé lors de l'audit préparatoire du Prompt 05 : `symbol_specs`/`WARIBA_RULESET_v1.1.json` encodaient le même levier pour les deux programmes, contredisant TRD-018 sans jamais le superséder explicitement. Rod confirme le principe (Performance doit rester inférieur) ; les ratios de TRD-018 sont reconduits plutôt qu'un nouveau jugement de risque. Numéroté TRD-036 (pas TRD-029) lors de la fusion avec `main` — TRD-029 était déjà pris par la décision `ExecutionStateValue` du Prompt 07, développée en parallèle sur une autre branche. |
| TRADING-ORDER-001 | `LOCKED` | Prompt 7 Appendice 07-D — Buy/Sell Limit/Stop supportés, GTC uniquement (`time_in_force` fixé à `'GTC'` en base, `app.pending_orders`) ; aucune autre durée n'est proposée. | Résout TRD-005. Machine d'états canonique : `active` → `triggered` → `filled` \| `failed`, ou `active` → `cancelled`, ou rejet direct à la création (`rejected` n'est jamais une ligne persistée — un rejet à la création ne crée pas de ligne du tout). `suspended_market_data` existe dans le schéma mais n'est pas encore atteint par ce build (aucun scénario d'outage n'écrit ce statut). |
| TRADING-ORDER-002 | `LOCKED` | Un ordre en attente déclenché se remplit via la transaction `openPosition()` existante et inchangée (`packages/database/src/trading.ts`, nouveau paramètre `fillPriceOverride`), jamais un second chemin d'exécution divergent. Le SL/TP demandé à la création s'active atomiquement dans ce même fill. | Un seul chemin d'exécution financière autoritatif dans tout le système, plutôt que dupliquer commission/ledger/évaluation de risque pour les ordres en attente. |
| TRADING-ORDER-003 | `LOCKED` | La vérification d'exposition agrégée à la création d'un ordre en attente ne considère que les positions actuellement ouvertes, jamais la quantité d'autres ordres en attente sur le même symbole. | Limitation documentée et acceptée : plusieurs ordres en attente peuvent en théorie, une fois tous déclenchés, dépasser ensemble la limite d'exposition. Le filet de sécurité réel est la re-vérification propre d'`openPosition()` au moment du déclenchement — un ordre qui dépasserait la limite au moment de se remplir est marqué `failed`, jamais silencieusement exécuté en sur-exposition. |
| TRADING-ORDER-004 | `LOCKED` | Aucune infrastructure d'élection de leader / fencing / active-standby n'existe dans ce dépôt (`services/realtime` est un processus unique ; `packages/database` n'a aucune primitive de coordination distribuée). La sécurité des ordres en attente repose sur le même modèle que toute autre commande du système : un unique écrivain autoritatif, verrous de ligne Postgres, et clés d'idempotence. | Le prompt suppose à tort qu'une telle infrastructure existe déjà ; construire un vrai basculement multi-nœud serait un projet d'infrastructure séparé, non demandé par ailleurs et hors du périmètre de cet appendice. Documenté explicitement plutôt que fabriqué ou passé sous silence. |
| TRADING-ORDER-005 | `LOCKED` | L'ordre en attente extension le ticket d'ordre existant (sélecteur de type Market/Limit/Stop), jamais un second ticket. Le menu contextuel du graphique ne propose que les types Achat/Vente Limite/Stop réellement valides au prix cliqué par rapport au bid/ask courant (`isPendingOrderCreationPriceValid`, `@wariba/domain`), jamais un choix invalide en façade désactivée. | Remplace la décision de scope UX-TRADING-003 (07-C) — voir UX-TRADING-009. |
| TRADING-ALERT-001 | `LOCKED` | Les alertes de prix sont évaluées exclusivement côté serveur, sur chaque tick réel de `services/realtime` (`evaluateAlerts`), jamais côté client. | Cohérent avec TRD-006 (prix d'exécution serveur, le client n'est jamais autoritaire) appliqué au domaine des alertes. |
| TRADING-ALERT-002 | `LOCKED` | Les alertes sont basées sur un franchissement (`cross_above`/`cross_below`, détecteur de transition via `last_observed_side_above`), jamais une égalité de seuil. La toute première évaluation après création ou réactivation établit seulement la base de référence et ne déclenche jamais. | Une alerte créée alors que le prix est déjà du côté "déclenchant" ne doit pas se déclencher immédiatement sans franchissement réel observé. |
| TRADING-ALERT-003 | `LOCKED` | Les alertes sont propres à l'utilisateur, pas au compte (une surveillance personnelle d'un symbole, indépendante de tout compte de trading spécifique), livrées via le canal `user.{userId}.notifications` (existait sans producteur/consommateur depuis le Prompt 01) et persistées dans `app.alert_notifications`. | Un trader avec plusieurs comptes n'a besoin que d'un seul jeu d'alertes par symbole, pas d'un jeu dupliqué par compte. |

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
| DATA-010 | `LOCKED` | L'architecture provider de market data (Prompt 07B §5) devient à trois implémentations interchangeables derrière la même interface `MarketDataProvider` : `MockMarketDataProvider` (renommage de `SandboxMarketDataProvider`, générateur synthétique déterministe), `ReplayMarketDataProvider` (rejoue une séquence de ticks enregistrée, jamais de prix inventé hors de l'enregistrement), `FcsMarketDataProvider` (adaptateur FCS Business réel — voir DATA-011). La sélection se fait uniquement par `MARKET_DATA_PROVIDER` (`mock`\|`replay`\|`fcs`), jamais par une classe concrète nommée en dur côté appelant. | `packages/adapters/src/{market-data-provider,replay-market-data-provider,fcs-market-data-provider}.ts` ; sélection dans `services/realtime/src/market.ts` (`createMarketDataProvider`). `MARKET_DATA_REPLAY_MODE=true` force `ReplayMarketDataProvider` même si `MARKET_DATA_PROVIDER=fcs` — garde-fou explicite pour ne jamais risquer une connexion live par accident. |
| DATA-011 | `OPEN` | Classification Prompt 7B §18 : `BLOCKED BY CREDENTIAL`. `FcsMarketDataProvider` est structurellement complet (contrat d'environnement, échec immédiat sans `FCS_API_KEY`, failover primaire/secondaire avec backoff, cache de ticks, souscriptions) mais son parsing du message WebSocket (`parseFcsMessage`) n'est pas vérifié contre le protocole réel FCS — aucune clé FCS Business n'a jamais existé dans cet environnement pour le tester. Ne jamais prétendre qu'une connexion live fonctionne sans un test réel. | Quiconque obtient une clé FCS réelle doit vérifier/ajuster `parseFcsMessage` et le format de souscription contre une session réelle avant toute mise en production. |

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
| UX-017 | `LOCKED` | `preparing` et `sending` sont des états 100 % client de l’état d’exécution WariX, jamais persistés côté serveur, posés avant/pendant l’envoi WebSocket. | Design System §25.7 ne décrit que les états confirmés serveur, ce qui semblait en conflit avec UX Architecture §22.9 ; les deux restent cohérents une fois `ExecutionState` compris comme couvrant le cycle complet (client + serveur), pas seulement la partie serveur. |
| UX-TRADING-001 | `LOCKED` | WariX affiche les lignes de position autoritatives directement sur le graphique. | Prompt 7 Appendice 07-C — position visible et gérable sans quitter le graphique. |
| UX-TRADING-002 | `LOCKED` | Le SL et le TP peuvent être activés et modifiés via des contrôles graphiques glissables et une saisie de prix exact. | Chaque glissement reste un aperçu local jusqu’à confirmation serveur ; la saisie exacte est l’alternative non-glissée obligatoire (accessibilité clavier/lecteur d’écran). |
| UX-TRADING-003 | `SUPERSEDED par UX-TRADING-009` | Le clic droit sur le graphique ouvre un menu contextuel d’actions manuelles côté desktop. | Aucun ordre en attente (Limit/Stop) ni alerte de prix n’existe dans ce build (seuls market_open/partial_close/full_close/modify_sl/modify_tp sont implémentés) — le menu n’propose donc que des actions réellement supportées, jamais un choix invalide. |
| UX-TRADING-004 | `LOCKED` | Le mobile utilise l’appui long et des feuilles de gestion de position (bottom sheets). | Aucun clic droit n’existe sur mobile. |
| UX-TRADING-005 | `LOCKED` | La clôture partielle propose 25 %, 50 %, 75 % et une quantité personnalisée valide. | Un pourcentage qui s’arrondirait à zéro ou à la position entière est désactivé avec explication plutôt que silencieusement corrigé. |
| UX-TRADING-006 | `LOCKED` | Les clôtures partielles utilisent la comptabilité par fill déjà en place (un fill d’ouverture, allocation déterministe de la commission) et la règle d’éligibilité 60 secondes déjà verrouillée (v1.11), appliquée par portion clôturée. | TRD-020 (modèle hedging, verrouillé) reste inchangé — un modèle FIFO multi-lots n’est ni nécessaire ni introduit ; `app.fills` porte déjà tous les champs d’audit par clôture partielle. |
| UX-TRADING-007 | `LOCKED` | Toutes les mutations de trading restent server-authoritative et idempotentes, y compris la réduction de risque mise en file pendant une donnée de marché obsolète (`app.position_reduction_queue`), exécutée une seule fois sur le premier prix à jour. | Réduire l’exposition doit rester possible pendant une donnée obsolète, sans jamais exécuter contre un ancien prix ni dupliquer l’exécution. |
| UX-TRADING-008 | `LOCKED` | L’interaction de WariX peut s’inspirer de terminaux établis, mais son langage visuel (couleurs, espacement, icônes, typographie, formes) reste original — jetons `--wariba-chart-*`/`--wariba-status-*` existants uniquement. | Positionnement de marque distinct ; aucune copie visuelle d’une autre plateforme. |
| UX-TRADING-009 | `LOCKED` | Prompt 7 Appendice 07-D — le menu contextuel du graphique propose désormais dynamiquement les types d'ordre en attente réellement valides au prix cliqué (jamais plus de deux des quatre : Achat/Vente Limite/Stop, selon la position du prix par rapport au bid/ask courant) et « Créer une alerte ici » (toujours proposé, sans contrainte directionnelle). Les ordres en attente et les alertes actives sur le symbole affiché apparaissent comme des lignes de prix natives avec une poignée glissable interactive (même mécanisme que les lignes SL/TP de 07-C — `series.createPriceLine` pour le trait, overlay HTML pour l'interactivité), chacune avec sa propre alternative non-glissée (flèches clavier, bouton « Gérer »). Un centre de notifications accessible depuis l'en-tête liste l'historique des alertes déclenchées (marquage lu) et gère les alertes existantes (activer/désactiver/supprimer/créer). | Remplace UX-TRADING-003, dont la justification (« aucun ordre en attente ni alerte n'existe ») n'est plus vraie après cet appendice. |

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
| DS-017 | `LOCKED` | `/offres` et le teaser WariX de la homepage adaptent l’agencement générique d’une page pricing SaaS/prop-firm (cartes de prix → règles nommées → glossaire dépliable → FAQ), avec les tokens, couleurs et contenu WARIBA uniquement. | Autorisé explicitement par le fondateur (session du 2026-08-04, après recherche structurelle sur `topstep.com/no-activation-fee`). Distingue un agencement générique et non protégé (positions des sections, pas de charte visuelle propriétaire) d’une copie visuelle interdite : ne reprend ni logo, ni imagerie, ni copie, ni palette d’un concurrent — reste conforme à DS-011 (anti-vibe-code) et à l’interdiction Topstep/FTMO/Tradeify du Prompt Pack §2.3. |

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
| ENG-027 | `LOCKED` | Le runtime de référence passe à Node.js 24 LTS, épinglé par `.nvmrc`, avec une plage 24.x dans `package.json`. | Node.js 20 est EOL et le SDK Supabase émettait un avertissement de dépréciation au build. Migration validée dans l'audit Prompts 01–04 (2026-08-03). |
| ENG-028 | `LOCKED` | Le Hub calcule le risque et la balance affichés à partir du solde réalisé (`trading_ledger_entries` + `account_daily_snapshots`) uniquement — `currentUnrealizedPnl` reste `"0"`, jamais une equity temps réel. | Le seul code capable de calculer une equity avec PnL latent (`services/realtime/src/snapshot.ts`) dépend d'un générateur de prix en mémoire propre au process WebSocket, non réutilisable dans une page serveur Next.js sans nouvelle dépendance d'architecture. Aucune colonne de prix courant par position n'existe en base de toute façon. Cohérent avec la règle WARIBA ONE elle-même (seul le profit net réalisé compte pour l'objectif) et avec l'exigence UX de ne jamais afficher une fausse précision : si des positions sont ouvertes, le Hub l'indique et renvoie vers WariX pour le PnL latent temps réel. Décidé avec Rod (2026-08-04). |
| ENG-029 | `LOCKED` | Répartition WariX : Risk Ribbon lit `snapshot.risk` (état compte permanent) ; Guardian reprend les mêmes valeurs pour l'impact de l'ordre en cours d'édition ; l'Order Ticket ne fait aucun calcul (champs bruts uniquement). | Évite trois endroits qui recalculent indépendamment « DLL restante » et risquent de diverger ; conforme à la règle Design System §48 déjà respectée par Risk Ribbon. |
| ENG-030 | `LOCKED` | Les chiffres temps réel de Guardian/Risk Ribbon (equity, DLL restante, Maximum Loss restante) sont rafraîchis par une re-diffusion serveur périodique (~4 s) tant qu'un compte a au moins une position ouverte, jamais par un recalcul côté client. | `buildAccountSnapshot` calculait déjà ces valeurs avec le prix courant mais seulement à la (re)connexion ou après un ordre ; rester server-authoritative (ENG-002) plutôt que dupliquer la formule en client. |
| ENG-031 | `LOCKED` | Le scope "Notifications" du Hub (Prompt 06 #12) est servi par `recent_activity_view` (transitions d'état + violations de risque + exécutions) plutôt que par une table de notifications dédiée. | Aucune table de notifications n'existe et en construire une (avec statut lu/non-lu) serait un chantier séparé. Chaque événement pertinent pour un trader a déjà une ligne réelle dans une de ces trois tables — pas de nouvelle infrastructure, pas de donnée inventée. Réduction de scope assumée, décidée avec Rod (2026-08-04). Numéroté ENG-031 (pas ENG-029) lors de la fusion avec `main` — ENG-029 était déjà pris par une décision WariX développée en parallèle sur une autre branche. |
| ENG-032 | `LOCKED` | L'état d'affichage Hub « attention » (entre normal et soft lock) se déclenche à ≥ 70 % du budget de perte quotidienne utilisé, ou à ≤ 30 % du budget de perte maximale restant (`nominal_balance × maximum_loss_rate` comme dénominateur fixe). | Seuils d'affichage uniquement, dérivés de nombres déjà calculés par le moteur de risque — aucune nouvelle règle financière, pas de nouveau plancher. Nécessaire car le moteur de risque ne distingue aujourd'hui que normal (implicite) et soft-lock/breach (booléens), sans zone d'alerte intermédiaire. Décidé avec Rod (2026-08-04). Numéroté ENG-032 (pas ENG-030) pour la même raison qu'ENG-031. |

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
| SEC-016 | `LOCKED` | SEC-006 s'étend explicitement aux providers `mock` et `replay` (Prompt 07B), pas seulement à la valeur littérale `sandbox` : `assertNotSandboxInProduction` refuse le démarrage en production pour `MARKET_DATA_PROVIDER` valant `sandbox`, `mock` ou `replay`. | Nécessaire car `.env.local` utilise désormais `MARKET_DATA_PROVIDER=mock` comme valeur par défaut locale — l'ancienne regex `/sandbox/i` ne l'aurait pas couverte, ce qui aurait silencieusement contourné le garde-fou en production. `packages/config/src/index.ts`. |

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
| OPS-004 | `SUPERSEDED` | 1,2x–1,5x = défensif avec suspension du 25K. | Remplacé par OPS-015 pour la grille à cinq tailles. |
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
| OPS-015 | `LOCKED` | À 1,2x–1,5x de couverture, suspendre les nouvelles ventes des tailles à plus forte exposition par ordre 100K, 50K, 25K, puis réduire les promotions. | Préserver la réserve sans modifier rétroactivement un compte déjà activé. |

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
| AI-001 | `SUPERSEDED` | Codex est le constructeur principal. | Remplacé par AI-014 (2026-08-01), puis AI-015 (2026-08-03). |
| AI-002 | `SUPERSEDED` | Claude Code intervient comme auditeur. | Remplacé par AI-014 (2026-08-01), puis AI-015 (2026-08-03). |
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
| AI-014 | `SUPERSEDED` | Claude Code est l'agent constructeur ET auditeur principal ; Codex n'est plus utilisé sur ce projet. | Décision historique de Rod (2026-08-01), remplacée par AI-015 le 2026-08-03. |
| AI-015 | `LOCKED` | Codex, Claude Code ou tout autre agent IA explicitement mandaté peut construire, modifier, auditer et documenter le code WARIBA. | Décision explicite de Rod (2026-08-03). Les agents restent soumis aux sources de vérité, à AGENTS.md, aux branches autorisées, aux tests réels et à la revue humaine. AI-003 et AI-007 à AI-011 restent inchangées. |

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
| PRE-009 | `SUPERSEDED` | Restriction historique de Codex, remplacée par l’autorisation multi-agent AI-015. |
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

# 25. Décisions — Marchés (catalogue)

Appendice 07-A — corrige uniquement le périmètre de marché de Prompt 07B, sans
toucher au terminal, au trading core, au risk engine, à la résilience, au
trading manuel ni à la règle d'éligibilité de profit à 60 secondes (TRD-033).

| ID | Statut | Décision | Motif / conséquence |
|---|---|---|---|
| MARKET-001 | `LOCKED` | Toutes les paires Forex temps réel disponibles chez le provider sont éligibles au catalogue WariX. | Le catalogue n'est plus une liste fixe à dix symboles ; découverte dynamique via le catalogue de symboles du provider, jamais de ticker inventé localement. |
| MARKET-002 | `LOCKED` | XAUUSD est activé au lancement. | Déjà livré (Prompt 04) — confirmé, pas de changement de code. |
| MARKET-003 | `LOCKED` | NAS100 et SPX500 sont activés au lancement comme instruments indices simulés. | NAS100 déjà livré et testé de bout en bout ; SPX500 est une extension du même modèle mais son pipeline de trading complet (spécification d'instrument, bucket d'exposition, prix) n'est pas encore construit — voir MARKET-004 pour le statut d'implémentation réel. |
| MARKET-004 | `OPEN` | Les instruments énergie disponibles chez le provider peuvent être activés au lancement après validation de leur spécification de contrat. | Non implémenté cette session : `TradableSymbol`, `app.symbol_specs` et les buckets d'exposition agrégée (`forex_lots`/`xauusd_lots`/`nas100_contracts`, colonnes fixes une par bucket) devraient être étendus pour SPX500/WTIUSD/BRENTUSD/NGASUSD — changement de schéma réel, pas une simple activation de configuration. Décision produit verrouillée (le catalogue cible est MARKET-001/002/003/004), mais l'ingénierie correspondante reste `OPEN`. |
| MARKET-005 | `LOCKED` | Les futures CME restent hors du périmètre de lancement initial. | `FUTURES_ENABLED = false` inchangé. |
| MARKET-006 | `LOCKED` | Le catalogue est piloté par le provider et cherchable, jamais une liste codée en dur. | Objectif produit verrouillé ; la découverte dynamique complète du catalogue FCS (au-delà des cinq symboles actuellement dans `TradableSymbol`) reste un travail d'ingénierie distinct, non fait cette session — voir MARKET-004. |

---

# 26. Historique des versions

## v1.17 — 2026-08-07

Prompt 08 Phase D (moteur de payout) intégré. Formule complète en
fonctions pures (`packages/domain/src/performance-math.ts`) : split
résolu par rang de cycle (PERF-027/028), cap converti en base brute
équivalente, base brute approuvée = min(excédent éligible, base demandée,
cap converti) — PERF-029, aucun plafond universel de 50 %.
`waribaShare` est calculé par soustraction (`approvedGrossBase -
traderNetCash`), jamais par une seconde multiplication indépendante —
sinon l'arrondi du dernier centime peut diverger entre les deux, et le
ledger doit réconcilier exactement. `WARIBA_PERFORMANCE` republié en
v1.1.0 (v1.0.0 retiré) pour ajouter la grille de caps PERF-030
(`payout_caps_by_nominal_balance`, toujours `CANDIDATE`) — même
précédent que le retrait de WARIBA_ONE v1.0.0. Nouvelle table
`app.payout_requests` : un seul index unique partiel sur `cycle_id` pour
tout statut non terminal est la véritable garantie anti-duplication
(PERF-013), pas seulement une vérification applicative. KYC et méthode de
payout sont des drapeaux sandbox (`kyc_sandbox_verified`,
`payout_method_sandbox_configured`), jamais une vraie vérification
d'identité — mis à jour uniquement par le staff (Control, Phase G).
L'éligibilité complète (`evaluatePayoutEligibility`) est revalidée à
l'identique à la demande ET à l'approbation, pas seulement au moment de
la demande — le vrai test contre "approve while account state changes".
Le débit ledger (`payout_debit`, PERF-014) et la clôture de cycle
n'arrivent qu'au règlement (`settlePayoutProviderInTransaction`), jamais
à l'approbation — idempotent par statut de la ligne elle-même (`paid`
n'est jamais redébité). Périmètre volontairement réduit par rapport au
texte du prompt : un seul `MockPayoutProvider` implicite plutôt que huit
adaptateurs nommés (Wave, Orange Money, etc.) — non construits, à noter
honnêtement comme non résolu plutôt que créés comme façades vides.
Reserve/trésorerie (Phase E) n'est pas encore branché sur l'approbation.

## v1.16 — 2026-08-07

Prompt 08 Phase C (buffer permanent, cycles de payout, Performance Days)
intégré. Nouvelles tables `app.performance_cycles` (au plus un cycle non
`closed` par compte — index unique partiel, pas seulement une garantie
applicative) et `app.performance_review_cases` (créée après le 5e cycle,
PERF-018/031 ; statut minimal `open`/`closed`, aucun critère de sortie
inventé — PERF-021/022 restent `OPEN`). Une Performance Day appartient à
un cycle par simple appartenance de date (`trading_day` dans
`[opened_at, closed_at)`), jamais par un flag "consommé" séparé — même
raisonnement "dériver, ne pas dupliquer" que le reste du dépôt. Formules
pures dans `packages/domain/src/performance-math.ts`
(`computePayoutBufferFloor`, `computeEligibleExcess`,
`computePerformanceDayThreshold`) vérifiées contre les tables complètes du
Program Rulebook v1.1 §7.1/§8 pour les cinq tailles. `evaluateCycleProgress`
reste volontairement scindé de l'éligibilité payout complète (Phase D) —
il ne vérifie que buffer/jours/consistance, pas position ouverte/ordre en
attente/KYC, pour éviter de dupliquer les vérifications d'équité déjà
faites par `risk.ts`. Bug réel trouvé et corrigé en cours de route : les
tests d'intégration existants qui font passer un compte Evaluation
(`risk.integration.test.ts`) déclenchent maintenant la création d'un
compte Performance en effet de bord — leur nettoyage générique ne le
savait pas et échouait sur la contrainte de clé étrangère
`source_evaluation_account_id_fkey` en tentant de supprimer le compte
Evaluation en premier ; corrigé par une découverte générique des comptes
Performance engendrés dans `afterAll`, plutôt que par un suivi manuel par
test.

## v1.15 — 2026-08-07

Prompt 08 Phase B (programme + moteur de risque pour WARIBA Performance)
intégré sur `feat/prompt-08-program-engine`. Un compte Performance n'a pas
de notion de "réussite" (PROGRAM-005/006, PERF-020) — `risk-engine.ts` est
reparamétré pour l'exprimer par l'absence du champ `profit_target_rate`
plutôt que par un flag de programme séparé : `RiskPolicyParameters` ne
retient que le sous-ensemble DLL/Max Loss/Best Day réellement utilisé par
le moteur, structurellement satisfait par les deux schémas de policy
(`evaluationOnePolicyParametersSchema` et le nouveau
`performancePolicyParametersSchema`). L'absence du champ est ce qui
empêche `pass_pending` d'être jamais recommandé pour un compte Performance
— pas un flag qu'un futur changement pourrait faire diverger de la policy
réellement chargée. Premier `policy_versions` WARIBA_PERFORMANCE publié
(1.0.0), mêmes paramètres de risque que WARIBA_ONE (PERF-032/033/034).
Activation atomique : `activatePerformanceAccountInTransaction` est
appelée dans la même transaction Postgres que la transition
`pass_pending -> passed` (`packages/database/src/risk.ts`) — soit les deux
atterrissent, soit aucune. `trading_accounts.source_purchase_order_id`
(`not null unique`) ne pouvait pas représenter la provenance d'un compte
Performance (issu d'un compte Evaluation, pas d'un nouvel achat) ; ajout de
`source_evaluation_account_id` (nullable, unique) avec une contrainte
`check` garantissant qu'exactement une des deux colonnes de provenance est
renseignée — transforme PERF-020 en invariant base de données, pas
seulement applicatif. Aucun changement au moteur de trading WariX
lui-même — un compte Performance l'utilise sans modification. Voir
TRADING docs à venir (Phase C-H) pour le reste du programme (buffer,
Performance Days, payouts, treasury, actuariel) — non construit dans cette
étape, volontairement scindée pour rester revuable.

## v1.14 — 2026-08-06

Revue d'acceptation finale de l'Appendice 07-D (six portes, remplaçant le
verdict READY générique livré en v1.13 par une classification à trois
niveaux). Preuve SL/TP attaché : test end-to-end réel
(`services/realtime/tests/pending-order-lifecycle.e2e.test.ts`) — un Buy
Limit avec SL/TP attachés se déclenche exactement une fois, remplit dans la
même transaction Postgres que `openPosition()`, et un reconnect restitue
l'entrée/SL/TP corrects. Preuve mobile : appui long réel simulé par
dispatch direct de `PointerEvent(pointerType:'touch')`
(`apps/web/tests/e2e/trade.spec.ts`, describe « WariX mobile chart context
menu ») confirmant bottom sheet, Achat/Vente au marché, suggestions
Limit/Stop contextuelles, création d'alerte, actions de gestion de
position, cibles tactiles ≥44px. Preuve de reprise single-node : test
end-to-end qui tue puis relance le processus réel
(`services/realtime/tests/pending-order-restart-recovery.e2e.test.ts`) —
un ordre en attente et une alerte créés loin du marché survivent au
restart, sont rechargés depuis Postgres, et se déclenchent exactement une
fois sur le nouveau processus une fois rapprochés du marché ; un
reconnect voit l'état final correct. État visuel PENDING_SERVER étendu aux
lignes d'ordres en attente et d'alertes (`orderSyncStateFor`,
`TradeChart.tsx`) : un cinquième état `rejected` est ajouté à
`LevelSyncState` (`ChartPositionOverlay.tsx`) pour le cas « refusé et
annulé », jusqu'ici non conçu même pour le SL/TP de position — le prix
affiché n'avance jamais de façon optimiste (toujours lié à la valeur
confirmée serveur), donc ce nouvel état est purement indicatif, affiché
~2,5s puis effacé (`TradeClient.tsx`). Régression verrouillée par
`apps/web/tests/ChartPendingOverlay.test.tsx` (13 tests, vérifiés
échouants avant le patch via `git stash`). Patches documentaires ciblés
(pas de réécriture) sur `WARIBA_RULESET_v1.1.json` (les deux flags
`pending_orders_supported`/`price_alerts_supported` étaient encore à
`false`), le Program Rulebook v1.0 (décision ouverte #12 fermée), le
Product Master v1.1 (§8 encore « aucun ordre en attente proposé »), le
System Architecture v1.0 (§28.1 nouveau, §64.1 étendu avec la preuve de
reprise), le Security QA Operations Standard v1.0 (runbook #16 — ordre
bloqué en statut `triggered` après un crash entre claim et fill, aucune
tâche de réconciliation automatique n'existe), le Prompt Pack v1.0 (§34
nouveau) et le centre d'aide (`HelpCenterClient.tsx`, trois nouvelles
entrées FAQ WariX). `MULTI_NODE_PRODUCTION_READY` reste `false` de façon
explicite — aucune élection de leader, fencing ou standby n'a été
construit ; c'était déjà documenté honnêtement en v1.13 et n'a pas
changé ici.

## v1.13 — 2026-08-06

Prompt 7 Appendice 07-D (ordres en attente et alertes de prix WariX)
intégré, override explicite de la décision de scope prise au 07-C (v1.12) :
Achat/Vente Limite/Stop server-authoritative, GTC uniquement, machine
d'états `active → triggered → filled|failed` (ou `cancelled`), déclenchement
évalué sur chaque tick réel par `services/realtime` puis remplis via la
transaction `openPosition()` existante et inchangée (`fillPriceOverride`),
SL/TP demandé activé atomiquement dans ce même fill. Alertes de prix
server-side par franchissement (jamais égalité de seuil), propres à
l'utilisateur et non au compte, avec historique de notifications persistant
et centre de notifications dans l'en-tête (marquage lu, activer/désactiver/
supprimer/créer). Ticket d'ordre existant étendu (sélecteur Market/Limit/
Stop), jamais dupliqué ; menu contextuel du graphique désormais dynamique
(suggestions Limit/Stop valides au prix cliqué, jamais un choix invalide) ;
lignes d'ordres en attente et d'alertes glissables sur le graphique, même
mécanisme que les lignes SL/TP de 07-C. Absence honnête documentée :
aucune infrastructure d'élection de leader / fencing / active-standby
n'existe dans ce dépôt malgré la prémisse de l'appendice — la sécurité
repose sur le modèle déjà en place (écrivain unique, verrous de ligne,
clés d'idempotence), pas sur un vrai basculement multi-nœud qui resterait
à construire séparément. Résout TRD-005 ; remplace UX-TRADING-003. Voir
TRADING-ORDER-001 à 005, TRADING-ALERT-001 à 003 et UX-TRADING-009
ci-dessus. Deux bugs pré-existants réels trouvés et corrigés en cours de
route sur la suite E2E de 07-C (sans lien direct avec 07-D) : le contenu
d'un `<dialog>` fermé reste dans le DOM (jamais démonté), rendant certains
`getByText` ambigus avec des cellules de tableau identiques ; et
`lightweight-charts` empile plusieurs éléments `<canvas>`, rendant
`page.locator('canvas').first()` instable pour un clic droit — corrigé en
donnant au conteneur du graphique un rôle accessible (`role="img"`,
`aria-label`) ciblé à la place.

## v1.12 — 2026-08-06

Prompt 7 Appendice 07-C (gestion visuelle de position WariX) intégré :
ligne de position sur le graphique avec PnL live et état de synchronisation,
SL/TP glissables avec aperçu local distinct de la valeur confirmée serveur
et alternative clavier/saisie exacte, menu contextuel clic droit (desktop)
et appui long (mobile) limité aux actions réellement supportées, clôture
partielle 25/50/75/personnalisé avec avertissement d’éligibilité sous 60
secondes reprenant la règle v1.11, et file d’attente de réduction de
position pendant une donnée de marché obsolète (`app.position_reduction_queue`,
exécutée une seule fois sur le premier prix à jour). Aucun moteur d’ordres
en attente (Limit/Stop) ni d’alertes de prix n’est introduit — absents de ce
build, ils ne sont donc jamais proposés dans le menu contextuel. Le modèle
de position hedging (TRD-020) et la comptabilité par fill existants restent
inchangés. Voir UX-TRADING-001 à UX-TRADING-008 ci-dessus.

## v1.11 — 2026-08-05

Audit transversal des Prompts 05, 06, 07, 07B et de l’Appendice 07-A.
La règle d’éligibilité sous 60 secondes est promue dans le Rulebook et le
ruleset WARIBA ONE v1.1.1, sans rétroactivité : les comptes existants restent
attachés à leur policy version, tandis que les nouvelles activations épinglent
v1.1.1. La classification se fait sur le PnL net après commissions, la balance
éligible devient autoritaire pour la progression et le risque, les seuils 3/6
sont audités et le verrou à six ne bloque que les nouvelles ouvertures. Le
snapshot realtime et l’historique WariX exposent balance réelle, balance
éligible et preuve par fill. Les gates intégration/RLS/E2E refusent désormais
de réussir par skip ou cache et la CI utilise une base Supabase isolée.

## v1.7 — 2026-08-05

Prompt 07B (Trading Core de production, market data live, résilience,
trading manuel, éligibilité de profit) et Appendice 07-A (correction du
catalogue de marchés) intégrés sur `feat/wariba-trade` : règle des 60
secondes minimum d'éligibilité de profit câblée dans `closePositionLocked`
(TRD-033/034/035, `eligible_realized_pnl`/`ineligible_short_duration_profit`
par fill, surveillance glissante 24h des clôtures courtes) ; architecture
market data à trois providers interchangeables — `MockMarketDataProvider`
(renommage de `SandboxMarketDataProvider`), `ReplayMarketDataProvider`,
`FcsMarketDataProvider` (adaptateur FCS structurellement complet mais
jamais testé en live, faute de clé — DATA-011) — sélectionnés par
`MARKET_DATA_PROVIDER`/`MARKET_DATA_REPLAY_MODE` (DATA-010) ; garde-fou
production étendu à `mock`/`replay` (SEC-016) ; décisions de catalogue de
marchés verrouillées (MARKET-001 à 006). Le pipeline de trading complet
pour SPX500/WTIUSD/BRENTUSD/NGASUSD (spécifications d'instrument, buckets
d'exposition, prix) et l'intégration de `program_eligible_balance` dans le
moteur de risque restent `OPEN` — non construits cette session, pour éviter
de précipiter un changement dans une logique de risque déjà verrouillée et
testée. Idem pour la résilience active-standby, la détection anti-bot et
les tests de charge, hors périmètre de cette passe.

## v1.6 — 2026-08-05

Prompt 07 (WariX) complété sur `feat/wariba-trade` : Guardian (nouveau, déterministe, TRD/UX/ENG-029), graphique en chandeliers, ticket d'ordre complet, machine d'états d'exécution client+serveur (UX-017), Watchlist enrichie, positions avec PnL flottant propre à WariX (par opposition au Hub), Close All protégé avec confirmation renforcée sur mobile et résultat détaillé, isolation des re-renders par tick (`useSyncExternalStore`), passe d'accessibilité (clavier, focus, `aria-current`, cibles tactiles 44px), et suite E2E réelle contre la pile complète. Deux bugs réels trouvés et corrigés en cours de route : une race de resynchronisation WebSocket côté client (un ordre rejeté ne faisait jamais avancer `trading_accounts.version`, donc jamais apparaître dans l'historique) et une erreur SSR (`useSyncExternalStore` sans `getServerSnapshot`). TRD-016/TRD-017 restent `OPEN` — aucun calendrier news/weekend n'a été fabriqué.

## v1.8 — 2026-08-05

Correction du levier WARIBA Performance (TRD-036, remplace TRD-024/025/026 — numéroté TRD-036 et non TRD-029 lors de la fusion avec `main`, TRD-029 ayant déjà été pris par Prompt 07) : `WARIBA_RULESET_v1.1.json` et `app.symbol_specs` encodaient le même levier pour Evaluation et Performance, contredisant silencieusement TRD-018 (jamais supersédé). Rod confirme le principe — Performance doit rester inférieur à Evaluation — et les ratios de TRD-018 sont reconduits sur les nouveaux plafonds v1.1 : Performance passe à Forex 1:60, XAUUSD 1:25, NAS100 1:10 (Evaluation inchangé : 1:100/1:50/1:20).

## v1.9 — 2026-08-04

Refonte du site public (homepage, `/warix`, `/offres`, `/programme`) : jargon interne retiré (statuts de sprint, occurrences résiduelles de « sandbox » dans les pages publiques et authentifiées, remplacées par « bêta privée »/« démonstration »/« environnement simulé »), section différenciateurs et FAQ ajoutées à la homepage, prix remontés et rendus visibles via un composant `PricingCard` partagé. WariX devient une démonstration réellement interactive et animée du terminal (graphique en bougies `lightweight-charts`, exécution d’ordres simulée, `RiskRibbon`/`AccountContext` réels), avec une séquence de démonstration automatique qui cède la main dès la première interaction du visiteur — voir DS-017 pour l’agencement de `/offres`.

## v1.10 — 2026-08-04

Prompt 06 — WARIBA Trader Hub implémenté sur `feat/trader-hub` (empilée sur
`feat/policy-risk-evaluation`, PR #8, dont elle réutilise le moteur de risque
Prompt 05 sans le modifier). Quatre read models serveur ajoutés
(`account_hub_view`, `account_mission_view`, `account_risk_view`,
`recent_activity_view`, `packages/application/src`), tous en composition pure
sur `evaluateAccountRisk` déjà testé — aucun calcul financier dupliqué. Hub
réécrit couvrant les 9 états dérivables côté serveur (voir ENG-028 pour le
choix balance-réalisée), sélecteur multi-comptes, historique de journées,
fil d'activité. Trois nouveaux composants `@wariba/ui` (`AccountSelector`,
`ActivityTimeline`, `TradingDaysList`) ; cinq composants déjà construits au
Prompt 02 mais jamais branchés (`MissionProgress`, `RiskRibbon`,
`ConsistencyMeter`, `PolicyVersionChip`, `EvidencePanel`) sont maintenant
réellement utilisés. Voir ENG-028/031/032 (numérotées ENG-031/032 et non
ENG-029/030 lors de la fusion avec `main`, ces IDs ayant déjà été pris par
une décision WariX développée en parallèle) pour les décisions d'architecture
et de scope. Premier scaffolding Playwright du dépôt
(`apps/web/tests/e2e`) : authentification via le vrai formulaire `/login`,
comptes fixtures réels activés en base, scan d'accessibilité axe-core
intégré — 0 violation critique/sérieuse constatée sur le Hub actif.

## v1.5 — 2026-08-03

Règles programme v1.1 validées par Rod et alignées sur le modèle actuariel candidat : objectif 10 %, DLL 3 % soft lock, Maximum Loss 10 % EOD trailing, Best Day Rule 50 %, aucun minimum de jours ni journée qualifiée en Evaluation, buffer Performance permanent 10 %, cinq nouvelles Performance Days à 0,50 %, splits 85/15 puis 90/10 et caps nets candidats 5K–100K. Le terminal public est renommé WariX. La grille contractuelle reste en FCFA avec équivalents USD informatifs ; prix et caps demeurent candidats, et le lancement public reste non approuvé.

## v1.4 — 2026-08-03

Audit et correction des Prompts 01 à 04 : passage à Node.js 24 LTS (ENG-027), activation vérifiée des cinq tailles OFFER-023, consentement versionné avant commande, idempotence concurrente commande/paiement, webhook et activation atomiques, `Close All` atomique avec ordre maître rejouable, tests intégration/RLS/E2E réellement routés, Hub initial branché aux comptes sandbox et accueil enrichi d'une photographie éditoriale sans faux résultat. L'audit des dépendances de production est revenu sans vulnérabilité connue après mise à niveau de Kysely 0.28.17 et overrides de sécurité PostCSS 8.5.18 / Sharp 0.35.3.

## v1.3 — 2026-08-03

Les cinq tailles WARIBA ONE sont activées pour la bêta sandbox de bout en bout — catalogue, checkout et activation Evaluation — conformément à OFFER-023. Les prix restent candidats et le lancement public demeure bloqué par les gates actuariels, juridiques et de réserve. Les caps de payout 50K/100K ne sont pas inventés et restent une décision ouverte avant tout parcours Performance/payout pour ces tailles.

## v1.2 — 2026-08-03

Gouvernance des agents IA harmonisée : AI-014 est remplacée par AI-015. Codex, Claude Code ou tout autre agent IA explicitement mandaté peut construire, modifier, auditer et documenter le code, sans dérogation aux sources de vérité, aux contrôles de branche, aux tests ni à la revue humaine.

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

# 27. Prochaine action opérationnelle

Les Prompts 01 à 07 sont implémentés et audités sur `main`, y compris les
Appendices 07-A à 07-D (v1.11 à v1.13 ci-dessus). La séquence suivante est :

```text
1. Prompt 08 — Performance & Payout (buffer permanent 10 %, cinq Performance
   Days à 0,50 %, calcul et review de payout) — voir Prompt Pack §11
2. Continuer d'auditer chaque prompt avant de l'implémenter, comme jusqu'ici
3. Ne pas ouvrir la vente publique avant les gates actuariels, juridiques et de réserve
```

---

# 28. Principe final

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
