import { COUNTRY_SOURCES } from './legal-sources';

/**
 * The six-market legal-framework matrix — informational, not a licensing
 * claim. Never render the word "agréé"/"licencié" next to a row here; the
 * matrix says which national digital-transactions, privacy, consumer and
 * AML/CFT statutes apply, nothing about WARIBA's own authorisation status.
 */
export function LegalCountryMatrix() {
  return (
    <div className="overflow-x-auto rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-seam)]">
      <table className="w-full min-w-[720px] border-collapse text-left text-[length:var(--wariba-font-size-body-sm)]">
        <thead>
          <tr className="border-b border-[color:var(--wariba-seam)] bg-[color:var(--wariba-canvas-elevated)]">
            <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">Marché</th>
            <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
              Autorité vie privée
            </th>
            <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
              Transactions électroniques
            </th>
            <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
              Protection du consommateur
            </th>
            <th className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
              LBC/FT/FP
            </th>
          </tr>
        </thead>
        <tbody>
          {COUNTRY_SOURCES.map((row) => (
            <tr
              key={row.country}
              className="border-b border-[color:var(--wariba-seam)] last:border-b-0"
            >
              <td className="px-4 py-3 font-semibold text-[color:var(--wariba-on-dark)]">
                {row.country}
              </td>
              <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">
                {row.authority}
              </td>
              <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">
                {row.digitalTransactions.text}
              </td>
              <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">
                {row.consumer.text}
                {row.consumer.unconfirmed ? (
                  <span className="ml-1.5 text-[color:var(--wariba-accent-amber)]">
                    (à confirmer)
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-[color:var(--wariba-on-dark-muted)]">
                {row.aml.text}
                {row.aml.unconfirmed ? (
                  <span className="ml-1.5 text-[color:var(--wariba-accent-amber)]">
                    (à confirmer)
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
