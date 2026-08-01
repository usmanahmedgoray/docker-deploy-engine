# NexaDock Enterprise Engine 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.2.1-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![EJS](https://img.shields.io/badge/EJS-3.1.10-A91E2C?style=flat-square&logo=ejs&logoColor=white)](https://ejs.co/)
[![Dockerode](https://img.shields.io/badge/Dockerode-5.0.1-2496ED?style=flat-square&logo=docker&logoColor=white)](https://github.com/apocas/dockerode)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%20%7C%20Node.js-FBF0DF?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)

A high-performance, modular Cloud Container Engine built with **TypeScript**, **Express (v5)**, **EJS Template Engine**, and **Dockerode** for programmatic Docker container orchestration, dynamic subdomain reverse proxy routing, and UI management.

---

## ⚡ Key Features

- **🌐 Dynamic Subdomain Reverse Proxy**: Automatically routes subdomain HTTP requests (e.g. `http://my-app.localhost:4000`) directly to container internal IP addresses (`172.18.0.x`) on the custom `deploy-engine` bridge network without exposing host ports.
- **🎨 Glassmorphic EJS Template Engine UI**: Server-side rendered dashboard using Express + EJS (`views/landing.ejs`, `views/index.ejs`, `views/partials/`) featuring dark glassmorphism, micro-animations, and responsive tab navigation.
- **📱 Enterprise Mobile Sidebar Drawer & Desktop Navigation**: Dedicated mobile slide-over drawer navigation and fixed sticky navbar for desktop viewports.
- **📋 Single-Click Copy Utility**: One-click clipboard copying for IP addresses, URLs, short/long IDs, and mountpoints with checkmark visual feedback.
- **🔍 Real-Time Docker Hub Auto-Complete**: Live search against Docker Hub (`GET /image/search?q=...`) in the Deploy Container modal showing Official badges, star ratings, and descriptions.
- **⚡ Non-Flickering Skeleton UI & Action Disabling**: Shimmering CSS skeleton loaders prevent UI flickering. Action buttons are automatically disabled and show inline spinners during async operations.
- **⏯️ Container Power Controls**: Start, Stop, Pause, Resume, Inspect, and Delete containers on-demand via REST API or UI.
- **🖼️ A-Z Detailed Image Inspector & Deletion**: View comprehensive image metadata (virtual size, OS/Arch, layers count, exposed ports, environment variables, entrypoint) and force-delete cached Docker images.
- **🌐 Networks & Volumes Management**: Dedicated views and API endpoints for Docker Networks (`GET /network`) and Volumes (`GET /volume`).

---

## 🛠️ Architecture Overview

```
 [ Public Client Browser ] ──────────> [ NexaDock Reverse Proxy (Port 4000) ]
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

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.0+) or Node.js (v18+)
- [Docker Desktop](https://www.docker.com/) running locally

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

The application will launch on:
- 🌐 **Landing Page**: `http://localhost:4000/`
- 🚀 **Dashboard App**: `http://localhost:4000/app`
- 📄 **Swagger API Specs**: `http://localhost:4000/api-docs`

---

## 🧪 Testing

```bash
# Run unit & integration test suite
bun test
```
