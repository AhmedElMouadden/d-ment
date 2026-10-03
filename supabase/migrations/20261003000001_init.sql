-- =============================================================================
-- Dûment : schéma initial
-- Relance automatique des factures impayées (QuickBooks Online -> courriels)
--
-- Principes :
--   * Chaque ligne métier porte organization_id ; la RLS limite tout accès
--     à l'organisation de l'utilisateur connecté (public.current_org_id()).
--   * Les jetons QuickBooks (chiffrés côté serveur, AES-256-GCM) ne sont
--     jamais lisibles par le rôle `authenticated` : privilèges par colonne.
--   * Les écritures sensibles (synchro, envois, Stripe) passent par le rôle
--     service_role côté serveur, qui contourne la RLS.
--   * Unicité (invoice_id, sequence_step_id) dans reminder_items :
--     une étape ne peut jamais être envoyée deux fois pour la même facture.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_language   as enum ('fr', 'en');
create type public.reminder_tone  as enum ('courteous', 'firm', 'final');
create type public.reminder_status as enum (
  'scheduled',         -- planifié
  'pending_approval',  -- en attente d'approbation
  'sent',              -- envoyé
  'cancelled',         -- annulé (payé, exclu, en pause, désinscrit, refusé)
  'failed'             -- échec du fournisseur de courriel
);
create type public.invoice_status as enum ('open', 'paid', 'voided');
create type public.qbo_connection_status as enum ('active', 'expired', 'revoked', 'error');
create type public.email_event_type as enum (
  'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'failed'
);
create type public.subscription_plan   as enum ('starter', 'pro');
create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
);

