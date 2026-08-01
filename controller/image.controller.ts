import type { Request, Response } from "express";
import {
    deleteImageByIdOrTag as deleteImageByIdOrTagService,
    inspectImageByIdOrTag as inspectImageByIdOrTagService,
    listImages as listImagesService,
    searchDockerHubImages as searchDockerHubImagesService,
} from "../services/image.service";

export const listImages = async (req: Request, res: Response) => {
    try {
        const data = await listImagesService();
        res.status(200).json({ message: "Local images retrieved successfully", data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to list images", error: error.message });
    }
};

export const searchDockerHub = async (req: Request, res: Response) => {
    try {
        const query = (req.query.q as string) || "";
        const data = await searchDockerHubImagesService(query);
        res.status(200).json({ message: "Docker Hub search results", data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to search Docker Hub", error: error.message });
    }
};

export const inspectImage = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        if (!identifier) {
            res.status(400).json({ message: "Image identifier is required" });
            return;
        }

        const data = await inspectImageByIdOrTagService(identifier);
        res.status(200).json({ message: "Image specification retrieved successfully", data });
    } catch (error: any) {
        const status = error.statusCode || 500;
        res.status(status).json({ message: error.message || "Failed to inspect image", error: error.message });
    }
};

export const deleteImageByIdOrTag = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        const force = req.query.force === "true" || req.body?.force === true;

        if (!identifier) {
            res.status(400).json({ message: "Image identifier is required" });
            return;
        }

        const data = await deleteImageByIdOrTagService(identifier, force);
        res.status(200).json({ message: `Image '${identifier}' deleted successfully`, data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete image", error: error.message });
    }
};
