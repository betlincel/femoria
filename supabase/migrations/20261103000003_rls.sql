-- =====================================================================
-- Femoria — Satır Düzeyi Güvenlik (RLS)
-- Varsayılan: hiçbir şey açık değil; her tablo için gereken en az izin.
-- =====================================================================

alter table public.categories         enable row level security;
alter table public.locations          enable row level security;
alter table public.profiles           enable row level security;
alter table public.products           enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.orders             enable row level security;
alter table public.blocks             enable row level security;
alter table public.reports            enable row level security;
alter table public.badges             enable row level security;
alter table public.user_badges        enable row level security;
alter table public.announcements      enable row level security;
alter table public.search_requests    enable row level security;
alter table public.events             enable row level security;
alter table public.assistant_feedback enable row level security;

-- ---------- Herkese açık sözlükler ----------
create policy "kategoriler herkese açık" on public.categories for select using (true);
create policy "konum listesi herkese açık" on public.locations for select using (true);
create policy "rozetler herkese açık" on public.badges for select using (true);
create policy "kazanılan rozetler herkese açık" on public.user_badges for select using (true);
create policy "aktif duyurular herkese açık" on public.announcements for select
  using (starts_at <= now() and (ends_at is null or ends_at > now()));

-- ---------- Profil: yalnızca sahibi (diğerleri public_profiles görünümünü kullanır) ----------
create policy "kendi profilini okur" on public.profiles for select
  using (id = auth.uid());
create policy "kendi profilini oluşturur" on public.profiles for insert
  with check (id = auth.uid());
create policy "kendi profilini günceller" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Ürünler ----------
-- Üyelik gezinmenin önüne konmaz: satıştaki ürünleri herkes (anon dahil) görür.
create policy "satıştaki ürünler herkese açık" on public.products for select
  using (status in ('satista', 'satildi') or seller_id = auth.uid());
create policy "satıcı ürün ekler" on public.products for insert to authenticated
  with check (seller_id = auth.uid());
create policy "satıcı kendi ürününü günceller" on public.products for update to authenticated
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "satıcı kendi ürününü siler" on public.products for delete to authenticated
  using (seller_id = auth.uid());

-- ---------- Sohbet (oluşturma start_conversation RPC ile) ----------
create policy "katılımcı sohbeti görür" on public.conversations for select to authenticated
  using (auth.uid() in (buyer_id, seller_id));

create policy "katılımcı mesajları görür" on public.messages for select to authenticated
  using (public.is_participant(conversation_id));
-- Sipariş ve sistem mesajları yalnızca RPC/tetikleyici ile yazılır.
create policy "katılımcı mesaj gönderir" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and kind in ('metin', 'hazir', 'ses')
    and public.can_message(conversation_id)
  );
-- Sesli mesajın yazıya çevrilmiş halini eklemek için (yalnız transcript alanı anlamlı).
create policy "katılımcı sesli mesaja yazı ekler" on public.messages for update to authenticated
  using (public.is_participant(conversation_id) and kind = 'ses')
  with check (public.is_participant(conversation_id) and kind = 'ses');

create policy "katılımcı siparişi görür" on public.orders for select to authenticated
  using (auth.uid() in (buyer_id, seller_id));

-- ---------- Engelle / şikayet ----------
create policy "kendi engellerini görür" on public.blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy "engeller" on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid() and blocked_id <> auth.uid());
create policy "engeli kaldırır" on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

create policy "şikayet eder" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy "kendi şikayetlerini görür" on public.reports for select to authenticated
  using (reporter_id = auth.uid());

-- ---------- Ölçüm ve geri bildirim: yalnızca yazma ----------
create policy "arama talebi bırakır" on public.search_requests for insert
  with check (user_id is null or user_id = auth.uid());
create policy "olay kaydeder" on public.events for insert
  with check (user_id is null or user_id = auth.uid());
create policy "geri bildirim bırakır" on public.assistant_feedback for insert
  with check (user_id is null or user_id = auth.uid());

-- ---------- Realtime: mesajlar ve sipariş kartları canlı akar ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.orders, public.conversations;
  end if;
end $$;
