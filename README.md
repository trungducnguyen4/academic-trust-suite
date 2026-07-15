# Academic Trust Suite

AI-supported academic assessment platform for graduation thesis and production-oriented MVP development.

## Overview

Academic Trust Suite is an assessment platform focused on lecturer-driven exam workflows, per-student randomized exam instances, integrity tracking, question versioning, and AI-assisted question generation with instructor review.

The repository contains:

- `src/`: Next.js App Router frontend
- `backend/`: NestJS + Prisma backend API
- `prisma/`: shared database schema, seed data, and migration files

## Core Features

- Per-student randomized exam generation
- Immutable exam snapshots after exam start
- Question versioning for historical auditability
- Integrity and anti-cheat tracking
- AI-assisted question generation with lecturer review
- Exam analytics and difficulty analysis
- Offline-capable exam support
- Seeded demo data for development and testing

## Tech Stack

### Frontend

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- TanStack Query
- React Hook Form
- Zod

### Backend

- NestJS
- Prisma
- MySQL
- Redis
- JWT authentication
- Swagger

### Supporting Tools

- Docker
- Nginx
- Chart.js / Recharts
- Sonner

## Project Structure

```text
.
|-- src/                  # Next.js frontend
|   |-- app/              # App Router routes and layouts
|   |-- components/       # Shared UI components
|   |-- contexts/         # React contexts
|   |-- features/         # Feature-based screens and domain UI
|   |-- hooks/            # Shared hooks
|   |-- lib/              # Utilities and API helpers
|   |-- types/            # Shared TypeScript types
|   `-- exam-engine/      # Exam rendering / grading logic
|-- backend/              # NestJS backend API
|-- prisma/               # Schema, migrations, seed scripts
`-- docs/                 # Supporting documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm
- MySQL
- Redis

### Install Frontend Dependencies

```bash
npm install
```

### Install Backend Dependencies

```bash
cd backend
npm install
```

## Run Locally

### Frontend

```bash
npm run dev
```

### Backend

```bash
cd backend
npm run start:dev
```

## Database

The Prisma schema, migrations, and seed scripts live in [`prisma/`](./prisma).

Common backend database commands:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
```

## Build

### Frontend

```bash
npm run build
```

### Backend

```bash
cd backend
npm run build
```

## Notes

- The frontend uses Next.js App Router with `src/app` as the canonical route tree.
- The older Vite / React Router setup has been removed.
- Seed data is preserved and should not be deleted when extending the project.
- The backend is designed to support auditability, analytics, and question versioning without resetting existing data.

## Documentation

- [`backend/API_DOCUMENTATION.md`](./backend/API_DOCUMENTATION.md)
- [`backend/EMAIL_SETUP.md`](./backend/EMAIL_SETUP.md)
- [`backend/docs/question-v2-implementation-assets.md`](./backend/docs/question-v2-implementation-assets.md)
