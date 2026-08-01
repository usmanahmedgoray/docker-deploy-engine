import type { Request, Response } from "express";
import {
    createContainer as createContainerService,
    deleteContainerByIdOrName as deleteContainerByIdOrNameService,
    deleteContainersByImage as deleteContainersByImageService,
    getContainerByIdOrName as getContainerByIdOrNameService,
    listContainers as listContainersService,
    startContainerService,
    stopContainerService,
    pauseContainerService,
    unpauseContainerService,
    listImages as listImagesService,
    deleteImageByIdOrTag as deleteImageByIdOrTagService,
} from "../services/managementApp.services";

/**
 * Controller to inspect a single container by ID or Name
 */
const getContainerByIdOrName = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier)
            ? req.params.identifier[0]
            : req.params.identifier;

        if (!identifier) {
            res.status(400).json({ message: "Container ID or Name is required" });
            return;
        }

        const result = await getContainerByIdOrNameService(identifier);

        res.status(200).json({
            message: `Container '${identifier}' details retrieved successfully`,
            data: result,
        });
    } catch (error: any) {
        console.error(`Error retrieving container '${req.params.identifier}':`, error.message);

        if (error.statusCode === 404) {
            res.status(404).json({ message: error.message });
            return;
        }

        res.status(500).json({ message: "Failed to retrieve container details", error: error.message || "Internal Server Error" });
    }
};

/**
 * Controller to create and start a Docker container
 */
const createContainer = async (req: Request, res: Response) => {
    try {
        const { image, tag, containerName, env, cmd, ports, autoRemove } = req.body;

        if (!image) {
            res.status(400).json({ message: "Image is required" });
            return;
        }

        const result = await createContainerService({
            image,
            tag: tag || "latest",
            containerName,
            env,
            cmd,
            ports,
            autoRemove,
        });

        res.status(201).json({
            message: "Container created and started successfully",
            data: result,
        });
    } catch (error: any) {
        console.error("Error in createContainer controller:", error.stack || error);

        if (error.statusCode === 409) {
            res.status(409).json({ message: "Container with this name already exists", error: error.json?.message || error.message });
            return;
        }

        res.status(500).json({ message: "Failed to create container", error: error.message || "Internal Server Error" });
    }
};

/**
 * Controller to delete a single container by ID or Name
 */
const deleteContainerByIdOrName = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier)
            ? req.params.identifier[0]
            : req.params.identifier;
        const force = req.query.force !== "false" && req.body?.force !== false;

        if (!identifier) {
            res.status(400).json({ message: "Container ID or Name is required" });
            return;
        }

        const result = await deleteContainerByIdOrNameService(identifier, force);

        res.status(200).json({
            message: `Container '${identifier}' deleted successfully`,
            data: result,
        });
    } catch (error: any) {
        console.error(`Error deleting container '${req.params.identifier}':`, error.message);

        if (error.statusCode === 404) {
            res.status(404).json({ message: error.message });
            return;
        }

        res.status(500).json({ message: "Failed to delete container", error: error.message || "Internal Server Error" });
    }
};

/**
 * Controller to delete all containers created from a specific image and tag
 */
const deleteContainersByImage = async (req: Request, res: Response) => {
    try {
        const image = req.body?.image || (req.query.image as string);
        const tag = req.body?.tag || (req.query.tag as string) || "latest";
        const force = req.query.force !== "false" && req.body?.force !== false;

        if (!image) {
            res.status(400).json({ message: "Image name is required" });
            return;
        }

        const result = await deleteContainersByImageService(image, tag, force);

        res.status(200).json({
            message: `Successfully deleted ${result.deletedCount} container(s) for image '${result.image}'`,
            data: result,
        });
    } catch (error: any) {
        console.error("Error in deleteContainersByImage controller:", error.message);

        if (error.statusCode === 404) {
            res.status(404).json({ message: error.message });
            return;
        }

        res.status(500).json({ message: "Failed to delete containers by image", error: error.message || "Internal Server Error" });
    }
};

/**
 * Controller to list all managed Docker containers
 */
const listContainers = async (req: Request, res: Response) => {
    try {
        const result = await listContainersService();
        res.status(200).json({
            message: "Containers retrieved successfully",
            data: result,
        });
    } catch (error: any) {
        console.error("Error in listContainers controller:", error.message);
        res.status(500).json({ message: "Failed to list containers", error: error.message || "Internal Server Error" });
    }
};

/**
 * Controller to perform power action (start, stop, pause, unpause)
 */
const containerPowerAction = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        const action = req.params.action; // start | stop | pause | unpause

        if (!identifier || !action) {
            res.status(400).json({ message: "Identifier and action are required" });
            return;
        }

        let result;
        if (action === "start") result = await startContainerService(identifier);
        else if (action === "stop") result = await stopContainerService(identifier);
        else if (action === "pause") result = await pauseContainerService(identifier);
        else if (action === "unpause") result = await unpauseContainerService(identifier);
        else {
            res.status(400).json({ message: `Invalid action '${action}'` });
            return;
        }

        res.status(200).json({ message: `Container '${identifier}' ${action}ed successfully`, data: result });
    } catch (error: any) {
        console.error(`Error performing '${req.params.action}' on container:`, error.message);
        res.status(500).json({ message: `Failed to ${req.params.action} container`, error: error.message });
    }
};

/**
 * Controller to list local Docker images
 */
const listImages = async (req: Request, res: Response) => {
    try {
        const result = await listImagesService();
        res.status(200).json({ message: "Images retrieved successfully", data: result });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to list images", error: error.message });
    }
};

/**
 * Controller to delete a single Docker image
 */
const deleteImageByIdOrTag = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        const force = req.query.force === "true" || req.body?.force === true;

        if (!identifier) {
            res.status(400).json({ message: "Image ID or Tag is required" });
            return;
        }

        const result = await deleteImageByIdOrTagService(identifier, force);
        res.status(200).json({ message: `Image '${identifier}' deleted successfully`, data: result });
    } catch (error: any) {
        console.error(`Error deleting image '${req.params.identifier}':`, error.message);
        if (error.statusCode === 404) {
            res.status(404).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to delete image", error: error.message });
    }
};

export { createContainer, getContainerByIdOrName, deleteContainerByIdOrName, deleteContainersByImage, listContainers, containerPowerAction, listImages, deleteImageByIdOrTag };