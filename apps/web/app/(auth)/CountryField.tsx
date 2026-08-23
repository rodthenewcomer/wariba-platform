'use client';

import { useId } from 'react';
import {
  SUPPORTED_COUNTRIES,
  hasCountryChoice,
  soleSupportedCountry,
} from '../../lib/supported-countries';
import { productCopy } from '../../lib/product-copy';

const copy = productCopy.auth.signup;

/**
 * Country of residence, stated by the person rather than assumed for them.
 *
 * Replaces a hidden `country=CI`. Two shapes, chosen by how many countries are
 * actually offered: a select when there is a genuine choice, and a visible
 * read-only statement when there is only one — never an invisible value in
 * either case, because a fact that reaches legal eligibility, KYC and payout
 * rails should be something the person saw.
 *
 * Nothing is preselected. No IP lookup, no locale guess: the browser's language
 * says what someone reads, not where they live, and a wrong default here is a
 * wrong answer someone accepted without noticing.
 */
export function CountryField() {
  const id = useId();
  const sole = soleSupportedCountry();

  if (!hasCountryChoice() && sole) {
    return (
      <div className="flex flex-col gap-[var(--wariba-component-input-label-gap)]">
        <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
          {copy.country}
        </span>
        {/* Read-only and visible. The value still travels with the form. */}
        <div className="flex h-[var(--wariba-component-input-height)] items-center rounded-[var(--wariba-component-input-radius)] border border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-subtle)] px-[var(--wariba-component-input-padding-x)] text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]">
          {sole.label}
        </div>
        <input type="hidden" name="country" value={sole.code} />
        <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
          {copy.countrySingleNote}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--wariba-component-input-label-gap)]">
      <label
        htmlFor={id}
        className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]"
      >
        {copy.country}
      </label>
      <select
        id={id}
        name="country"
        required
        autoComplete="country"
        defaultValue=""
        className="h-[var(--wariba-component-input-height)] w-full rounded-[var(--wariba-component-input-radius)] border-[length:var(--wariba-component-input-border-width)] border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-surface)] px-[var(--wariba-component-input-padding-x)] text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
      >
        {/* Disabled and empty, so the form cannot be submitted on a value the
            person never chose. */}
        <option value="" disabled>
          {copy.countryPlaceholder}
        </option>
        {SUPPORTED_COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.label}
          </option>
        ))}
      </select>
    </div>
  );
}
