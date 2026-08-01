# ADR-014: Market sandbox seedé

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-014), scaffolded during Prompt 01 (Repository Foundation)

## Context

Aucune donnée de marché commerciale n'est licenciée pour la bêta privée.

## Decision

Un générateur de marché déterministe (seed + version) remplace un fournisseur réel jusqu'à la bêta payante.

## Consequences

Reproductibilité des tests et des replays de violation (System Architecture §39).
