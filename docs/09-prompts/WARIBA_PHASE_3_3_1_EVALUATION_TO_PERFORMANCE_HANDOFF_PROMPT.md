# WARIBA — PHASE 3.3.1
## Evaluation → Performance Handoff Closure
### Prompt exécutable pour Claude / Codex
**Version : 2026-08-24**  
**Priorité : P0 — indispensable avant Phase 3.4**  
**Objectif : transformer le passage WARIBA ONE → WARIBA Performance en un parcours métier clair, auditable, premium, mobile-first et impossible à mal comprendre.**

---

# 0. RÔLE ET MISSION

Tu agis simultanément comme un conseil produit composé de **35 rôles** :

1. Founder / CEO  
2. Head of Product  
3. Prop-Firm Operations Director  
4. Professional Trader  
5. Beginner Trader  
6. Funded Trader  
7. Risk Director  
8. Quant / Risk Engineer  
9. Trading Operations Analyst  
10. Compliance Officer  
11. KYC / Identity Operations Specialist  
12. Fraud & Integrity Analyst  
13. Dispute / Appeals Reviewer  
14. Customer Support Lead  
15. Customer Success Lead  
16. Finance Operations Lead  
17. Payout Operations Specialist  
18. Legal / Terms Reviewer  
19. Privacy Engineer  
20. Security Engineer  
21. Backend Architect  
22. PostgreSQL / Supabase Architect  
23. RBAC / Authorization Engineer  
24. Frontend Architect  
25. Design System Lead  
26. Senior Fintech Product Designer  
27. Mobile UX Specialist  
28. Accessibility Specialist  
29. French UX Writer  
30. SRE / Reliability Engineer  
31. Observability Engineer  
32. QA Lead  
33. Test Automation Engineer  
34. Product Analytics Specialist  
35. Independent Red-Team Product Auditor  

Tu dois travailler comme si ces 35 personnes devaient signer le résultat.

**Tu n’as pas le droit de considérer cette phase comme terminée si le flow métier est correct mais confus, beau mais faux, clair mais non auditable, ou complet sur desktop mais incompréhensible sur mobile.**

---

# 1. CONTEXTE PRODUIT

WARIBA propose un environnement de trading simulé.

Le parcours visé est :

```text
WARIBA ONE — Evaluation
        ↓
Objectif éventuellement atteint pendant la séance
        ↓
Le trader continue à trader si les règles l’autorisent
        ↓
Clôture de journée
        ↓
Finalisation autoritative
        ↓
Toutes les conditions sont vérifiées
        ↓
Evaluation réussie
        ↓
Création EXACTEMENT UNE FOIS du compte WARIBA Performance
        ↓
Nouveau public ID
        ↓
Présentation des nouvelles règles Performance
        ↓
Confirmation de lecture/version
        ↓
Ouverture de WariX dans le compte Performance
        ↓
Nouveau dashboard orienté progression vers payout
```

Aujourd’hui, le passage n’est pas assez explicite.  
Le trader peut voir **« Evaluation réussie »** sans comprendre :

- quand exactement il a réellement réussi ;
- pourquoi ce n’est pas arrivé au moment intraday où l’objectif a été touché ;
- si son compte Performance existe déjà ;
- quel est son nouveau numéro de compte ;
- quelles règles ont changé ;
- quelles règles restent identiques ;
- quel compte est encore tradable ;
- comment ouvrir WariX sur le bon compte ;
- ce qui le sépare maintenant d’un payout ;
- quelle version des règles Performance s’applique à lui.

Cette phase ferme cette rupture.

---

# 2. PRINCIPE ABSOLU

## 2.1 L’objectif intraday NE DOIT PAS valider l’évaluation

Le trader ne doit jamais voir un message équivalent à :

> Félicitations, vous avez réussi votre évaluation.

simplement parce que son P&L intraday atteint l’objectif.

Il peut voir :

> **Objectif atteint pour le moment.**  
> Continuez à respecter les règles jusqu’à la clôture de la journée.

ou, si le produit le permet :

> **Objectif atteint.**  
> La réussite sera confirmée après la clôture et la vérification de toutes les conditions.

### État intraday attendu

```text
ACTIVE
  └─ objectiveReached = true
     └─ account still ACTIVE
     └─ risk rules still enforced
     └─ trading permissions unchanged unless another rule blocks them
```

### Interdit

```text
objective reached
→ immediately PASS
→ immediately provision Performance
```

---

# 3. MOMENT EXACT DE LA RÉUSSITE

La réussite ne devient définitive qu’après le processus de fin de journée prévu par le backend.

Le système doit pouvoir représenter clairement :

```text
1. Objectif atteint
2. Journée toujours ouverte
3. Journée clôturée
4. Vérification des conditions
5. Evaluation réussie
6. Performance en préparation
7. Performance prêt
```

Le front ne doit jamais déduire lui-même cette séquence à partir d’un solde.

Le backend est la source d’autorité.

---

# 4. LIFECYCLE CIBLE

Auditer le lifecycle existant avant de modifier quoi que ce soit.

Adapter aux enums/canonical states réellement présents dans le repo.  
Ne pas inventer un deuxième moteur d’état parallèle.

La sémantique finale doit couvrir au minimum :

