---
title: "WARIBA Program Rulebook"
version: "1.0"
document_id: "WARIBA-PROGRAM-RULEBOOK"
status: "BASELINE INTERNE — CANDIDATE POUR BÊTA PRIVÉE"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
market: "Afrique francophone"
effective_date: null
owner: "WARIBA Product & Risk"
source_of_truth_priority: 1
supersedes:
  - "R1STER rules and prior working drafts"
depends_on:
  - "WARIBA Product Master Document v1.0"
next_documents:
  - "WARIBA Financial Model v1.0"
  - "WARIBA UX Architecture v1.0"
  - "WARIBA Design System v1.0"
---

# WARIBA Program Rulebook v1.0

> **Une infrastructure de progression pour traders disciplinés.**

## Contrôle du document

| Champ | Valeur |
|---|---|
| Marque | WARIBA |
| Domaine | `wariba.app` |
| Produit commercial initial | WARIBA ONE |
| Étape suivante | WARIBA Performance |
| Étape après cinq payouts | WARIBA Review |
| État réel du projet | Dossier créé, aucun code produit commencé |
| Statut du Rulebook | Baseline interne, candidate pour bêta privée |
| Langue de référence | Français |
| Monnaie commerciale | FCFA |
| Monnaie nominale des comptes | USD simulés |
| Capital réel au lancement | Aucun |
| Application native au lancement | Non |
| Broker au lancement | Non |
| Conseils ou signaux de trading | Non |

---

# 1. Objet du Rulebook

Ce document définit les règles opérationnelles, mathématiques et comportementales du programme WARIBA.

Il sert simultanément de référence pour :

1. les utilisateurs ;
2. l’équipe Produit ;
3. l’équipe Risk ;
4. l’équipe Finance ;
5. l’équipe Support ;
6. les développeurs ;
7. les tests automatisés ;
8. WARIBA Control ;
9. les futures conditions contractuelles ;
10. les politiques machine du moteur de règles.

Le Rulebook transforme les décisions du Product Master en définitions vérifiables. Il ne constitue pas encore les conditions générales juridiquement définitives. La version publique devra être relue et adaptée par un conseil juridique compétent avant toute vente réelle.

---

# 2. Hiérarchie des sources de vérité

Lorsqu’une contradiction apparaît, l’ordre suivant s’applique :

1. **Règles légales et réglementaires applicables** ;
2. **Conditions contractuelles publiées et acceptées par l’utilisateur** ;
3. **Version de politique attachée au compte** ;
4. **WARIBA Program Rulebook** ;
5. **WARIBA Product Master Document** ;
6. **Spécifications techniques** ;
7. **Interfaces et textes marketing** ;
8. **Prompts d’implémentation** ;
9. **Commentaires de code**.

Un prompt, une maquette ou un agent IA ne peut jamais modifier une règle métier de manière implicite.

---

# 3. Statuts de décision

| Statut | Définition |
|---|---|
| `LOCKED` | Décision active et obligatoire pour la V1. |
| `CANDIDATE` | Baseline utilisée pour conception, simulation et bêta ; validation restante avant vente publique. |
| `EXPERIMENT` | Hypothèse testée sur une cohorte limitée et désactivable. |
| `OPEN` | Décision non finalisée ; aucune promesse publique autorisée. |
| `DEFERRED` | Fonction ou règle volontairement repoussée. |
| `REJECTED_V1` | Option explicitement exclue de la V1. |

## 3.1 Registre principal

| Décision | Statut |
|---|---|
| Marque WARIBA et domaine `wariba.app` | `LOCKED` |
| Ancien produit BRVM à renommer | `LOCKED` |
| Français et Afrique francophone d’abord | `LOCKED` |
| Web/PWA au lancement | `LOCKED` |
| Trading simulé au lancement | `LOCKED` |
| WARIBA ONE en une phase | `CANDIDATE` |
| Règles 8 % / 4 % / 8 % | `CANDIDATE` |
| Consistance à 40 %, non-breach | `CANDIDATE` |
| WARIBA Performance avec cinq cycles de payout | `CANDIDATE` |
| Prix 5K, 10K et 25K | `CANDIDATE` |
| Caps de payout | `CANDIDATE` |
| Compte 25K au lancement | `EXPERIMENT` |
| Capital réel automatique après cinq payouts | `REJECTED_V1` |
| Frais d’activation | `REJECTED_V1` |
| Trailing drawdown | `REJECTED_V1` |
| Application native | `DEFERRED` |
| Futures, crypto, copy trading et API publique | `DEFERRED` |
| Conseils d’achat ou de vente par IA | `REJECTED_V1` |

---

# 4. Principes fondateurs du programme

## 4.1 Clarté avant persuasion

Une règle qui peut arrêter un compte ou réduire un payout doit être visible avant l’achat, dans le Hub et au moment où elle devient pertinente.

## 4.2 Risque avant performance

WARIBA mesure la capacité à générer une performance dans des limites définies. Un profit important ne compense pas une violation de risque.

## 4.3 Non-rétroactivité

Chaque compte référence une version immuable de politique. Une modification future ne s’applique pas aux comptes déjà activés, sauf :

- obligation légale impérative ;
- correction favorable acceptée par l’utilisateur ;
- correction d’une erreur manifeste, documentée et non punitive.

## 4.4 Serveur autoritaire

Le navigateur ne décide jamais :

- du prix d’exécution ;
- du PnL ;
- de la balance ;
- de l’equity ;
- d’une violation ;
- de l’éligibilité ;
- du montant d’un payout ;
- du statut d’un paiement.

## 4.5 Décision explicable

Toute restriction, violation ou décision de payout doit indiquer :

- la règle ;
- la version ;
- le seuil ;
- la valeur observée ;
- les événements utilisés ;
- l’horodatage ;
- la conséquence ;
- la voie de recours.

## 4.6 Humain responsable

Un moteur peut calculer. Une IA peut expliquer. Les décisions sensibles de fraude, de rejet de payout ou de correction d’un compte nécessitent une responsabilité humaine identifiée.

## 4.7 Aucune condition cachée

WARIBA n’ajoute pas après l’achat une condition qui n’était pas contenue dans la politique du compte.

---

# 5. Définitions officielles

## 5.1 Compte nominal

Valeur simulée affichée comme taille du compte :

- 5 000 USD ;
- 10 000 USD ;
- 25 000 USD.

Le compte nominal ne représente pas un dépôt appartenant à l’utilisateur.

## 5.2 Solde — `balance`

Valeur comptable simulée après prise en compte des transactions clôturées, commissions, swaps, ajustements autorisés et payouts comptabilisés.

## 5.3 Equity

```text
equity = balance + unrealized_pnl
```

L’equity inclut le PnL latent de toutes les positions ouvertes, évalué avec le prix exécutable applicable.

## 5.4 PnL réalisé

Résultat net d’une position clôturée après :

- spread ;
- slippage ;
- commission ;
- swap applicable ;
- ajustement explicitement documenté.

## 5.5 PnL latent

Résultat non réalisé d’une position ouverte, calculé avec le bid ou l’ask de clôture applicable.

## 5.6 Journée WARIBA

Période de référence utilisée par les règles journalières.

**Baseline V1 :**

```text
00:00:00 UTC → 23:59:59.999 UTC
```

Le fuseau est attaché à la version de politique. Il ne change pas pendant la vie du compte.

## 5.7 Trading day

Journée WARIBA au cours de laquelle au moins un ordre a reçu un fill non nul.

Une connexion, un ordre rejeté ou un ajustement administratif ne crée pas un trading day.

## 5.8 Journée profitable

Journée dont le PnL réalisé net est strictement positif.

