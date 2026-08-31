# WARIBA PRODUCT OS · MASTER CONSTITUTION 2026
## Product, UX, UI, Lifecycle, WariX, Trader Hub, Commerce, Risk, KYC, Payout, Control, Mobile & QA

> **Statut : MASTER CANDIDATE v2.0**  
> **Date de référence : 27 août 2026**
> **Langue produit V1 : Français**  
> **Portée : Site public, Auth, Commerce, Trader Hub, WariX, Risk, Performance, KYC, Payout, WARIBA Review, WARIBA Control, Design, Mobile, Accessibilité, Sécurité, Analytics, QA et règles d’exécution pour agents IA.**  
> **Principe : ce document orchestre le produit ; il ne remplace jamais une policy financière, un contrat, une règle légale ni une décision `LOCKED`.**
> **Policy courante : `POLICY-GOV-003` fait du Rulebook V2 et du Canonical Policy Contract V2 la vérité des nouvelles offres. Toute valeur V1 de cette constitution est version-scopée et ne peut guider un nouveau compte V2.**

---

# 0. Pourquoi ce document existe

WARIBA ne doit plus évoluer comme une collection de pages et de composants développés indépendamment.

Le produit doit se comporter comme un seul système cohérent :

```text
SITE PUBLIC
    ↓
AUTHENTIFICATION
    ↓
OFFRES / CHECKOUT
    ↓
TRADER HUB
    ↓
WariX
    ↓
ÉVALUATION
    ↓
RÉUSSITE EN VÉRIFICATION
    ↓
WARIBA PERFORMANCE
    ↓
ÉLIGIBILITÉ PAYOUT
    ↓
KYC / COMPLIANCE
    ↓
PAYOUT
    ↓
WARIBA REVIEW
```

Ce document fixe :

- ce que chaque surface possède ;
- ce qu’elle ne possède pas ;
- le parcours complet du trader ;
- la hiérarchie visuelle ;
- la langue ;
- les états ;
- les interactions ;
- les routes ;
- les rails WariX ;
- le design premium ;
- les règles mobile ;
- les machines d’état backend ;
- l’idempotence ;
- le contrôle humain ;
- la sécurité ;
- les critères d’acceptation ;
- la méthode de travail de Codex, Claude ou toute autre équipe.

La règle générale est simple :

> **Une capacité = un propriétaire = une vérité = un langage = une action principale.**

---

# 1. Autorité et hiérarchie des décisions

En cas de conflit, l’ordre suivant s’applique :

1. droit applicable ;
2. contrats et conditions acceptées ;
3. `docs/00-decisions/DECISION_LOG.md` ;
4. Rulebook / Account Policy publiée ;
5. modèle financier et modèle actuariel ;
6. Product Master ;
7. architecture UX et design system verrouillés ;
8. Engineering Constitution, Security, QA et Ops ;
9. le présent document ;
10. Build Plan et Prompt Pack ;
11. code existant.

Le document NE DOIT PAS inventer :

- un prix public définitif ;
- une politique de reset ;
- une politique de remboursement ;
- un provider réel ;
- un droit d’affichage market data ;
- un délai de payout ;
- un délai KYC ;
- une règle de trading pendant un payout ;
- une promesse de compte réel.

Toute décision encore non approuvée doit rester `OPEN`.

---

# 2. Décisions produit fondamentales

## D1 — Trader Hub et WariX sont deux produits visuels différents

### Trader Hub
Espace de gestion, compréhension, progression et prochaines actions.

### WariX
Terminal de trading immersif, dense, orienté graphique et exécution.

Ils partagent : identité, comptes, policies, permissions, risk, données, notifications et read models.

Ils NE partagent PAS le même shell, la même navigation, le même niveau de densité ni les mêmes composants de page.

## D2 — Dashboard = accueil du Trader Hub

```text
Trader Hub = espace complet authentifié
Dashboard = /hub = home du Trader Hub
```

## D3 — WariX n’est jamais une surface commerciale

WariX NE DOIT PAS contenir : facturation, moyens de paiement, achat inline, formulaire payout complet, KYC complet, page comptes globale, catalogue d’offres, reset commercial, affiliation ou marketing agressif.

WariX PEUT afficher un statut, une projection, un message bloquant et un CTA vers la vraie surface propriétaire.

## D4 — Après login, la destination par défaut est `/hub`

Sauf intention sûre déjà exprimée :

```text
/offres → choix plan → signup/login → retour checkout du même plan
```

## D5 — WARIBA V1 reste simulé

Programme canonique :

```text
WARIBA ONE → WARIBA Performance → WARIBA Review
```

**WARIBA Performance est simulé en V1.** L’interface ne promet jamais capital réel automatique, compte live garanti, allocation après réussite, salaire ou emploi.

## D6 — Réussite ≠ activation immédiate

```text
active → pass_pending → reviewEligibleAt → automated_checks → manual_review si nécessaire → approved → passed → activation Performance
```

Le navigateur ne calcule jamais « ce soir ». Le serveur fournit un timestamp exact.

## D7 — KYC au premier payout financièrement éligible, sauf obligation plus précoce

Politique produit par défaut :

```text
financially_eligible → KYC required → verified → eligibility recalculated → ready_to_request
```

Exception : si le droit applicable, le PSP, un provider, une obligation AML/sanctions, un pays ou Compliance exige une vérification plus tôt, le KYC PEUT être avancé. Cette exception doit être documentée, auditable et pilotée par policy.

## D8 — Breach immuable

```text
breached → terminal
```

Un éventuel reset futur crée une nouvelle commande, un nouveau compte, un nouvel identifiant et une nouvelle piste d’audit. Il ne réactive jamais l’ancien compte.

## D9 — Add Account est une action, pas une destination égale aux autres

Dans Trader Hub :

- **Comptes** = destination ;
- **Ajouter un compte** = CTA fort.

## D10 — Trading pendant un payout = `OPEN`

Le produit ne décide pas encore si une demande payout bloque tout trading, bloque uniquement l’augmentation d’exposition, gèle seulement le cycle, autorise le cycle suivant ou suspend jusqu’à review.

```text
PAYOUT_TRADING_FREEZE_POLICY = OPEN
```

Aucune UI ne doit inventer ce comportement.

---

# 3. Vocabulaire produit canonique

| Interne | Français utilisateur | Interdit / à éviter |
|---|---|---|
| `WARIBA_ONE` | Évaluation WARIBA ONE | Challenge partout |
| `WARIBA_PERFORMANCE` | Compte WARIBA Performance | Funded réel |
| `pass_pending` | Réussite en vérification | Réussi immédiatement |
| `soft_locked` | Blocage quotidien | Breach quotidien |
| `breached` | Limite maximale dépassée | Banni |
| `payout` | Payout | Salaire |
| `financially_eligible` | Conditions financières remplies | Payout disponible |
| `ready_to_request` | Prêt à demander | Argent garanti |
| `KYC` | Vérification d’identité | Validation garantie |
| `Review` | WARIBA Review | Live automatique |
| `simulated nominal` | Taille nominale simulée | Dépôt |
| `account` | Compte de trading | Compte bancaire |
| `reset` | Recommencer avec un nouveau compte | Effacer l’échec |

Règles de rédaction : français simple, une phrase = une idée, bouton = verbe + objet, dates critiques absolues, fuseau affiché, aucun jargon inutile, aucun mélange anglais/français dans les messages critiques, aucune célébration casino.

---

# 4. Programme historique V1 à refléter uniquement pour un compte V1

> Les calculs restent autoritaires dans la policy attachée au compte et le moteur de risque. Les tableaux de cette section décrivent uniquement V1. Pour une nouvelle offre ou un futur compte V2, utiliser `docs/02-program/WARIBA_Canonical_Policy_Contract_V2.md`; ne pas remplacer les nombres ici et ne pas les propager vers V2.

## WARIBA ONE

| Règle | Valeur |
|---|---:|
| Phases | 1 |
| Objectif | 10 % de profit réalisé |
| Daily Loss Limit | 3 %, soft lock |
| Maximum Loss | 10 %, trailing EOD |
| Best Day Rule | 50 %, condition de passage |
| Jours minimums | 0 |
| Durée | Illimitée sous policy d’inactivité |
| Inactivité actuelle | 30 jours calendaires |
| Frais activation après réussite | 0 |

## WARIBA Performance

| Règle | Valeur |
|---|---:|
| Nature | Simulée |
| Daily Loss Limit | 3 %, soft lock |
| Maximum Loss | 10 %, trailing EOD |
| Best Day Rule | 50 % par cycle |
| Buffer permanent | 10 % nominal |
| Performance Days | 5 nouvelles journées par payout |
| Seuil Performance Day | 0,50 % nominal net réalisé |
| Payout #1–#4 | 85 % trader / 15 % WARIBA |
| Payout #5 | 90 % trader / 10 % WARIBA |
| Après #5 | WARIBA Review |
| Durée minimale actuelle d’un trade profitable éligible | 60 s |