```text
EVALUATION_ACTIVE
EVALUATION_OBJECTIVE_REACHED
EVALUATION_FINALIZING
EVALUATION_PASSED
PERFORMANCE_PROVISIONING
PERFORMANCE_ACTIVE
PERFORMANCE_REVIEW
PERFORMANCE_SUSPENDED     // seulement si déjà canonique
PERFORMANCE_TERMINATED
```

Si les noms internes sont différents, préserver les enums internes et exposer des libellés humains au trader.

### Libellés trader recommandés

| Interne | Trader |
|---|---|
| ACTIVE | Compte actif |
| OBJECTIVE_REACHED | Objectif atteint |
| FINALIZING | Vérification en cours |
| PASSED | Evaluation réussie |
| PROVISIONING | Compte Performance en préparation |
| PERFORMANCE_ACTIVE | Compte Performance actif |
| REVIEW | En cours d’examen |
| TERMINATED | Compte terminé |

**Aucun enum brut ne doit apparaître côté trader.**

---

# 5. CONTRAINTE D’IDEMPOTENCE

Une Evaluation réussie doit créer **exactement un** compte Performance.

Même si :

- un job redémarre ;
- un webhook/retry arrive deux fois ;
- une requête est rejouée ;
- le worker redémarre ;
- deux finalisations concurrentes apparaissent.

Le système doit garantir :

```text
EVAL-XXXXX
  └─ childPerformanceAccountId = exactly one account
```

Ajouter une protection DB / transactionnelle / contrainte unique si nécessaire.

## Test obligatoire

Appeler deux fois le chemin de provisioning avec le même parent :

```text
expected:
performance_accounts_created = 1
```

---

# 6. RELATION PARENT ↔ ENFANT

Le lien Evaluation → Performance doit être explicite et requêtable.

Le trader doit pouvoir voir :

```text
WARIBA ONE
EVAL-10482
✓ Réussie

A donné naissance à :
WARIBA Performance
PERF-20731
● Actif
```

Et inversement :

```text
WARIBA Performance
PERF-20731
● Actif

Issu de :
WARIBA ONE
EVAL-10482
✓ Réussie
```

Ce lien doit aussi être disponible dans Control et Support.

---

# 7. FLOW UX COMPLET

Le flow ne doit pas se résumer à un badge.

Il doit comporter **quatre écrans / états visuels majeurs**.

---

# 8. SCREEN A — OBJECTIF ATTEINT, MAIS PAS ENCORE VALIDÉ

## But

Empêcher le trader de croire qu’il a déjà réussi.

## Desktop — skeleton

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ WARIBA ONE                         ● Compte actif       Reset 05:14:22        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✓ OBJECTIF ATTEINT POUR LE MOMENT                                           │
│                                                                              │
│  Vous avez atteint l’objectif de profit.                                     │
│  Votre évaluation n’est pas encore terminée.                                 │
│                                                                              │
│  Continuez à respecter les règles jusqu’à la clôture de la journée.          │
│                                                                              │
│  [ Voir ce qu’il reste à respecter ]                                         │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Solde         P&L du jour       Objectif      Perte jour       Perte max      │
│ 11 000 USD    +500 USD          100 %         100 % restant    76 % restant   │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ Ouvrir WariX ]                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile 320–390

```text
┌──────────────────────────────┐
│ Tableau de bord              │
├──────────────────────────────┤
│ ✓ Objectif atteint           │
│                              │
│ Pas encore validé            │
│                              │
│ Votre journée doit d’abord   │
│ être clôturée et vérifiée.   │
│                              │
│ [Voir ce qu’il reste]        │
├──────────────────────────────┤
│ 11 000 USD                   │
│ Solde                        │
│                              │
│ Objectif        100 %        │
│ Perte jour      100 %        │
│ Perte max        76 %        │
│                              │
│ [ Ouvrir WariX ]             │
└──────────────────────────────┘
```

### Animation

- check icon : scale 0.92 → 1.0, 180 ms ;
- ligne de progression : remplissage 300–450 ms ;
- aucun confetti ;
- aucun feu d’artifice ;
- aucune animation de casino.

Le ton doit être **satisfaisant mais contrôlé**.

---

# 9. SCREEN B — JOURNÉE CLÔTURÉE / VÉRIFICATION EN COURS

Le trader doit voir qu’il n’a rien à faire.

```text
┌──────────────────────────────────────────────────────────────┐
│ ⏱ Vérification en cours                                    │
│                                                              │
│ Votre journée est terminée.                                  │
│ Nous vérifions maintenant toutes les conditions de votre     │
│ évaluation.                                                  │
│                                                              │
│ ✓ Objectif atteint                                           │
│ ✓ Aucune position ouverte                                    │
│ ✓ Limite quotidienne respectée                               │
│ ● Vérification de la règle Meilleur Jour                     │
│ ● Finalisation de l’évaluation                               │
│                                                              │
│ Vous n’avez rien à faire.                                    │
└──────────────────────────────────────────────────────────────┘
```

### Important

Ne jamais afficher une fausse durée :

- pas de « quelques minutes » si ce n’est pas garanti ;
- pas de SLA inventé.

Le message peut être :

> Vous n’avez rien à faire. Cette page se mettra à jour automatiquement.

---

