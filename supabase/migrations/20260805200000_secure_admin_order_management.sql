-- FEMORIA active-admin order visibility and narrow cancellation/expiry actions.
-- This migration never changes payment_status, paid_at, prices, totals, buyers,
-- producers, or order-item snapshots. Apply manually only after review.

begin;

alter table public.orders
  add column cancellation_reason text null,
  add column cancelled_at timestamptz null,
  add column cancelled_by uuid null references public.profiles(id) on delete set null,
  add constraint orders_cancellation_reason_length_check
    check (
      cancellation_reason is null
      or char_length(btrim(cancellation_reason)) between 5 and 500
    ),
  add constraint orders_cancellation_state_check check (
    (
      order_status = 'cancelled'
      and cancellation_reason is not null
      and cancelled_at is not null
    )
    or (
      order_status <> 'cancelled'
      and cancellation_reason is null
      and cancelled_at is null
      and cancelled_by is null
    )
  ) not valid;

-- NOT VALID avoids blocking deployment if a historical cancelled order predates
-- these audit fields. PostgreSQL still enforces the constraint for new/updated
-- rows. Audit historical cancelled rows before validating it manually.

create index orders_admin_created_at_idx
on public.orders(created_at desc);

create index orders_checkout_group_all_idx
on public.orders(checkout_group_id, created_at, id);

create policy orders_read_active_admin_all
on public.orders for select to authenticated
using ((select private.is_admin()));

create policy order_items_read_active_admin_all
on public.order_items for select to authenticated
using ((select private.is_admin()));

create or replace function public.cancel_admin_order(
  target_order_id uuid,
  input_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  safe_reason text := btrim(coalesce(input_reason, ''));
  locked_order public.orders%rowtype;
begin
  if admin_id is null or target_order_id is null then
    raise insufficient_privilege;
  end if;

  if char_length(safe_reason) not between 5 and 500 then
    raise check_violation using message = 'invalid_cancellation_reason';
  end if;

  -- FOR SHARE prevents role/status updates from racing this transaction.
  perform admin_profile.id
  from public.profiles admin_profile
  where admin_profile.id = admin_id
    and admin_profile.role = 'admin'
    and admin_profile.status = 'active'
  for share;
  if not found then raise insufficient_privilege; end if;

  select admin_order.*
  into locked_order
  from public.orders admin_order
  where admin_order.id = target_order_id
  for update;
  if not found then return false; end if;

  if locked_order.payment_status not in ('unpaid', 'pending', 'failed')
    or locked_order.order_status not in ('awaiting_payment', 'confirmed', 'preparing')
  then
    return false;
  end if;

  update public.orders admin_order
  set
    order_status = 'cancelled',
    shipping_carrier = null,
    tracking_number = null,
    tracking_url = null,
    shipped_at = null,
    cancellation_reason = safe_reason,
    cancelled_at = now(),
    cancelled_by = admin_id,
    updated_at = now()
  where admin_order.id = locked_order.id
    and admin_order.payment_status in ('unpaid', 'pending', 'failed')
    and admin_order.order_status in ('awaiting_payment', 'confirmed', 'preparing');

  return found;
end;
$$;

create or replace function public.expire_admin_order(target_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_id uuid := (select auth.uid());
  locked_order public.orders%rowtype;
begin
  if admin_id is null or target_order_id is null then
    raise insufficient_privilege;
  end if;

  -- FOR SHARE prevents role/status updates from racing this transaction.
  perform admin_profile.id
  from public.profiles admin_profile
  where admin_profile.id = admin_id
    and admin_profile.role = 'admin'
    and admin_profile.status = 'active'
  for share;
  if not found then raise insufficient_privilege; end if;

  select admin_order.*
  into locked_order
  from public.orders admin_order
  where admin_order.id = target_order_id
  for update;
  if not found then return false; end if;

  if locked_order.order_status <> 'awaiting_payment'
    or locked_order.payment_status <> 'unpaid'
    or locked_order.expires_at is null
    or locked_order.expires_at > now()
  then
    return false;
  end if;

  update public.orders admin_order
  set
    order_status = 'expired',
    shipping_carrier = null,
    tracking_number = null,
    tracking_url = null,
    shipped_at = null,
    cancellation_reason = null,
    cancelled_at = null,
    cancelled_by = null,
    updated_at = now()
  where admin_order.id = locked_order.id
    and admin_order.order_status = 'awaiting_payment'
    and admin_order.payment_status = 'unpaid'
    and admin_order.expires_at is not null
    and admin_order.expires_at <= now();

  return found;
end;
$$;

revoke all on function public.cancel_admin_order(uuid, text)
from public, anon, authenticated;
revoke all on function public.expire_admin_order(uuid)
from public, anon, authenticated;

grant execute on function public.cancel_admin_order(uuid, text)
to authenticated;
grant execute on function public.expire_admin_order(uuid)
to authenticated;

commit;

-- Manual verification after applying in a safe development environment:
-- select policyname, tablename, cmd from pg_policies
-- where schemaname = 'public' and tablename in ('orders', 'order_items')
-- order by tablename, policyname;
-- select id, order_status, payment_status, cancellation_reason, cancelled_at,
--   cancelled_by from public.orders order by created_at desc limit 25;
-- alter table public.orders validate constraint orders_cancellation_state_check;
-- select has_function_privilege('authenticated',
--   'public.cancel_admin_order(uuid, text)', 'EXECUTE');
-- select has_function_privilege('authenticated',
--   'public.expire_admin_order(uuid)', 'EXECUTE');
