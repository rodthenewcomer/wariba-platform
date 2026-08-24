
# WARIBA Help Center — Content Master 2026
## Benchmark FTMO · Lucid Trading · Tradeify · For Traders → adaptation originale WARIBA

**Document ID:** WARIBA-HELP-CONTENT-MASTER-2026  
**Date:** 23 août 2026  
**Langue:** fr-FR  
**Destination:** intégration par Claude/Codex dans `wariba-platform`  
**Statut:** `MASTER CONTENT CANDIDATE — implémentation uniquement selon policy publiée`  

> Ce document ne copie pas les articles concurrents. Il inventorie leur architecture d'information et leurs thèmes, puis fournit une rédaction originale WARIBA fondée sur les règles et décisions WARIBA. Les règles, montants et états restent subordonnés au Decision Log, à la policy publiée et au moteur serveur.

---

# 0. Sources et méthode

## Sites benchmarkés

1. Lucid Trading Help Center — https://support.lucidtrading.com/en/
2. FTMO — Objectifs de Trading — https://ftmo.com/fr/trading-objectives/
3. FTMO FAQ — https://ftmo.com/fr/faq/
4. Tradeify Help Center — https://help.tradeify.co/en/
5. For Traders Help Center — https://help.fortraders.com/en/

Recherche effectuée le 23 août 2026.

## Sources WARIBA à priorité supérieure

Avant publication ou intégration, Claude DOIT relire :

- `docs/00-decisions/DECISION_LOG.md`
- `WARIBA_PRODUCT_OS_CONSTITUTION.md`
- `docs/00-decisions/WARIBA_PRODUCT_OS_MASTER_CONSTITUTION_2026.md`
- Account Policy publiée réellement attachée au compte
- Rulebook publié réellement attaché au compte
- symbol/instrument specifications
- contracts/domain code lorsque le texte décrit un état serveur

En cas de divergence, la policy publiée et le Decision Log gagnent.

---

# 1. Ce que font bien les quatre concurrents

## FTMO

FTMO concentre les règles principales sur une page « Objectifs de Trading » et utilise une structure très pédagogique :

1. nom de la règle ;
2. définition simple ;
3. formule ou logique ;
4. exemple chiffré ;
5. cas de violation ;
6. précision sur la phase à laquelle la règle s'applique.

Sa FAQ est organisée par intention utilisateur : nouveau trader, processus d'évaluation, règles, compte, facturation, plateformes, etc.

**À reprendre chez WARIBA :**
- une page « Règles essentielles » visible avant le premier trade ;
- formules + exemples ;
- distinction claire entre règle d'échec et condition de progression ;
- recherche par question naturelle.

**À ne pas reprendre :**
- leurs horaires, règles et mécanismes de compte ;
- leurs promesses commerciales ;
- leurs termes « FTMO Account », « Reward », etc.

## Lucid Trading

Lucid sépare fortement :
- informations générales ;
- paiements/payouts ;
- chaque programme ;
- règles transversales.

Ses articles de règle ont souvent une structure très courte : « ce que c'est », « comment cela fonctionne », tableau par taille, conséquence. Les articles d'intégrité ajoutent « pourquoi c'est interdit », « que se passe-t-il », « questions fréquentes ».

**À reprendre chez WARIBA :**
- distinction visuelle `soft lock` / `hard breach` ;
- article dédié par règle importante ;
- articles d'intégrité expliquant le pourquoi, pas seulement l'interdit ;
- recours explicite lorsqu'une détection peut être contestée.

**À ne pas reprendre :**
- multiplication d'un même article par produit quand les règles peuvent être liées dynamiquement à la policy.

## Tradeify

Tradeify a le meilleur modèle « avant de trader » : un article **Essential Trading Rules Overview** qui sert d'index et renvoie vers les articles détaillés.

Ses articles de règle utilisent :
- résumé ;
- cas d'application ;
- exemples ;
- tableaux ;
- FAQ ;
- liens vers articles connexes.

**À reprendre chez WARIBA :**
- une page d'entrée « Les règles essentielles avant votre premier trade » ;
- un tableau « ce qui bloque aujourd'hui / ce qui termine le compte / ce qui bloque seulement la réussite » ;
- liens contextuels depuis Hub et WariX.

## For Traders

For Traders possède une taxonomie très granulaire de règles : drawdown journalier, EOD trailing, profit target, inactivité, leverage, spread, slippage, instruments, allowed/forbidden.

**À reprendre chez WARIBA :**
- granularité des sujets ;
- article séparé pour chaque concept qui génère régulièrement des tickets ;
- section « Autorisé / interdit » très lisible ;
- articles « Comment est calculé X ? ».

**À éviter :**
- emojis/promo agressive dans la documentation critique ;
- plusieurs versions de règles mélangées sans binding de policy ;
- règles héritées qui peuvent être lues comme actuelles.

---

# 2. Benchmark — inventaire des sections et articles

> Les titres ci-dessous sont un inventaire de navigation/recherche. Ils servent à comprendre la couverture documentaire, pas à recopier leur contenu.

## 2.1 Lucid Trading — 10 collections / 59 articles

### General Info — 5
- Our Mission
- Approved Products and Commissions
- Maximum Number of Accounts
- Lucid Trading Supported Platforms
- Registering as a Business

### Fees, Payments and Payouts — 3
- Simulated Account Fees
- Accepted Payments Methods
- Payout Methods

### LucidFlex — 8
- LucidFlex Customization
- LucidFlex Evaluation Account
- LucidFlex Funded Account
- LucidFlex Payouts
- LucidFlex Consistency Percentage
- LucidFlex Scaling Plan
- LucidFlex Drawdown
- LucidFlex Live (Legacy)

### LucidDaily — 8
- LucidDaily Customization
- LucidDaily Evaluation
- LucidDaily Funded Account
- LucidDaily Payouts
- LucidDaily Consistency
- LucidDaily Drawdown
- LucidDaily Daily Loss Limit
- LucidDaily Live

### LucidPro — 8
- LucidPro Customization
- LucidPro Evaluation Account
- LucidPro Funded Account
- LucidPro Payouts
- LucidPro Consistency Percentage
- LucidPro Daily Loss Limit
- LucidPro Drawdown
- LucidPro Live (Legacy)

### LucidDirect — 6
- LucidDirect Funded Account
- LucidDirect Payout Objectives
- LucidDirect Consistency Percentage
- LucidDirect Daily Loss Limit
- LucidDirect Drawdown
- LucidDirect Live (Legacy)

### LucidBlack (Legacy) — 7
- LucidBlack Evaluation Account
- LucidBlack Funded Account
- LucidBlack Payout Objectives
- LucidBlack Consistency Percentage
- LucidBlack Scaling Plan
- LucidBlack Drawdown
- LucidBlack Live

### LucidMaxx — 4
- LucidMaxx Overview
- LucidMaxx Eval Rules
- LucidMaxx Cooldown
- LucidMaxx Eval Pricing

### Live Trading — 2
- New Live Structure
- New Live Scaling Plan

### Rules and Guidelines — 8
- Trade with Integrity
- Restricted Countries
- Inactivity Policy
- Prohibited: Microscalping
- Prohibited: Hedging
- Prohibited: High Frequency Trading
- Other Activities
- Allowed Trading Times

---

## 2.2 FTMO — Objectifs + FAQ

### Objectifs de Trading
- Objectif de Profit
- Perte Maximale Journalière
- Perte Maximale
- Règle du Meilleur Jour
- variantes 2-Step
- Nombre Minimum de Jours de Trading

### FAQ — Nouveau avec FTMO
- Comment commencer ?
- Qu’est-ce que FTMO ?
- Où sont vos bureaux ? Comment vous contacter ?
- Qui peut rejoindre ?
- Société sérieuse ?
- Pourquoi rejoindre ?
- Score de Discipline

### FAQ — Processus d'Évaluation
- Comment devenir trader ?
- Quand compléter l'identité ?
- Frais initiaux remboursés ?
- Différence 1-Step / 2-Step
- Combien de temps pour devenir trader ?
- J’ai réussi, que faire maintenant ?

### FAQ — Règles
- Balance vs Equity
- Objectifs de Trading
- Annonces économiques
- Weekend
- Overnight / weekend
- Constance
- Voyage / VPN / VPS
- Nombre de comptes
- Instruments / stratégies autorisées
- Conditions réelles de marché

### FAQ — Account
- Retrait des profits
- Taxes
- Fusion de comptes
- Capital
- Gestion technique
- Relation légale

### FAQ — Commandes & Facturation
- Méthodes de paiement
- Autres frais / récurrence
- Quand le compte est reçu après paiement
- Pourquoi les frais existent

### FAQ — Plateformes
- Connexion MT4
- Connexion MT5
- Connexion cTrader
- Changer de plateforme/type de compte
- Spécifications du compte
- Plateformes disponibles
- Infrastructure technique

### FAQ — Applications & services
- Avantages hors compte
- Free Trial
- Psychologie
- Points
- Swing
- Disponibilité Swing pour 1-Step

### FAQ — Premium / Affiliation
- qualification, avantages, niveaux, paiements et règles promotionnelles

---

## 2.3 Tradeify — 8 collections / 72 articles

### Getting Started — 13
- Welcome to Tradeify
- Which Plan is Right for You?
- What is a Simulated Funded Account?
- Essential Trading Rules Overview
- Guidelines for Traders
- How Do I Start Trading?
- Common FAQs
- What is a Trading Day?
- How Many Simulated Funded Accounts Can I Have at Once?
- Purchase Using Cryptocurrency
- Select the Correct Trading Contract
- Understanding CME Contracts
- Order Types Explained

### Trading Platforms & Products — 21
- Supported Platforms
- NinjaTrader 8 Setup Guide
- TradingView via Tradovate Add-on Setup
- Tradovate Platform Overview
- Tradovate Charting Guide
- Tradovate Order Entry & Copy Trading
- Tradovate Risk & Account Settings
- Tradovate Analytics, Tools & Mobile
- Drawdown Widget
- Tradesea Setup Guide
- R|Trader Pro Setup Guide
- Quantower Setup Guide
- Sierra Chart Setup Guide
- WealthCharts Platform Overview
- WealthCharts Charting Guide
- WealthCharts Order Entry & Trade Copier
- WealthCharts Risk & Account Settings
- WealthCharts Analytics, Tools & Mobile
- Platform Connection Troubleshooting
- Data Feed Issues and Market Data Troubleshooting
- Login Troubleshooting Guide

