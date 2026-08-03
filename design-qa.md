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
