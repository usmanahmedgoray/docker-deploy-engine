import { docker } from "../config/docker.config";
import type { NetworkSummaryDto } from "../types/network.types";

export const listNetworks = async (): Promise<NetworkSummaryDto[]> => {
    const networks = await docker.listNetworks();
    return networks.map((net) => ({
        id: net.Id.substring(0, 12),
        name: net.Name,
        driver: net.Driver,
        scope: net.Scope,
        subnet: net.IPAM?.Config?.[0]?.Subnet || "N/A",
        gateway: net.IPAM?.Config?.[0]?.Gateway || "N/A",
        containersCount: Object.keys(net.Containers || {}).length,
    }));
};

export const deleteNetworkByIdOrName = async (identifier: string) => {
    if (!identifier) {
        throw new Error("Network ID or Name is required");
    }
    const network = docker.getNetwork(identifier);
    await network.remove();
    return { network: identifier, removed: true };
};
