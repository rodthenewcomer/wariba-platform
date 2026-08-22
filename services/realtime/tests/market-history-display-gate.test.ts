import { describe, expect, it, vi } from 'vitest';
import type { HistoricalMarketDataProvider } from '@wariba/adapters';
import { assessDisplayLicense, reportDisplayLicense } from '../src/market-history-display-gate';

function provider(displayRights: 'internal' | 'external' | 'unknown' | undefined) {
  return {
    providerName: 'twelve-data',
    source: {
      id: 'twelve-data:production:v1',
      provider: 'twelve-data',
      environment: 'production',
      mode: 'live',
      version: 'v1',
      capabilities: {
        realtimeQuotes: false,
        bidAsk: false,
        historicalBars: true,
        nativeIntervals: [],
        pagination: 'none',
        volume: false,
        depth: false,
        ...(displayRights === undefined ? {} : { displayRights }),
      },
    },
  } as unknown as HistoricalMarketDataProvider;
}

describe('display license gate', () => {
  it('treats unrecorded display rights as not cleared', () => {
    expect(assessDisplayLicense(provider(undefined), 'production').status).toBe(
      'requires_human_commercial_clearance',
    );
    expect(assessDisplayLicense(provider('unknown'), 'production').status).toBe(
      'requires_human_commercial_clearance',
    );
  });

  it('treats internal-only rights as not cleared for a customer-facing chart', () => {
    const assessment = assessDisplayLicense(provider('internal'), 'production');
    expect(assessment.status).toBe('requires_human_commercial_clearance');
    expect(assessment.customerFacing).toBe(true);
  });

  it('clears only an explicit external grant', () => {
    expect(assessDisplayLicense(provider('external'), 'production').status).toBe(
      'cleared_external_display',
    );
  });

  it('counts staging and preview as customer-facing, local as not', () => {
    expect(assessDisplayLicense(provider('internal'), 'staging').customerFacing).toBe(true);
    expect(assessDisplayLicense(provider('internal'), 'preview').customerFacing).toBe(true);
    expect(assessDisplayLicense(provider('internal'), 'local').customerFacing).toBe(false);
  });

  it('logs at error level when a customer-facing deployment is not cleared', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    reportDisplayLicense(assessDisplayLicense(provider('internal'), 'production'), logger);
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error.mock.calls[0]?.[0]).toBe(
      'history.display_license.requires_commercial_clearance',
    );
  });

  it('logs only a development warning locally', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    reportDisplayLicense(assessDisplayLicense(provider('internal'), 'local'), logger);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('never blocks startup — it returns rather than throwing', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    expect(() =>
      reportDisplayLicense(assessDisplayLicense(provider('unknown'), 'production'), logger),
    ).not.toThrow();
  });
});
