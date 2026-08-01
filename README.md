# Dockpoly Engine 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.2.1-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![EJS](https://img.shields.io/badge/EJS-3.1.10-A91E2C?style=flat-square&logo=ejs&logoColor=white)](https://ejs.co/)
[![Dockerode](https://img.shields.io/badge/Dockerode-5.0.1-2496ED?style=flat-square&logo=docker&logoColor=white)](https://github.com/apocas/dockerode)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%20%7C%20Node.js-FBF0DF?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)

A high-performance, modular Cloud Container Engine built with **TypeScript**, **Express (v5)**, **EJS Template Engine**, and **Dockerode** for programmatic Docker container orchestration, dynamic subdomain reverse proxy routing, and UI management.

---

## ⚡ Key Features

- **🌐 Dynamic Subdomain Reverse Proxy**: Automatically routes subdomain HTTP requests (e.g. `http://my-app.localhost:4000`) directly to container internal IP addresses (`172.18.0.x`) on the custom `deploy-engine` bridge network without exposing host ports.
- **🎨 Glassmorphic EJS Template Engine UI**: Server-side rendered dashboard using Express + EJS (`views/index.ejs`, `views/partials/`) featuring dark glassmorphism, micro-animations, and responsive tab navigation.
- **🔍 Real-Time Docker Hub Auto-Complete**: Live search against Docker Hub (`GET /image/search?q=...`) in the Deploy Container modal showing Official badges, star ratings, and descriptions.
- **⚡ Non-Flickering Skeleton UI & Action Disabling**: Shimmering CSS skeleton loaders prevent UI flickering. Action buttons are automatically disabled and show inline spinners during async operations.
- **⏯️ Container Power Controls**: Start, Stop, Pause, Resume, Inspect, and Delete containers on-demand via REST API or UI.
- **🖼️ A-Z Detailed Image Inspector & Deletion**: View comprehensive image metadata (virtual size, OS/Arch, layers count, exposed ports, environment variables, entrypoint) and force-delete cached Docker images.
- **🌐 Networks & Volumes Management**: Dedicated views and API endpoints for Docker Networks (`GET /network`) and Volumes (`GET /volume`).

---

## 🛠️ Architecture Overview

```
 [ Public Client Browser ] ──────────> [ Reverse Proxy Server (Port 4000) ]
                                                │ (Subdomain IP Resolution)
                                                ▼
                                    [ Managed Docker Container ]
                                        (IP: 172.18.0.x on deploy-engine)

 [ Dashboard / Management Client ] ──> [ Management Server (Port 3000) ]
                                                │ (EJS Rendering & REST Routes)
                                                ▼
                                    [ Dockerode SDK Engine ]
                                                │
                                                ▼
                                    [ Local Docker Engine Daemon ]
```

---

## 📂 Directory Structure

```
dockpoly-clone/
├── config/
│   ├── app.config.ts            # Environment variables configuration (.env loader)
│   └── docker.config.ts         # Dockerode client initialization
├── controller/
│   └── managementApp.controller.ts # Request handlers for container, image, network, volume
├── proxy.ts                     # Reverse proxy routing logic using http-proxy-middleware
├── routes/
│   └── managementApp.route.ts   # Express REST route declarations
├── services/
│   └── managementApp.services.ts# Core Dockerode engine business logic
├── views/                       # EJS Template Engine views
│   ├── partials/
│   │   ├── header.ejs           # Header & navbar partial
│   │   └── modals.ejs           # Deploy, delete, and inspect modals partial
│   └── index.ejs                # Main dashboard template
├── public/                      # Static assets
│   ├── app.js                   # Client-side UI interaction script & skeleton handlers
│   └── style.css                # Custom glassmorphic CSS design system
├── index.ts                     # Express server bootstrapper (Management + Proxy servers)
├── docker-compose.yml           # Container orchestration compose configuration
├── Dockerfile                   # Multi-stage optimized Alpine Dockerfile
├── package.json                 # Dependencies & scripts
└── README.md                    # Engine documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+) or **Bun** (v1.3+)
- **Docker Engine / Docker Desktop** running locally.
  - *Windows Note*: If running via Bun on Windows, enable *"Expose daemon on tcp://localhost:2375 without TLS"* in Docker Desktop settings.

### 2. Environment Variables (.env)
Create a `.env` file in the root directory:

```env
PORT=4000
MANAGEMENT_PORT=3000
MANAGEMENT_HOST=127.0.0.1
DOMAIN=localhost
DOCKER_NETWORK=deploy-engine
```

### 3. Run Locally

```bash
# Install dependencies
bun install

# Run in development mode (hot reload)
bun run dev

# Or run via Docker Compose
docker compose up -d --build
```

Access Dashboard UI at: **`http://localhost:4000/`**

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/container` | List all managed containers on `deploy-engine` network |
| `POST` | `/container` | Deploy & launch a new container from Docker image |
| `GET` | `/container/:identifier` | Inspect single container IP, env, and status |
| `POST` | `/container/:identifier/:action` | Power action (`start`, `stop`, `pause`, `unpause`) |
| `DELETE` | `/container/:identifier` | Delete container (`?force=true`) |
| `GET` | `/image` | List cached local Docker images |
| `GET` | `/image/search?q=:query` | Search Docker Hub for image auto-complete |
| `GET` | `/image/inspect/:identifier` | Inspect A-Z detailed image specification |
| `DELETE` | `/image/:identifier` | Delete local Docker image (`?force=true`) |
| `GET` | `/network` | List Docker networks |
| `GET` | `/volume` | List Docker volumes |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
