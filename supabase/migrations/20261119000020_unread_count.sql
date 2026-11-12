-- =====================================================================
-- Femoria — okunmamış sohbet sayısı (mesaj simgesindeki sayı)
--   Yeni mesaj, yeni sipariş kartı, teklif ve sistem bildirimleri sohbetlere mesaj olarak düşer;
--   bu işlev, okunmamış mesajı olan sohbetlerin sayısını verir.
--   Tekrar tekrar çalıştırılabilir.
-- =====================================================================
create or replace function public.my_unread_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.conversations c
   where auth.uid() in (c.buyer_id, c.seller_id)
     and exists (
       select 1 from public.messages m
        where m.conversation_id = c.id
          and m.sender_id is distinct from auth.uid()
          and m.created_at > coalesce(case when c.buyer_id = auth.uid() then c.buyer_last_read_at else c.seller_last_read_at end, '-infinity'::timestamptz)
     );
$$;
revoke execute on function public.my_unread_count() from public, anon;
grant execute on function public.my_unread_count() to authenticated;
