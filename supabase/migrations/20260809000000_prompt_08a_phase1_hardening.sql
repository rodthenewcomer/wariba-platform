alter table app.actuarial_scenario_assumptions
  drop constraint actuarial_scenario_assumptions_scenario_name_check,
  add constraint actuarial_scenario_assumptions_scenario_name_check
    check (scenario_name in ('conservative', 'base', 'aggressive', 'stress', 'custom')),
  add column notes text not null default '',
  add column effective_status text generated always as (
    case when is_active then 'active' else 'retired' end
  ) stored;

insert into app.actuarial_scenario_assumptions (
  scenario_name,
  assumptions_json,
  change_reason,
  notes
)
select
  'custom',
  assumptions_json,
  'Initial editable custom scenario copied from BASE',
  'Editable Control baseline; historical runs remain immutable.'
from app.actuarial_scenario_assumptions
where scenario_name = 'base' and is_active
on conflict (scenario_name, version) do nothing;

create table app.actuarial_scenario_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_assumption_id uuid not null references app.actuarial_scenario_assumptions (id),
  scenario_name text not null
    check (scenario_name in ('conservative', 'base', 'aggressive', 'stress', 'custom')),
  scenario_version integer not null check (scenario_version > 0),
  assumptions_snapshot jsonb not null check (jsonb_typeof(assumptions_snapshot) = 'object'),
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  executed_by uuid references auth.users (id),
  executed_at timestamptz not null default now()
);

create index actuarial_scenario_runs_history_idx
  on app.actuarial_scenario_runs (scenario_name, executed_at desc);

create function app.reject_actuarial_scenario_run_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Actuarial scenario runs are immutable';
end;
$$;

create trigger actuarial_scenario_runs_immutable
before update or delete on app.actuarial_scenario_runs
for each row execute function app.reject_actuarial_scenario_run_mutation();

alter table app.actuarial_scenario_runs enable row level security;
revoke all on table app.actuarial_scenario_runs from anon, authenticated;

comment on table app.actuarial_scenario_runs is
  'Appendix 08-A — immutable actuarial execution evidence containing the exact assumptions, cohort input and result snapshots used for every historical run.';
