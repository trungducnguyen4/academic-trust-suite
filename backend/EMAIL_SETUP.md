Setup email (SMTP) for Exam sharing

1) Install dependency for backend

From `backend/` run:

```bash
npm install
# or
pnpm install
# then
npm install nodemailer --save
```

2) Configure environment variables (create `backend/.env` or set in your environment)

Do NOT commit this file to source control. Example `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=examtrust7@gmail.com
SMTP_PASS=<YOUR_APP_PASSWORD>
EMAIL_FROM="ExamTrust <examtrust7@gmail.com>"
FRONTEND_URL=http://localhost:8080
```

- For Gmail, generate an App Password in your Google Account and put it into `SMTP_PASS`.
- `FRONTEND_URL` is used to create the link included in the email.

3) Start backend

```bash
cd backend
npm run start:dev
```

4) How the endpoint works

- POST `/api/exams/:id/share` with body `{ "emails": ["student@example.com"] }`
- This route requires authentication and `LECTURER` or `ADMIN` role.

Security notes

- Never commit real credentials to git. Use environment variables or a secret manager.
- Rotate app passwords periodically.

IP restrictions for exams (lab whitelist)

- You can restrict exam access to specific IP ranges (e.g., a lab network) by adding an `allowedIpCidrs` array to the exam `settings` JSON. Example payload for updating an exam (PATCH `/api/exams/:id` as a lecturer/admin):

```json
{
	"settings": {
		"allowedIpCidrs": ["203.0.113.0/24", "198.51.100.5/32"]
	}
}
```

- With the above, only clients whose IP falls inside one of the CIDR ranges will be allowed to join via exam link or start the exam. The backend checks the client's IP (from `X-Forwarded-For` when behind a proxy or `req.ip`).
- If your app is behind a reverse proxy (NGINX, load balancer), ensure the proxy forwards `X-Forwarded-For` and that the Nest app trusts the proxy (in `src/main.ts` `app.set('trust proxy', true)`).

- For safety, prefer CA-signed certs and do not rely on allowing self-signed certificates in production.
