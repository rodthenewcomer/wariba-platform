---
title: "WARIBA UX Architecture"
version: "1.0"
document_id: "WARIBA-UX-ARCHITECTURE"
status: "BASELINE PRODUIT — PRÊTE POUR DESIGN SYSTEM ET ARCHITECTURE TECHNIQUE"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
market: "Afrique francophone"
owner: "WARIBA Product & UX"
source_of_truth_priority: 4
depends_on:
  - "WARIBA Product Master Document v1.0"
  - "WARIBA Program Rulebook v1.0"
  - "WARIBA Financial Model v1.0"
next_documents:
  - "WARIBA Design System v1.0"
  - "WARIBA Engineering Constitution v1.0"
  - "WARIBA System Architecture v1.0"
---

# WARIBA UX Architecture v1.0

> **Une infrastructure de progression pour traders disciplinés.**

> **Addendum UX Rules v1.1 — 2026-08-03**
> Le site public suit la navigation `Programme`, `WariX`, `Offres`, `Aide` et
> `Support`. Toute représentation des règles utilise l'objectif réalisé de
> 10 %, la DLL 3 % soft lock, le Maximum Loss 10 % EOD trailing et la Best Day
> Rule 50 %. Les anciennes mentions 8/4/8, 40 %, minimum de jours et journées
> qualifiées en Evaluation sont superseded. Les prix sont affichés d'abord en
> FCFA ; l'USD n'est qu'informatif. `WariX` remplace le nom historique du terminal.

## Contrôle du document

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| Marché initial | Afrique francophone |
| Langue principale | Français |
| Support initial | Web responsive + PWA |
| Application native | Non en V1 |
| Produit commercial | WARIBA ONE |
| Progression | WARIBA ONE → WARIBA Performance → WARIBA Review |
| État du projet | Dossier créé, aucun code commencé |
| Statut du document | Baseline UX avant Design System et développement |
| Référence règles | WARIBA Program Rulebook v1.0 |
| Référence économique | WARIBA Financial Model v1.0 |
| Capital réel au lancement | Aucun |
| Environnement initial | Trading simulé |

---

# 1. Objet du document

Ce document définit l’architecture de l’expérience WARIBA avant toute conception visuelle détaillée ou implémentation.

Il répond aux questions suivantes :

1. Qui utilise WARIBA ?
2. Que cherche chaque utilisateur ?
3. Comment l’information est-elle organisée ?
4. Quels écrans doivent exister ?
5. Quel est le parcours exact entre découverte, achat, trading, Performance et payout ?
6. Que voit l’utilisateur dans chaque état du compte ?
7. Comment les règles deviennent-elles compréhensibles ?
8. Comment l’expérience fonctionne-t-elle réellement sur téléphone ?
9. Comment WARIBA explique-t-elle une restriction, un rejet ou un incident ?
10. Comment l’équipe interne opère-t-elle la plateforme sans manipulations dangereuses ?
11. Quels événements doivent être mesurés ?
12. Quels critères déterminent qu’un parcours UX est terminé ?

Ce document ne définit pas encore :

- les valeurs finales de couleurs ;
- les styles visuels finaux ;
- les composants codés ;
- les schémas de base de données ;
- les contrats API ;
- les conditions juridiques définitives.

Ces éléments seront définis dans les documents suivants.

---

# 2. Hiérarchie des sources de vérité UX

Lorsqu’une contradiction apparaît, l’ordre suivant s’applique :

1. règles légales et contractuelles applicables ;
2. policy version attachée au compte ;
3. WARIBA Program Rulebook ;
4. WARIBA Financial Model pour les prix, caps et gates ;
5. WARIBA Product Master Document ;
6. WARIBA UX Architecture ;
7. WARIBA Design System ;
8. spécifications techniques ;
9. maquettes ;
10. prompts d’implémentation ;
11. code de présentation.

Une maquette ne peut jamais inventer une règle.

Un composant ne peut jamais masquer une condition contractuelle.

Un agent de code ne peut jamais modifier le parcours pour simplifier son implémentation sans Decision Log.

---

# 3. Mission UX

La mission UX de WARIBA est :

> Permettre à un trader de comprendre son état, son risque, ses obligations et sa prochaine action sans chercher dans une FAQ ni interpréter des règles ambiguës.

L’expérience doit transformer un programme financier complexe en une progression claire, vérifiable et mobile.

---

# 4. Résultats UX prioritaires

## 4.1 Compréhension en cinq secondes

Sur le Hub, l’utilisateur doit comprendre immédiatement :

- quel compte il consulte ;
- son état ;
- sa progression ;
- son risque restant ;
- la règle nécessitant son attention ;
- sa prochaine action.

## 4.2 Achat sans ambiguïté

Avant de payer, l’utilisateur doit connaître :

- la nature simulée du compte ;
- la taille nominale ;
- le prix en FCFA ;
- les règles essentielles ;
- ce qui est inclus ;
- ce qui n’est pas inclus ;
- l’absence de frais d’activation ;
- la policy version applicable.

## 4.3 Trading sans confusion

Dans WariX, l’utilisateur doit comprendre :

- le symbole ;
- le bid et l’ask ;
- la taille ;
- l’exposition ;
- le risque estimé ;
- l’état du marché ;
- le statut de l’ordre ;
- le résultat de l’exécution.

## 4.4 Règles visibles au moment utile

Une règle doit apparaître :

- avant l’achat ;
- dans la mission du compte ;
- au moment où elle approche d’un seuil ;
- lorsqu’elle bloque une action ;
- lorsqu’elle produit une violation ;
- dans le détail de preuve.

## 4.5 Payout entièrement décomposé

Le trader doit voir :

- le profit net du cycle ;
- le threshold ;
- les journées qualifiées ;
- la consistance ;
- la limite proportionnelle de 50 % ;
- le cap ;
- le split ;
- les frais publiés ;
- le Trader Cash ;
- la raison exacte d’une non-éligibilité.

## 4.6 Décisions contestables

Une violation, une correction ou un rejet doit être explicable et contestable depuis le produit.

---

# 5. Principes UX non négociables

## 5.1 Une seule action principale par état

Chaque écran possède une action primaire claire.

Exemples :

- visiteur : « Voir les offres » ;
- acheteur : « Payer » ;
- nouveau trader : « Ouvrir WariX » ;
- compte soft locked : « Voir la règle » ;
- Performance éligible : « Demander mon payout » ;
- dossier en attente : « Voir le suivi ».

## 5.2 Pas de prochaine action artificielle

WARIBA ne pousse pas l’utilisateur à acheter un nouveau compte lorsqu’une explication, une attente ou un recours est plus pertinent.

## 5.3 Visibilité permanente du risque

Le risque n’est pas caché dans une page secondaire.

La DLL et le Maximum Loss sont visibles :

- dans le Hub ;
- dans la Mission ;
- dans WariX ;
- avant un ordre ;
- dans les alertes ;
- dans le détail du compte.

## 5.4 Le produit explique, il ne juge pas

Éviter :

- « Mauvais trading » ;
- « Comportement dangereux » ;
- « Vous avez échoué » ;
- « Gambling behavior ».

Préférer :

- « Limite quotidienne atteinte » ;
- « Nouveaux ordres temporairement bloqués » ;
- « Limite maximale dépassée » ;
- « Compte terminé selon la règle ML-001 ».

## 5.5 Les calculs ne sont pas décoratifs

Chaque métrique doit pouvoir ouvrir :

- sa définition ;
- sa formule ;
- son seuil ;
- sa source ;
- son historique ;
- sa policy version.

## 5.6 Mobile-first réel

Le mobile doit permettre :

- inscription ;
- achat ;
- consultation des règles ;
- trading ;
- modification SL/TP ;
- clôture ;
- consultation du risque ;
- payout ;
- support ;
- contestation.

Le mobile ne doit pas être une version amputée du produit.

## 5.7 Aucun dark pattern

Interdits :

- faux compte à rebours ;
- faux stock limité ;
- CTA cachant le prix ;
- cases précochées sensibles ;
- frais révélés tardivement ;
- bouton principal ambigu ;
- désabonnement difficile ;
- pression après breach ;
- comparaison trompeuse ;
- faux témoignages ;
- métriques non vérifiées.

## 5.8 Pas de fausse précision

WARIBA n’affiche pas :

- un délai moyen inexistant ;
- une position artificielle dans une file ;
- un taux de réussite sans données suffisantes ;
- une estimation de payout présentée comme garantie.

