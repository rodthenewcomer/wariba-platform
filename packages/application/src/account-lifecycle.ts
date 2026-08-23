import type { AccountSummaryDTO } from './accounts-list';

type AccountProgramType = AccountSummaryDTO['programType'];

/**
 * The account's life, as one vocabulary.
 *
 * ## Why this exists
 *
 * The database status column answers "what row state is this account in".
 * That is not the same question as "what is happening to this trader", and
 * the difference is where the product kept getting thin. `pass_pending` is a
 * single database value covering two situations a trader experiences very
 * differently: they hit the profit target twenty minutes ago and the session
 * is still open and still breakable, or the session has closed and the
 * platform is checking their record. Told the same thing in both, a person
 * cannot tell whether to keep trading carefully or to stop and wait.
 *
 * Likewise "funded" is not one state. There is the moment an evaluation is
 * declared passed, the interval while the Performance account is being
 * prepared, and the account being live. Collapsing those into one label is
 * how a trader ends up refreshing a page wondering whether anything is
 * happening.
 *
 * So the lifecycle is derived once, here, from authoritative inputs, and every
 * surface renders from it. The alternative — each page deriving its own
 * conditionals from `status`, `programType` and a snapshot — is how two
 * screens end up disagreeing about whether someone is funded.
 *
 * ## What it is not
 *
 * Not a second state machine. Nothing here transitions anything; the
 * authoritative transitions live in `@wariba/domain`'s
 * `assertEvaluationAccountTransition` and the writers that call it. This is a
 * *projection*: a read-only reading of states the platform already reached.
 */

export type AccountLifecycleState =
  /** Paid for, not yet activated. */
  | 'pending_activation'
  /** Evaluation running normally. */
  | 'evaluation_active'
  /** Evaluation running, inside the risk warning zone. */
  | 'evaluation_attention'
  /** Daily loss limit hit — trading paused until the next reset. */
  | 'evaluation_locked'
  /** Profit target reached, session still open. Rules still breakable. */
  | 'objective_reached'
  /** Session closed, automated verification running. */
  | 'under_review'
  /** Verification passed. The Performance account does not exist yet. */
  | 'passed'
  /** Performance account created, not yet activated. */
  | 'funded_preparing'
  /** Performance account live. */
  | 'funded_active'
  /** Maximum loss breached. Terminal. */
  | 'breached'
  /** Dormant. */
  | 'inactive'
  /** Terminal, read-only. */
  | 'closed';

export type LifecycleTone = 'neutral' | 'progress' | 'attention' | 'success' | 'danger';

export interface AccountLifecycleView {
  state: AccountLifecycleState;
  /** Short status word for a pill. */
  label: string;
  /** One sentence a trader can act on. Never a status restated as prose. */
  description: string;
  tone: LifecycleTone;
  /** Whether orders can be placed on this account right now. */
  tradable: boolean;
  /** Whether the account is finished — browsable, never actionable. */
  terminal: boolean;
  /** Whether the trader is waiting on WARIBA rather than on themselves. */
  awaitingPlatform: boolean;
}

