import Decimal from 'decimal.js';
import type { Db } from '@wariba/database';
import { listActiveProducts, type ProductDTO } from './commerce';

/**
 * What a trader is actually buying, read from the published rules.
 *
 * ## Why this is not a hardcoded feature list
 *
 * A checkout page that prints "Objectif : 10 %" as a string is a page that
 * will keep printing 10 % the day the published policy says 8 %. Every figure
 * here is derived from `policy_versions.parameters_json` for the version that
 * is actually in force, multiplied against the product's own nominal — so the
 * numbers on the offer are the numbers the risk engine will enforce, by
 * construction rather than by somebody remembering to update both.
 *
 * If no published WARIBA ONE policy exists, this returns `null` rules rather
 * than defaults. An offer page that invents plausible rules because the
 * database had none is worse than an offer page that says the terms are
 * unavailable.
 */

export interface OfferRule {
  label: string;
  /** Already formatted for display, in the product's own currency where money. */
  value: string;
  /** One line of plain French, for the trader who does not know the term. */
  explanation: string;
}

export interface OfferConfiguration {
  product: ProductDTO;
  /** `10 000 USD` */
  nominalFormatted: string;
  /** Contract price, in the currency the platform actually charges. */
  priceFormatted: string;
  rules: OfferRule[];
}

export interface OfferCatalog {
  offers: OfferConfiguration[];
  policyVersion: string | null;
  /** True when the published rules could be read. False means terms unavailable. */
  rulesAvailable: boolean;
}

interface EvaluationParameters {
  daily_loss_rate?: string;
  maximum_loss_rate?: string;
  best_day_max_ratio?: string;
  profit_target_rate?: string | null;
  minimum_trading_days?: number | null;
}

function percent(rate: string): string {
  return `${new Decimal(rate).times(100).toDecimalPlaces(2).toNumber().toLocaleString('fr-FR')} %`;
}

function money(nominal: string, rate: string, currency: string): string {
  return `${new Decimal(nominal)
    .times(rate)
    .toDecimalPlaces(0)
    .toNumber()
    .toLocaleString('fr-FR')} ${currency}`;
}

export async function buildOfferCatalog(db: Db): Promise<OfferCatalog> {
  const [products, policy] = await Promise.all([
    listActiveProducts(db),
    db
      .selectFrom('app.policy_versions')
      .select(['semantic_version', 'parameters_json'])
      .where('program', '=', 'WARIBA_ONE')
      .where('status', '=', 'published')
      .orderBy('effective_from', 'desc')
      .executeTakeFirst(),
  ]);

  const parameters = (policy?.parameters_json ?? null) as EvaluationParameters | null;
  const rulesAvailable = Boolean(
    parameters?.daily_loss_rate && parameters?.maximum_loss_rate && parameters?.profit_target_rate,
  );

  const offers = products.map((product): OfferConfiguration => {
    const nominal = product.nominalBalance;
    const currency = product.nominalCurrency;
    const rules: OfferRule[] = [];

    if (rulesAvailable && parameters) {
      rules.push({
        label: 'Objectif de profit',
        value: money(nominal, parameters.profit_target_rate as string, currency),
        explanation: `Profit net réalisé à atteindre — ${percent(parameters.profit_target_rate as string)} du nominal. Le PnL latent ne compte jamais.`,
      });
      rules.push({
        label: 'Perte quotidienne',
        value: money(nominal, parameters.daily_loss_rate as string, currency),
        explanation:
          'Atteinte, elle met le compte en blocage temporaire jusqu’au reset. Le compte n’est pas terminé.',
      });
      rules.push({
        label: 'Perte maximale',
        value: money(nominal, parameters.maximum_loss_rate as string, currency),
        explanation:
          'Plancher glissant recalculé après chaque journée clôturée. Il ne redescend jamais. L’atteindre termine le compte.',
      });
      if (parameters.best_day_max_ratio) {
        rules.push({
          label: 'Consistance',
          value: percent(parameters.best_day_max_ratio),
          explanation:
            'Part maximale du profit total qu’une seule journée peut représenter. Un dépassement bloque le passage, il ne casse rien.',
        });
      }
      rules.push({
        label: 'Jours de trading minimum',
        value:
          parameters.minimum_trading_days && parameters.minimum_trading_days > 0
            ? String(parameters.minimum_trading_days)
            : 'Aucun',
        explanation:
          parameters.minimum_trading_days && parameters.minimum_trading_days > 0
            ? 'Nombre de journées à tradez avant de pouvoir valider l’évaluation.'
            : 'Vous pouvez valider l’évaluation dès que l’objectif est atteint.',
      });
    }

    return {
      product,
      nominalFormatted: `${new Decimal(nominal).toDecimalPlaces(0).toNumber().toLocaleString('fr-FR')} ${currency}`,
      priceFormatted: `${new Decimal(product.priceAmount)
        .toDecimalPlaces(0)
        .toNumber()
        .toLocaleString('fr-FR')} ${product.priceCurrency}`,
      rules,
    };
  });

  return { offers, policyVersion: policy?.semantic_version ?? null, rulesAvailable };
}
