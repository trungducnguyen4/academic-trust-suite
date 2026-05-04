# Tech Stack - Academic Trust Suite

## 📋 Tổng Quan Kiến Trúc

**Academic Trust Suite** là một hệ thống quản lý kỳ thi trực tuyến toàn diện, sử dụng kiến trúc **Microservices** với Frontend và Backend tách biệt, hỗ trợ Docker containerization.

---

## 🎨 Frontend

### Framework & Runtime
- **React 18.x** - Thư viện UI component
- **TypeScript 5.1.3** - Static typing
- **Vite** - Build tool & dev server (port 8080)
  - Hot Module Replacement (HMR) enabled
  - SWC transpiler via `@vitejs/plugin-react-swc`

### UI Framework & Styling
- **Tailwind CSS 3.x** - Utility-first CSS framework
  - **PostCSS** - CSS processor
- **Shadcn/ui** - High-quality React components
- **Radix UI** - Unstyled, accessible component library (30+ components)
  - Alert Dialog, Dropdown Menu, Dialog, Tabs, Toast, Select, Slider, v.v.
- **Class Variance Authority (CVA)** - Component variant management

### Form Management & Validation
- **React Hook Form** - Form state management
- **@hookform/resolvers** - Form validation adapters
- **Zod** (implied) - Schema validation

### Data & State Management
- **TanStack React Query 5.83.0** - Server state management
  - Data fetching, caching, synchronization
- **Context API** - Local state management
  - `AuthContext` - Authentication
  - `NotificationsContext` - Real-time notifications
  - `NotificationPopupContext` - UI notifications

### Utilities & Libraries
- **Axios** (via custom `api.ts`) - HTTP client
- **bcrypt 6.0.0** - Password hashing
- **Chart.js 4.5.1** - Data visualization
- **date-fns** - Date manipulation
- **clsx** - Conditional className utility
- **React Router** (implied) - Client-side routing

### Package Manager
- **Bun** - Fast package manager & runtime (bun.lockb lock file)

---

## 🔌 Backend

### Framework & Runtime
- **NestJS 10.0.0** - Progressive Node.js framework
  - **Express** - Underlying web framework
  - **TypeScript 5.1.3** - Static typing
- **Node.js 20.3.1+** - JavaScript runtime

### API & Documentation
- **Swagger/OpenAPI** via `@nestjs/swagger` & `swagger-ui-express`
  - Auto-generated API documentation at `/api/docs`

### Database & ORM
- **Prisma 6.19.2** - Next-generation ORM
  - Supports MySQL migrations
  - Schema-driven development
  - Prisma Studio for data browsing
- **MySQL** - Relational database
  - Version: Compatible with MySQL 5.7+

### Authentication & Security
- **Passport.js** - Authentication middleware
  - **JWT (JSON Web Tokens)** - Token-based auth
    - `passport-jwt` - JWT strategy
    - `@nestjs/jwt` - NestJS JWT module
  - Token expiry: 15 minutes
- **bcrypt 5.1.1** - Password hashing & verification

### Caching & Real-time
- **Redis** - In-memory data store
  - `ioredis` - Redis client
  - `redis` - Official Redis client
  - `@liaoliaots/nestjs-redis` - NestJS Redis module
- **Bull 4.11.4** - Job queue library
  - `@nestjs/bull` - NestJS Bull module
  - Used for async task processing

### Email
- **Nodemailer 6.9.3** - Email sending
  - SMTP configuration (host, port, auth)
  - Environment-based configuration

### Validation & Transformation
- **class-validator 0.14.0** - DTO validation
- **class-transformer 0.5.1** - Object transformation

### AI/ML Integration
- **Google Generative AI (@google/generative-ai 0.24.1)** - AI capabilities
  - Used for question generation/analysis
  - Alternative provider: Ollama (local AI server)
- **Ollama** - Local LLM inference server
  - Accessible at `http://ollama:11434`
  - Alternative to cloud-based AI

### Additional Libraries
- **RxJS 7.8.1** - Reactive programming library
- **reflect-metadata 0.1.13** - Metadata reflection (required by Prisma)

