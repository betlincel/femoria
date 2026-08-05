begin;

alter table public.products
  add column rejection_reason text null,
  add column reviewed_at timestamptz null,
  add column reviewed_by uuid null references public.profiles(id) on delete set null,
  add constraint products_rejection_reason_length_check
    check (rejection_reason is null or char_length(btrim(rejection_reason)) between 10 and 1000);

create index products_admin_review_history_idx
on public.products(status, reviewed_at desc, updated_at desc);

create or replace function private.is_approved_seller()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.producer_profiles seller on seller.profile_id = profile.id
    where profile.id = (select auth.uid())
      and profile.role <> 'admin'
      and profile.status = 'active'
      and seller.verification_status = 'approved'
  );
$$;

revoke all on function private.is_approved_seller() from public, anon;
grant execute on function private.is_approved_seller() to authenticated;

drop policy if exists profiles_read_public_approved_producers on public.profiles;
create policy profiles_read_public_approved_producers
on public.profiles for select to anon, authenticated
using (
  role <> 'admin'
  and status = 'active'
  and exists (
    select 1 from public.producer_profiles seller
    where seller.profile_id = profiles.id and seller.verification_status = 'approved'
  )
);

drop policy if exists products_read_public_approved on public.products;
create policy products_read_public_approved
on public.products for select to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.profiles producer
    where producer.id = products.producer_id
      and producer.role <> 'admin'
      and producer.status = 'active'
  )
  and exists (
    select 1 from public.producer_profiles seller
    where seller.profile_id = products.producer_id and seller.verification_status = 'approved'
  )
);

-- Replace broad admin table policies with read-only policies. Direct writes stay
-- disabled by the grants established by the seller-management migration.
drop policy if exists products_admin_all on public.products;
drop policy if exists products_admin_read on public.products;
create policy products_admin_read
on public.products for select to authenticated
using ((select private.is_admin()));

drop policy if exists product_images_admin_all on public.product_images;
drop policy if exists product_images_admin_read on public.product_images;
create policy product_images_admin_read
on public.product_images for select to authenticated
using ((select private.is_admin()));

revoke update (producer_id, status, rejection_reason, reviewed_at, reviewed_by, created_at, updated_at)
on public.products from authenticated;