## 5.9 Les erreurs sont récupérables

Chaque erreur doit préciser :

- ce qui s’est passé ;
- ce qui n’a pas été effectué ;
- si une nouvelle tentative est sûre ;
- l’action suivante ;
- un identifiant de corrélation si nécessaire.

## 5.10 La confiance prime sur la dopamine

Les moments de réussite peuvent être célébrés, mais jamais au détriment de la clarté.

---

# 6. Utilisateurs et Jobs-to-be-Done

# 6.1 Débutant discipliné

## Situation

Il comprend les bases du trading mais manque de capital, de méthode ou de structure.

## Besoins

- comprendre les règles sans jargon ;
- savoir combien il peut perdre ;
- visualiser la progression ;
- éviter une erreur irréversible ;
- utiliser le produit sur téléphone ;
- payer localement.

## Risques UX

- confondre compte nominal et argent réel ;
- confondre balance et equity ;
- ignorer le PnL latent dans les limites ;
- croire que target atteint signifie passage immédiat ;
- interpréter WARIBA Guardian comme un signal.

## Jobs-to-be-Done

> Lorsque je démarre une évaluation, je veux comprendre exactement ce qui est attendu afin de ne pas perdre mon compte à cause d’une règle mal comprise.

---

# 6.2 Trader intermédiaire

## Situation

Il possède une stratégie mais manque de régularité dans la gestion du risque.

## Besoins

- accès rapide à Trade ;
- métriques détaillées ;
- alertes non intrusives ;
- historique ;
- calcul de consistance ;
- explication des journées qualifiées ;
- suivi des cycles.

## Risques UX

- percevoir les alertes comme paternalistes ;
- surcharger le terminal ;
- masquer les données derrière des cartes marketing ;
- imposer trop de clics.

## Jobs-to-be-Done

> Lorsque je trade, je veux voir mon risque et mes règles en temps réel sans quitter le terminal.

---

# 6.3 Trader confirmé sous-capitalisé

## Situation

Il recherche une plateforme crédible, stable et prévisible.

## Besoins

- exécution transparente ;
- preuve des fills ;
- version des règles ;
- historique complet ;
- payout précis ;
- support compétent ;
- procédure de contestation ;
- absence de conditions cachées.

## Risques UX

- langage trop simplifié ;
- manque de données techniques ;
- délais vagues ;
- faux indicateurs premium ;
- absence de logs d’exécution.

## Jobs-to-be-Done

> Lorsque WARIBA prend une décision qui affecte mon compte ou mon payout, je veux pouvoir vérifier les faits et la règle appliquée.

---

# 6.4 Utilisateur Support

## Besoins

- vue chronologique ;
- profil et comptes ;
- policy version ;
- tickets ;
- articles applicables ;
- événements pertinents ;
- réponses cohérentes ;
- escalade.

## Limitations

Il ne peut pas :

- modifier une balance ;
- annuler une violation ;
- approuver un payout ;
- modifier une policy ;
- bannir un utilisateur.

---

# 6.5 Utilisateur Risk

## Besoins

- métriques de compte ;
- violations ;
- replay ;
- incidents ;
- signaux d’intégrité ;
- justification des décisions ;
- alertes de marché.

## Limitations

Il ne peut pas effectuer seul un paiement.

---

# 6.6 Utilisateur Finance

## Besoins

- payout queue ;
- montants ;
- devise ;
- rail ;
- statut PSP ;
- réserve ;
- couverture ;
- double approbation ;
- réconciliation.

## Limitations

Il ne peut pas modifier le résultat des règles de trading.

---

# 6.7 Administrateur technique

## Besoins

- statut des services ;
- feature flags ;
- incidents ;
- logs ;
- kill switches ;
- déploiements ;
- accès temporaires audités.

## Limitations

Aucun accès libre aux actions financières sans rôle spécifique.

---

# 7. Architecture globale de l’expérience

WARIBA possède trois espaces cohérents mais distincts.

```text
WARIBA PUBLIC
    ↓
WARIBA PLATFORM
    ↓
WARIBA CONTROL
```

## 7.1 WARIBA Public

Objectifs :

- informer ;
- expliquer ;
- rassurer ;
- convertir ;
- donner accès aux règles publiques ;
- montrer le statut des systèmes.

## 7.2 WARIBA Platform

Objectifs :

- gérer le compte ;
- trader ;
- suivre la mission ;
- gérer Performance et payout ;
- obtenir de l’aide ;
- gérer le profil.

## 7.3 WARIBA Control

Objectifs :

- opérer ;
- vérifier ;
- expliquer ;
- approuver selon les permissions ;
- auditer ;
- gérer les incidents.

WARIBA Control n’est jamais accessible depuis la navigation trader.

---

# 8. Sitemap public

```text
/
├── accueil
├── offres
│   ├── wariba-one-5k
│   ├── wariba-one-10k
│   ├── wariba-one-25k [feature flag actif en sandbox]
│   ├── wariba-one-50k [feature flag actif en sandbox]
│   └── wariba-one-100k [feature flag actif en sandbox]
├── fonctionnement
├── règles
│   ├── evaluation
│   ├── performance
│   ├── payout
│   ├── instruments
│   └── versions
├── plateforme
│   ├── hub
│   ├── trade
│   ├── guardian
│   └── payout
├── confiance
│   ├── statut
│   ├── incidents
│   ├── changelog
│   └── transparence
├── aide
│   ├── centre-aide
│   ├── article
│   └── contact
├── connexion
├── inscription
├── checkout
├── paiement
│   ├── en-attente
│   ├── réussi
│   └── échoué
├── légal
│   ├── conditions
│   ├── confidentialité
│   ├── cookies
│   └── risques
└── status
```

---

# 9. Sitemap authentifié — trader

```text
/app
├── hub
├── comptes
│   ├── liste
│   └── [account-id]
│       ├── aperçu
│       ├── mission
│       ├── risque
│       ├── historique
│       ├── règles
│       └── documents
├── trade
│   └── [account-id]
├── performance
│   ├── cycle
│   ├── journées
│   ├── consistance
│   └── payout
├── payouts
│   ├── éligibilité
│   ├── nouvelle-demande
│   ├── suivi
│   └── reçus
├── support
│   ├── aide
│   ├── assist
│   ├── tickets
│   └── contestations
├── notifications
├── profil
│   ├── identité
│   ├── sécurité
│   ├── appareils
│   ├── paiements
│   ├── préférences
│   └── documents
└── paramètres
```

---

# 10. Sitemap WARIBA Control

```text
/control
├── overview
├── users
│   └── [user-id]
├── accounts
│   └── [account-id]
│       ├── overview
│       ├── orders
│       ├── positions
│       ├── risk
│       ├── violations
│       ├── timeline
│       └── policy
├── payouts
│   ├── queue
│   ├── review
│   ├── approved
│   ├── processing
│   ├── paid
│   └── failed
├── payments
├── support
├── disputes
├── integrity
├── incidents
├── market-operations
├── treasury
├── analytics
├── policies
├── feature-flags
├── team
├── audit
└── settings
```

Les sections visibles dépendent du rôle.

---

# 11. Navigation publique

## 11.1 Navigation desktop

Maximum recommandé :

- Offres ;
- Fonctionnement ;
- Règles ;
- Plateforme ;
- Confiance ;
- Aide ;
- Connexion ;
- CTA « Commencer ».

## 11.2 Navigation mobile

Menu simple :

- Offres ;
- Fonctionnement ;
- Règles ;
- Plateforme ;
- Confiance ;
- Aide ;
- Connexion ;
- Commencer.

Le CTA d’achat ne doit pas masquer les règles.

## 11.3 Header comportemental

- position sticky possible ;
- hauteur stable ;
- aucun changement brutal au scroll ;
- état connecté différent ;
- status incident visible lorsque nécessaire ;
- aucun bandeau promotionnel permanent.

---

# 12. Navigation authentifiée

## 12.1 Desktop

Navigation principale recommandée :

- Hub ;
- Trade ;
- Comptes ;
- Payouts ;
- Aide.

Navigation secondaire :

- Notifications ;
- Profil ;
- Paramètres.

## 12.2 Mobile

Navigation inférieure recommandée :

- Hub ;
- Trade ;
- Comptes ;
- Payouts ;
- Plus.

Le menu « Plus » contient :

- Aide ;
- Notifications ;
- Profil ;
- Paramètres.

