/**
 * Prompt 7 Appendix 07-B, gate 2 — partial close stays disabled for the
 * initial beta (no approved design exists for its UI yet, per the Program
 * Rulebook's deferred-until-implemented list). The server itself already
 * supports partial_close orders (packages/database/src/trading.ts) — this
 * flag exists purely to keep the client from ever offering a control for
 * it until a design is approved and this is deliberately flipped on.
 *
 * NEXT_PUBLIC_ vars must be read as a literal `process.env.NEXT_PUBLIC_...`
 * reference for Next.js to inline them into the browser bundle (see
 * lib/config.ts's doc comment) — never through a dynamic lookup — so this
 * stays its own tiny module rather than joining the server-only config
 * schema there.
 */
export function isPartialCloseEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_PARTIAL_CLOSE === 'true';
}
