begin;

-- The product-images bucket already exists in FEMORIA. Preserve its public flag,
-- but enforce the requested server-side size and MIME limits.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'product-images') then
    raise exception 'Required product-images bucket does not exist.';
  end if;
end;
$$;

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'product-images';

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
      and profile.status = 'active'
      and seller.verification_status = 'approved'
  );
$$;

revoke all on function private.is_approved_seller() from public, anon;
grant execute on function private.is_approved_seller() to authenticated;

-- Direct critical writes are disabled. Narrow RPCs below own every product status,
-- producer ID, image path, and ordering transition.
revoke all privileges on public.products from authenticated;
revoke all privileges on public.product_images from authenticated;
grant select on public.products, public.product_images to authenticated;

drop policy if exists categories_read_seller_products on public.categories;
create policy categories_read_seller_products
on public.categories for select to authenticated
using (
  exists (
    select 1 from public.products product
    where product.category_id = categories.id
      and product.producer_id = (select auth.uid())
  )
);

drop policy if exists products_insert_own_draft on public.products;
drop policy if exists products_update_own_safe_columns on public.products;
drop policy if exists products_delete_own_unapproved on public.products;
drop policy if exists products_delete_own on public.products;

create policy products_insert_own_draft
on public.products for insert to authenticated
with check (
  producer_id = (select auth.uid())
  and status = 'draft'
  and (select private.is_approved_seller())
);

create policy products_update_own_editable
on public.products for update to authenticated
using (
  producer_id = (select auth.uid())
  and status in ('draft', 'rejected')
  and (select private.is_approved_seller())
)
with check (
  producer_id = (select auth.uid())
  and status = 'draft'
  and (select private.is_approved_seller())
);

-- Hard delete remains disabled until Storage and database deletion can be
-- coordinated atomically without broken image references or abandoned files.

drop policy if exists product_images_insert_own_product on public.product_images;
drop policy if exists product_images_update_own_product on public.product_images;
drop policy if exists product_images_delete_own_product on public.product_images;

create policy product_images_insert_own_editable_product
on public.product_images for insert to authenticated
with check (
  exists (
    select 1 from public.products product
    where product.id = product_images.product_id
      and product.producer_id = (select auth.uid())
      and product.status in ('draft', 'rejected')
  )
  and (select private.is_approved_seller())
);

create policy product_images_update_own_editable_product
on public.product_images for update to authenticated
using (
  exists (
    select 1 from public.products product
    where product.id = product_images.product_id
      and product.producer_id = (select auth.uid())
      and product.status in ('draft', 'rejected')
  )
  and (select private.is_approved_seller())
)
with check (
  exists (
    select 1 from public.products product
    where product.id = product_images.product_id
      and product.producer_id = (select auth.uid())
      and product.status in ('draft', 'rejected')
  )
  and (select private.is_approved_seller())
);

create policy product_images_delete_own_editable_product
on public.product_images for delete to authenticated
using (
  exists (
    select 1 from public.products product
    where product.id = product_images.product_id
      and product.producer_id = (select auth.uid())
      and product.status in ('draft', 'rejected')
  )
  and (select private.is_approved_seller())
);

