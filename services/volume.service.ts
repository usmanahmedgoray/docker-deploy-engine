import { docker } from "../config/docker.config";
import type { VolumeSummaryDto } from "../types/volume.types";

export const listVolumes = async (): Promise<VolumeSummaryDto[]> => {
    const result = await docker.listVolumes();
    const volumes = result.Volumes || [];
    return volumes.map((vol) => ({
        name: vol.Name,
        driver: vol.Driver,
        mountpoint: vol.Mountpoint,
        scope: vol.Scope,
        created: (vol as any).CreatedAt || "N/A",
    }));
};

export const deleteVolumeByName = async (name: string, force: boolean = false) => {
    if (!name) {
        throw new Error("Volume Name is required");
    }
    const volume = docker.getVolume(name);
    await volume.remove({ force });
    return { volume: name, removed: true };
};
