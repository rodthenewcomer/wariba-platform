# ADR-011: Aucun Redis initial

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-011), scaffolded during Prompt 01 (Repository Foundation)

## Context

Un cache/queue distribué ajoute une dépendance opérationnelle non justifiée à ce stade.

## Decision

Pas de Redis en V1 ; PostgreSQL sert de source durable et de queue.

## Consequences

Introduit uniquement après un besoin mesuré (montée en charge Realtime) — System Architecture §74, §91.
