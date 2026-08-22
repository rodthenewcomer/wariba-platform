import { describe, expect, it } from 'vitest';
import { classifyBarSession, isWithinWeeklyClosure } from '../src/market-session';

const utc = (y: number, m: number, d: number, h = 0): number => Date.UTC(y, m, d, h) / 1000;

describe('isWithinWeeklyClosure', () => {
  it('closes at 17:00 New York, which is 21:00 UTC in summer', () => {
    // 2026-08-21 is a Friday.
    expect(isWithinWeeklyClosure(utc(2026, 7, 21, 20))).toBe(false);
    expect(isWithinWeeklyClosure(utc(2026, 7, 21, 21))).toBe(true);
  });

  it('closes at 22:00 UTC in winter, when New York is on standard time', () => {
    // 2026-12-18 is a Friday.
    expect(isWithinWeeklyClosure(utc(2026, 11, 18, 21))).toBe(false);
    expect(isWithinWeeklyClosure(utc(2026, 11, 18, 22))).toBe(true);
  });

  it('reopens Sunday 17:00 New York', () => {
    expect(isWithinWeeklyClosure(utc(2026, 7, 23, 20))).toBe(true);
    expect(isWithinWeeklyClosure(utc(2026, 7, 23, 21))).toBe(false);
  });

  it('treats all of Saturday as closed', () => {
    for (let hour = 0; hour < 24; hour += 4) {
      expect(isWithinWeeklyClosure(utc(2026, 7, 22, hour))).toBe(true);
    }
  });

  it('treats midweek as open', () => {
    expect(isWithinWeeklyClosure(utc(2026, 7, 19, 12))).toBe(false);
  });
});

describe('classifyBarSession', () => {
  it('marks the post-close minute bars the audit found as out of session', () => {
    // The exact window whose median 1m range tripled from 1.0 to 3.4 pips.
    expect(classifyBarSession(utc(2026, 7, 21, 20) + 59 * 60, '1m')).toBe('regular');
    expect(classifyBarSession(utc(2026, 7, 21, 21), '1m')).toBe('out_of_session');
    expect(classifyBarSession(utc(2026, 7, 21, 23), '1m')).toBe('out_of_session');
    expect(classifyBarSession(utc(2026, 7, 22, 1), '1m')).toBe('out_of_session');
  });

  it('marks a Saturday daily bar out of session but keeps Friday and Sunday', () => {
    expect(classifyBarSession(utc(2026, 7, 22), '1D')).toBe('out_of_session');
    // Friday's bar contains a full trading day before the close.
    expect(classifyBarSession(utc(2026, 7, 21), '1D')).toBe('regular');
    // Sunday's bar contains the reopen.
    expect(classifyBarSession(utc(2026, 7, 23), '1D')).toBe('regular');
  });

  it('keeps an hourly bar that straddles the close, rather than splitting it', () => {
    expect(classifyBarSession(utc(2026, 7, 21, 20), '1h')).toBe('regular');
    expect(classifyBarSession(utc(2026, 7, 21, 21), '1h')).toBe('out_of_session');
  });

  it('never marks calendar intervals out of session', () => {
    expect(classifyBarSession(utc(2026, 7, 22), '1W')).toBe('regular');
    expect(classifyBarSession(utc(2026, 7, 1), '1M')).toBe('regular');
  });

  it('classifies a 4h bar by whether any of it is open market', () => {
    expect(classifyBarSession(utc(2026, 7, 21, 20), '4h')).toBe('regular');
    expect(classifyBarSession(utc(2026, 7, 22, 4), '4h')).toBe('out_of_session');
  });
});
