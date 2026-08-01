# WARIBA Product Master Document v1.0

**Statut :** baseline produit avant développement  
**Marque :** WARIBA  
**Domaine :** wariba.app  
**État du projet :** dossier créé, aucun code commencé  
**Marché initial :** Afrique francophone  

> Une infrastructure de progression pour traders disciplinés.

## 1. Résumé exécutif

WARIBA est une plateforme francophone d’évaluation et de progression pour traders. La V1 exécute une chaîne unique : découverte, achat, activation, trading simulé, évaluation, compte Performance, payout sandbox, revue interne et support.

WARIBA ne commence pas comme broker, plateforme multi-actifs, réseau social ou application native. Elle se différencie par la clarté des règles, l’expérience mobile, les paiements locaux, la transparence du risque et des payouts.

## 2. Contexte verrouillé

- WARIBA remplace définitivement R1STER.
- Le domaine principal reste `wariba.app`.
- L’ancien projet BRVM portant le nom WARIBA doit être renommé.
- Le dossier est vide ; les prompts doivent initialiser le projet depuis zéro.
- Codex est le constructeur principal. Claude Code intervient plus tard comme auditeur.
- GitHub privé et CI sont obligatoires dès le premier fichier.

## 3. Vision, mission et positionnement

**Vision :** construire la plateforme francophone de référence pour identifier, développer et accompagner les traders disciplinés vers une allocation progressive de capital.

**Mission :** permettre aux traders de démontrer leur niveau dans un environnement transparent, mesurable et adapté aux réalités locales.

**Positionnement :** WARIBA est une infrastructure de progression pour traders disciplinés.

## 4. Principes fondateurs

1. Clarté avant persuasion.
2. Risque avant performance.
3. Non-rétroactivité des règles.
4. Preuve avant croissance.
5. Local par conception.
6. Décision explicable.
7. Humain responsable des décisions sensibles.
8. Simplicité durable.

## 5. Utilisateurs

- Débutant discipliné.
- Trader intermédiaire.
- Trader confirmé sous-capitalisé.
- Utilisateurs internes : Support, Risk, Finance, Administration technique.

## 6. Architecture de capacités

- WARIBA ONE
- WARIBA Hub
- WARIBA Trade
- WARIBA Guardian
- WARIBA Performance
- WARIBA Review
- WARIBA Assist
- WARIBA Control

Ces capacités ne sont pas huit offres commerciales séparées. Le client achète WARIBA ONE et utilise les capacités nécessaires à son parcours.

## 7. Parcours critique

Découverte → inscription → paiement → activation → évaluation → passage → Performance → payout → Review.

Chaque étape doit afficher l’état, la règle applicable, la prochaine action et une preuve auditable.

## 8. Périmètre V1

Inclus : homepage, auth, checkout sandbox, Hub, Trade, Guardian, Evaluation, Performance, Payout, Control, support, PWA.

Différé : capital live, futures, crypto, app native, copy trading, affiliation massive, Academy complète et API publique.

## 9. Règles candidates

### WARIBA ONE

- Une phase.
- Target 8 %.
- DLL 4 % soft lock.
- Max loss 8 % statique.
- Consistency 40 %, non-breach.
- 4 jours minimum.
- 3 journées profitables qualifiées.
- 0,20 % minimum par journée.
- Durée illimitée ; inactivité 30 jours.
- Pas de frais d’activation.
- Overnight autorisé ; weekend non.
- Pas de trailing drawdown.

### WARIBA Performance

- Compte simulé.
- DLL 3 % soft lock.
- Max loss 6 % statique.
- Consistency 40 % par cycle.
- 5 journées qualifiées à 0,30 % minimum.
- Threshold 4 % au payout #1, puis 3 % aux payouts #2 à #5.
- Maximum distribuable : 50 % du profit net du cycle.
- Split 80/20 pour #1–4 ; 90/10 pour #5.
- Cinq payouts, puis WARIBA Review.

### Produits et prix de travail

- 5K : 14 900 FCFA.
- 10K : 27 900 FCFA.
- 25K : 59 900 FCFA, limité ou après bêta.

### Instruments de lancement

EURUSD, GBPUSD, USDJPY, XAUUSD, NAS100.

## 10. Payout

`Payout Base = min(50 % du profit net réalisé du cycle, cap applicable)`

Le montant trader est le Payout Base multiplié par le split. La réserve insuffisante affecte les futures ventes, jamais rétroactivement un payout gagné.

## 11. UX

- État du compte compréhensible en cinq secondes.
- Règles visibles dans le produit.
- Mobile-first réel.
- Erreurs explicables.
- Aucun dark pattern.
- Terminal concentré.

## 12. Design

Direction : **Quiet Financial Authority**.

- Ink `#0B0D12`
- Bone `#F7F3EB`
- Cobalt `#3157F5`
- Copper `#BE6945`
- Manrope + IBM Plex Mono

Éviter gradients IA génériques, glassmorphism généralisé, bento répétitif, faux dashboards et cartes imbriquées.

## 13. Trust System

- Règles publiques et versionnées.
- Policy immuable par compte.
- Violations et décisions explicables.
- Payout transparent.
- Status page et incident log.
- Statistiques réelles uniquement.

## 14. IA et support

WARIBA Assist peut rechercher, expliquer, lire un statut, créer un ticket et résumer. Il ne peut pas donner de signaux, modifier un compte, annuler une violation, approuver un payout ou bannir un utilisateur.

## 15. Économie et réserve

Revenu principal : frais d’évaluation. Pas de frais d’activation ni d’abonnement obligatoire en V1.

Couverture de réserve :

- ≥ 2,0x : normal.
- 1,5–2,0x : prudence.
- 1,2–1,5x : défensif.
- < 1,2x : critique.

## 16. North Star et KPI

**North Star :** nombre de traders progressant vers l’étape suivante tout en respectant les limites de risque.

Mesurer acquisition, activation, trading, risque, progression, payout, support, confiance et marge par cohorte.

## 17. Architecture technique de haut niveau

- Modular monolith.
- Next.js, React, TypeScript strict.
- Node.js/Fastify et WebSocket.
- PostgreSQL/Supabase et RLS.
- Lightweight Charts.
- Decimal/numeric pour les valeurs financières.
- Serveur autoritaire.
- Policies versionnées.
- GitHub privé, CI stricte, staging automatique et production manuelle.

## 18. Gates avant lancement public

- Séparation de l’ancien WARIBA BRVM.
- Avis juridique local.
- PSP marchand autorisé.
- Données de marché licenciées.
- Modèle financier stressé et réserve séparée.
- Audit sécurité.
- Runbooks opérations et support.

## 19. Plan de build

- S0 : spécifications.
- S1 : fondation.
- S2 : commerce.
- S3 : trading core.
- S4 : risk.
- S5 : Hub et Trade.
- S6 : Performance et payout.
- S7 : Control et support.
- S8 : hardening et bêta privée.

## 20. Documents suivants

1. WARIBA Program Rulebook v1.0.
2. WARIBA Financial Model v1.0.
3. WARIBA UX Architecture v1.0.
4. WARIBA Design System v1.0.
5. WARIBA Engineering Constitution v1.0.
6. WARIBA System Architecture v1.0.
7. WARIBA Security / QA / Operations Standard.
8. WARIBA Build Plan & Prompt Pack.

## 21. Prochaine étape

Produire **WARIBA Program Rulebook v1.0** avant de lancer le premier prompt de code.
