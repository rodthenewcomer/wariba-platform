import type { CandleTimeframe, TradableSymbol } from '@wariba/contracts';

export const CHART_VIEWPORT_STORAGE_KEY = 'wariba.warix.chart.viewport';
const VERSION = 1;
const MAX_ACCOUNTS = 16;
const MAX_VIEWPORTS_PER_ACCOUNT = 128;

export interface PersistedChartViewport {
  from: number;
  to: number;
  presetSeconds: number | null;
}

interface StoredPayload {
  version: number;
  accounts: Record<string, Record<string, PersistedChartViewport>>;
}

function viewportKey(symbol: TradableSymbol, timeframe: CandleTimeframe): string {
  return `${symbol}:${timeframe}`;
}

function validViewport(value: unknown): value is PersistedChartViewport {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PersistedChartViewport>;
  return (
    typeof candidate.from === 'number' &&
    Number.isFinite(candidate.from) &&
    candidate.from >= 0 &&
    typeof candidate.to === 'number' &&
    Number.isFinite(candidate.to) &&
    candidate.to > candidate.from &&
    (candidate.presetSeconds === null ||
      (typeof candidate.presetSeconds === 'number' &&
        Number.isFinite(candidate.presetSeconds) &&
        candidate.presetSeconds > 0))
  );
}

function parsePayload(raw: string | null): StoredPayload {
  if (!raw) return { version: VERSION, accounts: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { version: VERSION, accounts: {} };
    }
    const candidate = parsed as Partial<StoredPayload>;
    if (candidate.version !== VERSION || typeof candidate.accounts !== 'object') {
      return { version: VERSION, accounts: {} };
    }
    return { version: VERSION, accounts: candidate.accounts ?? {} };
  } catch {
    return { version: VERSION, accounts: {} };
  }
}

export function readChartViewport(
  storage: Pick<Storage, 'getItem'>,
  accountId: string,
  symbol: TradableSymbol,
  timeframe: CandleTimeframe,
): PersistedChartViewport | null {
  const payload = parsePayload(storage.getItem(CHART_VIEWPORT_STORAGE_KEY));
  const value = payload.accounts[accountId]?.[viewportKey(symbol, timeframe)];
  return validViewport(value) ? value : null;
}

export function writeChartViewport(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  accountId: string,
  symbol: TradableSymbol,
  timeframe: CandleTimeframe,
  viewport: PersistedChartViewport,
): void {
  if (!validViewport(viewport)) return;
  const payload = parsePayload(storage.getItem(CHART_VIEWPORT_STORAGE_KEY));
  const accountEntries = {
    ...(payload.accounts[accountId] ?? {}),
    [viewportKey(symbol, timeframe)]: viewport,
  };
  const boundedEntries = Object.fromEntries(
    Object.entries(accountEntries).slice(-MAX_VIEWPORTS_PER_ACCOUNT),
  );
  const accounts = {
    ...payload.accounts,
    [accountId]: boundedEntries,
  };
  const boundedAccounts = Object.fromEntries(Object.entries(accounts).slice(-MAX_ACCOUNTS));
  storage.setItem(
    CHART_VIEWPORT_STORAGE_KEY,
    JSON.stringify({ version: VERSION, accounts: boundedAccounts }),
  );
}
