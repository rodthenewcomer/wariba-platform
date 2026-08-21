import { sql } from 'kysely';
import type { Db, DbExecutor } from './client';
import type { MarketBarOrigin, MarketBarVolumeSemantics } from './schema';

/**
 * WX3 — persistence for genuine provider history and for the record of what
 * history WariX actually holds.
 *
 * Separate from `market-bars.ts` on purpose. That file owns the realtime
 * observation path, whose write pattern is "one hot bar, coalesced, many times
 * a second". This one owns the backfill path, whose write pattern is "a
 * thousand immutable bars, once". They share a table and share nothing else,
 * and giving the second one its own upsert is what keeps a backfill from
 * clobbering the sequence watermarks the first one depends on.
 */

export interface ProviderMarketBar {
  sourceId: string;
  symbol: string;
  interval: string;
  startTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  origin: MarketBarOrigin;
  volume: string | null;
  volumeSemantics: MarketBarVolumeSemantics | null;
  fetchedAt: string;
}

export interface MarketBarCoverage {
  sourceId: string;
  symbol: string;
  interval: string;
  /** Epoch seconds of the oldest held bucket. */
  earliestBar: number;
  /** Epoch seconds of the newest held bucket. */
  latestBar: number;
  hasMoreOlder: boolean;
  providerExhaustedAt: string | null;
  lastBackfillAt: string;
}

/** How many bars are written per statement. Bounded so one backfill cannot build a multi-megabyte query. */
const UPSERT_CHUNK_SIZE = 500;

/**
 * Idempotent write for provider and derived bars.
 *
 * Two properties matter and both are enforced in SQL rather than in the
 * caller. A finalized bar is immutable, so re-running the same backfill writes
 * nothing; and the observation sequence columns are never touched, because a
 * provider bar has no WariX sequence and writing its `null` over a real
 * watermark would let a restart regress the canonical sequence.
 */
export async function upsertProviderMarketBars(
  db: DbExecutor,
  bars: readonly ProviderMarketBar[],
): Promise<number> {
  if (bars.length === 0) return 0;
  let written = 0;
  for (let offset = 0; offset < bars.length; offset += UPSERT_CHUNK_SIZE) {
    const chunk = bars.slice(offset, offset + UPSERT_CHUNK_SIZE);
    const result = await db
      .insertInto('app.market_bars')
      .values(
        chunk.map((bar) => ({
          source_id: bar.sourceId,
          symbol: bar.symbol,
          interval: bar.interval,
          open_time: new Date(bar.startTime * 1000),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          is_final: true,
          first_observed_sequence: null,
          observed_through_sequence: null,
          observed_at: bar.fetchedAt,
          origin: bar.origin,
          volume: bar.volume,
          volume_semantics: bar.volumeSemantics,
        })),
      )
      .onConflict((conflict) =>
        conflict
          .columns(['source_id', 'symbol', 'interval', 'open_time'])
          .doUpdateSet({
            open: (eb) => eb.ref('excluded.open'),
            high: (eb) => eb.ref('excluded.high'),
            low: (eb) => eb.ref('excluded.low'),
            close: (eb) => eb.ref('excluded.close'),
            is_final: true,
            origin: (eb) => eb.ref('excluded.origin'),
            volume: (eb) => eb.ref('excluded.volume'),
            volume_semantics: (eb) => eb.ref('excluded.volume_semantics'),
            observed_at: (eb) => eb.ref('excluded.observed_at'),
            updated_at: new Date(),
          })
          // Only an unfinalized bar may be replaced by provider truth. A bar
          // already final — whether observed or previously backfilled — is
          // never rewritten, which is what makes a repeated backfill a no-op.
          .where(sql<boolean>`not app.market_bars.is_final`),
      )
      .executeTakeFirst();
    written += Number(result.numInsertedOrUpdatedRows ?? 0n);
  }
  return written;
}

export async function loadMarketBarCoverage(
  db: DbExecutor,
  key: { sourceId: string; symbol: string; interval: string },
): Promise<MarketBarCoverage | null> {
  const row = await db
    .selectFrom('app.market_bar_coverage')
    .selectAll()
    .where('source_id', '=', key.sourceId)
    .where('symbol', '=', key.symbol)
    .where('interval', '=', key.interval)
    .executeTakeFirst();
  if (row === undefined) return null;
  return {
    sourceId: row.source_id,
    symbol: row.symbol,
    interval: row.interval,
    earliestBar: Math.floor(row.earliest_bar.getTime() / 1000),
    latestBar: Math.floor(row.latest_bar.getTime() / 1000),
    hasMoreOlder: row.has_more_older,
    providerExhaustedAt: row.provider_exhausted_at?.toISOString() ?? null,
    lastBackfillAt: row.last_backfill_at.toISOString(),
  };
}

