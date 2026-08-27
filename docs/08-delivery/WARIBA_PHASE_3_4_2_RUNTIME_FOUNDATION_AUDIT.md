# WARIBA Phase 3.4.2 — Policy Runtime Foundation Audit

> **STATUS = AUDIT COMPLETE — IMPLEMENTATION AUTHORIZED BY PHASE 3.4.2**
> **NORMATIVE SOURCE = POLICY-GOV-003 + Canonical Policy Contract V2**
> **V1 ROLE = HISTORICAL ACCOUNTS ONLY; NEVER A TARGET OR FALLBACK FOR NEW WORK**
> **PUBLIC V2 ACTIVATION = BLOCKED**
> Date : 27 août 2026
> Branche : `feat/phase-3-4-2-runtime-foundation`
> START SHA : `9dff986e5880130725a64866431ec8e3635f2a16`

## 1. Résumé exécutif

V2 est la seule source de vérité normative pour les nouvelles offres et les
futurs comptes pilotes. Le runtime existant n'est utilisé dans cet audit que
pour localiser les écarts et préserver les comptes V1 déjà attachés à leur
policy historique.

Les fondations réutilisables sont réelles : UUID de policy sur chaque compte,
hash machine vérifié, ledger append-only, verrou de ligne par compte,
idempotence paiement/ordre/payout, séparation partielle du profit éligible à
60 secondes, cycles Performance et réconciliation financière. Elles ne
suffisent pas à héberger V2 : publication mutable, consentement et commande
non épinglés à l'UUID, catalogue taille-only, absence de FLEX/INSTANT, payout
confondu avec la projection de risque, marge non calibrée/non enforced et
absence de contracts news/session versionnés.

La stratégie retenue est additive et fail-closed : faire évoluer les tables et
les contrats existants, ne repin aucun compte V1, stocker les 15 offres V2 mais
les rendre non achetables, préparer les lifecycles et les calendars sans faux
provider, et ne pas activer les caps 20/15/10 tant que la calibration demeure
ouverte.

## 2. Audit des capabilities

