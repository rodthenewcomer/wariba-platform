# WARIBA Product Experience 2026

Status: WX0 target constitution; subordinate to the Decision Log, Product Master, Rulebook and existing Design System.

## 1. Experience position

WARIBA is a progression infrastructure for disciplined simulated traders. Its product experience must help a trader understand the market, the account's constraints and the next safe action without theatrical urgency.

The 2026 direction is **Quiet Financial Authority with Kinetic Operational Clarity**:

- dark but not dead;
- colorful but not gaming;
- dense but not cramped;
- animated but not distracting;
- premium because it is precise, not because it is ornamental;
- professional without becoming gray or microscopic;
- powerful without inventing capabilities.

## 2. Five experience laws

1. **Authority is visible.** Server state, risk, connection and execution outcome are named in text and never inferred from color alone.
2. **The primary task owns space.** In WariX the plot dominates; in Hub progression dominates; in Control the investigation/evidence surface dominates.
3. **Density follows frequency.** Frequent actions are direct and compact. Rare or explanatory actions use progressive disclosure.
4. **Motion explains change.** It never simulates market activity, delays truth or celebrates financial outcomes.
5. **Honesty beats completeness.** Empty, sparse, stale or unavailable states are explicitly shown; no fake bars, metrics, symbols, volume, partners or outcomes.

## 3. WariX experience hierarchy

The trader should answer these questions in under three seconds:

1. Which account and program am I operating?
2. Is the connection and selected market usable?
3. What are the current bid/ask and chart context?
4. How close am I to DLL/MLL constraints?
5. What action is prepared, and what will it affect?

The visual order is therefore:

`account/risk instrumentation → selected market → plot → execution → activity`.

The data/overlay order is:

`trading overlays → live bid/ask → risk → selected analysis → normal analysis → grid`.

## 4. Density model

| Layer | Density | Typical geometry | Rule |
|---|---|---|---|
| Cockpit instrumentation | compact | 40–44 px row | one-line scan; no cards |
| Chart tools | compact | 32–36 px controls | direct common actions, grouped rare actions |
| Execution | operational | 32–44 px controls | safe labels remain explicit |
| Activity | tabular | 32–40 px rows | one real row per event/position |
| Explanations | comfortable | 44–56 px controls, 14 px body | sheets/dialogs, not permanent chrome |

No core trading text is smaller than 11 px. Financial figures use IBM Plex Mono, tabular figures and `SymbolSpec` precision.

## 5. State model

Every major surface covers:

| State | Required presentation |
|---|---|
| loading | structural skeleton, no fake financial value |
| empty | compact, actionable only when a real action exists |
| ready | primary data and next action |
| stale | explicit timestamp/status, trade gating remains authoritative |
| reconnecting | quiet live status; draft preserved |
| disconnected | action gating and recovery explanation |
| blocked | reason, effect and available safe actions |
| rejected | stable server code plus user instruction |
| unauthorized | no leaked account data; route to authorized account selection |
| unavailable | preserve workspace hierarchy; do not collapse into a generic error page |

Empty states in dense workspaces are single-line or compact structured rows. Marketing-style illustrations do not belong in the workstation.

## 6. Interaction model

- A command changes state only after its authoritative result.
- Optimistic visual feedback is allowed for local preferences, tool selection and drawing style, not execution truth.
- Buttons use verb + object where ambiguity exists.
- Icon-only controls require a visible focus state, accessible name and tooltip on pointer-capable desktop.
- Financial side actions always include text (`Buy`, `Sell`) and price context.
- Escape dismisses the topmost transient layer and returns focus to its trigger.
- Closing mobile sheets preserves drafts but unmounts expensive live trees.

## 7. Responsive transformation

Desktop and mobile share contracts, state controllers and business meaning—not layout DOM.

Desktop owns persistent Navigator, drawing rail, execution module and activity dock. Mobile owns chart-first composition and mutually exclusive Market, Tools, Execution and Activity sheets. A hidden desktop copy is not a mobile implementation.

## 8. Experience quality score

The release rubric is scored from runtime evidence:

- task hierarchy 20%;
- information scan time 15%;
- chart/workspace dominance 15%;
- interaction clarity 15%;
- error/risk honesty 15%;
- accessibility 10%;
- responsive integrity 10%.

A score is not a release gate by itself. Critical authority, accessibility, migration or test failures fail closed regardless of score.

## 9. Non-goals

- no casino reward loops;
- no neon/glowing workstation;
- no generic shadcn theme;
- no decorative market animation;
- no fake performance data;
- no microservice or provider decision through UI work;
- no new financial command implied by a control.
