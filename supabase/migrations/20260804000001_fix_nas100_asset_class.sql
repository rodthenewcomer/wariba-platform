-- Fix: NAS100's asset_class must match RULESET.json symbol_specifications
-- exactly ("index_cfd_simulated", not "index") — caught immediately after
-- 20260804000000 was applied. New migration per project convention: never
-- edit an already-applied one.

alter table app.symbol_specs drop constraint symbol_specs_asset_class_check;

update app.symbol_specs set asset_class = 'index_cfd_simulated' where symbol = 'NAS100';

alter table app.symbol_specs
  add constraint symbol_specs_asset_class_check
    check (asset_class in ('forex_major', 'metal', 'index_cfd_simulated'));
