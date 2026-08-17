import { beforeEach, describe, expect, it } from 'vitest';
import { CANDLE_TIMEFRAMES, DEFAULT_CANDLE_TIMEFRAME } from '@wariba/contracts';
import {
  CHART_PREFERENCES_STORAGE_KEY,
  DEFAULT_CHART_PREFERENCES,
  mergeShippedChartIndicators,
  parseChartPreferences,
} from '../app/(trade)/trade/chart-preferences';
import { DEFAULT_CHART_INDICATORS } from '../app/(trade)/trade/chart-indicator-model';

/**
 * W5 §16/§40/§71/§79 — the chart's browser-local analysis preferences.
 *
 * These are UI-only. The properties worth proving are that a corrupted or
 * hand-edited payload can never produce an unsupported timeframe (which would
 * reach `timeframeSeconds` with no entry), and that nothing financial is
 * reachable through this key.
 */

function payload(accounts: Record<string, unknown>): string {
  return JSON.stringify({ version: 1, accounts });
}

describe('parseChartPreferences — W5 §16/§40', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns the shipped defaults for an absent, corrupt or foreign-version payload', () => {
    expect(parseChartPreferences(null, 'acc-1')).toEqual(DEFAULT_CHART_PREFERENCES);
    expect(parseChartPreferences('not json', 'acc-1')).toEqual(DEFAULT_CHART_PREFERENCES);
    expect(parseChartPreferences('[]', 'acc-1')).toEqual(DEFAULT_CHART_PREFERENCES);
    expect(
      parseChartPreferences(payload({}).replace('"version":1', '"version":9'), 'acc-1'),
    ).toEqual(DEFAULT_CHART_PREFERENCES);
  });

  it('defaults to 5s rather than whichever interval happens to sort first (§15)', () => {
    expect(DEFAULT_CHART_PREFERENCES.timeframe).toBe(DEFAULT_CANDLE_TIMEFRAME);
    expect(DEFAULT_CHART_PREFERENCES.timeframe).toBe('5s');
  });

  it('restores every supported timeframe', () => {
    for (const timeframe of CANDLE_TIMEFRAMES) {
      const stored = payload({ 'acc-1': { timeframe, indicators: [] } });
      expect(parseChartPreferences(stored, 'acc-1').timeframe).toBe(timeframe);
    }
  });

  it('falls back to the default for a timeframe this build no longer supports (§16)', () => {
    for (const unsupported of ['4h', '1D', '1000T', '', null, 60]) {
      const stored = payload({ 'acc-1': { timeframe: unsupported, indicators: [] } });
      expect(parseChartPreferences(stored, 'acc-1').timeframe).toBe(DEFAULT_CANDLE_TIMEFRAME);
    }
  });

  it('scopes preferences to the account (§79)', () => {
    const stored = payload({
      'acc-1': { timeframe: '3m', indicators: [] },
      'acc-2': { timeframe: '15s', indicators: [] },
    });
    expect(parseChartPreferences(stored, 'acc-1').timeframe).toBe('3m');
    expect(parseChartPreferences(stored, 'acc-2').timeframe).toBe('15s');
    expect(parseChartPreferences(stored, 'acc-unknown').timeframe).toBe(DEFAULT_CANDLE_TIMEFRAME);
  });

  it('restores a stored indicator configuration', () => {
    const indicators = DEFAULT_CHART_INDICATORS.map((indicator) =>
      indicator.id === 'sma-100' ? { ...indicator, enabled: false } : indicator,
    );
    const stored = payload({ 'acc-1': { timeframe: '1m', indicators } });
    const parsed = parseChartPreferences(stored, 'acc-1');
    expect(parsed.indicators.find((entry) => entry.id === 'sma-100')?.enabled).toBe(false);
    expect(parsed.indicators.find((entry) => entry.id === 'ema-20')?.enabled).toBe(true);
  });

  it('keeps the valid indicators and drops only the malformed ones', () => {
    const stored = payload({
      'acc-1': {
        timeframe: '1m',
        indicators: [
          DEFAULT_CHART_INDICATORS.find((indicator) => indicator.id === 'ema-20'),
          { id: 'x', type: 'rsi', period: 14 },
        ],
      },
    });
    const parsed = parseChartPreferences(stored, 'acc-1').indicators;
    expect(parsed.find((entry) => entry.id === 'ema-20')?.enabled).toBe(true);
    // The shipped presets the stored payload never mentioned come back through
    // the catalogue migration, switched off rather than silently drawn.
    expect(parsed.find((entry) => entry.id === 'sma-100')?.enabled).toBe(false);
    expect(parsed.some((entry) => entry.id === 'x')).toBe(false);
    expect(parsed).toHaveLength(DEFAULT_CHART_INDICATORS.length);
  });

  it('adds newly shipped presets to an older registry without activating or replacing them', () => {
    const older = DEFAULT_CHART_INDICATORS.filter((indicator) =>
      ['ema-20', 'sma-20'].includes(indicator.id),
    ).map((indicator) =>
      indicator.id === 'ema-20'
        ? { ...indicator, style: { color: '#123456', width: 3 as const } }
        : indicator,
    );

    const migrated = mergeShippedChartIndicators(older);
    expect(migrated).toHaveLength(DEFAULT_CHART_INDICATORS.length);
    expect(migrated.find((entry) => entry.id === 'ema-20')?.style).toEqual({
      color: '#123456',
      width: 3,
    });
    expect(migrated.find((entry) => entry.id === 'sma-100')?.enabled).toBe(false);
    expect(migrated.filter((entry) => entry.enabled).map((entry) => entry.id)).toEqual([
      'ema-20',
      'sma-20',
    ]);
  });

  it('restores the shipped preset when the stored list is empty or absent', () => {
    // A blank chart the trader has no obvious way to explain is worse than the
    // default active lines and discoverable disabled presets they already know.
    expect(parseChartPreferences(payload({ 'acc-1': {} }), 'acc-1').indicators).toEqual([
      ...DEFAULT_CHART_INDICATORS,
    ]);
    expect(
      parseChartPreferences(payload({ 'acc-1': { indicators: [] } }), 'acc-1').indicators,
    ).toEqual([...DEFAULT_CHART_INDICATORS]);
  });

  it('enforces the active-indicator cap on a stored payload (§28)', () => {
    const many = Array.from({ length: 15 }, (_, index) => ({
      id: `sma-${index}`,
      type: 'sma' as const,
      period: index + 2,
      enabled: true,
      style: { color: '#3673C9', width: 1 as const },
    }));
    const parsed = parseChartPreferences(payload({ 'acc-1': { indicators: many } }), 'acc-1');
    expect(parsed.indicators.filter((entry) => entry.enabled)).toHaveLength(8);
  });

  it('stores nothing financial (§16/§40)', () => {
    // The whole surface is a timeframe and a list of indicator instances. If a
    // future change adds a balance, a position or an order here, this fails.
    const parsed = parseChartPreferences(payload({ 'acc-1': { timeframe: '1m' } }), 'acc-1');
    expect(Object.keys(parsed).sort()).toEqual([
      'favorites',
      'indicators',
      'settings',
      'timeframe',
    ]);
    const indicatorKeys = Object.keys(parsed.indicators[0] ?? {}).sort();
    expect(indicatorKeys).toEqual(['enabled', 'id', 'period', 'style', 'type']);
  });

  it('uses a key distinct from the workstation layout preferences', () => {
    expect(CHART_PREFERENCES_STORAGE_KEY).toBe('wariba.warix.chart.analysis');
    expect(CHART_PREFERENCES_STORAGE_KEY).not.toBe('wariba.workstation.layout');
  });
});
