import { docker } from "../config/docker.config";
import { config } from "../config/app.config";
import type { ContainerPowerAction, CreateContainerDto } from "../types/container.types";

import net from "net";

const DOCKER_NETWORK_NAME = config.dockerNetwork || "deploy-engine";

export const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
            server.close(() => resolve(true));
        });
        server.listen(port, "0.0.0.0");
    });
};

export const isHostPortOccupied = async (port: number): Promise<boolean> => {
    const isFree = await isPortAvailable(port);
    if (!isFree) return true;

    try {
        const containers = await docker.listContainers({ all: true });
        for (const c of containers) {
            if (!c.Ports) continue;
            for (const p of c.Ports) {
                if (p.PublicPort === port) return true;
            }
        }
    } catch {}

    return false;
};

export const findNextAvailablePort = async (
    startPort: number = config.portRangeStart,
    endPort: number = config.portRangeEnd
): Promise<number> => {
    for (let port = startPort; port <= endPort; port++) {
        if (!(await isHostPortOccupied(port))) {
            return port;
        }
    }
    throw new Error(`No available ports found in range ${startPort}-${endPort}`);
};

export const ensureCustomNetworkExists = async () => {
    try {
        const networks = await docker.listNetworks();
        const exists = networks.some((n) => n.Name === DOCKER_NETWORK_NAME);
        if (!exists) {
            await docker.createNetwork({
                Name: DOCKER_NETWORK_NAME,
                Driver: "bridge",
                CheckDuplicate: true,
            });
        }
    } catch (error: any) {
        console.error(`Failed to ensure network '${DOCKER_NETWORK_NAME}':`, error.message);
    }
};

export const doesImageExistLocally = async (imageName: string): Promise<boolean> => {
    try {
        const image = docker.getImage(imageName);
        await image.inspect();
        return true;
    } catch {
        return false;
    }
};

export const pullImageFromDockerHub = async (imageName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, (onFinishedError: Error | null) => {
                if (onFinishedError) return reject(onFinishedError);
                resolve();
            });
        });
    });
};

