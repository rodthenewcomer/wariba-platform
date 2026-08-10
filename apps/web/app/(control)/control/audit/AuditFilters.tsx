import { AUDIT_PAGE_SIZES } from '@wariba/application';

export interface AuditFilterOptions {
  roles: readonly string[];
  activities: readonly string[];
  targetTypes: readonly string[];
}

export interface AuditFilterValues {
  actor: string;
  role: string;
  activity: string;
  targetType: string;
  target: string;
  correlation: string;
  from: string;
  to: string;
  pageSize: number;
}

const FIELD_CLASS =
  'rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] ' +
  'bg-[color:var(--wariba-background-surface)] px-2 py-1.5 ' +
  'text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]';

const LABEL_CLASS =
  'flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] ' +
  'text-[color:var(--wariba-text-secondary)]';

/**
 * A plain GET form, deliberately.
 *
 * Filtering the audit trail is a read, so it submits to the same URL and the
 * server does the work — which keeps the whole explorer free of any Server
 * Action, and therefore free of any code path that could mutate audit
 * evidence. It also makes every filtered view a real, shareable URL: an
 * investigation can be bookmarked, pasted into an incident, and reloaded
 * without replaying anyone's clicks.
 *
 * Options come from the data (`loadAuditFilterOptions`) rather than a
 * hard-coded list, so the filters can only offer values that actually occur
 * — a role or action that has never been recorded is not worth offering, and
 * a newly-introduced one appears without a code change.
 */
export function AuditFilters({
  options,
  values,
}: {
  options: AuditFilterOptions;
  values: AuditFilterValues;
}) {
  return (
    <form method="get" action="/control/audit" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={LABEL_CLASS}>
          Rôle
          <select name="role" defaultValue={values.role} className={FIELD_CLASS}>
            <option value="">Tous</option>
            {options.roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS}>
          Action / permission
          <select name="activity" defaultValue={values.activity} className={FIELD_CLASS}>
            <option value="">Toutes</option>
            {options.activities.map((activity) => (
              <option key={activity} value={activity}>
                {activity}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS}>
          Type de cible
          <select name="targetType" defaultValue={values.targetType} className={FIELD_CLASS}>
            <option value="">Tous</option>
            {options.targetTypes.map((targetType) => (
              <option key={targetType} value={targetType}>
                {targetType}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS}>
          Taille de page
          <select name="pageSize" defaultValue={String(values.pageSize)} className={FIELD_CLASS}>
            {AUDIT_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS}>
          Acteur (UUID)
          <input
            type="text"
            name="actor"
            defaultValue={values.actor}
            placeholder="00000000-0000-0000-0000-000000000000"
            className={FIELD_CLASS}
          />
        </label>

        <label className={LABEL_CLASS}>
          Cible (UUID)
          <input
            type="text"
            name="target"
            defaultValue={values.target}
            placeholder="00000000-0000-0000-0000-000000000000"
            className={FIELD_CLASS}
          />
        </label>

        <label className={LABEL_CLASS}>
          Corrélation
          <input
            type="text"
            name="correlation"
            defaultValue={values.correlation}
            className={FIELD_CLASS}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className={LABEL_CLASS}>
            Du
            <input type="date" name="from" defaultValue={values.from} className={FIELD_CLASS} />
          </label>
          <label className={LABEL_CLASS}>
            Au
            <input type="date" name="to" defaultValue={values.to} className={FIELD_CLASS} />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-selected)] px-3 py-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
        >
          Filtrer
        </button>
        <a
          href="/control/audit"
          className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
        >
          Réinitialiser
        </a>
      </div>
    </form>
  );
}
