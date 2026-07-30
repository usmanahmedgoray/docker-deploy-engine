# Dockpoly-Clone 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.2.1-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Dockerode](https://img.shields.io/badge/Dockerode-5.0.1-2496ED?style=flat-square&logo=docker&logoColor=white)](https://github.com/apocas/dockerode)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%20%7C%20Node.js-FBF0DF?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

A high-performance, modular RESTful API service built with **TypeScript**, **Express (v5)**, and **Dockerode** for programmatic Docker container lifecycle management. 

`Dockpoly-Clone` enables applications to dynamically pull Docker images, spin up configured containers (with custom port bindings, environment variables, commands, and restart policies), execute automatic cleanup routines, and perform single or batch container deletions.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Getting Started](#-installation--getting-started)
- [Docker Connection Setup](#-docker-connection-setup)
- [API Reference](#-api-reference)
  - [Create Container](#1-create--start-container)
  - [Delete Single Container](#2-delete-container-by-id-or-name)
  - [Batch Delete Containers by Image](#3-delete-containers-by-image)
- [Error Handling Standard](#-error-handling-standard)
- [Complete Specification](#-complete-specification)
- [License](#-license)

---

## ⚡ Features

- **🚀 Dynamic Container Provisioning**: Create and start Docker containers on demand with port mappings, environment variables, command overrides, and custom restart policies.
- **📦 Automatic Image Resolution**: Checks local image cache first; automatically pulls missing Docker images from Docker Hub or custom registries before container creation.
- **🛡️ Self-Healing Cleanup**: Automatically removes transient containers if starting fails after creation, preventing leaked container states.
- **🧹 Single & Batch Deletion**: Remove individual containers by ID or Name, or purge all containers built from a specific Docker image and tag in a single call.
- **🌐 Cross-Platform Daemon Resolution**: Automatic runtime detection supporting Unix Sockets (`/var/run/docker.sock`), Windows Named Pipes (`//./pipe/docker_engine`), and Windows TCP connections (`127.0.0.1:2375`) when using Bun.

---

## 🛠️ Architecture & Tech Stack

```
[ Client Application / HTTP Requests ]
                 │
                 ▼
      [ Express 5 REST API Router ]
                 │
                 ▼
      [ Management Controllers ]
  (Request Parsing & Input Validation)
                 │
                 ▼
      [ Management Services ]
  (Image Check/Pull, Container Lifecycle, Port Mapping)
                 │
                 ▼
      [ Dockerode SDK Engine ]
                 │
                 ▼
    [ Docker Daemon Socket / TCP ]
```

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Runtime** | Bun (v1.3+) / Node.js (v18+) | All-in-one JavaScript runtime & engine |
| **Framework** | Express v5.2.1 | Lightweight, flexible web application framework |
| **SDK** | Dockerode v5.0.1 | Official Node.js Docker Engine API client |
| **Execution** | `tsx` v4.23.1 | TypeScript execute & watch runner |

---

## 📂 Project Directory Structure

```
dockpoly-clone/
├── config/
│   └── docker.config.ts            # Dockerode initialization & OS connection resolver
├── controller/
│   └── managementApp.controller.ts # Route controller handlers & HTTP response formatting
├── docs/
│   └── dockpoly-clone-spec.md      # Comprehensive technical specification document
├── middleware/                     # Extensible custom Express middleware
├── routes/
│   └── managementApp.route.ts      # Express route declarations
├── services/
│   └── managementApp.services.ts   # Core business logic & Docker engine operations
├── index.ts                        # Application entry point & error handlers
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript compiler options
└── README.md                       # Documentation homepage
```

---

## ⚙️ Prerequisites

Before running the server, ensure you have the following installed:

1. **Node.js** (v18+) or **Bun** (v1.3+)
2. **Docker Engine / Docker Desktop** running locally.
   - *Windows Note*: If running via Bun on Windows, enable *"Expose daemon on tcp://localhost:2375 without TLS"* in Docker Desktop settings.

---

## 🚀 Installation & Getting Started

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/dockpoly-clone.git
cd dockpoly-clone

# Install dependencies using Bun
bun install

# Or using npm
npm install
```

### 2. Run in Development Mode (Hot Reload)

```bash
npm run dev
# or
bun run dev
```

### 3. Run in Production Mode

```bash
npm start
# or
bun run index.ts
```

The API server will launch at `http://localhost:3000`.

---

## 🔌 Docker Connection Setup

The Docker connection is dynamically configured in [`config/docker.config.ts`](file:///d:/Personal/Docker/Dockpoly-clone/config/docker.config.ts):

- **Linux / macOS / Node.js (Windows)**: Connects directly via standard local Unix Socket (`/var/run/docker.sock`) or Windows Named Pipe.
- **Windows + Bun**: Connects via TCP at `http://127.0.0.1:2375` to circumvent Bun's native Windows named pipe limitation.

---

## 📡 API Reference

### 1. Create & Start Container
Creates a container from a specified image and tag. Automatically pulls the image if missing locally.

- **HTTP Method**: `POST`
- **Endpoint**: `/container`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "image": "nginx",
  "tag": "alpine",
  "containerName": "my-web-server",
  "env": [
    "PORT=80",
    "ENV=production"
  ],
  "cmd": ["nginx", "-g", "daemon off;"],
  "ports": [
    {
      "hostPort": "8080",
      "containerPort": "80"
    }
  ],
  "autoRemove": false
}
```

#### Example cURL
```bash
curl -X POST http://localhost:3000/container \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx",
    "tag": "alpine",
    "containerName": "my-web-server",
    "ports": [{ "hostPort": "8080", "containerPort": "80" }]
  }'
```

#### Success Response (`201 Created`)
```json
{
  "message": "Container created and started successfully",
  "data": {
    "id": "e9b5f3a1234567890abcdef...",
    "name": "my-web-server",
    "image": "nginx:alpine",
    "status": "running",
    "created": "2026-07-30T12:00:00.000Z"
  }
}
```

---

### 2. Delete Container by ID or Name
Stops and force-deletes a container, removing associated volumes.

- **HTTP Method**: `DELETE`
- **Endpoint**: `/container/:identifier`
- **Query Parameters**: `force` (optional, default `true`)

#### Example cURL
```bash
curl -X DELETE "http://localhost:3000/container/my-web-server?force=true"
```

#### Success Response (`200 OK`)
```json
{
  "message": "Container 'my-web-server' deleted successfully",
  "data": {
    "id": "e9b5f3a1234567890abcdef...",
    "name": "my-web-server",
    "removed": true
  }
}
```

---

### 3. Delete Containers by Image
Purges all running or stopped containers created from a specific Docker image and tag.

- **HTTP Method**: `DELETE`
- **Endpoint**: `/container/image/all`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "image": "nginx",
  "tag": "alpine",
  "force": true
}
```

#### Success Response (`200 OK`)
```json
{
  "message": "Successfully deleted 2 container(s) for image 'nginx:alpine'",
  "data": {
    "image": "nginx:alpine",
    "deletedCount": 2,
    "deletedContainers": [
      {
        "id": "e9b5f3a1234567890...",
        "name": "my-web-server-1"
      },
      {
        "id": "a8c2f1b9876543210...",
        "name": "my-web-server-2"
      }
    ]
  }
}
```

---

## 🚨 Error Handling Standard

The API enforces predictable HTTP status codes and structured JSON error responses:

| Status Code | Description | Example Cause |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Missing required parameters | `image` parameter omitted |
| **`404 Not Found`** | Resource does not exist | Container ID or matching image containers not found |
| **`409 Conflict`** | Name collision | Container with specified name already exists |
| **`500 Internal Server Error`** | Server or Docker engine exception | Engine daemon connection error |

#### Standardized Error Response Format
```json
{
  "message": "Container with this name already exists",
  "error": "Conflict: name '/my-web-server' is already in use"
}
```

---

## 📖 Complete Specification

For exhaustive documentation including detailed service contracts, TypeScript interfaces, and full architectural breakdown, view the specification file:
👉 [**docs/dockpoly-clone-spec.md**](file:///d:/Personal/Docker/Dockpoly-clone/docs/dockpoly-clone-spec.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