### Accounts & Rules — 18
- Tradeify 3.0 – Program Updates & Improvements
- Introducing the New Select Plan & Changes to the Live Program
- Tradeify Pricing Reference
- SELECT vs Growth
- Growth Evaluation Accounts
- Select Evaluation Accounts
- Lightning Funded Accounts
- Consistency Rule
- Trailing Max Drawdowns
- Daily Loss Limit
- Hedging & Correlated Products
- News Trading
- Permitted Times to Trade
- Restricted Countries
- Supported Trading Products / Assets
- Level 2 / EUREX Data
- How Do I Get Funded After Passing an Evaluation?
- How do I Reset a Failed Evaluation?

### Payouts & Billing — 8
- Lightning Funded: Account Payout Policy
- Growth Funded: Account Payout Policy
- Select Flex and Select Daily Payout Policies
- Plane Payouts
- Rise Payouts
- Chargeback Policy
- Trading Commission Fees
- Are There Activation Fees?

### Live Accounts — 3
- Tradeify Elite Program
- Legacy Live Program
- Elite Accelerator Reward Pools

### Business & Compliance — 4
- Affiliates
- Discord
- KYC and AML Policy
- Trade as a Company / LLC

### Grand Cup 2 — 3
- Competition Guide
- Getting Started & Dashboard Overview
- Group Stage & Head-to-Head Bracket

### World Cup Prediction — 2
- Prediction Market FAQ
- Dashboard Guide

---

## 2.4 For Traders — 9 collections / 109 articles

### Getting Started — 6
- Welcome
- What is a trading challenge?
- How do I buy a challenge?
- What capital will I trade with?
- For Traders AI
- How to pass your challenge?

### Prediction Markets — 1
- Predictions Markets Competition

### Our Rules — 32
**Challenge Requirements**
- Daily Drawdown
- Daily Drawdown FAST STATIC
- Balance-based Max Drawdown
- Trailing Max Drawdown
- Trailing Max Drawdown EOD
- Profit Target
- Minimum Profitable Days
- Inactivity Rule
- Consistency Score Instant
- Consistency Score Crypto Fast PRO
- Consistency Score Fast Futures
- Drawdown Protection

**Trading Settings & Conditions**
- Leverages — legacy
- Leverages — current
- Commission
- Spread
- Instruments
- Crypto assets
- Server time
- Technical infrastructure
- Slippage
- Daily net cumulative P&L
- Market Hours — Futures
- Reward Policy — Fast Challenge Futures
- Reward Policy — Instant Futures
- Reward Policy — FAST PRO Futures
- Reward Policy — Instant Forex
- Instant PRO
- Instant Account
- Mandatory stop-loss

**Allowed / Forbidden**
- What Is Allowed With Us
- What Is Forbidden With Us

### Our Accounts — 22
- Account Types Comparison
- PAY AFTER PASS forex
- FAST forex
- FAST STATIC forex
- CLASSIC forex
- STRIKE forex
- INSTANT forex
- INSTANT PRO forex
- FAST crypto
- FAST PRO crypto
- INSTANT crypto
- FAST futures
- INSTANT futures
- FAST PRO futures
- legacy account versions purchased before June 8, 2026

### Technical Support & Platform — 6
- Platforms available
- Platform setup
- TradeLocker login
- Platform change
- Login credentials
- Futures trading platform

### Affiliate — 10
- Become a partner
- Commission
- Monthly bonus
- Self-purchase commission
- Code/link
- Minimum affiliate payout
- Payment time
- Allowed promotion
- Forbidden promotion
- Partner Program guide

### Tournaments — 1
- Tournaments For Traders

### Promotions & Rewards — 8
- Pay After Pass promo
- Summer Sale
- FAST account promo
- Instant launch promo
- Offer
- 48-hour reward promotion
- Tasks & Rewards
- Loyalty Program

### General Questions — 23
- Regulation
- Restricted countries
- Risk department
- Merge accounts
- Copy trades to live
- What happens if rules are broken
- Dashboard login
- Reactivation
- Promotions
- Product availability
- Verification calls
- Max allocation
- Pay After Pass
- Company signup
- campaign article
- Withdrawal system
- bi-weekly reward timing
- taxes
- fee bonus
- lost crypto payment
- crypto withdrawal
- KYC documents
- timing to MASTER Account

---

# 3. Architecture cible du Help Center WARIBA

WARIBA ne doit pas reproduire 100+ articles au lancement. Il doit couvrir toutes les questions critiques avec une information architecture qui évite la duplication.

## Catégories canoniques

1. **Commencer**
2. **WARIBA ONE**
3. **Risque & règles**
4. **Trading & WariX**
5. **WARIBA Performance**
6. **Payouts**
7. **Paiements & facturation**
8. **Identité & KYC**
9. **Compte & sécurité**
10. **Technique & incidents**
11. **Support & contestations**

## UX de la home `/aide`

Ordre recommandé :

```text
Centre d'aide WARIBA
[ Rechercher une réponse... ]

Règles essentielles avant votre premier trade
→ article épinglé

Catégories
[Commencer] [WARIBA ONE] [Risque]
[WariX] [Performance] [Payouts]
[Paiements] [Identité] [Compte]
[Technique] [Support]

Questions fréquentes
- Comment fonctionne la perte quotidienne ?
- Comment fonctionne la perte maximale EOD ?
- Pourquoi mon compte est-il bloqué ?
- Que se passe-t-il quand j'atteins l'objectif ?
- Comment fonctionne la règle du Meilleur Jour ?
- Quand puis-je demander un payout ?
- Pourquoi un trade profitable peut-il être non éligible ?
- Comment ouvrir une contestation ?
```

## Recherche

Index :
- titre ;
- résumé ;
- alias ;
- acronymes (`DLL`, `MLL`, `EOD`, `KYC`) ;
- mots français usuels (`drawdown`, `perte max`, `bloqué`, `échec`, `retrait`, `payout`) ;
- reason codes mappés à des articles.

---

# 4. Contrat éditorial d'un article WARIBA

Chaque article critique doit suivre le même squelette :

```text
Titre

Résumé en 1–2 phrases.

[Applicable à]
[Type de règle]
[Conséquence]
[Version de policy / mis à jour]

1. Ce que cela signifie
2. Comment WARIBA le calcule
3. Exemple
4. Que se passe-t-il au seuil ?
5. Ce qui NE se passe pas
6. Où le voir dans WARIBA
7. Cas particuliers / FAQ
8. Articles liés
9. Contacter le support / ouvrir une contestation si applicable
```

## Types sémantiques

- `INFORMATION`
- `PASS_CONDITION`
- `PAYOUT_CONDITION`
- `SOFT_LOCK`
- `HARD_BREACH`
- `OPERATIONAL`
- `BLOCKED_POLICY`
- `BLOCKED_PROVIDER`

Les couleurs dans l'UI sont secondaires au libellé.

---

# 5. Frontmatter / modèle recommandé

```yaml
id: help-risk-daily-loss
slug: perte-quotidienne
locale: fr
title: Comment fonctionne la perte quotidienne ?
summary: ...
category: risque-regles
audience: [evaluation, performance]
status: published
severity: soft_lock
sourceOfTruth:
  - published_account_policy
  - decision_log
policyBinding:
  fields:
    - dailyLossLimitPct
    - nextResetAt
searchAliases:
  - DLL
  - daily loss
  - perte journaliere
related:
  - perte-maximale-eod
  - soft-lock
lastReviewedAt: 2026-08-23
```

### Règle cruciale

Les valeurs financières qui existent dans la policy doivent être injectées ou construites depuis un registre partagé.

**Ne pas dupliquer `3 %`, `10 %`, `50 %`, etc. dans cinq composants React différents.**

Le texte peut contenir un exemple pédagogique, mais la carte de règle affichée doit lire la policy du programme sélectionné.

---

# 6. Matrice de publication

| État | Sens |
|---|---|
| `PUBLISH` | compatible avec les décisions actuelles |
| `DYNAMIC` | publiable, mais valeurs tirées du catalogue/policy/instrument |
| `DRAFT_POLICY` | rédaction prête, masquer tant que décision OPEN |
| `DRAFT_PROVIDER` | rédaction prête, masquer tant que provider/contrat absent |
| `INTERNAL_ONLY` | opérateurs/support seulement |

---

# 7. Catalogue WARIBA complet

## Commencer
- HLP-001 — Bienvenue dans WARIBA
- HLP-002 — Qu'est-ce qu'un capital simulé ?
- HLP-003 — Comment fonctionne le parcours ONE → Performance → Review ?
- HLP-004 — Comment choisir une taille d'évaluation ?
- HLP-005 — Comment acheter et activer une évaluation ?
- HLP-006 — Quelle différence entre solde et equity ?
- HLP-007 — Glossaire WARIBA

## WARIBA ONE
- HLP-010 — Règles essentielles avant votre premier trade
- HLP-011 — Objectif de profit de 10 %
- HLP-012 — Perte quotidienne de 3 %
- HLP-013 — Perte maximale de 10 % EOD trailing
- HLP-014 — Règle du Meilleur Jour de 50 %
- HLP-015 — Pourquoi un profit peut être non éligible avant 60 secondes
- HLP-016 — Y a-t-il un nombre minimum de jours ?
- HLP-017 — Durée et inactivité
- HLP-018 — Puis-je garder une position pendant la nuit ?
- HLP-019 — Puis-je garder une position pendant le week-end ?
- HLP-020 — Puis-je trader pendant les annonces économiques ?
- HLP-021 — Que se passe-t-il quand j'atteins l'objectif ?
- HLP-022 — Que se passe-t-il si ma limite maximale est dépassée ?
- HLP-023 — Puis-je reset ou recommencer une évaluation ?

## Risque & règles
- HLP-030 — DLL vs perte maximale : ne pas les confondre
- HLP-031 — Comment fonctionne le trailing EOD ?
- HLP-032 — Quand les limites quotidiennes sont-elles réinitialisées ?
- HLP-033 — Comment les permissions de trading sont-elles décidées ?
- HLP-034 — Instruments, tailles et exposition maximale
- HLP-035 — Spread, slippage, commissions et swaps
- HLP-036 — Pourquoi un ordre peut-il être refusé ?
- HLP-037 — Données de marché stale, offline et resynchronisation
- HLP-038 — Pratiques autorisées et interdites
- HLP-039 — Trading intègre et exploitation technique
- HLP-040 — Comment lire la preuve d'un breach ?

