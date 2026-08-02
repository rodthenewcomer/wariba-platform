# ADR-006: PostgreSQL/Supabase

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-006), scaffolded during Prompt 01 (Repository Foundation)

## Context

Besoin d'une base relationnelle avec RLS, Auth et Storage gérés, sans opérer l'infrastructure soi-même en V1.

## Decision

PostgreSQL managé par Supabase comme source durable ; Supabase Auth et Storage utilisés via adapters.

## Consequences

RLS obligatoire sur toute table utilisateur privée. Le navigateur n'accède jamais directement aux tables financières (System Architecture §21, ADR-008).