/**
 * Widens the recorded coverage window and records provider exhaustion.
 *
 * Widening only — `least`/`greatest` rather than assignment — because two
 * concurrent backfills legitimately extend opposite ends of the same range,
 * and a last-writer-wins update would silently discard one of them.
 */
export async function saveMarketBarCoverage(
  db: DbExecutor,
  coverage: {
    sourceId: string;
    symbol: string;
    interval: string;
    earliestBar: number;
    latestBar: number;
    hasMoreOlder: boolean;
  },
): Promise<void> {
  const earliest = new Date(coverage.earliestBar * 1000);
  const latest = new Date(coverage.latestBar * 1000);
  const exhaustedAt = coverage.hasMoreOlder ? null : new Date();
  await db
    .insertInto('app.market_bar_coverage')
    .values({
      source_id: coverage.sourceId,
      symbol: coverage.symbol,
      interval: coverage.interval,
      earliest_bar: earliest,
      latest_bar: latest,
      has_more_older: coverage.hasMoreOlder,
      provider_exhausted_at: exhaustedAt,
      last_backfill_at: new Date(),
      updated_at: new Date(),
    })
    .onConflict((conflict) =>
      conflict.columns(['source_id', 'symbol', 'interval']).doUpdateSet({
        earliest_bar: sql<Date>`least(app.market_bar_coverage.earliest_bar, excluded.earliest_bar)`,
        latest_bar: sql<Date>`greatest(app.market_bar_coverage.latest_bar, excluded.latest_bar)`,
        // Exhaustion is sticky in one direction only: once the provider has
        // said "nothing older", re-confirming it costs a credit and cannot
        // change. It is cleared only by a source identity change, which
        // creates a different row entirely.
        has_more_older: sql<boolean>`app.market_bar_coverage.has_more_older and excluded.has_more_older`,
        provider_exhausted_at: sql<Date | null>`
            coalesce(app.market_bar_coverage.provider_exhausted_at, excluded.provider_exhausted_at)
          `,
        last_backfill_at: new Date(),
        updated_at: new Date(),
      }),
    )
    .execute();
}

/** Oldest and newest bucket a source genuinely holds, for a cold coverage rebuild. */
export async function loadMarketBarBounds(
  db: DbExecutor,
  key: { sourceId: string; symbol: string; interval: string },
): Promise<{ earliest: number; latest: number; bars: number } | null> {
  const row = await db
    .selectFrom('app.market_bars')
    .select((expression) => [
      expression.fn.min('open_time').as('earliest'),
      expression.fn.max('open_time').as('latest'),
      expression.fn.countAll().as('bars'),
    ])
    .where('source_id', '=', key.sourceId)
    .where('symbol', '=', key.symbol)
    .where('interval', '=', key.interval)
    .where('is_final', '=', true)
    .executeTakeFirst();
  if (row === undefined || row.earliest === null || row.latest === null) return null;
  return {
    earliest: Math.floor(new Date(row.earliest).getTime() / 1000),
    latest: Math.floor(new Date(row.latest).getTime() / 1000),
    bars: Number(row.bars),
  };
}

/**
 * Runs `work` while holding a PostgreSQL transaction-scoped advisory lock, or
 * returns `null` immediately if another connection already holds it.
 *
 * This is WX3's whole concurrency-control story (§15) and it is deliberately
 * the smallest one that works: twenty browsers opening EURUSD 5m at once
 * produce one provider backfill and nineteen immediate `null`s, which the
 * caller answers from cache. No queue, no Redis, no distributed lock service —
 * the database every one of those requests already talks to is enough.
 *
 * Transaction-scoped (`_xact_`) so the lock cannot outlive a crashed backfill.
 */
export async function withMarketHistoryBackfillLock<T>(
  db: Db,
  key: { sourceId: string; symbol: string; interval: string },
  work: (trx: DbExecutor) => Promise<T>,
): Promise<T | null> {
  const lockKey = `wx3:backfill:${key.sourceId}:${key.symbol}:${key.interval}`;
  return db.transaction().execute(async (trx) => {
    const locked = await sql<{ acquired: boolean }>`
      select pg_try_advisory_xact_lock(hashtextextended(${lockKey}, 0)) as acquired
    `.execute(trx);
    if (locked.rows[0]?.acquired !== true) return null;
    return work(trx);
  });
}
