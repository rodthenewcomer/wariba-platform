import { beforeEach, describe, expect, it } from 'vitest';
import type { TradableSymbol } from '@wariba/contracts';
import {
  CHART_VIEWPORT_STORAGE_KEY,
  readChartViewport,
  writeChartViewport,
} from '../app/(trade)/trade/chart-viewport-preferences';

const EURUSD = 'EURUSD' as TradableSymbol;
const XAUUSD = 'XAUUSD' as TradableSymbol;

describe('WX2 chart viewport preferences', () => {
  beforeEach(() => window.localStorage.clear());

  it('restores the exact viewport and selected range preset', () => {
    writeChartViewport(window.localStorage, 'acc-1', EURUSD, '5m', {
      from: 1_700_000_000,
      to: 1_700_086_400,
      presetSeconds: 86_400,
    });

    expect(readChartViewport(window.localStorage, 'acc-1', EURUSD, '5m')).toEqual({
      from: 1_700_000_000,
      to: 1_700_086_400,
      presetSeconds: 86_400,
    });
  });

  it('isolates viewports by account, symbol and timeframe', () => {
    writeChartViewport(window.localStorage, 'acc-1', EURUSD, '1m', {
      from: 60,
      to: 600,
      presetSeconds: null,
    });

    expect(readChartViewport(window.localStorage, 'acc-2', EURUSD, '1m')).toBeNull();
    expect(readChartViewport(window.localStorage, 'acc-1', XAUUSD, '1m')).toBeNull();
    expect(readChartViewport(window.localStorage, 'acc-1', EURUSD, '3m')).toBeNull();
  });

  it('fails closed for corrupt, foreign-version and invalid ranges', () => {
    window.localStorage.setItem(CHART_VIEWPORT_STORAGE_KEY, 'not-json');
    expect(readChartViewport(window.localStorage, 'acc-1', EURUSD, '1m')).toBeNull();

    window.localStorage.setItem(
      CHART_VIEWPORT_STORAGE_KEY,
      JSON.stringify({
        version: 99,
        accounts: { 'acc-1': { 'EURUSD:1m': { from: 60, to: 600, presetSeconds: null } } },
      }),
    );
    expect(readChartViewport(window.localStorage, 'acc-1', EURUSD, '1m')).toBeNull();

    writeChartViewport(window.localStorage, 'acc-1', EURUSD, '1m', {
      from: 600,
      to: 60,
      presetSeconds: null,
    });
    expect(readChartViewport(window.localStorage, 'acc-1', EURUSD, '1m')).toBeNull();
  });

  it('stores viewport state only, never financial or execution state', () => {
    writeChartViewport(window.localStorage, 'acc-1', EURUSD, '1D', {
      from: 1_700_000_000,
      to: 1_700_086_400,
      presetSeconds: 86_400,
    });

    const raw = window.localStorage.getItem(CHART_VIEWPORT_STORAGE_KEY) ?? '';
    expect(raw).toContain('presetSeconds');
    expect(raw).not.toMatch(/balance|equity|order|position|pnl/i);
  });
});
