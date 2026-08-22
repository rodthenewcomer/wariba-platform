# WARIBA PRODUCT OS v2.0 — SELF-QA / GAP AUDIT

> Audit compagnon du master `WARIBA_PRODUCT_OS_MASTER_CONSTITUTION_2026.md`.

## 1. Corrections faites par rapport à la constitution précédente

- Add Account est maintenant un CTA et non une navigation principale.
- La séparation Trader Hub / Dashboard / WariX est renforcée.
- Les routes Auth ont désormais un blueprint UX complet.
- Offers et Checkout ont un blueprint visuel détaillé.
- Dashboard possède des compositions distinctes selon les états.
- La transition pass_pending est visualisée comme un morph de page et pas uniquement comme un statut.
- Performance active transforme la mission du Dashboard.
- KYC au premier payout reste la politique par défaut mais prévoit une exception légale/provider.
- La politique de trading pendant payout est explicitement OPEN.
- Payout Readiness dépasse KYC : beneficiary, sanctions, pays, method, holds, freshness.
- Les alertes ont trois rôles non dupliqués : toolbar shortcut, rail management, bottom log.
- Chart Preferences, WariX Settings, Risk Center et Risk Calculator ont des frontières strictes.
- WariX Settings possède une architecture détaillée.
- Le workspace WariX doit préserver le chart state et éviter les remounts.
- Le global rail WariX est spécifié en grandes icônes et séparé de Hub.
- Drawing Rail et Right Utility Rail ont des tailles optiques minimum.
- Mobile WariX ne compresse plus les trois rails : sheets et actions persistantes.
- Le statut data stale/offline est clarifié et remplace les popups vagues type « Prix obsolète ».
- French-first i18n est devenu une règle technique.
- WARIBA Control possède des queues opérationnelles concrètes.
- Une direction visuelle premium, materials, palette, typography, icons, images et motion a été ajoutée.
- Fast Visual Loop et full certification sont séparés.

## 2. Zones volontairement OPEN

- Reset / repurchase.
- Refund policy.
- Max active accounts.
- Definitive public prices.
- Trading restrictions during payout.
- Real KYC provider.
- Real payout provider.
- Production PSP.
- Market-data commercial display rights.
- DOM provider/capability.
- Screener capability.
- Calendar/news provider.
- Any future real-capital program.

Aucune valeur n’a été inventée.

## 3. Points à vérifier dans le dépôt avant adoption LOCKED

1. Décision Log actuel.
2. Rulebook et Account Policy en vigueur.
3. Financial model et actuarial model.
4. Baseline WariX acceptée VX1-F.1 et worktree actuel.
5. Routes existantes et placeholders.
6. Auth provider et current returnTo behavior.
7. Payment sandbox / webhook contracts.
8. Existing account statuses and migrations.
9. Current payout/KYC sandbox model.
10. Existing Control surface.
11. Design token compatibility with proposed visual roles.
12. Exact mobile shell already accepted.
13. Market-data licensing decision.
14. Current right/left/drawing rail implementations.

## 4. Risque principal restant

Le plus gros risque produit n’est plus l’absence d’architecture : c’est l’exécution visuelle.

Un agent peut respecter les bonnes routes et machines d’état tout en produisant un produit visuellement moyen.

La solution imposée par le master : wireframe → representative state → screenshot → visual inspection → correction → propagation.

## 5. Verdict audit

```text
MASTER_COVERAGE_PRODUCT = high
MASTER_COVERAGE_LIFECYCLE = high
MASTER_COVERAGE_BACKEND_CONTRACTS = high
MASTER_COVERAGE_HUB_UX = high
MASTER_COVERAGE_WARIX_UX = high
MASTER_COVERAGE_AUTH = high
MASTER_COVERAGE_COMMERCE = high
MASTER_COVERAGE_KYC_PAYOUT = high
MASTER_COVERAGE_CONTROL = high
MASTER_COVERAGE_MOBILE = high
MASTER_COVERAGE_VISUAL_LANGUAGE = high
OPEN_DECISIONS_INVENTED = no
KNOWN_PRODUCT_DUPLICATION = resolved_by_contract
READY_FOR_DECISION_LOG_RECONCILIATION = yes
READY_FOR_CODEX_PHASED_EXECUTION = after governance adoption
```

## 6. Second self-audit — additions after first pass

Après une seconde revue du master, les éléments suivants ont été ajoutés avant livraison :

- grammaire de cartes et mini-cartes ;
- boutons/toggles ;
- formulaires ;
- tables ;
- modal/drawer/popover/sheet ;
- toast policy ;
- matrice notifications ;
- route guards ;
- staff RBAC ;
- idempotence ;
- invariants de concurrence ;
- appels externes/outbox/reprise ;
- sources de vérité ;
- constitution visuelle du chart ;
- constitution toolbar ;
- sémantique exacte des trois familles d’icônes ;
- multi-account behavior ;
- grammaire des visualisations de performance ;
- motion lifecycle ;
- art direction pour images/illustrations ;
- Help/Education ;
- privacy/observability ;
- empty-state library ;
- independent-review gate ;
- conditions de lock du master.

SECOND_PASS_MISSING_MAJOR_AREA = none_identified
