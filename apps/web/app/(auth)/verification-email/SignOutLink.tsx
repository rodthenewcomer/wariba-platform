import Link from 'next/link';
import { productCopy } from '../../../lib/product-copy';
import { signOutAction } from '../actions';

/**
 * Either continues into the product or leaves the half-finished session.
 *
 * Sign-out is a state change, so it is a form submission rather than a link —
 * a GET that ends a session is a hazard the moment anything prefetches it.
 */
export function SignOutLink({ verified = false }: { verified?: boolean }) {
  if (verified) {
    return (
      <Link
        href="/hub"
        className="flex h-12 w-full items-center justify-center rounded-[var(--wariba-component-input-radius)] bg-[color:var(--wariba-color-cobalt-600)] px-4 text-[length:var(--wariba-font-size-label-lg)] font-semibold text-[color:var(--wariba-color-white)] transition-[filter,transform] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] active:translate-y-px"
      >
        {productCopy.auth.emailVerification.continue}
      </Link>
    );
  }

  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="w-full rounded-[4px] text-center text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-text-secondary)] underline decoration-[color:var(--warix-border-strong)] underline-offset-4 transition-colors hover:text-[color:var(--wariba-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
      >
        {productCopy.auth.emailVerification.signOut}
      </button>
    </form>
  );
}
