export interface DockerHubSearchResult {
    name: string;
    description: string;
    isOfficial: boolean;
    stars: number;
}

export interface ImageSummaryDto {
    id: string;
    repoTags: string[];
    sizeMb: string;
    sizeBytes: number;
    created: number;
}

export interface ImageInspectDto {
    id: string;
    fullId: string;
    repoTags: string[];
    created: string;
    sizeMb: string;
    os: string;
    architecture: string;
    author: string;
    cmd: string[];
    entrypoint: string[];
    env: string[];
    exposedPorts: string[];
    volumes: string[];
    layersCount: number;
    raw: any;
}
