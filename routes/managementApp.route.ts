import { type Request, type Response, Router } from "express";
import {
    createContainer,
    deleteContainerByIdOrName,
    deleteContainersByImage,
} from "../controller/managementApp.controller";

export const managementAppRoutes = Router();

// Create container
managementAppRoutes.post("/container", createContainer);

// Delete all containers created from a specific image:tag
managementAppRoutes.delete("/container/image/all", deleteContainersByImage);

// Delete single container by ID or Name
managementAppRoutes.delete("/container/:identifier", deleteContainerByIdOrName);

managementAppRoutes.get("/test", (req: Request, res: Response) => {
    res.send("Test Route Updated");
});
