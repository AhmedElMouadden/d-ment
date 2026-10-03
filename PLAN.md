# Dûment : architecture et plan de construction

Outil de relance automatique des factures impayées pour les PME de services
québécoises sur QuickBooks Online. L'outil **lit** des factures et **envoie**
des courriels. Rien d'autre : aucun paiement, crédit, prêt ni lien bancaire.

---

## 1. Architecture

```
                ┌──────────────────────── Vercel ────────────────────────┐
 Navigateur ──▶ │ Next.js (App Router, TS, Tailwind)                     │
 (FR / EN)      │  • Pages : connexion, accueil guidé, tableau de bord,  │
                │    factures, clients, séquences, approbations,         │
                │    réglages, facturation, confidentialité              │
                │  • Server Actions + Route Handlers (/api/*)            │
                │  • Aucun secret côté navigateur                        │
                └──────┬───────────────┬───────────────┬────────────┬────┘
                       │               │               │            │
            Supabase (ca-central-1)   Intuit         Resend       Stripe
            • Postgres + RLS          QuickBooks     (courriels   (abonnements,
            • Auth (mdp + lien        Online API     + webhooks   Checkout +
              magique)                (OAuth 2.0,    d'événements) portail client)
            • pg_cron ──▶ appelle     lecture seule)
              /api/cron/* chaque jour
```

**Flux quotidien (cron, heure locale de l'entreprise, 9 h par défaut)**

1. `sync` : pour chaque organisation, rafraîchit le jeton QBO si besoin,
   récupère clients, factures et paiements modifiés, met à jour la base.
2. `plan` : le moteur calcule, pour chaque facture ouverte, l'étape due
   aujourd'hui ; regroupe par client ; crée les `reminders` (statut
   `scheduled`, ou `pending_approval` si l'étape est ≥ J+30 et l'option est
   activée).
3. `send` : pour chaque relance prête, **relit chaque facture dans QBO juste
   avant l'envoi** (arrêt garanti si elle vient d'être payée), rend le
   modèle dans la langue du client, envoie via Resend, journalise.

Les webhooks Resend (livré, rebond, plainte) alimentent `email_events`.
Le webhook Stripe met à jour `subscriptions`.

**Code organisé autour d'une interface** `AccountingProvider` : QuickBooks et
le mode démo l'implémentent tous les deux. Le moteur, la synchro et le tableau
de bord ne savent pas lequel est actif, ce qui rend la démo fidèle et le
moteur testable sans réseau.

## 2. Choix techniques (budget minimal)

| Besoin | Choix | Coût au démarrage | Pourquoi |
|---|---|---|---|
| Base + auth | Supabase, région **Canada (ca-central-1)** | 0 $ (palier gratuit) | Postgres, RLS, auth intégrée, données au Canada |
| Hébergement | Vercel | 0 $ en test ; **Pro 20 $ US/mois** dès qu'on facture (le palier Hobby interdit l'usage commercial) | Déploiement Next.js en un clic |
| Tâches planifiées | **pg_cron de Supabase** qui appelle nos routes `/api/cron/*` (secret partagé) | 0 $ | Évite la limite du cron Vercel Hobby ; Vercel Cron reste possible en Pro |
| Courriels | **Resend** (recommandé) | 0 $ jusqu'à 3 000/mois (100/jour) | API simple, webhooks, modèles React ; Postmark possible (meilleure délivrabilité réputée, 100 courriels/mois gratuits) |
| Abonnements | Stripe Checkout + portail client | 2,9 % + 0,30 $ par transaction | Essai 14 jours natif, gestion de la carte par Stripe |
| Chiffrement des jetons | AES-256-GCM dans le serveur, clé en variable d'environnement | 0 $ | Portable, testable ; la colonne n'est jamais lisible par le navigateur (privilèges par colonne) |

**Envoi « au nom de » l'entreprise cliente** : `From: Studio Bleu inc. <relances@notre-domaine.ca>`,
`Reply-To: comptes@studiobleu.ca`. Les réponses arrivent directement chez le
client. Envoyer depuis le domaine du client exigerait qu'il configure son DNS
(SPF/DKIM) : possible plus tard, hors MVP.

## 3. Modèle de données

Fichier : `supabase/migrations/20261003000001_init.sql` (**fait**).

