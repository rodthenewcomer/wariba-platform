# ADR-007: Kysely + SQL migrations

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-007), scaffolded during Prompt 01 (Repository Foundation)

## Context

Les calculs financiers et le ledger exigent un contrôle SQL explicite (verrous, contraintes, requêtes analytiques).

## Decision

Kysely comme query builder typé ; migrations SQL explicites via Supabase CLI, jamais un ORM lourd qui masque le SQL.

## Consequences

Le SQL reste visible et auditable (System Architecture §22).
