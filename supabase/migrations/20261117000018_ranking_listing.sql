-- =====================================================================
-- Femoria — sıralama (en çok satan / değerlendirilen / önerilen) ve ürün listesi görünümü
--   • products: sold_count (teslim edilen adet), review_count (yorum sayısı), rank_score (önerilen sıra puanı).
--     Sayaçları yalnız tetikleyiciler değiştirir; satıcı kendi ürününün sayaçlarını oynatamaz.
--   • product_listing görünümü: satıştaki ürünler + satıcı bilgisi (güvenli ödeme, doğrulanmış, puan).
--     "Ürünler" sayfasındaki satıcı süzgeçleri bunu kullanır. security_invoker: ürün/yorum görünürlük
--     kuralları (RLS) olduğu gibi geçerlidir.
--   Tekrar tekrar çalıştırılabilir. (Ürünlere sütun eklenirse görünümü yeniden oluşturun.)
-- =====================================================================

-- ---------- Sayaçlar ----------
alter table public.products add column if not exists sold_count int not null default 0;
alter table public.products add column if not exists review_count int not null default 0;
alter table public.products add column if not exists favorite_count int not null default 0;

-- Önerilen sıra: satış > beğeni > yorum. Yeni ürünler sıfırdan başlar, eşitlikte en yeni önce gelir.
do $$ begin
  alter table public.products add column rank_score int generated always as (sold_count * 3 + favorite_count * 2 + review_count) stored;
exception when duplicate_column then null; end $$;

create index if not exists products_sold_idx on public.products (sold_count desc) where status = 'satista';
create index if not exists products_reviews_idx on public.products (review_count desc) where status = 'satista';
create index if not exists products_rank_idx on public.products (rank_score desc, published_at desc) where status = 'satista';

-- Sayaçları artırıp azaltan tek yer (security definer). Koruma tetikleyicisi yalnız bu çağrıya izin verir.
create or replace function public.bump_counter(p_product uuid, p_col text, p_delta int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_product is null then return; end if;
  perform set_config('femoria.counters', '1', true);
  if p_col = 'sold_count' then
    update public.products set sold_count = greatest(sold_count + p_delta, 0) where id = p_product;
  elsif p_col = 'review_count' then
    update public.products set review_count = greatest(review_count + p_delta, 0) where id = p_product;
  elsif p_col = 'favorite_count' then
    update public.products set favorite_count = greatest(favorite_count + p_delta, 0) where id = p_product;
  end if;
  perform set_config('femoria.counters', '', true);
end $$;
revoke execute on function public.bump_counter(uuid, text, int) from public, anon, authenticated;

create or replace function public.products_protect_counters()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' and coalesce(current_setting('femoria.counters', true), '') <> '1' then
    new.favorite_count := old.favorite_count;
    new.sold_count := old.sold_count;
    new.review_count := old.review_count;
  end if;
  return new;
end $$;
drop trigger if exists products_protect_favcount on public.products;
drop trigger if exists products_protect_counters on public.products;
create trigger products_protect_counters before update of favorite_count, sold_count, review_count on public.products
  for each row execute function public.products_protect_counters();

-- Favori sayısı (önceki tetikleyicinin yerine)
create or replace function public.favorites_count_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then perform public.bump_counter(new.product_id, 'favorite_count', 1);
  else perform public.bump_counter(old.product_id, 'favorite_count', -1); end if;
  return null;
end $$;

-- Satış sayısı: sipariş "teslim edildi" olunca adet kadar artar
create or replace function public.orders_sold_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'teslim_edildi' and old.status is distinct from 'teslim_edildi' then
    perform public.bump_counter(new.product_id, 'sold_count', new.quantity);
  end if;
  return null;
end $$;
drop trigger if exists orders_sold on public.orders;
create trigger orders_sold after update of status on public.orders
  for each row execute function public.orders_sold_trg();

-- Yorum sayısı
create or replace function public.reviews_count_trg()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_product uuid;
begin
  select product_id into v_product from public.orders where id = coalesce(new.order_id, old.order_id);
  perform public.bump_counter(v_product, 'review_count', case when tg_op = 'INSERT' then 1 else -1 end);
  return null;
end $$;
drop trigger if exists reviews_count on public.reviews;
create trigger reviews_count after insert or delete on public.reviews
  for each row execute function public.reviews_count_trg();

-- Mevcut verinin sayaçları
update public.products p set
  sold_count = coalesce((select sum(o.quantity) from public.orders o where o.product_id = p.id and o.status = 'teslim_edildi'), 0),
  review_count = coalesce((select count(*) from public.reviews r join public.orders o on o.id = r.order_id where o.product_id = p.id), 0),
  favorite_count = coalesce((select count(*) from public.favorites f where f.product_id = p.id), 0);

-- ---------- Ürün listesi görünümü ----------
drop view if exists public.product_listing;
create view public.product_listing with (security_invoker = true) as
select p.*,
       coalesce(pp.payout_ready, false) as seller_payout_ready,
       (coalesce(pp.email_verified, false) or coalesce(pp.phone_verified, false) or coalesce(pp.identity_verified, false)) as seller_verified,
       coalesce(rs.rating, 0) as seller_rating,
       coalesce(rs.cnt, 0) as seller_review_count
  from public.products p
  join public.public_profiles pp on pp.id = p.seller_id
  left join lateral (
    select round(avg(r.rating)::numeric, 1) as rating, count(*) as cnt
      from public.reviews r where r.seller_id = p.seller_id
  ) rs on true
 where p.status = 'satista';
grant select on public.product_listing to anon, authenticated;
