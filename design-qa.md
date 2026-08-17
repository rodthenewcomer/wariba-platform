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

---

# WX1 final combined shell, terminology and toolbar — design QA

Date: 2026-08-13

## Source visual truth

- Combined implementation contract:
  `/Users/rodrigueadebigni/Downloads/WARIX_WX1_FINAL_COMBINED_UI_SHELL_TERMINOLOGY_TOOLBAR_PROMPT.md`
- Toolbar and chart-type reference:
  `/Users/rodrigueadebigni/Downloads/Screenshot_13-8-2026_2219_topstepx.com.jpeg`
- Compact account header reference:
  `/Users/rodrigueadebigni/Downloads/Screenshot_13-8-2026_22048_topstepx.com.jpeg`
- Toolbar spacing reference:
  `/Users/rodrigueadebigni/Downloads/Screenshot_13-8-2026_215910_topstepx.com.jpeg`

The references were used for information architecture, spacing, density and interaction
grammar only. WARIBA identity, French copy, tokens and original icon assets remain intact.

## Rendered implementation

- Combined comparison input:
  `docs/04-ux/evidence/warix-wx1-final-combined/design-qa-comparison.png`
- Loaded 1440 × 900 workstation:
  `docs/04-ux/evidence/warix-wx1-final-combined/desktop-1440-loaded.png`
- Chart-type selector and four loaded renderers:
  `desktop-chart-type-menu.png`, `desktop-{bars,line,area}-loaded.png`
- Search, settings, utility drawers and dock reuse:
  `desktop-symbol-search.png`, `desktop-settings-controls-only.png`,
  `desktop-{markets,trade}-drawer.png`, `desktop-{activity,alerts}-dock.png`
- Drawing rail disclosure and flyout:
  `desktop-left-rail-hover-chevron.png`, `desktop-left-rail-lines-flyout.png`
- Mobile 390 × 844 and 320 × 800:
  `mobile-390-{loaded-toolbar,chart-type,indicators,markets,tools}.png`,
  `mobile-320-toolbar.png`

## Comparison and iteration history

1. The first live render exposed a history-controller lifecycle mismatch in React Strict Mode:
   the visible controller stayed in `loading` while a discarded initializer owned the response.
   Transport subscriptions now attach during `start`, so the loaded chart reaches `ready` and
   renders the authoritative bounded history.
2. The drawing-family flyout existed in the DOM but was clipped by its rail's `overflow-hidden`.
   The rail now preserves its frozen 42 px silhouette while allowing the popover to render over
   the plot. The family chevron remains invisible at rest and appears at the right edge on intent.
3. The first 390 px chart-type menu overflowed the viewport on the right. Its mobile alignment was
   inverted to the trigger's right edge, while desktop keeps the reference-like left alignment.
4. Indicator-sheet roadmap copy was removed. Settings and indicator surfaces now present controls
   and real availability without explaining internal implementation or future engines.
5. The final 1440 render contains 70+ loaded candles, OHLC, two real moving averages, the truthful
   UTC footer and no chart-toolbar Bid/Ask duplication. The chart remains the dominant surface.

## Final fidelity assessment

- Header: one compact account/risk line; no public identifier, no repeated USD labels and no
  legacy DLL/maximum-loss wording.
- Toolbar: one desktop row with clear left/right clusters, reference-like seams and real controls.
- Chart style: Candles, Bars, Line and Area consume the same canonical candle history.
- Drawing rail: 18 real controls, full-height distribution, 20 px glyph grammar and functional
  flyouts; no TradingView mark or proprietary asset.
- Right utility architecture: one inward drawer at a time; Activity and Alerts reuse the dock.
- Mobile: one 390 px toolbar row and zero document overflow at 320 px; Markets, Indicators and
  Tools open their canonical sheets.
- Loaded-state evidence: `data-history-status=ready`; the final desktop capture contained more
  than 70 finalized candles after the local mock service had accumulated history.

No automated test or certification suite was run, per the user's explicit fast visual-build
instruction. The rendered browser checkpoints are the acceptance evidence for this pass.