const VIEW: Record<AccountLifecycleState, Omit<AccountLifecycleView, 'state'>> = {
  pending_activation: {
    label: 'Activation en attente',
    description: 'Votre compte s’active automatiquement après confirmation du paiement.',
    tone: 'neutral',
    tradable: false,
    terminal: false,
    awaitingPlatform: true,
  },
  evaluation_active: {
    label: 'Compte actif',
    description: 'Votre évaluation est en cours.',
    tone: 'success',
    tradable: true,
    terminal: false,
    awaitingPlatform: false,
  },
  evaluation_attention: {
    label: 'À surveiller',
    description: 'Vous approchez d’une limite de risque. Réduisez la taille de vos positions.',
    tone: 'attention',
    tradable: true,
    terminal: false,
    awaitingPlatform: false,
  },
  evaluation_locked: {
    label: 'Blocage temporaire',
    description:
      'Votre limite de perte quotidienne est atteinte. Le trading reprend au prochain reset.',
    tone: 'attention',
    tradable: false,
    terminal: false,
    awaitingPlatform: false,
  },
  /*
   * The state that did not exist before.
   *
   * Hitting the target intraday is not passing. Every rule still applies until
   * the session closes, and a trader who believes they are done can lose the
   * evaluation in the twenty minutes after the moment they thought they won.
   * So the copy says the one thing that matters and does not congratulate.
   */
  objective_reached: {
    label: 'Objectif atteint',
    description: 'Continuez à respecter les règles jusqu’à la clôture de la session.',
    tone: 'progress',
    tradable: true,
    terminal: false,
    awaitingPlatform: false,
  },
  under_review: {
    label: 'Vérification en cours',
    description: 'La session est clôturée. Nous vérifions le respect des règles.',
    tone: 'progress',
    tradable: false,
    terminal: false,
    awaitingPlatform: true,
  },
  passed: {
    label: 'Évaluation réussie',
    description: 'Votre compte Funded est en préparation.',
    tone: 'success',
    tradable: false,
    terminal: true,
    awaitingPlatform: true,
  },
  funded_preparing: {
    label: 'Compte Funded en préparation',
    description: 'Votre compte Funded sera actif dans quelques instants.',
    tone: 'success',
    tradable: false,
    terminal: false,
    awaitingPlatform: true,
  },
  funded_active: {
    label: 'Compte Funded actif',
    description: 'Votre compte Funded est actif. Vos payouts se débloquent par cycle.',
    tone: 'success',
    tradable: true,
    terminal: false,
    awaitingPlatform: false,
  },
  breached: {
    label: 'Compte échoué',
    description: 'La perte maximale a été atteinte. Ce compte n’est plus négociable.',
    tone: 'danger',
    tradable: false,
    terminal: true,
    awaitingPlatform: false,
  },
  inactive: {
    label: 'Compte inactif',
    description: 'Aucune activité depuis 30 jours. Contactez le support pour vos options.',
    tone: 'neutral',
    tradable: false,
    terminal: false,
    awaitingPlatform: false,
  },
  closed: {
    label: 'Compte terminé',
    description: 'Ce compte est fermé. Il reste consultable en lecture seule.',
    tone: 'neutral',
    tradable: false,
    terminal: true,
    awaitingPlatform: false,
  },
};

export interface DeriveAccountLifecycleParams {
  /** `app.trading_accounts.status`. */
  accountStatus: string;
  programType: AccountProgramType;
  /**
   * Whether the trader is inside the risk warning zone. Already computed by
   * the risk engine — this module never re-derives a risk fact.
   */
  inAttentionZone?: boolean;
  /**
   * Whether today's session has been finalized by the daily job.
   *
   * This is what separates "target reached, session still running" from
   * "session closed, verification running". Without it both render as one
   * indistinguishable wait, which is the exact ambiguity §16 exists to remove.
   */
  currentSessionFinalized?: boolean;
}

export function deriveAccountLifecycle(params: DeriveAccountLifecycleParams): AccountLifecycleView {
  const state = deriveAccountLifecycleState(params);
  return { state, ...VIEW[state] };
}

export function deriveAccountLifecycleState(
  params: DeriveAccountLifecycleParams,
): AccountLifecycleState {
  const performance = params.programType === 'WARIBA_PERFORMANCE';

  switch (params.accountStatus) {
    case 'pending_activation':
      // A Performance account waiting to activate is not "awaiting payment" —
      // nothing was bought. It is the funded account being prepared, which is
      // a different message and a different tone.
      return performance ? 'funded_preparing' : 'pending_activation';
    case 'active':
      if (performance) return 'funded_active';
      return params.inAttentionZone ? 'evaluation_attention' : 'evaluation_active';
    case 'soft_locked':
      return 'evaluation_locked';
    case 'pass_pending':
      return params.currentSessionFinalized ? 'under_review' : 'objective_reached';
    case 'passed':
      return 'passed';
    case 'breached':
      return 'breached';
    case 'inactive':
      return 'inactive';
    case 'closed':
      return 'closed';
    default:
      /*
       * An unmapped status is a schema change nobody propagated. Falling back
       * to `closed` is the safe direction: it is read-only and terminal, so an
       * unknown state can never be rendered as tradable.
       */
      return 'closed';
  }
}

/** The ordered lifecycle a WARIBA ONE account walks, for progress rendering. */
export const EVALUATION_JOURNEY: readonly AccountLifecycleState[] = [
  'evaluation_active',
  'objective_reached',
  'under_review',
  'passed',
  'funded_active',
];

/**
 * How far along the journey a state sits, 0-based, or `null` when the state is
 * off the happy path. A breach is not "step 2 of 5" and must never render on a
 * progress track as though the trader were partway to something.
 */
export function journeyStepIndex(state: AccountLifecycleState): number | null {
  switch (state) {
    case 'evaluation_active':
    case 'evaluation_attention':
    case 'evaluation_locked':
      return 0;
    case 'objective_reached':
      return 1;
    case 'under_review':
      return 2;
    case 'passed':
    case 'funded_preparing':
      return 3;
    case 'funded_active':
      return 4;
    default:
      return null;
  }
}
