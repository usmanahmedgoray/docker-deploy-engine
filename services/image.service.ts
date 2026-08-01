import { docker } from "../config/docker.config";
import type { DockerHubSearchResult, ImageInspectDto, ImageSummaryDto } from "../types/image.types";

export const listImages = async (): Promise<ImageSummaryDto[]> => {
    const images = await docker.listImages();
    return images.map((img) => ({
        id: img.Id.replace("sha256:", "").substring(0, 12),
        repoTags: img.RepoTags || ["<none>:<none>"],
        sizeMb: (img.Size / (1024 * 1024)).toFixed(2) + " MB",
        sizeBytes: img.Size,
        created: img.Created,
    }));
};

export const searchDockerHubImages = async (query: string): Promise<DockerHubSearchResult[]> => {
    if (!query || query.trim().length === 0) {
        return [];
    }
    const results = await docker.searchImages({ term: query, limit: 10 });
    return results.map((item: any) => ({
        name: item.name,
        description: item.description || "",
        isOfficial: item.is_official,
        stars: item.star_count,
    }));
};

export const inspectImageByIdOrTag = async (identifier: string): Promise<ImageInspectDto> => {
    if (!identifier) {
        throw new Error("Image ID or Tag is required");
    }

    const image = docker.getImage(identifier);
    let data: any;
    try {
        data = await image.inspect();
    } catch (err: any) {
        if (err.statusCode === 404) {
            const errorObj: any = new Error(`Image '${identifier}' not found.`);
            errorObj.statusCode = 404;
            throw errorObj;
        }
        throw err;
    }

    const createdStr = data.Created || "";
    const sizeMb = (data.Size / (1024 * 1024)).toFixed(2) + " MB";

    return {
        id: data.Id.replace("sha256:", "").substring(0, 12),
        fullId: data.Id,
        repoTags: data.RepoTags || [],
        created: createdStr,
        sizeMb,
        os: data.Os || "linux",
        architecture: data.Architecture || "amd64",
        author: data.Author || "",
        cmd: data.Config?.Cmd || [],
        entrypoint: data.Config?.Entrypoint || [],
        env: data.Config?.Env || [],
        exposedPorts: Object.keys(data.Config?.ExposedPorts || {}),
        volumes: Object.keys(data.Config?.Volumes || {}),
        layersCount: data.RootFS?.Layers?.length || 0,
        raw: data,
    };
};

export const deleteImageByIdOrTag = async (identifier: string, force: boolean = true) => {
    if (!identifier) {
        throw new Error("Image ID or Tag is required");
    }

    const image = docker.getImage(identifier);
    await image.remove({ force });
    return { image: identifier, removed: true };
};
