import Image from 'next/image';
import Link from 'next/link';
import {
  Accordion,
  Badge,
  buttonClassNames,
  FeatureCard,
  PricingCard,
  ShieldIcon,
  StatTile,
  Text,
  OverviewIcon,
  PayoutsIcon,
  TradeIcon,
} from '@wariba/ui';
import { listActiveProducts } from '@wariba/application';
import { getDb } from '../../lib/db';
import { formatFcfa, formatUsd, USD_EQUIVALENT } from '../../lib/pricing-format';
import { WariXMiniPreview } from './warix/WariXMiniPreview';

export const dynamic = 'force-dynamic';

const DIFFERENTIATORS = [
  {
    icon: <PayoutsIcon />,
    title: 'Payé en FCFA, sans détour',
    body: 'Le prix et le règlement restent en FCFA du premier au dernier paiement. L’équivalent USD reste une indication, jamais une conversion appliquée au checkout.',
  },
  {
    icon: <TradeIcon />,
    title: 'Une seule phase, aucun minimum de jours',
    body: 'Atteignez l’objectif de 10 % quand vous êtes prêt. Aucune journée minimale, aucune journée qualifiée à cumuler avant de pouvoir passer.',
  },
  {
    icon: <OverviewIcon />,
    title: 'Jusqu’à 90 % du profit retiré',
    body: 'Un profit split de 85 % dès votre premier payout, puis 90 % à partir du cinquième. Le partage progresse avec votre régularité.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Des règles versionnées, jamais réécrites',
    body: 'La policy acceptée à l’activation reste attachée à votre compte. Aucune règle n’est modifiée rétroactivement après coup.',
  },
] as const;

const PROGRAMS = [
  {
    eyebrow: '01 — Evaluation',
    title: 'Prouvez votre discipline.',
    body: 'Une seule phase, un objectif de 10 % réalisé et des règles qui restent visibles avant chaque décision.',
    status: 'Disponible dès aujourd’hui',
    href: '/programme#evaluation',
    tone: 'cobalt',
  },
  {
    eyebrow: '02 — Performance',
    title: 'Construisez votre base.',
    body: 'Un buffer permanent de 10 %, cinq nouvelles Performance Days et des caps progressifs.',
    status: 'S’ouvre après une Evaluation réussie',
    href: '/programme#performance',
    tone: 'success',
  },
  {
    eyebrow: '03 — Review',
    title: 'Faites examiner vos preuves.',
    body: 'Après cinq payouts conformes, le dossier entre en revue. Aucun Live n’est garanti.',
    status: 'Étape finale du parcours',
    href: '/programme#review',
    tone: 'copper',
  },
] as const satisfies readonly {
  eyebrow: string;
  title: string;
  body: string;
  status: string;
  href: string;
  tone: 'cobalt' | 'success' | 'copper';
}[];

const RULES = [
  ['Objectif réalisé', '10 %'],
  ['Perte quotidienne', '3 % · soft lock'],
  ['Perte maximale', '10 % · EOD trailing'],
  ['Best Day Rule', '50 % · non-breach'],
  ['Minimum de jours', 'Aucun'],
  ['Activation après réussite', '0 FCFA'],
] as const;

const OFFER_RULES = [
  'Objectif réalisé : 10 %',
  'Daily Loss : 3 % soft lock',
  'Maximum Loss : 10 % EOD trailing',
  'Best Day Rule : 50 % non-breach',
  'Aucun minimum de jours',
];

const FAQ_ITEMS = [
  {
    question: 'Le trading sur WariX est-il réel ?',
    answer:
      'Non. WariX est un environnement entièrement simulé. Les balances, prix et exécutions ne représentent ni un compte de courtage ni des fonds réels. Les résultats obtenus en simulation ne garantissent aucun résultat futur.',
  },
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
    question: 'Que se passe-t-il après le cinquième payout ?',
    answer:
      'Le compte entre en WARIBA Review, une évaluation des preuves et de l’intégrité du parcours. Elle ne garantit ni sixième payout, ni allocation Live, ni capital réel.',
  },
  {
    question: 'Combien de temps ai-je pour réussir l’Evaluation ?',
    answer:
      'Aucune limite de temps ni minimum de jours n’est imposé. Seule la Best Day Rule (50 % maximum sur une seule journée) empêche un passage fondé sur une unique journée profitable.',
  },
  {
    question: 'Que se passe-t-il si j’atteins la Daily Loss Limit ?',
    answer:
      'Le compte passe en soft lock jusqu’au prochain reset : aucune nouvelle position ne peut être ouverte, mais le compte n’est pas terminé. Il ne l’est que si le plancher de Maximum Loss est également atteint.',
  },
] as const;

