# ADR-023: Production manuelle

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-023), scaffolded during Prompt 01 (Repository Foundation)

## Context

Les changements financiers exigent une réduction du risque de déploiement.

## Decision

Le déploiement en production nécessite une approbation humaine explicite (backup → approbation → migration → deploy → smoke → monitoring).

## Consequences

Aucun déploiement production automatique à chaque push (System Architecture §83.3, DECISION_LOG REJ-015).
