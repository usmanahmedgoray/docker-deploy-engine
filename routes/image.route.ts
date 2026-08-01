import { Router } from "express";
import {
    deleteImageByIdOrTag,
    inspectImage,
    listImages,
    searchDockerHub,
} from "../controller/image.controller";

export const imageRoutes = Router();

// Search Docker Hub for auto-complete
imageRoutes.get("/search", searchDockerHub);

// List all local cached images
imageRoutes.get("/", listImages);

// Inspect single image A-Z specification
imageRoutes.get("/inspect/:identifier", inspectImage);

// Delete single image by ID or Tag
imageRoutes.delete("/:identifier", deleteImageByIdOrTag);