create or replace function public.create_seller_product(
  input_category_id uuid, input_slug text, input_title_tr text, input_title_en text,
  input_description_tr text, input_description_en text, input_price_minor integer,
  input_currency text, input_stock_mode public.stock_mode, input_stock_quantity integer,
  input_preparation_days integer, input_city text, input_district text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_product_id uuid;
begin
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;
  if input_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(input_slug) > 140
    or char_length(btrim(input_title_tr)) not between 3 and 120
    or (btrim(input_title_en) <> '' and char_length(btrim(input_title_en)) not between 3 and 120)
    or char_length(btrim(input_description_tr)) not between 30 and 3000
    or (btrim(input_description_en) <> '' and char_length(btrim(input_description_en)) not between 30 and 3000)
    or input_price_minor <= 0 or input_currency <> 'TRY'
    or input_preparation_days not between 0 and 60
    or char_length(btrim(input_city)) not between 2 and 80
    or char_length(btrim(input_district)) not between 2 and 80
    or (input_stock_mode = 'in_stock' and input_stock_quantity is null)
    or (input_stock_mode = 'unavailable' and coalesce(input_stock_quantity, 0) <> 0)
    or input_stock_quantity < 0
    or not exists (select 1 from public.categories category where category.id = input_category_id and category.active)
  then raise invalid_parameter_value; end if;

  insert into public.products (
    producer_id, category_id, slug, title_tr, title_en, description_tr, description_en,
    price_minor, currency, status, stock_mode, stock_quantity, preparation_days, city, district
  ) values (
    (select auth.uid()), input_category_id, input_slug, btrim(input_title_tr), btrim(input_title_en),
    btrim(input_description_tr), btrim(input_description_en), input_price_minor, input_currency,
    'draft', input_stock_mode, input_stock_quantity, input_preparation_days, btrim(input_city), btrim(input_district)
  ) returning id into new_product_id;
  return new_product_id;
end;
$$;

create or replace function public.update_seller_product(
  target_product_id uuid, input_category_id uuid, input_slug text, input_title_tr text,
  input_title_en text, input_description_tr text, input_description_en text,
  input_price_minor integer, input_currency text, input_stock_mode public.stock_mode,
  input_stock_quantity integer, input_preparation_days integer, input_city text, input_district text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected_rows integer;
begin
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;
  if input_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(input_slug) > 140
    or char_length(btrim(input_title_tr)) not between 3 and 120
    or (btrim(input_title_en) <> '' and char_length(btrim(input_title_en)) not between 3 and 120)
    or char_length(btrim(input_description_tr)) not between 30 and 3000
    or (btrim(input_description_en) <> '' and char_length(btrim(input_description_en)) not between 30 and 3000)
    or input_price_minor <= 0 or input_currency <> 'TRY'
    or input_preparation_days not between 0 and 60
    or char_length(btrim(input_city)) not between 2 and 80
    or char_length(btrim(input_district)) not between 2 and 80
    or (input_stock_mode = 'in_stock' and input_stock_quantity is null)
    or (input_stock_mode = 'unavailable' and coalesce(input_stock_quantity, 0) <> 0)
    or input_stock_quantity < 0
    or not exists (select 1 from public.categories category where category.id = input_category_id and category.active)
  then raise invalid_parameter_value; end if;

  update public.products product set
    category_id = input_category_id, slug = input_slug, title_tr = btrim(input_title_tr), title_en = btrim(input_title_en),
    description_tr = btrim(input_description_tr), description_en = btrim(input_description_en),
    price_minor = input_price_minor, currency = input_currency, stock_mode = input_stock_mode,
    stock_quantity = input_stock_quantity, preparation_days = input_preparation_days,
    city = btrim(input_city), district = btrim(input_district), status = 'draft', updated_at = now()
  where product.id = target_product_id and product.producer_id = (select auth.uid())
    and product.status in ('draft', 'rejected');
  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

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

  update public.products product set status = 'pending', updated_at = now()
  where product.id = target_product_id and product.producer_id = (select auth.uid())
    and product.status in ('draft', 'rejected')
    and product.slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
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

create or replace function public.add_seller_product_image(
  target_product_id uuid, input_storage_path text, input_alt_tr text, input_alt_en text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare image_count integer; new_image_id uuid;
begin
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;
  perform 1 from public.products product
  where product.id = target_product_id and product.producer_id = (select auth.uid())
    and product.status in ('draft', 'rejected') for update;
  if not found then return null; end if;
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;
  if input_storage_path !~ ('^seller/' || (select auth.uid())::text || '/' || target_product_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or char_length(btrim(input_alt_tr)) not between 3 and 160
    or (btrim(input_alt_en) <> '' and char_length(btrim(input_alt_en)) not between 3 and 160)
  then raise invalid_parameter_value; end if;

  perform 1
  from storage.objects stored_object
  where stored_object.bucket_id = 'product-images'
    and stored_object.name = input_storage_path
    and stored_object.owner_id = (select auth.uid())::text
  for key share;
  if not found then return null; end if;

  select count(*) into image_count from public.product_images where product_id = target_product_id;
  if image_count >= 6 then raise check_violation; end if;
  insert into public.product_images (product_id, storage_path, alt_tr, alt_en, sort_order)
  values (target_product_id, input_storage_path, btrim(input_alt_tr), btrim(input_alt_en), image_count)
  returning id into new_image_id;
  return new_image_id;
end;
$$;

create or replace function public.update_seller_product_image_alt(
  target_image_id uuid, input_alt_tr text, input_alt_en text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected_rows integer; locked_product_id uuid;
begin
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;
  if char_length(btrim(input_alt_tr)) not between 3 and 160
    or (btrim(input_alt_en) <> '' and char_length(btrim(input_alt_en)) not between 3 and 160)
  then raise invalid_parameter_value; end if;
  select product.id into locked_product_id
  from public.products product
  join public.product_images image on image.product_id = product.id
  where image.id = target_image_id
    and product.producer_id = (select auth.uid())
    and product.status in ('draft', 'rejected')
  for update of product;
  if not found then return false; end if;
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;

  update public.product_images image
  set alt_tr = btrim(input_alt_tr), alt_en = btrim(input_alt_en), updated_at = now()
  where image.id = target_image_id and image.product_id = locked_product_id;
  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

create or replace function public.delete_seller_product_image(target_image_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_path text;
  deleted_product_id uuid;
  locked_product_id uuid;
  remaining_image_count integer;
  temporary_sort_base bigint;
begin
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;

  select product.id into locked_product_id
  from public.products product
  join public.product_images image on image.product_id = product.id
  where image.id = target_image_id
    and product.producer_id = (select auth.uid())
    and product.status in ('draft', 'rejected')
  for update of product;
  if not found then return null; end if;
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;

  delete from public.product_images image
  where image.id = target_image_id and image.product_id = locked_product_id
  returning storage_path, product_id into deleted_path, deleted_product_id;

  if deleted_product_id is not null then
    select count(*), greatest(coalesce(max(sort_order), -1)::bigint + 1000, 1000::bigint)
    into remaining_image_count, temporary_sort_base
    from public.product_images
    where product_id = deleted_product_id;

    if remaining_image_count > 0 then
      if temporary_sort_base + remaining_image_count > 2147483647 then
        raise numeric_value_out_of_range;
      end if;

      update public.product_images image
      set sort_order = (temporary_sort_base + ordering.position)::integer, updated_at = now()
      from (
        select id, row_number() over (order by sort_order, created_at, id)::integer as position
        from public.product_images
        where product_id = deleted_product_id
      ) ordering
      where image.id = ordering.id and image.product_id = deleted_product_id;

      update public.product_images image
      set sort_order = ordering.position - 1, updated_at = now()
      from (
        select id, row_number() over (order by sort_order, created_at, id)::integer as position
        from public.product_images
        where product_id = deleted_product_id
      ) ordering
      where image.id = ordering.id and image.product_id = deleted_product_id;
    end if;
  end if;
  return deleted_path;
end;
$$;

create or replace function public.reorder_seller_product_images(target_product_id uuid, ordered_image_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare image_count integer; temporary_sort_base bigint;
begin
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;
  if ordered_image_ids is null
    or cardinality(ordered_image_ids) not between 1 and 6
    or cardinality(ordered_image_ids) <> (select count(distinct ordered.id) from unnest(ordered_image_ids) as ordered(id))
  then return false; end if;
  perform 1 from public.products product where product.id = target_product_id
    and product.producer_id = (select auth.uid()) and product.status in ('draft', 'rejected') for update;
  if not found then return false; end if;
  if not (select private.is_approved_seller()) then raise insufficient_privilege; end if;
  select count(*) into image_count from public.product_images where product_id = target_product_id;
  if image_count <> cardinality(ordered_image_ids)
    or exists (select 1 from unnest(ordered_image_ids) as ordered(id) where not exists (
      select 1 from public.product_images image where image.id = ordered.id and image.product_id = target_product_id
    ))
  then return false; end if;

  select greatest(coalesce(max(sort_order), -1)::bigint + 1000, 1000::bigint)
  into temporary_sort_base
  from public.product_images
  where product_id = target_product_id;
  if temporary_sort_base + image_count > 2147483647 then
    raise numeric_value_out_of_range;
  end if;

  update public.product_images image
  set sort_order = (temporary_sort_base + ordering.position)::integer, updated_at = now()
  from unnest(ordered_image_ids) with ordinality ordering(id, position)
  where image.id = ordering.id and image.product_id = target_product_id;

  update public.product_images image
  set sort_order = ordering.position - 1, updated_at = now()
  from unnest(ordered_image_ids) with ordinality ordering(id, position)
  where image.id = ordering.id and image.product_id = target_product_id;
  return true;
end;
$$;

revoke all on function public.create_seller_product(uuid,text,text,text,text,text,integer,text,public.stock_mode,integer,integer,text,text) from public, anon, authenticated;
revoke all on function public.update_seller_product(uuid,uuid,text,text,text,text,text,integer,text,public.stock_mode,integer,integer,text,text) from public, anon, authenticated;
revoke all on function public.submit_product_for_review(uuid) from public, anon, authenticated;
revoke all on function public.add_seller_product_image(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.update_seller_product_image_alt(uuid,text,text) from public, anon, authenticated;
revoke all on function public.delete_seller_product_image(uuid) from public, anon, authenticated;
revoke all on function public.reorder_seller_product_images(uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.create_seller_product(uuid,text,text,text,text,text,integer,text,public.stock_mode,integer,integer,text,text) to authenticated;
grant execute on function public.update_seller_product(uuid,uuid,text,text,text,text,text,integer,text,public.stock_mode,integer,integer,text,text) to authenticated;
grant execute on function public.submit_product_for_review(uuid) to authenticated;
grant execute on function public.add_seller_product_image(uuid,text,text,text) to authenticated;
grant execute on function public.update_seller_product_image_alt(uuid,text,text) to authenticated;
grant execute on function public.delete_seller_product_image(uuid) to authenticated;
grant execute on function public.reorder_seller_product_images(uuid,uuid[]) to authenticated;

drop policy if exists seller_product_images_insert on storage.objects;
drop policy if exists seller_product_images_delete on storage.objects;

create policy seller_product_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'seller'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
  and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and lower(storage.extension(name)) in ('jpg', 'png', 'webp')
  and lower(coalesce(metadata ->> 'mimetype', '')) in ('image/jpeg', 'image/png', 'image/webp')
  and exists (
    select 1 from public.products product
    where product.id::text = (storage.foldername(name))[3]
      and product.producer_id = (select auth.uid())
      and product.status in ('draft', 'rejected')
  )
  and (select private.is_approved_seller())
);

create policy seller_product_images_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'seller'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
  and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and exists (
    select 1 from public.products product
    where product.id::text = (storage.foldername(name))[3]
      and product.producer_id = (select auth.uid())
      and product.status in ('draft', 'rejected')
  )
  and (select private.is_approved_seller())
);

commit;

-- Verification queries (run manually after applying):
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'product-images';
-- select policyname, cmd, qual, with_check from pg_policies where schemaname in ('public','storage')
--   and tablename in ('products','product_images','objects') order by schemaname, tablename, policyname;
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name in ('products','product_images') order by table_name, grantee;
-- select routine_name, security_type from information_schema.routines where routine_schema = 'public'
--   and routine_name like '%seller_product%' order by routine_name;

-- Rollback: restore the former column grants and policies only through a new
-- forward migration, revoke these RPC grants, and drop the RPCs. Storage objects
-- and product data require no rewrite; do not delete bucket contents.
