import type { HelpArticle } from './types';

/** Compte & sécurité — session, access, and what an identifier does not grant. */
export const COMPTE_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-100',
    slug: 'session-expiree',
    category: 'compte-securite',
    title: 'Que faire si ma session a expiré ?',
    summary:
      'Une session expirée n’autorise aucune opération en arrière-plan. La destination demandée est conservée quand c’est sûr.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['session', 'expire', 'deconnecte', 'reconnexion', 'login'],
    related: ['email-et-mot-de-passe', 'warix-deconnexion'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Si votre session expire, WARIBA vous demande de vous reconnecter. Lorsque cela est sûr, la destination initiale est conservée afin de vous ramener vers la page demandée.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Rien ne continue en arrière-plan',
        text: 'Une session expirée n’autorise aucune opération sensible. WariX suspend les actions nécessitant une session valide.',
      },
    ],
  },
  {
    id: 'HLP-101',
    slug: 'email-et-mot-de-passe',
    category: 'compte-securite',
    title: 'Comment vérifier mon adresse ou récupérer mon mot de passe ?',
    summary: 'Utilisez les écrans officiels. Ne communiquez jamais un jeton de récupération.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['mot de passe', 'oublie', 'reset password', 'email', 'verification'],
    related: ['session-expiree', 'informations-a-fournir'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Utilisez les écrans officiels WARIBA pour vérifier votre adresse ou réinitialiser votre mot de passe.',
      },
      {
        kind: 'paragraph',
        text: 'Pour des raisons de sécurité, le parcours de récupération ne révèle pas si une adresse appartient à un compte. Ce n’est pas un défaut d’ergonomie : c’est ce qui empêche quelqu’un de tester une liste d’adresses contre WARIBA.',
      },
      {
        kind: 'callout',
        tone: 'danger',
        title: 'Ne partagez jamais un jeton de récupération',
        text: 'Le support WARIBA ne vous le demandera jamais, y compris dans un ticket.',
      },
    ],
  },
  {
    id: 'HLP-102',
    slug: 'plusieurs-comptes',
    category: 'compte-securite',
    title: 'Puis-je utiliser plusieurs comptes ?',
    summary:
      'Le nombre maximal d’évaluations actives reste une décision commerciale à verrouiller.',
    status: 'draft_policy',
    blockedBy: 'Nombre maximal d’évaluations actives par utilisateur — OPEN',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['plusieurs comptes', 'multi compte', 'combien', 'limite comptes'],
    related: ['acces-compte-autre-trader'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'WARIBA ne publie pas un nombre inventé. Une nouvelle activation ne sera désactivée sur la page Offres que le jour où une règle réelle existera.',
      },
    ],
  },
  {
    id: 'HLP-103',
    slug: 'acces-compte-autre-trader',
    category: 'compte-securite',
    title: 'Puis-je ouvrir le compte d’un autre trader ?',
    summary:
      'Un identifiant dans une URL n’accorde aucun accès. WARIBA vérifie à qui appartient chaque compte avant de l’ouvrir.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Product OS Master Constitution', 'RLS policies'],
    searchAliases: ['acces', 'url', 'autre compte', 'securite', 'rls', '404'],
    related: ['plusieurs-comptes', 'correlation-id'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Un identifiant présent dans une URL n’accorde aucun accès. WARIBA vérifie à qui appartient la ressource avant de l’afficher, et cette vérification ne peut pas être contournée depuis le navigateur.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Aucune information n’est révélée',
        text: 'Une ressource qui ne vous appartient pas et une ressource qui n’existe pas produisent exactement la même réponse. Cela s’applique aux comptes, aux demandes de support, aux contestations, aux payouts, aux ordres et aux dossiers d’identité.',
      },
    ],
  },
  {
    id: 'HLP-104',
    slug: 'voyage-appareil-vpn',
    category: 'compte-securite',
    title: 'Puis-je trader en voyage, ou depuis un VPN ?',
    summary: 'Aucune sanction ne sera publiée avant une politique d’intégrité précise.',
    status: 'draft_policy',
    blockedBy: 'Politique VPN/VPS/géolocalisation — non publiée',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['vpn', 'vps', 'voyage', 'pays', 'ip'],
    related: ['trading-integre'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Principe éditorial retenu : un VPN seul ne sera jamais présenté comme une preuve automatique de fraude. Toute décision devra s’appuyer sur une règle écrite et sur des faits vérifiables.',
      },
    ],
  },
  {
    id: 'HLP-105',
    slug: 'fermer-un-compte',
    category: 'compte-securite',
    title: 'Comment fermer mon compte ?',
    summary: 'Les procédures de suppression et de rétention doivent être finalisées avec Legal.',
    status: 'draft_policy',
    blockedBy: 'Politique de rétention/suppression — Privacy & Legal',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['fermer', 'supprimer', 'desactiver', 'rgpd', 'donnees'],
    related: ['acces-compte-autre-trader'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Quatre notions différentes ne doivent pas être confondues : la fermeture du profil utilisateur, un compte de trading clôturé, un compte inactif, et un compte terminé après un dépassement de limite.',
      },
      {
        kind: 'paragraph',
        text: 'La fermeture doit respecter les obligations de conservation, les dossiers financiers, les contestations en cours et la législation applicable.',
      },
    ],
  },
];