## Trading & WariX
- HLP-050 — Découvrir WariX
- HLP-051 — Comment placer un ordre
- HLP-052 — Stop Loss et Take Profit
- HLP-053 — Réduire, clôturer et Close All
- HLP-054 — Ordres en attente : disponibilité et comportement
- HLP-055 — Indicateurs et dessins
- HLP-056 — Que faire si WariX se déconnecte ?
- HLP-057 — Où voir mes ordres, exécutions et positions ?
- HLP-058 — Pourquoi le graphique historique et le prix d'exécution peuvent-ils avoir des états différents ?

## WARIBA Performance
- HLP-060 — Qu'est-ce qu'un compte WARIBA Performance ?
- HLP-061 — Le buffer permanent de 10 %
- HLP-062 — Qu'est-ce que le profit éligible ?
- HLP-063 — Les 5 Performance Days
- HLP-064 — Best Day Rule sur un cycle Performance
- HLP-065 — Split des payouts
- HLP-066 — Que se passe-t-il après le cinquième payout ?

## Payouts
- HLP-070 — Comment fonctionne l'éligibilité au payout ?
- HLP-071 — `financially_eligible` vs `ready_to_request`
- HLP-072 — Comment demander un payout ?
- HLP-073 — Pending review, approved, processing, paid : différences
- HLP-074 — Que se passe-t-il si un payout échoue ou revient ?
- HLP-075 — Peut-on continuer à trader pendant un payout ?
- HLP-076 — Taux de change, frais et devise de réception

## Paiements & facturation
- HLP-080 — Comment WARIBA confirme un paiement
- HLP-081 — Quels moyens de paiement sont acceptés ?
- HLP-082 — Mon paiement est en attente
- HLP-083 — Mon paiement a échoué
- HLP-084 — Éviter un double paiement
- HLP-085 — Reçus et historique de facturation
- HLP-086 — Remboursements

## Identité & KYC
- HLP-090 — Pourquoi WARIBA demande une vérification d'identité
- HLP-091 — Quand le KYC est-il demandé ?
- HLP-092 — Les états d'une vérification KYC
- HLP-093 — Quels documents sont acceptés ?
- HLP-094 — KYC refusé, action requise et nouvelle vérification
- HLP-095 — Pourquoi un KYC échoué ne fait pas échouer un compte de trading

## Compte & sécurité
- HLP-100 — Connexion et session expirée
- HLP-101 — Vérification email et récupération du mot de passe
- HLP-102 — Puis-je utiliser plusieurs comptes ?
- HLP-103 — Pourquoi je ne peux pas ouvrir le compte d'un autre trader
- HLP-104 — Voyage, appareil, VPN/VPS
- HLP-105 — Fermer ou désactiver un compte utilisateur

## Technique & incidents
- HLP-110 — Données de marché indisponibles ou retardées
- HLP-111 — Maintenance et page Status
- HLP-112 — Que signifie un correlation ID ?
- HLP-113 — Incident de paiement ou activation retardée
- HLP-114 — Problème d'affichage mobile ou navigateur

## Support & contestations
- HLP-120 — Comment contacter le support WARIBA
- HLP-121 — Comment créer et suivre un ticket
- HLP-122 — Comment ouvrir une contestation
- HLP-123 — Que peut-on contester ?
- HLP-124 — Comment WARIBA examine une contestation
- HLP-125 — Pourquoi la preuve originale n'est jamais supprimée
- HLP-126 — Statuts d'un ticket ou d'une contestation
- HLP-127 — Quelles informations fournir au support

---

# 8. ARTICLES — contenu original prêt à intégrer


---

## HLP-001 — Bienvenue dans WARIBA

**Publication :** PUBLISH

WARIBA est une plateforme de trading simulé conçue pour évaluer la discipline, l'exécution et la gestion du risque d'un trader.

Le parcours V1 est simple :

`WARIBA ONE → WARIBA Performance → WARIBA Review`

WARIBA ONE est l'évaluation. Une réussite validée peut ouvrir un compte WARIBA Performance. WARIBA Performance reste un environnement simulé : il ne s'agit pas d'un dépôt bancaire ni d'une allocation automatique de capital réel.

Le Trader Hub sert à comprendre votre compte, vos règles, votre progression et vos prochaines actions. WariX est le terminal de trading.

Avant votre premier trade, lisez l'article **Règles essentielles avant votre premier trade**. Les règles affichées dans votre compte et la policy versionnée attachée à votre compte sont toujours la référence.


---

## HLP-002 — Qu'est-ce qu'un capital simulé ?

**Publication :** PUBLISH

La taille affichée sur une évaluation WARIBA est un **nominal simulé**. Elle sert de base aux calculs du programme : objectif, limites de risque et autres seuils.

Ce montant n'est pas :
- un dépôt effectué par le trader ;
- un solde bancaire ;
- une somme que WARIBA promet d'investir sur les marchés.

Les trades, balances et résultats de WARIBA V1 sont simulés. Les éventuels payouts suivent un processus séparé et ne transforment pas rétroactivement le compte en compte de courtage réel.

Cette distinction doit rester visible avant l'achat et dans les surfaces où elle est nécessaire.


---

## HLP-003 — Comment fonctionne ONE → Performance → Review ?

**Publication :** PUBLISH

### 1. WARIBA ONE
Vous tradez une évaluation simulée selon la policy attachée au compte.

### 2. Réussite en vérification
Lorsque toutes les conditions sont remplies, le compte passe en `pass_pending`. Cela ne signifie pas que Performance est déjà activé. WARIBA finalise la journée et exécute les contrôles prévus.

### 3. WARIBA Performance
Après approbation, un compte Performance distinct est créé une seule fois. Il est également simulé.

### 4. Payouts
Un cycle Performance doit remplir ses propres conditions avant qu'un payout puisse être demandé.

### 5. WARIBA Review
Après le cinquième payout payé, le compte entre dans WARIBA Review. Cette étape ne garantit pas une allocation de capital réel.


---

## HLP-004 — Comment choisir une taille d'évaluation ?

**Publication :** DYNAMIC

Choisissez d'abord la taille dont les limites de risque sont compatibles avec votre style de trading, pas simplement le nominal le plus élevé.

Sur la page Offres, WARIBA doit afficher depuis le catalogue publié :
- le nominal simulé ;
- le prix ;
- l'objectif ;
- la perte quotidienne ;
- la perte maximale ;
- la règle du Meilleur Jour ;
- les instruments et limites d'exposition applicables.

Les prix et tailles ne doivent jamais être recopiés en dur dans cet article. Ils proviennent du catalogue publié.


---

## HLP-005 — Comment acheter et activer une évaluation ?

**Publication :** PUBLISH

1. Choisissez une offre publiée.
2. Vérifiez le nominal simulé, le prix et les règles principales.
3. Acceptez les conditions nécessaires.
4. Lancez le paiement.
5. Attendez la confirmation serveur.

Le retour de votre navigateur depuis un prestataire de paiement ne suffit jamais à confirmer le paiement. WARIBA considère le paiement comme confirmé uniquement après validation serveur.

Si la confirmation est en attente, ne payez pas une seconde fois. Consultez le statut de la commande ou contactez le support avec votre référence.


---

## HLP-006 — Quelle différence entre solde et equity ?

**Publication :** PUBLISH

**Solde (balance)** : valeur comptable réalisée du compte après les opérations clôturées et les écritures autorisées.

**Equity** : valeur du compte en tenant compte du solde et du résultat latent des positions ouvertes, selon les frais et ajustements applicables.

Une position ouverte peut donc faire varier l'equity sans modifier immédiatement le solde.

Les règles de risque peuvent utiliser l'equity. L'objectif de profit WARIBA ONE exige du profit réalisé : un profit latent ne suffit pas à valider l'évaluation.

Les valeurs visibles dans le Hub et WariX proviennent des données serveur autoritatives.


---

## HLP-007 — Glossaire WARIBA

**Publication :** PUBLISH

- **WARIBA ONE** : évaluation simulée en une phase.
- **WARIBA Performance** : compte simulé obtenu après réussite validée.
- **Blocage quotidien / soft lock** : restriction temporaire des nouvelles expositions après atteinte de la perte quotidienne.
- **Breach / limite maximale dépassée** : état terminal du compte après violation de la perte maximale.
- **Best Day Rule** : règle de distribution du profit ; elle ne termine pas le compte.
- **EOD** : fin de journée utilisée pour une finalisation ou mise à jour.
- **Payout** : paiement pouvant être demandé après éligibilité.
- **KYC** : vérification d'identité.
- **WARIBA Review** : étape après le cinquième payout ; aucun compte live n'est garanti.


---

## HLP-010 — Règles essentielles avant votre premier trade

**Publication :** PUBLISH

Voici les règles WARIBA ONE actuellement verrouillées dans le Product OS. La policy publiée attachée à votre compte reste la référence.

| Règle | Valeur | Effet |
|---|---:|---|
| Objectif | 10 % de profit réalisé | condition de réussite |
| Perte quotidienne | 3 % | blocage quotidien, pas un breach |
| Perte maximale | 10 %, trailing EOD | breach terminal |
| Meilleur Jour | 50 % | condition de réussite, jamais breach |
| Jours minimums | 0 | aucune attente artificielle |
| Inactivité | 30 jours selon policy actuelle | peut rendre le compte inactif |
| Activation après réussite | 0 | aucun frais d'activation |

Un profit positif provenant d'un trade profitable de moins de 60 secondes peut être non éligible au programme selon la policy actuelle. Les pertes restent comptées.

**À retenir :**
- Daily Loss ≠ Maximum Loss.
- Best Day Rule ≠ breach.
- Atteindre 10 % ≠ activation immédiate.
- Les positions et ordres bloquants doivent être résolus avant la validation finale.
- Le serveur décide toujours si une action de trading est autorisée.


---

## HLP-011 — Comment fonctionne l'objectif de profit de 10 % ?

**Publication :** PUBLISH

WARIBA ONE demande actuellement **10 % de profit réalisé**.

Pour un nominal simulé de 10 000 USD, l'objectif pédagogique est de 1 000 USD de profit réalisé.

Un profit latent sur une position ouverte ne suffit pas. Le moteur vérifie les résultats réalisés et toutes les autres conditions applicables.

Lorsque l'objectif est atteint, le compte ne devient pas immédiatement Performance. Il peut passer en **Réussite en vérification**, puis attendre la finalisation de journée et les contrôles.

