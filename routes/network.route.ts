import { Router } from "express";
import { deleteNetwork, getNetworks } from "../controller/network.controller";

export const networkRoutes = Router();

networkRoutes.get("/", getNetworks);
networkRoutes.delete("/:identifier", deleteNetwork);
