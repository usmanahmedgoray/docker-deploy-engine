import fs from "fs";
import https from "https";
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

if (config.sslEnabled && fs.existsSync(config.sslCertPath) && fs.existsSync(config.sslKeyPath)) {
    try {
        const sslOptions = {
            cert: fs.readFileSync(config.sslCertPath),
            key: fs.readFileSync(config.sslKeyPath),
        };

        https.createServer(sslOptions, proxyApp).listen(443, "0.0.0.0", () => {
            console.log(`HTTPS Reverse Proxy server is running publicly on 0.0.0.0:443`);
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
    proxyApp.listen(config.port, "0.0.0.0", () => {
        console.log(`Reverse Proxy server is running publicly on 0.0.0.0:${config.port}`);
    });
}