export default async function HomePage() {
  const offers = await listActiveProducts(getDb());

  return (
    <>
      <section className="relative isolate min-h-[calc(100svh-64px)] overflow-hidden border-b border-[color:var(--wariba-color-ink-700)]">
        <Image
          src="/images/wariba-hero-abidjan.webp"
          alt="Trader professionnel ouest-africain concentré dans un espace de travail contemporain à Abidjan"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 -z-10 bg-[color:var(--wariba-color-ink-950)]/75" />
        <div className="mx-auto flex min-h-[calc(100svh-64px)] max-w-[var(--wariba-size-marketing-container-max)] items-center px-4 py-16 sm:px-6">
          <div className="max-w-3xl">
            <Badge variant="information">Bêta privée · trading simulé</Badge>
            <h1 className="mt-6 max-w-3xl text-[length:var(--wariba-font-size-display-lg)] font-semibold leading-[var(--wariba-line-height-display-lg)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-bone-50)] sm:text-[length:var(--wariba-font-size-display-xl)] sm:leading-[var(--wariba-line-height-display-xl)]">
              Construisez votre discipline. Mesurez votre progression.
            </h1>
            <p className="mt-6 max-w-2xl text-[length:var(--wariba-font-size-body-lg)] leading-[var(--wariba-line-height-body-lg)] text-[color:var(--wariba-color-ink-100)]">
              WARIBA est un parcours francophone d’évaluation et de performance dans un
              environnement entièrement simulé, avec des règles versionnées et une exécution
              contrôlée par le serveur.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/offres" className={buttonClassNames({ size: 'lg' })}>
                Choisir une évaluation
              </Link>
              <Link
                href="/programme"
                className={buttonClassNames({ size: 'lg', variant: 'secondary' })}
              >
                Voir comment ça marche
              </Link>
            </div>
            <p className="mt-5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-200)]">
              Prix principal en FCFA. Aucune conversion surprise au checkout. Aucun frais
              d’activation après réussite.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="pourquoi-title" className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
              Pourquoi choisir WARIBA
            </Text>
            <h2
              id="pourquoi-title"
              className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-bone-50)]"
            >
              Pensé pour des traders francophones, pas traduit après coup.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIFFERENTIATORS.map((item) => (
              <FeatureCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                body={item.body}
              />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="parcours-title" className="bg-[color:var(--wariba-color-ink-900)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
                Un parcours en trois temps
              </Text>
              <h2
                id="parcours-title"
                className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-bone-50)]"
              >
                Une progression exigeante, sans promesse facile.
              </h2>
            </div>
            <Link
              href="/programme"
              className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-color-cobalt-300)] hover:text-[color:var(--wariba-color-cobalt-200)]"
            >
              Explorer le programme
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {PROGRAMS.map((program) => (
              <Link
                key={program.title}
                href={program.href}
                className="block h-full transition-transform hover:-translate-y-1"
              >
                <FeatureCard
                  eyebrow={program.eyebrow}
                  title={program.title}
                  body={program.body}
                  footer={program.status}
                  tone={program.tone}
                  className="min-h-[410px]"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="regles" className="bg-[color:var(--wariba-color-ink-950)] scroll-mt-20">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <Text variant="label-sm" className="text-[color:var(--wariba-color-copper-300)]">
                WARIBA ONE v1.1
              </Text>
              <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
                Des règles lisibles avant de commencer.
              </h2>
              <p className="mt-5 text-[length:var(--wariba-font-size-body-md)] text-[color:var(--wariba-color-ink-200)]">
                Chaque compte conserve la version de policy acceptée. Une policy publiée n’est
                jamais réécrite rétroactivement.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {RULES.map(([label, value]) => (
                <StatTile key={label} label={label} value={value} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="tarifs-title" className="bg-[color:var(--wariba-color-ink-900)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
                Cinq tailles actives en bêta privée
              </Text>
              <h2
                id="tarifs-title"
                className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]"
              >
                Un prix final en FCFA, sans conversion surprise.
              </h2>
            </div>
            <Link href="/offres" className={buttonClassNames({ size: 'lg' })}>
              Comparer les offres en détail
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
          <p className="mt-6 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
            Tarifs de la bêta privée, encore candidats : le prix définitif sera confirmé avant
            toute ouverture publique.
          </p>
        </div>
      </section>

      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-50)]">
        <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-28">
          <div>
            <Text variant="label-sm" color="secondary">
              Le terminal WariX
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-ink-950)]">
              Le risque reste visible avant la performance.
            </h2>
            <p className="mt-5 text-[length:var(--wariba-font-size-body-lg)] leading-[var(--wariba-line-height-body-lg)] text-[color:var(--wariba-color-ink-600)]">
              WariX affiche le contexte du compte, la policy appliquée, les limites restantes et
              la prochaine action utile — jamais un chiffre isolé.
            </p>
            <Link href="/warix" className={buttonClassNames({ size: 'lg', className: 'mt-8' })}>
              Découvrir WariX
            </Link>
          </div>
          <WariXMiniPreview />
        </div>
      </section>

      <section aria-labelledby="faq-title" className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
              Questions fréquentes
            </Text>
            <h2
              id="faq-title"
              className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]"
            >
              Les réponses avant de vous décider.
            </h2>
          </div>
          <div className="mt-10 max-w-3xl">
            <Accordion items={FAQ_ITEMS} />
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-ink-700)]">
            <div className="relative aspect-[3/2]">
              <Image
                src="/images/wariba-support-team.webp"
                alt="Deux professionnels ouest-africains examinent ensemble un plan de risque dans un bureau contemporain à Abidjan"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
          <div>
            <Text variant="label-sm" className="text-[color:var(--wariba-color-cobalt-300)]">
              Besoin de clarté
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-bone-50)]">
              Les réponses importantes avant la première décision.
            </h2>
            <p className="mt-5 text-[length:var(--wariba-font-size-body-lg)] text-[color:var(--wariba-color-ink-200)]">
              Consultez le centre d’aide pour comprendre le Maximum Loss EOD, la Best Day Rule, les
              prix FCFA, WariX et la nature entièrement simulée du programme.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/aide" className={buttonClassNames({ size: 'lg' })}>
                Ouvrir le centre d’aide
              </Link>
              <Link
                href="/support"
                className={buttonClassNames({ size: 'lg', variant: 'secondary' })}
              >
                Contacter le support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