## 5.9 Journée qualifiée

Journée profitable dont le PnL réalisé net atteint le minimum défini pour le programme.

## 5.10 Cycle Performance

Période commençant :

- à l’activation du compte Performance pour le cycle #1 ;
- après la finalisation du payout précédent pour les cycles suivants.

Le cycle se termine lorsqu’un payout est payé, lorsque le compte est breached ou lorsqu’une décision de clôture est rendue.

## 5.11 Soft lock

Mesure protectrice temporaire :

- rejet des nouveaux ordres augmentant l’exposition ;
- annulation possible des ordres non exécutés ;
- fermeture contrôlée des positions selon la politique ;
- reprise au prochain reset prévu si aucun hard breach n’a eu lieu.

Un soft lock n’est pas, à lui seul, un échec permanent du compte.

## 5.12 Hard breach

Violation terminale qui arrête le compte.

## 5.13 Policy version

Ensemble immuable de paramètres attaché au compte à son activation.

## 5.14 Payout Base

Montant brut retiré du compte simulé avant application du split.

## 5.15 Trader Cash

Montant effectivement dû au trader après application du split et des frais explicitement publiés.

---

# 6. Catalogue initial

## 6.1 WARIBA ONE

WARIBA ONE est l’unique évaluation commerciale de la V1.

Elle possède :

- une phase ;
- un objectif de profit ;
- des limites de risque ;
- un minimum de jours ;
- une règle de consistance ;
- aucune limite calendaire de réussite ;
- aucun trailing drawdown ;
- aucun frais d’activation après réussite.

## 6.2 WARIBA Performance

Compte simulé attribué après réussite de WARIBA ONE.

Il permet :

- de poursuivre le trading dans des limites plus prudentes ;
- d’accumuler des journées qualifiées ;
- d’atteindre un seuil de profit par cycle ;
- de demander un payout ;
- d’accéder à WARIBA Review après cinq payouts.

## 6.3 WARIBA Review

Processus de revue après cinq payouts validés.

WARIBA Review n’est pas une promesse automatique de capital réel.

Résultats possibles :

1. accès à une future allocation Live, si disponible ;
2. maintien dans WARIBA Performance ;
3. passage vers une future offre Performance Plus ;
4. observation complémentaire ;
5. clôture motivée pour risque, intégrité ou incompatibilité opérationnelle.

Les critères exacts de Live restent `DEFERRED` tant que le capital, le cadre juridique et l’infrastructure correspondants n’existent pas.

---

# 7. Tailles et prix de travail

| Taille nominale | Prix de travail | Statut |
|---:|---:|---|
| 5 000 USD | 14 900 FCFA | `CANDIDATE` |
| 10 000 USD | 27 900 FCFA | `CANDIDATE` — offre principale |
| 25 000 USD | 59 900 FCFA | `EXPERIMENT` — limité ou post-bêta |

## 7.1 Principes commerciaux

- Aucun frais d’activation.
- Aucun abonnement obligatoire en V1.
- Aucun coût caché.
- Le prix payé n’est pas un dépôt de trading.
- Le 25K doit être désactivable par feature flag.
- Les prix définitifs dépendent du modèle financier stressé.
- Une promotion ne modifie jamais les règles d’un compte.

## 7.2 Resets et repurchases

Statut : `OPEN`.

Avant le lancement public, WARIBA doit décider séparément :

- si un reset est vendu ;
- son prix ;
- les conditions d’éligibilité ;
- son effet sur l’historique ;
- la limite de resets ;
- la distinction entre reset et nouvel achat.

Aucun reset ne doit être promis avant validation.

---

# 8. Instruments de lancement

## 8.1 Symboles V1

| Symbole WARIBA | Classe |
|---|---|
| EURUSD | Forex majeur |
| GBPUSD | Forex majeur |
| USDJPY | Forex majeur |
| XAUUSD | Or |
| NAS100 | Indice |

L’ajout d’un symbole nécessite :

- une licence de données adaptée ;
- une spécification instrument ;
- des tests de PnL ;
- des tests de session ;
- des tests de spread et slippage ;
- un Decision Log.

## 8.2 Spécification obligatoire par instrument

Chaque symbole doit posséder une fiche machine et utilisateur comprenant :

- identifiant interne ;
- nom affiché ;
- devise de base ;
- devise de cotation ;
- précision ;
- taille de contrat ;
- taille minimum ;
- incrément de taille ;
- taille maximum ;
- valeur du point ;
- méthode de calcul du PnL ;
- méthode de calcul de marge ;
- levier ;
- sessions ;
- jours fériés ;
- spread ;
- commission ;
- swap long ;
- swap short ;
- heure de coupure weekend ;
- seuil de prix périmé ;
- statut de marché.

Aucune valeur ne doit être déduite implicitement d’un autre broker.

---

# 9. Levier et marge

## 9.1 Levier WARIBA ONE

| Actif | Levier maximal |
|---|---:|
| Forex majeur | 1:50 |
| XAUUSD | 1:20 |
| NAS100 | 1:20 |

## 9.2 Levier WARIBA Performance

| Actif | Levier maximal |
|---|---:|
| Forex majeur | 1:30 |
| XAUUSD | 1:10 |
| NAS100 | 1:10 |

## 9.3 Marge

Le serveur calcule la marge requise selon la fiche instrument.

Un ordre est rejeté lorsque :

- la marge libre est insuffisante ;
- le symbole n’est pas tradable ;
- le prix est périmé ;
- le compte est verrouillé ;
- le compte est breached ;
- la taille dépasse un cap ;
- le weekend cutoff est atteint ;
- une restriction news applicable est active.

## 9.4 Caps de position

Statut : `OPEN`.

Les caps par symbole, exposition et nombre de positions doivent être définis après :

- choix du fournisseur de données ;
- choix du modèle d’exécution ;
- simulation du risque ;
- tests de performance.

Les caps doivent être publics et versionnés. Ils ne peuvent pas être cachés dans le backend.

## 9.5 Risque par idée et corrélation

Aucune règle contractuelle rigide de « risque par idée » ou de « corrélation » n’est appliquée en V1.

WARIBA Guardian peut :

- estimer le risque avec stop loss ;
- signaler une concentration ;
- montrer l’exposition ;
- recommander une réduction.

Ces éléments restent informatifs tant qu’aucune politique objective et testable n’est publiée.

---

# 10. Exécution simulée

## 10.1 Prix

- Achat ouvert au prix ask.
- Vente ouverte au prix bid.
- Achat clôturé au prix bid.
- Vente clôturée au prix ask.

## 10.2 Source

En bêta privée :

- adaptateur de marché simulé ;
- génération déterministe seedée ;
- replay exact d’une session.

Avant lancement public :

- fournisseur de données licencié ;
- droits d’usage commercial ;
- documentation des retards et sessions ;
- plan de continuité.

## 10.3 Spread

Le spread fait partie du prix exécutable. Il peut être :

- fixe dans un scénario sandbox ;
- variable dans un environnement de simulation réaliste ;
- issu du fournisseur dans l’environnement public.

La méthode doit être visible dans la fiche instrument.

## 10.4 Slippage

Le slippage est calculé côté serveur.

Il doit être :

- déterministe et rejouable en sandbox ;
- symétrique dans ses principes ;
- lié à une règle documentée ;
- appliqué aux stops comme aux ordres marché ;
- auditable.

WARIBA ne peut pas appliquer manuellement un slippage défavorable à un trader particulier.

## 10.5 Commission et swap

Les commissions et swaps sont inclus dans le PnL net.

Statut exact des montants : `OPEN` jusqu’au choix du modèle de données et d’exécution.

