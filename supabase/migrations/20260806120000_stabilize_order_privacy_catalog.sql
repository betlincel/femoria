-- FEMORIA pre-payment stabilization: order state integrity, seller PII
-- projection, and public catalog eligibility. This migration does not process
-- payments, validate historical constraints, or modify existing order data.

begin;

alter table public.orders
  add constraint orders_order_payment_state_check check (
    (order_status = 'awaiting_payment' and payment_status in ('unpaid', 'pending', 'failed'))
    or (order_status in ('confirmed', 'preparing', 'shipped', 'delivered') and payment_status = 'paid')
    or (order_status = 'cancelled' and payment_status in ('unpaid', 'pending', 'failed'))
    or (order_status = 'expired' and payment_status = 'unpaid')
  ) not valid;

-- RLS cannot mask individual columns. Removing only the seller policies keeps
-- buyer/admin table reads unchanged while preventing sellers from selecting raw
-- order and order-item rows through an authenticated Supabase client.
drop policy if exists orders_read_approved_seller_own on public.orders;
drop policy if exists order_items_read_approved_seller_own on public.order_items;

create or replace function private.seller_order_payload(seller_order public.orders)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', (seller_order).id,
    'checkout_group_id', (seller_order).checkout_group_id,
    'producer_id', (seller_order).producer_id,
    'producer_name_snapshot', (seller_order).producer_name_snapshot,
    'order_number', (seller_order).order_number,
    'order_status', (seller_order).order_status,
    'payment_status', (seller_order).payment_status,
    'currency', (seller_order).currency,
    'subtotal_minor', (seller_order).subtotal_minor,
    'shipping_minor', (seller_order).shipping_minor,
    'total_minor', (seller_order).total_minor,
    'recipient_name', (seller_order).recipient_name,
    'phone', case when (seller_order).payment_status = 'paid' then (seller_order).phone else null end,
    'city', (seller_order).city,
    'district', (seller_order).district,
    'neighborhood', case when (seller_order).payment_status = 'paid' then (seller_order).neighborhood else null end,
    'address_line', case when (seller_order).payment_status = 'paid' then (seller_order).address_line else null end,
    'postal_code', case when (seller_order).payment_status = 'paid' then (seller_order).postal_code else null end,
    'delivery_note', case when (seller_order).payment_status = 'paid' then (seller_order).delivery_note else null end,
    'shipping_carrier', (seller_order).shipping_carrier,
    'tracking_number', (seller_order).tracking_number,
    'tracking_url', (seller_order).tracking_url,
    'shipped_at', (seller_order).shipped_at,
    'cancellation_reason', (seller_order).cancellation_reason,
    'cancelled_at', (seller_order).cancelled_at,
    'created_at', (seller_order).created_at,
    'paid_at', (seller_order).paid_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item.id,
          'product_id', item.product_id,
          'product_slug_snapshot', item.product_slug_snapshot,
          'product_title_tr_snapshot', item.product_title_tr_snapshot,
          'product_title_en_snapshot', item.product_title_en_snapshot,
          'unit_price_minor', item.unit_price_minor,
          'quantity', item.quantity,
          'line_total_minor', item.line_total_minor,
          'image_path_snapshot', item.image_path_snapshot,
          'created_at', item.created_at
        ) order by item.created_at, item.id
      )
      from public.order_items item
      where item.order_id = (seller_order).id
    ), '[]'::jsonb)
  );
$$;

revoke all on function private.seller_order_payload(public.orders)
from public, anon, authenticated;

create or replace function public.get_seller_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  seller_id uuid := (select auth.uid());
  result jsonb;
begin
  if seller_id is null or not (select private.is_approved_seller()) then
    raise insufficient_privilege;
  end if;

  select coalesce(
    jsonb_agg(
      private.seller_order_payload(seller_order)
      order by seller_order.created_at desc, seller_order.id desc
    ),
    '[]'::jsonb
  )
  into result
  from public.orders seller_order
  where seller_order.producer_id = seller_id
    and seller_order.id in (
      select limited_order.id
      from public.orders limited_order
      where limited_order.producer_id = seller_id
      order by limited_order.created_at desc, limited_order.id desc
      limit 200
    );

  return result;
end;
$$;

create or replace function public.get_seller_order(target_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  seller_id uuid := (select auth.uid());
  result jsonb;
begin
  if seller_id is null or target_order_id is null
    or not (select private.is_approved_seller())
  then
    raise insufficient_privilege;
  end if;

  select private.seller_order_payload(owned_order)
  into result
  from public.orders owned_order
  where owned_order.id = target_order_id
    and owned_order.producer_id = seller_id;

  return result;
end;
$$;

revoke all on function public.get_seller_orders()
from public, anon, authenticated;
revoke all on function public.get_seller_order(uuid)
from public, anon, authenticated;
grant execute on function public.get_seller_orders()
to authenticated;
grant execute on function public.get_seller_order(uuid)
to authenticated;

drop policy if exists products_read_public_approved on public.products;
create policy products_read_public_approved
on public.products for select to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1
    from public.categories category
    where category.id = products.category_id
      and category.active
  )
  and exists (
    select 1
    from public.profiles producer
    join public.producer_profiles seller on seller.profile_id = producer.id
    where producer.id = products.producer_id
      and producer.status = 'active'
      and producer.role <> 'admin'
      and seller.verification_status = 'approved'
  )
);

drop policy if exists product_images_read_public_product on public.product_images;
create policy product_images_read_public_product
on public.product_images for select to anon, authenticated
using (
  exists (
    select 1
    from public.products product
    join public.categories category on category.id = product.category_id
    join public.profiles producer on producer.id = product.producer_id
    join public.producer_profiles seller on seller.profile_id = producer.id
    where product.id = product_images.product_id
      and product.status = 'approved'
      and category.active
      and producer.status = 'active'
      and producer.role <> 'admin'
      and seller.verification_status = 'approved'
  )
);

commit;

-- Manual audit only. Run before validating the NOT VALID constraint:
-- select id, order_number, order_status, payment_status, created_at
-- from public.orders
-- where not (
--   (order_status = 'awaiting_payment' and payment_status in ('unpaid', 'pending', 'failed'))
--   or (order_status in ('confirmed', 'preparing', 'shipped', 'delivered') and payment_status = 'paid')
--   or (order_status = 'cancelled' and payment_status in ('unpaid', 'pending', 'failed'))
--   or (order_status = 'expired' and payment_status = 'unpaid')
-- )
-- order by created_at, id;

-- Do not validate automatically. After resolving every audited row, validate in
-- a separately reviewed migration with:
-- alter table public.orders validate constraint orders_order_payment_state_check;
