import fs from "fs";
import https from "https";
import tls from "tls";
import path from "path";
import express, { type Request, type Response, type NextFunction } from "express";
import { managementAppRoutes } from "./routes/managementApp.route";
import { proxy } from "./proxy";
import { config } from "./config/app.config";
import { setupSwagger } from "./config/swagger.config";
import { errorHandler } from "./middleware/errorHandler.middleware";

// 1. Management API Server (internal port)
const managementApp = express();

managementApp.set("view engine", "ejs");
managementApp.set("views", path.join(process.cwd(), "views"));

managementApp.use(express.json());
managementApp.use(express.static(path.join(process.cwd(), "public"), { index: false, dotfiles: "allow" }));

// Mount Interactive Swagger UI documentation
setupSwagger(managementApp);

managementApp.use("/", managementAppRoutes);

managementApp.get("/", (req: Request, res: Response) => {
    res.render("landing", { config });
});

managementApp.get("/app", (req: Request, res: Response) => {
    res.render("index", { config });
});

managementApp.get("/docs", (req: Request, res: Response) => {
    res.render("docs", { config });
});

managementApp.use((req: Request, res: Response) => {
    res.status(404).json({ message: "Route Not Found" });
});

managementApp.use(errorHandler);

managementApp.listen(config.managementPort, "0.0.0.0", () => {
    console.log(`Management API server is running internally on 0.0.0.0:${config.managementPort}`);
});

// 2. Reverse Proxy Server (public entrypoint port)
const proxyApp = express();

// Serve Let's Encrypt ACME challenge files directly on public proxy before dynamic routing
proxyApp.use("/.well-known", express.static(path.join(process.cwd(), "public", ".well-known"), { dotfiles: "allow" }));
proxyApp.use("/", proxy);

if (config.sslEnabled) {
    const certExists = fs.existsSync(config.sslCertPath);
    const keyExists = fs.existsSync(config.sslKeyPath);

    console.log(`[SSL Initialization] SSL_ENABLED=true`);
    console.log(`[SSL Initialization] Cert Path: ${config.sslCertPath} (Exists: ${certExists})`);
    console.log(`[SSL Initialization] Key Path: ${config.sslKeyPath} (Exists: ${keyExists})`);

    if (certExists && keyExists) {
        try {
            const getLatestSecureContext = () => {
                return tls.createSecureContext({
                    cert: fs.readFileSync(config.sslCertPath),
                    key: fs.readFileSync(config.sslKeyPath),
                });
            };

            const serverOptions = {
                cert: fs.readFileSync(config.sslCertPath),
                key: fs.readFileSync(config.sslKeyPath),
                SNICallback: (servername: string, cb: (err: Error | null, ctx?: tls.SecureContext) => void) => {
                    try {
                        const ctx = getLatestSecureContext();
                        cb(null, ctx);
                    } catch (err: any) {
                        console.warn(`[SNI Warning] Failed to reload SSL cert for ${servername}:`, err.message);
                        cb(null);
                    }
                },
            };

            https.createServer(serverOptions, proxyApp).listen(443, "0.0.0.0", () => {
                console.log(`HTTPS Reverse Proxy server is running publicly on 0.0.0.0:443 with Hot SSL Reloading`);
            });

            // HTTP Redirect Server (redirects http:// to https://, preserving ACME challenges)
            const httpRedirectApp = express();
            httpRedirectApp.use("/.well-known", express.static(path.join(process.cwd(), "public", ".well-known"), { dotfiles: "allow" }));
            httpRedirectApp.use((req: Request, res: Response) => {
                const host = (req.headers.host || "").split(":")[0];
                res.redirect(301, `https://${host}${req.url}`);
            });
            httpRedirectApp.listen(config.port, "0.0.0.0", () => {
                console.log(`HTTP Redirect server is running on 0.0.0.0:${config.port} ---> HTTPS`);
            });
        } catch (err: any) {
            console.error("Failed to start HTTPS server, falling back to HTTP:", err.message);
            proxyApp.listen(config.port, "0.0.0.0", () => {
                console.log(`Reverse Proxy server is running publicly on 0.0.0.0:${config.port}`);
            });
        }
    } else {
        console.error(`[SSL Error] SSL_ENABLED is true, but certificate files were not found at specified paths! Falling back to HTTP.`);
        proxyApp.listen(config.port, "0.0.0.0", () => {
            console.log(`Reverse Proxy server is running publicly on 0.0.0.0:${config.port}`);
        });
    }
} else {
    proxyApp.listen(config.port, "0.0.0.0", () => {
        console.log(`Reverse Proxy server is running publicly on 0.0.0.0:${config.port}`);
    });
}