create or replace function public.review_product(
  target_product_id uuid,
  review_action text,
  input_rejection_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
  locked_product public.products%rowtype;
  safe_rejection_reason text;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
      and profile.status = 'active'
  ) then
    raise insufficient_privilege using message = 'Active administrator access is required.';
  end if;

  if target_product_id is null or review_action not in ('approve', 'reject') then
    raise invalid_parameter_value using message = 'Invalid product review request.';
  end if;

  if review_action = 'reject' then
    safe_rejection_reason := btrim(coalesce(input_rejection_reason, ''));
    if char_length(safe_rejection_reason) not between 10 and 1000 then
      raise invalid_parameter_value using message = 'A valid rejection reason is required.';
    end if;
  else
    safe_rejection_reason := null;
  end if;

  select product.*
  into locked_product
  from public.products product
  where product.id = target_product_id
    and product.status = 'pending'
  for update;
  if not found then return false; end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
      and profile.status = 'active'
  ) then
    raise insufficient_privilege using message = 'Active administrator access is required.';
  end if;

  if review_action = 'approve' then
    if locked_product.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or char_length(locked_product.slug) > 140
      or char_length(btrim(locked_product.title_tr)) not between 3 and 120
      or (btrim(locked_product.title_en) <> '' and char_length(btrim(locked_product.title_en)) not between 3 and 120)
      or char_length(btrim(locked_product.description_tr)) not between 30 and 3000
      or (btrim(locked_product.description_en) <> '' and char_length(btrim(locked_product.description_en)) not between 30 and 3000)
      or locked_product.price_minor <= 0
      or locked_product.currency <> 'TRY'
      or locked_product.preparation_days not between 0 and 60
      or char_length(btrim(locked_product.city)) not between 2 and 80
      or char_length(btrim(locked_product.district)) not between 2 and 80
      or (locked_product.stock_mode = 'in_stock' and locked_product.stock_quantity is null)
      or (locked_product.stock_mode = 'unavailable' and coalesce(locked_product.stock_quantity, 0) <> 0)
      or locked_product.stock_quantity < 0
      or not exists (
        select 1
        from public.categories category
        where category.id = locked_product.category_id and category.active
      )
      or not exists (
        select 1
        from public.profiles producer
        join public.producer_profiles seller on seller.profile_id = producer.id
        where producer.id = locked_product.producer_id
          and producer.role <> 'admin'
          and producer.status = 'active'
          and seller.verification_status = 'approved'
      )
    then
      return false;
    end if;

    perform 1
    from public.product_images image
    join storage.objects stored_object
      on stored_object.bucket_id = 'product-images'
     and stored_object.name = image.storage_path
     and stored_object.owner_id = locked_product.producer_id::text
    where image.product_id = locked_product.id
      and image.storage_path ~ ('^seller/' || locked_product.producer_id::text || '/' || locked_product.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
    order by image.sort_order, image.created_at, image.id
    limit 1
    for key share of stored_object;
    if not found then return false; end if;
  end if;

  update public.products product
  set
    status = case
      when review_action = 'approve' then 'approved'::public.product_status
      else 'rejected'::public.product_status
    end,
    rejection_reason = case when review_action = 'reject' then safe_rejection_reason else null end,
    reviewed_at = now(),
    reviewed_by = (select auth.uid()),
    updated_at = now()
  where product.id = locked_product.id
    and product.status = 'pending';

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.review_product(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.review_product(uuid, text, text)
to authenticated;

-- A resubmission starts a new review cycle. The product and one matching Storage
-- object stay locked while completeness and object existence are checked.
create or replace function public.submit_product_for_review(target_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected_rows integer;
begin
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;

  perform 1
  from public.products product
  where product.id = target_product_id
    and product.producer_id = (select auth.uid())
    and product.status in ('draft', 'rejected')
  for update;
  if not found then return false; end if;
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;

  perform 1
  from public.product_images image
  join storage.objects stored_object
    on stored_object.bucket_id = 'product-images'
   and stored_object.name = image.storage_path
   and stored_object.owner_id = (select auth.uid())::text
  where image.product_id = target_product_id
    and image.storage_path ~ ('^seller/' || (select auth.uid())::text || '/' || target_product_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
  order by image.sort_order, image.created_at, image.id
  limit 1
  for key share of stored_object;
  if not found then return false; end if;

  update public.products product
  set
    status = 'pending',
    rejection_reason = null,
    reviewed_at = null,
    reviewed_by = null,
    updated_at = now()
  where product.id = target_product_id
    and product.producer_id = (select auth.uid())
    and product.status in ('draft', 'rejected')
    and product.slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(product.slug) <= 140
    and char_length(btrim(product.title_tr)) between 3 and 120
    and (btrim(product.title_en) = '' or char_length(btrim(product.title_en)) between 3 and 120)
    and char_length(btrim(product.description_tr)) between 30 and 3000
    and (btrim(product.description_en) = '' or char_length(btrim(product.description_en)) between 30 and 3000)
    and product.price_minor > 0 and product.currency = 'TRY'
    and product.preparation_days between 0 and 60
    and char_length(btrim(product.city)) between 2 and 80
    and char_length(btrim(product.district)) between 2 and 80
    and not (product.stock_mode = 'in_stock' and product.stock_quantity is null)
    and not (product.stock_mode = 'unavailable' and coalesce(product.stock_quantity, 0) <> 0)
    and exists (select 1 from public.categories category where category.id = product.category_id and category.active);

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.submit_product_for_review(uuid)
from public, anon, authenticated;
grant execute on function public.submit_product_for_review(uuid)
to authenticated;

commit;

-- Verification queries (run manually after applying this migration):
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'products'
--   and column_name in ('rejection_reason', 'reviewed_at', 'reviewed_by');
-- select policyname, cmd, qual, with_check from pg_policies
-- where schemaname = 'public' and tablename in ('products', 'product_images')
-- order by tablename, policyname;
-- select has_function_privilege('authenticated',
--   'public.review_product(uuid, text, text)', 'EXECUTE');
-- select id, status, reviewed_at, reviewed_by, rejection_reason
-- from public.products order by updated_at desc limit 25;

-- Rollback must be a new forward migration: revoke review_product EXECUTE,
-- drop the RPC and read policies, and only remove review columns after preserving
-- any audit data that is still required. Do not rewrite product statuses.
