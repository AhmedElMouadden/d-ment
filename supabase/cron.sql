-- =============================================================================
-- Tâches planifiées Dûment (à exécuter UNE FOIS dans l'éditeur SQL Supabase,
-- après le déploiement sur Vercel). Remplacez les deux valeurs entre < >.
-- Extensions requises : pg_cron et pg_net (Database > Extensions).
-- =============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Secrets stockés dans Supabase Vault (jamais en clair dans les tâches)
select vault.create_secret('<https://votre-app.vercel.app>', 'dument_app_url');
select vault.create_secret('<valeur de CRON_SECRET>', 'dument_cron_secret');

create or replace function public.dument_call_cron(path text)
returns void language plpgsql security definer set search_path = public as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'dument_app_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'dument_cron_secret');
begin
  perform net.http_get(
    url := base || path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 300000
  );
end $$;
revoke all on function public.dument_call_cron(text) from public, anon, authenticated;

-- Synchro QuickBooks chaque jour à 10 h UTC (6 h à Montréal l'été, 5 h l'hiver)
select cron.schedule('dument-sync', '0 10 * * *', $$ select public.dument_call_cron('/api/cron/sync') $$);

-- Planification puis envoi des relances chaque jour à 13 h UTC (9 h à Montréal l'été, 8 h l'hiver)
select cron.schedule('dument-remind', '0 13 * * *', $$ select public.dument_call_cron('/api/cron/remind') $$);
