-- =====================================================================
-- Femoria — favoriler
--   Kullanıcı beğendiği ürünü favorilerine ekler; favorileri yalnız kendisi görür.
--   Ürün silinince ya da hesap silinince favori kaydı da silinir (cascade).
--   Tekrar tekrar çalıştırılabilir.
-- =====================================================================

create table if not exists public.favorites (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists favorites_user_created_idx on public.favorites (user_id, created_at desc);
create index if not exists favorites_product_idx on public.favorites (product_id);

alter table public.favorites enable row level security;

drop policy if exists "favori: kendi favorilerini görür" on public.favorites;
create policy "favori: kendi favorilerini görür" on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "favori: kendine ekler" on public.favorites;
create policy "favori: kendine ekler" on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "favori: kendi favorisini siler" on public.favorites;
create policy "favori: kendi favorisini siler" on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.favorites from anon;
grant select, insert, delete on public.favorites to authenticated;
