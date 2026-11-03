-- =====================================================================
-- Femoria — gece temizliğini zamanla (bir kez, SQL Editor'de elle çalıştırın)
--
-- Bu dosya bir migration DEĞİLDİR: proje adresinizi ve gizli değeri içerir.
-- Önce:
--   1) Dashboard → Database → Extensions: "pg_cron" ve "pg_net" açık olsun
--   2) supabase secrets set PURGE_CRON_SECRET=<uzun-rastgele-değer>
--   3) supabase functions deploy purge-removed-photos --no-verify-jwt
-- Sonra aşağıdaki iki <...> alanını doldurup çalıştırın.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Proje adresi ve gizli değer Vault'ta şifreli saklanır (sorguda açık yazılmaz)
select vault.create_secret('https://<PROJE-REF>.supabase.co', 'femoria_project_url');
select vault.create_secret('<PURGE_CRON_SECRET ile aynı değer>', 'femoria_purge_secret');

-- Her gece 03:17 (UTC) — Türkiye saatiyle 06:17
select cron.schedule(
  'femoria-purge-removed-photos',
  '17 3 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'femoria_project_url')
               || '/functions/v1/purge-removed-photos',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'femoria_purge_secret')),
    body    := '{}'::jsonb
  );
  $$
);

-- Kontrol:        select * from cron.job;
-- Son çalışmalar: select * from cron.job_run_details order by start_time desc limit 5;
-- Kaldırmak için: select cron.unschedule('femoria-purge-removed-photos');
