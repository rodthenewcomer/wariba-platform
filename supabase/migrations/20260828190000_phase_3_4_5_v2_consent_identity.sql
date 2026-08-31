-- Phase 3.4.5 — consent identity follows the exact immutable policy UUID.
-- ONE Evaluation and FLEX Evaluation intentionally share semantic version
-- 2.1.0. The historical global semantic-version index therefore collides
-- across product families and can silently discard the second acceptance.

drop index if exists app.user_consents_version_locale_uidx;

create unique index user_consents_version_locale_uidx
  on app.user_consents (user_id, consent_type, policy_version_id, locale)
  where attached_policy_version_id is null;

comment on index app.user_consents_version_locale_uidx is
  'Legacy fallback only. V2 consent identity is enforced by user_consents_exact_policy_acceptance_uidx on exact policy UUID.';
