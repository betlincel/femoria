-- =====================================================================
-- Femoria — vitrinden kaldırılan ürünler ve fotoğraf saklama süresi
--
--   Sohbeti / siparişi olmayan ürün → hemen tamamen silinir (fotoğraflarını uygulama siler).
--   Sohbeti / siparişi olan ürün   → sohbetler bozulmasın diye kayıt kalır; 30 gün içinde
--                                     geri alınabilir; 30 gün sonra fotoğrafları silinir.
--
-- Dosyalar (Storage) SQL ile silinemez; silme işini Edge Function yapar:
--   supabase/functions/purge-removed-photos  (her gece; zamanlama: supabase/cron/purge-schedule.sql)
-- =====================================================================

alter table public.products add column if not exists removed_at timestamptz;
alter table public.products add column if not exists photos_purged_at timestamptz;

create index if not exists products_removed_idx on public.products (removed_at)
  where status = 'kaldirildi' and photos_purged_at is null;

-- Kaldırılan ürün sohbetin iki tarafına da görünmeye devam etsin (yoksa sohbetteki ürün kartı boş kalır).
create policy "sohbet katılımcısı ürünü görür" on public.products for select to authenticated
  using (exists (
    select 1 from public.conversations c
     where c.product_id = products.id and auth.uid() in (c.buyer_id, c.seller_id)
  ));

-- ---------- Vitrinden kaldır ----------
-- Döner: { "deleted": true,  "photos": [silinecek dosya yolları] }   → uygulama dosyaları siler
--        { "deleted": false, "purge_after": zaman }                   → 30 gün saklanır
create or replace function public.remove_product(p_product_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  p public.products%rowtype;
  has_activity boolean;
begin
  select * into p from public.products where id = p_product_id for update;
  if not found or p.seller_id is distinct from auth.uid() then
    raise exception 'Ürün bulunamadı';
  end if;

  has_activity := exists (select 1 from public.conversations where product_id = p.id)
               or exists (select 1 from public.orders where product_id = p.id);

  if not has_activity then
    delete from public.products where id = p.id;
    return json_build_object('deleted', true, 'photos', to_json(p.photos));
  end if;

  update public.products
     set status = 'kaldirildi', removed_at = coalesce(removed_at, now())
   where id = p.id
   returning * into p;
  return json_build_object('deleted', false, 'purge_after', p.removed_at + interval '30 days');
end $$;

-- ---------- Geri al (30 gün dolmadan, fotoğraflar silinmeden) ----------
create or replace function public.restore_product(p_product_id uuid)
returns public.products language plpgsql security definer set search_path = public as $$
declare p public.products%rowtype;
begin
  update public.products
     set status = 'satista', removed_at = null
   where id = p_product_id and seller_id = auth.uid()
     and status = 'kaldirildi' and photos_purged_at is null
   returning * into p;
  if not found then
    raise exception 'Bu ürün artık geri alınamıyor';
  end if;
  return p;
end $$;

-- Ürünü elle "kaldirildi" yapmak (eski yol) da süreyi başlatsın; geri alınınca sıfırlansın.
create or replace function public.products_removed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'kaldirildi' and new.removed_at is null then
    new.removed_at := now();
  elsif new.status <> 'kaldirildi' then
    new.removed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists products_removed_at on public.products;
create trigger products_removed_at before insert or update of status on public.products
  for each row execute function public.products_removed_at();

-- ---------- Temizlik listesi (yalnız Edge Function / service_role) ----------
-- Silinecek dosyalar:
--   1) 30 günü dolmuş kaldırılmış ürünlerin fotoğrafları
--   2) hiçbir ürüne ait olmayan ürün fotoğrafları (yarım kalmış yüklemeler; 1 günden eski)
--   3) sohbeti artık olmayan sesli mesajlar (ör. hesap silinince karşı tarafın kayıtları)
create or replace function public.storage_cleanup_candidates()
returns table (bucket text, path text, product_id uuid, reason text)
language sql stable security definer set search_path = public, storage as $$
  select 'product-photos', unnest(p.photos), p.id, 'kaldirilan_urun_30_gun'
    from public.products p
   where p.status = 'kaldirildi' and p.photos_purged_at is null
     and p.removed_at < now() - interval '30 days'
  union all
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

create or replace function public.mark_photos_purged(p_product_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update public.products set photos = '{}', photos_purged_at = now()
   where id = any (p_product_ids) and status = 'kaldirildi'
$$;

-- ---------- İzinler ----------
revoke execute on function public.remove_product(uuid) from public, anon;
revoke execute on function public.restore_product(uuid) from public, anon;
grant execute on function public.remove_product(uuid) to authenticated;
grant execute on function public.restore_product(uuid) to authenticated;
revoke execute on function public.storage_cleanup_candidates() from public, anon, authenticated;
revoke execute on function public.mark_photos_purged(uuid[]) from public, anon, authenticated;
grant execute on function public.storage_cleanup_candidates() to service_role;
grant execute on function public.mark_photos_purged(uuid[]) to service_role;

-- ---------- Sesli mesajlar: kişi kendi gönderdiği kaydı silebilir (hesap silme için) ----------
-- Yol: <sohbet_id>/<kullanıcı_id>-<zaman>.<uzantı>
create policy "ses: kendi kaydını siler" on storage.objects for delete to authenticated
  using (
    bucket_id = 'voice-messages'
    and storage.filename(name) like auth.uid()::text || '-%'
  );