---

# 5. Architecture globale du produit

```text
WARIBA
├── Public
│   ├── Accueil
│   ├── Offres
│   ├── Programme
│   ├── Règles
│   ├── Découvrir WariX
│   ├── Confiance
│   ├── Aide
│   └── Légal
├── Auth
│   ├── Login
│   ├── Inscription
│   ├── Vérification email
│   ├── Mot de passe oublié
│   ├── Récupération
│   └── Session expirée
├── Commerce
│   ├── Checkout
│   ├── Paiement
│   ├── Confirmation
│   └── Activation
├── Trader Hub
│   ├── Dashboard
│   ├── Comptes
│   ├── Performance
│   ├── Payouts
│   ├── Facturation
│   ├── Notifications
│   ├── Profil
│   ├── Paramètres
│   └── Support
├── WariX
│   ├── Trading
│   ├── Performance session
│   ├── Risk Center
│   ├── Settings
│   └── Aide WariX
└── WARIBA Control
    ├── Pass Reviews
    ├── KYC / Compliance
    ├── Payout Reviews
    ├── Risk / Breaches
    ├── Disputes
    ├── Accounts
    ├── Incidents
    └── Audit
```

---

# 6. Routes canoniques

## Public
`/`, `/offres`, `/programme`, `/regles`, `/warix`, `/confiance`, `/aide`, `/support`, `/status`, `/legal/conditions`, `/legal/confidentialite`, `/legal/risques`.

## Auth
`/login`, `/inscription`, `/verification-email`, `/mot-de-passe-oublie`, `/recuperation`, `/session-expiree`.

## Commerce
`/checkout?plan={productVersionId}`, `/checkout/success`, `/checkout/echec`, `/bienvenue?order={publicId}`.

## Trader Hub
`/hub`, `/comptes`, `/comptes/{accountId}`, `/performance`, `/payouts`, `/facturation`, `/notifications`, `/profil`, `/parametres`, `/support`, `/plus`.

## WariX
La route technique reste `/trade?account={accountId}`.

Le workspace interne doit être sérialisable :

```text
/trade?account=abc&view=trading
/trade?account=abc&view=performance
/trade?account=abc&view=risk
/trade?account=abc&view=settings
/trade?account=abc&view=help
```

Invariant critique : changer de `view` NE DOIT PAS provoquer inutilement remount TradeChart, perte viewport, reset zoom, perte drawings/indicators/crosshair, perte order draft, reload history évitable ou perte symbol selection.

---

# 7. Vision visuelle WARIBA 2026

WARIBA doit ressembler à un produit financier premium moderne, sérieux, rapide et propriétaire, pas à un template SaaS, un clone prop firm, un casino ou une interface IA générique.

Références d’intention : densité de TradingView, clarté prop-firm de Topstep, segmentation de Tradeify, profondeur matérielle de produits Apple récents, micro-interactions calmes inspirées de SwiftUI, identité WARIBA propre.

**Ne jamais copier de SVG, logo, composant ou artwork propriétaire.** Réutiliser uniquement conventions universelles, patterns familiers et silhouettes sémantiques.

---

# 8. Design language premium

## Materials

- Canvas/chart : très sombre, niveau le plus profond.
- Workspace surfaces : graphite/navy sombre, séparation subtile.
- Interactive elevated : menus, drawers, cards, modals, active tiles.

Préférer border 1 px, différences de luminance, blur discret et glow seulement sur état actif important.

## Palette sémantique cible

```text
--bg-root             #05070B
--bg-canvas           #03060A
--surface-1           #0B1018
--surface-2           #111827
--surface-3           #182233
--border-soft         #202A3A
--border-strong       #334155
--text-primary        #F5F7FA
--text-secondary      #B4BECC
--text-muted          #7F8A9A
--cobalt              #5B7CFF
--cyan-market         #45C7E8
--emerald-positive    #35C98A
--coral-negative      #F16D72
--amber-warning       #E9AD49
--copper-wariba       #D8845B
```

Ces valeurs sont des rôles à mapper sur les tokens existants, pas une permission pour casser une palette déjà verrouillée.

---

# 9. Typographie

| Usage | Desktop | Mobile |
|---|---:|---:|
| Display marketing | 48–72 | 36–48 |
| Page H1 | 32–40 | 26–32 |
| Section title | 20–24 | 18–22 |
| Card metric | 28–40 | 24–34 |
| Body | 14–16 | 14–16 |
| Dense terminal | 12–14 | 12–14 |
| Micro labels | 10–12 | 10–12 |

Prix, PnL, balance, seuils et timestamps utilisent chiffres tabulaires.

---

# 10. Iconographie WARIBA

Les icônes doivent être immédiatement reconnaissables, grandes, cohérentes, dessinées sur grille et familières aux traders.

## Taille optique minimum

| Zone | Hit target | Glyphe optique |
|---|---:|---:|
| Rail global WariX | 48–52 | 27–30 |
| Rail dessin | 42–46 | 24–27 |
| Rail droit | 44–48 | 26–29 |
| Hub sidebar | 44 | 22–24 |
| Toolbar | 40–44 | 22–24 |
| Bottom nav mobile | 48–56 | 28–32 |

**Aucun rail important ne doit retomber à des glyphes 18–20 px difficiles à lire.**

Style : stroke 1.8–2.2 px, silhouette lisible, détails limités, active state material/cobalt, pas d’animation décorative permanente.

---

# 11. Images, illustrations et actifs visuels

## Site public
Captures réelles de WariX, compositing de vrais écrans WARIBA, illustrations abstraites propriétaires liées au trading/risk, mockups device sobres, textures de grille/data.

## Trader Hub
Principalement UI native ; pas de photos stock ; illustrations vectorielles légères pour empty states.

## WariX
Aucune illustration marketing dans le workspace ; chart et données sont le contenu visuel principal.

## Aide
Captures produit annotées, courtes vidéos, diagrammes et mini tutoriels.

Interdit : faux témoignages, faux traders, billets/Lamborghini, gains garantis, faux chiffres présentés comme réels, image IA comme preuve.

---

# 12. Identité visuelle des instruments

Markets, recherche, watchlist et sélecteurs utilisent une identité instrument cohérente.

### FX
Médaillon principal 26–30 px avec symbole/code devise + badge secondaire 11–14 px. Exemple : `[€]` + badge `[$]`, `EURUSD`, `Euro / Dollar US`.

### Métaux
`[Au] XAUUSD Or / Dollar US`, teinte gold légère.

### Indices
Pictogramme de marché/indice ou monogramme, ex. `NAS100`.

Aucun emoji ni faux artwork de marque.

---

# 13. Motion system

| Usage | Durée |
|---|---:|
| Press feedback | 80 ms |
| Fast interaction | 140 ms |
| Standard | 180 ms |
| Drawer / sheet | 220 ms |
| Major state/page | 240 ms |

Règles : aucune animation longue sur prix, drawer depuis sa zone d’origine, sheet mobile spring contrôlée, aucun confetti payout, breach sans shake, reduced-motion quasi instantané.

---

# 14. Site public

Navigation : `Offres`, `Fonctionnement`, `Règles`, `WariX`, `Confiance`, `Aide`, avec `Se connecter` et `Commencer`.

Homepage : Hero → preuve produit WariX → fonctionnement → règles → confiance/sécurité → ONE→Performance→Review → offres → FAQ → legal/risk.

Hero recommandé :

> **Tradez avec discipline. Prouvez votre performance.**  
> Évaluez votre stratégie dans un environnement simulé avec des règles transparentes et un terminal propriétaire.

CTA : `Voir les offres`, `Découvrir WariX`.

---

# 15. Auth Experience Blueprint

Toutes les pages Auth utilisent une famille visuelle commune.

## Desktop

```text
┌──────────────────────────────┬──────────────────────────────┐
│ WARIBA                       │ Connexion                    │
│ Visual product-native       │ Email                        │
│ WariX / data / material     │ Mot de passe                 │
│ message de confiance        │ [Se connecter]               │
│                              │ Mot de passe oublié          │
│                              │ Créer un compte              │
└──────────────────────────────┴──────────────────────────────┘
```

Le visuel gauche doit être un crop WariX/data propriétaire, pas une photo stock.

## Mobile
Une colonne, formulaire au-dessus du fold, pas d’illustration envahissante.

## Login
États : idle, validating, submitting, invalid credentials, session expired, service unavailable, security hold, success.

## Signup
Prénom, nom, email, pays, mot de passe, consentements nécessaires. Pas de KYC complet par défaut.

