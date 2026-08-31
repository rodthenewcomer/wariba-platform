export interface LegalCenterPage {
  href: string;
  label: string;
  description: string;
}

/** The 11 Legal Center pages, in reading order — the hub page and the footer's "Cadre légal" column both read from this single list. */
export const LEGAL_CENTER_PAGES: readonly LegalCenterPage[] = [
  {
    href: '/legal/mentions-legales',
    label: 'Mentions légales',
    description: 'Qui exploite WARIBA, et comment nous contacter.',
  },
  {
    href: '/legal/conditions-utilisation',
    label: 'Conditions d’utilisation',
    description: 'Les règles contractuelles générales pour utiliser WARIBA.',
  },
  {
    href: '/legal/trading-simule',
    label: 'Trading simulé',
    description: 'Ce qu’un compte simulé est, et n’est pas.',
  },
  {
    href: '/legal/risques',
    label: 'Risques et règles de trading',
    description: 'Les règles du programme simulé et leurs conséquences.',
  },
  {
    href: '/legal/payouts',
    label: 'Payouts',
    description: 'Comment une demande de payout est traitée.',
  },
  {
    href: '/legal/remboursements',
    label: 'Paiements, annulations et remboursements',
    description: 'Ce qui est déjà tranché, et ce qui ne l’est pas encore.',
  },
  {
    href: '/legal/confidentialite',
    label: 'Confidentialité',
    description: 'Vos données, en clair.',
  },
  {
    href: '/legal/cookies',
    label: 'Cookies',
    description: 'L’inventaire réel des cookies utilisés par WARIBA.',
  },
  {
    href: '/legal/lbc-kyc',
    label: 'LBC / KYC',
    description: 'Vérification d’identité, anti-fraude et intégrité financière.',
  },
  {
    href: '/legal/disponibilite-pays',
    label: 'Disponibilité par pays',
    description: 'Les six marchés visés, et ce que la disponibilité signifie.',
  },
  {
    href: '/legal/reclamations-litiges',
    label: 'Réclamations et litiges',
    description: 'Comment déposer une réclamation, et ce qu’il en advient.',
  },
] as const;