### Ce qui ne se passe pas
- atteindre l'objectif ne désactive pas les autres règles ;
- le navigateur ne décide pas que vous avez réussi ;
- WARIBA ne crée pas deux comptes Performance en cas de retry.


---

## HLP-012 — Comment fonctionne la perte quotidienne de 3 % ?

**Publication :** PUBLISH

La perte quotidienne est une protection temporaire. Le montant de référence correspond actuellement à 3 % du nominal simulé, selon la policy du compte.

Exemple simple : sur 10 000 USD, 3 % représente 300 USD.

Le moteur serveur suit la limite autoritative de la journée, y compris l'equity lorsque la règle l'exige. Si le seuil est atteint, le compte passe en **blocage quotidien**.

### Conséquence
- les nouvelles expositions sont refusées ;
- réduire ou fermer une position peut rester autorisé si les permissions serveur le permettent ;
- annuler un ordre en attente peut rester autorisé ;
- le prochain reset exact vient du serveur.

### Ce n'est pas un échec définitif
Un blocage quotidien n'est pas un breach. Le compte peut redevenir actif au reset prévu si aucune autre règle terminale n'a été violée.


---

## HLP-013 — Comment fonctionne la perte maximale de 10 % EOD trailing ?

**Publication :** PUBLISH

La perte maximale protège le compte sur toute sa durée. Elle est actuellement de **10 % du nominal** et son plancher est **trailing EOD**.

Sur un nominal de 10 000 USD, l'écart de perte maximale représente 1 000 USD.

Illustration pédagogique :
- référence EOD 10 000 → plancher 9 000 ;
- un plus haut EOD futur de 10 500 peut faire monter le plancher à 9 500 ;
- si une journée suivante clôture plus bas, le plancher déjà acquis ne recule pas.

Le moteur serveur publie le plancher réellement applicable au compte. L'interface ne doit pas le reconstruire à partir d'un exemple.

### Conséquence
Si l'equity franchit le plancher applicable, le compte devient `breached`. C'est terminal pour cet identifiant de compte.

Le compte reste consultable avec la règle, le seuil, la valeur observée, l'heure, la policy et la preuve.


---

## HLP-014 — Comment fonctionne la règle du Meilleur Jour de 50 % ?

**Publication :** PUBLISH

La règle du Meilleur Jour mesure la concentration de vos profits positifs. Votre meilleur jour éligible ne doit pas représenter plus de **50 %** du total de vos journées positives éligibles pour satisfaire la condition.

Formule pédagogique :

`ratio = meilleur jour positif / total des journées positives`

Exemple :
- meilleur jour : 500 USD ;
- total des jours positifs : 800 USD ;
- ratio : 62,5 %.

La condition n'est pas encore satisfaite. Si le meilleur jour reste 500 USD, le total des jours positifs doit atteindre au moins 1 000 USD. Il manque donc 200 USD de profits positifs répartis sur d'autres journées.

### Important
Dépasser 50 % **ne termine jamais le compte**. Vous continuez à trader jusqu'à satisfaire la condition, sous réserve des autres règles.


---

## HLP-015 — Pourquoi un profit peut être non éligible avant 60 secondes ?

**Publication :** PUBLISH

La policy actuelle prévoit une durée minimale de **60 secondes** pour qu'un résultat profitable contribue au résultat programme éligible.

Cela signifie qu'un trade peut :
- être réellement clôturé avec un P&L positif ;
- apparaître dans le Journal ;
- mais contribuer pour 0 au calcul du profit éligible si sa durée est inférieure au seuil.

Les pertes restent toujours comptées.

WARIBA doit montrer séparément :
- le résultat économique du trade ;
- sa contribution au programme ;
- la raison d'une éventuelle inéligibilité.

Cette règle ne doit jamais être cachée derrière un simple chiffre de P&L.


---

## HLP-016 — Y a-t-il un nombre minimum de jours ?

**Publication :** PUBLISH

WARIBA ONE n'impose actuellement **aucun nombre minimum de jours de trading**.

Vous ne devez cependant pas interpréter cela comme une validation instantanée. Toutes les autres conditions restent applicables : profit réalisé, règles de risque, Best Day Rule, absence de breach et workflow de revue.

WARIBA Performance possède une autre logique : chaque payout exige actuellement cinq nouvelles Performance Days selon la policy.


---

## HLP-017 — Durée et inactivité

**Publication :** PUBLISH

WARIBA ONE n'a pas de limite de temps fixe pour atteindre l'objectif.

La policy actuelle prévoit toutefois une règle d'inactivité de **30 jours calendaires**.

Le serveur décide du timestamp d'activité pris en compte. L'aide ne doit pas inventer une définition comme « trade significatif » si cette notion n'existe pas dans la policy publiée.

Si votre compte devient `inactive`, l'interface affiche le statut exact et les actions autorisées. `inactive` n'est pas identique à `breached`.


---

## HLP-018 — Puis-je garder une position pendant la nuit ?

**Publication :** PUBLISH

Oui. La décision WARIBA actuellement verrouillée autorise les positions **overnight**.

Une position conservée pendant la nuit reste soumise :
- à la perte quotidienne ;
- à la perte maximale ;
- aux spreads ;
- aux swaps lorsqu'ils existent ;
- aux gaps et interruptions de marché ;
- aux permissions du compte.

« Overnight autorisé » ne signifie donc pas « sans risque ».


---

## HLP-019 — Puis-je garder une position pendant le week-end ?

**Publication :** DYNAMIC

Non au lancement : le **weekend hold est interdit** par la décision produit actuelle.

Chaque instrument doit exposer un `weekend_cutoff_at` réellement publié. WARIBA ne doit pas placer une heure générique dans cet article.

Avant le cutoff, le terminal peut avertir le trader et appliquer les restrictions prévues par la policy. Au cutoff, les positions ou ordres restants sont traités par le moteur selon la règle publiée.

Consultez toujours l'heure affichée pour l'instrument et le fuseau associé.


---

## HLP-020 — Puis-je trader pendant les annonces économiques ?

**Publication :** DYNAMIC

Pour **WARIBA ONE**, le trading autour des annonces économiques est actuellement autorisé par décision verrouillée. Les autres règles de risque continuent de s'appliquer et le slippage peut augmenter.

Pour **WARIBA Performance**, ne publiez aucune fenêtre d'interdiction tant que la policy actuelle et la source de calendrier ne sont pas verrouillées ensemble.

Si WARIBA ne dispose pas d'une source de calendrier fiable, aucune sanction rétroactive ne doit être inventée à partir d'une information qui n'était pas visible au trader.


---

## HLP-021 — Que se passe-t-il quand j'atteins l'objectif ?

**Publication :** PUBLISH

Atteindre l'objectif ne déclenche pas immédiatement un compte Performance.

Le flux canonique est :

`active → pass_pending → revue de fin de journée → approved → passed → Performance`

Dès `pass_pending` :
- aucune nouvelle exposition n'est autorisée ;
- WariX passe en lecture seule pour les actions concernées ;
- le Hub affiche **Réussite en vérification** ;
- le serveur fournit `reviewEligibleAt`.

La revue vérifie la journée finalisée, les règles, l'intégrité des données, les ordres et tout breach éventuel. Un cas ambigu peut passer en revue humaine.

Une approbation crée un compte Performance exactement une fois.


---

## HLP-022 — Que se passe-t-il si ma limite maximale est dépassée ?

**Publication :** PUBLISH

Lorsque la perte maximale autoritative est dépassée, le compte devient `breached`.

Le statut est terminal pour ce compte. Il ne redevient pas `active`.

Vous pouvez consulter :
- la règle concernée ;
- le seuil ;
- la valeur observée ;
- l'heure ;
- la version de policy ;
- la preuve et les références disponibles.

Vous pouvez ensuite **ouvrir une contestation** ou contacter le support.

WARIBA ne doit pas afficher un bouton de reset commercial tant que cette politique reste OPEN.


---

## HLP-023 — Puis-je reset ou recommencer une évaluation ?

**Publication :** DRAFT_POLICY

La politique commerciale de reset/repurchase est actuellement **OPEN**.

Tant qu'elle n'est pas verrouillée, WARIBA ne doit publier :
- aucun prix de reset ;
- aucune remise ;
- aucun bouton « Reset maintenant » ;
- aucune promesse de réouverture.

Un compte `breached` ne sera jamais réécrit comme s'il n'avait pas échoué. Si une politique de recommencement est adoptée, elle doit créer une nouvelle commande et un nouveau compte avec une nouvelle piste d'audit.


---

## HLP-030 — DLL vs perte maximale : ne pas les confondre

**Publication :** PUBLISH

| | Perte quotidienne | Perte maximale |
|---|---|---|
| Valeur actuelle | 3 % | 10 % |
| Portée | journée | durée du compte |
| Type | soft lock | hard breach |
| Réversible | au reset serveur si autorisé | non |
| Nouvelles expositions | bloquées | bloquées définitivement |
| Compte terminé | non | oui |

Une même journée peut approcher les deux limites. Le moteur retourne les permissions exactes ; l'interface ne déduit pas les droits à partir d'une couleur ou d'un pourcentage.


---

## HLP-031 — Comment fonctionne le trailing EOD ?

**Publication :** PUBLISH

`EOD` signifie que le plancher de perte maximale peut être réévalué à la fin d'une journée finalisée plutôt qu'en suivant chaque profit latent intraday.

Principes :
- le montant de risque est déterminé par la policy ;
- un nouveau plus haut EOD pertinent peut relever le plancher ;
- un jour moins profitable ne redescend pas un plancher déjà acquis ;
- le plancher publié par le serveur est la vérité.

L'intérêt de cette règle est que la progression du plancher est liée à des journées finalisées, pas à chaque tick positif temporaire.

Votre Hub affiche le plancher actuel et l'espace restant.


---

## HLP-032 — Quand les limites quotidiennes sont-elles réinitialisées ?

**Publication :** DYNAMIC

WARIBA utilise une référence temporelle serveur fondée sur UTC.

Le frontend ne doit jamais afficher un simple « minuit » sans contexte. Le serveur fournit le prochain `nextResetAt`, qui est ensuite affiché dans votre fuseau avec UTC disponible.

Après un blocage quotidien, le retour à un état tradable dépend du reset serveur et d'une nouvelle évaluation des règles. Recharger le navigateur ne débloque pas un compte.


---

## HLP-033 — Comment les permissions de trading sont-elles décidées ?

