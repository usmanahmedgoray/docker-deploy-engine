import type { Request, Response } from "express";
import {
    createContainer as createContainerService,
    deleteContainerByIdOrName as deleteContainerByIdOrNameService,
    deleteContainersByImage as deleteContainersByImageService,
} from "../services/managementApp.services";

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

export { createContainer, deleteContainerByIdOrName, deleteContainersByImage };