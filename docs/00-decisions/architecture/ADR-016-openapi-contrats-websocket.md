# ADR-016: OpenAPI + contrats WebSocket

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-016), scaffolded during Prompt 01 (Repository Foundation)

## Context

Les frontières HTTP et WebSocket doivent être vérifiables en CI et stables dans le temps.

## Decision

Les endpoints HTTP sont décrits en OpenAPI ; les messages WebSocket en AsyncAPI ou contrat équivalent versionné.

## Consequences

La CI peut détecter un changement breaking avant qu'il n'atteigne un client (System Architecture §58, §61).
