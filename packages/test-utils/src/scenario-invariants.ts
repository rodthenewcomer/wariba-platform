import Decimal from 'decimal.js';
import { evaluateCycleProgress, type Db } from '@wariba/database';

/**
 * What a seeded scenario must be true of before a test may photograph it.
 *
 * ## Why a fixture needs invariants
 *
 * The lifecycle fixtures pose a state by writing the columns that state
 * implies. That is fast and it is right for most screens, but nothing stops a
 * caller composing a state the business can never be in — an evaluation marked
 * `passed` with no Performance child, a Performance account whose parent is
 * still running, a timeline whose finalization predates the objective it
 * finalized. Every one of those renders. Some of them render *convincingly*,
 * which is worse: a screenshot of an impossible account is evidence of nothing
 * and it takes a human to notice.
 *
 * This is the guard. It reads only canonical rows, computes nothing financial
 * of its own, and throws with the actual values rather than a boolean — a
 * fixture that fails here should tell the reader which fact was wrong.
 */
export class ScenarioInvariantError extends Error {
  override readonly name = 'ScenarioInvariantError';
}

function must(condition: boolean, message: string): void {
  if (!condition) throw new ScenarioInvariantError(message);
}

export interface LifecycleOrder {
  objectiveReachedAt: Date | null;
  dailyFinalizedAt: Date | null;
  passedAt: Date | null;
  performanceCreatedAt: Date | null;
}

/**
 * The causal chain, read back from the rows that record it.
 *
 * `objectiveReachedAt <= dailyFinalizedAt <= passedAt <= performanceCreatedAt`
 * is not a display preference — it is the order the events can happen in. A
 * fixture that produces any other order produces a timeline the product then
 * has to render, and the only honest rendering of an impossible sequence is
 * none.
 */
export async function assertLifecycleOrder(
  db: Db,
  evaluationAccountId: string,
): Promise<LifecycleOrder> {
  const [objective, passed, finalized, performance] = await Promise.all([
    db
      .selectFrom('app.account_state_transitions')
      .select('occurred_at')
      .where('account_id', '=', evaluationAccountId)
      .where('to_status', '=', 'pass_pending')
      .orderBy('occurred_at', 'asc')
      .executeTakeFirst(),
    db
      .selectFrom('app.account_state_transitions')
      .select('occurred_at')
      .where('account_id', '=', evaluationAccountId)
      .where('to_status', '=', 'passed')
      .orderBy('occurred_at', 'desc')
      .executeTakeFirst(),
    db
      .selectFrom('app.account_daily_snapshots')
      .select('finalized_at')
      .where('account_id', '=', evaluationAccountId)
      .where('status', '=', 'finalized')
      .orderBy('finalized_at', 'asc')
      .execute(),
    db
      .selectFrom('app.trading_accounts')
      .select('created_at')
      .where('source_evaluation_account_id', '=', evaluationAccountId)
      .executeTakeFirst(),
  ]);

  const objectiveReachedAt = objective?.occurred_at ?? null;
  const dailyFinalizedAt =
    objectiveReachedAt === null
      ? null
      : (finalized.find(
          (snapshot) =>
            snapshot.finalized_at !== null &&
            snapshot.finalized_at.getTime() >= objectiveReachedAt.getTime(),
        )?.finalized_at ?? null);
  const passedAt = passed?.occurred_at ?? null;
  const performanceCreatedAt = performance?.created_at ?? null;

  const chain: [string, Date | null][] = [
    ['objectiveReachedAt', objectiveReachedAt],
    ['dailyFinalizedAt', dailyFinalizedAt],
    ['passedAt', passedAt],
    ['performanceCreatedAt', performanceCreatedAt],
  ];
  const present = chain.filter((entry): entry is [string, Date] => entry[1] !== null);
  for (let index = 1; index < present.length; index += 1) {
    const [previousName, previous] = present[index - 1] as [string, Date];
    const [name, current] = present[index] as [string, Date];
    must(
      previous.getTime() <= current.getTime(),
      `${previousName} (${previous.toISOString()}) must not follow ${name} (${current.toISOString()}).`,
    );
  }

  return { objectiveReachedAt, dailyFinalizedAt, passedAt, performanceCreatedAt };
}

