import Link from 'next/link';
import { Badge, buttonClassNames, Text } from '@wariba/ui';
import { WariXPreview } from './WariXPreview';

export default function WariXPage() {
  return (
    <>
      <section className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Badge variant="information">Terminal WARIBA · web responsive</Badge>
              <h1 className="mt-6 text-[length:var(--wariba-font-size-display-lg)] font-semibold leading-[var(--wariba-line-height-display-lg)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-bone-50)] sm:text-[length:var(--wariba-font-size-display-xl)] sm:leading-[var(--wariba-line-height-display-xl)]">
                Tradez dans WariX. Gardez le risque en face de vous.
              </h1>
              <p className="mt-6 text-[length:var(--wariba-font-size-body-lg)] text-[color:var(--wariba-color-ink-200)]">
                WariX est le terminal de trading simulé de WARIBA. Il relie l’exécution, la policy
                du compte, les limites de risque et les preuves dans un même espace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/offres" className={buttonClassNames({ size: 'lg' })}>
                  Choisir une évaluation
                </Link>
                <Link
                  href="/programme"
                  className={buttonClassNames({ size: 'lg', variant: 'secondary' })}
                >
                  Comprendre les règles
                </Link>
              </div>
            </div>
            <WariXPreview />
          </div>
        </div>
      </section>

      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-50)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <Text variant="label-sm" color="secondary">
              Une interface, trois responsabilités
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-ink-950)]">
              Décider, exécuter, vérifier.
            </h2>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              [
                'Décider avec le contexte',
                'Balance, equity, policy, Daily Loss et Maximum Loss restent accessibles avant l’ordre.',
              ],
              [
                'Exécuter côté serveur',
                'Le navigateur n’envoie jamais un prix autoritaire. Le serveur contrôle spread, slippage et fill.',
              ],
              [
                'Vérifier après coup',
                'Ordres, fills, positions, commissions et séquences sont conservés pour le replay et les disputes.',
              ],
            ].map(([title, body]) => (
              <article
                key={title}
                className="border-t border-[color:var(--wariba-color-bone-300)] pt-5"
              >
                <h3 className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-ink-950)]">
                  {title}
                </h3>
                <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-600)]">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--wariba-color-ink-900)]">
        <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
              Cinq instruments sandbox
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
              Un périmètre volontairement réduit.
            </h2>
          </div>
          <div className="grid grid-cols-2 border-l border-t border-[color:var(--wariba-color-ink-600)] sm:grid-cols-3">
            {['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100'].map((symbol) => (
              <div
                key={symbol}
                className="wariba-data border-b border-r border-[color:var(--wariba-color-ink-600)] p-5 text-[color:var(--wariba-color-bone-50)]"
              >
                {symbol}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-100)]">
        <div className="mx-auto flex max-w-[var(--wariba-size-marketing-container-max)] flex-col items-start gap-6 px-4 py-20 sm:px-6 lg:py-28">
          <Text variant="label-sm" color="secondary">
            WariX reste un environnement simulé
          </Text>
          <h2 className="max-w-4xl text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-ink-950)]">
            Les prix, ordres et balances affichés ne représentent pas un marché ou un compte réel.
          </h2>
          <p className="max-w-3xl text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-color-ink-600)]">
            Le sandbox déterministe permet de tester l’exécution, les erreurs, les limites et la
            résynchronisation sans présenter ces données comme réelles.
          </p>
          <Link href="/aide" className={buttonClassNames({ size: 'lg' })}>
            Lire les réponses WariX
          </Link>
        </div>
      </section>
    </>
  );
}
