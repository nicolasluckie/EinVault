<a name="readme-top"></a>
<p align="center">
  <img src="docs/ein.svg" alt="Ein, the EinVault mascot" width="120" />
</p>

<h1 align="center">EinVault</h1>

<p align="center">A private, self-hosted companion health and care tracker built for homelabs. Track health records, daily activities, and care schedules for your animal companions. All data stays on your hardware. No cloud, no telemetry, no external accounts.</p>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.5-7348f4.svg)](https://github.com/nicolasluckie/EinVault/releases)
[![CI](https://github.com/nicolasluckie/EinVault/actions/workflows/ci.yml/badge.svg)](https://github.com/nicolasluckie/EinVault/actions/workflows/ci.yml)
[![Tests](https://raw.githubusercontent.com/nicolasluckie/EinVault/main/tests/badge.svg)](https://github.com/nicolasluckie/EinVault/actions/workflows/ci.yml)

</div>

---

## Features

- **Companion profiles** — breed, bio, vet info, emergency contacts, and avatar photo
- **Daily journal** — per-companion entries with mood tracking, photo and video uploads, and a configurable daily media limit (default 5)
- **Health tracking** — vet visits, vaccinations, medications, procedures, and weight history
- **Activity logging** — walks, meals, bathroom trips, treats, play sessions, and grooming
- **Reminders** — recurring and one-time reminders for medications, vaccinations, grooming, and more
- **Search** — full-text search across journals, health, activity, reminders, documents, and media, with `@companion`, `#type`, and date-range filters
- **Calendar feed** — subscribe to health events and reminders (with recurrence) from any calendar app or Home Assistant via a personal, revocable ICS URL
- **Single-admin access** — one admin user manages the app and tracks all companion data
- **Self-contained** — single Docker container, SQLite database, no external dependencies
- **Localization** — English, German, Spanish, French, Italian, and Portuguese (non-English translations are AI-generated and may contain errors)
- **Responsive UI** — works on desktop and mobile, with dark and light mode support

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit, Svelte, TypeScript, Tailwind CSS |
| Backend | Node.js, SvelteKit server |
| Database | SQLite, Drizzle ORM |
| Deployment | Docker |
| Testing | Vitest, Playwright |
| Linting | ESLint, Prettier |
| Changelog | git-cliff |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 26.6.4
- npm >= 11.17.0
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/yourorg/EinVault.git
   cd EinVault
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   2. Edit `.env` and set `ADMIN_USERNAME` and `ADMIN_PASSWORD`

4. Create data directory and apply database migrations:
   ```bash
   mkdir -p data
   npm run db:generate
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server at http://localhost:5173 |
| `npm run build` | Build for production |
| `npm run check` | SvelteKit type checking |
| `npm run lint` | ESLint + Prettier check |
| `npm run format` | Auto-format with Prettier |
| `npm run test:unit` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright, builds the app first) |
| `npm test` | Run both unit and e2e tests |
| `npm run db:generate` | Generate a migration file after schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Drizzle Studio (visual database browser) |

---

## Project Structure

```
EinVault/
├── src/
│   ├── components/        # Reusable UI components
│   ├── lib/              # Utilities, i18n, database schema, server helpers
│   ├── routes/           # SvelteKit file-based routing
│   └── app.html         # HTML template
├── static/               # Static assets
├── tests/
│   ├── e2e/              # Playwright end-to-end tests
│   ├── fakes/            # Fake implementations for external services
│   └── lib/              # Test utilities and fixtures
├── drizzle/              # Database migrations
├── docker-compose.prod.yml   # Production Docker Compose config
├── docker-compose.dev.yml    # Development Docker Compose config
├── cliff.toml               # git-cliff changelog configuration
├── AGENTS.md                # AI agent commit message rules
├── CHANGELOG.md             # Auto-generated changelog
└── README.md
```

---

## Docker

### Production Deployment

Requires Docker Engine 24+, Docker Compose v2, and a reverse proxy for TLS (Caddy, Nginx, Traefik, or similar).

Download [`docker-compose.prod.yml`](docker-compose.prod.yml) and set your domain before starting:

**`ORIGIN`** — your public domain:

```yaml
ORIGIN: https://einvault.yourdomain.com
```

Then:

```bash
mkdir -p ./data
docker compose -f docker-compose.prod.yml up -d
```

### Local Build

Builds the image locally instead of pulling from GHCR. Useful for testing Dockerfile changes or working on EinVault itself:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

All the same env vars work here. `ORIGIN` defaults to `http://localhost:3000` so no `.env` is needed for a basic smoke test.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ORIGIN` | Your public domain for production | `http://localhost:3000` |
| `TZ` | Container timezone | `UTC` |
| `UPLOAD_MAX_MB` | Maximum size in MB for image uploads | `10` |
| `VIDEO_MAX_MB` | Maximum size in MB for journal video uploads | `100` |
| `MAX_DAILY_MEDIA` | Maximum number of journal photos and videos per companion per day | `5` |
| `MAX_DOCUMENTS_PER_COMPANION` | Maximum number of documents stored per companion | `200` |
| `REMINDER_UNDO_SECONDS` | Default undo window (seconds) when dismissing a Reminder | `7` |
| `CALENDAR_FEED_HISTORY_DAYS` | Days of past events the calendar feed includes | `90` |
| `CALENDAR_FEED_ENABLED` | Set `false` to disable the calendar feed endpoint | `true` |
| `DEMO_MODE` | Enable read-only public demo mode | `false` |
| `DATABASE_URL` | Database path inside the container | `/data/einvault.db` |
| `ADMIN_USERNAME` | Admin username for login | — |
| `ADMIN_PASSWORD` | Admin password (plaintext, hashed automatically at startup) | — |

### Optional Integrations

**Video Transcoding:**
- `VIDEO_TRANSCODE` — Enable background transcoding of uploaded videos to web-playable MP4
- `VIDEO_KEEP_ORIGINAL` — Keep original source file alongside transcoded copy
- `VIDEO_TRANSCODE_MAX_MB` — Skip transcoding for inputs larger than this
- `VIDEO_TRANSCODE_MAX_SECONDS` — Skip transcoding for inputs longer than this
- `VIDEO_FFMPEG_PATH` — Absolute path to ffmpeg binary
- `VIDEO_FFPROBE_PATH` — Absolute path to ffprobe binary

**S3 Storage:**
- `STORAGE_BACKEND` — `local` or `s3`
- `S3_ENDPOINT` — Full endpoint URL
- `S3_BUCKET` — Bucket name
- `S3_REGION` — Region
- `S3_ACCESS_KEY_ID` — Access key
- `S3_SECRET_ACCESS_KEY` — Secret key
- `S3_FORCE_PATH_STYLE` — Set to `true` for Garage, MinIO
- `S3_PRESIGN_TTL_SECONDS` — Lifetime of presigned download URLs

**Immich:**
- `IMMICH_URL` — Base URL of your Immich server
- `IMMICH_API_KEY` — API key with asset.read, asset.view permissions
- `IMMICH_ALBUM_ID` — Optional album ID to limit picker

**Paperless-ngx:**
- `PAPERLESS_URL` — Base URL of your Paperless-ngx instance
- `PAPERLESS_API_TOKEN` — API token
- `PAPERLESS_TAG_ID` — Optional tag ID to limit picker

**SMTP Email:**
- `SMTP_HOST` — SMTP server hostname
- `SMTP_PORT` — SMTP port (default 587)
- `SMTP_SECURE` — `true` for implicit TLS (port 465)
- `SMTP_USER` — SMTP username
- `SMTP_PASS` — SMTP password
- `SMTP_FROM` — RFC 5322 From address

**ntfy Push Notifications:**
- `NTFY_URL` — ntfy server base URL
- `NTFY_TOKEN` — Bearer token for self-hosted ntfy servers
- `NOTIFY_SCAN_INTERVAL_MS` — Notification scheduler scan interval

**OIDC / SSO:**
- `OIDC_ISSUER_URL` — IdP base URL
- `OIDC_CLIENT_ID` — Client ID
- `OIDC_CLIENT_SECRET` — Client secret
- `OIDC_REDIRECT_URI` — Redirect URI registered with IdP
- `OIDC_SCOPES` — Space-separated scopes (default: openid profile email)
- `OIDC_PROVIDER_NAME` — Display label on login button
- `OIDC_ALLOW_SIGNUP` — Auto-create accounts for new users
- `OIDC_DEFAULT_ROLE` — Role for auto-created users
- `OIDC_ADMIN_GROUPS` — Comma-separated groups for admin role
- `OIDC_POST_LOGOUT_REDIRECT_URI` — RP-initiated logout redirect
- `OIDC_STATE_SECRET` — State secret for OIDC
- `OIDC_ALLOW_INSECURE_HTTP` — Allow plain-HTTP issuer URLs (testing only)

---

## Development

Install pre-commit hooks to enforce commit message conventions and code quality:

```bash
pip install pre-commit
pre-commit install
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). See [AGENTS.md](AGENTS.md) for the full specification (type, scope, and examples).

To prepare a release, run `scripts/version-bump.sh X.Y.Z` — it bumps `package.json`, generates `CHANGELOG.md`, commits both, and creates a tag. Push the tag to trigger the Docker image promotion. See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup details.

---

## Testing

Unit tests cover server helpers against a fresh in-memory database per test file. End-to-end tests build the app for production and drive a real browser against real server processes, each with its own throwaway SQLite database under `.test-data/`. Integrations run against local fakes (SMTP, OIDC, S3, Immich, Paperless, ntfy), so no external services are needed.

The e2e suite needs Chromium once:

```bash
npx playwright install chromium
sudo npx playwright install-deps chromium   # system libraries, Debian/Ubuntu
```

`PW_SKIP_BUILD=1 npm run test:e2e` reuses the existing `build/` output instead of rebuilding. The build goes stale silently, so rebuild after changing server code.

CI runs lint, type checks, unit tests, and the e2e suite (sharded four ways) on every PR.

---

## User Management

- Admin user is bootstrapped from environment variables on first run
- Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to provision the admin
- Manage users at `/admin/users`: create accounts, reset passwords, deactivate users
- No open registration

---

## Backup Strategy

```bash
# Backup database
cp data/einvault.db data/einvault.db.backup.$(date +%Y%m%d)

# Backup uploads (if using local storage)
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz data/uploads/
```

---

## License

[MIT](./LICENSE)

<p align="right">(<a href="#readme-top">back to top</a>)
