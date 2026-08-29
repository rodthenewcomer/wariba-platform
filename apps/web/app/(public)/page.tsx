import Image from 'next/image';
import Link from 'next/link';
import { listCanonicalV2Offers } from '@wariba/application';
import {
  AccountToken,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  PayoutLadder,
  ShieldCheckIcon,
} from '@wariba/ui';
import { PerformanceShowcase } from '../../components/marketing/PerformanceShowcase';
import { Reveal } from '../../components/motion/Reveal';
import { DrawPath } from '../../components/motion/DrawPath';
import { FAMILY_META, FAMILY_ORDER, formatRate } from '../../components/commerce/offer-ui';
import { getDb } from '../../lib/db';

export const dynamic = 'force-dynamic';

const FAMILY_TOKEN = {
  WARIBA_ONE: 'one',
  WARIBA_FLEX: 'flex',
  WARIBA_INSTANT: 'instant',
} as const;

export default async function HomePage() {
  const offers = await listCanonicalV2Offers(getDb());
  const references = FAMILY_ORDER.map((family) =>
    offers.find((offer) => offer.productFamily === family && offer.sizeCode === '10K'),
  ).filter((offer) => offer !== undefined);

  /*
   * The payout ladder and the rule figures are read from the canonical offer,
   * never typed into the page. A homepage that hardcodes "8 %" is a homepage
   * that lies the day the policy is versioned.
   */
  const one = references.find((offer) => offer.productFamily === 'WARIBA_ONE');
  const ladder = one?.performanceRules.payoutSplitSchedule ?? [];

  return (
    <>
      {/* ─────────────────────────  1 · Héros produit  ───────────────────────── */}
      <section className="commerce-hero commerce-ambient">
        <div className="commerce-shell grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pb-28 lg:pt-24">
          <div>
            <p className="commerce-kicker">Trading simulé · règles V2 immuables</p>
            <h1 className="commerce-display mt-6">Prouvez votre discipline.</h1>
            <p className="commerce-lead mt-6">
              ONE pour construire la preuve, FLEX pour alléger l’entrée, INSTANT pour commencer
              directement en Performance. Trois parcours, quinze offres, aucune règle cachée.
            </p>

            <ul className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {HERO_FACTS.map((fact) => (
                <li key={fact.label}>
                  <span className="flex size-8 items-center justify-center rounded-full border border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-brand-wash)] text-[color:var(--wariba-brand-300)]">
                    <fact.Icon size="sm" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[color:var(--wariba-color-ink-50)]">
                    {fact.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                    {fact.detail}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/offres" className="commerce-primary-action">
                Comparer les 15 offres
              </Link>
              <Link href="/programme" className="commerce-secondary-action">
                Comment ça marche
              </Link>
            </div>

            <p className="mt-6 text-sm text-[color:var(--wariba-color-ink-300)]">
              Les achats publics restent fermés. Le catalogue et les règles sont visibles dès
              maintenant.
            </p>
          </div>

          <Reveal delay={0.1}>
            <PerformanceShowcase />
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────────  2 · Les trois parcours  ───────────────────── */}
      <section className="commerce-band">
        <div className="commerce-shell py-20 lg:py-28">
          <Reveal>
            <p className="commerce-kicker">Choisir par intention</p>
            <h2 className="commerce-section-title mt-5">Le prix vient après le parcours.</h2>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {references.map((offer, index) => {
              const meta = FAMILY_META[offer.productFamily];
              const target = offer.evaluationRules?.profitTargetRate;
              return (
                <Reveal key={offer.offerId} delay={index * 0.08}>
                  <article className="commerce-panel flex h-full flex-col overflow-hidden">
                    {/* The object. This is what makes the card a product card
                        rather than a bordered paragraph. */}
                    <div className="flex justify-center bg-[color:color-mix(in_srgb,var(--wariba-color-ink-975)_60%,transparent)] px-6 pb-6 pt-8">
                      <AccountToken
                        sizeCode={offer.sizeCode}
                        family={FAMILY_TOKEN[offer.productFamily]}
                        width={190}
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <p className="commerce-choice-index">WARIBA {meta.short}</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[color:var(--wariba-color-ink-50)]">
                        {meta.eyebrow}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                        {meta.description}
                      </p>

                      <dl className="mb-6 mt-6 border-t border-[color:var(--commerce-rule)] pt-4">
                        <div className="commerce-spec-row">
                          <dt className="commerce-spec-label">Départ</dt>
                          <dd>
                            <span className="commerce-spec-value">
                              {offer.entryPhase === 'evaluation' ? 'Évaluation' : 'Performance'}
                            </span>
                          </dd>
                        </div>
                        <div className="commerce-spec-row">
                          <dt className="commerce-spec-label">
                            {target ? 'Objectif' : 'Limite quotidienne'}
                          </dt>
                          <dd>
                            <span className="commerce-spec-value" data-tone="accent">
                              {formatRate(target ?? offer.performanceRules.dailyLossRate)}
                            </span>
                          </dd>
                        </div>
                        <div className="commerce-spec-row">
                          <dt className="commerce-spec-label">Perte maximale</dt>
                          <dd>
                            <span className="commerce-spec-value">
                              {formatRate(
                                offer.evaluationRules?.maximumLossRate ??
                                  offer.performanceRules.maximumLossRate,
                              )}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      <Link
                        href={meta.path}
                        /* mt-auto, so three cards with different amounts of
                           prose still land their action on the same line. */
                        className="commerce-secondary-action mt-auto w-full pt-3"
                        aria-label={`Découvrir le parcours ${meta.short}`}
                      >
                        Voir {meta.short}
                      </Link>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────  3 · Scène de règle  ────────────────────────
          Une règle, une surface entière. C'est ce qui empêche « Perte maximale
          8 % » d'être une ligne de tableau (référence 34). */}
      {one ? (
        <section>
          <div className="commerce-shell py-20 lg:py-28">
            <Reveal>
              <p className="commerce-kicker">La règle qui compte</p>
              <h2 className="commerce-section-title mt-5">Une seule limite met fin à un compte.</h2>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="commerce-rule-scene mt-10" data-tone="accent">
                <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                      Règle 1 sur 1 · WARIBA ONE
                    </p>
                    <p className="commerce-rule-figure mt-4">
                      {formatRate(one.evaluationRules?.maximumLossRate ?? '0')}
                    </p>
                    <p className="mt-4 text-xl font-semibold text-white">Perte maximale</p>
                    <p className="mt-2 max-w-md text-base leading-relaxed text-white/80">
                      Elle suit votre plus haut de fin de journée. Restez au-dessus de la ligne : le
                      reste de votre gestion vous appartient.
                    </p>
                  </div>

                  {/* La ligne se dessine à l'entrée dans le viewport : le tracé
                      statique dit la forme, le tracé dessiné dit la direction. */}
                  <svg viewBox="0 0 320 160" className="w-full" aria-hidden="true">
                    <line
                      x1="8"
                      y1="140"
                      x2="312"
                      y2="140"
                      stroke="rgb(255 255 255 / 0.35)"
                      strokeWidth="1.5"
                      strokeDasharray="4 5"
                    />
                    <DrawPath
                      d="M12 132 C 70 128, 96 112, 140 92 S 224 44, 300 22"
                      stroke="#0B0D12"
                      strokeWidth={4}
                      length={420}
                    />
                    <circle cx="300" cy="22" r="7" fill="#0B0D12" />
                  </svg>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-10 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--wariba-color-ink-300)]">
                Ce que WARIBA n’impose pas
              </p>
              <ul className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
                {ABSENT_RULES.map((rule) => (
                  <li key={rule} className="commerce-rule-absent">
                    <CloseIcon size="sm" className="text-[color:var(--wariba-accent-red)]" />
                    <s>{rule}</s>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-center text-sm text-[color:var(--wariba-color-ink-300)]">
                La Limite quotidienne existe et elle est souple : elle vous avertit, elle ne clôt
                pas votre compte.
              </p>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ─────────────────────────  4 · Échelle de partage  ────────────────────── */}
      {ladder.length > 0 ? (
        <section className="commerce-band">
          <div className="commerce-shell grid gap-12 py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:py-28">
            <Reveal>
              <p className="commerce-kicker">Ce que vous gardez</p>
              <h2 className="commerce-section-title mt-5">Rester paie davantage.</h2>
              <p className="commerce-lead mt-5">
                Votre part augmente à mesure que les cycles s’enchaînent. Le barème est attaché à
                votre compte le jour de l’achat et ne change plus.
              </p>
              <Link href="/challenges/one" className="commerce-secondary-action mt-8">
                Voir les règles complètes
              </Link>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="commerce-panel p-6 sm:p-8">
                <PayoutLadder
                  steps={ladder.map((share, index) => ({
                    label: `Cycle ${index + 1}`,
                    share: formatRate(share),
                    state: index === 0 ? 'current' : 'upcoming',
                  }))}
                  caption="Part conservée par le trader à chaque cycle de versement. Un plafond propre à la taille du compte s’applique, et une revue intervient après le cinquième cycle."
                />
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ─────────────────────────  5 · Éditorial  ─────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/wariba-trader-abidjan.webp"
          alt=""
          fill
          sizes="100vw"
          className="-z-20 object-cover object-[60%_center]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--wariba-color-ink-975)_28%,color-mix(in_srgb,var(--wariba-color-ink-975)_62%,transparent)_62%,transparent)]"
        />
        <div className="commerce-shell py-24 lg:py-32">
          <Reveal>
            <div className="max-w-xl">
              <p className="commerce-kicker">Autorité serveur</p>
              <h2 className="commerce-section-title mt-5">
                Le navigateur explique. Le serveur décide.
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-[color:var(--wariba-color-ink-200)]">
                <p>
                  Ordres, exécutions, prix, résultat, risque, passage et versement restent sous
                  autorité serveur. L’interface n’en déduit rien.
                </p>
                <p>
                  Chaque achat fige l’offre, la version de règles et les montants acceptés. Aucun
                  tarif futur ne réécrit une promesse passée.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────────  6 · Clôture  ──────────────────────────────── */}
      <section className="commerce-performance-island commerce-ambient">
        <div className="commerce-shell py-24 text-center lg:py-32">
          <Reveal>
            <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[color:var(--wariba-color-ink-50)] sm:text-5xl">
              Quinze offres visibles. Une sélection exacte, partageable et restaurable.
            </h2>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/offres" className="commerce-primary-action">
                Ouvrir le configurateur
              </Link>
              <Link href="/warix" className="commerce-secondary-action">
                Découvrir WariX
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/*
 * Real icons, not typed glyphs.
 *
 * These four were `◆ ▲ ⬤ ▸` as literal text. Unicode shapes sit at a different
 * optical weight from the SVG icons beside them, render differently across
 * Android and iOS, are emoji-presented on some platforms without warning, and
 * a screen reader announces "black diamond suit". Phase 3.4.5A §17 rules them
 * out; the shell icon set replaces them.
 */
const HERO_FACTS = [
  { Icon: CheckIcon, label: '15 offres', detail: 'Trois parcours, cinq tailles' },
  { Icon: ShieldCheckIcon, label: 'Règles figées', detail: 'Version attachée au compte' },
  { Icon: CloseIcon, label: 'Aucun dépôt', detail: 'Environnement simulé' },
  { Icon: ArrowRightIcon, label: 'WariX inclus', detail: 'Poste de travail complet' },
] as const;

const ABSENT_RULES = [
  'Règle de cohérence cachée',
  'Jours minimum de profit',
  'Limite de temps sur l’évaluation',
  'Frais mensuels récurrents',
] as const;
