# Athena

Next.js owns the full auth stack in this app: Drizzle migrations, the Postgres schema, Better Auth sessions, and user management all live in the web project.

## Local Setup

```powershell
bun install
Copy-Item .env.example .env
docker compose up -d db
bun run db:migrate
bun run seed:admin
bun run dev
```

Open `http://localhost:3000/login`.

Seeded admin:

```text
email: admin@gmail.com
password: admin@#12
```

## Auth Features

- Email/password sign in and sign up
- Email OTP sign in
- Passkey sign in and passkey enrollment from settings
- TOTP setup and email OTP second-factor flow
- Multiple device sessions with session revoke controls
- Password change and password reset
- Three simple roles: `admin`, `writer`, `user`
- Admin-only user management at `/users`

Development auth emails are logged to the Next.js server console unless `RESEND_API_KEY` is configured.

## Commands

```powershell
bun run typecheck
bun run lint
bun run build
bun run db:generate
bun run db:migrate
bun run seed:admin
```