# 10. SCREEN C — EVALUATION RÉUSSIE

C’est un moment émotionnel important.

Le design doit être premium, simple et évident.

## Desktop

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          ✓ EVALUATION RÉUSSIE                               │
│                                                                             │
│                  Toutes les conditions ont été validées.                    │
│                                                                             │
│                  WARIBA ONE                                                 │
│                  EVAL-10482                                                 │
│                  10 000 USD                                                 │
│                                                                             │
│                              ↓                                              │
│                                                                             │
│                Votre compte Performance est en préparation                  │
│                                                                             │
│                ● Création du compte                                         │
│                ○ Attribution du nouveau numéro                              │
│                ○ Préparation des règles Performance                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Puis, dès que le compte est créé :

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ✓ VOTRE COMPTE EST PRÊT                           │
│                                                                             │
│                         WARIBA Performance                                  │
│                                                                             │
│                           PERF-20731                                        │
│                           10 000 USD                                        │
│                                                                             │
│                    ● Compte Performance actif                               │
│                                                                             │
│            Avant votre premier trade, voyez ce qui change.                  │
│                                                                             │
│                  [ Découvrir mes nouvelles règles ]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Le CTA primaire est :

**Découvrir mes nouvelles règles**

Pas :

- Acheter une nouvelle évaluation ;
- Choisir un nouveau compte ;
- Recommencer ;
- Ouvrir WariX immédiatement.

---

# 11. SCREEN D — ONBOARDING DES RÈGLES PERFORMANCE

C’est le cœur de cette phase.

## Header

```text
Bienvenue sur WARIBA Performance

Votre évaluation est terminée.
À partir de maintenant, votre compte suit les règles WARIBA Performance.

Avant votre premier trade, prenez 2 minutes pour voir ce qui change.
```

## Carte de transition

```text
┌────────────────────┐      →      ┌──────────────────────┐
│ WARIBA ONE         │             │ WARIBA Performance   │
│ EVAL-10482         │             │ PERF-20731           │
│ ✓ Réussie          │             │ ● Actif              │
│ 10 000 USD         │             │ 10 000 USD           │
└────────────────────┘             └──────────────────────┘
```

## Animation

La flèche peut être dessinée progressivement (stroke animation 350 ms).  
Les deux cartes apparaissent avec fade + translateY 6 px maximum.

---

# 12. COMPARAISON ONE VS PERFORMANCE

Afficher les différences de manière claire.

**Ne jamais hardcoder les valeurs dans le composant.**

Le backend/read model doit fournir la comparaison.

## Desktop

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ CE QUI CHANGE                                                           │
├───────────────────────┬─────────────────────┬────────────────────────────┤
│                       │ WARIBA ONE          │ WARIBA Performance         │
├───────────────────────┼─────────────────────┼────────────────────────────┤
│ Objectif de profit    │ 10 %                │ Non applicable             │
│ Perte quotidienne     │ 3 %                 │ valeur policy              │
│ Perte maximale        │ valeur ONE          │ valeur Performance         │
│ Meilleur Jour         │ 50 %                │ valeur Performance         │
│ Jours minimum         │ Aucun               │ valeur Performance         │
│ Payout                │ Non                 │ Oui, sous conditions       │
│ Buffer                │ —                   │ valeur / règle policy      │
│ Jours Performance     │ —                   │ valeur policy              │
│ Part des gains        │ —                   │ valeur du cycle            │
└───────────────────────┴─────────────────────┴────────────────────────────┘
```

## Mobile

Ne pas forcer un tableau horizontal illisible.

Utiliser des cartes empilées :

```text
OBJECTIF DE PROFIT

WARIBA ONE
10 %

WARIBA PERFORMANCE
Non applicable
```

Puis :

```text
PERTE QUOTIDIENNE

WARIBA ONE
...

WARIBA PERFORMANCE
...
```

---

# 13. COPY HUMAINE

Interdire les formulations développeur.

## Ne pas écrire

- policy ;
- EOD ;
- state transition ;
- lifecycle ;
- engine ;
- server ;
- breach ;
- DLL ;
- MLL ;
- authoritative ;
- snapshot ;
- eligibility computation ;
- provisioning pipeline.

## Préférer

- règles de votre compte ;
- fin de journée ;
- compte terminé ;
- perte quotidienne ;
- perte maximale ;
- vérification ;
- compte en préparation ;
- montant disponible ;
- conditions du payout ;
- votre compte Performance.

---

# 14. SECTION « CE QUI CHANGE POUR VOUS »

Après la comparaison, afficher une synthèse.

```text
CE QUI CHANGE POUR VOUS

✓ Vous n’êtes plus en phase d’évaluation.

✓ Votre objectif est désormais de préserver votre compte et de remplir
  les conditions permettant un payout.

✓ Certaines conditions peuvent être calculées sur plusieurs journées.

✓ Seule la partie éventuellement disponible selon les règles de votre
  compte peut être demandée en payout.