En sandbox, une valeur nulle est autorisée uniquement si elle est clairement étiquetée comme hypothèse de test.

## 10.6 Ordres V1

Obligatoires :

- Market Buy ;
- Market Sell ;
- Stop Loss ;
- Take Profit ;
- modification de Stop Loss ;
- modification de Take Profit ;
- clôture partielle ;
- clôture totale ;
- Close All.

`DEFERRED` pour la première vertical slice, sauf implémentation complète :

- Buy Limit ;
- Sell Limit ;
- Buy Stop ;
- Sell Stop ;
- OCO ;
- trailing stop ;
- ordres conditionnels avancés.

L’interface ne doit jamais afficher un type d’ordre non fonctionnel.

## 10.7 Partial fills

Si le modèle supporte les partial fills :

- chaque fill est enregistré ;
- le prix moyen est calculé en décimal ;
- l’état de l’ordre est explicite ;
- l’utilisateur voit les quantités exécutées.

Si le sandbox ne les supporte pas, la politique doit l’indiquer.

---

# 11. WARIBA ONE — règles complètes

## 11.1 Tableau de synthèse

| Paramètre | Règle |
|---|---:|
| Nombre de phases | 1 |
| Objectif de profit | 8 % |
| Daily Loss Limit | 4 % — soft lock |
| Maximum Loss | 8 % statique — hard breach |
| Consistance | 40 % maximum — non-breach |
| Jours de trading minimum | 4 |
| Journées profitables qualifiées | 3 |
| Minimum d’une journée qualifiée | 0,20 % du compte nominal |
| Durée | Illimitée |
| Inactivité | 30 jours calendaires |
| Frais d’activation | Aucun |
| Overnight | Autorisé |
| Weekend | Interdit |
| News | Autorisé |
| Trailing drawdown | Aucun |

---

# 12. Objectif de profit WARIBA ONE

## 12.1 Formule

```text
profit_target_amount = nominal_balance × 8 %
```

```text
realized_net_profit = current_balance - nominal_balance - authorized_non_trading_credits
```

L’objectif est atteint lorsque :

```text
realized_net_profit >= profit_target_amount
```

## 12.2 Conditions de passage

Atteindre 8 % ne suffit pas. Le compte passe seulement si :

- le profit est réalisé ;
- toutes les positions sont fermées ;
- aucun ordre en attente ne subsiste ;
- quatre trading days minimum sont finalisés ;
- trois journées qualifiées sont finalisées ;
- la consistance est inférieure ou égale à 40 % ;
- aucun hard breach n’existe ;
- aucune revue d’intégrité bloquante n’est ouverte.

## 12.3 Profit latent

Un profit latent ne valide jamais l’évaluation.

## 12.4 Exemple 10K

```text
Compte nominal :       10 000 USD
Objectif :                 800 USD
Balance requise :       10 800 USD
```

Si l’equity atteint 10 850 USD avec une position ouverte mais que la balance est 10 600 USD, l’objectif n’est pas atteint.

---

# 13. Daily Loss Limit — WARIBA ONE

## 13.1 Montant

```text
daily_loss_limit_amount = nominal_balance × 4 %
```

| Compte | DLL |
|---:|---:|
| 5K | 200 USD |
| 10K | 400 USD |
| 25K | 1 000 USD |

## 13.2 Snapshot de début de journée

À 00:00 UTC, WARIBA enregistre :

- balance ;
- PnL latent ;
- equity ;
- positions ;
- ordres ;
- policy version ;
- prix de référence.

```text
start_of_day_equity = balance_at_reset + unrealized_pnl_at_reset
```

## 13.3 Calcul

```text
adjusted_current_equity =
    current_equity
    + authorized_debits_since_reset
    - authorized_credits_since_reset
```

```text
daily_loss_used =
    max(0, start_of_day_equity - adjusted_current_equity)
```

```text
daily_loss_ratio =
    daily_loss_used / nominal_balance
```

Le compte entre en soft lock lorsque :

```text
daily_loss_used >= daily_loss_limit_amount
```

## 13.4 Conséquence

Le soft lock :

1. rejette tout nouvel ordre augmentant l’exposition ;
2. rejette toute augmentation d’une position ;
3. autorise les actions réduisant le risque ;
4. peut déclencher une fermeture protectrice selon la policy ;
5. reste actif jusqu’au prochain reset ;
6. devient permanent seulement si le Maximum Loss est également violé.

## 13.5 Dépassement pendant fermeture

Le slippage peut provoquer un dépassement du DLL. Ce dépassement ne transforme pas automatiquement le soft lock en hard breach, sauf si l’equity atteint aussi le plancher de Maximum Loss.

## 13.6 Exemple 10K

```text
Equity à 00:00 UTC :   10 120 USD
Equity actuelle :        9 720 USD
Perte journalière :        400 USD
DLL autorisée :            400 USD
Résultat :             soft lock
```

---

# 14. Maximum Loss — WARIBA ONE

## 14.1 Règle statique

```text
maximum_loss_amount = nominal_balance × 8 %
```

```text
maximum_loss_floor = nominal_balance - maximum_loss_amount
```

| Compte | Plancher |
|---:|---:|
| 5K | 4 600 USD |
| 10K | 9 200 USD |
| 25K | 23 000 USD |

## 14.2 Hard breach

Le compte est breached lorsque :

```text
current_equity <= maximum_loss_floor
```

Le calcul inclut :

- PnL réalisé ;
- PnL latent ;
- spread ;
- slippage ;
- commissions ;
- swaps ;
- ajustements valides.

## 14.3 Le plancher ne monte jamais

Le Maximum Loss est statique :

- il ne suit pas les profits ;
- il ne suit pas l’equity ;
- il ne devient pas trailing ;
- il reste attaché au compte nominal.

## 14.4 Conséquence

Lors d’un hard breach :

- les positions sont clôturées selon le mécanisme de sécurité ;
- les ordres ouverts sont annulés ;
- le compte devient non tradable ;
- la violation est inscrite dans l’audit ;
- la preuve est accessible ;
- une contestation peut être ouverte.

---

# 15. Consistance — WARIBA ONE

## 15.1 Objectif

La règle mesure la part du profit total provenant de la meilleure journée.

## 15.2 Formule

```text
consistency_ratio =
    best_profitable_day_net_pnl
    / total_realized_net_profit
```

La conformité exige :

```text
consistency_ratio <= 40 %
```

## 15.3 Cas particuliers

- Si le profit total est nul ou négatif : ratio non applicable.
- Une journée négative peut augmenter le ratio en réduisant le profit total.
- Les commissions et swaps sont inclus.
- Les ajustements administratifs sont exclus.
- Une journée est affectée selon l’horodatage UTC de clôture des trades.

## 15.4 Non-breach

Une consistance supérieure à 40 % :

- ne ferme pas le compte ;
- n’annule pas les profits ;
- n’est pas un hard breach ;
- empêche seulement le passage.

Le trader continue jusqu’à obtenir un ratio conforme.

## 15.5 Exemples

### Conforme

```text
Profit total :       800 USD
Meilleure journée :  320 USD
Ratio :               40 %
Résultat : conforme
```

### Non conforme

```text
Profit total :       800 USD
Meilleure journée :  400 USD
Ratio :               50 %
Résultat : objectif atteint mais passage en attente
```

Pour devenir conforme sans réduire la meilleure journée :

```text
profit total requis = 400 / 0,40 = 1 000 USD
```

---

# 16. Jours minimums et journées qualifiées — WARIBA ONE

## 16.1 Jours minimums

Le trader doit finaliser au moins quatre trading days distincts.

## 16.2 Journée qualifiée

