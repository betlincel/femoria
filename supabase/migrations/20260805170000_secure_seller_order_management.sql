-- FEMORIA approved-seller order visibility and narrow fulfillment transitions.
-- This migration does not process payments or grant sellers access to payment fields.

begin;

alter table public.orders
  add column shipping_carrier text null,
  add column tracking_number text null,
  add column tracking_url text null,
  add column shipped_at timestamptz null,
  add constraint orders_shipping_carrier_length_check
    check (shipping_carrier is null or char_length(btrim(shipping_carrier)) between 2 and 80),
  add constraint orders_tracking_number_length_check
    check (tracking_number is null or char_length(btrim(tracking_number)) between 2 and 120),
  add constraint orders_tracking_url_check
    check (tracking_url is null or (char_length(tracking_url) <= 500 and tracking_url ~* '^https?://')),
  add constraint orders_shipping_state_check check (
    (
      order_status in ('shipped', 'delivered')
      and shipping_carrier is not null
      and tracking_number is not null
      and shipped_at is not null
    )
    or (
      order_status not in ('shipped', 'delivered')
      and shipping_carrier is null
      and tracking_number is null
      and tracking_url is null
      and shipped_at is null
    )
  ) not valid;

-- NOT VALID keeps the forward migration safe if historical shipped/delivered
-- rows predate tracking fields. PostgreSQL still enforces it for new/updated rows.
-- Validate manually only after auditing any historical violations.

create policy orders_read_approved_seller_own
on public.orders for select to authenticated
using (
  producer_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles producer
    join public.producer_profiles seller on seller.profile_id = producer.id
    where producer.id = (select auth.uid())
      and producer.status = 'active'
      and producer.role <> 'admin'
      and seller.verification_status = 'approved'
  )
);

create policy order_items_read_approved_seller_own
on public.order_items for select to authenticated
using (
  exists (
    select 1
    from public.orders seller_order
    join public.profiles producer on producer.id = seller_order.producer_id
    join public.producer_profiles seller on seller.profile_id = producer.id
    where seller_order.id = order_items.order_id
      and seller_order.producer_id = (select auth.uid())
      and producer.status = 'active'
      and producer.role <> 'admin'
      and seller.verification_status = 'approved'
  )
);

create or replace function public.mark_seller_order_preparing(target_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller_id uuid := (select auth.uid());
  locked_order public.orders%rowtype;
begin
  if seller_id is null or target_order_id is null then raise insufficient_privilege; end if;

  perform producer.id
  from public.profiles producer
  where producer.id = seller_id
  for share;
  if not found then raise insufficient_privilege; end if;

  perform seller.profile_id
  from public.producer_profiles seller
  where seller.profile_id = seller_id
  for share;
  if not found then raise insufficient_privilege; end if;

  if not exists (
    select 1
    from public.profiles producer
    join public.producer_profiles seller on seller.profile_id = producer.id
    where producer.id = seller_id
      and producer.status = 'active'
      and producer.role <> 'admin'
      and seller.verification_status = 'approved'
  ) then raise insufficient_privilege; end if;

  select seller_order.* into locked_order
  from public.orders seller_order
  where seller_order.id = target_order_id
    and seller_order.producer_id = seller_id
  for update;
  if not found then return false; end if;

  if locked_order.payment_status <> 'paid' or locked_order.order_status <> 'confirmed'
  then return false; end if;

  update public.orders seller_order
  set order_status = 'preparing', updated_at = now()
  where seller_order.id = target_order_id
    and seller_order.producer_id = seller_id
    and seller_order.payment_status = 'paid'
    and seller_order.order_status = 'confirmed';
  return found;
end;
$$;

create or replace function public.mark_seller_order_shipped(
  target_order_id uuid,
  input_shipping_carrier text,
  input_tracking_number text,
  input_tracking_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller_id uuid := (select auth.uid());
  locked_order public.orders%rowtype;
  safe_carrier text := btrim(coalesce(input_shipping_carrier, ''));
  safe_tracking_number text := btrim(coalesce(input_tracking_number, ''));
  safe_tracking_url text := nullif(btrim(coalesce(input_tracking_url, '')), '');
begin
  if seller_id is null or target_order_id is null then raise insufficient_privilege; end if;
  if char_length(safe_carrier) not between 2 and 80
    or char_length(safe_tracking_number) not between 2 and 120
    or char_length(coalesce(safe_tracking_url, '')) > 500
    or (safe_tracking_url is not null and safe_tracking_url !~* '^https?://')
  then raise check_violation using message = 'invalid_tracking'; end if;

  perform producer.id
  from public.profiles producer
  where producer.id = seller_id
  for share;
  if not found then raise insufficient_privilege; end if;

  perform seller.profile_id
  from public.producer_profiles seller
  where seller.profile_id = seller_id
  for share;
  if not found then raise insufficient_privilege; end if;

  if not exists (
    select 1
    from public.profiles producer
    join public.producer_profiles seller on seller.profile_id = producer.id
    where producer.id = seller_id
      and producer.status = 'active'
      and producer.role <> 'admin'
      and seller.verification_status = 'approved'
  ) then raise insufficient_privilege; end if;

  select seller_order.* into locked_order
  from public.orders seller_order
  where seller_order.id = target_order_id
    and seller_order.producer_id = seller_id
  for update;
  if not found then return false; end if;

  if locked_order.payment_status <> 'paid' or locked_order.order_status <> 'preparing'
  then return false; end if;

  update public.orders seller_order
  set
    order_status = 'shipped',
    shipping_carrier = safe_carrier,
    tracking_number = safe_tracking_number,
    tracking_url = safe_tracking_url,
    shipped_at = now(),
    updated_at = now()
  where seller_order.id = target_order_id
    and seller_order.producer_id = seller_id
    and seller_order.payment_status = 'paid'
    and seller_order.order_status = 'preparing';
  return found;
end;
$$;

revoke all on function public.mark_seller_order_preparing(uuid)
from public, anon, authenticated;
revoke all on function public.mark_seller_order_shipped(uuid,text,text,text)
from public, anon, authenticated;
grant execute on function public.mark_seller_order_preparing(uuid)
to authenticated;
grant execute on function public.mark_seller_order_shipped(uuid,text,text,text)
to authenticated;

commit;

-- Manual checks after applying in a safe development environment:
-- select id, order_status, shipping_carrier, tracking_number, tracking_url, shipped_at
-- from public.orders where order_status in ('shipped','delivered');
-- alter table public.orders validate constraint orders_shipping_state_check;
-- select policyname, tablename, cmd from pg_policies where schemaname = 'public'
--   and tablename in ('orders','order_items') order by tablename, policyname;
