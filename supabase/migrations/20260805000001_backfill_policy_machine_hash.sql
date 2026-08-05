-- Prompt 05 — backfill the real machine_hash for the two seeded WARIBA_ONE
-- policy_versions rows, now that packages/policies/src/hash.ts's
-- canonicalization exists (canonical JSON: keys sorted recursively, no
-- whitespace, sha256, "sha256:" hex prefix).
--
-- The placeholder values seeded by 20260804000007_policy_symbol_specs_v1_1.sql
-- did not reproduce under this — or any other — canonicalization attempted
-- during design; they were provisional. These UPDATEs were computed by
-- running hash.ts's exact algorithm against each row's actual stored
-- parameters_json (verified live against this database, not hand-transcribed),
-- so packages/policies/src/loader.ts's `strict: true` hash verification
-- passes against real data going forward. Non-destructive: only the
-- machine_hash column changes, on rows that already exist.

update app.policy_versions
set machine_hash = 'sha256:e453ec14aca0ccdaf82109eb7e77a8667514b8eec0b2178df3bcde25b597538f'
where program = 'WARIBA_ONE' and semantic_version = '1.0.0';

update app.policy_versions
set machine_hash = 'sha256:334b220c914b2cbf679b189ed01500254976b161012ca6726f469f17fd16fd6d'
where program = 'WARIBA_ONE' and semantic_version = '1.1.0';
