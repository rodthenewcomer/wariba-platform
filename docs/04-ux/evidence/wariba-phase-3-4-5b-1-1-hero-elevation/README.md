# Preuves — Phase 3.4.5B.1.1 · Élévation du héros

**Date :** 30 août 2026
**Build :** **production** (`pnpm build && pnpm start`) — plus le serveur de dev
**Captures :** 5

---

## Le `1 Issue` — cause et correction de méthode

Le badge rouge venait du **serveur de développement Next**, pas de l'application. Console, `pageerror` et requêtes : aucune erreur applicative.

Mais votre reproche visait juste, et plus loin que le badge : **j'avais cessé de prendre les preuves sur le build de production.** Je le faisais en 3.4.5R et en 3.4.5A ; je l'ai abandonné pendant la construction de la homepage sans le dire. La correction n'est donc pas de masquer l'overlay — c'est de revenir au build de production, où il n'existe pas.

Contrôle ajouté à la capture : `nextjs-portal` doit être absent. Il l'est.

**Six `net::ERR_ABORTED`** apparaissent encore dans les journaux réseau. Ce sont des préchargements RSC (`?_rsc=`) que Next annule quand il juge qu'ils ne serviront plus. Vérifié : les cinq routes concernées répondent **200** en requête directe. Ce n'est pas un défaut, et je le nomme plutôt que d'écrire « 0 » sans réserve.

---

## Le Market Field — ce qui a changé

### Le wash bleu

| | Avant | Après |
|---|---|---|
| Halo principal | 44 rem × 30 rem à **26 %** | 26 rem × 20 rem à **15 %** |
| Lumières locales | aucune | 3, ancrées sur des objets du tracé |

Environ **40 % de bleu global en moins**, et davantage d'endroits où le cobalt est franchement lumineux.

### Trois plans

| Plan | Contenu | Opacité |
|---|---|---|
| `back` | grille + 2 trajectoires filaires | 22 % |
| `mid` | trajectoire principale + secondaire | 92 % |
| `front` | ticks, croisements, pulsations, signaux | 100 % |

Aucun parallaxe. La profondeur vient du poids, du contraste et de la permission de bouger.

### Trois signatures

**Ticks de marché** — dix marques verticales, groupées là où la courbe monte le plus fort, comme les prints se groupent quand un marché bouge. Huit cobalt, une émeraude, une corail.

**Nœuds de pulsation** — une expansion à la fois, sept secondes d'écart. Un anneau qui s'ouvre une fois et disparaît, pas un balayage radar.

**Croisements** — la trajectoire secondaire coupe la principale en (720, 477) puis repasse au-dessus en (1306, 197). Marqueur cobalt à chacun. Aucun libellé, aucun chiffre.

---

## Deux erreurs de méthode corrigées

**Les coordonnées étaient devinées.** J'avais placé croisements, ticks et lumières à l'œil : les tracés ne se croisent à aucun des deux points annoncés. Deux marqueurs et deux halos flottaient dans le vide pendant que le vrai croisement passait inaperçu. Tout est maintenant **mesuré au `getPointAtLength`**, et la trajectoire secondaire a été reprofilée pour que ses deux croisements tombent dans le cadre — un croisement à x=1469 n'est pas un croisement que quelqu'un voit.

**Deux listes qui devaient s'accorder ont divergé.** Les pulsations étaient une seconde copie manuscrite des coordonnées de croisement. Après remesure, les croisements ont bougé, les pulsations non — un anneau s'ouvrait dans du vide. Les pulsations sont maintenant **dérivées** des croisements.

---

## Mobile

Le champ desktop à 390 px était une grille et quelques marques faibles : élégant, et mort. Il est remplacé, pas rétréci — une trajectoire balaie la bande basse, avec deux signaux et une pulsation.

**Défaut trouvé et corrigé :** le premier placement traversait « Le trading est entièrement simulé… ». Le seul paragraphe de la page qu'on ne peut jamais rendre plus difficile à lire. Le tracé est descendu sous la copie, et le masque de calme a été prolongé.

---

## Copy

| | Avant | Après | Motif |
|---|---|---|---|
| Eyebrow | `TRADING SIMULÉ` | `WARIBA · TRADING SIMULÉ` | La mention seule faisait de l'avertissement la première chose que WARIBA dit de lui-même |
| Supporting | « choisissez votre façon de commencer… restent visibles en permanence » | « Choisissez ONE, FLEX ou INSTANT. Suivez vos limites et votre progression à tout moment. » | Nommer les parcours va droit au but ; « en permanence » était administratif |
| Divulgation | « Aucun dépôt ni capital réel ne vous est confié » | « Le montant du compte n'est ni un dépôt ni du capital réel qui vous est confié » | Plus long, plus exact : ce qui n'est ni dépôt ni capital, c'est le montant affiché |

**Le H1 n'a pas changé.**

---

## Contrôles

| Contrôle | Résultat |
|---|---|
| Overlay de dev dans la capture | **absent** |
| Erreur console / `pageerror` | **0** |
| Échecs réseau applicatifs | **0** (6 préchargements RSC annulés, routes 200) |
| Débordement — 320 / 390 / 768 / 1440 | **0 / 4** |
| Mouvement réduit | `data-animated=false` |
| `axe` wcag2a+aa | **0 critique, 0 sérieux** |

`home-3-4-5b.spec.ts` 3 tests · `shell-3-4-5a.spec.ts` 4 tests — 7/7.

---

## Red team — mes réponses, sans complaisance

**1. Pourquoi ce fond pourrait encore sembler générique ?**
Parce qu'il reste construit sur une courbe montante. Les ticks, les croisements et les pulsations le rapprochent d'un système de marché, mais la silhouette d'ensemble — une diagonale qui monte vers la droite — est commune. **Je ne revendique pas 8,5/10 sur l'originalité. Je situe le résultat vers 7,5.**

**2. Où le bleu prend-il encore trop de place ?**
Le quart supérieur droit, où le halo et la fin lumineuse du tracé se superposent. C'est le point le plus bleu du héros et il pourrait encore descendre.

**3. Le héros fonctionne-t-il sans animation ?**
Oui. La scène statique est rendue côté serveur : grille, tracés, croisements, lumières. Sans JavaScript la composition est complète.

**4. Le mobile paraît-il vivant ?**
Plus qu'avant, mais modestement. Une trajectoire et deux signaux dans une bande basse. **Je situe le mobile vers 7, pas 8.**

**5. Le texte domine-t-il ?**
Oui, sans discussion. La zone de calme tient et le H1 est le seul élément à pleine luminance.

**6. Un warning ou une erreur visible ?**
Aucun sur le build de production.

---

## Index

| Fichier | Contexte |
|---|---|
| `hero-final-1440.png` | production, 1440 |
| `hero-final-768.png` | production, 768 |
| `hero-final-390.png` | production, 390 |
| `hero-final-320.png` | production, 320 |
| `hero-final-1440-reduced-motion.png` | production, `prefers-reduced-motion: reduce` |
