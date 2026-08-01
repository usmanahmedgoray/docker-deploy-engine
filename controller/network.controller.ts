import type { Request, Response } from "express";
import {
    deleteNetworkByIdOrName as deleteNetworkByIdOrNameService,
    listNetworks as listNetworksService,
} from "../services/network.service";

export const getNetworks = async (req: Request, res: Response) => {
    try {
        const data = await listNetworksService();
        res.status(200).json({ message: "Networks retrieved", data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to list networks", error: error.message });
    }
};

export const deleteNetwork = async (req: Request, res: Response) => {
    try {
        const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
        if (!identifier) {
            res.status(400).json({ message: "Network identifier is required" });
            return;
        }

        const data = await deleteNetworkByIdOrNameService(identifier);
        res.status(200).json({ message: `Network '${identifier}' deleted successfully`, data });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete network", error: error.message });
    }
};
