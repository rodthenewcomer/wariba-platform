import Image from 'next/image';
import Link from 'next/link';
import { Badge, buttonClassNames, Text } from '@wariba/ui';

export default function SupportPage() {
  return (
    <>
      <section className="bg-[color:var(--wariba-color-ink-950)]">
        <div className="mx-auto grid max-w-[var(--wariba-size-marketing-container-max)] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <Badge variant="information">Support WARIBA</Badge>
            <h1 className="mt-6 text-[length:var(--wariba-font-size-display-lg)] font-semibold leading-[var(--wariba-line-height-display-lg)] text-[color:var(--wariba-color-bone-50)] sm:text-[length:var(--wariba-font-size-display-xl)] sm:leading-[var(--wariba-line-height-display-xl)]">
              Une question claire mérite une réponse traçable.
            </h1>
            <p className="mt-6 text-[length:var(--wariba-font-size-body-lg)] text-[color:var(--wariba-color-ink-200)]">
              Commencez par le centre d’aide. Pour un cas lié à un compte, connectez-vous afin que
              la demande puisse être rattachée aux bonnes preuves sans exposer d’information privée.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/aide" className={buttonClassNames({ size: 'lg' })}>
                Consulter le centre d’aide
              </Link>
              <Link
                href="/login"
                className={buttonClassNames({ size: 'lg', variant: 'secondary' })}
              >
                Se connecter
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--wariba-color-ink-700)]">
            <div className="relative aspect-[3/2]">
              <Image
                src="/images/wariba-support-team.webp"
                alt="Deux professionnels ouest-africains examinent ensemble un dossier de risque"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section data-theme="light" className="bg-[color:var(--wariba-color-bone-50)]">
        <div className="mx-auto max-w-[var(--wariba-size-marketing-container-max)] px-4 py-20 sm:px-6 lg:py-28">
          <Text variant="label-sm" color="secondary">
            Le bon canal selon le problème
          </Text>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {(
              [
                [
                  'Comprendre une règle',
                  'Utilisez le centre d’aide pour les règles v1.1, les prix FCFA, WariX et le parcours.',
                  '/aide',
                  'Voir les réponses',
                ],
                [
                  'Compte ou commande',
                  'Connectez-vous pour conserver le contexte du compte, de la policy et de la commande.',
                  '/login',
                  'Se connecter',
                ],
                [
                  'Risque ou confidentialité',
                  'Consultez les disclosures et le brouillon de confidentialité avant de partager une donnée.',
                  '/legal/confidentialite',
                  'Lire la confidentialité',
                ],
              ] as const
            ).map(([title, body, href, label]) => (
              <article
                key={title}
                className="flex min-h-64 flex-col rounded-[var(--wariba-radius-xl)] border border-[color:var(--wariba-color-bone-300)] bg-[color:var(--wariba-color-white)] p-6"
              >
                <h2 className="text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-color-ink-950)]">
                  {title}
                </h2>
                <p className="mt-3 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-600)]">
                  {body}
                </p>
                <Link
                  href={href}
                  className="mt-auto pt-6 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-color-cobalt-700)] hover:text-[color:var(--wariba-color-cobalt-900)]"
                >
                  {label}
                </Link>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-color-ink-600)]">
            Aucun délai de réponse public n’est affiché tant qu’un SLA opérationnel n’a pas été
            validé et mesuré. Ne partagez jamais de mot de passe, token, secret ou donnée de carte.
          </p>
        </div>
      </section>
    </>
  );
}
