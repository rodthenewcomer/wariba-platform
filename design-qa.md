# Design QA — site public WARIBA v1.1

Date : 2026-08-03  
Périmètre : accueil, Programme, WariX, Offres, Aide, Support, navigation et footer.  
Navigateur de validation : navigateur intégré Codex, viewport 1280 × 720, DPR 2.

## Références inspectées

- `https://www.topstep.com/topstep-prop`
- `https://www.topstep.com/our-program`
- `https://www.topstep.com/topstepx`
- `https://ftmo.com/en/faq/`
- captures segmentées : `output/audit-2026-08-03-warix/`

Les références servent uniquement à étudier la hiérarchie, le rythme, les parcours et les
patterns d’interaction. L’identité, les textes, les images, les preuves et les composants
visuels WARIBA sont originaux et respectent le Design System du dépôt.

## États WARIBA vérifiés

| Page          | URL locale   | Preuve                               |
| ------------- | ------------ | ------------------------------------ |
| Accueil       | `/`          | `wariba-home-v11-final-1280x720.jpg` |
| Programme     | `/programme` | `wariba-programme-desktop.jpg`       |
| WariX         | `/warix`     | `warix-desktop.jpg`                  |
| Offres        | `/offres`    | `offres-desktop.jpg`                 |
| Centre d’aide | `/aide`      | `aide-desktop.jpg`                   |

Comparaison combinée, même viewport :
`output/audit-2026-08-03-warix/home-source-vs-wariba-final.jpg`.

## Contrôles visuels

- Header lisible, navigation principale stable et CTA visible.
- Hero plein écran avec photographie réelle, sujet placé à droite et espace de lecture à gauche.
- Hiérarchie du titre, sous-titre et double CTA proche du rythme de la référence sans copie de marque.
- Ink, Bone, Cobalt et Copper utilisés conformément aux tokens WARIBA ; aucun gradient dominant.
- Cartes du programme, règles v1.1, prix FCFA et disclaimer visibles sans faux chiffre de performance.
- Footer complet avec navigation produit, assistance, pages légales et avertissement sandbox.
- Images non étirées, cadrage cohérent, contrastes texte/fond lisibles au viewport inspecté.
- Responsive assuré par les breakpoints et le menu mobile natif `<details>` ; le contrôle visuel
  automatisé multi-viewport reste séparé car le navigateur retenu pour cet audit ne permet pas de
  modifier son viewport.

## Interactions vérifiées

- WariX : sélection `XAUUSD`, action `Vente`, ticket mis à jour avec le prix sandbox `2340.20`.
- Aide : recherche `FCFA`, filtrage vers « Pourquoi les prix… », ouverture de la réponse.
- Offres : les cinq cartes 5K, 10K, 25K, 50K et 100K affichent les montants FCFA v1.1.
- Navigation : les routes publiques demandées répondent et sont incluses dans le build Next.js.
- Console locale : aucune erreur JavaScript WARIBA observée ; les erreurs tierces enregistrées
  provenaient uniquement des pages de référence externes.

## Historique de comparaison

1. Round 1 — ancien accueil contre la référence : hero trop plat, absence de photo forte,
   densité et parcours de conversion insuffisants. Décision : reconstruction complète du site public.
2. Round 2 — accueil final contre la référence : structure, hiérarchie, CTAs et densité alignés ;
   identité WARIBA, contenu français, règles et preuves originales conservés.

## Limites conscientes

- Les pages légales sont des brouillons bêta originaux à faire valider par un conseil local avant vente publique.
- Aucun témoignage, partenaire, gain ou volume client n’a été inventé.
- La suite Playwright `test:visual` n’a pas été lancée dans ce passage afin de respecter le navigateur
  choisi ; les captures et interactions ci-dessus proviennent du navigateur intégré.

Final result: passed

---

# WX1 right execution dock — design QA

## Inputs

- Reference: `/Users/rodrigueadebigni/Downloads/Screenshot_13-8-2026_14576_topstepx.com.jpeg`
- Product brief: `/Users/rodrigueadebigni/.codex/attachments/c071f7fe-ecad-4117-9775-7e2b66874f36/pasted-text.txt`
- Before capture: `docs/04-ux/evidence/warix-wx1-right-dock-compaction/before/`
- After capture: `docs/04-ux/evidence/warix-wx1-right-dock-compaction/after/`

## Side-by-side conclusion

The reference was used only for spatial discipline: a narrow order surface,
compact quote hierarchy and a chart-dominant workstation. Branding, colours,
labels, risk information and trading semantics remain WARIBA.

The default dock contracts from 320 px to 260 px at 1920, 248 px at 1440 and
236 px at 1280–1366. The exact removed width transfers one-for-one to the chart
module and plot: +60, +72 and +84 px respectively. The resulting composition is
visibly chart-led and the action surface remains immediately legible.

## Visual and interaction checks

| Check                                                           | Result        | Evidence                                                     |
| --------------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| Instrument and status share one tight row                       | Passed        | all after screenshots                                        |
| Bid, Ask and spread remain fully legible at 236 px              | Passed        | `04-1280-default.png`                                        |
| Market / Limit / Stop remain clear and keyboard-operable        | Passed        | isolated UI/web unit suites                                  |
| Quantity and quick sizes remain usable                          | Passed        | unit suite and 1280 capture                                  |
| SL / TP values fit the compact fields                           | Passed        | `06-1440-sl-populated.png`                                   |
| Margin, DLL and MLL remain pinned with actions                  | Passed        | all after screenshots                                        |
| Secondary impact detail remains available but collapsed at rest | Passed        | default captures                                             |
| Buy / Sell remain dominant and at least 44 px on touch          | Passed        | mobile E2E                                                   |
| Tallest desktop state keeps both actions fully in viewport      | Passed        | desktop E2E                                                  |
| Critical/serious accessibility violations                       | Passed — 0    | Axe E2E with pending order                                   |
| Document horizontal overflow                                    | Passed — 0 px | ten-state manifest                                           |
| Live in-app browser verification                                | Passed        | 1440×900, realtime open, all eight critical controls visible |

## State preservation

All ten evidence transitions recorded no chart remount, no history request, no
execution-draft loss and no drawing loss. The 224 px manual width restored to
224 px after reload; the real chart drawing also restored.

## Residual review boundary

Automated and agent visual QA passed. The user approved the compact right-dock
direction on 13 August 2026; it was not redesigned during closure. Overall WX1
acceptance and merge remain separate and were not performed.

## Closure evidence

- 224px Market, Limit, SL, SL+TP, estimate and server rejection inspected.
- The first 224px render exposed clipped five-decimal SL/TP fields; closure
  stacked those two fields only below 220px of panel content and recaptured all
  six states.
- Final measurements: no clipped quote or protection price, no wrapped monetary
  value, no truncated order type, usable 48px Buy/Sell keys and 0px horizontal
  overflow.
- 1024 Navigator closed/open geometry is identical: module 732×504px, plot
  696×370px.

final result: passed