## 12.3 Compte actif

Un sélecteur de compte persistant doit afficher :

- type ;
- taille nominale ;
- identifiant court ;
- état ;
- badge Evaluation ou Performance.

Le changement de compte doit être explicite.

WARIBA ne doit jamais exécuter un ordre sur un compte différent de celui visible.

## 12.4 Confirmation de contexte

Avant une action sensible :

- le compte actif est répété ;
- la taille nominale est visible ;
- le symbole est visible ;
- l’état du compte est vérifié.

---

# 13. Modèle mental principal : la Mission

Chaque compte possède une Mission.

La Mission répond à :

- où suis-je ?
- qu’ai-je accompli ?
- que me reste-t-il ?
- quelle règle bloque ma progression ?
- quelle est ma prochaine action ?

## 13.1 Mission WARIBA ONE

Sections :

1. objectif de profit ;
2. journées de trading ;
3. journées qualifiées ;
4. consistance ;
5. Daily Loss ;
6. Maximum Loss ;
7. état du compte ;
8. policy version.

## 13.2 Mission WARIBA Performance

Sections :

1. cycle courant ;
2. threshold ;
3. journées qualifiées ;
4. consistance ;
5. profit net du cycle ;
6. Payout Base estimé ;
7. cap ;
8. split ;
9. checklist d’éligibilité ;
10. prochain payout ;
11. progression vers Review.

## 13.3 Principes

- ne pas réduire la Mission à une seule barre de progression ;
- distinguer « atteint » de « validé » ;
- distinguer « profitable » de « qualifié » ;
- distinguer « payout estimé » de « payout approuvé » ;
- afficher la formule en détail.

---

# 14. Inventaire des expériences V1

## 14.1 Critiques — Tier 1

Obligatoires avant bêta privée :

1. Homepage minimale ;
2. Offre et règles ;
3. Inscription ;
4. Checkout sandbox ;
5. Paiement sandbox ;
6. Activation ;
7. Hub ;
8. Liste des comptes ;
9. Mission WARIBA ONE ;
10. WariX ;
11. Soft lock ;
12. Hard breach ;
13. Passage Evaluation → Performance ;
14. Mission Performance ;
15. Payout eligibility ;
16. Demande de payout ;
17. Suivi payout ;
18. WARIBA Control payout review ;
19. Support ;
20. Contestation ;
21. Profil et sécurité ;
22. Notifications critiques.

## 14.2 Importantes — Tier 2

Avant lancement public :

- Trust Center ;
- status page ;
- incident history ;
- KYC complet ;
- paiement réel ;
- payout réel ;
- reçus ;
- devices ;
- policy changelog ;
- règles instrument ;
- centre d’aide complet ;
- analytics UX.

## 14.3 Différées — Tier 3

- Academy complète ;
- leaderboard ;
- community ;
- affiliation ;
- app native ;
- Live allocation ;
- copy trading ;
- API publique ;
- social features.

---

# 15. Parcours 1 — Découverte et compréhension

## 15.1 Déclencheur

L’utilisateur arrive depuis :

- recherche ;
- réseau social ;
- influenceur futur ;
- recommandation ;
- lien direct.

## 15.2 Objectifs de la homepage

En moins de 30 secondes, il doit comprendre :

- ce qu’est WARIBA ;
- que le trading est simulé ;
- que WARIBA ONE a une seule phase ;
- que les règles sont transparentes ;
- que le paiement est local ;
- que le produit fonctionne sur mobile et ordinateur ;
- que cinq payouts conduisent à Review, pas automatiquement au Live.

## 15.3 Structure fonctionnelle de homepage

1. proposition de valeur ;
2. preuve produit ;
3. fonctionnement en trois étapes ;
4. règles essentielles ;
5. aperçu Hub ;
6. aperçu Trade ;
7. aperçu Performance/Payout ;
8. prix ;
9. système de confiance ;
10. FAQ ;
11. CTA final.

## 15.4 Preuves autorisées avant lancement

- captures explicitement marquées prototype ;
- règles ;
- formules ;
- engagement de transparence ;
- statut de bêta ;
- fonctionnalités réellement disponibles.

## 15.5 Preuves interdites

- faux payout ;
- faux nombre de traders ;
- faux témoignages ;
- faux partenaire ;
- faux délai ;
- faux compte Live.

---

# 16. Parcours 2 — Choix de l’offre

## 16.1 Objectif

Comparer 5K, 10K, 25K, 50K et 100K sans confusion, avec une indication explicite de la nature sandbox et du statut candidat des prix.

## 16.2 Informations obligatoires sur chaque offre

- taille nominale simulée ;
- prix FCFA ;
- target ;
- DLL ;
- Maximum Loss ;
- consistance ;
- jours minimums ;
- journées qualifiées ;
- instruments ;
- levier ;
- overnight ;
- weekend ;
- absence de frais d’activation ;
- policy version ;
- nature simulée.

## 16.3 Offre principale

Le 10K peut être mis en avant comme « offre principale », sans :

- faux badge « le plus vendu » ;
- fausse économie ;
- pression artificielle.

## 16.4 Disponibilité des tailles

En bêta sandbox, les cinq tailles sont achetables via le PSP sandbox et activent un compte Evaluation simulé. Chaque carte expose son prix candidat, son nominal simulé et le même niveau de transparence sur les règles.

Lorsqu’un feature flag est désactivé pour incident ou gate de réserve :

- ne pas afficher la taille comme achetable ;
- conserver une explication honnête de l’indisponibilité ;
- ne proposer une liste d’intérêt que si elle existe réellement ;
- ne faire aucune promesse de date.

---

# 17. Parcours 3 — Inscription

## 17.1 Étapes minimales

1. email ;
2. mot de passe ou méthode d’authentification ;
3. prénom et nom ;
4. pays ;
5. acceptation des conditions versionnées ;
6. vérification email selon configuration.

## 17.2 Principes

- limiter les champs ;
- éviter KYC complet avant achat ;
- expliquer pourquoi une donnée est demandée ;
- permettre correction ;
- montrer la progression ;
- préserver le formulaire après erreur.

## 17.3 Erreurs

Exemples :

- email déjà utilisé ;
- mot de passe insuffisant ;
- session expirée ;
- lien déjà consommé ;
- réseau interrompu.

Chaque message propose une action.

---

# 18. Parcours 4 — Checkout et paiement

## 18.1 Résumé de commande

Avant paiement :

- WARIBA ONE ;
- taille ;
- prix total ;
- devise ;
- frais ;
- taxes si applicables ;
- nature simulée ;
- absence de frais d’activation ;
- policy version ;
- conditions essentielles ;
- méthode de paiement.

## 18.2 Méthodes

V1 sandbox :

- Mobile Money sandbox ;
- carte sandbox ;
- paiement test.

Les rails réels seront intégrés après décision PSP.

## 18.3 États de paiement

```text
created
→ pending_payment
→ paid
→ fulfilled
```

Alternatives :

```text
payment_failed
cancelled
refunded
```

## 18.4 Paiement en attente

L’écran doit afficher :

- référence ;
- montant ;
- méthode ;
- instruction ;
- statut ;
- bouton de vérification non destructif ;
- délai non garanti ;
- support.

## 18.5 Paiement réussi

Ne pas créer une fausse réussite avant webhook serveur.

Après confirmation :

- reçu ;
- activation ;
- prochaine action ;
- bouton « Voir mon compte ».

## 18.6 Paiement échoué

Afficher :

- échec ou annulation ;
- absence de débit si vérifiable ;
- possibilité de réessayer ;
- ne pas créer une nouvelle commande invisible ;
- support avec référence.

## 18.7 Double clic

Le bouton passe immédiatement en état de traitement.

Une seconde demande n’engendre ni double commande ni double paiement.

---

# 19. Parcours 5 — Activation et premier accès

## 19.1 Écran de bienvenue

Contenu :

- compte créé ;
- taille ;
- programme ;
- policy version ;
- trois règles critiques ;
- journée UTC ;
- nature simulée ;
- bouton « Comprendre ma mission » ;
- bouton « Ouvrir Trade ».

## 19.2 Onboarding contextuel

Maximum recommandé : cinq étapes courtes.

1. Mission ;
2. risque ;
3. consistance ;
4. ordre ;
5. support.

Onboarding :

- skippable ;
- consultable plus tard ;
- non bloquant après acceptation des règles ;
- sans illustrations inutiles.

