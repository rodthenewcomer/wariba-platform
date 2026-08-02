import { describe, expect, it } from 'vitest';
import { signupSchema, consentInputSchema } from '../src/identity';

describe('signupSchema', () => {
  it('accepts a well-formed signup', () => {
    const result = signupSchema.safeParse({
      email: 'trader@example.com',
      password: 'a-strong-password-123',
      firstName: 'Aïcha',
      lastName: 'Koné',
      country: 'ci',
      language: 'fr',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('CI'); // normalized to uppercase
    }
  });

  it('rejects a short password', () => {
    const result = signupSchema.safeParse({
      email: 'trader@example.com',
      password: 'short',
      firstName: 'A',
      lastName: 'B',
      country: 'CI',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = signupSchema.safeParse({
      email: 'not-an-email',
      password: 'a-strong-password-123',
      firstName: 'A',
      lastName: 'B',
      country: 'CI',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a country code that is not exactly 2 letters', () => {
    const result = signupSchema.safeParse({
      email: 'trader@example.com',
      password: 'a-strong-password-123',
      firstName: 'A',
      lastName: 'B',
      country: 'CIV',
    });
    expect(result.success).toBe(false);
  });
});

describe('consentInputSchema', () => {
  it('accepts a valid consent record', () => {
    const result = consentInputSchema.safeParse({
      consentType: 'simulated_account_disclosure',
      policyVersionId: '1.0.0',
      locale: 'fr-FR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown consent type', () => {
    const result = consentInputSchema.safeParse({
      consentType: 'marketing',
      policyVersionId: '1.0.0',
      locale: 'fr-FR',
    });
    expect(result.success).toBe(false);
  });
});
