import Link from 'next/link';
import { buttonClassNames, Text } from '@wariba/ui';
import { HelpCenterClient } from './HelpCenterClient';

export default function HelpPage() {
  return (
    <>
      <section className="border-b border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
            Centre d’aide WARIBA
          </Text>
          <h1 className="mt-4 text-[length:var(--wariba-font-size-display-lg)] font-semibold leading-[var(--wariba-line-height-display-lg)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-bone-50)] sm:text-[length:var(--wariba-font-size-display-xl)] sm:leading-[var(--wariba-line-height-display-xl)]">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[length:var(--wariba-font-size-body-lg)] text-[color:var(--wariba-color-ink-200)]">
            Règles v1.1, prix FCFA, WariX, Evaluation, Performance et nature simulée.
          </p>
        </div>
      </section>
      <section className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 pb-20 sm:px-6 lg:pb-28">
          <HelpCenterClient />
        </div>
      </section>
      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-100)]">
        <div className="mx-auto flex max-w-[var(--wariba-size-marketing-container-max)] flex-col items-start gap-5 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div>
            <h2 className="text-[length:var(--wariba-font-size-heading-lg)] font-semibold text-[color:var(--wariba-color-ink-950)]">
              Vous ne trouvez pas votre réponse ?
            </h2>
            <p className="mt-2 text-[color:var(--wariba-color-ink-600)]">
              Le support prend le relais pour les cas liés à un compte ou à une preuve.
            </p>
          </div>
          <Link href="/support" className={buttonClassNames({ size: 'lg' })}>
            Ouvrir le support
          </Link>
        </div>
      </section>
    </>
  );
}
