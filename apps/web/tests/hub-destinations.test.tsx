import { describe, expect, it } from 'vitest';
import {
  HUB_DESTINATIONS,
  HUB_GROUPS,
  MOBILE_DESTINATIONS,
  MOBILE_OVERFLOW,
  activeDestination,
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
    expect(HUB_DESTINATIONS.map((destination) => destination.href)).not.toContain('/trade');
  });

  it('keeps WariX in the phone tab bar and holds the bar to five items', () => {
    expect(MOBILE_DESTINATIONS.map((destination) => destination.href)).toContain('/trade');
    // More than five and the labels stop being words at 320px.
    expect(MOBILE_DESTINATIONS).toHaveLength(5);
  });

  it('exposes only routes that exist', () => {
    const shipped = [
      '/hub',
      '/comptes',
      '/comptes/nouveau',
      '/performance',
      '/journal',
      '/payouts',
      '/facturation',
      '/support',
      '/parametres',
      '/trade',
      '/plus',
    ];
    for (const destination of [
      ...HUB_DESTINATIONS,
      ...MOBILE_DESTINATIONS,
      ...MOBILE_OVERFLOW.flatMap((group) => group.destinations),
    ]) {
      expect(shipped).toContain(destination.href);
    }
  });

  /**
   * There is no achievements table, no criteria and no award anywhere in the
   * platform. A trophy leading to fabricated milestones is exactly the kind of
   * manufactured progress this product refuses.
   */
  it('does not expose rewards or notifications while neither capability exists', () => {
    const hrefs = HUB_DESTINATIONS.map((destination) => destination.href);
    expect(hrefs).not.toContain('/recompenses');
    expect(hrefs).not.toContain('/notifications');
  });

  it('gives the commercial action its own emphasis rather than a plain row', () => {
    const add = HUB_DESTINATIONS.find((destination) => destination.href === '/comptes/nouveau');
    expect(add?.emphasis).toBe('cta');
    // And it is the only one — emphasis everywhere is emphasis nowhere.
    expect(HUB_DESTINATIONS.filter((destination) => destination.emphasis)).toHaveLength(1);
  });

  it('groups the sidebar rather than listing nine equal rows', () => {
    expect(HUB_GROUPS.length).toBeGreaterThanOrEqual(3);
    for (const group of HUB_GROUPS.slice(1)) {
      expect(group.title).toBeTruthy();
    }
  });

  it('matches whole segments rather than string prefixes', () => {
    expect(isActive('/comptes/abc', '/comptes')).toBe(true);
    expect(isActive('/hub', '/hub')).toBe(true);
    // A neighbouring route that merely shares an opening must not light up.
    expect(isActive('/hubris', '/hub')).toBe(false);
  });

  it('selects the deepest matching destination, not its parent', () => {
    // `/comptes/nouveau` lighting up "Comptes" leaves a trader unsure which
    // page they are on.
    expect(activeDestination('/comptes/nouveau')?.href).toBe('/comptes/nouveau');
    expect(activeDestination('/comptes')?.href).toBe('/comptes');
  });

  it('names routes that are reachable without being listed on desktop', () => {
    expect(titleFor('/trade')).toBe('WariX');
    expect(titleFor('/plus')).toBe('Plus');
    expect(titleFor('/hub')).toBe('Tableau de bord');
    expect(titleFor('/verification-identite')).toBe('Vérification d’identité');
  });
});

describe('hub navigation — Phase 2 information architecture', () => {
  it('groups nine destinations rather than listing them flat', () => {
    // Three flat rows is a menu; nine is a wall unless they are grouped by
    // what a trader came to do.
    expect(HUB_DESTINATIONS).toHaveLength(9);
    expect(HUB_GROUPS.map((group) => group.title)).toEqual([null, 'Analyse', 'Finances', 'Compte']);
  });

  it('puts every overflow destination behind Plus, and none of them twice', () => {
    const tabs = MOBILE_DESTINATIONS.map((destination) => destination.href);
    const overflow = MOBILE_OVERFLOW.flatMap((group) =>
      group.destinations.map((destination) => destination.href),
    );
    // A destination in both places is a destination a trader finds twice and
    // trusts less.
    for (const href of overflow) expect(tabs).not.toContain(href);
    expect(new Set(overflow).size).toBe(overflow.length);
  });

  it('keeps identity verification reachable by name even though it is not a destination', () => {
    // It is reached from the payout gate, not from the navigation — but the
    // header must still be able to name the page a trader is standing on.
    expect(titleFor('/verification-identite')).toBe('Vérification d’identité');
    expect(HUB_DESTINATIONS.map((d) => d.href)).not.toContain('/verification-identite');
  });
});
