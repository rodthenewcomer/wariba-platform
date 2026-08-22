import { describe, expect, it } from 'vitest';
import { maskEmail, productCopy } from '../lib/product-copy';

describe('maskEmail', () => {
  it('shows enough for the owner to recognise their address and no more', () => {
    expect(maskEmail('rodrigue@example.com')).toBe('ro***@example.com');
  });

  it('does not expose a single-character local part', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
  });

  it('refuses to guess when the input is not an address', () => {
    expect(maskEmail('pas-une-adresse')).toBe('votre adresse');
    expect(maskEmail('@example.com')).toBe('votre adresse');
  });
});

describe('product copy', () => {
  /**
   * The login failure and the password-reset confirmation are the two places a
   * careless wording change turns the product into an account-existence
   * oracle. Asserting them here means the leak has to survive a test, not just
   * a review.
   */
  it('never confirms whether an account exists', () => {
    expect(productCopy.auth.login.invalidCredentials).toBe(
      'Adresse e-mail ou mot de passe incorrect.',
    );
    expect(productCopy.auth.forgotPassword.sentBody).toContain('Si un compte correspond');
  });

  it('says nothing about the restricted resource on a refusal', () => {
    expect(productCopy.system.forbidden.body).toBe('Vous n’avez pas accès à cette page.');
  });

  it('promises no completion time for maintenance', () => {
    expect(productCopy.system.maintenance.body).not.toMatch(/\d+\s*(min|h|heure)/i);
  });
});
