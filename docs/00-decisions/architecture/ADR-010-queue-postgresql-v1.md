# ADR-010: Queue PostgreSQL V1

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-010), scaffolded during Prompt 01 (Repository Foundation)

## Context

Les jobs asynchrones (notifications, finalisation journalière, retries) n'exigent pas encore une queue managée dédiée.

## Decision

Table jobs/outbox PostgreSQL avec `FOR UPDATE SKIP LOCKED`, retries et dead-letter.

## Consequences

Suffisant pour la charge de bêta privée (System Architecture §65). Redis/NATS seulement après mesure.
