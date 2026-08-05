import type { Db } from './client';
import type { TradableSymbol } from './schema';

/**
 * Shared account/symbol loaders — extracted out of trading.ts so that both
 * trading.ts and risk.ts can depend on them without risk.ts having to import
 * trading.ts (which itself will call into risk.ts on every fill), which
 * would create a circular import.
 */

export interface MarketSnapshot {
  bid: string;
  ask: string;
  timestamp: string;
  sequence: string;
}

/**
 * Locks the account row for the duration of the transaction (TRD-012: one
 * financial command per account is serialized), reloads it under that lock,
 * and returns the freshly-read row. Every trading write function calls this
 * first — Engineering Constitution §37/§73: lock -> reload -> validate ->
 * execute -> ledger/position -> outbox -> commit, and the market snapshot
 * (bid/ask) must already have been fetched by the caller *before* this
 * transaction opens, never inside it.
 */
export async function lockAccount(trx: Db, accountId: string) {
  return trx
    .selectFrom('app.trading_accounts')
    .selectAll()
    .where('id', '=', accountId)
    .forUpdate()
    .executeTakeFirstOrThrow();
}

export type LockedAccount = Awaited<ReturnType<typeof lockAccount>>;

export async function loadSymbolSpec(trx: Db, symbolSpecSetId: string, symbol: TradableSymbol) {
  return trx
    .selectFrom('app.symbol_specs')
    .selectAll()
    .where('symbol_spec_set_id', '=', symbolSpecSetId)
    .where('symbol', '=', symbol)
    .executeTakeFirst();
}
