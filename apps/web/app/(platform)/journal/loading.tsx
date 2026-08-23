import { Skeleton } from '@wariba/ui';

/**
 * The journal, while it loads.
 *
 * Switcher, filters, the summary strip, then the record itself. The last block
 * is one tall panel rather than a stack of row-shaped placeholders: the table
 * renders inside a single surface at `lg` and up, and drawing eleven separate
 * cards would promise the mobile layout to a desktop reader.
 */
export default function JournalLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Skeleton height="56px" rounded="lg" />
      <Skeleton height="88px" rounded="lg" />

      {/* The four-figure summary over the filtered set. */}
      <Skeleton height="104px" rounded="lg" />

      {/* The record. */}
      <Skeleton height="520px" rounded="lg" />
    </div>
  );
}
