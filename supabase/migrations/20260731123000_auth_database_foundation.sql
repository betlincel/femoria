begin;

create type public.profile_role as enum ('buyer', 'producer', 'admin');
create type public.profile_status as enum ('active', 'suspended');
create type public.locale_code as enum ('tr', 'en');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.category_kind as enum ('food', 'craft');
create type public.product_status as enum ('draft', 'pending', 'approved', 'rejected');
create type public.stock_mode as enum ('in_stock', 'made_to_order', 'unavailable');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role not null default 'buyer',
  status public.profile_status not null default 'active',
  display_name text not null check (char_length(display_name) between 2 and 120),
  locale public.locale_code not null default 'tr',
  city text check (city is null or char_length(city) <= 80),
  district text check (district is null or char_length(district) <= 80),
  neighborhood_public text check (neighborhood_public is null or char_length(neighborhood_public) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.producer_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  story_tr text not null default '',
  story_en text not null default '',
  verification_status public.verification_status not null default 'pending',
  delivery_regions jsonb not null default '[]'::jsonb check (jsonb_typeof(delivery_regions) = 'array'),
  approximate_area text check (approximate_area is null or char_length(approximate_area) <= 160),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_tr text not null,
  name_en text not null,
  kind public.category_kind not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_tr text not null,
  title_en text not null,
  description_tr text not null,
  description_en text not null,
  price_minor integer not null check (price_minor >= 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  status public.product_status not null default 'draft',
  stock_mode public.stock_mode not null default 'made_to_order',
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  preparation_days integer not null default 0 check (preparation_days between 0 and 365),
  city text not null check (char_length(city) <= 80),
  district text not null check (char_length(district) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_producer_id_idx on public.products(producer_id);
create index products_category_id_idx on public.products(category_id);
create index products_public_catalog_idx on public.products(status, category_id, created_at desc);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null check (storage_path !~ '^https?://'),
  alt_tr text not null,
  alt_en text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create index product_images_product_id_idx on public.product_images(product_id, sort_order);

create table public.favorites (
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (buyer_id, product_id)
);

create index favorites_product_id_idx on public.favorites(product_id);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  recipient_name text not null check (char_length(recipient_name) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 30),
  address_line text not null check (char_length(address_line) between 5 and 500),
  city text not null check (char_length(city) <= 80),
  district text not null check (char_length(district) <= 80),
  postal_code text check (postal_code is null or char_length(postal_code) <= 20),
  delivery_instructions text check (delivery_instructions is null or char_length(delivery_instructions) <= 500),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_profile_id_idx on public.addresses(profile_id);
create unique index addresses_one_default_per_profile_idx
  on public.addresses(profile_id) where is_default;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger producer_profiles_set_updated_at before update on public.producer_profiles
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger product_images_set_updated_at before update on public.product_images
for each row execute function public.set_updated_at();
create trigger addresses_set_updated_at before update on public.addresses
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_role public.profile_role;
  safe_locale public.locale_code;
  safe_name text;
begin
  safe_role := case
    when new.raw_user_meta_data ->> 'role' in ('buyer', 'producer')
      then (new.raw_user_meta_data ->> 'role')::public.profile_role
    else 'buyer'::public.profile_role
  end;
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
  values (new.id, safe_role, safe_name, safe_locale)
  on conflict (id) do nothing;

  if safe_role = 'producer' then
    insert into public.producer_profiles (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create schema if not exists private;
revoke all on schema private from public;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  );
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.producer_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.favorites enable row level security;
alter table public.addresses enable row level security;

revoke all on public.profiles, public.producer_profiles, public.categories,
  public.products, public.product_images, public.favorites, public.addresses
  from anon, authenticated;

grant select on public.profiles, public.producer_profiles, public.categories,
  public.products, public.product_images to anon, authenticated;
grant update (display_name, locale, city, district, neighborhood_public)
  on public.profiles to authenticated;
grant insert (profile_id, story_tr, story_en, delivery_regions, approximate_area)
  on public.producer_profiles to authenticated;
grant update (story_tr, story_en, delivery_regions, approximate_area)
  on public.producer_profiles to authenticated;
grant insert (producer_id, category_id, slug, title_tr, title_en, description_tr,
  description_en, price_minor, currency, stock_mode, stock_quantity,
  preparation_days, city, district) on public.products to authenticated;
grant update (category_id, slug, title_tr, title_en, description_tr,
  description_en, price_minor, currency, stock_mode, stock_quantity,
  preparation_days, city, district) on public.products to authenticated;
grant delete on public.products to authenticated;
grant insert (product_id, storage_path, alt_tr, alt_en, sort_order),
  update (storage_path, alt_tr, alt_en, sort_order), delete
  on public.product_images to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;

create policy profiles_read_own
on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy profiles_read_public_approved_producers
on public.profiles for select to anon, authenticated
using (
  role = 'producer' and status = 'active' and exists (
    select 1 from public.producer_profiles pp
    where pp.profile_id = profiles.id and pp.verification_status = 'approved'
  )
);
create policy profiles_update_own_safe_columns
on public.profiles for update to authenticated
using (id = (select auth.uid()) and status = 'active')
with check (id = (select auth.uid()) and status = 'active');
create policy profiles_admin_all
on public.profiles for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy producer_profiles_read_public_approved
on public.producer_profiles for select to anon, authenticated
using (verification_status = 'approved');
create policy producer_profiles_read_own
on public.producer_profiles for select to authenticated
using (profile_id = (select auth.uid()));
create policy producer_profiles_insert_own_pending
on public.producer_profiles for insert to authenticated
with check (
  profile_id = (select auth.uid()) and verification_status = 'pending'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'producer' and p.status = 'active')
);
create policy producer_profiles_update_own_safe_columns
on public.producer_profiles for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
create policy producer_profiles_admin_all
on public.producer_profiles for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy categories_read_active
on public.categories for select to anon, authenticated
using (active);
create policy categories_admin_all
on public.categories for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy products_read_public_approved
on public.products for select to anon, authenticated
using (
  status = 'approved'
  and exists (select 1 from public.profiles p where p.id = products.producer_id and p.status = 'active')
  and exists (select 1 from public.producer_profiles pp where pp.profile_id = products.producer_id and pp.verification_status = 'approved')
);
create policy products_read_own
on public.products for select to authenticated
using (producer_id = (select auth.uid()));
create policy products_insert_own_draft
on public.products for insert to authenticated
with check (
  producer_id = (select auth.uid()) and status = 'draft'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'producer' and p.status = 'active')
  and exists (select 1 from public.producer_profiles pp where pp.profile_id = (select auth.uid()) and pp.verification_status = 'approved')
);
create policy products_update_own_safe_columns
on public.products for update to authenticated
using (producer_id = (select auth.uid()))
with check (producer_id = (select auth.uid()));
create policy products_delete_own_unapproved
on public.products for delete to authenticated
using (producer_id = (select auth.uid()) and status <> 'approved');
create policy products_admin_all
on public.products for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy product_images_read_public_product
on public.product_images for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_images.product_id and p.status = 'approved'));
create policy product_images_read_own_product
on public.product_images for select to authenticated
using (exists (select 1 from public.products p where p.id = product_images.product_id and p.producer_id = (select auth.uid())));
create policy product_images_insert_own_product
on public.product_images for insert to authenticated
with check (exists (select 1 from public.products p where p.id = product_images.product_id and p.producer_id = (select auth.uid())));
create policy product_images_update_own_product
on public.product_images for update to authenticated
using (exists (select 1 from public.products p where p.id = product_images.product_id and p.producer_id = (select auth.uid())))
with check (exists (select 1 from public.products p where p.id = product_images.product_id and p.producer_id = (select auth.uid())));
create policy product_images_delete_own_product
on public.product_images for delete to authenticated
using (exists (select 1 from public.products p where p.id = product_images.product_id and p.producer_id = (select auth.uid())));
create policy product_images_admin_all
on public.product_images for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy favorites_read_own
on public.favorites for select to authenticated
using (buyer_id = (select auth.uid()));
create policy favorites_insert_own_approved_product
on public.favorites for insert to authenticated
with check (
  buyer_id = (select auth.uid())
  and exists (select 1 from public.products p where p.id = favorites.product_id and p.status = 'approved')
);
create policy favorites_delete_own
on public.favorites for delete to authenticated
using (buyer_id = (select auth.uid()));

create policy addresses_read_own
on public.addresses for select to authenticated
using (profile_id = (select auth.uid()));
create policy addresses_insert_own
on public.addresses for insert to authenticated
with check (profile_id = (select auth.uid()));
create policy addresses_update_own
on public.addresses for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
create policy addresses_delete_own
on public.addresses for delete to authenticated
using (profile_id = (select auth.uid()));

commit;
