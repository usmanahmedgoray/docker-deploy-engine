# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dockpoly Engine is a RESTful API service & Server-Side Rendered Dashboard (TypeScript + Express v5 + EJS + Dockerode) for dynamic Docker container lifecycle management, reverse proxy domain routing (`http://<name>.localhost:4000`), image inspection, network/volume monitoring, and Docker Hub image auto-complete search.

## Commands

- **Install dependencies**: `bun install` or `npm install`
- **Run dev server (hot reload)**: `bun run dev` (runs `tsx watch index.ts`)
- **Run production**: `bun run index.ts`
- **Run Unit & Integration Tests**: `bun test`
- **Typecheck**: `bun x tsc --noEmit`
- **Run via Docker Compose**: `docker compose up -d --build`
- Server ports:
  - **Reverse Proxy Public Entrypoint**: `http://localhost:4000`
  - **Interactive Swagger UI Documentation**: `http://localhost:4000/api-docs`
  - **Management API Internal Server**: `http://localhost:3000`

## Architecture

Standard layered controller-service architecture with Express v5 + EJS view engine (`index.ts`):

```
views/index.ejs (EJS Views) + public/ (Static Assets) ──> Express Router (routes/managementApp.route.ts)
                                                                 │
                                                                 ▼
                                                    controller/managementApp.controller.ts
                                                                 │
                                                                 ▼
                                                    services/managementApp.services.ts
                                                                 │
                                                                 ▼
                                                    config/docker.config.ts (Dockerode client)
                                                                 │
                                                                 ▼
                                                        Docker Engine Daemon
```

### Key Components:
- **`proxy.ts`**: Subdomain Reverse Proxy router built with `http-proxy-middleware`. Intercepts incoming HTTP requests on port `4000` and proxies subdomain traffic (e.g. `http://my-web.localhost:4000`) directly to container internal IP addresses (`172.18.0.x`) on the custom `deploy-engine` bridge network.
- **`views/`**: EJS template views (`index.ejs`, `partials/header.ejs`, `partials/modals.ejs`) rendering a glassmorphic dashboard UI.
- **`public/app.js`**: Frontend JavaScript handling UI state, real-time Docker Hub search autocomplete, skeleton loader rendering, and button loading/disabled states during async actions.
- **`services/managementApp.services.ts`**: All Docker Engine business logic — image checks/pulls, power actions (`start`, `stop`, `pause`, `unpause`), image inspect, Docker Hub search, network list, volume list, and single/batch container deletions.
- **`controller/managementApp.controller.ts`**: Parses/validates requests and maps service results to standard HTTP responses.
- **`config/docker.config.ts`**: Dockerode connection manager supporting cross-platform Unix sockets, Windows Named Pipes, and TCP (`http://127.0.0.1:2375`).

## API Surface

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/container` | List containers on `deploy-engine` network |
| `POST` | `/container` | Pull image if missing, create and start container |
| `GET` | `/container/:identifier` | Inspect container IP, env, exposed ports |
| `POST` | `/container/:identifier/:action` | Execute power action (`start`, `stop`, `pause`, `unpause`) |
| `DELETE` | `/container/:identifier` | Force-delete single container by ID or name |
| `GET` | `/image` | List cached local Docker images |
| `GET` | `/image/search?q=:query` | Search Docker Hub for auto-complete |
| `GET` | `/image/inspect/:identifier` | Inspect A-Z detailed image specification |
| `DELETE` | `/image/:identifier` | Force-delete local Docker image |
| `GET` | `/network` | List Docker networks |
| `GET` | `/volume` | List Docker volumes |

## Coding & Architectural Conventions

- **Loading & Disabled States**: All UI buttons triggering async API calls must be disabled during execution and show loading spinners (`.spinner-sm`) to prevent race conditions and duplicate submissions.
- **View Engine**: Use EJS templates inside `views/` with partials for header/modals for proper MVC structure.
- **Error Handling**: Services throw `Error` objects with `.statusCode` properties. Controllers catch and translate them into standard JSON responses `{ message: string, error?: string }`.
- **Type Checking**: Always verify zero TypeScript errors using `bun x tsc --noEmit` before building or committing changes.
