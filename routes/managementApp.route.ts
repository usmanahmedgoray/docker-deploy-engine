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
    inspectImage,
    searchDockerHub,
    getNetworks,
    getVolumes,
    deleteNetwork,
    deleteVolume,
} from "../controller/managementApp.controller";

export const managementAppRoutes = Router();

// Search Docker Hub for auto-complete
managementAppRoutes.get("/image/search", searchDockerHub);

// List all images
managementAppRoutes.get("/image", listImages);

// Inspect single image A-Z details
managementAppRoutes.get("/image/inspect/:identifier", inspectImage);

// Delete single image by ID or Tag
managementAppRoutes.delete("/image/:identifier", deleteImageByIdOrTag);

// Networks routes
managementAppRoutes.get("/network", getNetworks);
managementAppRoutes.delete("/network/:identifier", deleteNetwork);

// Volumes routes
managementAppRoutes.get("/volume", getVolumes);
managementAppRoutes.delete("/volume/:identifier", deleteVolume);

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
