import { describe, expect, it } from 'vitest';
import {
  DESKTOP_DESTINATIONS,
  MOBILE_DESTINATIONS,
  isActive,
  titleFor,
} from '../app/(platform)/hub-destinations';

/**
 * The desktop/mobile asymmetry is a product decision, not an oversight, and it
 * is the kind of decision a future refactor "tidies up" by making both lists
 * the same. Asserting it here means undoing it has to be deliberate.
 */
describe('hub navigation', () => {
  it('does not offer WariX as a desktop destination', () => {
    // WariX is a separate product shell, opened contextually from the account
    // that can be traded — not a page of this one.
    expect(DESKTOP_DESTINATIONS.map((destination) => destination.href)).not.toContain('/trade');
  });

  it('keeps WariX in the phone tab bar', () => {
    // A phone has no room for a contextual action, and a trader reaching for
    // the terminal should not have to remember which screen holds the button.
    expect(MOBILE_DESTINATIONS.map((destination) => destination.href)).toContain('/trade');
    expect(MOBILE_DESTINATIONS).toHaveLength(5);
  });

  it('exposes only routes that exist', () => {
    const shipped = ['/hub', '/comptes', '/payouts', '/trade', '/plus'];
    for (const destination of [...DESKTOP_DESTINATIONS, ...MOBILE_DESTINATIONS]) {
      expect(shipped).toContain(destination.href);
    }
  });

  it('matches whole segments rather than string prefixes', () => {
    expect(isActive('/comptes/abc', '/comptes')).toBe(true);
    expect(isActive('/hub', '/hub')).toBe(true);
    // The reason prefix matching is wrong: a neighbouring route that merely
    // shares an opening would light up the wrong navigation item.
    expect(isActive('/hubris', '/hub')).toBe(false);
  });

  it('names routes that are reachable without being listed on desktop', () => {
    expect(titleFor('/trade')).toBe('WariX');
    expect(titleFor('/plus')).toBe('Plus');
    expect(titleFor('/hub')).toBe('Tableau de bord');
  });
});
