# ADR-004: Next.js Web/BFF

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-004), scaffolded during Prompt 01 (Repository Foundation)

## Context

Besoin d'un rendu web/PWA responsive, français, mobile-first, avec un seul codebase pour Public/Platform/Control.

## Decision

Next.js (App Router) sert de Web/BFF : pages, API routes, et point d'entrée HTTP.

## Consequences

Host routing (wariba.app / control.wariba.app) sur un seul artefact web (System Architecture §54).
