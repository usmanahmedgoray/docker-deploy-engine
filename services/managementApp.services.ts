import Docker from "dockerode";
import { docker } from "../config/docker.config";

export interface CreateContainerOptions {
    image: string;
    tag?: string;
    containerName?: string;
    env?: string[];
    cmd?: string[];
    ports?: Array<{ hostPort: string; containerPort: string }>;
    autoRemove?: boolean;
}

export interface ContainerResult {
    id: string;
    name: string;
    image: string;
    status: string;
    created: string;
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

    // 1. Ensure image is available locally
    await pullImage(image, tag);

    // 2. Prepare Port Bindings if specified
    const PortBindings: Record<string, Array<{ HostPort: string }>> = {};
    const ExposedPorts: Record<string, {}> = {};

    if (ports && ports.length > 0) {
        for (const p of ports) {
            const key = `${p.containerPort}/tcp`;
            ExposedPorts[key] = {};
            PortBindings[key] = [{ HostPort: p.hostPort }];
        }
    }

    const createOptions: Docker.ContainerCreateOptions = {
        Image: fullImageName,
        name: containerName,
        Env: env,
        Cmd: cmd,
        ExposedPorts,
        HostConfig: {
            PortBindings,
            AutoRemove: autoRemove,
            RestartPolicy: { Name: autoRemove ? "no" : "unless-stopped" },
        },
    };

    let container: Docker.Container | null = null;

    try {
        // 3. Create Container
        container = await docker.createContainer(createOptions);

        // 4. Start Container
        await container.start();

        // 5. Inspect for summary output
        const inspectData = await container.inspect();

        return {
            id: container.id,
            name: inspectData.Name.replace(/^\//, ""),
            image: fullImageName,
            status: inspectData.State.Status,
            created: inspectData.Created,
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