final result: passed

---

# WX1 right utility rail layout refactor — design QA

Date: 2026-08-13

## Source visual truth

- Layout contract and target wireframes:
  `/Users/rodrigueadebigni/Downloads/WARIX_WX1_RIGHT_UTILITY_RAIL_LAYOUT_REFACTOR.md`
- Accepted pre-refactor workstation and frozen chart-tool surface:
  `docs/04-ux/evidence/warix-wx1-round2/desktop-1440-full.png`

## Rendered implementation

- Closed 1440 desktop:
  `docs/04-ux/evidence/warix-wx1-right-utility-rail/desktop-1440-closed.jpg`
- Markets, Trade, Calendar and Help drawers:
  `docs/04-ux/evidence/warix-wx1-right-utility-rail/desktop-1440-{markets,trade,calendar,help}.jpg`
- Closed 1920 desktop:
  `docs/04-ux/evidence/warix-wx1-right-utility-rail/desktop-1920-closed.jpg`
- Mobile chart, Markets, Trade, Calendar and Help:
  `docs/04-ux/evidence/warix-wx1-right-utility-rail/mobile-390-{chart,markets,trade,calendar,help}.jpg`

## Comparison setup

- Route/state: authenticated `/trade`, connected sandbox account, dark theme.
- Desktop source and primary implementation comparison: 1440 × 900 CSS px and final
  image pixels, same chart state and workstation theme.
- 1920 implementation: 1920 × 1080 CSS px and final image pixels.
- Mobile implementation: 390 × 844 CSS px and final image pixels.
- Browser capture density was 1.15. Captures were downsampled once from the matching CSS
  viewport to 1× evidence dimensions, so layout geometry was compared at equal pixel size.
- The 1440 source and closed implementation were opened together in one comparison input.
  The source execution pane and rendered Trade drawer were also opened together for the
  focused canonical-panel comparison.

## Findings and comparison history

1. The first mobile Markets capture retained the Market Navigator's internal `Marchés`
   header below the Bottom Sheet title. This repeated the same label above the primary
   search field and spent scarce vertical space (P2 mobile rhythm).
2. The shared navigator's existing `hideHeader` presentation option was applied to the
   mobile sheet. The revised 390 × 844 evidence has one `Marchés` heading and moves search
   and prices upward without changing market behavior.
3. The post-fix full-view and focused comparisons found no remaining actionable P0/P1/P2
   difference in the requested shell/layout scope.

## Required fidelity surfaces

- Fonts and typography: Manrope and IBM Plex Mono remain unchanged. The rail is icon-first;
  drawer headings, quotes and micro-labels reuse the accepted workstation scale and weights.
- Spacing and layout rhythm: the permanent 244 px Markets and compact Execution tracks are
  removed at rest. A 48 px right rail stays persistent, one drawer opens inward, and the
  closed chart expands from the product rail to the utility rail. Drawer and rail seams align
  with the status bar and bottom dock.
- Colors and tokens: all shell, border, selected, risk, bid/ask and identity colors reuse
  centralized workstation tokens. No competing palette, gradient or glass effect was added.
- Image and icon quality: no image asset is needed for this technical shell. Utility glyphs
  are centralized Lucide-backed `@wariba/ui` icons; no emoji, text glyph or handcrafted SVG
  was introduced.
- Copy and content: all controls remain French. Markets and Trade reuse canonical product
  surfaces. Calendar/News declares the real disconnected state and fabricates no events.
  Help links only to the existing `/aide` and `/support` destinations.

## Focused interaction evidence

- Only one desktop utility drawer is present after Markets → Trade → Calendar → Help
  switching.
- The Trade state contains exactly one canonical Execution Center.
- Activity opens the existing dock; Alerts selects its existing dock tab; Notifications opens
  the existing notification/log surface.
- The 1252 px hybrid render used an overlay rather than shrinking the chart.
- The 390 px render hides the vertical utility rail and exposes Markets, Trade, Calendar and
  Help through the existing mobile sheet/action model.
