import type { Request, Response } from "express";
import {
    deleteVolumeByName as deleteVolumeByNameService,
    listVolumes as listVolumesService,
} from "../services/volume.service";

export const getVolumes = async (req: Request, res: Response) => {
    try {
        const data = await listVolumesService();
        res.status(200).json({ message: "Volumes retrieved", data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to list volumes", error: error.message });
    }
};

export const deleteVolume = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        const force = req.query.force === "true" || req.body?.force === true;

        if (!identifier) {
            res.status(400).json({ message: "Volume name is required" });
            return;
        }

        const data = await deleteVolumeByNameService(identifier, force);
        res.status(200).json({ message: `Volume '${identifier}' deleted successfully`, data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete volume", error: error.message });
    }
};