| Capability | Current implementation | V1 safe? | V2 requirement | Gap | P0/P1 | Planned change |
|---|---|---:|---|---|---|---|
| Policy definitions | Deux schémas Zod : Evaluation ONE et Performance V1 | oui, si inchangés | ONE/FLEX/INSTANT, phase Evaluation/Performance, références versionnées | dispatch fondé uniquement sur `program` | P0 | ajouter identité produit + phase, schémas V2 discriminés et compatibilité stricte V1 |
| Policy publication | rows `draft/reviewed/approved/published/retired`; loader par `created_at` | partiel | état explicite, publication idempotente, future policy sélectionnable sans migration silencieuse | plusieurs published possibles; pas de commande canonique | P0 | resolver unique + contrainte de publication + commande auditée/idempotente |
| Policy immutability | intention ADR-024, aucune protection DB | non | published immutable; changement = nouvelle identité/version | UPDATE/DELETE service-role possibles | P0 | trigger DB interdisant mutation/suppression d'une policy publiée ou utilisée |
| Account attachment | `trading_accounts.policy_version_id` UUID non nul | oui | policy exacte et preuves/hash/locale attachés | compte pin correct, chaîne checkout incomplète | P0 | renforcer FK/immutabilité du pin; snapshot d'acceptation et provenance |
| Product version | `product_versions` versionne prix par produit taille-only | oui | programme × taille × version/effective period | le produit n'identifie pas ONE/FLEX/INSTANT | P0 | faire évoluer `products` avec famille produit et unicité famille×taille |
| Price version | prix + currency + activation_fee V1 | oui | upfront, activation, total-if-success immuables | activation forcée à zéro et aucun snapshot commande | P0 | étendre product version; snapshot monétaire sur purchase order |
| Offer type | taille seule | oui | ONE/FLEX/INSTANT × cinq tailles | FLEX/INSTANT non représentables | P0 | code produit canonique sur catalogue, purchase et account provenance |
| Evaluation policy | ONE V1 paramétrique | oui | ONE 8/3/8/35 et FLEX 4/3/6/35 | FLEX absent; valeurs V2 non stockées | P0 | policies V2 candidate/pilot-ready non publiées publiquement |
| Performance policy | `WARIBA_PERFORMANCE` V1 global | oui | policy compatible dérivée du produit parent | loader « latest Performance » global | P0 | lien explicite policy Evaluation → policy Performance compatible |
| FLEX activation | absent | n/a | `passed → activation_due → paid → Performance`, fenêtre 30 j | aucun état, obligation ou snapshot | P0 | obligation d'activation immutable, états, expiration non destructive, exactly-once |
| INSTANT provisioning | absent | n/a | purchase confirmé → Performance direct | seul chemin = fake Evaluation/ONE pass | P0 | provisioning direct par purchase, provenance INSTANT, exactly-once |
| Leverage | colonnes ONE/Performance sur symbol specs | oui | FX/METALS/INDICES/ENERGY par produit/phase | deux colonnes fixes; pas de profil V2 versionné | P0 | profil JSON/versionné référencé par policy; aucune valeur OPEN inventée |
| Instrument groups | strings V1 (`forex_major`, `metal`, `index_cfd_simulated`) | oui | FX/METALS/INDICES/ENERGY | mapping V2 incomplet, énergie/US30 sans specs | P0 | abstraction asset group et validation fail-closed |
| Margin cap | colonnes 30/25 historiques; gate réel en lots | oui pour V1 | capability 20/15/10 uniquement après calibration | taux non consommés; calibration OPEN | P0 | moteur marge générique + état `calibration_required`; aucune activation V2 |
| Eligible P&L | balance ledger moins profit court inéligible | partiel | compte, éligible programme et risque distingués | payout debit diminue aussi le risque | P0 | projection triple : financière, éligible payout, ajustée risque |
| 60 second rule | close-fill, timestamp serveur, partiels, pertes/frais comptés | oui | règle commune V2 à frontière 60 000 ms | contrôle activé seulement par fields policy historiques | P0 | rendre la capability obligatoire dans les policies V2 et renforcer boundaries/property tests |
| News rules | booléen `news_allowed`; aucune enforcement serveur | oui | Eval libre; Performance T-2/T+2 high-impact, reduce/close only | aucun événement/version/mapping/capability gate | P0 | contracts + persistence versionnée + permission matrix + provider gate false |
| Market sessions | calendrier 24×5 utilisé pour historique chart, pas Order Gateway | oui | sessions instrument versionnées; fermeture ≥2 h | aucun calendrier attaché ni pre-trade permission | P0 | contract séparé, source readiness false, permission matrix testée |
| Payout split | V1 default/final seulement | oui | 80/80/85/85/90 par policy V2 | schedule 5 rangs non représenté directement | P0 | schedule explicite versionné |
| Payout caps | tuple cinq caps par nominal | oui | caps V2 exacts par taille | valeurs V1 différentes | P0 | policies Performance V2 portent la grille canonique; V1 inchangée |
| Payout debit | débit ledger append-only; unique par payout | financier oui | débit autorisé neutre pour daily/ML | balance éligible utilisée par Risk inclut le débit | P0 | projection risque excluant débit et reversal payout, réconciliation inchangée |
| Daily finalization | snapshot UTC idempotent, policy ID, balance/eligible | oui | risque payout-neutral, V1/V2 coexistants | même projection pour éligibilité et risque | P0 | champs/projection de balance risque et tests payout/loss race |
| Policy read models | Hub/Control lisent policy attachée partiellement | oui | backend DTO complet V2 | pas de produit/version/leverage/margin/calendars | P1 | read model backend-only, aucune modification Hub/WariX |
| Catalogue availability | liste filtrée par réserve et feature flag | oui | catalogue 15/15 distinct de purchase eligibility | contrôle interne masque le catalogue | P1 | read model catalogue complet + décision d'achat séparée et reason code |
| Feature/capability gates | booléens taille + zone trésorerie | partiel | produit×taille×pays, éventuellement canal | pas de table/version; mélange catalogue/acquisition | P1 | table de gates deny-by-default sans droit rétroactif sur compte activé |
| INSTANT reserve gate | absent | n/a | capability pour fermer 50K/100K sans chiffre inventé | aucun quota/gate par offre | P0 | gate `reserve_required` non satisfait par défaut |
| Audit trail | `audit.audit_events` + outbox existants | oui | transitions sensibles avec policy/purchase/account | nouveaux events absents | P0 | réutiliser tables existantes; aucun second audit log |

