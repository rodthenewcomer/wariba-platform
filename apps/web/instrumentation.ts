/**
 * Next.js runs this once when the server starts, before it serves anything.
 *
 * `loadWebConfig()` is otherwise lazy — deliberately, so importing it in a
 * test does not demand a production-shaped environment. That laziness means
 * a misconfigured `pnpm dev` would boot happily and only fail on the first
 * request that touched the database. Loading it here moves every startup
 * check (schema validation, the local-data-plane guard, the sandbox-provider
 * guard) to the moment the developer is actually looking at the terminal.
 *
 * Node runtime only: the Edge runtime has no access to server-only config,
 * and this file executes in both.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { loadWebConfig } = await import('./lib/config');
  loadWebConfig();
}
