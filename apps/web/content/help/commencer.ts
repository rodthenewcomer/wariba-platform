import type { HelpArticle } from './types';

/**
 * Commencer — what WARIBA is, and what a trader is buying.
 *
 * The category exists to answer the questions somebody asks *before* they can
 * be harmed by not knowing the answer. Every article here is subordinate to
 * the Decision Log; none states a live rule value in prose.
 */
export const COMMENCER_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-001',
    slug: 'bienvenue-dans-wariba',
    category: 'commencer',
    title: 'Qu’est-ce que WARIBA ?',
    summary:
      'WARIBA évalue la discipline, l’exécution et la gestion du risque dans un environnement entièrement simulé.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log', 'Product OS Master Constitution'],
    searchAliases: ['wariba', 'presentation', 'demarrer', 'commencer'],
    related: ['capital-simule', 'parcours-one-performance-review', 'regles-essentielles'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'WARIBA est une plateforme de trading simulé conçue pour évaluer la discipline, l’exécution et la gestion du risque d’un trader.',
      },
      { kind: 'heading', text: 'Le parcours' },
      { kind: 'formula', expression: 'WARIBA ONE → WARIBA Performance → WARIBA Review' },
      {
        kind: 'paragraph',
        text: 'WARIBA ONE est l’évaluation. Une réussite validée peut ouvrir un compte WARIBA Performance. WARIBA Performance reste un environnement simulé : il ne s’agit ni d’un dépôt bancaire ni d’une allocation automatique de capital réel.',
      },
      { kind: 'heading', text: 'Deux surfaces, deux rôles' },
      {
        kind: 'list',
        items: [
          'Le Trader Hub sert à comprendre votre compte, vos règles, votre progression et vos prochaines actions.',
          'WariX est le terminal de trading : marché, graphique, ordres, positions.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Avant votre premier trade',
        text: 'Lisez « Les règles essentielles avant votre premier trade ». Les règles attachées à votre compte font toujours foi, y compris face à cet article.',
      },
    ],
  },
  {
    id: 'HLP-002',
    slug: 'capital-simule',
    category: 'commencer',
    title: 'Qu’est-ce qu’un capital simulé ?',
    summary:
      'La taille affichée sur une évaluation est un nominal simulé : une base de calcul, pas un dépôt ni une somme investie.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log', 'Product OS Master Constitution'],
    searchAliases: ['simule', 'nominal', 'depot', 'argent reel', 'capital'],
    related: ['bienvenue-dans-wariba', 'solde-et-equity', 'compte-performance'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'La taille affichée sur une évaluation WARIBA est un **nominal simulé**. Elle sert de base aux calculs du programme : objectif, limites de risque et autres seuils.',
      },
      { kind: 'heading', text: 'Ce n’est pas' },
      {
        kind: 'list',
        items: [
          'un dépôt effectué par le trader ;',
          'un solde bancaire ;',
          'une somme que WARIBA promet d’investir sur les marchés.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Les trades, balances et résultats de WARIBA V1 sont simulés. Un payout éventuel suit un processus séparé et ne transforme pas rétroactivement le compte en compte de courtage réel.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Cette distinction reste visible',
        text: 'Elle est affichée avant l’achat et sur les surfaces où elle est nécessaire. Si vous la voyez disparaître quelque part, c’est un défaut : signalez-le au support.',
      },
    ],
  },
  {
    id: 'HLP-003',
    slug: 'parcours-one-performance-review',
    category: 'commencer',
    title: 'Comment fonctionne ONE → Performance → Review ?',
    summary: 'Les quatre étapes du parcours, et ce qui se passe réellement entre chacune d’elles.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log', 'published_account_policy'],
    searchAliases: ['parcours', 'etapes', 'funded', 'review', 'passage'],
    related: ['objectif-atteint', 'compte-performance', 'apres-cinquieme-payout'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Le parcours WARIBA compte quatre étapes. Aucune ne s’enchaîne automatiquement : chacune se termine par une vérification.',
      },
      { kind: 'heading', text: '1. WARIBA ONE' },
      {
        kind: 'paragraph',
        text: 'Vous tradez une évaluation simulée selon les règles attachées à votre compte.',
      },
      { kind: 'heading', text: '2. Réussite en vérification' },
      {
        kind: 'paragraph',
        text: 'Lorsque toutes les conditions sont remplies, le compte passe en « Réussite en vérification ». Cela ne signifie pas que Performance est déjà activé : WARIBA finalise la journée et exécute les contrôles prévus.',
      },
      { kind: 'heading', text: '3. WARIBA Performance' },
      {
        kind: 'paragraph',
        text: 'Après approbation, un compte Performance distinct est créé exactement une fois. Il est également simulé.',
      },
      { kind: 'heading', text: '4. Payouts' },
      {
        kind: 'paragraph',
        text: 'Un cycle Performance doit remplir ses propres conditions avant qu’un payout puisse être demandé.',
      },
      { kind: 'heading', text: '5. WARIBA Review' },
      {
        kind: 'paragraph',
        text: 'Après le dernier payout payé du cycle, le compte entre dans WARIBA Review. **Cette étape ne garantit pas une allocation de capital réel.**',
      },
    ],
  },
  {
    id: 'HLP-004',
    slug: 'choisir-une-taille-evaluation',
    category: 'commencer',
    title: 'Comment choisir une taille d’évaluation ?',
    summary:
      'Choisissez la taille dont les limites de risque correspondent à votre style, pas le nominal le plus élevé.',
    status: 'dynamic',
    severity: 'information',
    audience: ['evaluation'],
    sourceOfTruth: ['published_catalogue', 'published_account_policy'],
    searchAliases: ['taille', '5k', '10k', '25k', '50k', '100k', 'offre', 'prix'],
    related: ['acheter-et-activer', 'regles-essentielles'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Choisissez d’abord la taille dont les limites de risque sont compatibles avec votre style de trading. Un nominal plus grand agrandit l’objectif autant que la marge d’erreur.',
      },
      {
        kind: 'paragraph',
        text: 'La page Offres affiche, pour chaque taille : le montant nominal, le prix, l’objectif, la perte quotidienne, la perte maximale et la règle du Meilleur Jour.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Aucun prix n’est écrit dans cet article',
        text: 'Les prix et les tailles viennent directement de l’offre en cours. Un article d’aide qui les recopierait finirait par afficher d’anciens montants.',
      },
      { kind: 'heading', text: 'Les règles en vigueur aujourd’hui' },
      {
        kind: 'ruleTable',
        caption: 'Lues dans les règles WARIBA ONE en vigueur',
        facts: [
          'profitTargetRate',
          'dailyLossRate',
          'maximumLossRate',
          'bestDayMaxRatio',
          'minimumTradingDays',
        ],
      },
    ],
  },
  {
    id: 'HLP-005',
    slug: 'acheter-et-activer',
    category: 'commencer',
    title: 'Comment acheter et activer une évaluation ?',
    summary:
      'Cinq étapes, et une règle qui compte plus que les autres : seul WARIBA confirme un paiement.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log', 'Product OS Master Constitution'],
    searchAliases: ['acheter', 'activation', 'commande', 'checkout', 'paiement'],
    related: ['confirmation-paiement', 'paiement-en-attente', 'eviter-double-paiement'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'list',
        ordered: true,
        items: [
          'Choisissez une offre publiée.',
          'Vérifiez le nominal simulé, le prix et les règles principales.',
          'Acceptez les conditions nécessaires.',
          'Lancez le paiement.',
          'Attendez la confirmation de WARIBA.',
        ],
      },
      {
        kind: 'callout',
        tone: 'danger',
        title: 'Ne payez jamais deux fois',
        text: 'Le retour de votre navigateur depuis un prestataire de paiement ne confirme rien. Un paiement n’est confirmé que lorsque WARIBA l’a vérifié auprès du prestataire. Si la confirmation est en attente, consultez le statut de la commande ou contactez le support avec votre référence.',
      },
    ],
  },
  {
    id: 'HLP-006',
    slug: 'solde-et-equity',
    category: 'commencer',
    title: 'Quelle différence entre mon solde et mon equity ?',
    summary:
      'Le solde, c’est ce que vous avez encaissé. L’equity y ajoute vos positions encore ouvertes. Vos limites ne surveillent pas toujours le même des deux.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['published_account_policy', 'domain code'],
    searchAliases: ['balance', 'equity', 'solde', 'latent', 'flottant'],
    related: ['objectif-de-profit', 'perte-maximale-eod', 'profit-eligible'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'table',
        columns: ['Notion', 'Ce qu’elle mesure'],
        rows: [
          [
            'Solde (balance)',
            'Ce que vous avez réellement encaissé, une fois vos positions fermées.',
          ],
          [
            'Equity',
            'Votre solde, plus les gains ou pertes de vos positions encore ouvertes, frais compris.',
          ],
        ],
      },
      {
        kind: 'paragraph',
        text: 'Une position ouverte peut donc faire varier l’equity sans modifier immédiatement le solde.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'La conséquence pratique',
        text: 'Les règles de risque peuvent surveiller l’equity. Votre objectif WARIBA ONE, lui, ne compte que le profit réalisé : un gain sur une position encore ouverte ne valide pas l’évaluation.',
      },
      {
        kind: 'paragraph',
        text: 'Les montants affichés dans votre espace WARIBA et dans WariX sont ceux de votre compte.',
      },
    ],
  },
  {
    id: 'HLP-007',
    slug: 'glossaire',
    category: 'commencer',
    title: 'Le vocabulaire WARIBA, expliqué simplement',
    summary: 'Les termes du produit, dans les mots que WARIBA utilise réellement.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log', 'Product OS Master Constitution'],
    /*
     * No acronyms here, deliberately.
     *
     * The glossary defines DLL and MLL, so it matched them exactly and tied
     * with the articles that are *about* those rules — and won the tie on id
     * order. Somebody searching "DLL" wants the rule, not its one-line
     * definition. The glossary still surfaces for the term through its body
     * text, one rank lower, which is where it belongs.
     */
    searchAliases: ['glossaire', 'vocabulaire', 'definition', 'terme', 'lexique'],
    related: ['regles-essentielles', 'dll-vs-perte-maximale'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'table',
        columns: ['Terme', 'Sens'],
        rows: [
          ['WARIBA ONE', 'Évaluation simulée en une phase.'],
          ['WARIBA Performance', 'Compte simulé obtenu après une réussite validée.'],
          [
            'Blocage quotidien (soft lock)',
            'Vous ne pouvez plus ouvrir de position jusqu’au prochain reset, parce que votre perte quotidienne est atteinte.',
          ],
          [
            'Limite maximale dépassée',
            'Votre compte est terminé parce que la perte maximale a été franchie.',
          ],
          [
            'Règle du Meilleur Jour',
            'Règle de distribution du profit. Elle ne termine jamais le compte.',
          ],
          ['EOD', 'Fin de journée, utilisée pour une finalisation ou une mise à jour de plancher.'],
          ['Payout', 'Paiement pouvant être demandé après éligibilité.'],
          ['KYC', 'Vérification d’identité.'],
          [
            'WARIBA Review',
            'Étape après le dernier payout du cycle. Aucun compte live n’est garanti.',
          ],
          [
            'Référence technique',
            'Le code affiché avec une erreur. Il permet à l’équipe de retrouver ce qui s’est passé.',
          ],
        ],
      },
    ],
  },
];
