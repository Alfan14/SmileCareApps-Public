# Changelog

All notable progress is listed here, newest first. Format loosely follows [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Added
- Complete project documentation in `docs/` (SDLC, SRS, user stories, architecture, ERD, API spec, security, design system, sprint plan, decisions log).
- Prisma schema and initial migration (`20261018051322_init`) for PostgreSQL.
- Seed script with dummy clinic data (owner, patient, treatments, working hours, FAQs, reviews).
- Client scaffold: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod.
- Server dependencies and starter modules (env validation, error handling, auth middleware, slot logic, booking and Stripe webhook services, encryption helper).
- GitHub Actions CI, optional deploy workflow, Dependabot.

### Next
- Server folder skeleton (`config/`, `routes/`, `controllers/`, `middleware/`) and `/api/health`.
- Public pages and authentication.

<!-- When a sprint finishes: add a "## [sprint-N] - YYYY-MM-DD" section here and create a GitHub Release with the same tag. -->