export const createContainer = async (payload: CreateContainerDto) => {
    const { image, tag = "latest", containerName, env, cmd, ports, autoRemove } = payload;

    if (!image) {
        throw new Error("Image name is required");
    }

    await ensureCustomNetworkExists();
    const fullImageName = `${image}:${tag}`;

    const existsLocally = await doesImageExistLocally(fullImageName);
    if (!existsLocally) {
        await pullImageFromDockerHub(fullImageName);
    }

    const exposedPortsObj: Record<string, {}> = {};
    const portBindingsObj: Record<string, Array<{ HostPort: string }>> = {};

    let mappingsToProcess = ports && Array.isArray(ports) ? [...ports] : [];

    // Auto-detect default DB ports if no port mapping was provided but image is a known DB
    if (mappingsToProcess.length === 0) {
        const lowerImg = image.toLowerCase();
        if (lowerImg.includes("postgres")) {
            mappingsToProcess.push({ containerPort: "5432" });
        } else if (lowerImg.includes("redis")) {
            mappingsToProcess.push({ containerPort: "6379" });
        } else if (lowerImg.includes("mysql") || lowerImg.includes("mariadb")) {
            mappingsToProcess.push({ containerPort: "3306" });
        } else if (lowerImg.includes("mongo")) {
            mappingsToProcess.push({ containerPort: "27017" });
        }
    }

    if (mappingsToProcess.length > 0) {
        for (const mapping of mappingsToProcess) {
            let rawContainerPort = (mapping.containerPort || "").trim();
            if (!rawContainerPort) {
                const lowerImg = image.toLowerCase();
                if (lowerImg.includes("postgres")) rawContainerPort = "5432";
                else if (lowerImg.includes("redis")) rawContainerPort = "6379";
                else if (lowerImg.includes("mysql") || lowerImg.includes("mariadb")) rawContainerPort = "3306";
                else if (lowerImg.includes("mongo")) rawContainerPort = "27017";
                else rawContainerPort = "80";
            }

            const containerPortKey = rawContainerPort.includes("/")
                ? rawContainerPort
                : `${rawContainerPort}/tcp`;
            exposedPortsObj[containerPortKey] = {};

            let finalHostPort: string;
            if (mapping.hostPort && mapping.hostPort.trim() !== "") {
                const reqPort = Number(mapping.hostPort);
                if (isNaN(reqPort) || reqPort <= 0 || reqPort > 65535) {
                    throw new Error(`Invalid custom host port '${mapping.hostPort}'`);
                }
                const occupied = await isHostPortOccupied(reqPort);
                if (occupied) {
                    // If requested host port is already occupied (e.g. 5432 taken by my-postgres-1), auto-allocate next free port!
                    const autoPort = await findNextAvailablePort();
                    finalHostPort = autoPort.toString();
                } else {
                    finalHostPort = reqPort.toString();
                }
            } else {
                const autoPort = await findNextAvailablePort();
                finalHostPort = autoPort.toString();
            }

            portBindingsObj[containerPortKey] = [{ HostPort: finalHostPort }];
        }
    }

    const effectiveName = containerName || `container-${Math.random().toString(36).substring(2, 8)}`;
    const sniDomain = `${effectiveName}.${config.publicDomain}`;

    const traefikLabels: Record<string, string> = {
        "traefik.enable": "true",
        [`traefik.http.routers.${effectiveName}.rule`]: `Host(\`${sniDomain}\`)`,
        [`traefik.http.routers.${effectiveName}.entrypoints`]: "web",
    };

    const exposedKeys = Object.keys(exposedPortsObj);
    if (exposedKeys.length > 0 && exposedKeys[0]) {
        const primaryPortKey = exposedKeys[0];
        const primaryPortNum = primaryPortKey.split("/")[0] || "5432";

        traefikLabels[`traefik.tcp.routers.${effectiveName}-tcp.rule`] = `HostSNI(\`${sniDomain}\`)`;
        traefikLabels[`traefik.tcp.routers.${effectiveName}-tcp.entrypoints`] = "tcp";
        traefikLabels[`traefik.tcp.routers.${effectiveName}-tcp.tls`] = "true";
        traefikLabels[`traefik.tcp.services.${effectiveName}-tcp.loadbalancer.server.port`] = primaryPortNum;
    }

    const options: any = {
        Image: fullImageName,
        name: containerName || undefined,
        Env: env || [],
        Cmd: cmd || undefined,
        Labels: traefikLabels,
        ExposedPorts: Object.keys(exposedPortsObj).length > 0 ? exposedPortsObj : undefined,
        HostConfig: {
            NetworkMode: DOCKER_NETWORK_NAME,
            PortBindings: Object.keys(portBindingsObj).length > 0 ? portBindingsObj : undefined,
            AutoRemove: autoRemove ?? false,
        },
    };

    let container: any;
    try {
        container = await docker.createContainer(options);
    } catch (err: any) {
        if (err.statusCode === 409) {
            const errorObj: any = new Error(`Container with name '${containerName}' already exists.`);
            errorObj.statusCode = 409;
            throw errorObj;
        }
        throw err;
    }

    try {
        await container.start();
    } catch (startErr: any) {
        try {
            await container.remove({ force: true });
        } catch {}
        throw new Error(`Failed to start container '${containerName || container.id}': ${startErr.message}`);
    }

    const inspectData = await container.inspect();
    const rawName = inspectData.Name || "";
    const cleanName = rawName.startsWith("/") ? rawName.substring(1) : rawName;
    const networkData = inspectData.NetworkSettings?.Networks?.[DOCKER_NETWORK_NAME];
    const internalIp = networkData?.IPAddress || "172.18.0.x";
    const proxyUrl = `http://${cleanName}.${config.publicDomain}:${config.port}`;
    const portsInfo = inspectData.NetworkSettings?.Ports || {};

    return {
        id: inspectData.Id,
        name: cleanName,
        image: inspectData.Config?.Image || fullImageName,
        status: inspectData.State?.Status || "running",
        internalIp,
        url: proxyUrl,
        ports: portsInfo,
        created: inspectData.Created,
    };
};