| Table | Rôle |
|---|---|
| `organizations` | Entreprise cliente : nom d'expéditeur, reply-to, langue par défaut, fuseau, heure d'envoi, seuil d'approbation |
| `users` | Profil lié à `auth.users` (1 par org au MVP) |
| `qbo_connections` | Connexion OAuth (realm, jetons **chiffrés**, expiration, état, dernière synchro) |
| `customers` | Clients QBO + réglages de relance : langue, exclusion, pause, copie, désinscription, séquence |
| `invoices` | Factures QBO : échéance, total, solde, statut, date de paiement, lien de paiement |
| `sequences`, `sequence_steps` | Séquences modifiables : délai (jours / échéance), ton, textes FR/EN optionnels |
| `reminders` | Un courriel regroupé par client et par date : statut (planifié, en attente d'approbation, envoyé, annulé, échec) |
| `reminder_items` | Factures couvertes par un courriel + étape atteinte. **Index unique (facture, étape) = aucun doublon possible, même en cas de bogue ou de double exécution du cron** |
| `email_events` | Journal de tous les envois et événements (livré, ouvert, rebond, plainte, désinscription) |
| `subscriptions` | Abonnement Stripe : forfait, statut, fin d'essai |

À l'inscription, un déclencheur crée l'organisation, le profil, la séquence par
défaut (J-3, J+1, J+7, J+15, J+30, J+45) et l'essai de 14 jours.

**Sécurité dans la base**
- RLS sur toutes les tables : `organization_id = current_org_id()`.
- Le navigateur ne peut **rien écrire** de synchronisé (factures, relances,
  événements, abonnement) ; il ne modifie que ses réglages, ses séquences et
  les réglages de relance de ses clients.
- Les colonnes de jetons QBO ne sont pas lisibles par le rôle `authenticated`.
- `delete_organization_data()` supprime tout en cascade (Loi 25).

## 4. Moteur de relance (règles)

Pour une facture ouverte d'un client, à la date du jour `D` (fuseau de l'org) :
- jours de retard `r = D − échéance` ;
- étape due = la plus avancée des étapes actives dont `offset ≤ r` **et pas
  encore déclenchée** pour cette facture ; les étapes plus anciennes
  manquées (ex. facture importée déjà à J+20) ne sont pas rattrapées : on
  envoie seulement la plus récente, une fois ;
- aucune relance si : facture payée ou annulée, solde ≤ 0, client exclu, en
  pause, désinscrit, sans courriel, ou abonnement inactif ;
- regroupement : toutes les factures d'un client qui ont une étape due
  aujourd'hui partent dans **un seul courriel**, qui liste aussi ses autres
  factures en retard ; le ton est le plus sévère des étapes atteintes ;
- approbation : si une étape couverte a `offset ≥ seuil` (30 par défaut),
  la relance attend l'approbation ; elle est revalidée (payée ?) à l'envoi.

## 5. Plan en étapes (et comment tester chacune)

| # | Étape | Comment tester |
|---|---|---|
| 0 | **Socle** : projet Next.js, Tailwind, i18n FR/EN, mise en page, auth Supabase (mot de passe + lien magique) | `npm run dev`, créer un compte, recevoir le lien magique, basculer FR/EN |
| 1 | **Modèle de données + RLS** ✅ fait | `npm run test:db` : base Postgres jetable, applique la migration, vérifie l'isolation entre deux organisations, l'illisibilité des jetons, l'absence de doublons et la suppression en cascade |
| 1b | **Mode démo** ✅ fait (données + bouton « Essayer la démo ») | `npm test` : données déterministes, toutes les tranches d'âge, toutes les étapes, cas particuliers. Ensuite : bouton « Essayer avec des données fictives » à l'accueil |
| 2 | **Connexion QuickBooks (sandbox)** ✅ code fait, à tester avec votre compte Intuit : OAuth 2.0, jetons chiffrés, rafraîchissement auto, synchro quotidienne + bouton | Compte développeur Intuit gratuit + compagnie sandbox ; connecter, cliquer « Synchroniser », voir les factures ; tests unitaires du chiffrement et du mappage QBO → modèle |
| 3 | **Moteur de relance** ✅ fait (planification ; l'envoi arrive avec l'étape 4) | Tests Vitest à dates simulées : bonne étape au bon jour, arrêt au paiement, aucun doublon (deux exécutions le même jour), exclusions, pauses, désinscription, regroupement, approbation |
| 4 | **Modèles de courriels** ✅ fait FR (québécois) / EN × 3 tons, variables, aperçu en direct, lien de désinscription | Page d'aperçu ; tests de rendu des variables ; envoi réel vers votre propre adresse en mode test Resend |
| 5 | **Tableau de bord** ✅ fait (+ factures, clients, approbations, journal) : total à recevoir, balance âgée, délai moyen, encaissé après relance, prochaines relances, historique par facture | En mode démo : chiffres vérifiés contre des valeurs calculées à la main dans les tests |
| 6 | **Stripe** ✅ fait : essai 14 jours, 39 $ / 79 $ CA, Checkout, portail, webhook, blocage des envois si inactif | Mode test Stripe + `stripe listen` ; cartes de test 4242… ; passer l'essai à expiré et vérifier que les envois s'arrêtent |
| 7 | **Conformité et livraison** ✅ fait : confidentialité, export JSON/CSV, suppression du compte, README de déploiement pas à pas, `.env.example` | Exporter, supprimer, vérifier la base vide ; suivre le README sur un projet Supabase et Vercel neufs |

**Extras d'ergonomie prévus** (sans sortir du périmètre) : accueil guidé en
3 étapes, aperçu « voici ce qui partira demain », actions en un clic
(exclure, mettre en pause 30 jours, approuver tout), recherche et filtres sur
factures et clients, mode sombre, interface utilisable sur téléphone.

## 6. Conformité (Québec / Canada)

- **Loi 25** : politique de confidentialité, responsable de la protection des
  renseignements personnels (vous), export et suppression sur demande,
  hébergement au Canada (Supabase ca-central-1). Vercel exécute le code aux
  États-Unis par défaut : à mentionner dans la politique.
- **LCAP (anti-pourriel)** : un rappel de facture à un client existant est un
  message transactionnel ; le lien de désinscription demandé est ajouté quand
  même. Une désinscription arrête les relances pour ce client et vous avertit.
- Le dernier avis dit « avant mise en demeure » : l'outil n'envoie pas de mise
  en demeure lui-même et ne donne pas d'avis juridique.