**Publication :** PUBLISH

Le serveur fournit des permissions explicites, notamment :
- ouvrir une exposition ;
- augmenter une exposition ;
- réduire ;
- clôturer ;
- placer un ordre en attente ;
- annuler un ordre en attente.

WariX ne déduit pas ces droits à partir du seul statut visuel.

Exemple : pendant un blocage quotidien, une nouvelle exposition peut être interdite alors qu'une clôture réduisant le risque reste permise.

Si votre terminal se reconnecte après une coupure, il resynchronise l'état autoritatif avant de réactiver les actions sensibles.


---

## HLP-034 — Instruments, tailles et exposition maximale

**Publication :** DYNAMIC

Le catalogue d'instruments et les limites d'exposition sont des données de policy/instrument, pas du texte figé.

Le scope V1 actuellement verrouillé comprend :
- EURUSD ;
- GBPUSD ;
- USDJPY ;
- XAUUSD ;
- NAS100.

Avant publication, l'article doit lire les Symbol Specifications réellement en vigueur pour afficher :
- précision ;
- taille minimale ;
- valeur du point ;
- heures de marché ;
- limites de taille/exposition ;
- leverage si publié ;
- spread/commission/swap applicables.

Si une valeur reste candidate, ne l'affichez pas comme règle publique.


---

## HLP-035 — Spread, slippage, commissions et swaps

**Publication :** DYNAMIC

**Spread** : écart entre prix acheteur et vendeur.

**Slippage** : différence possible entre le prix observé et le prix réellement exécuté selon le modèle serveur.

**Commission** : frais de transaction lorsque la specification en prévoit.

**Swap** : ajustement lié au maintien de certaines positions selon l'instrument et le modèle.

Ces éléments peuvent influencer le P&L, l'equity et donc le risque. Les montants exacts proviennent des Symbol Specifications publiées. WARIBA ne doit pas inventer des frais nuls ou des valeurs génériques.


---

## HLP-036 — Pourquoi un ordre peut-il être refusé ?

**Publication :** PUBLISH

Un refus signifie que le serveur n'a pas accepté l'action demandée.

Raisons possibles :
- compte non tradable ;
- perte quotidienne atteinte ;
- perte maximale dépassée ;
- exposition maximale ;
- prix trop ancien ;
- marché fermé ;
- ordre invalide ;
- connexion non resynchronisée ;
- ressource non autorisée.

Un ordre refusé ne doit pas créer de fill, augmenter une position ni modifier le ledger.

WariX affiche un message persistant lorsque le refus nécessite une action, avec un code stable et une référence support lorsque disponible.


---

## HLP-037 — Données de marché stale, offline et resynchronisation

**Publication :** PUBLISH

WARIBA distingue :
- **live/à jour** ;
- **stale** : données trop anciennes ;
- **offline** : connexion perdue ;
- **resynchronisation**.

Quand les prix ne sont pas assez récents pour ouvrir une nouvelle exposition, le serveur refuse l'action.

Après une reconnexion, WariX ne suppose pas que les anciennes permissions sont encore valides. Il récupère un snapshot autoritatif et les événements nécessaires avant de réactiver les commandes.


---

## HLP-038 — Pratiques autorisées et interdites

**Publication :** DRAFT_POLICY

Cet article doit être publié uniquement quand l'Account Policy actuelle définit précisément chaque pratique.

Structure à utiliser :

### Autorisé
- trading manuel selon les instruments et horaires disponibles ;
- usage des outils d'analyse intégrés ;
- Stop Loss / Take Profit ;
- gestion normale de positions.

### À définir avant publication
- hedging entre comptes ;
- copy trading ;
- Expert Advisors ;
- bots ;
- HFT ;
- arbitrage de latence ;
- grid trading ;
- exploitation d'erreurs de prix.

Ne copiez pas les interdictions de Lucid, Tradeify ou For Traders : WARIBA doit publier ses propres définitions, critères de preuve, conséquences et parcours de recours.


---

## HLP-039 — Trading intègre et exploitation technique

**Publication :** PUBLISH

WARIBA évalue le comportement de trading dans un environnement simulé. Une performance obtenue en exploitant volontairement une erreur technique, une donnée manifestement incorrecte ou une incohérence du système peut faire l'objet d'une revue d'intégrité si la policy le prévoit.

Une décision d'intégrité ne doit jamais être un simple jugement opaque. Elle doit être associée à :
- une règle publiée ;
- des faits ;
- une période ;
- des références d'audit ;
- un reason code ;
- un recours lorsque la décision est contestable.

Une stratégie inhabituelle n'est pas, à elle seule, une preuve de fraude.


---

## HLP-040 — Comment lire la preuve d'un breach ?

**Publication :** PUBLISH

Une preuve de breach doit permettre de comprendre exactement ce qui s'est passé.

Elle peut contenir :
- règle ;
- seuil ;
- valeur observée ;
- instant ;
- policy version ;
- compte ;
- ordres/fills pertinents ;
- données de marché utilisées ;
- correlation ID.

La preuve originale est conservée. Une contestation ajoute un dossier et une décision : elle ne supprime ni ne réécrit silencieusement l'événement initial.


---

## HLP-050 — Découvrir WariX

**Publication :** PUBLISH

WariX est le terminal de trading WARIBA.

Il sert à :
- sélectionner un marché ;
- lire le graphique ;
- placer et gérer les ordres supportés ;
- suivre positions, ordres et exécutions ;
- afficher le risque autoritatif ;
- utiliser les indicateurs et outils disponibles.

WariX ne sert pas à gérer la facturation, l'achat, le KYC complet ou les payouts. Ces capacités appartiennent au Trader Hub.


---

## HLP-051 — Comment placer un ordre

**Publication :** DYNAMIC

1. Sélectionnez un compte tradable.
2. Choisissez l'instrument.
3. Vérifiez le type d'ordre disponible.
4. Saisissez la quantité.
5. Ajoutez une protection si elle est supportée.
6. Envoyez l'ordre.

Le navigateur ne fournit jamais le prix d'exécution autoritatif. Le serveur valide le compte, le marché, le prix et le risque, puis retourne le résultat.

Si un ordre est refusé, lisez le reason code et l'action proposée plutôt que de soumettre immédiatement la même commande plusieurs fois.


---

## HLP-052 — Stop Loss et Take Profit

**Publication :** PUBLISH

Un Stop Loss et un Take Profit sont des protections/conditions attachées à une position ou une instruction selon le type d'ordre supporté.

WARIBA traite les déclenchements côté serveur. Le prix affiché sur le graphique ne constitue pas une garantie d'exécution exacte : le spread et le slippage du modèle peuvent s'appliquer.

Les modifications doivent utiliser le flux canonique d'exécution. Un dessin sur le graphique n'est jamais automatiquement un SL ou un TP.


---

## HLP-053 — Réduire, clôturer et Close All

**Publication :** PUBLISH

**Réduire** diminue l'exposition existante.

**Clôturer** ferme une position.

**Close All** demande la fermeture des positions concernées selon le flux serveur.

Ces actions sont sérialisées et auditées. En cas de commandes concurrentes ou de retry, WARIBA doit éviter les doubles effets.

Pendant certains états de risque, ouvrir de nouvelles positions peut être bloqué alors qu'une réduction reste permise.


---

## HLP-054 — Ordres en attente : disponibilité et comportement

**Publication :** DYNAMIC

WariX n'affiche que les types d'ordres réellement supportés.

Pour chaque type disponible, l'aide doit préciser :
- condition de déclenchement ;
- relation requise au prix courant ;
- durée/expiration si applicable ;
- comportement en marché fermé ;
- traitement en soft lock, breach ou payout hold ;
- annulation.

Ne publiez pas un type d'ordre simplement parce qu'un concurrent le propose.


---

## HLP-055 — Indicateurs et dessins

**Publication :** PUBLISH

Les indicateurs et dessins sont des outils d'analyse visuelle. Ils n'ont aucune autorité sur :
- le prix d'exécution ;
- la balance ;
- le risque ;
- le statut du compte ;
- l'éligibilité payout.

Les paramètres disponibles doivent correspondre aux indicateurs réellement implémentés. Un contrôle non fonctionnel ne doit pas apparaître.

Les préférences de graphique peuvent être locales ou synchronisées selon la version du produit ; l'interface doit refléter la capacité réellement livrée.


---

## HLP-056 — Que faire si WariX se déconnecte ?

**Publication :** PUBLISH

Si la connexion est perdue :
1. WariX affiche l'état de connexion ;
2. les actions augmentant le risque sont suspendues ;
3. le système tente une reconnexion ;
4. un snapshot autoritatif est récupéré ;
5. les événements manqués sont réconciliés lorsque le transport le permet ;
6. les actions sont réactivées seulement après resynchronisation.

Ne rechargez pas ou ne multipliez pas les ordres pour « vérifier ». Consultez l'activité et le statut du dernier ordre.


---

## HLP-057 — Où voir mes ordres, exécutions et positions ?

**Publication :** PUBLISH

Dans WariX, l'activité de session est regroupée dans le dock/volet prévu à cet effet :
- Positions ;
- Ordres ;
- Exécutions ;
- Alertes lorsqu'elles sont supportées ;
- Compte.

Pour l'analyse historique détaillée, utilisez le Journal et la page Performance du Trader Hub.

Il ne doit pas exister deux systèmes indépendants calculant les mêmes positions.


---

## HLP-058 — Historique du graphique et prix d'exécution : pourquoi des états différents ?

**Publication :** PUBLISH

WARIBA sépare volontairement :
- la disponibilité de l'historique graphique ;
- la disponibilité d'un feed suffisamment frais pour exécuter.

Un graphique peut contenir un historique valide alors que le feed actuel est stale. À l'inverse, un feed d'exécution peut fonctionner sans disposer d'un historique très profond.

WariX ne raccorde pas artificiellement deux séries dont les prix divergent de façon non acceptable. Cette séparation protège contre l'affichage d'une continuité fictive.


---

## HLP-060 — Qu'est-ce qu'un compte WARIBA Performance ?

**Publication :** PUBLISH

WARIBA Performance est l'étape qui suit une évaluation WARIBA ONE validée.

Le compte Performance :
- est simulé en V1 ;
- possède sa propre policy ;
- commence au nominal prévu ;
- suit ses propres conditions de risque et de payout ;
- ne garantit pas un futur compte live.

Les profits de l'évaluation ne sont pas automatiquement transférés comme capital réel.


