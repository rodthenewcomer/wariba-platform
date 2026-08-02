# ADR-024: Policy + symbol specs immuables

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-024), scaffolded during Prompt 01 (Repository Foundation)

## Context

Une modification de règle ne doit jamais s'appliquer rétroactivement à un compte déjà activé.

## Decision

Les policy versions et les symbol specification sets sont publiés une fois puis jamais modifiés ; toute correction crée une nouvelle version.

## Consequences

Non-rétroactivité garantie par construction (System Architecture §105-107, Program Rulebook §45).
