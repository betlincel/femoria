-- =====================================================================
-- Femoria — Dosya depolama (Supabase Storage)
--   product-photos : ürün fotoğrafları (herkese açık okuma)   <uid>/<dosya>
--   avatars        : profil fotoğrafları (herkese açık okuma) <uid>/<dosya>
--   voice-messages : sesli mesajlar (yalnız sohbet katılımcıları) <conversation_id>/<dosya>
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-photos', 'product-photos', true,  5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars',        'avatars',        true,  2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('voice-messages', 'voice-messages', false, 5242880, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

-- Herkese açık kovalar: kullanıcı yalnız kendi klasörüne yazar/siler.
create policy "fotoğraf: herkes okur" on storage.objects for select
  using (bucket_id in ('product-photos', 'avatars'));

create policy "fotoğraf: kendi klasörüne yükler" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('product-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fotoğraf: kendi dosyasını günceller" on storage.objects for update to authenticated
  using (
    bucket_id in ('product-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fotoğraf: kendi dosyasını siler" on storage.objects for delete to authenticated
  using (
    bucket_id in ('product-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Sesli mesajlar: klasör adı sohbet kimliğidir; yalnız katılımcılar okur/yazar.
create policy "ses: katılımcı okur" on storage.objects for select to authenticated
  using (
    bucket_id = 'voice-messages'
    and public.is_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "ses: katılımcı yükler" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice-messages'
    and public.is_participant(((storage.foldername(name))[1])::uuid)
  );