---

## HLP-061 — Comment fonctionne le buffer permanent de 10 % ?

**Publication :** PUBLISH

La policy actuelle prévoit un **buffer permanent de 10 % du nominal** sur WARIBA Performance.

Le buffer est construit une fois et n'est pas retirable. Le profit éligible au payout correspond à l'excédent réalisé au-dessus du buffer, sous réserve des autres conditions.

Exemple pédagogique pour 10 000 USD :
- buffer permanent : 1 000 USD ;
- les premiers profits servent à construire ce buffer ;
- seul l'excédent réalisé au-dessus peut entrer dans le calcul d'éligibilité.

Le montant réellement éligible est toujours calculé par le moteur.


---

## HLP-062 — Qu'est-ce que le profit éligible sur Performance ?

**Publication :** PUBLISH

Le profit éligible n'est pas simplement « balance actuelle moins nominal ».

Le moteur tient compte :
- du buffer permanent ;
- du profit réalisé ;
- de la policy du cycle ;
- des trades éligibles ;
- des pertes ;
- des holds éventuels ;
- des autres conditions de payout.

Le Hub doit distinguer le profit du compte, l'excédent éligible et le montant réellement prêt à demander.


---

## HLP-063 — Comment fonctionnent les 5 Performance Days ?

**Publication :** PUBLISH

Chaque payout exige actuellement **5 nouvelles Performance Days**.

Une Performance Day atteint actuellement au moins **0,50 % du nominal en profit net réalisé**.

Exemples :
- 5K → 25 USD ;
- 10K → 50 USD ;
- 25K → 125 USD ;
- 50K → 250 USD ;
- 100K → 500 USD.

Chaque cycle doit utiliser de nouvelles journées selon le moteur. Une journée déjà consommée par un cycle précédent ne doit pas être réutilisée.


---

## HLP-064 — Best Day Rule sur un cycle Performance

**Publication :** PUBLISH

WARIBA Performance applique actuellement une Best Day Rule de **50 % par cycle**.

Le principe est le même : le meilleur jour positif du cycle ne doit pas représenter plus de 50 % du total positif éligible du cycle pour satisfaire la condition payout.

Ce dépassement n'est pas un breach. Il signifie que le trader doit améliorer la distribution de ses profits avant l'éligibilité.


---

## HLP-065 — Comment fonctionne le split des payouts ?

**Publication :** PUBLISH

La policy actuelle prévoit :
- payouts #1 à #4 : **85 % trader / 15 % WARIBA** ;
- payout #5 : **90 % trader / 10 % WARIBA**.

Le split s'applique au calcul autoritatif du payout approuvé, avec les autres conditions et caps publiés.

Un montant affiché comme estimation n'est pas un montant payé. Le payout possède ensuite ses propres états de revue et de traitement.


---

## HLP-066 — Que se passe-t-il après le cinquième payout ?

**Publication :** PUBLISH

Après le cinquième payout marqué `paid` :
- le cycle se ferme ;
- aucun sixième payout automatique n'est créé ;
- un dossier WARIBA Review s'ouvre.

WARIBA Review détermine la prochaine étape disponible selon la policy et les décisions futures.

**Cette étape ne garantit pas une allocation de capital réel.**


---

## HLP-070 — Comment fonctionne l'éligibilité au payout ?

**Publication :** PUBLISH

WARIBA vérifie le cycle Performance à partir des données autoritatives.

Le Hub peut afficher notamment :
- buffer permanent ;
- profit éligible ;
- Performance Days ;
- Best Day Rule ;
- positions/ordres bloquants ;
- KYC ;
- méthode de payout ;
- hold d'intégrité ;
- cap et split lorsque publiés.

L'éligibilité est recalculée sur des données fraîches. Un ancien écran ne constitue pas une garantie qu'une demande est encore possible.


---

## HLP-071 — `financially_eligible` vs `ready_to_request`

**Publication :** PUBLISH

WARIBA sépare deux étapes.

### Conditions financières remplies
`financially_eligible` signifie que les conditions économiques et de trading du cycle sont satisfaites.

### Prêt à demander
`ready_to_request` signifie que les autres gates nécessaires sont également satisfaits : par exemple KYC, méthode de payout, absence de hold et données fraîches.

Au premier `financially_eligible`, le KYC peut devenir requis. Aucune payout request n'est créée automatiquement à ce moment.


---

## HLP-072 — Comment demander un payout ?

**Publication :** PUBLISH

Lorsque le statut serveur indique `ready_to_request` :

1. ouvrez `/payouts` ;
2. vérifiez le calcul ;
3. vérifiez le montant, le split et les conditions ;
4. confirmez la demande.

La création fige un snapshot d'éligibilité et empêche une seconde demande active équivalente.

La demande passe ensuite en revue. Une demande créée n'est pas encore un paiement.


---

## HLP-073 — Pending review, approved, processing, paid : différences

**Publication :** PUBLISH

- **En revue (`pending_review`)** : WARIBA vérifie la demande.
- **Approuvé (`approved`)** : la décision est positive, mais aucun paiement n'est encore confirmé.
- **En traitement (`processing`)** : le transfert a été soumis ou est en cours chez le provider.
- **Payé (`paid`)** : le paiement a été confirmé et réconcilié.

WARIBA ne doit jamais afficher « payé » simplement parce qu'une demande a été approuvée.


---

## HLP-074 — Que se passe-t-il si un payout échoue ou revient ?

**Publication :** PUBLISH

Un transfert peut échouer ou être retourné par le provider.

WARIBA conserve :
- la demande originale ;
- le statut provider ;
- la référence ;
- la raison structurée ;
- l'audit.

Un retry autorisé utilise la même logique d'idempotence pour éviter un double transfert.

L'interface indique si une action du trader est nécessaire ou si WARIBA poursuit la réconciliation.


---

## HLP-075 — Peut-on continuer à trader pendant un payout ?

**Publication :** DRAFT_POLICY

La politique `PAYOUT_TRADING_FREEZE_POLICY` est actuellement **OPEN**.

WARIBA ne doit donc pas publier aujourd'hui une affirmation comme :
- « vous pouvez continuer à trader normalement » ;
- « tout trading est bloqué » ;
- « seules les nouvelles expositions sont bloquées ».

Lorsque la décision sera verrouillée, cet article devra décrire exactement :
- les permissions pendant une demande ;
- quand elles commencent ;
- quand elles prennent fin ;
- le comportement des positions et ordres déjà ouverts.


---

## HLP-076 — Taux de change, frais et devise de réception

**Publication :** DRAFT_PROVIDER

Les calculs du programme peuvent être libellés en USD simulés tandis qu'un payout réel futur peut utiliser une devise locale ou un rail Mobile Money.

Avant publication, WARIBA doit verrouiller :
- le fournisseur de taux ;
- l'instant du fixing ;
- la durée de validité ;
- l'arrondi ;
- les frais ;
- la marge de change éventuelle ;
- le reçu affiché au trader.

Aucun frais ne doit être déduit sans barème public et acceptation appropriée.


---

## HLP-080 — Comment WARIBA confirme un paiement

**Publication :** PUBLISH

Une redirection vers WARIBA après paiement ne prouve pas à elle seule que la transaction est confirmée.

Le statut est décidé côté serveur à partir du webhook sécurisé et/ou de la réconciliation du provider.

États utilisateur principaux :
- Confirmation en attente ;
- Paiement confirmé ;
- Paiement non confirmé ;
- Statut en vérification.

Si le statut est inconnu : **ne payez pas une seconde fois**. Utilisez la référence de commande pour demander de l'aide.


---

## HLP-081 — Quels moyens de paiement sont acceptés ?

**Publication :** DRAFT_PROVIDER

Cet article doit être généré depuis la configuration du PSP réellement contracté.

Pour l'Afrique francophone, WARIBA prévoit de supporter selon les pays et le provider :
- Mobile Money ;
- carte bancaire ;
- autres rails publiés.

Ne mentionnez jamais Orange Money, MTN, Moov, Wave, Visa ou Mastercard comme disponibles dans un pays tant que le PSP actif n'a pas confirmé cette combinaison et que WARIBA ne l'a pas testée.

Afficher par pays :
`Méthode | disponibilité | devise | frais | délai de confirmation`.


---

## HLP-082 — Mon paiement est en attente

**Publication :** PUBLISH

Un paiement peut rester en attente pendant la confirmation provider.

Pendant cet état :
- aucun second compte n'est créé ;
- WARIBA continue de vérifier le statut ;
- vous devez éviter de lancer un deuxième paiement pour la même commande.

Conservez la référence de commande. Si le statut reste inchangé au-delà d'un délai opérationnel réellement publié, ouvrez un ticket.


---

## HLP-083 — Mon paiement a échoué

**Publication :** PUBLISH

`payment_failed` signifie que WARIBA n'a pas confirmé le paiement.

Aucun compte ne doit être activé sur la seule base d'un retour navigateur.

Vérifiez :
- l'état affiché ;
- la référence de commande ;
- les instructions du provider.

Si votre moyen de paiement a été débité mais que WARIBA affiche toujours un échec, n'effectuez pas immédiatement une seconde transaction. Ouvrez un ticket pour réconciliation.


---

## HLP-084 — Comment éviter un double paiement

**Publication :** PUBLISH

Chaque commande possède une référence et WARIBA utilise des mécanismes d'idempotence.

Si la page semble lente ou si vous revenez du provider :
1. vérifiez d'abord le statut de la commande ;
2. ne recréez pas une commande simplement pour obtenir une réponse plus rapide ;
3. utilisez le support si le statut reste inconnu.

La répétition d'un webhook valide ne doit pas créer deux comptes.


---

## HLP-085 — Reçus et historique de facturation

**Publication :** DYNAMIC

La page Facturation affiche uniquement les éléments réellement disponibles :
- commande ;
- produit ;
- montant ;
- devise ;
- provider ;
- statut ;
- date ;
- référence ;
- reçu si sa génération est implémentée.

WARIBA ne doit pas afficher de fausse carte bancaire sauvegardée ni un faux bouton de reçu.


---

## HLP-086 — Remboursements

**Publication :** DRAFT_POLICY

La politique définitive de remboursement est OPEN.

Avant qu'elle soit verrouillée, WARIBA ne doit promettre :
- aucun délai ;
- aucune éligibilité automatique ;
- aucun pourcentage ;
- aucune procédure de chargeback punitive non publiée.

