-- =====================================================================
-- Femoria — yönetici paneli ve satıcı kazanç ekranı
--   • admins: yöneticiler (yalnız SQL ile eklenir; uygulamadan değiştirilemez)
--   • admin_* işlevleri: yalnız yöneticiye çalışır (security definer + is_admin kontrolü)
--   • my_earnings_detail(): satıcının bekleyen / aktarılan / iade edilen tutarları ve siparişleri
-- Yönetici eklemek için (SQL Editor): 
--   insert into public.admins (user_id) select id from auth.users where email = 'siz@ornek.com';
-- Tekrar tekrar çalıştırılabilir.
-- =====================================================================

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.admin_guard()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Bu işlem için yetkiniz yok'; end if;
end $$;

-- ---------- Özet ----------
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'users',            (select count(*) from public.profiles),
    'users_week',       (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'products_live',    (select count(*) from public.products where status = 'satista'),
    'orders_paid',      (select count(*) from public.orders where payment_status = 'odendi'),
    'gmv',              coalesce((select sum(quantity * unit_price) from public.orders where payment_status = 'odendi' or status = 'teslim_edildi'), 0),
    'pending_payout',   coalesce((select sum(quantity * unit_price) from public.orders where payout_status = 'bekliyor'), 0),
    'open_disputes',    (select count(*) from public.orders where dispute_status = 'acik'),
    'reports_week',     (select count(*) from public.reports where created_at > now() - interval '7 days'),
    'reports_total',    (select count(*) from public.reports)
  );
end $$;

-- ---------- Sorun bildirimleri (anlaşmazlıklar) ----------
create or replace function public.admin_disputes(p_status text default 'acik')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.disputed_at desc) from (
    select o.id, o.disputed_at, o.dispute_status, o.dispute_reason, o.dispute_note,
           o.quantity * o.unit_price as amount, o.payment_status, o.payout_status, o.shipping_status, o.conversation_id,
           coalesce(p.title, c.product_title) as product_title,
           b.full_name as buyer_name, s.full_name as seller_name
      from public.orders o
      left join public.products p on p.id = o.product_id
      left join public.conversations c on c.id = o.conversation_id
      left join public.profiles b on b.id = o.buyer_id
      left join public.profiles s on s.id = o.seller_id
     where o.dispute_status = p_status
     order by o.disputed_at desc limit 100) x), '[]'::jsonb);
end $$;

-- Sorunu kapat: iki tarafa bildirim gider. (İade gerekiyorsa iyzico panelinden yapılır.)
create or replace function public.admin_close_dispute(p_order_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  perform public.admin_guard();
  update public.orders set dispute_status = 'kapandi' where id = p_order_id and dispute_status = 'acik' returning * into o;
  if o.id is null then raise exception 'Açık bir sorun bildirimi bulunamadı'; end if;
  perform public.notify(o.buyer_id, 'sorun', 'Sorun bildiriminiz incelendi',
    coalesce(nullif(trim(p_note), ''), 'Femoria ekibi sorun bildiriminizi inceledi ve kapattı.'), '/sohbet/' || o.conversation_id);
  perform public.notify(o.seller_id, 'sorun', 'Sorun bildirimi kapatıldı',
    coalesce(nullif(trim(p_note), ''), 'Femoria ekibi bu siparişteki sorun bildirimini inceledi ve kapattı.'), '/sohbet/' || o.conversation_id);
end $$;

-- ---------- Şikayetler ----------
create or replace function public.admin_reports()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select r.id, r.created_at, r.reason, r.note, r.product_id, r.conversation_id,
           r.reporter_id, r.reported_id, rp.full_name as reporter_name, rd.full_name as reported_name,
           pr.title as product_title,
           (select count(*) from public.reports r2 where r2.reported_id = r.reported_id) as reported_count
      from public.reports r
      left join public.profiles rp on rp.id = r.reporter_id
      left join public.profiles rd on rd.id = r.reported_id
      left join public.products pr on pr.id = r.product_id
     order by r.created_at desc limit 100) x), '[]'::jsonb);
end $$;

create or replace function public.admin_dismiss_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard();
  delete from public.reports where id = p_report_id;
end $$;

