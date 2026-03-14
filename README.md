# Prios: Reclaim Your Focus

Prios is a high-performance, focus-first productivity tool built with **Fastify**, **React**, and **SQLite**.

## The Problem

Typical todo apps become "infinite scrolls of guilt." Tasks pile up in lists, and eventually the noise makes it impossible to know what to actually work on *right now*. Productivity is lost to decision fatigue.

## The Solution

**Prios** (short for Priorities) is a minimalist, API-first productivity tool that forces a daily "yes/no" decision. It transforms a stagnant backlog into an active, single-task focus stream.

### The Core Loop

1. **Collect** — Add tasks to your boards in the "Maybe" column.
2. **Prioritise** — A Tinder-style swipe interface: left to defer, right to schedule.
3. **Execute** — One task in "Doing" at a time. No multi-tasking.
4. **Reward** — Track streaks and daily progress weighted by difficulty and priority.

## Key Features

- **Board-Specific Schedules** — Tasks auto-scheduled using Google Calendar availability.
- **Dependency Tracking** — Never start a task that's blocked by another.
- **PWA** — Install on mobile or desktop; auth works in standalone mode.
- **Eisenhower Assistance** — Built-in matrix to help rate difficulty and priority.
- **API-first** — Full REST API with Swagger docs at `/docs`.
- **Personal Access Tokens** — Named, revocable API tokens for scripts and LLM integrations.

---

## Local Development

### Prerequisites

- Node.js v22+ (use `nvm use 22`)

### Backend

```bash
cd server
npm install
cp .env.example .env   # edit as needed
npm run db:push        # create DB and apply schema
npm run db:seed        # seed with essential data
npm run dev            # starts on port 3000
```

### Frontend

```bash
cd client
npm install
npm run dev            # starts on port 5173, proxies /api → localhost:3000
```

Open `http://localhost:5173`. No auth is required in local dev (localhost bypass).

---

## Self-Hosting with Docker

### Quickstart (no auth)

Suitable for a private network, Tailscale, or testing.

```bash
docker compose up -d
```

Open `http://localhost:3000`. The app is open to anyone who can reach it on the network.

### With Authentication

Prios has built-in OAuth login. Enable it by setting three env vars:

```bash
AUTH_ENABLED=true
AUTH_SECRET=$(openssl rand -hex 32)
AUTH_ALLOWED_EMAIL=you@example.com   # restrict to your email
```

Then configure at least one OAuth provider (see below). Uncomment the relevant section in `docker-compose.yml`.

#### Google

1. Go to [Google Cloud Console → APIs & Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorised redirect URI: `https://prios.example.com/api/auth/google/callback`

```yaml
- AUTH_GOOGLE_CLIENT_ID=your-client-id
- AUTH_GOOGLE_CLIENT_SECRET=your-client-secret
- AUTH_GOOGLE_REDIRECT_URI=https://prios.example.com/api/auth/google/callback
```

#### GitHub

1. Go to [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Set callback URL: `https://prios.example.com/api/auth/github/callback`

```yaml
- AUTH_GITHUB_CLIENT_ID=your-client-id
- AUTH_GITHUB_CLIENT_SECRET=your-client-secret
- AUTH_GITHUB_REDIRECT_URI=https://prios.example.com/api/auth/github/callback
```

#### Generic OIDC (Authentik, Keycloak, Dex, etc.)

```yaml
- AUTH_OIDC_CLIENT_ID=prios
- AUTH_OIDC_CLIENT_SECRET=your-client-secret
- AUTH_OIDC_DISCOVERY_URL=https://auth.example.com/application/o/prios/.well-known/openid-configuration
- AUTH_OIDC_REDIRECT_URI=https://prios.example.com/api/auth/oidc/callback
- AUTH_OIDC_DISPLAY_NAME=Authentik
```

---

## Deployment Modes

### Behind Tailscale (recommended for personal use)

Run Prios on your Tailscale network. Only devices on your tailnet can reach it. You can leave auth disabled and rely on Tailscale ACLs, or enable it for belt-and-braces security.

```bash
# Minimal: Tailscale handles network access
AUTH_ENABLED=false   # or just omit it
```

### Behind oauth2-proxy

oauth2-proxy handles browser authentication; Prios handles API key authentication for programmatic access. Configure oauth2-proxy to skip auth for API requests that carry a Bearer token:

```
--skip-auth-route=^/api/
--upstream=http://prios:3000
```

Set `TRUSTED_PROXIES` to the oauth2-proxy IP so Prios trusts forwarded identity headers:

```yaml
- TRUSTED_PROXIES=10.0.0.2   # oauth2-proxy container IP
```

### Programmatic / API access

When `AUTH_ENABLED=true`, create a **Personal Access Token** in Settings → API Keys. Tokens use the `prios_` prefix and are named (e.g. "MCP server", "scripts").

```bash
curl -H "Authorization: Bearer prios_your-token-here" \
     https://prios.example.com/api/boards
```

The legacy `API_KEY` env var still works for backwards compatibility.

---

## Google Calendar (optional)

Calendar integration is separate from login. It uses its own OAuth application with calendar scopes.

1. Create a separate OAuth 2.0 client in Google Cloud Console (or reuse one with the additional scopes)
2. Add scopes: `openid`, `email`, `calendar`, `calendar.events`
3. Authorised redirect URI: `https://prios.example.com/api/auth/google-calendar/callback`

```yaml
- GOOGLE_CLIENT_ID=
- GOOGLE_CLIENT_SECRET=
- GOOGLE_REDIRECT_URI=https://prios.example.com/api/auth/google-calendar/callback
```

Connect Calendar from Settings → Integrations inside the app.

---

## Project Structure

```
/server     Fastify backend (API, auth, DB)
/client     Vite + React frontend
/planning   Design docs and phase plans
```

## Tech Stack

- **Backend**: Fastify 5, Drizzle ORM, Better-SQLite3 (or PostgreSQL)
- **Frontend**: Vite, React 19, Tailwind CSS v4, DaisyUI v5
- **Auth**: OAuth 2.0 / OIDC — Google, GitHub, generic OIDC

## Testing & Seeding

```bash
# Seed with test data (extra board, sample tasks, 7 days of stats):
cd server && npm run db:seed:test

# Client unit tests:
cd client && npm test

# API smoke test (server must be running):
./scripts/smoke-test.sh
```
