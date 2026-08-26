import type { HelpArticle } from './types';

/** WARIBA Performance — the account that follows a validated evaluation. */
export const PERFORMANCE_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-060',
    slug: 'compte-performance',
    category: 'performance',
    title: 'Qu’est-ce qu’un compte WARIBA Performance ?',
    summary:
      'L’étape qui suit une évaluation validée. Simulée elle aussi, avec ses propres règles et ses propres conditions.',
    status: 'publish',
    severity: 'information',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy', 'Decision Log'],
    searchAliases: ['performance', 'funded', 'finance', 'apres reussite', 'compte finance'],
    related: ['buffer-permanent', 'parcours-one-performance-review', 'capital-simule'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'WARIBA Performance est le compte qui suit une évaluation réussie. Il reste simulé, avec ses propres règles et ses propres conditions de paiement.',
      },
      { kind: 'heading', text: 'En résumé' },
      {
        kind: 'list',
        items: [
          'simulé en V1 ;',
          'doté de ses propres règles ;',
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
        caption: 'Règles WARIBA Performance en vigueur',
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
      'Vous le constituez une seule fois et il reste sur le compte. Seul ce que vous gagnez au-dessus peut être demandé.',
    status: 'publish',
    severity: 'payout_condition',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['buffer', 'reserve', 'permanent', 'coussin', '10%', '10'],
    related: ['profit-eligible', 'eligibilite-payout', 'compte-performance'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Le buffer permanent se construit une seule fois et reste sur le compte. Seul l’excédent réalisé au-dessus peut devenir candidat à une demande de payout.',
      },
      { kind: 'visual', id: 'HLP-VIS-009' },
      {
        kind: 'ruleTable',
        caption: 'Règles WARIBA Performance en vigueur',
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
        conclusion: 'Le montant réellement disponible est toujours calculé par WARIBA.',
      },
    ],
  },
  {
    id: 'HLP-062',
    slug: 'profit-eligible',
    category: 'performance',
    title: 'Quel montant puis-je réellement demander ?',
    summary:
      'Ce n’est pas simplement « solde actuel moins montant de départ ». WARIBA tient compte du buffer, des gains comptés, des pertes et des blocages éventuels.',
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
      { kind: 'heading', text: 'Ce qui entre dans le calcul' },
      {
        kind: 'list',
        items: [
          'le buffer permanent ;',
          'le profit réalisé ;',
          'les règles du cycle ;',
          'les trades éligibles ;',
          'les pertes ;',
          'les blocages éventuels ;',
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
    searchAliases: [
      'performance days',
      'journees',
      'cycle',
      '5 jours',
      'qualified days',
      'jours comptes',
    ],
    related: ['eligibilite-payout', 'meilleur-jour-performance', 'demander-un-payout'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Chaque payout exige une nouvelle série de journées comptées. Une journée déjà utilisée ne peut pas servir à nouveau lors du cycle suivant.',
      },
      { kind: 'visual', id: 'HLP-VIS-010' },
      {
        kind: 'ruleTable',
        caption: 'Règles WARIBA Performance en vigueur',
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
          'Ces montants illustrent un seuil de 0,50 % du nominal. Le vôtre est calculé sur votre propre nominal et sur les règles en vigueur.',
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
    title: 'Comment la règle du Meilleur Jour s’applique-t-elle sur un compte Performance ?',
    summary:
      'Même principe que sur l’évaluation, appliqué à chaque cycle. Un dépassement retarde votre demande, il ne fait jamais perdre le compte.',
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
        text: 'Comme sur l’évaluation, votre meilleure journée du cycle ne doit pas représenter plus que la part indiquée de l’ensemble de vos journées gagnantes.',
      },
      { kind: 'ruleTable', caption: 'Règles en vigueur', facts: ['bestDayMaxRatio'] },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Votre compte n’est pas perdu',
        text: 'Un dépassement veut dire que vos gains sont trop concentrés sur une journée. Vous continuez à trader jusqu’à ce que la répartition passe.',
      },
    ],
  },
  {
    id: 'HLP-065',
    slug: 'split-des-payouts',
    category: 'performance',
    title: 'Quelle part du payout me revient ?',
    summary:
      'Votre part est fixée par les règles, et elle augmente sur le dernier cycle de payout.',
    status: 'publish',
    severity: 'payout_condition',
    audience: ['performance'],
    sourceOfTruth: ['published_account_policy'],
    searchAliases: ['split', 'partage', '85', '90', 'part trader'],
    related: ['eligibilite-payout', 'demander-un-payout', 'apres-cinquieme-payout'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Votre part est appliquée au montant de payout approuvé après le buffer, le plafond et les autres conditions. La part publiée change lors du dernier cycle.',
      },
      { kind: 'visual', id: 'HLP-VIS-012' },
      {
        kind: 'ruleTable',
        caption: 'Règles WARIBA Performance en vigueur',
        facts: ['traderSplitDefault', 'traderSplitFinalCycle'],
      },
      {
        kind: 'paragraph',
        text: 'Le partage s’applique au montant approuvé, une fois les autres conditions et le plafond pris en compte.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Une estimation n’est pas un montant payé',
        text: 'Une demande passe ensuite par un examen puis un virement, avec son propre statut à chaque étape. Le montant affiché avant la demande est une estimation.',
      },
    ],
  },
  {
    id: 'HLP-066',
    slug: 'apres-cinquieme-payout',
    category: 'performance',
    title: 'Que se passe-t-il après ma dernière demande de payout ?',
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
        kind: 'paragraph',
        text: 'Après la dernière demande autorisée par les règles, aucun cycle supplémentaire ne démarre automatiquement. Un dossier WARIBA Review s’ouvre sans garantir un compte Live.',
      },
      { kind: 'visual', id: 'HLP-VIS-013' },
      {
        kind: 'ruleTable',
        caption: 'Règles WARIBA Performance en vigueur',
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
        text: 'WARIBA Review détermine la prochaine étape disponible selon les règles en vigueur et les décisions à venir. Cette étape ne garantit pas une allocation de capital réel.',
      },
    ],
  },
];
