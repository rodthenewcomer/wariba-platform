import { sql } from 'kysely';
import type { DbExecutor } from './client';

export interface MarketDataSourceRecord {
  id: string;
  provider: string;
  environment: string;
  mode: 'sandbox' | 'replay' | 'live';
  version: string;
  capabilities: unknown;
}

export interface PersistedMarketBar {
  sourceId: string;
  symbol: string;
  interval: string;
  startTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  isFinal: boolean;
  firstObservedSequence: number | null;
  observedThroughSequence: number | null;
  observedAt: string;
}

export interface MarketBarPage {
  bars: PersistedMarketBar[];
  hasMore: boolean;
}

export async function registerMarketDataSource(
  db: DbExecutor,
  source: MarketDataSourceRecord,
): Promise<void> {
  await db
    .insertInto('app.market_data_sources')
    .values({
      id: source.id,
      provider: source.provider,
      environment: source.environment,
      mode: source.mode,
      source_version: source.version,
      capabilities: JSON.stringify(source.capabilities),
    })
    .onConflict((conflict) =>
      conflict.column('id').doUpdateSet({
        provider: source.provider,
        environment: source.environment,
        mode: source.mode,
        source_version: source.version,
        capabilities: JSON.stringify(source.capabilities),
        last_seen_at: new Date(),
      }),
    )
    .execute();
}

export async function upsertMarketBars(
  db: DbExecutor,
  bars: readonly PersistedMarketBar[],
): Promise<void> {
  if (bars.length === 0) return;
  await db.transaction().execute(async (trx) => {
    for (const bar of bars) {
      await trx
        .insertInto('app.market_bars')
        .values({
          source_id: bar.sourceId,
          symbol: bar.symbol,
          interval: bar.interval,
          open_time: new Date(bar.startTime * 1000),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          is_final: bar.isFinal,
          first_observed_sequence: bar.firstObservedSequence,
          observed_through_sequence: bar.observedThroughSequence,
          observed_at: bar.observedAt,
        })
        .onConflict((conflict) =>
          conflict.columns(['source_id', 'symbol', 'interval', 'open_time']).doUpdateSet({
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            // A finalized candle is immutable. The admission gate orders
            // routine writes; this also protects against a stale retry racing
            // a newer flush at the database boundary.
            is_final: sql<boolean>`app.market_bars.is_final or excluded.is_final`,
            first_observed_sequence: sql<number | null>`
                case
                  when app.market_bars.first_observed_sequence is null then excluded.first_observed_sequence
                  when excluded.first_observed_sequence is null then app.market_bars.first_observed_sequence
                  else least(app.market_bars.first_observed_sequence, excluded.first_observed_sequence)
                end
              `,
            observed_through_sequence: bar.observedThroughSequence,
            observed_at: bar.observedAt,
            updated_at: new Date(),
          }).where(sql<boolean>`
              not app.market_bars.is_final
              and (
                app.market_bars.observed_through_sequence is null
                or excluded.observed_through_sequence is null
                or excluded.observed_through_sequence >= app.market_bars.observed_through_sequence
              )
            `),
        )
        .execute();
    }
  });
}

function toPersistedBar(row: {
  source_id: string;
  symbol: string;
  interval: string;
  open_time: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  is_final: boolean;
  first_observed_sequence: number | null;
  observed_through_sequence: number | null;
  observed_at: Date;
}): PersistedMarketBar {
  return {
    sourceId: row.source_id,
    symbol: row.symbol,
    interval: row.interval,
    startTime: Math.floor(row.open_time.getTime() / 1000),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    isFinal: row.is_final,
    firstObservedSequence:
      row.first_observed_sequence === null ? null : Number(row.first_observed_sequence),
    observedThroughSequence:
      row.observed_through_sequence === null ? null : Number(row.observed_through_sequence),
    observedAt: row.observed_at.toISOString(),
  };
}

export async function loadMarketBarPage(
  db: DbExecutor,
  query: {
    sourceId: string;
    symbol: string;
    interval: string;
    limit: number;
    before?: number;
    /**
     * WX3.1 — restrict to the default visible series: regular-session bars of
     * the instrument's own history. The excluded rows stay in the table with
     * their provenance; this is a display decision, not a deletion.
     */
    visibleOnly?: boolean;
  },
): Promise<MarketBarPage> {
  let selection = db
    .selectFrom('app.market_bars')
    .selectAll()
    .where('source_id', '=', query.sourceId)
    .where('symbol', '=', query.symbol)
    .where('interval', '=', query.interval)
    .where('is_final', '=', true);
  if (query.visibleOnly === true) {
    selection = selection
      .where('session_state', '=', 'regular')
      .where('history_provenance', '=', 'instrument');
  }
  if (query.before !== undefined) {
    selection = selection.where('open_time', '<', new Date(query.before * 1000));
  }
  const rows = await selection
    .orderBy('open_time', 'desc')
    .limit(query.limit + 1)
    .execute();
  const hasMore = rows.length > query.limit;
  return {
    bars: rows.slice(0, query.limit).reverse().map(toPersistedBar),
    hasMore,
  };
}

export async function loadCurrentMarketBars(
  db: DbExecutor,
  sourceId: string,
): Promise<PersistedMarketBar[]> {
  const rows = await db
    .selectFrom('app.market_bars')
    .selectAll()
    .where('source_id', '=', sourceId)
    .where('is_final', '=', false)
    .execute();
  return rows.map(toPersistedBar);
}

/** Highest canonical WariX sequence persisted per symbol for one source. */
export async function loadMarketSourceSequenceWatermarks(
  db: DbExecutor,
  sourceId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .selectFrom('app.market_bars')
    .select((expression) => [
      'symbol',
      expression.fn.max('observed_through_sequence').as('observed_through_sequence'),
    ])
    .where('source_id', '=', sourceId)
    .where('observed_through_sequence', 'is not', null)
    .groupBy('symbol')
    .execute();
  return Object.fromEntries(
    rows.flatMap((row) => {
      const value = Number(row.observed_through_sequence);
      return Number.isSafeInteger(value) && value >= 0 ? [[row.symbol, value] as const] : [];
    }),
  );
}