✓ Votre compte conserve sa propre version des règles.
```

Adapter les items aux vraies règles présentes dans le repo.

Ne jamais afficher une affirmation qui n’est pas vraie pour la policy active.

---

# 15. EXPLICATION DU BUFFER

Si un buffer existe réellement dans les règles Performance, afficher un bloc dédié.

## Illustration conceptuelle

```text
             VOTRE COMPTE PERFORMANCE

        ┌──────────────────────────────┐
        │ Gains au-dessus du buffer    │
        │ potentiellement disponibles │
        ├──────────────────────────────┤
        │                              │
        │      BUFFER PERMANENT        │
        │             🔒               │
        │                              │
        ├──────────────────────────────┤
        │ Base du compte               │
        └──────────────────────────────┘
```

Copy :

> **Le buffer reste dans votre compte.**  
> Lorsqu’un payout devient possible, seul le montant autorisé au-dessus du niveau protégé peut être demandé.

Si le système ne possède pas le concept de buffer dans la policy, ne pas inventer cette section.

---

# 16. CHEMIN VERS LE PAYOUT

Créer un composant réutilisable :

```text
VOTRE CHEMIN VERS UN PAYOUT

[✓] Compte Performance créé
 ↓
[●] Trader en respectant les règles
 ↓
[○] Remplir les conditions du cycle
 ↓
[○] Atteindre les journées requises
 ↓
[○] Respecter le buffer
 ↓
[○] Payout disponible
 ↓
[○] Demande envoyée
 ↓
[○] WARIBA Review
 ↓
[○] Payout approuvé
```

Les étapes doivent être **data-driven**.

Ne pas afficher une étape inexistante.

---

# 17. ACKNOWLEDGEMENT DES RÈGLES

Le compte Performance est déjà créé.

La confirmation ne doit pas être présentée comme une activation.

Copy :

```text
☐ J’ai pris connaissance des règles de mon compte WARIBA Performance.
```

CTA :

```text
[ Continuer vers mon compte Performance ]
```

ou :

```text
[ Ouvrir WariX avec PERF-20731 ]
```

Enregistrer :

```text
user_id
account_id
performance_policy_version_id
acknowledged_at
source = performance_onboarding
```

### Important

La preuve doit être attachée à la version réelle des règles.

---

# 18. SCREEN E — PERFORMANCE READY

Après acknowledgement :

```text
┌──────────────────────────────────────────────────────────────┐
│ ✓ Votre compte WARIBA Performance est prêt                  │
│                                                              │
│ WARIBA Performance                                           │
│ PERF-20731                                                   │
│ 10 000 USD                                                   │
│                                                              │
│ ● Actif                                                      │
│                                                              │
│ Vous pouvez maintenant ouvrir WariX.                         │
│                                                              │
│ [ Ouvrir WariX ]                                             │
│                                                              │
│ Voir mes règles                                              │
└──────────────────────────────────────────────────────────────┘
```

Animation légère :

- check ring 220 ms ;
- compte card fade-in ;
- CTA glow très discret une seule fois ;
- pas de loop agressif.

---

# 19. NOUVEAU DASHBOARD PERFORMANCE

Le dashboard Performance ne doit pas être l’ancien dashboard Evaluation avec le mot Performance.

Sa question centrale :

> **Qu’est-ce qu’il me manque exactement pour pouvoir demander un payout ?**

## Desktop — structure

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ WARIBA PERFORMANCE                    ● Actif                               │
│ PERF-20731 · 10 000 USD                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Equité actuelle     P&L cycle       Buffer        Disponible               │
│ 10 327 USD          +327 USD        ...           ...                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ PROGRESSION VERS LE PROCHAIN PAYOUT                      42 %               │
│ ███████████████░░░░░░░░░░░░░░░░░░░                                      │
│                                                                             │
│ ✓ Compte actif                                                             │
│ ✓ Risque respecté                                                          │
│ ● Jours Performance                     2 / 5                              │
│ ○ Condition Meilleur Jour               ...                                │
│ ○ Buffer                                ...                                │
│ ○ Autres conditions                     ...                                │
│                                                                             │
│ [ Voir toutes les conditions ]                                             │
├─────────────────────────────────────────────┬───────────────────────────────┤
│ EVOLUTION DU COMPTE                         │ AUJOURD’HUI                    │
│ [ chart ]                                   │ Risque restant                │
│                                             │ positions                     │
│                                             │ prochain reset                │
├─────────────────────────────────────────────┴───────────────────────────────┤
│ PERFORMANCE DU CYCLE                                                         │
│ P&L net | taux réussite | gain moyen | perte moyenne | profit factor        │
├─────────────────────────────────────────────────────────────────────────────┤
│ ACTIVITÉ RÉCENTE — maximum 5 items                         [Voir plus]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Mobile

Ordre strict :

1. compte + public ID ;
2. équité / P&L cycle ;
3. progression payout ;
4. CTA WariX ;
5. conditions ;
6. chart ;
7. stats ;
8. activité récente.

Le chart doit rester visible tôt dans la page.  
Ne pas remettre 12 KPI avant le graphique.

---

# 20. EMPTY / FIRST-DAY STATE PERFORMANCE

Quand le compte vient d’être créé et n’a aucun trade :

```text
VOTRE COMPTE PERFORMANCE EST PRÊT

PERF-20731 · 10 000 USD

Aucune journée Performance terminée pour le moment.

Votre progression apparaîtra après votre première journée clôturée.

