export const config = {
    port: Number(process.env.PORT) || 4000,
    managementPort: Number(process.env.MANAGEMENT_PORT) || 3000,
    managementHost: process.env.MANAGEMENT_HOST || "127.0.0.1",
    domain: process.env.DOMAIN || "localhost",
    dockerNetwork: process.env.DOCKER_NETWORK || "deploy-engine",
    nodeEnv: process.env.NODE_ENV || "production",
};
