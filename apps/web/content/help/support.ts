import type { HelpArticle } from './types';

/**
 * Support & contestations.
 *
 * Written against the system Phase 3.2 shipped, so every statement here is
 * checkable: the statuses are the enums the tables carry, and « la preuve
 * originale n'est jamais supprimée » is the invariant a test proves.
 */
export const SUPPORT_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-120',
    slug: 'contacter-le-support',
    category: 'support',
    title: 'Comment contacter l’équipe WARIBA ?',
    summary:
      'Le canal principal est le système de support authentifié du Trader Hub, où chaque demande reçoit une référence.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['support', 'contact', 'aide', 'ticket', 'joindre', 'probleme', 'assistance'],
    related: ['creer-et-suivre-un-ticket', 'informations-a-fournir', 'ouvrir-une-contestation'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Le canal principal est le système de support authentifié dans le Trader Hub. Utilisez le Centre d’aide pour les questions générales ; créez une demande lorsqu’une question concerne votre compte, une commande, un ordre, un payout ou un incident précis.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Une décision reste liée à son dossier',
        text: 'Un canal WhatsApp ou e-mail pourra être ajouté plus tard, mais il ne deviendra jamais le seul endroit où une décision financière est documentée.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Aucun délai de réponse n’est affiché',
        text: 'WARIBA ne publiera un délai que lorsqu’il sera réellement mesuré. Un engagement affiché sans mesure est une promesse que personne ne tient.',
      },
    ],
  },
  {
    id: 'HLP-121',
    slug: 'creer-et-suivre-un-ticket',
    category: 'support',
    title: 'Comment ouvrir une demande et suivre sa réponse ?',
    summary: 'Cinq étapes, une référence publique, et un fil qui ne se réécrit pas.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['ticket', 'demande', 'creer', 'suivre', 'reference'],
    related: ['statuts-ticket-contestation', 'informations-a-fournir', 'contacter-le-support'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'list',
        ordered: true,
        items: [
          'Ouvrez Support depuis votre espace WARIBA.',
          'Choisissez la catégorie.',
          'Indiquez le compte concerné si votre question porte sur l’un d’eux.',
          'Décrivez le problème.',
          'Envoyez la demande.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Votre demande reçoit une référence. Vous suivez ensuite son avancement et les réponses au même endroit.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Rien ne peut être effacé du fil',
        text: 'Vos messages et ceux de l’équipe restent tels quels. Personne ne peut réécrire ou effacer un message d’une conversation en cours — WARIBA non plus.',
      },
    ],
  },
  {
    id: 'HLP-122',
    slug: 'ouvrir-une-contestation',
    category: 'support',
    title: 'Comment contester une décision ?',
    summary:
      'Depuis la preuve d’une décision contestable. Vous n’avez pas à recopier les chiffres du système.',
    status: 'publish',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code', 'Decision Log'],
    searchAliases: [
      'contester',
      'contestation',
      'dispute',
      'recours',
      'desaccord',
      'pas d accord',
      'reclamation',
    ],
    related: ['que-peut-on-contester', 'examen-contestation', 'lire-preuve-breach'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Une contestation sert à remettre en question une décision WARIBA contestable — par exemple un compte terminé disposant d’une preuve.',
      },
      {
        kind: 'list',
        ordered: true,
        items: [
          'Depuis le compte concerné, ouvrez la preuve.',
          'Choisissez « Ouvrir une contestation ».',
          'Expliquez votre désaccord.',
          'Soumettez.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Les preuves sont reliées automatiquement',
        text: 'WARIBA rattache automatiquement les éléments de la décision à votre dossier. Vous n’avez aucun chiffre à recopier : l’équipe lit exactement les mêmes que vous.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Le compte n’est pas réactivé pendant la revue',
        text: 'Une contestation ouvre un dossier. Elle ne remet pas le compte en état de trader pendant son examen.',
      },
    ],
  },
  {
    id: 'HLP-123',
    slug: 'que-peut-on-contester',
    category: 'support',
    title: 'Qu’est-ce que je peux contester ?',
    summary:
      'Les décisions pour lesquelles une preuve structurée existe. Une question reste une demande de support.',
    status: 'publish',
    severity: 'information',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['contestable', 'quoi contester', 'eligible contestation'],
    related: ['ouvrir-une-contestation', 'examen-contestation', 'creer-et-suivre-un-ticket'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Ce que vous pouvez contester dépend de ce que WARIBA sait aujourd’hui documenter. Pour la bêta, une contestation peut viser un compte terminé ou une décision de risque lorsqu’une preuve structurée existe.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'La distinction qui compte',
        text: '« Je ne comprends pas pourquoi mon ordre a été refusé » est une question — une demande de support y répond. « Je conteste cette décision enregistrée » est un dossier avec son propre état et sa propre preuve.',
      },
      {
        kind: 'paragraph',
        text: 'Les refus de payout et les décisions d’identité pourront suivre un parcours dédié lorsqu’ils seront opérationnels.',
      },
    ],
  },
  {
    id: 'HLP-124',
    slug: 'examen-contestation',
    category: 'support',
    title: 'Comment ma contestation est-elle examinée ?',
    summary: 'L’équipe examine exactement les mêmes éléments que vous, et sa décision est motivée.',
    status: 'publish',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code', 'audit trail'],
    searchAliases: ['examen', 'revue', 'decision', 'operateur'],
    related: [
      'ouvrir-une-contestation',
      'preuve-originale-conservee',
      'statuts-ticket-contestation',
    ],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Votre contestation est examinée par une personne, à partir des mêmes éléments que ceux affichés dans votre dossier.',
      },
      { kind: 'heading', text: 'Sur quoi l’équipe s’appuie' },
      {
        kind: 'list',
        items: [
          'la règle qui s’appliquait à votre compte ce jour-là ;',
          'le seuil et la valeur atteinte ;',
          'vos ordres et vos exécutions ;',
          'l’heure exacte des faits ;',
          'les prix disponibles à ce moment.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Vous pouvez ajouter votre version des faits. Elle est lue et prise en compte, mais elle ne remplace pas ce qui a été enregistré au moment de la décision.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Une décision est toujours motivée',
        text: 'WARIBA ne peut pas enregistrer une décision sans motif écrit. Vous saurez donc toujours sur quoi elle s’appuie.',
      },
    ],
  },
  {
    id: 'HLP-125',
    slug: 'preuve-originale-conservee',
    category: 'support',
    title: 'Pourquoi WARIBA ne peut-il pas effacer une décision contestée ?',
    summary:
      'Contester ajoute un dossier et une décision. L’événement d’origine reste intact, y compris si WARIBA s’est trompé.',
    status: 'publish',
    severity: 'information',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code', 'audit trail'],
    searchAliases: ['preuve', 'historique', 'audit', 'supprimer', 'modifier'],
    related: ['lire-preuve-breach', 'examen-contestation', 'ouvrir-une-contestation'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Contester une décision ajoute un dossier et une conclusion. Cela n’efface jamais ce qui a été enregistré au départ.',
      },
      { kind: 'heading', text: 'Ce que WARIBA conserve' },
      {
        kind: 'list',
        items: [
          'l’événement original ;',
          'la preuve originale ;',
          'la contestation ;',
          'l’analyse ;',
          'la décision finale ;',
          'toute correction autorisée, sous la forme d’un nouvel événement.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Pourquoi c’est dans votre intérêt',
        text: 'Un système qui peut effacer une décision peut aussi effacer celle qui vous donnait raison. Un historique qui ne se réécrit pas est ce qui rend un désaccord vérifiable.',
      },
    ],
  },
  {
    id: 'HLP-126',
    slug: 'statuts-ticket-contestation',
    category: 'support',
    title: 'Que veulent dire les statuts de ma demande ou de ma contestation ?',
    summary:
      'Cinq états pour une demande, cinq pour une contestation, et ce que chacun veut dire pour vous.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: [
      'statut ticket',
      'statut contestation',
      'ouvert',
      'resolu',
      'ferme',
      'ou en est',
    ],
    related: ['creer-et-suivre-un-ticket', 'examen-contestation'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'table',
        caption: 'Votre demande',
        columns: ['Statut', 'Ce que cela veut dire'],
        rows: [
          [
            'Ouverte',
            'Nous avons bien reçu votre demande. Un membre de l’équipe va la prendre en charge.',
          ],
          [
            'En attente de votre réponse',
            'Nous avons besoin d’une précision de votre part pour continuer.',
          ],
          ['En cours d’examen', 'L’équipe WARIBA analyse votre demande.'],
          [
            'Résolue',
            'Une réponse vous a été apportée. Si ce n’est pas réglé pour vous, répondez : la demande repart.',
          ],
          ['Clôturée', 'Cette demande est terminée. Vous pouvez en ouvrir une nouvelle si besoin.'],
        ],
      },
      {
        kind: 'table',
        caption: 'Votre contestation',
        columns: ['Statut', 'Ce que cela veut dire'],
        rows: [
          ['Ouverte', 'Votre contestation a bien été enregistrée.'],
          ['En cours d’examen', 'L’équipe examine la décision et les éléments de votre dossier.'],
          [
            'Complément demandé',
            'Nous avons besoin d’une information de votre part pour continuer.',
          ],
          [
            'Décision maintenue',
            'Après examen, la décision d’origine est confirmée. Le motif est écrit dans votre dossier.',
          ],
          ['Clôturée', 'L’examen de cette contestation est terminé.'],
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Vous pouvez répondre tant que la demande n’est pas fermée',
        text: 'Même une demande marquée comme résolue accepte encore une réponse. Si le problème n’est pas réglé pour vous, écrivez dans le même fil : la demande repart.',
      },
    ],
  },
  {
    id: 'HLP-127',
    slug: 'informations-a-fournir',
    category: 'support',
    title: 'Quelles informations dois-je fournir à l’équipe ?',
    summary: 'Six éléments utiles, et cinq qu’il ne faut jamais envoyer.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['informations', 'quoi envoyer', 'details', 'securite'],
    related: ['creer-et-suivre-un-ticket', 'correlation-id', 'probleme-affichage'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Plus votre demande est précise, plus la réponse arrive vite. Voici ce qui aide vraiment.',
      },
      { kind: 'heading', text: 'À fournir si possible' },
      {
        kind: 'list',
        items: [
          'la référence de la demande, du compte ou de la commande ;',
          'la date et l’heure ;',
          'ce que vous essayiez de faire ;',
          'le résultat attendu ;',
          'le message ou le code affiché ;',
          'la référence technique affichée avec l’erreur.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Pour un problème de trading, ajoutez l’instrument et le type d’action.',
      },
      {
        kind: 'callout',
        tone: 'danger',
        title: 'À ne jamais fournir',
        text: 'Mot de passe, clé d’API, jeton de récupération, secret technique, numéro de carte complet. Aucun opérateur WARIBA ne vous les demandera, dans aucun canal.',
      },
    ],
  },
];