## 19.3 Premier trade

Avant le premier ordre, confirmation ciblée :

- compte ;
- symbole ;
- taille ;
- SL/TP ;
- marge ;
- impact estimé ;
- rappel du PnL latent.

Pas de modal pédagogique à chaque ordre.

---

# 20. WARIBA Hub

## 20.1 Objectif

Transformer l’état du compte en décisions compréhensibles.

## 20.2 Hiérarchie desktop

### Zone 1 — État

- nom du compte ;
- taille ;
- Evaluation ou Performance ;
- état ;
- balance ;
- equity ;
- PnL du jour.

### Zone 2 — Mission

- progression principale ;
- conditions ;
- blocage éventuel ;
- prochaine action.

### Zone 3 — Risque

- DLL utilisée/restante ;
- Maximum Loss utilisée/restante ;
- heure du reset ;
- avertissements.

### Zone 4 — Activité

- trades récents ;
- journées ;
- notifications ;
- tickets/payouts.

### Zone 5 — Actions

- ouvrir Trade ;
- voir Mission ;
- voir règles ;
- contacter support.

## 20.3 Hiérarchie mobile

Ordre recommandé :

1. compte et état ;
2. prochaine action ;
3. Mission ;
4. Risk Ribbon ;
5. actions rapides ;
6. activité récente ;
7. aide.

## 20.4 État compréhensible en cinq secondes

La première vue doit afficher :

- `Actif`, `Soft lock`, `Terminé`, `Passage en attente`, `Performance`, `Payout en revue` ;
- raison ;
- action.

## 20.5 Multi-comptes

Lorsque plusieurs évaluations existent :

- une carte par compte ;
- tri par attention requise ;
- jamais fusionner les métriques ;
- compte actif clairement indiqué.

---

# 21. Mission WARIBA ONE

## 21.1 Objectif de profit

Afficher :

- profit réalisé ;
- objectif ;
- montant restant ;
- statut ;
- différence entre balance et equity.

États :

- en cours ;
- atteint mais conditions restantes ;
- validé.

## 21.2 Jours de trading

Afficher :

- jours finalisés ;
- minimum ;
- calendrier ou liste ;
- PnL net ;
- statut qualifié/non qualifié.

## 21.3 Journées qualifiées

Étiquette claire :

- « Journée profitable » ;
- « Journée qualifiée » ;
- seuil du compte.

## 21.4 Consistance

Afficher :

- meilleure journée ;
- profit total ;
- ratio ;
- limite 40 % ;
- profit total requis pour conformité lorsque calculable.

Ne jamais afficher « violation » pour une consistance supérieure à 40 %.

## 21.5 Risque

Afficher :

- DLL de la journée ;
- Maximum Loss statique ;
- equity actuelle ;
- plancher ;
- formule ;
- reset.

## 21.6 Passage en attente

Exemple :

```text
Objectif atteint
Il reste :
• 2 journées de trading
• 1 journée qualifiée
• ramener la consistance de 47 % à 40 % ou moins
```

---

# 22. WariX — architecture UX

## 22.1 Objectif

Permettre l’exécution sans séparer le trading de la compréhension du risque.

## 22.2 Layout desktop

```text
┌──────────────────────────────────────────────────────────┐
│ Account Context | Risk Ribbon | Market Status            │
├─────────────┬────────────────────────────┬───────────────┤
│ Watchlist   │ Chart                      │ Order Ticket  │
│             │                            │ Guardian      │
├─────────────┴────────────────────────────┴───────────────┤
│ Positions | Orders | History | Journal                  │
└──────────────────────────────────────────────────────────┘
```

## 22.3 Layout mobile

```text
Header account + status
Risk Ribbon
Symbol selector
Chart
Trade action bar
Bottom sheet Order Ticket
Tabs: Positions / Orders / History
```

## 22.4 Priorités mobile

- chart lisible ;
- prix visibles ;
- ticket accessible ;
- aucune donnée critique sous un hover ;
- boutons tactiles ;
- confirmation d’ordre concise ;
- positions clôturables rapidement ;
- Close All protégé contre l’erreur.

## 22.5 Watchlist

Pour chaque symbole :

- symbole ;
- bid ;
- ask ;
- variation facultative ;
- statut marché ;
- spread ;
- restriction éventuelle.

Pas d’indicateurs décoratifs non fiables.

## 22.6 Graphique

Fonctions V1 :

- chandeliers ;
- sélection timeframe ;
- crosshair ;
- zoom ;
- pan ;
- lignes position ;
- lignes SL/TP ;
- prix bid/ask ;
- historique d’exécution ;
- thème adapté.

Indicateurs différés ou limités.

**Prompt 7 Appendice 07-C (UX-TRADING-001 à 008, DECISION_LOG.md §13/§26) —**
les lignes position et SL/TP ci-dessus sont désormais interactives, pas
seulement affichées : badge de position avec PnL live et état de
synchronisation, chips d’activation SL/TP, poignées glissables avec aperçu
local visuellement distinct de la valeur confirmée serveur, alternative
clavier (flèches haut/bas) et saisie de prix exact pour chaque interaction
de glissement, menu contextuel clic droit (desktop) / appui long (mobile)
limité aux actions réellement implémentées (Achat/Vente au marché, SL/TP,
clôture partielle, fermeture — aucun ordre en attente Limit/Stop ni alerte
de prix, absents de ce build), et clôture partielle 25/50/75/personnalisé.
Le graphique reste `lightweight-charts` ; ces contrôles sont une surcouche
HTML positionnée par `series.priceToCoordinate`, pas une nouvelle librairie.

## 22.7 Order Ticket

Champs :

- compte ;
- symbole ;
- direction ;
- type Market ;
- taille ;
- Stop Loss ;
- Take Profit ;
- marge estimée ;
- risque estimé si SL ;
- spread ;
- prix indicatif ;
- statut marché.

## 22.8 Guardian

Guardian est déterministe.

Il affiche :

- impact potentiel ;
- marge ;
- exposition ;
- DLL restante ;
- Maximum Loss restante ;
- concentration informative ;
- prix périmé ;
- restriction news/weekend.

Il ne dit pas :

- « Achetez » ;
- « Vendez » ;
- « Setup fort » ;
- « Probabilité de gain ».

## 22.9 Soumission d’ordre

États visibles :

```text
Préparation
→ Envoi
→ Reçu
→ Validé
→ Accepté
→ Exécuté
```

Alternatives :

```text
Rejeté
Annulé
Partiellement exécuté
```

## 22.10 Rejet d’ordre

Le message doit contenir :

- raison claire ;
- code ;
- règle ;
- action possible ;
- aucune perte ambiguë.

Exemple :

```text
Ordre non envoyé
Votre compte est en limite quotidienne jusqu’au prochain reset à 00:00 UTC.
Vous pouvez réduire ou fermer une position existante.
Code : RISK-DLL-LOCK
```

## 22.11 Close All

- action visible ;
- confirmation affichant nombre de positions ;
- option de confirmation renforcée sur mobile ;
- désactivation après déclenchement ;
- résultat détaillé.

---

# 23. Risk Ribbon

## 23.1 Objectif

Donner une lecture permanente du risque sans dominer l’écran.

## 23.2 Contenu minimal

- état ;
- DLL restante ;
- Maximum Loss restante ;
- prochaine réinitialisation ;
- alerte news/weekend ;
- qualité de connexion temps réel.

## 23.3 Niveaux

- normal ;
- attention ;
- proche limite ;
- soft lock ;
- hard breach ;
- données indisponibles.

## 23.4 Interactions

Un clic ouvre le détail des règles et des calculs.

---

# 24. Soft lock

## 24.1 Déclenchement UX

Le produit affiche immédiatement :

- « Limite quotidienne atteinte » ;
- valeur observée ;
- seuil ;
- heure ;
- reset ;
- actions autorisées ;
- lien vers preuve.

## 24.2 Actions autorisées

Selon policy :

- réduire ;
- clôturer ;
- consulter ;
- ouvrir support.

## 24.3 Actions bloquées

- nouvel ordre augmentant l’exposition ;
- augmentation de position.

## 24.4 Ton

Le soft lock est présenté comme une protection temporaire, pas comme un échec.

---

# 25. Hard breach

## 25.1 Écran terminal

Afficher :

- compte terminé ;
- règle ;
- seuil ;
- equity observée ;
- date/heure ;
- clôtures réalisées ;
- preuve ;
- contestation.

