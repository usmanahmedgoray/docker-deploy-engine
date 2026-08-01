export interface PortMapping {
    hostPort?: string;
    containerPort: string;
}

export interface CreateContainerDto {
    image: string;
    tag?: string;
    containerName?: string;
    env?: string[];
    cmd?: string[];
    ports?: PortMapping[];
    restartPolicy?: string;
    autoRemove?: boolean;
}

export interface ContainerSummaryDto {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
    internalIp: string;
    url: string;
    created: string;
    ports: any[];
}

export type ContainerPowerAction = "start" | "stop" | "pause" | "unpause";
