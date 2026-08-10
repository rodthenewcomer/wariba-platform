import {
  Alert,
  Badge,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  Text,
} from '@wariba/ui';
import {
  evaluateCommercialGate,
  loadCommercialCatalogue,
  FEATURE_FLAG_SOURCE_LIMITATION,
  FEATURE_FLAG_STATE_SOURCE,
  FOUNDER_COHORT_GATE_NOTE,
  PRICING_STATUS_NOTE,
  type FeatureFlagState,
} from '@wariba/application';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function flagLabel(state: FeatureFlagState): {
  text: string;
  variant: 'success' | 'warning' | 'neutral' | 'danger';
} {
  switch (state.kind) {
    case 'not_gated':
      return { text: 'Aucune clé de flag', variant: 'neutral' };
    case 'unknown_key':
      // Fail-closed in the resolver, but an unrecognised key is not the same
      // statement as a deliberate "off" — the operator must see the
      // difference.
      return { text: 'Clé inconnue du résolveur', variant: 'danger' };
    case 'known':
      return state.enabled
        ? { text: 'Flag actif', variant: 'success' }
        : { text: 'Flag inactif', variant: 'warning' };
  }
}

/**
 * The commercial catalogue.
 *
 * Read-only. `commercial_product.modify` exists as a permission but has no
 * call site anywhere in the codebase — no canonical commercial mutation is
 * implemented, so Prompt 09 surfaces none. Inventing one would mean
 * inventing its semantics too, with retroactive repricing of versions that
 * accounts were already purchased against as the obvious hazard.
 *
 * "Enabled" is never derived from `feature_flag_key` being non-null. It
 * comes from the canonical resolver, layered with the treasury reserve zone,
 * and both halves are shown separately because either one can suppress a
 * product for entirely different reasons.
 */
export default async function ControlCommercialPage() {
  await requireControlArea('commercial');
  const catalogue = await loadCommercialCatalogue(getDb());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text as="h1" variant="heading-lg">
            Commercial
          </Text>
          <Text variant="body-sm" color="secondary">
            Produits et versions de prix tels que persistés. Lecture seule.
          </Text>
        </div>
        <Badge variant="neutral">Zone de réserve : {catalogue.reserve.zone}</Badge>
      </div>

      <Alert level="information" title="Lecture seule">
        Aucune opération commerciale canonique n’est implémentée : Control n’édite ni les prix
        historiques, ni les frais d’activation, ni les clés de flag, et ne touche à aucun achat.
      </Alert>

      <Alert level="warning" title="Statut de la grille">
        {PRICING_STATUS_NOTE}
      </Alert>

      <Card padding="comfortable" className="flex flex-col gap-3">
        <Text as="h2" variant="heading-sm">
          Source de l’état des flags
        </Text>
        <Text variant="body-sm" color="secondary">
          {FEATURE_FLAG_STATE_SOURCE}
        </Text>
        <Alert level="information" title="Portée de cette source">
          {FEATURE_FLAG_SOURCE_LIMITATION}
        </Alert>
        <Text variant="body-sm" color="secondary">
          La disponibilité commerciale combine deux conditions indépendantes : l’état du flag
          ci-dessus et la zone de réserve trésorerie (TREASURY-002). L’une ou l’autre suffit à
          retirer un produit de la vente.
        </Text>
      </Card>

      <Alert level="warning" title="Prix founder">
        {FOUNDER_COHORT_GATE_NOTE}
      </Alert>

      {catalogue.products.length === 0 ? (
        <EmptyState title="Aucun produit" description="Le catalogue produit est vide en base." />
      ) : (
        catalogue.products.map((product) => {
          const live = product.versions.find((version) => version.retiredAt === null);
          const gate = evaluateCommercialGate({
            featureFlagKey: live?.featureFlagKey ?? null,
            productCode: product.code,
            zone: catalogue.reserve.zone,
          });
          const flag = flagLabel(gate.flagState);

          return (
            <Card key={product.id} padding="comfortable" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Text as="h2" variant="heading-sm">
                    {product.code}
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    Nominal {product.nominalBalance} {product.nominalCurrency}
                  </Text>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={flag.variant}>{flag.text}</Badge>
                  <Badge variant={gate.zoneAllows ? 'success' : 'danger'}>
                    {gate.zoneAllows ? 'Zone autorise' : 'Zone suspend'}
                  </Badge>
                  <Badge variant={gate.commerciallyAvailable ? 'success' : 'danger'}>
                    {gate.commerciallyAvailable ? 'Disponible à la vente' : 'Indisponible'}
                  </Badge>
                </div>
              </div>

              {live ? (
                <Text variant="body-sm" color="secondary">
                  Clé de flag de la version courante :{' '}
                  <span className="wariba-data">{live.featureFlagKey ?? 'aucune'}</span>
                </Text>
              ) : (
                <Text variant="body-sm" color="secondary">
                  Aucune version non retirée : ce produit n’a pas de prix courant.
                </Text>
              )}

              <DataTable>
                <DataTableHead>
                  <DataTableRow>
                    <DataTableHeaderCell>Version</DataTableHeaderCell>
                    <DataTableHeaderCell align="right">Prix public</DataTableHeaderCell>
                    <DataTableHeaderCell align="right">Prix founder</DataTableHeaderCell>
                    <DataTableHeaderCell>Devise</DataTableHeaderCell>
                    <DataTableHeaderCell align="right">Frais d’activation</DataTableHeaderCell>
                    <DataTableHeaderCell>Clé de flag</DataTableHeaderCell>
                    <DataTableHeaderCell>Effective le</DataTableHeaderCell>
                    <DataTableHeaderCell>Retirée le</DataTableHeaderCell>
                    <DataTableHeaderCell align="right">Commandes</DataTableHeaderCell>
                  </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                  {product.versions.map((version) => (
                    <DataTableRow key={version.id}>
                      <DataTableCell>
                        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                          {version.id.slice(0, 8)}
                        </span>
                        {version.retiredAt === null ? (
                          <>
                            {' '}
                            <Badge variant="success">courante</Badge>
                          </>
                        ) : null}
                      </DataTableCell>
                      {/* Public and founder price stay in separate columns —
                          they are different commitments, not fallbacks. */}
                      <DataTableCell numeric>{version.priceAmount}</DataTableCell>
                      <DataTableCell numeric>{version.founderPriceAmount ?? 'aucun'}</DataTableCell>
                      <DataTableCell>{version.priceCurrency}</DataTableCell>
                      <DataTableCell numeric>{version.activationFee}</DataTableCell>
                      <DataTableCell>
                        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                          {version.featureFlagKey ?? 'aucune'}
                        </span>
                      </DataTableCell>
                      <DataTableCell>{DATE_TIME.format(version.effectiveFrom)}</DataTableCell>
                      <DataTableCell>
                        {version.retiredAt ? DATE_TIME.format(version.retiredAt) : 'non retirée'}
                      </DataTableCell>
                      <DataTableCell numeric>{version.purchaseOrderCount}</DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </Card>
          );
        })
      )}
    </div>
  );
}
