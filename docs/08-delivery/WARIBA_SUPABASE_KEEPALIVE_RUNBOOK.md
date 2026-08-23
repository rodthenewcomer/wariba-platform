# Runbook — keeping the hosted Supabase project awake

## What happened

The hosted project (`ubcolxyjfrqmjtxjkvur`) was **paused for inactivity** on
the free tier, which pauses a project after roughly seven days with no database
activity.

The symptom is misleading and worth recording, because it cost this project a
wrong diagnosis:

```
$ nslookup db.ubcolxyjfrqmjtxjkvur.supabase.co
  ** server can't find … : NXDOMAIN

$ psql "$DATABASE_URL"
  error: (ENOTFOUND) tenant/user postgres.ubcolxyjfrqmjtxjkvur not found
```

**A paused project has its DNS record withdrawn.** `NXDOMAIN` and
"tenant not found" therefore look exactly like a *deleted* project. It is not
deleted, the data is intact, and it can be restored from the dashboard — a
restore takes a few hours.

## Why it mattered more than it looks

Nothing in the repository was watching. CI runs a scheduled certification job
daily, but that job stands up a **local** Supabase — it has never sent a single
request to the hosted project. Nothing else runs on a schedule against it. The
project could pause, and did, with no signal at all.

For a private beta that is disqualifying: a tester who arrives on the eighth
quiet day meets a dead product.

---

## The system

### 1. Scheduled keepalive — `.github/workflows/keepalive.yml`

Runs **twice daily** (06:23 and 18:23 UTC) and calls
`packages/database/scripts/db-keepalive.mjs`.

Once a day would be ample against a seven-day window. It runs twice because
this job is also, right now, WARIBA's **only availability check** — there is no
error tracking and no status page (`ARCH-026` and `OPS-011` are `OPEN`), so a
twelve-hour blind spot costs more than two minutes of runner time.

The schedule avoids 02:17, when certification runs, so a busy runner queue
cannot delay both.

### 2. What the query actually does

It is deliberately not `SELECT 1`:

```sql
select (select count(*)::int from app.policy_versions) as policy_versions,
       (select count(*)::int from app.products)        as products,
       current_database(), now()
```

- **Real tables** — a pass means the schema is present, not merely that a
  socket opened against an empty database.
- **Read-only** — a keepalive that writes will eventually corrupt something at
  3am.
- **Latency reported** — a project that is awake but degrading shows up before
  it fails.
- **Empty result is a failure** — reachable-but-empty means the wrong project or
  missing migrations, and both deserve a shout.

### 3. Exit codes, and why there are three

| Code | Meaning | Job result |
|---:|---|---|
| `0` | Reachable, schema present | pass |
| `1` | Unreachable or query failed | **fail** |
| `2` | `DATABASE_URL` not configured | fail on the canonical repo, skip on forks |

`2` exists so that "nobody configured this" and "the database is down" are never
confused. A fork with no secret must not page anyone; the canonical repository
with no secret means the keepalive is *not running*, which is itself the
failure being guarded against.

### 4. Failure output names the trap

On `ENOTFOUND` or `tenant/user not found`, both the script and the workflow say
plainly that this is what a **paused** project looks like and that the DNS is
withdrawn — so the next person checks the dashboard instead of concluding the
project was deleted.

---

## Setup — one secret, once

```text
GitHub → Settings → Secrets and variables → Actions → New repository secret

  Name:  SUPABASE_KEEPALIVE_DATABASE_URL
  Value: postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Use the **pooled** connection string (port 6543) from
*Project Settings → Database → Connection string → Transaction pooler*.

Then verify without waiting for the schedule:

```text
Actions → DB Keepalive → Run workflow
```

A green run logs `keepalive.ok` with latency and row counts.

### Verify locally at any time

```bash
DATABASE_URL='postgresql://…' pnpm db:keepalive
```

---

## Limits you should know about

**1. GitHub disables scheduled workflows after 60 days of repository
inactivity.** If nobody pushes for two months, the keepalive silently stops and
the project pauses a week later. GitHub emails the repository owner first.
Any commit re-enables it.

**2. This does not survive the free tier's other limits.** Pausing is one
free-tier behaviour; there are also storage and egress ceilings that a keepalive
cannot help with.

**3. It keeps the project awake, not healthy.** It proves the database answers.
It says nothing about realtime, the worker, or the web app — those get real
health checks in 3.7.

---

## The actual fix

> **Upgrade the project to Supabase Pro before the private beta opens.**

Paid projects do not pause. Everything above is the correct answer *while the
project is free*, and a useful external liveness probe afterwards — but a beta
whose database depends on a cron job in a repository that must stay active is
one quiet fortnight away from an outage.

This is a purchasing decision, so it is recorded here rather than assumed. The
credential checklist lists the staging project as hard blocker #1
(`WARIBA_PHASE_3_CREDENTIAL_CHECKLIST.md`); the plan tier belongs to the same
decision.

## When this becomes redundant

Once `services/worker` is deployed in **3.1B**, it polls the database every
`WORKER_POLL_INTERVAL_MS` — 60 seconds by default. The project can never be idle
again, and the keepalive stops being load-bearing.

Keep it anyway. At that point it becomes the one check that does **not** depend
on WARIBA's own infrastructure being up, which is exactly what you want from a
monitor.