## Mot de passe oublié
Toujours : « Si un compte correspond à cette adresse, vous recevrez les instructions. »

## Récupération
Nouveau mot de passe, confirmation, strength meter utile, lien expiré/déjà utilisé, réussite.

## Session expirée
« Votre session a expiré. Reconnectez-vous pour continuer. » Préserver `next` sûr.

---

# 16. returnTo / next

Le serveur accepte seulement chemin relatif commençant `/`, route allowlistée, query params autorisés, aucun protocol/host/secret.

```text
/offres → choisir 50K → /inscription?returnTo=/checkout?plan=prod_50k_v3 → vérification → checkout du même plan
```

---

# 17. Offers Experience

Objectif : comprendre, comparer, décider, voir les règles importantes avant checkout.

## Desktop recommandé

```text
Choisissez votre évaluation

[25K] [50K] [100K] [150K]

┌────────────────────────────┬───────────────────────────────┐
│ CONFIGURATION              │ RÉCAPITULATIF                │
│ Taille                     │ WARIBA ONE 50K               │
│ règles/options réelles     │ Prix                          │
│                            │ Target / DLL / MLL / Best Day │
│                            │ Activation : 0                │
│                            │ [Choisir cette évaluation]    │
└────────────────────────────┴───────────────────────────────┘
```

Une carte de comparaison montre taille, prix publié, objectif, DLL, MLL, Best Day, activation gratuite, durée, CTA. Pas de prix barré inventé.

Mobile : selector horizontal accessible, summary sticky si utile, pas de table illisible.

---

# 18. Checkout Experience

## Desktop

```text
┌─────────────────────────────┬──────────────────────────┐
│ Paiement                    │ Résumé                   │
│ identité minimale           │ WARIBA ONE 50K          │
│ moyen de paiement           │ prix / règles clés      │
│ consentements               │ simulé / activation 0   │
│ [Payer]                     │                          │
└─────────────────────────────┴──────────────────────────┘
```

Le prix vient du serveur. Le retour navigateur du provider ne confirme jamais le paiement.

État inconnu : « Nous vérifions le paiement. Ne payez pas une seconde fois. »

---

# 19. Trader Hub — Shell

## Desktop expanded
Largeur cible 252–276 px.

```text
WARIBA
Dashboard
Comptes
Performance
Payouts
Facturation
Support

[+ Ajouter un compte]

Profil
Paramètres
Déconnexion
```

## Collapsed
68–76 px, grands glyphes, active state, tooltips, CTA add-account transformé en `+` explicite.

État expanded/collapsed mémorisé par utilisateur. Ne jamais réduire les icônes pour gagner de la place ; réduire la largeur/texte.

---

# 20. Trader Hub — Header

Nom page, account selector si pertinent, état service compact, notifications, user menu, CTA `Ouvrir WariX` si contexte consultable/tradable.

---

# 21. Dashboard — philosophie

Le Dashboard répond en 10 secondes : quel compte, quel état, quelle prochaine action, où est le risque, où est la progression, dois-je agir ?

**Ce n’est pas une grille de 12 cartes égales.**

---

# 22. Dashboard — Évaluation active

```text
┌───────────────────────────────────────────────────────────────┐
│ Bonjour            ONE 50K ▾              [Ouvrir WariX]     │
├───────────────────────────────────────────────────────────────┤
│ ÉVALUATION ACTIVE                                             │
│ +$1 820 / +$5 000                36,4 %                      │
│ ███████████░░░░░░░░░░                                        │
│ Prochaine action : Protégez votre marge quotidienne.          │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│ Balance      │ DLL restante │ MLL restante │ Best Day         │
├────────────────────────────────────┬──────────────────────────┤
│ COURBE DU COMPTE                   │ RISQUE / HEALTH          │
├────────────────────────────────────┴──────────────────────────┤
│ MILESTONES / ACTIVITÉ / RÈGLES IMPORTANTES                   │
└───────────────────────────────────────────────────────────────┘
```

---

# 23. Account Health Score

Option autorisée si explicable. Jamais opaque.

Facteurs possibles : distance DLL, distance MLL, concentration Best Day, overtrading, cohérence tailles, fréquence d’erreurs, respect limites personnelles.

CTA : `Pourquoi ce score ?`.

---

# 24. Dashboard — aucun compte

```text
Commencez avec une évaluation WARIBA ONE
WariX devient disponible dès qu’un compte simulé est activé.
[Choisir une évaluation]
[Comprendre les règles]
```

Aucun faux solde ni faux chart tradable.

---

# 25. Dashboard — paiement / activation

Pending : « Paiement en attente de confirmation. » CTA `Vérifier le statut`.

Paid/activation : « Paiement confirmé. Nous préparons votre compte. » Timeline `Commande ✓ → Paiement ✓ → Préparation ● → Activation ○`.

---

# 26. Dashboard — soft lock

```text
BLOCAGE QUOTIDIEN
Les nouvelles expositions sont bloquées jusqu’au :
23 août 2026 · 00:00 UTC
[Voir les actions autorisées]
[Voir la règle]
```

Pas de CTA commercial agressif.

---

# 27. Dashboard — pass_pending

Le Dashboard se transforme :

```text
✓ Objectif atteint
RÉUSSITE EN VÉRIFICATION
Votre trading est temporairement en lecture seule.

✓ Objectif
✓ Daily Loss
✓ Maximum Loss
✓ Best Day
● Finalisation de la journée
○ Contrôles
○ Activation Performance

Vérification possible à partir du : date + heure + fuseau
[Suivre la vérification]
[Voir la preuve]
```

---

# 28. Dashboard — passed / Performance activation

`ÉVALUATION VALIDÉE` puis `Votre compte WARIBA Performance est en préparation. Aucun frais d’activation.`

Si activation technique échoue, afficher `performance_activation_pending`, jamais renvoyer vers achat.

---

# 29. Dashboard — Performance active

```text
WARIBA PERFORMANCE · Cycle payout #1
Mission du cycle
Buffer permanent
Performance Days
Best Day
Profit éligible
Progression payout
[Ouvrir WariX]
[Voir la progression payout]
```

---

# 30. Dashboard — financially eligible / KYC

```text
CONDITIONS FINANCIÈRES REMPLIES
Votre progression permet de continuer vers le payout.
● Vérification d’identité requise
○ Méthode payout
○ Recalcul final
[Vérifier mon identité]
[Voir le calcul]
```

---

# 31. Dashboard — breached

```text
ÉVALUATION TERMINÉE
Votre limite maximale a été dépassée le {date + heure}.
Le compte reste consultable en lecture seule.
[Voir le détail]
[Ouvrir une contestation]
```

Pas de gros rouge plein écran ni reset inventé.

---

# 32. Comptes

Liste premium avec programme, taille, statut, balance/equity pertinente, objectif, distance MLL, dernière activité, prochaine action et CTA WariX/statut.

Filtres : `Tous`, `Évaluations`, `Performance`, `Terminés`.

---

# 33. Ajouter un compte

Le CTA Hub mène vers `/offres`. Pas de deuxième implémentation pricing dans Hub.

---

# 34. Performance Hub

Route `/performance` : analyse multi-session, journal, stats, comportements, comparaison de périodes.

Métriques : net PnL, win rate, avg win/loss, profit factor, expectancy, best/worst day, duration, instruments, sessions, distribution, discipline.

WariX Performance reste une projection session/compte courant.

---

# 35. Payouts

Route `/payouts` = propriétaire complet.

```text
Payout
Compte Performance 50K ▾
Cycle #1
CHECKLIST
✓ Buffer
✓ Best Day
✓ Performance Days
✓ Positions fermées
● KYC
○ Méthode payout
○ Recalcul final
CALCUL
Profit éligible / Cap / Split / Estimation
[Action principale]
```

---

# 36. Payout Readiness Checklist

Au-delà du KYC : trading conditions, buffer, performance days, best day, positions/orders, KYC, country eligibility, sanctions/compliance, beneficiary match, payout method, integrity hold, policy version, fresh calculation.

---

# 37. KYC

```text
not_required → required → in_progress → pending_review → verified
in_progress|pending_review → action_required → in_progress
→ failed_retryable → failed_final
verified → expired → reverification_required
```

UX : checklist claire, étapes provider/policy, aucune donnée sensible inutile dans l’UI.

---

# 38. Re-KYC

Seulement avec reason code : expiration, règle légale, changement identité, beneficiary, payout method, risk signal, dossier ancien insuffisant. Pas à chaque payout automatiquement.

---

# 39. Payout state UI

| Statut | UI |
|---|---|
| ready | Demander |
| pending_review | En vérification |
| needs_information | Action requise |
| approved | Approuvé |
| processing | Transfert en cours |
| paid | Payé |
| failed | Échec du transfert |
| returned | Retourné |
| reversed | Correction auditée |

