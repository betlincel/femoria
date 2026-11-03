-- =====================================================================
-- Femoria — arayüz yenilemesi
-- 1) Ayşe Abla'nın sesli okuması isteğe bağlı: varsayılan KAPALI.
--    Prototip aşamasında gerçek kullanıcı olmadığı için mevcut profiller de kapatılır;
--    kullanıcı Ayarlar'dan ya da asistan panelindeki hoparlör düğmesinden açabilir.
-- 2) Sistem mesajları sade dile çekildi (emoji kaldırıldı).
-- =====================================================================

alter table public.profiles alter column tts_enabled set default false;
update public.profiles set tts_enabled = false where tts_enabled;

create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c          public.conversations%rowtype;
  recipient  uuid;
  local_hour int := extract(hour from (now() at time zone 'Europe/Istanbul'));
begin
  update public.conversations set last_message_at = new.created_at
   where id = new.conversation_id
   returning * into c;

  if new.sender_id is null then
    return new;  -- sistem mesajı
  end if;

  recipient := case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end;

  if (local_hour >= 22 or local_hour < 8)
     and (select quiet_hours_enabled from public.profiles where id = recipient)
     and not exists (
       select 1 from public.messages m
        where m.conversation_id = new.conversation_id
          and m.kind = 'sistem'
          and m.body like 'Gece sessizliği%'
          and m.created_at > now() - interval '10 hours'
     ) then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (new.conversation_id, null, 'sistem',
            'Gece sessizliği: Karşı taraf şu an dinleniyor, sabah dönecek.');
  end if;

  return new;
end $$;

create or replace function public.agree_order(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or auth.uid() not in (o.buyer_id, o.seller_id) then
    raise exception 'Sipariş bulunamadı';
  end if;
  if o.status <> 'teklif' then
    return o;
  end if;

  update public.orders
     set buyer_agreed  = buyer_agreed  or auth.uid() = buyer_id,
         seller_agreed = seller_agreed or auth.uid() = seller_id
   where id = p_order_id
   returning * into o;

  if o.buyer_agreed and o.seller_agreed then
    update public.orders set status = 'anlasildi', agreed_at = now()
     where id = p_order_id returning * into o;
    insert into public.messages (conversation_id, sender_id, kind, body, order_id)
    values (o.conversation_id, null, 'sistem', 'Anlaştınız. Sipariş kaydedildi.', o.id);
  end if;
  return o;
end $$;

create or replace function public.mark_order_delivered(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  update public.orders set status = 'teslim_edildi', delivered_at = now()
   where id = p_order_id and auth.uid() in (buyer_id, seller_id) and status = 'anlasildi'
   returning * into o;
  if not found then
    raise exception 'Önce iki tarafın da "Anlaştık" demesi gerekiyor';
  end if;
  insert into public.messages (conversation_id, sender_id, kind, body, order_id)
  values (o.conversation_id, null, 'sistem', 'Teslim edildi. Hayırlı olsun.', o.id);

  perform public.refresh_badges(o.seller_id);
  perform public.refresh_badges(mentor_id) from public.profiles
    where id = o.seller_id and mentor_id is not null;
  return o;
end $$;
