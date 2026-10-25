-- ArchiFlow – schedules (pg_cron) and the e-mail sender trigger (pg_net → Edge Function send-emails).
-- Secrets live in Supabase Vault only:
--   archiflow_cron_secret   random, generated here, never leaves the database except in the cron request header
--   archiflow_functions_url https://<ref>.supabase.co/functions/v1
--   archiflow_app_url       public URL of the app (used in e-mail links) – set it once the site is hosted
--   archiflow_email_from    e.g. ArchiFlow <notifications@your-domain.co.il>
-- Skips itself on databases without pg_cron / pg_net / vault (local test database).

-- service-role-only: the Edge Function asks the database whether the caller's secret is right
create or replace function public.email_sender_config(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s text;
begin
  if to_regclass('vault.decrypted_secrets') is null then return jsonb_build_object('ok', false); end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into s using 'archiflow_cron_secret';
  if s is null or p_secret is null or length(p_secret) < 32 or p_secret <> s then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true,
    'app_url', (select decrypted_secret from vault.decrypted_secrets where name = 'archiflow_app_url'),
    'email_from', (select decrypted_secret from vault.decrypted_secrets where name = 'archiflow_email_from'));
end $$;
revoke execute on function public.email_sender_config(text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.email_sender_config(text) to service_role';
  end if;
end $$;

do $outer$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net')
     or to_regclass('vault.secrets') is null then
    raise notice 'pg_cron / pg_net / vault not available – schedules skipped';
    return;
  end if;

  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;   -- its functions live in schema net

  if not exists (select 1 from vault.secrets where name = 'archiflow_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'archiflow_cron_secret', 'ArchiFlow: cron → send-emails');
  end if;

  execute $f$
    create or replace function private.trigger_email_sender() returns void
    language plpgsql security definer set search_path = '' as $b$
    declare secret text; url text;
    begin
      if not exists (select 1 from public.email_outbox where status = 'queued') then return; end if;
      select decrypted_secret into secret from vault.decrypted_secrets where name = 'archiflow_cron_secret';
      select decrypted_secret into url from vault.decrypted_secrets where name = 'archiflow_functions_url';
      if secret is null or url is null then return; end if;
      perform net.http_post(url := url || '/send-emails',
                            headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
                            body := '{}'::jsonb, timeout_milliseconds := 20000);
    end $b$
  $f$;
  revoke execute on function private.trigger_email_sender() from public, anon, authenticated;

  perform cron.schedule('archiflow-hourly', '5 * * * *', 'select private.run_hourly_jobs()');
  perform cron.schedule('archiflow-daily', '7 5 * * *', 'select private.run_daily_jobs()');   -- 05:07 UTC = 07:07/08:07 Israel
  perform cron.schedule('archiflow-emails', '* * * * *', 'select private.trigger_email_sender()');
end $outer$;
