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
