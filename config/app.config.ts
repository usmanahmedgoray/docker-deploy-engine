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
    portRangeStart: Number(process.env.PORT_RANGE_START) || 80,
    portRangeEnd: Number(process.env.PORT_RANGE_END) || 10000,
    sslEnabled: process.env.SSL_ENABLED === "true",
    sslCertPath: process.env.SSL_CERT_PATH || `/etc/letsencrypt/live/${configuredDomain}/fullchain.pem`,
    sslKeyPath: process.env.SSL_KEY_PATH || `/etc/letsencrypt/live/${configuredDomain}/privkey.pem`,
};

