import { Router } from 'express';
import { getConfigController, updatePortRangeController } from '../controller/config.controller';

export const configRoutes = Router();

configRoutes.get('/', getConfigController);
configRoutes.post('/port-range', updatePortRangeController);
