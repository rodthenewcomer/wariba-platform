# AGENTS.md — WariX trading workstation

> Instructions permanentes applicables à tout agent qui modifie ce dossier. Elles complètent le `AGENTS.md` racine; en cas de conflit, les sources de vérité et les règles de sécurité WARIBA restent prioritaires.

## Identité produit

WariX est le poste de trading professionnel de WARIBA.

Ce n’est pas :

- un dashboard SaaS générique ;
- une page marketing ;
- une interface de trading factice ;
- un clone de TradingView ;
- un skin de TopstepX.

Principe produit :

> Un trader professionnel doit comprendre WariX immédiatement, sans réapprendre les interactions standard d’un graphique.

TradingView et TopstepX peuvent servir de références pour les modèles mentaux, les conventions de graphique, l’architecture de l’information, la grammaire iconographique, la densité et les interactions. Ne jamais copier leur marque, leurs logos ou leurs actifs propriétaires.

## Niveau d’exigence

Pour toute tâche WariX, agir simultanément comme :

- Principal Frontend Engineer ;
- Senior Product Designer / UI Director ;
- Trading Platform UX Specialist ;
- Interaction Designer ;
- Responsive Product Engineer ;
- Backend-Aware Systems Engineer ;
- Design-System Engineer ;
- Adversarial Self-Reviewer.

La correction du rendu fait partie de la correction du produit. Une UI qui compile mais paraît générique, confuse, tassée ou amateur n’est pas terminée.

## Workflow visuel obligatoire

Pour tout travail UI/UX :

```text
INSPECTER L’EXISTANT
→ IMPLÉMENTER UNE TRANCHE COHÉRENTE
→ RENDRE LE PRODUIT RÉEL
→ INSPECTER LES PIXELS
→ CRITIQUER SANS DÉFENDRE LE PREMIER JET
→ CORRIGER DE FAÇON CIBLÉE
→ RENDRE À NOUVEAU
→ FOURNIR LES CAPTURES À LA REVUE HUMAINE
```

Le code, les tests, les tokens ou les classes responsive ne prouvent pas la qualité visuelle. Vérifier réellement :

- hiérarchie et domination du graphique ;
- alignement, densité et rythme ;
- clipping et overflow ;
- contraste et profondeur des surfaces ;
- poids et reconnaissance des icônes ;
- états hover, focus, pressed et selected ;
- qualité des flyouts, menus, modales et sheets ;
- comportement desktop, mobile 390 px et mobile 320 px ;
- absence de fonctionnalité factice.

L’acceptation visuelle appartient au reviewer humain. Ne jamais auto-déclarer une phase visuelle acceptée uniquement parce que les tests passent ou que des captures existent.

## Fast Build Mode

Pendant une itération visuelle active, privilégier les checks les plus petits qui gardent la tranche exécutable :

- typecheck ciblé ;
- test unitaire ciblé si une interaction change ;
- render local ;
- console navigateur et sanity runtime.

Ne pas lancer automatiquement :

- la certification complète ;
- toutes les suites W3/W4/W5 ;
- tout `@trade` ;
- toute la matrice Axe/overflow/responsive ;
- le Fast Gate GitHub ;
- une cérémonie immutable-HEAD.

Exception : si l’autorité d’exécution, le risque, le payout, l’authentification, la sécurité, la base, les migrations, le provider, le realtime, l’historique ou un calcul financier est touché, exécuter immédiatement le plus petit test de sûreté pertinent.

## Le graphique est le héros

Protéger l’espace du graphique. Éviter :

- les panneaux latéraux surdimensionnés ;
- les headers décoratifs ;
- les modales massives quand un flyout suffit ;
- le texte d’aide permanent non essentiel ;
- le chrome vertical inutile.

Préserver le dock Execution compact et le moteur de redimensionnement preferred-vs-effective :

```text
1280 / 1366 → environ 236 px
1440        → environ 248 px
1920+       → environ 260 px
```

Ne pas revenir à environ 320 px pour faciliter une implémentation.

## Vérité produit et autorité serveur

Ne jamais activer ou simuler un contrôle qui ne fonctionne pas réellement.

Ne pas fabriquer :

- market data ou volume ;
- DOM / Level II / Time & Sales ;
- tick charts ;
- états d’ordre ;
- alertes ;
- indicateurs ;
- outils de dessin ;
- payouts, état de compte ou risque.

Si une capacité de référence n’existe pas dans WariX : l’omettre, la désactiver explicitement, ou préparer une architecture non trompeuse.

Avant de câbler Market Buy/Sell, Limit/Stop, partial close, SL/TP, alertes, risque ou actions compte, tracer et réutiliser le chemin canonique :

```text
interaction UI
→ préremplissage ou commande canonique
→ validation canonique
→ autorité serveur et risk gating
```

Le navigateur ne crée jamais une source de vérité parallèle ni un faux succès d’exécution.

## Sémantique du graphique

Maintenir une distinction visuelle stricte entre :

- prix courant/dernier prix ;
- Bid ;
- Ask ;
- crosshair ;
- entrée de position ;
- stop loss ;
- take profit ;
- ordre en attente ;
- dessin ;
- indicateur.

Éviter une paire Bid + Ask permanente sur toute la largeur. Garder une ligne de prix courant propre comme référence primaire; conserver Bid/Ask dans Navigator, le contexte marché et Execution.

