import { describe, expect, it } from 'vitest';
import { historyProvenanceFor, instrumentHistoryStart } from '../src/instrument-history';

const EURO_LAUNCH = Date.UTC(1999, 0, 4) / 1000;

describe('instrument history provenance', () => {
  it('knows when the euro started trading', () => {
    expect(instrumentHistoryStart('EURUSD')).toBe(EURO_LAUNCH);
  });

  it('marks the 1984 monthly bars the provider serves as reconstruction', () => {
    expect(historyProvenanceFor('EURUSD', Date.UTC(1984, 0, 1) / 1000)).toBe(
      'synthetic_prehistory',
    );
    expect(historyProvenanceFor('EURUSD', Date.UTC(1998, 11, 1) / 1000)).toBe(
      'synthetic_prehistory',
    );
  });

  it('marks post-launch bars as the instrument own history', () => {
    expect(historyProvenanceFor('EURUSD', EURO_LAUNCH)).toBe('instrument');
    expect(historyProvenanceFor('EURUSD', Date.UTC(2026, 7, 1) / 1000)).toBe('instrument');
  });

  it('treats a symbol with no recorded boundary as instrument history throughout', () => {
    expect(historyProvenanceFor('GBPUSD', Date.UTC(1984, 0, 1) / 1000)).toBe('instrument');
  });

  it('classifies a monthly bucket opening before the launch as reconstruction', () => {
    // January 1999 opens on the 1st; the euro started trading on the 4th, so
    // that bucket's open and low come from the legacy series.
    expect(historyProvenanceFor('EURUSD', Date.UTC(1999, 0, 1) / 1000)).toBe(
      'synthetic_prehistory',
    );
  });
});