export const listContainers = async () => {
    await ensureCustomNetworkExists();
    const containers = await docker.listContainers({ all: true });

    return containers.map((c) => {
        const rawName = c.Names?.[0] || c.Id.substring(0, 12);
        const cleanName = rawName.startsWith("/") ? rawName.substring(1) : rawName;

        const networkData = c.NetworkSettings?.Networks?.[DOCKER_NETWORK_NAME];
        const internalIp = networkData?.IPAddress || "172.18.0.x";
        const proxyUrl = `http://${cleanName}.${config.publicDomain}:${config.port}`;

        return {
            id: c.Id,
            name: cleanName,
            image: c.Image,
            state: c.State,
            status: c.Status,
            internalIp,
            url: proxyUrl,
            created: c.Created,
            ports: c.Ports || [],
        };
    });
};

export const getContainerByIdOrName = async (identifier: string) => {
    if (!identifier) {
        throw new Error("Container ID or Name is required");
    }

    const container = docker.getContainer(identifier);
    let inspectData: any;
    try {
        inspectData = await container.inspect();
    } catch (err: any) {
        if (err.statusCode === 404) {
            const errorObj: any = new Error(`Container '${identifier}' not found.`);
            errorObj.statusCode = 404;
            throw errorObj;
        }
        throw err;
    }

    const rawName = inspectData.Name || "";
    const cleanName = rawName.startsWith("/") ? rawName.substring(1) : rawName;
    const networkData = inspectData.NetworkSettings?.Networks?.[DOCKER_NETWORK_NAME];
    const internalIp = networkData?.IPAddress || "172.18.0.x";
    const proxyUrl = `http://${cleanName}.${config.publicDomain}:${config.port}`;

    return {
        id: inspectData.Id,
        name: cleanName,
        image: inspectData.Config?.Image,
        state: inspectData.State?.Status,
        status: inspectData.State?.Status,
        internalIp,
        url: proxyUrl,
        created: inspectData.Created,
        env: inspectData.Config?.Env || [],
        cmd: inspectData.Config?.Cmd || [],
        exposedPorts: Object.keys(inspectData.Config?.ExposedPorts || {}),
        mounts: inspectData.Mounts || [],
        networkSettings: inspectData.NetworkSettings,
    };
};

export const containerPowerAction = async (identifier: string, action: ContainerPowerAction) => {
    const container = docker.getContainer(identifier);

    switch (action) {
        case "start":
            await container.start();
            break;
        case "stop":
            await container.stop();
            break;
        case "pause":
            await container.pause();
            break;
        case "unpause":
            await container.unpause();
            break;
        default:
            throw new Error(`Unsupported container power action: '${action}'`);
    }

    return { identifier, action, success: true };
};

export const startContainerService = (id: string) => containerPowerAction(id, "start");
export const stopContainerService = (id: string) => containerPowerAction(id, "stop");
export const pauseContainerService = (id: string) => containerPowerAction(id, "pause");
export const unpauseContainerService = (id: string) => containerPowerAction(id, "unpause");

export const deleteContainerByIdOrName = async (identifier: string, force: boolean = true) => {
    if (!identifier) {
        throw new Error("Container ID or Name is required");
    }

    const container = docker.getContainer(identifier);
    let inspectData: any;
    try {
        inspectData = await container.inspect();
    } catch (err: any) {
        if (err.statusCode === 404) {
            const errorObj: any = new Error(`Container '${identifier}' not found.`);
            errorObj.statusCode = 404;
            throw errorObj;
        }
        throw err;
    }

    const rawName = inspectData.Name || "";
    const cleanName = rawName.startsWith("/") ? rawName.substring(1) : rawName;

    await container.remove({ force, v: true });

    return {
        id: inspectData.Id,
        name: cleanName,
        removed: true,
    };
};

