'use client';

import { useMemo } from 'react';
import { Input } from '@wariba/ui';
import { deriveQuantityPresets, quantityDisplayScale, stepQuantity } from '@wariba/domain';
import type { SymbolSpec } from '@wariba/contracts';

export interface QuantityControlProps {
  spec: SymbolSpec | undefined;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

function StepButton({
  label,
  glyph,
  disabled,
  onPress,
  testId,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={onPress}
      className={[
        'h-[var(--wariba-component-input-height)] w-full',
        'rounded-[var(--wariba-component-input-radius)] border-[length:var(--wariba-component-input-border-width)]',
        'border-[color:var(--wariba-border-default)] bg-[color:var(--wariba-background-surface)]',
        'text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-text-primary)]',
        'hover:enabled:bg-[color:var(--wariba-surface-selected)]',
        'disabled:text-[color:var(--wariba-text-disabled)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-border-focus)]',
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
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-start gap-1.5">
        <StepButton
          label="Diminuer la quantité"
          glyph="−"
          testId="quantity-decrement"
          disabled={decreased === null || decreased === value}
          onPress={() => decreased && onChange(decreased)}
        />
        <Input
          label="Quantité (lots)"
          hideLabel
          type="text"
          inputMode="decimal"
          name="quantity"
          data-testid="quantity-input"
          className="wariba-data text-center"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...(error ? { errorText: error } : {})}
        />
        <StepButton
          label="Augmenter la quantité"
          glyph="+"
          testId="quantity-increment"
          disabled={increased === null || increased === value}
          onPress={() => increased && onChange(increased)}
        />
      </div>

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
                'wariba-data flex-1 rounded-[var(--wariba-radius-xs)] px-1.5 py-1',
                'text-[length:var(--wariba-font-size-data-xs)] transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--wariba-border-focus)]',
                value.trim() === preset
                  ? 'bg-[color:var(--wariba-surface-selected)] text-[color:var(--wariba-theme-text)]'
                  : 'text-[color:var(--wariba-text-secondary)] hover:bg-[color:var(--wariba-surface-selected)] hover:text-[color:var(--wariba-theme-text)]',
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
          className="wariba-data text-[length:var(--wariba-font-size-data-xs)] text-[color:var(--wariba-text-tertiary)]"
        >
          Pas {bounds?.step} · {bounds?.minimum}–{bounds?.maximum}
        </p>
      ) : null}
    </div>
  );
}