`approved ≠ paid`, `processing ≠ paid`.

---

# 40. Facturation

Sections : achats/abonnements, moyens de paiement, commandes, reçus, remboursements si policy. Aucun numéro de carte complet.

---

# 41. Profil

Prénom/nom, pays, langue, timezone, préférences communication et identité applicative non-KYC.

---

# 42. Paramètres Hub

Sécurité, Sessions, Langue, Fuseau, Notifications, Confidentialité, Appareils, Accessibilité.

---

# 43. Notifications

Route `/notifications`. Header Hub + header WariX utilisent le **même centre**. Catégories : Compte, Risk, Paiement, KYC, Payout, Sécurité, Système.

---

# 44. Support

Recherche, Help Center, tickets, incidents, contestations, références dossier. WariX Help = aide contextuelle uniquement.

---

# 45. WariX — architecture générale

```text
┌──────────┬──────────┬──────────────────────────┬──────────┐
│ Global   │ Drawing  │ Header + Chart           │ Utility  │
│ Rail     │ Rail     │                          │ Rail     │
├──────────┴──────────┴──────────────────────────┴──────────┤
│ Bottom Dock                                             │
└──────────────────────────────────────────────────────────┘
```

---

# 46. WariX Global Rail — gauche extérieur

Destinations : Trading, Performance, Risque, Paramètres, Aide. Zone basse : Retour Trader Hub, Déconnexion.

Largeur cible indicative : collapsed 64–72 px, expanded/pinned optionnel 210–240 px. Glyphes 28–30 px.

Ne contient jamais Comptes, Payouts, Billing, Achat, Notifications, Markets ou Order ticket.

---

# 47. WariX Drawing Rail

Outils chart uniquement : cursor, crosshair, trend lines, horizontal/vertical/ray, channels, Fibonacci, shapes, brush, text si supporté, measure, zoom, magnet, lock, visibility, object tree, delete, favorites.

Design : rail 54–58 px, hit 42–46, glyph 24–27, groupes, separators, negative space, flyouts lisibles avec label.

---

# 48. WariX Right Utility Rail

Destinations autorisées : Marchés, Trader, Alertes, Calendrier, Calculateur de risque si livré, DOM si capability, Screener si capability.

Interdits : Activity, Journal complet, Help global, Billing, Payout, Accounts, Profile, Settings.

Design : 52–58 px, glyphes 26–29, beaucoup de negative space, active material visible, tooltips.

---

# 49. Right drawer behavior

Un seul drawer à la fois. Desktop : chart + drawer 300–360 + rail. Laptop : 280–340 ou overlay. Mobile : sheet dédiée. Ouverture/fermeture ne remount pas le chart.

---

# 50. Markets Drawer

Search, favorites, catégories, mini-cards instruments, bid/ask si disponible réel, spread, source/status, stale/closed/unavailable.

Mini-card exemple :

```text
[€][$] EURUSD                ★
Euro / Dollar US
BID 1.16759   ASK 1.16769   SPR 0.00010
● Périmé
```

Si bid/ask indisponible : label explicite `Indisponible`, pas de tirets ambigus.

---

# 51. Trader Drawer

Ticket canonique unique : Instrument, Bid/Ask, Order type, Quantity, Price si pertinent, SL, TP, Impact, Permissions/restriction, Submit. Les CTA Buy/Sell du chart utilisent ce même ticket.

---

# 52. Alerts Ownership

- Toolbar chart = raccourci contextuel « Créer une alerte à ce prix/niveau ».
- Right Rail = propriétaire création/gestion des alertes actives.
- Bottom Dock = journal triggered/expired/failed/history.

Aucun quatrième chemin.

---

# 53. WariX Bottom Dock

Tabs : Positions, Ordres, Exécutions, Alertes, Compte.

Desktop : collapsed 38–44, expanded 180–280 selon viewport. Mobile : action persistante `Activité` + sheet.

---

# 54. WariX Header

Account selector, account status, symbol/search, timeframe, chart type, indicators, chart preferences, undo/redo, snapshot, fullscreen, feed status, notifications, compact user menu si nécessaire.

Ne contient pas payout, billing, achat ou global account management.

---

# 55. Chart Preferences vs WariX Settings vs Risk Center vs Risk Calculator

## Chart Preferences
Rendu chart uniquement : candles, colors, grid, axes, crosshair, labels, timezone, sessions, scales.

## WariX Settings
Trading, Risk Controls personnels, Chart & Data, Hotkeys, Notifications, Privacy, Display, Advanced.

## Risk Center
DLL, MLL, policy, permissions, personal controls, lockout, blocked instruments, max quantity, max trades, personal target si supporté.

## Risk Calculator
Entry, stop, distance, quantity, risk $, risk %. Informatif, jamais autoritaire.

---

# 56. WariX Settings Blueprint

### Trading
Default order type/quantity, confirmations, one-click si policy, order sounds, bracket defaults.

### Risk Controls
Personal DLL, daily target, max trades, max quantity/contracts, blocked instruments, lockout, trailing personal limit si supporté. Chaque contrôle indique scope, effet, lock duration, reset et autorité.

### Chart & Data
Theme, candle, scale, timezone, sessions, data source status, stale behavior.

### Hotkeys
Searchable, conflicts, reset, disable, safety.

### Notifications
Sounds, trade confirmations, alerts, risk warnings.

### Privacy
Analytics preference si applicable, device info, privacy links.

### Advanced
Diagnostic read-only, connection, app version, clear local preferences, jamais secrets.

### Copy Trading
DEFERRED sauf moteur réel. Ne pas afficher onglet vide.

---

# 57. WariX Performance view

Projection session/compte courant : PnL session, win rate, average win/loss, trades, duration, top instrument, rule distance, timeline. CTA `Voir l’analyse complète` → `/performance`.

---

# 58. WariX Risk view

Priorité : statut, permissions, DLL, MLL, reset, personal controls, explanations.

---

# 59. WariX no-account empty state

Même shell WariX, pas de faux chart tradable :

```text
Commencez avec une évaluation WARIBA ONE
WariX devient disponible dès qu’un compte simulé est activé.
[Acheter une évaluation]
[Comprendre les règles]
```

CTA quitte WariX vers `/offres`.

---

# 60. WariX states

| Contexte | Chart | Order ticket |
|---|---|---|
| no account | empty | hidden |
| pending payment | status | disabled |
| activation | status | disabled |
| active | full | enabled per permissions |
| soft lock | chart | reduce/close only per server |
| pass_pending | read-only | disabled |
| Performance active | full | enabled |
| payout | **OPEN policy** | server permission snapshot |
| breached | read-only | disabled |
| inactive | read-only | disabled |
| closed | archive | disabled |
| stale | visible | increase exposure blocked |
| offline | safe cache | suspended |

---

# 61. Data freshness / « Prix obsolète »

Ne pas afficher un badge flottant vague au milieu du chart. Header feed status unique : `Live`, `Retardé`, `Périmé`, `Hors marché`, `Hors ligne`, `Resynchronisation`.

Popover : « Dernière mise à jour il y a 47 s. Les nouvelles expositions sont suspendues jusqu’à réception de données suffisamment récentes. »

---

# 62. Messages d’erreur premium

```ts
type UserFacingError = {
  code: string;
  title: string;
  message: string;
  whatWasNotDone: string;
  nextAction: { label: string; url?: string } | null;
  retryable: boolean;
  correlationId: string;
};
```

Design : surface 320–440 px desktop, padding 16–20, icon semantic, title 16, body 14, action claire, référence support secondaire, jamais stack trace.

---

# 63. Messages français prioritaires

**Prix non actualisé** — « Les données sont trop anciennes pour ouvrir une nouvelle exposition. Nous reconnectons le flux. »

**Connexion perdue** — « Le trading est suspendu jusqu’à la resynchronisation. »

**Session expirée** — « Reconnectez-vous pour continuer. »

**Paiement en vérification** — « Ne payez pas une seconde fois. Nous vérifions le statut. »

**Vérification toujours en cours** — « Votre dossier reste ouvert. Aucune action n’est requise pour le moment. »

---

# 64. French-first i18n Constitution

V1 produit : `fr`.

Interdit : textes critiques hardcodés dans les composants. Utiliser clés partagées telles que `auth.login.invalid`, `account.status.pass_pending`, `risk.daily_loss.locked`, `payout.status.processing`.

Le frontend reçoit des codes métier, pas du texte incohérent libre. Localiser dates, nombres, devises, pluriels et fuseaux.

---

# 65. Lifecycle complet

