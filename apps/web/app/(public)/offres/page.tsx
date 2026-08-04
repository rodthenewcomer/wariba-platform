import Link from 'next/link';
import { Badge, buttonClassNames, Text } from '@wariba/ui';
import { listActiveProducts } from '@wariba/application';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

const USD_EQUIVALENT: Record<string, string> = {
  '5K': '≈ 39 USD',
  '10K': '≈ 69 USD',
  '25K': '≈ 148 USD',
  '50K': '≈ 252 USD',
  '100K': '≈ 452 USD',
};

function formatFcfa(amount: string): string {
  return `${Number.parseInt(amount, 10).toLocaleString('fr-FR')} FCFA`;
}

function formatUsd(amount: string): string {
  return `${Number.parseInt(amount, 10).toLocaleString('fr-FR')} USD`;
}

export default async function OffersPage() {
  const offers = await listActiveProducts(getDb());

  return (
    <>
      <section className="border-b border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <Badge variant="information">Bêta privée · cinq tailles sandbox</Badge>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <h1 className="max-w-4xl text-[length:var(--wariba-font-size-display-lg)] font-semibold leading-[var(--wariba-line-height-display-lg)] text-[color:var(--wariba-color-bone-50)] sm:text-[length:var(--wariba-font-size-display-xl)] sm:leading-[var(--wariba-line-height-display-xl)]">
              Choisissez une taille. Gardez les mêmes règles.
            </h1>
            <div>
              <p className="text-[length:var(--wariba-font-size-body-lg)] text-[color:var(--wariba-color-ink-200)]">
                Le prix contractuel et le règlement sont en FCFA. L’équivalent USD est informatif et
                le montant final ne change pas au checkout.
              </p>
              <p className="mt-4 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-copper-300)]">
                Prix candidats · vente publique non ouverte
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <article
                key={offer.code}
                data-product-code={offer.code}
                className={`flex min-h-[430px] flex-col rounded-[var(--wariba-radius-2xl)] border p-6 sm:p-7 ${
                  offer.code === '10K'
                    ? 'border-[color:var(--wariba-color-cobalt-400)] bg-[color:var(--wariba-color-cobalt-900)]'
                    : 'border-[color:var(--wariba-color-ink-600)] bg-[color:var(--wariba-color-ink-900)]'
                }`}
              >
                <div className="flex min-h-8 items-start justify-between gap-3">
                  <Text variant="label-sm" className="text-[color:var(--wariba-color-ink-200)]">
                    WARIBA ONE
                  </Text>
                  {offer.code === '10K' && <Badge variant="information">Offre principale</Badge>}
                </div>
                <p className="wariba-data mt-6 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
                  {offer.code}
                </p>
                <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-200)]">
                  {formatUsd(offer.nominalBalance)} simulés
                </p>
                <div className="mt-7 border-t border-[color:var(--wariba-color-ink-600)] pt-6">
                  <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
                    Prix public candidat
                  </p>
                  <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-bone-50)]">
                    {formatFcfa(offer.priceAmount)}
                  </p>
                  <p className="mt-1 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
                    {USD_EQUIVALENT[offer.code]} · informatif uniquement
                  </p>
                </div>
                <ul className="mt-6 grid gap-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-100)]">
                  <li>Objectif réalisé : 10 %</li>
                  <li>Daily Loss : 3 % soft lock</li>
                  <li>Maximum Loss : 10 % EOD trailing</li>
                  <li>Best Day Rule : 50 % non-breach</li>
                  <li>Aucun minimum de jours</li>
                </ul>
                <Link
                  href={`/checkout?product=${offer.code}`}
                  className={buttonClassNames({ size: 'lg', className: 'mt-auto w-full' })}
                >
                  Commencer avec {offer.code}
                </Link>
                <p className="mt-3 text-center text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                  Aucun frais d’activation
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10 grid gap-4 border-t border-[color:var(--wariba-color-ink-700)] pt-8 sm:grid-cols-3">
            {[
              ['Prix final', 'Figé en FCFA au checkout'],
              ['Prix fondateur', 'Jamais exposé sans cohorte réelle activée'],
              ['Policy', 'Version acceptée et attachée au compte'],
            ].map(([label, value]) => (
              <div key={label}>
                <Text variant="label-sm" className="text-[color:var(--wariba-color-ink-300)]">
                  {label}
                </Text>
                <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-100)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
