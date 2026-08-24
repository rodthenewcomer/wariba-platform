import type { HelpArticle } from './types';

/** WARIBA Performance — the account that follows a validated evaluation. */
export const PERFORMANCE_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-060',
    slug: 'compte-performance',
    category: 'performance',
    title: 'Qu’est-ce qu’un compte WARIBA Performance ?',
    summary:
      'L’étape qui suit une évaluation validée. Simulée elle aussi, avec sa propre policy et ses propres conditions.',
    status: 'publish',
    severity: 'information',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy', 'Decision Log'],
    searchAliases: ['performance', 'funded', 'finance', 'apres reussite'],
    related: ['buffer-permanent', 'parcours-one-performance-review', 'capital-simule'],
    lastReviewedAt: '2026-08-24',
    body: [
      { kind: 'heading', text: 'Ce qu’il est' },
      {
        kind: 'list',
        items: [
          'simulé en V1 ;',
          'doté de sa propre policy ;',
          'ouvert au nominal prévu ;',
          'soumis à ses propres conditions de risque et de payout.',
        ],
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Ce qu’il n’est pas',
        text: 'Il ne garantit pas un futur compte live, et les profits de l’évaluation ne sont pas transférés comme capital réel.',
      },
      {
        kind: 'ruleTable',
        caption: 'Policy WARIBA Performance publiée',
        facts: ['performancePolicyVersion'],
      },
    ],
  },
  {
    id: 'HLP-061',
    slug: 'buffer-permanent',
    category: 'performance',
    title: 'Comment fonctionne le buffer permanent ?',
    summary:
      'Construit une fois, jamais retirable. Seul l’excédent réalisé au-dessus peut devenir éligible au payout.',
    status: 'publish',
    severity: 'payout_condition',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['buffer', 'reserve', 'permanent', 'coussin', '10%'],
    related: ['profit-eligible', 'eligibilite-payout', 'compte-performance'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'ruleTable',
        caption: 'Policy WARIBA Performance publiée',
        facts: ['permanentBufferRate'],
      },
      {
        kind: 'paragraph',
        text: 'Le buffer est construit une seule fois et n’est jamais retirable. Il n’a pas à être reconstruit après chaque payout.',
      },
      {
        kind: 'example',
        title: 'Illustration sur un nominal de 10 000 USD',
        lines: [
          'buffer permanent : 1 000 USD ;',
          'les premiers profits servent à le construire ;',
          'seul l’excédent réalisé au-dessus peut entrer dans le calcul d’éligibilité.',
        ],
        conclusion: 'Le montant réellement éligible est toujours calculé par le moteur.',
      },
    ],
  },
  {
    id: 'HLP-062',
    slug: 'profit-eligible',
    category: 'performance',
    title: 'Qu’est-ce que le profit éligible ?',
    summary:
      'Pas « balance moins nominal ». Le moteur tient compte du buffer, de l’éligibilité des trades, des pertes et des holds.',
    status: 'publish',
    severity: 'payout_condition',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy', 'domain code'],
    searchAliases: ['profit eligible', 'excedent', 'retirable', 'disponible'],
    related: ['buffer-permanent', 'profit-court-terme', 'eligibilite-payout'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Le profit éligible n’est pas simplement « balance actuelle moins nominal ».',
      },
      { kind: 'heading', text: 'Ce que le moteur prend en compte' },
      {
        kind: 'list',
        items: [
          'le buffer permanent ;',
          'le profit réalisé ;',
          'la policy du cycle ;',
          'les trades éligibles ;',
          'les pertes ;',
          'les holds éventuels ;',
          'les autres conditions de payout.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Trois chiffres différents',
        text: 'Le Hub distingue le profit du compte, l’excédent éligible et le montant réellement prêt à demander. Les confondre est la source la plus fréquente de malentendus sur un payout.',
      },
    ],
  },
  {
    id: 'HLP-063',
    slug: 'performance-days',
    category: 'performance',
    title: 'Comment fonctionnent les Performance Days ?',
    summary:
      'Chaque payout exige de nouvelles journées atteignant un seuil de profit net réalisé. Une journée déjà consommée ne se réutilise pas.',
    status: 'publish',
    severity: 'payout_condition',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['performance days', 'journees', 'cycle', '5 jours', 'qualified days'],
    related: ['eligibilite-payout', 'meilleur-jour-performance', 'demander-un-payout'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'ruleTable',
        caption: 'Policy WARIBA Performance publiée',
        facts: ['performanceDaysRequired', 'performanceDayThresholdRate'],
      },
      {
        kind: 'example',
        title: 'Ce que le seuil représente selon la taille',
        lines: [
          '5K → 25 USD ;',
          '10K → 50 USD ;',
          '25K → 125 USD ;',
          '50K → 250 USD ;',
          '100K → 500 USD.',
        ],
        conclusion:
          'Ces montants illustrent un seuil de 0,50 % du nominal. Le vôtre est calculé sur votre propre nominal et sur la policy en vigueur.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Chaque cycle consomme ses propres journées',
        text: 'Une journée déjà utilisée par un cycle précédent ne compte pas une seconde fois.',
      },
    ],
  },
  {
    id: 'HLP-064',
    slug: 'meilleur-jour-performance',
    category: 'performance',
    title: 'La règle du Meilleur Jour sur un cycle Performance',
    summary:
      'Même principe que sur l’évaluation, appliqué au cycle. Un dépassement bloque l’éligibilité, jamais le compte.',
    status: 'publish',
    severity: 'payout_condition',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['best day performance', 'consistance cycle', 'meilleur jour payout'],
    related: ['meilleur-jour', 'performance-days', 'eligibilite-payout'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Le meilleur jour positif du cycle ne doit pas représenter plus de la part publiée du total positif éligible du cycle pour satisfaire la condition de payout.',
      },
      { kind: 'ruleTable', caption: 'Policy publiée', facts: ['bestDayMaxRatio'] },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Ce n’est pas un breach',
        text: 'Un dépassement signifie que la distribution des profits doit s’améliorer avant l’éligibilité. Le compte continue.',
      },
    ],
  },
  {
    id: 'HLP-065',
    slug: 'split-des-payouts',
    category: 'performance',
    title: 'Comment fonctionne le split des payouts ?',
    summary: 'La part trader est publiée dans la policy et change sur le dernier cycle.',
    status: 'publish',
    severity: 'payout_condition',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['split', 'partage', '85', '90', 'part trader'],
    related: ['eligibilite-payout', 'demander-un-payout', 'apres-cinquieme-payout'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'ruleTable',
        caption: 'Policy WARIBA Performance publiée',
        facts: ['traderSplitDefault', 'traderSplitFinalCycle'],
      },
      {
        kind: 'paragraph',
        text: 'Le split s’applique au calcul autoritatif du payout approuvé, avec les autres conditions et plafonds publiés.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Une estimation n’est pas un montant payé',
        text: 'Le payout possède ensuite ses propres états de revue et de traitement. Le montant affiché avant la demande est une projection.',
      },
    ],
  },
  {
    id: 'HLP-066',
    slug: 'apres-cinquieme-payout',
    category: 'performance',
    title: 'Que se passe-t-il après le dernier payout du cycle ?',
    summary:
      'Le cycle se ferme et un dossier WARIBA Review s’ouvre. Aucune allocation n’est garantie.',
    status: 'publish',
    severity: 'information',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy', 'Decision Log'],
    searchAliases: ['review', 'apres payout', 'cinquieme', 'live', 'suite'],
    related: ['split-des-payouts', 'parcours-one-performance-review'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'ruleTable',
        caption: 'Policy WARIBA Performance publiée',
        facts: ['maxPayoutCyclesBeforeReview'],
      },
      {
        kind: 'list',
        items: [
          'le cycle se ferme ;',
          'aucun payout supplémentaire n’est créé automatiquement ;',
          'un dossier WARIBA Review s’ouvre.',
        ],
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Aucune garantie d’allocation réelle',
        text: 'WARIBA Review détermine la prochaine étape disponible selon la policy et les décisions futures. Cette étape ne garantit pas une allocation de capital réel.',
      },
    ],
  },
];
