# Deployment

## Recommended public deployment

- Frontend: Vercel, Netlify, or Cloudflare Pages.
- API: Render, Railway, Fly.io, or a container host.
- Database: managed PostgreSQL.
- Repository: `https://github.com/neel-5/ClientPulse-CRM`.

## API environment

Set `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, and provider variables from
`.env.example`. Use a generated 32+ byte secret and never commit `.env`.

Start command:

```text
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Run it from the `backend` directory. For Render, set the root directory to `backend`.

## Frontend environment

Set `VITE_API_URL=https://your-api.example.com`, then:

```text
npm install
npm run build
```

Publish `frontend/dist`. Configure SPA fallback so all routes return `index.html`.

## Docker Compose

```powershell
docker compose up --build
```

This runs React via Nginx, FastAPI, and PostgreSQL. Change database credentials and
`SECRET_KEY` for any public host.

## Release checklist

- Use PostgreSQL and automated backups.
- Add Alembic migrations before changing schema on live data.
- Restrict CORS to the production frontend.
- Rotate default demo passwords.
- Configure HTTPS.
- Add error monitoring and uptime checks.
- Verify WhatsApp signatures and Google service account scope.
- Record real-user consent before storing production contact data.
