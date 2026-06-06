# Local + Deployment Parallel Workflow

This guide describes how to keep `main` usable for local development while testing deployment changes on a separate branch.

## Branch Model

- `main`: local development baseline
- `codex/deployment`: deployment-specific changes

Recommended flow:

1. Keep feature work and local debugging on `main`.
2. Merge deployment-specific config and runtime changes into `codex/deployment`.
3. Test deployment there without disrupting the local workflow.
4. Merge back only when the production path is stable.

## Environment Files

Frontend:

- Copy [`.env.local.example`](/D:/KLTN1/FE/academic-trust-suite/.env.local.example) to `.env.local`
- Copy [`.env.production.example`](/D:/KLTN1/FE/academic-trust-suite/.env.production.example) to `.env.production`

Backend:

- Copy [`backend/.env.example`](/D:/KLTN1/FE/academic-trust-suite/backend/.env.example) to `backend/.env` for local development
- Copy [`backend/.env.production.example`](/D:/KLTN1/FE/academic-trust-suite/backend/.env.production.example) to `backend/.env` on the deployment host, then replace placeholder values

Important environment keys:

- `VITE_API_BASE_URL` for the frontend API endpoint
- `FRONTEND_URL` for exam links and email links
- `APP_BASE_URL` as a fallback public frontend URL
- `CORS_ORIGINS` for production-safe CORS allowlist
- `AI_PROVIDER`, `AI_OLLAMA_URL`, and `AI_OLLAMA_MODEL` for AI runtime selection

## Local Development

Use the default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001/api`
- Redis: `localhost:6379`

Typical flow:

```bash
cp .env.local.example .env.local
cp backend/.env.example backend/.env

cd backend
npm install
npm run build

cd ..
npm install
npm run build
```

Run the app locally using the existing dev commands:

```bash
cd backend
npm run start:dev
```

```bash
npm run dev
```

## Deployment Workflow

Deployment stack:

- Frontend on Cloudflare Pages
- Backend on Oracle Always Free
- AI worker separate from API
- Redis private to the backend network
- Ollama private on the same host/network

Use the deploy override compose file:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build
```

Production host values should point to real public URLs, for example:

- `VITE_API_BASE_URL=https://api.example.com/api`
- `FRONTEND_URL=https://app.example.com`
- `APP_BASE_URL=https://app.example.com`
- `CORS_ORIGINS=https://app.example.com`

## AI Load Control

The AI runtime is intentionally isolated from the main API path:

- AI jobs are queued through Bull/Redis
- `ai-worker` processes jobs separately from the API
- AI generation is processed sequentially with `concurrency: 1`
- Ollama remains private and should not be exposed publicly

This keeps exam submission and autosave responsive even when AI generation is slow.

## Testing Both Environments

Test locally:

- login
- create or open an exam
- start submission
- autosave answers
- submit exam
- generate AI question drafts

Test deployment:

- frontend loads from the public domain
- API calls go to the production API host
- CORS allows only the frontend origin you configured
- AI jobs stay in queue if the model is busy
- exam links in email and share flows point to the public frontend URL

## Troubleshooting

- If the browser still calls `localhost`, check `VITE_API_BASE_URL` and rebuild the frontend.
- If exam links point to the wrong site, check `FRONTEND_URL` and `APP_BASE_URL`.
- If production requests are blocked, check `CORS_ORIGINS`.
- If AI jobs stack up, keep `ai-worker` single-concurrency and verify Ollama is reachable on the private network.

