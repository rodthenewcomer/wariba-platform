import type { HelpArticle } from './types';

/**
 * Trading & WariX.
 *
 * Written against what the terminal actually ships. `HLP-055` in particular
 * names only the two indicators `CHART_INDICATOR_TYPES` declares — publishing
 * a list a competitor offers would be advertising a control that is not there.
 */
export const WARIX_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-050',
    slug: 'decouvrir-warix',
    category: 'warix',
    title: 'Découvrir WariX',
    summary: 'Le terminal de trading WARIBA : ce qu’il fait, et ce qui reste au Trader Hub.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['Product OS Master Constitution'],
    searchAliases: ['warix', 'terminal', 'plateforme', 'trader'],
    related: ['placer-un-ordre', 'ordres-positions-executions', 'warix-deconnexion'],
    lastReviewedAt: '2026-08-24',
    body: [
      { kind: 'heading', text: 'Ce que WariX sert à faire' },
      {
        kind: 'list',
        items: [
          'sélectionner un marché ;',
          'lire le graphique ;',
          'placer et gérer les ordres supportés ;',
          'suivre positions, ordres et exécutions ;',
          'afficher le risque autoritatif ;',
          'utiliser les indicateurs et outils disponibles.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Ce que WariX ne fait pas',
        text: 'La facturation, l’achat, la vérification d’identité et les payouts appartiennent au Trader Hub. Cette séparation est délibérée : le terminal reste un terminal.',
      },
    ],
  },
  {
    id: 'HLP-051',
    slug: 'placer-un-ordre',
    category: 'warix',
    title: 'Comment placer un ordre',
    summary: 'Six étapes — et le rappel que le navigateur ne fournit jamais le prix d’exécution.',
    status: 'dynamic',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code', 'symbol specifications'],
    searchAliases: ['ordre', 'acheter', 'vendre', 'market', 'passer un ordre'],
    related: ['ordre-refuse', 'stop-loss-take-profit', 'ordres-en-attente'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'list',
        ordered: true,
        items: [
          'Sélectionnez un compte tradable.',
          'Choisissez l’instrument.',
          'Vérifiez le type d’ordre disponible.',
          'Saisissez la quantité.',
          'Ajoutez une protection si elle est supportée.',
          'Envoyez l’ordre.',
        ],
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Le prix affiché n’est pas une garantie',
        text: 'Le serveur valide le compte, le marché, le prix et le risque, puis retourne le résultat. Si un ordre est refusé, lisez le code de raison plutôt que de renvoyer immédiatement la même commande.',
      },
    ],
  },
  {
    id: 'HLP-052',
    slug: 'stop-loss-take-profit',
    category: 'warix',
    title: 'Stop Loss et Take Profit',
    summary:
      'Des protections attachées à une position, déclenchées côté serveur. Un dessin sur le graphique n’en est jamais une.',
    status: 'publish',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['sl', 'tp', 'stop loss', 'take profit', 'protection'],
    related: ['placer-un-ordre', 'indicateurs-et-dessins', 'frais-de-trading'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Un Stop Loss et un Take Profit sont des protections attachées à une position ou à une instruction, selon le type d’ordre supporté.',
      },
      {
        kind: 'paragraph',
        text: 'WARIBA traite les déclenchements côté serveur. Le prix affiché sur le graphique ne constitue pas une garantie d’exécution exacte : le spread et le slippage du modèle peuvent s’appliquer.',
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Un dessin n’est pas un ordre',
        text: 'Les modifications passent par le flux d’exécution canonique. Une ligne tracée sur le graphique ne devient jamais automatiquement un SL ou un TP.',
      },
    ],
  },
  {
    id: 'HLP-053',
    slug: 'reduire-cloturer-close-all',
    category: 'warix',
    title: 'Réduire, clôturer et Close All',
    summary:
      'Trois actions sérialisées et auditées, disponibles même dans certains états où ouvrir ne l’est plus.',
    status: 'publish',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['fermer', 'cloturer', 'close all', 'partial', 'reduire'],
    related: ['permissions-de-trading', 'placer-un-ordre'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'table',
        columns: ['Action', 'Effet'],
        rows: [
          ['Réduire', 'Diminue l’exposition existante.'],
          ['Clôturer', 'Ferme une position.'],
          ['Close All', 'Demande la fermeture des positions concernées via le flux serveur.'],
        ],
      },
      {
        kind: 'paragraph',
        text: 'Ces actions sont sérialisées et auditées. En cas de commandes concurrentes ou de nouvel essai, WARIBA évite les doubles effets.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Réduire reste souvent possible',
        text: 'Pendant certains états de risque, ouvrir de nouvelles positions est bloqué alors qu’une réduction reste permise — c’est délibéré.',
      },
    ],
  },
  {
    id: 'HLP-054',
    slug: 'ordres-en-attente',
    category: 'warix',
    title: 'Ordres en attente : disponibilité et comportement',
    summary: 'Quatre types supportés, une seule durée de validité, et un déclenchement serveur.',
    status: 'dynamic',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['Decision Log', 'domain code'],
    searchAliases: ['limit', 'stop', 'pending', 'ordre en attente', 'gtc'],
    related: ['placer-un-ordre', 'ordre-refuse', 'permissions-de-trading'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'WariX n’affiche que les types d’ordres réellement supportés. Aujourd’hui : Achat Limite, Vente Limite, Achat Stop et Vente Stop.',
      },
      {
        kind: 'table',
        columns: ['Propriété', 'Comportement actuel'],
        rows: [
          [
            'Durée de validité',
            'GTC uniquement — l’ordre reste actif jusqu’à déclenchement ou annulation.',
          ],
          [
            'Déclenchement',
            'Sur un prix réel du serveur, jamais sur un prix affiché par le navigateur.',
          ],
          ['Protections', 'Un Stop Loss et un Take Profit peuvent être attachés dès la création.'],
          [
            'Annulation',
            'Possible tant que l’ordre n’est pas déclenché, selon les permissions serveur.',
          ],
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Aucun type n’est affiché parce qu’un concurrent le propose',
        text: 'Le menu contextuel du graphique ne propose que les types réellement valides au prix cliqué — jamais un choix qui serait rejeté.',
      },
    ],
  },
  {
    id: 'HLP-055',
    slug: 'indicateurs-et-dessins',
    category: 'warix',
    title: 'Indicateurs et dessins',
    summary:
      'Des outils d’analyse visuelle. Ils n’ont aucune autorité sur le prix, le risque ou l’état du compte.',
    status: 'dynamic',
    severity: 'information',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['indicateur', 'ema', 'sma', 'dessin', 'trendline', 'fibonacci'],
    related: ['stop-loss-take-profit', 'graphique-et-execution'],
    lastReviewedAt: '2026-08-24',
    body: [
      { kind: 'heading', text: 'Ce sur quoi ils n’ont aucune autorité' },
      {
        kind: 'list',
        items: [
          'le prix d’exécution ;',
          'la balance ;',
          'le risque ;',
          'le statut du compte ;',
          'l’éligibilité payout.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Les indicateurs disponibles dans cette version sont les moyennes mobiles EMA et SMA. D’autres pourront être ajoutés ; ils apparaîtront lorsqu’ils seront réellement implémentés.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Aucun contrôle non fonctionnel',
        text: 'Un indicateur listé dans le menu est un indicateur qui calcule. WARIBA n’affiche pas un réglage qui ne fait rien.',
      },
    ],
  },
  {
    id: 'HLP-056',
    slug: 'warix-deconnexion',
    category: 'warix',
    title: 'Que faire si WariX se déconnecte ?',
    summary:
      'Le terminal suspend ce qui augmente le risque, resynchronise, puis réactive. Ne multipliez pas les ordres pour « vérifier ».',
    status: 'publish',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['realtime service', 'domain code'],
    searchAliases: ['deconnexion', 'offline', 'reconnexion', 'coupure', 'internet'],
    related: ['donnees-de-marche', 'permissions-de-trading', 'ordres-positions-executions'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'list',
        ordered: true,
        items: [
          'WariX affiche l’état de connexion.',
          'Les actions augmentant le risque sont suspendues.',
          'Le système tente une reconnexion.',
          'Un instantané autoritatif est récupéré.',
          'Les événements manqués sont réconciliés lorsque le transport le permet.',
          'Les actions sont réactivées seulement après resynchronisation.',
        ],
      },
      {
        kind: 'callout',
        tone: 'danger',
        title: 'Ne renvoyez pas le même ordre',
        text: 'Rafraîchir ou soumettre à nouveau pour « voir si ça passe » est la façon la plus rapide de se retrouver avec deux positions. Consultez l’activité et le statut du dernier ordre.',
      },
    ],
  },
  {
    id: 'HLP-057',
    slug: 'ordres-positions-executions',
    category: 'warix',
    title: 'Où voir mes ordres, exécutions et positions ?',
    summary: 'La session vit dans le dock de WariX ; l’historique vit dans le Journal du Hub.',
    status: 'publish',
    severity: 'information',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['Product OS Master Constitution'],
    searchAliases: ['positions', 'ordres', 'executions', 'historique', 'journal'],
    related: ['decouvrir-warix', 'reduire-cloturer-close-all'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Dans WariX, l’activité de session est regroupée dans le dock : Positions, Ordres, Exécutions, Alertes lorsqu’elles sont supportées, et Compte.',
      },
      {
        kind: 'paragraph',
        text: 'Pour l’analyse historique détaillée, utilisez le Journal et la page Performance du Trader Hub.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Une seule source',
        text: 'Il n’existe pas deux systèmes indépendants calculant vos positions. Le dock et le Journal lisent les mêmes enregistrements serveur.',
      },
    ],
  },
  {
    id: 'HLP-058',
    slug: 'graphique-et-execution',
    category: 'warix',
    title: 'Pourquoi le graphique et l’exécution peuvent-ils être dans des états différents ?',
    summary:
      'Un historique valide ne prouve pas qu’un prix est assez frais pour exécuter. WARIBA sépare les deux volontairement.',
    status: 'publish',
    severity: 'information',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['domain code', 'realtime service'],
    searchAliases: ['graphique', 'historique', 'chart', 'prix', 'divergence'],
    related: ['donnees-de-marche', 'warix-deconnexion', 'indicateurs-et-dessins'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'WARIBA sépare la disponibilité de l’historique graphique et la disponibilité d’un flux assez frais pour exécuter.',
      },
      {
        kind: 'example',
        title: 'Les deux cas',
        lines: [
          'un graphique peut contenir un historique valide alors que le flux courant est obsolète ;',
          'un flux d’exécution peut fonctionner sans disposer d’un historique très profond.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Pourquoi ne pas raccorder les deux',
        text: 'WariX ne relie pas artificiellement deux séries dont les prix divergent de façon inacceptable. Cette séparation protège contre l’affichage d’une continuité fictive.',
      },
    ],
  },
];