-- ---------- Ürünler ----------
create or replace function public.admin_products(p_q text default '')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.published_at desc) from (
    select p.id, p.title, p.price, p.status, p.category, p.photos, p.published_at, p.seller_id, s.full_name as seller_name
      from public.products p left join public.profiles s on s.id = p.seller_id
     where coalesce(trim(p_q), '') = '' or p.title ilike '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%'
     order by p.published_at desc limit 60) x), '[]'::jsonb);
end $$;

-- Uygunsuz ürünü kaldır (satıcıya bildirim gider; fotoğraflar gece temizliğinde silinir)
create or replace function public.admin_remove_product(p_product_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.products;
begin
  perform public.admin_guard();
  delete from public.products where id = p_product_id returning * into p;
  if p.id is null then raise exception 'Ürün bulunamadı'; end if;
  perform public.notify(p.seller_id, 'ilan', 'İlanınız kaldırıldı',
    format('"%s" ilanı Femoria ekibi tarafından kaldırıldı.%s', p.title, coalesce(' Sebep: ' || nullif(trim(p_reason), ''), '')), null);
end $$;

-- ---------- Siparişler ----------
create or replace function public.admin_orders()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select o.id, o.created_at, o.status, o.payment_status, o.payout_status, o.shipping_status, o.dispute_status,
           o.quantity * o.unit_price as amount, o.conversation_id,
           coalesce(p.title, c.product_title) as product_title, b.full_name as buyer_name, s.full_name as seller_name
      from public.orders o
      left join public.products p on p.id = o.product_id
      left join public.conversations c on c.id = o.conversation_id
      left join public.profiles b on b.id = o.buyer_id
      left join public.profiles s on s.id = o.seller_id
     order by o.created_at desc limit 100) x), '[]'::jsonb);
end $$;

-- ---------- Satıcı kazanç ekranı ----------
-- pending: ödeme alındı, alıcı henüz onaylamadı (para emanette) · released: satıcıya aktarıldı
-- cash: elden teslim edilip kayda geçen satışlar · refunded: iade edilen siparişler
create or replace function public.my_earnings_detail()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pending',   coalesce((select sum(quantity * unit_price) from public.orders where seller_id = auth.uid() and payment_status = 'odendi' and payout_status = 'bekliyor'), 0),
    'pending_n', (select count(*) from public.orders where seller_id = auth.uid() and payment_status = 'odendi' and payout_status = 'bekliyor'),
    'released',  coalesce((select sum(quantity * unit_price) from public.orders where seller_id = auth.uid() and payout_status = 'onaylandi'), 0),
    'released_n',(select count(*) from public.orders where seller_id = auth.uid() and payout_status = 'onaylandi'),
    'cash',      coalesce((select sum(quantity * unit_price) from public.orders where seller_id = auth.uid() and status = 'teslim_edildi' and payment_status = 'yok'), 0),
    'refunded',  coalesce((select sum(quantity * unit_price) from public.orders where seller_id = auth.uid() and payout_status = 'iade'), 0),
    'disputes',  (select count(*) from public.orders where seller_id = auth.uid() and dispute_status = 'acik'),
    'orders', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select o.id, o.created_at, o.status, o.payment_status, o.payout_status, o.shipping_status, o.dispute_status,
             o.confirmed_at, o.auto_confirmed, o.quantity, o.unit_price, o.quantity * o.unit_price as amount, o.conversation_id,
             coalesce(p.title, c.product_title, 'Ürün') as product_title
        from public.orders o
        left join public.products p on p.id = o.product_id
        left join public.conversations c on c.id = o.conversation_id
       where o.seller_id = auth.uid() and o.status <> 'teklif'
       order by o.created_at desc limit 60) x), '[]'::jsonb)
  );
$$;

do $$ declare f text; begin
  foreach f in array array[
    'is_admin()', 'admin_overview()', 'admin_disputes(text)', 'admin_close_dispute(uuid,text)', 'admin_reports()',
    'admin_dismiss_report(uuid)', 'admin_products(text)', 'admin_remove_product(uuid,text)', 'admin_orders()', 'my_earnings_detail()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.admin_guard() from public, anon, authenticated;
