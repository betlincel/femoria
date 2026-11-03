-- =====================================================================
-- Femoria — kullanılmayan kişisel veri alanlarını kaldır (KVKK: veri en aza indirme)
--   • Acil durum kişisi özelliği kaldırıldı → emergency_name, emergency_phone
--     (sütunla birlikte daha önce girilmiş isim ve telefonlar da silinir)
--   • Ayşe Abla'nın görünümü artık sabit (başı açık) → assistant_look
-- =====================================================================

alter table public.profiles drop column if exists emergency_name;
alter table public.profiles drop column if exists emergency_phone;
alter table public.profiles drop column if exists assistant_look;
