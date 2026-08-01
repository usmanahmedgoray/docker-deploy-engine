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

export interface ContainerResourceUsage {
    id: string;
    name: string;
    cpuPercent: number;
    memoryUsageBytes: number;
    memoryLimitBytes: number;
    memoryPercent: number;
}

export interface FleetStatsDto {
    totalContainers: number;
    runningContainers: number;
    avgCpuPercent: number;
    totalMemoryUsageBytes: number;
    totalMemoryLimitBytes: number;
    totalMemoryPercent: number;
    perContainer: ContainerResourceUsage[];
}
