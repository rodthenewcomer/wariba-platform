'use client';

import { useId, useMemo } from 'react';
import { deriveQuantityPresets, quantityDisplayScale, stepQuantity } from '@wariba/domain';
import type { SymbolSpec } from '@wariba/contracts';

export interface QuantityControlProps {
  spec: SymbolSpec | undefined;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

/**
 * One end of the stepper. Deliberately not a standalone bordered button: it is a
 * key inside the quantity instrument, separated from the value by a hairline
 * rather than by a gap, which is what makes the three parts read as one control.
 */
function StepButton({
  label,
  glyph,
  disabled,
  onPress,
  testId,
  side,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
  testId: string;
  side: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={onPress}
      className={[
        'flex h-12 w-12 shrink-0 items-center justify-center lg:h-9 lg:w-9',
        side === 'left'
          ? 'border-r border-[color:var(--wariba-component-workstation-border-hairline)]'
          : 'border-l border-[color:var(--wariba-component-workstation-border-hairline)]',
        'text-[length:var(--wariba-component-workstation-type-decision)] font-semibold leading-none',
        'text-[color:var(--wariba-component-workstation-text-secondary)]',
        'transition-[background-color,color] duration-[var(--wariba-component-workstation-motion-interaction)]',
        'hover:enabled:bg-[color:var(--wariba-component-workstation-surface-control-hover)]',
        'hover:enabled:text-[color:var(--wariba-component-workstation-text-primary)]',
        'active:enabled:bg-[color:var(--wariba-component-workstation-interaction-pressed)]',
        'disabled:cursor-not-allowed disabled:text-[color:var(--wariba-component-workstation-border-strong)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
      ].join(' ')}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}

/**
 * W4 §21/§22/§24/§66 — stepper, free text, and quick presets over one value.
 *
 * **Decimal-safe by construction.** `−` and `+` call `stepQuantity`
 * (@wariba/domain), which walks the valid lattice `minimum + k × step` with
 * decimal.js. The browser package has no decimal.js of its own, so doing this
 * locally would have meant binary floats and `0.1 + 0.2 = 0.30000000000000004`
 * in a lot-size field.
 *
 * **Typing is never rewritten.** The field holds exactly what the trader
 * typed, validated but not normalized — no snapping on blur, no reformatting
 * between keystrokes, so the caret never jumps (§66). Normalization happens
 * only where the trader asked for a specific value: a stepper press or a
 * preset. An out-of-bounds or malformed entry shows its error and the server
 * remains the final authority.
 *
 * **Presets are shortcuts, not sizing.** They are derived from the
 * instrument's own minimum and step and know nothing about balance, risk
 * budget or stop distance (§23). Each is displayed as the actual quantity it
 * submits, never as a multiplier label, and each is re-validated against
 * `isQuantityWithinBounds` before it is offered.
 */
export function QuantityControl({ spec, value, onChange, error }: QuantityControlProps) {
  const fieldId = useId();
  const errorId = error ? `${fieldId}-error` : undefined;
  const presets = useMemo(
    () =>
      spec
        ? deriveQuantityPresets({
            minimumQuantity: spec.minimumQuantity,
            maximumQuantity: spec.maximumQuantity,
            quantityStep: spec.quantityStep,
          })
        : [],
    [spec],
  );

  /** The instrument's bounds at their own meaningful scale — no column padding. */
  const bounds = useMemo(() => {
    if (!spec) return null;
    const scale = quantityDisplayScale({
      minimumQuantity: spec.minimumQuantity,
      maximumQuantity: spec.maximumQuantity,
      quantityStep: spec.quantityStep,
    });
    const at = (value: string): string => Number(value).toFixed(scale);
    return {
      step: at(spec.quantityStep),
      minimum: at(spec.minimumQuantity),
      maximum: at(spec.maximumQuantity),
    };
  }, [spec]);

  const step = (direction: 1 | -1): string | null => {
    if (!spec) return null;
    return stepQuantity({
      quantity: value,
      direction,
      minimumQuantity: spec.minimumQuantity,
      maximumQuantity: spec.maximumQuantity,
      quantityStep: spec.quantityStep,
    });
  };

  const decreased = step(-1);
  const increased = step(1);

  return (
    <div className="flex flex-col gap-1.5">
      {/*
       * Visual closure §12D — one instrument, not three controls in a row.
       *
       * WX1 drew a bordered square, a bordered field and a bordered square with
       * gaps between them: three widgets that happened to be adjacent. They are
       * now one enclosure with hairline-separated keys, the value centred at the
       * largest type in the section, and the unit inside the field rather than
       * in a caption below it. That is what makes "how much" the loudest
       * question in the middle of the panel.
       */}
      <label htmlFor={fieldId} className="sr-only">
        Quantité (lots)
      </label>
      <div
        className={`flex h-12 items-stretch overflow-hidden rounded-[9px] bg-[color:var(--wariba-component-workstation-surface-canvas)] ring-1 ring-inset transition-[box-shadow] duration-[var(--wariba-component-workstation-motion-interaction)] focus-within:ring-2 lg:h-9 ${
          error
            ? 'ring-[color:var(--wariba-component-workstation-trading-rejection)]'
            : 'ring-[color:var(--wariba-component-workstation-border-hairline)] focus-within:ring-[color:var(--wariba-component-workstation-border-focus)]'
        }`}
      >
        <StepButton
          label="Diminuer la quantité"
          glyph="−"
          testId="quantity-decrement"
          side="left"
          disabled={decreased === null || decreased === value}
          onPress={() => decreased && onChange(decreased)}
        />
        <div className="relative flex min-w-0 flex-1 items-center">
          <input
            id={fieldId}
            type="text"
            inputMode="decimal"
            name="quantity"
            data-testid="quantity-input"
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            className="wariba-data h-full min-w-0 w-full border-0 bg-transparent pl-1.5 pr-7 text-center text-[length:var(--wariba-font-size-body-lg)] font-semibold tabular-nums text-[color:var(--wariba-component-workstation-text-primary)] focus:outline-none lg:text-[length:var(--wariba-component-workstation-type-data-strong)]"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 text-[length:var(--wariba-component-workstation-type-meta)] font-semibold uppercase tracking-[var(--wariba-component-workstation-tracking-label)] text-[color:var(--wariba-component-workstation-text-tertiary)]"
          >
            lots
          </span>
        </div>
        <StepButton
          label="Augmenter la quantité"
          glyph="+"
          testId="quantity-increment"
          side="right"
          disabled={increased === null || increased === value}
          onPress={() => increased && onChange(increased)}
        />
      </div>

      {error ? (
        <p
          id={errorId}
          className="text-[length:var(--wariba-component-workstation-type-label)] leading-snug text-[color:var(--wariba-component-workstation-trading-rejection)]"
        >
          {error}
        </p>
      ) : null}

      {presets.length > 0 ? (
        <div className="flex gap-1" role="group" aria-label="Quantités rapides">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={`Quantité ${preset} lots`}
              aria-pressed={value.trim() === preset}
              onClick={() => onChange(preset)}
              className={[
                'wariba-data min-h-11 flex-1 rounded-[7px] px-1 py-1 lg:min-h-7 lg:py-0.5',
                'text-[length:var(--wariba-component-workstation-type-data)] font-semibold tabular-nums',
                'transition-[background-color,color,box-shadow] duration-[var(--wariba-component-workstation-motion-interaction)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-component-workstation-border-focus)]',
                // WX1 pointed these at `--wariba-surface-selected`, which is not
                // a token this design system defines — so the selected preset
                // and the hover state both rendered as no background at all.
                value.trim() === preset
                  ? 'bg-[color:var(--wariba-component-workstation-wash-selected-strong)] text-[color:var(--wariba-component-workstation-interaction-selected-text)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-border-selected)]'
                  : 'bg-[color:var(--wariba-component-workstation-surface-control)] text-[color:var(--wariba-component-workstation-text-secondary)] hover:bg-[color:var(--wariba-component-workstation-surface-control-hover)] hover:text-[color:var(--wariba-component-workstation-text-primary)]',
              ].join(' ')}
            >
              {preset}
            </button>
          ))}
        </div>
      ) : null}

      {/*
       * Visual closure §7 — the same three facts, at a tenth of the noise.
       *
       * "Pas 0.0100 · Min 0.0100 · Max 10.0000" was persistent body copy
       * carrying the database's `numeric(14,4)` padding into the interface: four
       * decimals on a two-decimal instrument, three labels, a full 14px line.
       * Nothing is hidden — step, minimum and maximum are all still on screen,
       * and the accessible title spells them out in words — but they are now
       * metadata rather than a sentence.
       *
       * The padding is stripped with `quantityDisplayScale` (@wariba/domain),
       * the same helper the stepper formats with, so the bounds shown and the
       * values the steppers produce cannot print differently.
       */}
      {spec ? (
        <p
          data-testid="quantity-bounds"
          title={`Pas de ${bounds?.step}, minimum ${bounds?.minimum}, maximum ${bounds?.maximum} lots`}
          className="wariba-data text-[length:var(--wariba-component-workstation-type-meta)] tabular-nums text-[color:var(--wariba-component-workstation-text-tertiary)]"
        >
          Pas {bounds?.step} · {bounds?.minimum}–{bounds?.maximum}
        </p>
      ) : null}
    </div>
  );
}
