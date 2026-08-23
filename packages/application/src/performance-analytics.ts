import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';

/**
 * What a trader's record actually says.
 *
 * Every figure here is computed from `app.fills` — real executions with real
 * prices — and from `app.account_daily_snapshots`, which the daily job
 * finalises. Nothing is sampled, seeded, smoothed or estimated. A metric with
 * no data behind it comes back `null` and the surface renders an empty state,
 * because a win rate invented for an account with no trades is the single most
 * corrosive thing a trading product can display.
 *
 * ## Which fills count
 *
 * Only `fill_type = 'close'`. An opening fill has no realised result yet, so
 * counting it would double every trade and halve every win rate. `realized_pnl`
 * is the gross result of the close; `net_realized_pnl` is after commission and
 * short-duration ineligibility, and is what the trader is actually judged on —
 * so it is what these figures use wherever it exists.
 */

export interface PerformanceKpis {
  /** Closed trades in the window. Everything below is `null` when this is 0. */
  tradeCount: number;
  netPnl: string;
  netPnlFormatted: string;
  /** 0-100, rounded. `null` with no closed trades. */
  winRatePercent: number | null;
  wins: number;
  losses: number;
  /** Gross profit ÷ gross loss. `null` when there is no loss to divide by. */
  profitFactor: number | null;
  averageWin: string | null;
  averageLoss: string | null;
  /** Average win ÷ average loss, the R-multiple traders think in. */
  winLossRatio: number | null;
  /** Per-trade expectancy, derivable only from a complete win/loss picture. */
  expectancy: string | null;
  bestDay: DailyResult | null;
  worstDay: DailyResult | null;
  tradingDays: number;
  /** Milliseconds. `null` when no close fill carried a duration. */
  averageDurationMs: number | null;
  /** Consecutive wins (positive) or losses (negative) at the end of the window. */
  currentStreak: number;
}

export interface DailyResult {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  netPnl: string;
  netPnlFormatted: string;
  tradeCount: number;
}

export interface SymbolResult {
  symbol: string;
  netPnl: string;
  netPnlFormatted: string;
  tradeCount: number;
  winRatePercent: number;
}

export interface DurationBucket {
  /** Already French and already short — "0-5 min". */
  label: string;
  wins: number;
  losses: number;
}

export interface PerformanceAnalytics {
  kpis: PerformanceKpis;
  daily: DailyResult[];
  bySymbol: SymbolResult[];
  byDuration: DurationBucket[];
  /** True when there is genuinely nothing to show, so callers can skip layout. */
  empty: boolean;
}

export interface BuildPerformanceAnalyticsParams {
  accountId: string;
  /** Inclusive. Omit for the account's whole history. */
  from?: Date;
  /** Exclusive. */
  to?: Date;
}