```text
qualified_day_minimum =
    nominal_balance × 0,20 %
```

| Compte | Minimum |
|---:|---:|
| 5K | 10 USD |
| 10K | 20 USD |
| 25K | 50 USD |

Trois journées qualifiées sont requises.

## 16.3 Règles

- Une journée de 9 USD sur un 5K est profitable mais non qualifiée.
- Plusieurs sessions dans la même journée UTC comptent pour une seule journée.
- Une journée n’est finalisée qu’après la fin de la journée WARIBA.
- Les profits latents ne comptent pas.
- Un trade clôturé après 00:00 UTC appartient à la nouvelle journée.
- Les journées qualifiées peuvent aussi faire partie des quatre trading days.

---

# 17. Durée et inactivité — WARIBA ONE

## 17.1 Durée

Aucune limite de jours pour atteindre l’objectif.

## 17.2 Inactivité

Le compte devient inactif après 30 jours calendaires consécutifs sans fill.

Processus minimal :

- rappel avant échéance ;
- date limite visible dans le Hub ;
- aucune désactivation silencieuse ;
- état `inactive` distinct de `breached`.

## 17.3 Conséquence

La politique de réactivation ou de remboursement est `OPEN` avant lancement public.

Pour la bêta privée, l’inactivité peut clôturer le compte sandbox sans obligation monétaire.

---

# 18. WARIBA Performance — règles complètes

## 18.1 Tableau de synthèse

| Paramètre | Règle |
|---|---:|
| Nature | Compte simulé |
| Target permanent | Aucun |
| Daily Loss Limit | 3 % — soft lock |
| Maximum Loss | 6 % statique — hard breach |
| Consistance | 40 % par cycle — non-breach |
| Journées qualifiées | 5 par cycle |
| Minimum d’une journée qualifiée | 0,30 % du nominal |
| Threshold cycle #1 | 4 % |
| Threshold cycles #2 à #5 | 3 % |
| Maximum distribuable | 50 % du profit net du cycle |
| Split #1 à #4 | 80 % trader / 20 % WARIBA |
| Split #5 | 90 % trader / 10 % WARIBA |
| Attente calendaire | Aucune |
| Overnight | Autorisé |
| Weekend | Interdit |
| News | Restriction ±2 minutes |
| Cycles avant Review | 5 |
| Trailing drawdown | Aucun |

---

# 19. Création du compte Performance

Après passage de WARIBA ONE :

1. l’évaluation est verrouillée ;
2. un événement `evaluation.passed` est enregistré ;
3. un compte Performance unique est créé ;
4. sa balance est réinitialisée au nominal ;
5. les profits de l’évaluation ne sont pas transférés ;
6. la policy version Performance est attachée ;
7. le cycle #1 est créé ;
8. l’opération est idempotente.

Un retry ne peut jamais créer deux comptes Performance.

## 19.1 Limite de comptes

Baseline bêta :

- un seul compte Performance actif par personne vérifiée ;
- une limite d’évaluations actives doit être définie avant vente publique.

Le VPN seul ne constitue pas une preuve de multi-compte.

---

# 20. Daily Loss Limit — WARIBA Performance

## 20.1 Montant

```text
daily_loss_limit_amount = nominal_balance × 3 %
```

| Compte | DLL |
|---:|---:|
| 5K | 150 USD |
| 10K | 300 USD |
| 25K | 750 USD |

La méthode de snapshot et de calcul est identique à WARIBA ONE.

Le dépassement crée un soft lock jusqu’au prochain reset, sauf hard breach du Maximum Loss.

---

# 21. Maximum Loss — WARIBA Performance

## 21.1 Règle

```text
maximum_loss_amount = nominal_balance × 6 %
```

```text
maximum_loss_floor = nominal_balance - maximum_loss_amount
```

| Compte | Plancher |
|---:|---:|
| 5K | 4 700 USD |
| 10K | 9 400 USD |
| 25K | 23 500 USD |

Le plancher est statique pendant tous les cycles.

Un payout réduit la balance simulée du Payout Base, mais ne modifie pas le plancher.

---

# 22. Journées qualifiées — WARIBA Performance

## 22.1 Minimum

```text
qualified_day_minimum =
    nominal_balance × 0,30 %
```

| Compte | Minimum |
|---:|---:|
| 5K | 15 USD |
| 10K | 30 USD |
| 25K | 75 USD |

Cinq journées qualifiées distinctes sont requises par cycle.

## 22.2 Aucun délai artificiel

La demande de payout devient possible dès que toutes les conditions sont remplies. Il n’existe pas d’attente obligatoire de 14 ou 30 jours.

---

# 23. Thresholds de cycle

## 23.1 Cycle #1

```text
threshold_amount = nominal_balance × 4 %
```

| Compte | Threshold #1 |
|---:|---:|
| 5K | 200 USD |
| 10K | 400 USD |
| 25K | 1 000 USD |

## 23.2 Cycles #2 à #5

```text
threshold_amount = nominal_balance × 3 %
```

| Compte | Threshold #2–#5 |
|---:|---:|
| 5K | 150 USD |
| 10K | 300 USD |
| 25K | 750 USD |

## 23.3 Profit du cycle

```text
net_cycle_profit =
    ending_realized_balance
    - cycle_start_balance
    - authorized_non_trading_credits
    + authorized_non_trading_debits
```

Le threshold est atteint lorsque :

```text
net_cycle_profit >= threshold_amount
```

---

# 24. Consistance — WARIBA Performance

La formule est identique à WARIBA ONE, mais son périmètre est le cycle actif.

```text
cycle_consistency_ratio =
    best_profitable_day_in_cycle
    / net_cycle_profit
```

Conformité :

```text
cycle_consistency_ratio <= 40 %
```

Une consistance supérieure à 40 % n’est pas un breach. Elle retarde seulement l’éligibilité.

Après paiement du payout :

- le cycle est finalisé ;
- la meilleure journée et le ratio repartent de zéro ;
- un nouveau cycle commence.

---

# 25. Éligibilité au payout

Un compte est éligible uniquement si toutes les conditions suivantes sont vraies :

1. compte Performance actif ;
2. cycle actif ;
3. threshold atteint ;
4. cinq journées qualifiées finalisées ;
5. consistance inférieure ou égale à 40 % ;
6. aucune position ouverte ;
7. aucun ordre en attente ;
8. aucun soft lock actif ;
9. aucun hard breach ;
10. KYC requis complété ;
11. moyen de payout vérifié ;
12. aucun payout déjà ouvert ;
13. aucune contestation technique bloquante ;
14. aucune revue d’intégrité nécessitant une décision humaine ;
15. audit du cycle complet.

L’éligibilité calculée n’équivaut pas à un paiement automatique.

---

# 26. Formule du payout

## 26.1 Payout Base

```text
proportional_limit = net_cycle_profit × 50 %
```

```text
payout_base =
    min(proportional_limit, applicable_cycle_cap)
```

## 26.2 Trader Cash

```text
trader_cash =
    payout_base × trader_split
```

## 26.3 Part WARIBA

```text
wariba_share =
    payout_base - trader_cash
```

## 26.4 Déduction du compte simulé

Le compte simulé est débité du Payout Base complet, et non uniquement du Trader Cash.

```text
new_balance =
    pre_payout_balance - payout_base
```

## 26.5 Aucun profit latent

Seul le profit réalisé du cycle est éligible.

## 26.6 Aucun ajustement discrétionnaire de réserve

La faiblesse de la réserve WARIBA :

- ne réduit pas le payout déjà gagné ;
- ne change pas le cap d’un compte existant ;
- ne modifie pas le split ;
- ne crée pas une nouvelle condition.

