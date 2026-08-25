Oui — et c’est précisément là qu’on risquait encore de rater **le vrai passage métier**. Le compte Performance ne doit surtout pas apparaître comme “le même compte avec un nouveau badge”. C’est **un nouveau contrat de trading, un nouvel identifiant, de nouvelles règles, de nouveaux objectifs opérationnels et un nouveau parcours vers le payout**.

Je verrouillerais donc le flow complet comme ceci :

## 1. Le passage ONE → Performance doit être un vrai mini-onboarding

Quand l’évaluation est validée après la clôture de journée, WARIBA crée automatiquement le nouveau compte. Ensuite, le trader tombe sur un écran dédié, pas directement sur l’ancien dashboard.

```text
┌──────────────────────────────────────────────────────────────┐
│                    ✓ ÉVALUATION RÉUSSIE                     │
│                                                              │
│ Toutes les conditions de votre évaluation WARIBA ONE        │
│ ont été validées.                                           │
│                                                              │
│                    EVAL-10482                               │
│                       ↓                                      │
│                 WARIBA Performance                          │
│                    PERF-20731                               │
│                                                              │
│                    10 000 USD                               │
│                                                              │
│              ● Votre compte est prêt                        │
└──────────────────────────────────────────────────────────────┘
```

Puis :

```text
WARIBA PERFORMANCE
10 000 USD
PERF-20731

Compte simulé Performance
Créé le 24 août 2026
Statut : Actif

[ Découvrir mes nouvelles règles ]
```

Le CTA principal n’est donc **pas encore** “Acheter une nouvelle évaluation”.

---

# 2. Ensuite vient LE nouvel écran qu’on avait oublié : les règles Performance

Et cet écran doit être obligatoire au premier passage.

Pas parce que le trader doit “activer” techniquement le compte. Le compte est déjà créé automatiquement.

Mais parce qu’il doit comprendre :

> **“Les règles que vous venez de suivre pour WARIBA ONE ne sont plus toutes les mêmes.”**

### Header

```text
Bienvenue sur WARIBA Performance

Votre évaluation est terminée.
À partir de maintenant, vous tradez selon les règles
WARIBA Performance.

Avant votre premier trade, prenez 2 minutes pour
voir ce qui change.
```

Puis on affiche immédiatement :

```text
EVAL-10482                           PERF-20731
WARIBA ONE                           WARIBA Performance
✓ Réussie                           ● Actif
```

Visuellement avec une flèche entre les deux.

---

# 3. Il faut une comparaison AVANT / APRÈS

C’est probablement le meilleur moyen d’empêcher les erreurs.

| Règle | WARIBA ONE | WARIBA Performance |
|---|---|---|
| Objectif de profit | Affiché depuis la policy ONE | Pas d’objectif si la policy Performance n’en prévoit pas |
| Perte quotidienne | Valeur ONE | Valeur Performance |
| Perte maximale | Règle ONE | Règle Performance |
| Meilleur Jour | Règle ONE | Règle Performance applicable |
| Jours minimum | Règle ONE | Règle Performance |
| Payout | Non disponible | Devient possible selon les conditions Performance |
| Buffer | Non applicable | Buffer permanent applicable |
| Performance Days | Non applicable | Applicables si configurés |
| Part des gains | Pas de payout | Taux prévu pour le compte/cycle |
| Cycle | Évaluation | Cycle Performance |
| Review | Passage de l’évaluation | WARIBA Review lorsque prévu |

**Mais aucune de ces valeurs ne doit être codée dans React.**

Tout doit venir de :

```text
published policy
        ↓
PerformanceAccountDTO
        ↓
PerformanceRulesViewModel
        ↓
UI
```

Si une valeur n’existe pas :

> `Non applicable`

ou

> `Non publié`

Jamais une valeur inventée.

---

# 4. Puis une section extrêmement importante : « Ce qui change pour vous »

Je veux quelque chose de très humain.

```text
CE QUI CHANGE MAINTENANT

✓ Vous n’avez plus d’objectif d’évaluation à atteindre
  [uniquement si vrai dans la policy]

✓ Votre objectif est maintenant de protéger votre compte
  et de remplir les conditions permettant un payout

✓ Seule la partie de vos gains située au-dessus du buffer
  permanent peut devenir disponible

✓ Votre progression vers un payout est recalculée à partir
  de l’état réel de votre compte

✓ Certaines journées peuvent être nécessaires avant
  qu’une demande soit disponible
```

C’est beaucoup mieux que balancer dix pourcentages.

---

# 5. Le buffer doit être expliqué immédiatement

C’est l’une des différences les plus importantes.

On a justement créé le visuel du réservoir.

Il faut le réutiliser ici.

