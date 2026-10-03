-- Test d'isolation RLS : deux organisations ne voient jamais les données l'une de l'autre.
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@exemple.ca', '{"company_name":"Agence A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"company_name":"Firm B","language":"en"}');

-- le déclencheur a créé org + profil + séquence (6 étapes) + essai 14 jours
do $$ begin
  assert (select count(*) from public.organizations) = 2, 'orgs';
  assert (select count(*) from public.sequence_steps) = 12, 'steps';
  assert (select count(*) from public.subscriptions where status = 'trialing') = 2, 'trials';
  assert (select default_language from public.organizations where name = 'Firm B') = 'en', 'lang';
end $$;

-- données côté serveur (service role) pour chaque org
insert into public.customers (organization_id, qbo_id, display_name, email)
select id, '1', name || ' client', 'c@x.ca' from public.organizations;
insert into public.invoices (organization_id, customer_id, qbo_id, issue_date, due_date, total_amount, balance)
select organization_id, id, '100', current_date - 40, current_date - 10, 1000, 1000 from public.customers;
insert into public.qbo_connections (organization_id, realm_id, access_token_encrypted, refresh_token_encrypted, access_token_expires_at)
select id, 'realm', 'SECRET-A', 'SECRET-R', now() from public.organizations;

-- ---- en tant qu'utilisateur A ----
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.organizations) = 1, 'A voit 1 org';
  assert (select count(*) from public.customers) = 1, 'A voit 1 client';
  assert (select count(*) from public.invoices) = 1, 'A voit 1 facture';
  assert (select count(*) from public.sequence_steps) = 6, 'A voit 6 étapes';
  assert (select count(*) from public.qbo_connections) = 1, 'A voit sa connexion';
end $$;

-- A ne peut pas lire les jetons
do $$ begin
  perform access_token_encrypted from public.qbo_connections;
  raise exception 'ÉCHEC : jeton lisible';
exception when insufficient_privilege then null;
end $$;

-- A ne peut pas modifier un client de B (0 ligne touchée)
do $$ declare n int; begin
  update public.customers set excluded = true where display_name like 'Firm B%';
  get diagnostics n = row_count;
  assert n = 0, 'A a modifié un client de B';
end $$;

-- A ne peut pas insérer une étape dans la séquence de B
reset role;
do $$ declare seq_b uuid; begin
  select s.id into seq_b from public.sequences s join public.organizations o on o.id = s.organization_id where o.name = 'Firm B';
  perform set_config('test.seq_b', seq_b::text, true);
end $$;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  insert into public.sequence_steps (organization_id, sequence_id, position, offset_days, tone)
  values (public.current_org_id(), current_setting('test.seq_b')::uuid, 10, 100, 'final');
  raise exception 'ÉCHEC : étape insérée dans la séquence de B';
exception when insufficient_privilege then null;  -- violation de politique RLS
end $$;

-- A ne peut pas écrire de facture ni de relance
do $$ begin
  update public.invoices set balance = 0;
  raise exception 'ÉCHEC : facture modifiable';
exception when insufficient_privilege then null;
end $$;

-- anon ne voit rien
reset role;
set local role anon;
do $$ begin
  perform 1 from public.customers;
  raise exception 'ÉCHEC : anon lit les clients';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Unicité : une étape ne peut pas être planifiée deux fois pour une facture
do $$ declare inv uuid; org uuid; cust uuid; st uuid; r1 uuid; begin
  select i.id, i.organization_id, i.customer_id into inv, org, cust from public.invoices i limit 1;
  select id into st from public.sequence_steps where organization_id = org and offset_days = 7;
  insert into public.reminders (organization_id, customer_id, scheduled_for, tone, language)
    values (org, cust, current_date, 'courteous', 'fr') returning id into r1;
  insert into public.reminder_items (organization_id, reminder_id, invoice_id, sequence_step_id, amount_due, days_overdue)
    values (org, r1, inv, st, 1000, 7);
  begin
    insert into public.reminder_items (organization_id, reminder_id, invoice_id, sequence_step_id, amount_due, days_overdue)
      values (org, r1, inv, st, 1000, 7);
    raise exception 'ÉCHEC : doublon accepté';
  exception when unique_violation then null;
  end;
end $$;

-- Suppression sur demande : tout disparaît en cascade
do $$ declare org uuid; begin
  select id into org from public.organizations where name = 'Agence A';
  perform public.delete_organization_data(org);
  assert (select count(*) from public.customers where organization_id = org) = 0, 'cascade';
  assert (select count(*) from public.qbo_connections where organization_id = org) = 0, 'cascade qbo';
end $$;

\echo 'RLS : tous les tests passent ✅'
rollback;
