'use client';

import { useId, useState } from 'react';
import { Input } from '@wariba/ui';

interface PasswordFieldProps {
  label: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  helperText?: string;
  errorText?: string;
  required?: boolean;
  defaultValue?: string;
}

/**
 * A password input with a visibility control.
 *
 * Wraps the design-system `Input` rather than reimplementing a field, so the
 * label, `aria-describedby` wiring, error treatment and focus ring stay
 * identical to every other input in the product. The only thing added is the
 * button, positioned over the input's own row.
 *
 * What it deliberately does not do: block paste, block password managers, or
 * strip autocomplete. Those are security theatre — they push people toward
 * shorter, memorable, reused passwords, which is the outcome they claim to
 * prevent. `autoComplete` is required rather than optional so a caller cannot
 * quietly omit it.
 */
export function PasswordField({
  label,
  name,
  autoComplete,
  helperText,
  errorText,
  required = false,
  defaultValue,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const id = useId();

  return (
    <div className="relative">
      <Input
        id={id}
        label={label}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        className="pr-12"
        onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
        onBlur={() => setCapsLock(false)}
        {...(defaultValue === undefined ? {} : { defaultValue })}
        {...(helperText === undefined ? {} : { helperText })}
        {...(capsLock && errorText === undefined
          ? { helperText: 'Verrouillage majuscules activé.' }
          : {})}
        {...(errorText === undefined ? {} : { errorText })}
      />
      <button
        type="button"
        aria-controls={id}
        aria-pressed={visible}
        // The accessible name states the action, not the state, so voice
        // control and screen readers get an instruction rather than a riddle.
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        onClick={() => setVisible((current) => !current)}
        className="absolute bottom-0 right-0 flex h-[var(--wariba-component-input-height)] w-12 items-center justify-center rounded-r-[var(--wariba-component-input-radius)] text-[color:var(--wariba-text-secondary)] transition-colors hover:text-[color:var(--wariba-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="20"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
          viewBox="0 0 24 24"
          width="20"
        >
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3.1" />
          {visible ? <path d="M4 20 20 4" /> : null}
        </svg>
      </button>
    </div>
  );
}
