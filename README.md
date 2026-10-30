# Snippy

Snippy is an open-source [CodePen](https://codepen.io/)-style app for writing, previewing, and sharing HTML, CSS, and JavaScript snippets.

- **Version:** 0.5.2
- **Repository:** [github.com/slurrps-mcgee/Snippy](https://github.com/slurrps-mcgee/Snippy)
- **License:** [MIT](https://github.com/slurrps-mcgee/Snippy/blob/main/LICENSE)
- **Docker Hub images:** `slurrps/snippy-frontend`, `slurrps/snippy-pocketbase` (tags `0.5.2` and `latest`)

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Allowed origins (CORS)](#allowed-origins-cors)
- [OAuth (GitHub and Google)](#oauth-github-and-google)
- [Password reset without SMTP](#password-reset-without-smtp)
- [Local development](#local-development)
- [Production deployment](#production-deployment)
- [Backup](#backup)
- [Project layout](#project-layout)
- [Documentation](#documentation)
- [License and legal](#license-and-legal)

---

## Overview

Two containers. The Angular SPA talks to PocketBase through a same-origin proxy (`/api/`):

| Service | Role | Source |
|---|---|---|
| `pocketbase` | Auth, SQLite, files, API rules, hooks | `snippy/pocketbase` |
| `frontend` | Angular SPA (nginx in production, `ng serve` in dev) | `snippy/frontend` |

`pb_data` is the backup unit (SQLite plus uploaded files) and lives on the PocketBase container. The frontend container is stateless: run more than one if you need to. PocketBase is not. SQLite allows one writer, so do not run a second PocketBase process on the same `pb_data` volume. To grow, give that one container more CPU, RAM, and disk. Moving PocketBase and `pb_data` onto their own host later does not change the SPA, because the browser only calls `/api/`.

Frontend never receives admin, SMTP, or OAuth client secrets.

| | Local development | Production |
|---|---|---|
| Compose file | [`docker-compose.yml`](docker-compose.yml) | [`docker-compose.prod.example.yml`](docker-compose.prod.example.yml) |
| Images | Built locally (`Dockerfile.dev` for frontend) | Docker Hub (`slurrps/snippy-frontend`, `slurrps/snippy-pocketbase`) |
| Frontend | `ng serve` on **4200** | nginx on container **8080** |
| Env | PocketBase `env_file: .env` | PocketBase `env_file: stack.env` (Portainer; same keys as `.env.example`) |
| Admin UI | [http://localhost:8090/_/](http://localhost:8090/_/) (localhost only) | `127.0.0.1:8090` only. Production nginx does not proxy `/_/` |

> **Do not** use the root `docker-compose.yml` for production. It bind-mounts source and runs `ng serve`.

---

## Features

- Live HTML / CSS / JS editor with instant preview, split layouts, extra themes, and optional Vim keymap
- CodeMirror find and replace in every pane (`Ctrl/Cmd+F`, `Ctrl/Cmd+H`)
- Per-account editor preferences with Settings live preview
- Guest `/try` editor and public `/embed/:shortId` player
- New-snippet picker with starter templates plus your own: turn on **Use as template** in Snippet settings (or a card's menu)
- Last-saved time in the editor header, and server autosave every 5 minutes once a snippet has been saved
- Anonymous Explore (`/public`), tag browse (`/tags/:tag`), profiles, and collection pages
- Public and private snippets, secret share links (`/s/:token`), full-page view
- Favorites (including your own snippets), threaded comments, follows, collections, and forking
- Email/password accounts plus optional GitHub and Google OAuth
- Asset uploads, profile pictures, and list snapshots on PocketBase files
- ZIP export/import, command palette (`Ctrl/Cmd+K`), keyboard shortcuts (press `?` for the list)
- Loading feedback everywhere: button spinners, list spinners, and a thin activity bar for slow requests
- SEO: per-page titles, descriptions, canonical links, Open Graph/Twitter tags, JSON-LD, and `/sitemap.xml`
- Accessibility: skip link, labelled icon buttons and code panes, keyboard-operable cards and palette, live regions for status

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2
- [Node.js](https://nodejs.org/) 22+ (optional, for `npm run check:all`)

```bash
docker --version
docker compose version
```

---

## Quick start

```bash
cp .env.example .env
# set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD
docker compose up --build
```

Open [http://localhost:4200](http://localhost:4200). Create an account at `/create-account` or log in at `/login`.

A new email account gets a random username (and that username as the display name). You can change both in Settings. OAuth accounts use the provider display name and login when they are valid.

Admin UI: [http://localhost:8090/_/](http://localhost:8090/_/) with the env superuser.

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env` at the repo root. Compose gives PocketBase the whole file (`env_file: .env`). The frontend needs no PocketBase settings: it always calls PocketBase on its own origin, which nginx (prod) or `ng serve` (dev) proxies. In production it only receives `SITE_URL`.

| Variable | Service | Notes |
|---|---|---|
| `PB_ADMIN_EMAIL` | pocketbase | Superuser for Admin UI |
| `PB_ADMIN_PASSWORD` | pocketbase | Superuser password |
| `PB_APP_URL` | pocketbase | Public site URL (reset emails, file links, CORS). Local: `http://localhost:4200` |
| `PB_ALLOWED_ORIGINS` | pocketbase | Extra CORS origins, comma-separated. Empty is fine — localhost and `PB_APP_URL` are always added |
| `PB_SMTP_*` | pocketbase | Optional. Needed only for password-reset mail |
| `PB_GITHUB_CLIENT_ID` / `SECRET` | pocketbase | Optional GitHub OAuth |
| `PB_GOOGLE_CLIENT_ID` / `SECRET` | pocketbase | Optional Google OAuth |
| `SITE_URL` | frontend | Optional public origin. Adds `Sitemap: {SITE_URL}/sitemap.xml` to `robots.txt`. The prod example passes `PB_APP_URL` |

**Never** put `PB_ADMIN_*`, SMTP, or OAuth client secrets on the frontend service.

---

## Allowed origins (CORS)

PocketBase `--origins` is built in [`snippy/pocketbase/entrypoint.sh`](snippy/pocketbase/entrypoint.sh):

- Always: `http://localhost:4200`, `http://127.0.0.1:4200`
- `PB_APP_URL` (trailing slash stripped)
- Any extra hosts in `PB_ALLOWED_ORIGINS` (comma-separated)

Origins are scheme + host + port, not paths. `/login` and `/api` share the site origin.

Browsing from another machine on your LAN:

```bash
PB_ALLOWED_ORIGINS=http://192.168.1.10:4200
```

Do not set `*` — the entrypoint ignores it.

---

## OAuth (GitHub and Google)

Set **both** client id and secret for a provider in `.env`. Restart PocketBase. The SPA reads enabled providers from `GET /api/snippy/meta` — there is no frontend provider list to keep in sync.

Authorization callback URL for **every** provider:

```
{PB_APP_URL}/api/oauth2-redirect
```

Local example: `http://localhost:4200/api/oauth2-redirect`.

1. [GitHub OAuth App](https://github.com/settings/developers) — Homepage URL is your public site.
2. [Google Cloud OAuth client](https://console.cloud.google.com/apis/credentials) — type Web application, same callback.

Leave a provider's keys empty to hide its button.

---

## Password reset without SMTP

Leave `PB_SMTP_HOST` empty if you do not run mail. Forgot-password then tells people to contact the operator instead of pretending an email was sent.

**Admin UI:** [http://localhost:8090/_/](http://localhost:8090/_/) → Users → open the account → set password.

**Script** (PocketBase must be running). The password is prompted and is not passed on the command line:

```bash
./scripts/reset-user-password.sh user@example.com
# or, without a prompt: SNIPPY_NEW_PASSWORD='NewPassword123' ./scripts/reset-user-password.sh user@example.com
```

Signed-in users can still change their password in Settings. To send reset mail, fill `PB_SMTP_HOST` (and related `PB_SMTP_*`) and restart PocketBase.

---

## Local development

```bash
cp .env.example .env
docker compose up --build
```

Migrations and hooks bind-mount from `snippy/pocketbase/pb_migrations` and `pb_hooks`, so JS edits apply after `docker compose restart pocketbase`.

---

## Production deployment

Use [`docker-compose.prod.example.yml`](docker-compose.prod.example.yml). It pulls `slurrps/snippy-frontend:latest` and `slurrps/snippy-pocketbase:latest`. Pin `0.5.2` instead of `latest` when you want this release. Set `PB_APP_URL` to your HTTPS origin. Put TLS in front (any reverse proxy works). Point the proxy or tunnel at the frontend: `snippy-frontend:8080` on a shared Docker network, or `host:${FRONTEND_PORT}` (default 4200). The frontend serves plain HTTP, so firewall that host port from the internet and let TLS end at the proxy or tunnel. nginx forwards `/api/` to PocketBase on the compose network. It does not forward the Admin UI. `/_/` serves a static page that closes the OAuth popup (PocketBase redirects the popup there after GitHub login). The same close runs in the SPA if that path still loads the app. nginx sends relative redirects (`absolute_redirect off`) so the OAuth popup never lands on the container's internal `http://host:8080`. `/sitemap.xml` is generated by PocketBase from public snippets on public profiles, using `PB_APP_URL` for absolute links.

The Admin UI stays on the PocketBase port, which the example compose file binds to `127.0.0.1:8090`. Reach it with an SSH tunnel or from the host. Do not publish that port on the public interface.

---

## Backup

Stop PocketBase, then copy the `pb_data` volume. That is SQLite plus uploaded files. Copying the volume while the process is running can save a torn database.

```bash
docker compose stop pocketbase
docker run --rm -v snippy_pb_data:/from -v "$PWD":/to alpine \
  cp -a /from/. /to/pb_data-backup
docker compose start pocketbase
```

The volume name depends on the compose project (`docker volume ls`). Health check while it is up:

```bash
docker compose exec pocketbase wget -q -O - http://127.0.0.1:8090/api/health
```

---

## Project layout

```
snippy/frontend     Angular SPA + nginx
snippy/pocketbase   Pinned PocketBase binary, pb_migrations, pb_hooks
scripts/            Operator helpers (password reset)
documentation/      Architecture notes
```

---

## Documentation

There is no Node/Express API. The SPA talks to PocketBase only.

- [Frontend architecture](documentation/frontend.md) — JWT/SDK, models, services, extending the UI
- [PocketBase collections, rules, hooks](documentation/db.md) — adding tables/columns

---

## License and legal

MIT. See [LICENSE](LICENSE).
