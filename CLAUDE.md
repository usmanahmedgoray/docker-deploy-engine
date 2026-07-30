# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dockpoly-Clone is a small RESTful API service (TypeScript + Express v5 + Dockerode) that programmatically manages the Docker container lifecycle: pulling images, creating/starting containers, and deleting containers individually or in bulk by image.

## Commands

- Install deps: `bun install` or `npm install`
- Run dev server (hot reload): `npm run dev` / `bun run dev` (runs `tsx watch index.ts`)
- Run production: `npm start` / `bun run index.ts`
- Server listens on `http://localhost:3000`.

There is no test suite, lint config, or build step in this repo currently — `tsconfig.json` has `noEmit: true` (type-checking only, execution happens via `tsx`/Bun directly on `.ts` files).

## Architecture

Standard layered controller-service architecture, all under a single Express app (`managementApp`) defined in `index.ts`:

```
routes/managementApp.route.ts        -> controller/managementApp.controller.ts -> services/managementApp.services.ts -> config/docker.config.ts (Dockerode client) -> Docker Engine
```

- **`config/docker.config.ts`**: Exports the single shared `docker` (Dockerode) instance. Handles cross-platform daemon connection: Bun on Windows connects via TCP (`127.0.0.1:2375`, requires enabling "Expose daemon on tcp://localhost:2375 without TLS" in Docker Desktop) because Bun's native Windows named-pipe support is limited; every other combination (Node.js on any OS, Bun on Linux/macOS) uses the default Dockerode socket/pipe resolution.
- **`services/managementApp.services.ts`**: All Docker Engine business logic lives here — image existence checks, pulling images (via `docker.modem.followProgress`), creating/starting containers (with port bindings, env, cmd, restart policy), and single/batch container deletion. Custom errors are thrown as `Error` objects with a `.statusCode` property attached (e.g. 404) so controllers can branch on it.
- **`controller/managementApp.controller.ts`**: Parses/validates `req`, calls the service layer, and maps results/errors to HTTP responses. Error handling convention: catch service errors, check `error.statusCode` for known cases (404, 409), otherwise fall back to 500.
- **`routes/managementApp.route.ts`**: Express `Router` wiring endpoints to controllers.
- **`middleware/`**: Currently empty; intended location for future custom Express middleware (e.g. auth).
- **`docs/dockpoly-clone-spec.md`**: Full technical spec (interfaces, endpoint contracts, error format) — check this for the authoritative API contract when adding/changing endpoints, and update it alongside `README.md` when the API surface changes.

### API surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/container` | Pull image if needed, create and start a container |
| `DELETE` | `/container/:identifier` | Delete a single container by ID or name (`force` query/body param, default `true`) |
| `DELETE` | `/container/image/all` | Batch-delete all containers matching an `image:tag` |

Error responses follow `{ message: string, error?: string }` with status codes 400 (missing params), 404 (not found), 409 (name conflict on create), 500 (engine/unexpected errors).

### Conventions to follow when extending

- New Docker operations belong in `services/managementApp.services.ts`, not in controllers.
- Throw errors from services as `Error` with an attached `.statusCode`; let controllers translate that to the HTTP response.
- Container/image names are always normalized as `` `${image}:${tag}` `` (default tag `"latest"`), and container names from Dockerode inspect results have their leading `/` stripped before being returned.
