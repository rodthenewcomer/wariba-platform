-- Prompt 03 audit correction: consent is immutable evidence and must remain
-- idempotent when checkout is retried or submitted concurrently.

create unique index user_consents_version_locale_uidx
  on app.user_consents (user_id, consent_type, policy_version_id, locale);

