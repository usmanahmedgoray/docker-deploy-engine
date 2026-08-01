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
managementApp.use(express.static(path.join(process.cwd(), "public"), { index: false }));

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

proxyApp.use("/", proxy);

proxyApp.listen(config.port, "0.0.0.0", () => {
    console.log(`Reverse Proxy server is running publicly on 0.0.0.0:${config.port}`);
});
