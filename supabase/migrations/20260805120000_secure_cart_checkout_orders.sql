-- FEMORIA cart, address, and awaiting-payment order foundation.
-- This forward-only migration does not process payments, reserve stock, or expose
-- seller/admin order access. Apply manually only after reviewing in a safe environment.

begin;

create type public.order_status as enum (
  'awaiting_payment', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'expired'
);
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');

alter table public.addresses
  add column neighborhood text null
  check (neighborhood is null or char_length(neighborhood) <= 120);

-- The foundation migration already creates this partial unique index. The
-- normalization below also makes this migration safe for a drifted database
-- where the index is missing and duplicate defaults were inserted manually.
with duplicate_profiles as (
  select address.profile_id
  from public.addresses address
  where address.is_default
  group by address.profile_id
  having count(*) > 1
), ranked_defaults as (
  select
    address.id,
    row_number() over (
      partition by address.profile_id
      order by address.created_at, address.id
    ) as default_rank
  from public.addresses address
  join duplicate_profiles duplicate on duplicate.profile_id = address.profile_id
  where address.is_default
)
update public.addresses address
set is_default = false, updated_at = now()
from ranked_defaults ranked
where address.id = ranked.id and ranked.default_rank > 1;

create unique index if not exists addresses_one_default_per_profile_idx
on public.addresses(profile_id)
where is_default;

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create index cart_items_cart_id_idx on public.cart_items(cart_id);
create index cart_items_product_id_idx on public.cart_items(product_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  checkout_group_id uuid not null,
  checkout_attempt_id uuid not null,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  producer_id uuid not null references public.profiles(id) on delete restrict,
  producer_name_snapshot text not null check (char_length(producer_name_snapshot) between 2 and 120),
  order_number text not null unique check (order_number ~ '^FM-[A-F0-9]{16}$'),
  order_status public.order_status not null default 'awaiting_payment',
  payment_status public.payment_status not null default 'unpaid',
  currency text not null check (currency = 'TRY'),
  subtotal_minor bigint not null check (subtotal_minor > 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  total_minor bigint not null check (total_minor = subtotal_minor + shipping_minor),
  recipient_name text not null check (char_length(recipient_name) between 2 and 120),
  phone text not null check (phone ~ '^\+905[0-9]{9}$'),
  city text not null check (char_length(city) between 2 and 80),
  district text not null check (char_length(district) between 2 and 80),
  neighborhood text not null check (char_length(neighborhood) between 2 and 120),
  address_line text not null check (char_length(address_line) between 10 and 500),
  postal_code text null check (postal_code is null or char_length(postal_code) <= 20),
  delivery_note text null check (delivery_note is null or char_length(delivery_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz null,
  expires_at timestamptz null,
  unique (buyer_id, checkout_attempt_id, producer_id)
);

create index orders_buyer_history_idx on public.orders(buyer_id, created_at desc);
create index orders_checkout_group_idx on public.orders(buyer_id, checkout_group_id, created_at);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid null references public.products(id) on delete set null,
  product_slug_snapshot text not null,
  product_title_tr_snapshot text not null,
  product_title_en_snapshot text not null,
  unit_price_minor integer not null check (unit_price_minor > 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_minor bigint not null check (line_total_minor = unit_price_minor::bigint * quantity),
  image_path_snapshot text null check (image_path_snapshot is null or image_path_snapshot !~ '^https?://'),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items(order_id);

create trigger carts_set_updated_at before update on public.carts
for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.carts, public.cart_items, public.orders, public.order_items from public, anon, authenticated;
revoke all on public.addresses from authenticated;
grant select on public.carts, public.cart_items, public.addresses, public.orders, public.order_items to authenticated;

drop policy if exists addresses_insert_own on public.addresses;
drop policy if exists addresses_update_own on public.addresses;
drop policy if exists addresses_delete_own on public.addresses;

create policy carts_read_own on public.carts for select to authenticated
using (user_id = (select auth.uid()));
create policy cart_items_read_own on public.cart_items for select to authenticated
using (exists (
  select 1 from public.carts cart
  where cart.id = cart_items.cart_id and cart.user_id = (select auth.uid())
));
create policy orders_read_own on public.orders for select to authenticated
using (buyer_id = (select auth.uid()));
create policy order_items_read_own on public.order_items for select to authenticated
using (exists (
  select 1 from public.orders buyer_order
  where buyer_order.id = order_items.order_id and buyer_order.buyer_id = (select auth.uid())
));

create or replace function private.require_active_shopper()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare shopper_id uuid := (select auth.uid());
begin
  if shopper_id is null then raise insufficient_privilege; end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = shopper_id and profile.status = 'active'
  ) then raise insufficient_privilege; end if;
  return shopper_id;
end;
$$;

create or replace function private.normalize_tr_phone(input_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare digits text := regexp_replace(coalesce(input_phone, ''), '[^0-9]', '', 'g');
begin
  if digits ~ '^05[0-9]{9}$' then digits := substring(digits from 2); end if;
  if digits ~ '^905[0-9]{9}$' then digits := substring(digits from 3); end if;
  if digits !~ '^5[0-9]{9}$' then raise check_violation using message = 'invalid_phone'; end if;
  return '+90' || digits;
end;
$$;

create or replace function public.add_product_to_cart(target_product_id uuid, input_quantity integer default 1)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  shopper_id uuid := private.require_active_shopper();
  target_cart_id uuid;
  target_item_id uuid;
  current_quantity integer;
  product_row public.products%rowtype;
begin
  if target_product_id is null or input_quantity not between 1 and 20 then raise check_violation; end if;

  insert into public.carts (user_id) values (shopper_id)
  on conflict (user_id) do update set updated_at = now()
  returning id into target_cart_id;

  select product.* into product_row from public.products product
  where product.id = target_product_id for update;
  if not found
    or product_row.status <> 'approved'
    or product_row.stock_mode = 'unavailable'
    or product_row.price_minor <= 0
    or product_row.currency <> 'TRY'
    or product_row.producer_id = shopper_id
    or not exists (select 1 from public.categories category where category.id = product_row.category_id and category.active)
    or not exists (
      select 1 from public.profiles producer
      join public.producer_profiles seller on seller.profile_id = producer.id
      where producer.id = product_row.producer_id and producer.status = 'active'
        and producer.role <> 'admin' and seller.verification_status = 'approved'
    )
  then raise check_violation using message = 'product_unavailable'; end if;

  select item.id, item.quantity into target_item_id, current_quantity
  from public.cart_items item
  where item.cart_id = target_cart_id and item.product_id = target_product_id
  for update;
  current_quantity := coalesce(current_quantity, 0) + input_quantity;
  if current_quantity > 20
    or (product_row.stock_mode = 'in_stock' and coalesce(product_row.stock_quantity, 0) < current_quantity)
  then raise check_violation using message = 'insufficient_stock'; end if;

  if target_item_id is null then
    insert into public.cart_items (cart_id, product_id, quantity)
    values (target_cart_id, target_product_id, current_quantity) returning id into target_item_id;
  else
    update public.cart_items set quantity = current_quantity, updated_at = now() where id = target_item_id;
  end if;
  return target_item_id;
end;
$$;

create or replace function public.update_cart_item_quantity(target_cart_item_id uuid, input_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  shopper_id uuid := private.require_active_shopper();
  product_row public.products%rowtype;
begin
  if target_cart_item_id is null or input_quantity not between 1 and 20 then raise check_violation; end if;
  select product.* into product_row
  from public.cart_items item
  join public.carts cart on cart.id = item.cart_id
  join public.products product on product.id = item.product_id
  where item.id = target_cart_item_id and cart.user_id = shopper_id
  for update of item, product;
  if not found then return false; end if;
  if product_row.status <> 'approved' or product_row.stock_mode = 'unavailable'
    or product_row.price_minor <= 0 or product_row.currency <> 'TRY'
    or product_row.producer_id = shopper_id
    or (product_row.stock_mode = 'in_stock' and coalesce(product_row.stock_quantity, 0) < input_quantity)
    or not exists (select 1 from public.categories category where category.id = product_row.category_id and category.active)
    or not exists (
      select 1 from public.profiles producer
      join public.producer_profiles seller on seller.profile_id = producer.id
      where producer.id = product_row.producer_id and producer.status = 'active'
        and producer.role <> 'admin' and seller.verification_status = 'approved'
    )
  then raise check_violation using message = 'product_unavailable'; end if;
  update public.cart_items set quantity = input_quantity, updated_at = now() where id = target_cart_item_id;
  return true;
end;
$$;

create or replace function public.remove_cart_item(target_cart_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare shopper_id uuid := private.require_active_shopper(); affected integer;
begin
  delete from public.cart_items item using public.carts cart
  where item.id = target_cart_item_id and cart.id = item.cart_id and cart.user_id = shopper_id;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.clear_cart()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare shopper_id uuid := private.require_active_shopper(); affected integer;
begin
  delete from public.cart_items item using public.carts cart
  where cart.id = item.cart_id and cart.user_id = shopper_id;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.get_cart_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with shopper as (select private.require_active_shopper() as id), rows as (
    select item.id, item.product_id, item.quantity, product.slug, product.title_tr, product.title_en,
      product.price_minor, product.currency, product.stock_mode, product.stock_quantity,
      product.preparation_days, product.producer_id, producer.display_name as producer_name,
      (select image.storage_path from public.product_images image where image.product_id = product.id
       order by image.sort_order, image.created_at, image.id limit 1) as image_path,
      case
        when product.producer_id = shopper.id then 'own_product'
        when product.status <> 'approved' or product.stock_mode = 'unavailable' then 'unavailable'
        when product.price_minor <= 0 or product.currency <> 'TRY' then 'unavailable'
        when not category.active or producer.status <> 'active' or producer.role = 'admin'
          or seller.verification_status <> 'approved' then 'unavailable'
        when product.stock_mode = 'in_stock' and coalesce(product.stock_quantity, 0) < item.quantity then 'insufficient_stock'
        else null
      end as invalid_reason
    from shopper
    join public.carts cart on cart.user_id = shopper.id
    join public.cart_items item on item.cart_id = cart.id
    join public.products product on product.id = item.product_id
    join public.categories category on category.id = product.category_id
    join public.profiles producer on producer.id = product.producer_id
    left join public.producer_profiles seller on seller.profile_id = producer.id
  )
  select jsonb_build_object(
    'quantity', coalesce(sum(quantity), 0),
    'subtotal_minor', coalesce(sum(case when invalid_reason is null then price_minor::bigint * quantity else 0 end), 0),
    'items', coalesce(jsonb_agg(to_jsonb(rows) order by producer_name, title_tr) filter (where id is not null), '[]'::jsonb)
  ) from rows;
$$;

create or replace function public.get_cart_quantity()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(item.quantity), 0)::integer
  from public.carts cart
  join public.cart_items item on item.cart_id = cart.id
  where cart.user_id = (select auth.uid())
    and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.status = 'active');
$$;

create or replace function public.create_user_address(
  input_label text, input_recipient_name text, input_phone text, input_city text,
  input_district text, input_neighborhood text, input_address_line text,
  input_postal_code text default null, input_delivery_note text default null,
  input_is_default boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare shopper_id uuid := private.require_active_shopper(); address_id uuid;
begin
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(shopper_id::text, 1701));
  if char_length(btrim(input_label)) not between 2 and 50
    or char_length(btrim(input_recipient_name)) not between 2 and 120
    or char_length(btrim(input_city)) not between 2 and 80
    or char_length(btrim(input_district)) not between 2 and 80
    or char_length(btrim(input_neighborhood)) not between 2 and 120
    or char_length(btrim(input_address_line)) not between 10 and 500
    or char_length(btrim(coalesce(input_postal_code, ''))) > 20
    or char_length(btrim(coalesce(input_delivery_note, ''))) > 500
  then raise check_violation; end if;
  if (select count(*) from public.addresses address where address.profile_id = shopper_id) >= 10
  then raise check_violation using message = 'address_limit'; end if;
  if input_is_default or not exists (select 1 from public.addresses address where address.profile_id = shopper_id) then
    update public.addresses set is_default = false where profile_id = shopper_id and is_default;
    input_is_default := true;
  end if;
  insert into public.addresses (
    profile_id, label, recipient_name, phone, city, district, neighborhood,
    address_line, postal_code, delivery_instructions, is_default
  ) values (
    shopper_id, btrim(input_label), btrim(input_recipient_name), private.normalize_tr_phone(input_phone),
    btrim(input_city), btrim(input_district), btrim(input_neighborhood), btrim(input_address_line),
    nullif(btrim(coalesce(input_postal_code, '')), ''), nullif(btrim(coalesce(input_delivery_note, '')), ''), input_is_default
  ) returning id into address_id;
  return address_id;
end;
$$;

create or replace function public.update_user_address(
  target_address_id uuid, input_label text, input_recipient_name text, input_phone text,
  input_city text, input_district text, input_neighborhood text, input_address_line text,
  input_postal_code text default null, input_delivery_note text default null,
  input_is_default boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare shopper_id uuid := private.require_active_shopper(); affected integer;
begin
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(shopper_id::text, 1701));
  if target_address_id is null
    or char_length(btrim(input_label)) not between 2 and 50
    or char_length(btrim(input_recipient_name)) not between 2 and 120
    or char_length(btrim(input_city)) not between 2 and 80
    or char_length(btrim(input_district)) not between 2 and 80
    or char_length(btrim(input_neighborhood)) not between 2 and 120
    or char_length(btrim(input_address_line)) not between 10 and 500
    or char_length(btrim(coalesce(input_postal_code, ''))) > 20
    or char_length(btrim(coalesce(input_delivery_note, ''))) > 500
  then raise check_violation; end if;
  perform 1 from public.addresses address where address.id = target_address_id and address.profile_id = shopper_id for update;
  if not found then return false; end if;
  if input_is_default then update public.addresses set is_default = false where profile_id = shopper_id and id <> target_address_id and is_default; end if;
  update public.addresses set
    label = btrim(input_label), recipient_name = btrim(input_recipient_name), phone = private.normalize_tr_phone(input_phone),
    city = btrim(input_city), district = btrim(input_district), neighborhood = btrim(input_neighborhood),
    address_line = btrim(input_address_line), postal_code = nullif(btrim(coalesce(input_postal_code, '')), ''),
    delivery_instructions = nullif(btrim(coalesce(input_delivery_note, '')), ''), is_default = input_is_default, updated_at = now()
  where id = target_address_id and profile_id = shopper_id;
  get diagnostics affected = row_count;
  if not input_is_default and not exists (select 1 from public.addresses address where address.profile_id = shopper_id and address.is_default) then
    update public.addresses set is_default = true where id = target_address_id;
  end if;
  return affected = 1;
end;
$$;

create or replace function public.delete_user_address(target_address_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare shopper_id uuid := private.require_active_shopper(); was_default boolean; affected integer;
begin
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(shopper_id::text, 1701));
  select address.is_default into was_default from public.addresses address
  where address.id = target_address_id and address.profile_id = shopper_id for update;
  if not found then return false; end if;
  delete from public.addresses where id = target_address_id and profile_id = shopper_id;
  get diagnostics affected = row_count;
  if was_default then
    update public.addresses set is_default = true where id = (
      select address.id from public.addresses address where address.profile_id = shopper_id order by address.created_at, address.id limit 1
    );
  end if;
  return affected = 1;
end;
$$;

create or replace function public.set_default_user_address(target_address_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare shopper_id uuid := private.require_active_shopper();
begin
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(shopper_id::text, 1701));
  perform 1 from public.addresses address where address.id = target_address_id and address.profile_id = shopper_id for update;
  if not found then return false; end if;
  update public.addresses set is_default = false where profile_id = shopper_id and id <> target_address_id and is_default;
  update public.addresses set is_default = true where id = target_address_id and profile_id = shopper_id;
  return true;
end;
$$;

create or replace function public.create_awaiting_payment_orders(target_address_id uuid, checkout_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  shopper_id uuid := private.require_active_shopper();
  target_cart_id uuid;
  checkout_group uuid := gen_random_uuid();
  address_row public.addresses%rowtype;
  producer_group record;
  new_order_id uuid;
begin
  if target_address_id is null or checkout_attempt_id is null then raise check_violation; end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(shopper_id::text || ':' || checkout_attempt_id::text, 1702));
  if exists (select 1 from public.orders buyer_order where buyer_order.buyer_id = shopper_id and buyer_order.checkout_attempt_id = create_awaiting_payment_orders.checkout_attempt_id) then
    return (select jsonb_build_object(
      'checkout_group_id', min(buyer_order.checkout_group_id::text)::uuid,
      'order_ids', jsonb_agg(buyer_order.id order by buyer_order.created_at),
      'total_minor', sum(buyer_order.total_minor)
    ) from public.orders buyer_order where buyer_order.buyer_id = shopper_id and buyer_order.checkout_attempt_id = create_awaiting_payment_orders.checkout_attempt_id);
  end if;

  select address.* into address_row from public.addresses address
  where address.id = target_address_id and address.profile_id = shopper_id for key share;
  if not found or address_row.neighborhood is null then raise check_violation using message = 'invalid_address'; end if;
  select cart.id into target_cart_id from public.carts cart where cart.user_id = shopper_id for update;
  if not found then raise check_violation using message = 'empty_cart'; end if;
  perform 1 from public.cart_items item where item.cart_id = target_cart_id for update;
  if not found then raise check_violation using message = 'empty_cart'; end if;
  perform product.id from public.cart_items item join public.products product on product.id = item.product_id
  where item.cart_id = target_cart_id order by product.id for update of product;

  -- Lock only the eligibility rows used by this cart. FOR SHARE conflicts with
  -- ordinary UPDATE/DELETE row locks, unlike FOR KEY SHARE for non-key updates.
  perform category.id
  from public.categories category
  where category.id in (
    select product.category_id
    from public.cart_items item
    join public.products product on product.id = item.product_id
    where item.cart_id = target_cart_id
  )
  order by category.id
  for share of category;

  perform producer.id
  from public.profiles producer
  where producer.id in (
    select product.producer_id
    from public.cart_items item
    join public.products product on product.id = item.product_id
    where item.cart_id = target_cart_id
  )
  order by producer.id
  for share of producer;

  perform seller.profile_id
  from public.producer_profiles seller
  where seller.profile_id in (
    select product.producer_id
    from public.cart_items item
    join public.products product on product.id = item.product_id
    where item.cart_id = target_cart_id
  )
  order by seller.profile_id
  for share of seller;

  if exists (
    select 1 from public.cart_items item
    join public.products product on product.id = item.product_id
    join public.categories category on category.id = product.category_id
    join public.profiles producer on producer.id = product.producer_id
    left join public.producer_profiles seller on seller.profile_id = producer.id
    where item.cart_id = target_cart_id and (
      product.status <> 'approved' or product.stock_mode = 'unavailable' or product.price_minor <= 0 or product.currency <> 'TRY'
      or product.producer_id = shopper_id or not category.active or producer.status <> 'active' or producer.role = 'admin'
      or seller.verification_status is distinct from 'approved'
      or item.quantity not between 1 and 20
      or (product.stock_mode = 'in_stock' and coalesce(product.stock_quantity, 0) < item.quantity)
    )
  ) then raise check_violation using message = 'cart_contains_invalid_product'; end if;

  for producer_group in
    select product.producer_id, producer.display_name,
      sum(product.price_minor::bigint * item.quantity) as subtotal_minor
    from public.cart_items item
    join public.products product on product.id = item.product_id
    join public.profiles producer on producer.id = product.producer_id
    where item.cart_id = target_cart_id
    group by product.producer_id, producer.display_name order by product.producer_id
  loop
    new_order_id := gen_random_uuid();
    insert into public.orders (
      id, checkout_group_id, checkout_attempt_id, buyer_id, producer_id, producer_name_snapshot,
      order_number, order_status, payment_status, currency, subtotal_minor, shipping_minor, total_minor,
      recipient_name, phone, city, district, neighborhood, address_line, postal_code, delivery_note, paid_at
    ) values (
      new_order_id, checkout_group, checkout_attempt_id, shopper_id, producer_group.producer_id, producer_group.display_name,
      'FM-' || upper(substr(replace(new_order_id::text, '-', ''), 1, 16)), 'awaiting_payment', 'unpaid', 'TRY',
      producer_group.subtotal_minor, 0, producer_group.subtotal_minor,
      address_row.recipient_name, address_row.phone, address_row.city, address_row.district, address_row.neighborhood,
      address_row.address_line, address_row.postal_code, address_row.delivery_instructions, null
    );
    insert into public.order_items (
      order_id, product_id, product_slug_snapshot, product_title_tr_snapshot, product_title_en_snapshot,
      unit_price_minor, quantity, line_total_minor, image_path_snapshot
    )
    select new_order_id, product.id, product.slug, product.title_tr, product.title_en,
      product.price_minor, item.quantity, product.price_minor::bigint * item.quantity,
      (select image.storage_path from public.product_images image where image.product_id = product.id
       order by image.sort_order, image.created_at, image.id limit 1)
    from public.cart_items item join public.products product on product.id = item.product_id
    where item.cart_id = target_cart_id and product.producer_id = producer_group.producer_id;
  end loop;
  delete from public.cart_items where cart_id = target_cart_id;
  return (select jsonb_build_object(
    'checkout_group_id', min(buyer_order.checkout_group_id::text)::uuid,
    'order_ids', jsonb_agg(buyer_order.id order by buyer_order.created_at),
    'total_minor', sum(buyer_order.total_minor)
  ) from public.orders buyer_order where buyer_order.buyer_id = shopper_id and buyer_order.checkout_attempt_id = create_awaiting_payment_orders.checkout_attempt_id);
end;
$$;

revoke all on function private.require_active_shopper() from public, anon, authenticated;
revoke all on function private.normalize_tr_phone(text) from public, anon, authenticated;
revoke all on function public.add_product_to_cart(uuid, integer) from public, anon, authenticated;
revoke all on function public.update_cart_item_quantity(uuid, integer) from public, anon, authenticated;
revoke all on function public.remove_cart_item(uuid) from public, anon, authenticated;
revoke all on function public.clear_cart() from public, anon, authenticated;
revoke all on function public.get_cart_snapshot() from public, anon, authenticated;
revoke all on function public.get_cart_quantity() from public, anon, authenticated;
revoke all on function public.create_user_address(text,text,text,text,text,text,text,text,text,boolean) from public, anon, authenticated;
revoke all on function public.update_user_address(uuid,text,text,text,text,text,text,text,text,text,boolean) from public, anon, authenticated;
revoke all on function public.delete_user_address(uuid) from public, anon, authenticated;
revoke all on function public.set_default_user_address(uuid) from public, anon, authenticated;
revoke all on function public.create_awaiting_payment_orders(uuid,uuid) from public, anon, authenticated;

grant execute on function public.add_product_to_cart(uuid, integer) to authenticated;
grant execute on function public.update_cart_item_quantity(uuid, integer) to authenticated;
grant execute on function public.remove_cart_item(uuid) to authenticated;
grant execute on function public.clear_cart() to authenticated;
grant execute on function public.get_cart_snapshot() to authenticated;
grant execute on function public.get_cart_quantity() to authenticated;
grant execute on function public.create_user_address(text,text,text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.update_user_address(uuid,text,text,text,text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.delete_user_address(uuid) to authenticated;
grant execute on function public.set_default_user_address(uuid) to authenticated;
grant execute on function public.create_awaiting_payment_orders(uuid,uuid) to authenticated;

commit;

-- Manual verification after applying:
-- select tablename, rowsecurity from pg_tables where schemaname = 'public'
--   and tablename in ('carts','cart_items','addresses','orders','order_items');
-- select policyname, tablename, cmd from pg_policies where schemaname = 'public'
--   and tablename in ('carts','cart_items','addresses','orders','order_items') order by tablename, policyname;
-- select routine_name, security_type from information_schema.routines where routine_schema = 'public'
--   and routine_name in ('add_product_to_cart','update_cart_item_quantity','remove_cart_item','clear_cart',
--     'create_user_address','update_user_address','delete_user_address','set_default_user_address','create_awaiting_payment_orders');
