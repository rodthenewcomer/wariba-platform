# ADR-009: Transactional outbox PostgreSQL

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-009), scaffolded during Prompt 01 (Repository Foundation)

## Context

Les modules doivent communiquer par événements sans bus réseau (Kafka exclu en V1).

## Decision

Outbox transactionnelle PostgreSQL : l'événement métier est écrit dans la même transaction que le changement d'état, puis publié par un worker.

## Consequences

Fiabilité des événements sans infrastructure de message broker (System Architecture §9, §34).