```text
ANONYMOUS
→ SIGNUP / LOGIN
→ OFFER SELECTED
→ PURCHASE CREATED
→ PENDING PAYMENT
→ PAID
→ FULFILLED
→ PENDING ACTIVATION
→ ONE ACTIVE
→ [SOFT LOCK | BREACH]
→ PASS PENDING
→ PASS REVIEW
→ PASSED
→ PERFORMANCE ACTIVATION
→ PERFORMANCE ACTIVE
→ FINANCIALLY ELIGIBLE
→ KYC REQUIRED
→ VERIFIED
→ READY TO REQUEST
→ PAYOUT REQUESTED
→ PENDING REVIEW
→ APPROVED
→ PROCESSING
→ PAID
→ NEXT CYCLE
→ AFTER #5: WARIBA REVIEW
```

---

# 66. Pass Review

`active → pass_pending`. La transaction écrit status, snapshot conditions, policy, `reviewEligibleAt`, cause, audit et outbox. WariX devient lecture seule. Hub devient surface principale.

---

# 67. Finalisation de journée

Worker : lock job, vérifie account, finalise daily snapshot, recalcule conditions, vérifie breach/orders/data integrity, classifie, audit, outbox.

États : `scheduled`, `automated_checks`, `manual_review`, `action_required`, `approved`, `rejected`, `cancelled`.

---

# 68. Performance activation

À `approved` : `pass_pending → passed`, création Performance exactement une fois via `source_evaluation_account_id`. Si activation technique échoue : état dérivé `performance_activation_pending`.

---

# 69. Performance eligibility

Deux couches : `financially_eligible` et `ready_to_request`. Le second exige KYC, method, no hold, fresh data et toutes conditions actuelles.

---

# 70. Payout request

Transaction : request, eligibility snapshot, amount, cap, split, policy, restriction account/cycle selon policy, audit, outbox. Aucun appel provider dans transaction.

---

# 71. Payout provider

Worker : intent committed → submit provider → reference → webhook/reconcile → ledger once → status. Idempotency : `wariba-payout:{payoutRequestId}`.

---

# 72. Après payout #5

Cycle closes → Review case opens → aucun payout #6 automatique.

Message : « Votre compte entre dans WARIBA Review. Cette étape ne garantit pas une allocation de capital réel. »

---

# 73. WARIBA Review

Prévoir case ID, status, reasons, history, requested information, next action, expectedBy uniquement si contractuel et audit. Pas de promesse live.

---

# 74. WARIBA Control — architecture

Navigation staff : Overview, Pass Reviews, KYC / Compliance, Payouts, Risk / Breaches, Disputes, Accounts, Incidents, Audit, Settings. RBAC strict.

---

# 75. Control — Pass Review queue

Colonnes : trader ref, account, program, review status, eligibleAt, reason, risk flags, data integrity, age, owner.

Détail : Summary, Rule snapshot, Daily timeline, Trades, Orders, Risk events, Data integrity, Audit, Decision panel. Toute décision exige reason code.

---

# 76. Control — KYC queue

Staff voit uniquement nécessaire : status, provider reference, required checks, discrepancy categories, action required, timestamps. PII sensible masquée selon permission.

---

# 77. Control — Payout queue

Eligibility snapshot, cap, split, beneficiary, KYC, holds, cycle, rules, payout history, provider state, ledger state, second approval requirement.

---

# 78. Control — Breach / Dispute

Breach detail : règle, threshold, observed value, timestamp, policy version, sequence, trades, orders, market data, evidence, correlation IDs.

Dispute : trader statement, evidence, staff notes, decision, appeal path.

---

# 79. Backend aggregate model

Ne jamais créer un super statut unique.

```ts
type TraderJourneyView = {
  identity: IdentityView;
  purchase: PurchaseView | null;
  account: TradingAccountView | null;
  passReview: PassReviewView | null;
  kyc: KycView;
  payoutEligibility: PayoutEligibilityView | null;
  payout: PayoutView | null;
  review: WaribaReviewView | null;
  nextAction: NextAction;
};
```

---

# 80. Trading permissions

```ts
type TradingPermissions = {
  canOpenExposure: boolean;
  canIncreaseExposure: boolean;
  canReduceExposure: boolean;
  canCloseExposure: boolean;
  canPlacePendingOrder: boolean;
  canCancelPendingOrder: boolean;
  reasonCodes: string[];
  effectiveUntil: string | null;
};
```

---

# 81. Account state machine

```text
pending_activation → active|closed
active → soft_locked|pass_pending|inactive|breached|closed
soft_locked → active|breached|closed
pass_pending → passed|active|breached
inactive → active|closed
passed → terminal
breached → terminal
closed → terminal
```

`pass_pending → passed` réservé au review workflow.

---

# 82. KYC aggregate

KYC appartient à Identity/Compliance, pas au compte trading. Un dossier peut servir plusieurs comptes si policy le permet.

---

# 83. Audit record

```ts
type TransitionRecord = {
  aggregateType: string;
  aggregateId: string;
  from: string;
  to: string;
  command: string;
  actorType: 'trader' | 'staff' | 'system' | 'provider';
  actorId: string | null;
  reasonCode: string;
  policyVersionId: string | null;
  occurredAt: string;
  correlationId: string;
  idempotencyKey: string;
  evidenceRef: string | null;
  versionBefore: number;
  versionAfter: number;
};
```

---

# 84. Événements minimaux

`identity.user_registered.v1`, `identity.email_verified.v1`, `commerce.purchase_created.v1`, `commerce.payment_confirmed.v1`, `commerce.fulfillment_completed.v1`, `account.activation_completed.v1`, `account.soft_locked.v1`, `account.soft_lock_released.v1`, `account.breached.v1`, `evaluation.pass_pending.v1`, `evaluation.pass_review_started.v1`, `evaluation.pass_approved.v1`, `performance.account_activated.v1`, `performance.financially_eligible.v1`, `kyc.required.v1`, `kyc.submitted.v1`, `kyc.verified.v1`, `kyc.action_required.v1`, `payout.requested.v1`, `payout.information_required.v1`, `payout.approved.v1`, `payout.provider_submitted.v1`, `payout.paid.v1`, `payout.failed.v1`, `performance.review_opened.v1`.

---

# 85. Anti-duplication map

| Capacité | Propriétaire |
|---|---|
| Dashboard | Hub |
| Compte list | Hub |
| Ajouter compte | Offres/Commerce |
| Performance complète | Hub |
| Payout | Hub |
| Billing | Hub |
| Notifications | Centre global |
| Trading | WariX |
| Order ticket | Right drawer WariX |
| Positions | Bottom dock |
| Orders | Bottom dock |
| Executions | Bottom dock |
| Alert creation | Right rail |
| Alert log | Bottom dock |
| Chart preferences | Toolbar/chart |
| Risk state | Server + Risk Center |
| Risk calculator | Right utility |
| Help terminal | WariX Help |
| Support tickets | Hub Support |

---

# 86. Loading / Empty / Partial / Stale / Offline

Chaque page doit couvrir `loading`, `loaded`, `empty`, `partial`, `stale`, `offline`, `disabled`, `unauthorized`, `forbidden`, `read-only`, `error`, `maintenance`, `incident`.

Aucun faux chiffre dans skeleton.

---

# 87. Skeletons

Le skeleton imite la structure réelle, jamais des valeurs comme `$50,000`, `+$3,000`, `75%` en placeholder.

---

# 88. Stale

Afficher dernière mise à jour, impact, actions suspendues, retry automatique et détail.

---

# 89. Offline WariX

```text
Connection lost → suspend new exposure → preserve safe cache → reconnect → snapshot → missing events → reconcile → live
```

Le client ne reprend jamais juste parce que le WebSocket est revenu.

---

# 90. Mobile — philosophie

Mobile n’est pas desktop compressé. Tâche principale dominante, cibles tactiles ≥ 44 px, safe areas obligatoires.

---

# 91. Trader Hub mobile

Bottom nav : Hub, Comptes, WariX, Payouts, Plus. `Plus` contient Performance, Facturation, Notifications, Profil, Paramètres, Support, Déconnexion. Add Account = CTA dans page/header.

---

# 92. Dashboard mobile

Ordre : account selector → status hero → primary CTA → mission → metrics → risk → chart → activity. Pas six cartes horizontales.

---

# 93. WariX mobile

```text
Header compact
Market / timeframe / tools
Chart
[Trader] [Activité] [Marchés] [Plus]
```

Sheets : Trader, Activity, Markets, Tools, Alerts, Calendar si capability. Un seul sheet à la fois.

---

# 94. WariX mobile chart

Pas de rails permanents ; drawing tools et utilities deviennent sheets. Chart prioritaire, overlays tactiles, input exact alternatif au drag, safe areas.

---

# 95. Responsive breakpoints conceptuels

`320–479 Phone compact`, `480–767 Phone large`, `768–1023 Tablet`, `1024–1279 Laptop compact`, `1280–1599 Desktop`, `1600+ Wide workstation`.

