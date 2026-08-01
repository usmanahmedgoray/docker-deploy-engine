import Docker from "dockerode";
import { docker } from "../config/docker.config";
import { config } from "../config/app.config";

export interface CreateContainerOptions {
    image: string;
    tag?: string;
    containerName?: string;
    env?: string[];
    cmd?: string[];
    ports?: Array<{ containerPort: string }>;
    autoRemove?: boolean;
}

export interface ContainerResult {
    id: string;
    name: string;
    image: string;
    status: string;
    created: string;
    internalIp?: string;
    url?: string;
}

export const isImageExist = async (image: string, tag: string = "latest"): Promise<boolean> => {
    try {
        await docker.getImage(`${image}:${tag}`).inspect();
        return true;
    } catch (error: any) {
        if (error.statusCode === 404) {
            return false;
        }
        console.error(`Error checking if image exists (${image}:${tag}):`, error);
        throw error;
    }
};

/**
 * Ensures a custom Docker network exists so containers can communicate internally.
 */
export const ensureDockerNetwork = async (networkName: string = config.dockerNetwork): Promise<void> => {
    try {
        const networks = await docker.listNetworks();
        const exists = networks.some((net) => net.Name === networkName);

        if (!exists) {
            await docker.createNetwork({
                Name: networkName,
                Driver: "bridge",
            });
            console.log(`Created Docker network '${networkName}'`);
        }
    } catch (error: any) {
        console.error(`Error ensuring Docker network '${networkName}':`, error);
    }
};

