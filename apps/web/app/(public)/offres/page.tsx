import Link from 'next/link';
import { Accordion, Badge, buttonClassNames, PricingCard, Text } from '@wariba/ui';
import { listActiveProducts } from '@wariba/application';
import { getDb } from '../../../lib/db';
import { formatFcfa, formatUsd, USD_EQUIVALENT } from '../../../lib/pricing-format';

export const dynamic = 'force-dynamic';

const OFFER_RULES = [
  'Objectif réalisé : 10 %',
  'Daily Loss : 3 % soft lock',
  'Maximum Loss : 10 % EOD trailing',
  'Best Day Rule : 50 % non-breach',
  'Aucun minimum de jours',
];

const RULES_GLOSSARY = [
  {
    question: 'Objectif de profit — 10 %',
    answer:
      'Vous devez réaliser 10 % de profit net sur la balance nominale. Seul le profit net réalisé compte ; le PnL latent n’entre jamais dans le calcul.',
  },
  {
    question: 'Daily Loss Limit — 3 % avec soft lock',
    answer:
      'Si la perte atteint 3 % de la balance nominale sur une journée, le compte passe en soft lock jusqu’au reset suivant : aucune nouvelle position, mais le compte n’est pas terminé pour autant.',
  },
  {
    question: 'Maximum Loss — 10 % EOD trailing',
    answer:
      'Le plancher démarre à 10 % sous le nominal et ne monte qu’après une journée finalisée — il ne redescend jamais. L’atteindre en temps réel termine le compte.',
  },
  {
    question: 'Best Day Rule — 50 % maximum',
    answer:
      'Votre meilleure journée ne peut pas représenter plus de 50 % du profit total. Un dépassement ne casse rien : il bloque seulement le passage, jusqu’au retour sous ce seuil.',
  },
] as const;

const PURCHASE_FAQ = [
  {
    question: 'Le prix affiché est-il définitif ?',
    answer:
      'Pas encore. Les prix actuels sont des prix candidats pour la bêta privée. Ils seront confirmés avant toute ouverture publique, et jamais modifiés a posteriori sur un compte déjà activé.',
  },
  {
    question: 'Puis-je payer en FCFA ?',
    answer:
      'Oui. Le prix contractuel et le règlement au checkout sont en FCFA. L’équivalent USD affiché est informatif uniquement et n’est jamais appliqué comme conversion.',
  },
  {
    question: 'Que se passe-t-il une fois l’Evaluation réussie ?',
    answer:
      'Le compte passe en Performance : un buffer permanent de 10 % se construit une seule fois, puis chaque cinq nouvelles journées rentables ouvrent droit à un payout, avec un partage jusqu’à 90/10.',
  },
  {
    question: 'Le trading est-il réel ?',
    answer:
      'Non. L’ensemble du parcours se déroule dans un environnement entièrement simulé. Les résultats obtenus en simulation ne garantissent aucun résultat futur.',
  },
] as const;

export default async function OffersPage() {
  const offers = await listActiveProducts(getDb());

  return (
    <>
      <section className="border-b border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <Badge variant="information">Bêta privée · cinq tailles actives</Badge>
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
                Prix candidats de la bêta privée · confirmés avant toute ouverture publique
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <PricingCard
                key={offer.code}
                code={offer.code}
                nominalLabel={`${formatUsd(offer.nominalBalance)} simulés`}
                priceLabel="Prix public candidat"
                priceValue={formatFcfa(offer.priceAmount)}
                secondaryPriceLine={`${USD_EQUIVALENT[offer.code]} · informatif uniquement`}
                rules={OFFER_RULES}
                featured={offer.code === '10K'}
                footnote="Aucun frais d’activation"
                cta={
                  <Link
                    href={`/checkout?product=${offer.code}`}
                    className={buttonClassNames({ size: 'lg', className: 'w-full' })}
                  >
                    Commencer avec {offer.code}
                  </Link>
                }
              />
            ))}
          </div>
          <div className="mt-10 grid gap-4 border-t border-[color:var(--wariba-color-ink-700)] pt-8 sm:grid-cols-3">
            {[
              ['Prix final', 'Figé en FCFA au checkout'],
              ['Prix fondateur', 'Réservé aux prochaines cohortes activées'],
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

      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-50)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <Text variant="label-sm" color="secondary">
              Comprendre les règles
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-ink-950)]">
              Quatre règles à connaître avant de choisir.
            </h2>
          </div>
          <div className="mt-10 max-w-3xl">
            <Accordion items={RULES_GLOSSARY} />
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
              Avant d’acheter
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
              Les questions qu’on nous pose le plus.
            </h2>
          </div>
          <div className="mt-10 max-w-3xl">
            <Accordion items={PURCHASE_FAQ} />
          </div>
          <p className="mt-10 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
            D’autres questions ?{' '}
            <Link
              href="/aide"
              className="font-semibold text-[color:var(--wariba-color-cobalt-300)] hover:text-[color:var(--wariba-color-cobalt-200)]"
            >
              Consultez le centre d’aide
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
