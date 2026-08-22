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
 * The one password input the product uses, everywhere it asks for a password.
 *
 * Wraps the design-system `Input` rather than reimplementing a field, so the
 * label, error treatment and focus ring stay identical to every other input in
 * the product. The only thing added is the visibility control.
 *
 * ## Where the eye sits
 *
 * Inside the field, always. `Input` renders helper and error text as siblings
 * *below* the control, so a button absolutely positioned against the bottom of
 * the whole component drifts down whenever there is help to show — which is
 * exactly the screen where a password field has requirements under it. On the
 * signup form that put the eye level with "Au moins 12 caractères…", floating
 * beside prose instead of anchored in the input it belongs to.
 *
 * The fix is structural rather than a magic offset: the positioning context
 * wraps the control alone, and this component renders the help beneath it
 * itself. `aria-describedby` is wired by hand to keep that text attached to
 * the input for assistive technology — moving something visually must never
 * detach it semantically.
 *
 * ## What it deliberately does not do
 *
 * Block paste, block password managers, or strip autocomplete. Those are
 * security theatre: they push people toward shorter, memorable, reused
 * passwords, which is the outcome they claim to prevent. `autoComplete` is
 * required rather than optional so a caller cannot quietly omit it.
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

  // Caps lock replaces the helper line rather than adding a third row: the
  // field is already tall, and the warning matters more than the reminder for
  // as long as it is true.
  const help = capsLock ? 'Verrouillage majuscules activé.' : helperText;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-[var(--wariba-component-input-label-gap)]">
      {/* The positioning context stops at the control. Help and error live
          outside it, so the eye cannot follow them down the page. */}
      <div className="relative">
        <Input
          id={id}
          label={label}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          className="pr-12"
          aria-describedby={describedBy}
          aria-invalid={errorText ? true : undefined}
          onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
          onBlur={() => setCapsLock(false)}
          {...(defaultValue === undefined ? {} : { defaultValue })}
        />
        <button
          type="button"
          aria-controls={id}
          aria-pressed={visible}
          // The accessible name states the action, not the state, so voice
          // control and screen readers get an instruction rather than a riddle.
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          data-testid={`password-toggle-${name}`}
          onClick={() => setVisible((current) => !current)}
          className="absolute bottom-0 right-0 flex h-[var(--wariba-component-input-height)] w-12 items-center justify-center rounded-r-[var(--wariba-component-input-radius)] text-[color:var(--wariba-text-secondary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:text-[color:var(--wariba-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
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

      {help ? (
        <p
          id={helpId}
          className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]"
        >
          {help}
        </p>
      ) : null}

      {errorText ? (
        <p
          id={errorId}
          role="alert"
          className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-status-danger-text)]"
        >
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