### NestJS Core Modules
- `@nestjs/common` - Core decorators & pipes
- `@nestjs/config` - Environment configuration
- `@nestjs/core` - NestJS core
- `@nestjs/platform-express` - Express adapter
- `@nestjs/passport` - Passport integration
- `@nestjs/jwt` - JWT authentication

---

## 🗄️ Database

### Database System
- **MySQL 8.0+** (Docker service)
- **Prisma ORM 6.19.2** - Query builder & migrations

### Schema Management
- **Migration System**: Database migrations in `prisma/migrations/`
- **Enums** (Prisma):
  - `CourseTerm` - TERM_1, TERM_2, SUMMER
  - `ExamMode` - NORMAL, LAB
  - `QuestionLifecycleStatus` - DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED
  - `QuestionDraftStep` - Various stages

### Key Entities
- **Users** - Student, instructor, admin roles
- **Courses** - Course management with terms
- **Exams** - Exam configuration and metadata
- **Exam Links** - Student exam access
- **Questions** - Question bank with v2 lifecycle
- **Submissions** - Exam submissions and answers
- **Enrollments** - Course enrollment management
- **Notifications** - Real-time notifications

---

## 🐳 Infrastructure & DevOps

### Containerization
- **Docker** - Container platform
  - `backend/Dockerfile` - Backend container image
  - Node.js base image (likely)
- **Docker Compose** - Multi-container orchestration
  - 3 main services: nginx, backend, db

### Reverse Proxy & Load Balancing
- **Nginx 1.25-alpine**
  - Port 80 (HTTP)
  - Configuration: `ops/nginx.conf`
  - Routes traffic to backend services

### Environment Configuration
- **Environment Variables** (.env):
  - `NODE_ENV` - Production/development mode
  - `DATABASE_URL` - MySQL connection string
  - `JWT_SECRET` - JWT signing key
  - `JWT_EXPIRES_IN` - Token expiration
  - `SMTP_*` - Email configuration
  - `AI_PROVIDER` - AI service selection (ollama/google)
  - `AI_OLLAMA_URL` - Ollama server URL

---

## 🧪 Testing & Quality

### Testing Framework
- **Jest** - Testing framework (backend)
  - `@nestjs/testing` - NestJS test utilities
- **Vitest** - Unit testing (frontend)
  - `vitest.config.ts` configuration
  - `test` - Run tests once
  - `test:watch` - Watch mode

### Code Quality
- **ESLint** - Code linting
  - `eslint.config.js` - Shared configuration
  - Frontend: `npm run lint`
  - Backend: `npm run lint` with auto-fix
- **TypeScript Strict Mode** (selective)
  - `skipLibCheck: true`
  - `allowJs: true`
  - `noImplicitAny: false` (relaxed)

---

## 🔨 Build & Compilation

### Build Tools
- **Vite** (Frontend)
  - Dev server: `npm run dev`
  - Build: `npm run build`
  - Build (dev mode): `npm run build:dev`
  - Preview: `npm run preview`

- **NestJS CLI** (Backend)
  - Build: `npm run build`
  - Start: `npm run start`
  - Start (dev): `npm run start:dev`
  - Start (debug): `npm run start:debug`
  - Start (prod): `npm run start:prod`

### TypeScript Configuration
- **tsconfig.json** - Root configuration
  - Monorepo setup with references
- **tsconfig.app.json** - Frontend config
- **tsconfig.node.json** - Node.js config
- **backend/tsconfig.json** - Backend config

---

## 📦 Package Manager
- **Bun** - Modern, fast package manager
  - Lock file: `bun.lockb`
  - Used for both frontend and backend

---

## 🔄 Development Workflow

### Scripts Summary

#### Frontend
```bash
npm run dev              # Start dev server (port 8080)
npm run build           # Production build
npm run build:dev       # Development build
npm run lint            # Run ESLint
npm run test            # Run tests
npm run test:watch      # Watch mode tests
npm run preview         # Preview production build
```

#### Backend
```bash
npm run build                   # Compile TypeScript
npm run start                   # Run production build
npm run start:dev              # Start with hot reload
npm run start:debug            # Debug mode with hot reload
npm run start:prod             # Run compiled app
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Apply migrations
npm run prisma:migrate:dev     # Dev migrations
npm run prisma:studio          # Open Prisma Studio UI
npm run backfill:question-v2   # Data migration script
npm run seed                   # Seed database
npm run lint                   # Lint and fix code
npm run test                   # Run Jest tests
```