Elle peut affecter uniquement :

- les futures ventes ;
- les promotions futures ;
- la disponibilité du 25K ;
- les caps de nouvelles policy versions ;
- la cadence de croissance.

---

# 27. Caps de payout

Les caps représentent le Payout Base brut avant split.

| Compte | Payouts #1–#2 | Payouts #3–#4 | Payout #5 |
|---:|---:|---:|---:|
| 5K | 100 USD | 150 USD | 250 USD |
| 10K | 200 USD | 300 USD | 500 USD |
| 25K | 400 USD | 600 USD | 1 000 USD |

Statut : `CANDIDATE`, soumis au modèle financier et à la bêta.

## 27.1 Exemple 10K — payout #1

```text
Profit net du cycle :        500 USD
50 % du profit :             250 USD
Cap applicable :             200 USD
Payout Base :                200 USD
Split trader :                80 %
Trader Cash :                160 USD
Part WARIBA :                 40 USD
Déduction du compte :        200 USD
```

## 27.2 Exemple 10K — profit inférieur au cap

```text
Profit net du cycle :        300 USD
50 % du profit :             150 USD
Cap applicable :             200 USD
Payout Base :                150 USD
Trader Cash à 80 % :         120 USD
```

Ce cycle n’est toutefois éligible au payout #1 que si le threshold de 400 USD a été atteint. L’exemple illustre uniquement la formule proportionnelle.

---

# 28. Split

| Payout | Trader | WARIBA |
|---:|---:|---:|
| #1 | 80 % | 20 % |
| #2 | 80 % | 20 % |
| #3 | 80 % | 20 % |
| #4 | 80 % | 20 % |
| #5 | 90 % | 10 % |

Le split s’applique au Payout Base, pas au profit total du cycle.

---

# 29. Cycle de demande de payout

## 29.1 États

```text
eligible
→ requested
→ automated_checks
→ human_review
→ approved
→ processing
→ paid
```

États alternatifs :

```text
rejected_with_reason
cancelled
failed
returned
```

## 29.2 À la demande

WARIBA doit :

1. figer les métriques du cycle ;
2. mettre le compte en lecture seule ;
3. générer un snapshot ;
4. calculer le Payout Base ;
5. afficher cap, split et Trader Cash ;
6. créer une demande idempotente ;
7. empêcher une deuxième demande ;
8. lancer les contrôles automatisés ;
9. inscrire chaque étape dans l’audit.

## 29.3 Revue humaine

La revue humaine peut vérifier :

- identité ;
- cohérence des trades ;
- incidents techniques ;
- violation contestée ;
- multi-compte documenté ;
- comportement d’exploitation ;
- moyen de paiement ;
- conformité des données.

Elle ne peut pas inventer une condition non publiée.

## 29.4 Rejet

Un rejet doit fournir :

- code stable ;
- règle concernée ;
- faits ;
- période ;
- éléments d’audit ;
- possibilité de recours ;
- identité du rôle décisionnaire.

« Décision discrétionnaire », sans justification, est interdit.

## 29.5 Après paiement

1. payout marqué `paid` ;
2. compte débité du Payout Base ;
3. cycle clôturé ;
4. nouveau cycle créé si payout #1 à #4 ;
5. WARIBA Review créée après payout #5 ;
6. compte réactivé selon la décision applicable.

---

# 30. Conversion et frais de payout

## 30.1 Devise

Les caps et la comptabilité du programme sont libellés en USD simulés.

Le paiement peut être effectué dans une devise locale selon le rail disponible.

## 30.2 Taux de change

Avant le lancement public, WARIBA doit définir :

- fournisseur du taux ;
- moment du fixing ;
- durée de validité ;
- arrondi ;
- éventuelle marge ;
- preuve du taux affiché.

Le taux doit être verrouillé et affiché avant confirmation.

## 30.3 Frais

Statut : `OPEN`.

Aucun frais de payout ne peut être déduit sans :

- barème public ;
- affichage avant confirmation ;
- version contractuelle ;
- détail sur le reçu.

---

# 31. WARIBA Review après cinq payouts

## 31.1 Déclenchement

Après le cinquième payout payé :

```text
performance.review_required
```

## 31.2 Critères de revue

Le futur modèle peut considérer :

- stabilité du drawdown ;
- drawdown moyen ;
- durée de l’historique ;
- consistance par cycle ;
- concentration par instrument ;
- fréquence d’utilisation du DLL ;
- qualité d’exécution ;
- fréquence des incidents ;
- intégrité du compte ;
- dépendance à une seule journée ;
- exposition autour des news ;
- comportement opérationnel.

## 31.3 Absence de garantie Live

Les communications interdites incluent :

- « cinq payouts garantissent du capital réel » ;
- « compte live automatique » ;
- « allocation certaine ».

La formulation autorisée est :

> Après cinq payouts validés, le trader entre dans WARIBA Review pour déterminer la prochaine étape disponible.

---

# 32. Overnight et weekend

## 32.1 Overnight

Autorisé dans WARIBA ONE et WARIBA Performance.

Les positions ouvertes restent soumises :

- au spread ;
- aux swaps applicables ;
- au Daily Loss ;
- au Maximum Loss ;
- aux interruptions de marché ;
- au gap.

## 32.2 Weekend

Interdit au lancement.

Chaque instrument possède un `weekend_cutoff_at` publié.

Avant le cutoff :

- l’interface avertit ;
- les nouveaux ordres peuvent passer en mode close-only ;
- les ordres augmentant l’exposition peuvent être rejetés.

Au cutoff :

- les positions restantes sont clôturées au meilleur prix disponible selon le modèle ;
- les ordres non exécutés sont annulés ;
- les pertes et slippages s’appliquent normalement.

L’heure exacte dépend de la fiche instrument et ne peut pas être cachée.

---

# 33. Trading autour des annonces économiques

## 33.1 WARIBA ONE

Les news sont autorisées.

Toutes les autres règles continuent de s’appliquer.

## 33.2 WARIBA Performance

Pour une annonce classée haute importance et affectant le symbole :

```text
fenêtre interdite =
2 minutes avant → 2 minutes après
```

Pendant cette fenêtre :

Interdit :

- ouvrir une nouvelle exposition ;
- augmenter une exposition ;
- placer un pending order susceptible d’augmenter l’exposition.

Autorisé :

- réduire une position ;
- clôturer une position ;
- exécution d’un Stop Loss existant ;
- exécution d’un Take Profit existant ;
- maintenir une position ouverte avant la fenêtre.

## 33.3 Source du calendrier

Statut : `OPEN`.

Avant lancement public, WARIBA doit publier :

- fournisseur ;
- définition « haute importance » ;
- mapping devise/symbole ;
- politique en cas de correction du calendrier ;
- comportement en cas d’indisponibilité.

En cas d’indisponibilité du calendrier, WARIBA ne peut pas sanctionner rétroactivement sur la base d’une information non visible au trader.

---

# 34. Automatisation, EA et API

## 34.1 V1

La V1 est conçue pour une exécution manuelle depuis WARIBA Trade.

Statut :

- API publique : `DEFERRED` ;
- Expert Advisors : `DEFERRED` ;
- bots externes : `DEFERRED` ;
- copy trading produit WARIBA : `DEFERRED`.

## 34.2 Exploitation non autorisée

Interdit :

- appels non documentés aux endpoints ;
- contournement du terminal ;
- automatisation visant un bug ;
- saturation volontaire ;
- exploitation d’un prix périmé ;
- latence artificielle ;
- manipulation du sandbox ;
- falsification d’un webhook.

Un comportement automatisé n’est sanctionnable qu’avec des preuves techniques.