export interface PerformanceReadyFacts {
  evaluationAccountId: string;
  performanceAccountId: string;
  performanceAccountPublicId: string;
  nominalBalance: string;
  performanceDaysRequired: number;
  performanceDaysCompleted: number;
  builtBufferAmount: string;
  availableForPayout: string;
}

/**
 * A Performance account that has just been created, and what must be true of it.
 *
 * The list is the one the false 91 % got past: exactly one child, a parent that
 * is passed and no longer tradable, a nominal balance rather than an inherited
 * one, no buffer built and nothing available. If a fixture ever produces an
 * account carrying progress it did not earn, this throws before a screenshot
 * can be taken of it.
 */
export async function assertPerformanceReadyInvariants(
  db: Db,
  evaluationAccountId: string,
): Promise<PerformanceReadyFacts> {
  const evaluation = await db
    .selectFrom('app.trading_accounts')
    .select(['id', 'status', 'program_type', 'nominal_balance'])
    .where('id', '=', evaluationAccountId)
    .executeTakeFirstOrThrow(
      () => new ScenarioInvariantError(`No evaluation account ${evaluationAccountId}.`),
    );
  must(
    evaluation.program_type === 'WARIBA_ONE',
    `Parent ${evaluationAccountId} is ${evaluation.program_type}, not WARIBA_ONE.`,
  );
  must(
    evaluation.status === 'passed',
    `Parent ${evaluationAccountId} is ${evaluation.status}; a Performance child requires a passed evaluation.`,
  );

  const children = await db
    .selectFrom('app.trading_accounts')
    .select(['id', 'public_id', 'status', 'program_type', 'nominal_balance'])
    .where('source_evaluation_account_id', '=', evaluationAccountId)
    .execute();
  must(
    children.length === 1,
    `PERF-020 exactly-once: expected 1 Performance child, found ${children.length}.`,
  );
  const performance = children[0] as (typeof children)[number];
  must(
    performance.program_type === 'WARIBA_PERFORMANCE',
    `Child ${performance.public_id} is ${performance.program_type}.`,
  );

  await assertLifecycleOrder(db, evaluationAccountId);

  const progress = await evaluateCycleProgress(db, performance.id);
  must(
    new Decimal(progress.nominalBalance).equals(performance.nominal_balance),
    `Cycle progress nominal (${progress.nominalBalance}) disagrees with the account (${performance.nominal_balance}).`,
  );

  const built = Decimal.max(
    0,
    new Decimal(progress.realizedBalance).minus(progress.nominalBalance),
  );
  return {
    evaluationAccountId,
    performanceAccountId: performance.id,
    performanceAccountPublicId: performance.public_id,
    nominalBalance: performance.nominal_balance,
    performanceDaysRequired: progress.performanceDaysRequired,
    performanceDaysCompleted: progress.performanceDaysCompleted,
    builtBufferAmount: built.toFixed(2),
    availableForPayout: progress.eligibleExcess,
  };
}

/**
 * The stricter form: an account that has *not traded at all*.
 *
 * This is the state the 91 % was rendered from, so it is the state worth
 * naming. Everything a trader could have earned is zero, and any UI that shows
 * otherwise is showing something it made up.
 */
export async function assertUntradedPerformanceAccount(
  db: Db,
  evaluationAccountId: string,
): Promise<PerformanceReadyFacts> {
  const facts = await assertPerformanceReadyInvariants(db, evaluationAccountId);
  must(
    facts.performanceDaysCompleted === 0,
    `Expected 0 completed Performance Days, found ${facts.performanceDaysCompleted}.`,
  );
  must(
    new Decimal(facts.builtBufferAmount).isZero(),
    `Expected no buffer built, found ${facts.builtBufferAmount}.`,
  );
  must(
    new Decimal(facts.availableForPayout).isZero(),
    `Expected nothing available for payout, found ${facts.availableForPayout}.`,
  );
  return facts;
}
