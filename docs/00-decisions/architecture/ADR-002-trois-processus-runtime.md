# ADR-002: Trois processus runtime

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-002), scaffolded during Prompt 01 (Repository Foundation)

## Context

Web/HTTP, connexions WebSocket temps réel et jobs asynchrones ont des contraintes runtime différentes.

## Decision

Trois processus déployés séparément — Web/BFF (Next.js), Realtime (Fastify+WebSocket), Worker (Node) — partageant le même domaine, la même base et les mêmes packages.

## Consequences

Ce ne sont pas des microservices métier ; ils partagent packages/domain. Scaling indépendant possible plus tard sans réécriture (System Architecture §3, §7).
