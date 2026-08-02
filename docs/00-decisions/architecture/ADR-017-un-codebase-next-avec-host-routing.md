# ADR-017: Un codebase Next avec host routing

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-017), scaffolded during Prompt 01 (Repository Foundation)

## Context

Public, Platform et Control partagent design, packages et pipeline de déploiement.

## Decision

Un seul artefact Next.js ; le routage par nom d'hôte sépare Public / Platform / Control au lieu de trois apps distinctes.

## Consequences

Moins de maintenance qu'un multi-app ; séparation logique suffisante pour la bêta (System Architecture §54).
