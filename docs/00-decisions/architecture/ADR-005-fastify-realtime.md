# ADR-005: Fastify Realtime

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-005), scaffolded during Prompt 01 (Repository Foundation)

## Context

Le moteur temps réel doit gérer des connexions WebSocket persistantes, des ticks et l'exécution d'ordres à faible latence.

## Decision

Fastify + WebSocket pour le processus Realtime, séparé du Web/BFF.

## Consequences

Le Web/BFF ne maintient pas de connexions WebSocket longues (System Architecture §7.1-7.2).
