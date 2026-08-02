# ADR-019: Supabase Auth

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-019), scaffolded during Prompt 01 (Repository Foundation)

## Context

Besoin d'authentification, de sessions et de MFA sans construire un système maison.

## Decision

Supabase Auth gère l'identité de base ; le Web/BFF valide la session et charge les permissions applicatives (RBAC séparé de l'authentification).

## Consequences

AuthN et AuthZ restent explicitement séparés (System Architecture §50, Engineering Constitution §21.4).
