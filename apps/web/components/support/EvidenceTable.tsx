import type { EvidenceRow } from '@wariba/application';

/**
 * The contested decision, as a table.
 *
 * ## One component, both audiences
 *
 * The trader's contestation page and Control's review page render this same
 * component from the same projection. A dispute in which the two sides are
 * looking at different renderings of one event cannot be settled — one says
 * the threshold was X, the other's screen says Y, and neither can tell whether
 * they disagree about the facts or about the software.
 *
 * ## Semantic tokens only
 *
 * It appears inside the Hub's graphite shell and inside Control's, so it draws
 * exclusively on `--wariba-*` semantic tokens rather than either shell's own
 * ladder. Figures use the tabular face; labels do not.
 *
 * The wrapper scrolls on its own axis so a long reference never widens the
 * page — at 320px that is the difference between a readable record and a
 * horizontally scrolling document (§7.4).
 */
export function EvidenceTable({
  rows,
  caption,
  testId,
}: {
  rows: readonly EvidenceRow[];
  caption?: string;
  testId?: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto" data-testid={testId ?? 'evidence-table'}>
      <table className="w-full min-w-0 border-collapse text-left">
        {caption ? (
          <caption className="pb-2 text-left text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
            {caption}
          </caption>
        ) : null}
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-[color:var(--wariba-border-subtle)] last:border-b-0"
            >
              <th
                scope="row"
                className="w-1/2 py-2.5 pr-3 align-top text-[length:var(--wariba-font-size-body-sm)] font-normal text-[color:var(--wariba-text-secondary)]"
              >
                {row.label}
              </th>
              <td
                className={`py-2.5 align-top text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)] ${
                  row.numeric ? 'wariba-data' : ''
                }`}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EvidenceFillsTable({
  fills,
}: {
  fills: readonly {
    typeLabel: string;
    quantity: string;
    price: string;
    realizedPnl: string;
    occurredAtLabel: string;
  }[];
}) {
  if (fills.length === 0) return null;

  return (
    <div className="overflow-x-auto" data-testid="evidence-fills">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[color:var(--wariba-border-subtle)]">
            {['Type', 'Quantité', 'Prix', 'P/L réalisé', 'Horodatage'].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="whitespace-nowrap py-2 pr-3 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-tertiary)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fills.map((fill, index) => (
            <tr
              key={`${fill.occurredAtLabel}-${index}`}
              className="border-b border-[color:var(--wariba-border-subtle)] last:border-b-0"
            >
              <td className="whitespace-nowrap py-2 pr-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                {fill.typeLabel}
              </td>
              <td className="wariba-data whitespace-nowrap py-2 pr-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                {fill.quantity}
              </td>
              <td className="wariba-data whitespace-nowrap py-2 pr-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                {fill.price}
              </td>
              <td className="wariba-data whitespace-nowrap py-2 pr-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
                {fill.realizedPnl}
              </td>
              <td className="wariba-data whitespace-nowrap py-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
                {fill.occurredAtLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
