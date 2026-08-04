import Link from 'next/link';
import { Badge, buttonClassNames, Text } from '@wariba/ui';

const EVALUATION_RULES = [
  ['Objectif', '10 % de profit net réalisé'],
  ['Daily Loss Limit', '3 % · soft lock au reset suivant'],
  ['Maximum Loss', '10 % · plancher EOD trailing'],
  ['Best Day Rule', '50 % · bloque le passage, jamais un breach'],
  ['Minimum de jours', 'Aucun'],
  ['Journées qualifiées', 'Aucune en Evaluation'],
  ['Limite de temps', 'Aucune · inactivité après 30 jours'],
  ['Positions', 'Overnight autorisé · weekend interdit'],
] as const;

const PERFORMANCE_THRESHOLDS = [
  ['5K', '500 USD', '25 USD'],
  ['10K', '1 000 USD', '50 USD'],
  ['25K', '2 500 USD', '125 USD'],
  ['50K', '5 000 USD', '250 USD'],
  ['100K', '10 000 USD', '500 USD'],
] as const;

export default function ProgramPage() {
  return (
    <>
      <section className="border-b border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <Badge variant="information">WARIBA ONE · Rules v1.1</Badge>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <h1 className="max-w-4xl text-[length:var(--wariba-font-size-display-lg)] font-semibold leading-[var(--wariba-line-height-display-lg)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-bone-50)] sm:text-[length:var(--wariba-font-size-display-xl)] sm:leading-[var(--wariba-line-height-display-xl)]">
              Un programme pour construire des preuves, pas raconter une performance.
            </h1>
            <div>
              <p className="text-[length:var(--wariba-font-size-body-lg)] leading-[var(--wariba-line-height-body-lg)] text-[color:var(--wariba-color-ink-200)]">
                Evaluation, Performance, Review : chaque étape a un objectif précis, une policy
                versionnée et des conditions visibles.
              </p>
              <Link href="/offres" className={buttonClassNames({ size: 'lg', className: 'mt-6' })}>
                Voir les cinq offres
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--wariba-color-ink-900)]">
        <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] gap-4 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:py-24">
          {[
            [
              '01',
              'Evaluation',
              'Atteignez 10 % réalisé avec une Best Day Rule à 50 % et sans hard breach.',
            ],
            [
              '02',
              'Performance',
              'Construisez une fois un buffer permanent de 10 %, puis démontrez cinq journées reproductibles.',
            ],
            [
              '03',
              'Review',
              'Après cinq payouts conformes, vos preuves sont examinées. Aucun compte Live automatique.',
            ],
          ].map(([number, title, body]) => (
            <article
              key={title}
              className="min-h-72 rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-950)] p-7"
            >
              <p className="wariba-data text-[color:var(--wariba-color-cobalt-300)]">{number}</p>
              <h2 className="mt-5 text-[length:var(--wariba-font-size-heading-xl)] font-semibold text-[color:var(--wariba-color-bone-50)]">
                {title}
              </h2>
              <p className="mt-4 text-[length:var(--wariba-font-size-body-md)] leading-[var(--wariba-line-height-body-md)] text-[color:var(--wariba-color-ink-200)]">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="evaluation"
        data-theme="light"
        className="scroll-mt-20 bg-[color:var(--wariba-color-bone-50)]"
      >
        <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div>
            <Text variant="label-sm" color="secondary">
              Etape 1
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-ink-950)]">
              WARIBA ONE : une seule phase.
            </h2>
            <p className="mt-5 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-color-ink-600)]">
              Le passage utilise exclusivement le profit net réalisé. Le PnL latent ne compte pas,
              et aucune position ni ordre en attente ne peut rester ouvert au moment du passage.
            </p>
          </div>
          <dl
            id="regles"
            className="scroll-mt-20 border-t border-[color:var(--wariba-color-bone-300)]"
          >
            {EVALUATION_RULES.map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 border-b border-[color:var(--wariba-color-bone-300)] py-5 sm:grid-cols-[0.8fr_1.2fr]"
              >
                <dt className="font-semibold text-[color:var(--wariba-color-ink-950)]">{label}</dt>
                <dd className="text-[color:var(--wariba-color-ink-600)]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-[color:var(--wariba-color-cobalt-900)]">
        <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-200)]">
              Maximum Loss 10 % EOD trailing
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
              Le plancher ne bouge qu’après une journée finalisée.
            </h2>
          </div>
          <div className="rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-cobalt-400)] bg-[color:var(--wariba-color-ink-950)] p-6 sm:p-8">
            <p className="text-[length:var(--wariba-font-size-body-md)] leading-[var(--wariba-line-height-body-lg)] text-[color:var(--wariba-color-bone-50)]">
              Le nouveau plancher retient toujours la valeur la plus protectrice pour le trader :
              il ne peut que monter, jamais redescendre.
            </p>
            <p className="wariba-data mt-3 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
              plancher = min(nominal, max(ancien plancher, plus haute balance EOD − 10 % du
              nominal))
            </p>
            <ul className="mt-6 grid gap-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-200)]">
              <li>Il ne redescend jamais.</li>
              <li>Il se verrouille définitivement à la balance nominale.</li>
              <li>L’equity est contrôlée en temps réel contre ce plancher.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="performance" className="scroll-mt-20 bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Text variant="label-sm" className="text-[color:var(--wariba-color-success-100)]">
                Etape 2 · à venir
              </Text>
              <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
                Construisez d’abord votre base.
              </h2>
              <p className="mt-5 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-color-ink-200)]">
                Le buffer permanent vaut 10 % du nominal. Il est construit une seule fois, ne peut
                jamais être retiré et ne doit pas être reconstruit après chaque payout.
              </p>
            </div>
            <div className="overflow-x-auto rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-ink-700)]">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead className="bg-[color:var(--wariba-color-ink-800)] text-[color:var(--wariba-color-ink-200)]">
                  <tr>
                    <th className="p-4">Compte</th>
                    <th className="p-4">Buffer permanent</th>
                    <th className="p-4">Minimum par Performance Day</th>
                  </tr>
                </thead>
                <tbody>
                  {PERFORMANCE_THRESHOLDS.map(([account, buffer, day]) => (
                    <tr
                      key={account}
                      className="border-t border-[color:var(--wariba-color-ink-700)]"
                    >
                      <td className="wariba-data p-4 text-[color:var(--wariba-color-bone-50)]">
                        {account}
                      </td>
                      <td className="wariba-data p-4 text-[color:var(--wariba-color-ink-100)]">
                        {buffer}
                      </td>
                      <td className="wariba-data p-4 text-[color:var(--wariba-color-ink-100)]">
                        {day}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              [
                '5 nouvelles journées',
                'Chaque payout exige des Performance Days finalisées et non réutilisées.',
              ],
              [
                '85/15 puis 90/10',
                'Le trader reçoit 85 % sur les payouts 1 à 4, puis 90 % au payout 5.',
              ],
              [
                'Excédent seulement',
                'Seul le profit réalisé au-dessus du buffer devient éligible, sous le cap applicable.',
              ],
            ].map(([title, body]) => (
              <div key={title} className="border-t border-[color:var(--wariba-color-ink-600)] pt-5">
                <h3 className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
                  {title}
                </h3>
                <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-200)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="review"
        data-theme="light"
        className="scroll-mt-20 bg-[color:var(--wariba-color-bone-100)]"
      >
        <div className="mx-auto flex max-w-[var(--wariba-size-marketing-container-max)] flex-col items-start gap-6 px-4 py-20 sm:px-6 lg:py-28">
          <Text variant="label-sm" color="secondary">
            Etape 3
          </Text>
          <h2 className="max-w-4xl text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-ink-950)]">
            Après le cinquième payout, le compte entre en WARIBA Review.
          </h2>
          <p className="max-w-3xl text-[length:var(--wariba-font-size-body-lg)] text-[color:var(--wariba-color-ink-600)]">
            Review est une évaluation des preuves et de l’intégrité du parcours. Elle ne promet ni
            sixième payout automatique, ni allocation Live, ni capital réel.
          </p>
          <Link href="/offres" className={buttonClassNames({ size: 'lg' })}>
            Choisir une taille de compte
          </Link>
        </div>
      </section>
    </>
  );
}
