# ADR-001: Modular monolith

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-001), scaffolded during Prompt 01 (Repository Foundation)

## Context

L'équipe est petite et le budget initial (~1000 USD) est contraint.

## Decision

WARIBA est construit comme un modular monolith : un domaine partagé, des modules métier isolés par frontières logiques, pas de microservices métier.

## Consequences

Simplicité opérationnelle et déploiement. Passage à des services séparés seulement si un besoin réel apparaît (System Architecture §87).
