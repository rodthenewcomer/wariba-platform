-- TRD-029 (docs/00-decisions/DECISION_LOG.md) — reaffirms TRD-018 (Performance
-- leverage must stay lower than Evaluation's, still LOCKED, never superseded).
-- 20260804000007_policy_symbol_specs_v1_1.sql seeded leverage_performance
-- equal to leverage_one for the v1.1 symbol spec set, silently contradicting
-- TRD-018. This corrects it, reapplying TRD-018's exact ratios (0.60x Forex,
-- 0.50x XAUUSD/NAS100) to the v1.1 Evaluation ceilings — WARIBA_ONE's
-- leverage_one is untouched.
--
-- No runtime code reads leverage_performance yet (margin/leverage
-- enforcement is a documented gap, not built by any prompt so far), so this
-- is a pure data-correctness fix with no behavior change today.

update app.symbol_specs
set leverage_performance = 60
where symbol in ('EURUSD', 'GBPUSD', 'USDJPY')
  and symbol_spec_set_id = (
    select id from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
  );

update app.symbol_specs
set leverage_performance = 25
where symbol = 'XAUUSD'
  and symbol_spec_set_id = (
    select id from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
  );

update app.symbol_specs
set leverage_performance = 10
where symbol = 'NAS100'
  and symbol_spec_set_id = (
    select id from app.symbol_spec_sets where set_id = 'WARIBA-SANDBOX-SYMBOLS-1.1.0'
  );
