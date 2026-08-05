export const USD_EQUIVALENT: Record<string, string> = {
  '5K': '≈ 39 USD',
  '10K': '≈ 69 USD',
  '25K': '≈ 148 USD',
  '50K': '≈ 252 USD',
  '100K': '≈ 452 USD',
};

// Number.parseInt truncates at the decimal point rather than rounding
// ("148.50" -> 148, silently dropping 50 cents) — Math.round(parseFloat(...))
// rounds to the nearest whole unit instead, which is what a "no decimals
// shown" display format actually means. This is a payment-facing screen
// (CheckoutClient.tsx shows the exact price a customer is about to pay), so
// the distinction is not cosmetic.
export function formatFcfa(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} FCFA`;
}

export function formatUsd(amount: string): string {
  return `${Math.round(Number.parseFloat(amount)).toLocaleString('fr-FR')} USD`;
}
