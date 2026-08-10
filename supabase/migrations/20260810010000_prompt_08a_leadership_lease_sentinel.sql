-- Appendix 08-A corrective patch — leadership lease sentinel.
--
-- app.realtime_leadership.lease_expires_at was seeded with '-infinity' as
-- an "expired forever" sentinel. That is correct SQL and compares exactly
-- the way the election logic wants, but node-postgres does not decode an
-- infinite timestamptz into a Date — it hands back a non-Date value, so the
-- first acquireOrRenewRealtimeLeadership() on a freshly migrated database
-- threw `lease_expires_at.getTime is not a function` and the realtime
-- service could not take leadership at all.
--
-- Every previous test run masked this: the row had already been overwritten
-- with a real timestamp by an earlier test, so only a genuinely clean
-- database reached the sentinel path. A first production deploy would have
-- hit it immediately.
--
-- The Unix epoch is an equally-expired sentinel that every driver decodes
-- as an ordinary Date. The application code is also hardened to coerce this
-- column defensively, so neither layer depends on the other for safety.
--
-- Rollback: alter column lease_expires_at set default '-infinity'.

alter table app.realtime_leadership
  alter column lease_expires_at set default to_timestamp(0);

update app.realtime_leadership
set lease_expires_at = to_timestamp(0)
where lease_expires_at = '-infinity';

comment on column app.realtime_leadership.lease_expires_at is
  'Lease expiry. Seeded to the Unix epoch (already expired) rather than -infinity: an infinite timestamptz does not decode to a JavaScript Date, which broke leadership acquisition on a fresh database.';