[ Ouvrir WariX ]
```

Mais les règles et le chemin payout restent visibles.

---

# 21. PERFORMANCE ACCOUNT CARD DANS /COMPTES

```text
WARIBA Performance        ● Actif
PERF-20731

10 000 USD

Progression payout
2 / 5 journées

Disponible
...

Issu de :
EVAL-10482 · Evaluation réussie

[ Ouvrir WariX ]
```

---

# 22. EVALUATION CARD APRÈS PASSAGE

L’ancienne Evaluation devient une archive consultable.

```text
WARIBA ONE
EVAL-10482
✓ Réussie

Evaluation terminée le 24 août 2026

Compte créé :
WARIBA Performance
PERF-20731
● Actif

[ Voir mon compte Performance ]
```

Le CTA « Acheter un nouveau compte » peut exister mais il devient secondaire.

---

# 23. INTERDICTION DE TRADER SUR L’ANCIEN COMPTE

Après `Evaluation Passed` :

```text
Evaluation account:
tradable = false
```

Si le trader tente d’ouvrir WariX sur EVAL-10482 :

```text
Cette évaluation est terminée.

Votre compte Performance est maintenant :
PERF-20731

[ Ouvrir le compte Performance ]
```

Ne jamais laisser l’ordre arriver au moteur d’exécution si le compte n’est pas tradable.

---

# 24. WARIX — CONTEXTE DU COMPTE

Sans refondre WariX, le contexte doit être évident.

Top rail :

```text
PERFORMANCE · 10K
PERF-20731
```

Account selector :

```text
✓ PERF-20731  Performance   10K   Actif
  EVAL-10482  Evaluation    10K   Réussie
```

L’Evaluation réussie est consultable mais non sélectionnable pour l’exécution.

---

# 25. NOUVELLES RÈGLES DANS WARIX

Les protections de WariX doivent consommer les permissions et règles Performance du backend.

Aucune règle ne doit être copiée dans WariX.

Pipeline :

```text
published/attached account policy
        ↓
account permissions / risk projection
        ↓
WariX account context
        ↓
UI + execution permissions
```

---

# 26. PAGE « MES RÈGLES »

Créer/compléter une route canonique de compte si nécessaire.

Exemple :

```text
/comptes/PERF-20731/regles
```

Contenu :

```text
Règles de votre compte

WARIBA Performance
PERF-20731

Version appliquée à votre compte
Performance 1.x.x

Attachée le
24 août 2026

Cette version reste la référence de votre compte.

[ Perte quotidienne ]
[ Perte maximale ]
[ Meilleur Jour ]
[ Jours Performance ]
[ Buffer ]
[ Payout ]
```

Si les routes canonisées du repo imposent une autre structure, suivre le repo.

---

# 27. EVENT TIMELINE

Créer une timeline trader-friendly :

```text
18:17  Objectif atteint
00:00  Journée clôturée
00:00  Vérification terminée
00:00  Evaluation réussie
00:00  Compte Performance créé
00:01  Règles Performance consultées
00:02  WariX ouvert sur PERF-20731
```

Pas d’enums internes.

---

# 28. SUPPORT

Quand une demande concerne PERF-20731, le support doit avoir le contexte :

```text
Compte concerné
PERF-20731

Type
WARIBA Performance

Issu de
EVAL-10482

Règles du compte
Performance vX.X.X

Evaluation d’origine
WARIBA ONE vY.Y.Y
```

Le trader, lui, n’a pas besoin de voir les IDs internes ou correlation IDs.

---

# 29. CONTROL

Les opérateurs doivent voir le lien parent/enfant.

Exemple :

```text
ACCOUNT LIFECYCLE

EVAL-10482
Evaluation
✓ Passed
Policy ONE 1.1.1
       ↓
PERF-20731
Performance
● Active
Policy Performance 1.x.x
```

Control peut afficher les métadonnées internes nécessaires à l’audit.

---

# 30. PASS REVIEW — DÉCISION PRODUIT

Avant de coder une action humaine, auditer le système existant.

Deux modèles possibles :

## Modèle A — auto-pass canonique

```text
daily finalization
→ conditions satisfied
→ evaluation passed
→ performance account auto-created
```

Control = lecture / audit seulement.

## Modèle B — human approval

```text
daily finalization
→ pass_review_pending
→ authorized operator
→ approve
→ performance created
```

**Ne pas inventer le modèle B** si le produit actuel est A.

Documenter explicitement le choix dans la Decision Log.

---

# 31. REMEDIATION DES CONTESTATIONS

Ne pas casser l’immutabilité du breach original.

Si une décision de contestation doit permettre une correction future, utiliser une **compensating action** auditable.

Exemple conceptuel :

```text
original violation remains immutable
        ↓
operator decision
        ↓
administrative remediation event
        ↓
