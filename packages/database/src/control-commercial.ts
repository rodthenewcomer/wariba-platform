import type { Db } from './client';
import { evaluateReserveStatus, type ReserveStatus } from './treasury';

/**
 * Prompt 09 milestone 5 — the commercial catalogue, read from the database.
 *
 * Every row here is what `app.products` and `app.product_versions` actually
 * hold: no hardcoded list of sizes, no reconstructed pricing. Retired
 * versions are returned alongside live ones because price history is part of
 * the evidence — the explorer inspects them, it never edits them.
 *
 * Read-only. `commercial_product.modify` exists as a permission but has no
 * call site anywhere in the codebase: no canonical commercial mutation is
 * implemented, so Prompt 09 surfaces none. Inventing one here would mean
 * inventing its semantics too — retroactive repricing of versions that
 * accounts were already purchased against being the obvious hazard.
 */
export interface ControlProductVersion {
  id: string;
  priceAmount: string;
  /** Null where no founder price is set. See FOUNDER_COHORT_GATE. */
  founderPriceAmount: string | null;
  priceCurrency: string;
  activationFee: string;
  featureFlagKey: string | null;
  effectiveFrom: Date;
  retiredAt: Date | null;
  createdAt: Date;
  /** Purchase orders referencing this exact version. */
  purchaseOrderCount: number;
}

export interface ControlProduct {
  id: string;
  code: '5K' | '10K' | '25K' | '50K' | '100K';
  nominalBalance: string;
  nominalCurrency: string;
  createdAt: Date;
  versions: readonly ControlProductVersion[];
}

export interface ControlCommercialCatalogue {
  products: readonly ControlProduct[];
  /** The canonical reserve evaluation — one of the two availability inputs. */
  reserve: ReserveStatus;
}

export async function loadCommercialCatalogue(db: Db): Promise<ControlCommercialCatalogue> {
  const [products, versions, purchaseCounts, reserve] = await Promise.all([
    db
      .selectFrom('app.products')
      .select(['id', 'code', 'nominal_balance', 'nominal_currency', 'created_at'])
      .orderBy('nominal_balance', 'asc')
      .execute(),
    db
      .selectFrom('app.product_versions')
      .select([
        'id',
        'product_id',
        'price_amount',
        'founder_price_amount',
        'price_currency',
        'activation_fee',
        'feature_flag_key',
        'effective_from',
        'retired_at',
        'created_at',
      ])
      .orderBy('created_at', 'desc')
      .execute(),
    db
      .selectFrom('app.purchase_orders')
      .select((eb) => ['product_version_id', eb.fn.countAll().as('count')])
      .groupBy('product_version_id')
      .execute(),
    evaluateReserveStatus(db),
  ]);

  const countsByVersion = new Map(
    purchaseCounts.map((row) => [row.product_version_id, Number(row.count)]),
  );

  return {
    products: products.map((product) => ({
      id: product.id,
      code: product.code,
      nominalBalance: product.nominal_balance,
      nominalCurrency: product.nominal_currency,
      createdAt: product.created_at,
      versions: versions
        .filter((version) => version.product_id === product.id)
        .map((version) => ({
          id: version.id,
          priceAmount: version.price_amount,
          founderPriceAmount: version.founder_price_amount,
          priceCurrency: version.price_currency,
          activationFee: version.activation_fee,
          featureFlagKey: version.feature_flag_key,
          effectiveFrom: version.effective_from,
          retiredAt: version.retired_at,
          createdAt: version.created_at,
          purchaseOrderCount: countsByVersion.get(version.id) ?? 0,
        })),
    })),
    reserve,
  };
}
