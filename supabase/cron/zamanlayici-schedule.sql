-- =====================================================================
-- Femoria — zamanlayıcıyı kur (bir kez, SQL Editor'de elle çalıştırın)
--   Her 5 dakikada bir: e-posta bildirimleri, yarım kalan ödemeler, kargo süresi,
--   otomatik teslim onayı.
--
-- Bu dosya bir migration DEĞİLDİR: gizli değer içerir.
-- Önce:
--   1) Dashboard → Database → Extensions: "pg_cron" ve "pg_net" açık olsun
--   2) supabase secrets set ZAMANLAYICI_SECRET=<uzun-rastgele-değer>
--   3) supabase functions deploy zamanlayici --no-verify-jwt
-- Gece temizliğini (purge-schedule.sql) kurduysanız 'femoria_project_url' zaten vardır;
-- o satırı atlayın. Sonra <...> alanlarını doldurup çalıştırın.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- select vault.create_secret('https://<PROJE-REF>.supabase.co', 'femoria_project_url');  -- yoksa açın
select vault.create_secret('<ZAMANLAYICI_SECRET ile aynı değer>', 'femoria_zamanlayici_secret');

select cron.schedule(
  'femoria-zamanlayici',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'femoria_project_url')
               || '/functions/v1/zamanlayici',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'femoria_zamanlayici_secret')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Kontrol:        select * from cron.job;
-- Son çalışmalar: select * from cron.job_run_details order by start_time desc limit 5;
-- Yanıtlar:       select status_code, content from net._http_response order by created desc limit 5;
-- Kaldırmak için: select cron.unschedule('femoria-zamanlayici');
