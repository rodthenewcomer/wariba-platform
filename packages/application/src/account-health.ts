import Decimal from 'decimal.js';

/**
 * How much room the account has left, in one word.
 *
 * ## Why this is arithmetic and not a score
 *
 * Every prop platform shows a "health score". Most of them are a weighted sum
 * of things the vendor chose, presented as a number out of 100, and a trader
 * cannot reconstruct it or act on it — a 70/100 does not tell you which lever
 * to pull. Several of them are marketed as AI.
 *
 * This is deliberately none of that. It is a reading of two numbers the risk
 * engine already computed and that the rulebook already defines: how much of
 * today's daily loss limit is left, and how much of the total maximum-loss
 * budget is left. Both are ratios of real money against real published
 * thresholds, so the state is reproducible by hand and the trader can always
 * see which of the two produced it.
 *
 * The worse of the two wins. A trader with a comfortable maximum loss and no
 * daily room left cannot trade today, and calling that "Bon" because one of
 * two numbers is fine would be exactly the reassurance that gets an account
 * breached.
 *
 * ## Why "untested" exists (Phase 2.5 §11)
 *
 * An account activated ten minutes ago has 100 % of both budgets, and the
 * arithmetic above happily called that "Excellent". It is not. Nothing has
 * been risked, so nothing has been demonstrated — the reading is a statement
 * about an *absence* of trading, dressed as praise for the trader's discipline.
 * That is the same class of error as a 0 % win rate on an account with no
 * trades, and it primes exactly the confidence a first evaluation punishes.
 *
 * `untested` is therefore a distinct state, not a label swap: it reports the
 * budgets as intact and declines to grade them. Praise resumes the moment
 * there is behaviour to praise.
 *
 * There is no numeric score. Five words, each of which maps to an action or to
 * an honest absence of one.
 */

export type AccountHealth = 'untested' | 'excellent' | 'good' | 'watch' | 'critical';

export interface AccountHealthView {
  state: AccountHealth;
  label: string;
  /** Names the constraint that produced the state — never a generic sentence. */
  description: string;
  tone: 'neutral' | 'success' | 'attention' | 'danger';
  /** 0-100, the worse of the two remaining-room ratios. For a ring or a bar. */
  roomPercent: number;
}

const LABEL: Record<AccountHealth, { label: string; tone: AccountHealthView['tone'] }> = {
  // Factual, not congratulatory — §11. The budgets are whole; that is all this
  // says, and it is all that is true.
  untested: { label: 'Risque intact', tone: 'neutral' },
  excellent: { label: 'Excellent', tone: 'success' },
  good: { label: 'Bon', tone: 'success' },
  watch: { label: 'À surveiller', tone: 'attention' },
  critical: { label: 'Critique', tone: 'danger' },
};

export interface DeriveAccountHealthParams {
  /** USD still available before today's daily loss limit locks the account. */
  dailyLossRemaining: string;
  /** Today's full daily loss budget. */
  dailyLossBudget: string;
  /** USD still available above the ratcheting maximum-loss floor. */
  maximumLossRemaining: string;
  /** nominal × maximum-loss rate — the total risk budget. */
  maximumLossBudget: string;
  /** A live rule violation outranks every ratio. */
  hasViolation?: boolean;
  /**
   * The account is finished — breached or closed.
   *
   * This outranks everything, including a full budget. A breached account can
   * genuinely still show 100 % of an untouched daily loss limit, because the
   * limit that ended it was the maximum loss and the daily one was never
   * approached. Reporting "Excellent" on a dead account is the most damaging
   * reassurance this panel could produce.
   */
  terminal?: boolean;
  /**
   * Whether this account has done anything yet.
   *
   * True once the account has either closed a trade or finalised a session —
   * i.e. once the budgets above have actually been exposed to a decision.
   * Defaults to `true` so existing callers keep their current reading and only
   * the surfaces that can answer the question opt into the stricter one.
   */
  hasMeaningfulActivity?: boolean;
}

function ratio(remaining: string, budget: string): number {
  const total = new Decimal(budget);
  if (total.lessThanOrEqualTo(0)) return 1;
  const value = new Decimal(remaining).dividedBy(total).toNumber();
  return Math.min(1, Math.max(0, value));
}

export function deriveAccountHealth(params: DeriveAccountHealthParams): AccountHealthView {
  const daily = ratio(params.dailyLossRemaining, params.dailyLossBudget);
  const maximum = ratio(params.maximumLossRemaining, params.maximumLossBudget);
  // The binding constraint, not the flattering one.
  const worst = Math.min(daily, maximum);
  const roomPercent = Math.round(worst * 100);

  const untested = params.hasMeaningfulActivity === false;

  const graded: AccountHealth =
    worst <= 0.15 ? 'critical' : worst <= 0.4 ? 'watch' : worst <= 0.7 ? 'good' : 'excellent';

  /*
   * Order matters. A terminal account or a live violation outranks everything,
   * including "nothing has happened yet" — an account can be breached on its
   * first trade, and that is emphatically meaningful activity.
   *
   * Below that, an untested account still reports a *real* consumed budget if
   * it somehow has one, so `graded` is only overridden while the reading would
   * be praise. A dormant account that has already lost half its daily budget is
   * "À surveiller", not "Risque intact".
   */
  const state: AccountHealth =
    params.terminal || params.hasViolation
      ? 'critical'
      : untested && (graded === 'excellent' || graded === 'good')
        ? 'untested'
        : graded;

  const binding = daily <= maximum ? 'daily' : 'maximum';

  return {
    state,
    // A finished account is not "Critique" — that word implies it can still be
    // saved. It is over.
    label: params.terminal ? 'Terminé' : LABEL[state].label,
    tone: LABEL[state].tone,
    // A finished account has no room, whatever the untouched budgets say.
    roomPercent: params.terminal ? 0 : roomPercent,
    description: params.terminal
      ? 'Ce compte est terminé. Aucune marge de risque ne s’applique plus.'
      : params.hasViolation
        ? 'Une règle a été enfreinte sur ce compte.'
        : state === 'untested'
          ? 'Vos budgets de risque sont entiers. Aucune limite n’a encore été approchée.'
          : binding === 'daily'
            ? `Il vous reste ${roomPercent} % de votre limite de perte quotidienne.`
            : `Il vous reste ${roomPercent} % de votre budget de perte maximale.`,
  };
}
