# NexaDock 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.2.1-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![EJS](https://img.shields.io/badge/EJS-3.1.10-A91E2C?style=flat-square&logo=ejs&logoColor=white)](https://ejs.co/)
[![Dockerode](https://img.shields.io/badge/Dockerode-5.0.1-2496ED?style=flat-square&logo=docker&logoColor=white)](https://github.com/apocas/dockerode)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%20%7C%20Node.js-FBF0DF?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)

An open-source, self-hosted Docker container engine built with **TypeScript**, **Express (v5)**, **EJS**, and **Dockerode** — programmatic container orchestration, dynamic subdomain reverse proxy routing, and a full web dashboard, deployable behind any domain you own.

---

## ⚡ Key Features

- **🌐 Dynamic Subdomain Reverse Proxy**: Automatically routes subdomain HTTP requests (e.g. `http://my-app.<your-domain>`) directly to container internal IP addresses on a dedicated Docker bridge network — no host port exposure, no manual nginx config. The root domain and bridge network name are both configurable via environment variables, so this works the same whether you're running on `localhost` for local development or a real public domain in production.
- **📊 Fleet Overview Dashboard**: A landing dashboard tab showing live running-container counts, aggregate CPU and memory utilization (animated gauge + bar charts), a per-container resource breakdown, and previews of your most recently deployed containers and images.
- **🎨 Glassmorphic EJS Template Engine UI**: Server-side rendered dashboard using Express + EJS (`views/landing.ejs`, `views/index.ejs`, `views/docs.ejs`, `views/partials/`) featuring dark glassmorphism, micro-animations, and responsive tab navigation.
- **📱 Enterprise Mobile Sidebar Drawer & Desktop Navigation**: Dedicated mobile slide-over drawer navigation and fixed sticky navbar for desktop viewports.
- **📋 Single-Click Copy Utility**: One-click clipboard copying for IP addresses, URLs, short/long IDs, and mountpoints with checkmark visual feedback.
- **🔍 Real-Time Docker Hub Auto-Complete**: Live search against Docker Hub (`GET /image/search?q=...`) in the Deploy Container modal showing Official badges, star ratings, and descriptions.
- **⚡ Non-Flickering Skeleton UI & Action Disabling**: Shimmering CSS skeleton loaders prevent UI flickering. Action buttons are automatically disabled and show inline spinners during async operations.
- **⏯️ Container Power Controls**: Start, Stop, Pause, Resume, Inspect, and Delete containers on-demand via REST API or UI.
- **🖼️ A-Z Detailed Image Inspector & Deletion**: View comprehensive image metadata (virtual size, OS/Arch, layers count, exposed ports, environment variables, entrypoint) and force-delete cached Docker images.
- **🌐 Networks & Volumes Management**: Dedicated views and API endpoints for Docker Networks (`GET /network`) and Volumes (`GET /volume`).
- **📄 Interactive API Reference**: A complete OpenAPI 3.0 spec served via Swagger UI at `/api-docs`, plus a full developer guide at `/docs`.

---

## 🛠️ Architecture Overview

```
 [ Public Client Browser ] ──────────> [ NexaDock Reverse Proxy (public port) ]
                                                │ (Subdomain IP Resolution)
                                                ▼
                                    [ Managed Docker Container ]
                                        (internal IP on the configured bridge network)

 [ Dashboard / Management Client ] ──> [ Management Server (internal port) ]
                                                │ (EJS Rendering & REST Routes)
                                                ▼
                                    [ Dockerode SDK Engine ]
                                                │
                                                ▼
                                    [ Local Docker Engine Daemon ]
```

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.0+) or Node.js (v18+)
- [Docker Desktop](https://www.docker.com/) or Docker Engine running locally

### Installation & Local Run
```bash
# Clone the repository
git clone https://github.com/usmanahmedgoray/docker-deploy-engine.git
cd docker-deploy-engine

# Install dependencies
bun install

# Run the engine
bun run dev
```

By default (no `.env` file needed) the app binds to `localhost` on the ports below:
- 🌐 **Landing Page**: `http://localhost:4000/`
- 🚀 **Dashboard App**: `http://localhost:4000/app`
- 📄 **Developer Docs**: `http://localhost:4000/docs`
- 🧾 **Swagger API Specs**: `http://localhost:4000/api-docs`

---

## ⚙️ Configuration

NexaDock is fully self-hostable behind your own domain — nothing is hardcoded to `localhost`. Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Public reverse proxy port |
| `MANAGEMENT_PORT` | `3000` | Internal management API port (never exposed directly) |
| `MANAGEMENT_HOST` | `127.0.0.1` | Host the proxy uses to reach the management API |
| `DOMAIN` | `localhost` | Root domain for subdomain proxy routing — set to your real domain (e.g. `yourdomain.com`) in production |
| `DOCKER_NETWORK` | `deploy-engine` | Bridge network name used for container-to-container routing |
| `NODE_ENV` | `production` | Runtime environment |

See the full [`.env` reference](views/docs.ejs) in the in-app docs (`/docs`) for details on every variable, safe practices around committing `.env`, and Docker Compose injection.

---

## 🧪 Testing

```bash
# Run unit & integration test suite
bun test

# Type-check the project
bun x tsc --noEmit
```

---

## 🤝 Contributing

Issues and pull requests are welcome. Please run `bun test` and `bun x tsc --noEmit` before submitting a PR.
