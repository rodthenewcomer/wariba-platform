# ADR-025: No event sourcing complet

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-025), scaffolded during Prompt 01 (Repository Foundation)

## Context

L'auditabilité est requise, mais reconstruire systématiquement l'état depuis tous les événements ajoute une complexité non justifiée en V1.

## Decision

WARIBA conserve les événements d'audit, l'outbox, les ordres, fills et transitions, mais l'état courant reste stocké directement plutôt que dérivé intégralement d'un event store.

## Consequences

Réduit la complexité tout en gardant l'auditabilité (System Architecture §20).
