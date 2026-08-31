import Link from 'next/link';
import { ArrowRightIcon, Icon, PublicSection } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';
import { FaqKnowledgeStack, type FaqItem } from './FaqKnowledgeStack';
import {
  JourneyFlowVisual,
  PathwayBranchVisual,
  PayoutLadderVisual,
  PerformanceTokenVisual,
  RiskRailsVisual,
  SimulatedDistinctionVisual,
  ValidationTimelineVisual,
} from './faq-visuals';

function SearchIcon() {
  return (
    <Icon size="sm">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M19.5 19.5 15.8 15.8" />
    </Icon>
  );
}

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'commencer',
    number: '01',
    category: 'Commencer',
    question: 'Qu’est-ce que WARIBA exactement ?',
    answer:
      'WARIBA est un environnement de trading simulé structuré autour de plusieurs parcours. Vous tradez dans WariX, suivez votre progression et, selon votre formule, accédez à WARIBA Performance.',
    visual: <JourneyFlowVisual />,
  },
  {
    id: 'parcours',
    number: '02',
    category: 'Parcours',
    question: 'Quelle différence entre ONE, FLEX et INSTANT ?',
    answer:
      'ONE commence par une évaluation avec un paiement unique. FLEX commence aussi par une évaluation, mais le paiement est réparti en deux temps : une première partie au départ, puis l’activation seulement après réussite. INSTANT ne comporte pas d’évaluation et commence directement sur Performance.',
    visual: <PathwayBranchVisual />,
  },
  {
    id: 'performance',
    number: '03',
    category: 'Performance',
    question: 'Qu’est-ce qu’un compte WARIBA Performance ?',
    answer:
      'C’est le compte simulé sur lequel vous tradez pour remplir les conditions liées aux payouts. Performance n’est pas présenté comme un compte financé réel ni comme une promesse de revenus.',
    visual: <PerformanceTokenVisual />,
  },
  {
    id: 'transparence',
    number: '04',
    category: 'Transparence',
    question: 'Est-ce que je trade avec de l’argent réel ?',
    answer:
      'Non. WARIBA utilise des comptes de trading simulés. Les tailles affichées sont nominales : elles ne représentent ni un dépôt bancaire ni un capital réel confié au trader. Les résultats et payouts dépendent des règles applicables au compte.',
    visual: <SimulatedDistinctionVisual />,
  },
  {
    id: 'progression',
    number: '05',
    category: 'Progression',
    question: 'Que se passe-t-il quand j’atteins l’objectif ?',
    answer:
      'Atteindre l’objectif ne débloque pas automatiquement l’étape suivante. La réussite passe d’abord par l’état de vérification prévu par WARIBA. Après validation : ONE peut accéder à Performance. FLEX passe par l’Activation avant Performance. INSTANT, lui, commence déjà directement sur Performance.',
    visual: <ValidationTimelineVisual />,
  },
  {
    id: 'risque',
    number: '06',
    category: 'Risque',
    question: 'Que se passe-t-il si j’atteins une limite de risque ?',
    answer:
      'Cela dépend du type de limite. Une limite quotidienne peut entraîner un blocage temporaire, tandis qu’une perte maximale dépassée peut mettre fin au compte selon les règles applicables. Les règles attachées à votre compte restent toujours la source de vérité.',
    visual: <RiskRailsVisual />,
  },
  {
    id: 'payouts',
    number: '07',
    category: 'Payouts',
    question: 'Quand puis-je demander un payout ?',
    answer:
      'Sur un compte Performance, vous pouvez soumettre une demande de payout lorsque les conditions applicables à votre cycle sont remplies et que les vérifications requises, comme le KYC lorsqu’il s’applique, sont validées. La demande est ensuite examinée selon les règles applicables à votre compte.',
    visual: <PayoutLadderVisual />,
  },
] as const;

const HELP_KEYWORDS = [
  'Règles',
  'WariX',
  'Performance',
  'Payouts',
  'Paiements',
  'Compte',
  'Support',
] as const;

/**
 * Section 11 — FAQ, a preview of `/aide`, never a rebuild of it.
 *
 * Seven pre-start questions chosen to remove objections before signup —
 * not the Help Center's deepest or most technical articles, which stay on
 * `/aide` where search, categories and full rule articles already live.
 * Every answer here is conceptual by design: none of the seven interpolate
 * a canonical rate or price, so this section can't go stale the way the
 * previous FAQ (which hardcoded `formatRate(...)` calls into the copy) did.
 */
export function FaqSection() {
  return (
    <PublicSection tone="band" aria-labelledby="faq-title">
      <Reveal>
        <p className="wariba-eyebrow">Questions fréquentes</p>
        <h2 id="faq-title" className="wariba-section-title mt-5 max-w-[18ch]">
          L’essentiel, avant de commencer.
        </h2>
        <p className="wariba-lead mt-5 max-w-[42rem]">
          Parcours, Performance, règles ou payouts : voici les réponses aux questions qui reviennent
          le plus souvent.
        </p>
      </Reveal>

      <Reveal delay={0.06} className="mt-8">
        <Link href="/aide" className="faq-portal">
          <span className="faq-portal-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <span className="faq-portal-label">Rechercher dans le Centre d’aide</span>
          <span className="faq-portal-arrow" aria-hidden="true">
            <ArrowRightIcon size="sm" className="-rotate-45" />
          </span>
        </Link>
      </Reveal>

      <Reveal delay={0.1} className="mt-10">
        <FaqKnowledgeStack items={FAQ_ITEMS} defaultOpenId="parcours" />
      </Reveal>

      <Reveal delay={0.12} className="faq-closing mt-10">
        <div className="faq-closing-inner">
          <div>
            <p className="wariba-eyebrow">Encore une question ?</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--wariba-on-dark)] sm:text-3xl">
              Le Centre d’aide va plus loin.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
              Règles, WariX, Performance, payouts, paiements, compte et support : retrouvez les
              réponses détaillées au même endroit.
            </p>
            <Link href="/aide" className="wariba-cta-secondary mt-6">
              Explorer le Centre d’aide
              <ArrowRightIcon size="sm" />
            </Link>
          </div>

          <ul className="faq-closing-keywords">
            {HELP_KEYWORDS.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </PublicSection>
  );
}
