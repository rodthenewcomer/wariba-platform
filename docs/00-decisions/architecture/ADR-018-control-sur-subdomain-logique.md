# ADR-018: Control sur subdomain logique

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-018), scaffolded during Prompt 01 (Repository Foundation)

## Context

WARIBA Control manipule des actions sensibles (payout review, RBAC, incidents) et ne doit jamais être accessible depuis la navigation trader.

## Decision

`control.wariba.app` comme séparation logique avec middleware renforcé, MFA, session courte et CSP stricte.

## Consequences

Isolation de sécurité sans dépôt ou déploiement séparé pour l'instant (System Architecture §51.3, ADR-017).