---

# 96. Accessibilité

Cible WCAG 2.2 AA : landmarks, focus 2 px, keyboard, zoom 200 %, reflow 320, screen reader, field-linked errors, focus-trapped dialogs, keyboard tooltips, status not color-only, reduced motion, drag alternative, no aria spam on price ticks.

---

# 97. Sécurité

Server guards, ownership, deny by default. Staff : MFA, RBAC, least privilege, audit. Actions sensibles : reauth si nécessaire, reason, confirmation, optional dual approval, correlation ID.

---

# 98. Paiement / PSP gate

Production fermée tant que PSP contracté, webhook security, reconciliation, refunds locked, legal, secrets et support ne sont pas prêts.

---

# 99. Payout real gate

Aucun transfert réel avant KYC provider, payout rail/provider, beneficiary match, sanctions/compliance, ledger, finance approval, reconciliation, reserve, runbook, incident testing.

---

# 100. Market data licensing gate

Production WariX exige `MARKET_DATA_DISPLAY_RIGHTS = cleared` par source/instrument. Sinon dev/internal seulement.

---

# 101. Analytics

Événements produit : `offer_selected`, `auth_started`, `auth_completed`, `checkout_started`, `payment_status_viewed`, `account_activated`, `warix_opened`, `risk_detail_opened`, `soft_lock_viewed`, `breach_evidence_opened`, `pass_review_viewed`, `performance_activated`, `payout_eligibility_viewed`, `kyc_started`, `kyc_action_required_viewed`, `payout_requested`, `payout_status_viewed`, `support_opened`.

Analytics ne décide jamais un statut.

---

# 102. Ops metrics

Payment→fulfillment, fulfillment→activation, review delay, KYC funnel, payout cycle time, dead letters, retries, duplicate prevention, stale data, resync, notification delivery, support SLA si défini.

---

# 103. Visual QA matrix

Viewports : 320×568, 375×812, 390×844, 768×1024, 1024×768, 1280×720, 1366×768, 1440×900, 1920×1080.

Tester normal, loading, empty, error, disabled, stale, offline, read-only, attention, soft lock, breach, pass pending, Performance, KYC, payout review.

---

# 104. Screenshot evidence contract

Pour changement visuel majeur : référence → wireframe → première implémentation → screenshot → inspection → correction → screenshot final → acceptation humaine.

Ne pas lancer une certification de 3h après chaque déplacement de 4 px.

---

# 105. Fast Visual Loop

```text
implement → render → screenshot → inspect → correct → human acceptance
```

Tests minimum : render, targeted type, critical interaction, no obvious overflow. Full certification = milestone/end.

---

# 106. Full release QA

Avant release : unit, contracts, DB, RLS, integration, E2E, visual, a11y, security, concurrency, provider failure, offline, restore, load, audit.

---

# 107. E2E acquisition

- Visitor choisit plan → signup → même checkout.
- Login direct → `/hub`.
- Session expirée → login → safe return.
- Password reset ne révèle pas les comptes.

---

# 108. E2E commerce

Webhook replay, failed payment, delayed activation, double submit, wrong client price, refund state si policy existe.

---

# 109. E2E evaluation

Active, soft lock, reset serveur, breach, Best Day incomplete, pass pending, manual review, approved once.

---

# 110. E2E KYC

First eligibility, action required, retry, failed final, expired, re-KYC, legal early-KYC override policy.

---

# 111. E2E payout

Ready, double submit, pending review, needs info, approved not paid, provider timeout, retry same key, returned, reversed, payout #5 → Review.

---

# 112. E2E WariX

No account, active, drawer switching, chart state preserved, mobile sheets, stale, offline, reconnect, soft lock permissions, pass_pending read-only, breached read-only.

---

# 113. Visual acceptance criteria — Hub

Sidebar collapsible, Add Account CTA, Dashboard non plat, mission dominante, charts lisibles, account states recomposent la page, mobile recomposé, iconographie lisible, no English leakage, premium errors.

---

# 114. Visual acceptance criteria — WariX

Chart authority, trois rails sans doublon, icons ≥ optical target, chart state preserved, right drawer native, drawing tools reconnaissables, bottom dock dense, mobile sheets premium, stale/offline clear, pas de gros popup milieu chart sauf critique, français simple.

---

# 115. Visual acceptance criteria — Auth

Premium, no template feel, mobile first, errors inline, loading states, brand consistency, returnTo preserved, accessible password flows.

---

# 116. Visual acceptance criteria — Offers/Checkout

Prices readable, nature simulée explicite, rule comparison, no dark patterns, no invented discounts, mobile summary, payment state clear.

---

# 117. Open decisions registry

```text
OPEN-PRODUCT-001  Reset / repurchase policy
OPEN-PRODUCT-002  Refund policy
OPEN-PRODUCT-003  Max active accounts
OPEN-PRODUCT-004  Definitive public prices
OPEN-RISK-001     Trading during payout review
OPEN-KYC-001      Real KYC provider
OPEN-PAYOUT-001   Real payout provider
OPEN-PAYMENT-001  Production PSP
OPEN-DATA-001     Commercial display rights
OPEN-WARIX-001    DOM capability
OPEN-WARIX-002    Screener capability
OPEN-WARIX-003    Calendar/news provider
OPEN-PROGRAM-001  Any future real-capital program
```

Fail closed.

---

# 118. Implementation phases

## Phase 0 — Governance
Adopter v2, decision log supersession, freeze ownership, mark OPEN.

## Phase 1 — Shared contracts
TraderJourneyView, NextAction, TradingPermissions, reason codes, i18n keys, errors, notifications.

## Phase 2 — Auth / Commerce
ReturnTo, auth routes, offers, checkout, payment lifecycle, activation.

## Phase 3 — Trader Hub Shell
Premium sidebar, header, dashboard states, account selector.

## Phase 4 — Hub Product Surfaces
Accounts, Performance, Payouts, KYC, Billing, Profile, Settings, Notifications, Support.

## Phase 5 — WariX Semantic Shell
Global rail, drawing rail, right rail, alerts ownership, settings boundaries, no duplicate, preserve chart.

## Phase 6 — Lifecycle
Pass review, Performance activation, payout eligibility, KYC, payout, Review #5.

## Phase 7 — Control
Pass queue, KYC, payout, disputes, incidents.

## Phase 8 — Assurance
Full certification.

---

# 119. Codex / Claude execution constitution

Avant coding : lire sections concernées, inspecter code, decision log, lister contradictions, ne pas inventer OPEN, wireframe si shell/page majeure, implémenter un état représentatif, screenshot, inspecter, corriger, propager.

Interdit : redesign invisible sans screenshot, fake data, new local status, duplicate business logic, invent provider/price/delay, reopen accepted subsystem hors scope, tiny icons pour fit, hardcoded English critical text, full certification après chaque micro-fix.

---

# 120. Design-review questions obligatoires

1. Quel élément domine ?
2. Peut-on comprendre l’état en 5 secondes ?
3. Les actions ont-elles une hiérarchie ?
4. Les surfaces sont-elles distinctes sans trop de borders ?
5. Les cartes sont-elles justifiées ?
6. Les icônes sont-elles reconnaissables à 100 % zoom laptop ?
7. Le mobile a-t-il été recomposé ?
8. Le français est-il naturel ?
9. L’erreur dit-elle ce qui n’a pas été fait ?
10. Une animation aide-t-elle vraiment ?
11. Un trader expérimenté reconnaît-il les patterns ?
12. Un débutant comprend-il la prochaine action ?

Si une réponse importante est non : la page n’est pas terminée.

---

# 121. Product QA self-audit

## Architecture
- [ ] Hub et WariX séparés
- [ ] Dashboard = `/hub`
- [ ] Add Account = CTA
- [ ] WariX no commerce
- [ ] one owner per capability
- [ ] no duplicate alerts
- [ ] no duplicate settings
- [ ] chart state preserved

## Auth
- [ ] login
- [ ] signup
- [ ] email verify
- [ ] forgot
- [ ] recovery
- [ ] expired session
- [ ] returnTo
- [ ] open redirect protection

## Commerce
- [ ] offers
- [ ] compare
- [ ] checkout
- [ ] provider return non-authoritative
- [ ] idempotent payment
- [ ] fulfillment
- [ ] activation

## Hub
- [ ] no-account
- [ ] active ONE
- [ ] soft lock
- [ ] pass pending
- [ ] passed
- [ ] Performance
- [ ] KYC
- [ ] payout
- [ ] breached

## WariX
- [ ] global rail
- [ ] drawing rail
- [ ] right rail
- [ ] bottom dock
- [ ] settings
- [ ] risk
- [ ] stale
- [ ] offline
- [ ] mobile

