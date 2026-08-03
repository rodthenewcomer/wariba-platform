-- Prompt 03 audit correction: make sandbox payment-attempt creation
-- idempotent under both sequential retries and concurrent double-clicks.
--
-- Existing attempts remain immutable evidence. The new nullable key avoids a
-- destructive backfill; every attempt created by the corrected application
-- receives a deterministic per-order key and is protected by this index.

alter table app.payment_attempts
  add column attempt_key text;

create unique index payment_attempts_provider_attempt_key_uidx
  on app.payment_attempts (provider, attempt_key)
  where attempt_key is not null;

comment on column app.payment_attempts.attempt_key is
  'Server-generated payment-attempt idempotency key; sandbox uses purchase_order_id.';