## 25.2 Hub

Le compte reste consultable en lecture seule.

## 25.3 Actions

- voir chronologie ;
- télécharger/consulter le détail ;
- ouvrir contestation ;
- consulter les options commerciales disponibles uniquement après l’explication.

Aucun CTA agressif « Racheter maintenant » au-dessus de la preuve.

---

# 26. Passage WARIBA ONE → Performance

## 26.1 États

```text
Objectif atteint
→ Conditions vérifiées
→ Passage confirmé
→ Performance créée
```

## 26.2 Écran de réussite

Afficher :

- conditions validées ;
- résumé de l’évaluation ;
- nouvelle étape ;
- règles Performance différentes ;
- balance Performance réinitialisée ;
- profits Evaluation non transférés ;
- cycle #1 ;
- bouton « Découvrir Performance ».

## 26.3 Célébration

Autorisé :

- motion discrète ;
- certificat futur ;
- partage contrôlé.

Interdit :

- promesse Live ;
- faux classement ;
- message « funded with real money ».

---

# 27. Mission WARIBA Performance

## 27.1 Structure

1. cycle # ;
2. threshold ;
3. profit net réalisé ;
4. journées qualifiées ;
5. consistance ;
6. DLL ;
7. Maximum Loss ;
8. payout estimé ;
9. checklist ;
10. progression Review.

## 27.2 Payout estimé

Étiquette obligatoire :

> Estimation selon les données actuelles. Le montant final est figé à la demande et vérifié avant paiement.

## 27.3 Consistance de cycle

Le calcul ne doit jamais mélanger des journées d’un ancien cycle.

## 27.4 Progression vers Review

Afficher :

- payouts payés ;
- cycle courant ;
- prochaine étape ;
- absence de garantie Live.

---

# 28. Payout Center

## 28.1 Écran d’éligibilité

Checklist :

- threshold ;
- cinq journées qualifiées ;
- consistance ;
- positions fermées ;
- ordres fermés ;
- soft lock ;
- KYC ;
- moyen de paiement ;
- contestation ;
- revue intégrité.

Chaque item possède :

- statut ;
- détail ;
- action.

## 28.2 Breakdown

Afficher dans cet ordre :

1. profit net du cycle ;
2. limite 50 % ;
3. cap applicable ;
4. Payout Base ;
5. split ;
6. Trader Cash ;
7. frais ;
8. conversion ;
9. montant local.

## 28.3 Confirmation

Avant soumission :

- compte ;
- cycle ;
- montant ;
- rail ;
- devise ;
- taux ;
- frais ;
- effet sur balance ;
- gel du compte ;
- déclaration de véracité.

## 28.4 Compte gelé

Après demande :

- trading indisponible ;
- raison ;
- état de la revue ;
- possibilité d’annuler seulement si policy l’autorise ;
- aucune nouvelle demande.

## 28.5 Suivi

États utilisateur :

- demande reçue ;
- contrôles automatiques ;
- revue humaine ;
- approuvée ;
- paiement en cours ;
- payée ;
- action requise ;
- rejetée avec motif ;
- échouée ;
- retournée.

## 28.6 Rejet

Le détail doit afficher :

- règle ;
- faits ;
- code ;
- opérateur/équipe responsable ;
- date ;
- recours.

---

# 29. WARIBA Review

## 29.1 Déclenchement

Après payout #5 payé.

## 29.2 Écran trader

Afficher :

- historique des cinq payouts ;
- statistiques de progression ;
- état « Review » ;
- critères publics disponibles ;
- absence de garantie Live ;
- prochaine mise à jour ;
- support.

## 29.3 Résultats

- prochaine étape disponible ;
- observation ;
- maintien Performance ;
- offre future ;
- clôture motivée.

Chaque résultat doit être explicable.

---

# 30. Support et WARIBA Assist

## 30.1 Centre d’aide

Architecture initiale :

- Commencer ;
- WARIBA ONE ;
- Risque ;
- Trading ;
- Performance ;
- Payouts ;
- Paiements ;
- Compte et sécurité ;
- Incidents ;
- Contestations.

## 30.2 Article

Chaque article contient :

- titre orienté question ;
- réponse synthétique ;
- détail ;
- exemple ;
- policy version ;
- date de mise à jour ;
- articles liés ;
- contact.

## 30.3 WARIBA Assist

Entrées rapides :

- « Explique ma consistance » ;
- « Pourquoi mon ordre a été rejeté ? » ;
- « Suis-je éligible au payout ? » ;
- « Quand mon compte se débloque-t-il ? » ;
- « Créer un ticket ».

## 30.4 Réponses Assist

Une réponse liée au compte doit distinguer :

- donnée actuelle ;
- règle ;
- interprétation ;
- action.

## 30.5 Escalade

Assist propose l’escalade lorsque :

- décision financière ;
- contestation ;
- incident technique ;
- identité ;
- fraude ;
- données incohérentes ;
- confiance faible.

## 30.6 Aucun conseil de trading

Assist ne propose jamais :

- direction ;
- signal ;
- lot ;
- entrée ;
- sortie ;
- stratégie personnalisée.

---

# 31. Tickets et contestations

## 31.1 Ticket standard

Champs :

- sujet ;
- catégorie ;
- compte ;
- description ;
- pièce jointe ;
- urgence réelle.

## 31.2 Contestation

Catégories :

- violation ;
- payout ;
- paiement ;
- correction ;
- trade ;
- identité.

## 31.3 Timeline

Afficher :

- soumission ;
- accusé ;
- enquête ;
- action requise ;
- décision ;
- clôture.

## 31.4 Preuve

Le trader voit les éléments partageables sans exposer les mécanismes de sécurité sensibles.

## 31.5 SLA

N’afficher un délai que lorsque :

- défini ;
- mesuré ;
- réaliste.

---

# 32. Notifications

## 32.1 Canaux V1

- in-app ;
- email.

SMS, WhatsApp et push natif restent dépendants des intégrations futures.

## 32.2 Priorités

### Critique

- hard breach ;
- sécurité ;
- payout payé/échoué ;
- paiement anormal ;
- incident affectant un compte.

### Importante

- soft lock ;
- passage ;
- payout éligible ;
- action KYC ;
- weekend cutoff ;
- réponse support.

### Information

- journée qualifiée ;
- changement d’article ;
- récapitulatif.

## 32.3 Préférences

Les notifications critiques ne peuvent pas être entièrement désactivées.

## 32.4 Centre de notifications

Chaque notification :

- possède un type ;
- un compte ;
- une date ;
- un état lu/non lu ;
- une action ;
- un lien profond.

---

# 33. Profil, identité et sécurité

## 33.1 Profil

- nom ;
- pays ;
- langue ;
- fuseau d’affichage ;
- coordonnées.

## 33.2 Sécurité

- mot de passe ;
- MFA futur/administrateur obligatoire ;
- sessions ;
- appareils ;
- activité ;
- déconnexion globale.

## 33.3 KYC

États :

- non requis ;
- à commencer ;
- en cours ;
- action requise ;
- vérifié ;
- rejeté avec motif ;
- expiré.

## 33.4 Documents

- upload sécurisé ;
- progression ;
- statut ;
- suppression selon policy ;
- confidentialité.

Aucune biométrie maison.

---

# 34. Trust Center

## 34.1 Objectif

Donner des preuves sans marketing trompeur.

## 34.2 Sections

- statut systèmes ;
- incidents ;
- règles et versions ;
- changelog ;
- méthodes de calcul ;
- transparence payouts ;
- sécurité ;
- support ;
- nature simulée.

## 34.3 Statistiques

Afficher uniquement après volume suffisant :

- nombre de payouts payés ;
- montant agrégé ;
- délai médian ;
- taux de dossiers nécessitant action.

Chaque statistique indique :

- période ;
- population ;
- date de mise à jour ;
- méthode.

---

# 35. WARIBA Control — principes UX

## 35.1 Productivité sans pouvoir excessif

Control doit rendre les procédures rapides sans offrir un bouton universel.

## 35.2 Vue utilisateur

- identité ;
- sécurité ;
- paiements ;
- comptes ;
- tickets ;
- signaux ;
- timeline.

## 35.3 Vue compte

- état ;
- policy ;
- balance/equity ;
- ordres ;
- fills ;
- positions ;
- règles ;
- snapshots ;
- violations ;
- corrections ;
- disputes.

## 35.4 Timeline unifiée

