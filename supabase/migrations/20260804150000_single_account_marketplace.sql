-- FEMORIA single-account marketplace transition.
-- Legacy buyer/producer enum labels are intentionally retained for safe rollback
-- and compatibility, but no application policy should grant privileges from them.

begin;
alter type public.profile_role add value if not exists 'user';
commit;

begin;

alter table public.profiles
  alter column role set default 'user'::public.profile_role;

update public.profiles
set role = 'user'::public.profile_role
where role in ('buyer'::public.profile_role, 'producer'::public.profile_role);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_locale public.locale_code;
  safe_name text;
begin
  safe_locale := case
    when new.raw_user_meta_data ->> 'locale' in ('tr', 'en')
      then (new.raw_user_meta_data ->> 'locale')::public.locale_code
    else 'tr'::public.locale_code
  end;
  safe_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'FEMORIA user'
  ), 120);
  if char_length(safe_name) < 2 then
    safe_name := 'FEMORIA user';
  end if;

  insert into public.profiles (id, role, display_name, locale)
  values (new.id, 'user'::public.profile_role, safe_name, safe_locale)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop policy if exists profiles_read_public_approved_producers on public.profiles;
create policy profiles_read_public_approved_producers
on public.profiles for select to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.producer_profiles pp
    where pp.profile_id = profiles.id
      and pp.verification_status = 'approved'
  )
);

drop policy if exists producer_profiles_insert_own_pending on public.producer_profiles;
create policy producer_profiles_insert_own_pending
on public.producer_profiles for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and verification_status = 'pending'
  and approved_at is null
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role <> 'admin'
  )
);

drop policy if exists products_insert_own_draft on public.products;
create policy products_insert_own_draft
on public.products for insert to authenticated
with check (
  producer_id = (select auth.uid())
  and status = 'draft'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  )
  and exists (
    select 1 from public.producer_profiles pp
    where pp.profile_id = (select auth.uid()) and pp.verification_status = 'approved'
  )
);

drop policy if exists products_update_own_safe_columns on public.products;
create policy products_update_own_safe_columns
on public.products for update to authenticated
using (
  producer_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  )
  and exists (
    select 1 from public.producer_profiles pp
    where pp.profile_id = (select auth.uid()) and pp.verification_status = 'approved'
  )
)
with check (
  producer_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  )
  and exists (
    select 1 from public.producer_profiles pp
    where pp.profile_id = (select auth.uid()) and pp.verification_status = 'approved'
  )
);

drop policy if exists products_delete_own_unapproved on public.products;
drop policy if exists products_delete_own on public.products;
create policy products_delete_own
on public.products for delete to authenticated
using (
  producer_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  )
  and exists (
    select 1 from public.producer_profiles pp
    where pp.profile_id = (select auth.uid()) and pp.verification_status = 'approved'
  )
);

drop policy if exists product_images_insert_own_product on public.product_images;
create policy product_images_insert_own_product
on public.product_images for insert to authenticated
with check (
  exists (
    select 1
    from public.products product
    join public.profiles profile on profile.id = product.producer_id
    join public.producer_profiles seller on seller.profile_id = product.producer_id
    where product.id = product_images.product_id
      and product.producer_id = (select auth.uid())
      and profile.status = 'active'
      and seller.verification_status = 'approved'
  )
);

drop policy if exists product_images_update_own_product on public.product_images;
create policy product_images_update_own_product
on public.product_images for update to authenticated
using (
  exists (
    select 1
    from public.products product
    join public.profiles profile on profile.id = product.producer_id
    join public.producer_profiles seller on seller.profile_id = product.producer_id
    where product.id = product_images.product_id
      and product.producer_id = (select auth.uid())
      and profile.status = 'active'
      and seller.verification_status = 'approved'
  )
)
with check (
  exists (
    select 1
    from public.products product
    join public.profiles profile on profile.id = product.producer_id
    join public.producer_profiles seller on seller.profile_id = product.producer_id
    where product.id = product_images.product_id
      and product.producer_id = (select auth.uid())
      and profile.status = 'active'
      and seller.verification_status = 'approved'
  )
);

drop policy if exists product_images_delete_own_product on public.product_images;
create policy product_images_delete_own_product
on public.product_images for delete to authenticated
using (
  exists (
    select 1
    from public.products product
    join public.profiles profile on profile.id = product.producer_id
    join public.producer_profiles seller on seller.profile_id = product.producer_id
    where product.id = product_images.product_id
      and product.producer_id = (select auth.uid())
      and profile.status = 'active'
      and seller.verification_status = 'approved'
  )
);

commit;

-- Verification queries (run manually after applying the migration):
-- select enumlabel from pg_enum where enumtypid = 'public.profile_role'::regtype order by enumsortorder;
-- select role, count(*) from public.profiles group by role order by role;
-- select count(*) as legacy_role_count from public.profiles where role::text in ('buyer', 'producer');
-- select p.id, p.role, p.status, pp.verification_status
-- from public.profiles p left join public.producer_profiles pp on pp.profile_id = p.id
-- order by p.created_at desc limit 25;
-- select policyname, cmd, qual, with_check from pg_policies
-- where schemaname = 'public' and tablename in ('profiles', 'producer_profiles', 'products', 'product_images')
-- order by tablename, policyname;

-- Rollback risk: PostgreSQL enum labels cannot be safely removed while referenced.
-- A rollback should restore defaults/functions/policies and map 'user' rows to a
-- chosen legacy label before considering enum recreation. Recreating the enum is
-- intentionally excluded because it can lock dependent tables and risk data loss.