```text
              VOTRE COMPTE PERFORMANCE

            ┌───────────────────────────┐
            │      Gains excédentaires │ ← potentiellement disponibles
            ├───────────────────────────┤
            │                           │
            │     BUFFER PERMANENT      │ 🔒
            │                           │
            ├───────────────────────────┤
            │     Base du compte        │
            └───────────────────────────┘
```

Avec du français simple :

> **Le buffer reste toujours dans votre compte.**
>
> Lorsque les autres conditions sont remplies, seul l’excédent au-dessus de ce niveau peut devenir disponible pour un payout.

Et le montant doit être dynamique.

---

# 6. Il faut expliquer le payout avant même le premier trade Performance

Le trader doit savoir ce qu’il essaie réellement d’accomplir.

Un vrai bloc :

```text
VOTRE CHEMIN VERS UN PAYOUT

Compte Performance créé
        ↓
Trader en respectant les règles
        ↓
Remplir les conditions du cycle
        ↓
Conserver le buffer requis
        ↓
Compte éligible
        ↓
Demander un payout
        ↓
WARIBA Review
        ↓
Payout approuvé
```

Si certaines étapes ne sont pas applicables au cycle actuel, on ne les affiche pas.

---

# 7. Ensuite seulement : « J’ai compris — ouvrir WariX »

Je ferais :

```text
☐ J’ai pris connaissance des règles de mon compte
  WARIBA Performance.

[ Ouvrir WariX avec PERF-20731 ]
```

Attention : cette checkbox **ne doit pas être présentée comme l’activation du compte**.

Le compte est déjà actif.

C’est simplement une preuve/version d’onboarding :

```text
performance_rules_acknowledged_at
performance_policy_version_id
account_id
user_id
```

Ça devient très utile en cas de dispute :

> “Voici les règles affichées au trader avant son premier trade Performance.”

---

# 8. Après ça, nouveau dashboard Performance

Et surtout pas le dashboard Evaluation recyclé.

Le hero doit devenir quelque chose comme :

```text
WARIBA PERFORMANCE                         ● Actif
PERF-20731 · 10 000 USD

Équité actuelle
10 327 USD

P&L du cycle
+327 USD

Buffer permanent
10 200 USD

Excédent au-dessus du buffer
+127 USD

Prochaine étape
2 / 5 journées Performance
```

Puis :

```text
PROGRESSION VERS LE PROCHAIN PAYOUT

Conditions

✓ Compte actif
✓ Risque respecté
● Journées Performance          2 / 5
○ Buffer requis                 ...
○ Montant disponible            ...
○ Autres conditions             ...

[ Voir toutes les conditions ]
```

Le dashboard doit répondre à une seule question :

> **« Qu’est-ce qu’il me manque exactement pour pouvoir demander mon argent ? »**

---

# 9. Le trader doit pouvoir basculer clairement entre les deux comptes

Dans `Comptes` :

```text
WARIBA Performance
PERF-20731
10 000 USD
● Actif

Issu de :
WARIBA ONE
EVAL-10482
✓ Réussie
```

Et sur l’ancienne Evaluation :

```text
WARIBA ONE
EVAL-10482
✓ Réussie

Cette évaluation a donné naissance à :

WARIBA Performance
PERF-20731
● Actif

[ Voir le compte Performance ]
```

Lien dans les deux sens.

Ça évite toute ambiguïté.

---

# 10. Il manque aussi le changement de contexte dans WariX

Lorsque le trader clique :

> **Ouvrir WariX avec PERF-20731**

WariX doit afficher très clairement le compte sélectionné.

Pas juste :

> ONE · 10K

Mais :

```text
PERFORMANCE · 10K
PERF-20731
```

Et la rail globale / account selector doit permettre de distinguer :

```text
✓ PERF-20731   Performance   10K
  EVAL-10482   Réussie       10K
```

L’évaluation réussie reste consultable mais **non tradable**.

---

# 11. Les permissions doivent suivre le lifecycle

C’est un point énorme qu’on aurait pu oublier.

À chaque état :

```text
Evaluation active
→ peut trader

Objectif atteint intraday
→ peut encore trader
→ règles toujours appliquées

Evaluation finalizing
→ trading bloqué

Evaluation passed
→ ancienne Evaluation non tradable

Performance provisioning
→ pas encore tradable

Performance active
→ tradable avec policy Performance

Performance suspended/review
→ nouvelles positions éventuellement bloquées selon policy

Performance terminated
→ non tradable
```

WariX ne décide jamais ça tout seul.

Il consomme les permissions du backend.

---

# 12. Il nous faut aussi un événement lifecycle propre

Je veux voir dans l’historique :

```text
18:17  Objectif atteint
00:00  Journée clôturée
00:00  Vérification terminée
00:00  Évaluation réussie
00:00  Compte Performance créé
00:01  Règles Performance consultées
00:02  Premier accès WariX Performance
```

