-- =====================================================================
-- Femoria — vitrinden kaldırılan ürün hemen ve tamamen silinir
--   • 30 günlük saklama ve "Geri al" kaldırıldı (migration 10'un yerine geçer)
--   • Ürün silinince sohbetler ve sipariş kartları SİLİNMEZ: ürün bağlantısı boşalır,
--     sohbette ürünün adı ve fiyatı (kayıt anındaki hali) görünmeye devam eder
--   • Fotoğraf dosyalarını uygulama hemen siler; silinemeyen kalırsa gece temizliği
--     "sahipsiz fotoğraf" olarak siler
-- =====================================================================

-- ---------- Sohbet: ürünün adı ve fiyatı ürün silinse de kalsın ----------
alter table public.conversations add column if not exists product_title text;
alter table public.conversations add column if not exists product_price numeric(10, 2);
alter table public.conversations add column if not exists product_category text;

update public.conversations c
   set product_title = p.title, product_price = p.price, product_category = p.category
  from public.products p
 where p.id = c.product_id and c.product_title is null;

create or replace function public.conversations_snapshot_product()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select title, price, category into new.product_title, new.product_price, new.product_category
    from public.products where id = new.product_id;
  return new;
end $$;

drop trigger if exists conversations_snapshot on public.conversations;
create trigger conversations_snapshot before insert on public.conversations
  for each row execute function public.conversations_snapshot_product();

-- ---------- Ürün silinince sohbet / sipariş silinmesin, bağlantı boşalsın ----------
alter table public.conversations alter column product_id drop not null;
alter table public.conversations drop constraint if exists conversations_product_id_fkey;
alter table public.conversations add constraint conversations_product_id_fkey
  foreign key (product_id) references public.products (id) on delete set null;

alter table public.orders alter column product_id drop not null;
alter table public.orders drop constraint if exists orders_product_id_fkey;
alter table public.orders add constraint orders_product_id_fkey
  foreign key (product_id) references public.products (id) on delete set null;

-- Silinmiş ürün için yeni sipariş kartı açılamasın
create or replace function public.propose_order(
  p_conversation_id uuid,
  p_quantity        int,
  p_unit_price      numeric,
  p_delivery        public.delivery_method,
  p_promised_date   date default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  c    public.conversations%rowtype;
  v_id uuid;
begin
  if not public.can_message(p_conversation_id) then
    raise exception 'Bu sohbette sipariş kartı oluşturamazsınız';
  end if;
  select * into c from public.conversations where id = p_conversation_id;
  if c.product_id is null then
    raise exception 'Bu ürün satıcı tarafından kaldırıldı';
  end if;

  insert into public.orders (conversation_id, product_id, buyer_id, seller_id, quantity,
                             unit_price, delivery, promised_date, buyer_agreed, seller_agreed)
  values (c.id, c.product_id, c.buyer_id, c.seller_id, p_quantity, p_unit_price, p_delivery,
          p_promised_date, auth.uid() = c.buyer_id, auth.uid() = c.seller_id)
  returning id into v_id;

  insert into public.messages (conversation_id, sender_id, kind, body, order_id)
  values (c.id, auth.uid(), 'siparis', 'Sipariş kartı', v_id);

  return v_id;
end $$;

-- ---------- Vitrinden kaldır = sil ----------
-- Döner: { "deleted": true, "photos": [uygulamanın depodan sileceği dosya yolları] }
create or replace function public.remove_product(p_product_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare p public.products%rowtype;
begin
  delete from public.products
   where id = p_product_id and seller_id = auth.uid()
   returning * into p;
  if not found then
    raise exception 'Ürün bulunamadı';
  end if;
  return json_build_object('deleted', true, 'photos', to_json(p.photos));
end $$;

-- Daha önce "kaldırıldı" durumunda bekleyen ürünleri şimdi sil
-- (fotoğraf dosyalarını gece temizliği "sahipsiz fotoğraf" olarak siler)
delete from public.products where status = 'kaldirildi';

-- ---------- 30 günlük saklama düzeneğini kaldır ----------
drop function if exists public.restore_product(uuid);
drop function if exists public.mark_photos_purged(uuid[]);
drop trigger if exists products_removed_at on public.products;
drop function if exists public.products_removed_at();
drop index if exists public.products_removed_idx;

-- Gece temizliği: artık yalnız sahipsiz fotoğraflar ve sohbeti silinmiş sesli mesajlar
create or replace function public.storage_cleanup_candidates()
returns table (bucket text, path text, product_id uuid, reason text)
language sql stable security definer set search_path = public, storage as $$
  select 'product-photos', o.name, null::uuid, 'sahipsiz_fotograf'
    from storage.objects o
   where o.bucket_id = 'product-photos'
     and o.created_at < now() - interval '1 day'
     and not exists (select 1 from public.products p where o.name = any (p.photos))
  union all
  select 'voice-messages', o.name, null::uuid, 'sohbeti_silinmis_ses'
    from storage.objects o
   where o.bucket_id = 'voice-messages'
     and o.created_at < now() - interval '1 day'
     and not exists (
       select 1 from public.conversations c where c.id::text = split_part(o.name, '/', 1)
     )
$$;
revoke execute on function public.storage_cleanup_candidates() from public, anon, authenticated;
grant execute on function public.storage_cleanup_candidates() to service_role;

alter table public.products drop column if exists removed_at;
alter table public.products drop column if exists photos_purged_at;
