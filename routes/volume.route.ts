import { Router } from "express";
import { deleteVolume, getVolumes } from "../controller/volume.controller";

export const volumeRoutes = Router();

volumeRoutes.get("/", getVolumes);
volumeRoutes.delete("/:identifier", deleteVolume);
