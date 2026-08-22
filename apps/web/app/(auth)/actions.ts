'use server';

import { redirect } from 'next/navigation';
import { signupSchema, loginSchema, passwordResetRequestSchema } from '@wariba/validation';
import { createLogger } from '@wariba/observability';
import { createUserProfile } from '@wariba/application';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { getDb } from '../../lib/db';
import { safeInternalPath } from '../../lib/navigation';
import { productCopy } from '../../lib/product-copy';

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
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    country: formData.get('country'),
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
