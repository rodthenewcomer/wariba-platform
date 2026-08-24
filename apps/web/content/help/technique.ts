import type { HelpArticle } from './types';

/**
 * Technique & incidents.
 *
 * `HLP-111` is written against the state of the product rather than the state
 * of the plan: `/status` does not exist yet (`OPS-010` is `LOCKED` and
 * unsatisfied), so the article says so instead of sending a trader to a page
 * that 404s. An article promising a surface that is not there is the same
 * failure mode as a button that does nothing.
 */
export const TECHNIQUE_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'HLP-110',
    slug: 'donnees-indisponibles',
    category: 'technique',
    title: 'Données de marché indisponibles ou retardées',
    summary: 'Un historique consultable ne veut pas dire qu’un prix est assez frais pour exécuter.',
    status: 'publish',
    severity: 'operational',
    audience: ['evaluation', 'performance'],
    sourceOfTruth: ['realtime service', 'domain code'],
    searchAliases: ['pas de prix', 'fige', 'retard', 'marche', 'flux'],
    related: ['donnees-de-marche', 'graphique-et-execution', 'maintenance-et-status'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Si WARIBA détecte que les données sont trop anciennes, l’interface le dit et refuse l’ouverture d’une nouvelle exposition plutôt que d’exécuter contre un prix périmé.',
      },
      {
        kind: 'paragraph',
        text: 'Le graphique peut rester consultable lorsqu’il possède des données sûres. Une donnée historique disponible ne signifie pas qu’un prix est suffisamment frais pour exécuter.',
      },
    ],
  },
  {
    id: 'HLP-111',
    slug: 'maintenance-et-status',
    category: 'technique',
    title: 'Maintenance et incidents',
    summary:
      'Ce qu’un incident affiche aujourd’hui, et pourquoi aucune page d’état publique n’est encore publiée.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log'],
    searchAliases: ['status', 'maintenance', 'incident', 'panne', 'disponibilite'],
    related: ['donnees-indisponibles', 'contacter-le-support', 'correlation-id'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'callout',
        tone: 'information',
        title: 'Aucune page d’état publique pour le moment',
        text: 'WARIBA n’a pas encore publié de page /status. Tant qu’elle n’existe pas, cet article ne vous y envoie pas : un incident se lit dans le produit lui-même, et une demande de support reste le canal fiable.',
      },
      { kind: 'heading', text: 'Ce qu’une page d’état publiera, quand elle existera' },
      {
        kind: 'list',
        items: [
          'le périmètre réellement affecté : site, authentification, WariX et temps réel, données de marché, paiement, support ;',
          'le début de l’incident ;',
          'la dernière mise à jour ;',
          'le statut courant.',
        ],
      },
      {
        kind: 'callout',
        tone: 'attention',
        title: 'Aucune disponibilité fictive',
        text: 'WARIBA n’affichera pas un pourcentage de disponibilité qu’il ne mesure pas, ni un délai de résolution inventé.',
      },
    ],
  },
  {
    id: 'HLP-112',
    slug: 'correlation-id',
    category: 'technique',
    title: 'Que signifie un correlation ID ?',
    summary:
      'Une référence technique qui relie les événements d’une opération, sans exposer vos données.',
    status: 'publish',
    severity: 'information',
    audience: ['tous'],
    sourceOfTruth: ['Decision Log', 'domain code'],
    searchAliases: ['correlation', 'reference', 'id', 'technique', 'erreur'],
    related: ['informations-a-fournir', 'contacter-le-support'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Un correlation ID permet à WARIBA de relier plusieurs événements d’une même opération sans vous demander de fournir des données sensibles.',
      },
      {
        kind: 'paragraph',
        text: 'Vous pouvez le joindre à une demande de support lorsqu’une erreur l’affiche.',
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Ce qu’il n’est pas',
        text: 'Il ne contient pas votre mot de passe et ne remplace pas la référence publique de votre demande ou de votre commande.',
      },
    ],
  },
  {
    id: 'HLP-113',
    slug: 'activation-retardee',
    category: 'technique',
    title: 'Paiement confirmé mais activation retardée',
    summary:
      'La commande et le paiement sont conservés. On ne vous demandera jamais de payer deux fois.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['activation', 'retard', 'pas de compte', 'paye mais rien'],
    related: ['confirmation-paiement', 'paiement-en-attente', 'contacter-le-support'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'paragraph',
        text: 'Si le paiement est confirmé mais que l’activation rencontre un incident, WARIBA conserve la commande et le paiement. Le système ne vous demandera pas de payer une seconde fois.',
      },
      { kind: 'heading', text: 'Ce que l’écran affiche' },
      {
        kind: 'list',
        items: ['le statut ;', 'la dernière mise à jour ;', 'la référence.'],
      },
      {
        kind: 'callout',
        tone: 'information',
        title: 'Aucun délai n’est promis sans mesure',
        text: 'Une date prévisionnelle n’est affichée que si WARIBA dispose d’un délai réellement surveillé. Si nécessaire, ouvrez une demande avec la référence de commande.',
      },
    ],
  },
  {
    id: 'HLP-114',
    slug: 'probleme-affichage',
    category: 'technique',
    title: 'Problème d’affichage mobile ou navigateur',
    summary:
      'Quatre vérifications avant d’ouvrir une demande — et ce qu’il ne faut jamais partager.',
    status: 'publish',
    severity: 'operational',
    audience: ['tous'],
    sourceOfTruth: ['domain code'],
    searchAliases: ['bug', 'affichage', 'mobile', 'navigateur', 'ecran'],
    related: ['informations-a-fournir', 'contacter-le-support'],
    lastReviewedAt: '2026-08-24',
    body: [
      {
        kind: 'list',
        ordered: true,
        items: [
          'Vérifiez que votre navigateur est à jour.',
          'Rechargez la page sans répéter une opération financière.',
          'Notez le navigateur, l’appareil et l’heure.',
          'Conservez le correlation ID s’il existe.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Pour un problème WariX, précisez aussi le compte, l’instrument et l’état de connexion.',
      },
      {
        kind: 'callout',
        tone: 'danger',
        title: 'Ne partagez jamais',
        text: 'Mot de passe, clé d’API, jeton de récupération. Aucun opérateur WARIBA ne vous les demandera.',
      },
    ],
  },
];
