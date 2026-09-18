import type { Request, Response } from 'express';
import { updatePortRangeConfig, getSystemConfig } from '../services/config.service';

export const getConfigController = (req: Request, res: Response) => {
    try {
        const configData = getSystemConfig();
        res.status(200).json({ data: configData });
    } catch (err: any) {
        res.status(500).json({ message: 'Failed to retrieve configuration', error: err.message });
    }
};

export const updatePortRangeController = async (req: Request, res: Response) => {
    try {
        const { start, end } = req.body;
        const startNum = Number(start);
        const endNum = Number(end);

        const result = await updatePortRangeConfig(startNum, endNum);
        res.status(200).json({ data: result });
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
};
