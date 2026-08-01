import type { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { docker } from "./config/docker.config";
import { config } from "./config/app.config";

const NETWORK_NAME = config.dockerNetwork;
const MANAGEMENT_APP_TARGET = `http://${config.managementHost}:${config.managementPort}`;

export const proxy = createProxyMiddleware({
    target: MANAGEMENT_APP_TARGET,
    router: async (req: Request) => {
        const hostHeader = req.headers.host || "";
        const hostNameOnly = hostHeader.split(":")[0] || "";
        const containerName = hostNameOnly.split(".")[0] || "";

        // If accessing root host, localhost, main domain or IP -> Route to Management API server
        if (!containerName || containerName === "localhost" || containerName === "127" || containerName === config.domain) {
            return MANAGEMENT_APP_TARGET;
        }

        try {
            const containerRef = docker.getContainer(containerName);
            const inspectData = await containerRef.inspect();

            if (!inspectData.State.Running) {
                console.warn(`[Proxy] Container '${containerName}' exists but is not running.`);
                return MANAGEMENT_APP_TARGET;
            }

            const networkSettings = inspectData.NetworkSettings.Networks[NETWORK_NAME];
            const internalIp: string = (networkSettings as any)?.IPAddress || (inspectData.NetworkSettings as any)?.IPAddress || "";

            // Target container name (resolvable via Docker DNS) or internal IP fallback
            const targetHost = containerName || internalIp;

            // Find exposed internal port (prefer standard HTTP ports 80/3000/8080 over 443)
            const exposedPorts = Object.keys(inspectData.Config.ExposedPorts || {});
            const selectedPort = 
                exposedPorts.find((p) => p.startsWith("80/") || p === "80/tcp") ||
                exposedPorts.find((p) => p.startsWith("3000/") || p.startsWith("8080/")) ||
                exposedPorts.find((p) => !p.startsWith("443/")) ||
                exposedPorts[0];
            const containerPort = selectedPort ? selectedPort.split("/")[0] : "80";

            const targetUrl = `http://${targetHost}:${containerPort}`;
            console.log(`[Proxy] Routing ${hostHeader}${req.url} ---> ${targetUrl}`);
            
            return targetUrl;
        } catch (error: any) {
            console.error(`[Proxy] Container '${containerName}' not found. Routing to management app:`, error.message);
            return MANAGEMENT_APP_TARGET;
        }
    },
    changeOrigin: true,
    on: {
        error: (err: Error, req: any, res: any) => {
            if (res && typeof res.status === "function" && !res.headersSent) {
                res.status(503).json({
                    message: "Service Unavailable: Proxy routing error",
                    error: err.message,
                });
            }
        },
    },
});
