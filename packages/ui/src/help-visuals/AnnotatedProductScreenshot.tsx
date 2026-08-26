import type { ProductScreenshotModel } from './types';
import { VisualFrame } from './visual-primitives';

export function AnnotatedProductScreenshot({ model }: { model: ProductScreenshotModel }) {
  return (
    <VisualFrame
      id={model.id}
      title={model.title}
      summary={model.summary}
      textEquivalent={`${model.alt} Repères : ${model.callouts.map((callout) => `${callout.id}. ${callout.label}`).join(' ; ')}.`}
    >
      <div className="overflow-hidden rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)]">
        <div className="relative mx-auto w-fit max-w-full">
          <picture>
            {model.mobileSrc ? (
              <source media="(max-width: 639px)" srcSet={model.mobileSrc} />
            ) : null}
            <img
              src={model.src}
              alt={model.alt}
              loading="lazy"
              decoding="async"
              className="mx-auto block h-auto max-h-[46rem] w-auto max-w-full object-contain"
            />
          </picture>
          <ol aria-hidden="true" className="absolute inset-0 hidden sm:block">
            {model.callouts.map((callout) => (
              <li
                key={callout.id}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${callout.x}%`, top: `${callout.y}%` }}
              >
                <span className="wariba-data help-screenshot-pin flex size-8 items-center justify-center rounded-full border border-[color:var(--wariba-color-cobalt-300)] bg-[color:var(--wariba-color-ink-950)] text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-color-cobalt-300)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--wariba-color-ink-950)_74%,transparent)]">
                  {callout.id}
                </span>
                <span className="hidden">{callout.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Repères de la capture">
        {model.callouts.map((callout) => (
          <li
            key={callout.id}
            className="help-visual-node flex items-center gap-3 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)] p-3"
          >
            <span className="wariba-data flex size-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--wariba-color-cobalt-700)] text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-color-cobalt-300)]">
              {callout.id}
            </span>
            <span className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-color-bone-50)]">
              {callout.label}
            </span>
          </li>
        ))}
      </ol>
    </VisualFrame>
  );
}
