export interface NetworkSummaryDto {
    id: string;
    name: string;
    driver: string;
    scope: string;
    subnet: string;
    gateway: string;
    containersCount: number;
}
