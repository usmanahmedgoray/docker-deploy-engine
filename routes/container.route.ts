import { Router } from "express";
import {
    containerPowerAction,
    createContainer,
    deleteContainerByIdOrName,
    deleteContainersByImage,
    getContainerByIdOrName,
    getFleetStats,
    listContainers,
} from "../controller/container.controller";

export const containerRoutes = Router();

// List all containers
containerRoutes.get("/", listContainers);

// Create container
containerRoutes.post("/", createContainer);

// Fleet-wide CPU/memory usage aggregate for the Overview dashboard (static route,
// must be declared before the dynamic "/:identifier" routes below)
containerRoutes.get("/stats/overview", getFleetStats);

// Power actions: /container/web1/stop, /container/web1/start, /container/web1/pause, /container/web1/unpause
containerRoutes.post("/:identifier/:action", containerPowerAction);

// Delete all containers created from a specific image:tag
containerRoutes.delete("/image/all", deleteContainersByImage);

// Inspect single container by ID or Name
containerRoutes.get("/:identifier", getContainerByIdOrName);

// Delete single container by ID or Name
containerRoutes.delete("/:identifier", deleteContainerByIdOrName);