Chaque événement indique :

- date ;
- source ;
- acteur ;
- type ;
- conséquence ;
- correlation ID.

## 35.5 Payout Queue

Colonnes :

- demande ;
- trader ;
- compte ;
- cycle ;
- Payout Base ;
- Trader Cash ;
- rail ;
- contrôles ;
- âge ;
- statut ;
- owner.

## 35.6 Revue payout

Panneaux :

1. résumé ;
2. calcul ;
3. éligibilité ;
4. identité ;
5. intégrité ;
6. incidents ;
7. historique ;
8. décision.

## 35.7 Décision

Actions :

- approuver ;
- demander une information ;
- escalader ;
- rejeter avec motif ;
- suspendre pour incident.

Pas de « rejet » sans code et commentaire structuré.

## 35.8 Double approbation

Lorsque seuil défini :

- premier approbateur ;
- second approbateur ;
- responsabilités séparées ;
- audit.

## 35.9 Rôles

### Support

Lecture et tickets.

### Risk

Règles, violations, replay.

### Finance

Payouts, rails, réconciliation.

### Fraud/Integrity

Signaux, dossiers, recommandations.

### Technical

Incidents et services.

### Admin

Gestion des rôles, sans accès implicite aux fonds.

---

# 36. Treasury UX dans Control

## 36.1 Vue principale

- réserve disponible ;
- payouts attendus 30 jours ;
- couverture ;
- statut ;
- tendance ;
- ventes ;
- caps ;
- gates indépendants des cinq tailles ;

## 36.2 Alertes

- ≥ 2,0x : normal ;
- 1,5x à < 2,0x : prudence ;
- 1,2x à < 1,5x : défensif ;
- < 1,2x : critique.

## 36.3 Actions

Une alerte de réserve doit guider vers :

- suspendre les nouvelles ventes des tailles à plus forte exposition ;
- arrêter une promotion ;
- limiter nouvelles ventes ;
- alimenter réserve.

Elle ne permet pas de modifier un payout gagné.

---

# 37. États globaux de l’interface

Chaque écran important doit avoir au moins :

1. loading ;
2. loaded ;
3. empty ;
4. partial data ;
5. stale data ;
6. offline ;
7. unauthorized ;
8. forbidden ;
9. error recoverable ;
10. error non-recoverable ;
11. maintenance ;
12. incident mode.

---

# 38. Loading

## 38.1 Principes

- skeleton stable ;
- éviter layout shift ;
- ne pas masquer les labels ;
- pas de spinner infini sans explication ;
- timeout visible pour action sensible.

## 38.2 Trading

Ne jamais afficher un ancien prix comme prix actuel sans indicateur stale.

---

# 39. Empty states

Un empty state doit :

- expliquer pourquoi ;
- proposer une action ;
- ne pas simuler des données.

Exemples :

- aucun compte ;
- aucun trade ;
- aucun payout ;
- aucun ticket ;
- aucune notification.

---

# 40. Offline et reconnexion

## 40.1 Détection

Afficher clairement :

- hors ligne ;
- reconnexion ;
- connecté ;
- données resynchronisées.

## 40.2 Ordres

Lorsque la confirmation serveur manque :

- statut « confirmation en cours » ;
- ne pas supposer rejet ou exécution ;
- empêcher une répétition non idempotente ;
- récupérer l’état serveur.

## 40.3 PWA

Le shell peut rester accessible hors ligne.

Le trading, le paiement et le payout nécessitent la connexion.

---

# 41. Stale data

Lorsque le prix ou une métrique temps réel est périmé :

- marquer la donnée ;
- désactiver les actions concernées ;
- afficher la dernière mise à jour ;
- ne pas remplacer par zéro ;
- ne pas cacher l’incident.

---

# 42. Erreurs et codes

## 42.1 Structure UX

```text
Titre
Résumé
Ce qui n’a pas été fait
Action
Référence
```

## 42.2 Exemples

### Paiement

```text
Paiement non confirmé
Votre compte n’a pas été créé.
Vérifiez le statut ou réessayez sans créer une nouvelle commande.
Référence : PAY-...
```

### Ordre

```text
Ordre rejeté
Le prix disponible est trop ancien pour une exécution fiable.
Actualisez les données et réessayez.
Code : MARKET-STALE
```

### Payout

```text
Demande non disponible
Une position est encore ouverte sur XAUUSD.
Fermez toutes les positions avant de demander un payout.
```

---

# 43. Terminologie officielle

| Terme interne | Terme utilisateur français |
|---|---|
| Evaluation | Évaluation |
| Performance Account | Compte Performance |
| Profit Target | Objectif de profit |
| Daily Loss Limit | Limite de perte quotidienne |
| Maximum Loss | Perte maximale |
| Static Drawdown | Limite statique |
| Consistency | Consistance |
| Qualified Day | Journée qualifiée |
| Soft Lock | Blocage temporaire |
| Hard Breach | Limite maximale dépassée |
| Payout Base | Base de payout |
| Trader Cash | Montant versé au trader |
| Policy Version | Version des règles |
| Review | Revue WARIBA |
| Fill | Exécution |
| Pending Order | Ordre en attente |
| Equity | Equity, avec explication |
| Balance | Solde |
| Unrealized PnL | PnL latent |
| Realized PnL | PnL réalisé |

## 43.1 Termes à éviter

- funded automatiquement ;
- argent donné ;
- capital garanti ;
- compte réel sans preuve ;
- pari ;
- jackpot ;
- gagner facilement ;
- challenge impossible à perdre ;
- payout garanti ;
- réussite certaine.

---

# 44. Ton rédactionnel

## 44.1 Caractéristiques

- direct ;
- précis ;
- calme ;
- respectueux ;
- non infantilisant ;
- non commercial dans les moments sensibles ;
- français clair.

## 44.2 Exemple de succès

> Votre évaluation est validée. Votre compte Performance est prêt. Les règles de cette nouvelle étape sont différentes ; prenez deux minutes pour les consulter avant de trader.

## 44.3 Exemple de soft lock

> Votre limite de perte quotidienne est atteinte. Les nouveaux ordres augmentant l’exposition sont bloqués jusqu’à 00:00 UTC. Vous pouvez toujours réduire ou fermer vos positions.

## 44.4 Exemple de breach

> Votre equity a atteint le plancher de perte maximale défini par votre policy version. Le compte est maintenant terminé. Consultez le calcul complet ou ouvrez une contestation.

---

# 45. Architecture responsive

## 45.1 Mobile — 320 à 767 px

- navigation inférieure ;
- contenu une colonne ;
- order ticket bottom sheet ;
- tableaux transformés en listes structurées ;
- données critiques sans scroll horizontal ;
- actions tactiles ≥ 44 px ;
- confirmations adaptées.

## 45.2 Tablette — 768 à 1023 px

- navigation latérale compacte ou supérieure ;
- deux colonnes ;
- order ticket latéral repliable ;
- tableaux simplifiés.

## 45.3 Desktop — 1024 à 1439 px

- navigation latérale ;
- trois zones Trade ;
- tableaux ;
- panneaux de détail.

## 45.4 Large desktop — ≥ 1440 px

- densité maîtrisée ;
- chart étendu ;
- pas d’étirement excessif des textes ;
- largeur marketing limitée ;
- terminal pleine largeur.

## 45.5 Orientation

Sur mobile, Trade doit fonctionner en portrait.

Le paysage peut offrir un mode graphique amélioré.

---

# 46. Accessibilité

## 46.1 Niveau cible

WCAG 2.2 AA pour les parcours critiques.

## 46.2 Obligations

- navigation clavier ;
- focus visible ;
- labels ;
- erreurs associées aux champs ;
- contrastes ;
- textes redimensionnables ;
- zones tactiles ;
- alternatives aux couleurs ;
- lecteurs d’écran ;
- motion réduite ;
- timeouts annoncés ;
- modales correctement gérées.

## 46.3 Données financières

Ne jamais représenter le risque uniquement en rouge/vert.

Ajouter :

- label ;
- icône ;
- texte ;
- valeur.

## 46.4 Trading

Les raccourcis clavier doivent être documentés et désactivables.

Aucune exécution sensible via une touche unique non configurable.

---

# 47. Performance UX

## 47.1 Cibles fonctionnelles

- Hub perceptible rapidement ;
- interactions locales instantanées ;
- état d’ordre visible immédiatement ;
- reconnexion explicite ;
- aucune animation lourde dans Trade.