## Backend
- [ ] separate aggregates
- [ ] permissions server
- [ ] pass review
- [ ] KYC
- [ ] payout
- [ ] outbox
- [ ] audit
- [ ] idempotency
- [ ] concurrency

## Compliance
- [ ] KYC default timing
- [ ] early legal override
- [ ] beneficiary
- [ ] sanctions
- [ ] privacy
- [ ] real payout gated

## UX
- [ ] premium
- [ ] icons big
- [ ] cards hierarchical
- [ ] motion
- [ ] reduced motion
- [ ] French first
- [ ] 320 px
- [ ] WCAG AA

---

# 122. Definition of Done

Le Product OS est prêt quand :

1. un trader ne confond jamais Hub et WariX ;
2. le login amène au bon endroit ;
3. l’intention d’achat survit à auth ;
4. aucun faux compte ne s’ouvre après un retour provider ;
5. Dashboard montre toujours état + prochaine action ;
6. Add Account reste une action claire ;
7. WariX reste centré trading ;
8. ses rails n’ont aucun doublon ;
9. ses icônes sont reconnaissables ;
10. chart state ne saute pas ;
11. ONE → pass review fonctionne ;
12. Performance activation est unique ;
13. KYC commence au bon moment ;
14. re-KYC est justifié ;
15. payout approved/processing/paid sont distincts ;
16. breach reste immuable ;
17. Review #5 est appliquée ;
18. Control peut traiter les exceptions ;
19. mobile 320 est complet ;
20. tous les textes critiques sont français ;
21. erreurs et loading sont premium ;
22. aucune décision OPEN n’est maquillée ;
23. policies restent autoritatives ;
24. observabilité et audit permettent de reconstruire un cas ;
25. visual acceptance humaine existe pour les surfaces sensibles.

---

# 123. Verdict

WARIBA doit être construit comme un **système d’exploitation du parcours trader** :

- le Site public explique et convertit sans dark pattern ;
- l’Auth protège l’intention et la confiance ;
- le Commerce confirme le paiement uniquement côté serveur ;
- le Trader Hub explique, organise et guide ;
- WariX concentre le trading ;
- le Risk Engine décide les permissions ;
- WARIBA Performance reste simulé en V1 ;
- le KYC intervient lorsque réellement requis ;
- le Payout Engine sépare éligibilité, review, provider et ledger ;
- WARIBA Review n’est jamais une promesse de capital réel ;
- WARIBA Control traite les exceptions avec RBAC et audit ;
- le Design System impose une expérience premium cohérente ;
- le Mobile conserve toutes les vérités importantes ;
- le Français est la langue produit V1 ;
- les décisions non résolues restent fermées.

Toute implémentation qui duplique une capacité, met Billing dans WariX, invente un reset, réouvre un breached, active Performance immédiatement, déclenche KYC sans policy, promet un compte réel, présente Approved comme Paid, remount le chart et perd l’état sans nécessité, réintroduit des micro-icônes illisibles, mélange anglais/français dans les erreurs, affiche un faux chiffre ou transforme une décision `OPEN` en comportement public **viole cette constitution**.

---

# 124. Component Grammar — cartes et mini-cartes

Le produit ne doit pas utiliser « une carte pour tout ».

## 124.1 Types de cartes autorisés

### Status Hero
Surface dominante d’une page, maximum une par viewport principal.

### Metric Tile
Petite surface pour une métrique isolée et secondaire.

### Mini-card instrument
Surface dense Markets/watchlist.

### Mission Card
Prochaine action / objectif principal.

### Evidence Card
Preuve d’un breach, revue ou payout.

### Configuration Card
Choix plan, risk setting, checkout.

### Empty-state panel
État sans données/action.

## 124.2 Règles

- ne pas aligner huit cartes de même poids ;
- une card doit avoir une raison de séparation ;
- une donnée associée à une autre préfère une ligne clé/valeur ;
- border radius compact 8–14 px selon surface ;
- inner padding 12–24 selon densité ;
- pas de glow sur toutes les cartes ;
- état actif peut utiliser material + border cobalt, jamais un gros contour néon.

---

# 125. Buttons, toggles et controls

## Hiérarchie

1. Primary — une seule action principale dans une zone.
2. Secondary — action alternative.
3. Tertiary / ghost — faible poids.
4. Destructive — seulement action irréversible.

## Dimensions

Desktop : 38–44 px de hauteur.  
Mobile : 44–52 px.

## Labels

Préférer :

- `Ouvrir WariX`
- `Ajouter un compte`
- `Vérifier mon identité`
- `Demander le payout`
- `Voir la règle`

Éviter : `Continuer` si l’objet de l’action peut être nommé.

## Toggle

Un toggle n’est utilisé que pour un état binaire immédiatement compréhensible. Une option réglementée ou risquée peut nécessiter description, confirmation et lock.

---

# 126. Forms premium

Chaque formulaire possède :

- label visible ;
- helper text si utile ;
- validation après interaction ;
- erreur inline ;
- résumé d’erreur si plusieurs champs ;
- loading stable ;
- disabled reason ;
- autofocus seulement si non intrusif ;
- support clavier ;
- auto-complete approprié ;
- aucun placeholder utilisé comme seul label.

Les formulaires financiers ou identity ne perdent jamais les données non sensibles lors d’une erreur réseau récupérable.

---

# 127. Tables et données denses

Utiliser tables pour :

- transactions ;
- orders ;
- executions ;
- billing history ;
- Control queues.

Desktop : sticky header si long, column alignment stable, numeric right alignment, row actions explicites.  
Mobile : transformer en list cards ou drill-down ; pas de table 9 colonnes avec scroll horizontal critique.

---

# 128. Modal, Drawer, Popover, Sheet

## Modal
Décision ou tâche isolée nécessitant focus.

## Drawer
Utilitaire contextuel persistent/adjacent au workspace.

## Popover
Information courte ou contrôle compact.

## Mobile Sheet
Tâche contextuelle sans quitter le workspace.

### Règles

- ne pas utiliser un modal pour une simple info ;
- ne pas empiler deux modals ;
- un seul drawer WariX ouvert ;
- un seul sheet mobile ouvert ;
- Escape ferme si sûr ;
- focus restauré ;
- swipe-to-close uniquement si aucune donnée critique non confirmée n’est perdue.

---

# 129. Toasts et feedback

Toast réservé aux confirmations non critiques :

- préférence enregistrée ;
- copie réussie ;
- alerte créée ;
- ordre annulé si le résultat est aussi visible ailleurs.

Jamais comme seul canal pour : breach, soft lock, KYC action required, payout rejected, payment uncertain, offline trading.

---

# 130. Notification delivery matrix

| Événement | In-app | Email | Toast |
|---|---:|---:|---:|
| Paiement confirmé | Oui | Oui | Non seul |
| Compte activé | Oui | Oui | Facultatif |
| Soft lock | Oui | Oui | Non seul |
| Breach | Oui | Oui | Non |
| Pass pending | Oui | Oui | Non |
| Pass approved | Oui | Oui | Facultatif |
| KYC action required | Oui | Oui | Non |
| KYC verified | Oui | Facultatif | Facultatif |
| Payout action required | Oui | Oui | Non |
| Payout approved | Oui | Oui | Non |
| Payout paid | Oui | Oui | Facultatif |
| Incident | Oui | Selon gravité | Non seul |
| Security | Oui | Oui | Non seul |

Un échec email ne rollback jamais l’événement métier.

---

# 131. Route guards

| Surface | Guard | Comportement |
|---|---|---|
| Public | Aucun | Accessible |
| Auth avec session | Session valide | Retour intention sûre ou `/hub` |
| Hub | Session trader | `/login?next=...` |
| WariX | Session + ownership | Own account ou empty state |
| Checkout | Session + produit disponible | Auth avec returnTo |
| Payout | Session + ownership | Checklist, pas faux 403 |
| KYC | Session + case ownership | Init seulement si autorisé |
| Control | Staff + MFA + permission | Deny by default |

Un identifiant étranger ne révèle jamais l’existence de l’objet.

---

# 132. Staff RBAC

## Support
Peut lire résumé, tickets et escalader. Ne peut pas approuver payout ni modifier règle.

## Risk
Peut examiner règles, breaches et preuves. Ne peut pas initier transfert financier.

## Finance
Peut traiter payout selon permission et dual-control policy. Ne peut pas modifier trade history.

## Integrity / Compliance
Peut examiner KYC et signaux selon besoin. Ne peut pas changer silencieusement règles financières.

## Technical
Peut diagnostiquer, opérer incident et kill switch selon permission. Pas d’approbation payout.

## Administrator
Aucune omnipotence implicite : permissions explicites obligatoires.

---

# 133. Idempotence

Clé idempotente obligatoire pour :