Le crosshair est un outil d’analyse primaire : fin, clair, visible, plus fort que la grille, moins dominant que les niveaux de trading, avec labels prix/temps professionnels.

## Toolbar, rail et iconographie

La toolbar doit suivre la grammaire d’un poste de trading : symbole/marché, intervalle réellement supporté, analyse, Indicateurs, Préférences et utilitaires réellement disponibles.

Le rail desktop doit être compact, chart-native et reconnaître les familles disponibles. Avant toute icône :

1. inspecter `packages/ui/src/icons/charting` ;
2. inspecter les actifs autorisés déjà présents ;
3. utiliser des wrappers WARIBA ou créer un équivalent WARIBA reconnaissable.

Une icône est acceptable seulement si un trader reconnaît sa fonction sans lire le tooltip. Vérifier silhouette, stroke, centrage optique et états actifs.

## Dessins, indicateurs et réglages

Les familles de dessins desktop s’ouvrent dans des flyouts attachés au rail : sombres, compacts, groupés, denses, avec icône + label et graphique toujours visible. Fermeture par sélection, clic extérieur et Escape.

Seuls les outils réellement supportés peuvent être activés. Préserver le stockage et le rendu canoniques des dessins.

La bibliothèque Indicateurs doit utiliser une architecture mature et scalable : recherche, favoris réels, état activé, identité couleur, rows compactes. N’ajouter aucun indicateur factice pour remplir la liste.

Chart Settings doit ressembler à des réglages de graphique, avec navigation métier dense — Symbol, Status line, Scales and lines, Canvas — et seulement des réglages supportés. Ne jamais contourner la précision `SymbolSpec`.

## Menu contextuel et visibilité

Le clic droit sur le graphique est une interaction de premier ordre. Grouper uniquement des actions réelles : copier le prix, créer/ouvrir une alerte canonique, préremplir Execution, reset/fit, visibilité/objets et Settings.

Les actions d’ordre ne soumettent jamais une exécution locale. Elles préremplissent le flux Execution ou utilisent la commande canonique.

Les actions `Hide drawings`, `Hide indicators` et `Hide all` sont réversibles et ne suppriment rien. Un Object Tree ne reflète que les dessins et indicateurs réels.

## Responsive

Mobile n’est pas desktop rétréci.

Desktop :

- poste dense ;
- graphique persistant ;
- rails et panneaux compacts ;
- flyouts attachés.

Mobile :

- chart-first ;
- contexte compte/marché compact ;
- sheets et drill-down par catégorie ;
- cibles tactiles pratiques ;
- aucune liste géante de contrôles desktop ;
- pas de redimensionnement libre desktop.

Valider les états utiles à 390 px puis une sanity à 320 px.

## Design system WARIBA

Préférer les tokens et primitives WARIBA existants : Ink, Bone, Cobalt, Copper limité, Aqua/Cyan pour Bid/contexte live, Emerald pour buy/profit, Coral pour sell/loss, Amber pour warning/risk.

Ne pas disperser :

- couleurs hex arbitraires ;
- rayons et ombres aléatoires ;
- nouveaux systèmes d’espacement ;
- clés `localStorage` indépendantes ;
- patterns d’interaction one-off.

WariX doit rester sombre mais vivant, coloré sans gaming, dense sans être tassé, animé sans distraction, premium sans cosmétique, puissant sans intimidation.

## Performance

Ne pas introduire :

- abonnements ticks dupliqués ;
- rerenders React décoratifs pilotés par tick ;
- remounts du graphique ;
- reload d’historique à l’ouverture d’un menu ;
- arbres Navigator ou Execution dupliqués.

Préférer les mises à jour impératives là où l’architecture du graphique les utilise déjà, sans sacrifier la lisibilité.

## Handoff et sécurité du worktree

Avant toute modification dans un worktree repris :

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git diff --stat
git diff
git diff --cached
git log --oneline -10
```

Traiter les changements non commités comme un handoff potentiellement intentionnel. Ne jamais exécuter automatiquement `reset --hard`, `restore`, `checkout .`, `clean`, stash ou suppression d’un fichier non suivi.

## Discipline roadmap

Rester strictement dans la tranche demandée. Ne pas commencer WX2, ne pas modifier Hub/Portal, ne pas refactorer des surfaces non concernées, ne pas changer une règle métier, un provider ou l’historique pour résoudre un problème visuel.

## Verdict final

Avant de remettre une capture, demander :

1. Le graphique ressemble-t-il à une infrastructure de marché sérieuse ?
2. Reste-t-il le héros visuel ?
3. Les icônes sont-elles trader-native ?
4. Le crosshair et le prix courant sont-ils immédiatement lisibles ?
5. Les menus/flyouts semblent-ils attachés à l’outil qui les ouvre ?
6. Le dock Execution compact et le resize engine sont-ils intacts ?
7. Une fonction factice ou une sémantique ambiguë est-elle exposée ?
8. L’identité WARIBA est-elle présente sans copie de la référence ?
9. Mobile est-il réellement mobile-native ?
10. L’amélioration est-elle évidente au premier regard ?

Si une réponse critique est négative, corriger et rendre à nouveau avant de rapporter.