## 47.2 Dégradation

Si un service secondaire échoue :

- Trade peut rester fonctionnel si sûr ;
- Assist peut être désactivé ;
- analytics peut différer ;
- fonctions critiques ne doivent pas inventer de fallback.

---

# 48. Analytics UX

## 48.1 Principes

- aucune donnée personnelle inutile ;
- événements structurés ;
- consentement selon règles ;
- exclusion des secrets et documents ;
- correlation avec cohortes sans exposer les utilisateurs.

## 48.2 Funnel public

- `homepage_viewed`
- `offer_viewed`
- `rules_opened`
- `checkout_started`
- `payment_method_selected`
- `payment_confirmed`
- `account_activated`

## 48.3 Activation

- `onboarding_started`
- `onboarding_completed`
- `mission_viewed`
- `first_trade_started`
- `first_trade_filled`

## 48.4 Trading

- `order_submitted`
- `order_rejected`
- `position_closed`
- `risk_detail_opened`
- `soft_lock_viewed`

## 48.5 Progression

- `qualified_day_finalized`
- `target_reached`
- `consistency_non_compliant`
- `evaluation_passed`
- `performance_activated`

## 48.6 Payout

- `payout_checker_viewed`
- `payout_eligible`
- `payout_requested`
- `payout_action_required`
- `payout_paid`
- `payout_rejected`
- `dispute_created`

## 48.7 Support

- `help_search`
- `article_viewed`
- `assist_started`
- `ticket_created`
- `ticket_resolved`

---

# 49. KPI UX

## 49.1 Compréhension

- taux d’ouverture des règles ;
- réussite aux tests de compréhension ;
- erreurs sur balance/equity ;
- tickets liés aux règles ;
- temps pour identifier la prochaine action.

## 49.2 Achat

- conversion offre → checkout ;
- abandon par étape ;
- échecs paiement ;
- double tentative ;
- temps d’activation.

## 49.3 Trading

- temps premier trade ;
- taux de rejet compris ;
- erreurs de compte actif ;
- reconnexions ;
- stale data ;
- modifications SL/TP.

## 49.4 Payout

- taux de checklist comprise ;
- demandes invalides ;
- temps de traitement ;
- action requise ;
- contestations ;
- divergence montant attendu/final.

## 49.5 Support

- résolution ;
- recontact ;
- escalade ;
- satisfaction ;
- volume par catégorie.

---

# 50. Plan de recherche utilisateur

## 50.1 Avant design haute fidélité

Tester avec 8 à 12 personnes :

- compréhension de la proposition ;
- différence compte simulé/capital réel ;
- lecture des règles ;
- choix d’offre ;
- compréhension du payout.

## 50.2 Prototype

Tester avec 10 à 15 traders :

1. trouver la DLL ;
2. expliquer Maximum Loss ;
3. identifier pourquoi le passage est bloqué ;
4. placer un ordre ;
5. modifier un SL ;
6. fermer une position ;
7. expliquer la consistance ;
8. vérifier payout ;
9. contester une violation.

## 50.3 Bêta privée

10 à 25 traders réels en sandbox.

Mesurer :

- incompréhensions ;
- erreurs ;
- lenteurs ;
- faux clics ;
- tickets ;
- abandon ;
- confiance.

## 50.4 Critères qualitatifs

- aucun participant ne doit croire que le nominal est son argent ;
- la majorité doit identifier la prochaine action sans aide ;
- la différence soft lock/breach doit être comprise ;
- le payout doit pouvoir être expliqué avec ses propres mots.

---

# 51. Tests d’utilisabilité critiques

## Test UX-001 — État du compte

Question :

> Où en êtes-vous et que devez-vous faire ensuite ?

Succès :

- réponse correcte en moins de 10 secondes.

## Test UX-002 — DLL

Question :

> Combien pouvez-vous encore perdre aujourd’hui ?

Succès :

- valeur correcte ;
- reset identifié.

## Test UX-003 — Consistance

Scénario :

- target atteint ;
- ratio 50 %.

Succès :

- utilisateur comprend que le compte n’est pas perdu ;
- il sait que le passage est en attente.

## Test UX-004 — Soft lock

Succès :

- utilisateur comprend les actions autorisées ;
- il ne croit pas à un breach permanent.

## Test UX-005 — Ordre mobile

Succès :

- compte, symbole, sens et taille vérifiés ;
- ordre soumis sans erreur.

## Test UX-006 — Payout

Succès :

- utilisateur explique Payout Base, cap, split et Trader Cash.

## Test UX-007 — Contestation

Succès :

- utilisateur trouve la preuve et soumet un recours.

---

# 52. Matrice écrans × états

| Écran | Actif | Soft lock | Breached | Passed | Performance | Payout review |
|---|---:|---:|---:|---:|---:|---:|
| Hub | Oui | Oui | Lecture | Résumé | Oui | Oui |
| Mission | Oui | Oui | Lecture | Validée | Cycle | Gelée |
| Trade | Oui | Réduction | Lecture | Non | Oui | Lecture |
| Risque | Oui | Oui | Preuve | Preuve | Oui | Snapshot |
| Historique | Oui | Oui | Oui | Oui | Oui | Oui |
| Payout | Non | Non | Non | Non | Selon éligibilité | Suivi |
| Support | Oui | Oui | Oui | Oui | Oui | Oui |

---

# 53. Matrice information × emplacement

| Information | Public | Hub | Mission | Trade | Payout | Control |
|---|---:|---:|---:|---:|---:|---:|
| Target | Oui | Oui | Oui | Résumé | Non | Oui |
| DLL | Oui | Oui | Oui | Permanent | Oui | Oui |
| Maximum Loss | Oui | Oui | Oui | Permanent | Oui | Oui |
| Consistance | Oui | Oui | Oui | Résumé | Oui | Oui |
| Journées qualifiées | Oui | Oui | Oui | Non | Oui | Oui |
| Policy version | Oui | Oui | Oui | Détail | Oui | Oui |
| Payout cap | Oui | Non | Performance | Non | Oui | Oui |
| Split | Oui | Non | Performance | Non | Oui | Oui |
| Preuve violation | Non | Oui | Oui | Oui | Oui | Oui |
| Réserve WARIBA | Agrégée future | Non | Non | Non | Non | Oui |

---

# 54. Critères d’acceptation par expérience

# 54.1 Homepage

- proposition comprise ;
- nature simulée visible ;
- prix accessibles ;
- règles accessibles ;
- aucun faux chiffre ;
- CTA fonctionnel ;
- responsive ;
- performance correcte.

# 54.2 Checkout

- total exact ;
- policy version ;
- double clic sûr ;
- paiement confirmé serveur ;
- échec récupérable ;
- reçu.

# 54.3 Hub

- état en cinq secondes ;
- métriques serveur ;
- compte actif ;
- prochaine action ;
- risk details ;
- mobile.

# 54.4 Trade

- ordre serveur ;
- états visibles ;
- stale data ;
- reconnexion ;
- risk ribbon ;
- mobile ;
- close all ;
- aucun PnL client comme vérité.

# 54.5 Mission

- toutes conditions ;
- distinctions atteint/validé ;
- formule ;
- historique ;
- policy.

# 54.6 Payout

- checklist ;
- calcul complet ;
- idempotence ;
- gel ;
- suivi ;
- recours.

# 54.7 Control

- RBAC ;
- audit ;
- aucune balance éditable ;
- décision structurée ;
- séparation des rôles ;
- timeline.

---

# 55. Risques UX majeurs

## 55.1 Surcharge du Hub

Mitigation :

- progressive disclosure ;
- prochaine action ;
- groupement ;
- priorité.

## 55.2 Terminal trop complexe sur mobile

Mitigation :

- bottom sheets ;
- actions principales ;
- tabs ;
- landscape optionnel ;
- tests tactiles.

## 55.3 Confusion sur le compte simulé

Mitigation :

- wording répété ;
- page offre ;
- checkout ;
- activation ;
- profil compte.

## 55.4 Payout incompris

Mitigation :

- breakdown ;
- exemple ;
- checklist ;
- preview.

## 55.5 Soft lock perçu comme breach

Mitigation :

- vocabulaire ;
- reset ;
- actions autorisées ;
- état distinct.

## 55.6 IA perçue comme conseiller

Mitigation :

- périmètre ;
- disclaimer ciblé ;
- refus explicite ;
- réponses basées règles.