- checkout creation ;
- payment confirmation ;
- fulfillment ;
- account activation ;
- trade/order command ;
- close all ;
- pass review ;
- Performance activation ;
- KYC provider submission ;
- payout creation ;
- payout approval ;
- provider transfer ;
- cycle close.

---

# 134. Concurrency invariants

La base protège :

- un seul fulfillment par order ;
- un seul Performance account par source evaluation ;
- une seule Pass Review ouverte ;
- un seul payout actif par cycle ;
- un seul ledger debit par payout ;
- une seule idempotency key par scope ;
- optimistic versioning des agrégats modifiables.

---

# 135. Appels externes et reprise

Aucun appel réseau lent dans transaction DB.

```text
intent DB → commit → outbox → worker → provider → result → reconciliation
```

Jobs critiques : retries limités, backoff, dead-letter, heartbeat, alerting, reprise manuelle auditable.

---

# 136. Sources de vérité

| Fait | Source unique |
|---|---|
| Policy active | Policy resolver |
| Account state | Domain service + DB |
| Program type | Account contract |
| Trading permissions | Server snapshot |
| Review time | Pass Review workflow |
| Next reset | Risk/policy server |
| KYC | Identity/Compliance |
| Payout calculation | Performance/Payout domain |
| Payout status | Payout service |
| Billing | Commerce/payment domain |
| Notification | Shared notification service |
| Labels | Shared i18n/content module |

---

# 137. WariX chart visual constitution

Le chart est l’autorité visuelle du terminal.

## Grid
Très subtile, jamais plus forte que les candles.

## Candles
Corps net, wick fin, contraste suffisant. Les couleurs positive/négative doivent rester distinctes des couleurs d’interaction cobalt.

## Current price
Une seule représentation autoritative. Ne pas dupliquer bid/ask lines si le produit ne les nécessite pas.

## Crosshair
Fin, contrasté, non agressif, avec labels time/price clairs.

## Indicator legend
Top-left, compact, collapsible ; aucune card flottante massive.

## Trade overlays
Entry, SL, TP et PnL restent lisibles sans masquer candles critiques.

## Price scale
Toujours prioritaire sur markers décoratifs.

## Bottom time bar
Range presets, timezone, scale/log/auto selon capacités réelles.

---

# 138. WariX chart toolbar constitution

Ordre logique :

```text
Symbol/Search
Timeframes
Chart type
Indicators
Preferences
Alert shortcut
Undo/Redo
Snapshot
Fullscreen
```

Sur petits laptops, déplacer secondaire vers overflow plutôt que réduire les icônes à 16 px.

Mobile : montrer symbol, 3 timeframes prioritaires, overflow, indicators/tools ; le reste en sheet.

---

# 139. Global WariX rail icon semantics

Silhouettes recommandées, familières sans copier un concurrent :

- Trading : candlesticks / chart pane ;
- Performance : performance curve + points ;
- Risk : shield + threshold / gauge ;
- Settings : gear clair ;
- Help : question in speech/ring ;
- Hub : doorway/home/workspace arrow ;
- Logout : door + outward arrow.

Aucune icône abstraite impossible à identifier sans tooltip.

---

# 140. Right rail icon semantics

- Markets : watchlist rows + quote cells ;
- Trader : order ticket/document with check or arrows ;
- Alerts : price-level + signal marker ;
- Calendar : calendar grid ;
- Risk calculator : calculator + shield ;
- DOM : ladder/order book ;
- Screener : filter + chart.

Les glyphes de différentes destinations doivent avoir des silhouettes fondamentalement distinctes.

---

# 141. Drawing rail icon semantics

Chaque outil doit ressembler à l’objet qu’il crée :

- trend line = deux points + line ;
- horizontal = line horizontale ;
- channel = parallel lines ;
- Fibonacci = levels ;
- rectangle = rectangle ;
- brush = stroke ;
- ruler = ruler ;
- magnet = magnet ;
- lock = lock ;
- visibility = eye ;
- object tree = layers ;
- delete = trash.

Éviter les glyphes « artistiques » si un trader doit réfléchir à leur sens.

---

# 142. Hub multi-account behavior

Si plusieurs comptes :

- account selector persistant ;
- last selected mémorisé ;
- account-specific widgets lisent le même selection context ;
- aucune page ne change silencieusement de compte ;
- un compte breached reste sélectionnable en lecture seule ;
- CTA WariX suit le compte sélectionné.

Un user sans compte ne reçoit pas un faux compte `default`.

---

# 143. Performance visual grammar

Utiliser :

- equity curve ;
- progress bars ;
- distribution bars ;
- simple donut/gauge seulement si vraie lecture ;
- heatmaps sessions/instruments si volume de données suffisant ;
- timeline milestones.

Éviter :

- gauges décoratifs partout ;
- 3D charts ;
- pie charts à 12 catégories ;
- rouge/vert uniquement ;
- metrics sans définition.

---

# 144. Lifecycle motion choreography

## Account activation
Status pill morph calme → CTA `Ouvrir WariX` apparaît avec fade/translate léger.

## Soft lock
Actions d’ouverture se désactivent immédiatement ; banner risk apparaît sans shake.

## Pass pending
Hero Dashboard morph vers timeline ; WariX order ticket passe read-only ; aucun profit animation.

## Performance activation
Crossfade du programme ONE vers Performance ; mission change ; aucune animation de gain.

## KYC required
Checklist révèle l’étape Identity ; CTA principal devient `Vérifier mon identité`.

## Payout paid
Status timeline avance vers `Payé`, reçu apparaît. Pas de confetti.

---

# 145. Image generation / art direction brief

Si des illustrations WARIBA sont générées plus tard :

- 16:9 / 4:3 pour marketing ;
- dark graphite background ;
- abstract market geometry ;
- cobalt/cyan/copper restrained ;
- no fake financial numbers ;
- no competitor logos ;
- no humans unless narrative specifically needs them ;
- no luxury imagery ;
- no crypto cliché ;
- no glowing neon city ;
- no generic AI gradients without product context.

Les images destinées au produit doivent être exportées avec dark-mode compatibility et respect des safe areas.

---

# 146. Help / Education surfaces

WariX Help peut contenir :

- Getting started ;
- Orders Market/Limit/Stop ;
- SL/TP ;
- Risk limits ;
- Drawing tools ;
- Indicators ;
- Alerts ;
- Hotkeys ;
- Troubleshooting feed ;
- Mobile trading ;
- Link Support.

Tutoriels : vignettes produit propres, vidéos courtes, progression optionnelle. Ne pas mélanger education commerciale dans le ticket de trade.

---

# 147. Privacy & observability

- aucun document KYC dans analytics ;
- pas de PII dans logs ;
- secret redaction ;
- public references distinctes si nécessaire ;
- retention définie ;
- staff access audité ;
- test data sans PII réelle ;
- correlation ID visible sans exposer internal IDs sensibles.

---

# 148. Premium empty-state library

## No accounts
Action : choisir évaluation.

## No trades
« Aucun trade sur cette période. » + change period.

## No payouts
« Aucun payout demandé. » + explain eligibility.

## No notifications
« Vous êtes à jour. »

## No alerts
« Aucune alerte active. » + `Créer une alerte`.

## Calendar unavailable
Cacher destination si capability non réelle ; si outage temporaire, message service indisponible sans faux événements.

---

# 149. Final independent review gate

Avant de déclarer le Product OS implémenté, une personne ou un agent différent de l’implémenteur doit pouvoir :

1. prendre un user anonyme ;
2. choisir une offre ;
3. créer un compte ;
4. simuler paiement ;
5. suivre activation ;
6. ouvrir Hub ;
7. ouvrir WariX ;
8. provoquer soft lock ;
9. provoquer breach sur autre fixture ;
10. provoquer pass_pending ;
11. approuver review ;
12. activer Performance ;
13. atteindre financially_eligible ;
14. déclencher KYC ;
15. vérifier KYC ;
16. demander payout ;
17. approuver ;
18. marquer processing puis paid ;
19. atteindre payout #5 ;
20. ouvrir WARIBA Review ;
21. reconstruire chaque transition depuis audit/outbox/references.

Aucune étape ne doit nécessiter de deviner un statut ou utiliser un bouton placeholder.

---

# 150. Final master lock conditions

Le présent master peut devenir `LOCKED` uniquement après :

- réconciliation Decision Log ;
- validation Product ;
- validation Risk ;
- validation Finance sur payout ;
- validation Compliance sur KYC timing/overrides ;
- validation Engineering sur state machines/idempotence ;
- validation Design sur premium language ;
- validation Mobile ;
- validation Accessibility ;
- mapping des décisions `OPEN` ;
- acceptation humaine de la roadmap de migration WariX.

Une fois `LOCKED`, tout prompt Codex/Claude futur doit le citer comme contrat canonique et ne peut le superseder silencieusement.
