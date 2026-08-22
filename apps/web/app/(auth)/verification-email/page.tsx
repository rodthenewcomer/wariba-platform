import { AuthShell } from '../AuthShell';
import { ResendControl } from './ResendControl';
import { SignOutLink } from './SignOutLink';
import { productCopy, maskEmail } from '../../../lib/product-copy';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

const copy = productCopy.auth.emailVerification;

/**
 * Waiting for an e-mail link.
 *
 * The provider verifies by link, so there is no code to type and no OTP field
 * here — inventing one would ask for something the backend never issued.
 *
 * The address is masked. The person recognises their own; a screenshot, a
 * shared screen or someone behind them does not learn it.
 *
 * No "Modifier l'adresse e-mail" control: changing the address on an
 * unverified account is not supported by the current auth architecture, and a
 * button that cannot do what it says is worse than its absence.
 */
export default async function EmailVerificationPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const masked = user?.email ? maskEmail(user.email) : 'votre adresse';
  const verified = Boolean(user?.email_confirmed_at);

  if (verified) {
    return (
      <AuthShell title={copy.verifiedTitle} subtitle={copy.verifiedBody}>
        <SignOutLink verified />
      </AuthShell>
    );
  }

  return (
    <AuthShell title={copy.title} subtitle={copy.sentBody(masked)}>
      <div className="flex flex-col gap-6">
        <p className="text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
          {copy.waitingBody}
        </p>
        <ResendControl />
        <SignOutLink />
      </div>
    </AuthShell>
  );
}
