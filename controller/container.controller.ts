import type { Request, Response } from "express";
import {
    createContainer as createContainerService,
    deleteContainerByIdOrName as deleteContainerByIdOrNameService,
    deleteContainersByImage as deleteContainersByImageService,
    getContainerByIdOrName as getContainerByIdOrNameService,
    getFleetStats as getFleetStatsService,
    listContainers as listContainersService,
    containerPowerAction as containerPowerActionService,
} from "../services/container.service";
import type { ContainerPowerAction } from "../types/container.types";

export const createContainer = async (req: Request, res: Response) => {
    try {
        const { image, tag, containerName, env, cmd, ports, autoRemove } = req.body;
        if (!image) {
            res.status(400).json({ message: "Parameter 'image' is required" });
            return;
        }

        const data = await createContainerService({ image, tag, containerName, env, cmd, ports, autoRemove });
        res.status(201).json({ message: "Container created and started successfully", data });
    } catch (error: any) {
        const status = error.statusCode || 500;
        res.status(status).json({ message: error.message || "Failed to create container", error: error.message });
    }
};

export const listContainers = async (req: Request, res: Response) => {
    try {
        const data = await listContainersService();
        res.status(200).json({ message: "Containers list retrieved successfully", data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to list containers", error: error.message });
    }
};

export const getFleetStats = async (req: Request, res: Response) => {
    try {
        const data = await getFleetStatsService();
        res.status(200).json({ message: "Fleet resource usage retrieved successfully", data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to retrieve fleet resource usage", error: error.message });
    }
};

export const getContainerByIdOrName = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        if (!identifier) {
            res.status(400).json({ message: "Container identifier is required" });
            return;
        }

        const data = await getContainerByIdOrNameService(identifier);
        res.status(200).json({ message: "Container details retrieved successfully", data });
    } catch (error: any) {
        const status = error.statusCode || 500;
        res.status(status).json({ message: error.message || "Failed to inspect container", error: error.message });
    }
};

export const containerPowerAction = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        const action = Array.isArray(req.params.action) ? req.params.action[0] : req.params.action;

        if (!identifier || !action) {
            res.status(400).json({ message: "Container identifier and action are required" });
            return;
        }

        const validActions: ContainerPowerAction[] = ["start", "stop", "pause", "unpause"];
        if (!validActions.includes(action as ContainerPowerAction)) {
            res.status(400).json({ message: `Invalid power action '${action}'. Valid options: ${validActions.join(", ")}` });
            return;
        }

        const data = await containerPowerActionService(identifier, action as ContainerPowerAction);
        res.status(200).json({ message: `Container '${identifier}' ${action}ed successfully`, data });
    } catch (error: any) {
        res.status(500).json({ message: `Failed to execute power action on container`, error: error.message });
    }
};

export const deleteContainerByIdOrName = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        const force = req.query.force === "false" ? false : req.body?.force !== false;

        if (!identifier) {
            res.status(400).json({ message: "Container identifier parameter is required" });
            return;
        }

        const data = await deleteContainerByIdOrNameService(identifier, force);
        res.status(200).json({ message: `Container '${identifier}' deleted successfully`, data });
    } catch (error: any) {
        const status = error.statusCode || 500;
        res.status(status).json({ message: error.message || "Failed to delete container", error: error.message });
    }
};

export const deleteContainersByImage = async (req: Request, res: Response) => {
    try {
        const { image, tag, force } = req.body;
        if (!image) {
            res.status(400).json({ message: "Parameter 'image' is required in request body" });
            return;
        }

        const data = await deleteContainersByImageService(image, tag, force !== false);
        res.status(200).json({ message: `Successfully deleted ${data.deletedCount} container(s) for image '${data.image}'`, data });
    } catch (error: any) {
        const status = error.statusCode || 500;
        res.status(status).json({ message: error.message || "Failed to batch-delete containers by image", error: error.message });
    }
};