-- ---------------------------------------------------------------------------
-- Utilitaire updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- organizations : l'entreprise cliente (1 utilisateur par org au MVP)
-- ---------------------------------------------------------------------------
create table public.organizations (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null default '',
  sender_name                 text,                     -- « Studio Bleu inc. »
  reply_to_email              text,                     -- réponses des clients
  default_language            public.app_language not null default 'fr',
  timezone                    text not null default 'America/Toronto',
  send_hour_local             smallint not null default 9 check (send_hour_local between 0 and 23),
  -- « approuver avant envoi » : étapes dont le délai >= ce seuil (null = désactivé)
  approval_required_from_day  integer default 30,
  is_demo                     boolean not null default false,
  onboarding_completed_at     timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create trigger trg_organizations_updated before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- users : profil applicatif lié à auth.users
-- ---------------------------------------------------------------------------
create table public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  email            text not null,
  full_name        text,
  language         public.app_language not null default 'fr',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.users (organization_id);
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();

-- Organisation de l'utilisateur courant (security definer : évite la récursion RLS)
create or replace function public.current_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select organization_id from public.users where id = auth.uid()
$$;
revoke all on function public.current_org_id() from public;
grant execute on function public.current_org_id() to authenticated;

-- ---------------------------------------------------------------------------
-- qbo_connections : connexion OAuth QuickBooks (1 par org)
-- ---------------------------------------------------------------------------
create table public.qbo_connections (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null unique references public.organizations(id) on delete cascade,
  realm_id                  text not null,              -- identifiant de la compagnie QBO
  company_name              text,
  environment               text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  -- SECRETS : chiffrés par l'application (AES-256-GCM, clé TOKEN_ENCRYPTION_KEY)
  access_token_encrypted    text not null,
  refresh_token_encrypted   text not null,
  access_token_expires_at   timestamptz not null,
  refresh_token_expires_at  timestamptz,
  status                    public.qbo_connection_status not null default 'active',
  last_sync_at              timestamptz,
  last_sync_error           text,
  connected_at              timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger trg_qbo_connections_updated before update on public.qbo_connections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- customers : clients de l'entreprise (synchronisés depuis QBO)
-- ---------------------------------------------------------------------------
create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  qbo_id             text not null,
  display_name       text not null,
  company_name       text,
  contact_name       text,
  email              text,
  cc_email           text,                                -- contact en copie
  language           public.app_language,                 -- null = langue par défaut de l'org
  excluded           boolean not null default false,      -- jamais relancé
  paused_until       date,                                -- en pause jusqu'à (inclus)
  paused_indefinitely boolean not null default false,
  unsubscribed_at    timestamptz,                         -- le destinataire s'est désinscrit
  unsubscribe_token  uuid not null default gen_random_uuid() unique,
  notes              text,
  active_in_qbo      boolean not null default true,
  last_synced_at     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (organization_id, qbo_id)
);
create index on public.customers (organization_id);
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sequences / sequence_steps : séquences de relance
-- ---------------------------------------------------------------------------
create table public.sequences (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  is_default       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.sequences (organization_id);
-- une seule séquence par défaut par org
create unique index sequences_one_default_per_org
  on public.sequences (organization_id) where is_default;
create trigger trg_sequences_updated before update on public.sequences
  for each row execute function public.set_updated_at();

-- Séquence assignée à un client (null = séquence par défaut)
alter table public.customers
  add column sequence_id uuid references public.sequences(id) on delete set null;

create table public.sequence_steps (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  sequence_id      uuid not null references public.sequences(id) on delete cascade,
  position         smallint not null,
  -- jours par rapport à l'échéance : -3 = 3 jours avant, 30 = 30 jours après
  offset_days      integer not null check (offset_days between -60 and 365),
  tone             public.reminder_tone not null,
  -- textes personnalisés ; null = modèle par défaut du ton et de la langue
  subject_fr       text,
  body_fr          text,
  subject_en       text,
  body_en          text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (sequence_id, position),
  unique (sequence_id, offset_days)
);
create index on public.sequence_steps (organization_id);
create trigger trg_sequence_steps_updated before update on public.sequence_steps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- invoices : factures (synchronisées depuis QBO)
-- ---------------------------------------------------------------------------
create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  customer_id      uuid not null references public.customers(id) on delete cascade,
  qbo_id           text not null,
  doc_number       text,
  issue_date       date not null,
  due_date         date not null,
  total_amount     numeric(14,2) not null,
  balance          numeric(14,2) not null,
  currency         text not null default 'CAD',
  status           public.invoice_status not null default 'open',
  paid_at          timestamptz,                  -- date de paiement constatée (paiement QBO)
  invoice_link     text,                         -- lien de paiement QBO s'il existe
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, qbo_id)
);
create index on public.invoices (organization_id, status, due_date);
create index on public.invoices (customer_id);
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reminders : un courriel (regroupé) pour un client à une date
-- reminder_items : les factures couvertes et l'étape atteinte pour chacune
-- ---------------------------------------------------------------------------
create table public.reminders (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  customer_id        uuid not null references public.customers(id) on delete cascade,
  scheduled_for      date not null,
  tone               public.reminder_tone not null,      -- ton le plus sévère des étapes couvertes
  language           public.app_language not null,
  status             public.reminder_status not null default 'scheduled',
  to_email           text,
  cc_email           text,
  subject            text,
  body_text          text,
  body_html          text,
  provider_message_id text,
  cancel_reason      text,          -- paid | excluded | paused | unsubscribed | rejected | no_email
  approved_at        timestamptz,
  approved_by        uuid references public.users(id) on delete set null,
  sent_at            timestamptz,
  error              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.reminders (organization_id, status, scheduled_for);
create index on public.reminders (customer_id);
create trigger trg_reminders_updated before update on public.reminders
  for each row execute function public.set_updated_at();

create table public.reminder_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  reminder_id       uuid not null references public.reminders(id) on delete cascade,
  invoice_id        uuid not null references public.invoices(id) on delete cascade,
  sequence_step_id  uuid references public.sequence_steps(id) on delete set null,
  -- instantané au moment de la planification (pour l'historique)
  step_offset_days  integer,
  amount_due        numeric(14,2) not null,
  days_overdue      integer not null,
  created_at        timestamptz not null default now()
);
create index on public.reminder_items (organization_id);
create index on public.reminder_items (reminder_id);
create index on public.reminder_items (invoice_id);
-- AUCUN DOUBLON : une étape donnée n'est déclenchée qu'une fois par facture
create unique index reminder_items_once_per_step
  on public.reminder_items (invoice_id, sequence_step_id)
  where sequence_step_id is not null;

-- ---------------------------------------------------------------------------
-- email_events : journal de tous les envois et événements (webhooks)
-- ---------------------------------------------------------------------------
create table public.email_events (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  reminder_id         uuid references public.reminders(id) on delete set null,
  customer_id         uuid references public.customers(id) on delete set null,
  type                public.email_event_type not null,
  provider            text not null default 'resend',
  provider_message_id text,
  recipient           text,
  payload             jsonb,
  occurred_at         timestamptz not null default now()
);
create index on public.email_events (organization_id, occurred_at desc);
create index on public.email_events (reminder_id);
create index on public.email_events (provider_message_id);

-- ---------------------------------------------------------------------------
-- subscriptions : abonnement Stripe (1 par org)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  plan                    public.subscription_plan not null default 'starter',
  status                  public.subscription_status not null default 'trialing',
  trial_ends_at           timestamptz not null default (now() + interval '14 days'),
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================
alter table public.organizations   enable row level security;
alter table public.users           enable row level security;
alter table public.qbo_connections enable row level security;
alter table public.customers       enable row level security;
alter table public.sequences       enable row level security;
alter table public.sequence_steps  enable row level security;
alter table public.invoices        enable row level security;
alter table public.reminders       enable row level security;
alter table public.reminder_items  enable row level security;
alter table public.email_events    enable row level security;
alter table public.subscriptions   enable row level security;

-- Rien pour anon. Les accès authenticated sont explicitement listés ci-dessous.
revoke all on all tables in schema public from anon, authenticated;

-- organizations : lecture + mise à jour des réglages de sa propre org
grant select, update (name, sender_name, reply_to_email, default_language, timezone,
                      send_hour_local, approval_required_from_day, onboarding_completed_at)
  on public.organizations to authenticated;
create policy org_select on public.organizations for select to authenticated
  using (id = public.current_org_id());
create policy org_update on public.organizations for update to authenticated
  using (id = public.current_org_id()) with check (id = public.current_org_id());

-- users : son propre profil
grant select, update (full_name, language) on public.users to authenticated;
create policy users_select on public.users for select to authenticated
  using (id = auth.uid());
create policy users_update on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- qbo_connections : lecture des métadonnées SEULEMENT (jamais les jetons)
grant select (id, organization_id, realm_id, company_name, environment, status,
              last_sync_at, last_sync_error, connected_at)
  on public.qbo_connections to authenticated;
create policy qbo_select on public.qbo_connections for select to authenticated
  using (organization_id = public.current_org_id());

-- customers : lecture + réglages de relance (pas les champs synchronisés)
grant select on public.customers to authenticated;
grant update (language, excluded, paused_until, paused_indefinitely, cc_email, notes, sequence_id)
  on public.customers to authenticated;
create policy customers_select on public.customers for select to authenticated
  using (organization_id = public.current_org_id());
create policy customers_update on public.customers for update to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- sequences / steps : gestion complète dans son org
grant select, insert, update, delete on public.sequences, public.sequence_steps to authenticated;
create policy sequences_all on public.sequences for all to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
create policy steps_all on public.sequence_steps for all to authenticated
  using (organization_id = public.current_org_id())
  with check (
    organization_id = public.current_org_id()
    and exists (select 1 from public.sequences s
                where s.id = sequence_id and s.organization_id = public.current_org_id())
  );

-- invoices / reminder_items / email_events / subscriptions : lecture seule
grant select on public.invoices, public.reminder_items, public.email_events, public.subscriptions
  to authenticated;
create policy invoices_select on public.invoices for select to authenticated
  using (organization_id = public.current_org_id());
create policy items_select on public.reminder_items for select to authenticated
  using (organization_id = public.current_org_id());
create policy events_select on public.email_events for select to authenticated
  using (organization_id = public.current_org_id());
create policy subs_select on public.subscriptions for select to authenticated
  using (organization_id = public.current_org_id());

-- reminders : lecture ; approbation/refus passent par une action serveur
grant select on public.reminders to authenticated;
create policy reminders_select on public.reminders for select to authenticated
  using (organization_id = public.current_org_id());

-- =============================================================================
-- Création automatique : org + profil + séquence par défaut + essai 14 jours
-- =============================================================================
create or replace function public.create_default_sequence(p_org uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_seq uuid;
begin
  insert into public.sequences (organization_id, name, is_default)
  values (p_org, 'Séquence standard', true)
  returning id into v_seq;

  insert into public.sequence_steps (organization_id, sequence_id, position, offset_days, tone)
  values
    (p_org, v_seq, 1,  -3, 'courteous'),  -- rappel courtois avant échéance
    (p_org, v_seq, 2,   1, 'courteous'),
    (p_org, v_seq, 3,   7, 'courteous'),
    (p_org, v_seq, 4,  15, 'firm'),
    (p_org, v_seq, 5,  30, 'firm'),
    (p_org, v_seq, 6,  45, 'final');      -- dernier avis avant mise en demeure
  return v_seq;
end $$;
revoke all on function public.create_default_sequence(uuid) from public, anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org  uuid;
  v_lang public.app_language;
begin
  v_lang := case when coalesce(new.raw_user_meta_data->>'language', 'fr') = 'en'
                 then 'en'::public.app_language else 'fr'::public.app_language end;

  insert into public.organizations (name, reply_to_email, default_language)
  values (coalesce(new.raw_user_meta_data->>'company_name', ''), new.email, v_lang)
  returning id into v_org;

  insert into public.users (id, organization_id, email, full_name, language)
  values (new.id, v_org, new.email, new.raw_user_meta_data->>'full_name', v_lang);

  perform public.create_default_sequence(v_org);

  insert into public.subscriptions (organization_id) values (v_org);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =============================================================================
-- Suppression des données sur demande (Loi 25) : supprime l'org entière.
-- Appelée par une action serveur après confirmation ; le compte auth est
-- supprimé ensuite via l'API admin Supabase.
-- =============================================================================
create or replace function public.delete_organization_data(p_org uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.organizations where id = p_org;
$$;
revoke all on function public.delete_organization_data(uuid) from public, anon, authenticated;
