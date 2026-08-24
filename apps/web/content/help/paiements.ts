import type { HelpArticle } from './types';

/** Paiements & facturation — confirmation, orders, receipts. */
export const PAIEMENTS_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-080',
    slug: 'confirmation-paiement',
    category: 'paiements',
    title: 'Comment WARIBA confirme un paiement',
    summary:
      'Une redirection ne prouve rien. Le statut est décidé côté serveur, à partir du webhook et de la réconciliation.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code', 'Decision Log'],
    searchAliases: ['paiement', 'confirme', 'webhook', 'commande', 'active'],
    related: ['paiement-en-attente', 'paiement-echoue', 'eviter-double-paiement'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Une redirection vers WARIBA après paiement ne prouve pas à elle seule que la transaction est confirmée. Le statut est décidé côté serveur, à partir du webhook sécurisé et de la réconciliation du prestataire.',
      },
      {
        kind: 'table',
        caption: 'Les états que vous pouvez voir',
        columns: ['État', 'Ce qu’il signifie'],
        rows: [
          ['Confirmation en attente', 'WARIBA attend la validation du prestataire.'],
          ['Paiement confirmé', 'La transaction est validée et l’activation peut suivre.'],
          ['Paiement non confirmé', 'WARIBA n’a pas reçu de validation.'],
          ['Statut en vérification', 'La réconciliation est en cours.'],
        ],
      },
      {
        kind: 'callout',
        tone: 'danger',
        title: 'Si le statut est inconnu, ne payez pas une seconde fois',
        text: 'Utilisez la référence de commande pour demander de l’aide.',
      },
    ],
  },
  {
    id: 'HLP-081',
    slug: 'moyens-de-paiement',
    category: 'paiements',
    title: 'Quels moyens de paiement sont acceptés ?',
    summary: 'Généré depuis la configuration du prestataire réellement contracté.',
    status: 'draft_provider',
    blockedBy: 'Aucun PSP contracté — OPEN-PAYMENT-001',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['moyens de paiement', 'carte', 'mobile money', 'orange money', 'wave', 'visa'],
    related: ['confirmation-paiement'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Cet article sera généré depuis la configuration du prestataire de paiement réellement contracté, et affichera par pays : méthode, disponibilité, devise, frais et délai de confirmation.',
      },
      {
        kind: 'paragraph',
        text: 'Aucune marque de rail de paiement ne sera annoncée comme disponible dans un pays tant que le prestataire actif n’a pas confirmé cette combinaison et que WARIBA ne l’a pas testée.',
      },
    ],
  },
  {
    id: 'HLP-082',
    slug: 'paiement-en-attente',
    category: 'paiements',
    title: 'Mon paiement est en attente',
    summary:
      'Aucun second compte n’est créé pendant l’attente. Ne relancez pas un deuxième paiement.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['en attente', 'pending', 'pas active', 'bloque paiement'],
    related: ['confirmation-paiement', 'eviter-double-paiement', 'activation-retardee'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Un paiement peut rester en attente pendant la confirmation du prestataire.',
      },
      { kind: 'heading', text: 'Pendant cet état' },
      {
        kind: 'list',
        items: [
          'aucun second compte n’est créé ;',
          'WARIBA continue de vérifier le statut ;',
          'vous ne devez pas lancer un deuxième paiement pour la même commande.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Conservez la référence de commande. Si le statut reste inchangé, ouvrez une demande de support en la joignant.',
      },
    ],
  },
  {
    id: 'HLP-083',
    slug: 'paiement-echoue',
    category: 'paiements',
    title: 'Mon paiement a échoué',
    summary:
      'Aucun compte n’est activé sur la seule base d’un retour navigateur. Si vous avez été débité, ouvrez une demande.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['echec', 'failed', 'refuse paiement', 'debite'],
    related: ['confirmation-paiement', 'eviter-double-paiement', 'contacter-le-support'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Un paiement en échec signifie que WARIBA n’a pas confirmé la transaction. Aucun compte n’est activé sur la seule base d’un retour navigateur.',
      },
      { kind: 'heading', text: 'À vérifier' },
      {
        kind: 'list',
        items: [
          'l’état affiché ;',
          'la référence de commande ;',
          'les instructions du prestataire.',
        ],
      },
      {
        kind: 'callout',
        tone: 'danger',
        title: 'Débité malgré un échec affiché',
        text: 'N’effectuez pas immédiatement une seconde transaction. Ouvrez une demande pour réconciliation, avec la référence de commande.',
      },
    ],
  },
  {
    id: 'HLP-084',
    slug: 'eviter-double-paiement',
    category: 'paiements',
    title: 'Comment éviter un double paiement',
    summary:
      'Vérifiez le statut avant de recommencer. Un webhook répété ne crée jamais deux comptes.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['double', 'deux fois', 'idempotence', 'doublon'],
    related: ['confirmation-paiement', 'paiement-en-attente'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Chaque commande possède une référence, et WARIBA utilise des mécanismes d’idempotence : la répétition d’un webhook valide ne crée pas deux comptes.',
      },
      {
        kind: 'list',
        ordered: true,
        items: [
          'Vérifiez d’abord le statut de la commande.',
          'Ne recréez pas une commande simplement pour obtenir une réponse plus rapide.',
          'Utilisez le support si le statut reste inconnu.',
        ],
      },
    ],
  },
  {
    id: 'HLP-085',
    slug: 'recus-et-facturation',
    category: 'paiements',
    title: 'Reçus et historique de facturation',
    summary: 'La page Facturation affiche uniquement les éléments réellement disponibles.',
    status: 'dynamic',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['recu', 'facture', 'facturation', 'historique', 'invoice'],
    related: ['confirmation-paiement', 'remboursements'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'list',
        items: [
          'commande ;',
          'produit ;',
          'montant ;',
          'devise ;',
          'prestataire ;',
          'statut ;',
          'date ;',
          'référence ;',
          'reçu lorsque sa génération est implémentée.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Rien n’est simulé sur cette page',
        text: 'WARIBA n’affiche pas de carte bancaire enregistrée fictive ni un bouton de reçu qui ne produit aucun document.',
      },
    ],
  },
  {
    id: 'HLP-086',
    slug: 'remboursements',
    category: 'paiements',
    title: 'Remboursements',
    summary: 'La politique définitive de remboursement n’est pas verrouillée.',
    status: 'draft_policy',
    blockedBy: 'Politique de remboursement — OPEN',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['remboursement', 'refund', 'annuler', 'chargeback'],
    related: ['recus-et-facturation'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Tant que la politique n’est pas verrouillée, WARIBA ne promet aucun délai, aucune éligibilité automatique, aucun pourcentage et aucune procédure de contestation bancaire punitive non publiée.',
      },
      {
        kind: 'paragraph',
        text: 'Cet article sera activé une fois la politique commerciale, le prestataire de paiement et les conditions juridiques alignés.',
      },
    ],
  },
];