export const getFleetStats = async () => {
    const containers = await docker.listContainers({ all: true });
    const running = containers.filter((c) => c.State === "running");

    const perContainer = (
        await Promise.all(
            running.map(async (c) => {
                try {
                    const stats: any = await docker.getContainer(c.Id).stats({ stream: false });
                    const rawName = c.Names?.[0] || c.Id.substring(0, 12);
                    const cleanName = rawName.startsWith("/") ? rawName.substring(1) : rawName;

                    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
                    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
                    const onlineCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
                    const cpuPercent = systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;

                    const memUsage = stats.memory_stats.usage || 0;
                    const memCache = stats.memory_stats.stats?.cache || 0;
                    const memActual = Math.max(memUsage - memCache, 0);
                    const memLimit = stats.memory_stats.limit || 0;
                    const memPercent = memLimit > 0 ? (memActual / memLimit) * 100 : 0;

                    return {
                        id: c.Id,
                        name: cleanName,
                        cpuPercent: Number(cpuPercent.toFixed(2)),
                        memoryUsageBytes: memActual,
                        memoryLimitBytes: memLimit,
                        memoryPercent: Number(memPercent.toFixed(2)),
                    };
                } catch {
                    return null;
                }
            })
        )
    ).filter((s): s is NonNullable<typeof s> => s !== null);

    const totalMemoryUsageBytes = perContainer.reduce((sum, s) => sum + s.memoryUsageBytes, 0);
    const totalMemoryLimitBytes = perContainer.reduce((max, s) => Math.max(max, s.memoryLimitBytes), 0);
    const avgCpuPercent = perContainer.length
        ? perContainer.reduce((sum, s) => sum + s.cpuPercent, 0) / perContainer.length
        : 0;

    return {
        totalContainers: containers.length,
        runningContainers: running.length,
        avgCpuPercent: Number(avgCpuPercent.toFixed(2)),
        totalMemoryUsageBytes,
        totalMemoryLimitBytes,
        totalMemoryPercent: totalMemoryLimitBytes > 0 ? Number(((totalMemoryUsageBytes / totalMemoryLimitBytes) * 100).toFixed(2)) : 0,
        perContainer: perContainer.sort((a, b) => b.cpuPercent - a.cpuPercent),
    };
};

export const deleteContainersByImage = async (image: string, tag: string = "latest", force: boolean = true) => {
    if (!image) {
        throw new Error("Image parameter is required");
    }

    const targetImageName = `${image}:${tag}`;
    const allContainers = await docker.listContainers({ all: true });

    const matchingContainers = allContainers.filter((c) => {
        return c.Image === targetImageName || c.Image === image;
    });

    if (matchingContainers.length === 0) {
        const errorObj: any = new Error(`No containers found matching image '${targetImageName}'`);
        errorObj.statusCode = 404;
        throw errorObj;
    }

    const deletedContainers: Array<{ id: string; name: string }> = [];

    for (const containerInfo of matchingContainers) {
        const container = docker.getContainer(containerInfo.Id);
        const rawName = containerInfo.Names?.[0] || containerInfo.Id.substring(0, 12);
        const cleanName = rawName.startsWith("/") ? rawName.substring(1) : rawName;

        try {
            await container.remove({ force, v: true });
            deletedContainers.push({
                id: containerInfo.Id,
                name: cleanName,
            });
        } catch (removeErr: any) {
            console.error(`Failed to delete container '${cleanName}':`, removeErr.message);
        }
    }

    return {
        image: targetImageName,
        deletedCount: deletedContainers.length,
        deletedContainers,
    };
};
