import { type Request, type Response, Router } from "express";
import {
    createContainer,
    getContainerByIdOrName,
    deleteContainerByIdOrName,
    deleteContainersByImage,
    listContainers,
    containerPowerAction,
    listImages,
    deleteImageByIdOrTag,
} from "../controller/managementApp.controller";

export const managementAppRoutes = Router();

// List all images
managementAppRoutes.get("/image", listImages);

// Delete single image by ID or Tag
managementAppRoutes.delete("/image/:identifier", deleteImageByIdOrTag);

// List all containers
managementAppRoutes.get("/container", listContainers);

// Create container
managementAppRoutes.post("/container", createContainer);

// Power actions: /container/web1/stop, /container/web1/start, /container/web1/pause, /container/web1/unpause
managementAppRoutes.post("/container/:identifier/:action", containerPowerAction);

// Inspect single container by ID or Name
managementAppRoutes.get("/container/:identifier", getContainerByIdOrName);

// Delete all containers created from a specific image:tag
managementAppRoutes.delete("/container/image/all", deleteContainersByImage);

// Delete single container by ID or Name
managementAppRoutes.delete("/container/:identifier", deleteContainerByIdOrName);

managementAppRoutes.get("/test", (req: Request, res: Response) => {
    res.send("Test Route Updated");
});
