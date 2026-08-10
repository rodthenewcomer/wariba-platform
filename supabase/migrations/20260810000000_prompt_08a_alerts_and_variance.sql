-- Appendix 08-A corrective patch.
--
-- 1. System-level operational alerts. app.operations_incidents already
--    carried account-scoped incidents (reconciliation mismatch, integrity
--    hold) and de-duplicated them with a partial unique index that only
--    applies when account_id is not null. Platform-wide alerts (leader
--    lost, feed outage, reserve zone) have no account, so they need their
--    own de-duplication or every evaluation tick would open a new row.
--
-- 2. Automatic resolution. The original constraint required resolved_by,
--    which assumes a human closes every incident. An alert whose condition
--    has cleared should close itself; resolved_by null now means "resolved
--    by the platform", and a reason is still mandatory either way.
--
-- 3. Actuarial variance runs — the ACTUAL/VARIANCE half of the model.
--    app.actuarial_scenario_runs stores MODEL output only; this stores an
--    immutable comparison of a model run against metrics measured from real
--    persisted operational data, with explicit coverage metadata so an
--    under-powered sample is visible rather than silently reported as
--    agreement.
--
-- Rollback: drop index operations_incidents_one_open_system_code; drop
-- table app.actuarial_variance_runs. The constraint change is a relaxation
-- and is safe to leave in place.

create unique index operations_incidents_one_open_system_code
  on app.operations_incidents (incident_code)
  where status = 'open' and account_id is null;

alter table app.operations_incidents
  drop constraint operations_incidents_resolution_matches_status,
  add constraint operations_incidents_resolution_matches_status check (
    (status = 'open' and resolved_at is null and resolved_by is null and resolution_reason is null)
    or
    (status = 'resolved' and resolved_at is not null and length(btrim(resolution_reason)) > 0)
  );

comment on column app.operations_incidents.resolved_by is
  'The staff member who resolved this incident, or null when the platform resolved it automatically because the alert condition cleared.';

create table app.actuarial_variance_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_run_id uuid not null references app.actuarial_scenario_runs (id),
  scenario_name text not null,
  scenario_version integer not null,
  as_of timestamptz not null,
  -- The modelled cohort versus the number of real purchases the ACTUAL
  -- side was measured from. Kept as separate columns (not just inside the
  -- jsonb) because "was this comparison powered at all" is the first
  -- question anyone asks of a variance report.
  model_cohort_size integer not null check (model_cohort_size >= 0),
  actual_sample_size integer not null check (actual_sample_size >= 0),
  coverage text not null check (coverage in ('insufficient_data', 'partial', 'comparable')),
  -- One row per compared metric: metric identity, model value, actual
  -- value, absolute variance and relative variance.
  metrics jsonb not null check (jsonb_typeof(metrics) = 'array'),
  executed_by uuid references auth.users (id),
  executed_at timestamptz not null default now()
);

comment on table app.actuarial_variance_runs is
  'Appendix 08-A — immutable MODEL vs ACTUAL comparison. MODEL comes from app.actuarial_scenario_runs (simulated); ACTUAL is measured from real persisted sandbox operations; VARIANCE is the deterministic difference. Never overwrites either side. Rollback: drop table app.actuarial_variance_runs.';

alter table app.actuarial_variance_runs enable row level security;

create index actuarial_variance_runs_executed_at_idx
  on app.actuarial_variance_runs (executed_at desc);