new explicit account state transition
```

Ne jamais supprimer ou modifier silencieusement la preuve originale.

Si cette décision produit n’est pas encore verrouillée, garder le workflow bloqué et documenter le blocker.

---

# 32. DATA CONTRACTS

Auditer les DTOs existants.

Créer ou étendre uniquement ce qui manque.

Exemples de données nécessaires :

```ts
EvaluationToPerformanceHandoffDTO = {
  evaluationAccount: {
    publicId
    nominalAmount
    status
    passedAt
    policyVersion
  }

  performanceAccount?: {
    publicId
    nominalAmount
    status
    createdAt
    tradable
    policyVersion
  }

  handoff: {
    stage
    objectiveReachedAt?
    dailyFinalizedAt?
    passedAt?
    provisioningStartedAt?
    performanceCreatedAt?
    rulesAcknowledgedAt?
  }

  ruleComparison: RuleComparisonItem[]

  payoutPath?: {
    steps: PayoutPathStep[]
    currentStep
  }
}
```

Ne pas utiliser ce pseudo-code si le repo possède déjà un modèle plus approprié.

---

# 33. RULE COMPARISON DTO

Exemple :

```ts
RuleComparisonItem = {
  key:
    | "profit_target"
    | "daily_loss"
    | "maximum_loss"
    | "best_day"
    | "minimum_days"
    | "performance_days"
    | "buffer"
    | "payout_split"

  label: string

  evaluation: {
    applicable: boolean
    displayValue: string | null
  }

  performance: {
    applicable: boolean
    displayValue: string | null
  }

  changed: boolean
}
```

Les valeurs financières doivent être calculées/read-model côté serveur.

---

# 34. INTERDICTION DES VALEURS FAUSSES

```text
HARDCODED_PERFORMANCE_RULE_VALUES_IN_UI = 0
FAKE_FINANCIAL_VALUES_PRODUCTION = 0
```

Si une valeur manque :

```text
Non publié
```

ou :

```text
Non applicable
```

selon le cas.

---

# 35. DESIGN SYSTEM — QUIET LUXURY

WARIBA doit rester premium.

## Fond

- noir charbon profond ;
- panneaux légèrement élevés ;
- borders 1px ;
- faible saturation ;
- pas de néon cyberpunk.

## Sémantiques

- bleu WARIBA : navigation / action principale ;
- emerald : succès réel ;
- amber : attention / condition incomplète ;
- rouge accessible : perte / terminaison ;
- bronze/gold discret : information premium, jamais pour tout.

## Typographie

- Geist / Inter selon système existant ;
- chiffres : `tabular-nums` ;
- métriques : monospace ou numeric variant ;
- gros chiffres jamais trop serrés.

---

# 36. MOTION SYSTEM

Les animations doivent rendre le changement d’état compréhensible.

## Autorisé

- fade 120–220 ms ;
- translate 4–8 px ;
- progress fill 250–450 ms ;
- count-up discret pour métrique non critique ;
- stroke draw pour lifecycle ;
- pulse unique sur un nouvel état ;
- shimmer skeleton.

## Interdit

- boucle lumineuse ;
- glow clignotant ;
- confetti permanent ;
- animations qui déplacent les chiffres ;
- motion qui masque un changement de risque.

## Reduced motion

`prefers-reduced-motion` :

- pas de stroke animation ;
- pas de count-up ;
- transition instant/fade léger.

---

# 37. MICRO-INTERACTIONS

### Quand Performance est créé

1. état `Préparation` ;
2. carte skeleton ;
3. public ID apparaît ;
4. badge devient `Actif` ;
5. CTA règles devient disponible.

### Quand règles acknowledged

1. checkbox confirm ;
2. bouton devient `Continuer vers PERF-XXXXX` ;
3. transition vers ready screen.

### Quand WariX s’ouvre

Conserver le bon compte dans le contexte de route / query / state selon l’architecture existante.

---

# 38. MOBILE FIRST

Tester :

```text
320
375
390
430
768
1024
1440
```

## Règles

- aucun tableau horizontal forcé ;
- aucun CTA sous bottom nav ;
- public ID visible sans scroll excessif ;
- chart visible assez tôt ;
- pas plus de 4 KPI avant le premier chart ;
- sections de comparaison transformées en stacked cards ;
- CTA primary 44px minimum ;
- safe-area respectée.

---

# 39. ACCESSIBILITÉ

- contrastes WCAG AA ;
- focus visible ;
- badges non dépendants uniquement de la couleur ;
- aria-labels ;
- progression lisible sans graph ;
- états décrits en texte ;
- motion réduite ;
- icônes décoratives `aria-hidden`.

---

# 40. EMPTY / ERROR / STALE STATES

Prévoir :

## Provisioning lent

```text
Votre compte Performance est toujours en préparation.
Vous n’avez rien à faire.
[Réessayer]
```

## Provisioning échoué

Ne jamais faire croire que le compte existe.

```text
Nous n’avons pas pu terminer la création de votre compte.

Votre évaluation reste réussie.
Aucun second compte ne sera créé automatiquement pendant la résolution.

[Contacter le support]
```

## Stale read

```text
Les informations viennent d’être mises à jour.
[Actualiser]
```

---

# 41. OBSERVABILITY

Tracer :

```text
evaluation_objective_reached
evaluation_daily_finalization_started
evaluation_daily_finalization_completed
evaluation_passed
performance_provisioning_started
performance_account_created
performance_rules_viewed
performance_rules_acknowledged
performance_account_opened
performance_first_trade
```

Les événements doivent inclure des IDs internes sûrs pour l’observabilité, pas être exposés au trader.

---

# 42. PRODUCT ANALYTICS

Mesurer :

```text
Passed
 ↓
Performance Created
 ↓
Rules Viewed
 ↓
