import { Alert, Badge, Card, StatTile, Text } from '@wariba/ui';
import { loadControlPolicyDetail } from '@wariba/application';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireControlArea } from '../../../../../lib/staff-auth';
import { getDb } from '../../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        {label}
      </dt>
      <dd className="wariba-data break-all">{value}</dd>
    </div>
  );
}

/**
 * Renders the stored parameters exactly as they are.
 *
 * If the column does not hold what a policy is supposed to hold, that is the
 * fact worth showing. Coercing it into a plausible-looking shape would let a
 * corrupted or half-migrated policy read as a healthy one — on the surface
 * whose entire job is to tell an operator what the platform is running on.
 */
function serializeParameters(parameters: unknown): { text: string; malformed: boolean } {
  if (parameters === null || parameters === undefined) {
    return { text: '', malformed: true };
  }
  if (typeof parameters !== 'object' || Array.isArray(parameters)) {
    return { text: JSON.stringify(parameters, null, 2) ?? String(parameters), malformed: true };
  }
  try {
    return { text: JSON.stringify(parameters, null, 2), malformed: false };
  } catch {
    return { text: String(parameters), malformed: true };
  }
}

/**
 * One policy version, read-only.
 *
 * No textarea that submits, no Save, no publish/approve/retire. Those
 * operations do not exist server-side either — this page is not hiding a
 * capability, there is none to hide.
 */
export default async function ControlPolicyDetailPage({
  params,
}: {
  params: Promise<{ policyVersionId: string }>;
}) {
  await requireControlArea('policies');
  const { policyVersionId } = await params;
  if (!UUID_PATTERN.test(policyVersionId)) notFound();

  const policy = await loadControlPolicyDetail(getDb(), policyVersionId);
  if (!policy) notFound();

  const parameters = serializeParameters(policy.parametersJson);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/control/policies"
          className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
        >
          ← Policies
        </Link>
        <Text as="h1" variant="heading-lg">
          {policy.program} · {policy.semanticVersion}
        </Text>
        <div className="flex flex-wrap gap-2">
          <Badge variant={policy.status === 'published' ? 'success' : 'neutral'}>
            {policy.status}
          </Badge>
          {policy.currentlyEffective ? <Badge variant="success">En vigueur</Badge> : null}
        </div>
      </div>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Identité
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Identifiant" value={policy.id} />
          <Field label="Programme" value={policy.program} />
          <Field label="Version sémantique" value={policy.semanticVersion} />
          <Field label="Statut du cycle de vie" value={policy.status} />
          <Field
            label="Effective le"
            value={policy.effectiveFrom ? DATE_TIME.format(policy.effectiveFrom) : 'non définie'}
          />
          <Field
            label="Retirée le"
            value={policy.retiredAt ? DATE_TIME.format(policy.retiredAt) : 'non retirée'}
          />
          <Field label="Créée le" value={DATE_TIME.format(policy.createdAt)} />
        </dl>
        {!policy.currentlyEffective && policy.status === 'published' && !policy.retiredAt ? (
          <Alert level="information" title="Publiée mais pas en vigueur">
            Une version publiée et non retirée n’est pas automatiquement celle qui s’applique : le
            moteur retient la version publiée la plus récemment créée pour ce programme.
          </Alert>
        ) : null}
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Intégrité
        </Text>
        <Text variant="body-sm" color="secondary">
          Empreintes telles que stockées. Un hash absent est signalé comme indisponible, jamais
          comblé.
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Field
            label="Hash du document humain"
            value={policy.humanDocumentHash ?? 'indisponible'}
          />
          <Field label="Hash machine" value={policy.machineHash ?? 'indisponible'} />
        </dl>
        {!policy.humanDocumentHash || !policy.machineHash ? (
          <Alert level="warning" title="Empreinte manquante">
            Au moins une empreinte n’est pas enregistrée pour cette version. L’intégrité du document
            correspondant ne peut donc pas être vérifiée depuis Control.
          </Alert>
        ) : null}
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Usage opérationnel
        </Text>
        <Text variant="body-sm" color="secondary">
          Preuve seulement : Control ne migre aucun compte vers une version plus récente et ne
          réécrit jamais la version épinglée d’un compte.
        </Text>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Comptes épinglés" value={String(policy.usage.accountCount)} />
          <StatTile label="Evaluation" value={String(policy.usage.evaluationAccountCount)} />
          <StatTile label="Performance" value={String(policy.usage.performanceAccountCount)} />
        </div>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Paramètres
        </Text>
        <Text variant="body-sm" color="secondary">
          `parameters_json` tel que stocké. Lecture seule — aucun champ modifiable, aucune
          soumission.
        </Text>
        {parameters.malformed ? (
          <Alert level="danger" title="Paramètres inattendus">
            Le contenu stocké n’a pas la forme d’un objet de paramètres de politique. Il est affiché
            tel quel plutôt que normalisé en données de politique plausibles.
          </Alert>
        ) : null}
        <pre className="mt-3 max-h-[32rem] overflow-auto rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-canvas)] p-3 text-[length:var(--wariba-font-size-data-sm)]">
          {parameters.text || '(vide)'}
        </pre>
      </Card>
    </div>
  );
}
