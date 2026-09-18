import fs from 'fs';
import path from 'path';
import { config } from '../config/app.config';

export const persistEnvConfig = (keyValues: Record<string, string | number>) => {
    const envPath = path.join(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = content.split('\n');
    const updatedKeys = new Set<string>();

    const newLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        const parts = line.split('=');
        const key = parts[0]?.trim();
        if (key && key in keyValues) {
            updatedKeys.add(key);
            return key + '=' + keyValues[key];
        }
        return line;
    });

    for (const [key, val] of Object.entries(keyValues)) {
        if (!updatedKeys.has(key)) {
            newLines.push(key + '=' + val);
        }
    }

    fs.writeFileSync(envPath, newLines.join('\n'), 'utf-8');
};

export const updatePortRangeConfig = async (start: number, end: number) => {
    if (isNaN(start) || isNaN(end)) {
        throw new Error('Port range values must be valid numbers');
    }
    if (start <= 0 || start > 65535 || end <= 0 || end > 65535) {
        throw new Error('Port numbers must be between 1 and 65535');
    }
    if (start > end) {
        throw new Error('Port Range Start cannot be greater than Port Range End');
    }

    config.portRangeStart = start;
    config.portRangeEnd = end;

    persistEnvConfig({
        PORT_RANGE_START: start,
        PORT_RANGE_END: end,
    });

    return {
        portRangeStart: config.portRangeStart,
        portRangeEnd: config.portRangeEnd,
        message: 'Port range updated to ' + start + '-' + end + ' and saved permanently to .env file',
    };
};

export const getSystemConfig = () => {
    return {
        port: config.port,
        managementPort: config.managementPort,
        managementHost: config.managementHost,
        domain: config.domain,
        publicDomain: config.publicDomain,
        dockerNetwork: config.dockerNetwork,
        nodeEnv: config.nodeEnv,
        portRangeStart: config.portRangeStart,
        portRangeEnd: config.portRangeEnd,
        sslEnabled: config.sslEnabled,
    };
};
