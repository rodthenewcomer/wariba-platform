import { describe, expect, it } from 'vitest';
import { evaluateV2TradingPermission } from '../src/index';

const now = new Date('2026-08-27T12:00:00.000Z');

describe('V2 news/session permission matrix', () => {
  it('does not invent a sanction without a provider and keeps reduce/close possible', () => {
    expect(
      evaluateV2TradingPermission({
        now,
        accountPhase: 'performance',
        intent: 'reduce',
        assetGroup: 'FX',
        newsSourceReady: false,
        sessionSourceReady: true,
        newsWindows: [],
        closureWindows: [],
      }),
    ).toEqual({
      allowed: true,
      activationReady: false,
      reasonCode: 'NEWS_CALENDAR_SOURCE_UNAVAILABLE',
    });
  });

  it('blocks only open/increase inside a verified high-impact Performance window', () => {
    const common = {
      now,
      accountPhase: 'performance' as const,
      assetGroup: 'FX',
      newsSourceReady: true,
      sessionSourceReady: true,
      newsWindows: [
        {
          startsAt: new Date('2026-08-27T11:58:00.000Z'),
          endsAt: new Date('2026-08-27T12:02:00.000Z'),
          affectedAssetGroups: ['FX'],
        },
      ],
      closureWindows: [],
    };
    expect(evaluateV2TradingPermission({ ...common, intent: 'increase' }).reasonCode).toBe(
      'NEWS_EXPOSURE_INCREASE_BLOCKED',
    );
    expect(evaluateV2TradingPermission({ ...common, intent: 'close' }).allowed).toBe(true);
  });

  it('blocks new exposure at the 30-minute boundary before a closure of at least two hours', () => {
    expect(
      evaluateV2TradingPermission({
        now,
        accountPhase: 'evaluation',
        intent: 'open',
        assetGroup: 'INDICES',
        newsSourceReady: false,
        sessionSourceReady: true,
        newsWindows: [],
        closureWindows: [
          {
            closesAt: new Date('2026-08-27T12:30:00.000Z'),
            reopensAt: new Date('2026-08-27T14:30:00.000Z'),
            affectedAssetGroups: ['INDICES'],
          },
        ],
      }),
    ).toEqual({
      allowed: false,
      activationReady: true,
      reasonCode: 'MARKET_CLOSURE_EXPOSURE_INCREASE_BLOCKED',
    });
  });
});
