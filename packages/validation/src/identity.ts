import { z } from 'zod';

/**
 * ISO 3166-1 alpha-2 country codes are validated as exactly 2 uppercase
 * letters here — the full enumerated list lives at the UI layer (a select),
 * not duplicated here. This schema is the server-side boundary check.
 */
export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, 'Le mot de passe doit contenir au moins 12 caractères.'),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  country: z.string().length(2).toUpperCase(),
  language: z.string().min(2).max(5).default('fr'),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  country: z.string().length(2).toUpperCase().optional(),
  language: z.string().min(2).max(5).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const consentTypeSchema = z.enum(['terms', 'privacy', 'simulated_account_disclosure']);

export const consentInputSchema = z.object({
  consentType: consentTypeSchema,
  policyVersionId: z.string().min(1),
  locale: z.string().min(2).max(10),
});
export type ConsentInput = z.infer<typeof consentInputSchema>;