export const pullImage = async (image: string, tag: string = "latest"): Promise<{ message: string; pulled: boolean }> => {
    const fullImageName = `${image}:${tag}`;

    const exists = await isImageExist(image, tag);
    if (exists) {
        return { message: `Image ${fullImageName} already exists locally`, pulled: false };
    }

    console.log(`Pulling Docker image: ${fullImageName}...`);
    const stream = await docker.pull(fullImageName);

    await new Promise<void>((resolve, reject) => {
        docker.modem.followProgress(
            stream,
            (err: Error | null) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });

    console.log(`Image ${fullImageName} pulled successfully.`);
    return { message: `Image ${fullImageName} pulled successfully`, pulled: true };
};


export const createContainer = async (options: CreateContainerOptions): Promise<ContainerResult> => {
    const { image, tag = "latest", containerName, env, cmd, ports, autoRemove = true } = options;
    const fullImageName = `${image}:${tag}`;
    const NETWORK_NAME = config.dockerNetwork;

    // 1. Ensure image is available locally
    await pullImage(image, tag);

    // 2. Ensure Docker internal network exists
    await ensureDockerNetwork(NETWORK_NAME);

    // 3. Prepare exposed internal ports (without host port bindings)
    const ExposedPorts: Record<string, {}> = {};
    if (ports && ports.length > 0) {
        for (const p of ports) {
            const key = p.containerPort.includes("/") ? p.containerPort : `${p.containerPort}/tcp`;
            ExposedPorts[key] = {};
        }
    }

    const createOptions: Docker.ContainerCreateOptions = {
        Image: fullImageName,
        name: containerName,
        Env: env,
        Cmd: cmd,
        ExposedPorts,
        HostConfig: {
            NetworkMode: NETWORK_NAME,
            AutoRemove: autoRemove,
            RestartPolicy: { Name: autoRemove ? "no" : "unless-stopped" },
        },
    };

    let container: Docker.Container | null = null;

    try {
        // 4. Create Container
        container = await docker.createContainer(createOptions);

        // 5. Start Container
        await container.start();

        // 6. Inspect for summary output & internal network settings
        const inspectData = await container.inspect();
        const cleanedName = inspectData.Name.replace(/^\//, "");
        const networkSettings = inspectData.NetworkSettings.Networks[NETWORK_NAME];
        const internalIp: string = (networkSettings as any)?.IPAddress || (inspectData.NetworkSettings as any)?.IPAddress || "";

        return {
            id: container.id,
            name: cleanedName,
            image: fullImageName,
            status: inspectData.State.Status,
            created: inspectData.Created,
            internalIp,
            url: `http://${cleanedName}.${config.domain}:${config.port}`,
        };
    } catch (error: any) {
        console.error("Failed during container creation/startup:", error);

        // Cleanup: remove created container if starting failed
        if (container) {
            try {
                await container.remove({ force: true });
            } catch (cleanupErr) {
                console.error("Failed to clean up container after error:", cleanupErr);
            }
        }

        throw error;
    }
};

/**
 * Deletes a single container by its ID or Name.
 */
export const deleteContainerByIdOrName = async (
    identifier: string,
    force: boolean = true
): Promise<{ id: string; name: string; removed: boolean }> => {
    if (!identifier) {
        throw new Error("Container ID or Name is required");
    }

    const container = docker.getContainer(identifier);

    try {
        const inspectData = await container.inspect();
        const containerId = inspectData.Id;
        const containerName = inspectData.Name.replace(/^\//, "");

        await container.remove({ force, v: true });

        return {
            id: containerId,
            name: containerName,
            removed: true,
        };
    } catch (error: any) {
        if (error.statusCode === 404) {
            const notFoundErr: any = new Error(`Container '${identifier}' not found`);
            notFoundErr.statusCode = 404;
            throw notFoundErr;
        }
        console.error(`Error deleting container '${identifier}':`, error);
        throw error;
    }
};

/**
 * Deletes all containers (running or stopped) matching a given image name and tag.
 */
export const deleteContainersByImage = async (
    image: string,
    tag: string = "latest",
    force: boolean = true
): Promise<{ image: string; deletedCount: number; deletedContainers: Array<{ id: string; name: string }> }> => {
    if (!image) {
        throw new Error("Image name is required");
    }

    const targetImageName = `${image}:${tag}`;

    // Get list of all containers (including stopped ones)
    const containers = await docker.listContainers({ all: true });

    // Filter containers matching target image or image tag
    const matchingContainers = containers.filter(
        (c) => c.Image === targetImageName || c.Image === image
    );

    if (matchingContainers.length === 0) {
        const notFoundErr: any = new Error(`No containers found running or created from image '${targetImageName}'`);
        notFoundErr.statusCode = 404;
        throw notFoundErr;
    }

    const deletedContainers: Array<{ id: string; name: string }> = [];

    for (const c of matchingContainers) {
        try {
            const containerRef = docker.getContainer(c.Id);
            await containerRef.remove({ force, v: true });
            deletedContainers.push({
                id: c.Id,
                name: (c.Names && c.Names[0]) ? c.Names[0].replace(/^\//, "") : c.Id.substring(0, 12),
            });
        } catch (err) {
            console.error(`Failed to remove container ${c.Id} during batch deletion:`, err);
        }
    }

    return {
        image: targetImageName,
        deletedCount: deletedContainers.length,
        deletedContainers,
    };
};

/**
 * Inspects a single container by ID or Name to retrieve status, environment variables, and connection info.
 */
export const getContainerByIdOrName = async (identifier: string) => {
    if (!identifier) {
        throw new Error("Container ID or Name is required");
    }

    const container = docker.getContainer(identifier);

    try {
        const inspectData = await container.inspect();
        const cleanedName = inspectData.Name.replace(/^\//, "");
        const networkSettings = inspectData.NetworkSettings.Networks[config.dockerNetwork];
        const internalIp: string = (networkSettings as any)?.IPAddress || (inspectData.NetworkSettings as any)?.IPAddress || "";

        return {
            id: inspectData.Id,
            name: cleanedName,
            image: inspectData.Config.Image,
            status: inspectData.State.Status,
            running: inspectData.State.Running,
            created: inspectData.Created,
            internalIp,
            url: `http://${cleanedName}.${config.domain}:${config.port}`,
            env: inspectData.Config.Env,
            exposedPorts: Object.keys(inspectData.Config.ExposedPorts || {}),
        };
    } catch (error: any) {
        if (error.statusCode === 404) {
            const notFoundErr: any = new Error(`Container '${identifier}' not found`);
            notFoundErr.statusCode = 404;
            throw notFoundErr;
        }
        throw error;
    }
};

/**
 * Lists all Docker containers managed by the service on deploy-engine network.
 */
export const listContainers = async () => {
    const rawContainers = await docker.listContainers({ all: true });

    return rawContainers.map((c) => {
        const cleanedName = c.Names && c.Names[0] ? c.Names[0].replace(/^\//, "") : c.Id.substring(0, 12);
        const networkSettings = c.NetworkSettings?.Networks?.[config.dockerNetwork];
        const internalIp = networkSettings?.IPAddress || "";

        return {
            id: c.Id,
            name: cleanedName,
            image: c.Image,
            state: c.State,
            status: c.Status,
            created: c.Created,
            internalIp,
            url: `http://${cleanedName}.${config.domain}:${config.port}`,
            ports: c.Ports || [],
        };
    });
};

/**
 * Power lifecycle controls (start, stop, pause, unpause)
 */
export const startContainerService = async (identifier: string) => {
    const container = docker.getContainer(identifier);
    await container.start();
    return { id: identifier, status: "started" };
};

export const stopContainerService = async (identifier: string) => {
    const container = docker.getContainer(identifier);
    await container.stop();
    return { id: identifier, status: "stopped" };
};

export const pauseContainerService = async (identifier: string) => {
    const container = docker.getContainer(identifier);
    await container.pause();
    return { id: identifier, status: "paused" };
};

export const unpauseContainerService = async (identifier: string) => {
    const container = docker.getContainer(identifier);
    await container.unpause();
    return { id: identifier, status: "unpaused" };
};

/**
 * Lists all Docker images on the host
 */
export const listImages = async () => {
    const images = await docker.listImages();
    return images.map((img) => ({
        id: img.Id.replace(/^sha256:/, "").substring(0, 12),
        fullId: img.Id,
        repoTags: img.RepoTags || ["<none>:<none>"],
        sizeBytes: img.Size,
        sizeMb: (img.Size / (1024 * 1024)).toFixed(2) + " MB",
        created: img.Created,
    }));
};

/**
 * Deletes a single Docker image by ID or Tag.
 */
export const deleteImageByIdOrTag = async (identifier: string, force: boolean = false) => {
    if (!identifier) {
        throw new Error("Image ID or Tag is required");
    }

    const imageRef = docker.getImage(identifier);
    try {
        await imageRef.remove({ force });
        return { image: identifier, removed: true };
    } catch (error: any) {
        if (error.statusCode === 404) {
            const notFoundErr: any = new Error(`Image '${identifier}' not found`);
            notFoundErr.statusCode = 404;
            throw notFoundErr;
        }
        throw error;
    }
};