- The chart workspace remains the same mounted child while desktop drawer state only changes
  grid tracks; no chart-tool component was edited in this refactor.

## Residual boundary

The connected local preview remained in its bounded `Historique…` loading state, as did the
accepted pre-refactor comparison capture. This market-history condition is outside the shell
refactor and was not changed. Per the user's instruction, no automated test or certification
suite was run; acceptance evidence is the rendered desktop/mobile state set above.

final result: passed

---

# WX1 tool rail and instrument search — design QA

Date: 2026-08-13

## Source visual truth

- Tool rail: `/Users/rodrigueadebigni/Downloads/Screenshot_13-8-2026_191956_topstepx.com.jpeg`
- Instrument search: `/Users/rodrigueadebigni/Downloads/Screenshot_13-8-2026_201541_www.tradingview.com.jpeg`

## Rendered implementation

- Full workstation: `docs/04-ux/evidence/warix-wx1-round2/desktop-1440-full.png`
- Focused rail: `docs/04-ux/evidence/warix-wx1-round2/desktop-1440-rail-compact.png`
- Focused symbol search: `docs/04-ux/evidence/warix-wx1-round2/desktop-1440-symbol-search.png`

## Comparison setup

- Route/state: authenticated `/trade`, EURUSD selected, realtime connected, dark theme.
- CSS viewport: 1440 × 900, device scale factor 1.
- Source rail: 42 × 816 px. Implementation rail: 42 × 702 px; equal width and each
  rail occupies the complete chart height available in its own source viewport.
- Search source: 1853 × 857 px full application capture. Implementation focus region:
  720 × 460 px from the 1440 × 900 application capture. The comparison was normalized
  by judging the dialog content region rather than the unrelated chart/browser surfaces.
- The reference rail and implementation rail, then the reference search and implementation
  search, were opened together in the same focused comparison input.

## Findings and iteration history

1. Initial implementation had only 11 rail controls, 16 px glyphs, a 44 px rail and unused
   vertical space. It also had no chart-level instrument search. This was a P1 fidelity and
   discoverability mismatch.
2. The rail was rebuilt as 18 real controls, ordered like the reference, with 20 px glyphs,
   32 px hit areas, three group separators, full-height distribution and a 42 px frame.
3. The chart-link control was changed from the interaction blue to the WARIBA identity copper
   selected state after the focused rail comparison showed that the selected utility lacked
   the reference's warm high-contrast landmark.
4. A symbol search trigger was placed directly beside the chart instrument. Its modal now has
   search, real account-derived category filters and selectable rows for the five authorized
   WariX markets. No unavailable market is presented.

## Required fidelity surfaces

- Typography: Manrope and the existing workstation weights are preserved; symbol rows use a
  compact bold identifier and quieter descriptive/category columns.
- Spacing/layout: rail width now matches the 42 px source, icons use the complete vertical rail,
  and separators follow the same four visual groups.
- Colors/tokens: no new arbitrary color system; selected analysis remains cobalt and the linked
  chart landmark uses the existing copper identity token.
- Image/icon quality: existing vector charting icons from `@wariba/ui` are used at 20 px; no
  raster placeholder, emoji, or text-symbol icon was introduced.
- Copy/content: the search contains only the account's authorized French-labelled instruments;
  no stocks, crypto, brokers or unsupported reference content was copied.

## Interaction evidence

- Search trigger opens the modal beside the selected instrument context.
- Query and category chips filter the real symbol-spec set.
- Selecting a result switches through the canonical `selectSymbol` path and closes the modal.
- All rail controls are backed by real behavior: tool flyouts, measurement, zoom, magnet,
  continuous drawing, global drawing lock, reversible visibility, copyable symbol link,
  delete, favorites and object tree.
- Exact rendered checkpoint: 1 passed; no broad certification was run.

No actionable P0/P1/P2 visual difference remains inside the requested rail and search scope.
The chart content itself was still in its bounded history-loading state during capture and was
not altered because it is outside this visual request.

final result: passed