## 55.7 Faux sentiment de temps réel

Mitigation :

- timestamp ;
- stale state ;
- connexion ;
- confirmation serveur.

## 55.8 Multiplication des modules

Mitigation :

- cinq navigations trader maximum ;
- un Hub ;
- une Mission ;
- une terminologie.

---

# 56. Décisions UX ouvertes

Les décisions suivantes doivent être tranchées avant design final ou implémentation correspondante :

1. nombre maximum d’évaluations actives ;
2. reset/repurchase ;
3. pending orders ;
4. commissions et swaps affichés ;
5. cutoff weekend ;
6. provider news ;
7. caps de position ;
8. méthode de fermeture soft lock ;
9. moyens de paiement réels ;
10. moyens de payout ;
11. frais et taux FX ;
12. parcours KYC exact ;
13. politique de remboursement ;
14. SLA support ;
15. SLA payout ;
16. délai de WARIBA Review ;
17. critères Review ;
18. notification WhatsApp/SMS ;
19. certificat ;
20. langue anglaise ;
21. dark/light theme pour marketing ;
22. mode paysage Trade ;
23. raccourcis clavier ;
24. confirmation Close All ;
25. support des partial fills ;
26. nombre de timeframes ;
27. indicateurs chart V1 ;
28. affichage statistiques publiques ;
29. conservation des preuves trader ;
30. statut de disponibilité publique des tailles 25K, 50K et 100K ;
31. caps de payout 50K et 100K.

---

# 57. Decision Log UX initial

| ID | Décision | Statut | Motif |
|---|---|---|---|
| UX-001 | Hub comme centre du produit | `LOCKED` | Compréhension globale |
| UX-002 | Mission par compte | `LOCKED` | Progression explicite |
| UX-003 | Trade séparé du Hub | `LOCKED` | Concentration |
| UX-004 | Mobile-first réel | `LOCKED` | Marché initial |
| UX-005 | Navigation trader à cinq entrées | `CANDIDATE` | Simplicité |
| UX-006 | Risk Ribbon permanent | `CANDIDATE` | Risque visible |
| UX-007 | Order Ticket en bottom sheet mobile | `CANDIDATE` | Utilisabilité |
| UX-008 | Consistance non présentée comme violation | `LOCKED` | Rulebook |
| UX-009 | Soft lock distinct du breach | `LOCKED` | Rulebook |
| UX-010 | Breakdown payout complet | `LOCKED` | Transparence |
| UX-011 | Payout en lecture seule après demande | `LOCKED` | Intégrité |
| UX-012 | Support et contestation intégrés | `LOCKED` | Décision explicable |
| UX-013 | Trust Center public | `CANDIDATE` | Confiance |
| UX-014 | Bottom navigation mobile | `CANDIDATE` | Accès rapide |
| UX-015 | 10K comme offre principale | `CANDIDATE` | Modèle financier |
| UX-016 | 25K désactivé par défaut | `SUPERSEDED` | Remplacé par UX-021 / OFFER-023 |
| UX-017 | Aucun upsell agressif après breach | `LOCKED` | Confiance |
| UX-018 | Assist sans conseil de trading | `LOCKED` | Sécurité produit |
| UX-019 | UTC visible | `CANDIDATE` | Rulebook |
| UX-020 | WARIBA Review sans promesse Live | `LOCKED` | Réalisme |
| UX-021 | Cinq tailles actives en sandbox avec feature flags indépendants | `LOCKED` | OFFER-023 ; kill switch et transparence |

---

# 58. Réconciliation avec les 35 rôles

| # | Rôle | Exigence UX |
|---:|---|---|
| 1 | CEO | Le produit raconte une progression simple. |
| 2 | COO | Les parcours d’exception sont opérables. |
| 3 | CFO | Payout, prix et réserve sont présentés sans ambiguïté. |
| 4 | CPO | ONE → Performance → Review structure toute l’expérience. |
| 5 | Chief of Staff | Les décisions UX sont journalisées. |
| 6 | Market Strategist | Français, FCFA et mobile par conception. |
| 7 | Brand Strategist | WARIBA partout, aucune trace R1STER. |
| 8 | Art Director | Autorité calme, pas de casino ni d’IA générique. |
| 9 | Content Strategist | Terminologie stable et compréhensible. |
| 10 | Growth Lead | Conversion sans dark patterns. |
| 11 | Product Manager | Tier 1 limité aux parcours critiques. |
| 12 | UX Researcher | Tests avec traders avant design final. |
| 13 | Information Architect | Trois espaces : Public, Platform, Control. |
| 14 | Product Designer | Chaque état possède une action et une explication. |
| 15 | Design System Lead | États sémantiques normalisés. |
| 16 | CRO | DLL, Maximum Loss et consistance toujours visibles. |
| 17 | Market Specialist | Instrument status et sessions accessibles. |
| 18 | Execution Specialist | États d’ordre précis et audités. |
| 19 | Quant Analyst | Formules consultables et scénarios testables. |
| 20 | Market Data Engineer | Stale data et source visibles. |
| 21 | Software Architect | UX alignée sur state machines et policy versions. |
| 22 | Frontend Lead | Responsive et accessibilité définis. |
| 23 | Backend Lead | Aucun calcul critique dans l’interface. |
| 24 | Database Architect | Timeline et preuve basées événements. |
| 25 | Realtime Engineer | Reconnexion et confirmation serveur explicites. |
| 26 | Security Engineer | Sessions, appareils, RBAC et KYC. |
| 27 | SRE | Maintenance, incident mode et status page. |
| 28 | QA Lead | Critères d’acceptation par parcours. |
| 29 | Payments Lead | Paiement et payout idempotents et traçables. |
| 30 | Fraud Lead | Signaux sans sanction automatique. |
| 31 | Legal Counsel | Wording simulé et règles visibles avant achat. |
| 32 | Privacy Lead | Minimisation et documents privés. |
| 33 | Customer Operations | Tickets, SLA et recours intégrés. |
| 34 | AI Lead | Assist explique et escalade seulement. |
| 35 | Community/Affiliate Lead | Aucune preuve sociale artificielle. |

---

# 59. Gates UX avant Design System

Le Design System peut commencer lorsque :

- sitemap validé ;
- navigation validée ;
- terminologie validée ;
- six parcours critiques validés ;
- états soft lock/breach définis ;
- Mission ONE définie ;
- Mission Performance définie ;
- Payout breakdown défini ;
- layout Trade desktop/mobile défini ;
- Control payout review défini ;
- décisions ouvertes enregistrées.

---

# 60. Gates UX avant bêta privée

Avant le premier bêta-testeur :

- parcours sandbox complet ;
- responsive mobile ;
- tests d’utilisabilité ;
- nature simulée visible ;
- règles accessibles ;
- policy version visible ;
- soft lock compréhensible ;
- breach consultable ;
- ordre idempotent ;
- stale data ;
- reconnexion ;
- payout sandbox ;
- support ;
- contestation ;
- Control ;
- aucun faux chiffre.

---

# 61. Definition of Done — UX Architecture

Le document est considéré exploitable lorsque :

1. chaque parcours critique possède un début et une fin ;
2. chaque état métier possède une représentation utilisateur ;
3. chaque action sensible possède confirmation, feedback et récupération ;
4. le mobile permet le parcours complet ;
5. les règles du Rulebook sont affichables ;
6. le payout est entièrement explicable ;
7. les rôles internes disposent d’une expérience limitée par permission ;
8. les erreurs temps réel sont couvertes ;
9. les métriques UX sont définies ;
10. les tests d’utilisabilité sont planifiés ;
11. les décisions ouvertes sont enregistrées ;
12. aucune maquette n’est encore nécessaire pour comprendre la structure.

---

# 62. Conclusion

WARIBA ne doit pas donner l’impression d’un template de prop firm auquel des règles ont été ajoutées.

L’expérience doit être construite autour de quatre objets mentaux :

1. **le compte** ;
2. **la Mission** ;
3. **le risque** ;
4. **la prochaine action**.

Le Hub explique.

Trade exécute.

Guardian calcule et avertit.

Performance organise les cycles.

Payout décompose les montants.

Assist explique et escalade.

Control permet à l’équipe d’opérer sans pouvoir arbitraire.

Cette UX Architecture v1.0 devient la baseline fonctionnelle du futur Design System. Aucun agent de design ou de code ne peut modifier implicitement les parcours, les états ou la terminologie définis ici.