Rules Acknowledged
 ↓
WariX Opened
 ↓
First Performance Trade
```

Funnel attendu dans analytics.

Ne pas inventer de taux cibles.

---

# 43. SECURITY

Vérifier :

- le trader ne peut accéder qu’à ses comptes ;
- un public ID Performance d’un autre trader retourne denied/not found selon convention ;
- acknowledgement impossible sur compte non possédé ;
- acknowledgement ne peut changer la policy attachée ;
- impossible de rendre tradable une Evaluation passée depuis le client ;
- impossible de créer un Performance account via client action ;
- public ID non devinable si convention existante ;
- aucun service role au navigateur.

---

# 44. TRANSACTIONS

La création Performance doit être atomique autour de :

```text
verify parent passed
verify no existing child
create child account
attach performance policy
create parent-child link
write lifecycle event
write audit
commit
```

Si une étape échoue : rollback.

---

# 45. TESTS OBLIGATOIRES — BACKEND

1. objectif intraday ne passe pas le compte ;
2. pass seulement après finalisation ;
3. provisioning exactement une fois ;
4. retry idempotent ;
5. parent-child link correct ;
6. child receives Performance policy ;
7. parent becomes non-tradable ;
8. child tradable seulement quand active ;
9. wrong owner cannot access;
10. acknowledgement saves attached version ;
11. current published policy change does not mutate attached account version ;
12. support/control see same parent-child relation.

---

# 46. TESTS OBLIGATOIRES — UI/E2E

Créer un scénario complet :

```text
buy evaluation
→ activate
→ trade / seed qualified result
→ objective reached
→ confirm still active
→ finalize day
→ verification screen
→ pass
→ Performance provisioning
→ Performance created
→ public ID visible
→ rules onboarding
→ compare ONE vs Performance
→ acknowledge
→ ready screen
→ open WariX
→ WariX uses PERF account
→ old Evaluation cannot execute
```

---

# 47. VISUAL EVIDENCE

Capturer au minimum :

### Desktop 1440

1. objective reached intraday ;
2. finalization ;
3. evaluation passed ;
4. performance provisioning ;
5. performance ready ;
6. ONE vs Performance comparison ;
7. buffer explanation ;
8. payout path ;
9. Performance dashboard empty ;
10. Performance dashboard populated ;
11. accounts parent-child ;
12. Evaluation archived ;
13. WariX Performance context ;
14. rules version page ;
15. Control lifecycle.

### Mobile 390

16. objective reached ;
17. passed ;
18. ready ;
19. rules comparison ;
20. payout path ;
21. Performance dashboard ;
22. account card ;
23. rules page ;
24. WariX gate.

### Mobile 320

25. ready screen ;
26. comparison ;
27. dashboard ;
28. CTA not overlapped ;
29. archived Evaluation.

---

# 48. DESIGN QUALITY GATE

Pour chaque capture, vérifier avec les 35 rôles :

```text
Can a beginner understand the state in 5 seconds?
Can a funded trader identify the account number instantly?
Can an operator explain what happened?
Can compliance show which rules were attached?
Can risk prove when the pass occurred?
Can support link Evaluation and Performance?
Can mobile user reach the CTA?
Can a trader see what is required for payout?
```

---

# 49. P0 / P1

## P0 — dans cette slice

- pass only after daily finalization ;
- idempotent Performance account creation ;
- parent-child account link ;
- Performance public ID ;
- passed/provisioning/ready screens ;
- rules onboarding ;
- dynamic comparison ;
- acknowledgement ;
- Performance dashboard distinction ;
- WariX correct account context ;
- old Evaluation non-tradable ;
- Support/Control parity ;
- mobile ;
- accessibility ;
- tests ;
- evidence.

## P1 — après P0 uniquement

- richer celebration animation ;
- downloadable account certificate ;
- email notification “Votre compte Performance est prêt” ;
- WhatsApp notification ;
- advanced lifecycle timeline visualization ;
- optional coach tips.

Ne pas faire P1 avant P0.

---

# 50. NE PAS FAIRE

- ne pas refondre tout WariX ;
- ne pas inventer de nouvelles règles ;
- ne pas hardcoder les pourcentages ;
- ne pas inventer de KYC provider ;
- ne pas inventer de payout provider ;
- ne pas créer de notifications si la décision produit reste deferred ;
- ne pas changer la logique de risque sans nécessité prouvée ;
- ne pas mélanger Phase 3.4 ;
- ne pas ouvrir de PR ;
- ne pas push ;
- ne pas merge ;
- ne pas déployer.

---

# 51. AUDIT FIRST

Avant toute modification :

1. lire Decision Log ;
2. lire Product OS Master audit ;
3. lire Road to Beta ;
4. lire Phase 3.3 Operator Closure report ;
5. lire lifecycle/account schemas ;
6. lire published policy handling ;
7. lire evaluation finalization ;
8. lire Performance account provisioning existant ;
9. lire WariX account gating ;
10. lire Support/Control projections ;
11. identifier ce qui est déjà canonique ;
12. produire un mini audit des gaps avant coding.

---

# 52. RAPPORT FINAL OBLIGATOIRE

Retourner exactement :

```text
PHASE_3_3_1_EVAL_TO_PERF_HANDOFF_READY = yes|no

