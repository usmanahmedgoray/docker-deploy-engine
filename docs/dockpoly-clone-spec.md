# Dockpoly-Clone Project Specification

## 1. Project Overview

**Dockpoly-Clone** is a lightweight, modular RESTful microservice built with **TypeScript**, **Express (v5)**, and **Dockerode**. It provides programmatic container lifecycle management over Docker Engine, allowing applications to dynamically pull Docker images, spin up configured containers with port mappings and environment variables, clean up failed containers, and manage single or batch container deletions.

The project is optimized for both **Bun** and **Node.js** runtimes, featuring cross-platform compatibility handling for Docker daemon socket and TCP connections across Linux, macOS, and Windows.

---

## 2. Technical Stack

| Category | Technology / Library | Version / Details |
| :--- | :--- | :--- |
| **Runtime Environment** | [Bun](https://bun.sh) / Node.js | Target Bun v1.3.14+ / Node.js 18+ |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | v5+ (ESNext target, strict mode enabled) |
| **Web Framework** | [Express](https://expressjs.com/) | v5.2.1 |
| **Docker SDK** | [Dockerode](https://github.com/apocas/dockerode) | v5.0.1 (with `@types/dockerode`) |
| **Development Runner** | `tsx` | v4.23.1 (TypeScript execution & watch mode) |

---

## 3. Project Architecture & Directory Structure

The project follows a standard multi-tiered controller-service architecture:

```
dockpoly-clone/
├── config/
│   └── docker.config.ts            # Dockerode initialization & cross-platform socket/TCP config
├── controller/
│   └── managementApp.controller.ts # Request handlers, validation, HTTP response formatting
├── docs/
│   └── dockpoly-clone-spec.md      # Comprehensive technical specification document
├── middleware/                     # Express custom middleware directory (extensible)
├── routes/
│   └── managementApp.route.ts      # Express Router definitions and endpoint mappings
├── services/
│   └── managementApp.services.ts   # Core business logic & Docker engine API interactions
├── index.ts                        # Server entry point, middleware setup, global error handling
├── package.json                    # Dependencies and runtime scripts
├── tsconfig.json                   # TypeScript compiler options
├── README.md                       # Quick-start guide
└── bun.lock                        # Bun lockfile
```

---

## 4. Configuration & Docker Engine Connection

The connection to the Docker daemon is established in [`config/docker.config.ts`](file:///d:/Personal/Docker/Dockpoly-clone/config/docker.config.ts).

### Cross-Platform Docker Daemon Resolution

- **Linux / macOS / Node.js on Windows**: Defaults to standard system socket (`/var/run/docker.sock`) or Windows named pipe (`//./pipe/docker_engine`).
- **Windows with Bun Runtime**: Automatically switches to TCP connection (`127.0.0.1:2375`) to overcome named pipe limitations present in native Bun Windows socket bindings.

```typescript
// config/docker.config.ts
import Docker from "dockerode";

const isBunOnWindows = process.platform === "win32" && typeof (process.versions as any).bun !== "undefined";

export const docker = isBunOnWindows
    ? new Docker({ host: "127.0.0.1", port: 2375 })
    : new Docker();
```

---

## 5. Service Layer Specification

Located in [`services/managementApp.services.ts`](file:///d:/Personal/Docker/Dockpoly-clone/services/managementApp.services.ts).

### TypeScript Interfaces

#### `CreateContainerOptions`
```typescript
#### `CreateContainerOptions`
```typescript
export interface CreateContainerOptions {
    image: string;
    tag?: string;
    containerName?: string;
    env?: string[];
    cmd?: string[];
    ports?: Array<{ containerPort: string }>;
    autoRemove?: boolean;
}
```

#### `ContainerResult`
```typescript
export interface ContainerResult {
    id: string;
    name: string;
    image: string;
    status: string;
    created: string;
    internalIp?: string;
    url?: string;
}
```

### Core Functions

1. **`isImageExist(image: string, tag?: string): Promise<boolean>`**
   - Inspects local Docker image cache for `${image}:${tag}`.
   - Returns `true` if available locally, `false` on HTTP 404.

2. **`ensureDockerNetwork(networkName?: string): Promise<void>`**
   - Checks if custom internal bridge network (`deploy-engine`) exists, creating it automatically if missing.

3. **`pullImage(image: string, tag?: string): Promise<{ message: string; pulled: boolean }>`**
   - Checks local image existence first.
   - If missing, triggers `docker.pull(`${image}:${tag}`)`.
   - Utilizes `docker.modem.followProgress` to stream and complete image download.

4. **`createContainer(options: CreateContainerOptions): Promise<ContainerResult>`**
   - Guarantees local image availability via `pullImage`.
   - Ensures `deploy-engine` internal bridge network exists.
   - Configures internal container ports (`ExposedPorts`) on the Docker internal network without host port bindings (`PortBindings`).
   - Creates and starts container instance attached to `deploy-engine`.
   - Inspects container to extract internal IP (`internalIp`) and access URL (`http://<containerName>.localhost:4000`).
   - Automatically executes fallback cleanup (`container.remove({ force: true })`) if container startup fails after creation.

5. **`deleteContainerByIdOrName(identifier: string, force?: boolean): Promise<{ id: string; name: string; removed: boolean }>`**
   - Retrieves container reference by ID or Name.
   - Removes container with `force: true` and volume removal (`v: true`).
   - Throws custom 404 error if container does not exist.

6. **`deleteContainersByImage(image: string, tag?: string, force?: boolean): Promise<{ image: string; deletedCount: number; deletedContainers: Array<{ id: string; name: string }> }>`**
   - Fetches all containers (`docker.listContainers({ all: true })`).
   - Filters list by matching `Image` attribute against target `${image}:${tag}` or `${image}`.
   - Performs batch force deletion on all matching containers.

---

## 6. Controller Layer & API Specification

Located in [`controller/managementApp.controller.ts`](file:///d:/Personal/Docker/Dockpoly-clone/controller/managementApp.controller.ts) and [`routes/managementApp.route.ts`](file:///d:/Personal/Docker/Dockpoly-clone/routes/managementApp.route.ts).

### Endpoints Summary

| Method | Endpoint | Description | Request Location |
| :--- | :--- | :--- | :--- |
| `POST` | `/container` | Create and start a Docker container on internal network | Body |
| `GET` | `/container/:identifier` | Inspect container details, status, IP, and environment variables | Path Parameter |
| `DELETE` | `/container/:identifier` | Delete single container by ID or Name | Path Parameter / Query / Body |
| `DELETE` | `/container/image/all` | Delete all containers for a specific image | Body / Query |
| `GET` | `/` | Root server status check | N/A |
| `GET` | `/test` | Route verification test endpoint | N/A |

---

### Endpoint Details

#### 1. Create Container
- **URL**: `/container`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "image": "nginx",
    "tag": "alpine",
    "containerName": "my-web-server",
    "env": ["PORT=80", "NODE_ENV=production"],
    "cmd": ["nginx", "-g", "daemon off;"],
    "ports": [
      {
        "containerPort": "80"
      }
    ],
    "autoRemove": false
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Container created and started successfully",
    "data": {
      "id": "e9b5f3a1234567890abcdef...",
      "name": "my-web-server",
      "image": "nginx:alpine",
      "status": "running",
      "created": "2026-07-30T12:00:00.000Z",
      "internalIp": "172.18.0.2",
      "url": "http://my-web-server.localhost:4000"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing required `image` field.
  - `409 Conflict`: Container with specified name already exists.
  - `500 Internal Server Error`: Engine or execution failure.

---

#### 2. Delete Single Container by ID or Name
- **URL**: `/container/:identifier`
- **Method**: `DELETE`
- **Query Parameters**: `force` (boolean, default: `true`)
- **Example URL**: `/container/my-web-server?force=true`
- **Response (200 OK)**:
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
- **Error Responses**:
  - `400 Bad Request`: Missing identifier parameter.
  - `404 Not Found`: Container with specified ID or name does not exist.
  - `500 Internal Server Error`: Deletion failure.

---

#### 3. Delete All Containers by Image
- **URL**: `/container/image/all`
- **Method**: `DELETE`
- **Request Body / Query Parameters**:
  ```json
  {
    "image": "nginx",
    "tag": "alpine",
    "force": true
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Successfully deleted 2 container(s) for image 'nginx:alpine'",
    "data": {
      "image": "nginx:alpine",
      "deletedCount": 2,
      "deletedContainers": [
        {
          "id": "e9b5f3a1234567890...",
          "name": "nginx-inst-1"
        },
        {
          "id": "a8c2f1b9876543210...",
          "name": "nginx-inst-2"
        }
      ]
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Image name not provided.
  - `404 Not Found`: No containers matching specified image and tag were found.
  - `500 Internal Server Error`: Deletion failure.

---

## 7. Middleware & Global Error Handling

1. **Body Parsing**: Standard `express.json()` handles incoming JSON payloads.
2. **404 Route Catch-All**:
   ```json
   { "message": "Not Found" }
   ```
3. **Global 500 Error Handler**: Captures unhandled error exceptions across middleware and routes:
   ```json
   { "message": "Internal Server Error" }
   ```

---

## 8. Development & Deployment Operational Guide

### Prerequisites
1. **Node.js** (v18+) or **Bun** (v1.3.14+) installed.
2. **Docker Engine / Docker Desktop** installed and running.
   - *Windows note*: If running via Bun on Windows, enable "Expose daemon on tcp://localhost:2375 without TLS" in Docker Desktop settings.

### Installation
```bash
bun install
# or
npm install
```

### Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run start` | `tsx index.ts` | Runs production/development server using `tsx` |
| `npm run dev` | `tsx watch index.ts` | Runs server with hot-reload watch mode |
| `bun run index.ts` | `bun run index.ts` | Runs server natively using Bun runtime |

---

## 9. Future Enhancement Roadmap

- [ ] **Authentication & Authorization**: Integrate JWT / API Key middleware in `middleware/`.
- [ ] **Container Metrics & Logs Streaming**: Add WebSocket / Server-Sent Events (SSE) endpoints for live container logs and stats monitoring.
- [ ] **Docker Compose & Network Management**: Add endpoints for custom bridge network creation and multi-container orchestration.
- [ ] **Container Stop/Start/Restart**: Add granular power lifecycle control endpoints.
