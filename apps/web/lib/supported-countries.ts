/**
 * Countries offered at signup.
 *
 * ## Why this file exists
 *
 * Signup used to send `country=CI` in a hidden field. That was wrong twice
 * over. It contradicted `BRAND-007` (`LOCKED`), which says the initial market
 * is *francophone Africa* — plural — not one country. And it recorded a fact
 * about a person that the person never stated: someone signing up from Dakar
 * was silently stored as resident in Côte d'Ivoire.
 *
 * Country of residence is not cosmetic. It reaches legal eligibility, KYC,
 * payout rails, payment providers and reporting. A value nobody chose is a bad
 * input to all of them.
 *
 * ## What is decided and what is not
 *
 * `BRAND-007` fixes the market. It does not enumerate the countries, and no
 * supported-country policy exists anywhere in the repository — not in the
 * Decision Log, not in the constitution, not in configuration.
 *
 * ```text
 * SUPPORTED_COUNTRIES_POLICY = OPEN
 * ```
 *
 * So this list is **not** a policy statement. It is the francophone-African
 * set implied by a LOCKED decision, offered so a person can state where they
 * live instead of having it assumed. It is deliberately not a global country
 * list: offering countries WARIBA does not serve would be its own false claim.
 *
 * When the policy is decided, it belongs in server-owned configuration and
 * this module reads it. Until then, nothing here should be read as a promise
 * that every listed country is commercially or legally served.
 */

export interface SupportedCountry {
  /** ISO 3166-1 alpha-2, which is what `user_profiles.country` stores. */
  code: string;
  /** French name, because the product speaks French. */
  label: string;
}

/**
 * Ordered for a francophone West and Central African audience, then
 * alphabetical. Not ranked by preference — the first entry is not a default,
 * and the form does not preselect one.
 */
export const SUPPORTED_COUNTRIES: readonly SupportedCountry[] = [
  { code: 'BJ', label: 'Bénin' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'BI', label: 'Burundi' },
  { code: 'CM', label: 'Cameroun' },
  { code: 'CF', label: 'République centrafricaine' },
  { code: 'KM', label: 'Comores' },
  { code: 'CG', label: 'Congo-Brazzaville' },
  { code: 'CD', label: 'République démocratique du Congo' },
  { code: 'CI', label: 'Côte d’Ivoire' },
  { code: 'DJ', label: 'Djibouti' },
  { code: 'GA', label: 'Gabon' },
  { code: 'GN', label: 'Guinée' },
  { code: 'GQ', label: 'Guinée équatoriale' },
  { code: 'MG', label: 'Madagascar' },
  { code: 'ML', label: 'Mali' },
  { code: 'MA', label: 'Maroc' },
  { code: 'MU', label: 'Maurice' },
  { code: 'MR', label: 'Mauritanie' },
  { code: 'NE', label: 'Niger' },
  { code: 'RW', label: 'Rwanda' },
  { code: 'SN', label: 'Sénégal' },
  { code: 'SC', label: 'Seychelles' },
  { code: 'TD', label: 'Tchad' },
  { code: 'TG', label: 'Togo' },
  { code: 'TN', label: 'Tunisie' },
] as const;

/** Whether the form should offer a choice at all. */
export function hasCountryChoice(): boolean {
  return SUPPORTED_COUNTRIES.length > 1;
}

/** The single country, when only one is offered. `null` when there is a choice. */
export function soleSupportedCountry(): SupportedCountry | null {
  return SUPPORTED_COUNTRIES.length === 1 ? (SUPPORTED_COUNTRIES[0] ?? null) : null;
}

/**
 * Validates a submitted code against the offered set.
 *
 * Server-side, because a `<select>` constrains a browser and not an HTTP
 * client. Returns `null` rather than falling back to a default: a country the
 * platform does not offer must fail the form, not be quietly replaced by one
 * the person did not choose — which is the exact behaviour this module exists
 * to remove.
 */
export function resolveSupportedCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return SUPPORTED_COUNTRIES.some((country) => country.code === normalized) ? normalized : null;
}