---

## 🏗️ Project Structure

### Frontend (`src/`)
```
src/
  components/     # React components (UI, layout, admin)
  contexts/       # Context API (Auth, Notifications)
  hooks/          # Custom React hooks
  lib/            # Utilities (API client, helpers)
  pages/          # Page components (routing)
  types/          # TypeScript interfaces
  test/           # Test files
```

### Backend (`backend/src/`)
```
backend/src/
  app.module.ts           # Main module
  main.ts                 # Entry point
  ai/                     # AI integration
  auth/                   # Authentication (JWT, Passport)
  cache/                  # Redis caching
  courses/                # Course management
  enrollments/            # Student enrollments
  events/                 # Event handling
  exams/                  # Exam management
  exam-links/             # Exam access links
  mailer/                 # Email sending
  notifications/          # Real-time notifications
  prisma/                 # Database client
  questions/              # Question management (v1)
  questions-v2/           # Question management (v2)
  queue/                  # Bull job queue
  redis/                  # Redis connection
  submissions/            # Exam submissions
  users/                  # User management
```

---

## 🌐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│                   (React + TypeScript)                       │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        Nginx Reverse Proxy                   │
│                      (Port 80/443)                           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   NestJS Backend API                         │
│               (Port 3001, TypeScript)                        │
│  • Authentication (JWT + Passport)                          │
│  • Business Logic (Controllers, Services)                   │
│  • Real-time Features (WebSockets)                          │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌─────────┐    ┌─────────┐   ┌──────────┐
        │  MySQL  │    │  Redis  │   │  Ollama  │
        │  (Data) │    │ (Cache) │   │  (AI)    │
        └─────────┘    └─────────┘   └──────────┘
```

---

## 🔐 Security Features

- **JWT-based Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt for password security
- **CORS** - Cross-origin request handling
- **Environment Secrets** - Sensitive data via environment variables
- **SQL Injection Prevention** - Prisma parameterized queries
- **XSS Protection** - React auto-escaping

---

## 📊 Performance Features

- **Caching Layer** - Redis for session & data caching
- **Job Queue** - Bull for async processing
- **Query Optimization** - Prisma's query optimization
- **Component Memoization** - React.memo, useMemo (potential)
- **Code Splitting** - Vite dynamic imports
- **Lazy Loading** - React Router lazy components

---

## 🚀 Deployment

### Docker Deployment
1. Build services with Docker Compose
2. Run: `docker-compose up`
3. Access via: `http://localhost:80`

### Production Environment
- Node.js 20.3.1+
- MySQL 8.0+
- Redis server
- Ollama (for local AI)
- Nginx reverse proxy

---

## 📝 Version Summary

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | Frontend framework |
| TypeScript | 5.1.3 | Static typing |
| NestJS | 10.0.0 | Backend framework |
| Prisma | 6.19.2 | Database ORM |
| MySQL | 8.0+ | Database |
| Redis | 5.x | Caching & sessions |
| Node.js | 20.3.1+ | Runtime |
| Docker | latest | Containerization |
| Nginx | 1.25-alpine | Reverse proxy |

---

## 🎯 Key Dependencies by Category

### Frontend Dependencies (100+)
- UI: React, Radix UI, Shadcn/ui, Chart.js
- Forms: React Hook Form, Zod
- State: React Query, Context API
- Styling: Tailwind CSS, PostCSS
- Utilities: date-fns, clsx, bcrypt

### Backend Dependencies (30+)
- Framework: NestJS, Passport, Express
- Database: Prisma, MySQL
- Caching: Redis, Bull
- Auth: JWT, bcrypt
- Email: Nodemailer
- AI: Google Generative AI
- Utilities: RxJS, class-validator

---

## 📚 Additional Resources

- API Documentation: `/api/docs` (Swagger)
- Prisma Studio: `npm run prisma:studio`
- Environment Setup: `.env` configuration
- Docker Compose: `docker-compose.yml`

---

**Last Updated:** May 4, 2026
**Project:** Academic Trust Suite - KLTN
