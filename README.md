# Dûment

Relance automatique des factures impayées pour les PME de services québécoises
sur QuickBooks Online. Dûment lit les factures et envoie des courriels, rien
d'autre.

Architecture et plan : [PLAN.md](PLAN.md).

## Démarrer en 1 minute (mode démo, aucun compte requis)

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000/demo : l'application s'ouvre avec des données
fictives. Aucun appel QuickBooks, aucun courriel réel.

## Tests

```bash
npm test          # tests unitaires (Vitest) : démo, chiffrement, QuickBooks, synchro
npm run test:db   # schéma + RLS sur un Postgres local jetable (voir plus bas)
npm run typecheck
```

`test:db` exige un Postgres 16 local accessible par `psql` (variable `PGURL`
optionnelle, par ex. `PGURL="-h localhost -U postgres"`). Le script crée une
base `saas_mvp_test`, applique `supabase/tests/supabase-shim.sql` (imitation
minimale de Supabase), la migration, puis `supabase/tests/*.test.sql`.

## Variables d'environnement

Copiez `.env.example` en `.env.local`.

| Variable | Où la trouver | Requise pour |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app | liens dans les courriels |
| `DEMO_MODE` | `false` pour masquer la démo publique | démo |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API | connexion |
| `SUPABASE_SERVICE_ROLE_KEY` | même page (clé secrète, serveur seulement) | synchro, cron |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` | jetons QuickBooks |
| `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET` | developer.intuit.com > votre app > Keys & credentials | QuickBooks |
| `QBO_ENVIRONMENT` | `sandbox` ou `production` | QuickBooks |
| `QBO_REDIRECT_URI` | `<APP_URL>/api/qbo/callback`, identique dans Intuit | QuickBooks |
| `CRON_SECRET` | `openssl rand -hex 32` | routes `/api/cron/*` |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `RESEND_WEBHOOK_SECRET` | resend.com | courriels (étape 4) |
| `STRIPE_SECRET_KEY` | Stripe > Developers > API keys (`sk_test_…` puis `sk_live_…`) | abonnements |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen` en local, ou Developers > Webhooks (`whsec_…`) | abonnements |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO` | Product catalog > prix mensuels 39 $ et 79 $ CA (`price_…`) | abonnements |

## Base de données (Supabase)

1. Créez un projet Supabase en région **Canada (Central)**.
2. Dans SQL Editor, exécutez **dans l'ordre** les fichiers de
   `supabase/migrations/` (`…0001_init.sql` puis `…0002_sending_status.sql`),
   ou `supabase db push` avec la CLI.
3. Authentication > URL Configuration : Site URL = votre `NEXT_PUBLIC_APP_URL`,
   et ajoutez `<APP_URL>/auth/callback` aux Redirect URLs.

## Étape 2 : tester QuickBooks (sandbox)

1. Créez un compte gratuit sur https://developer.intuit.com, puis une app
   « QuickBooks Online and Payments ». Une compagnie sandbox (avec clients et
   factures fictifs) est créée automatiquement.
2. Dans l'app Intuit > Development > Keys & credentials : copiez le Client ID
   et le Client Secret dans `.env.local`, et ajoutez la Redirect URI
   `http://localhost:3000/api/qbo/callback`.
3. `npm run dev`, créez un compte Dûment, allez dans **Réglages** et cliquez
   **Connecter QuickBooks**. Choisissez la compagnie sandbox.
4. Vous revenez sur Réglages avec « Connexion réussie » ; la première synchro
   tourne en arrière-plan. Vérifiez dans Supabase (Table Editor) que
   `customers` et `invoices` sont remplies et que `qbo_connections` ne
   contient que des jetons chiffrés (`v1.…`).
5. Dans la sandbox QuickBooks, enregistrez un paiement sur une facture, puis
   cliquez **Synchroniser maintenant** : la facture passe à `paid` avec sa
   date de paiement.
6. Cron : `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync`
   synchronise toutes les organisations connectées. Sans le bon secret : 401.

En production, `supabase/cron.sql` programme cette synchro chaque jour via
pg_cron (palier gratuit de Supabase).

## Étape 4 : tester les courriels

1. **Aperçu sans compte** : `/demo`, puis **Séquences**. Choisissez une étape,
   changez le ton, la langue ou le texte : l'aperçu se met à jour en direct.
2. **Envoi réel (test)** : créez un compte Resend gratuit, une clé API dans
   `RESEND_API_KEY`, et `EMAIL_FROM_ADDRESS=onboarding@resend.dev` (adresse de
   test de Resend : elle n'envoie qu'à l'adresse de votre compte Resend).
   Mettez cette adresse comme courriel d'un client sandbox QuickBooks, puis
   `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/remind`.
3. **Désinscription** : le lien en bas du courriel ouvre `/u/<jeton>` ; après
   confirmation, le client n'est plus jamais relancé.
4. **Webhook** : dans Resend > Webhooks, ajoutez `<APP_URL>/api/webhooks/resend`
   et copiez le secret dans `RESEND_WEBHOOK_SECRET`. Les livraisons, rebonds et
   plaintes apparaissent dans `email_events`.

Pour un domaine à vous (recommandé avant le lancement) : Resend > Domains,
ajoutez les enregistrements DNS SPF/DKIM indiqués, puis changez
`EMAIL_FROM_ADDRESS` (ex. `relances@dument.ca`).

## Étape 6 : tester l'abonnement Stripe (mode test)

1. Compte Stripe gratuit, en **mode test**. Product catalog : créez
   « Dûment Essentiel » (39 $ CAD/mois, récurrent) et « Dûment Croissance »
   (79 $ CAD/mois). Copiez les deux `price_…` dans `.env.local`.
2. Settings > Tax : activez Stripe Tax, adresse d'origine au Québec,
   inscription TPS/TVQ (en test, n'importe quel numéro). Mettez le
   comportement fiscal des prix à « exclusive » (taxes en sus).
3. Settings > Billing > Customer portal : activez l'annulation et le
   changement de forfait entre vos deux prix.
4. Webhook en local : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`,
   copiez le `whsec_…` affiché dans `STRIPE_WEBHOOK_SECRET`.
5. Créez un compte Dûment : **Facturation** affiche l'essai de 14 jours.
   Choisissez un forfait, payez avec `4242 4242 4242 4242` (date future, CVC
   quelconque). De retour dans l'app, le forfait est actif (table
   `subscriptions`). L'essai restant est conservé s'il reste plus de 2 jours.
6. **Gérer mon abonnement** ouvre le portail Stripe ; annulez : le statut
   passe à `canceled` et le cron n'envoie plus rien pour cette organisation.
7. Essai expiré : dans Supabase, mettez `trial_ends_at` à hier sur une
   organisation sans abonnement payé, lancez `/api/cron/remind` : aucune
   relance n'est créée.

## Étape 7 : confidentialité, export, suppression

- `/privacy` : modèle de politique (Loi 25). **Remplacez** `[Nom du
  responsable]` et `[courriel de contact]` par vos informations avant le
  lancement, et faites-la relire si possible.
- Réglages > Mes données > **Exporter** : télécharge un JSON de toutes les
  données de l'organisation (sans les jetons QuickBooks).
- Réglages > Mes données > **Supprimer mon compte** : tapez `SUPPRIMER`. Le
  jeton QuickBooks est révoqué chez Intuit, l'abonnement Stripe est annulé,
  puis toutes les lignes de l'organisation et l'utilisateur sont supprimés.
  Vérifiez dans Supabase que les tables ne contiennent plus rien de cette
  organisation.

## Déploiement en production, pas à pas

Comptez une heure. Faites tout d'abord en mode test, puis basculez les clés.

1. **GitHub** : poussez ce code dans votre dépôt privé.
2. **Supabase** (région Canada Central) : créez le projet, exécutez les
   migrations (section « Base de données »). Authentication > Providers >
   Email : laissez « Confirm email » activé. Plus tard, Authentication > SMTP
   permet d'envoyer les courriels de connexion via Resend (le SMTP intégré
   de Supabase est limité à quelques courriels par heure).
3. **Vercel** : New Project > importez le dépôt (framework détecté : Next.js).
   Ajoutez **toutes** les variables de `.env.example` (Settings > Environment
   Variables), avec `DEMO_MODE=false` si vous ne voulez pas de démo publique
   et `NEXT_PUBLIC_APP_URL=https://votre-domaine`. Déployez. Pour vendre,
   passez au forfait Pro (20 $ US/mois) : Hobby interdit l'usage commercial.
4. **Domaine** (facultatif mais recommandé) : Vercel > Domains. Puis mettez à
   jour `NEXT_PUBLIC_APP_URL`, la Site URL et les Redirect URLs de Supabase.
5. **Tâches planifiées** : Supabase > Database > Extensions, activez `pg_cron`
   et `pg_net`. Ouvrez `supabase/cron.sql`, remplacez l'URL et le
   `CRON_SECRET`, exécutez-le. Vérifiez dans Integrations > Cron que
   `dument-sync` et `dument-remind` existent. Test immédiat :
   `select public.dument_call_cron('/api/cron/sync');`
6. **Intuit (production)** : dans votre app Intuit, remplissez le profil et
   le questionnaire de conformité (obligatoire pour les clés de production),
   ajoutez la Redirect URI `https://votre-domaine/api/qbo/callback`, puis
   mettez les clés Production dans Vercel avec `QBO_ENVIRONMENT=production`.
7. **Resend** : Domains > ajoutez votre domaine et les enregistrements DNS
   SPF/DKIM (et un DMARC `p=none` pour commencer). Une fois vérifié :
   `EMAIL_FROM_ADDRESS=relances@votre-domaine`. Webhooks : ajoutez
   `https://votre-domaine/api/webhooks/resend` (événements delivered,
   opened, bounced, complained) et copiez le secret.
8. **Stripe (live)** : refaites les produits, Stripe Tax et le portail en
   mode live. Developers > Webhooks > Add endpoint :
   `https://votre-domaine/api/webhooks/stripe`, événements
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Mettez les clés live, les deux `price_…` live et le `whsec_…` dans Vercel.
9. **Redéployez** (Vercel > Deployments > Redeploy) pour charger les
   variables, puis faites un parcours complet : inscription, connexion
   QuickBooks, synchro, une relance vers votre propre adresse, abonnement.
10. **Avant le premier client** : complétez `/privacy`, désignez-vous
    responsable de la protection des renseignements personnels, et gardez
    `TOKEN_ENCRYPTION_KEY` en lieu sûr (la perdre oblige chaque client à
    reconnecter QuickBooks).
