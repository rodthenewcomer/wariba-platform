import type { HelpArticle } from './types';

/**
 * Identité & KYC.
 *
 * The one thing this category must not do is let a trader believe a failed
 * identity check breaks their trading account. It does not, and HLP-095 says
 * so explicitly, because the two domains are separate by design.
 */
export const IDENTITE_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-090',
    slug: 'pourquoi-verification-identite',
    category: 'identite',
    title: 'Pourquoi WARIBA demande une vérification d’identité',
    summary:
      'Elle protège les payouts, l’intégrité du programme et les obligations de conformité — et reste séparée du trading.',
    status: 'publish',
    severity: 'operational',
    audience: ['performance'],
    sourceOfTruth: ['Decision Log', 'Product OS Master Constitution'],
    searchAliases: ['kyc', 'identite', 'verification', 'papiers', 'conformite'],
    related: ['quand-kyc-demande', 'etats-kyc', 'kyc-et-compte-de-trading'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'La vérification d’identité protège les payouts, l’intégrité du programme et les obligations de conformité.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'KYC et trading sont deux domaines distincts',
        text: 'Un dossier d’identité est un objet Conformité, séparé du compte de trading. Les deux ne se contaminent pas.',
      },
      {
        kind: 'paragraph',
        text: 'WARIBA limite l’accès aux informations sensibles et ne place pas de documents bruts dans les tables métier ordinaires.',
      },
    ],
  },
  {
    id: 'HLP-091',
    slug: 'quand-kyc-demande',
    category: 'identite',
    title: 'Quand la vérification d’identité est-elle demandée ?',
    summary:
      'Par défaut au premier moment où les conditions financières d’un payout sont remplies — pas avant l’achat.',
    status: 'publish',
    severity: 'operational',
    audience: ['performance'],
    sourceOfTruth: ['Decision Log', 'domain code'],
    searchAliases: ['quand kyc', 'avant achat', 'moment', 'declenchement'],
    related: ['eligible-vs-pret', 'pourquoi-verification-identite', 'etats-kyc'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'formula',
        expression:
          'conditions financières remplies → identité requise → vérifiée → éligibilité recalculée → demande possible',
      },
      {
        kind: 'paragraph',
        text: 'Une obligation juridique, un prestataire, un pays ou la Conformité peuvent exiger une vérification plus tôt. Une telle exception est documentée par policy.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Pas de KYC avant l’achat',
        text: 'WARIBA ne demande pas une vérification complète avant l’achat simplement parce qu’un concurrent le fait.',
      },
    ],
  },
  {
    id: 'HLP-092',
    slug: 'etats-kyc',
    category: 'identite',
    title: 'Quels sont les états d’une vérification d’identité ?',
    summary: 'Dix états possibles, et une action claire chaque fois que vous pouvez intervenir.',
    status: 'publish',
    severity: 'information',
    audience: ['performance'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['etat kyc', 'statut kyc', 'action requise', 'en cours'],
    related: ['kyc-refuse', 'quand-kyc-demande', 'kyc-et-compte-de-trading'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'list',
        items: [
          'non requis ;',
          'requis ;',
          'en cours ;',
          'en revue ;',
          'action requise ;',
          'échec réessayable ;',
          'échec final ;',
          'vérifié ;',
          'expiré ;',
          'nouvelle vérification requise.',
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: '« Action requise » n’accuse personne',
        text: 'C’est une demande de correction, pas un soupçon de fraude.',
      },
    ],
  },
  {
    id: 'HLP-093',
    slug: 'documents-kyc',
    category: 'identite',
    title: 'Quels documents sont acceptés ?',
    summary: 'Publié après le choix du prestataire et la validation de sa couverture par pays.',
    status: 'draft_provider',
    blockedBy: 'Aucun prestataire KYC intégré — KYC_PROVIDER_INTEGRATED = false',
    severity: 'information',
    audience: ['performance'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['documents', 'passeport', 'cni', 'selfie', 'justificatif'],
    related: ['etats-kyc', 'kyc-refuse'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Cet article sera publié après le choix du prestataire de vérification et la validation de sa couverture des pays WARIBA. Il affichera par pays : pièces supportées, qualité requise, justificatif éventuel, exigence de selfie ou de détection du vivant, formats, motifs courants de rejet et règles de confidentialité.',
      },
      {
        kind: 'paragraph',
        text: 'WARIBA ne promettra pas qu’un document est accepté simplement parce qu’un concurrent l’accepte.',
      },
    ],
  },
  {
    id: 'HLP-094',
    slug: 'kyc-refuse',
    category: 'identite',
    title: 'Vérification refusée, action requise, nouvelle vérification',
    summary: 'Un dossier peut demander une correction sans être définitivement refusé.',
    status: 'publish',
    severity: 'operational',
    audience: ['performance'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['refuse', 'rejete kyc', 'reessayer', 'expire'],
    related: ['etats-kyc', 'kyc-et-compte-de-trading', 'contacter-le-support'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'table',
        columns: ['État', 'Ce que vous pouvez faire'],
        rows: [
          ['Action requise', 'Une information doit être corrigée.'],
          ['Échec réessayable', 'Une nouvelle tentative est possible.'],
          [
            'Échec final',
            'La vérification n’a pas été validée ; le recours disponible est expliqué.',
          ],
          [
            'Expiré / nouvelle vérification',
            'Une nouvelle vérification est nécessaire pour un motif documenté.',
          ],
        ],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Pas de re-vérification à chaque payout',
        text: 'Une nouvelle vérification n’est déclenchée que pour un motif documenté, jamais par routine.',
      },
    ],
  },
  {
    id: 'HLP-095',
    slug: 'kyc-et-compte-de-trading',
    category: 'identite',
    title: 'Pourquoi une vérification échouée ne fait pas échouer un compte de trading',
    summary:
      'Deux domaines séparés. Un échec d’identité bloque une étape de payout, pas votre compte.',
    status: 'publish',
    severity: 'information',
    audience: ['performance'],
    sourceOfTruth: ['Product OS Master Constitution', 'domain code'],
    searchAliases: ['kyc echoue', 'breach kyc', 'compte bloque identite'],
    related: ['pourquoi-verification-identite', 'kyc-refuse', 'limite-maximale-depassee'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Un échec de vérification d’identité peut bloquer une étape de payout ou déclencher une revue Conformité. Il ne transforme pas automatiquement un compte de trading en compte terminé.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Le statut du compte suit une règle de trading',
        text: 'Le statut de votre compte reflète toujours une règle de trading ou de cycle de vie autoritative, jamais un raccourci Conformité.',
      },
    ],
  },
];