---

# 35. Conduites interdites et intégrité

## 35.1 Principes

WARIBA ne doit pas utiliser des notions vagues comme « gambling behavior » pour refuser un payout.

Chaque interdiction doit être objectivable.

## 35.2 Interdictions

- partage ou vente de compte ;
- usurpation d’identité ;
- plusieurs identités pour contourner les limites ;
- collusion coordonnée entre personnes ;
- hedging inverse organisé entre comptes distincts pour garantir un résultat ;
- exploitation intentionnelle d’un prix périmé ;
- exploitation répétée d’un bug connu ;
- falsification de documents ;
- fraude de paiement ;
- chargeback abusif ;
- manipulation d’un webhook ;
- accès non autorisé ;
- contournement d’une restriction technique ;
- trading par une tierce personne.

## 35.3 VPN et changement d’appareil

Un VPN, un proxy, un voyage ou un nouvel appareil :

- ne constitue pas automatiquement une violation ;
- peut créer un signal ;
- peut déclencher une vérification ;
- nécessite une revue humaine avant sanction.

## 35.4 Score fraude

Le score fraude :

- priorise les dossiers ;
- ne bloque pas définitivement seul ;
- ne rejette pas un payout seul ;
- ne bannit pas seul ;
- doit exposer ses signaux à un opérateur autorisé.

---

# 36. KYC et paiement

## 36.1 Moment

Baseline :

- identité légère à l’inscription ;
- vérification renforcée avant premier payout ;
- vérification supplémentaire selon risque documenté.

## 36.2 Minimisation

WARIBA collecte uniquement les données nécessaires.

## 36.3 Biométrie

Aucune biométrie développée par WARIBA en V1.

## 36.4 Compte et moyen de paiement

Le bénéficiaire du payout doit correspondre à l’identité validée, sous réserve des règles locales du PSP.

## 36.5 Paiement d’évaluation

Une évaluation est créée uniquement après :

- webhook signé ;
- vérification serveur ;
- montant conforme ;
- devise conforme ;
- idempotency key ;
- statut de paiement valide.

Le retour navigateur n’est jamais une preuve de paiement.

---

# 37. Remboursements et chargebacks

Statut : `OPEN` avant lancement public.

Le document contractuel doit définir :

- droit d’annulation avant activation ;
- effet du premier trade ;
- paiement dupliqué ;
- erreur technique WARIBA ;
- chargeback ;
- fraude ;
- fermeture du compte ;
- délai ;
- méthode de remboursement.

Un chargeback frauduleux peut suspendre le compte, mais nécessite une preuve du PSP.

---

# 38. Incidents de marché et de plateforme

## 38.1 Catégories

1. incident WARIBA ;
2. incident fournisseur de données ;
3. incident PSP ;
4. incident réseau utilisateur ;
5. marché fermé ou halt ;
6. erreur de configuration ;
7. bug de calcul ;
8. événement externe majeur.

## 38.2 Incident WARIBA

Lorsque WARIBA est responsable et que l’intégrité d’un trade est affectée :

- conservation des logs ;
- replay ;
- analyse ;
- correction reproductible ;
- notification ;
- décision humaine ;
- audit append-only.

## 38.3 Réseau utilisateur

Une déconnexion utilisateur ne supprime pas :

- une position ;
- un Stop Loss ;
- un Take Profit ;
- une perte de marché.

Le serveur continue à gérer le compte.

## 38.4 Prix manifestement erroné

Un trade ne peut être corrigé que si :

- le prix est hors tolérance documentée ;
- le fournisseur confirme ou le replay prouve l’anomalie ;
- la même méthode est appliquée aux effets favorables et défavorables ;
- l’ajustement est audité ;
- l’utilisateur est informé.

## 38.5 Kill switch

WARIBA peut passer un symbole ou la plateforme en :

- `close_only` ;
- `orders_paused` ;
- `maintenance`.

Le kill switch sert à limiter un incident, pas à modifier rétroactivement les résultats.

---

# 39. Violations et preuve

## 39.1 Enregistrement minimal

Chaque violation contient :

- `violation_id` ;
- `account_id` ;
- `policy_version_id` ;
- `rule_code` ;
- `threshold` ;
- `observed_value` ;
- `occurred_at` ;
- `detected_at` ;
- `source_event_ids` ;
- `price_snapshot_ids` ;
- `calculation_version` ;
- `consequence` ;
- `human_review_status`.

## 39.2 Replay

Le système doit pouvoir reconstruire une violation à partir :

- des ticks ;
- des ordres ;
- des fills ;
- des positions ;
- des fees ;
- des snapshots ;
- de la policy version.

## 39.3 Correction

Une correction ne supprime pas l’événement original. Elle ajoute :

- événement de correction ;
- motif ;
- auteur ;
- valeur précédente ;
- valeur corrigée ;
- approbation requise.

---

# 40. Recours et contestations

## 40.1 Droit d’explication

Le trader peut demander l’explication d’une :

- violation ;
- restriction ;
- erreur de paiement ;
- décision de payout ;
- correction de trade.

## 40.2 Statuts

```text
submitted
→ acknowledged
→ investigating
→ decision_pending
→ resolved
→ closed
```

## 40.3 Indépendance

Une contestation sensible ne doit pas être décidée uniquement par l’opérateur qui a pris la décision initiale, lorsque l’équipe le permet.

## 40.4 SLA

Statut exact : `OPEN`.

Le délai annoncé doit être réaliste et mesuré. Aucun faux temps moyen ne doit être affiché.

## 40.5 Décision

La réponse contient :

- faits ;
- règle ;
- logs pertinents ;
- décision ;
- correction éventuelle ;
- prochaine voie disponible.

---

# 41. WARIBA Assist et support

WARIBA Assist peut :

- rechercher dans les règles ;
- expliquer un calcul ;
- afficher la policy version ;
- lire le statut d’un compte ;
- lire le statut d’un payout ;
- créer un ticket ;
- résumer un dossier ;
- proposer une escalade.

WARIBA Assist ne peut pas :

- donner un signal d’achat ou de vente ;
- recommander une taille exacte de trade ;
- modifier une balance ;
- annuler une violation ;
- débloquer un compte ;
- approuver un payout ;
- rejeter un payout ;
- conclure seul à une fraude ;
- bannir un utilisateur.

Toute réponse d’Assist relative à une règle doit citer :

- le nom de la règle ;
- sa version ;
- le résultat actuel ;
- la source interne.

---

# 42. Réserve et trésorerie

## 42.1 Séparation

La réserve payout est séparée de la trésorerie d’exploitation.

## 42.2 Couverture

```text
reserve_coverage =
    available_payout_reserve
    / projected_payouts_next_30_days
```

| Couverture | Statut | Action |
|---:|---|---|
| ≥ 2,0x | Normal | Ventes et promotions normales |
| 1,5x à < 2,0x | Prudence | Réduire promotions, surveiller cohortes |
| 1,2x à < 1,5x | Défensif | Suspendre 25K, alimenter réserve |
| < 1,2x | Critique | Réduire ou suspendre nouvelles ventes |

## 42.3 Non-rétroactivité financière

Un niveau de réserve faible ne modifie jamais :

- un payout déjà gagné ;
- le cap d’un compte existant ;
- le split existant ;
- le seuil existant.

## 42.4 Réserves et marketing

WARIBA ne doit pas vendre une quantité de comptes incompatible avec sa capacité de paiement projetée.

---

# 43. Communication et confiance

## 43.1 Interdictions

Aucun :

