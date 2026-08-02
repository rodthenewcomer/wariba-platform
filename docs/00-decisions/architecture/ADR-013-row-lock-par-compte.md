# ADR-013: Row lock par compte

- Status: Accepted
- Date: 2026-08-01
- Source: WARIBA System Architecture v1.0 §130 (ADR-013), scaffolded during Prompt 01 (Repository Foundation)

## Context

Deux commandes concurrentes sur le même compte peuvent dépasser la marge, le risque, ou créer un double close.

## Decision

Toute commande modifiant un compte acquiert un verrou de ligne (`SELECT ... FOR UPDATE`) avant de recharger l'état, valider et exécuter.

## Consequences

Élimine les races par sérialisation au niveau compte (System Architecture §37).