function formatUsd(amount: Decimal | string): string {
  const value = new Decimal(amount);
  const sign = value.greaterThan(0) ? '+' : '';
  return `${sign}${value.toDecimalPlaces(2).toNumber().toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

/**
 * Buckets chosen to separate the behaviours a prop trader is actually judged
 * on: scalps that the short-duration rule can disqualify, ordinary intraday
 * trades, and positions held long enough to be a different strategy.
 */
const DURATION_BUCKETS: readonly { label: string; maxMs: number }[] = [
  { label: '0-1 min', maxMs: 60_000 },
  { label: '1-5 min', maxMs: 300_000 },
  { label: '5-30 min', maxMs: 1_800_000 },
  { label: '30 min-2 h', maxMs: 7_200_000 },
  { label: '2 h+', maxMs: Number.POSITIVE_INFINITY },
];

export async function buildPerformanceAnalytics(
  db: Db,
  params: BuildPerformanceAnalyticsParams,
): Promise<PerformanceAnalytics> {
  let query = db
    .selectFrom('app.fills')
    .select([
      'symbol',
      'realized_pnl',
      'net_realized_pnl',
      'duration_ms',
      'occurred_at',
      'commission',
    ])
    .where('account_id', '=', params.accountId)
    // Close fills only — see the note above on double counting.
    .where('fill_type', '=', 'close')
    .orderBy('occurred_at', 'asc');

  if (params.from) query = query.where('occurred_at', '>=', params.from);
  if (params.to) query = query.where('occurred_at', '<', params.to);

  const fills = await query.execute();

  if (fills.length === 0) {
    return {
      kpis: emptyKpis(),
      daily: [],
      bySymbol: [],
      byDuration: [],
      empty: true,
    };
  }

  const results = fills.map((fill) => ({
    symbol: fill.symbol as string,
    // `net_realized_pnl` is what the trader is judged on. It is null on rows
    // written before the eligibility work landed, so the gross figure is the
    // documented fallback rather than a silent zero.
    pnl: new Decimal(fill.net_realized_pnl ?? fill.realized_pnl),
    durationMs: fill.duration_ms === null ? null : Number.parseInt(fill.duration_ms, 10),
    occurredAt: fill.occurred_at,
  }));

  const wins = results.filter((result) => result.pnl.greaterThan(0));
  const losses = results.filter((result) => result.pnl.lessThan(0));

  const grossProfit = wins.reduce((sum, result) => sum.plus(result.pnl), new Decimal(0));
  const grossLoss = losses.reduce((sum, result) => sum.plus(result.pnl.abs()), new Decimal(0));
  const netPnl = results.reduce((sum, result) => sum.plus(result.pnl), new Decimal(0));

  const averageWin = wins.length > 0 ? grossProfit.dividedBy(wins.length) : null;
  const averageLoss = losses.length > 0 ? grossLoss.dividedBy(losses.length) : null;

  const daily = groupByDay(results);
  const sortedDays = [...daily].sort((a, b) =>
    new Decimal(a.netPnl).comparedTo(new Decimal(b.netPnl)),
  );

  const durations = results
    .map((result) => result.durationMs)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  return {
    kpis: {
      tradeCount: results.length,
      netPnl: netPnl.toFixed(2),
      netPnlFormatted: formatUsd(netPnl),
      winRatePercent: Math.round((wins.length / results.length) * 100),
      wins: wins.length,
      losses: losses.length,
      // Undefined rather than infinite when nothing was lost: a trader with no
      // losing trade has no profit factor, and rendering "∞" reads as a bug.
      profitFactor: grossLoss.isZero() ? null : Number(grossProfit.dividedBy(grossLoss).toFixed(2)),
      averageWin: averageWin ? averageWin.toFixed(2) : null,
      averageLoss: averageLoss ? averageLoss.negated().toFixed(2) : null,
      winLossRatio:
        averageWin && averageLoss && !averageLoss.isZero()
          ? Number(averageWin.dividedBy(averageLoss).toFixed(2))
          : null,
      expectancy:
        averageWin && averageLoss
          ? new Decimal(wins.length / results.length)
              .times(averageWin)
              .minus(new Decimal(losses.length / results.length).times(averageLoss))
              .toFixed(2)
          : null,
      bestDay: sortedDays.at(-1) ?? null,
      worstDay: sortedDays[0] ?? null,
      tradingDays: daily.length,
      averageDurationMs:
        durations.length > 0
          ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
          : null,
      currentStreak: computeStreak(results.map((result) => result.pnl)),
    },
    daily,
    bySymbol: groupBySymbol(results),
    byDuration: groupByDuration(results),
    empty: false,
  };
}

interface TradeResult {
  symbol: string;
  pnl: Decimal;
  durationMs: number | null;
  occurredAt: Date;
}

function emptyKpis(): PerformanceKpis {
  return {
    tradeCount: 0,
    netPnl: '0.00',
    netPnlFormatted: formatUsd('0'),
    winRatePercent: null,
    wins: 0,
    losses: 0,
    profitFactor: null,
    averageWin: null,
    averageLoss: null,
    winLossRatio: null,
    expectancy: null,
    bestDay: null,
    worstDay: null,
    tradingDays: 0,
    averageDurationMs: null,
    currentStreak: 0,
  };
}

/**
 * UTC days, matching how `account_daily_snapshots` partitions a trading day.
 * Grouping by the viewer's local calendar would put the same trade on
 * different days for two people looking at the same account.
 */
function groupByDay(results: readonly TradeResult[]): DailyResult[] {
  const byDate = new Map<string, { pnl: Decimal; count: number }>();
  for (const result of results) {
    const date = result.occurredAt.toISOString().slice(0, 10);
    const entry = byDate.get(date) ?? { pnl: new Decimal(0), count: 0 };
    byDate.set(date, { pnl: entry.pnl.plus(result.pnl), count: entry.count + 1 });
  }
  return [...byDate.entries()]
    .map(([date, entry]) => ({
      date,
      netPnl: entry.pnl.toFixed(2),
      netPnlFormatted: formatUsd(entry.pnl),
      tradeCount: entry.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function groupBySymbol(results: readonly TradeResult[]): SymbolResult[] {
  const bySymbol = new Map<string, { pnl: Decimal; count: number; wins: number }>();
  for (const result of results) {
    const entry = bySymbol.get(result.symbol) ?? { pnl: new Decimal(0), count: 0, wins: 0 };
    bySymbol.set(result.symbol, {
      pnl: entry.pnl.plus(result.pnl),
      count: entry.count + 1,
      wins: entry.wins + (result.pnl.greaterThan(0) ? 1 : 0),
    });
  }
  return [...bySymbol.entries()]
    .map(([symbol, entry]) => ({
      symbol,
      netPnl: entry.pnl.toFixed(2),
      netPnlFormatted: formatUsd(entry.pnl),
      tradeCount: entry.count,
      winRatePercent: Math.round((entry.wins / entry.count) * 100),
    }))
    .sort((a, b) => new Decimal(b.netPnl).comparedTo(new Decimal(a.netPnl)));
}

function groupByDuration(results: readonly TradeResult[]): DurationBucket[] {
  const buckets = DURATION_BUCKETS.map((bucket) => ({ label: bucket.label, wins: 0, losses: 0 }));
  for (const result of results) {
    if (result.durationMs === null) continue;
    const index = DURATION_BUCKETS.findIndex((bucket) => result.durationMs! < bucket.maxMs);
    const bucket = buckets[index === -1 ? buckets.length - 1 : index];
    if (!bucket) continue;
    if (result.pnl.greaterThan(0)) bucket.wins += 1;
    else bucket.losses += 1;
  }
  // Empty buckets are dropped rather than drawn as zero-height bars: a chart
  // of five categories where three never occurred is mostly whitespace
  // pretending to be information.
  return buckets.filter((bucket) => bucket.wins + bucket.losses > 0);
}

/**
 * Positive for a winning streak, negative for a losing one, 0 with no trades.
 * Break-even trades end a streak rather than extending it — they are neither.
 */
function computeStreak(pnls: readonly Decimal[]): number {
  let streak = 0;
  for (let index = pnls.length - 1; index >= 0; index -= 1) {
    const pnl = pnls[index];
    if (!pnl || pnl.isZero()) break;
    const winning = pnl.greaterThan(0);
    if (streak === 0) streak = winning ? 1 : -1;
    else if (winning && streak > 0) streak += 1;
    else if (!winning && streak < 0) streak -= 1;
    else break;
  }
  return streak;
}