Cet article pourra être activé une fois la politique commerciale, le PSP et les conditions juridiques alignés.


---

## HLP-090 — Pourquoi WARIBA demande une vérification d'identité

**Publication :** PUBLISH

La vérification d'identité protège les payouts, l'intégrité du programme et les obligations de conformité.

WARIBA sépare le KYC du trading : un dossier KYC est un objet Identity/Compliance distinct du compte de trading.

Le provider peut vérifier notamment l'identité, les documents et d'autres contrôles nécessaires selon la juridiction. WARIBA limite l'accès aux informations sensibles et ne doit pas mettre des documents bruts dans les tables métier ordinaires.


---

## HLP-091 — Quand le KYC est-il demandé ?

**Publication :** PUBLISH

Par défaut, WARIBA déclenche le KYC au **premier payout financièrement éligible**.

Flux :
`financially_eligible → KYC required → verified → éligibilité recalculée → ready_to_request`

Exception : une obligation juridique, un PSP, un provider, un pays ou Compliance peut exiger une vérification plus tôt. Une telle exception doit être documentée par policy.

WARIBA ne doit pas demander un KYC complet avant l'achat simplement pour imiter un concurrent.


---

## HLP-092 — Quels sont les états d'une vérification KYC ?

**Publication :** PUBLISH

Les états principaux prévus sont :
- non requis ;
- requis ;
- en cours ;
- en revue ;
- action requise ;
- échec réessayable ;
- échec final ;
- vérifié ;
- expiré ;
- nouvelle vérification requise.

L'interface affiche une action claire lorsque le trader peut intervenir.

Un KYC `action_required` ne signifie pas que le trader a commis une fraude.


---

## HLP-093 — Quels documents sont acceptés pour le KYC ?

**Publication :** DRAFT_PROVIDER

Ne publier cet article qu'après choix du provider KYC et validation de sa couverture des pays WARIBA.

La version finale doit afficher par pays :
- pièces d'identité supportées ;
- qualité/photo requise ;
- justificatif éventuel ;
- selfie/liveness si applicable ;
- formats ;
- motifs courants de rejet ;
- règles de confidentialité.

Ne promettez pas qu'un document est accepté simplement parce qu'un concurrent l'accepte.


---

## HLP-094 — KYC refusé, action requise et nouvelle vérification

**Publication :** PUBLISH

Un dossier peut demander une correction sans être définitivement refusé.

- `action_required` : une information doit être corrigée.
- `failed_retryable` : une nouvelle tentative est possible.
- `failed_final` : la vérification n'a pas été validée ; le recours disponible doit être expliqué.
- `expired` / `reverification_required` : une nouvelle vérification est nécessaire pour un motif documenté.

La ré-vérification ne doit pas être déclenchée à chaque payout sans raison.


---

## HLP-095 — Pourquoi un KYC échoué ne fait pas échouer un compte de trading

**Publication :** PUBLISH

Le KYC et le risque de trading sont deux domaines séparés.

Un échec de vérification d'identité peut bloquer une étape de payout ou déclencher une revue Compliance. Il ne transforme pas automatiquement un compte de trading en breach.

Le statut du compte de trading doit toujours refléter une règle de trading/lifecycle autoritative, pas un raccourci Compliance.


---

## HLP-100 — Connexion et session expirée

**Publication :** PUBLISH

Si votre session expire, WARIBA vous demande de vous reconnecter.

Lorsque cela est sûr, la destination initiale est conservée afin de vous ramener vers la page demandée.

Une session expirée n'autorise aucune opération sensible en arrière-plan. WariX suspend les actions nécessitant une session valide.


---

## HLP-101 — Vérification email et récupération du mot de passe

**Publication :** PUBLISH

Utilisez les écrans officiels WARIBA pour vérifier votre adresse ou réinitialiser votre mot de passe.

Pour des raisons de sécurité, le parcours de récupération ne doit pas révéler inutilement si une adresse appartient à un compte.

Ne communiquez jamais vos tokens de récupération au support.


---

## HLP-102 — Puis-je utiliser plusieurs comptes ?

**Publication :** DRAFT_POLICY

Le nombre maximal d'évaluations actives par utilisateur reste une décision commerciale à verrouiller avant vente publique.

WARIBA ne doit donc pas publier un nombre inventé.

Le système peut toutefois imposer les contraintes techniques ou Compliance déjà publiées pour certains types de comptes. La page Offres doit désactiver une nouvelle activation seulement lorsque le serveur retourne une règle réelle.


---

## HLP-103 — Pourquoi je ne peux pas ouvrir le compte d'un autre trader

**Publication :** PUBLISH

Un identifiant présent dans une URL n'accorde aucun accès.

WARIBA vérifie l'ownership côté serveur et avec RLS. Si vous essayez d'ouvrir une ressource qui ne vous appartient pas, aucune donnée du compte concerné ne doit être révélée.

Cette protection s'applique notamment aux comptes, tickets, payouts, ordres et dossiers KYC.


---

## HLP-104 — Voyage, appareil, VPN/VPS

**Publication :** DRAFT_POLICY

WARIBA doit publier une politique précise avant de sanctionner un usage de VPN, VPS ou changement géographique.

Cet article reste masqué tant que les règles d'intégrité correspondantes ne sont pas verrouillées.

Principe éditorial : un VPN seul ne doit jamais être présenté comme une preuve automatique de fraude. Toute action d'intégrité doit s'appuyer sur une policy et des faits audités.


---

## HLP-105 — Fermer ou désactiver un compte utilisateur

**Publication :** DRAFT_POLICY

La fermeture du compte utilisateur doit respecter les obligations de conservation, les dossiers financiers, les contestations et la législation applicable.

Ne confondez pas :
- fermeture du profil utilisateur ;
- compte de trading `closed` ;
- compte de trading `inactive` ;
- compte `breached`.

Les procédures de suppression/rétention doivent être finalisées avec Privacy/Legal avant publication.


---

## HLP-110 — Données de marché indisponibles ou retardées

**Publication :** PUBLISH

Si WARIBA détecte que les données sont trop anciennes, l'interface peut afficher :

**« Les données sont trop anciennes pour ouvrir une nouvelle exposition. Nous reconnectons le flux. »**

Le chart peut rester consultable lorsqu'il possède des données sûres, mais une donnée historique disponible ne signifie pas qu'un prix est suffisamment frais pour exécuter.

Consultez `/status` lorsqu'un incident global est publié.


---

## HLP-111 — Maintenance et page Status

**Publication :** PUBLISH

La page `/status` doit indiquer les incidents et maintenances qui affectent réellement :
- site ;
- authentification ;
- WariX/realtime ;
- market data ;
- paiement ;
- support ;
- autres providers importants.

Pour chaque incident : portée, début, dernière mise à jour et statut.

WARIBA ne doit pas afficher une disponibilité fictive ou un délai de résolution inventé.


---

## HLP-112 — Que signifie un correlation ID ?

**Publication :** PUBLISH

Un correlation ID est une référence technique qui permet à WARIBA de relier plusieurs événements d'une même opération sans vous demander de fournir des données sensibles.

Vous pouvez le joindre à un ticket lorsqu'une erreur l'affiche.

Il ne contient pas votre mot de passe et ne remplace pas l'identifiant public du ticket ou de la commande.


---

## HLP-113 — Paiement confirmé mais activation retardée

**Publication :** PUBLISH

Si le paiement est confirmé mais que l'activation du compte rencontre un incident, WARIBA conserve la commande et le paiement.

Le système ne doit pas vous demander de payer une seconde fois.

L'écran affiche :
- statut ;
- dernière mise à jour ;
- référence ;
- `expectedBy` seulement si WARIBA dispose d'un délai réellement surveillé.

Si nécessaire, ouvrez un ticket avec la référence de commande.


---

## HLP-114 — Problème d'affichage mobile ou navigateur

**Publication :** PUBLISH

Avant d'ouvrir un ticket :
1. vérifiez que votre navigateur est à jour ;
2. rechargez la page sans répéter une opération financière ;
3. notez le navigateur, l'appareil et l'heure ;
4. conservez le correlation ID s'il existe.

Pour un problème WariX, précisez aussi le compte, l'instrument et l'état de connexion. Ne partagez jamais votre mot de passe ou une clé API.


---

## HLP-120 — Comment contacter le support WARIBA

**Publication :** PUBLISH

Le canal principal est le système de support authentifié dans le Trader Hub.

Utilisez le Centre d'aide pour les questions générales. Créez un ticket lorsqu'une question concerne votre compte, une commande, un ordre, un payout ou un incident spécifique.

Un canal WhatsApp ou email peut être ajouté plus tard, mais il ne doit pas devenir l'unique lieu où une décision financière est documentée. Les décisions importantes restent liées au dossier WARIBA.


---

## HLP-121 — Comment créer et suivre un ticket

**Publication :** PUBLISH

1. Ouvrez Support.
2. Choisissez la catégorie.
3. Sélectionnez le compte ou la ressource lorsque nécessaire.
4. Décrivez le problème.
5. Envoyez la demande.

Votre ticket reçoit une référence publique.

Vous pouvez ensuite suivre son statut et les réponses dans le même fil. Les messages opérateur et trader restent traçables ; ils ne doivent pas être silencieusement réécrits.


---

## HLP-122 — Comment ouvrir une contestation

**Publication :** PUBLISH

Une contestation sert à remettre en question une décision WARIBA contestable, par exemple un breach disposant d'une preuve.

Depuis le détail du compte :
1. ouvrez la preuve ;
2. choisissez **Ouvrir une contestation** ;
3. expliquez votre désaccord ;
4. soumettez.

WARIBA relie le dossier aux preuves autoritatives. Vous n'avez pas à recopier les chiffres du système.

Une contestation ne réactive pas automatiquement le compte pendant la revue.


---

## HLP-123 — Que peut-on contester ?

**Publication :** PUBLISH

Les cibles disponibles dépendent des workflows réellement implémentés.

Pour la bêta, une contestation peut notamment viser un breach ou une décision risque lorsqu'une preuve structurée existe.

Les futurs refus de payout ou décisions KYC pourront suivre un parcours dédié lorsqu'ils seront opérationnels.

Une question générale ou une incompréhension doit rester un ticket Support, pas nécessairement une contestation.


---

## HLP-124 — Comment WARIBA examine une contestation

**Publication :** PUBLISH

L'opérateur examine les mêmes faits autoritatifs que ceux reliés au dossier :
- policy ;
- seuil ;
- valeur observée ;
- ordres/fills ;
- événement risque ;
- timestamps ;
- market data disponible ;
- audit.

