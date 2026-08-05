export const USD_EQUIVALENT: Record<string, string> = {
  '5K': '≈ 39 USD',
  '10K': '≈ 69 USD',
  '25K': '≈ 148 USD',
  '50K': '≈ 252 USD',
  '100K': '≈ 452 USD',
};

export function formatFcfa(amount: string): string {
  return `${Number.parseInt(amount, 10).toLocaleString('fr-FR')} FCFA`;
}

export function formatUsd(amount: string): string {
  return `${Number.parseInt(amount, 10).toLocaleString('fr-FR')} USD`;
}
