import { Router } from "express";
import { containerRoutes } from "./container.route";
import { imageRoutes } from "./image.route";
import { networkRoutes } from "./network.route";
import { volumeRoutes } from "./volume.route";

export const managementAppRoutes = Router();

// Mount Domain Routers
managementAppRoutes.use("/container", containerRoutes);
managementAppRoutes.use("/image", imageRoutes);
managementAppRoutes.use("/network", networkRoutes);
managementAppRoutes.use("/volume", volumeRoutes);
