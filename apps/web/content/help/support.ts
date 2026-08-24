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
    title: 'Comment contacter le support WARIBA',
    summary:
      'Le canal principal est le système de support authentifié du Trader Hub, où chaque demande reçoit une référence.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['support', 'contact', 'aide', 'ticket', 'joindre'],
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
    title: 'Comment créer et suivre une demande',
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
          'Ouvrez Support depuis le Trader Hub.',
          'Choisissez la catégorie.',
          'Sélectionnez le compte concerné lorsque c’est nécessaire.',
          'Décrivez le problème.',
          'Envoyez la demande.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Votre demande reçoit une référence publique. Vous suivez ensuite son statut et les réponses dans le même fil.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Le fil est en ajout seul',
        text: 'Les messages opérateur et trader restent traçables : aucun message ne peut être réécrit ou supprimé d’une conversation en cours, y compris par WARIBA.',
      },
    ],
  },
  {
    id: 'HLP-122',
    slug: 'ouvrir-une-contestation',
    category: 'support',
    title: 'Comment ouvrir une contestation',
    summary:
      'Depuis la preuve d’une décision contestable. Vous n’avez pas à recopier les chiffres du système.',
    status: 'publish',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code', 'Decision Log'],
    searchAliases: ['contester', 'contestation', 'dispute', 'recours', 'desaccord'],
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
        text: 'WARIBA relie le dossier aux preuves autoritatives. Vous n’avez pas à recopier un seuil ou une valeur observée : l’opérateur lit exactement les mêmes chiffres que vous.',
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
    title: 'Que peut-on contester ?',
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
        text: 'Les cibles disponibles dépendent des workflows réellement implémentés. Pour la bêta, une contestation peut viser un compte terminé ou une décision de risque lorsqu’une preuve structurée existe.',
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
    title: 'Comment WARIBA examine une contestation',
    summary:
      'L’opérateur lit les mêmes faits autoritatifs que vous, et sa décision porte une raison.',
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
      { kind: 'heading', text: 'Ce que l’opérateur consulte' },
      {
        kind: 'list',
        items: [
          'la policy ;',
          'le seuil ;',
          'la valeur observée ;',
          'les ordres et exécutions ;',
          'l’événement de risque ;',
          'les horodatages ;',
          'les données de marché disponibles ;',
          'l’audit.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Vous pouvez ajouter votre explication. Elle complète les preuves ; elle ne les remplace pas.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Une décision porte toujours une raison',
        text: 'Une décision « discrétionnaire » sans justification documentée n’est pas une décision que WARIBA peut enregistrer.',
      },
    ],
  },
  {
    id: 'HLP-125',
    slug: 'preuve-originale-conservee',
    category: 'support',
    title: 'Pourquoi la preuve originale n’est jamais supprimée',
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
    title: 'Les statuts d’une demande et d’une contestation',
    summary:
      'Cinq états pour une demande, cinq pour une contestation — et jamais une couleur seule.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['statut ticket', 'statut contestation', 'ouvert', 'resolu', 'ferme'],
    related: ['creer-et-suivre-un-ticket', 'examen-contestation'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'table',
        caption: 'Une demande de support',
        columns: ['Statut', 'Qui doit agir'],
        rows: [
          ['Ouverte', 'WARIBA — la demande est reçue et sera prise en charge.'],
          ['En attente de votre réponse', 'Vous — un opérateur a besoin d’une précision.'],
          ['En cours d’examen', 'WARIBA — un opérateur travaille dessus.'],
          ['Résolue', 'Personne — vous pouvez répondre si le sujet n’est pas clos.'],
          ['Clôturée', 'Personne — ouvrez une nouvelle demande si nécessaire.'],
        ],
      },
      {
        kind: 'table',
        caption: 'Une contestation',
        columns: ['Statut', 'Ce qu’il signifie'],
        rows: [
          ['Ouverte', 'Le dossier est enregistré.'],
          ['En cours d’examen', 'Un examinateur l’a prise en charge.'],
          ['Complément demandé', 'Une information vous est demandée.'],
          ['Décision maintenue', 'Les preuves confirment la décision d’origine.'],
          ['Clôturée', 'Le dossier est fermé ; la décision enregistrée en donne la raison.'],
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Jamais une couleur seule',
        text: 'Chaque statut est écrit en toutes lettres. Un état critique survit à une capture d’écran en noir et blanc.',
      },
    ],
  },
  {
    id: 'HLP-127',
    slug: 'informations-a-fournir',
    category: 'support',
    title: 'Quelles informations fournir au support',
    summary: 'Six éléments utiles, et cinq qu’il ne faut jamais envoyer.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['informations', 'quoi envoyer', 'details', 'securite'],
    related: ['creer-et-suivre-un-ticket', 'correlation-id', 'probleme-affichage'],
    lastReviewedAt: '2026-08-24',
    body: [
      { kind: 'heading', text: 'À fournir si possible' },
      {
        kind: 'list',
        items: [
          'la référence de la demande, du compte ou de la commande ;',
          'la date et l’heure ;',
          'ce que vous essayiez de faire ;',
          'le résultat attendu ;',
          'le message ou le code affiché ;',
          'le correlation ID.',
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
