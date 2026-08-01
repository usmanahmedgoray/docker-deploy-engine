import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { config } from "./app.config";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "NexaDock Enterprise Engine REST API Specifications",
            version: "1.0.0",
            description:
                "Production-grade programmatic Docker container lifecycle management API, dynamic subdomain reverse proxy routing, and Docker daemon orchestration.",
            contact: {
                name: "NexaDock Core Engineering",
                url: "https://github.com/usmanahmedgoray/docker-deploy-engine",
            },
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: "Reverse Proxy Entrypoint",
            },
            {
                url: `http://${config.managementHost}:${config.managementPort}`,
                description: "Internal Management API Server",
            },
        ],
        tags: [
            { name: "Containers", description: "Container lifecycle, creation, power controls, and deletion" },
            { name: "Images", description: "Docker image checks, pulls, Docker Hub search, and A-Z inspection" },
            { name: "Networks", description: "Docker network list and pruning" },
            { name: "Volumes", description: "Storage volume monitoring and removal" },
        ],
        components: {
            schemas: {
                CreateContainerRequest: {
                    type: "object",
                    required: ["image"],
                    properties: {
                        image: { type: "string", example: "nginx" },
                        tag: { type: "string", example: "alpine", default: "latest" },
                        containerName: { type: "string", example: "my-web-server" },
                        env: {
                            type: "array",
                            items: { type: "string" },
                            example: ["PORT=80", "NODE_ENV=production"],
                        },
                        ports: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    hostPort: { type: "string", example: "8080" },
                                    containerPort: { type: "string", example: "80" },
                                },
                            },
                        },
                        autoRemove: { type: "boolean", example: true, default: false },
                    },
                },
                ContainerSummary: {
                    type: "object",
                    properties: {
                        id: { type: "string", example: "a1b2c3d4e5f6" },
                        name: { type: "string", example: "my-web-server" },
                        image: { type: "string", example: "nginx:alpine" },
                        state: { type: "string", example: "running" },
                        status: { type: "string", example: "Up 5 minutes" },
                        internalIp: { type: "string", example: "172.18.0.4" },
                        url: { type: "string", example: "http://my-web-server.localhost:4000" },
                    },
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        message: { type: "string", example: "Resource not found" },
                        error: { type: "string", example: "Conflict: name is already in use" },
                    },
                },
            },
        },
        paths: {
            "/container": {
                get: {
                    tags: ["Containers"],
                    summary: "List all containers",
                    description: "Retrieve all Docker containers active on the deploy-engine bridge network.",
                    responses: {
                        "200": {
                            description: "List of containers retrieved successfully",
                        },
                    },
                },
                post: {
                    tags: ["Containers"],
                    summary: "Deploy & start a new container",
                    description: "Pulls missing image if needed, creates, binds to deploy-engine network, and starts container.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/CreateContainerRequest" },
                            },
                        },
                    },
                    responses: {
                        "201": { description: "Container created and started" },
                        "400": { description: "Missing required parameters" },
                        "409": { description: "Container name collision" },
                    },
                },
            },
            "/container/{identifier}": {
                get: {
                    tags: ["Containers"],
                    summary: "Inspect single container",
                    parameters: [
                        { name: "identifier", in: "path", required: true, schema: { type: "string" }, example: "my-web-server" },
                    ],
                    responses: {
                        "200": { description: "Container details retrieved" },
                        "404": { description: "Container not found" },
                    },
                },
                delete: {
                    tags: ["Containers"],
                    summary: "Force delete container",
                    parameters: [
                        { name: "identifier", in: "path", required: true, schema: { type: "string" }, example: "my-web-server" },
                        { name: "force", in: "query", schema: { type: "boolean" }, example: true },
                    ],
                    responses: {
                        "200": { description: "Container deleted successfully" },
                        "404": { description: "Container not found" },
                    },
                },
            },
            "/container/{identifier}/{action}": {
                post: {
                    tags: ["Containers"],
                    summary: "Power control action",
                    parameters: [
                        { name: "identifier", in: "path", required: true, schema: { type: "string" }, example: "my-web-server" },
                        { name: "action", in: "path", required: true, schema: { type: "string", enum: ["start", "stop", "pause", "unpause"] } },
                    ],
                    responses: {
                        "200": { description: "Power action executed successfully" },
                        "400": { description: "Invalid power action" },
                    },
                },
            },
            "/image": {
                get: {
                    tags: ["Images"],
                    summary: "List local cached Docker images",
                    responses: {
                        "200": { description: "Images list retrieved" },
                    },
                },
            },
            "/image/search": {
                get: {
                    tags: ["Images"],
                    summary: "Search Docker Hub auto-complete",
                    parameters: [
                        { name: "q", in: "query", required: true, schema: { type: "string" }, example: "nginx" },
                    ],
                    responses: {
                        "200": { description: "Search results returned from Docker Hub" },
                    },
                },
            },
            "/image/inspect/{identifier}": {
                get: {
                    tags: ["Images"],
                    summary: "Inspect A-Z image specification",
                    parameters: [
                        { name: "identifier", in: "path", required: true, schema: { type: "string" }, example: "nginx:alpine" },
                    ],
                    responses: {
                        "200": { description: "Detailed image metadata retrieved" },
                        "404": { description: "Image not found" },
                    },
                },
            },
            "/image/{identifier}": {
                delete: {
                    tags: ["Images"],
                    summary: "Delete local Docker image",
                    parameters: [
                        { name: "identifier", in: "path", required: true, schema: { type: "string" }, example: "nginx:alpine" },
                        { name: "force", in: "query", schema: { type: "boolean" }, example: true },
                    ],
                    responses: {
                        "200": { description: "Image deleted successfully" },
                    },
                },
            },
            "/network": {
                get: {
                    tags: ["Networks"],
                    summary: "List Docker networks",
                    responses: {
                        "200": { description: "Networks list retrieved" },
                    },
                },
            },
            "/network/{identifier}": {
                delete: {
                    tags: ["Networks"],
                    summary: "Delete Docker network",
                    parameters: [
                        { name: "identifier", in: "path", required: true, schema: { type: "string" } },
                    ],
                    responses: {
                        "200": { description: "Network deleted successfully" },
                    },
                },
            },
            "/volume": {
                get: {
                    tags: ["Volumes"],
                    summary: "List Docker storage volumes",
                    responses: {
                        "200": { description: "Volumes list retrieved" },
                    },
                },
            },
            "/volume/{identifier}": {
                delete: {
                    tags: ["Volumes"],
                    summary: "Delete Docker storage volume",
                    parameters: [
                        { name: "identifier", in: "path", required: true, schema: { type: "string" } },
                        { name: "force", in: "query", schema: { type: "boolean" }, example: true },
                    ],
                    responses: {
                        "200": { description: "Volume deleted successfully" },
                    },
                },
            },
        },
    },
    apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

const customCss = `
    .swagger-ui { background-color: #080a10; color: #f3f4f6; font-family: Inter, sans-serif; }
    .swagger-ui .topbar { background-color: #111522; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #6366f1; }
    .swagger-ui .opblock { border-radius: 10px; background: rgba(17,21,34,0.75); border: 1px solid rgba(255,255,255,0.08); }
    .swagger-ui .opblock .opblock-summary { border-radius: 10px; }
    .swagger-ui .opblock-tag { color: #f3f4f6; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .swagger-ui section.models { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: #111522; }
`;

export const setupSwagger = (app: any) => {
    app.use(["/api-docs", "/docs"], swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customCss }));
};
