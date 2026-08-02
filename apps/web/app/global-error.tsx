'use client';

/**
 * Next.js requires global-error.tsx to render its own <html>/<body> — it
 * replaces the root layout entirely when an error escapes every other
 * boundary. Deliberately minimal: no design-system imports here, since
 * this file exists specifically to render when something upstream (fonts,
 * tokens, layout itself) may have failed.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <h1>Une erreur est survenue</h1>
          <p>Veuillez réessayer.</p>
          <button type="button" onClick={reset}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
