import type { HelpArticle } from './types';

/**
 * WARIBA ONE — the evaluation's rules.
 *
 * Every live rule value in this category comes from `ruleTable` blocks or
 * `{{fact:…}}` tokens, both of which read the published policy. Numbers appear
 * in prose only inside `example` blocks, which the renderer labels as
 * illustrations.
 */
export const WARIBA_ONE_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-010',
    slug: 'regles-essentielles',
    category: 'wariba-one',
    title: 'Les règles essentielles avant votre premier trade',
    summary:
      'Ce qui bloque aujourd’hui, ce qui termine le compte, et ce qui bloque seulement la réussite — sur une page.',
    status: 'publish',
    severity: 'information',
    audience: ['evaluation'],
    sourceOfTruth: ['published_account_policy', 'Decision Log'],
    searchAliases: ['regles', 'essentiel', 'avant de trader', 'resume', 'rules'],
    related: [
      'objectif-de-profit',
      'perte-quotidienne',
      'perte-maximale-eod',
      'meilleur-jour',
      'dll-vs-perte-maximale',
    ],
    lastReviewedAt: '2026-08-24',
    pinned: true,
    body: [
      {
        kind: 'paragraph',
        text: 'Voici les règles WARIBA ONE en vigueur. Elles sont lues depuis la policy publiée — la même que le moteur de risque applique à votre compte.',
      },
      {
        kind: 'ruleTable',
        caption: 'Policy WARIBA ONE publiée',
        facts: [
          'profitTargetRate',
          'dailyLossRate',
          'maximumLossRate',
          'bestDayMaxRatio',
          'minimumTradingDays',
          'shortDurationSeconds',
          'activationFee',
          'evaluationPolicyVersion',
        ],
      },
      { kind: 'heading', text: 'Trois familles, trois conséquences' },
      {
        kind: 'table',
        caption: 'La distinction qui coûte le plus cher quand elle est mal comprise',
        columns: ['Ce qui se passe', 'Règle', 'Effet'],
        rows: [
          ['Bloque aujourd’hui', 'Perte quotidienne', 'Blocage temporaire jusqu’au reset serveur.'],
          [
            'Termine le compte',
            'Perte maximale',
            'État terminal. Le compte ne redevient pas actif.',
          ],
          [
            'Bloque seulement la réussite',
            'Règle du Meilleur Jour',
            'Vous continuez à trader jusqu’à satisfaire la condition.',
          ],
        ],
      },
      { kind: 'heading', text: 'À retenir' },
      {
        kind: 'list',
        items: [
          'Perte quotidienne ≠ perte maximale.',
          'Règle du Meilleur Jour ≠ breach.',
          'Atteindre l’objectif ≠ activation immédiate du compte Performance.',
          'Les positions et ordres bloquants doivent être résolus avant la validation finale.',
          'Le serveur décide toujours si une action de trading est autorisée.',
        ],
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Profit rapide et profit éligible',
        text: 'Un trade profitable dont la durée est inférieure au seuil publié peut contribuer pour zéro au profit du programme. Les pertes, elles, restent toujours comptées.',
      },
    ],
  },
  {
    id: 'HLP-011',
    slug: 'objectif-de-profit',
    category: 'wariba-one',
    title: 'Comment fonctionne l’objectif de profit ?',
    summary:
      'L’objectif se mesure en profit net réalisé. Un profit latent ne valide rien, et l’atteindre ne crée pas immédiatement un compte Performance.',
    status: 'publish',
    severity: 'pass_condition',
    audience: ['evaluation'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['objectif', 'target', 'profit target', '10%', 'reussir'],
    related: ['solde-et-equity', 'objectif-atteint', 'profit-court-terme'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'WARIBA ONE demande actuellement {{fact:profitTargetRate}} de profit **réalisé**.',
      },
      {
        kind: 'example',
        title: 'Illustration sur un nominal de 10 000 USD',
        lines: [
          'objectif pédagogique : 1 000 USD de profit net réalisé ;',
          'un profit latent de 1 200 USD sur une position ouverte : ne compte pas ;',
          'ce même profit une fois la position clôturée : compte, sous réserve des règles d’éligibilité.',
        ],
        conclusion:
          'Votre propre objectif est calculé sur le nominal de votre compte, pas sur cet exemple.',
      },
      {
        kind: 'paragraph',
        text: 'Le moteur vérifie les résultats réalisés **et** toutes les autres conditions applicables. Lorsque l’objectif est atteint, le compte passe en « Réussite en vérification » puis attend la finalisation de journée et les contrôles.',
      },
      { kind: 'heading', text: 'Ce qui ne se passe pas' },
      {
        kind: 'list',
        items: [
          'atteindre l’objectif ne désactive aucune autre règle ;',
          'le navigateur ne décide pas que vous avez réussi ;',
          'un nouvel essai n’ouvre jamais deux comptes Performance.',
        ],
      },
    ],
  },
  {
    id: 'HLP-012',
    slug: 'perte-quotidienne',
    category: 'wariba-one',
    title: 'Comment fonctionne la perte quotidienne ?',
    summary:
      'Une protection temporaire. Atteinte, elle bloque les nouvelles expositions jusqu’au reset — elle ne termine pas le compte.',
    status: 'publish',
    severity: 'soft_lock',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['published_account_policy', 'risk engine'],
    searchAliases: ['dll', 'daily loss', 'perte journaliere', 'bloque', 'soft lock', '3%'],
    related: ['dll-vs-perte-maximale', 'reset-limites-quotidiennes', 'permissions-de-trading'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'La perte quotidienne est une protection temporaire. Le montant de référence correspond à {{fact:dailyLossRate}} du nominal simulé, selon la policy attachée au compte.',
      },
      {
        kind: 'example',
        title: 'Illustration sur un nominal de 10 000 USD',
        lines: ['3 % de 10 000 USD représentent 300 USD de marge quotidienne.'],
        conclusion:
          'Le montant réellement applicable est celui que le Hub affiche pour votre compte.',
      },
      {
        kind: 'paragraph',
        text: 'Le moteur serveur suit la limite autoritative de la journée, y compris l’equity lorsque la règle l’exige. Si le seuil est atteint, le compte passe en **blocage quotidien**.',
      },
      { kind: 'heading', text: 'Conséquence' },
      {
        kind: 'list',
        items: [
          'les nouvelles expositions sont refusées ;',
          'réduire ou fermer une position peut rester autorisé si les permissions serveur le permettent ;',
          'annuler un ordre en attente peut rester autorisé ;',
          'l’instant exact du prochain reset vient du serveur.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Ce n’est pas un échec définitif',
        text: 'Un blocage quotidien n’est pas un breach. Le compte peut redevenir actif au reset prévu si aucune autre règle terminale n’a été violée.',
      },
    ],
  },
  {
    id: 'HLP-013',
    slug: 'perte-maximale-eod',
    category: 'wariba-one',
    title: 'Comment fonctionne la perte maximale EOD trailing ?',
    summary:
      'Le plancher qui protège le compte sur toute sa durée. Il monte après une journée finalisée, ne redescend jamais, et le franchir termine le compte.',
    status: 'publish',
    severity: 'hard_breach',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['published_account_policy', 'risk engine'],
    searchAliases: ['mll', 'max loss', 'drawdown', 'trailing', 'eod', 'plancher', 'breach', '10%'],
    related: ['trailing-eod', 'lire-preuve-breach', 'limite-maximale-depassee'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'La perte maximale protège le compte sur toute sa durée. Elle vaut actuellement {{fact:maximumLossRate}} du nominal et son plancher est **trailing EOD**.',
      },
      {
        kind: 'example',
        title: 'Illustration sur un nominal de 10 000 USD',
        lines: [
          'référence de départ 10 000 → plancher 9 000 ;',
          'un plus haut EOD de 10 500 peut faire monter le plancher à 9 500 ;',
          'une journée suivante clôturant plus bas ne fait pas redescendre le plancher acquis.',
        ],
        conclusion:
          'Le plancher réellement applicable à votre compte est publié par le serveur. L’interface ne le reconstruit jamais à partir d’un exemple.',
      },
      {
        kind: 'callout',
        tone: 'danger',
        title: 'Conséquence',
        text: 'Si l’equity franchit le plancher applicable, le compte devient « Limite maximale dépassée ». C’est terminal pour cet identifiant de compte.',
      },
      {
        kind: 'paragraph',
        text: 'Le compte reste consultable avec la règle, le seuil, la valeur observée, l’heure, la version de policy et la preuve.',
      },
    ],
  },
  {
    id: 'HLP-014',
    slug: 'meilleur-jour',
    category: 'wariba-one',
    title: 'Comment fonctionne la règle du Meilleur Jour ?',
    summary:
      'Elle mesure la concentration de vos profits. Un dépassement bloque la réussite — il ne termine jamais le compte.',
    status: 'publish',
    severity: 'pass_condition',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['best day', 'meilleur jour', 'consistance', 'consistency', '50%'],
    related: ['objectif-de-profit', 'meilleur-jour-performance', 'regles-essentielles'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'La règle du Meilleur Jour mesure la concentration de vos profits positifs. Votre meilleur jour éligible ne doit pas représenter plus de {{fact:bestDayMaxRatio}} du total de vos journées positives éligibles.',
      },
      {
        kind: 'formula',
        expression: 'ratio = meilleur jour positif ÷ total des journées positives',
        caption: 'Les deux termes sont calculés par le moteur sur les journées éligibles.',
      },
      {
        kind: 'example',
        title: 'Illustration',
        lines: [
          'meilleur jour : 500 USD ;',
          'total des jours positifs : 800 USD ;',
          'ratio : 62,5 %.',
        ],
        conclusion:
          'La condition n’est pas satisfaite. Si le meilleur jour reste 500 USD, le total doit atteindre 1 000 USD — il manque 200 USD de profits répartis sur d’autres journées.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Un dépassement ne termine jamais le compte',
        text: 'Vous continuez à trader jusqu’à satisfaire la condition, sous réserve des autres règles.',
      },
    ],
  },
  {
    id: 'HLP-015',
    slug: 'profit-court-terme',
    category: 'wariba-one',
    title: 'Pourquoi un profit peut-il être non éligible ?',
    summary:
      'Un trade profitable trop court peut contribuer pour zéro au profit du programme. Les pertes, elles, sont toujours comptées.',
    status: 'publish',
    severity: 'pass_condition',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['published_account_policy', 'domain code'],
    searchAliases: ['60 secondes', 'scalping', 'eligible', 'ineligible', 'duree', 'court'],
    related: ['objectif-de-profit', 'profit-eligible', 'solde-et-equity'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'La policy publiée prévoit une durée minimale de {{fact:shortDurationSeconds}} pour qu’un résultat profitable contribue au résultat programme éligible.',
      },
      { kind: 'heading', text: 'Ce que cela signifie concrètement' },
      {
        kind: 'paragraph',
        text: 'Un trade peut être réellement clôturé avec un P&L positif, apparaître dans le Journal, et pourtant contribuer pour zéro au calcul du profit éligible si sa durée est inférieure au seuil.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Asymétrie assumée',
        text: 'Les pertes restent toujours comptées. La règle limite la contribution d’un profit très court ; elle n’efface aucune perte.',
      },
      {
        kind: 'paragraph',
        text: 'WARIBA affiche séparément le résultat économique du trade, sa contribution au programme, et la raison d’une éventuelle inéligibilité. Cette règle ne doit jamais être cachée derrière un simple chiffre de P&L.',
      },
    ],
  },
  {
    id: 'HLP-016',
    slug: 'nombre-minimum-de-jours',
    category: 'wariba-one',
    title: 'Y a-t-il un nombre minimum de jours ?',
    summary:
      'WARIBA ONE n’impose aucune attente artificielle. Cela ne rend pas la validation instantanée pour autant.',
    status: 'publish',
    severity: 'pass_condition',
    audience: ['evaluation'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['jours minimum', 'minimum trading days', 'combien de jours', 'rapidite'],
    related: ['objectif-atteint', 'performance-days', 'regles-essentielles'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'ruleTable',
        caption: 'Policy WARIBA ONE publiée',
        facts: ['minimumTradingDays'],
      },
      {
        kind: 'paragraph',
        text: 'Il n’y a donc aucune attente imposée pour son propre compte. Toutes les autres conditions restent applicables : profit réalisé, règles de risque, règle du Meilleur Jour, absence de breach et workflow de revue.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'WARIBA Performance suit une autre logique',
        text: 'Chaque payout exige des journées de performance nouvelles. Voir « Comment fonctionnent les Performance Days ? ».',
      },
    ],
  },
  {
    id: 'HLP-017',
    slug: 'duree-et-inactivite',
    category: 'wariba-one',
    title: 'Combien de temps ai-je, et que se passe-t-il si je ne trade pas ?',
    summary:
      'WARIBA ONE n’a pas de limite de temps fixe pour atteindre l’objectif. Un compte peut néanmoins devenir inactif.',
    status: 'publish',
    severity: 'operational',
    audience: ['evaluation'],
    sourceOfTruth: ['published_account_policy', 'Decision Log'],
    searchAliases: ['duree', 'delai', 'inactivite', 'inactif', 'expiration', 'temps'],
    related: ['nombre-minimum-de-jours', 'contacter-le-support'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'WARIBA ONE n’impose pas de limite de temps fixe pour atteindre l’objectif.',
      },
      {
        kind: 'paragraph',
        text: 'Un compte peut passer à l’état **inactif**. Cet état est distinct de « limite maximale dépassée » : il n’est pas un breach, et l’interface affiche le statut exact ainsi que les actions autorisées.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Aucun compte à rebours n’est publié ici',
        text: 'La policy publiée ne porte pas aujourd’hui de paramètre d’inactivité, et cet article n’en invente pas un. Le statut réel de votre compte, et lui seul, fait foi. Si votre compte affiche « Inactif », ouvrez une demande pour connaître vos options.',
      },
    ],
  },
  {
    id: 'HLP-018',
    slug: 'position-pendant-la-nuit',
    category: 'wariba-one',
    title: 'Puis-je garder une position pendant la nuit ?',
    summary: 'La décision produit en vigueur est lue depuis la policy publiée.',
    status: 'dynamic',
    severity: 'information',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['published_account_policy', 'Decision Log'],
    searchAliases: ['overnight', 'nuit', 'garder position', 'swap'],
    related: ['position-pendant-le-week-end', 'frais-de-trading'],
    lastReviewedAt: '2026-08-24',
    body: [
      { kind: 'ruleTable', caption: 'Policy publiée', facts: ['overnightAllowed'] },
      {
        kind: 'paragraph',
        text: 'Une position conservée pendant la nuit reste soumise à la perte quotidienne, à la perte maximale, aux spreads, aux swaps lorsqu’ils existent, aux gaps et interruptions de marché, et aux permissions du compte.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: '« Autorisée » ne veut pas dire « sans risque »',
        text: 'Un gap à l’ouverture peut franchir un plancher pendant que vous dormez. La règle autorise l’exposition ; elle ne la protège pas.',
      },
    ],
  },
  {
    id: 'HLP-019',
    slug: 'position-pendant-le-week-end',
    category: 'wariba-one',
    title: 'Puis-je garder une position pendant le week-end ?',
    summary: 'La décision produit en vigueur est lue depuis la policy publiée.',
    status: 'dynamic',
    severity: 'information',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['published_account_policy', 'symbol specifications'],
    searchAliases: ['weekend', 'week-end', 'samedi', 'dimanche', 'cutoff'],
    related: ['position-pendant-la-nuit', 'instruments-et-exposition'],
    lastReviewedAt: '2026-08-24',
    body: [
      { kind: 'ruleTable', caption: 'Policy publiée', facts: ['weekendAllowed'] },
      {
        kind: 'paragraph',
        text: 'L’heure de coupure dépend de l’instrument. Consultez toujours l’heure affichée pour l’instrument concerné et le fuseau associé plutôt qu’une heure générique.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Aucune heure générique dans cet article',
        text: 'Une heure de cutoff écrite ici serait fausse pour au moins un instrument. Elle est publiée avec la spécification de chaque symbole.',
      },
    ],
  },
  {
    id: 'HLP-020',
    slug: 'trading-pendant-les-annonces',
    category: 'wariba-one',
    title: 'Puis-je trader pendant les annonces économiques ?',
    summary: 'La décision produit en vigueur est lue depuis la policy publiée.',
    status: 'dynamic',
    severity: 'information',
    audience: ['evaluation'],
    sourceOfTruth: ['published_account_policy', 'Decision Log'],
    searchAliases: ['news', 'annonces', 'nfp', 'calendrier economique'],
    related: ['frais-de-trading', 'ordre-refuse'],
    lastReviewedAt: '2026-08-24',
    body: [
      { kind: 'ruleTable', caption: 'Policy WARIBA ONE publiée', facts: ['newsAllowed'] },
      {
        kind: 'paragraph',
        text: 'Les autres règles de risque continuent de s’appliquer et le slippage peut augmenter fortement autour d’une annonce.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Aucune fenêtre d’interdiction Performance n’est publiée',
        text: 'WARIBA ne publiera de fenêtre d’interdiction que lorsque la policy et une source de calendrier fiable seront verrouillées ensemble. Aucune sanction rétroactive ne sera construite à partir d’une information qui n’était pas visible au trader.',
      },
    ],
  },
  {
    id: 'HLP-021',
    slug: 'objectif-atteint',
    category: 'wariba-one',
    title: 'Que se passe-t-il quand j’atteins l’objectif ?',
    summary:
      'Le compte passe en vérification. Les règles continuent de s’appliquer, et rien n’est activé tant que la revue n’a pas conclu.',
    status: 'publish',
    severity: 'pass_condition',
    audience: ['evaluation'],
    sourceOfTruth: ['Decision Log', 'domain code'],
    searchAliases: ['reussi', 'pass', 'pass pending', 'verification', 'objectif atteint'],
    related: ['objectif-de-profit', 'parcours-one-performance-review', 'compte-performance'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Atteindre l’objectif ne déclenche pas immédiatement un compte Performance.',
      },
      {
        kind: 'formula',
        expression:
          'actif → réussite en vérification → revue de fin de journée → approuvé → Performance',
      },
      { kind: 'heading', text: 'Dès la mise en vérification' },
      {
        kind: 'list',
        items: [
          'aucune nouvelle exposition n’est autorisée ;',
          'WariX passe en lecture seule pour les actions concernées ;',
          'le Hub affiche « Réussite en vérification » ;',
          'le serveur fournit l’instant à partir duquel la revue est éligible.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'La revue vérifie la journée finalisée, les règles, l’intégrité des données, les ordres et tout breach éventuel. Un cas ambigu peut passer en revue humaine. Une approbation crée un compte Performance exactement une fois.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Les règles ne se désactivent pas',
        text: 'C’est le malentendu le plus coûteux du produit : tant que la session est ouverte, un compte qui vient d’atteindre l’objectif peut encore être breaché.',
      },
    ],
  },
  {
    id: 'HLP-022',
    slug: 'limite-maximale-depassee',
    category: 'wariba-one',
    title: 'Que se passe-t-il si ma limite maximale est dépassée ?',
    summary:
      'Le compte devient terminal. Vous conservez l’accès à la preuve complète et pouvez ouvrir une contestation.',
    status: 'publish',
    severity: 'hard_breach',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['risk engine', 'domain code'],
    searchAliases: ['breach', 'echec', 'compte termine', 'perdu', 'fail'],
    related: ['perte-maximale-eod', 'lire-preuve-breach', 'ouvrir-une-contestation'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Lorsque la perte maximale autoritative est dépassée, le compte devient terminal. Il ne redevient pas actif.',
      },
      { kind: 'heading', text: 'Ce que vous pouvez consulter' },
      {
        kind: 'list',
        items: [
          'la règle concernée ;',
          'le seuil ;',
          'la valeur observée ;',
          'l’heure ;',
          'la version de policy ;',
          'la preuve et les références disponibles.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Vous avez un recours',
        text: 'Depuis le compte concerné, vous pouvez ouvrir une contestation ou contacter le support. La preuve originale n’est jamais supprimée.',
      },
    ],
  },
  {
    id: 'HLP-023',
    slug: 'reset-ou-recommencer',
    category: 'wariba-one',
    title: 'Puis-je reset ou recommencer une évaluation ?',
    summary:
      'La politique commerciale de reset reste ouverte ; rien n’est publié tant qu’elle ne l’est pas.',
    status: 'draft_policy',
    blockedBy: 'Politique commerciale reset/repurchase — OPEN',
    severity: 'operational',
    audience: ['evaluation'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['reset', 'recommencer', 'racheter', 'retry'],
    related: ['limite-maximale-depassee'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'La politique commerciale de reset/repurchase est actuellement ouverte. Tant qu’elle n’est pas verrouillée, WARIBA ne publie aucun prix de reset, aucune remise, aucun bouton « Reset maintenant » et aucune promesse de réouverture.',
      },
      {
        kind: 'paragraph',
        text: 'Un compte terminé ne sera jamais réécrit comme s’il n’avait pas échoué. Si une politique de recommencement est adoptée, elle créera une nouvelle commande et un nouveau compte avec une nouvelle piste d’audit.',
      },
    ],
  },
];