## 3. Scope d'implémentation

### Objectif

Rendre le backend capable de stocker, résoudre, attacher et tester V1 et V2
simultanément, avec lifecycles FLEX/INSTANT, projections financières séparées,
contracts marge/news/session et activation V2 fail-closed.

### Scope

- migration additive policy/catalogue/purchase/account/lifecycle/calendars/gates;
- schémas et loaders policy V1/V2;
- catalogue runtime des 15 offres, toutes stockées mais non achetables;
- pinning checkout → commande → compte;
- FLEX activation et INSTANT direct Performance exactement une fois;
- séparation balance financière / P&L éligible / balance ajustée risque;
- permission contracts news/session et moteur marge générique;
- read model backend et tests unit/property/DB/integration/RLS ciblés;
- synchronisation Source-of-Truth Map, Blast Radius et closure report.

### Non-scope

- activation publique V2;
- changement visuel WariX, Hub, checkout ou site public;
- provider news/session réel;
- PSP/KYC/rail réel;
- adoption normative d'un nouveau cap de marge;
- Phase 3.4.3 Risk & Lifecycle V2 complet;
- push, PR, merge ou déploiement.

## 4. Fichiers et migrations prévus

- nouvelle migration créée par Supabase CLI sous `supabase/migrations/**`;
- `packages/policies/src/**` pour identité/schéma/hash/activation readiness;
- `packages/database/src/schema.ts`, policy/catalogue/provisioning/projections/calendars;
- `packages/application/src/**` seulement pour contrats backend commerce/read model;
- `packages/domain/src/**` pour math marge et permissions pures;
- tests associés sous `packages/**/tests` et `supabase/tests`;
- documents techniques Phase 3.4.2.

`apps/**`, fichiers WariX, Hub et site public restent hors scope.

## 5. Risques et compensations

| Risque | Compensation / rollback |
|---|---|
| contamination V1 par resolver V2 | tout compte lit son UUID; tests de non-rétroactivité; aucune update de compte existant |
| migration destructive | changements additifs; contraintes validées après backfill; migration historique jamais modifiée |
| double compte Performance | uniques DB sur source Evaluation, source purchase INSTANT et obligation FLEX |
| double paiement FLEX | type de paiement + idempotency provider + unique obligation/attempt |
| payout-neutralité masque une vraie perte | neutraliser uniquement entries `payout_debit` et leurs reversals; property/race tests |
| cap marge candidat activé par accident | readiness/calibration gate DB et policy; offres V2 non purchasables |
| sanction news sans source | aucune permission restrictive si event version fiable absent; activation V2 bloquée |
| session inventée | source versionnée obligatoire; aucun horaire Friday hardcodé |
| nouvelles tables exposées | RLS activée, grants anon/authenticated revus, aucune écriture financière navigateur |

## 6. Décisions encore ouvertes

- `MARGIN_CALIBRATION_OWNER_DECISION_REQUIRED = yes` : US30 et données de
  risque/stops/gaps manquent; 20/15/10 reste `CALIBRATION_REQUIRED`.
- `REAL_NEWS_PROVIDER_READY = no` : fournisseur non choisi.
- `REAL_MARKET_SESSION_PROVIDER_READY = no` : source contractuelle non choisie.
- conséquence commerciale définitive de l'expiration FLEX : le runtime
  conserve le pass et bloque le provisioning avec
  `activation_window_expired`; la remediation Support reste future.

Ces ouverts bloquent l'achat/activation public V2, pas la construction de la
fondation runtime.
