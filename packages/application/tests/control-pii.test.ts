import { describe, expect, it } from 'vitest';
import { displayName, maskEmail } from '../src/control-pii';

describe('Control PII masking', () => {
  it('keeps a masked address recognisable without being harvestable', () => {
    // Enough for someone who already knows who they are looking for; useless
    // for collecting addresses off a list.
    expect(maskEmail('rodrigue@icloud.com')).toBe('ro•••@icloud.com');
    expect(maskEmail('trader.one@wariba.test')).toBe('tr•••@wariba.test');
  });

  it('never leaks the whole local part of a very short address', () => {
    expect(maskEmail('a@b.com')).toBe('a•••@b.com');
    expect(maskEmail('ab@b.com')).toBe('a•••@b.com');
  });

  it('masks entirely when the value is not an address shape', () => {
    // Guessing which half identified the person would risk exposing it.
    expect(maskEmail('not-an-email')).toBe('•••');
    expect(maskEmail('@leading.com')).toBe('•••');
  });

  it('renders a placeholder rather than an empty cell for a missing address', () => {
    expect(maskEmail(null)).toBe('—');
    expect(maskEmail('')).toBe('—');
  });

  it('keeps the domain intact, since it is operationally useful and not identifying', () => {
    expect(maskEmail('someone@wariba-test.invalid')).toContain('@wariba-test.invalid');
  });

  it('builds a display name from whatever parts exist', () => {
    expect(displayName('Ada', 'Lovelace')).toBe('Ada Lovelace');
    expect(displayName('Ada', null)).toBe('Ada');
    expect(displayName(null, 'Lovelace')).toBe('Lovelace');
    expect(displayName(null, null)).toBe('—');
    expect(displayName('', '   ')).toBe('—');
  });
});
