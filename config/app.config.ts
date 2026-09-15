const configuredDomain = process.env.DOMAIN || "localhost";
const isIpv4Address = (value: string) =>
    value.split(".").length === 4 && value.split(".").every((part) => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);

export const config = {
    port: Number(process.env.PORT) || 4000,
    managementPort: Number(process.env.MANAGEMENT_PORT) || 3000,
    managementHost: process.env.MANAGEMENT_HOST || "127.0.0.1",
    domain: configuredDomain,
    publicDomain: isIpv4Address(configuredDomain) ? `${configuredDomain}.nip.io` : configuredDomain,
    dockerNetwork: process.env.DOCKER_NETWORK || "deploy-engine",
    nodeEnv: process.env.NODE_ENV || "production",
};
