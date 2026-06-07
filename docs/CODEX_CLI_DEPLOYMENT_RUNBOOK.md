# Codex CLI Deployment Runbook

Use this runbook when you want Codex CLI to help finish deployment from a terminal.

## 1) Local Windows terminal

Open PowerShell in the project:

```powershell
cd D:\KLTN1\FE\academic-trust-suite
codex
```

If `codex` fails with `Access is denied`, reinstall or repair the Codex CLI/app, then reopen PowerShell.

Recommended first prompt:

```text
You are helping me deploy this repo to production.
Read AGENTS.md/project instructions if present.
Do not reset the database, do not delete seeded data, and do not run destructive migrations.
Check frontend/backend build, Docker compose config, and deployment docs.
Use docs/CLOUD_DEPLOY_FOR_BEGINNERS.md as the deployment plan.
Tell me exactly what to run next.
```

Useful local checks:

```powershell
npm run build
cd backend
npm run build
cd ..
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --env-file ops/env.oracle.example config
```

## 2) Oracle VM terminal

SSH into Oracle:

```bash
ssh ubuntu@YOUR_ORACLE_PUBLIC_IP
```

Install Docker if needed, then clone the repo:

```bash
git clone <YOUR_REPO_URL>
cd academic-trust-suite
cp ops/env.oracle.example .env
nano .env
```

Run Codex CLI from the VM:

```bash
codex
```

Recommended Oracle prompt:

```text
I am on the Oracle VM inside the academic-trust-suite repo.
Help me deploy this app safely using Docker Compose.
Do not run prisma migrate reset, docker compose down -v, or any destructive command.
First inspect .env without printing secrets.
Then verify docker compose config.
Then start the production stack with:
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build
After that, check container status and logs for backend, ai-worker, db, redis, and ollama.
If Ollama is running, pull the configured model.
```

Production commands:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml config
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.deploy.yml ps
docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f backend
```

Pull Ollama model:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml exec ollama ollama pull gemma3:4b
```

## 3) Cloudflare Pages prompt

Use this prompt when preparing the frontend deploy:

```text
Help me deploy the frontend to Cloudflare Pages.
The frontend is Vite React.
Build command: npm run build.
Output directory: dist.
Environment variable:
VITE_API_BASE_URL=https://MY_BACKEND_DOMAIN_OR_IP/api
Check that this matches docs/CLOUD_DEPLOY_FOR_BEGINNERS.md.
```

## 4) Safety rules for Codex CLI

Never allow these commands on production unless you intentionally want to erase data:

```bash
prisma migrate reset
docker compose down -v
rm -rf
DROP DATABASE
```

Before any migration deploy, ask Codex CLI to create or verify a database backup.

Backup command:

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml exec db sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > backup.sql
```