OBJECTIVE_INTRADAY_DOES_NOT_PASS_ACCOUNT = yes|no
PASS_ONLY_AFTER_DAILY_FINALIZATION = yes|no

PERFORMANCE_ACCOUNT_CREATED_EXACTLY_ONCE = yes|no
PARENT_CHILD_ACCOUNT_LINK_READY = yes|no
PERFORMANCE_PUBLIC_ID_VISIBLE = yes|no

EVALUATION_SUCCESS_SCREEN_READY = yes|no
PERFORMANCE_PROVISIONING_SCREEN_READY = yes|no
PERFORMANCE_READY_SCREEN_READY = yes|no

PERFORMANCE_RULES_ONBOARDING_READY = yes|no
ONE_VS_PERFORMANCE_COMPARISON_READY = yes|no
PERFORMANCE_RULES_DYNAMIC_FROM_POLICY = yes|no
HARDCODED_PERFORMANCE_RULE_VALUES = <number>

PERFORMANCE_RULES_ACK_READY = yes|no
ATTACHED_POLICY_VERSION_PRESERVED = yes|no

PERFORMANCE_DASHBOARD_READY = yes|no
PERFORMANCE_PAYOUT_PATH_READY = yes|no
PERFORMANCE_BUFFER_EXPLAINED = yes|no
PERFORMANCE_DAYS_EXPLAINED = yes|no
BEST_DAY_PERFORMANCE_EXPLAINED = yes|no

EVALUATION_NON_TRADABLE_AFTER_PASS = yes|no
PERFORMANCE_TRADABLE_ONLY_WHEN_ACTIVE = yes|no
WARIX_ACCOUNT_CONTEXT_PARITY = yes|no

SUPPORT_PARENT_CHILD_CONTEXT_READY = yes|no
CONTROL_PARENT_CHILD_CONTEXT_READY = yes|no

MOBILE_320_READY = yes|no
MOBILE_390_READY = yes|no
DESKTOP_1440_READY = yes|no

ACCESSIBILITY_CRITICAL = <number>
ACCESSIBILITY_SERIOUS = <number>

RAW_INTERNAL_ENUMS_TRADER = <number>
FAKE_FINANCIAL_VALUES_PRODUCTION = <number>

VISUAL_EVIDENCE_PATH = ...
TESTS_RUN = ...
FAILURES = ...

35_ROLE_COUNCIL:
Founder/CEO = PASS|WARNING|VETO
...
Independent Red-Team = PASS|WARNING|VETO

FINAL_RECOMMENDATION =
FREEZE_3_3_1_AND_MOVE_TO_3_4
or
BLOCK_AND_FIX
```

---

# 53. FINAL STANDARD

Cette phase n’est pas terminée parce que “les tests sont verts”.

Elle est terminée uniquement si un trader peut répondre sans hésiter à ces questions :

1. **Ai-je vraiment réussi ?**
2. **À quel moment ai-je réussi ?**
3. **Pourquoi pas au moment où j’ai touché l’objectif ?**
4. **Quel est mon nouveau compte ?**
5. **Quel est son numéro ?**
6. **Mon ancienne Evaluation peut-elle encore trader ?**
7. **Quelles règles ont changé ?**
8. **Quelle version des règles s’applique à moi ?**
9. **Que dois-je faire maintenant ?**
10. **Comment ouvrir WariX sur le bon compte ?**
11. **Qu’est-ce qu’il me manque pour un payout ?**
12. **Puis-je retrouver les règles plus tard ?**
13. **Le support peut-il retrouver mon Evaluation d’origine ?**
14. **Control peut-il expliquer exactement le passage ?**
15. **Le système peut-il prouver qu’il n’a créé qu’un seul compte Performance ?**

Si une seule de ces réponses est ambiguë, **PHASE 3.3.1 n’est pas prête.**

---

# 54. DESIGN INTENT — RÉSUMÉ VISUEL

Le sentiment recherché est :

```text
Evaluation:
discipline / progression / tension contrôlée

Pass:
soulagement / certitude / preuve

Performance onboarding:
nouveau chapitre / clarté / responsabilité

Performance dashboard:
capital protection / progression / payout visibility
```

WARIBA ne doit jamais ressembler à un casino.

Il doit ressembler à une plateforme financière premium où chaque changement d’état a une raison visible, chaque règle a une source, et chaque argent potentiel a une condition compréhensible.

---

# 55. ORDRE D’EXÉCUTION

```text
STEP 1  Audit
STEP 2  Lifecycle truth table
STEP 3  Data contracts
STEP 4  Idempotent provisioning
STEP 5  Parent-child linking
STEP 6  Trader read model
STEP 7  Passed/provisioning/ready screens
STEP 8  Performance rules onboarding
STEP 9  Version acknowledgement
STEP 10 Performance dashboard
STEP 11 Accounts + archived Evaluation
STEP 12 WariX account gating/context
STEP 13 Support + Control parity
STEP 14 Mobile
STEP 15 Accessibility
STEP 16 Targeted tests
STEP 17 E2E complete lifecycle
STEP 18 Visual evidence
STEP 19 35-role council
STEP 20 Final report
```

**Stop après cette phase. Ne pas démarrer Phase 3.4 automatiquement.**
