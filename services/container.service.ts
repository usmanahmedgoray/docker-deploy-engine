import { docker } from "../config/docker.config";
import { config } from "../config/app.config";
import type { ContainerPowerAction, CreateContainerDto } from "../types/container.types";

const DOCKER_NETWORK_NAME = config.dockerNetwork || "deploy-engine";

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

    if (ports && Array.isArray(ports)) {
        for (const mapping of ports) {
            const containerPortKey = `${mapping.containerPort}/tcp`;
            exposedPortsObj[containerPortKey] = {};
            if (mapping.hostPort) {
                portBindingsObj[containerPortKey] = [{ HostPort: mapping.hostPort.toString() }];
            }
        }
    }

    const options: any = {
        Image: fullImageName,
        name: containerName || undefined,
        Env: env || [],
        Cmd: cmd || undefined,
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

    return {
        id: inspectData.Id,
        name: cleanName,
        image: inspectData.Config?.Image || fullImageName,
        status: inspectData.State?.Status || "running",
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
        const proxyUrl = `http://${cleanName}.${config.domain}:${config.port}`;

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
    const proxyUrl = `http://${cleanName}.${config.domain}:${config.port}`;

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