- faux payout ;
- faux trader ;
- faux témoignage ;
- faux partenaire ;
- faux nombre d’utilisateurs ;
- faux délai ;
- faux taux de réussite ;
- faux capital live ;
- faux compte à rebours ;
- faux stock limité.

## 43.2 Transparence minimale

Publier :

- règles ;
- versions ;
- changelog ;
- formules ;
- incidents ;
- statut des systèmes ;
- délais réels lorsque suffisamment de données existent ;
- preuves agrégées non trompeuses.

## 43.3 Formulation du produit

WARIBA vend une évaluation et une progression sur comptes simulés. WARIBA ne présente pas le nominal comme de l’argent confié au trader.

---

# 44. Cycle de vie des comptes

## 44.1 Achat

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

## 44.2 WARIBA ONE

```text
pending_activation
→ active
→ passed
→ performance_created
```

Alternatives :

```text
soft_locked
breached
inactive
cancelled
archived
```

## 44.3 WARIBA Performance

```text
pending_activation
→ active
→ payout_eligible
→ payout_requested
→ frozen
→ cycle_completed
→ next_cycle
```

Alternatives :

```text
soft_locked
breached
under_review
closed
review_required
```

## 44.4 Transitions

Chaque transition :

- est validée serveur ;
- exige l’état source correct ;
- est idempotente ;
- est auditée ;
- expose un motif.

---

# 45. Policy versioning

## 45.1 Format

```text
major.minor.patch
```

Exemple :

```text
1.0.0
```

## 45.2 Major

Changement contractuel significatif :

- target ;
- DLL ;
- max loss ;
- payout ;
- consistance ;
- instruments ;
- leverage ;
- définition du jour.

## 45.3 Minor

Ajout compatible :

- nouveau symbole optionnel ;
- nouvelle visualisation ;
- clarification non défavorable ;
- nouvelle capacité support.

## 45.4 Patch

Correction rédactionnelle ou technique sans effet économique.

## 45.5 Activation

Chaque compte enregistre :

- policy version ;
- date ;
- hash ;
- texte accepté ;
- paramètres machine ;
- version locale ;
- consentement.

## 45.6 Migration

Une policy existante n’est jamais réécrite.

Une nouvelle policy est créée.

---

# 46. Représentation machine minimale

```json
{
  "program": "WARIBA_ONE",
  "version": "1.0.0",
  "status": "candidate_private_beta",
  "day": {
    "timezone": "UTC",
    "reset_time": "00:00:00"
  },
  "profit_target": {
    "type": "realized_net_profit",
    "pct_nominal": "0.08"
  },
  "daily_loss": {
    "pct_nominal": "0.04",
    "behavior": "soft_lock",
    "basis": "start_of_day_equity"
  },
  "maximum_loss": {
    "pct_nominal": "0.08",
    "type": "static",
    "behavior": "hard_breach",
    "basis": "current_equity"
  },
  "consistency": {
    "max_best_day_share": "0.40",
    "behavior": "eligibility_only"
  },
  "minimum_trading_days": 4,
  "qualified_days": {
    "count": 3,
    "min_pct_nominal": "0.002"
  },
  "overnight": true,
  "weekend": false,
  "trailing_drawdown": false
}
```

Toutes les proportions sont des chaînes décimales, jamais des floats binaires.

---

# 47. Événements de domaine minimaux

## 47.1 Commerce

- `order.created`
- `payment.pending`
- `payment.confirmed`
- `payment.failed`
- `order.fulfilled`

## 47.2 Trading

- `trade_order.received`
- `trade_order.validated`
- `trade_order.rejected`
- `trade_order.filled`
- `position.opened`
- `position.reduced`
- `position.closed`

## 47.3 Risk

- `risk.snapshot_created`
- `daily_loss.warning`
- `daily_loss.soft_locked`
- `maximum_loss.breached`
- `consistency.updated`
- `qualified_day.finalized`

## 47.4 Evaluation

- `evaluation.activated`
- `evaluation.target_reached`
- `evaluation.passed`
- `evaluation.breached`
- `performance.created`

## 47.5 Payout

- `performance.threshold_reached`
- `payout.eligible`
- `payout.requested`
- `payout.approved`
- `payout.rejected`
- `payout.processing`
- `payout.paid`
- `performance.cycle_created`
- `performance.review_required`

---

# 48. Invariants non négociables

1. Aucun compte actif sans policy version.
2. Aucun double compte après retry.
3. Aucun double payout.
4. Aucun payout supérieur à 50 % du profit net du cycle.
5. Aucun payout supérieur au cap.
6. Aucun payout sur profit latent.
7. Aucune consistance supérieure à 40 % traitée comme hard breach.
8. Aucun max loss statique qui se déplace.
9. Aucun calcul financier critique en float JavaScript natif.
10. Aucun PnL client accepté comme vérité.
11. Aucun webhook navigateur accepté comme paiement.
12. Aucun admin Support autorisé à approuver un payout.
13. Aucun score fraude autorisé à bannir seul.
14. Aucune règle modifiée rétroactivement.
15. Aucune balance directement éditable.
16. Aucune suppression de l’audit financier.
17. Aucune promesse Live automatique.
18. Aucun frais caché.
19. Aucun symbole sans spécification.
20. Aucune sanction fondée uniquement sur un VPN.

---

# 49. Scénarios d’acceptation essentiels

## 49.1 Target atteint, jours insuffisants

Un 10K atteint 10 800 USD en deux jours.

Résultat :

- target atteint ;
- évaluation active ;
- passage non autorisé ;
- afficher jours manquants.

## 49.2 Target et jours atteints, consistance non conforme

Profit total 800 USD, meilleure journée 400 USD.

Résultat :

- ratio 50 % ;
- aucun breach ;
- continuer jusqu’à ratio ≤ 40 %.

## 49.3 DLL touchée sans Maximum Loss

10K, SOD equity 10 100 USD, equity 9 700 USD.

Résultat :

- perte journalière 400 USD ;
- soft lock ;
- compte non breached si equity > 9 200 USD.

## 49.4 Maximum Loss

10K, equity 9 200 USD.

Résultat :

- hard breach ;
- fermeture ;
- audit.

## 49.5 Payout #1

10K Performance :

- cinq journées qualifiées ;
- profit cycle 500 USD ;
- consistance 35 % ;
- positions fermées ;
- cap 200 USD.

Résultat :

- proportional limit 250 USD ;
- Payout Base 200 USD ;
- Trader Cash 160 USD ;
- déduction compte 200 USD.

## 49.6 Payout déjà demandé

Deux requêtes identiques arrivent.

Résultat :

- une seule demande ;
- même idempotency result ;
- aucun double débit.

## 49.7 News Performance

Un ordre augmente XAUUSD 90 secondes avant une annonce haute importance applicable.

Résultat :

- ordre rejeté avec règle et fin de fenêtre ;
- clôture d’une position existante autorisée.

## 49.8 VPN

Connexion depuis un VPN.

Résultat :

- signal éventuel ;
- aucune sanction automatique ;
- vérification seulement si d’autres éléments existent.

---

# 50. Décisions ouvertes avant lancement public

Les points suivants doivent être fermés dans le Decision Log :

1. fournisseur de données et licence ;
2. spécifications exactes des cinq symboles ;
3. spread et commissions ;
4. swaps ;
5. seuil de prix périmé ;
6. session et cutoff weekend par symbole ;
7. fournisseur du calendrier news ;
8. mapping des annonces aux symboles ;
9. caps de position ;
10. limite d’évaluations actives ;
11. reset et repurchase ;
12. pending orders ;
13. automatisation et EA ;
14. PSP ;
15. moyens de payout ;
16. frais de payout ;
17. taux de change ;
18. KYC ;
19. politique de remboursement ;
20. SLA support et recours ;
21. procédure de correction de trade ;
22. critères WARIBA Review ;
23. règles fiscales et facturation ;
24. wording légal du compte simulé ;
25. avis juridique local ;
26. mécanisme de fermeture au DLL ;
27. politique de maintenance ;
28. conservation des données ;
29. plafond commercial mensuel selon réserve ;
30. disponibilité du 25K.

