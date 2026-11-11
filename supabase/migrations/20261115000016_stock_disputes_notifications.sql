-- =====================================================================
-- Femoria — stok, sorun bildirme (itiraz), otomatik onay alanları, e-posta bildirim kuyruğu
--   • Ürünlerde stok adedi. Online ödemede stok ödeme başlarken ayrılır; stok biterse ürün
--     kendiliğinden "Satıldı" olur. Ödeme başarısız / iptal olursa stok geri eklenir.
--   • Alıcı "Sorun bildir" diyebilir; açık sorun varken sipariş kendiliğinden onaylanmaz.
--   • Bildirimler önce bu tabloya yazılır; "zamanlayici" Edge Function'ı birkaç dakikada bir
--     e-postaları gönderir (kullanıcı Ayarlar'dan bildirimleri kapattıysa gönderilmez).
--   Tekrar tekrar çalıştırılabilir.
-- =====================================================================

-- ---------- Stok ----------
alter table public.products add column if not exists stock int not null default 1;
do $$ begin
  alter table public.products add constraint products_stock_range check (stock between 0 and 999);
exception when duplicate_object then null; end $$;

-- Stok biterse "Satıldı"; satıcı yeniden satışa çıkarırsa en az 1 adet
create or replace function public.products_stock_status()
returns trigger language plpgsql as $$
begin
  if new.status = 'satista' and new.stock = 0 then
    if tg_op = 'UPDATE' and old.status is distinct from 'satista' then
      new.stock := 1;           -- "Yeniden satışa çıkar"
    else
      new.status := 'satildi';  -- son adet satıldı
    end if;
  end if;
  return new;
end $$;
drop trigger if exists products_stock_status on public.products;
create trigger products_stock_status before insert or update of stock, status on public.products
  for each row execute function public.products_stock_status();

-- Ödeme başlarken stok ayır (hepsi ya da hiçbiri). p_items: [{"product_id": "...", "qty": 2}, ...]
create or replace function public.reserve_stock(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb; v_title text;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    update public.products
       set stock = stock - (it ->> 'qty')::int
     where id = (it ->> 'product_id')::uuid and status = 'satista' and stock >= (it ->> 'qty')::int;
    if not found then
      select title into v_title from public.products where id = (it ->> 'product_id')::uuid;
      raise exception 'STOK: "%" için yeterli stok kalmadı', coalesce(v_title, 'Ürün');
    end if;
  end loop;
end $$;

-- Ödeme olmadı / iptal: stoğu geri ekle (stok yüzünden "Satıldı" olduysa yeniden satışa)
create or replace function public.release_stock(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    update public.products
       set stock = least(stock + (it ->> 'qty')::int, 999),
           status = case when status = 'satildi' and stock = 0 then 'satista' else status end
     where id = (it ->> 'product_id')::uuid;
  end loop;
end $$;

alter table public.checkouts add column if not exists stock_reserved boolean not null default false;
alter table public.checkouts add column if not exists stock_released boolean not null default false;

-- ---------- Sipariş: sorun bildirme ve otomatik işlemler ----------
alter table public.orders add column if not exists dispute_status text check (dispute_status in ('acik', 'kapandi'));
alter table public.orders add column if not exists dispute_reason text check (char_length(dispute_reason) <= 60);
alter table public.orders add column if not exists dispute_note text check (char_length(dispute_note) <= 1000);
alter table public.orders add column if not exists disputed_at timestamptz;
alter table public.orders add column if not exists reminded_at timestamptz;       -- alıcıya "onaylayın" hatırlatması
alter table public.orders add column if not exists ship_reminded_at timestamptz;  -- satıcıya "kargoya verin" hatırlatması
alter table public.orders add column if not exists auto_confirmed boolean not null default false;
alter table public.orders add column if not exists auto_cancelled boolean not null default false;

create or replace function public.open_dispute(p_order_id uuid, p_reason text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.buyer_id <> auth.uid() then raise exception 'Sipariş bulunamadı'; end if;
  if o.payment_status <> 'odendi' or o.payout_status <> 'bekliyor' or o.status in ('iptal', 'teslim_edildi') then
    raise exception 'Bu sipariş için sorun bildirilemez';
  end if;
  if o.dispute_status = 'acik' then raise exception 'Bu sipariş için zaten açık bir sorun bildiriminiz var'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Sorunu seçin'; end if;
  update public.orders
     set dispute_status = 'acik', dispute_reason = left(trim(p_reason), 60),
         dispute_note = nullif(left(trim(coalesce(p_note, '')), 1000), ''), disputed_at = now()
   where id = o.id;
  perform public.post_system_note(o.conversation_id,
    format('Alıcı sorun bildirdi: %s. Ödeme, sorun çözülene kadar satıcıya aktarılmayacak.', left(trim(p_reason), 60)));
end $$;

-- ---------- Bildirim kuyruğu (e-posta) ----------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,  -- null: yöneticiye (ADMIN_EMAIL)
  kind       text not null,
  subject    text not null check (char_length(subject) <= 200),
  body       text not null check (char_length(body) <= 2000),
  link       text,                                                   -- sitede açılacak sayfa (#/... olmadan)
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  attempts   int not null default 0,
  error      text
);
create index if not exists notifications_pending_idx on public.notifications (created_at) where sent_at is null;
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "bildirim: sahibi görür" on public.notifications;
create policy "bildirim: sahibi görür" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.notifications from anon, authenticated;

create or replace function public.notify(p_user uuid, p_kind text, p_subject text, p_body text, p_link text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, subject, body, link)
  values (p_user, p_kind, left(p_subject, 200), left(p_body, 2000), p_link);
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.order_title(o public.orders)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select title from public.products where id = o.product_id),
                  (select product_title from public.conversations where id = o.conversation_id), 'Ürün');
$$;

-- Sipariş olayları
create or replace function public.orders_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text := public.order_title(new);
begin
  if tg_op = 'INSERT' and new.payment_status = 'yok' then
    perform public.notify(case when new.created_by = new.buyer_id then new.seller_id else new.buyer_id end,
      'siparis_karti', format('Yeni sipariş kartı: %s', t),
      format('"%s" için %s adet sipariş kartı oluşturuldu. "Anlaştık" demek için sohbete göz atın.', t, new.quantity),
      '/sohbet/' || new.conversation_id);
    return new;
  end if;
  if tg_op <> 'UPDATE' then return new; end if;

  if new.payment_status = 'odendi' and old.payment_status is distinct from 'odendi' then
    perform public.notify(new.seller_id, 'yeni_siparis', format('Yeni sipariş: %s', t),
      format('"%s" için %s adet sipariş geldi ve ödendi. %s', t, new.quantity,
        case when new.delivery = 'kargo' then 'Ürünü kargoya verip takip numarasını girin.' else 'Teslimi alıcıyla sohbetten konuşun.' end),
      '/siparislerim?sekme=satislarim');
  end if;
  if new.shipping_status = 'kargoda' and old.shipping_status is distinct from 'kargoda' then
    perform public.notify(new.buyer_id, 'kargoda',
      case when new.delivery = 'kargo' then format('Siparişiniz kargoda: %s', t) else format('Siparişiniz teslime hazır: %s', t) end,
      case when new.delivery = 'kargo'
           then format('"%s" kargoya verildi. %s, takip no: %s. Teslim aldığınızda "Teslim aldım" deyin.', t, coalesce(new.cargo_company, 'Kargo'), coalesce(new.tracking_no, '-'))
           else format('Satıcı "%s" ürününü teslime hazırladı. Teslim aldığınızda "Teslim aldım" deyin.', t) end,
      '/siparislerim');
  end if;
  if new.status = 'teslim_edildi' and old.status is distinct from 'teslim_edildi' and new.payment_status = 'odendi' then
    perform public.notify(new.seller_id, 'odeme_onaylandi', format('Ödemeniz onaylandı: %s', t),
      format('"%s" siparişi %s. Ödemeniz iyzico tarafından IBAN''ınıza aktarılacak.', t,
        case when new.auto_confirmed then 'süre dolduğu için kendiliğinden onaylandı' else 'alıcı tarafından teslim alındı olarak onaylandı' end),
      '/siparislerim?sekme=satislarim');
  end if;
  if new.status = 'iptal' and old.status is distinct from 'iptal' and new.payment_status = 'iade' then
    perform public.notify(new.buyer_id, 'iptal', format('Sipariş iptal edildi: %s', t),
      format('"%s" siparişi iptal edildi%s ve ödemeniz kartınıza iade edildi.', t,
        case when new.auto_cancelled then ' (satıcı süresinde göndermediği için)' else '' end), '/siparislerim');
    perform public.notify(new.seller_id, 'iptal', format('Sipariş iptal edildi: %s', t),
      format('"%s" siparişi iptal edildi%s; ödeme alıcıya iade edildi ve stok geri eklendi.', t,
        case when new.auto_cancelled then ' (süresinde kargoya verilmediği için)' else '' end), '/siparislerim?sekme=satislarim');
  end if;
  if new.dispute_status = 'acik' and old.dispute_status is distinct from 'acik' then
    perform public.notify(new.seller_id, 'sorun', format('Alıcı sorun bildirdi: %s', t),
      format('"%s" siparişi için alıcı sorun bildirdi: %s. %s Lütfen sohbetten alıcıyla konuşun; gerekirse siparişi iptal edip iade edebilirsiniz.',
        t, new.dispute_reason, coalesce('Not: "' || new.dispute_note || '".', '')), '/sohbet/' || new.conversation_id);
    perform public.notify(null, 'yonetici_sorun', format('[Femoria] Sorun bildirimi: %s', t),
      format('Sipariş %s · sorun: %s · not: %s · tutar: %s TL', new.id, new.dispute_reason, coalesce(new.dispute_note, '-'),
        to_char(new.unit_price * new.quantity, 'FM999999990.00')), null);
  end if;
  return new;
end $$;
drop trigger if exists orders_notify on public.orders;
create trigger orders_notify after insert or update on public.orders
  for each row execute function public.orders_notify();

-- Teklif olayları
create or replace function public.offers_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text := coalesce((select title from public.products where id = new.product_id), 'Ürün');
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.seller_id, 'teklif', format('Yeni teklif: %s', t),
      format('"%s" için %s TL teklif geldi. 48 saat içinde kabul edebilir, reddedebilir ya da karşı teklif verebilirsiniz.', t, to_char(new.amount, 'FM999999990.##')),
      '/siparislerim?sekme=teklifler');
  elsif new.status is distinct from old.status then
    if new.status = 'karsi' then
      perform public.notify(new.buyer_id, 'teklif', format('Karşı teklif: %s', t),
        format('Satıcı "%s" için %s TL karşı teklif verdi.', t, to_char(new.counter_amount, 'FM999999990.##')), '/siparislerim?sekme=teklifler');
    elsif new.status = 'kabul' and old.status = 'bekliyor' then
      perform public.notify(new.buyer_id, 'teklif', format('Teklifiniz kabul edildi: %s', t),
        format('"%s" için %s TL teklifiniz kabul edildi. 48 saat içinde bu fiyattan satın alabilirsiniz.', t, to_char(new.amount, 'FM999999990.##')), '/siparislerim?sekme=teklifler');
    elsif new.status = 'kabul' and old.status = 'karsi' then
      perform public.notify(new.seller_id, 'teklif', format('Karşı teklifiniz kabul edildi: %s', t),
        format('Alıcı "%s" için %s TL karşı teklifinizi kabul etti.', t, to_char(new.amount, 'FM999999990.##')), '/siparislerim?sekme=teklifler');
    elsif new.status = 'red' then
      perform public.notify(case when old.status = 'bekliyor' then new.buyer_id else new.seller_id end, 'teklif',
        format('Teklif reddedildi: %s', t), format('"%s" için teklif kabul edilmedi.', t), '/siparislerim?sekme=teklifler');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists offers_notify on public.offers;
create trigger offers_notify after insert or update on public.offers
  for each row execute function public.offers_notify();

-- Yeni mesaj: aynı sohbet için 30 dakikada en fazla bir e-posta
create or replace function public.messages_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.conversations%rowtype; v_to uuid; v_name text;
begin
  if new.sender_id is null or new.kind not in ('metin', 'hazir', 'ses') then return new; end if;
  select * into c from public.conversations where id = new.conversation_id;
  if not found then return new; end if;
  v_to := case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end;
  if exists (select 1 from public.notifications where user_id = v_to and kind = 'mesaj'
               and link = '/sohbet/' || c.id and created_at > now() - interval '30 minutes') then
    return new;
  end if;
  select coalesce(full_name, 'Bir komşunuz') into v_name from public.profiles where id = new.sender_id;
  perform public.notify(v_to, 'mesaj', format('%s size yazdı', v_name),
    format('"%s" hakkında yeni mesajınız var: %s', coalesce(c.product_title, 'ürün'),
      case when new.kind = 'ses' then '(sesli mesaj)' else left(coalesce(new.body, ''), 140) end),
    '/sohbet/' || c.id);
  return new;
end $$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function public.messages_notify();

-- ---------- İzinler ----------
revoke execute on function public.reserve_stock(jsonb) from public, anon, authenticated;
revoke execute on function public.release_stock(jsonb) from public, anon, authenticated;
grant execute on function public.reserve_stock(jsonb) to service_role;
grant execute on function public.release_stock(jsonb) to service_role;
revoke execute on function public.open_dispute(uuid, text, text) from public, anon;
grant execute on function public.open_dispute(uuid, text, text) to authenticated;
revoke execute on function public.order_title(public.orders) from public, anon, authenticated;
grant execute on function public.notify(uuid, text, text, text, text) to service_role;
