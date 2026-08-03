/**
 * WebSocket channel names — System Architecture §59. Versioned channels are
 * plain string names; the envelope itself carries the version (see envelope.ts).
 */

export const TRADABLE_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100'] as const;
export type TradableSymbol = (typeof TRADABLE_SYMBOLS)[number];

export function marketSymbolChannel(symbol: TradableSymbol): string {
  return `market.symbol.${symbol}`;
}

export function accountStateChannel(accountId: string): string {
  return `account.${accountId}.state`;
}

export function accountOrdersChannel(accountId: string): string {
  return `account.${accountId}.orders`;
}

export function accountPositionsChannel(accountId: string): string {
  return `account.${accountId}.positions`;
}

export function userNotificationsChannel(userId: string): string {
  return `user.${userId}.notifications`;
}
