-- trade_orders.symbol/side must be nullable: a close/modify order referencing
-- a position_id that doesn't exist (or doesn't belong to the account) can't
-- honestly record a symbol/side — there is no position to read them from.
-- Same pattern as payment_events.purchase_order_id (Prompt 03): record the
-- rejection with a null reference rather than fabricate a value.

alter table app.trade_orders alter column symbol drop not null;
alter table app.trade_orders alter column side drop not null;
