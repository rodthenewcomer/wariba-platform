# ADR-020: Assist déterministe V1

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-020), scaffolded during Prompt 01 (Repository Foundation)

## Context

WARIBA Assist ne doit donner aucun conseil de trading et rester explicable.

## Decision

V1 déterministe : recherche PostgreSQL full-text, réponses basées sur des templates et des règles indexées — pas de LLM en V1.

## Consequences

Un LLM ne sera ajouté qu'avec corpus, citations, garde-fous et évaluation (System Architecture §67).