---

# 51. Gates de bêta privée

Avant le premier bêta-testeur :

- Rulebook versionné ;
- ruleset machine correspondant ;
- cinq symboles configurés ;
- données sandbox déterministes ;
- PSP sandbox ;
- payout sandbox ;
- tests DLL ;
- tests max loss ;
- tests consistance ;
- tests qualified days ;
- tests payout ;
- RLS ;
- audit ;
- replay ;
- runbook incident ;
- support ;
- utilisateurs de test ;
- aucun paiement réel.

---

# 52. Gates de lancement public

Avant la première vente publique :

- ancien projet BRVM renommé ;
- marque et domaine clarifiés ;
- avis juridique local ;
- CGU et politique de confidentialité ;
- PSP marchand autorisé ;
- fournisseur de données licencié ;
- prix validés ;
- caps stressés ;
- réserve séparée ;
- couverture de réserve suffisante ;
- KYC opérationnel ;
- payouts réels testés ;
- audit sécurité ;
- test de restauration ;
- monitoring ;
- status page ;
- runbooks ;
- support humain ;
- politique de recours ;
- règles publiques identiques au ruleset machine.

---

# 53. Réconciliation des 35 rôles

| # | Rôle | Exigence imposée au Rulebook |
|---:|---|---|
| 1 | CEO | Une offre étroite et compréhensible. |
| 2 | COO | États, responsabilités et procédures explicites. |
| 3 | CFO | Caps provisoires, réserve séparée, non-rétroactivité. |
| 4 | CPO | Parcours ONE → Performance → Review. |
| 5 | Chief of Staff | Decision Log et statuts de décisions. |
| 6 | Market Strategist | Français et Afrique francophone d’abord. |
| 7 | Brand Strategist | WARIBA, sans héritage R1STER. |
| 8 | Art Director | Aucun langage casino ou promesse trompeuse. |
| 9 | Content Strategist | Définitions simples, cohérentes et traduisibles. |
| 10 | Growth Lead | Aucune croissance supérieure à la capacité de payout. |
| 11 | Product Manager | Un seul programme initial. |
| 12 | UX Researcher | Règles visibles et testables avec bêta-testeurs. |
| 13 | Information Architect | Même terminologie dans Hub, Trade, Payout et Control. |
| 14 | Product Designer | Chaque état possède un résultat compréhensible. |
| 15 | Design System Lead | Sémantique cohérente des états et alertes. |
| 16 | CRO | DLL, max loss et consistance mathématiquement définis. |
| 17 | Market Specialist | Fiche obligatoire par instrument. |
| 18 | Execution Specialist | Bid/ask, spread, slippage et fills serveur. |
| 19 | Quant Analyst | Invariants et scénarios d’acceptation. |
| 20 | Market Data Engineer | Source, replay et stale-price policy. |
| 21 | Software Architect | Policy version et événements de domaine. |
| 22 | Frontend Lead | Aucun calcul critique comme source de vérité client. |
| 23 | Backend Lead | State machines et idempotence. |
| 24 | Database Architect | Decimal, contraintes et audit append-only. |
| 25 | Realtime Engineer | Ordre des événements et reconnexion sans duplication. |
| 26 | Security Engineer | Rôles, KYC, webhooks et permissions. |
| 27 | SRE | Kill switch, logs et runbooks. |
| 28 | QA Lead | Tests unitaires, property-based, intégration et E2E. |
| 29 | Payments Lead | Webhook signé et payout idempotent. |
| 30 | Fraud Lead | Signaux objectifs et décision humaine. |
| 31 | Legal Counsel | Baseline interne, revue locale avant vente. |
| 32 | Privacy Lead | Minimisation et aucune biométrie maison. |
| 33 | Customer Operations | Recours et explications avant premier client. |
| 34 | AI Lead | Assist explique, ne décide pas. |
| 35 | Community/Affiliate Lead | Aucune promesse marketing supérieure aux règles. |

---

# 54. Decision Log initial du Rulebook

| ID | Décision | Statut | Motif |
|---|---|---|---|
| PR-001 | WARIBA ONE en une phase | `CANDIDATE` | Simplicité et conversion |
| PR-002 | Target 8 % | `CANDIDATE` | Équilibre difficulté/risque |
| PR-003 | DLL 4 % soft lock | `CANDIDATE` | Protection non punitive |
| PR-004 | Max loss 8 % statique | `CANDIDATE` | Transparence, aucun trailing |
| PR-005 | Consistance 40 % non-breach | `CANDIDATE` | Régularité sans échec artificiel |
| PR-006 | 4 jours / 3 qualifiés à 0,20 % | `CANDIDATE` | Preuve minimale de répétition |
| PR-007 | Performance 3 % / 6 % | `CANDIDATE` | Risque réduit après passage |
| PR-008 | 5 jours à 0,30 % | `CANDIDATE` | Répétition avant payout |
| PR-009 | Threshold 4 %, puis 3 % | `CANDIDATE` | Premier cycle plus exigeant |
| PR-010 | 50 % du profit, sous cap | `CANDIDATE` | Protection du compte et de la réserve |
| PR-011 | Split 80/20 puis 90/10 | `CANDIDATE` | Progression du trader |
| PR-012 | Cinq payouts puis Review | `CANDIDATE` | Transition mesurée |
| PR-013 | Overnight oui, weekend non | `CANDIDATE` | Flexibilité avec gap contrôlé |
| PR-014 | News autorisées en Evaluation | `CANDIDATE` | Règles simples |
| PR-015 | Performance : ±2 minutes | `CANDIDATE` | Réduction du risque extrême |
| PR-016 | UTC comme journée V1 | `CANDIDATE` | Calcul unique et audit simple |
| PR-017 | Un Performance actif par personne | `CANDIDATE` | Risque de lancement |
| PR-018 | Aucun frais d’activation | `LOCKED` | Promesse de simplicité |
| PR-019 | Aucun trailing drawdown | `LOCKED` | Positionnement transparent |
| PR-020 | Pas de Live garanti | `LOCKED` | Réalisme opérationnel |

---

# 55. Critères de validation du Rulebook

Le Rulebook est prêt à alimenter l’architecture seulement lorsque :

- chaque règle possède un code ;
- chaque formule est sans ambiguïté ;
- chaque état est défini ;
- chaque règle critique possède un exemple ;
- chaque règle critique possède un test ;
- les points `OPEN` sont enregistrés ;
- le JSON correspond au texte ;
- le Product Master ne le contredit pas ;
- le modèle financier peut consommer les paramètres ;
- le design UX peut afficher toutes les métriques ;
- l’équipe juridique peut identifier les sections à transformer en clauses.

---

# 56. Conclusion

WARIBA ne doit pas être une prop firm dont les vraies règles se découvrent après l’achat.

Le programme repose sur six engagements :

1. règles visibles ;
2. calculs serveur ;
3. policies immuables ;
4. consistance non punitive ;
5. payouts décomposés ;
6. décisions sensibles explicables et humaines.

Cette version 1.0 constitue la baseline du produit et de la bêta privée. Les paramètres financiers marqués `CANDIDATE` restent soumis au modèle financier, aux tests et aux gates de lancement public. Aucun agent de code n’est autorisé à les modifier implicitement.
