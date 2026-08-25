# WARIBA — Phase 3.3.1 source audit

```text
DATE   = 2026-08-24
BRANCH = feat/wariba-phase-3-private-beta-completion
SCOPE  = Evaluation -> Performance handoff only
```

This audit records the repository state before Phase 3.3.1 implementation. It
does not replace the dated Product OS Master audit. Higher-authority decisions
`ONE-025` and `PERF-020` govern the implementation: pass is automatic and one
Performance account is created from one successful Evaluation.

## Truth table before implementation

| Requirement | Status | Current source evidence / actual gap |
|---|---|---|
| Objective reached is distinct from pass in the trader projection | DONE | `account-lifecycle.ts` maps an open-session `pass_pending` to `objective_reached`. |
| Intraday objective cannot become pass | PARTIAL | The first risk evaluation writes `pass_pending`, but any later risk evaluation can currently promote it to `passed`; the writer does not require a daily-finalization trigger. |
| Pass only after daily finalization | PARTIAL | The worker finalizes the snapshot first, but `risk.ts` also accepts `manual_review` or trade-triggered promotion. Existing integration tests explicitly use `manual_review` to pass. |
| Finalization state visible to the trader | PARTIAL | A lifecycle label exists, but `command-center.ts` checks the newest snapshot; after finalization a new open snapshot is created, so the intended `under_review` projection can be missed. |
| Exactly one Performance account | DONE | `source_evaluation_account_id` is unique and provisioning is inside the pass transaction. |
| Parent-child relation stored | DONE | `trading_accounts.source_evaluation_account_id` is canonical and queryable. |
| Parent-child relation visible in Hub / Accounts | MISSING | Account summaries and cards omit both directions. |
| Parent-child relation visible in Support | MISSING | Support account evidence includes the selected account only. |
| Parent-child relation visible in Control | MISSING | Control account detail omits source Evaluation and child Performance. |
| Performance policy pinned to the child | DONE | Provisioning loads the published Performance policy and stores its immutable ID on the child. |
| Evaluation pass / provisioning / ready handoff | PARTIAL | Generic lifecycle banner exists; the passed dashboard still prioritizes the old dashboard, generic terminal content, quick actions and a new-evaluation CTA. |
| Performance rules onboarding | MISSING | No account-specific onboarding route or read model exists. |
| Dynamic ONE vs Performance comparison | MISSING | No comparison DTO exists. |
| Rules acknowledgement attached to account and policy version | MISSING | Existing consent storage is user-scoped and cannot prove the account or attached policy version. |
| Account-specific rules route | MISSING | No canonical `/comptes/{account}/regles` route exists. |
| Performance payout path / first-day state | PARTIAL | The Performance mission and payout lifecycle are authoritative and dynamic, but no onboarding path explains the new rules before the first trade. |
| Evaluation non-tradable after pass | DONE | `/trade` only mounts WariX for `active`; `passed` is refused server-side. |
| Performance tradable only when active | DONE | The same server gate requires `active`. |
| Old Evaluation redirects to its Performance account | MISSING | The gate gives a generic Hub action and does not name or link the child. |
| WariX correct Performance context | PARTIAL | The server supplies program/public ID to the workstation selector, but the direct passed-Evaluation gate is not parent-child aware. A dormant `TradeHeaderPanel` still contains a hard-coded ONE label but is not mounted. |
| Trader lifecycle timeline | PARTIAL | Account transitions feed recent activity, but copy collapses pass and Performance activation and does not expose the handoff sequence. |
| Handoff observability / analytics | PARTIAL | Pass and `performance.activated` are durable events; viewed, acknowledged and opened onboarding events are absent. |
| Security / ownership | DONE for existing reads | Account lists are user-scoped and WariX resolves only from the authenticated user list. New acknowledgement and detail routes still require backend ownership enforcement and tests. |
| Mobile / accessibility / visual evidence | MISSING for 3.3.1 | Earlier lifecycle evidence does not cover the complete handoff, rules onboarding or linked accounts required by this slice. |

## Architecture constraints applied

1. Risk remains the sole owner of pass eligibility and values.
2. `pass_pending -> passed` will be restricted to the daily-finalization path;
   Control remains post-result review only under `ONE-025`.
3. The original Evaluation and its ledger remain immutable and non-tradable.
4. The existing unique parent key remains the final idempotence invariant.
5. Rules UI will read both policies pinned to the actual parent and child;
   React will not contain financial rule constants.
6. Acknowledgement will record the authenticated owner, Performance account,
   attached policy version and timestamp through a server command.
7. WariX changes are limited to the account handoff gate/context required by
   this slice; chart, execution and market behavior stay untouched.

## Explicitly not started

- Phase 3.4 public routes or marketing proof;
- provider integration, KYC provider, payout rail or email;
- WariX professionalisation, indicators or chart redesign;
- P1 celebration, certificate or notifications.
