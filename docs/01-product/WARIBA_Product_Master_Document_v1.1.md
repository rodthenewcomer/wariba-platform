---
title: "WARIBA Product Master Document — Addendum"
version: "1.1"
document_id: "WARIBA-PRODUCT-MASTER-1.1"
status: "ACTIVE ADDENDUM"
language: "fr-FR"
brand: "WARIBA"
domain: "wariba.app"
effective_from: "2026-08-03"
supersedes_sections_of: "WARIBA_Product_Master_Document_v1.0.md"
---

# WARIBA Product Master Document — Addendum v1.1

> Cet addendum remplace uniquement les règles et le vocabulaire explicitement listés ci-dessous. Le document v1.0 reste applicable pour tout le reste.

## 1. Offre produit

WARIBA propose cinq tailles de comptes simulés : **5K, 10K, 25K, 50K et 100K**.

Chaque taille peut être activée ou désactivée indépendamment selon l’environnement, la capacité de réserve et les résultats des simulations. Les cinq tailles sont actives dans la bêta sandbox. Cette disponibilité technique ne constitue pas une autorisation de vente publique.

## 2. Proposition de valeur v1.1

WARIBA combine :

- une évaluation WARIBA ONE en une phase ;
- un objectif de profit net réalisé de 10 % ;
- aucun minimum de jours en Evaluation ;
- une Best Day Rule de 50 %, non punitive ;
- un Maximum Loss de 10 % EOD trailing ;
- un levier compétitif complété par des limites d’exposition explicites ;
- un parcours Performance fondé sur un buffer permanent de 10 % ;
- cinq nouvelles Performance Days par payout ;
- des caps nets progressifs et transparents ;
- WariX, le terminal propriétaire de trading simulé de WARIBA.

## 3. Parcours Performance

Avant le premier payout, le trader construit un buffer permanent égal à 10 % de la balance nominale. Ce buffer ne peut jamais être retiré.

Après sa construction, seuls les profits nets réalisés au-dessus du Payout Buffer Floor deviennent éligibles. Chaque payout requiert cinq nouvelles Performance Days et reste limité par le cap candidat correspondant à la taille du compte et au rang du payout.

La limite universelle de distribution de 50 % est supprimée. Le buffer, les Performance Days, la Best Day Rule, les caps, le split et les contrôles d’intégrité forment le dispositif de protection.

## 4. Message produit

> **Construisez d’abord votre base. Retirez ensuite vos performances.**

WARIBA ne récompense pas seulement un résultat ponctuel. La plateforme valorise les traders capables de construire un coussin de sécurité, de produire plusieurs journées rentables et de maintenir leur compte après un payout.

## 5. Architecture tarifaire

La devise contractuelle et de règlement est le FCFA (XOF). L’équivalent USD est informatif uniquement et ne modifie jamais le montant final du checkout.

| Produit | Prix public candidat | Prix fondateur candidat | Équivalent USD indicatif |
|---|---:|---:|---:|
| WARIBA 5K | 22 500 FCFA | 16 900 FCFA | ≈ 39 USD |
| WARIBA 10K | 39 900 FCFA | 34 900 FCFA | ≈ 69 USD |
| WARIBA 25K | 84 900 FCFA | 74 900 FCFA | ≈ 148 USD |
| WARIBA 50K | 144 900 FCFA | 124 900 FCFA | ≈ 252 USD |
| WARIBA 100K | 259 900 FCFA | 229 900 FCFA | ≈ 452 USD |

```text
PRICE_STATUS = CANDIDATE_PENDING_ACTUARIAL_VALIDATION
COMMERCIAL_CURRENCY = XOF
SETTLEMENT_CURRENCY = XOF
USD_EQUIVALENT = INFORMATIONAL_ONLY
EXCHANGE_RATE_EXPOSURE = WARIBA
```

Le 10K reste l’offre principale candidate. Aucun prix n’est définitif avant calibration actuarielle et validation des gates de réserve.

## 6. North Star secondaire

```text
Percentage of Performance accounts that build the permanent buffer
and complete a first compliant payout without breach.
```

Cette métrique complète la progression globale sans remplacer la North Star principale.

## 7. Nom du terminal

**WariX** est le nom public du terminal propriétaire de trading simulé de WARIBA. Il remplace l’appellation active « WARIBA Trade » dans le produit et la documentation. La route technique `/trade` peut rester stable.

## 8. WariX — gestion visuelle de position

WariX affiche la position et ses niveaux Stop Loss / Take Profit directement sur le graphique, modifiables par glissement (avec alternative clavier et saisie de prix exact), un menu contextuel manuel au clic droit (appui long sur mobile, bottom sheet tactile) et une clôture partielle par pourcentage ou quantité personnalisée. L’exécution reste exclusivement server-authoritative. Depuis l’Appendice 07-D, WariX propose aussi des ordres en attente Achat/Vente Limit/Stop (GTC, avec Stop Loss / Take Profit optionnels attachés dès la création) et des alertes de prix par franchissement de seuil, déclenchés sur tick réel côté serveur, avec centre de notifications ; le menu contextuel desktop et son équivalent mobile exposent les mêmes actions. Voir DECISION_LOG.md, UX-TRADING-001 à 009, TRADING-ORDER-001 à 005, TRADING-ALERT-001 à 003.
