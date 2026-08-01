# ADR-021: Hosting Realtime/Worker vendor-neutral OCI

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-021), scaffolded during Prompt 01 (Repository Foundation)

## Context

Le fournisseur de conteneurs final reste `OPEN` (coût/latence/région à comparer).

## Decision

Realtime et Worker sont packagés comme conteneurs OCI standards plutôt que sur une API propriétaire non abstraite.

## Consequences

Portabilité entre fournisseurs sans réécriture (System Architecture §80.2).
