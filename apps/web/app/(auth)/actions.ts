'use server';

import { redirect } from 'next/navigation';
import { signupSchema, loginSchema, passwordResetRequestSchema } from '@wariba/validation';
import { createLogger } from '@wariba/observability';
import { createUserProfile } from '@wariba/application';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { getDb } from '../../lib/db';
import { safeInternalPath } from '../../lib/navigation';
import { productCopy } from '../../lib/product-copy';
import { resolveSupportedCountry } from '../../lib/supported-countries';

const logger = createLogger({ service: 'web', module: 'auth.actions' });

export interface ActionResult {
  error?: string;
}

export interface PasswordResetActionResult {
  error?: string;
  submitted?: boolean;
}

/**
 * Server Action, not a client-side call to Supabase Auth directly — the
 * profile row insert that follows a successful signUp must run with the
 * service-role client (user_profiles has no client-facing INSERT policy;
 * see the Prompt 03 migration comment "server creates on signup"), which
 * can only safely happen in server-only code.
 */
export async function signUpAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  /*
   * The country is checked against the offered set here, not trusted from the
   * form: a `<select>` constrains a browser and not an HTTP client. A code
   * WARIBA does not offer fails the submission rather than being replaced by a
   * default — silently substituting one is exactly the behaviour that made the
   * old hidden `country=CI` a lie about where someone lives.
   */
  const country = resolveSupportedCountry(formData.get('country'));
  if (country === null) {
    return { error: productCopy.auth.signup.countryMissing };
  }

  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    country,
    language: formData.get('language') ?? 'fr',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    logger.warn('signup.failed', { code: error?.code ?? 'unknown' });
    return { error: 'Impossible de créer le compte. Cette adresse est peut-être déjà utilisée.' };
  }

  const db = getDb();
  try {
    await createUserProfile(db, {
      userId: data.user.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      country: parsed.data.country,
      language: parsed.data.language,
    });
  } catch (profileError) {
    // The auth user now exists without a profile row — logged as an error
    // for staff follow-up rather than silently swallowed. Not rolled back
    // automatically: Supabase Auth has no cross-resource transaction with
    // Postgres, and deleting the just-created auth user here risks masking
    // the real failure. This is exactly the kind of gap Prompt 03's
    // non-scope (no real ops tooling yet) leaves for a later prompt.
    logger.error('signup.profile_creation_failed', {
      userId: data.user.id,
      message: profileError instanceof Error ? profileError.message : String(profileError),
    });
    return {
      error: "Compte créé mais le profil n'a pas pu être enregistré. Contactez le support.",
    };
  }

  logger.info('signup.completed', { userId: data.user.id });
  /*
   * A visitor who chose an offer and was sent here to create an account should
   * return to that offer, not to the catalogue they already left. `/offres`
   * stays the fallback for someone who signed up without a purchase intent,
   * and `safeInternalPath` rejects anything that is not an internal route —
   * so an attacker-supplied `returnTo` cannot turn signup into an open
   * redirect.
   */
  redirect(safeInternalPath(formData.get('returnTo'), '/offres'));
}

export async function signInAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: productCopy.auth.login.invalidCredentials };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: productCopy.auth.login.invalidCredentials };
  }

  redirect(safeInternalPath(formData.get('next')));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function requestPasswordResetAction(
  _prevState: PasswordResetActionResult,
  formData: FormData,
): Promise<PasswordResetActionResult> {
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: 'Adresse e-mail invalide.' };
  }

  const supabase = await createSupabaseServerClient();
  // Errors intentionally not surfaced to the caller in detail — revealing
  // "this email doesn't exist" is an account enumeration leak
  // (Security/QA Standard §7.4: "ne pas révéler si un email existe").
  await supabase.auth.resetPasswordForEmail(parsed.data.email);
  return { submitted: true };
}

export interface UpdatePasswordActionResult {
  error?: string;
  updated?: boolean;
}

/**
 * Completes a password recovery.
 *
 * Uses the recovery session the provider established when the link was opened
 * — deliberately not a second token mechanism of our own. `updateUser` fails
 * when that session is absent or spent, which is what makes an expired or
 * already-used link fail closed rather than silently succeed.
 *
 * The token never reaches a log: only the outcome is recorded.
 */
export async function updatePasswordAction(
  _prevState: UpdatePasswordActionResult,
  formData: FormData,
): Promise<UpdatePasswordActionResult> {
  const password = formData.get('password');
  const confirmation = formData.get('passwordConfirmation');

  if (typeof password !== 'string' || typeof confirmation !== 'string') {
    return { error: productCopy.auth.resetPassword.errorTitle };
  }
  if (password !== confirmation) {
    return { error: productCopy.auth.resetPassword.mismatch };
  }

  /*
   * The strength rule comes from the signup schema rather than a second copy
   * here. A recovery form that accepts a weaker password than registration is
   * a downgrade path, and two rules in two files is how that happens by
   * accident.
   */
  const parsed = signupSchema.shape.password.safeParse(password);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? productCopy.auth.signup.passwordHint };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    logger.warn('password_update.failed', { code: error.code ?? 'unknown' });
    return { error: productCopy.auth.resetPassword.invalidBody };
  }

  logger.info('password_update.completed');
  return { updated: true };
}

export interface ResendVerificationResult {
  error?: string;
  sent?: boolean;
}

/**
 * Re-sends the verification e-mail for the signed-in address.
 *
 * Takes the address from the session rather than from the form: accepting one
 * from the client would turn this into an unauthenticated mail trigger for any
 * address someone cares to type.
 */
export async function resendVerificationAction(
  _prevState: ResendVerificationResult,
): Promise<ResendVerificationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: productCopy.auth.login.serverError };
  }

  const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
  if (error) {
    logger.warn('verification_resend.failed', { code: error.code ?? 'unknown' });
    return { error: productCopy.auth.login.serverError };
  }
  return { sent: true };
}
