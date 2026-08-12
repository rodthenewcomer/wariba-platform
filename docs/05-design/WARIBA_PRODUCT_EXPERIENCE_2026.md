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

## 2. One design system, multiple product expressions

```text
ONE DESIGN SYSTEM
MULTIPLE PRODUCT EXPRESSIONS
```

WARIBA is one coherent product family, not one workstation skin repeated across every route. Every surface shares the same design-system contract while expressing the needs, trust level and cognitive load of its own job.

### 2.1 Product Experience Expression Matrix

| Product surface | Expression | Density and layout | Motion and visual energy | Primary product focus |
|---|---|---|---|---|
| **WariX** | kinetic, dense, live, tool-heavy, dark professional workstation | persistent operational modules; compact controls; chart-first | immediate state feedback; restrained local transitions; no decorative ambience | market context, risk, execution and activity |
| **Trader Portal** | premium fintech with richer visual storytelling and more breathing room | progressive account, progress and performance hierarchy; comfortable page rhythm | selective product and progress transitions; richer but controlled brand moments | progress, account, payout, billing and performance |
| **Public / Homepage / Marketing** | the most expressive WARIBA surface; narrative and conversion-oriented | editorial sections, product visualization and clear conversion paths | controlled motion and richer brand moments without theatrical finance claims | proposition, trust, product understanding and conversion |
| **Authentication** | premium, focused and highly trustworthy; visually richer than a generic centered card | dedicated Login, Signup, Forgot password, Recovery, Verification and session-state compositions | calm state transitions and restrained brand treatment; errors and recovery remain dominant | identity, security, consent and successful recovery |
| **Acquisition / Commerce** | clear, reassuring and conversion-aware | offers, checkout, payment processing, success/failure and activation/welcome as one traceable journey | motion clarifies progress and outcome; never pressures or celebrates spending | offer comprehension, price truth, payment status and activation |
| **Help / Support** | searchable, calm, human and low cognitive load | task-led search, guides and escalation; tickets/Assist are separated from marketing support | minimal motion; reading and problem resolution dominate | self-service, contact, ticket state and decision explanation |
| **Legal / Trust** | readable, versioned and authoritative | long-form reading, stable anchors, accepted-version evidence and print-safe structure | no decorative interference | policy meaning, version, effective date and acceptance evidence |
| **WARIBA Control** | operational, dense and evidence-first, with more restrained color | investigation, queues, tables and audit context; permission-aware actions | state changes are direct and quiet; no promotional treatment | operations, evidence, authorization and auditability |

### 2.2 Shared contract, variable expression

All expressions share:

- tokens;
- typography;
- icons;
- primitives;
- motion law;
- accessibility;
- responsive law;
- semantic color meaning.

They do **not** share identical density, layout, animation or decorative intensity. WariX cannot export its austere workstation composition to Auth or Marketing; Marketing cannot export promotional energy to Trade, Legal or Control. Control remains restrained even when it reuses the same primitives.

### 2.3 PX0 route-audit contract

PX0 must later audit **every route and every material state**, not only the signed-in dashboard. Its explicit inventory is:

- homepage;
- login;
- signup;
- forgot-password;
- recovery;
- checkout;
- success/failure;
- welcome;
- hub/dashboard;
- accounts;
- payouts;
- performance;
- billing;
- rules;
- profile;
- settings;
- notifications;
- support/help;
- legal;
- Control;
- 404/errors;
- loading, empty, offline and unauthorized states.

PX0 may refine the expression of each surface, but it cannot fork the shared design system or weaken product truth, accessibility, authority or semantic meaning.

## 3. Five experience laws

1. **Authority is visible.** Server state, risk, connection and execution outcome are named in text and never inferred from color alone.
2. **The primary task owns space.** In WariX the plot dominates; in Hub progression dominates; in Control the investigation/evidence surface dominates.
3. **Density follows frequency.** Frequent actions are direct and compact. Rare or explanatory actions use progressive disclosure.
4. **Motion explains change.** It never simulates market activity, delays truth or celebrates financial outcomes.
5. **Honesty beats completeness.** Empty, sparse, stale or unavailable states are explicitly shown; no fake bars, metrics, symbols, volume, partners or outcomes.

## 4. WariX experience hierarchy

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

## 5. Density model

| Layer | Density | Typical geometry | Rule |
|---|---|---|---|
| Cockpit instrumentation | compact | 40–44 px row | one-line scan; no cards |
| Chart tools | compact | 32–36 px controls | direct common actions, grouped rare actions |
| Execution | operational | 32–44 px controls | safe labels remain explicit |
| Activity | tabular | 32–40 px rows | one real row per event/position |
| Explanations | comfortable | 44–56 px controls, 14 px body | sheets/dialogs, not permanent chrome |

No core trading text is smaller than 11 px. Financial figures use IBM Plex Mono, tabular figures and `SymbolSpec` precision.

## 6. State model

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

## 7. Interaction model

- A command changes state only after its authoritative result.
- Optimistic visual feedback is allowed for local preferences, tool selection and drawing style, not execution truth.
- Buttons use verb + object where ambiguity exists.
- Icon-only controls require a visible focus state, accessible name and tooltip on pointer-capable desktop.
- Financial side actions always include text (`Buy`, `Sell`) and price context.
- Escape dismisses the topmost transient layer and returns focus to its trigger.
- Closing mobile sheets preserves drafts but unmounts expensive live trees.

## 8. Responsive transformation

Desktop and mobile share contracts, state controllers and business meaning—not layout DOM.

Desktop owns persistent Navigator, drawing rail, execution module and activity dock. Mobile owns chart-first composition and mutually exclusive Market, Tools, Execution and Activity sheets. A hidden desktop copy is not a mobile implementation.

## 9. Experience quality score

The release rubric is scored from runtime evidence:

- task hierarchy 20%;
- information scan time 15%;
- chart/workspace dominance 15%;
- interaction clarity 15%;
- error/risk honesty 15%;
- accessibility 10%;
- responsive integrity 10%.

A score is not a release gate by itself. Critical authority, accessibility, migration or test failures fail closed regardless of score.

## 10. Non-goals

- no casino reward loops;
- no neon/glowing workstation;
- no generic shadcn theme;
- no decorative market animation;
- no fake performance data;
- no microservice or provider decision through UI work;
- no new financial command implied by a control.
