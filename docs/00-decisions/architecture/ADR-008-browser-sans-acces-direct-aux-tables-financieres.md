# ADR-008: Browser sans accès direct aux tables financières

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-008), scaffolded during Prompt 01 (Repository Foundation)

## Context

Le serveur doit rester seul autoritaire sur ordres, fills, positions, PnL, balance, equity et payouts.

## Decision

Le navigateur ne lit ni n'écrit jamais directement une table financière ; tout passe par le Web/BFF ou le Realtime Engine.

## Consequences

Supabase client navigateur limité à Auth/session (System Architecture §21.3).
