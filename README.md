# SmileCare Clinic

[![CI](https://github.com/HexovateSolutions/SmileCare-Apps/actions/workflows/ci.yml/badge.svg)](https://github.com/HexovateSolutions/SmileCare-Apps/actions/workflows/ci.yml)
![Status](https://img.shields.io/badge/status-work%20in%20progress-orange)
![Data](https://img.shields.io/badge/data-dummy%20only-lightgrey)
![Payments](https://img.shields.io/badge/Stripe-test%20mode-blueviolet)

A full-stack web app for a **single-dentist clinic**: public website, paid online booking, patient dashboard, owner dashboard, and an AI help assistant.

This is a **take-home / internship project**. All data is dummy, and payments run in Stripe **test mode**. No real patient data and no real money.

## Progress

_Last updated: 2026-11-04. Legend: ✅ implemented · 🟡 in progress · 🔲 planned_

| Area | Status | Notes |
|---|---|---|
| Documentation (SDLC, SRS, user stories, architecture, API, security, design, test plan) | ✅ | [`docs/`](docs/README.md) |
| Database schema, migrations, and demo seed | ✅ | PostgreSQL + Prisma; see `server/prisma/` |
| Client application | ✅ | Public clinic pages, booking flow, patient and owner dashboards |
| API and authentication | ✅ | Express API with patient/owner roles and cookie-based sessions |
| Appointments and payments | ✅ | Slot booking, Stripe Checkout test mode, webhook, and invoices |
| AI assistant | ✅ | Mock mode by default; optional provider configuration |
| Automated tests and CI | ✅ | Vitest, React Testing Library, Supertest, and GitHub Actions |
| Deployment | 🟡 | Deployment workflow is gated; see [CI/CD](#cicd) |

The full sprint plan is in [`docs/05-project-management/sprint-plan.md`](docs/05-project-management/sprint-plan.md).

---

## Features

- **Visitors:** clinic information, treatments and prices, FAQs, reviews, contact form, and AI assistant
- **Patients:** register and log in, find availability, book and pay in Stripe test mode, and view appointments, invoices, treatment records, and prescriptions
- **Owner (the dentist):** dashboard, appointment and patient management, treatment records, prescriptions, clinic settings, and AI settings

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod, Recharts |
| Backend | Node.js, Express 5, TypeScript, Zod, JWT in an httpOnly cookie |
| Database | PostgreSQL + Prisma 6 |
| Payments | Stripe Checkout (test mode) + webhook |
| AI | OpenAI with a mock mode for local development |
| Email / video | Nodemailer / Google Meet link |
| Testing | Vitest, React Testing Library, Supertest |
| CI/CD | GitHub Actions, Dependabot |

## Repository layout (monorepo)

```
.
├── client/                  # React + TypeScript app (Vite)
├── server/                  # Express + TypeScript API
│   ├── prisma/              # schema, migrations, seed
│   └── src/                 # Express API, routes, controllers, services, and middleware
├── docs/                    # Documentation, design, reference code, env templates
├── .github/
│   ├── workflows/ci.yml     # lint, build, test, migrations, secret checks
│   ├── workflows/deploy.yml # gated deploy (off by default)
│   ├── dependabot.yml
│   └── CODEOWNERS
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

The two apps are independent: each has its own `package.json` and lockfile.

---

## Local setup and development

**Prerequisites:** Node.js 22 with npm, and a PostgreSQL database (a free [Neon](https://neon.tech) project works). Run the API and client in separate terminals.

Clone the repository:

```bash
git clone https://github.com/HexovateSolutions/SmileCare-Apps.git
cd SmileCare-Apps
```

### 1. Configure and run the API

From the repository root, create the server environment file and install dependencies:

```powershell
cd server
npm ci
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `Copy-Item`. Edit `server/.env` and set `DATABASE_URL` to your PostgreSQL connection string and `SESSION_SECRET` to a random secret of at least 32 characters. Generate a secret with `openssl rand -base64 32` or another secure random generator.

The server example environment file also contains optional settings for Stripe test payments, AI, email, and clinic details. Configure those integrations only when needed. Never use live Stripe credentials for local development or commit secrets.

From `server/`, prepare the database and start the API:

```bash
npm run prisma:generate
npm run db:deploy
npm run db:seed
npm run dev
```

The API listens at `http://localhost:4000`. `db:deploy` applies the checked-in migrations; use `npm run migrate` when creating a new migration during development.

### 2. Configure and run the client

In a second terminal, from the repository root:

```powershell
cd client
npm ci
Copy-Item ..\docs\templates\client.env.example .env
npm run dev
```

On macOS/Linux, use `cp ../docs/templates/client.env.example .env`. The Vite development server starts at `http://localhost:5173` and proxies `/api` requests to the API on port 4000. The client environment file is ready for local development and must not contain server secrets.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Owner | `owner@smilecare.test` | `Owner@12345` |
| Patient | `patient@smilecare.test` | `Patient@12345` |

These accounts and all seeded records are for local demonstration only. Do not use real patient information. To test Checkout, configure Stripe test credentials and a webhook secret; the standard Stripe test card is `4242 4242 4242 4242` with any future expiry and CVC.

### Useful scripts

| Where | Command | Purpose |
|---|---|---|
| `client/` | `npm run dev` | Start Vite development server |
| `client/` | `npm run build` / `npm run lint` | Build and lint the client |
| `server/` | `npm run dev` | Start API with auto-restart |
| `server/` | `npm run db:deploy` | Apply existing database migrations |
| `server/` | `npm run migrate` | Create/apply a migration during development |
| `server/` | `npm run db:seed` | Load or update demo data |
| `server/` | `npm run typecheck` / `npm test` | Type check and run server tests |

---

## CI/CD

| Workflow | When it runs | What it does |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | Every push to `main`, every pull request | **client:** lint, build, tests · **server:** Prisma validate and generate, typecheck, tests · **database:** applies migrations and seeds a throwaway Postgres · **hygiene:** fails if a `.env` file or a live-looking key is committed · **CI passed:** one summary check |
| [`deploy.yml`](.github/workflows/deploy.yml) | After CI succeeds on `main` | Calls the hosting deploy hook, then checks `/api/health`. **Off** until `DEPLOY_ENABLED=true` |
| [`dependabot.yml`](.github/dependabot.yml) | Weekly | Opens PRs for npm and GitHub Actions updates |

Notes on transparency:
- The server typecheck step is currently informational (`continue-on-error`) in CI; running `npm run typecheck` locally still returns the actual typecheck result.
- Workflows use a **read-only token** and never expose secrets to pull requests from forks.

**Branch flow:** work on `feat/<name>` → pull request → `CI passed` must be green → merge to `main`.

---

## Documentation

Start with [`docs/README.md`](docs/README.md). Highlights:

- [Requirements and user stories](docs/01-sdlc/02-requirements-srs.md)
- [System architecture](docs/02-architecture/01-system-architecture.md) and [database ERD](docs/02-architecture/02-database-erd.md)
- [API specification](docs/02-architecture/03-api-spec.md)
- [Security design](docs/02-architecture/05-security.md)
- [Design system](docs/04-design/design-system.md)
- [Sprint plan](docs/05-project-management/sprint-plan.md) and [decisions log](docs/05-project-management/decisions-log.md)
- [GitHub setup and observer guide](docs/github-setup-observers.md)

## Security and privacy

- Dummy data only. Do not enter real personal or medical information.
- Stripe runs in **test mode** and the server refuses live Stripe keys.
- No secrets are stored in this repository. Only `*.example` environment files are committed.
- Passwords are hashed, sessions use httpOnly cookies, and the AI key is encrypted at rest (AES-256-GCM).
