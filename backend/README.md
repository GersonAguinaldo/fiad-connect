# Backend La PaDI — Node + Express + MongoDB

Backend local destine a remplacer Lovable Cloud (Supabase). Tourne en autonomie sur ta machine ou un VPS.

## Demarrage

```bash
cd backend
cp .env.example .env        # ajuste MONGODB_URI et JWT_SECRET
npm install                  # ou: bun install / pnpm install
npm run seed                 # cree un admin: admin@lapadi.local / ChangeMe!2026
npm run dev                  # API sur http://localhost:4000
```

Pre-requis: Node 20+, MongoDB 6+ (local ou Atlas).

## Endpoints principaux

| Methode | Route                       | Acces  |
|---------|-----------------------------|--------|
| POST    | /api/auth/register          | public |
| POST    | /api/auth/login             | public |
| GET     | /api/auth/me                | auth   |
| GET/PATCH | /api/profiles/me          | auth   |
| GET     | /api/profiles               | admin  |
| POST    | /api/profiles/import        | admin  |
| CRUD    | /api/events                 | mixte  |
| POST    | /api/events/:id/register    | auth   |
| CRUD    | /api/formations             | mixte  |
| POST    | /api/formations/:id/enroll  | auth   |
| GET     | /api/transactions/me        | auth   |
| GET/POST/PATCH | /api/transactions    | admin  |
| GET/PATCH | /api/settings             | mixte  |
| POST    | /api/uploads                | auth   |
| CRUD    | /api/event-resources        | mixte  |
| CRUD    | /api/live-sessions          | mixte  |
| POST    | /api/live-sessions/:id/register | auth |
| POST    | /api/live-sessions/:id/join | auth   |
| CRUD    | /api/formations/:id/modules | mixte  |
| POST    | /api/formations/:id/modules/:moduleId/complete | auth |
| GET     | /api/certificates/me        | auth   |
| GET     | /api/certificates/verify/:code | public |

Tous renvoient un JWT a placer dans `Authorization: Bearer <token>`.

## Modeles Mongoose

- `User` (auth + roles `admin`/`membre`)
- `Profile` (1-1 avec User)
- `Event` + `EventRegistration` + `EventResource`
- `Formation` + `FormationEnrollment`
- `FormationModule` + `FormationProgress`
- `LiveSession` + `LiveSessionAttendee`
- `Certificate` (PDF genere via pdfkit)
- `Transaction`
- `AppSettings` (singleton, frais ambassadeur)

## Migration des donnees existantes (Supabase -> Mongo)

1. Renseigne `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans `backend/.env`
   (recuperables dans l'ancien dashboard Supabase de Lovable Cloud).
2. Lance : `npm run migrate:from-supabase`

Le script copie users, profiles, roles, events + inscriptions, ressources,
formations + inscriptions, transactions et settings. Les mots de passe ne
sont pas exportables depuis `auth.users` ; les users importes ont un
placeholder et doivent passer par "Mot de passe oublie" a leur premiere
connexion.

## Securite incluse

- `helmet`, `cors`, `express-rate-limit` (200 req/min)
- mots de passe bcrypt (10 rounds)
- JWT signe (HS256) + middleware `requireAuth` / `requireRole`
- validation Zod sur les endpoints d'auth

## Prochaines etapes (cote frontend)

Voir `MIGRATION.md` a la racine du projet.
## Emails transactionnels (auto-heberges)

Aucun service tiers Lovable : les emails partent de ton propre SMTP via `nodemailer`.

1. Renseigne dans `backend/.env` : `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
   `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `APP_URL`.
2. `npm install` (ajoute `nodemailer`).
3. Verifie : `GET /api/emails/status` (admin) puis `POST /api/emails/test { "to": "..." }`.

Sans SMTP configure, l'application fonctionne normalement : les envois sont journalises
en statut `skipped` (aucune erreur bloquante).

| Evenement | Gabarit | Declencheur |
|-----------|---------|-------------|
| Inscription | Bienvenue | `POST /api/auth/register` |
| Paiement regle | Recu | creation/passage a `paid` d'une transaction |
| Changement de statut | Statut | `changeMemberStatus()` (manuel ou automatique) |
| Cotisation proche echeance | Relance | job quotidien `applyMembershipStatusRules()` |

Journal des envois : `GET /api/emails/logs` (admin) — collection `EmailLog`.