Le trader peut ajouter son explication.

La décision comporte un statut et une raison. Une décision ne doit pas être « discrétionnaire » sans justification documentée.


---

## HLP-125 — Pourquoi la preuve originale n'est jamais supprimée

**Publication :** PUBLISH

WARIBA privilégie un historique auditable.

Si une décision initiale est contestée, le système conserve :
- l'événement original ;
- la preuve originale ;
- la contestation ;
- l'analyse ;
- la décision finale ;
- toute correction autorisée sous forme d'un nouvel événement.

Cette méthode évite de modifier l'histoire pour faire disparaître une erreur ou un désaccord.


---

## HLP-126 — Statuts d'un ticket ou d'une contestation

**Publication :** PUBLISH

### Ticket
- Ouvert
- En attente du trader
- En cours d'examen
- Résolu
- Fermé

### Contestation
- Ouverte
- En cours d'examen
- Information requise
- Décision confirmée / autre décision autorisée
- Fermée

Les libellés finaux doivent être mappés aux enums actuels du code. Un statut critique ne doit jamais dépendre uniquement d'une couleur.


---

## HLP-127 — Quelles informations fournir au support

**Publication :** PUBLISH

Fournissez si possible :
- référence du ticket/compte/commande ;
- date et heure ;
- ce que vous essayiez de faire ;
- résultat attendu ;
- message ou code affiché ;
- correlation ID.

Pour le trading, ajoutez l'instrument et le type d'action.

Ne fournissez jamais :
- mot de passe ;
- clé API ;
- token de récupération ;
- secret Supabase ;
- données de carte complètes.


---

# 9. Articles qui doivent rester MASQUÉS au lancement tant que la décision n'est pas fermée

## `DRAFT_POLICY`
- reset/repurchase ;
- politique de remboursement ;
- maximum de comptes actifs ;
- trading pendant un payout ;
- règles détaillées automatisation/EA/HFT/hedging/copy trading si non publiées ;
- politique VPN/VPS ;
- suppression/rétention utilisateur.

## `DRAFT_PROVIDER`
- méthodes de paiement précises par pays ;
- frais de paiement ;
- documents KYC acceptés ;
- payout rails ;
- frais/taux de change/délais ;
- calendrier économique Performance si sa règle dépend d'un provider.

**Règle : pas de placeholder « bientôt disponible » dans la navigation principale.**

---

# 10. Dispositions de design à implémenter

## Cards de catégorie
Sobres, compactes, 1 icône + titre + courte description + nombre d'articles.

## Page article desktop
- largeur lecture 720–820 px ;
- breadcrumb ;
- titre 30–36 px ;
- résumé ;
- badges règle/programme ;
- TOC sticky uniquement sur long article ;
- blocs formule/exemple distincts ;
- « Articles liés » ;
- support CTA.

## Mobile 320–390
- aucune table horizontale critique ;
- tables converties en cartes clé/valeur si nécessaire ;
- formule monospaced mais scrollable uniquement si elle ne peut pas être reflow ;
- titre 24–28 px ;
- recherche accessible en haut ;
- CTA support tactile >=44 px.

## Composants proposés
- `HelpSearch`
- `HelpCategoryCard`
- `HelpArticleLayout`
- `RuleSummary`
- `AppliesToBadge`
- `RuleSeverityBadge`
- `FormulaBlock`
- `WorkedExample`
- `PolicyVersionBadge`
- `RelatedArticles`
- `SupportCTA`
- `DisputeCTA`

Ne créez pas un design system parallèle : réutiliser les primitives WARIBA.

---

# 11. Dispositions d'architecture pour Claude

## 11.1 Phase 3.2 : contenu repository-backed

Comme la base `help_articles` est encore absente et que le CMS n'est pas indispensable à la bêta, conserver initialement le contenu dans le repository.

Exemple possible, à adapter après inspection :

```text
apps/web/content/help/fr/
  commencer/
  wariba-one/
  risque-regles/
  warix/
  performance/
  payouts/
  paiements/
  identite/
  compte-securite/
  technique/
  support/
```

Ne forcez pas ce path si l'architecture existante a déjà un propriétaire de contenu.

## 11.2 Registre typé

Créer un registry typé avec :
- id ;
- slug ;
- category ;
- title ;
- summary ;
- status ;
- severity ;
- appliesTo ;
- sourceOfTruth ;
- searchAliases ;
- related ;
- lastReviewedAt.

Validation Zod au build.

## 11.3 Policy-bound facts

Idéal :

```text
Article copy
   +
published policy facts
   ↓
render
```

Éviter :

```text
article A: "DLL 3%"
article B: "DLL 3%"
component C: 3
FAQ D: "3%"
```

avec quatre sources à maintenir.

## 11.4 Recherche
Pour la bêta :
- index statique au build ;
- recherche locale côté client ;
- accent-insensitive ;
- alias ;
- fuzzy léger si déjà disponible ;
- pas de SaaS search payant.

## 11.5 Public vs privé

`/aide` :
- contenu public ;
- règles génériques ;
- recherche.

`/support` authentifié :
- tickets ;
- contestations ;
- contexte compte ;
- preuve.

WariX :
- liens contextuels vers `/aide/...` ;
- aucune seconde base d'articles.

---

# 12. Reason-code → article mapping recommandé

```text
RISK_DAILY_LOSS_LOCK
  → HLP-012

RISK_MAXIMUM_LOSS_BREACH
  → HLP-013 + HLP-040

MARKET_DATA_STALE
  → HLP-037

OFFLINE
  → HLP-056

PAYOUT_NOT_READY
  → HLP-070

PAYOUT_ALREADY_OPEN
  → HLP-072

KYC_ACTION_REQUIRED
  → HLP-094

PAYMENT_STATUS_UNKNOWN
  → HLP-082

ACCOUNT_ACTIVATION_DELAYED
  → HLP-113

PASS_REVIEW_DELAYED
  → HLP-021
```

Ce mapping permet à un message d'erreur de proposer immédiatement « Comprendre cette règle » sans inventer une explication locale.

---

# 13. SEO / navigation publique

Titres SEO en français naturel :

- « Comment fonctionne la perte quotidienne WARIBA ? »
- « Perte maximale EOD : calcul et exemples »
- « Best Day Rule WARIBA : formule et exemples »
- « WARIBA Performance : buffer, Performance Days et payouts »
- « Pourquoi mon ordre WariX est-il refusé ? »

Ne faire indexer que les articles `PUBLISH/DYNAMIC` réellement publics.

Les dossiers ticket/contestation restent privés et `noindex`.

---

# 14. Analytics utiles

Événements non-financiers :
- `help_search`
- `help_search_no_result`
- `help_article_viewed`
- `help_related_opened`
- `help_support_cta`
- `help_dispute_cta`

Ne pas loguer la requête brute si elle peut contenir de la PII sans politique adéquate.

Les analytics n'ont aucune autorité sur un statut métier.

---

# 15. Priorité d'intégration

## P0 — avant première bêta externe
HLP-001, 002, 003, 006, 010–023 sauf drafts, 030–040 sauf drafts, 050–057, 060–066, 070–075 sauf draft, 080–085, 090–095, 100–103, 110–113, 120–127.

## P1 — compléter juste après
HLP-004, 005, 007, 034–035, 058, 076, 081, 085, 104–105, 114.

## P2 / après providers ou décisions
tous `DRAFT_POLICY` et `DRAFT_PROVIDER`.

---

# 16. QA contenu

Claude doit tester :

1. aucune ancienne règle 8/4/8/40 visible dans les nouveaux articles ;
2. aucun `funded real`, `live guaranteed`, `capital allocated automatically` ;
3. aucune promesse de payout #6 ;
4. aucune règle reset inventée ;
5. aucune règle de remboursement inventée ;
6. aucune méthode Mobile Money annoncée avant provider ;
7. aucune fenêtre news Performance publiée si policy/provider non verrouillés ;
8. Best Day 50 % n'est jamais décrite comme breach ;
9. DLL 3 % est soft lock ;
10. Maximum Loss 10 % EOD trailing est hard breach ;
11. KYC commence au premier `financially_eligible` par défaut ;
12. Performance est explicitement simulé ;
13. trade profitable <60s : profit programme potentiellement inéligible ; pertes comptées ;
14. aucun faux délai support/KYC/payout ;
15. aucun texte concurrent copié.

---

# 17. Prompt d'intégration court pour Claude

```text
Use WARIBA_HELP_CENTER_CONTENT_MASTER_2026-08-23.md as the content specification
for Phase 3.2 Help/Support integration.

First reconcile every PUBLISH/DYNAMIC article against:
1. Decision Log,
2. current published policy,
3. Product OS Constitution,
4. current domain code.

Never publish a DRAFT_POLICY or DRAFT_PROVIDER article.

Do not hardcode policy values in React when a shared policy/read-model fact exists.

Create/reuse a repository-backed typed help-content registry for beta.
Do not build a CMS in this slice.

Implement:
- `/aide` search-first Help Center,
- category pages,
- article routes,
- related articles,
- contextual reason-code links,
- responsive 320/375/390 layouts,
- Support CTA,
- breach Dispute CTA where Phase 3.2 dispute workflow exists.

Keep `/aide` public and support tickets/contestations private.
Do not build `/notifications`.

Run targeted content/route/search/accessibility tests only.
No full certification.

After integration report:
HELP_ARTICLES_PUBLISHED =
HELP_ARTICLES_DRAFT_POLICY =
HELP_ARTICLES_DRAFT_PROVIDER =
HELP_SEARCH_READY =
REASON_CODE_HELP_LINKS_READY =
MOBILE_320_READY =
POLICY_DUPLICATION_FOUND =
STALE_RULE_COPY_FOUND =
COMPETITOR_COPY_FOUND =
```

---

# 18. Final standard

WARIBA Help ne doit pas ressembler à une FAQ marketing.

Il doit permettre à un trader de répondre rapidement :

1. Quelle règle s'applique ?
2. Comment est-elle calculée ?
3. Est-ce un blocage temporaire, un breach, une condition de passage ou une condition payout ?
4. Quelle valeur mon compte utilise maintenant ?
5. Que puis-je encore faire ?
6. Quand l'état peut-il changer ?
7. Où voir la preuve ?
8. Comment demander de l'aide ou contester ?

**Une règle = une vérité = une policy = une explication = une preuve.**
