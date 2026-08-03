import Image from 'next/image';
import Link from 'next/link';
import { Badge, buttonClassNames, Text } from '@wariba/ui';

const PROGRAMS = [
  {
    eyebrow: '01 — Evaluation',
    title: 'Prouvez votre discipline.',
    body: 'Une seule phase, un objectif de 10 % réalisé et des règles qui restent visibles avant chaque décision.',
    status: 'Disponible en sandbox',
    href: '/programme#evaluation',
    className: 'bg-[color:var(--wariba-color-cobalt-900)]',
  },
  {
    eyebrow: '02 — Performance',
    title: 'Construisez votre base.',
    body: 'Un buffer permanent de 10 %, cinq nouvelles Performance Days et des caps progressifs.',
    status: 'Construction Prompt 08',
    href: '/programme#performance',
    className: 'bg-[color:var(--wariba-color-success-700)]',
  },
  {
    eyebrow: '03 — Review',
    title: 'Faites examiner vos preuves.',
    body: 'Après cinq payouts sandbox conformes, le dossier entre en revue. Aucun Live n’est garanti.',
    status: 'Parcours documenté',
    href: '/programme#review',
    className: 'bg-[color:var(--wariba-color-copper-900)]',
  },
] as const;

const RULES = [
  ['Objectif réalisé', '10 %'],
  ['Perte quotidienne', '3 % · soft lock'],
  ['Perte maximale', '10 % · EOD trailing'],
  ['Best Day Rule', '50 % · non-breach'],
  ['Minimum de jours', 'Aucun'],
  ['Activation après réussite', '0 FCFA'],
] as const;

const SIZES = [
  ['5K', '22 500 FCFA'],
  ['10K', '39 900 FCFA'],
  ['25K', '84 900 FCFA'],
  ['50K', '144 900 FCFA'],
  ['100K', '259 900 FCFA'],
] as const;

export default function HomePage() {
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

      <section aria-labelledby="parcours-title" className="bg-[color:var(--wariba-color-ink-950)]">
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
                className={`${program.className} flex min-h-[410px] flex-col rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-ink-600)] p-7 transition-transform hover:-translate-y-1 sm:p-9`}
              >
                <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-caps)] text-[color:var(--wariba-color-bone-200)]">
                  {program.eyebrow}
                </p>
                <h3 className="mt-5 text-[length:var(--wariba-font-size-heading-xl)] font-semibold leading-[var(--wariba-line-height-heading-xl)] text-[color:var(--wariba-color-bone-50)]">
                  {program.title}
                </h3>
                <p className="mt-4 text-[length:var(--wariba-font-size-body-md)] leading-[var(--wariba-line-height-body-md)] text-[color:var(--wariba-color-bone-100)]">
                  {program.body}
                </p>
                <p className="mt-auto border-t border-[color:var(--wariba-color-bone-300)]/50 pt-5 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-bone-100)]">
                  {program.status}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-50)]">
        <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-28">
          <div>
            <Text variant="label-sm" color="secondary">
              Pourquoi WARIBA
            </Text>
            <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] tracking-[var(--wariba-letter-spacing-tight)] text-[color:var(--wariba-color-ink-950)]">
              Le risque reste visible avant la performance.
            </h2>
            <p className="mt-5 text-[length:var(--wariba-font-size-body-lg)] leading-[var(--wariba-line-height-body-lg)] text-[color:var(--wariba-color-ink-600)]">
              L’objectif n’est pas de multiplier les règles opaques. WariX expose le contexte du
              compte, la policy appliquée, les limites restantes et la prochaine action utile.
            </p>
            <Link href="/warix" className={buttonClassNames({ size: 'lg', className: 'mt-8' })}>
              Découvrir WariX
            </Link>
          </div>
          <div className="overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-bone-200)] bg-[color:var(--wariba-color-ink-950)] p-5 shadow-[var(--wariba-shadow-md)] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--wariba-color-ink-700)] pb-4">
              <p className="font-semibold text-[color:var(--wariba-color-bone-50)]">WariX</p>
              <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
                Aperçu sandbox · aucune donnée réelle
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ['Policy', 'ONE 1.1'],
                ['DLL restante', '3 % au reset'],
                ['Max Loss', 'Floor EOD'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] bg-[color:var(--wariba-color-ink-900)] p-4"
                >
                  <p className="text-[length:var(--wariba-font-size-label-sm)] uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-color-ink-300)]">
                    {label}
                  </p>
                  <p className="wariba-data mt-2 text-[length:var(--wariba-font-size-data-md)] text-[color:var(--wariba-color-bone-50)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[var(--wariba-radius-lg)] border border-[color:var(--wariba-color-ink-700)] p-4">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-200)]">
                <span>Instrument</span>
                <span>Bid</span>
                <span>Ask</span>
                <span className="text-[color:var(--wariba-color-bone-50)]">EURUSD</span>
                <span className="wariba-data">1.08450</span>
                <span className="wariba-data">1.08460</span>
                <span className="text-[color:var(--wariba-color-bone-50)]">XAUUSD</span>
                <span className="wariba-data">2 340.20</span>
                <span className="wariba-data">2 340.50</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="regles" className="bg-[color:var(--wariba-color-ink-900)] scroll-mt-20">
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
            <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {RULES.map(([label, value]) => (
                <div
                  key={label}
                  className="border-t border-[color:var(--wariba-color-ink-600)] pt-4"
                >
                  <dt className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-300)]">
                    {label}
                  </dt>
                  <dd className="wariba-data mt-2 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-bone-50)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-100)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <Text variant="label-sm" color="secondary">
                Cinq tailles actives en sandbox
              </Text>
              <h2 className="mt-3 text-[length:var(--wariba-font-size-display-md)] font-semibold leading-[var(--wariba-line-height-display-md)] text-[color:var(--wariba-color-ink-950)]">
                Un prix final en FCFA, sans conversion surprise.
              </h2>
            </div>
            <Link href="/offres" className={buttonClassNames({ size: 'lg' })}>
              Comparer les offres
            </Link>
          </div>
          <div className="mt-10 grid border-l border-t border-[color:var(--wariba-color-bone-300)] sm:grid-cols-5">
            {SIZES.map(([size, price]) => (
              <div
                key={size}
                className="border-b border-r border-[color:var(--wariba-color-bone-300)] bg-[color:var(--wariba-color-bone-50)] p-5"
              >
                <p className="wariba-data text-[length:var(--wariba-font-size-heading-md)] font-semibold text-[color:var(--wariba-color-ink-950)]">
                  {size}
                </p>
                <p className="mt-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-600)]">
                  {price}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-600)]">
            Prix candidats en attente de validation actuarielle. Vente publique non ouverte.
          </p>
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
