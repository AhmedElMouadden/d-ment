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
| `STRIPE_*` | dashboard.stripe.com | abonnements (étape 6) |

## Base de données (Supabase)

1. Créez un projet Supabase en région **Canada (Central)**.
2. Dans SQL Editor, exécutez `supabase/migrations/20261003000001_init.sql`
   (ou `supabase db push` avec la CLI).
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
