import { describe, expect, it } from "bun:test";
import {
    listContainers,
    listImages,
    listNetworks,
    listVolumes,
    searchDockerHubImages,
} from "../services/managementApp.services";

describe("Dockpoly Engine - Unit & Integration Test Suite", () => {
    describe("Services Layer Tests", () => {
        it("should list Docker containers active on internal network", async () => {
            const containers = await listContainers();
            expect(Array.isArray(containers)).toBe(true);
            containers.forEach((c) => {
                expect(c).toHaveProperty("id");
                expect(c).toHaveProperty("name");
                expect(c).toHaveProperty("image");
                expect(c).toHaveProperty("state");
                expect(c).toHaveProperty("status");
                expect(c).toHaveProperty("url");
            });
        });

        it("should list local cached Docker images", async () => {
            const images = await listImages();
            expect(Array.isArray(images)).toBe(true);
            images.forEach((img) => {
                expect(img).toHaveProperty("id");
                expect(img).toHaveProperty("repoTags");
                expect(img).toHaveProperty("sizeMb");
                expect(img).toHaveProperty("created");
            });
        });

        it("should list Docker networks including deploy-engine bridge", async () => {
            const networks = await listNetworks();
            expect(Array.isArray(networks)).toBe(true);
            expect(networks.length).toBeGreaterThan(0);
            
            const deployNet = networks.find((n) => n.name === "deploy-engine");
            expect(deployNet).toBeDefined();
            expect(deployNet?.driver).toBe("bridge");
        });

        it("should list Docker storage volumes", async () => {
            const volumes = await listVolumes();
            expect(Array.isArray(volumes)).toBe(true);
            volumes.forEach((v) => {
                expect(v).toHaveProperty("name");
                expect(v).toHaveProperty("driver");
                expect(v).toHaveProperty("mountpoint");
            });
        });

        it("should search Docker Hub for official image auto-complete", async () => {
            const results = await searchDockerHubImages("nginx");
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);

            const nginxResult = results.find((r: any) => r.name === "nginx");
            expect(nginxResult).toBeDefined();
            expect(nginxResult?.isOfficial).toBe(true);
            expect(nginxResult?.stars).toBeGreaterThan(100);
        });
    });
});