Pas :

```text
maximum_loss_breach
performance_provisioned
policy_transition
```

Les enums restent backend/Control.

---

# 13. Le Support doit comprendre le lien entre les comptes

Quand le trader ouvre un ticket depuis Performance, Control doit voir :

```text
TRADER
...

COMPTE CONCERNÉ
PERF-20731

COMPTE D’ORIGINE
EVAL-10482

POLICY PERFORMANCE
vX.X.X

EVALUATION POLICY
v1.1.1
```

Un opérateur ne doit jamais devoir chercher manuellement le compte parent.

---

# 14. Analytics produit également

Sinon on ne saura jamais où les gens abandonnent.

Les événements importants :

```text
evaluation_objective_reached
evaluation_finalization_started
evaluation_passed
performance_provisioning_started
performance_account_created
performance_rules_viewed
performance_rules_acknowledged
performance_account_opened
performance_first_trade
```

On pourra mesurer :

```text
Evaluation passed
      ↓ 96 %
Performance created
      ↓ 92 %
Rules viewed
      ↓ 88 %
WariX opened
      ↓ 74 %
First Performance trade
```

Et découvrir immédiatement une friction.

---

# 15. Il faut modifier la Phase 3.3 decision closure

Je ne traiterais plus seulement :

```text
ONE-025
UX-SUPPORT-004
```

Je transformerais le micro-slice en :

# **PHASE 3.3.1 — Evaluation → Performance Handoff Closure**

Son gate devrait être exactement :

```text
OBJECTIVE_INTRADAY_DOES_NOT_PASS_ACCOUNT = yes
PASS_ONLY_AFTER_DAILY_FINALIZATION = yes

EVALUATION_TO_PERFORMANCE_LINK_READY = yes
PERFORMANCE_ACCOUNT_CREATED_EXACTLY_ONCE = yes
PERFORMANCE_ACCOUNT_PUBLIC_ID_VISIBLE = yes

EVALUATION_SUCCESS_SCREEN_READY = yes
PERFORMANCE_PROVISIONING_SCREEN_READY = yes
PERFORMANCE_READY_SCREEN_READY = yes

PERFORMANCE_RULES_ONBOARDING_READY = yes
ONE_VS_PERFORMANCE_RULE_COMPARISON_READY = yes
PERFORMANCE_RULES_DYNAMIC_FROM_POLICY = yes
HARDCODED_PERFORMANCE_RULE_VALUES = 0

PERFORMANCE_BUFFER_EXPLAINED = yes
PAYOUT_PATH_EXPLAINED = yes
PERFORMANCE_DAYS_EXPLAINED = yes
BEST_DAY_PERFORMANCE_RULE_EXPLAINED = yes

PERFORMANCE_POLICY_VERSION_ACKNOWLEDGED = yes

EVALUATION_ACCOUNT_NON_TRADABLE_AFTER_PASS = yes
PERFORMANCE_ACCOUNT_TRADABLE_ONLY_WHEN_ACTIVE = yes

WARIX_ACCOUNT_CONTEXT_PARITY = yes

PARENT_EVALUATION_LINK_VISIBLE = yes
CHILD_PERFORMANCE_LINK_VISIBLE = yes

SUPPORT_PARENT_CHILD_CONTEXT_READY = yes
CONTROL_PARENT_CHILD_CONTEXT_READY = yes

MOBILE_320_READY = yes
MOBILE_390_READY = yes

RAW_INTERNAL_ENUMS = 0
FAKE_FINANCIAL_VALUES = 0
```

---

## Et j’ajoute un dernier élément que nous avions également oublié

**Le trader doit pouvoir revenir consulter exactement les règles qu’il avait acceptées.**

Dans :

> Comptes → PERF-20731 → Règles

il doit voir :

```text
Règles de votre compte

WARIBA Performance
PERF-20731

Version acceptée
PERFORMANCE x.x.x

Acceptée le
24 août 2026 · 00:01 UTC

[ Voir mes règles ]
```

Même si WARIBA publie une nouvelle version demain, **son compte continue d’afficher la version qui lui est attachée**, sauf mécanisme contractuel explicite permettant un changement.

C’est indispensable pour la confiance, les payouts et les contestations.

---

Donc oui : **on avait encore oublié une grosse partie du parcours.**

Le passage ne doit pas être simplement :

> Evaluation réussie → compte Performance.

Il doit être :

**objectif atteint → clôture → vérification → réussite → création du nouveau compte → nouveau numéro → explication de ce qui change → règles Performance versionnées → chemin vers payout → confirmation de lecture → ouverture de WariX dans le bon compte → dashboard Performance totalement différent.**

C’est ce que je mettrais dans le prochain prompt Claude avant d’autoriser Phase 3.4.
