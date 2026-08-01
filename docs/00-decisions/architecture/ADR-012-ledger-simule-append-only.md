# ADR-012: Ledger simulé append-only

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-012), scaffolded during Prompt 01 (Repository Foundation)

## Context

Aucune balance ne doit être corrigée par édition directe (intégrité financière).

## Decision

Le solde d'un compte simulé est dérivé d'un ledger append-only (`trading_ledger_entries`) ; toute correction crée une nouvelle entrée (reversal/adjustment), jamais une mise à jour destructive.

## Consequences

Balance toujours réconciliable et auditable (System Architecture §26, Engineering Constitution §9.4).
