import type { HelpFact, HelpPolicyFacts } from '@wariba/application';
import { HELP_FACT_UNPUBLISHED, resolveHelpFacts } from '@wariba/application';
import type { HelpBlock, HelpFactKey } from '../../content/help';

/**
 * The article renderer.
 *
 * ## Why a renderer and not markdown
 *
 * Three block kinds cannot survive a markdown round trip, and each of them
 * matters. A `ruleTable` reads the published policy at render time rather than
 * printing a number somebody typed. An `example` is visibly framed as an
 * illustration, so a trader never mistakes 10 000 USD for their own limit. And
 * a `table` becomes a stack of key/value rows below `sm`, because a five-column
 * comparison scrolling sideways at 320px is a table nobody reads (§10).
 *
 * ## Emphasis
 *
 * Prose carries `**bold**` and nothing else. A full inline-markdown parser
 * would be a second content language to keep safe; one delimiter, split on a
 * regex, renders as `<strong>` with no `dangerouslySetInnerHTML` anywhere.
 */

const PROSE =
  'text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-color-ink-100)]';

function Emphasised({ text }: { text: string }) {
  // Split on the delimiter rather than parsing: odd indices are the emphasised
  // runs, which keeps this a pure text transform with no HTML injection path.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className="font-semibold text-[color:var(--wariba-color-bone-50)]">
            {part}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

const CALLOUT_TONE: Record<
  'information' | 'attention' | 'danger',
  { border: string; wash: string; text: string; label: string }
> = {
  information: {
    border: 'var(--wariba-color-cobalt-700)',
    wash: 'color-mix(in srgb, var(--wariba-color-cobalt-700) 18%, transparent)',
    text: 'var(--wariba-color-cobalt-300)',
    label: 'À savoir',
  },
  attention: {
    border: 'var(--wariba-color-amber-600, #b45309)',
    wash: 'color-mix(in srgb, #f59e0b 14%, transparent)',
    text: '#fbbf24',
    label: 'Attention',
  },
  danger: {
    border: 'color-mix(in srgb, #ef4444 60%, transparent)',
    wash: 'color-mix(in srgb, #ef4444 12%, transparent)',
    text: '#fca5a5',
    label: 'Important',
  },
};

/**
 * A table that stops being a table when it cannot be one.
 *
 * Above `sm` it is a real `<table>`, with the first column as row headers so a
 * screen reader announces "Portée — la journée" rather than two loose cells.
 * Below `sm` the same rows render as stacked definition pairs. Both come from
 * one data shape, so they cannot disagree.
 */
function ResponsiveTable({
  caption,
  columns,
  rows,
}: {
  caption?: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <div data-testid="help-table">
      {caption ? (
        <p className="mb-2 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
          {caption}
        </p>
      ) : null}

      <table className="hidden w-full border-collapse text-left sm:table">
        <thead>
          <tr className="border-b border-[color:var(--wariba-color-ink-700)]">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="py-2 pr-4 align-bottom text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-color-ink-300)]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-[color:var(--wariba-color-ink-800)] last:border-b-0"
            >
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th
                    key={cellIndex}
                    scope="row"
                    className="py-2.5 pr-4 align-top text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-color-bone-50)]"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={cellIndex}
                    className="py-2.5 pr-4 align-top text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-100)]"
                  >
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 sm:hidden">
        {rows.map((row, rowIndex) => (
          <li
            key={rowIndex}
            className="rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] p-3.5"
          >
            <p className="text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
              {row[0]}
            </p>
            <dl className="mt-2 flex flex-col gap-1.5">
              {row.slice(1).map((cell, cellIndex) => (
                <div key={cellIndex} className="flex flex-col gap-0.5">
                  <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                    {columns[cellIndex + 1]}
                  </dt>
                  <dd className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-100)]">
                    {cell}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The rule table: the only block permitted to state a live policy value.
 *
 * A fact the published policy does not carry renders « non publié » rather
 * than a plausible number. That is the whole point — an article stating a
 * limit no engine enforces is a promise WARIBA has not made.
 */
function RuleTable({
  caption,
  facts,
  policyFacts,
}: {
  caption?: string;
  facts: readonly HelpFactKey[];
  policyFacts: HelpPolicyFacts;
}) {
  const resolved: HelpFact[] = facts
    .map((key) => policyFacts.facts[key])
    .filter((fact): fact is HelpFact => fact !== undefined);

  return (
    <div
      data-testid="help-rule-table"
      className="rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-cobalt-700)] bg-[color:var(--wariba-color-ink-900)] p-4 sm:p-5"
    >
      <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-cobalt-300)]">
        {caption ?? 'Valeurs de la policy publiée'}
      </p>
      <dl className="mt-3 flex flex-col divide-y divide-[color:var(--wariba-color-ink-700)]">
        {resolved.map((fact) => (
          <div key={fact.key} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-100)]">
                {fact.label}
              </dt>
              <dd
                data-fact={fact.key}
                data-published={fact.value !== null}
                className={`wariba-data text-[length:var(--wariba-font-size-body-md)] font-semibold ${
                  fact.value === null
                    ? 'text-[color:var(--wariba-color-ink-300)]'
                    : 'text-[color:var(--wariba-color-bone-50)]'
                }`}
              >
                {fact.value ?? HELP_FACT_UNPUBLISHED}
              </dd>
            </div>
            <p className="max-w-[68ch] text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
              {fact.explanation}
            </p>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function HelpBlocks({
  blocks,
  policyFacts,
}: {
  blocks: readonly HelpBlock[];
  policyFacts: HelpPolicyFacts;
}) {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <h2
                key={index}
                className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]"
              >
                {resolveHelpFacts(block.text, policyFacts)}
              </h2>
            );

          case 'paragraph':
            return (
              <p key={index} className={`max-w-[70ch] ${PROSE}`}>
                <Emphasised text={resolveHelpFacts(block.text, policyFacts)} />
              </p>
            );

          case 'list':
            return block.ordered ? (
              <ol
                key={index}
                className={`flex max-w-[70ch] list-decimal flex-col gap-2 pl-5 ${PROSE}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Emphasised text={resolveHelpFacts(item, policyFacts)} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul
                key={index}
                className={`flex max-w-[70ch] list-disc flex-col gap-2 pl-5 ${PROSE}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Emphasised text={resolveHelpFacts(item, policyFacts)} />
                  </li>
                ))}
              </ul>
            );

          case 'table':
            return (
              <ResponsiveTable
                key={index}
                {...(block.caption ? { caption: block.caption } : {})}
                columns={block.columns}
                rows={block.rows}
              />
            );

          case 'ruleTable':
            return (
              <RuleTable
                key={index}
                {...(block.caption ? { caption: block.caption } : {})}
                facts={block.facts}
                policyFacts={policyFacts}
              />
            );

          case 'formula':
            return (
              <figure key={index} data-testid="help-formula">
                {/* Scrollable rather than wrapped: a formula broken across
                    lines at 320px reads as two formulas. */}
                <div className="overflow-x-auto rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-900)] px-4 py-3">
                  <code className="wariba-data whitespace-nowrap text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-bone-50)]">
                    {block.expression}
                  </code>
                </div>
                {block.caption ? (
                  <figcaption className="mt-2 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            );

          case 'example':
            return (
              <div
                key={index}
                data-testid="help-example"
                className="rounded-[var(--wariba-radius-xl)] border border-dashed border-[color:var(--wariba-color-ink-600)] p-4 sm:p-5"
              >
                <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
                  Exemple
                </p>
                <p className="mt-2 text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
                  {block.title}
                </p>
                <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-100)]">
                  {block.lines.map((line, lineIndex) => (
                    <li key={lineIndex} className="wariba-data">
                      {line}
                    </li>
                  ))}
                </ul>
                {block.conclusion ? (
                  <p className="mt-3 max-w-[68ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-200)]">
                    {block.conclusion}
                  </p>
                ) : null}
                {/* Said every time, not once at the top of the page. A reader
                    who lands mid-article must not take an illustration for a
                    limit their own account is measured against. */}
                <p className="mt-3 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                  Chiffres illustratifs. Les valeurs de votre compte sont celles affichées dans le
                  Hub.
                </p>
              </div>
            );

          case 'callout': {
            const tone = CALLOUT_TONE[block.tone];
            return (
              <aside
                key={index}
                data-testid="help-callout"
                data-tone={block.tone}
                className="rounded-[var(--wariba-radius-xl)] border-l-4 px-4 py-3.5 sm:px-5"
                style={{ borderLeftColor: tone.border, background: tone.wash }}
              >
                {/* The tone is written, not only coloured. */}
                <p
                  className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)]"
                  style={{ color: tone.text }}
                >
                  {tone.label}
                </p>
                <p className="mt-1.5 text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
                  {block.title}
                </p>
                <p className="mt-1 max-w-[68ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-100)]">
                  <Emphasised text={resolveHelpFacts(block.text, policyFacts)} />
                </p>
              </aside>
            );
          }
        }
      })}
    </div>
  );
}
