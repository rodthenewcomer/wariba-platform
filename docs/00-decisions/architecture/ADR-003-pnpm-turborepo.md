# ADR-003: pnpm + Turborepo

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-003), scaffolded during Prompt 01 (Repository Foundation)

## Context

Le monorepo contient 3 apps/services et 11 packages avec des dépendances internes.

## Decision

pnpm workspaces pour l'installation et le linking, Turborepo pour l'orchestration des tâches et le cache.

## Consequences

Turborepo reste un outil d'orchestration, pas une couche de déploiement (System Architecture §9).
