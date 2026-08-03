-- Close All is a first-class idempotent command. A nullable master order owns
-- the client idempotency key; its child full_close orders use
-- "<master-order-id>:<position-id>" and commit in the same transaction.

alter table app.trade_orders
  drop constraint trade_orders_order_type_check;

alter table app.trade_orders
  add constraint trade_orders_order_type_check
  check (
    order_type in (
      'market_open',
      'partial_close',
      'full_close',
      'close_all',
      'modify_sl',
      'modify_tp'
    )
  );
