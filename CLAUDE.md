# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NexaDock (Dockpoly Engine) is an open-source, self-hostable RESTful API service & Server-Side Rendered Dashboard (TypeScript + Express v5 + EJS + Dockerode) for dynamic Docker container lifecycle management, reverse proxy domain routing, image inspection, network/volume monitoring, fleet-wide CPU/memory resource monitoring, and Docker Hub image auto-complete search.

Subdomain routing follows the pattern `http://<container-name>.<DOMAIN>:<PORT>`, where `DOMAIN` and `PORT` are environment-configurable (see `config/app.config.ts`) and default to `localhost:4000` for local development. **Do not hardcode `localhost` in new UI copy, docs, or examples** — interpolate `config.domain` / `config.port` (EJS views already receive `config`) so the app reads correctly whether it's running locally or behind a real production domain.

## Commands

- **Install dependencies**: `bun install` or `npm install`
- **Run dev server (hot reload)**: `bun run dev` (runs `tsx watch index.ts`)
- **Run production**: `bun run index.ts`
- **Run Unit & Integration Tests**: `bun test`
- **Typecheck**: `bun x tsc --noEmit`
- **Run via Docker Compose**: `docker compose up -d --build`
- Server ports (defaults, both configurable via `.env` — see Configuration below):
  - **Reverse Proxy Public Entrypoint**: `http://localhost:4000` (`PORT`)
  - **Interactive Swagger UI Documentation**: `http://localhost:4000/api-docs`
  - **Developer Docs**: `http://localhost:4000/docs`
  - **Management API Internal Server**: `http://localhost:3000` (`MANAGEMENT_PORT`, never exposed publicly — only the proxy talks to it)

## Configuration

All runtime config lives in `config/app.config.ts`, reading from `process.env` with sane local-dev defaults (see `.env.example`):

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `4000` | Public reverse proxy port |
| `MANAGEMENT_PORT` | `3000` | Internal management API port |
| `MANAGEMENT_HOST` | `127.0.0.1` | Host the proxy uses to reach the management API |
| `DOMAIN` | `localhost` | Root domain for subdomain proxy routing — set to a real domain in production |
| `DOCKER_NETWORK` | `deploy-engine` | Bridge network used for container-to-container routing |
| `NODE_ENV` | `production` | Runtime environment |

## Architecture

Two Express servers run from one codebase (`index.ts` starts both): a public reverse proxy (`proxy.ts`) and an internal management/dashboard server. Management routes follow a layered controller-service architecture, split per resource:

```
views/*.ejs (EJS Views) + public/ (Static Assets) ──> routes/managementApp.route.ts
                                                                 │  (mounts container/image/network/volume routers)
                                                                 ▼
                                              controller/{container,image,network,volume}.controller.ts
                                                                 │
                                                                 ▼
                                              services/{container,image,network,volume}.service.ts
                                                                 │
                                                                 ▼
                                                    config/docker.config.ts (Dockerode client)
                                                                 │
                                                                 ▼
                                                        Docker Engine Daemon
```

`controller/managementApp.controller.ts` and `services/managementApp.services.ts` are barrel files that re-export from the per-resource controller/service modules above — prefer importing directly from the resource-specific file (as `routes/*.route.ts` already do) rather than adding new logic to the barrels.

### Key Components:
- **`proxy.ts`**: Subdomain Reverse Proxy router built with `http-proxy-middleware`. Intercepts incoming HTTP requests on the public port and proxies subdomain traffic (e.g. `http://my-web.<DOMAIN>:<PORT>`) directly to container internal IP addresses on the configured Docker bridge network (`DOCKER_NETWORK`, default `deploy-engine`).
- **`views/`**: EJS template views — `landing.ejs` (marketing/landing page), `index.ejs` (dashboard console, tabs: Overview, Containers, Images, Networks, Volumes, Metrics, Config), `docs.ejs` (developer documentation), and `partials/header.ejs` / `partials/modals.ejs`.
- **`public/app.js`**: Frontend JavaScript handling UI state, tab switching, the Overview dashboard (live CPU/memory gauge + charts, recent containers/images), real-time Docker Hub search autocomplete, skeleton loader rendering, and button loading/disabled states during async actions.
- **`services/*.service.ts`**: All Docker Engine business logic — image checks/pulls, power actions (`start`, `stop`, `pause`, `unpause`), image inspect, Docker Hub search, network list, volume list, fleet-wide CPU/memory stats (`getFleetStats`), and single/batch container deletions.
- **`controller/*.controller.ts`**: Parses/validates requests and maps service results to standard HTTP responses.
- **`config/docker.config.ts`**: Dockerode connection manager supporting cross-platform Unix sockets, Windows Named Pipes, and TCP (`http://127.0.0.1:2375`).

## API Surface

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/container` | List containers on the configured bridge network |
| `POST` | `/container` | Pull image if missing, create and start container |
| `GET` | `/container/stats/overview` | Fleet-wide CPU/memory usage aggregate + per-container breakdown |
| `GET` | `/container/:identifier` | Inspect container IP, env, exposed ports |
| `POST` | `/container/:identifier/:action` | Execute power action (`start`, `stop`, `pause`, `unpause`) |
| `DELETE` | `/container/:identifier` | Force-delete single container by ID or name |
| `GET` | `/image` | List cached local Docker images |
| `GET` | `/image/search?q=:query` | Search Docker Hub for auto-complete |
| `GET` | `/image/inspect/:identifier` | Inspect A-Z detailed image specification |
| `DELETE` | `/image/:identifier` | Force-delete local Docker image |
| `GET` | `/network` | List Docker networks |
| `GET` | `/volume` | List Docker volumes |

Full endpoint documentation (request/response schemas) lives in `config/swagger.config.ts` and is served at `/api-docs`.

## Coding & Architectural Conventions

- **Loading & Disabled States**: All UI buttons triggering async API calls must be disabled during execution and show loading spinners (`.spinner-sm`) to prevent race conditions and duplicate submissions.
- **View Engine**: Use EJS templates inside `views/` with partials for header/modals for proper MVC structure. Every route render passes `config` — use it (`config.domain`, `config.port`, `config.dockerNetwork`) instead of hardcoding `localhost` or `deploy-engine` in new copy.
- **Error Handling**: Services throw `Error` objects with `.statusCode` properties. Controllers catch and translate them into standard JSON responses `{ message: string, error?: string }`.
- **Type Checking**: Always verify zero TypeScript errors using `bun x tsc --noEmit` before building or committing changes.
- **Route Ordering**: Static sub-paths (e.g. `/container/stats/overview`) must be declared before catch-all dynamic routes (e.g. `/container/:identifier`) in `routes/*.route.ts` to avoid being shadowed.
